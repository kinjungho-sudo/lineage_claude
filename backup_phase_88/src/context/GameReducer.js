import { ITEMS } from '../data/items';
import { MONSTERS, MAPS } from '../data/monsters';
import { ITEM_TYPES, SCROLL_TYPES, ENCHANT_RESULTS } from '../constants';

// Import Mechanics
import { calculateStats, processAutoHuntTick } from '../mechanics/combat';
import {
    handleBuyItems,
    handleUsePotion,
    handleUseScroll,
    handleEquipItem,
    handleUnequipItem,
    handleSellItem,
    handleMoveItem
} from '../mechanics/inventory';

export const GAME_VERSION = '0.9.8'; // FORCE RESET - Version Bump (Phase 27)

export const INITIAL_STATE = {
    version: GAME_VERSION,
    level: 1,
    currentExp: 0,
    maxExp: 100, // 이전 저장소 호환성을 위해 남겨두되 UI에서는 자체 계산
    hp: 50,
    mp: 30,
    adena: 500000, // Fixed: 500,000 A
    inventory: [],
    equipment: {
        helm: null,
        armor: null,
        shirt: null,
        weapon: null,
        gloves: null,
        boots: null,
        cloak: null,
        shield: null,
        belt: null,
        necklace: null,
        ring_l: null,
        ring_r: null,
    },
    logs: [],
    combatLogs: [],
    currentMapId: 'village',
    sessionId: '', // [NEW] 세션 중복 체크를 위한 고유 세션 ID (Phase 54)
    screenMessage: null, // [NEW] 화면 중앙 알림 메시지 (Phase 3)
    combatState: {
        isAttacking: false,
        attackFrame: 0,
        targetMonsterId: null,
        monsterHpPercent: 100,
        damageNumbers: [],
        respawnTimestamp: 0,
        potionEffect: null,
        impact: null // { type: 'shake' | 'spark', x, y, timestamp }
    },
    lastRegenTime: 0,
    allocatedStr: 0, // [스탯 시스템] 50레벨 초과 시 사용자 배분 STR
    allocatedCon: 0, // [스탯 시스템] 50레벨 초과 시 사용자 배분 CON
};

export const GAME_ACTIONS = {
    SET_STATE: 'SET_STATE',
    ADD_ADENA: 'ADD_ADENA',
    BUY_ITEMS: 'BUY_ITEMS',
    USE_SCROLL: 'USE_SCROLL',
    USE_POTION: 'USE_POTION',
    USE_SPELL: 'USE_SPELL',
    ADD_LOG: 'ADD_LOG',
    EQUIP_ITEM: 'EQUIP_ITEM',
    UNEQUIP_ITEM: 'UNEQUIP_ITEM',
    SELL_ITEM: 'SELL_ITEM',
    MOVE_ITEM: 'MOVE_ITEM',
    AUTO_HUNT_TICK: 'AUTO_HUNT_TICK',
    UPDATE_COMBAT_STATE: 'UPDATE_COMBAT_STATE',
    SET_SESSION_ID: 'SET_SESSION_ID', // [NEW] 세션 ID 명시적 업데이트 (Phase 54)
    RESURRECT: 'RESURRECT', // [개선] 사망 후 부활 버튼 처리
    ALLOCATE_STAT: 'ALLOCATE_STAT', // [스탯 시스템] 50레벨 이후 STR/CON 배분
    CLEAR_SCREEN_MESSAGE: 'CLEAR_SCREEN_MESSAGE', // [NEW] 화면 메시지 초기화
    CANCEL_BUFF: 'CANCEL_BUFF', // [NEW] 버프 취소 (초록/용기 물약 자동 소모 중단)
};

// Re-export for compatibility if needed elsewhere, or remove if unused.
// It was exported before, so keeping it safe.
export { calculateStats };

export const gameReducer = (state, action) => {
    switch (action.type) {
        case GAME_ACTIONS.SET_STATE:
            return { ...state, ...action.payload };

        case GAME_ACTIONS.SET_SESSION_ID:
            return { ...state, sessionId: action.payload };

        case GAME_ACTIONS.UPDATE_COMBAT_STATE:
            return {
                ...state,
                combatState: { ...state.combatState, ...action.payload }
            };

        case GAME_ACTIONS.TELEPORT: {
            const mapId = action.payload;
            const targetMap = MAPS.find(m => m.id === mapId);
            if (!targetMap) return state;

            // [New] 입장 조건 체크 (수중 던전 등)
            if (targetMap.minLevel && state.level < targetMap.minLevel) {
                return { ...state, logs: [`[시스템] 레벨이 부족하여 ${targetMap.name}에 입장할 수 없습니다. (제한: ${targetMap.minLevel})`, ...state.logs] };
            }

            if (targetMap.requiredItem) {
                const hasItem = state.inventory.some(i => i.id === targetMap.requiredItem && i.isEquipped);
                if (!hasItem) {
                    if (mapId === 'water_dungeon') {
                        return { 
                            ...state, 
                            logs: [`[시스템] 수중 부추가 없어 입장할 수 없습니다.`, ...state.logs],
                            screenMessage: "수중 부츠가 있어야 입장 가능합니다." // [유저 요청] 화면 중앙 메시지
                        };
                    }
                    const requiredItemName = ITEMS.find(i => i.id === targetMap.requiredItem)?.name || targetMap.requiredItem;
                    return { ...state, logs: [`[시스템] ${requiredItemName}을(를) 착용해야 ${targetMap.name}에 입장할 수 있습니다.`, ...state.logs] };
                }
            }

            // Reset Combat State on Teleport
            // [Fix] kurzRespawnTime, bravePotionEndTime은 맵 이동 시에도 반드시 보존해야 하는 영속 상태
            return {
                ...state,
                currentMapId: mapId,
                combatState: {
                    isAttacking: false,
                    attackFrame: 0,
                    targetMonsterId: null,
                    monsterHpPercent: 100,
                    damageNumbers: [],
                    respawnTimestamp: 0,
                    potionEffect: state.combatState?.potionEffect || null, // 물약 이펙트도 유지
                    impact: null,
                    kurzRespawnTime: state.combatState?.kurzRespawnTime || 0,
                    hasteEndTime: state.combatState?.hasteEndTime || 0,
                    hasteAutoOff: state.combatState?.hasteAutoOff || false,
                    bravePotionEndTime: state.combatState?.bravePotionEndTime || 0,
                    braveAutoOff: state.combatState?.braveAutoOff || false,
                    magicHelmStrEndTime: state.combatState?.magicHelmStrEndTime || 0,
                },
                logs: [`[이동] ${targetMap.name}으로 이동했습니다.`, ...state.logs]
            };
        }

        case GAME_ACTIONS.AUTO_HUNT_TICK: {
            // Delegated to combat mechanics
            return processAutoHuntTick(state);
        }

        // [개선] 사망 후 부활 버튼 클릭 시 마을로 이동 + HP 회복 + 사망 상태 해제
        case GAME_ACTIONS.RESURRECT: {
            const stats = calculateStats(state);
            const naturalCon = Math.floor(state.level / 15);
            const maxHp = 50 + (state.level * (10 + (stats.con || 0) + (state.allocatedCon || 0) + naturalCon)) + (stats.maxHpBonus || 0);
            return {
                ...state,
                currentMapId: 'village',
                hp: maxHp,
                logs: ['[부활] 글루디오 마을에서 부활했습니다.', ...state.logs],
                combatState: {
                    isAttacking: false,
                    attackFrame: 0,
                    targetMonsterId: null,
                    monsterHpPercent: 100,
                    damageNumbers: [],
                    respawnTimestamp: 0,
                    potionEffect: null,
                    impact: null,
                    isPlayerDead: false,
                    playerDeathTimestamp: null,
                    deathPenaltyExp: 0,
                    kurzRespawnTime: state.combatState?.kurzRespawnTime || 0,
                    hasteEndTime: state.combatState?.hasteEndTime || 0,
                    hasteAutoOff: state.combatState?.hasteAutoOff || false,
                    bravePotionEndTime: state.combatState?.bravePotionEndTime || 0,
                    braveAutoOff: state.combatState?.braveAutoOff || false,
                    magicHelmStrEndTime: state.combatState?.magicHelmStrEndTime || 0,
                }
            };
        }

        case GAME_ACTIONS.ADD_ADENA:
            return { ...state, adena: state.adena + action.payload };

        // [스탯 시스템] 50레벨부터 STR 또는 CON에 포인트 배분
        case GAME_ACTIONS.ALLOCATE_STAT: {
            const statType = action.payload; // 'str' 또는 'con'
            if (statType !== 'str' && statType !== 'con') return state;
            
            // 사용 가능한 포인트 계산: (level - 50) - 이미 배분한 총량
            const totalAllocated = (state.allocatedStr || 0) + (state.allocatedCon || 0);
            const availablePoints = Math.max(0, state.level - 50) - totalAllocated;
            if (availablePoints <= 0) return state;

            return {
                ...state,
                allocatedStr: statType === 'str' ? (state.allocatedStr || 0) + 1 : (state.allocatedStr || 0),
                allocatedCon: statType === 'con' ? (state.allocatedCon || 0) + 1 : (state.allocatedCon || 0),
            };
        }

        case GAME_ACTIONS.BUY_ITEMS:
            return handleBuyItems(state, action.payload);

        case GAME_ACTIONS.USE_POTION:
            return handleUsePotion(state, action.payload);

        case GAME_ACTIONS.USE_SCROLL: {
            const { scrollUid, targetUid } = action.payload;
            return handleUseScroll(state, scrollUid, targetUid);
        }

        case GAME_ACTIONS.EQUIP_ITEM:
            return handleEquipItem(state, action.payload);

        case GAME_ACTIONS.UNEQUIP_ITEM:
            return handleUnequipItem(state, action.payload);

        case GAME_ACTIONS.SELL_ITEM: {
            const { uid, quantity } = action.payload;
            return handleSellItem(state, uid, quantity);
        }

        case GAME_ACTIONS.MOVE_ITEM: {
            const { fromIndex, toIndex } = action.payload;
            return handleMoveItem(state, fromIndex, toIndex);
        }

        case GAME_ACTIONS.ADD_LOG:
            return { ...state, logs: [action.payload, ...state.logs] };

        case GAME_ACTIONS.CANCEL_BUFF: {
            const buffType = action.payload; // 'haste' or 'brave'
            const timeKey = buffType === 'haste' ? 'hasteEndTime' : 'bravePotionEndTime';
            const offKey = buffType === 'haste' ? 'hasteAutoOff' : 'braveAutoOff';
            const buffName = buffType === 'haste' ? '초록 물약' : '용기의 물약';

            return {
                ...state,
                combatState: {
                    ...state.combatState,
                    [timeKey]: 0,
                    [offKey]: true // 자동 소모 중단
                },
                logs: [`[시스템] ${buffName} 효과가 취소되었습니다. (자동 소모 중단)`, ...state.logs]
            };
        }

        default:
            return state;
    }
};
