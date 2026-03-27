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
    handleMoveItem,
    handleDepositWarehouse,
    handleWithdrawWarehouse
} from '../mechanics/inventory';

export const GAME_VERSION = '0.9.8'; // FORCE RESET - Version Bump (Phase 27)

export const INITIAL_STATE = {
    version: GAME_VERSION,
    characterName: '', // [NEW] 캐릭터 개별 이름
    characterClass: 'knight', // [NEW] 캐릭터 직업 (knight, elf, wizard)
    level: 1,
    currentExp: 0,
    maxExp: 100, // 이전 저장소 호환성을 위해 남겨두되 UI에서는 자체 계산
    hp: 50,
    mp: 30,
    adena: 500000, 
    inventory: [],
    // [Stats] Base stats will be handled by class
    baseStr: 0,
    baseDex: 0,
    baseCon: 0,
    baseInt: 0,
    baseWis: 0,
    allocatedStr: 0,
    allocatedDex: 0,
    allocatedCon: 0,
    allocatedInt: 0,
    allocatedWis: 0,
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
    warehouse: [], // 창고
    friends: [], // [친구] 친구 목록 상태
    pendingAnnouncements: [], // [공지] 브로드캐스트할 전역 메시지 큐
    allCharacters: [], // [캐릭터 선택] 한 계정(어카운트)이 보유한 전체 캐릭터 리스트
    isCharacterSelected: false, // [캐릭터 선택] 현재 플레이 중인 캐릭터가 선택되었는지 여부
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
    USE_SKILL: 'USE_SKILL', // [NEW] 스킬 바에서 스킬 사용 (Phase 103)
    DEPOSIT_WAREHOUSE: 'DEPOSIT_WAREHOUSE', // 창고 보관
    WITHDRAW_WAREHOUSE: 'WITHDRAW_WAREHOUSE', // 창고 출고
    ADD_FRIEND: 'ADD_FRIEND', // 친구 등록
    REMOVE_FRIEND: 'REMOVE_FRIEND', // 친구 삭제
    CLEAR_ANNOUNCEMENTS: 'CLEAR_ANNOUNCEMENTS', // 전역 공지 플러시
    INITIALIZE_ACCOUNT: 'INITIALIZE_ACCOUNT', // [캐릭터 선택] 계정 로그인 시 전체 데이터(캐릭터 목록) 주입
    SELECT_CHARACTER: 'SELECT_CHARACTER', // [캐릭터 선택] 특정 캐릭터로 접속
    CREATE_CHARACTER: 'CREATE_CHARACTER', // [캐릭터 선택] 신규 캐릭터 생성
    LOGOUT_CHARACTER: 'LOGOUT_CHARACTER', // [캐릭터 선택] 캐릭터 선택 화면으로 이동
};

// Re-export for compatibility if needed elsewhere, or remove if unused.
// It was exported before, so keeping it safe.
export { calculateStats };

export const gameReducer = (state, action) => {
    switch (action.type) {
        case GAME_ACTIONS.SET_STATE:
            return { ...state, ...action.payload };

        case GAME_ACTIONS.INITIALIZE_ACCOUNT: {
            const accountData = action.payload || {};
            // 마이그레이션: 기존 단일 캐릭터 데이터면 allCharacters로 변환
            let chars = accountData.allCharacters || [];
            // [Fix] Robust Migration: If characters are empty but it looks like a legacy account, convert it.
            if (chars.length === 0 && (accountData.level > 1 || accountData.characterName || accountData.inventory?.length > 0)) {
                const legacy = { ...accountData };
                delete legacy.allCharacters;
                delete legacy.isCharacterSelected;
                // [SAFETY] Generate a stable ID for legacy accounts
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
                isCharacterSelected: false
            };
        }

        case GAME_ACTIONS.CREATE_CHARACTER: {
            const { name, class: charClass } = action.payload;
            if (state.allCharacters.length >= 3) return state;

            // Class-specific Base Stats & Starting Map
            let baseStats = { str: 16, dex: 12, con: 14, int: 8, wis: 9 }; // Knight default
            let startMap = 'village';

            if (charClass === 'elf') {
                baseStats = { str: 10, dex: 18, con: 12, int: 8, wis: 10 };
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
                inventory: charClass === 'elf' ? [
                    { ...ITEMS.find(i => i.id === 'bow_cross'), uid: Date.now() + 1, count: 1, enchant: 0, isEquipped: true },
                    { ...ITEMS.find(i => i.id === 'potion_red'), uid: Date.now() + 2, count: 50, enchant: 0, isEquipped: false }
                ] : [
                    { ...ITEMS.find(i => i.id === 'sword_katana'), uid: Date.now() + 1, count: 1, enchant: 0, isEquipped: true },
                    { ...ITEMS.find(i => i.id === 'potion_red'), uid: Date.now() + 2, count: 50, enchant: 0, isEquipped: false }
                ],
                // [FIX] Equipment mapping for new characters
                equipment: {
                    weapon: charClass === 'elf' ? { ...ITEMS.find(i => i.id === 'bow_cross'), uid: Date.now() + 1, count: 1, enchant: 0, isEquipped: true } : { ...ITEMS.find(i => i.id === 'sword_katana'), uid: Date.now() + 1, count: 1, enchant: 0, isEquipped: true }
                },
                isCharacterSelected: false,
                allCharacters: [] 
            };

            return {
                ...state,
                allCharacters: [...state.allCharacters, newChar]
            };
        }

        case GAME_ACTIONS.SELECT_CHARACTER: {
            let targetChar = state.allCharacters.find(c => c.id === action.payload);
            if (!targetChar) return state;

            // [Reverted] 요정 전용 마을 이동 삭제 (글루디오 시작)
            if (targetChar.characterClass === 'elf' && targetChar.currentMapId === 'elf_village') {
                targetChar = { ...targetChar, currentMapId: 'village' };
            }

            return {
                ...state,
                ...targetChar,
                allCharacters: state.allCharacters, // 계정 정보 유지
                isCharacterSelected: true
            };
        }

        case GAME_ACTIONS.LOGOUT_CHARACTER: {
            // [Fix] 현재 플레이 중인 캐릭터의 최신 진행 상태(레벨, 아데나 등)를 전체 리스트 슬롯에 동기화
            let updatedAllChars = [...state.allCharacters];
            if (state.id) {
                const charIdx = updatedAllChars.findIndex(c => c.id === state.id);
                if (charIdx >= 0) {
                    const { allCharacters, logs, combatLogs, combatState, ...activeCharData } = state;
                    updatedAllChars[charIdx] = { 
                        ...activeCharData, 
                        allCharacters: [], // 슬롯 내 중첩 방지
                        logs: (state.logs || []).slice(0, 50),
                        combatLogs: (state.combatLogs || []).slice(0, 30)
                    };
                }
            }

            return {
                ...INITIAL_STATE,
                version: GAME_VERSION,
                allCharacters: updatedAllChars, // 최신화된 리스트 보관
                isCharacterSelected: false,
                sessionId: state.sessionId // 세션 유지
            };
        }

        case GAME_ACTIONS.SET_SESSION_ID:
            return { ...state, sessionId: action.payload };

        case GAME_ACTIONS.UPDATE_COMBAT_STATE:
            return {
                ...state,
                combatState: { ...state.combatState, ...action.payload }
            };

        case GAME_ACTIONS.TELEPORT: {
            const requestedMapId = action.payload;
            let finalMapId = requestedMapId;

            // [요정 규칙] 마을로 귀환 시 요정은 요정 마을로, 기사는 글루디오 마을로 이동
            if (requestedMapId === 'village') {
                if (state.characterClass === 'elf') finalMapId = 'elf_village';
                else finalMapId = 'village';
            }

            const targetMap = MAPS.find(m => m.id === finalMapId);
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
                currentMapId: finalMapId,
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

        case GAME_ACTIONS.DEPOSIT_WAREHOUSE: {
            return handleDepositWarehouse(state, action.payload.uid, action.payload.quantity);
        }

        case GAME_ACTIONS.WITHDRAW_WAREHOUSE: {
            return handleWithdrawWarehouse(state, action.payload.uid, action.payload.quantity);
        }

        case GAME_ACTIONS.ADD_FRIEND: {
            const friendName = action.payload;
            if (!friendName || state.friends.includes(friendName)) return state;
            return {
                ...state,
                friends: [...state.friends, friendName],
                screenMessage: `[알림] ${friendName}님을 친구로 등록했습니다.` // 화면 중앙 알림
            };
        }

        case GAME_ACTIONS.REMOVE_FRIEND: {
            const friendName = action.payload;
            const newFriends = state.friends.filter(f => f !== friendName);
            return {
                ...state,
                friends: newFriends,
                screenMessage: `[알림] ${friendName}님을 친구 목록에서 삭제했습니다.` // 화면 중앙 알림
            };
        }

        case GAME_ACTIONS.ADD_LOG:
            return { ...state, logs: [action.payload, ...state.logs] };

        case GAME_ACTIONS.CLEAR_SCREEN_MESSAGE:
            return { ...state, screenMessage: null };

        case GAME_ACTIONS.CLEAR_ANNOUNCEMENTS:
            return { ...state, pendingAnnouncements: [] };

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

        // [NEW] 스킬 바에서 스킬 사용 (Phase 103)
        case GAME_ACTIONS.USE_SKILL: {
            const { skillType, mpCost, skillName } = action.payload;
            
            // MP 부족 체크 (안전 장치)
            if (state.mp < mpCost) {
                return { ...state, logs: [`[스킬] MP가 부족합니다. (필요: ${mpCost})`, ...state.logs] };
            }

            let newState = { ...state, mp: state.mp - mpCost };

            // 스킬 타입별 효과 적용
            if (skillType === 'magic_helm_str') {
                // 마법 투구 (힘): 1분간 STR +3 (이미 combat.js에서 magicHelmStrEndTime으로 처리 중)
                newState.combatState = {
                    ...state.combatState,
                    magicHelmStrEndTime: Date.now() + 60000, // 60초 지속
                };
                newState.logs = [`[스킬] ${skillName} 사용! 1분간 힘(STR)이 증가합니다. (MP -${mpCost})`, ...state.logs];
            } else if (skillType === 'bounce_attack') {
                newState.combatState = {
                    ...state.combatState,
                    bounceAttackEndTime: Date.now() + 120000, // 120초 지속
                };
            newState.logs = [`[스킬] 바운스 어택 사용! 2분간 공격력이 10 증가합니다. (MP -${mpCost})`, ...state.logs].slice(0, 50);
        } else if (skillType === 'shock_stun') {
            if (!state.combatState.targetMonsterId) {
                return { ...state, logs: [`[스킬] 타겟 몬스터가 없습니다.`, ...state.logs].slice(0, 50) };
            }
            newState.combatState = {
                ...state.combatState,
                shockStunEndTime: Date.now() + 10000, // 10초 쿨타임
                isMonsterStunned: Date.now() + 3000, 
                impact: { type: 'stun', timestamp: Date.now() } // 스턴 전용 임팩트 트리거
            };
            newState.logs = [`[스킬] 쇼크 스턴 사용! 적이 3초간 기절합니다. (MP -${mpCost})`, ...state.logs].slice(0, 50);
            newState.combatLogs = [{ type: 'magic', text: `[스킬] 쇼크 스턴 발동! 몬스터를 기절시켰습니다.` }, ...(state.combatLogs || [])].slice(0, 30);
            }
            // 향후 다른 스킬 타입 추가 가능
            // else if (skillType === 'some_other_skill') { ... }

            return newState;
        }

        default:
            return state;
    }
};
