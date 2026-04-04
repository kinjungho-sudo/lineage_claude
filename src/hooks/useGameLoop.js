import { useEffect, useRef } from 'react';
import { GAME_ACTIONS } from '../context/GameReducer';

/**
 * 게임 루프 훅 (Game Loop)
 * Web Worker 기반 타이머 — 탭 비활성화 시에도 정확하게 동작합니다.
 *
 * 공격속도 기준 (도핑 없음: 기사=요정 동일)
 *  - 기본              : 1500ms
 *  - 용기의 물약 (기사) : 1000ms  (+50%)
 *  - 엘븐 와퍼  (요정) : 1154ms  (+30%)
 *  - 초록 물약  (헤이스트): 위 값에 추가 ×1/1.6 가속
 */
export const useGameLoop = (dispatch, user, state) => {
    const workerRef = useRef(null);

    useEffect(() => {
        if (!user) return;

        const now = Date.now();
        const hasHaste = state?.combatState?.hasteEndTime && now < state.combatState.hasteEndTime;
        const hasBrave = state?.combatState?.bravePotionEndTime && now < state.combatState.bravePotionEndTime;
        const isElf = state?.characterClass === 'elf';

        let tickInterval = 1500;

        if (hasBrave) {
            tickInterval = isElf
                ? Math.round(1500 / 1.3)
                : Math.round(1500 / 1.5);
        }

        if (hasHaste) {
            tickInterval = Math.round(tickInterval / 1.6);
        }

        // 이전 워커 종료
        if (workerRef.current) {
            workerRef.current.postMessage({ type: 'stop' });
            workerRef.current.terminate();
        }

        const worker = new Worker('/timerWorker.js');
        workerRef.current = worker;

        worker.onmessage = () => {
            dispatch({ type: GAME_ACTIONS.AUTO_HUNT_TICK });
        };

        worker.postMessage({ type: 'start', interval: tickInterval });

        return () => {
            worker.postMessage({ type: 'stop' });
            worker.terminate();
            workerRef.current = null;
        };
    }, [
        user,
        state?.characterClass,
        state?.combatState?.hasteEndTime,
        state?.combatState?.bravePotionEndTime,
    ]);
};
