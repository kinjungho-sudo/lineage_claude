import { GAME_ACTIONS } from '../constants/gameActions';
import { ITEMS } from '../data/items';
import { MAPS } from '../data/monsters';
import { calculateStats, processAutoHuntTick, getMaxHp } from '../mechanics/combat';

export const combatReducer = (state, action) => {
    switch (action.type) {
        case GAME_ACTIONS.UPDATE_COMBAT_STATE:
            return {
                ...state,
                combatState: { ...state.combatState, ...action.payload }
            };

        case GAME_ACTIONS.TELEPORT: {
            const requestedMapId = action.payload;
            let finalMapId = requestedMapId;

            if (requestedMapId === 'village') {
                finalMapId = state.characterClass === 'elf' ? 'elf_village' : 'village';
            }

            const targetMap = MAPS.find(m => m.id === finalMapId);
            if (!targetMap) return state;

            if (targetMap.requiredItem) {
                const hasItem = state.inventory.some(i => i.id === targetMap.requiredItem && i.isEquipped);
                if (!hasItem) {
                    if (finalMapId === 'water_dungeon') {
                        return {
                            ...state,
                            logs: [`[시스템] 수중 부추가 없어 입장할 수 없습니다.`, ...state.logs],
                            screenMessage: "수중 부츠가 있어야 입장 가능합니다."
                        };
                    }
                    const requiredItemName = ITEMS.find(i => i.id === targetMap.requiredItem)?.name || targetMap.requiredItem;
                    return { ...state, logs: [`[시스템] ${requiredItemName}을(를) 착용해야 ${targetMap.name}에 입장할 수 있습니다.`, ...state.logs] };
                }
            }

            return {
                ...state,
                currentMapId: finalMapId,
                combatState: {
                    // 버프/쿨다운 등 모든 기존 상태를 유지
                    ...state.combatState,
                    // 전투 관련 필드만 초기화
                    isAttacking: false,
                    attackFrame: 0,
                    targetMonsterId: null,
                    monsterHpPercent: 100,
                    damageNumbers: [],
                    respawnTimestamp: 0,
                    impact: null,
                    isMonsterStunned: 0,
                },
                logs: [`[이동] ${targetMap.name}으로 이동했습니다.`, ...state.logs]
            };
        }

        case GAME_ACTIONS.AUTO_HUNT_TICK:
            return processAutoHuntTick(state);

        case GAME_ACTIONS.RESURRECT: {
            const stats = calculateStats(state);
            const maxHp = getMaxHp(state, stats);
            const resurrectMap = state.characterClass === 'elf' ? 'elf_village' : 'village';
            const resurrectMsg = state.characterClass === 'elf' ? '[부활] 요정의 숲에서 부활했습니다.' : '[부활] 글루디오 마을에서 부활했습니다.';
            return {
                ...state,
                currentMapId: resurrectMap,
                hp: maxHp,
                logs: [resurrectMsg, ...state.logs],
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
                    baphometRespawnTime: state.combatState?.baphometRespawnTime || 0,
                    hasteEndTime: 0,
                    hasteAutoOff: false,
                    bravePotionEndTime: 0,
                    braveAutoOff: false,
                    bluePotionEndTime: 0,
                    blueAutoOff: false,
                    mpRegenPotionEndTime: 0,
                    mpRegenAutoOff: false,
                    magicHelmStrEndTime: 0,
                    bounceAttackEndTime: 0,
                }
            };
        }

        case GAME_ACTIONS.REJOIN_COMBAT: {
            const rejoinStats = calculateStats(state);
            const rejoinMaxHp = getMaxHp(state, rejoinStats);
            const rejoinMapId = state.combatState?.savedRejoinMapId;
            const isBossRejoin = !!state.combatState?.savedMonsterHpPercent;
            return {
                ...state,
                currentMapId: rejoinMapId || state.currentMapId,
                hp: Math.floor(rejoinMaxHp * 0.3),
                combatState: {
                    ...state.combatState,
                    isPlayerDead: false,
                    pendingRejoin: false,
                    isAttacking: true,
                    targetMonsterId: null,
                    monsterHpPercent: isBossRejoin ? (state.combatState?.savedMonsterHpPercent ?? 100) : 100,
                    savedMonsterHpPercent: undefined,
                    savedRejoinMapId: undefined,
                },
                logs: [rejoinMapId ? '[파티] 사냥터로 복귀했습니다!' : '[전투] 전투에 다시 참여했습니다!', ...state.logs].slice(0, 50),
            };
        }

        case GAME_ACTIONS.CANCEL_BUFF: {
            const buffType = action.payload;
            const timeKey = buffType === 'haste' ? 'hasteEndTime'
                : buffType === 'brave' ? 'bravePotionEndTime'
                : buffType === 'blue' ? 'bluePotionEndTime'
                : 'mpRegenPotionEndTime';
            const offKey = buffType === 'haste' ? 'hasteAutoOff'
                : buffType === 'brave' ? 'braveAutoOff'
                : buffType === 'blue' ? 'blueAutoOff'
                : 'mpRegenAutoOff';
            const buffName = buffType === 'haste' ? '초록 물약'
                : buffType === 'brave' ? '용기의 물약'
                : buffType === 'blue' ? '파란 물약'
                : '마나 회복 물약';
            return {
                ...state,
                combatState: {
                    ...state.combatState,
                    [timeKey]: 0,
                    [offKey]: true
                },
                logs: [`[시스템] ${buffName} 효과가 취소되었습니다. (자동 소모 중단)`, ...state.logs]
            };
        }

        default:
            return state;
    }
};
