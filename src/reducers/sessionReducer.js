import { GAME_ACTIONS, GAME_VERSION } from '../constants/gameActions';
import { INITIAL_STATE } from '../constants/initialState';

export const sessionReducer = (state, action) => {
    switch (action.type) {
        case GAME_ACTIONS.SET_SESSION_ID:
            return { ...state, sessionId: action.payload };

        case GAME_ACTIONS.INITIALIZE_ACCOUNT: {
            const accountData = action.payload || {};
            let chars = accountData.allCharacters || [];
            if (chars.length === 0 && (accountData.level > 1 || accountData.characterName || accountData.inventory?.length > 0)) {
                const legacy = { ...accountData };
                delete legacy.allCharacters;
                delete legacy.isCharacterSelected;
                chars = [{
                    ...legacy,
                    id: (accountData.id && accountData.id.startsWith('char_')) ? accountData.id : 'char_legacy_' + Date.now(),
                    characterName: accountData.characterName || accountData.nickname || 'Knight',
                    characterClass: accountData.characterClass || 'knight'
                }];
            }
            return {
                ...state,
                allCharacters: chars,
                sharedWarehouse: accountData.sharedWarehouse || state.sharedWarehouse || [],
                isCharacterSelected: false
            };
        }

        case GAME_ACTIONS.CREATE_CHARACTER: {
            const { name, class: charClass } = action.payload;
            if (state.allCharacters.length >= 3) return state;

            let baseStats = { str: 18, dex: 12, con: 14, int: 8, wis: 9 };
            let startMap = 'village';
            if (charClass === 'elf') {
                baseStats = { str: 10, dex: 18, con: 12, int: 8, wis: 10 };
                startMap = 'elf_village';
            } else if (charClass === 'wizard') {
                baseStats = { str: 8, dex: 8, con: 8, int: 18, wis: 18 };
                startMap = 'village';
            }

            const newChar = {
                ...INITIAL_STATE,
                id: 'char_' + Date.now(),
                characterName: name,
                characterClass: charClass,
                baseStr: baseStats.str,
                baseDex: baseStats.dex,
                baseCon: baseStats.con,
                baseInt: baseStats.int,
                baseWis: baseStats.wis,
                currentMapId: startMap,
                inventory: [],
                equipment: {},
                isCharacterSelected: false,
                allCharacters: []
            };

            return {
                ...state,
                allCharacters: [...state.allCharacters, newChar]
            };
        }

        case GAME_ACTIONS.SELECT_CHARACTER: {
            const targetChar = state.allCharacters.find(c => c.id === action.payload);
            if (!targetChar) return state;
            // 저장 데이터 오류 방지: allocatedStat 값을 유효 범위로 제한
            const maxAllocatable = Math.max(0, (targetChar.level || 1) - 50);
            const sanitizedChar = {
                ...targetChar,
                allocatedStr: Math.min(targetChar.allocatedStr || 0, maxAllocatable),
                allocatedDex: Math.min(targetChar.allocatedDex || 0, maxAllocatable),
                allocatedCon: Math.min(targetChar.allocatedCon || 0, maxAllocatable),
                allocatedInt: Math.min(targetChar.allocatedInt || 0, maxAllocatable),
                allocatedWis: Math.min(targetChar.allocatedWis || 0, maxAllocatable),
            };
            return {
                ...state,
                ...sanitizedChar,
                allCharacters: state.allCharacters,
                isCharacterSelected: true
            };
        }

        case GAME_ACTIONS.DELETE_CHARACTER: {
            const filteredChars = state.allCharacters.filter(c => c.id !== action.payload);
            return { ...state, allCharacters: filteredChars };
        }

        case GAME_ACTIONS.LOGOUT_CHARACTER: {
            let updatedAllChars = [...state.allCharacters];
            if (state.id) {
                const charIdx = updatedAllChars.findIndex(c => c.id === state.id);
                if (charIdx >= 0) {
                    const { allCharacters: _allChars, logs: _logs, combatLogs: _combatLogs, combatState: _combatState, sharedWarehouse: _shared, ...activeCharData } = state;
                    updatedAllChars[charIdx] = {
                        ...activeCharData,
                        allCharacters: [],
                        logs: (state.logs || []).slice(0, 50),
                        combatLogs: (state.combatLogs || []).slice(0, 30)
                    };
                }
            }
            return {
                ...INITIAL_STATE,
                version: GAME_VERSION,
                allCharacters: updatedAllChars,
                sharedWarehouse: state.sharedWarehouse || [],
                isCharacterSelected: false,
                sessionId: state.sessionId
            };
        }

        default:
            return state;
    }
};
