import { enchantItem } from './EnchantLogic';
import { ENCHANT_RESULTS } from '../constants';
import { soundManager } from '../utils/SoundManager'; // Import SoundManager
import { calculateStats, getMaxHp } from './combat'; // [Fix] 물약 사용 시 최대 체력 연산에 필요한 모듈 추가

/**
 * 아이템 구매 로직
 * @param {Object} state 
 * @param {Array} itemsToBuy - [{ item, count }]
 */
export const handleBuyItems = (state, itemsToBuy) => {
    const totalPrice = itemsToBuy.reduce((sum, { item, count }) => sum + (item.price * count), 0);
    if (state.adena < totalPrice) return { ...state, logs: [`아데나가 부족합니다.`, ...state.logs] };

    let currentInventory = [...state.inventory];
    let purchaseLogParts = [];

    itemsToBuy.forEach(({ item, count }) => {
        const isStackable = item.type === 'scroll' || item.type === 'potion';
        if (isStackable) {
            const existingItemIndex = currentInventory.findIndex(i => i.id === item.id);
            if (existingItemIndex >= 0) {
                const existingItem = currentInventory[existingItemIndex];
                currentInventory[existingItemIndex] = { ...existingItem, count: (existingItem.count || 0) + count };
            } else {
                currentInventory.push({ ...item, uid: Date.now() + Math.random(), enchant: 0, count: count });
            }
        } else {
            for (let i = 0; i < count; i++) {
                currentInventory.push({ ...item, uid: Date.now() + Math.random() + i, enchant: 0, count: 1, isEquipped: false });
            }
        }
        purchaseLogParts.push(`${item.name} (${count})`);
    });

    return {
        ...state,
        adena: state.adena - totalPrice,
        inventory: currentInventory,
        logs: [`구매 완료: ${purchaseLogParts.join(', ')}`, ...state.logs]
    };
};

/**
 * 물약 사용 로직
 * @param {Object} state 
 * @param {number} potionUid 
 */
export const handleUsePotion = (state, potionUid) => {
    const potionIdx = state.inventory.findIndex(i => i.uid === potionUid);
    if (potionIdx === -1) return state;

    const potion = state.inventory[potionIdx];
    let newInventory = [...state.inventory];

    // [New] 버프 아이템 수동 복용 로직 (초록 물약, 용기 물약)
    if (potion.useData?.type === 'haste' || potion.useData?.type === 'brave' || potion.buffData?.type === 'brave') {
        const buffType = potion.useData?.type || potion.buffData?.type;
        const duration = potion.useData?.durationMs || potion.buffData?.durationMs || 300000;
        
        if (potion.count > 1) {
            newInventory[potionIdx] = { ...potion, count: potion.count - 1 };
        } else {
            newInventory.splice(potionIdx, 1);
        }
        
        const now = Date.now();
        const stateKey = buffType === 'haste' ? 'hasteEndTime' : 'bravePotionEndTime';
        const autoOffKey = buffType === 'haste' ? 'hasteAutoOff' : 'braveAutoOff';
        
        const currentEndTime = state.combatState?.[stateKey] || 0;
        const newEndTime = Math.max(now, currentEndTime) + duration;

        return {
            ...state,
            inventory: newInventory,
            combatState: {
                ...state.combatState,
                [stateKey]: newEndTime,
                [autoOffKey]: false, // 수동 사용 시 자동 소모 다시 활성화
                potionEffect: { timestamp: now, type: buffType }
            },
            logs: [`${potion.name}을 마셨습니다. (${buffType === 'haste' ? '공속 향상' : '공속 추가 향상'})`, ...state.logs]
        };
    }

    // [New] 마법 투구 (힘) 사용 로직
    if (potion.useData?.type === 'magic_helm_str') {
        if (state.mp < potion.useData.mpCost) {
            return { ...state, logs: [`[시스템] MP가 부족하여 ${potion.name}을(를) 사용할 수 없습니다. (필요 MP: ${potion.useData.mpCost})`, ...state.logs] };
        }

        const duration = potion.useData.durationMs;
        const now = Date.now();
        const currentEndTime = state.combatState?.magicHelmStrEndTime || 0;
        const newEndTime = Math.max(now, currentEndTime) + duration;

        return {
            ...state,
            mp: state.mp - potion.useData.mpCost,
            combatState: {
                ...state.combatState,
                magicHelmStrEndTime: newEndTime,
                potionEffect: { timestamp: now, type: 'magic_helm' }
            },
            logs: [`[아이템] ${potion.name} 사용! 1분간 힘(STR)이 3 증가합니다.`, ...state.logs]
        };
    }

    // 기본 체력 회복 물약
    const stats = calculateStats(state);
    const maxHp = getMaxHp(state, stats);
    const healAmount = potion.heal || 0;

    let newHp = Math.min(maxHp, state.hp + healAmount);

    if (potion.count > 1) {
        newInventory[potionIdx] = { ...potion, count: potion.count - 1 };
    } else {
        newInventory.splice(potionIdx, 1);
    }

    // [개선] 물약 타입 자동 구분 - 빨간/주홍/맑은 물약
    const potionType = potion.id === 'potion_clear_high' ? 'clearHigh' 
        : potion.id === 'potion_clear' ? 'clear' : 'red';

    return {
        ...state,
        hp: newHp,
        inventory: newInventory,
        combatState: {
            ...state.combatState,
            potionEffect: { timestamp: Date.now(), type: potionType }
        },
        logs: [`${potion.name}을 사용했습니다. (HP +${healAmount})`, ...state.logs]
    };
};

/**
 * 주문서 사용 (강화) 로직
 * @param {Object} state 
 * @param {number} scrollUid 
 * @param {number} targetUid 
 */
export const handleUseScroll = (state, scrollUid, targetUid) => {
    const scrollIndex = state.inventory.findIndex(i => i.uid === scrollUid);
    const targetIndex = state.inventory.findIndex(i => i.uid === targetUid);

    if (scrollIndex === -1 || targetIndex === -1) return state;

    const scroll = state.inventory[scrollIndex];
    const target = state.inventory[targetIndex];

    if (target.type === 'scroll' || target.type === 'potion') {
        return { ...state, logs: [`[시스템] 대상에게는 주문서를 사용할 수 없습니다.`, ...state.logs] };
    }

    const result = enchantItem(target, scroll.scrollType, scroll.isBlessed);
    if (result.result === 'invalid') {
        return { ...state, logs: [`[시스템] ${result.message}`, ...state.logs] };
    }

    // Sound Effects
    if (result.result === ENCHANT_RESULTS.SUCCESS) {
        soundManager.playSound('enchant_success');
    } else {
        soundManager.playSound('enchant_fail');
    }

    if (result.result === ENCHANT_RESULTS.SUCCESS) {
        soundManager.playSound('enchant_success');
    } else if (result.result === ENCHANT_RESULTS.DESTROYED) {
        soundManager.playSound('enchant_fail');
    } else {
        soundManager.playSound('enchant_fail'); // Failure but not destroyed
    }

    let updatedInventory = [...state.inventory];
    let updatedEquipment = { ...state.equipment };

    // 주문서 소모
    if (scrollIndex !== -1) {
        const scrollItem = { ...updatedInventory[scrollIndex] };
        if (scrollItem.count > 1) {
            scrollItem.count -= 1;
            updatedInventory[scrollIndex] = scrollItem;
        } else {
            updatedInventory = updatedInventory.filter(i => i.uid !== scrollUid);
        }
    }

    // 대상 아이템 업데이트 (인벤토리 재검색: 주문서가 삭제되어 인덱스가 밀렸을 수 있음 -> filter 썼으면 id로 찾아야함)
    // 위에서 filter를 썼으므로 updatedInventory는 바뀜.
    // 하지만 map/filter로 불변성 유지하는게 나음.

    // 다시 인덱스 찾기 (유니크 ID 사용)
    const targetIndexNew = updatedInventory.findIndex(i => i.uid === targetUid);
    if (targetIndexNew !== -1) {
        const targetItem = { ...updatedInventory[targetIndexNew] };

        if (result.result === ENCHANT_RESULTS.SUCCESS) {
            targetItem.enchant = result.newEnchant;
            updatedInventory[targetIndexNew] = targetItem;
            // 장착 중이라면 장비창도 업데이트
            if (targetItem.isEquipped && targetItem.slot) {
                updatedEquipment[targetItem.slot] = targetItem;
            }
        } else if (result.result === ENCHANT_RESULTS.DESTROYED) {
            updatedInventory = updatedInventory.filter(i => i.uid !== targetUid);
            // 장착 중이었다면 장비 해제
            if (targetItem.isEquipped && targetItem.slot) {
                updatedEquipment[targetItem.slot] = null;
            }
        }
    }

    return {
        ...state,
        inventory: updatedInventory,
        equipment: updatedEquipment,
        logs: [result.message, ...state.logs]
    };
};

/**
 * 아이템 장착 로직
 * 양손 무기/방패 자동 해제 처리 포함
 * @param {Object} state 
 * @param {Object} itemToEquip 
 */
export const handleEquipItem = (state, itemToEquip) => {
    if (!itemToEquip.slot) return state;

    const slot = itemToEquip.slot;
    let newEquipment = { ...state.equipment };
    let newInventory = [...state.inventory];
    let logs = [`${itemToEquip.name} 착용`, ...state.logs];

    // 양손 무기 및 방패 로직 (Two-Handed Logic)
    if (slot === 'shield') {
        const currentWeapon = newEquipment.weapon;
        if (currentWeapon && currentWeapon.twoHanded) {
            newInventory = newInventory.map(i => i.uid === currentWeapon.uid ? { ...i, isEquipped: false } : i);
            newEquipment.weapon = null;
            logs.unshift(`[시스템] 양손 무기와 방패는 동시에 착용할 수 없어 무기가 해제되었습니다.`);
        }
    }
    if (slot === 'weapon' && itemToEquip.twoHanded) {
        if (newEquipment.shield) {
            const currentShield = newEquipment.shield;
            newInventory = newInventory.map(i => i.uid === currentShield.uid ? { ...i, isEquipped: false } : i);
            newEquipment.shield = null;
            logs.unshift(`[시스템] 양손 무기 착용 시 방패가 해제됩니다.`);
        }
    }

    // 기존 장착 아이템 해제 (일반 슬롯)
    if (slot !== 'ring' && newEquipment[slot]) {
        const currentEquippedUid = newEquipment[slot].uid;
        newInventory = newInventory.map(i => i.uid === currentEquippedUid ? { ...i, isEquipped: false } : i);
        newEquipment[slot] = null;
    }

    // 새 아이템 장착
    if (slot === 'ring') {
        // 반지 슬롯 특수 처리: 왼쪽이 비어있으면 왼쪽, 아니면 오른쪽, 둘 다 차있으면 오른쪽 교체
        let targetSubSlot = 'ring_l';
        if (newEquipment.ring_l && !newEquipment.ring_r) {
            targetSubSlot = 'ring_r';
        } else if (newEquipment.ring_l && newEquipment.ring_r) {
            // 둘 다 차있으면 오른쪽을 해제하고 교체
            const prevUid = newEquipment.ring_r.uid;
            newInventory = newInventory.map(i => i.uid === prevUid ? { ...i, isEquipped: false } : i);
            targetSubSlot = 'ring_r';
        }
        
        newEquipment[targetSubSlot] = itemToEquip;
        // 실제 아이템 객체에 어느 슬롯에 장착되었는지 기록 (해제 시 필요)
        itemToEquip.equippedSlot = targetSubSlot;
    } else {
        newEquipment[slot] = itemToEquip;
    }

    newInventory = newInventory.map(i => i.uid === itemToEquip.uid ? { ...i, isEquipped: true, equippedSlot: slot === 'ring' ? itemToEquip.equippedSlot : slot } : i);

    return {
        ...state,
        inventory: newInventory,
        equipment: newEquipment,
        logs: logs
    };
};

/**
 * 아이템 해제 로직
 * @param {Object} state 
 * @param {Object} itemToUnequip 
 */
export const handleUnequipItem = (state, itemToUnequip) => {
    if (!itemToUnequip || !itemToUnequip.slot) return state;

    // 해제할 슬롯 결정 (반지의 경우 equippedSlot 참조)
    const equippedSlot = itemToUnequip.equippedSlot || itemToUnequip.slot;
    let newEquipment = { ...state.equipment };
    let newInventory = [...state.inventory];

    newEquipment[equippedSlot] = null;
    newInventory = newInventory.map(i => i.uid === itemToUnequip.uid ? { ...i, isEquipped: false, equippedSlot: null } : i);

    return {
        ...state,
        inventory: newInventory,
        equipment: newEquipment,
        logs: [`${itemToUnequip.name} 해제`, ...state.logs]
    };
};

/**
 * 아이템 판매 로직
 * @param {Object} state 
 * @param {number} itemUid 
 * @param {number} quantity - 판매할 수량 (기본값: 1)
 */
export const handleSellItem = (state, itemUid, quantity = 1) => {
    const itemIndex = state.inventory.findIndex(i => i.uid === itemUid);
    if (itemIndex === -1) return state;

    const item = state.inventory[itemIndex];
    if (item.isEquipped) {
        return { ...state, logs: ['[시스템] 장착 중인 아이템은 판매할 수 없습니다.', ...state.logs] };
    }

    // 실제 판매할 수량 결정 (보유량보다 많이 판매할 수 없음)
    const sellCount = Math.min(quantity, item.count || 1);

    let baseSellPrice = Math.floor(item.price / 2);
    // 강화 수치에 따른 판매가 상승 (1.5배씩)
    let finalSellPrice = baseSellPrice;
    if (item.enchant > 0) {
        const multiplier = Math.pow(1.5, item.enchant);
        finalSellPrice = Math.floor(baseSellPrice * multiplier);
    }

    // 총 판매 금액
    const totalEarnings = finalSellPrice * sellCount;

    let newInventory = [...state.inventory];
    if (item.count > sellCount) {
        // 수량만 차감
        newInventory[itemIndex] = { ...item, count: item.count - sellCount };
    } else {
        // 아이템 삭제
        newInventory = newInventory.filter(i => i.uid !== itemUid);
    }

    return {
        ...state,
        inventory: newInventory,
        adena: state.adena + totalEarnings,
        logs: [`[상점] ${item.enchant > 0 ? `+${item.enchant} ` : ''}${item.name} (${sellCount}개) 판매 완료 (+${totalEarnings.toLocaleString()} 아데나)`, ...state.logs]
    };
};

/**
 * 인벤토리 아이템 이동 (순서 변경)
 * @param {Object} state 
 * @param {number} fromIndex 
 * @param {number} toIndex 
 */
export const handleMoveItem = (state, fromIndex, toIndex) => {
    if (fromIndex === toIndex) return state;

    const newInventory = [...state.inventory];
    if (fromIndex < 0 || fromIndex >= newInventory.length) return state;

    const item = newInventory[fromIndex];
    newInventory.splice(fromIndex, 1);
    newInventory.splice(toIndex, 0, item);

    return { ...state, inventory: newInventory };
};
