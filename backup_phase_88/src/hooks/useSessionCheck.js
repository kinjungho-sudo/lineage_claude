import { useEffect } from 'react';
import { supabase } from '../lib/supabase';

/**
 * 세션 중복 접속 체크 훅
 * 주기적으로 DB를 확인하여 다른 기기에서 접속했는지 확인합니다.
 * @param {Object} user 
 * @param {Function} logout 
 */
export const useSessionCheck = (user, logout, isLoading) => {
    useEffect(() => {
        if (!user || !user.sessionId || supabase.isOffline || isLoading) return;

        const checkSession = async () => {
            try {
                // [MOD] 현재 유저 정보나 세션 ID가 없으면 체크 의미가 없음 (Phase 54)
                if (!user?.id || !user?.sessionId) return;

                const { data } = await supabase.from('users').select('game_data').eq('id', user.id).single();

                // [FIX] DB에 세션 ID가 명시적으로 있고, 현재 로컬 세션 ID와 다를 때만 '중복 접속'으로 간주
                const dbSessionId = data?.game_data?.sessionId;

                if (dbSessionId && dbSessionId !== user.sessionId) {
                    console.warn("[Session Conflict] DB:", dbSessionId, "Local:", user.sessionId);
                    alert('다른 기기에서 접속하여 로그아웃됩니다.\n(지속될 경우 브라우저를 새로고침 해주세요)');
                    logout(true); // Skip save
                }
            } catch (e) {
                console.error("Session check failed", e);
            }
        };

        // 초기 지연 후 주기적 체크 (로드 직후 레이스 컨디션 방지)
        const delayTimer = setTimeout(() => {
            checkSession();
            const sessionTimer = setInterval(checkSession, 15000); // 15초로 약간 완화
            return () => clearInterval(sessionTimer);
        }, 5000);

        return () => clearTimeout(delayTimer);
    }, [user]);
};
