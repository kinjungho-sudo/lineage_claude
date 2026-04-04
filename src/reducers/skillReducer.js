import { GAME_ACTIONS } from '../constants/gameActions';
import { MONSTERS } from '../data/monsters';
import { ELF_SPELLS, ELF_ELEMENT_NAMES } from '../data/spells';
import { calculateStats, getMaxHp } from '../mechanics/combat';
import { soundManager } from '../utils/SoundManager';

export const skillReducer = (state, action) => {
    switch (action.type) {
        case GAME_ACTIONS.USE_SKILL: {
            const { skillType, mpCost, skillName } = action.payload;

            // 전역 시전 딜레이: 마지막 시전 후 1초 미경과 시 무시
            const gcdNow = Date.now();
            if (gcdNow - (state.combatState?.lastSpellCastTime || 0) < 1000) {
                return state;
            }

            // MP 부족 체크 (안전 장치)
            if (state.mp < mpCost) {
                return { ...state, logs: [`[스킬] MP가 부족합니다. (필요: ${mpCost})`, ...state.logs] };
            }

            soundManager.playSound(skillType === 'utility' ? 'teleport' : 'enchant_cast');
            let newState = { ...state, mp: state.mp - mpCost };

            // 스킬 타입별 효과 적용
            if (skillType === 'magic_helm_str') {
                // 마법 투구 (힘): 1분간 STR +3 (이미 combat.js에서 magicHelmStrEndTime으로 처리 중)
                newState.combatState = {
                    ...state.combatState,
                    magicHelmStrEndTime: Date.now() + 60000, // 60초 지속
                    buffEffect: { type: 'str', timestamp: Date.now() },
                };
                newState.logs = [`[스킬] ${skillName} 사용! 1분간 힘(STR)이 5 증가합니다. (MP -${mpCost})`, ...state.logs];
            } else if (skillType === 'bounce_attack') {
                newState.combatState = {
                    ...state.combatState,
                    bounceAttackEndTime: Date.now() + 120000,
                    buffEffect: { type: 'str', timestamp: Date.now() },
                };
                newState.logs = [`[스킬] 바운스 어택 사용! 2분간 공격력이 10 증가합니다. (MP -${mpCost})`, ...state.logs].slice(0, 50);
            } else if (skillType === 'shock_stun') {
                if (!state.combatState.targetMonsterId) {
                    return { ...state, logs: [`[스킬] 타겟 몬스터가 없습니다.`, ...state.logs].slice(0, 50) };
                }
                newState.combatState = {
                    ...state.combatState,
                    shockStunEndTime: Date.now() + 10000,
                    isMonsterStunned: Date.now() + 3000,
                    impact: { type: 'stun', timestamp: Date.now() }
                };
                newState.logs = [`[스킬] 쇼크 스턴 사용! 적이 3초간 기절합니다. (MP -${mpCost})`, ...state.logs].slice(0, 50);
                newState.combatLogs = [{ type: 'magic', text: `[스킬] 쇼크 스턴 발동! 몬스터를 기절시켰습니다.` }, ...(state.combatLogs || [])].slice(0, 30);
            } else if (skillType === 'recovery') {
                // 힐: HP 회복
                const healAmt = action.payload.power || 50;
                const healStats = calculateStats(state);
                const healMaxHp = getMaxHp(state, healStats);
                newState.hp = Math.min(healMaxHp, state.hp + healAmt);
                newState.combatState = {
                    ...state.combatState,
                    spellCooldowns: { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + 30000 },
                    buffEffect: { type: 'heal', timestamp: Date.now() },
                };
                newState.logs = [`[마법] ${skillName} 사용! HP +${healAmt}. (MP -${mpCost})`, ...state.logs].slice(0, 50);
            } else if (skillType === 'damage') {
                // 에너지 볼트: 현재 몬스터에 마법 데미지
                if (!state.combatState?.targetMonsterId || !state.combatState?.isAttacking) {
                    return { ...state, logs: [`[마법] 사냥 중에만 사용 가능합니다.`, ...state.logs].slice(0, 50) };
                }
                const dmgPower = action.payload.power || 15;
                const monster = MONSTERS.find(m => m.id === state.combatState.targetMonsterId);
                const monsterMaxHp = monster?.hp || 1000;
                const dmgPercent = Math.max(0.5, (dmgPower / monsterMaxHp) * 100);
                const newHpPct = Math.max(0, (state.combatState.monsterHpPercent ?? 100) - dmgPercent);
                const dmgKill = newHpPct <= 0;
                newState.combatState = {
                    ...state.combatState,
                    monsterHpPercent: newHpPct,
                    spellCooldowns: { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + 5000 },
                    ...(dmgKill ? { isDying: true, deathTimestamp: Date.now(), isAttacking: false } : {})
                };
                newState.combatLogs = [{ type: 'magic', text: `[마법] ${skillName}으로 ${dmgPower}의 피해를 입혔습니다.` }, ...(state.combatLogs || [])].slice(0, 30);
                newState.logs = [`[마법] ${skillName} 사용! (MP -${mpCost})`, ...state.logs].slice(0, 50);
            } else if (skillType === 'utility') {
                // 텔레포트: 마을로 귀환
                const homeMap = state.characterClass === 'elf' ? 'elf_village' : 'village';
                newState.currentMapId = homeMap;
                newState.combatState = {
                    ...state.combatState,
                    isAttacking: false,
                    targetMonsterId: null,
                    spellCooldowns: { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + 60000 }
                };
                newState.logs = [`[마법] ${skillName} 사용! 마을로 귀환합니다. (MP -${mpCost})`, ...state.logs].slice(0, 50);

            // ── 요정 공통 마법 ─────────────────────────────────────────────────
            } else if (skillType === 'resist_magic') {
                newState.combatState = {
                    ...state.combatState,
                    resistMagicEndTime: Date.now() + 300000,
                    spellCooldowns: { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + 30000 },
                    buffEffect: { type: 'def', timestamp: Date.now() },
                };
                newState.logs = [`[마법] ${skillName} 사용! 5분간 마법 방어 +10%. (MP -${mpCost})`, ...state.logs].slice(0, 50);

            } else if (skillType === 'triple_arrow') {
                if (!state.combatState?.targetMonsterId || !state.combatState?.isAttacking) {
                    return { ...state, logs: [`[마법] 사냥 중에만 사용 가능합니다.`, ...state.logs].slice(0, 50) };
                }
                const taStats = calculateStats(state);
                const taMonster = MONSTERS.find(m => m.id === state.combatState.targetMonsterId);
                const taMaxHp = taMonster?.hp || 1000;
                const taPerArrow = Math.floor(taStats.smallAtk * 0.6);
                const taDmg = taPerArrow * 3;
                const taDmgPct = (taDmg / taMaxHp) * 100;
                const taNewHp = Math.max(0, (state.combatState.monsterHpPercent ?? 100) - taDmgPct);
                const now = Date.now();
                const prevDmgNums = [...(state.combatState?.damageNumbers || [])].filter(d => now - d.timestamp < 1000);
                // 화살 3발 각각 시차(0 / 130 / 260ms)를 두고 데미지 숫자 표시
                const taDmgNumbers = [
                    { value: taPerArrow, timestamp: now,       isSkill: true, xOff: -20 },
                    { value: taPerArrow, timestamp: now + 130, isSkill: true, xOff: 0   },
                    { value: taPerArrow, timestamp: now + 260, isSkill: true, xOff: 20  },
                ];
                const taKill = taNewHp <= 0;
                newState.combatState = {
                    ...state.combatState,
                    monsterHpPercent: taNewHp,
                    damageNumbers: [...prevDmgNums, ...taDmgNumbers],
                    spellCooldowns: { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + 5000 },
                    tripleArrowEffect: { timestamp: now },
                    ...(taKill ? { isDying: true, deathTimestamp: Date.now(), isAttacking: false } : {})
                };
                newState.combatLogs = [{ type: 'magic', text: `[스킬] 트리플 애로우! ${taPerArrow} × 3 = ${taDmg} 피해` }, ...(state.combatLogs || [])].slice(0, 30);
                newState.logs = [`[스킬] ${skillName} 사용! (MP -${mpCost})`, ...state.logs].slice(0, 50);

            } else if (skillType === 'summon_lesser_elemental') {
                newState.combatState = {
                    ...state.combatState,
                    summonElementalEndTime: Date.now() + 60000,
                    spellCooldowns: { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + 180000 },
                    buffEffect: { type: 'summon', timestamp: Date.now() },
                };
                newState.logs = [`[마법] ${skillName} 사용! 1분간 정령이 전투에 참여합니다. (MP -${mpCost})`, ...state.logs].slice(0, 50);

            // ── 요정 속성 마법 ─────────────────────────────────────────────────
            } else if (skillType === 'wind_shot') {
                newState.combatState = {
                    ...state.combatState,
                    windShotEndTime: Date.now() + 1800000,
                    spellCooldowns: { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + 30000 },
                    buffEffect: { type: 'wind', timestamp: Date.now() },
                };
                newState.logs = [`[마법] ${skillName} 사용! 30분간 명중/회피 +5. (MP -${mpCost})`, ...state.logs].slice(0, 50);

            } else if (skillType === 'earth_skin') {
                newState.combatState = {
                    ...state.combatState,
                    earthSkinEndTime: Date.now() + 1800000,
                    spellCooldowns: { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + 30000 },
                    buffEffect: { type: 'def', timestamp: Date.now() },
                };
                newState.logs = [`[마법] ${skillName} 사용! 30분간 AC -4. (MP -${mpCost})`, ...state.logs].slice(0, 50);

            } else if (skillType === 'fire_weapon') {
                newState.combatState = {
                    ...state.combatState,
                    fireWeaponEndTime: Date.now() + 1800000,
                    spellCooldowns: { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + 30000 },
                    buffEffect: { type: 'fire', timestamp: Date.now() },
                };
                newState.logs = [`[마법] ${skillName} 사용! 30분간 공격력 +3. (MP -${mpCost})`, ...state.logs].slice(0, 50);

            } else if (skillType === 'natures_touch') {
                newState.combatState = {
                    ...state.combatState,
                    naturesTouchEndTime: Date.now() + 1800000,
                    spellCooldowns: { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + 30000 },
                    buffEffect: { type: 'nature', timestamp: Date.now() },
                };
                newState.logs = [`[마법] ${skillName} 사용! 30분간 최대 HP +50, 체력 회복 +10. (MP -${mpCost})`, ...state.logs].slice(0, 50);

            // ── 마법사 전용 마법 ───────────────────────────────────────────────
            } else if (skillType === 'wizard_energy_bolt' || skillType === 'wizard_fireball' || skillType === 'wizard_call_lightning' || skillType === 'wizard_eruption') {
                // 공격 마법 계열 (에너지 볼트 / 파이어볼 / 콜 라이트닝 / 이럽션)
                if (!state.combatState?.targetMonsterId || !state.combatState?.isAttacking) {
                    return { ...state, logs: [`[마법] 사냥 중에만 사용 가능합니다.`, ...state.logs].slice(0, 50) };
                }
                const wStats = calculateStats(state);
                const wMonster = MONSTERS.find(m => m.id === state.combatState.targetMonsterId);
                const wMonsterMaxHp = wMonster?.hp || 1000;
                const wInt = wStats.int || 18;
                const wWis = wStats.wis || 18;
                const wLevel = state.level || 1;
                const wEnchant = wStats.weaponEnchant || 0;

                let wDmg = 0;
                if (skillType === 'wizard_energy_bolt') {
                    wDmg = Math.floor(wInt * 0.4 + wWis * 0.2) + wEnchant + Math.floor(wLevel / 8);
                } else if (skillType === 'wizard_fireball') {
                    wDmg = Math.floor(wInt * 0.55 + wWis * 0.25) + wEnchant + Math.floor(wLevel / 6);
                } else if (skillType === 'wizard_call_lightning') {
                    const isOrc = wMonster?.type === 'orc' || wMonster?.name?.includes('오크');
                    wDmg = Math.floor(wInt * 0.6 + wWis * 0.3) + wEnchant + Math.floor(wLevel / 5) + (isOrc ? 15 : 0);
                } else if (skillType === 'wizard_eruption') {
                    wDmg = Math.floor(wInt * 0.7 + wWis * 0.35) + wEnchant + Math.floor(wLevel / 4);
                }
                wDmg = Math.max(1, wDmg + Math.floor((Math.random() * 0.1 - 0.05) * wDmg));
                wDmg = Math.floor(wDmg * 2.0); // 마법 공격력 ×2
                const wDmgPct = (wDmg / wMonsterMaxHp) * 100;
                const wNewHp = Math.max(0, (state.combatState.monsterHpPercent ?? 100) - wDmgPct);
                const wNow = Date.now();
                const wPrevDmgNums = [...(state.combatState?.damageNumbers || [])].filter(d => wNow - d.timestamp < 1000);
                const wImpactType = skillType === 'wizard_energy_bolt' ? 'bolt'
                    : skillType === 'wizard_fireball' ? 'fire'
                    : skillType === 'wizard_call_lightning' ? 'lightning'
                    : 'eruption';
                const wKill = wNewHp <= 0;
                newState.combatState = {
                    ...state.combatState,
                    monsterHpPercent: wNewHp,
                    damageNumbers: [...wPrevDmgNums, { value: wDmg, timestamp: wNow, isSkill: true, xOff: 0 }],
                    spellCooldowns: { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + (action.payload.cooldownMs || 3000) },
                    impact: { type: wImpactType, timestamp: wNow },
                    wizardSpellEffect: { type: wImpactType, timestamp: wNow },
                    ...(wKill ? { isDying: true, deathTimestamp: wNow, isAttacking: false } : {}),
                };
                newState.combatLogs = [{ type: 'magic', text: `[마법] ${skillName}으로 ${wDmg}의 피해를 입혔습니다.` }, ...(state.combatLogs || [])].slice(0, 30);
                newState.logs = [`[마법] ${skillName} 사용! (MP -${mpCost})`, ...state.logs].slice(0, 50);

            } else if (skillType === 'wizard_ice_lance') {
                // 아이스 랜스: 강력한 피해 + 2초 빙결
                if (!state.combatState?.targetMonsterId || !state.combatState?.isAttacking) {
                    return { ...state, logs: [`[마법] 사냥 중에만 사용 가능합니다.`, ...state.logs].slice(0, 50) };
                }
                const ilStats = calculateStats(state);
                const ilMonster = MONSTERS.find(m => m.id === state.combatState.targetMonsterId);
                const ilMaxHp = ilMonster?.hp || 1000;
                const ilDmgBase = Math.max(1, Math.floor(ilStats.int * 0.85 + ilStats.wis * 0.4) + ilStats.weaponEnchant + Math.floor(state.level / 4));
                const ilDmg = Math.floor(ilDmgBase * 2.0); // 마법 공격력 ×2
                const ilDmgPct = (ilDmg / ilMaxHp) * 100;
                const ilNewHp = Math.max(0, (state.combatState.monsterHpPercent ?? 100) - ilDmgPct);
                const ilNow = Date.now();
                const ilPrevDmgNums = [...(state.combatState?.damageNumbers || [])].filter(d => ilNow - d.timestamp < 1000);
                newState.combatState = {
                    ...state.combatState,
                    monsterHpPercent: ilNewHp,
                    isMonsterStunned: ilNow + 2000,
                    damageNumbers: [...ilPrevDmgNums, { value: ilDmg, timestamp: ilNow, isSkill: true, xOff: 0 }],
                    impact: { type: 'stun', timestamp: ilNow },
                    spellCooldowns: { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + 10000 },
                };
                newState.combatLogs = [{ type: 'magic', text: `[마법] 아이스 랜스! ${ilDmg} 피해 + 빙결 2초` }, ...(state.combatLogs || [])].slice(0, 30);
                newState.logs = [`[마법] ${skillName} 사용! (MP -${mpCost})`, ...state.logs].slice(0, 50);

            } else if (skillType === 'wizard_heal') {
                // 힐: 파티원 중 HP% 최저 대상에게 자동 시전
                const hStats = calculateStats(state);
                const hMaxHp = getMaxHp(state, hStats);
                const healAmt = action.payload.power || 60;
                const hSelfPct = hMaxHp > 0 ? state.hp / hMaxHp : 1;
                // 파티원 중 최저 HP% 탐색
                let healTargetName = null;
                let lowestPct = hSelfPct;
                (state.party?.members || []).forEach(m => {
                    if (m.characterName === state.characterName) return;
                    if (!m.maxHp || m.maxHp <= 0) return;
                    const pct = m.hp / m.maxHp;
                    if (pct < lowestPct) { lowestPct = pct; healTargetName = m.characterName; }
                });
                const cooldowns1 = { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + 1500 };
                if (healTargetName) {
                    newState.combatState = { ...state.combatState, spellCooldowns: cooldowns1, buffEffect: { type: 'heal', timestamp: Date.now() }, partyHealEvent: { targetName: healTargetName, healAmt, timestamp: Date.now() } };
                    newState.logs = [`[마법] ${skillName} → ${healTargetName} HP +${healAmt}! (MP -${mpCost})`, ...state.logs].slice(0, 50);
                } else {
                    newState.hp = Math.min(hMaxHp, state.hp + healAmt);
                    newState.combatState = { ...state.combatState, spellCooldowns: cooldowns1, buffEffect: { type: 'heal', timestamp: Date.now() } };
                    newState.logs = [`[마법] ${skillName} 사용! HP +${healAmt}. (MP -${mpCost})`, ...state.logs].slice(0, 50);
                }

            } else if (skillType === 'wizard_great_heal') {
                // 그레이트 힐: 파티원 중 HP% 최저 대상에게 자동 시전
                const ghStats = calculateStats(state);
                const ghMaxHp = getMaxHp(state, ghStats);
                const ghHealAmt = action.payload.power || 250;
                const ghSelfPct = ghMaxHp > 0 ? state.hp / ghMaxHp : 1;
                let ghTargetName = null;
                let ghLowestPct = ghSelfPct;
                (state.party?.members || []).forEach(m => {
                    if (m.characterName === state.characterName) return;
                    if (!m.maxHp || m.maxHp <= 0) return;
                    const pct = m.hp / m.maxHp;
                    if (pct < ghLowestPct) { ghLowestPct = pct; ghTargetName = m.characterName; }
                });
                const cooldowns2 = { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + 1500 };
                if (ghTargetName) {
                    newState.combatState = { ...state.combatState, spellCooldowns: cooldowns2, buffEffect: { type: 'heal', timestamp: Date.now() }, partyHealEvent: { targetName: ghTargetName, healAmt: ghHealAmt, timestamp: Date.now() } };
                    newState.logs = [`[마법] ${skillName} → ${ghTargetName} HP +${ghHealAmt}! (MP -${mpCost})`, ...state.logs].slice(0, 50);
                } else {
                    newState.hp = Math.min(ghMaxHp, state.hp + ghHealAmt);
                    newState.combatState = { ...state.combatState, spellCooldowns: cooldowns2, buffEffect: { type: 'heal', timestamp: Date.now() } };
                    newState.logs = [`[마법] ${skillName} 사용! HP +${ghHealAmt}. (MP -${mpCost})`, ...state.logs].slice(0, 50);
                }

            } else if (skillType === 'wizard_shield') {
                // 실드: AC -3, 10분
                newState.combatState = {
                    ...state.combatState,
                    wizardShieldEndTime: Date.now() + 600000,
                    spellCooldowns: { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + 30000 },
                    buffEffect: { type: 'def', timestamp: Date.now() },
                };
                newState.logs = [`[마법] ${skillName} 사용! 10분간 AC -3. (MP -${mpCost})`, ...state.logs].slice(0, 50);

            } else if (skillType === 'enchant_weapon') {
                // 인챈트 웨폰: ATK +3, 5분 (파티 공유)
                newState.combatState = {
                    ...state.combatState,
                    enchantWeaponEndTime: Date.now() + 300000,
                    spellCooldowns: { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + 30000 },
                    buffEffect: { type: 'fire', timestamp: Date.now() },
                };
                newState.logs = [`[마법] ${skillName} 사용! 5분간 공격력 +3. (MP -${mpCost})`, ...state.logs].slice(0, 50);

            } else if (skillType === 'blessed_armor_wizard') {
                // 블레스드 아머: AC -3, 5분 (파티 공유)
                newState.combatState = {
                    ...state.combatState,
                    blessedArmorEndTime: Date.now() + 300000,
                    spellCooldowns: { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + 30000 },
                    buffEffect: { type: 'def', timestamp: Date.now() },
                };
                newState.logs = [`[마법] ${skillName} 사용! 5분간 AC -3. (MP -${mpCost})`, ...state.logs].slice(0, 50);

            } else if (skillType === 'enchant_dexterity') {
                // 인챈트 덱스터리: DEX +5, 5분 (파티 공유)
                newState.combatState = {
                    ...state.combatState,
                    enchantDexEndTime: Date.now() + 300000,
                    spellCooldowns: { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + 30000 },
                    buffEffect: { type: 'wind', timestamp: Date.now() },
                };
                newState.logs = [`[마법] ${skillName} 사용! 5분간 DEX +5. (MP -${mpCost})`, ...state.logs].slice(0, 50);

            } else if (skillType === 'enchant_mighty') {
                // 인챈트 마이티: STR +5, 5분 (파티 공유)
                newState.combatState = {
                    ...state.combatState,
                    enchantMightyEndTime: Date.now() + 300000,
                    spellCooldowns: { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + 30000 },
                    buffEffect: { type: 'str', timestamp: Date.now() },
                };
                newState.logs = [`[마법] ${skillName} 사용! 5분간 STR +5. (MP -${mpCost})`, ...state.logs].slice(0, 50);

            } else if (skillType === 'meditation') {
                // 메디테이션: 1시간 동안 마을 MP 회복 속도 대폭 증가
                newState.combatState = {
                    ...state.combatState,
                    meditationEndTime: Date.now() + 3600000,
                    spellCooldowns: { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + 30000 },
                    buffEffect: { type: 'nature', timestamp: Date.now() },
                };
                newState.logs = [`[마법] ${skillName} 사용! 1시간 동안 MP 회복 속도 증가. (MP -${mpCost})`, ...state.logs].slice(0, 50);

            } else if (skillType === 'berserker') {
                // 버스커스: ATK +5 / AC +5 패널티, 3분
                newState.combatState = {
                    ...state.combatState,
                    berserkerEndTime: Date.now() + 180000,
                    spellCooldowns: { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + 30000 },
                    buffEffect: { type: 'fire', timestamp: Date.now() },
                };
                newState.logs = [`[마법] ${skillName} 사용! 3분간 공격력 +5 / AC +5 패널티. (MP -${mpCost})`, ...state.logs].slice(0, 50);

            } else if (skillType === 'summon_monster') {
                // 서먼 몬스터: 마법사의 돌 소모 → 1분간 소환수 전투 참여
                const stoneIdx = state.inventory.findIndex(i => i.id === 'wizard_stone');
                if (stoneIdx === -1) {
                    return { ...state, logs: [`[마법] 마력의 돌이 필요합니다. (MP 소모 없음)`, ...state.logs].slice(0, 50) };
                }
                const newInv = [...state.inventory];
                if (newInv[stoneIdx].count > 1) newInv[stoneIdx] = { ...newInv[stoneIdx], count: newInv[stoneIdx].count - 1 };
                else newInv.splice(stoneIdx, 1);
                newState.inventory = newInv;
                newState.combatState = {
                    ...state.combatState,
                    summonMonsterEndTime: Date.now() + 60000,
                    spellCooldowns: { ...(state.combatState?.spellCooldowns || {}), [action.payload.skillId]: Date.now() + 30000 },
                    buffEffect: { type: 'summon', timestamp: Date.now() },
                };
                newState.logs = [`[마법] ${skillName} 사용! 1분간 소환수가 전투에 참여합니다. (마력의 돌 -1)`, ...state.logs].slice(0, 50);
            }

            // 전역 시전 딜레이 타임스탬프 기록
            newState.combatState = {
                ...newState.combatState,
                lastSpellCastTime: Date.now(),
            };

            return newState;
        }

        case GAME_ACTIONS.CHOOSE_ELF_ELEMENT: {
            return { ...state, elfElement: action.payload };
        }

        case GAME_ACTIONS.SET_WIZARD_DEFAULT_SPELL: {
            return { ...state, wizardDefaultSpell: action.payload };
        }

        default:
            return state;
    }
};
