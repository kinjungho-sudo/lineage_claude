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

        // [캐릭터 선택] 현재 선택된 캐릭터 상태를 계정 리스트(allCharacters)에 동기화
        let updatedChars = [...(gameState.allCharacters || [])];
        if (gameState.isCharacterSelected) {
            const charIdx = updatedChars.findIndex(c => c.id === gameState.id);
            if (charIdx >= 0) {
                // [PRUNE] Keep only the essential character data
                const {
                    allCharacters, logs, combatLogs, combatState,
                    ...essentialCharacterState
                } = gameState;

                updatedChars[charIdx] = {
                    ...essentialCharacterState,
                    allCharacters: [],
                    logs: (logs || []).slice(0, 50),
                    combatLogs: (combatLogs || []).slice(0, 30)
                };
            }
        }

        const dataToSave = {
            ...gameState,
            allCharacters: updatedChars,
            sessionId: user?.sessionId || gameState.sessionId || ''
        };

        try {
            // 1. 로컬 저장소 우선 백업
            localStorage.setItem(`lineage_save_${userId}`, JSON.stringify(dataToSave));

            if (!supabase.isOffline) {
                // 2. DB 상태 확인 (레벨 하락 방지)
                const { data: dbRow, error: checkError } = await supabase
                    .from('users')
                    .select('game_data')
                    .eq('id', userId)
                    .single();

                if (!checkError && dbRow?.game_data) {
                    const dbData = dbRow.game_data;
                    // [안전장치] 만약 서버의 레벨이 로컬보다 높다면 덮어쓰지 않음 (의도적인 초기화 제외)
                    if (dataToSave.level < dbData.level && dbData.level > 1 && !gameState.forceReset) {
                        console.error(`[Save Blocked] Level Downgrade! Local:${dataToSave.level}, DB:${dbData.level}`);
                        setIsSaving(false);
                        return;
                    }
                }

                // 3. DB 최종 업데이트
                const { error: saveError } = await supabase
                    .from('users')
                    .update({ game_data: dataToSave })
                    .eq('id', userId);

                if (saveError) {
                    console.warn("[Cloud Save Failed] Error:", saveError.message);
                } else {
                    console.log("[Cloud Save] Success! Session:", dataToSave.sessionId);
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
                try {
                    console.log("[Load System] Attempting initial sync upgrade...");
                    await supabase.from('users').update({ game_data: targetState }).eq('id', userId);
                } catch (e) {
                    console.warn("[Load System] Background sync skipped:", e.message);
                }
            }
            localStorage.setItem(`lineage_save_${userId}`, JSON.stringify(targetState));

            // [캐릭터 선택] 계정 전체 데이터 로드 후 CharacterSelect 화면 대기
            dispatch({ type: GAME_ACTIONS.INITIALIZE_ACCOUNT, payload: targetState });
            console.log(`[Load System] DONE. Characters Found: ${targetState.allCharacters?.length || 0}`);
            if (targetState.allCharacters?.length > 0) {
                targetState.allCharacters.forEach((c, idx) => {
                    console.log(` - Slot ${idx+1}: ${c.characterName} (Lv.${c.level} ${c.characterClass})`);
                });
            }

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

            // [캐릭터 선택] 계정 접속 성공 (캐릭터 선택 화면 진입)
            dispatch({ type: GAME_ACTIONS.INITIALIZE_ACCOUNT, payload: updated });

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

            // [캐릭터 선택] 신규 계정 생성 시 빈 캐릭터 목록 초기화
            dispatch({ type: GAME_ACTIONS.INITIALIZE_ACCOUNT, payload: newState });
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
