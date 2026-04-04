export const MONSTERS = [
    // 말하는섬 (Talking Island)
    { id: 'goblin', name: '고블린', level: 2, hp: 36, exp: 36, atk: 18, img: '/monster/talking_island/goblin.png', map: 'talking_island', mr: 0 },
    { id: 'floating_eye', name: '괴물눈', level: 3, hp: 48, exp: 50, atk: 27, img: '/monster/talking_island/floating_eye.png', map: 'talking_island', mr: 2 },
    { id: 'orc', name: '오크', level: 4, hp: 72, exp: 66, atk: 33, img: '/monster/talking_island/orc.png', map: 'talking_island', mr: 2 },
    { id: 'dwarf', name: '난쟁이', level: 6, hp: 108, exp: 90, atk: 39, img: '/monster/talking_island/dwarf.png', map: 'talking_island', mr: 3 },
    { id: 'kobold', name: '코볼트', level: 5, hp: 92, exp: 76, atk: 36, img: '/monster/talking_island/kobold.png', map: 'talking_island', mr: 2 },
    { id: 'orc_archer', name: '오크 궁수', level: 5, hp: 84, exp: 70, atk: 30, img: '/monster/talking_island/orc_archer.png', map: 'talking_island', mr: 2 },

    // 글루디오 던전 (Gludio Dungeon)
    { id: 'orc_fighter', name: '오크 전사', level: 8, hp: 72, exp: 45, atk: 48, img: '/monster/gludio_dungeon/orc_fighter.png', map: 'dungeon', mr: 4 },
    { id: 'skeleton', name: '해골', level: 15, hp: 144, exp: 90, atk: 45, img: '/monster/gludio_dungeon/skeleton.png', map: 'dungeon', mr: 8 },
    { id: 'spartoi', name: '스파토이', level: 20, hp: 264, exp: 200, atk: 55, img: '/monster/gludio_dungeon/spartoi.png', map: 'dungeon', mr: 10 },
    { id: 'ghoul', name: '구울', level: 16, hp: 204, exp: 105, atk: 48, img: '/monster/gludio_dungeon/ghoul.png', map: 'dungeon', mr: 8 },
    { id: 'stone_golem', name: '돌 골렘', level: 18, hp: 288, exp: 140, atk: 52, img: '/monster/gludio_dungeon/stone_golem.png', map: 'dungeon', isLarge: true, mr: 12 },
    { id: 'bugbear_dungeon', name: '버그베어', level: 22, hp: 216, exp: 225, atk: 75, img: '/monster/gludio_dungeon/bugbear.png', map: 'dungeon', isLarge: true, mr: 12 },
    { id: 'selob_dungeon', name: '셀로브', level: 24, hp: 264, exp: 275, atk: 85, img: '/monster/gludio_dungeon/selob.png', map: 'dungeon', isLarge: true, mr: 14 },

    // 오크 밭 (Orc Field)
    { id: 'orc_scout', name: '오크 스카우트', level: 18, hp: 228, exp: 140, atk: 58, img: '/monster/orc_field/orc_scout.png', map: 'orc_forest', mr: 10 },
    { id: 'neruga_orc', name: '네루가 오크', level: 21, hp: 174, exp: 210, atk: 65, img: '/monster/orc_field/neruga_orc.png', map: 'orc_forest', mr: 11 },
    { id: 'rova_orc', name: '로바 오크', level: 22, hp: 192, exp: 225, atk: 68, img: '/monster/orc_field/rova_orc.png', map: 'orc_forest', mr: 12 },
    { id: 'atuba_orc', name: '아투바 오크', level: 23, hp: 216, exp: 250, atk: 72, img: '/monster/orc_field/atuba_orc.png', map: 'orc_forest', mr: 12 },
    { id: 'orc_wizard', name: '오크 마법사', level: 24, hp: 192, exp: 275, atk: 85, img: '/monster/orc_field/orc_wizard.png', map: 'orc_forest', isMagic: true, spellName: '파이어볼', spellType: 'fire', mr: 15 },
    { id: 'duda_mara_orc', name: '두다 마라 오크', level: 25, hp: 264, exp: 300, atk: 88, img: '/monster/orc_field/duda_mara_orc.png', map: 'orc_forest', mr: 13 },
    { id: 'gast', name: '가스트', level: 26, hp: 372, exp: 350, atk: 95, img: '/monster/orc_field/gast.png', map: 'orc_forest', mr: 14 },
    { id: 'gandi_orc', name: '간디오크', level: 20, hp: 300, exp: 190, atk: 62, img: '/monster/orc_field/gandi_orc.png', map: 'orc_forest', mr: 10 },
    { id: 'orc_zombie_dv', name: '오크 좀비', level: 27, hp: 330, exp: 320, atk: 98, img: '/monster/dragon_valley/orc_zombie.png', map: 'orc_forest', mr: 15 },

    // 사막 (Desert)
    { id: 'giant_ant', name: '거대 개미', level: 26, hp: 420, exp: 325, atk: 105, img: '/monster/desert/giant_ant.png', map: 'desert', isMagic: true, mr: 14 },
    { id: 'giant_soldier_ant', name: '거대 병정 개미', level: 30, hp: 540, exp: 475, atk: 115, img: '/monster/desert/giant_soldier_ant.png', map: 'desert', isLarge: true, mr: 16 },
    { id: 'scorpion', name: '스콜피온', level: 34, hp: 720, exp: 550, atk: 145, img: '/monster/desert/scorpion.png', map: 'desert', isLarge: true, isMagic: true, spellName: '맹독 가시', spellType: 'poison', mr: 18 },
    { id: 'black_knight_desert', name: '흑기사', level: 35, hp: 960, exp: 600, atk: 135, img: '/monster/desert/black_knight.png', map: 'desert', mr: 18 },

    // 용의 계곡 (Dragon Valley)
    { id: 'skeleton_guard', name: '해골근위병', level: 35, hp: 1020, exp: 750, atk: 145, img: '/monster/dragon_valley/skeleton_guard.png', map: 'dragon_valley', mr: 18 },
    { id: 'skeleton_fighter_dv', name: '해골돌격병', level: 37, hp: 1200, exp: 900, atk: 155, img: '/monster/dragon_valley/skeleton_fighter.png', map: 'dragon_valley', mr: 20 },
    { id: 'skeleton_archer_dv', name: '해골 궁수', level: 38, hp: 900, exp: 1000, atk: 140, img: '/monster/dragon_valley/skeleton_archer.png', map: 'dragon_valley', mr: 20 },
    { id: 'skeleton_sniper_dv', name: '해골저격병', level: 40, hp: 1380, exp: 1250, atk: 165, img: '/monster/dragon_valley/skeleton_sniper.png', map: 'dragon_valley', mr: 22 },
    { id: 'harpy', name: '하피', level: 32, hp: 720, exp: 450, atk: 135, img: '/monster/desert/harpy.png', map: 'dragon_valley', isMagic: true, spellName: '윈드 커터', spellType: 'wind', mr: 16 },
    { id: 'murian', name: '무리안', level: 28, hp: 780, exp: 400, atk: 115, img: '/monster/desert/murian.png', map: 'dragon_valley', mr: 14 },
    { id: 'ogre', name: '오우거', level: 52, hp: 1800, exp: 4000, atk: 220, img: '/monster/dragon_valley/ogre.png', map: 'dragon_valley', isLarge: true, mr: 28 },
    { id: 'cyclops', name: '사이클롭스', level: 55, hp: 2640, exp: 6000, atk: 210, img: '/monster/dragon_valley/cyclops.png', map: 'dragon_valley', isLarge: true, mr: 30 },
    { id: 'troll', name: '트롤', level: 50, hp: 1440, exp: 3250, atk: 195, img: '/monster/dragon_valley/troll.png', map: 'dragon_valley', isLarge: true, mr: 26 },

    // 커츠의 방 (Hell)
    { id: 'kurz', name: '보스 커츠', level: 55, hp: 5400, exp: 25000, atk: 260, magicAtk: 208, ac: -8, img: '/monster/커츠의 방/커츠.png', map: 'hell', isLarge: true, spellName: '커츠의 저주', spellType: 'fire', mr: 35 },

    // 바포메트의 방 (Baphomet Room)
    { id: 'baphomet', name: '보스 바포메트', level: 60, hp: 9600, exp: 40000, atk: 450, magicAtk: 310, img: '/monster/바포매트의 방/바포매트.png', map: 'baphomet_room', isMagic: true, spellName: '어스 퀘이크', spellType: 'earth', isLarge: true, isExtraLarge: true, mr: 40 },

    // 수중 던전 (Underwater Dungeon)
    { id: 'lamia', name: '라미아', level: 45, hp: 720, exp: 6000, atk: 155, img: '/monster/underwater/라미아.png', map: 'water_dungeon', isMagic: true, spellName: '아이스 스파이크', spellType: 'water', mr: 24 },
    { id: 'merman', name: '머맨', level: 46, hp: 900, exp: 6750, atk: 165, img: '/monster/underwater/머맨.png', map: 'water_dungeon', mr: 24 },
    { id: 'shark', name: '상어', level: 48, hp: 1320, exp: 8000, atk: 195, img: '/monster/underwater/상어.png', map: 'water_dungeon', isLarge: true, mr: 26 },
    { id: 'beholder', name: '비홀더', level: 47, hp: 1020, exp: 7500, atk: 178, img: '/monster/underwater/비홀더.png', map: 'water_dungeon', isMagic: true, spellName: '석화 광선', spellType: 'earth', mr: 25 },
    { id: 'asthe', name: '아스테', level: 48, hp: 1080, exp: 8250, atk: 182, img: '/monster/underwater/아스테.png', map: 'water_dungeon', isMagic: true, spellName: '워터 해저드', spellType: 'water', isLarge: true, mr: 26 },
    { id: 'elekkadum', name: '일렉카둠', level: 50, hp: 1560, exp: 10000, atk: 215, img: '/monster/underwater/일렉카둠.png', map: 'water_dungeon', isMagic: true, spellName: '라이트닝 쇼크', spellType: 'electric', isLarge: true, mr: 28 },
    { id: 'crabman', name: '크랩맨', level: 52, hp: 1920, exp: 12500, atk: 228, img: '/monster/underwater/크랩맨.png', map: 'water_dungeon', mr: 28 },
    { id: 'seadancer', name: '시댄서', level: 54, hp: 2640, exp: 16000, atk: 235, img: '/monster/underwater/시댄서.png', map: 'water_dungeon', isMagic: true, mr: 30 },
    { id: 'crustacean', name: '크러스터시안', level: 55, hp: 2940, exp: 22500, atk: 265, img: '/monster/underwater/크러스터시안.png', map: 'water_dungeon', isLarge: true, mr: 32 },
];

export const MAPS = [
    { id: 'village', name: '글루디오 마을', minLevel: 1, img: '/assets/maps/gludio_village.jpg' },
    { id: 'elf_village', name: '요정의 숲', minLevel: 1, img: '/assets/maps/elf_village.png' },
    { id: 'talking_island', name: '말하는 섬 사냥터', minLevel: 1, img: '/maps/talking_island.png' },
    { id: 'dungeon', name: '글루디오 던전', minLevel: 15, img: '/maps/gludio_dungeon.png' },
    { id: 'orc_forest', name: '오크 숲', minLevel: 25, img: '/maps/orc_field.png' },
    { id: 'desert', name: '사막', minLevel: 35, img: '/maps/desert.png' },
    { id: 'dragon_valley', name: '용의 계곡', minLevel: 45, img: '/maps/dragon_valley.png' },
    { id: 'hell', name: '커츠의 방 (Lv.55+)', minLevel: 55, img: '/maps/hell.png' },
    { id: 'baphomet_room', name: '바포메트의 방 (Lv.60+)', minLevel: 60, img: '/maps/baphomet_room.png' },
    { id: 'water_dungeon', name: '수중 던전', minLevel: 55, img: '/maps/underwater.png' },
];
