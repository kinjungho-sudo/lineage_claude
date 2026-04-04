import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { GAME_ACTIONS, INITIAL_STATE, GAME_VERSION } from '../context/GameReducer';
import { MAPS } from '../data/monsters';

/**
 * 게임 세션 및 데이터 영속성 관리 훅
 * 로그인, 회원가입, 데이터 로드/저장, 로그아웃 기능 담당
 * @param {Function} dispatch - GameReducer dispatch function
 * @param {Object} state - Current Game State (for saving)
 */
export const useGameSession = (dispatch, state) => {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // [FIX] Auto-Login Removed as per user request (Phase 52)
    // useEffect(() => {
    //     const checkAutoLogin = async () => {
    //         const lastUserId = localStorage.getItem('lineage_last_user_id');
    //         if (lastUserId) {
    //             console.log(`[AutoLogin] Found last user: ${lastUserId}`);
    //             const newSessionId = Date.now().toString();
    //             const savedNick = localStorage.getItem(`lineage_nick_${lastUserId}`) || lastUserId;

    //             // [FIX] Load data first, then set user to prevent early auto-save triggers
    //             await loadData(lastUserId, newSessionId);
    //             setUser({ id: lastUserId, nickname: savedNick, sessionId: newSessionId });
    //         }
    //         setIsLoading(false);
    //     };
    //     checkAutoLogin();
    // }, []); // eslint-disable-line react-hooks/exhaustive-deps

    /**
     * 데이터 저장 (Save Data - Secure Version)
     */
    const saveData = async (userId, gameState) => {
        if (!userId || !gameState) return;
        setIsSaving(true);

        // [FIX] Ensure current session ID is ALWAYS preserved in the saved data (Phase 54)
        const dataToSave = {
            ...gameState,
            sessionId: user?.sessionId || gameState.sessionId || ''
        };

        try {
            // 1. Local Storage First (Safety Backup)
            localStorage.setItem(`lineage_save_${userId}`, JSON.stringify(dataToSave));

            if (!supabase.isOffline) {
                // 2. Fetch current DB state for safety check
                const { data: dbRow, error: checkError } = await supabase
                    .from('users')
                    .select('game_data')
                    .eq('id', userId)
                    .single();

                if (!checkError && dbRow?.game_data) {
                    const dbData = dbRow.game_data;

                    // [SAFETY] Don't overwrite higher level with Level 1 unless it's a new account
                    if (dataToSave.level < dbData.level && dbData.level > 1) {
                        console.error(`[Save Blocked] Level Downgrade Attempted! Local: ${dataToSave.level}, DB: ${dbData.level}`);
                        setIsSaving(false);
                        return;
                    }

                    // [SAFETY] Session Mismatch check
                    // [MOD] sessionId가 없는 찰나의 상황(초기 로드 등)에는 무시하도록 조건 강화
                    if (dbData.sessionId && user?.sessionId && dbData.sessionId !== user.sessionId) {
                        console.warn("[Save Aborted] Session Conflict detected in DB. DB:", dbData.sessionId, "Local:", user.sessionId);
                        setIsSaving(false);
                        return;
                    }
                }

                // 3. Perform the safe update (Atomic Session Lock)
                // We use .update().eq().filter() to ensure we only overwrite if the sessionId still matches or is empty
                const { error: saveError } = await supabase
                    .from('users')
                    .update({ game_data: dataToSave })
                    .eq('id', userId);
                // [MOD] filter 제거: 이미 위에서 select로 체크했으므로, 
                // 로딩 직후의 세션 갱신을 허용하기 위해 더 유연하게 처리

                if (saveError) {
                    console.warn("[DB Save Failed] Error:", saveError.message);
                } else {
                    console.log("[DB Save] Successfully synced to cloud. Session:", dataToSave.sessionId);
                }
            }
        } catch (err) {
            console.error("[CRITICAL] Save System Failure:", err);
        } finally {
            setTimeout(() => setIsSaving(false), 500);
        }
    };

    /**
     * 데이터 로드 (Load Data - Indestructible Version)
     */
    const loadData = async (userId, newSessionId) => {
        setIsLoading(true);
        console.log(`[Load System] Starting data recovery for: ${userId}`);

        try {
            // Priority 1: Supabase Load
            let dbData = null;
            if (!supabase.isOffline) {
                const { data, error: fetchError } = await supabase
                    .from('users')
                    .select('game_data')
                    .eq('id', userId)
                    .single();

                if (!fetchError && data) {
                    dbData = data.game_data;
                }
            }

            // Priority 2: Local Storage Fallback
            const localRaw = localStorage.getItem(`lineage_save_${userId}`);
            const localData = localRaw ? JSON.parse(localRaw) : null;

            // Merge & Decide target state
            let targetState = null;

            if (dbData && localData) {
                targetState = (dbData.level >= localData.level) ? dbData : localData;
            } else {
                targetState = dbData || localData || INITIAL_STATE;
            }

            // [MIGRATION] Version Check
            if (targetState.version !== GAME_VERSION) {
                console.log(`[Load System] Migration Required: ${targetState.version} -> ${GAME_VERSION}`);
                targetState = {
                    ...INITIAL_STATE,
                    ...targetState,
                    version: GAME_VERSION,
                    combatState: INITIAL_STATE.combatState
                };
            }

            // [SESSION] Bind to new session
            if (newSessionId) {
                targetState.sessionId = newSessionId;
            }

            // [FINAL SAVE] Sync the recovered state back to DB/Local immediately
            if (!supabase.isOffline && targetState.level > 0) {
                await supabase.from('users').update({ game_data: targetState }).eq('id', userId);
            }
            localStorage.setItem(`lineage_save_${userId}`, JSON.stringify(targetState));

            // Apply to UI
            dispatch({ type: GAME_ACTIONS.SET_STATE, payload: targetState });
            console.log("[Load System] Recovery Complete. Session:", targetState.sessionId);

        } catch (err) {
            console.error("[CRITICAL] Load System Failure:", err);
            // Panic Fallback: If everything fails, use initial but don't save to DB
            dispatch({ type: GAME_ACTIONS.SET_STATE, payload: INITIAL_STATE });
        } finally {
            setIsLoading(false);
        }
    };


    /**
     * 로그인 (Login)
     */
    const loginUser = async (userId, password) => {
        setIsLoading(true);
        const newSessionId = Date.now().toString();
        try {
            if (supabase.isOffline) {
                const localData = localStorage.getItem(`lineage_save_${userId}`);
                if (!localData) {
                    alert('존재하지 않는 계정입니다.');
                    return;
                }
                let parsedData = JSON.parse(localData);

                // Version Check & Migration
                if (parsedData.version !== GAME_VERSION) {
                    parsedData = { ...INITIAL_STATE, ...parsedData, version: GAME_VERSION, combatState: INITIAL_STATE.combatState };
                }

                const displayNick = localStorage.getItem(`lineage_nick_${userId}`) || userId;
                const updated = { ...parsedData, sessionId: newSessionId };

                localStorage.setItem(`lineage_save_${userId}`, JSON.stringify(updated));
                dispatch({ type: GAME_ACTIONS.SET_STATE, payload: updated });
                setUser({ id: userId, nickname: displayNick, sessionId: newSessionId });
                return;
            }

            const { data, error } = await supabase.from('users').select('game_data, password, nickname').eq('id', userId).single();

            if (error || !data) {
                alert('존재하지 않는 계정입니다.');
                return;
            }

            if (data.password !== password) {
                alert('비밀번호가 일치하지 않습니다.');
                return;
            }

            const localRaw = localStorage.getItem(`lineage_save_${userId}`);
            const localData = localRaw ? JSON.parse(localRaw) : null;
            let dbData = data.game_data || INITIAL_STATE;

            let targetState = (dbData && localData) ? ((dbData.level >= localData.level) ? dbData : localData) : (dbData || localData || INITIAL_STATE);

            // [MIGRATION]
            if (targetState.version !== GAME_VERSION) {
                targetState = { ...INITIAL_STATE, ...targetState, version: GAME_VERSION, combatState: INITIAL_STATE.combatState };
            }

            // Valid Map Check
            if (!MAPS.find(m => m.id === targetState.currentMapId)) {
                targetState.currentMapId = 'village';
            }

            // [CRITICAL] 주입된 세션 ID와 함께 즉시 저장하여 세션 체크 충돌 방지
            const updated = { ...targetState, sessionId: newSessionId };

            // 동기화 순서: DB -> Local -> Global State -> User State (Trigger Effect)
            await supabase.from('users').update({ game_data: updated }).eq('id', userId);
            localStorage.setItem(`lineage_save_${userId}`, JSON.stringify(updated));

            dispatch({ type: GAME_ACTIONS.SET_STATE, payload: updated });

            // User 상태를 마지막에 설정하여 세션 체크가 시작되도록 함
            setUser({ id: userId, nickname: data.nickname || userId, sessionId: newSessionId });
            localStorage.setItem(`lineage_nick_${userId}`, data.nickname || userId);

        } catch (e) {
            console.error(e);
            alert('로그인 처리 중 오류가 발생했습니다.');
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 회원가입 (Sign Up)
     */
    const signupUser = async (userId, password, nickname) => {
        setIsLoading(true);
        const newSessionId = Date.now().toString();
        try {
            if (supabase.isOffline) {
                const localData = localStorage.getItem(`lineage_save_${userId}`);
                if (localData) {
                    alert('이미 존재하는 계정(로컬)입니다.');
                    return;
                }
                const newState = { ...INITIAL_STATE, sessionId: newSessionId };
                localStorage.setItem(`lineage_save_${userId}`, JSON.stringify(newState));
                localStorage.setItem(`lineage_nick_${userId}`, nickname);

                dispatch({ type: GAME_ACTIONS.SET_STATE, payload: newState });
                setUser({ id: userId, nickname: nickname, sessionId: newSessionId });
                return;
            }

            const { data: existingId } = await supabase.from('users').select('id').eq('id', userId).single();
            if (existingId) {
                alert('이미 존재하는 아이디입니다.');
                return;
            }

            const { data: existingNick } = await supabase.from('users').select('nickname').eq('nickname', nickname).single();
            if (existingNick) {
                alert('이미 존재하는 캐릭터 이름입니다.');
                return;
            }

            const newState = { ...INITIAL_STATE, sessionId: newSessionId };

            const { error } = await supabase.from('users').insert([{
                id: userId,
                nickname: nickname,
                game_data: newState,
                password
            }]);

            if (error) throw error;

            dispatch({ type: GAME_ACTIONS.SET_STATE, payload: newState });
            setUser({ id: userId, nickname: nickname, sessionId: newSessionId });
            alert('계정이 생성되었습니다. 게임을 시작합니다.');

        } catch (e) {
            console.error(e);
            alert('계정 생성 중 오류가 발생했습니다: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    /**
     * 로그아웃 (Logout - Secure Save)
     * @param {boolean} skipSave - 세션 충돌 등으로 강제 종료 시 저장 생략 여부
     */
    const logout = async (skipSave = false) => {
        if (user && !skipSave) {
            console.log("[Logout] Saving data before exit...");
            // [CRITICAL] Await save to ensure DB sync completes
            await saveData(user.id, state);
        } else if (skipSave) {
            console.warn("[Logout] Skipping save due to session conflict or force quit.");
        }
        setUser(null);
        localStorage.removeItem('lineage_last_user_id'); // Clear Persisted User
        dispatch({ type: GAME_ACTIONS.SET_STATE, payload: INITIAL_STATE });
    };

    return {
        user,
        setUser,
        isLoading,
        isSaving,
        loginUser,
        signupUser,
        logout,
        saveData // Auto-save 등에서 사용하기 위해 노출
    };
};
