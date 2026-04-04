
import { enchantItem, ENCHANT_RESULTS } from './mechanics/EnchantLogic.js';
import { ITEM_TYPES, ITEMS } from './data/items.js';

// Mock Items
const weapon = { ...ITEMS.find(i => i.type === ITEM_TYPES.WEAPON), enchant: 0 };
const armor = { ...ITEMS.find(i => i.type === ITEM_TYPES.ARMOR), enchant: 0 };

console.log('=== STARTING ENCHANT LOGIC TEST ===\n');

// 1. Test Weapon Safe Limit (+0 to +6)
console.log('Test 1: Weapon Safe Limit (+0 to +6)');
let currentWeapon = { ...weapon, enchant: 0 };
let failed = false;
for (let i = 0; i < 6; i++) {
    const result = enchantItem(currentWeapon, 'weapon_scroll');
    if (result.result !== ENCHANT_RESULTS.SUCCESS) {
        console.error(`FAILED: Weapon failed at +${currentWeapon.enchant}`);
        failed = true;
        break;
    }
    currentWeapon.enchant = result.newEnchant;
}
if (!failed) console.log('PASS: Weapon reached +6 safely.\n');

// 2. Test Armor Safe Limit (+0 to +4)
console.log('Test 2: Armor Safe Limit (+0 to +4)');
let currentArmor = { ...armor, enchant: 0 };
failed = false;
for (let i = 0; i < 4; i++) {
    const result = enchantItem(currentArmor, 'armor_scroll');
    if (result.result !== ENCHANT_RESULTS.SUCCESS) {
        console.error(`FAILED: Armor failed at +${currentArmor.enchant}`);
        failed = true;
        break;
    }
    currentArmor.enchant = result.newEnchant;
}
if (!failed) console.log('PASS: Armor reached +4 safely.\n');

// 3. Test Destruction Risk (Simulate 1000 attempts at +6 Weapon)
console.log('Test 3: Destruction Risk at +6 Weapon');
let successes = 0;
let destructions = 0;
const TRIALS = 1000;

for (let i = 0; i < TRIALS; i++) {
    const testWeapon = { ...weapon, enchant: 6 };
    const result = enchantItem(testWeapon, 'weapon_scroll');
    if (result.result === ENCHANT_RESULTS.SUCCESS) successes++;
    if (result.result === ENCHANT_RESULTS.DESTROYED) destructions++;
}

console.log(`Trials: ${TRIALS}`);
console.log(`Successes: ${successes} (${(successes / TRIALS * 100).toFixed(1)}%) - Expected ~33%`);
console.log(`Destructions: ${destructions} (${(destructions / TRIALS * 100).toFixed(1)}%)`);

if (destructions > 0 && successes > 0) {
    console.log('PASS: Destruction and Success both occurred.\n');
} else {
    console.error('FAIL: Results suspicious (maybe 100% success or 100% fail?)\n');
}

// 4. Test Invalid Scroll Usage
console.log('Test 4: Invalid Scroll Usage');
const invalidResult = enchantItem(weapon, 'armor_scroll');
if (invalidResult.result === 'invalid') {
    console.log('PASS: Cannot use armor scroll on weapon.\n');
} else {
    console.error(`FAIL: Allowed armor scroll on weapon: ${invalidResult.result}\n`);
}

console.log('=== TEST COMPLETE ===');
