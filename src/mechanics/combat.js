import { MONSTERS } from '../data/monsters';
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
    EXP_MULTIPLIER: 1.0, // [Fix] Missing EXP_MULTIPLIER
    DAMAGE_VARIANCE: 0.05,
    MONSTER_RESPAWN_DELAY_MS: 100,
    MONSTER_ROTATE_INTERVAL_MS: 15000,
    DROP_RATE_BASE: 0.0016,
    EXP_MULTIPLIER: 8,
};

export const getMaxHp = (state, stats) => {
    const naturalCon = Math.floor(state.level / 15);
    let hpBonus = stats.maxHpBonus || 0;
    if (state.currentMapId === 'water_dungeon' && stats.underwater) {
        hpBonus += 50;
    }
    return 50 + (state.level * (10 + (stats.con || 0) + (state.allocatedCon || 0) + naturalCon)) + hpBonus;
};

export const getMaxMp = (state, stats) => {
    return 30 + (state.level * 5) + (stats.maxMpBonus || 0);
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

    const baseStrRaw = state.baseStr || (characterClass === 'knight' ? 16 : 11);
    const baseStr = Math.min(30, baseStrRaw) + (characterClass === 'knight' ? levelStatBonus : 0);
    const baseDex = (state.baseDex || (characterClass === 'elf' ? 18 : 12)) + (characterClass === 'elf' ? levelStatBonus : 0);
    const baseCon = state.baseCon || (characterClass === 'knight' ? 14 : 12);
    const baseInt = state.baseInt || 8;
    const baseWis = state.baseWis || (characterClass === 'knight' ? 9 : 10);

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
    let weaponEnchant = 0, maxHpBonus = 0, hpRegenBonus = 0, totalMrBonus = 0;
    let hasUnderwaterGrace = false;

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
        if (item.stats?.underwater) hasUnderwaterGrace = true;
        if (item.type === 'weapon') weaponEnchant = item.enchant || 0;
    });

    let magicHelmStrBonus = 0;
    if (state?.combatState?.magicHelmStrEndTime && Date.now() < state.combatState.magicHelmStrEndTime) magicHelmStrBonus = 5;

    let bounceAttackBonus = 0;
    if (state?.combatState?.bounceAttackEndTime && Date.now() < state.combatState.bounceAttackEndTime) bounceAttackBonus = 10;

    const totalStr = Number(baseStr) + Number(totalStrBonus) + Number(state.allocatedStr || 0) + Number(magicHelmStrBonus);
    const totalDex = Number(baseDex) + Number(totalDexBonus) + Number(state.allocatedDex || 0);

    let accuracy = state.level + totalDex + (weaponEnchant * 2);
    if (characterClass === 'elf') accuracy += 10;

    return {
        smallAtk: smallAtk + bounceAttackBonus,
        largeAtk: largeAtk + bounceAttackBonus,
        ac: totalAc,
        str: totalStr,
        dex: totalDex,
        con: Number(baseCon) + Number(totalConBonus) + Number(state.allocatedCon || 0),
        int: Number(baseInt) + Number(totalIntBonus) + Number(state.allocatedInt || 0),
        wis: Number(baseWis) + Number(totalWisBonus) + Number(state.allocatedWis || 0),
        accuracy,
        weaponEnchant: weaponEnchant,
        maxHpBonus,
        hpRegenBonus,
        mrBonus: totalMrBonus,
        underwater: hasUnderwaterGrace,
        evasion: Number(state.level) + Number(totalDex) + (10 - Number(totalAc))
    };
};

export const processAutoHuntTick = (state) => {
    try {
        const now = Date.now();
        if (state.combatState?.isPlayerDead) return state;

        let hasteEndTime = state.combatState?.hasteEndTime || 0;
        let bravePotionEndTime = state.combatState?.bravePotionEndTime || 0;
        let hasteLog = null, bravePotionLog = null;

        if (now >= hasteEndTime && !state.combatState?.hasteAutoOff) {
            const potionIdx = state.inventory.findIndex(i => i.id === 'potion_green');
            if (potionIdx >= 0) {
                hasteEndTime = now + 300000;
                _consumeItem(state.inventory, potionIdx);
                hasteLog = `[자동] 초록 물약을 사용했습니다.`;
            }
        }
        if (now >= bravePotionEndTime && !state.combatState?.braveAutoOff) {
            const braveItemId = state.characterClass === 'elf' ? 'elven_wafer' : 'potion_brave';
            const potionIdx = state.inventory.findIndex(i => i.id === braveItemId);
            if (potionIdx >= 0) {
                bravePotionEndTime = now + 300000;
                _consumeItem(state.inventory, potionIdx);
                bravePotionLog = `[자동] ${state.characterClass === 'elf' ? '엘븐 와퍼' : '용기의 물약'}를 사용했습니다.`;
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

        // [New] Auto-Red Potion Logic (HP < 60%)
        let redPotionLog = null;
        if (currentHp < maxHp * 0.6) {
            const redIdx = currentInventory.findIndex(i => i.id === 'potion_red');
            if (redIdx >= 0) {
                const healAmt = currentInventory[redIdx].healAmount || 60;
                currentHp = Math.min(maxHp, currentHp + healAmt);
                _consumeItem(currentInventory, redIdx);
                redPotionLog = `[자동] 빨간 물약을 사용했습니다. (HP+${healAmt})`;
                isPotionUsed = 'red';
            }
        }

        const currentMapId = state.currentMapId || 'village';
        if (currentMapId === 'village') {
            const regenState = _handleRegenOnly(state, now, maxHp);
            let villageLogs = [...(regenState.logs || [])];
            if (bravePotionLog) villageLogs.unshift(bravePotionLog);
            if (magicHelmLog) villageLogs.unshift(magicHelmLog);
            return {
                ...regenState,
                inventory: currentInventory,
                logs: villageLogs,
                combatState: {
                    ...regenState.combatState,
                    hasteEndTime, bravePotionEndTime, magicHelmStrEndTime: newMagicHelmEndTime,
                    potionEffect: (hasteLog || bravePotionLog || magicHelmLog) ? { timestamp: now, type: hasteLog ? 'haste' : (bravePotionLog ? 'brave' : 'magic_helm') } : state.combatState?.potionEffect
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
            currentMp = Math.min(maxMp, currentMp + (5 + Math.max(0, (totalWis - 12) * 1) + (stats.mpRegenBonus || 0)));
        }

        if (now < (state.combatState?.respawnTimestamp || 0)) return { ...state, hp: Math.min(maxHp, currentHp), mp: Math.min(maxMp, currentMp), lastRegenTime: (now - lastRegenTime > CONFIG.REGEN_INTERVAL_MS) ? now : lastRegenTime };

        if (state.combatState?.isDying) {
            if (now - state.combatState.deathTimestamp > 500) return _handleMonsterKill(state, targetMonsterData, 0, currentExp, currentAdena, currentInventory, state.logs, state.combatLogs || [], [], null, lastRegenTime, now, maxHp, null, hasteEndTime, bravePotionEndTime, currentMp, newMagicHelmEndTime);
            return state;
        }

        if (monsterHpPercent <= 0 && !state.combatState?.isDying) return { ...state, combatState: { ...state.combatState, monsterHpPercent: 100, targetMonsterId: null, isDying: false } };

        soundManager.playSound('attack');
        const monsterEvasion = (targetMonsterData.level || 1) + 15;
        const hitChance = Math.min(0.95, Math.max(0.35, 0.8 + (stats.accuracy - monsterEvasion) / 100));
        const isHit = Math.random() < hitChance;
        let playerDamage = 0, combatActionLog = null;

        if (isHit) {
            playerDamage = stats.smallAtk;
            let bonusEnchant = 0;
            if (stats.weaponEnchant >= 7 && Math.random() < 0.3) {
                bonusEnchant = Math.floor(Math.random() * (41 + (stats.weaponEnchant - 7) * 15));
            }
            if (state.characterClass === 'elf') {
                playerDamage += (stats.dex * 0.2 + stats.weaponEnchant + bonusEnchant + Math.floor(state.level / 12));
            } else {
                playerDamage += (Math.floor(stats.str / 3) + stats.weaponEnchant + bonusEnchant + Math.floor(state.level / 10));
            }
            playerDamage = Math.max(1, Math.floor(playerDamage));
            soundManager.playSound('hit');
        } else {
            combatActionLog = `[빗나감] ${targetMonsterData.name}에 대한 공격이 빗나갔습니다.`;
        }

        let receivedDamage = 0, castLog = null, isSpellCast = false;
        const isMonsterStunned = state.combatState?.isMonsterStunned && state.combatState.isMonsterStunned > now;
        if (!isMonsterStunned && targetMonsterData.atk > 0) {
            const isMonsterHit = Math.random() < Math.min(0.95, Math.max(0.15, 0.8 + ((targetMonsterData.level || 1) + 20 - stats.evasion) / 100));
            if (isMonsterHit) {
                isSpellCast = targetMonsterData.isMagic && Math.random() < 0.5;
                if (isSpellCast) {
                    soundManager.playSound('magic_spill');
                    const mrReduction = (stats.mrBonus || 0) + (10 + Math.floor((12 + Math.floor(state.level / 12) + (stats.wis || 0)) / 2) + 4);
                    receivedDamage = Math.max(1, Math.floor((targetMonsterData.magicAtk || targetMonsterData.atk) * Math.max(0.1, 1 - (mrReduction / 100))));
                    if (targetMonsterData.spellName) castLog = `[마법] ${targetMonsterData.name}이(가) ${targetMonsterData.spellName}을(를) 시전합니다!`;
                } else {
                    receivedDamage = Math.max(1, (targetMonsterData.atk || 10) - (10 - stats.ac));
                }
                receivedDamage = Math.max(1, Math.floor(receivedDamage * (1 + (Math.random() * 2 - 1) * CONFIG.DAMAGE_VARIANCE)));
                currentHp -= receivedDamage;
            }
        }

        let combatSystemLogs = [...state.logs];
        if (redPotionLog) combatSystemLogs.unshift(redPotionLog);
        if (bravePotionLog) combatSystemLogs.unshift(bravePotionLog);
        if (magicHelmLog) combatSystemLogs.unshift(magicHelmLog);
        if (hasteLog) combatSystemLogs.unshift(hasteLog);

        let combatLogs = [...(state.combatLogs || [])];
        if (combatActionLog) combatLogs.push({ type: 'miss', text: combatActionLog });
        if (castLog) combatLogs.push({ type: 'spell', text: castLog });

        let damageNumbers = [...(state.combatState?.damageNumbers || [])].filter(d => now - d.timestamp < 1000);
        if (playerDamage > 0) damageNumbers.push({ value: playerDamage, x: 50 + (Math.random() * 20 - 10), y: 40 + (Math.random() * 20 - 10), timestamp: now, isCrit: false });
        if (receivedDamage > 0) damageNumbers.push({ value: receivedDamage, x: 50, y: 80, timestamp: now, isPlayerDamage: true });

        if (currentHp <= 0) {
            soundManager.playSound('death');
            return _handleDeath(state, targetMonsterData, maxHp, combatSystemLogs, combatLogs);
        }

        let newMonsterHpPercent = monsterHpPercent - ((playerDamage / targetMonsterData.hp) * 100);
        if (newMonsterHpPercent <= 0) {
            soundManager.playSound('death');
            return { ...state, hp: Math.min(maxHp, currentHp), mp: Math.min(maxMp, currentMp), inventory: currentInventory, logs: combatSystemLogs, combatLogs, lastRegenTime: (now - lastRegenTime > CONFIG.REGEN_INTERVAL_MS) ? now : lastRegenTime, combatState: { ...state.combatState, isAttacking: false, monsterHpPercent: 0, targetMonsterId: targetMonsterData.id, damageNumbers, isDying: true, deathTimestamp: now, hasteEndTime, bravePotionEndTime, magicHelmStrEndTime: newMagicHelmEndTime } };
        }

        return { ...state, hp: Math.min(maxHp, currentHp), mp: Math.min(maxMp, currentMp), inventory: currentInventory, logs: combatSystemLogs, combatLogs: combatLogs.slice(-50), lastRegenTime: (now - lastRegenTime > CONFIG.REGEN_INTERVAL_MS) ? now : lastRegenTime, combatState: { ...state.combatState, isAttacking: true, targetMonsterId: targetMonsterData.id, monsterHpPercent: newMonsterHpPercent, damageNumbers, potionEffect: (hasteLog || bravePotionLog || isPotionUsed) ? { timestamp: now, type: hasteLog ? 'haste' : (bravePotionLog ? 'brave' : (isPotionUsed || 'potion')) } : state.combatState.potionEffect, impact: playerDamage > 0 ? { type: 'hit', timestamp: now } : null, playerImpact: isSpellCast ? { type: 'magic', element: targetMonsterData.spellType || 'neutral', timestamp: now } : null, hasteEndTime, bravePotionEndTime, magicHelmStrEndTime: newMagicHelmEndTime } };
    } catch (e) {
        console.error("Combat Error:", e);
        return state;
    }
};

function _handleRegenOnly(state, now, maxHp) {
    const lastRegenTime = state.lastRegenTime || 0;
    if (now - lastRegenTime > CONFIG.REGEN_INTERVAL_MS) {
        const stats = calculateStats(state);
        const regenAmount = CONFIG.REGEN_AMOUNT_BASE + (state.level * CONFIG.REGEN_AMOUNT_PER_LEVEL) + (stats.hpRegenBonus || 0);
        const mpRegenAmount = 5 + Math.max(0, (12 + Math.floor(state.level / 12) + (stats.wis || 0) - 12) * 1) + (stats.mpRegenBonus || 0);
        return { ...state, hp: Math.min(maxHp, state.hp + regenAmount), mp: Math.min(getMaxMp(state, stats), state.mp + mpRegenAmount), lastRegenTime: now };
    }
    return state;
}

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

function _handleDeath(state, monster, maxHp, systemLogs, combatLogs) {
    const penalty = Math.floor(getRequiredExp(state.level) * 0.05);
    const updatedLogs = [`[사망] 사망했습니다. (경험치 -${penalty})`, ...(systemLogs || [])].slice(0, 50);
    const updatedCombatLogs = [{ type: 'death', text: `[사망] ${monster.name}에게 패배했습니다.` }, ...(combatLogs || [])].slice(0, 30);
    
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
            playerDeathTimestamp: Date.now(), 
            deathPenaltyExp: penalty,
            targetMonsterId: null,
            monsterHpPercent: 100
        } 
    };
}

function _handleMonsterKill(state, monster, lastDamage, currentExp, currentAdena, currentInventory, systemLogs, combatLogs, damageNumbers, potionEffect, lastRegenTime, now, maxHp, impact, hasteEndTime, bravePotionEndTime, currentMp, magicHelmStrEndTime) {
    const rewardExp = monster.exp * CONFIG.EXP_MULTIPLIER;
    const mapId = state.currentMapId;
    let dropChance = 0.01, diffWeight = 1.0, dropTable = [];

    if (mapId === 'talking_island') { dropChance = 0.008; diffWeight = 0.5; dropTable = [{ id: 'potion_red', weight: 80, countMin: 1, countMax: 5 }, { id: 'scroll_zel', weight: 15, countMin: 1, countMax: 1 }]; }
    else if (mapId === 'dungeon') { dropChance = 0.012; diffWeight = 0.8; dropTable = [{ id: 'potion_red', weight: 50, countMin: 2, countMax: 8 }, { id: 'scroll_zel', weight: 20, countMin: 1, countMax: 1 }, { id: 'scroll_dai', weight: 10, countMin: 1, countMax: 1 }]; }
    else if (mapId === 'orc_forest') { dropChance = 0.015; diffWeight = 1.0; dropTable = [{ id: 'potion_red', weight: 40, countMin: 5, countMax: 15 }, { id: 'scroll_zel', weight: 15, countMin: 1, countMax: 1 }]; }
    else if (mapId === 'dragon_valley') { dropChance = 0.025; diffWeight = 1.8; dropTable = [{ id: 'potion_clear', weight: 60, countMin: 5, countMax: 15 }, { id: 'scroll_zel', weight: 35, countMin: 1, countMax: 2 }, { id: 'longbow', weight: 5, countMin: 1, countMax: 1 }]; }
    else if (mapId === 'water_dungeon') { dropChance = 0.03; diffWeight = 4.5; dropTable = [{ id: 'potion_clear', weight: 60, countMin: 10, countMax: 25 }, { id: 'scroll_zel', weight: 30, countMin: 1, countMax: 2 }]; }
    
    if (monster.id === 'kurz') { dropChance = 1.0; dropTable = [{ id: 'helm_kurz', weight: 10, countMin: 1, countMax: 1 }, { id: 'armor_kurz', weight: 10, countMin: 1, countMax: 1 }]; }

    const rewardAdena = Math.floor(((monster.level * 120) + (Math.random() * 60)) * diffWeight * 0.175 * 1.5 * 1.5);
    const finalChance = (monster.id === 'kurz' || monster.id === 'baphomet') ? 1.0 : Math.min(0.95, dropChance * diffWeight * 1.3);

    if (Math.random() < finalChance && dropTable.length > 0) {
        const totalW = dropTable.reduce((s, i) => s + i.weight, 0);
        let rw = Math.random() * totalW;
        let sel = null;
        for (const d of dropTable) { rw -= d.weight; if (rw <= 0) { sel = d; break; } }
        if (sel) {
            const item = ITEMS.find(i => i.id === sel.id);
            if (item) {
                const count = Math.floor(Math.random() * (sel.countMax - sel.countMin + 1)) + sel.countMin;
                if (item.type === 'scroll' || item.type === 'potion') {
                    const idx = currentInventory.findIndex(i => i.id === item.id);
                    if (idx >= 0) currentInventory[idx].count += count;
                    else currentInventory.push({ ...item, uid: now + Math.random(), count, enchant: 0 });
                } else currentInventory.push({ ...item, uid: now + Math.random(), count: 1, enchant: 0, isEquipped: false });
            }
        }
    }

    combatLogs.push({ type: 'kill', text: `[전투] ${monster.name} 처치 (+${rewardExp} Exp, +${rewardAdena} A)` });
    let newExp = currentExp + rewardExp, newLevel = state.level, newMaxExp = getRequiredExp(newLevel), newHp = state.hp, levelUpEffect = null;
    let announces = state.pendingAnnouncements ? [...state.pendingAnnouncements] : [];

    while (newExp >= newMaxExp && newLevel < 80) {
        newLevel++; newExp -= newMaxExp; newMaxExp = getRequiredExp(newLevel);
        const curStats = calculateStats(state);
        newHp = getMaxHp({ ...state, level: newLevel }, curStats);
        currentMp = getMaxMp({ ...state, level: newLevel }, curStats);
        systemLogs.unshift(`[축하] 레벨 ${newLevel} 달성!`);
        levelUpEffect = { timestamp: now };
        announces.push({ type: 'levelup', text: `[속보] __USER__님이 레벨 ${newLevel} 달성!` });
    }

    const finalLogs = (systemLogs || []).slice(0, 50);
    const finalCombatLogs = (combatLogs || []).slice(0, 30);

    return { ...state, level: newLevel, currentExp: Math.floor(newExp), maxExp: newMaxExp, hp: newHp, mp: Math.floor(currentMp), adena: currentAdena + rewardAdena, inventory: currentInventory, logs: finalLogs, combatLogs: finalCombatLogs, pendingAnnouncements: announces, combatState: { ...state.combatState, monsterHpPercent: 100, targetMonsterId: null, respawnTimestamp: now + 300, isAttacking: false, impact, levelUpEffect: levelUpEffect || state.combatState?.levelUpEffect, isDying: false, kurzRespawnTime: (monster.id === 'kurz' ? now + 600000 : state.combatState?.kurzRespawnTime), baphometRespawnTime: (monster.id === 'baphomet' ? now + 600000 : state.combatState?.baphometRespawnTime), hasteEndTime, bravePotionEndTime, magicHelmStrEndTime } };
}
