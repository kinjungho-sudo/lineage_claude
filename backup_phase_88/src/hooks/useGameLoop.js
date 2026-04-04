import { useEffect } from 'react';
import { GAME_ACTIONS } from '../context/GameReducer';

/**
 * 게임 루프 훅 (Game Loop)
 * 일정 간격(Tick)으로 자동 사냥 및 게임 로직을 실행합니다.
 * @param {Function} dispatch 
 * @param {Object} user 
 * @param {Object} state - 추가: 용기 물약 상태 확인용
 */
export const useGameLoop = (dispatch, user, state) => {
    useEffect(() => {
        if (!user) return;

        // 버프 효과 활성화 여부 확인
        const now = Date.now();
        const hasGreen = state?.combatState?.hasteEndTime && now < state.combatState.hasteEndTime;
        const hasBrave = state?.combatState?.bravePotionEndTime && now < state.combatState.bravePotionEndTime;

        // 속도 단계별 Tick Interval 계산
        // 1. 기본 상태: 1120ms (현재 대비 60% 느림)
        // 2. 초록 물약(Haste): 700ms
        // 3. 용충(Brave + Haste): 437ms
        let tickInterval = 1120;
        if (hasGreen) {
            tickInterval = hasBrave ? 437 : 700;
        }

        const timer = setInterval(() => {
            dispatch({ type: GAME_ACTIONS.AUTO_HUNT_TICK });
        }, tickInterval);

        return () => clearInterval(timer);
    }, [user, state?.combatState?.hasteEndTime, state?.combatState?.bravePotionEndTime]); // 버프 시간이 변하면 훅 재실행
};
