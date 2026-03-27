import { ENCHANT_RESULTS, ITEM_TYPES, SCROLL_TYPES } from '../constants';

// Probability configuration (Approximate Classic Lineage Rates)
// +0->+1 to Safe Limit: 100%
// Safe->+1: ~33% success? Actually often 1/3 or varies.
// As per request: "+6 이후 부터 파괴 될 수 있으며 ... 확률이 점점 더 낮아짐"

// Probability configuration (Approximate Classic Lineage Rates)
// +0->+1 to Safe Limit: 100%
// Safe->...
// Max Limit: +12

const getSuccessRate = (currentEnchant, safeLimit, isAccessory = false) => {
    if (currentEnchant >= 13) return 0;

    // 장신구: 낮은 성공 확률 (요청: 확률이 낮음)
    if (isAccessory) {
        if (currentEnchant === 0) return 0.25; // 1/4
        if (currentEnchant === 1) return 0.15; 
        if (currentEnchant === 2) return 0.10; 
        if (currentEnchant === 3) return 0.05; 
        if (currentEnchant === 4) return 0.03; 
        return 0.01;
    }

    if (currentEnchant < safeLimit) return 1.0;

    const diff = currentEnchant - safeLimit;

    // Diminishing success rates based on enhancement level
    if (diff === 0) return 0.33; // +6 -> +7 (Weapon) / +4 -> +5 (Armor)
    if (diff === 1) return 0.20; // +7 -> +8
    if (diff === 2) return 0.15; // +8 -> +9
    if (diff === 3) return 0.10; // +9 -> +10
    if (diff === 4) return 0.05; // +10 -> +11
    if (diff === 5) return 0.03; // +11 -> +12
    if (diff === 6) return 0.01; // +12 -> +13

    return 0.005; // +13 or higher (Legendary)
};


export const enchantItem = (item, scrollType, isBlessed = false) => {
    // Validate Item vs Scroll
    // Weapon Scroll -> Weapon
    if (scrollType === SCROLL_TYPES.WEAPON_SCROLL && item.type !== ITEM_TYPES.WEAPON) {
        return { result: 'invalid', message: '이 주문서는 무기에만 사용할 수 있습니다.' };
    }

    // Armor Scroll -> Armor types (Including Jewelry if Armor scroll is used)
    const ACCESSORY_TYPES_LIST = [ITEM_TYPES.RING, ITEM_TYPES.NECKLACE, ITEM_TYPES.BELT];
    const ARMOR_TYPES_LIST = [
        ITEM_TYPES.ARMOR, ITEM_TYPES.HELM, ITEM_TYPES.GLOVES, ITEM_TYPES.BOOTS,
        ITEM_TYPES.SHIELD, ITEM_TYPES.SHIRT, ITEM_TYPES.CLOAK, ...ACCESSORY_TYPES_LIST
    ];

    if (scrollType === SCROLL_TYPES.ARMOR_SCROLL && !ARMOR_TYPES_LIST.includes(item.type)) {
        return { result: 'invalid', message: '이 주문서는 방어구나 장신구에만 사용할 수 있습니다.' };
    }

    const isAccessory = ACCESSORY_TYPES_LIST.includes(item.type);

    const currentEnchant = item.enchant || 0;
    const safeLimit = item.safe || 0;

    if (currentEnchant >= 13) {
        return {
            result: ENCHANT_RESULTS.FAILURE,
            newEnchant: currentEnchant,
            message: '더 이상 강화할 수 없습니다. (최대 +13)'
        };
    }

    // Calculate Success Rate
    const successRate = getSuccessRate(currentEnchant, safeLimit, isAccessory);
    const roll = Math.random();

    const isSuccess = roll < successRate;

    if (isSuccess) {
        let increase = 1;
        if (isBlessed) {
            // Blessed logic: +1 (50%), +2 (40%), +3 (10%)
            const blessRoll = Math.random();
            if (blessRoll < 0.5) increase = 1;
            else if (blessRoll < 0.9) increase = 2;
            else increase = 3;
        }

        return {
            result: ENCHANT_RESULTS.SUCCESS,
            newEnchant: currentEnchant + increase,
            message: `인챈트 : +${currentEnchant + increase} ${item.name} 가 한 순간 파랗게 빛납니다.`,
        };
    } else {
        // Failure handling
        if (currentEnchant < safeLimit) {
            // Safe failure (shouldn't really happen with 1.0 rate, but as fallback)
            return {
                result: ENCHANT_RESULTS.FAILURE,
                newEnchant: currentEnchant,
                message: `인챈트 : +${currentEnchant} ${item.name} 에 아무런 일도 일어나지 않았습니다.`,
            };
        } else {
            // Unsafe failure: 3 Outcomes requested (Success handled above).
            // Fail outcomes: "Failure" (Nothing happens) vs "Destruction".
            // Let's say 50/50 for now or slight bias to destruction?
            // User didn't specify probability, just that there are 3 outcomes.
            // I'll set 20% chance to just fail (save item), 80% to destroy.

            if (Math.random() < 0.2) {
                return {
                    result: ENCHANT_RESULTS.FAILURE,
                    newEnchant: currentEnchant, // No change
                    message: `인챈트 : +${currentEnchant} ${item.name} 에 아무런 일도 일어나지 않았습니다.`,
                };
            } else {
                return {
                    result: ENCHANT_RESULTS.DESTROYED,
                    newEnchant: 0,
                    message: `인챈트 : +${currentEnchant} ${item.name} 가 한 순간 파랗게 빛나더니 증발하여 사라졌습니다.`,
                };
            }
        }
    }
};
