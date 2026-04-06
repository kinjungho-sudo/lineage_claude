import { MONSTERS } from '../data/monsters';
import { WIZARD_SPELLS } from '../data/spells';
import { ITEMS } from '../data/items';
import { soundManager } from '../utils/SoundManager';

// --- Constants (상수 정의) ---
const CONFIG = {
    REGEN_INTERVAL_MS: 3000,
    REGEN_AMOUNT_BASE: 15,
    REGEN_AMOUNT_PER_LEVEL: 1,
    POTION_HEAL_CLEAR_HIGH: 500,
    POTION_HEAL_CLEAR: 250,
    POTION_HEAL_RED: 60,
    POTION_THRESHOLD_CLEAR: 0.6,
    POTION_THRESHOLD_RED: 0.6,
    POTION_EFFECT_DURATION: 500,
    COMBAT_HIT_CHANCE_BASE: 0.90,
    COMBAT_CRIT_CHANCE_BASE: 0.05,
    EXP_MULTIPLIER: 4,
    DAMAGE_VARIANCE: 0.05,
    MONSTER_RESPAWN_DELAY_MS: 100,
    MONSTER_ROTATE_INTERVAL_MS: 15000,
};

export const getMaxHp = (state, stats) => {
    const naturalCon = Math.floor(state.level / 15);
    let hpBonus = stats.maxHpBonus || 0;
    if (state.currentMapId === 'water_dungeon' && stats.underwater) {
        hpBonus += 50;
    }
    return 50 + (state.level * (10 + (stats.con || 0) + naturalCon)) + hpBonus;
};

export const getMaxMp = (state, stats) => {
    // WIS: 모든 클래스에 적용 (MP 회복 능력)
    const wisBonus = Math.floor((stats?.wis || 0) * 2);
    // INT: 마법사만 추가 MP 보너스 (마법 공격력 관련)
    const wizardIntBonus = state.characterClass === 'wizard'
        ? Math.floor((stats?.int || 0) * 3)
        : 0;
    return 30 + (state.level * 5) + (stats.maxMpBonus || 0) + wisBonus + wizardIntBonus;
};

export const getRequiredExp = (level) => {
    return Math.floor(100 * Math.pow(1.2, level - 1)) + (level * level * 200);
};

export const calculateStats = (state) => {
    let smallAtk = 1;
    let largeAtk = 1;
    let totalAc = 10;
    let setPieces = 0;
    const equipment = state?.equipment || {};
    const characterClass = state?.characterClass || 'knight';
    const levelStatBonus = Math.floor(state.level / 15);

    const baseStr = (characterClass === 'knight' ? 18 : characterClass === 'wizard' ? 8 : 10) + (characterClass === 'knight' ? levelStatBonus : 0);
    const maxAllocatedStr = Math.max(0, state.level - 50);
    const baseDex = (state.baseDex || (characterClass === 'elf' ? 18 : characterClass === 'wizard' ? 8 : 12)) + (characterClass === 'elf' ? levelStatBonus : 0);
    const baseCon = state.baseCon || (characterClass === 'knight' ? 14 : characterClass === 'wizard' ? 8 : 12);
    const baseInt = (state.baseInt || (characterClass === 'wizard' ? 18 : 8)) + (characterClass === 'wizard' ? levelStatBonus : 0);
    const baseWis = (state.baseWis || (characterClass === 'knight' ? 9 : characterClass === 'wizard' ? 18 : 10)) + (characterClass === 'wizard' ? Math.floor(levelStatBonus / 2) : 0);

    Object.values(equipment).forEach(item => {
        if (!item) return;
        if (item.restrictedClasses && item.restrictedClasses.includes(characterClass)) return;

        if (item.type === 'armor' || item.slot === 'shield' || item.slot === 'helm' || item.slot === 'gloves' || item.slot === 'boots' || item.slot === 'shirt' || item.slot === 'cloak') {
            if (item.stats?.ac !== undefined) totalAc -= item.stats.ac;
            if (item.enchant) totalAc -= item.enchant;
            if (item.stats?.set === 'steel') setPieces++;
        }
        if (item.type === 'weapon') {
            if (item.stats?.small !== undefined) smallAtk += item.stats.small;
            if (item.stats?.large !== undefined) largeAtk += item.stats.large;
            if (item.enchant) {
                smallAtk += item.enchant;
                largeAtk += item.enchant;
            }
        }
    });

    if (setPieces === 5) totalAc -= 3;
    let kurzSetPieces = 0;
    Object.values(equipment).forEach(item => {
        if (item && item.stats?.set === 'kurz' && !(item.restrictedClasses && item.restrictedClasses.includes(characterClass))) kurzSetPieces++;
    });
    if (kurzSetPieces >= 4) totalAc -= 4;

    let totalStrBonus = 0, totalConBonus = 0, totalDexBonus = 0, totalIntBonus = 0, totalWisBonus = 0;
    let weaponEnchant = 0, maxHpBonus = 0, hpRegenBonus = 0, totalMrBonus = 0, totalHitBonus = 0;
    let totalAtkBonus = 0;
    let hasUnderwaterGrace = false;
    let isStaffEquipped = false;
    let maxMpBonus = 0, mpRegenBonus = 0, mpOnHitBonus = 0, magicAtkBonus = 0;

    Object.values(equipment).forEach(item => {
        if (!item) return;
        if (item.restrictedClasses && item.restrictedClasses.includes(characterClass)) return;
        if (item.stats?.str) totalStrBonus += item.stats.str;
        if (item.stats?.con) totalConBonus += item.stats.con;
        if (item.stats?.dex) totalDexBonus += item.stats.dex;
        if (item.stats?.int) totalIntBonus += item.stats.int;
        if (item.stats?.wis) totalWisBonus += item.stats.wis;
        if (item.stats?.hp) maxHpBonus += item.stats.hp;
        if (item.stats?.hpRegen) hpRegenBonus += item.stats.hpRegen;
        if (item.stats?.mr) totalMrBonus += item.stats.mr;
        if (item.stats?.hit) totalHitBonus += item.stats.hit;
        if (item.stats?.atkBonus) totalAtkBonus += item.stats.atkBonus;
        if (item.stats?.underwater) hasUnderwaterGrace = true;
        if (item.stats?.mp) maxMpBonus += item.stats.mp;
        if (item.stats?.mpRegen) mpRegenBonus += item.stats.mpRegen;
        if (item.stats?.mpOnHit) mpOnHitBonus += item.stats.mpOnHit;
        if (item.stats?.magicAtkBonus) magicAtkBonus += item.stats.magicAtkBonus;
        if (item.type === 'weapon') {
            weaponEnchant = item.enchant || 0;
            // 지팡이: id 기반 판별 (저장 데이터에 isStaff 없어도 동작)
            const isStaff = item.isStaff || (item.id && item.id.startsWith('staff_'));
            if (isStaff) {
                isStaffEquipped = true;
                if (item.enchant) magicAtkBonus += item.enchant;
            }
        }
    });

    let magicHelmStrBonus = 0;
    if (state?.combatState?.magicHelmStrEndTime && Date.now() < state.combatState.magicHelmStrEndTime) magicHelmStrBonus = 5;

    let bluePotionMagicAtkBonus = 0;
    if (state?.combatState?.bluePotionEndTime && Date.now() < state.combatState.bluePotionEndTime) bluePotionMagicAtkBonus = 3;

    let bounceAttackBonus = 0;
    if (state?.combatState?.bounceAttackEndTime && Date.now() < state.combatState.bounceAttackEndTime) bounceAttackBonus = 10;

    // 요정 속성 마법 버프 효과
    const nowMs = Date.now();
    let elfWindHit = 0, elfWindEva = 0, elfEarthAc = 0, elfFireAtk = 0;
    let elfNatHpBonus = 0, elfNatRegenBonus = 0, elfResistMrBonus = 0;
    if (characterClass === 'elf') {
        if (state?.combatState?.windShotEndTime > nowMs)       { elfWindHit = 5; elfWindEva = 5; }
        if (state?.combatState?.earthSkinEndTime > nowMs)      elfEarthAc = 4;
        if (state?.combatState?.fireWeaponEndTime > nowMs)     elfFireAtk = 3;
        if (state?.combatState?.naturesTouchEndTime > nowMs)   { elfNatHpBonus = 50; elfNatRegenBonus = 10; }
        if (state?.combatState?.resistMagicEndTime > nowMs)    elfResistMrBonus = 10;
    }

    // 마법사 파티 버프 효과 (인챈트 마이티/덱스터리는 STR/DEX에 반영)
    let wizardEnchantMightyStr = 0, wizardEnchantDexBonus = 0;
    let wizardEnchantAtk = 0, wizardBlessedArmorAc = 0;
    let wizardShieldAc = 0, wizardBerserkerAtk = 0, wizardBerserkerAcPenalty = 0;
    let wizardSummonMonsterAtk = 0;
    // 파티 버프는 클래스 무관하게 적용
    if (state?.combatState?.enchantMightyEndTime > nowMs)  wizardEnchantMightyStr = 5;
    if (state?.combatState?.enchantDexEndTime > nowMs)     wizardEnchantDexBonus = 5;
    if (state?.combatState?.enchantWeaponEndTime > nowMs)  wizardEnchantAtk = 3;
    if (state?.combatState?.blessedArmorEndTime > nowMs)   wizardBlessedArmorAc = 3;
    // 마법사 자신 전용 버프
    if (characterClass === 'wizard') {
        if (state?.combatState?.wizardShieldEndTime > nowMs)     wizardShieldAc = 3;
        if (state?.combatState?.berserkerEndTime > nowMs)        { wizardBerserkerAtk = 5; wizardBerserkerAcPenalty = 5; }
        if (state?.combatState?.summonMonsterEndTime > nowMs)    wizardSummonMonsterAtk = 15;
    }

    const safeAllocatedStr = Math.min(state.allocatedStr || 0, maxAllocatedStr);
    const totalStr = Number(baseStr) + Number(totalStrBonus) + Number(safeAllocatedStr) + Number(magicHelmStrBonus) + Number(wizardEnchantMightyStr);
    const strAtkBonus = Math.floor(totalStr / 5);
    const totalDex = Number(baseDex) + Number(totalDexBonus) + Number(state.allocatedDex || 0) + Number(wizardEnchantDexBonus);

    let accuracy = state.level + totalDex + (weaponEnchant * 2) + totalHitBonus + elfWindHit + 10;
    if (characterClass === 'elf') accuracy += 20;
    if (characterClass === 'knight') accuracy += 0;
    // 마법사: INT 기반 정확도 (에너지 볼트는 마법 명중률 사용)
    if (characterClass === 'wizard') {
        const totalInt = Number(baseInt) + Number(totalIntBonus) + Number(state.allocatedInt || 0);
        accuracy = state.level + totalInt + (weaponEnchant * 2) + totalHitBonus + 15;
    }

    // 명중률 100 초과분 → 공격속도 변환 (초과 5마다 인터벌 25ms 단축)
    const accuracySpeedBonus = accuracy > 100 ? Math.floor((accuracy - 100) / 5) : 0;

    return {
        smallAtk: smallAtk + bounceAttackBonus + elfFireAtk + totalAtkBonus + strAtkBonus + wizardEnchantAtk + wizardBerserkerAtk + wizardSummonMonsterAtk,
        largeAtk: largeAtk + bounceAttackBonus + elfFireAtk + totalAtkBonus + strAtkBonus + wizardEnchantAtk + wizardBerserkerAtk + wizardSummonMonsterAtk,
        ac: totalAc - elfEarthAc - wizardShieldAc - wizardBlessedArmorAc + wizardBerserkerAcPenalty,
        str: totalStr,
        dex: totalDex,
        con: Number(baseCon) + Number(totalConBonus) + Number(state.allocatedCon || 0),
        int: Number(baseInt) + Number(totalIntBonus) + Number(state.allocatedInt || 0),
        wis: Number(baseWis) + Number(totalWisBonus) + Number(state.allocatedWis || 0),
        conBonus: totalConBonus,
        intBonus: totalIntBonus,
        accuracy,
        accuracySpeedBonus,
        weaponEnchant: weaponEnchant,
        maxHpBonus: maxHpBonus + elfNatHpBonus,
        hpRegenBonus: hpRegenBonus + elfNatRegenBonus,
        mrBonus: totalMrBonus + elfResistMrBonus,
        underwater: hasUnderwaterGrace,
        evasion: Number(state.level) + Number(totalDex) + (10 - Number(totalAc)) + elfWindEva,
        maxMpBonus,
        mpRegenBonus,
        mpOnHitBonus,
        magicAtkBonus: magicAtkBonus + bluePotionMagicAtkBonus,
        isStaffEquipped,
    };
};

// 현재 버프 상태 기반 공격 인터벌 계산 (useGameLoop와 동일 로직)
const _computeAttackIntervalMs = (hasteEndTime, bravePotionEndTime, isElf, now) => {
    const hasHaste = hasteEndTime > now;
    const hasBrave = bravePotionEndTime > now;
    let interval = 1350;
    if (hasBrave) interval = isElf ? Math.round(1350 / 1.3) : Math.round(1350 / 1.5);
    if (hasHaste) interval = Math.round(interval / 1.6);
    return interval;
};

export const processAutoHuntTick = (state) => {
    try {
        const now = Date.now();
        if (state.combatState?.isPlayerDead) return state;

        let hasteEndTime = state.combatState?.hasteEndTime || 0;
        let bravePotionEndTime = state.combatState?.bravePotionEndTime || 0;
        let bluePotionEndTime = state.combatState?.bluePotionEndTime || 0;
        let mpRegenPotionEndTime = state.combatState?.mpRegenPotionEndTime || 0;
        let hasteLog = null, bravePotionLog = null, bluePotionLog = null, mpRegenLog = null;

        const isPlayerDead = state.combatState?.isPlayerDead;
        const inVillage = state.currentMapId === 'village' || state.currentMapId === 'elf_village';
        if (!isPlayerDead && !inVillage && now >= hasteEndTime && !state.combatState?.hasteAutoOff) {
            const potionIdx = state.inventory.findIndex(i => i.id === 'potion_green');
            if (potionIdx >= 0) {
                hasteEndTime = now + 300000;
                _consumeItem(state.inventory, potionIdx);
                hasteLog = `[자동] 초록 물약을 사용했습니다.`;
            }
        }
        if (!isPlayerDead && !inVillage && now >= bravePotionEndTime && !state.combatState?.braveAutoOff && state.characterClass !== 'wizard') {
            const braveItemId = state.characterClass === 'elf' ? 'elven_wafer' : 'potion_brave';
            const potionIdx = state.inventory.findIndex(i => i.id === braveItemId);
            if (potionIdx >= 0) {
                bravePotionEndTime = now + 300000;
                _consumeItem(state.inventory, potionIdx);
                bravePotionLog = `[자동] ${state.characterClass === 'elf' ? '엘븐 와퍼' : '용기의 물약'}를 사용했습니다.`;
            }
        }
        if (!isPlayerDead && !inVillage && now >= bluePotionEndTime && !state.combatState?.blueAutoOff) {
            const potionIdx = state.inventory.findIndex(i => i.id === 'potion_blue');
            if (potionIdx >= 0) {
                bluePotionEndTime = now + 300000;
                _consumeItem(state.inventory, potionIdx);
                bluePotionLog = `[자동] 파란 물약을 사용했습니다.`;
            }
        }
        if (!isPlayerDead && !inVillage && now >= mpRegenPotionEndTime && !state.combatState?.mpRegenAutoOff) {
            const potionIdx = state.inventory.findIndex(i => i.id === 'potion_mana');
            if (potionIdx >= 0) {
                mpRegenPotionEndTime = now + 300000;
                _consumeItem(state.inventory, potionIdx);
                mpRegenLog = `[자동] 마나 회복 물약을 사용했습니다.`;
            }
        }

        const magicHelm = state.inventory.find(i => i.id === 'helm_magic_str' && i.isEquipped);
        const initialMagicHelmEndTime = state.combatState?.magicHelmStrEndTime || 0;
        const isMagicHelmBuffActive = now < (initialMagicHelmEndTime - 5000);
        let newMagicHelmEndTime = initialMagicHelmEndTime;
        let magicHelmLog = null, isPotionUsed = false;

        if (magicHelm && !isMagicHelmBuffActive && state.mp >= 100) {
            state.mp -= 100;
            newMagicHelmEndTime = Math.max(now, initialMagicHelmEndTime) + 60000;
            magicHelmLog = `[자동] ${magicHelm.name}을(를) 사용했습니다.`;
            isPotionUsed = 'magic_helm';
        }

        const stats = calculateStats(state);
        const maxHp = getMaxHp(state, stats);
        const maxMp = getMaxMp(state, stats);
        let { hp: currentHp, mp: currentMp, currentExp, adena: currentAdena, inventory: currentInventory } = state;

        // Auto-HP Potion Logic (HP < 60%) — 맑은 > 주홍 > 빨간 순으로 사용 (회복량 많은 것 우선)
        let redPotionLog = null;
        if (currentHp < maxHp * 0.6) {
            const HP_POTION_PRIORITY = [
                { id: 'potion_clear_high', name: '맑은 물약', defaultHeal: 500 },
                { id: 'potion_clear', name: '주홍 물약', defaultHeal: 250 },
                { id: 'potion_red', name: '빨간 물약', defaultHeal: 60 },
            ];
            for (const p of HP_POTION_PRIORITY) {
                const idx = currentInventory.findIndex(i => i.id === p.id);
                if (idx >= 0) {
                    const healAmt = currentInventory[idx].healAmount || p.defaultHeal;
                    currentHp = Math.min(maxHp, currentHp + healAmt);
                    _consumeItem(currentInventory, idx);
                    redPotionLog = `[자동] ${p.name}을(를) 사용했습니다. (HP+${healAmt})`;
                    isPotionUsed = 'red';
                    break;
                }
            }
        }

        const currentMapId = state.currentMapId || 'village';
        if (currentMapId === 'village' || currentMapId === 'elf_village') {
            // 마을 리젠: currentHp/currentMp 기준으로 계산 (포션 효과 반영)
            const lastRegenTimeV = state.lastRegenTime || 0;
            const didRegenV = now - lastRegenTimeV > CONFIG.REGEN_INTERVAL_MS;
            if (didRegenV) {
                const regenAmount = CONFIG.REGEN_AMOUNT_BASE + (state.level * CONFIG.REGEN_AMOUNT_PER_LEVEL) + (stats.hpRegenBonus || 0);
                const meditationBonus = (state.characterClass === 'wizard' && state.combatState?.meditationEndTime > now) ? 30 : 0;
                const mpRegenPotionBonus = (mpRegenPotionEndTime > now) ? 15 : 0;
                const mpRegenAmount = 5 + Math.max(0, (12 + Math.floor(state.level / 12) + (stats.wis || 0) - 12)) + (stats.mpRegenBonus || 0) + meditationBonus + mpRegenPotionBonus;
                currentHp = Math.min(maxHp, currentHp + regenAmount);
                currentMp = Math.min(maxMp, currentMp + mpRegenAmount);
            }
            let villageLogs = [...state.logs];
            if (bravePotionLog) villageLogs.unshift(bravePotionLog);
            if (bluePotionLog) villageLogs.unshift(bluePotionLog);
            if (mpRegenLog) villageLogs.unshift(mpRegenLog);
            if (magicHelmLog) villageLogs.unshift(magicHelmLog);
            return {
                ...state,
                hp: currentHp,
                mp: currentMp,
                inventory: currentInventory,
                lastRegenTime: didRegenV ? now : lastRegenTimeV,
                logs: villageLogs,
                combatState: {
                    ...state.combatState,
                    hasteEndTime, bravePotionEndTime, bluePotionEndTime, mpRegenPotionEndTime, magicHelmStrEndTime: newMagicHelmEndTime,
                    potionEffect: (hasteLog || bravePotionLog || bluePotionLog || mpRegenLog || magicHelmLog) ? { timestamp: now, type: hasteLog ? 'haste' : (bravePotionLog ? 'brave' : (bluePotionLog ? 'blue' : (mpRegenLog ? 'mana' : 'magic_helm'))) } : state.combatState?.potionEffect
                }
            };
        }

        const currentTargetId = state.combatState?.targetMonsterId;
        let targetMonsterData = currentTargetId ? MONSTERS.find(m => (m.id === currentTargetId || m.img === currentTargetId) && m.map === currentMapId) : null;
        if (!targetMonsterData) targetMonsterData = _getTargetMonster(state, now);

        let kurzRespawnTime = state.combatState?.kurzRespawnTime || 0;
        let baphometRespawnTime = state.combatState?.baphometRespawnTime || 0;
        let monsterHpPercent = state.combatState?.monsterHpPercent !== undefined ? state.combatState.monsterHpPercent : 100;

        if (currentMapId === 'hell' && now < kurzRespawnTime) return { ...state, currentMapId: 'village', combatState: { ...state.combatState, isAttacking: false, targetMonsterId: null } };
        if (currentMapId === 'baphomet_room' && now < baphometRespawnTime) return { ...state, currentMapId: 'village', combatState: { ...state.combatState, isAttacking: false, targetMonsterId: null } };

        const lastRegenTime = state.lastRegenTime || 0;
        if (now - lastRegenTime > CONFIG.REGEN_INTERVAL_MS) {
            currentHp = Math.min(maxHp, currentHp + (CONFIG.REGEN_AMOUNT_BASE + (state.level * CONFIG.REGEN_AMOUNT_PER_LEVEL) + (stats.hpRegenBonus || 0)));
            const totalWis = 12 + Math.floor(state.level / 12) + (stats.wis || 0);
            const mpRegenPotionBonusCombat = (mpRegenPotionEndTime > now) ? 15 : 0;
            const meditationBonusCombat = (state.characterClass === 'wizard' && state.combatState?.meditationEndTime > now) ? 30 : 0;
            currentMp = Math.min(maxMp, currentMp + (5 + Math.max(0, (totalWis - 12)) + (stats.mpRegenBonus || 0) + mpRegenPotionBonusCombat + meditationBonusCombat));
        }

        if (now < (state.combatState?.respawnTimestamp || 0)) return { ...state, hp: Math.min(maxHp, currentHp), mp: Math.min(maxMp, currentMp), lastRegenTime: (now - lastRegenTime > CONFIG.REGEN_INTERVAL_MS) ? now : lastRegenTime };

        // [파티] 공통 플래그 (isDying 체크보다 먼저 계산)
        const isBossMob = targetMonsterData ? (targetMonsterData.id === 'kurz' || targetMonsterData.id === 'baphomet') : false;
        const inParty = !!(state.party && state.party.members && state.party.members.length > 1);
        const partnerOnSameMap = !isBossMob && inParty && (state.party.members?.some(
            m => m.characterName !== state.characterName && m.currentMapId === state.currentMapId && (m.hp ?? 1) > 0
        ) || false);

        if (state.combatState?.isDying) {
            if (now - state.combatState.deathTimestamp > 500) return _handleMonsterKill(state, targetMonsterData, 0, currentExp, currentAdena, currentInventory, state.logs, state.combatLogs || [], [], null, lastRegenTime, now, maxHp, null, hasteEndTime, bravePotionEndTime, currentMp, newMagicHelmEndTime, partnerOnSameMap, bluePotionEndTime, mpRegenPotionEndTime);
            return state;
        }

        if (monsterHpPercent <= 0 && !state.combatState?.isDying) return { ...state, combatState: { ...state.combatState, monsterHpPercent: 100, targetMonsterId: null, isDying: false } };
        const soloMode = !!(state.combatState?.soloModeForBoss);
        const partyBossScale = (isBossMob && inParty && !soloMode) ? 1.4 : 1.0;
        // [파티 사냥] 일반 몬스터도 파티 시 1.3배 강해짐 (데미지 감소로 구현)
        const partyHuntScale = partnerOnSameMap ? 1.3 : 1.0;

        const monsterEvasion = (targetMonsterData.level || 1) + 15;
        const hitChance = stats.accuracy >= 100 ? 1.0 : Math.min(0.95, Math.max(0.35, 0.8 + (stats.accuracy - monsterEvasion) / 100));
        // 마법사: 기본 마법 미설정이거나 MP 충분하면 마법 발동 → 100% 명중
        const _defSpell = state.wizardDefaultSpell ? WIZARD_SPELLS.find(s => s.id === state.wizardDefaultSpell) : null;
        const wizardWillUseMagic = state.characterClass === 'wizard' && (!_defSpell || currentMp >= (_defSpell.mpCost || 0));
        const isHit = wizardWillUseMagic ? true : Math.random() < hitChance;
        let playerDamage = 0, combatActionLog = null, isMagicAttack = false, magicImpactType = null;

        if (isHit) {
            // 대형 몬스터엔 largeAtk, 소형엔 smallAtk 적용
            playerDamage = targetMonsterData.isLarge ? stats.largeAtk : stats.smallAtk;
            let bonusEnchant = 0;
            if (stats.weaponEnchant >= 7 && Math.random() < 0.3) {
                bonusEnchant = Math.floor(Math.random() * (41 + (stats.weaponEnchant - 7) * 15));
            }
            if (state.characterClass === 'elf') {
                // 트리플 애로우: 기본 공격력 × 3
                const isTripleArrowActive = state.combatState?.tripleArrowEffect && Date.now() - state.combatState.tripleArrowEffect.timestamp < 600;
                const damageMultiplier = isTripleArrowActive ? 3 : 1;
                playerDamage = playerDamage * damageMultiplier;
                playerDamage += (stats.dex * 0.2 + stats.weaponEnchant + bonusEnchant + Math.floor(state.level / 12)) * damageMultiplier;
            } else if (state.characterClass === 'wizard') {
                const defaultSpellId = state.wizardDefaultSpell;
                const defaultSpell = defaultSpellId ? WIZARD_SPELLS.find(s => s.id === defaultSpellId) : null;
                // 기본 마법: 공격 틱마다 무조건 시전 (억제 없음)
                if (defaultSpell && currentMp >= defaultSpell.mpCost) {
                    // 기본 마법 발동: 물리 공격 제거, 마법만 (+30%)
                    playerDamage = 0;
                    isMagicAttack = true;
                    const wInt = stats.int || 18;
                    const wWis = stats.wis || 18;
                    const wMagicBonus = stats.magicAtkBonus || 0;
                    const isOrc = targetMonsterData.type === 'orc' || (targetMonsterData.name || '').includes('오크');
                    let magicDmg = 0;
                    if (defaultSpell.type === 'wizard_energy_bolt') {
                        magicDmg = Math.floor(wInt * 0.4 + wWis * 0.2) + stats.weaponEnchant + bonusEnchant + Math.floor(state.level / 8) + wMagicBonus;
                    } else if (defaultSpell.type === 'wizard_fireball') {
                        magicDmg = Math.floor(wInt * 0.55 + wWis * 0.25) + stats.weaponEnchant + bonusEnchant + Math.floor(state.level / 6) + wMagicBonus;
                    } else if (defaultSpell.type === 'wizard_call_lightning') {
                        magicDmg = Math.floor(wInt * 0.6 + wWis * 0.3) + stats.weaponEnchant + bonusEnchant + Math.floor(state.level / 5) + (isOrc ? 15 : 0) + wMagicBonus;
                    } else if (defaultSpell.type === 'wizard_eruption') {
                        magicDmg = Math.floor(wInt * 0.7 + wWis * 0.35) + stats.weaponEnchant + bonusEnchant + Math.floor(state.level / 4) + wMagicBonus;
                    } else if (defaultSpell.type === 'wizard_ice_lance') {
                        magicDmg = Math.floor(wInt * 0.85 + wWis * 0.4) + stats.weaponEnchant + bonusEnchant + Math.floor(state.level / 4) + wMagicBonus;
                    }
                    magicImpactType = defaultSpell.type === 'wizard_fireball' ? 'fire'
                        : defaultSpell.type === 'wizard_call_lightning' ? 'lightning'
                        : defaultSpell.type === 'wizard_eruption' ? 'eruption'
                        : 'bolt';
                    playerDamage = Math.floor(magicDmg * 2.0);
                    // 몬스터 마법 방어력(MR) 적용: 최소 10% 피해 보장
                    const monsterMr = targetMonsterData.mr || 0;
                    const mrReduction = 1 - Math.max(0.1, monsterMr / 100);
                    playerDamage = Math.max(1, Math.floor(playerDamage * mrReduction));
                    currentMp = Math.max(0, currentMp - defaultSpell.mpCost);
                } else if (defaultSpell && currentMp < defaultSpell.mpCost) {
                    // MP 부족 → 일반 물리 공격만 (largeAtk/smallAtk 유지, 마법 없음)
                } else {
                    // 기본 마법 미설정: 무료 에너지 볼트, 물리 없음 (+30%)
                    playerDamage = 0;
                    isMagicAttack = true;
                    magicImpactType = 'bolt';
                    const freeMagicDmg = Math.floor(stats.int * 0.4 + stats.wis * 0.2) + stats.weaponEnchant + bonusEnchant + Math.floor(state.level / 8) + (stats.magicAtkBonus || 0);
                    playerDamage = Math.floor(freeMagicDmg * 2.0);
                    // 몬스터 마법 방어력(MR) 적용: 최소 10% 피해 보장
                    const monsterMr = targetMonsterData.mr || 0;
                    const mrReduction = 1 - Math.max(0.1, monsterMr / 100);
                    playerDamage = Math.max(1, Math.floor(playerDamage * mrReduction));
                }
            } else {
                playerDamage += (Math.floor(stats.str / 3) + stats.weaponEnchant + bonusEnchant + Math.floor(state.level / 10));
            }
            // [파티] 보스 HP 스케일 보정 + 일반 파티 사냥 몬스터 강화 (데미지 감소)
            playerDamage = Math.max(1, Math.floor(playerDamage / (partyBossScale * partyHuntScale)));
            // 공격 성공 시 마나 회복 (mpOnHit 장비 효과)
            if (stats.mpOnHitBonus > 0) currentMp = Math.min(maxMp, currentMp + stats.mpOnHitBonus);

            // [지팡이 +7] 랜덤 마법 추타 (40% 확률)
            if (stats.isStaffEquipped && stats.weaponEnchant >= 7 && Math.random() < 0.4) {
                const staffMagicDmg = Math.max(1, Math.floor(
                    (stats.magicAtkBonus || 0) * 3
                    + (stats.weaponEnchant - 7) * 8
                    + Math.random() * 15
                ));
                playerDamage += staffMagicDmg;
                combatActionLog = `[마법 추타] 지팡이에서 마법이 폭발했습니다! +${staffMagicDmg} 추가 피해`;
            }
        } else {
            combatActionLog = `[빗나감] ${targetMonsterData.name}에 대한 공격이 빗나갔습니다.`;
        }

        // [정령 동반] 서먼 레서 엘리멘탈: 매 틱 요정 공격력의 20% 추가 피해
        let elementalDamage = 0;
        if (state.characterClass === 'elf' && now < (state.combatState?.summonElementalEndTime || 0)) {
            const baseAtk = targetMonsterData.isLarge ? stats.largeAtk : stats.smallAtk;
            elementalDamage = Math.max(1, Math.round(baseAtk * 0.2));
            elementalDamage = Math.max(1, Math.floor(elementalDamage / (partyBossScale * partyHuntScale)));
        }

        let receivedDamage = 0, castLog = null, isSpellCast = false, aoeSpellHit = null;
        let activeSpellName = targetMonsterData.spellName;
        let activeSpellElement = targetMonsterData.spellType || 'neutral';
        let newBaphometSpellToggle = state.combatState?.baphometSpellToggle || false;
        let newBaphometSpellIndex = (state.combatState?.baphometSpellIndex || 0);
        // [커츠] 일반 공격 카운터 (3회 이상 시 마법 시전)
        let kurzAttackCount = state.combatState?.kurzAttackCount || 0;
        let newKurzAttackCount = kurzAttackCount;

        // [커츠] 광전사 모드: HP 30% 이하
        const isKurzBerserk = targetMonsterData.id === 'kurz' && monsterHpPercent <= 30;

        const isMonsterStunned = state.combatState?.isMonsterStunned && state.combatState.isMonsterStunned > now;
        if (!isMonsterStunned && targetMonsterData.atk > 0) {
            const isMonsterHit = Math.random() < Math.min(0.95, Math.max(0.15, 0.8 + ((targetMonsterData.level || 1) + 20 - stats.evasion) / 100));
            if (isMonsterHit) {
                // [커츠] 패턴: 일반 공격 카운터 → 마법 시전
                // 광전사 모드: 2회 공격마다 마법 (기본: 3회)
                if (targetMonsterData.id === 'kurz') {
                    const spellThreshold = isKurzBerserk ? 2 : 3;
                    if (kurzAttackCount >= spellThreshold) {
                        isSpellCast = true;
                        newKurzAttackCount = 0;
                    } else {
                        isSpellCast = false;
                        newKurzAttackCount = kurzAttackCount + 1;
                    }
                } else {
                    isSpellCast = targetMonsterData.isMagic && Math.random() < 0.5;
                }

                if (isSpellCast) {
                    // 바포메트: 5종 마법 순환 시전
                    if (targetMonsterData.id === 'baphomet') {
                        const BAPHOMET_SPELLS = [
                            { name: '이럽션',       element: 'eruption' },
                            { name: '어스 퀘이크',   element: 'earth'    },
                            { name: '다크 블레이즈', element: 'fire'     },
                            { name: '썬더 스톰',    element: 'electric' },
                            { name: '데스 커스',    element: 'neutral'  },
                        ];
                        const spell = BAPHOMET_SPELLS[newBaphometSpellIndex % BAPHOMET_SPELLS.length];
                        activeSpellName = spell.name;
                        activeSpellElement = spell.element;
                        newBaphometSpellIndex = (newBaphometSpellIndex + 1) % BAPHOMET_SPELLS.length;
                        newBaphometSpellToggle = newBaphometSpellIndex % 2 === 0; // 하위 호환 유지
                    }
                    // [커츠] 광전사 모드: 강화 마법 '업화의 폭발' 사용
                    if (isKurzBerserk && targetMonsterData.id === 'kurz') {
                        activeSpellName = '업화의 폭발';
                        activeSpellElement = 'fire';
                    }
                    if (activeSpellElement === 'wind') soundManager.playSound('spell_wind');
                    else if (activeSpellElement === 'electric') soundManager.playSound('spell_lightning');
                    else if (activeSpellElement === 'fire') soundManager.playSound('spell_fire');
                    else if (activeSpellElement === 'earth' || activeSpellElement === 'eruption') soundManager.playSound('spell_earth');
                    const mrReduction = (stats.mrBonus || 0) + (10 + Math.floor((12 + Math.floor(state.level / 12) + (stats.wis || 0)) / 2) + 4);
                    const baseMagicAtk = isKurzBerserk && targetMonsterData.id === 'kurz'
                        ? Math.floor((targetMonsterData.magicAtk || targetMonsterData.atk) * 1.6)  // 광전사: 마법 위력 +60%
                        : (targetMonsterData.magicAtk || targetMonsterData.atk);
                    receivedDamage = Math.max(1, Math.floor(baseMagicAtk * Math.max(0.1, 1 - (mrReduction / 100))));
                    if (activeSpellName) castLog = isKurzBerserk && targetMonsterData.id === 'kurz'
                        ? `[광전사] ${targetMonsterData.name}이(가) ${activeSpellName}을(를) 시전합니다!`
                        : `[마법] ${targetMonsterData.name}이(가) ${activeSpellName}을(를) 시전합니다!`;
                } else {
                    const baseAtk = isKurzBerserk && targetMonsterData.id === 'kurz'
                        ? Math.floor((targetMonsterData.atk || 10) * 1.4)  // 광전사: 물리 공격 +40%
                        : (targetMonsterData.atk || 10);
                    receivedDamage = Math.max(1, baseAtk - (10 - stats.ac));
                }
                // [파티] 보스 ATK 스케일 보정
                receivedDamage = Math.max(1, Math.floor(receivedDamage * partyBossScale));
                receivedDamage = Math.max(1, Math.floor(receivedDamage * (1 + (Math.random() * 2 - 1) * CONFIG.DAMAGE_VARIANCE)));

                // [광역 마법] 썬더 스톰/어스 퀘이크는 전원 피격 — 역할 분담 무시
                const isAoeSpell = isSpellCast && (activeSpellName === '썬더 스톰' || activeSpellName === '어스 퀘이크');

                // [파티 역할 분담] 보스 전투 시: 기사는 일반 공격, 요정은 마법 공격만 받음 (AoE 제외)
                if (inParty && isBossMob && !isAoeSpell) {
                    const isKnight = state.characterClass === 'knight';
                    // 기사: 마법 데미지 무효
                    if (isKnight && isSpellCast) receivedDamage = 0;
                    // 비기사: 기사 파티원이 살아있으면 일반 데미지 무효
                    if (!isKnight && !isSpellCast) {
                        const partnerKnight = state.party?.members?.find(
                            m => m.characterName !== state.characterName && m.characterClass === 'knight'
                        );
                        const knightAlive = partnerKnight && partnerKnight.hp > 0;
                        if (knightAlive) receivedDamage = 0;
                    }
                }

                currentHp -= receivedDamage;

                // [광역 마법] 파티원에게도 동일 데미지 전달용 플래그
                if (isAoeSpell && inParty && receivedDamage > 0) {
                    aoeSpellHit = { damage: receivedDamage, spellName: activeSpellName, element: activeSpellElement, timestamp: now };
                }
            }
        }

        let combatSystemLogs = [...state.logs];
        if (redPotionLog) combatSystemLogs.unshift(redPotionLog);
        if (bravePotionLog) combatSystemLogs.unshift(bravePotionLog);
        if (bluePotionLog) combatSystemLogs.unshift(bluePotionLog);
        if (mpRegenLog) combatSystemLogs.unshift(mpRegenLog);
        if (magicHelmLog) combatSystemLogs.unshift(magicHelmLog);
        if (hasteLog) combatSystemLogs.unshift(hasteLog);

        let combatLogs = [...(state.combatLogs || [])];
        if (combatActionLog) combatLogs.push({ type: 'miss', text: combatActionLog });
        if (castLog) combatLogs.push({ type: 'spell', text: castLog });

        let damageNumbers = [...(state.combatState?.damageNumbers || [])].filter(d => now - d.timestamp < 1000);
        if (playerDamage > 0) damageNumbers.push({ value: playerDamage, x: 50 + (Math.random() * 20 - 10), y: 40 + (Math.random() * 20 - 10), timestamp: now, isCrit: false, isMagic: isMagicAttack });
        if (receivedDamage > 0) damageNumbers.push({ value: receivedDamage, x: 50, y: 80, timestamp: now, isPlayerDamage: true });
        if (elementalDamage > 0) damageNumbers.push({ value: elementalDamage, timestamp: now, isElemental: true });

        // [BUG FIX] newMonsterHpPercent를 사망 체크 전에 계산해야 TDZ ReferenceError 방지
        // 이전 코드: let이 line 561에 선언되어 line 558에서 TDZ 에러 → catch → return state → 사망 미발동
        let newMonsterHpPercent = monsterHpPercent - (((playerDamage + elementalDamage) / targetMonsterData.hp) * 100);

        if (currentHp <= 0) {
            return _handleDeath(state, targetMonsterData, maxHp, combatSystemLogs, combatLogs, inParty && isBossMob, newMonsterHpPercent, inParty && !isBossMob && partnerOnSameMap);
        }
        if (newMonsterHpPercent <= 0) {
            return { ...state, hp: Math.min(maxHp, currentHp), mp: Math.min(maxMp, currentMp), inventory: currentInventory, logs: combatSystemLogs, combatLogs, lastRegenTime: (now - lastRegenTime > CONFIG.REGEN_INTERVAL_MS) ? now : lastRegenTime, combatState: { ...state.combatState, isAttacking: false, monsterHpPercent: 0, targetMonsterId: targetMonsterData.id, damageNumbers, isDying: true, deathTimestamp: now, hasteEndTime, bravePotionEndTime, bluePotionEndTime, mpRegenPotionEndTime, magicHelmStrEndTime: newMagicHelmEndTime, kurzAttackCount: newKurzAttackCount, impact: playerDamage > 0 ? { type: isMagicAttack && magicImpactType ? magicImpactType : 'kill', timestamp: now } : null, wizardSpellEffect: isMagicAttack && magicImpactType ? { type: magicImpactType, timestamp: now } : state.combatState?.wizardSpellEffect, partnerOnSameMap, lastAttackDamage: playerDamage, lastAttackIsMagic: isMagicAttack } };
        }

        const minAttackInterval = state.characterClass === 'wizard' ? 1500 : 700; // 마법사는 최소 1.5초 이상 딜레이
        const attackIntervalMs = Math.max(minAttackInterval, _computeAttackIntervalMs(hasteEndTime, bravePotionEndTime, state.characterClass === 'elf', now) - (stats.accuracySpeedBonus || 0) * 25);
        return { ...state, hp: Math.min(maxHp, currentHp), mp: Math.min(maxMp, currentMp), inventory: currentInventory, logs: combatSystemLogs, combatLogs: combatLogs.slice(-50), lastRegenTime: (now - lastRegenTime > CONFIG.REGEN_INTERVAL_MS) ? now : lastRegenTime, combatState: { ...state.combatState, isAttacking: true, lastAttackTimestamp: now, attackIntervalMs, targetMonsterId: targetMonsterData.id, monsterHpPercent: newMonsterHpPercent, damageNumbers, potionEffect: (hasteLog || bravePotionLog || bluePotionLog || mpRegenLog || isPotionUsed) ? { timestamp: now, type: hasteLog ? 'haste' : (bravePotionLog ? 'brave' : (bluePotionLog ? 'blue' : (mpRegenLog ? 'mana' : (isPotionUsed || 'potion')))) } : state.combatState.potionEffect, impact: playerDamage > 0 ? { type: isMagicAttack && magicImpactType ? magicImpactType : 'hit', timestamp: now } : null, wizardSpellEffect: isMagicAttack && magicImpactType ? { type: magicImpactType, timestamp: now } : state.combatState?.wizardSpellEffect, playerImpact: isSpellCast ? { type: 'magic', element: activeSpellElement, timestamp: now } : null, baphometSpellToggle: newBaphometSpellToggle, baphometSpellIndex: newBaphometSpellIndex, kurzAttackCount: newKurzAttackCount, aoeSpellHit, hasteEndTime, bravePotionEndTime, bluePotionEndTime, mpRegenPotionEndTime, magicHelmStrEndTime: newMagicHelmEndTime, lastAttackDamage: playerDamage, lastAttackIsMagic: isMagicAttack } };
    } catch (e) {
        console.error("Combat Error:", e);
        return state;
    }
};


function _getTargetMonster(state, now) {
    const monsters = MONSTERS.filter(m => m.map === (state.currentMapId || 'village'));
    if (monsters.length === 0) return null;
    const kurzRespawnTime = state.combatState?.kurzRespawnTime || 0;
    const baphometRespawnTime = state.combatState?.baphometRespawnTime || 0;
    let available = monsters;
    if (now < kurzRespawnTime) available = available.filter(m => m.id !== 'kurz');
    if (now < baphometRespawnTime) available = available.filter(m => m.id !== 'baphomet');
    if (available.length === 0) return null;
    return available[Math.floor(now / CONFIG.MONSTER_ROTATE_INTERVAL_MS) % available.length];
}

function _consumeItem(inventory, index) {
    if (inventory[index].count > 1) inventory[index].count--;
    else inventory.splice(index, 1);
}

function _handleDeath(state, monster, _maxHp, systemLogs, combatLogs, inPartyBoss = false, currentMonsterHpPercent = 100, inPartyHunt = false) {
    const penalty = Math.floor(getRequiredExp(state.level) * 0.05);
    const deathMsg = inPartyHunt
        ? `[사망] 사망했습니다. (경험치 -${penalty}) 부활 후 파티에 재참여할 수 있습니다.`
        : `[사망] 사망했습니다. (경험치 -${penalty})`;
    const updatedLogs = [deathMsg, ...(systemLogs || [])].slice(0, 50);
    const updatedCombatLogs = [...(combatLogs || []), { type: 'death', text: `[사망] ${monster.name}에게 패배했습니다.` }].slice(-30);

    return {
        ...state,
        hp: 0,
        currentExp: Math.max(0, state.currentExp - penalty),
        logs: updatedLogs,
        combatLogs: updatedCombatLogs,
        combatState: {
            ...state.combatState,
            isAttacking: false,
            isPlayerDead: true,
            // 파티 전투 중 사망 시 재참여 가능 플래그
            pendingRejoin: inPartyBoss || inPartyHunt,
            savedMonsterHpPercent: inPartyBoss ? Math.max(0, currentMonsterHpPercent) : undefined,
            savedRejoinMapId: inPartyHunt && !inPartyBoss ? state.currentMapId : undefined,
            playerDeathTimestamp: Date.now(),
            deathPenaltyExp: penalty,
            targetMonsterId: null,
            monsterHpPercent: 100,
            // 사망 시 모든 버프 초기화
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

function _handleMonsterKill(state, monster, _lastDamage, currentExp, currentAdena, currentInventory, systemLogs, combatLogs, _damageNumbers, _potionEffect, _lastRegenTime, now, _maxHp, impact, hasteEndTime, bravePotionEndTime, currentMp, magicHelmStrEndTime, partnerOnSameMap = false, bluePotionEndTime = 0, mpRegenPotionEndTime = 0) {
    if (monster.id === 'kurz' || monster.id === 'baphomet') {
        soundManager.playSound('boss_kill');
    } else {
        soundManager.playSound('monster_death');
    }
    const partyExpMult = partnerOnSameMap ? 1.5 : 1.0;
    const rewardExp = Math.floor(monster.exp * CONFIG.EXP_MULTIPLIER * partyExpMult);
    const mapId = state.currentMapId;
    let dropChance = 0.01, diffWeight = 1.0, dropTable = [];

    // 물약 드랍률 대폭 상향 (약 3배), 아이템 드랍 확률도 전반적으로 상향
    if (mapId === 'talking_island') { dropChance = 0.025; diffWeight = 1.0; dropTable = [{ id: 'potion_red', weight: 260, countMin: 1, countMax: 10 }, { id: 'scroll_zel', weight: 15, countMin: 1, countMax: 1 }, { id: 'sword_long', weight: 9, countMin: 1, countMax: 1 }, { id: 'sword_dwarf', weight: 9, countMin: 1, countMax: 1 }, { id: 'bow_orc', weight: 8, countMin: 1, countMax: 1 }, { id: 'sword_twohanded', weight: 8, countMin: 1, countMax: 1 }, { id: 'helm_magic_def', weight: 4, countMin: 1, countMax: 1 }, { id: 'cloak_magic_def', weight: 6, countMin: 1, countMax: 1 }]; }
    else if (mapId === 'dungeon') { dropChance = 0.035; diffWeight = 0.8; dropTable = [{ id: 'potion_red', weight: 180, countMin: 2, countMax: 18 }, { id: 'potion_clear', weight: 30, countMin: 1, countMax: 4 }, { id: 'scroll_zel', weight: 20, countMin: 1, countMax: 1 }, { id: 'scroll_dai', weight: 10, countMin: 1, countMax: 1 }, { id: 'crystal_resist_magic', weight: 3, countMin: 1, countMax: 1 }, { id: 'sword_long', weight: 6, countMin: 1, countMax: 1 }, { id: 'sword_dwarf', weight: 6, countMin: 1, countMax: 1 }, { id: 'bow_orc', weight: 5, countMin: 1, countMax: 1 }, { id: 'sword_twohanded', weight: 5, countMin: 1, countMax: 1 }, { id: 'armor_chain', weight: 8, countMin: 1, countMax: 1 }, { id: 'armor_bronze_plate', weight: 8, countMin: 1, countMax: 1 }, { id: 'armor_plate', weight: 6, countMin: 1, countMax: 1 }, { id: 'helm_elf', weight: 6, countMin: 1, countMax: 1 }, { id: 'helm_magic_def', weight: 4, countMin: 1, countMax: 1 }, { id: 'cloak_magic_def', weight: 4, countMin: 1, countMax: 1 }]; }
    else if (mapId === 'orc_forest') { dropChance = 0.04; diffWeight = 1.0; dropTable = [{ id: 'potion_red', weight: 150, countMin: 5, countMax: 30 }, { id: 'potion_clear', weight: 50, countMin: 2, countMax: 8 }, { id: 'scroll_zel', weight: 15, countMin: 1, countMax: 1 }, { id: 'crystal_resist_magic', weight: 3, countMin: 1, countMax: 1 }, { id: 'armor_chain', weight: 5, countMin: 1, countMax: 1 }, { id: 'armor_bronze_plate', weight: 5, countMin: 1, countMax: 1 }, { id: 'armor_plate', weight: 5, countMin: 1, countMax: 1 }, { id: 'helm_elf', weight: 5, countMin: 1, countMax: 1 }, { id: 'shirt_elf', weight: 3, countMin: 1, countMax: 1 }, { id: 'sword_silver', weight: 8, countMin: 1, countMax: 1 }, { id: 'armor_magic_def_chain', weight: 4, countMin: 1, countMax: 1 }, { id: 'helm_magic_str', weight: 3, countMin: 1, countMax: 1 }, { id: 'cloak_protection', weight: 4, countMin: 1, countMax: 1 }]; }
    else if (mapId === 'desert') { dropChance = 0.05; diffWeight = 1.4; dropTable = [{ id: 'potion_red', weight: 120, countMin: 5, countMax: 40 }, { id: 'potion_clear', weight: 80, countMin: 3, countMax: 12 }, { id: 'scroll_zel', weight: 20, countMin: 1, countMax: 2 }, { id: 'scroll_dai', weight: 10, countMin: 1, countMax: 1 }, { id: 'scroll_blessed_armor', weight: 2, countMin: 1, countMax: 1 }, { id: 'scroll_blessed_weapon', weight: 1, countMin: 1, countMax: 1 }, { id: 'crystal_triple_arrow', weight: 3, countMin: 1, countMax: 1 }, { id: 'shirt_elf', weight: 2, countMin: 1, countMax: 1 }, { id: 'sword_silver', weight: 6, countMin: 1, countMax: 1 }, { id: 'armor_magic_def_chain', weight: 3, countMin: 1, countMax: 1 }]; }
    else if (mapId === 'dragon_valley') { dropChance = 0.06; diffWeight = 1.8; dropTable = [{ id: 'potion_clear', weight: 170, countMin: 5, countMax: 30 }, { id: 'scroll_zel', weight: 20, countMin: 1, countMax: 2 }, { id: 'scroll_blessed_armor', weight: 5, countMin: 1, countMax: 1 }, { id: 'scroll_blessed_weapon', weight: 2, countMin: 1, countMax: 1 }, { id: 'longbow', weight: 4, countMin: 1, countMax: 1 }, { id: 'bow_saha', weight: 2, countMin: 1, countMax: 1 }, { id: 'necklace_str', weight: 3, countMin: 1, countMax: 1 }, { id: 'necklace_con', weight: 3, countMin: 1, countMax: 1 }, { id: 'necklace_dex', weight: 2, countMin: 1, countMax: 1 }, { id: 'necklace_wis', weight: 2, countMin: 1, countMax: 1 }, { id: 'necklace_int', weight: 2, countMin: 1, countMax: 1 }, { id: 'belt_dex', weight: 1, countMin: 1, countMax: 1 }, { id: 'crystal_triple_arrow', weight: 3, countMin: 1, countMax: 1 }, { id: 'crystal_summon_elemental', weight: 3, countMin: 1, countMax: 1 }, { id: 'crystal_wind_shot', weight: 2, countMin: 1, countMax: 1 }, { id: 'crystal_earth_skin', weight: 2, countMin: 1, countMax: 1 }, { id: 'crystal_fire_weapon', weight: 2, countMin: 1, countMax: 1 }, { id: 'crystal_natures_touch', weight: 2, countMin: 1, countMax: 1 }, { id: 'spellbook_call_lightning', weight: 3, countMin: 1, countMax: 1 }, { id: 'spellbook_enchant_mighty', weight: 3, countMin: 1, countMax: 1 }, { id: 'spellbook_meditation', weight: 2, countMin: 1, countMax: 1 }, { id: 'wizard_stone', weight: 10, countMin: 1, countMax: 3 }]; }
    else if (mapId === 'water_dungeon') { dropChance = 0.07; diffWeight = 4.5; dropTable = [{ id: 'potion_clear', weight: 150, countMin: 10, countMax: 50 }, { id: 'scroll_zel', weight: 15, countMin: 1, countMax: 2 }, { id: 'scroll_blessed_armor', weight: 5, countMin: 1, countMax: 1 }, { id: 'scroll_blessed_weapon', weight: 3, countMin: 1, countMax: 1 }, { id: 'ring_guardian', weight: 2, countMin: 1, countMax: 1 }, { id: 'bow_saha', weight: 2, countMin: 1, countMax: 1 }, { id: 'necklace_str', weight: 3, countMin: 1, countMax: 1 }, { id: 'necklace_con', weight: 3, countMin: 1, countMax: 1 }, { id: 'necklace_dex', weight: 3, countMin: 1, countMax: 1 }, { id: 'necklace_wis', weight: 2, countMin: 1, countMax: 1 }, { id: 'necklace_int', weight: 2, countMin: 1, countMax: 1 }, { id: 'belt_dex', weight: 1, countMin: 1, countMax: 1 }, { id: 'necklace_protection', weight: 1, countMin: 1, countMax: 1 }, { id: 'ring_protection', weight: 1, countMin: 1, countMax: 1 }, { id: 'crystal_summon_elemental', weight: 4, countMin: 1, countMax: 1 }, { id: 'crystal_wind_shot', weight: 3, countMin: 1, countMax: 1 }, { id: 'crystal_earth_skin', weight: 3, countMin: 1, countMax: 1 }, { id: 'crystal_fire_weapon', weight: 3, countMin: 1, countMax: 1 }, { id: 'crystal_natures_touch', weight: 3, countMin: 1, countMax: 1 }, { id: 'shield_eva', weight: 4, countMin: 1, countMax: 1 }, { id: 'spellbook_great_heal', weight: 3, countMin: 1, countMax: 1 }, { id: 'spellbook_eruption', weight: 3, countMin: 1, countMax: 1 }, { id: 'spellbook_meditation', weight: 2, countMin: 1, countMax: 1 }, { id: 'wizard_stone', weight: 10, countMin: 1, countMax: 5 }]; }
    else if (mapId === 'hell') { dropChance = 0.08; diffWeight = 5.0; dropTable = [{ id: 'potion_clear', weight: 150, countMin: 10, countMax: 60 }, { id: 'scroll_dai', weight: 15, countMin: 1, countMax: 2 }, { id: 'scroll_blessed_weapon', weight: 5, countMin: 1, countMax: 1 }, { id: 'scroll_blessed_armor', weight: 4, countMin: 1, countMax: 1 }, { id: 'ring_guardian', weight: 2, countMin: 1, countMax: 1 }, { id: 'armor_robe_elder', weight: 2, countMin: 1, countMax: 1 }, { id: 'boots_elder', weight: 2, countMin: 1, countMax: 1 }, { id: 'necklace_str', weight: 2, countMin: 1, countMax: 1 }, { id: 'necklace_con', weight: 2, countMin: 1, countMax: 1 }, { id: 'necklace_dex', weight: 2, countMin: 1, countMax: 1 }, { id: 'necklace_wis', weight: 2, countMin: 1, countMax: 1 }, { id: 'necklace_int', weight: 2, countMin: 1, countMax: 1 }, { id: 'belt_dex', weight: 1, countMin: 1, countMax: 1 }, { id: 'necklace_protection', weight: 1, countMin: 1, countMax: 1 }, { id: 'ring_protection', weight: 1, countMin: 1, countMax: 1 }, { id: 'crystal_wind_shot', weight: 4, countMin: 1, countMax: 1 }, { id: 'crystal_earth_skin', weight: 4, countMin: 1, countMax: 1 }, { id: 'crystal_fire_weapon', weight: 4, countMin: 1, countMax: 1 }, { id: 'crystal_natures_touch', weight: 4, countMin: 1, countMax: 1 }, { id: 'spellbook_berserker', weight: 3, countMin: 1, countMax: 1 }, { id: 'spellbook_eruption', weight: 2, countMin: 1, countMax: 1 }, { id: 'wizard_stone', weight: 8, countMin: 1, countMax: 5 }]; }
    else if (mapId === 'baphomet_room') { dropChance = 0.09; diffWeight = 6.0; dropTable = [{ id: 'potion_clear', weight: 140, countMin: 15, countMax: 60 }, { id: 'scroll_dai', weight: 15, countMin: 1, countMax: 2 }, { id: 'scroll_blessed_weapon', weight: 7, countMin: 1, countMax: 1 }, { id: 'scroll_blessed_armor', weight: 6, countMin: 1, countMax: 1 }, { id: 'ring_guardian', weight: 2, countMin: 1, countMax: 1 }, { id: 'necklace_str', weight: 2, countMin: 1, countMax: 1 }, { id: 'necklace_con', weight: 2, countMin: 1, countMax: 1 }, { id: 'necklace_dex', weight: 2, countMin: 1, countMax: 1 }, { id: 'necklace_wis', weight: 2, countMin: 1, countMax: 1 }, { id: 'necklace_int', weight: 2, countMin: 1, countMax: 1 }, { id: 'belt_dex', weight: 1, countMin: 1, countMax: 1 }, { id: 'necklace_protection', weight: 1, countMin: 1, countMax: 1 }, { id: 'ring_protection', weight: 1, countMin: 1, countMax: 1 }, { id: 'crystal_wind_shot', weight: 5, countMin: 1, countMax: 1 }, { id: 'crystal_earth_skin', weight: 5, countMin: 1, countMax: 1 }, { id: 'crystal_fire_weapon', weight: 5, countMin: 1, countMax: 1 }, { id: 'crystal_natures_touch', weight: 5, countMin: 1, countMax: 1 }, { id: 'spellbook_summon_monster', weight: 3, countMin: 1, countMax: 1 }, { id: 'spellbook_ice_lance', weight: 2, countMin: 1, countMax: 1 }, { id: 'wizard_stone', weight: 8, countMin: 1, countMax: 5 }]; }

    if (monster.id === 'kurz') { dropChance = 1.0; dropTable = [{ id: 'potion_clear', weight: 40, countMin: 10, countMax: 30 }, { id: 'scroll_dai', weight: 10, countMin: 1, countMax: 1 }, { id: 'scroll_blessed_weapon', weight: 8, countMin: 1, countMax: 1 }, { id: 'scroll_blessed_armor', weight: 6, countMin: 1, countMax: 1 }, { id: 'ring_guardian', weight: 3, countMin: 1, countMax: 1 }, { id: 'helm_kurz', weight: 5, countMin: 1, countMax: 1 }, { id: 'armor_kurz', weight: 5, countMin: 1, countMax: 1 }, { id: 'gloves_kurz', weight: 5, countMin: 1, countMax: 1 }, { id: 'boots_kurz', weight: 5, countMin: 1, countMax: 1 }, { id: 'necklace_wis', weight: 2, countMin: 1, countMax: 1 }, { id: 'necklace_int', weight: 2, countMin: 1, countMax: 1 }]; }
    if (monster.id === 'baphomet') { dropChance = 1.0; dropTable = [{ id: 'potion_clear', weight: 30, countMin: 15, countMax: 50 }, { id: 'scroll_blessed_weapon', weight: 10, countMin: 1, countMax: 1 }, { id: 'scroll_blessed_armor', weight: 8, countMin: 1, countMax: 1 }, { id: 'robe_baphomet', weight: 12, countMin: 1, countMax: 1 }, { id: 'boots_baphomet', weight: 12, countMin: 1, countMax: 1 }, { id: 'necklace_protection', weight: 6, countMin: 1, countMax: 1 }, { id: 'ring_protection', weight: 6, countMin: 1, countMax: 1 }, { id: 'crystal_wind_shot', weight: 5, countMin: 1, countMax: 1 }, { id: 'crystal_earth_skin', weight: 5, countMin: 1, countMax: 1 }, { id: 'crystal_fire_weapon', weight: 5, countMin: 1, countMax: 1 }, { id: 'crystal_natures_touch', weight: 5, countMin: 1, countMax: 1 }, { id: 'spellbook_summon_monster', weight: 4, countMin: 1, countMax: 1 }, { id: 'spellbook_ice_lance', weight: 3, countMin: 1, countMax: 1 }, { id: 'necklace_wis', weight: 2, countMin: 1, countMax: 1 }, { id: 'necklace_int', weight: 2, countMin: 1, countMax: 1 }]; }

    // [파티 사냥] 보상 배율 및 아데나 배분
    const partyAdenaMult = partnerOnSameMap ? 1.5 : 1.0; // 총 아데나 상승
    const localAdenaPct  = partnerOnSameMap ? 0.5 : 1.0; // 나에게 귀속되는 비율
    const rawAdena = Math.floor(((monster.level * 120) + (Math.random() * 60)) * diffWeight * 0.175 * 1.5 * 1.5 * 1.2 * partyAdenaMult);
    const rewardAdena = Math.floor(rawAdena * localAdenaPct);
    const partnerAdena = partnerOnSameMap ? (rawAdena - rewardAdena) : 0;

    const dropRateMult = partnerOnSameMap ? 1.5 : 1.0;
    const finalChance = (monster.id === 'kurz' || monster.id === 'baphomet') ? 1.0 : Math.min(0.95, dropChance * diffWeight * 1.0 * dropRateMult);

    let partnerLootItem = null;
    let partnerLootCount = 0;
    const myCharName = state.characterName;

    if (Math.random() < finalChance && dropTable.length > 0) {
        const totalW = dropTable.reduce((s, i) => s + i.weight, 0);
        let rw = Math.random() * totalW;
        let sel = null;
        for (const d of dropTable) { rw -= d.weight; if (rw <= 0) { sel = d; break; } }
        if (sel) {
            const item = ITEMS.find(i => i.id === sel.id);
            if (item) {
                const count = Math.floor(Math.random() * (sel.countMax - sel.countMin + 1)) + sel.countMin;
                // [파티] 아이템은 랜덤으로 한 명에게 귀속 (50:50)
                const goesToPartner = partnerOnSameMap && Math.random() < 0.5;
                if (goesToPartner) {
                    partnerLootItem = item;
                    partnerLootCount = count;
                    combatLogs.push({ type: 'drop', text: `[드롭] 파티원이 ${item.name}${count > 1 ? ` x${count}` : ''} 을(를) 획득했습니다.` });
                } else {
                    if (item.type === 'scroll' || item.type === 'potion' || item.type === 'crystal') {
                        const idx = currentInventory.findIndex(i => i.id === item.id);
                        if (idx >= 0) currentInventory[idx].count += count;
                        else currentInventory.push({ ...item, uid: now + Math.random(), count, enchant: 0 });
                    } else currentInventory.push({ ...item, uid: now + Math.random(), count: 1, enchant: 0, isEquipped: false });
                    combatLogs.push({ type: 'drop', text: `[드롭] ${myCharName} 님이 ${item.name}${count > 1 ? ` x${count}` : ''} 을(를) 획득하였습니다.` });
                    systemLogs.unshift(`[드롭] ${myCharName} 님이 ${item.name}${count > 1 ? ` x${count}` : ''} 을(를) 획득하였습니다.`);
                }
            }
        }
    }

    combatLogs.push({ type: 'kill', text: `[처치] ${monster.name} (+${rewardExp} Exp, +${rewardAdena} A)` });
    let newExp = currentExp + rewardExp, newLevel = state.level, newMaxExp = getRequiredExp(newLevel), newHp = state.hp, levelUpEffect = null;
    let announces = state.pendingAnnouncements ? [...state.pendingAnnouncements] : [];

    while (newExp >= newMaxExp && newLevel < 100) {
        newLevel++; newExp -= newMaxExp; newMaxExp = getRequiredExp(newLevel);
        const curStats = calculateStats({ ...state, level: newLevel });
        newHp = getMaxHp({ ...state, level: newLevel }, curStats);
        currentMp = getMaxMp({ ...state, level: newLevel }, curStats);
        systemLogs.unshift(`[축하] 레벨 ${newLevel} 달성!`);
        levelUpEffect = { timestamp: now };
        soundManager.playSound('level_up');
        // 레벨업 [속보] 채팅 알림 제거 (유저 요청)
    }

    const finalLogs = (systemLogs || []).slice(0, 50);
    const finalCombatLogs = (combatLogs || []).slice(-30);

    const isBossKill = monster.id === 'kurz' || monster.id === 'baphomet';
    // [파티 사냥] 파티원에게 전달할 보상 (useParty가 감지 후 broadcast)
    const partyKillReward = partnerOnSameMap ? {
        adena: partnerAdena,
        lootItem: partnerLootItem,
        lootCount: partnerLootCount,
        monsterName: monster.name,
        timestamp: now,
        bossId: isBossKill ? monster.id : null,
    } : null;
    return { ...state, level: newLevel, currentExp: Math.floor(newExp), maxExp: newMaxExp, hp: newHp, mp: Math.floor(currentMp), adena: currentAdena + rewardAdena, inventory: currentInventory, logs: finalLogs, combatLogs: finalCombatLogs, pendingAnnouncements: announces, combatState: { ...state.combatState, monsterHpPercent: 100, targetMonsterId: null, respawnTimestamp: now + 300, isAttacking: false, impact, levelUpEffect: levelUpEffect || state.combatState?.levelUpEffect, isDying: false, kurzRespawnTime: (monster.id === 'kurz' ? now + 600000 : state.combatState?.kurzRespawnTime), baphometRespawnTime: (monster.id === 'baphomet' ? now + 600000 : state.combatState?.baphometRespawnTime), hasteEndTime, bravePotionEndTime, bluePotionEndTime, mpRegenPotionEndTime, magicHelmStrEndTime, soloModeForBoss: isBossKill ? false : state.combatState?.soloModeForBoss, partyKillReward, partnerOnSameMap } };
}
