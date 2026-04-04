import { useEffect } from 'react';

/**
 * 자동 저장 훅
 * 주요 상태가 변경될 때마다 saveData를 트리거합니다.
 * @param {Object} user - 현재 로그인한 유저
 * @param {Object} state - 현재 게임 상태
 * @param {Function} saveData - 데이터 저장 함수
 */
export const useAutoSave = (user, state, saveData, isLoading) => {
    useEffect(() => {
        if (!user || isLoading) return; // [FIX] Skip auto-save while data is still loading

        // 디바운싱(Debouncing) 처리된 저장이 이상적이나, 
        // 현재 로직은 2초 딜레이 saveTimeout을 내부적으로 가질 수도 있고, 
        // 여기서는 단순히 변경 감지 후 저장을 요청합니다.

        // 기존 구현: 2초 딜레이 후 저장 (타이머 클리어 방식)
        const saveTimeout = setTimeout(async () => {
            await saveData(user.id, state);
        }, 2000);

        return () => clearTimeout(saveTimeout);
    }, [
        state.inventory,
        state.equipment,
        state.adena,
        state.level,
        state.currentExp,
        user // user가 바뀌거나 로그아웃 시 클리어
    ]);
};
