import { useState } from 'react';
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
                    allCharacters: _allChars, logs, combatLogs, combatState: _combatState,
                    sharedWarehouse: _shared,
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
            sessionId: user?.sessionId || gameState.sessionId || '',
            lastSeen: Date.now()
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

                if (!checkError && dbRow?.game_data && gameState.isCharacterSelected) {
                    const dbData = dbRow.game_data;
                    // [안전장치] 캐릭터 플레이 중일 때만 레벨 다운 방지 체크
                    // DB의 같은 캐릭터 레벨과 비교
                    const dbChar = dbData.allCharacters?.find(c => c.id === gameState.id);
                    const dbLevel = dbChar ? dbChar.level : dbData.level;
                    if (dataToSave.level < dbLevel && dbLevel > 1 && !gameState.forceReset) {
                        console.error(`[Save Blocked] Level Downgrade! Local:${dataToSave.level}, DB:${dbLevel}`);
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
    const signupUser = async (userId, password, name, email) => {
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
                localStorage.setItem(`lineage_nick_${userId}`, userId);
                dispatch({ type: GAME_ACTIONS.SET_STATE, payload: newState });
                setUser({ id: userId, nickname: userId, sessionId: newSessionId });
                return;
            }

            const { data: existingId } = await supabase.from('users').select('id').eq('id', userId).single();
            if (existingId) {
                alert('이미 존재하는 아이디입니다.');
                return;
            }

            const { data: existingEmail } = await supabase.from('users').select('email').eq('email', email).single();
            if (existingEmail) {
                alert('이미 사용 중인 이메일입니다.');
                return;
            }

            const newState = { ...INITIAL_STATE, sessionId: newSessionId };

            const { error } = await supabase.from('users').insert([{
                id: userId,
                nickname: userId,
                name,
                email,
                game_data: newState,
                password
            }]);

            if (error) throw error;

            dispatch({ type: GAME_ACTIONS.INITIALIZE_ACCOUNT, payload: newState });
            setUser({ id: userId, nickname: userId, sessionId: newSessionId });
            alert('계정이 생성되었습니다. 캐릭터를 생성해주세요.');

        } catch (e) {
            console.error(e);
            alert('계정 생성 중 오류가 발생했습니다: ' + e.message);
        } finally {
            setIsLoading(false);
        }
    };

    // 1단계: 아이디+이메일 일치 확인
    const forgotPassword = async (userId, email) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, email')
                .eq('id', userId)
                .single();

            if (error || !data) {
                alert('존재하지 않는 계정입니다.');
                return false;
            }
            if (data.email !== email) {
                alert('이메일 주소가 일치하지 않습니다.');
                return false;
            }
            return true;
        } catch (e) {
            console.error('[forgotPassword 오류]', e);
            alert('오류가 발생했습니다.');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    // 2단계: 새 비밀번호로 실제 변경
    const resetPasswordDirect = async (userId, newPassword) => {
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('users')
                .update({ password: newPassword })
                .eq('id', userId);
            if (error) throw error;
            alert('비밀번호가 변경되었습니다. 새 비밀번호로 로그인하세요.');
            return true;
        } catch (e) {
            console.error('[resetPassword 오류]', e);
            alert('비밀번호 변경 중 오류가 발생했습니다.');
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const changePassword = async (userId, currentPassword, newPassword) => {
        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('password')
                .eq('id', userId)
                .single();

            if (error || !data) {
                alert('계정 정보를 불러올 수 없습니다.');
                return false;
            }
            if (data.password !== currentPassword) {
                alert('현재 비밀번호가 일치하지 않습니다.');
                return false;
            }
            if (newPassword.length < 8) {
                alert('새 비밀번호는 최소 8자 이상이어야 합니다.');
                return false;
            }

            const { error: updateError } = await supabase
                .from('users')
                .update({ password: newPassword })
                .eq('id', userId);

            if (updateError) throw updateError;

            alert('비밀번호가 변경되었습니다.');
            return true;
        } catch (e) {
            console.error(e);
            alert('오류가 발생했습니다: ' + e.message);
            return false;
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
        forgotPassword,
        resetPasswordDirect,
        changePassword,
        logout,
        saveData
    };
};
