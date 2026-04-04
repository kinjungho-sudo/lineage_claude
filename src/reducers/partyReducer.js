import { GAME_ACTIONS } from '../constants/gameActions';
import { calculateStats, getMaxHp } from '../mechanics/combat';

export const partyReducer = (state, action) => {
    switch (action.type) {

        case GAME_ACTIONS.PARTY_SET: {
            return { ...state, party: action.payload };
        }

        case GAME_ACTIONS.PARTY_LEAVE: {
            return { ...state, party: null, partyInvite: null, partyBossConfirm: null };
        }

        case GAME_ACTIONS.PARTY_INVITE_RECEIVED: {
            return { ...state, partyInvite: action.payload };
        }

        case GAME_ACTIONS.PARTY_INVITE_CLEAR: {
            return { ...state, partyInvite: null };
        }

        case GAME_ACTIONS.PARTY_MEMBER_UPDATE: {
            if (!state.party) return state;
            const { characterName, hp, maxHp, level, currentMapId } = action.payload;
            const updatedMembers = (state.party.members || []).map(m =>
                m.characterName === characterName
                    ? { ...m, hp, maxHp, level, currentMapId }
                    : m
            );
            return { ...state, party: { ...state.party, members: updatedMembers } };
        }

        case GAME_ACTIONS.PARTY_BOSS_CONFIRM: {
            return { ...state, partyBossConfirm: action.payload };
        }

        case GAME_ACTIONS.PARTY_BOSS_CONFIRM_CLEAR: {
            return { ...state, partyBossConfirm: null };
        }

        case GAME_ACTIONS.PARTY_BOSS_DECLINED: {
            // 파티원이 보스 전투를 거절 → 혼자 입장 여부 묻기 위해 저장
            return { ...state, partyBossDeclined: action.payload };
        }

        case GAME_ACTIONS.PARTY_BOSS_DECLINED_CLEAR: {
            return { ...state, partyBossDeclined: null };
        }

        case GAME_ACTIONS.SET_SOLO_BOSS_MODE: {
            return {
                ...state,
                combatState: {
                    ...state.combatState,
                    soloModeForBoss: action.payload,
                },
            };
        }

        case GAME_ACTIONS.PARTY_AOE_DAMAGE: {
            // 바포메트 광역 마법 — 파티원에게도 동일 데미지 적용
            const { damage, spellName } = action.payload;
            if (state.combatState?.isPlayerDead) return state;
            const newHp = Math.max(0, state.hp - damage);
            return {
                ...state,
                hp: newHp,
                combatState: {
                    ...state.combatState,
                    isPlayerDead: newHp <= 0 ? true : state.combatState?.isPlayerDead,
                    playerImpact: { type: 'magic', element: 'neutral', timestamp: Date.now() },
                },
                combatLogs: [
                    ...(state.combatLogs || []),
                    { type: 'spell', text: `[광역] 바포메트의 ${spellName}에 ${damage} 피해를 받았습니다!` }
                ].slice(-50),
            };
        }

        case GAME_ACTIONS.PARTY_APPLY_BUFF: {
            // Apply a buff received from a party member (elf → knight)
            const { buffKey, endTime } = action.payload;
            return {
                ...state,
                combatState: {
                    ...state.combatState,
                    [buffKey]: endTime,
                },
                logs: [`[파티] 파티원이 버프를 시전했습니다.`, ...state.logs].slice(0, 50),
            };
        }

        case GAME_ACTIONS.PARTY_HUNT_PARTNER_DAMAGE: {
            const { monsterId, monsterHpPercent: partnerHp, partnerLastAttackTimestamp, partnerAttackIntervalMs, monsterAttackTs, partnerLastSkillTimestamp, partnerDamage, partnerIsMagic } = action.payload;
            const cs = state.combatState || {};
            if (cs.targetMonsterId && cs.targetMonsterId !== monsterId) return state;
            if (cs.isPlayerDead || cs.isDying) return state;
            const localHp = cs.monsterHpPercent ?? 100;
            const newHp = (partnerHp !== null && partnerHp !== undefined) ? Math.min(localHp, partnerHp) : localHp;
            const hpChanged = newHp < localHp;
            const skillUsed = partnerLastSkillTimestamp && partnerLastSkillTimestamp > (cs.partnerLastSkillTimestamp || 0);
            const now = Date.now();
            const newDamageNumbers = [...(cs.damageNumbers || [])].filter(d => now - d.timestamp < 1000);
            if (hpChanged && partnerDamage > 0) {
                newDamageNumbers.push({ value: partnerDamage, timestamp: now, isPartnerDamage: true, isMagic: partnerIsMagic, xOff: 35 });
            }
            return {
                ...state,
                combatState: {
                    ...cs,
                    ...(hpChanged ? { monsterHpPercent: newHp, targetMonsterId: cs.targetMonsterId || monsterId } : {}),
                    // 파티원 공격 타임스탬프 → 공격 모션 동기화
                    partnerLastAttackTimestamp: partnerLastAttackTimestamp || cs.partnerLastAttackTimestamp,
                    partnerAttackIntervalMs: partnerAttackIntervalMs || cs.partnerAttackIntervalMs || 1500,
                    // 파티원이 몬스터에게 공격받은 타임스탬프 → 피격 이펙트
                    partnerMonsterAttackTs: (monsterAttackTs && monsterAttackTs > (cs.partnerMonsterAttackTs || 0)) ? monsterAttackTs : cs.partnerMonsterAttackTs,
                    // 파티원이 몬스터에게 데미지 준 타임스탬프 → 시안 이펙트
                    ...(hpChanged ? { partnerHitTimestamp: now } : {}),
                    damageNumbers: newDamageNumbers,
                    // 파티원 스킬 시전 타임스탬프 → 스킬 이펙트
                    ...(skillUsed ? { partnerLastSkillTimestamp } : {}),
                },
            };
        }

        case GAME_ACTIONS.PARTY_HUNT_PARTNER_KILL: {
            // Receive kill rewards from partner (adena + optional loot item)
            const { adena, lootItem, lootCount, monsterName, fromName, bossId } = action.payload;
            let newLogs = [...state.logs];
            let newInventory = [...state.inventory];

            if (adena > 0) {
                newLogs = [`[파티] 아데나 +${adena}`, ...newLogs].slice(0, 50);
            }
            if (lootItem) {
                const isStackable = lootItem.type === 'scroll' || lootItem.type === 'potion' || lootItem.type === 'crystal';
                if (isStackable) {
                    const existingIdx = newInventory.findIndex(i => i.id === lootItem.id);
                    if (existingIdx >= 0) {
                        newInventory[existingIdx] = { ...newInventory[existingIdx], count: (newInventory[existingIdx].count || 1) + (lootCount || 1) };
                    } else {
                        newInventory.push({ ...lootItem, uid: Date.now() + Math.random(), count: lootCount || 1, isEquipped: false });
                    }
                } else {
                    newInventory.push({ ...lootItem, uid: Date.now() + Math.random(), count: 1, isEquipped: false });
                }
                const countStr = lootCount > 1 ? ` x${lootCount}` : '';
                newLogs = [`[파티] ${fromName}가 ${lootItem.name}${countStr} 획득했습니다.`, ...newLogs].slice(0, 50);
            }

            const now = Date.now();
            const bossRespawnMs = 10 * 60 * 1000; // 10분
            return {
                ...state,
                adena: state.adena + (adena || 0),
                inventory: newInventory,
                logs: newLogs,
                combatState: {
                    ...state.combatState,
                    ...(bossId === 'kurz'     ? { kurzRespawnTime:      now + bossRespawnMs } : {}),
                    ...(bossId === 'baphomet' ? { baphometRespawnTime:  now + bossRespawnMs } : {}),
                },
            };
        }

        case GAME_ACTIONS.PARTY_HEAL_RECEIVED: {
            const { healAmt, from } = action.payload;
            const stats = calculateStats(state);
            const maxHp = getMaxHp(state, stats);
            return {
                ...state,
                hp: Math.min(maxHp, state.hp + healAmt),
                logs: [`[파티] ${from}님의 힐! HP +${healAmt}`, ...state.logs].slice(0, 50),
                combatState: {
                    ...state.combatState,
                    buffEffect: { type: 'heal', timestamp: Date.now() },
                },
            };
        }

        default:
            return state;
    }
};
