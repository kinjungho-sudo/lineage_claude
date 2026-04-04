import { ITEM_TYPES, SCROLL_TYPES } from '../constants';

export const ITEMS = [
    // --- Weapons ---
    // --- Weapons ---
    {
        id: 'sword_katana',
        name: '일본도',
        type: ITEM_TYPES.WEAPON,
        slot: 'weapon',
        price: 20000,
        image: '/assets/katana.png',
        safe: 6,
        stats: { small: 10, large: 12 }
    },
    {
        id: 'sword_rapier',
        name: '레이피어',
        type: ITEM_TYPES.WEAPON,
        slot: 'weapon',
        price: 30000,
        image: '/assets/rapier.png',
        safe: 6,
        stats: { small: 11, large: 6, undead: true }
    },
    {
        id: 'sword_ssaulabi',
        name: '싸울아비 장검',
        type: ITEM_TYPES.WEAPON,
        slot: 'weapon',
        price: 60000,
        image: '/assets/싸울아비장검.png',
        safe: 6,
        unbuyable: true,
        description: '전설적인 명검. 상점에서 구매할 수 없으며 강력한 몬스터로부터 획득할 수 있습니다.',
        stats: { small: 16, large: 10 }
    },
    {
        id: 'sword_2h',
        name: '양손검',
        type: ITEM_TYPES.WEAPON,
        slot: 'weapon',
        price: 10000,
        image: '/assets/sword_2h.png',
        safe: 6,
        twoHanded: true,
        stats: { small: 14, large: 16 }
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
        stats: { small: 3, large: 2, range: true }
    },

    // --- Armor ---
    {
        id: 'helm_steel',
        name: '강철 면갑',
        type: ITEM_TYPES.HELM,
        slot: 'helm',
        price: 15000,
        image: '/assets/steel_helm.png',
        safe: 4,
        description: '강철 세트 5종 착용 시 AC -3 보너스',
        stats: { ac: 3, set: 'steel' }
    },
    {
        id: 'armor_steel',
        name: '강철 판금 갑옷',
        type: ITEM_TYPES.ARMOR,
        slot: 'armor',
        price: 20000,
        image: '/assets/steel_armor.png',
        safe: 4,
        description: '강철 세트 5종 착용 시 AC -3 보너스',
        stats: { ac: 7, set: 'steel' }
    },
    {
        id: 'gloves_power',
        name: '파워 글로브',
        type: ITEM_TYPES.GLOVES,
        slot: 'gloves',
        price: 40000,
        image: '/assets/sprites/gloves_power.png',
        safe: 4,
        unbuyable: true,
        description: '착용 시 힘(STR)이 1 증가합니다. 추가 타격 +2. (상점 구매 불가)',
        stats: { ac: 0, str: 1, small: 2 }
    },
    {
        id: 'gloves_steel',
        name: '강철 장갑',
        type: ITEM_TYPES.GLOVES,
        slot: 'gloves',
        price: 15000,
        image: '/assets/steel_gloves.png',
        safe: 4,
        description: '강철 세트 5종 착용 시 AC -3 보너스',
        stats: { ac: 1, set: 'steel' }
    },
    {
        id: 'boots_steel',
        name: '강철 부츠',
        type: ITEM_TYPES.BOOTS,
        slot: 'boots',
        price: 15000,
        image: '/assets/steel_boots.png',
        safe: 4,
        description: '강철 세트 5종 착용 시 AC -3 보너스',
        stats: { ac: 3, set: 'steel' }
    },
    {
        id: 'shield_steel',
        name: '강철 방패',
        type: ITEM_TYPES.SHIELD,
        slot: 'shield',
        price: 15000,
        image: '/assets/sprites/shield_steel.png',
        safe: 6,
        description: '강철 세트 5종 착용 시 AC -3 보너스',
        stats: { ac: 3, set: 'steel' }
    },
    {
        id: 'cloak_protection',
        name: '보호 망토',
        type: ITEM_TYPES.CLOAK,
        slot: 'cloak',
        price: 10000,
        image: '/assets/cloak_of_protection.png',
        safe: 4,
        stats: { ac: 1 }
    },
    {
        id: 'cloak_magic',
        name: '마법망토',
        type: ITEM_TYPES.CLOAK,
        slot: 'cloak',
        price: 10000,
        image: '/assets/마법망토.png',
        safe: 4,
        unbuyable: true,
        description: '마법 방어력이 10 증가합니다.',
        stats: { ac: 1, mr: 10 }
    },
    {
        id: 'shirt_t',
        name: '티셔츠',
        type: ITEM_TYPES.SHIRT,
        slot: 'shirt',
        price: 10000,
        image: '/assets/t_shirt.png',
        safe: 4,
        stats: { ac: 0 }
    },
    {
        id: 'helm_magic_defense',
        name: '마법 방어 투구',
        type: ITEM_TYPES.HELM,
        slot: 'helm',
        price: 10000,
        image: '/assets/마법 방어 투구.png',
        safe: 4,
        unbuyable: true,
        description: '마법 방어력이 20 증가합니다.',
        stats: { ac: 2, mr: 20 }
    },
    {
        id: 'helm_magic_str',
        name: '마법 투구 (힘)',
        type: ITEM_TYPES.HELM,
        slot: 'helm',
        price: 120000,
        image: '/assets/마법의 투구 힘.png',
        safe: 4,
        unbuyable: true,
        description: '사용 시 MP 100을 소모하여 1분간 힘(STR)이 3 증가합니다. (수중 던전 전용 드랍)',
        stats: { ac: 2 },
        useData: { type: 'magic_helm_str', mpCost: 100, durationMs: 60000 }
    },
    {
        id: 'armor_mr_chain',
        name: '마법방어 사슬갑옷',
        type: ITEM_TYPES.ARMOR,
        slot: 'armor',
        price: 16000,
        image: '/assets/마법 방어 사슬 갑옷.png',
        safe: 4,
        unbuyable: true,
        description: '마법 방어력이 20 증가합니다.',
        stats: { ac: 4, mr: 20 }
    },
    {
        id: 'boots_underwater',
        name: '수중 부츠',
        type: ITEM_TYPES.BOOTS,
        slot: 'boots',
        price: 18000,
        image: '/assets/수중 부츠.png',
        safe: 4,
        unbuyable: true,
        description: '수중 던전에 입장할 수 있게 해줍니다.',
        stats: { ac: 2, underwater: true }
    },
    {
        id: 'shield_silver_knight',
        name: '은기사의 방패',
        type: ITEM_TYPES.SHIELD,
        slot: 'shield',
        price: 100000,
        image: '/assets/은기사의 방패.png',
        safe: 6,
        unbuyable: true,
        description: '은기사의 명예가 깃든 방패. 마법 방어력이 20 증가합니다.',
        stats: { ac: 2, mr: 20 }
    },
    {
        id: 'armor_elf_plate',
        name: '요정족 판금 갑옷',
        type: ITEM_TYPES.ARMOR,
        slot: 'armor',
        price: 300000,
        image: '/assets/sprites/armor_elf_plate.png',
        safe: 6,
        unbuyable: true,
        description: '요정족의 기술로 만들어진 갑옷. 안전하게 +6까지 강화할 수 있습니다.',
        stats: { ac: 6 }
    },
    {
        id: 'shield_eva',
        name: '에바의 방패',
        type: ITEM_TYPES.SHIELD,
        slot: 'shield',
        price: 500000,
        image: '/assets/에바의 방패.png',
        safe: 6,
        unbuyable: true,
        description: '에바의 가호가 깃든 방패. (AC -3, MR +20)',
        stats: { ac: 3, mr: 20 }
    },
    {
        id: 'armor_crystal',
        name: '수정갑옷',
        type: ITEM_TYPES.ARMOR,
        slot: 'armor',
        price: 600000,
        image: '/assets/수정갑옷.png',
        safe: 4,
        unbuyable: true,
        description: '수정으로 만들어진 견고한 갑옷. (AC -8)',
        stats: { ac: 8 }
    },

    // --- 새로운 커츠 세트 ---
    {
        id: 'helm_kurz',
        name: '커츠의 투구',
        type: ITEM_TYPES.HELM,
        slot: 'helm',
        price: 800000,
        image: '/assets/helm_kurz.png',
        safe: 4,
        unbuyable: true,
        description: '보스 커츠가 남긴 투구. 체력 회복량 증가. (커츠 세트 4종 착용 시 AC -4 보너스)',
        stats: { ac: 3, hp: 50, set: 'kurz' } // [유저 요청] hpRegen 삭제, HP +50 추가
    },
    {
        id: 'armor_kurz',
        name: '커츠의 갑옷',
        type: ITEM_TYPES.ARMOR,
        slot: 'armor',
        price: 1500000,
        image: '/assets/armor_kurz.png',
        safe: 4,
        unbuyable: true,
        description: '보스 커츠가 남긴 갑옷. 체력 회복량 증가. (커츠 세트 4종 착용 시 AC -4 보너스)',
        stats: { ac: 7, hp: 50, set: 'kurz' } // [유저 요청] hpRegen 삭제, HP +50 추가
    },
    {
        id: 'gloves_kurz',
        name: '커츠의 장갑',
        type: ITEM_TYPES.GLOVES,
        slot: 'gloves',
        price: 600000,
        image: '/assets/gloves_kurz.png',
        safe: 4,
        unbuyable: true,
        description: '보스 커츠가 남긴 장갑. 체력 회복량 증가. (커츠 세트 4종 착용 시 AC -4 보너스)',
        stats: { ac: 2, hp: 50, set: 'kurz' } // [유저 요청] hpRegen 삭제, HP +50 추가
    },
    {
        id: 'boots_kurz',
        name: '커츠의 부츠',
        type: ITEM_TYPES.BOOTS,
        slot: 'boots',
        price: 600000,
        image: '/assets/boots_kurz.png',
        safe: 4,
        unbuyable: true,
        description: '보스 커츠가 남긴 부츠. 체력 회복량 증가. (커츠 세트 4종 착용 시 AC -4 보너스)',
        stats: { ac: 3, hp: 50, set: 'kurz' } // [유저 요청] hpRegen 삭제, HP +50 추가
    },

    // --- 악세서리 ---
    {
        id: 'belt_body',
        name: '신체의 벨트',
        type: ITEM_TYPES.BELT,
        slot: 'belt',
        price: 40000,
        image: '/assets/items/belt_body.png',
        safe: 0,
        unbuyable: true,
        description: '착용 시 최대 HP가 30 증가합니다. (상점 구매 불가)',
        stats: { hp: 30 }
    },
    {
        id: 'belt_ogre',
        name: '오우거의 벨트',
        type: ITEM_TYPES.BELT,
        slot: 'belt',
        price: 60000,
        image: '/assets/items/belt_ogre.png',
        safe: 0,
        unbuyable: true,
        description: '착용 시 힘(STR)이 1 증가합니다. (상점 구매 불가)',
        stats: { str: 1 }
    },
    {
        id: 'necklace_str',
        name: '완력의 목걸이',
        type: ITEM_TYPES.NECKLACE,
        slot: 'necklace',
        price: 40000,
        image: '/assets/items/necklace_str.png',
        safe: 0,
        unbuyable: true,
        description: '착용 시 힘(STR)이 1 증가합니다. (상점 구매 불가)',
        stats: { str: 1 }
    },
    {
        id: 'necklace_con',
        name: '체력의 목걸이',
        type: ITEM_TYPES.NECKLACE,
        slot: 'necklace',
        price: 40000,
        image: '/assets/items/necklace_con.png',
        safe: 0,
        unbuyable: true,
        description: '착용 시 건강(CON)이 1, 지혜(WIS)가 1 증가합니다. (상점 구매 불가)',
        stats: { con: 1, wis: 1 }
    },
    {
        id: 'ring_protection',
        name: '수호의 반지',
        type: ITEM_TYPES.RING,
        slot: 'ring',
        price: 100000,
        image: '/assets/수호의 반지.png',
        safe: 0,
        unbuyable: true,
        description: '착용자를 보호하는 신비한 반지. (AC -2)',
        stats: { ac: 2 }
    },
    {
        id: 'necklace_protection',
        name: '수호의 목걸이',
        type: ITEM_TYPES.NECKLACE,
        slot: 'necklace',
        price: 100000,
        image: '/assets/수호의 목걸이.png',
        safe: 0,
        unbuyable: true,
        description: '착용자를 보호하는 신비한 목걸이. (AC -2)',
        stats: { ac: 2 }
    },
    {
        id: 'necklace_orc_fighter',
        name: '오크투사의 목걸이',
        type: ITEM_TYPES.NECKLACE,
        slot: 'necklace',
        price: 150000,
        image: '/assets/오크투사의 목걸이.png',
        safe: 0,
        unbuyable: true,
        description: '오크 투사의 힘이 깃든 목걸이. (HP +30)',
        stats: { hp: 30 }
    },
    {
        id: 'ring_crystal',
        name: '수정 반지',
        type: ITEM_TYPES.RING,
        slot: 'ring',
        price: 300000,
        image: '/assets/sprites/ring_crystal.png',
        safe: 0,
        unbuyable: true,
        description: '영롱한 빛을 내는 수정 반지. (AC -3, MR +5) (수중 던전 전용 드랍)',
        stats: { ac: 3, mr: 5 }
    },
    {
        id: 'necklace_crystal',
        name: '수정 목걸이',
        type: ITEM_TYPES.NECKLACE,
        slot: 'necklace',
        price: 400000,
        image: '/assets/sprites/necklace_crystal.png',
        safe: 0,
        unbuyable: true,
        description: '영롱한 빛을 내는 수정 목걸이. (AC -3, MR +10) (수중 던전 전용 드랍)',
        stats: { ac: 3, mr: 10 }
    },

    // --- Consumables ---
    {
        id: 'potion_red',
        name: '빨간 물약',
        type: ITEM_TYPES.POTION,
        price: 60,
        heal: 60,
        description: '체력을 회복합니다. (HP +60) 65% 이하일 때 연속 사용됩니다.',
        image: '/assets/new_redpotion.png'
    },
    {
        id: 'potion_clear',
        name: '주홍 물약',
        type: ITEM_TYPES.POTION,
        price: 500, // 가격 200 -> 500 상향
        heal: 250,
        description: '강력한 체력 회복제. (HP +250) 30% 이하일 때 사용됩니다.',
        image: '/assets/new_orangepotion.png'
    },
    {
        id: 'potion_clear_high',
        name: '맑은 물약',
        type: ITEM_TYPES.POTION,
        price: 3000,
        heal: 500,
        description: '가장 강력한 체력 회복제. (HP +500) 체력이 부족할 때 최우선으로 연속 사용됩니다.',
        image: '/assets/potion_clear_high.png' 
    },
    {
        id: 'potion_green',
        name: '초록 물약',
        type: ITEM_TYPES.POTION,
        price: 1000,
        description: '공격 속도를 향상시킵니다. (5분 지속) 효과 만료 시 자동 소모됩니다.',
        image: '/assets/potion_green.png',
        useData: { type: 'haste', durationMs: 300000 } // 5분
    },
    {
        id: 'potion_brave',
        name: '용기의 물약',
        type: ITEM_TYPES.POTION,
        price: 10000,
        heal: 0,
        description: '기사의 필수품. 5분(300초) 간 공격속도가 60% 빨라지며, 효과 종료 시 가방에 있다면 자동으로 마십니다.',
        image: '/assets/potion_brave.png', 
        buffData: { type: 'brave', durationMs: 300000 }
    },
    {
        id: 'scroll_zel',
        name: '갑옷 마법 주문서',
        type: ITEM_TYPES.SCROLL,
        scrollType: SCROLL_TYPES.ARMOR_SCROLL,
        price: 30000,
        description: '방어구를 강화합니다. (+1 AC)',
        image: '/assets/scroll_zel.png'
    },
    {
        id: 'scroll_dai',
        name: '무기 마법 주문서',
        type: ITEM_TYPES.SCROLL,
        scrollType: SCROLL_TYPES.WEAPON_SCROLL,
        price: 50000,
        description: '무기를 강화합니다. (+1 Damage)',
        image: '/assets/scroll_dai.png'
    },
    {
        id: 'scroll_zel_blessed',
        name: '축복받은 갑옷 마법 주문서',
        type: ITEM_TYPES.SCROLL,
        scrollType: SCROLL_TYPES.ARMOR_SCROLL,
        price: 170000,
        description: '방어구를 강화합니다. (+1~+3 AC, 확률적) (상점 구매 불가)',
        image: '/assets/scroll_zel.png',
        isBlessed: true,
        unbuyable: true
    },
    {
        id: 'scroll_dai_blessed',
        name: '축복받은 무기 마법 주문서',
        type: ITEM_TYPES.SCROLL,
        scrollType: SCROLL_TYPES.WEAPON_SCROLL,
        price: 200000,
        description: '무기를 강화합니다. (+1~+3 Damage, 확률적) (상점 구매 불가)',
        image: '/assets/scroll_dai.png',
        isBlessed: true,
        unbuyable: true
    },
    {
        id: 'scroll_teleport',
        name: '순간이동 주문서',
        type: ITEM_TYPES.SCROLL,
        scrollType: SCROLL_TYPES.TELEPORT,
        price: 500,
        description: '무작위 장소로 순간이동합니다.',
        image: '/assets/scroll_zel.png'
    }
];
