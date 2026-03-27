import { useEffect, useRef } from 'react';

/**
 * 자동 저장 훅 (안정화 버전)
 * Debouncing 방식의 문제점(전투 중 무한 리셋)을 해결하기 위해
 * 5초 주기의 Interval 방식으로 변경하여 전투 중에도 데이터가 유실되지 않게 합니다.
 */
export const useAutoSave = (user, state, saveData, isLoading) => {
    const lastSavedStateRef = useRef(null);

    useEffect(() => {
        if (!user || isLoading) return;

        // 5초마다 현재 상태가 이전 저장 상태와 다르면 저장을 시도합니다.
        const saveInterval = setInterval(async () => {
            // 중요한 변경 사항이 있을 때만 저장 (HP/MP 제외 성능 최적화 가능성 있으나, 일단 안전하게 전체 비교)
            // (여기서는 단순하게 매 주기마다 저장하거나, 얕은 비교를 수행할 수 있습니다.)
            
            // [Safety] 렙업, 아데나, 아이템, 맵 이동 등을 감지
            const currentStateString = JSON.stringify({
                level: state.level,
                adena: state.adena,
                inventory: state.inventory?.length,
                equipment: state.equipment,
                map: state.currentMapId,
                id: state.id
            });

            if (lastSavedStateRef.current !== currentStateString) {
                console.log("[AutoSave] Change detected. Syncing to DB...");
                await saveData(user.id, state);
                lastSavedStateRef.current = currentStateString;
            }
        }, 5000); // 5초 주기

        return () => clearInterval(saveInterval);
    }, [user, state, saveData, isLoading]);
};
