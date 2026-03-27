import { ITEM_TYPES, SCROLL_TYPES } from '../constants';

export const ITEMS = [
    // --- Core Shop Items (Scrolls) ---
    {
        id: 'scroll_zel',
        name: '갑옷 마법 주문서',
        type: ITEM_TYPES.SCROLL,
        scrollType: SCROLL_TYPES.ARMOR_SCROLL,
        price: 30000,
        image: '/assets/scroll_zel.png',
    },
    {
        id: 'scroll_dai',
        name: '무기 마법 주문서',
        type: ITEM_TYPES.SCROLL,
        scrollType: SCROLL_TYPES.WEAPON_SCROLL,
        price: 50000,
        image: '/assets/scroll_dai.png',
    },
    {
        id: 'potion_brave',
        name: '용기의 물약',
        type: ITEM_TYPES.POTION,
        price: 10000,
        image: '/assets/potion_brave.png',
        buffData: { type: 'brave', durationMs: 300000 },
        restrictedClasses: ['elf']
    },
    {
        id: 'elven_wafer',
        name: '엘븐 와퍼',
        type: ITEM_TYPES.POTION,
        price: 10000,
        image: '/assets/elven_wafer.png',
        description: '요정 전용 가속 아이템 (공속 향상)',
        buffData: { type: 'brave', durationMs: 300000 },
        restrictedClasses: ['knight']
    },

    // --- Weapons ---
    {
        id: 'sword_katana',
        name: '일본도',
        type: ITEM_TYPES.WEAPON,
        slot: 'weapon',
        price: 20000,
        image: '/assets/katana.png',
        safe: 6,
        stats: { small: 10, large: 12 },
        restrictedClasses: ['elf']
    },
    {
        id: 'bow_cross',
        name: '크로스 보우',
        type: ITEM_TYPES.WEAPON,
        slot: 'weapon',
        price: 20000,
        image: '/assets/crossbow.png',
        safe: 6,
        twoHanded: true,
        stats: { small: 3, large: 2, range: true },
        restrictedClasses: ['knight']
    },
    {
        id: 'sword_rapier',
        name: '레이피어',
        type: ITEM_TYPES.WEAPON,
        slot: 'weapon',
        price: 35000,
        image: '/assets/rapier.png',
        safe: 6,
        stats: { small: 11, large: 6, undead: true },
        restrictedClasses: ['elf']
    },
    {
        id: 'longbow',
        name: '장궁',
        type: ITEM_TYPES.WEAPON,
        slot: 'weapon',
        price: 50000,
        image: '/assets/longbow.png',
        safe: 6,
        unbuyable: true,
        twoHanded: true,
        stats: { small: 3, large: 3, range: true }
    },
    {
        id: 'sword_ssaulabi',
        name: '싸울아비 장검',
        type: ITEM_TYPES.WEAPON,
        slot: 'weapon',
        price: 80000,
        image: '/assets/싸울아비장검.png',
        safe: 6,
        unbuyable: true,
        stats: { small: 16, large: 10 },
        restrictedClasses: ['elf']
    },

    // --- Armor ---
    {
        id: 'helm_steel',
        name: '강철 면갑',
        type: ITEM_TYPES.ARMOR,
        slot: 'helm',
        price: 15000,
        image: '/assets/steel_helm.png',
        safe: 4,
        stats: { ac: 3, set: 'steel' }
    },
    {
        id: 'armor_steel',
        name: '강철 판금 갑옷',
        type: ITEM_TYPES.ARMOR,
        slot: 'armor',
        price: 35000,
        image: '/assets/steel_armor.png',
        safe: 4,
        stats: { ac: 7, set: 'steel' }
    },
    {
        id: 'gloves_steel',
        name: '강철 장갑',
        type: ITEM_TYPES.ARMOR,
        slot: 'gloves',
        price: 12000,
        image: '/assets/steel_gloves.png',
        safe: 4,
        stats: { ac: 1, set: 'steel' }
    },
    {
        id: 'boots_steel',
        name: '강철 부츠',
        type: ITEM_TYPES.ARMOR,
        slot: 'boots',
        price: 12000,
        image: '/assets/steel_boots.png',
        safe: 4,
        stats: { ac: 2, set: 'steel' }
    },
    {
        id: 'shield_steel',
        name: '강철 방패',
        type: ITEM_TYPES.ARMOR,
        slot: 'shield',
        price: 15000,
        image: '/assets/steel_shield.png',
        safe: 4,
        stats: { ac: 3, set: 'steel' }
    },
    {
        id: 't_shirt',
        name: '티셔츠',
        type: ITEM_TYPES.ARMOR,
        slot: 'shirt',
        price: 5000,
        image: '/assets/sprites/shirt_t.png',
        safe: 4,
        stats: { ac: 0 }
    },
    // Elf Items
    {
        id: 'armor_elf_plate',
        name: '요정족 판금 갑옷',
        type: ITEM_TYPES.ARMOR,
        slot: 'armor',
        price: 20000,
        image: '/assets/armor_elf_plate.png',
        safe: 6,
        stats: { ac: 6 },
        restrictedClasses: ['knight']
    },
    {
        id: 'cloak_elf',
        name: '요정의 망토',
        type: ITEM_TYPES.ARMOR,
        slot: 'cloak',
        price: 15000,
        image: '/assets/cloak_elf.png',
        safe: 4,
        description: 'AC -1 / DEX +1',
        stats: { ac: 1, dex: 1 },
        restrictedClasses: ['knight']
    },
    {
        id: 'helm_elm',
        name: '엘름의 축복',
        type: ITEM_TYPES.ARMOR,
        slot: 'helm',
        price: 20000,
        image: '/assets/helm_elm.png',
        safe: 6,
        description: 'AC -2 / DEX +1',
        stats: { ac: 2, dex: 1 },
        restrictedClasses: ['knight']
    },

    // --- Accessory ---
    {
        id: 'necklace_str',
        name: '완력의 목걸이',
        type: ITEM_TYPES.ACCESSORY,
        slot: 'necklace',
        price: 50000,
        image: '/assets/오크투사의 목걸이.png',
        stats: { str: 1 },
        unbuyable: true
    },
    {
        id: 'necklace_con',
        name: '체력의 목걸이',
        type: ITEM_TYPES.ACCESSORY,
        slot: 'necklace',
        price: 50000,
        image: '/assets/오크투사의 목걸이.png',
        stats: { con: 1 },
        unbuyable: true
    },

    // --- Potions & Buffs ---
    {
        id: 'potion_red',
        name: '빨간 물약',
        type: ITEM_TYPES.POTION,
        price: 40,
        image: '/assets/new_redpotion.png', // Working red potion img
        healAmount: 60
    },
    {
        id: 'potion_green',
        name: '초록 물약',
        type: ITEM_TYPES.POTION,
        price: 1000,
        image: '/assets/potion_green.png',
        buffData: { type: 'haste', durationMs: 300000 }
    },

    // --- Misc ---
];
