import { useEffect, useRef } from 'react';

/**
 * 자동 저장 훅
 * state를 ref로 관리하여 전투 중 상태 변경으로 인한 타이머 리셋 문제 해결
 * (기존: state가 deps에 포함 → 전투 중 매 틱마다 타이머 리셋 → 저장 불가)
 */
export const useAutoSave = (user, state, saveData, isLoading) => {
    const lastSavedStateRef = useRef(null);
    const stateRef = useRef(state);
    const saveDataRef = useRef(saveData);

    // state/saveData 최신값을 ref에 항상 동기화 (interval 재생성 없이)
    useEffect(() => {
        stateRef.current = state;
    }, [state]);

    useEffect(() => {
        saveDataRef.current = saveData;
    }, [saveData]);

    useEffect(() => {
        if (!user || isLoading) return;

        const saveInterval = setInterval(async () => {
            const s = stateRef.current;
            // 캐릭터가 선택되지 않은 상태(캐릭터 선택 화면)에서는 저장 생략
            if (!s.isCharacterSelected) return;

            const currentStateString = JSON.stringify({
                level: s.level,
                currentExp: s.currentExp,
                adena: s.adena,
                inventory: s.inventory?.length,
                warehouse: s.warehouse?.length,
                sharedWarehouse: s.sharedWarehouse?.map(i => `${i.uid}:${i.count ?? 1}`).join(','),
                equipment: s.equipment,
                map: s.currentMapId,
                id: s.id,
                wizardDefaultSpell: s.wizardDefaultSpell,
                skillSlots: s.skillSlots?.join(','),
            });

            if (lastSavedStateRef.current !== currentStateString) {
                console.log("[AutoSave] Change detected. Syncing...");
                await saveDataRef.current(user.id, s);
                lastSavedStateRef.current = currentStateString;
            }
        }, 5000);

        return () => clearInterval(saveInterval);
    }, [user, isLoading]); // eslint-disable-line react-hooks/exhaustive-deps
};
