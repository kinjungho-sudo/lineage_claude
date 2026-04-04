import { MONSTERS } from '../data/monsters';
import { ITEMS } from '../data/items';
import { soundManager } from '../utils/SoundManager'; // Import SoundManager

// --- Constants (상수 정의) ---
const CONFIG = {
    // Regen
    REGEN_INTERVAL_MS: 3000,
    REGEN_AMOUNT_BASE: 20,
    REGEN_AMOUNT_PER_LEVEL: 2,

    // Potion
    POTION_HEAL_CLEAR_HIGH: 500, // 맑은 물약 (최상급)
    POTION_HEAL_CLEAR: 250,      // 주홍 물약
    POTION_HEAL_RED: 60,         // 빨간 물약
    POTION_THRESHOLD_CLEAR: 0.6, // Drink Orange if < 60%
    POTION_THRESHOLD_RED: 0.6,   // Drink Red if < 60% (Spam up to 3)
    POTION_EFFECT_DURATION: 500, // 0.5초

    // Combat
    COMBAT_HIT_CHANCE_BASE: 0.85,
    COMBAT_CRIT_CHANCE_BASE: 0.05,
    COMBAT_CRIT_MULTIPLIER: 1.25, // 유저 피드백: 치명타 데미지를 20~30% 수준으로 조정 (기존 1.5 → 1.25)

    // 몬스터 치명타 설정 (전투 다양성 개선)
    MONSTER_CRIT_CHANCE: 0.10,      // 10% 확률로 몬스터 치명타 발동
    MONSTER_CRIT_MULTIPLIER: 1.25,   // 몬스터 치명타 시 1.2~1.3배 (중앙값 1.25)

    // 데미지 분산 (전투 단조로움 해소)
    DAMAGE_VARIANCE: 0.10, // ±10% 데미지 분산
    MONSTER_RESPAWN_DELAY_MS: 100, // 0.1초 (광속 리스폰 - Phase 57)
    MONSTER_ROTATE_INTERVAL_MS: 15000,

    // Reward
    DROP_RATE_BASE: 0.0016, // 유저 피드백: 기존 0.8%에서 다시 1/5 수준(0.16%)으로 더욱 대폭 하향 (Phase 83 수정)
    EXP_MULTIPLIER: 8,   // 유저 피드백: 기존 80에서 1/10 수준(8)으로 대폭 하향
}

/**
 * [New] 최대 HP 계산 중앙 함수
 */
export const getMaxHp = (state, stats) => {
    const naturalCon = Math.floor(state.level / 15);
    return 50 + (state.level * (10 + (stats.con || 0) + (state.allocatedCon || 0) + naturalCon)) + (stats.maxHpBonus || 0);
};

/**
 * [New] 최대 MP 계산 중앙 함수
 */
export const getMaxMp = (state, stats) => {
    return 30 + (state.level * 5) + (stats.maxMpBonus || 0);
};

/**
 * [Fix] 현재 레벨에 필요한 요구 경험치를 반환하는 결정론적(Deterministic) 함수
 * @param {number} level - 플레이어의 현재 레벨
 * @returns {number} 다음 레벨업에 필요한 누적 경험치량
 */
export const getRequiredExp = (level) => {
    // [밸런스 패치] 1.8배수 순수 지수함수는 가파르게 오버플로우되므로,
    // (1.2배수 곡선) + (레벨 제곱 * 200) 결합식으로 초반 폭랩 방지와 중후반 안정적인 요구량 스케일링 확립 (80레벨 기준 약 1.8억 경험치)
    return Math.floor(100 * Math.pow(1.2, level - 1)) + (level * level * 200);
};

export const calculateStats = (state) => {
    let smallAtk = 1;
    let largeAtk = 1;
    let totalAc = 10; // 기본 AC (Base AC)
    let setPieces = 0;

    const equipment = state?.equipment || {};

    Object.values(equipment).forEach(item => {
        if (!item) return;

        // AC Calculation
        if (item.type === 'armor' || item.slot === 'shield' || item.slot === 'helm' || item.slot === 'gloves' || item.slot === 'boots' || item.slot === 'shirt' || item.slot === 'cloak' || item.slot === 'necklace' || item.slot === 'ring' || item.slot === 'belt') {
            if (item.stats?.ac !== undefined) totalAc -= item.stats.ac;
            if (item.enchant) totalAc -= item.enchant;
            if (item.stats?.set === 'steel') setPieces++;
        }

        // Weapon Calculation
        if (item.type === 'weapon') {
            if (item.stats?.small !== undefined) smallAtk += item.stats.small;
            if (item.stats?.large !== undefined) largeAtk += item.stats.large;
            if (item.enchant) {
                smallAtk += item.enchant;
                largeAtk += item.enchant;
            }
        }
    });

    // Set Effect: Steel Set (5 pieces -> -3 AC)
    if (setPieces === 5) totalAc -= 3;

    // Set Effect: Kurz Set (4 pieces -> -4 AC)
    let kurzSetPieces = 0;
    Object.values(equipment).forEach(item => {
        if (item && item.stats?.set === 'kurz') kurzSetPieces++;
    });
    if (kurzSetPieces >= 4) totalAc -= 4;

    let totalStr = 0;
    let totalCon = 0;
    let totalDex = 0;
    let totalInt = 0;
    let totalWis = 0;
    let weaponEnchant = 0; // Track Weapon Enchant
    let maxHpBonus = 0; // Track Max HP Bonus (Belts etc)
    let hpRegenBonus = 0; // Track HP Regen Bonus (Kurz Set etc)
    let totalMrBonus = 0; // [New] MR Bonus from items
    let hasUnderwaterGrace = false; // [New] 수중 던전 입장 가드용 플래그

    // Calculate All Stats from equipment
    Object.values(equipment).forEach(item => {
        if (!item) return;
        if (item.stats?.str) totalStr += item.stats.str;
        if (item.stats?.con) totalCon += item.stats.con;
        if (item.stats?.dex) totalDex += item.stats.dex;
        if (item.stats?.int) totalInt += item.stats.int;
        if (item.stats?.wis) totalWis += item.stats.wis;
        if (item.stats?.hp) maxHpBonus += item.stats.hp;
        if (item.stats?.hpRegen) hpRegenBonus += item.stats.hpRegen;
        if (item.stats?.mr) totalMrBonus += item.stats.mr; // [New] MR 합산
        if (item.stats?.underwater) hasUnderwaterGrace = true; // [New] 수중 부츠 착용 확인
        if (item.type === 'weapon') weaponEnchant = item.enchant || 0;
    });

    // [밸런스 패치] 마법 투구 (힘) 버프 반영 - 힘 수치 자체의 영향력은 공식에서 조절됨
    let magicHelmStrBonus = 0;
    if (state?.combatState?.magicHelmStrEndTime && Date.now() < state.combatState.magicHelmStrEndTime) {
        magicHelmStrBonus = 2; // 기존 3에서 2으로 소폭 하향
    }

    return {
        smallAtk,
        largeAtk,
        atk: smallAtk, // [구버전 호환용] 작은 몹 데미지를 기본 Atk로 반환
        ac: totalAc,
        str: totalStr + magicHelmStrBonus, // 버프 합산
        con: totalCon,
        dex: totalDex,
        int: totalInt,
        wis: totalWis,
        weaponEnchant: weaponEnchant,
        maxHpBonus,
        hpRegenBonus,
        mrBonus: totalMrBonus, // [New] MR 보너스 반환
        underwater: hasUnderwaterGrace // [New] 수중 부츠 착용 여부 반환
    };
};

/**
 * 자동 사냥 틱(Tick)을 처리합니다.
 */
export const processAutoHuntTick = (state) => {
    try {
        const now = Date.now();

        // [가드] 플레이어 사망 상태에서는 모든 전투/리젠 로직 중단
        if (state.combatState?.isPlayerDead) {
            return state;
        }

        // --- 자동 버프 관리 (초록 물약, 용기 물약) ---
        let hasteEndTime = state.combatState?.hasteEndTime || 0;
        let bravePotionEndTime = state.combatState?.bravePotionEndTime || 0;
        let hasteLog = null;
        let bravePotionLog = null;

        // 초록 물약 자동 사용 (만료되었고 AutoOff가 아닐 때)
        if (now >= hasteEndTime && !state.combatState?.hasteAutoOff) {
            const potionIdx = state.inventory.findIndex(i => i.id === 'potion_green');
            if (potionIdx >= 0) {
                hasteEndTime = now + 300000;
                _consumeItem(state.inventory, potionIdx);
                hasteLog = `[자동] 초록 물약을 사용했습니다. (공속 향상)`;
            }
        }

        // 용기의 물약 자동 사용
        if (now >= bravePotionEndTime && !state.combatState?.braveAutoOff) {
            const potionIdx = state.inventory.findIndex(i => i.id === 'potion_brave');
            if (potionIdx >= 0) {
                bravePotionEndTime = now + 300000;
                _consumeItem(state.inventory, potionIdx);
                bravePotionLog = `[자동] 용기의 물약을 사용했습니다. (공속 추가 향상)`;
            }
        }
        // [New] 마법 투구 (힘) 자동 사용 (Phase 3)
        const magicHelm = state.inventory.find(i => i.id === 'helm_magic_str' && i.isEquipped);
        const initialMagicHelmEndTime = state.combatState?.magicHelmStrEndTime || 0;
        const isMagicHelmBuffActive = now < (initialMagicHelmEndTime - 5000); // 5초 여유

        let newMagicHelmEndTime = initialMagicHelmEndTime;
        let magicHelmLog = null;
        let isPotionUsed = false; // 이펙트 표시용
        if (magicHelm && !isMagicHelmBuffActive && state.mp >= 100) {
            state.mp -= 100;
            newMagicHelmEndTime = Math.max(now, initialMagicHelmEndTime) + 60000;
            magicHelmLog = `[자동] ${magicHelm.name}을(를) 사용하여 힘이 증폭됩니다.`;
            isPotionUsed = 'magic_helm'; // 이펙트 표시용
        }

        // 스탯 계산 (getMaxHp 등에서 사용하기 위해 위치 조정)
        const stats = calculateStats(state);

        const maxHp = getMaxHp(state, stats);
        const maxMp = getMaxMp(state, stats);
        let { hp: currentHp, mp: currentMp, currentExp, adena: currentAdena, inventory: currentInventory } = state;

        // --- 자동 버프 관리 (초록 물약, 용기 물약) ---
        // (이미 위에서 처리됨 - 중복 제거)

        // 타겟 몬스터 정보 (Target Resolution) - 전투 중 교체 버그 수정
        const currentMapId = state.currentMapId || 'village';

        // [New] 수중 던전 입장 가드 (Phase 3)
        if (currentMapId === 'water_dungeon' && !stats.underwater) {
            let systemLogs = [...(state.logs || [])];
            systemLogs.unshift(`[경고] 수중 부츠를 벗었습니다! 마을로 급히 귀환합니다.`);
            return {
                ...state,
                currentMapId: 'village',
                logs: systemLogs,
                combatState: { ...state.combatState, isAttacking: false, targetMonsterId: null }
            };
        }

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
                    hasteEndTime,
                    bravePotionEndTime,
                    magicHelmStrEndTime: newMagicHelmEndTime,
                    potionEffect: (hasteLog || bravePotionLog || magicHelmLog) ? { 
                        timestamp: now, 
                        type: hasteLog ? 'haste' : (bravePotionLog ? 'brave' : 'magic_helm') 
                    } : state.combatState?.potionEffect
                }
            };
        }

        const currentTargetId = state.combatState?.targetMonsterId;
        let targetMonsterData;

        // 공격 중이거나 타겟이 있는 경우 (맵 일치 여부 확인)
        if (currentTargetId) {
            targetMonsterData = MONSTERS.find(m => (m.id === currentTargetId || m.img === currentTargetId) && m.map === currentMapId);
        }

        // 타겟이 없거나 맵이 바뀌어 타겟을 잃은 경우 새로운 타겟 설정
        if (!targetMonsterData) {
            targetMonsterData = _getTargetMonster(currentMapId, now);
        }

        // 1. HP/MP 회복 (Regen) 및 스탯 계산 (Buff 반영을 위해 위치 이동)
        // (이미 위에서 처리됨 - 중복 제거)
        
        // --- 커츠 사냥터 리스폰 체크 ---
        let kurzRespawnTime = state.combatState?.kurzRespawnTime || 0;
        if (currentMapId === 'hell') {
            if (now < kurzRespawnTime) {
                let systemLogs = [...(state.logs || [])];
                const remaining = kurzRespawnTime - now;
                const rm = Math.floor(remaining / 60000);
                const rs = Math.floor((remaining % 60000) / 1000);
                systemLogs.unshift(`[알림] 커츠의 방: 커츠 부활까지 ${rm}분 ${rs}초 남았습니다. 마을로 귀환합니다.`);
                return {
                    ...state,
                    currentMapId: 'village',
                    logs: systemLogs,
                    combatState: { ...state.combatState, isAttacking: false, targetMonsterId: null }
                };
            }
        }

        // 1. HP/MP 회복 (Regen)
        const lastRegenTime = state.lastRegenTime || 0;
        if (now - lastRegenTime > CONFIG.REGEN_INTERVAL_MS) {
            const regenAmount = CONFIG.REGEN_AMOUNT_BASE + (state.level * CONFIG.REGEN_AMOUNT_PER_LEVEL) + (stats.hpRegenBonus || 0);
            currentHp = Math.min(maxHp, currentHp + regenAmount);
            const totalWis = 12 + Math.floor(state.level / 12) + (stats.wis || 0);
            const mpRegenAmount = 5 + Math.max(0, (totalWis - 12) * 1) + (stats.mpRegenBonus || 0);
            currentMp = Math.min(maxMp, currentMp + mpRegenAmount);
        }

        // 2. 리스폰/사망 대기
        if (now < (state.combatState?.respawnTimestamp || 0)) {
            return {
                ...state,
                hp: Math.min(maxHp, currentHp),
                mp: Math.min(maxMp, currentMp),
                lastRegenTime: (now - lastRegenTime > CONFIG.REGEN_INTERVAL_MS) ? now : lastRegenTime
            };
        }

        let monsterHpPercent = state.combatState?.monsterHpPercent !== undefined ? state.combatState.monsterHpPercent : 100;

        // Death Animation State
        if (state.combatState?.isDying) {
            if (now - state.combatState.deathTimestamp > 500) {
                return _handleMonsterKill(
                    state, targetMonsterData, 0, currentExp, currentAdena, currentInventory,
                    state.logs, state.combatLogs || [], [], null, lastRegenTime, now, maxHp, null,
                    hasteEndTime, bravePotionEndTime, currentMp, newMagicHelmEndTime
                );
            }
            return state;
        }

        if (monsterHpPercent <= 0) {
            if (!state.combatState?.isDying) {
                return {
                    ...state,
                    combatState: { ...state.combatState, monsterHpPercent: 100, targetMonsterId: null, isDying: false }
                };
            }
            monsterHpPercent = 100;
        }

        // 3. 물약 사용
        let potionLog = null;
        const hpPercent = currentHp / maxHp;
        const clearHighPotionIdx = currentInventory.findIndex(i => i.id === 'potion_clear_high');
        const clearPotionIdx = currentInventory.findIndex(i => i.id === 'potion_clear');

        if (hpPercent < CONFIG.POTION_THRESHOLD_CLEAR && clearHighPotionIdx >= 0) {
            currentHp = Math.min(maxHp, currentHp + CONFIG.POTION_HEAL_CLEAR_HIGH);
            _consumeItem(currentInventory, clearHighPotionIdx);
            potionLog = `맑은 물약을 사용했습니다. (HP +${CONFIG.POTION_HEAL_CLEAR_HIGH})`;
            isPotionUsed = 'clearHigh';
        } else if (hpPercent < CONFIG.POTION_THRESHOLD_CLEAR && clearPotionIdx >= 0) {
            currentHp = Math.min(maxHp, currentHp + CONFIG.POTION_HEAL_CLEAR);
            _consumeItem(currentInventory, clearPotionIdx);
            potionLog = `주홍 물약을 사용했습니다. (HP +${CONFIG.POTION_HEAL_CLEAR})`;
            isPotionUsed = 'clear';
        }

        let redSpamCount = 0;
        while (currentHp / maxHp < CONFIG.POTION_THRESHOLD_RED && redSpamCount < 3) {
            const redPotionIdxNew = currentInventory.findIndex(i => i.id === 'potion_red');
            if (redPotionIdxNew >= 0) {
                currentHp = Math.min(maxHp, currentHp + CONFIG.POTION_HEAL_RED);
                _consumeItem(currentInventory, redPotionIdxNew);
                potionLog = `빨간 물약을 사용했습니다. (HP +${CONFIG.POTION_HEAL_RED}${redSpamCount > 0 ? ` x${redSpamCount + 1}` : ''})`;
                isPotionUsed = 'red';
                redSpamCount++;
            } else { break; }
        }

        // 4. 전투 로직 (공식 전면 개편)
        soundManager.playSound('attack');
        const isHit = true;
        const isCrit = Math.random() < (CONFIG.COMBAT_CRIT_CHANCE_BASE + (state.level * 0.005));

        const baseStr = 16 + Math.floor(state.level / 15);
        const totalActualStr = baseStr + (stats.str || 0) + (state.allocatedStr || 0);

        // [New Damage Formula] 타겟 크기에 따른 공격력 선택
        const currentWeaponAtk = targetMonsterData.isLarge ? stats.largeAtk : stats.smallAtk;
        
        let weaponBaseDamage = currentWeaponAtk * (1.5 + (state.level / 10)); // 무기 효율 증대
        if (isCrit) weaponBaseDamage *= CONFIG.COMBAT_CRIT_MULTIPLIER;

        // 힘(STR) 영향력 대폭 축소 (무기 데미지의 약 10~20% 수준만 보조)
        const strBonusDamage = Math.floor(totalActualStr * 0.6); 

        let playerDamage = Math.floor(weaponBaseDamage + strBonusDamage);

        // 강화 수치에 따른 배율 (7강부터 추가 가중치)
        if (stats.weaponEnchant >= 7) {
            playerDamage = Math.floor(playerDamage * (1 + ((stats.weaponEnchant - 6) * 0.25)));
        }

        // [중요] 몬스터 방어력(AC) 적용 - 방어력을 100% 반영하여 무기 없이는 데미지가 거의 안 나오게 함
        const monsterAcValue = (targetMonsterData.ac || Math.floor(targetMonsterData.level / 2)); 
        playerDamage -= monsterAcValue; // 기존에는 절반만 뺐으나 이제 100% 차감
        
        playerDamage = Math.max(1, Math.floor(playerDamage * (1 + (Math.random() * 2 - 1) * CONFIG.DAMAGE_VARIANCE)));

        soundManager.playSound('hit');

        let monsterFinalAtk = (targetMonsterData.atk || 10);
        if (targetMonsterData.isMagic) soundManager.playSound('magic_spill');

        if (Math.random() < CONFIG.MONSTER_CRIT_CHANCE) {
            monsterFinalAtk *= 1.1;
        }
        monsterFinalAtk *= (1 + (Math.random() * 2 - 1) * CONFIG.DAMAGE_VARIANCE);
        
        let receivedDamage = 0;
        if (targetMonsterData.isMagic) {
            const mrReduction = (stats.mrBonus || 0) + (10 + Math.floor((12 + Math.floor(state.level / 12) + (stats.wis || 0)) / 2) + 4);
            const mrDmgMultiplier = Math.max(0.1, 1 - (mrReduction / 100));
            receivedDamage = Math.floor(Math.max(1, (monsterFinalAtk - ((10 - stats.ac) + 5) * 0.2) * mrDmgMultiplier));
        } else {
            receivedDamage = Math.floor(Math.max(0, monsterFinalAtk - ((10 - stats.ac) + 5)));
            if (receivedDamage <= 0) receivedDamage = Math.random() < 0.2 ? 1 : 0;
        }

        currentHp -= receivedDamage;

        let combatSystemLogs = [...state.logs];
        if (bravePotionLog) combatSystemLogs.unshift(bravePotionLog);
        if (magicHelmLog) combatSystemLogs.unshift(magicHelmLog);
        if (potionLog) combatSystemLogs.unshift(potionLog);

        let combatLogs = [...(state.combatLogs || [])];
        let damageNumbers = [...(state.combatState?.damageNumbers || [])].filter(d => now - d.timestamp < 1000);

        if (playerDamage > 0) {
            damageNumbers.push({ value: playerDamage, x: 50 + (Math.random() * 20 - 10), y: 40 + (Math.random() * 20 - 10), timestamp: now, isCrit });
        }
        if (receivedDamage > 0) {
            damageNumbers.push({ value: receivedDamage, x: 50, y: 80, timestamp: now, isPlayerDamage: true, isCrit: (monsterFinalAtk > targetMonsterData.atk * 1.1) });
        }

        if (currentHp <= 0) {
            soundManager.playSound('death');
            return _handleDeath(state, targetMonsterData, maxHp, combatSystemLogs, combatLogs);
        }

        const monsterMaxHp = targetMonsterData.hp;
        let newMonsterHpPercent = monsterHpPercent - ((playerDamage / monsterMaxHp) * 100);

        if (newMonsterHpPercent <= 0) {
            soundManager.playSound('death');
            return {
                ...state,
                hp: Math.min(maxHp, currentHp),
                mp: Math.min(maxMp, currentMp),
                currentExp: currentExp, // 경험치 명시적 유지
                adena: currentAdena,   // 아데나 명시적 유지
                inventory: currentInventory,
                logs: combatSystemLogs,
                combatLogs,
                lastRegenTime: (now - lastRegenTime > CONFIG.REGEN_INTERVAL_MS) ? now : lastRegenTime,
                combatState: {
                    ...state.combatState,
                    isAttacking: false,
                    monsterHpPercent: 0,
                    targetMonsterId: targetMonsterData.id,
                    damageNumbers,
                    isDying: true,
                    deathTimestamp: now,
                    hasteEndTime,
                    bravePotionEndTime,
                    magicHelmStrEndTime: newMagicHelmEndTime,
                }
            };
        }

        return {
            ...state,
            hp: Math.min(maxHp, currentHp),
            mp: Math.min(maxMp, currentMp),
            inventory: currentInventory,
            logs: combatSystemLogs,
            combatLogs: combatLogs.slice(-50),
            lastRegenTime: (now - lastRegenTime > CONFIG.REGEN_INTERVAL_MS) ? now : lastRegenTime,
            combatState: {
                ...state.combatState,
                isAttacking: true,
                targetMonsterId: targetMonsterData.id,
                monsterHpPercent: newMonsterHpPercent,
                damageNumbers,
                potionEffect: (hasteLog || bravePotionLog || isPotionUsed) ? { 
                    timestamp: now, 
                    type: hasteLog ? 'haste' : (bravePotionLog ? 'brave' : isPotionUsed) 
                } : state.combatState.potionEffect,
                impact: playerDamage > 0 ? { type: 'hit', timestamp: now } : null,
                hasteEndTime,
                bravePotionEndTime,
                magicHelmStrEndTime: newMagicHelmEndTime
            }
        };
    } catch (e) {
        console.error("Combat Error:", e);
        return state;
    }
};

// --- Helper Functions ---

function _handleRegenOnly(state, now, maxHp) {
    const lastRegenTime = state.lastRegenTime || 0;
    if (now - lastRegenTime > CONFIG.REGEN_INTERVAL_MS) {
        const stats = calculateStats(state);
        const regenAmount = CONFIG.REGEN_AMOUNT_BASE + (state.level * CONFIG.REGEN_AMOUNT_PER_LEVEL) + (stats.hpRegenBonus || 0);
        const newHp = Math.min(maxHp, state.hp + regenAmount);
        
        const totalWis = 12 + Math.floor(state.level / 12) + (stats.wis || 0);
        const mpRegenAmount = 5 + Math.max(0, (totalWis - 12) * 1) + (stats.mpRegenBonus || 0);
        const maxMp = getMaxMp(state, stats);
        const newMp = Math.min(maxMp, state.mp + mpRegenAmount);

        return { ...state, hp: newHp, mp: newMp, lastRegenTime: now };
    }
    return state;
}

function _getTargetMonster(currentMapId, now) {
    const monsters = MONSTERS.filter(m => m.map === currentMapId);
    if (monsters.length === 0) return MONSTERS[0];
    return monsters[Math.floor(now / CONFIG.MONSTER_ROTATE_INTERVAL_MS) % monsters.length];
}

function _consumeItem(inventory, index) {
    if (inventory[index].count > 1) {
        inventory[index].count--;
    } else {
        inventory.splice(index, 1);
    }
}

function _handleDeath(state, monster, maxHp, systemLogs, combatLogs) {
    const currentMaxExp = getRequiredExp(state.level);
    const penaltyExp = Math.floor(currentMaxExp * 0.05);
    const newExp = Math.max(0, state.currentExp - penaltyExp);

    systemLogs.unshift(`[사망] 사냥 중 사망했습니다. (경험치 -${penaltyExp})`);
    combatLogs.push({ type: 'death', text: `[사망] ${monster.name}에게 패배했습니다.` });

    return {
        ...state,
        hp: 0,
        currentExp: newExp,
        logs: systemLogs,
        combatLogs,
        combatState: {
            ...state.combatState,
            isAttacking: false,
            isPlayerDead: true,
            playerDeathTimestamp: Date.now(),
            deathPenaltyExp: penaltyExp,
        }
    };
}

function _handleMonsterKill(state, monster, lastDamage, currentExp, currentAdena, currentInventory, systemLogs, combatLogs, damageNumbers, potionEffect, lastRegenTime, now, maxHp, impact, hasteEndTime, bravePotionEndTime, currentMp, magicHelmStrEndTime) {
    const rewardExp = monster.exp * CONFIG.EXP_MULTIPLIER;
    const mapId = state.currentMapId;
    let monsterDropChance = 0.01;
    let diffWeight = 1.0;
    let dropTable = [];

    // [드랍 테이블 재배치] 아이템 등급과 판매가를 고려한 밸런스 패치
    if (mapId === 'talking_island') { 
        monsterDropChance = 0.008; diffWeight = 0.5; 
        dropTable = [
            { id: 'potion_red', weight: 80, countMin: 1, countMax: 5 }, 
            { id: 'scroll_zel', weight: 15, countMin: 1, countMax: 1 }, 
            { id: 'helm_steel', weight: 5, countMin: 1, countMax: 1 }
        ]; 
    }
    else if (mapId === 'dungeon') { 
        monsterDropChance = 0.012; diffWeight = 0.8; 
        dropTable = [
            { id: 'potion_red', weight: 50, countMin: 2, countMax: 8 }, 
            { id: 'scroll_zel', weight: 20, countMin: 1, countMax: 1 }, 
            { id: 'scroll_dai', weight: 10, countMin: 1, countMax: 1 }, 
            { id: 'cloak_protection', weight: 15, countMin: 1, countMax: 1 },
            { id: 'armor_steel', weight: 5, countMin: 1, countMax: 1 }
        ]; 
    }
    else if (mapId === 'orc_forest') { 
        monsterDropChance = 0.015; diffWeight = 1.0; 
        dropTable = [
            { id: 'potion_red', weight: 40, countMin: 5, countMax: 15 }, 
            { id: 'potion_clear', weight: 30, countMin: 1, countMax: 5 }, 
            { id: 'scroll_zel', weight: 15, countMin: 1, countMax: 1 }, 
            { id: 'scroll_dai', weight: 8, countMin: 1, countMax: 1 }, 
            { id: 'necklace_orc_fighter', weight: 5, countMin: 1, countMax: 1 },
            { id: 'sword_katana', weight: 2, countMin: 1, countMax: 1 }
        ]; 
    }
    else if (mapId === 'desert') { 
        monsterDropChance = 0.02; diffWeight = 1.3; 
        dropTable = [
            { id: 'potion_clear', weight: 50, countMin: 3, countMax: 8 }, 
            { id: 'scroll_zel', weight: 20, countMin: 1, countMax: 1 }, 
            { id: 'scroll_dai', weight: 10, countMin: 1, countMax: 1 }, 
            { id: 'boots_underwater', weight: 30, countMin: 1, countMax: 1 }, // 드랍 비중 대폭 상향 (10 -> 30)
            { id: 'shield_steel', weight: 7, countMin: 1, countMax: 1 },
            { id: 'scroll_zel_blessed', weight: 3, countMin: 1, countMax: 1 }
        ]; 
    }
    else if (mapId === 'dragon_valley') { 
        monsterDropChance = 0.025; diffWeight = 1.8; 
        dropTable = [
            { id: 'potion_clear', weight: 60, countMin: 5, countMax: 15 }, 
            { id: 'scroll_zel', weight: 40, countMin: 1, countMax: 2 }, // 젤 드랍 상향
            { id: 'scroll_dai', weight: 20, countMin: 1, countMax: 1 }, 
            { id: 'armor_steel', weight: 15, countMin: 1, countMax: 1 }, // 방어구 추가
            { id: 'shield_steel', weight: 15, countMin: 1, countMax: 1 },
            { id: 'gloves_power', weight: 4, countMin: 1, countMax: 1 }, // 희귀템 하향 (12 -> 4)
            { id: 'belt_ogre', weight: 3, countMin: 1, countMax: 1 }, // 희귀템 하향 (8 -> 3)
            { id: 'necklace_str', weight: 3, countMin: 1, countMax: 1 },
            { id: 'necklace_con', weight: 2, countMin: 1, countMax: 1 },
            { id: 'boots_underwater', weight: 15, countMin: 1, countMax: 1 }, 
            { id: 'sword_ssaulabi', weight: 0.5, countMin: 1, countMax: 1 } // 극악의 확률 (2 -> 0.5)
        ]; 
    }
    else if (mapId === 'water_dungeon') { 
        monsterDropChance = 0.03; diffWeight = 4.5; 
        dropTable = [
            { id: 'potion_clear', weight: 60, countMin: 10, countMax: 25 }, 
            { id: 'potion_clear_high', weight: 20, countMin: 1, countMax: 5 },
            { id: 'scroll_zel', weight: 30, countMin: 1, countMax: 2 }, 
            { id: 'scroll_dai', weight: 15, countMin: 1, countMax: 1 }, 
            { id: 'ring_crystal', weight: 3, countMin: 1, countMax: 1 }, // 장신구 하향 (8 -> 3)
            { id: 'necklace_crystal', weight: 3, countMin: 1, countMax: 1 },
            { id: 'ring_protection', weight: 1, countMin: 1, countMax: 1 }, // 최고급 장신구 극소량 (5 -> 1)
            { id: 'necklace_protection', weight: 1, countMin: 1, countMax: 1 },
            { id: 'shield_eva', weight: 1, countMin: 1, countMax: 1 }, 
            { id: 'helm_magic_str', weight: 4, countMin: 1, countMax: 1 }
        ]; 
    }
    else { 
        monsterDropChance = 0.01; diffWeight = 0.1; 
        dropTable = [{ id: 'potion_red', weight: 100, countMin: 1, countMax: 1 }]; 
    }

    if (mapId === 'hell' && monster.id === 'kurz') {
        monsterDropChance = 1.0; diffWeight = 1.0;
        // 보스 드랍률 상향 (커츠 셋 비중 5 -> 15, 2 -> 10)
        dropTable = [
            { id: 'helm_kurz', weight: 15, countMin: 1, countMax: 1 }, 
            { id: 'armor_kurz', weight: 10, countMin: 1, countMax: 1 }, 
            { id: 'scroll_zel_blessed', weight: 35, countMin: 1, countMax: 3 }, 
            { id: 'scroll_dai_blessed', weight: 20, countMin: 1, countMax: 2 }, 
            { id: 'potion_clear', weight: 20, countMin: 10, countMax: 30 }
        ];
    }

    // [유저 요청] 아데나 획득량 하향 조정 (-30%)
    const rewardAdena = Math.floor(((monster.level * 120) + (Math.random() * monster.level * 60)) * diffWeight * 0.35);
    const finalDropChance = Math.min(0.95, monsterDropChance * diffWeight);

    if (Math.random() < finalDropChance) {
        const totalWeight = dropTable.reduce((sum, item) => sum + item.weight, 0);
        let randomWeight = Math.random() * totalWeight;
        let selectedDrop = null;
        for (const drop of dropTable) {
            randomWeight -= drop.weight;
            if (randomWeight <= 0) { selectedDrop = drop; break; }
        }
        if (selectedDrop) {
            const itemData = ITEMS.find(i => i.id === selectedDrop.id);
            if (itemData) {
                const dropCount = Math.floor(Math.random() * (selectedDrop.countMax - selectedDrop.countMin + 1)) + selectedDrop.countMin;
                const isStackable = itemData.type === 'scroll' || itemData.type === 'potion';
                if (isStackable) {
                    const existingIdx = currentInventory.findIndex(i => i.id === itemData.id);
                    if (existingIdx >= 0) { currentInventory[existingIdx].count = (currentInventory[existingIdx].count || 1) + dropCount; }
                    else { currentInventory.push({ ...itemData, uid: now + Math.random(), count: dropCount, enchant: 0 }); }
                } else {
                    currentInventory.push({ ...itemData, uid: now + Math.random(), count: 1, enchant: 0, isEquipped: false });
                }
            }
        }
    }

    combatLogs.push({ type: 'kill', text: `[전투] ${monster.name} 처치 (+${rewardExp} Exp, +${rewardAdena} A)` });

    let newExp = currentExp + rewardExp;
    let newLevel = state.level;
    let newMaxExp = getRequiredExp(newLevel);
    let newHp = Math.max(0, state.hp);
    let levelUpEffect = null;
    
    while (newExp >= newMaxExp) {
        if (newLevel >= 80) { newExp = newMaxExp - 1; break; }
        newLevel++;
        newExp -= newMaxExp;
        newMaxExp = getRequiredExp(newLevel);
        const currentStats = calculateStats(state);
        newHp = getMaxHp({ ...state, level: newLevel }, currentStats);
        // Level up: Full HP/MP Restore
        currentMp = getMaxMp({ ...state, level: newLevel }, currentStats);
        systemLogs.unshift(`[축하] 레벨 ${newLevel} 달성!`);
        levelUpEffect = { timestamp: now };
    }
    
    // Kill Reward: Optional MP recovery? No, but let's cap it just in case.
    const finalStats = calculateStats(state);
    const finalMaxMp = getMaxMp({ ...state, level: newLevel }, finalStats);
    currentMp = Math.min(finalMaxMp, currentMp);

    return {
        ...state,
        level: newLevel, currentExp: Math.floor(newExp), maxExp: newMaxExp,
        hp: newHp, mp: Math.floor(currentMp), adena: currentAdena + rewardAdena,
        inventory: currentInventory, logs: systemLogs, combatLogs: combatLogs.slice(-50),
        combatState: {
            ...state.combatState,
            monsterHpPercent: 100, targetMonsterId: null, respawnTimestamp: now + 300,
            isAttacking: false, impact: impact, levelUpEffect: levelUpEffect || state.combatState?.levelUpEffect,
            isDying: false, kurzRespawnTime: (monster.id === 'kurz' ? now + 600000 : state.combatState?.kurzRespawnTime),
            hasteEndTime,
            bravePotionEndTime, 
            magicHelmStrEndTime
        }
    };
}
