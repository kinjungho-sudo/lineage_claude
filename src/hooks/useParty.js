import { useEffect, useRef, useCallback, useState } from 'react';
import { supabase } from '../lib/supabase';
import { GAME_ACTIONS } from '../constants/gameActions';
import { calculateStats, getMaxHp } from '../mechanics/combat';

const PARTY_CHANNEL = 'game_party';

// Elf buff keys that can be shared with party
const ELF_BUFF_KEYS = [
    'resistMagicEndTime',
    'summonElementalEndTime',
    'windShotEndTime',
    'earthSkinEndTime',
    'fireWeaponEndTime',
    'naturesTouchEndTime',
];

// Wizard buff keys that can be shared with party
const WIZARD_BUFF_KEYS = [
    'enchantWeaponEndTime',
    'blessedArmorEndTime',
    'enchantDexEndTime',
    'enchantMightyEndTime',
];

// 아군에게 사용 불가한 스킬 타입 (리덕션 아머 등)
const ALLY_EXCLUDED_BUFF_TYPES = ['reduction_armor'];

// skillType → combatState의 buffKey 매핑
const SKILL_TYPE_TO_BUFF_KEY = {
    resist_magic:            'resistMagicEndTime',
    summon_lesser_elemental: 'summonElementalEndTime',
    wind_shot:               'windShotEndTime',
    earth_skin:              'earthSkinEndTime',
    fire_weapon:             'fireWeaponEndTime',
    natures_touch:           'naturesTouchEndTime',
    magic_helm_str:          'magicHelmStrEndTime',
    bounce_attack:           'bounceAttackEndTime',
    // 마법사 파티 버프
    enchant_weapon:          'enchantWeaponEndTime',
    blessed_armor_wizard:    'blessedArmorEndTime',
    enchant_dexterity:       'enchantDexEndTime',
    enchant_mighty:          'enchantMightyEndTime',
};

// skillType별 지속 시간 (ms) — state 업데이트 전 호출 시 직접 계산용
const BUFF_TYPE_DURATION = {
    resist_magic:            300000,
    summon_lesser_elemental: 10000,
    wind_shot:               1800000,
    earth_skin:              1800000,
    fire_weapon:             1800000,
    natures_touch:           1800000,
    magic_helm_str:          60000,
    bounce_attack:           120000,
    // 마법사 파티 버프
    enchant_weapon:          300000,
    blessed_armor_wizard:    300000,
    enchant_dexterity:       300000,
    enchant_mighty:          300000,
};

export const useParty = (dispatch, user, state) => {
    const channelRef = useRef(null);
    const prevBuffsRef = useRef({});
    const stateRef = useRef(state); // always-fresh state ref for channel listeners
    stateRef.current = state;
    const partnerLastSeenRef = useRef({}); // { characterName: timestamp } — 로그아웃 감지
    const [partnerOfflineStatuses, setPartnerOfflineStatuses] = useState({}); // { characterName: bool }

    const myName = state?.characterName;
    const myClass = state?.characterClass;
    const myParty = state?.party;

    // Subscribe to party channel on login
    useEffect(() => {
        if (!user || supabase.isOffline) return;

        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        const channel = supabase.channel(PARTY_CHANNEL, {
            config: { broadcast: { self: false } },
        });

        channel
            .on('broadcast', { event: 'party_invite' }, ({ payload }) => {
                const s = stateRef.current;
                if (payload.to !== s?.characterName) return;
                dispatch({
                    type: GAME_ACTIONS.PARTY_INVITE_RECEIVED,
                    payload: {
                        from: payload.from,
                        fromClass: payload.fromClass,
                        fromLevel: payload.fromLevel,
                        partyId: payload.partyId,
                        timestamp: Date.now(),
                    }
                });
            })
            .on('broadcast', { event: 'party_response' }, ({ payload }) => {
                const s = stateRef.current;
                if (payload.to !== s?.characterName) return;
                if (!payload.accepted) {
                    dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[파티] ${payload.from}님이 파티 초대를 거절했습니다.` });
                    return;
                }
                const stats = calculateStats(s);
                const maxHp = getMaxHp(s, stats);
                const newMember = { characterName: payload.from, characterClass: payload.fromClass, hp: payload.hp, maxHp: payload.maxHp, level: payload.fromLevel, currentMapId: payload.currentMapId };
                let newParty;
                if (s.party && s.party.id === payload.partyId) {
                    // 3번째 멤버 추가
                    newParty = { ...s.party, members: [...s.party.members, newMember] };
                } else {
                    newParty = {
                        id: payload.partyId,
                        leaderId: s.characterName,
                        members: [
                            { characterName: s.characterName, characterClass: s.characterClass, hp: s.hp, maxHp, level: s.level, currentMapId: s.currentMapId },
                            newMember,
                        ]
                    };
                }
                dispatch({ type: GAME_ACTIONS.PARTY_SET, payload: newParty });
                dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[파티] ${payload.from}님이 파티에 합류했습니다! (${newParty.members.length}/3)` });
                // 모든 멤버에게 최신 파티 정보 전파
                newParty.members.forEach(m => {
                    if (m.characterName !== s.characterName) {
                        channelRef.current?.send({
                            type: 'broadcast',
                            event: 'party_update',
                            payload: { partyId: newParty.id, to: m.characterName, party: newParty }
                        }).catch(() => {});
                    }
                });
            })
            .on('broadcast', { event: 'party_update' }, ({ payload }) => {
                const s = stateRef.current;
                if (payload.to !== s?.characterName) return;
                if (!payload.party) return;
                dispatch({ type: GAME_ACTIONS.PARTY_SET, payload: payload.party });
            })
            .on('broadcast', { event: 'party_member_update' }, ({ payload }) => {
                const s = stateRef.current;
                if (!s?.party || payload.partyId !== s.party.id) return;
                if (payload.characterName === s.characterName) return;
                // lastSeen 갱신 + 오프라인 상태 해제
                partnerLastSeenRef.current[payload.characterName] = Date.now();
                setPartnerOfflineStatuses(prev => {
                    if (!prev[payload.characterName]) return prev;
                    const next = { ...prev };
                    delete next[payload.characterName];
                    return next;
                });
                dispatch({ type: GAME_ACTIONS.PARTY_MEMBER_UPDATE, payload });
            })
            .on('broadcast', { event: 'party_boss_confirm' }, ({ payload }) => {
                const s = stateRef.current;
                if (!s?.party || payload.partyId !== s.party.id) return;
                if (payload.to !== s.characterName) return;
                dispatch({
                    type: GAME_ACTIONS.PARTY_BOSS_CONFIRM,
                    payload: {
                        from: payload.from,
                        bossName: payload.bossName,
                        mapId: payload.mapId,
                        timestamp: Date.now(),
                    }
                });
            })
            .on('broadcast', { event: 'party_boss_response' }, ({ payload }) => {
                const s = stateRef.current;
                if (!s?.party || payload.partyId !== s.party.id) return;
                if (payload.to !== s.characterName) return;
                if (payload.accepted) {
                    dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[파티] ${payload.from}님이 보스 사냥에 참여합니다!` });
                } else {
                    dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[파티] ${payload.from}님이 보스 사냥을 거절했습니다.` });
                    // 혼자 입장 여부를 묻는 상태 저장
                    dispatch({ type: GAME_ACTIONS.PARTY_BOSS_DECLINED, payload: { mapId: payload.mapId, bossName: payload.bossName } });
                }
            })
            .on('broadcast', { event: 'party_buff' }, ({ payload }) => {
                const s = stateRef.current;
                if (!s?.party || payload.partyId !== s.party.id) return;
                if (payload.to !== s.characterName) return;
                dispatch({ type: GAME_ACTIONS.PARTY_APPLY_BUFF, payload: { buffKey: payload.buffKey, endTime: payload.endTime } });
            })
            .on('broadcast', { event: 'party_heal' }, ({ payload }) => {
                const s = stateRef.current;
                if (!s?.party || payload.partyId !== s.party.id) return;
                if (payload.to !== s.characterName) return;
                dispatch({ type: GAME_ACTIONS.PARTY_HEAL_RECEIVED, payload: { healAmt: payload.healAmt, from: payload.from } });
            })
            .on('broadcast', { event: 'party_hunt_sync' }, ({ payload }) => {
                const s = stateRef.current;
                if (!s?.party || payload.partyId !== s.party.id) return;
                if (payload.from === s.characterName) return;
                const sender = s.party?.members?.find(m => m.characterName === payload.from);
                if (!sender || sender.currentMapId !== s.currentMapId) return;
                // 전투 중 sync 이벤트도 lastSeen 갱신
                partnerLastSeenRef.current[payload.from] = Date.now();
                dispatch({ type: GAME_ACTIONS.PARTY_HUNT_PARTNER_DAMAGE, payload: {
                    monsterId: payload.monsterId,
                    monsterHpPercent: payload.monsterHpPercent,
                    partnerLastAttackTimestamp: payload.lastAttackTimestamp,
                    partnerAttackIntervalMs: payload.attackIntervalMs,
                    monsterAttackTs: payload.monsterAttackTs,
                    partnerLastSkillTimestamp: payload.lastSkillTimestamp || 0,
                    partnerDamage: payload.damage || 0,
                    partnerClass: payload.characterClass || 'knight',
                    partnerIsMagic: payload.isMagicDamage || false,
                }});
            })
            .on('broadcast', { event: 'party_hunt_kill' }, ({ payload }) => {
                const s = stateRef.current;
                if (!s?.party || payload.partyId !== s.party.id) return;
                if (payload.to !== s.characterName) return;
                dispatch({ type: GAME_ACTIONS.PARTY_HUNT_PARTNER_KILL, payload: {
                    adena: payload.adena,
                    lootItem: payload.lootItem,
                    lootCount: payload.lootCount,
                    monsterName: payload.monsterName,
                    fromName: payload.fromName,
                    bossId: payload.bossId || null,
                }});
            })
            .on('broadcast', { event: 'party_aoe_damage' }, ({ payload }) => {
                const s = stateRef.current;
                if (!s?.party || payload.partyId !== s.party.id) return;
                if (payload.to !== s.characterName) return;
                dispatch({ type: GAME_ACTIONS.PARTY_AOE_DAMAGE, payload: { damage: payload.damage, spellName: payload.spellName } });
            })
            .on('broadcast', { event: 'party_leave' }, ({ payload }) => {
                const s = stateRef.current;
                if (!s?.party || payload.partyId !== s.party.id) return;
                if (payload.from === s.characterName) return;
                dispatch({ type: GAME_ACTIONS.PARTY_LEAVE });
                dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[파티] ${payload.from}님이 파티를 탈퇴했습니다.` });
            })
            .on('broadcast', { event: 'party_member_died' }, ({ payload }) => {
                const s = stateRef.current;
                if (!s?.party || payload.partyId !== s.party.id) return;
                if (payload.from === s.characterName) return;
                dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[파티] ${payload.from}님이 사망했습니다. 솔로로 전투를 계속합니다.` });
            })
            .on('broadcast', { event: 'party_member_revived' }, ({ payload }) => {
                const s = stateRef.current;
                if (!s?.party || payload.partyId !== s.party.id) return;
                if (payload.from === s.characterName) return;
                dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[파티] ${payload.from}님이 부활하여 사냥터로 복귀합니다!` });
            })
            .subscribe();

        channelRef.current = channel;

        // [로그인 파티 체크] 저장된 파티가 있으면 파트너를 "미확인 온라인"으로 초기화
        // partnerLastSeenRef를 20초 전 시점으로 설정 → 15초(35-20) 안에 heartbeat 없으면 파티 해체
        const savedParty = stateRef.current.party;
        if (savedParty?.members?.length > 1) {
            const myCharName = stateRef.current.characterName;
            const staleTs = Date.now() - 20000;
            savedParty.members.forEach(m => {
                if (m.characterName !== myCharName) {
                    partnerLastSeenRef.current[m.characterName] = staleTs;
                }
            });
        }

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user, myName]);

    // [광역 마법] aoeSpellHit 감지 → 파티원에게 broadcast
    const prevAoeRef = useRef(null);
    useEffect(() => {
        const aoe = state.combatState?.aoeSpellHit;
        if (!aoe || !channelRef.current || !myParty || supabase.isOffline) return;
        if (prevAoeRef.current?.timestamp === aoe.timestamp) return; // 중복 방지
        prevAoeRef.current = aoe;
        const targets = myParty.members?.filter(m => m.characterName !== myName) || [];
        targets.forEach(target => {
            channelRef.current?.send({
                type: 'broadcast',
                event: 'party_aoe_damage',
                payload: {
                    partyId: myParty.id,
                    to: target.characterName,
                    damage: aoe.damage,
                    spellName: aoe.spellName,
                    element: aoe.element,
                    timestamp: aoe.timestamp,
                }
            }).catch(() => {});
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.combatState?.aoeSpellHit?.timestamp, myParty?.id]);

    // Sync HP to party members on every hp/map change
    useEffect(() => {
        if (!channelRef.current || !myParty || !myName || supabase.isOffline) return;
        const stats = calculateStats(state);
        const maxHp = getMaxHp(state, stats);
        channelRef.current.send({
            type: 'broadcast',
            event: 'party_member_update',
            payload: {
                partyId: myParty.id,
                characterName: myName,
                hp: state.hp,
                maxHp,
                level: state.level,
                currentMapId: state.currentMapId,
            }
        }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.hp, state.currentMapId, myParty?.id]);

    // 파티 가입/탈퇴 시 lastSeen 초기화
    useEffect(() => {
        if (!myParty || !myName) {
            partnerLastSeenRef.current = {};
            setPartnerOfflineStatuses({});
            return;
        }
        const now = Date.now();
        (myParty.members || []).forEach(m => {
            if (m.characterName !== myName && partnerLastSeenRef.current[m.characterName] === undefined) {
                partnerLastSeenRef.current[m.characterName] = now;
            }
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [myParty?.id, myParty?.members?.length, myName]);

    // Heartbeat: 10초마다 presence 브로드캐스트
    useEffect(() => {
        if (!myParty || !myName || supabase.isOffline) return;
        const timer = setInterval(() => {
            if (!channelRef.current || supabase.isOffline) return;
            const s = stateRef.current;
            const stats = calculateStats(s);
            const maxHp = getMaxHp(s, stats);
            channelRef.current.send({
                type: 'broadcast',
                event: 'party_member_update',
                payload: {
                    partyId: myParty.id,
                    characterName: myName,
                    hp: s.hp,
                    maxHp,
                    level: s.level,
                    currentMapId: s.currentMapId,
                }
            }).catch(() => {});
        }, 10000);
        return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [myParty?.id, myName]);

    // 파티원 로그아웃 감지 (20s → 오프라인 표시, 35s → 파티 해제)
    useEffect(() => {
        if (!myParty || !myName) return;
        const timer = setInterval(() => {
            const now = Date.now();
            const s = stateRef.current;
            if (!s?.party) return;
            const partners = (s.party.members || []).filter(m => m.characterName !== myName);
            for (const partner of partners) {
                const lastSeen = partnerLastSeenRef.current[partner.characterName];
                if (!lastSeen) continue;
                const elapsed = now - lastSeen;
                if (elapsed > 35000) {
                    dispatch({ type: GAME_ACTIONS.PARTY_LEAVE });
                    dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[파티] ${partner.characterName}님의 접속이 끊겼습니다. 파티가 해체되었습니다.` });
                    partnerLastSeenRef.current = {};
                    setPartnerOfflineStatuses({});
                    return;
                } else if (elapsed > 20000) {
                    setPartnerOfflineStatuses(prev => {
                        if (prev[partner.characterName]) return prev;
                        return { ...prev, [partner.characterName]: true };
                    });
                }
            }
        }, 10000);
        return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [myParty?.id, myName, dispatch]);

    // Detect wizard buff usage and share with party
    const prevWizardBuffsRef = useRef({});
    useEffect(() => {
        if (!channelRef.current || !myParty || myClass !== 'wizard' || supabase.isOffline) return;
        const combatState = state.combatState || {};
        const target = myParty.members?.find(m => m.characterName !== myName);
        if (!target) return;
        WIZARD_BUFF_KEYS.forEach(buffKey => {
            const newEnd = combatState[buffKey] || 0;
            const prevEnd = prevWizardBuffsRef.current[buffKey] || 0;
            if (newEnd > prevEnd && newEnd > Date.now()) {
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'party_buff',
                    payload: { partyId: myParty.id, to: target.characterName, buffKey, endTime: newEnd }
                }).catch(() => {});
            }
        });
        prevWizardBuffsRef.current = { ...combatState };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        state.combatState?.enchantWeaponEndTime,
        state.combatState?.blessedArmorEndTime,
        state.combatState?.enchantDexEndTime,
        state.combatState?.enchantMightyEndTime,
        myParty?.id,
    ]);

    // Detect elf buff usage and share with party
    useEffect(() => {
        if (!channelRef.current || !myParty || myClass !== 'elf' || supabase.isOffline) return;
        const combatState = state.combatState || {};

        // Find party member to buff (the non-elf)
        const target = myParty.members?.find(m => m.characterName !== myName);
        if (!target) return;

        ELF_BUFF_KEYS.forEach(buffKey => {
            const newEnd = combatState[buffKey] || 0;
            const prevEnd = prevBuffsRef.current[buffKey] || 0;
            if (newEnd > prevEnd && newEnd > Date.now()) {
                channelRef.current?.send({
                    type: 'broadcast',
                    event: 'party_buff',
                    payload: {
                        partyId: myParty.id,
                        to: target.characterName,
                        buffKey,
                        endTime: newEnd,
                    }
                }).catch(() => {});
            }
        });
        prevBuffsRef.current = { ...combatState };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
        state.combatState?.resistMagicEndTime,
        state.combatState?.summonElementalEndTime,
        state.combatState?.windShotEndTime,
        state.combatState?.earthSkinEndTime,
        state.combatState?.fireWeaponEndTime,
        state.combatState?.naturesTouchEndTime,
        myParty?.id,
    ]);

    // [파티 사망] 사망 시 파티원에게 알림
    const prevIsDeadRef = useRef(false);
    useEffect(() => {
        const isDead = state.combatState?.isPlayerDead;
        if (isDead === prevIsDeadRef.current) return;
        prevIsDeadRef.current = isDead;
        if (!channelRef.current || !myParty || supabase.isOffline) return;
        const others = myParty.members?.filter(m => m.characterName !== myName) || [];
        if (isDead) {
            // 사망 브로드캐스트
            others.forEach(m => {
                channelRef.current?.send({
                    type: 'broadcast', event: 'party_member_died',
                    payload: { partyId: myParty.id, from: myName, to: m.characterName }
                }).catch(() => {});
            });
        } else if (!isDead && others.length > 0) {
            // 부활/재참여 브로드캐스트
            others.forEach(m => {
                channelRef.current?.send({
                    type: 'broadcast', event: 'party_member_revived',
                    payload: { partyId: myParty.id, from: myName, to: m.characterName }
                }).catch(() => {});
            });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.combatState?.isPlayerDead, myParty?.id]);

    // [파티 힐] partyHealEvent 감지 → 대상 파티원에게 heal broadcast
    const prevPartyHealRef = useRef(null);
    useEffect(() => {
        const healEvent = state.combatState?.partyHealEvent;
        if (!healEvent || healEvent.timestamp === prevPartyHealRef.current) return;
        prevPartyHealRef.current = healEvent.timestamp;
        if (!channelRef.current || !myParty || supabase.isOffline) return;
        channelRef.current.send({
            type: 'broadcast',
            event: 'party_heal',
            payload: { partyId: myParty.id, to: healEvent.targetName, healAmt: healEvent.healAmt, from: myName },
        }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.combatState?.partyHealEvent?.timestamp, myParty?.id]);

    // [파티 사냥] 몬스터 HP + 공격 정보를 파티원 전체에게 브로드캐스트
    useEffect(() => {
        if (!channelRef.current || !myParty || supabase.isOffline) return;
        const cs = state.combatState || {};
        if (!cs.targetMonsterId) return;
        const sameMapMembers = myParty.members?.filter(m => m.characterName !== myName && m.currentMapId === state.currentMapId);
        if (!sameMapMembers || sameMapMembers.length === 0) return;
        const payload = {
            partyId: myParty.id,
            from: myName,
            monsterId: cs.targetMonsterId,
            monsterHpPercent: cs.monsterHpPercent ?? 100,
            lastAttackTimestamp: cs.lastAttackTimestamp || 0,
            attackIntervalMs: cs.attackIntervalMs || 1500,
            monsterAttackTs: cs.playerImpact?.timestamp || 0,
            lastSkillTimestamp: cs.lastSpellCastTime || 0,
        damage: cs.lastAttackDamage || 0,
        characterClass: myClass,
        isMagicDamage: cs.lastAttackIsMagic || false,
        };
        sameMapMembers.forEach(() => {
            channelRef.current?.send({ type: 'broadcast', event: 'party_hunt_sync', payload }).catch(() => {});
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.combatState?.monsterHpPercent, state.combatState?.lastAttackTimestamp, state.combatState?.playerImpact?.timestamp, state.combatState?.lastSpellCastTime, state.combatState?.lastAttackDamage, myParty?.id]);

    // [파티 사냥] 킬 시 파티원 전체에게 보상 브로드캐스트
    useEffect(() => {
        if (!channelRef.current || !myParty || supabase.isOffline) return;
        const cs = state.combatState || {};
        const reward = cs.partyKillReward;
        if (!reward || reward.timestamp === undefined) return;
        const otherMembers = myParty.members?.filter(m => m.characterName !== myName);
        if (!otherMembers || otherMembers.length === 0) return;

        // 아이템을 받을 파티원 랜덤 선택 (lootItem이 있을 때만)
        const lootTarget = reward.lootItem
            ? otherMembers[Math.floor(Math.random() * otherMembers.length)]
            : null;

        otherMembers.forEach(member => {
            channelRef.current?.send({
                type: 'broadcast',
                event: 'party_hunt_kill',
                payload: {
                    partyId: myParty.id,
                    to: member.characterName,
                    fromName: myName,
                    adena: reward.adena,
                    lootItem: lootTarget?.characterName === member.characterName ? reward.lootItem : null,
                    lootCount: lootTarget?.characterName === member.characterName ? reward.lootCount : 0,
                    monsterName: reward.monsterName,
                    bossId: reward.bossId || null,
                }
            }).catch(() => {});
        });

        // 파티원이 아이템을 얻었을 때 나에게도 로그 표시
        if (lootTarget && reward.lootItem) {
            dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[파티] ${lootTarget.characterName}가 ${reward.lootItem.name} 획득했습니다.` });
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.combatState?.partyKillReward?.timestamp, myParty?.id]);

    // Invite a friend to party (최대 3인)
    const inviteToParty = useCallback((targetName) => {
        if (!channelRef.current || supabase.isOffline) return;
        if (state.party) {
            if (state.party.leaderId !== myName) {
                dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: '[파티] 파티장만 초대할 수 있습니다.' });
                return;
            }
            if ((state.party.members?.length || 0) >= 3) {
                dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: '[파티] 파티가 꽉 찼습니다. (최대 3명)' });
                return;
            }
        }
        // 기존 파티 ID 재사용 or 신규 생성
        const partyId = state.party?.id || `party_${myName}_${Date.now()}`;
        channelRef.current.send({
            type: 'broadcast',
            event: 'party_invite',
            payload: {
                to: targetName,
                from: myName,
                fromClass: myClass,
                fromLevel: state.level,
                partyId,
            }
        }).catch(() => {});
        dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[파티] ${targetName}님에게 파티 초대를 보냈습니다.` });
    }, [channelRef, myName, myClass, state.level, state.party, dispatch]);

    // Accept a party invite
    const acceptInvite = useCallback(() => {
        const invite = state.partyInvite;
        if (!invite || !channelRef.current) return;

        const stats = calculateStats(state);
        const maxHp = getMaxHp(state, stats);

        // Build our own party state
        const newParty = {
            id: invite.partyId,
            leaderId: invite.from,
            members: [
                { characterName: invite.from, characterClass: invite.fromClass, hp: invite.fromLevel * 10, maxHp: invite.fromLevel * 10, level: invite.fromLevel, currentMapId: 'unknown' },
                { characterName: myName, characterClass: myClass, hp: state.hp, maxHp, level: state.level, currentMapId: state.currentMapId },
            ]
        };
        dispatch({ type: GAME_ACTIONS.PARTY_SET, payload: newParty });
        dispatch({ type: GAME_ACTIONS.PARTY_INVITE_CLEAR });
        dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[파티] ${invite.from}님의 파티에 합류했습니다!` });

        channelRef.current.send({
            type: 'broadcast',
            event: 'party_response',
            payload: {
                to: invite.from,
                from: myName,
                fromClass: myClass,
                fromLevel: state.level,
                hp: state.hp,
                maxHp,
                currentMapId: state.currentMapId,
                partyId: invite.partyId,
                accepted: true,
            }
        }).catch(() => {});
    }, [state, myName, myClass, dispatch]);

    // 파티원에게 버프 수동 시전 (리덕션 아머 제외)
    const castBuffOnTarget = useCallback((skillType, targetName) => {
        if (!channelRef.current || !myParty || supabase.isOffline) return;
        if (ALLY_EXCLUDED_BUFF_TYPES.includes(skillType)) return;
        const buffKey = SKILL_TYPE_TO_BUFF_KEY[skillType];
        if (!buffKey) return;
        const duration = BUFF_TYPE_DURATION[skillType];
        if (!duration) return;
        const endTime = Date.now() + duration;
        channelRef.current.send({
            type: 'broadcast',
            event: 'party_buff',
            payload: {
                partyId: myParty.id,
                to: targetName,
                buffKey,
                endTime,
            }
        }).catch(() => {});
        dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: `[파티] ${targetName}님에게 버프를 시전했습니다.` });
    }, [channelRef, myParty, dispatch]);

    // Decline a party invite
    const declineInvite = useCallback(() => {
        const invite = state.partyInvite;
        if (!invite || !channelRef.current) return;
        dispatch({ type: GAME_ACTIONS.PARTY_INVITE_CLEAR });
        channelRef.current.send({
            type: 'broadcast',
            event: 'party_response',
            payload: {
                to: invite.from,
                from: myName,
                partyId: invite.partyId,
                accepted: false,
            }
        }).catch(() => {});
    }, [state.partyInvite, myName, dispatch]);

    // Leave party
    const leaveParty = useCallback(() => {
        if (!state.party || !channelRef.current) return;
        channelRef.current.send({
            type: 'broadcast',
            event: 'party_leave',
            payload: {
                partyId: state.party.id,
                from: myName,
            }
        }).catch(() => {});
        dispatch({ type: GAME_ACTIONS.PARTY_LEAVE });
        dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: '[파티] 파티를 탈퇴했습니다.' });
    }, [state.party, myName, dispatch]);

    // Send boss fight confirmation to party
    const sendBossConfirm = useCallback((bossName, mapId) => {
        if (!state.party || !channelRef.current || supabase.isOffline) return;
        const target = state.party.members?.find(m => m.characterName !== myName);
        if (!target) return;
        channelRef.current.send({
            type: 'broadcast',
            event: 'party_boss_confirm',
            payload: {
                partyId: state.party.id,
                to: target.characterName,
                from: myName,
                bossName,
                mapId,
            }
        }).catch(() => {});
    }, [state.party, myName]);

    // Accept boss fight (move to boss map)
    const acceptBossConfirm = useCallback(() => {
        const confirm = state.partyBossConfirm;
        if (!confirm || !channelRef.current) return;
        const target = state.party?.members?.find(m => m.characterName !== myName);
        if (!target) return;

        channelRef.current.send({
            type: 'broadcast',
            event: 'party_boss_response',
            payload: {
                partyId: state.party?.id,
                to: confirm.from,
                from: myName,
                accepted: true,
                bossName: confirm.bossName,
                mapId: confirm.mapId,
            }
        }).catch(() => {});

        dispatch({ type: GAME_ACTIONS.PARTY_BOSS_CONFIRM_CLEAR });
        dispatch({ type: GAME_ACTIONS.TELEPORT, payload: confirm.mapId });
    }, [state.partyBossConfirm, state.party, myName, dispatch]);

    // Decline boss fight
    const declineBossConfirm = useCallback(() => {
        const confirm = state.partyBossConfirm;
        if (!confirm || !channelRef.current) return;
        channelRef.current.send({
            type: 'broadcast',
            event: 'party_boss_response',
            payload: {
                partyId: state.party?.id,
                to: confirm.from,
                from: myName,
                accepted: false,
                bossName: confirm.bossName,
                mapId: confirm.mapId,
            }
        }).catch(() => {});
        dispatch({ type: GAME_ACTIONS.PARTY_BOSS_CONFIRM_CLEAR });
    }, [state.partyBossConfirm, state.party, myName, dispatch]);

    return {
        inviteToParty,
        acceptInvite,
        declineInvite,
        leaveParty,
        sendBossConfirm,
        acceptBossConfirm,
        declineBossConfirm,
        castBuffOnTarget,
        partnerOfflineStatuses,
    };
};
