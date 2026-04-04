// statReducer.js — 아데나/스탯 배분 관련 액션 분리 reducer
// GameReducer.js에서 ADD_ADENA, ALLOCATE_STAT case를 추출한 파일입니다.
// GameReducer.js 자체는 수정하지 않습니다.

import { GAME_ACTIONS } from '../constants/gameActions';

export const statReducer = (state, action) => {
    switch (action.type) {

        case GAME_ACTIONS.ADD_ADENA:
            return { ...state, adena: state.adena + action.payload };

        // [스탯 시스템] 50레벨부터 5가지 능력치 모두 포인트 배분 가능
        case GAME_ACTIONS.ALLOCATE_STAT: {
            const statType = action.payload; // 'str', 'dex', 'con', 'int', 'wis'
            if (!['str', 'dex', 'con', 'int', 'wis'].includes(statType)) return state;

            // 사용 가능한 포인트 계산: (level - 50) - 이미 배분한 총량
            const totalAllocated = (state.allocatedStr || 0) + (state.allocatedDex || 0) +
                (state.allocatedCon || 0) + (state.allocatedInt || 0) + (state.allocatedWis || 0);
            const availablePoints = Math.max(0, state.level - 50) - totalAllocated;
            if (availablePoints <= 0) return state;

            return {
                ...state,
                allocatedStr: statType === 'str' ? (state.allocatedStr || 0) + 1 : (state.allocatedStr || 0),
                allocatedDex: statType === 'dex' ? (state.allocatedDex || 0) + 1 : (state.allocatedDex || 0),
                allocatedCon: statType === 'con' ? (state.allocatedCon || 0) + 1 : (state.allocatedCon || 0),
                allocatedInt: statType === 'int' ? (state.allocatedInt || 0) + 1 : (state.allocatedInt || 0),
                allocatedWis: statType === 'wis' ? (state.allocatedWis || 0) + 1 : (state.allocatedWis || 0),
            };
        }

        default:
            return state;
    }
};
