export const MONSTERS = [
    // 말하는섬 (Talking Island)
    { id: 'goblin', name: '고블린', level: 2, hp: 15, exp: 35, atk: 12, img: '/monster/talking_island/goblin.png', map: 'talking_island' },
    { id: 'floating_eye', name: '괴물눈', level: 3, hp: 20, exp: 50, atk: 18, img: '/monster/talking_island/floating_eye.png', map: 'talking_island' },
    { id: 'orc', name: '오크', level: 4, hp: 30, exp: 65, atk: 22, img: '/monster/talking_island/orc.png', map: 'talking_island' },
    { id: 'dwarf', name: '난쟁이', level: 6, hp: 45, exp: 90, atk: 26, img: '/monster/talking_island/dwarf.png', map: 'talking_island' },
    { id: 'kobold', name: '코볼트', level: 5, hp: 38, exp: 75, atk: 24, img: '/monster/talking_island/kobold.png', map: 'talking_island' },

    // 글루디오 던전 (Gludio Dungeon)
    { id: 'orc_fighter', name: '오크 전사', level: 8, hp: 30, exp: 90, atk: 32, img: '/monster/gludio_dungeon/orc_fighter.png', map: 'dungeon' },
    { id: 'skeleton', name: '해골', level: 15, hp: 60, exp: 180, atk: 45, img: '/monster/gludio_dungeon/skeleton.png', map: 'dungeon' },
    { id: 'spartoi', name: '스파토이', level: 20, hp: 110, exp: 400, atk: 55, img: '/monster/gludio_dungeon/spartoi.png', map: 'dungeon' },
    { id: 'ghoul', name: '구울', level: 16, hp: 85, exp: 210, atk: 48, img: '/monster/gludio_dungeon/ghoul.png', map: 'dungeon' },
    { id: 'stone_golem', name: '돌 골렘', level: 18, hp: 120, exp: 280, atk: 52, img: '/monster/gludio_dungeon/stone_golem.png', map: 'dungeon' },
    { id: 'bugbear_dungeon', name: '버그베어', level: 22, hp: 180, exp: 450, atk: 75, img: '/monster/gludio_dungeon/bugbear.png', map: 'dungeon' },
    { id: 'selob_dungeon', name: '셀로브', level: 24, hp: 220, exp: 550, atk: 85, img: '/monster/gludio_dungeon/selob.png', map: 'dungeon' },

    // 오크 밭 (Orc Field)
    { id: 'orc_scout', name: '오크 스카우트', level: 18, hp: 60, exp: 280, atk: 58, img: '/monster/orc_field/orc_scout.png', map: 'orc_forest' },
    { id: 'neruga_orc', name: '네루가 오크', level: 21, hp: 90, exp: 420, atk: 65, img: '/monster/orc_field/neruga_orc.png', map: 'orc_forest' },
    { id: 'rova_orc', name: '로바 오크', level: 22, hp: 100, exp: 450, atk: 68, img: '/monster/orc_field/rova_orc.png', map: 'orc_forest' },
    { id: 'atuba_orc', name: '아투바 오크', level: 23, hp: 115, exp: 500, atk: 72, img: '/monster/orc_field/atuba_orc.png', map: 'orc_forest' },
    { id: 'orc_wizard', name: '오크 마법사', level: 24, hp: 100, exp: 550, atk: 85, img: '/monster/orc_field/orc_wizard.png', map: 'orc_forest', isMagic: true, spellName: '파이어볼', spellType: 'fire' },
    { id: 'duda_mara_orc', name: '두다 마라 오크', level: 25, hp: 140, exp: 600, atk: 88, img: '/monster/orc_field/duda_mara_orc.png', map: 'orc_forest' },
    { id: 'gast', name: '가스트', level: 26, hp: 200, exp: 700, atk: 95, img: '/monster/orc_field/gast.png', map: 'orc_forest', isMagic: true },
    { id: 'gandi_orc', name: '간디오크', level: 20, hp: 80, exp: 380, atk: 62, img: '/monster/orc_field/gandi_orc.png', map: 'orc_forest' },
    { id: 'orc_zombie_dv', name: '오크 좀비', level: 45, hp: 350, exp: 1800, atk: 115, img: '/monster/dragon_valley/orc_zombie.png', map: 'orc_forest' },

    // 사막 (Desert)
    { id: 'giant_ant', name: '거대 개미', level: 26, hp: 350, exp: 650, atk: 105, img: '/monster/desert/giant_ant.png', map: 'desert', isMagic: true },
    { id: 'giant_soldier_ant', name: '거대 병정 개미', level: 30, hp: 450, exp: 950, atk: 115, img: '/monster/desert/giant_soldier_ant.png', map: 'desert' },
    { id: 'scorpion', name: '스콜피온', level: 34, hp: 600, exp: 1100, atk: 145, img: '/monster/desert/scorpion.png', map: 'desert', isLarge: true, isMagic: true, spellName: '맹독 가시', spellType: 'poison' },
    { id: 'black_knight_desert', name: '흑기사', level: 35, hp: 800, exp: 1200, atk: 135, img: '/monster/desert/black_knight.png', map: 'desert' },

    // 용의 계곡 (Dragon Valley)
    { id: 'skeleton_guard', name: '해골근위병', level: 35, hp: 850, exp: 1500, atk: 145, img: '/monster/dragon_valley/skeleton_guard.png', map: 'dragon_valley' },
    { id: 'skeleton_fighter_dv', name: '해골돌격병', level: 37, hp: 1000, exp: 1800, atk: 155, img: '/monster/dragon_valley/skeleton_fighter.png', map: 'dragon_valley' },
    { id: 'skeleton_archer_dv', name: '해골 궁수', level: 38, hp: 750, exp: 2000, atk: 140, img: '/monster/dragon_valley/skeleton_archer.png', map: 'dragon_valley' },
    { id: 'skeleton_sniper_dv', name: '해골저격병', level: 40, hp: 1150, exp: 2500, atk: 165, img: '/monster/dragon_valley/skeleton_sniper.png', map: 'dragon_valley' },
    { id: 'harpy', name: '하피', level: 32, hp: 600, exp: 900, atk: 135, img: '/monster/desert/harpy.png', map: 'dragon_valley', isMagic: true, spellName: '윈드 커터', spellType: 'wind' },
    { id: 'murian', name: '무리안', level: 28, hp: 650, exp: 800, atk: 115, img: '/monster/desert/murian.png', map: 'dragon_valley' },
    { id: 'ogre', name: '오우거', level: 52, hp: 1500, exp: 8000, atk: 220, img: '/monster/dragon_valley/ogre.png', map: 'dragon_valley', isLarge: true },
    { id: 'cyclops', name: '사이클롭스', level: 55, hp: 2200, exp: 12000, atk: 210, img: '/monster/dragon_valley/cyclops.png', map: 'dragon_valley', isLarge: true },
    { id: 'troll', name: '트롤', level: 50, hp: 1200, exp: 6500, atk: 195, img: '/monster/dragon_valley/troll.png', map: 'dragon_valley', isLarge: true },

    // 커츠의 방 (Hell)
    { id: 'kurz', name: '보스 커츠', level: 55, hp: 4500, exp: 50000, atk: 285, img: '/assets/kurz.png', map: 'hell', isLarge: true },
    
    // 바포메트의 방 (Baphomet Room)
    { id: 'baphomet', name: '보스 바포메트', level: 60, hp: 8000, exp: 80000, atk: 450, magicAtk: 135, img: '/assets/baphomet.png', map: 'baphomet_room', isMagic: true, spellName: '어스 퀘이크', spellType: 'earth', isLarge: true, isExtraLarge: true },
    
    // 수중 던전 (Underwater Dungeon)
    { id: 'lamia', name: '라미아', level: 45, hp: 600, exp: 12000, atk: 155, img: '/monster/underwater/라미아.png', map: 'water_dungeon', isMagic: true, spellName: '아이스 스파이크', spellType: 'water' },
    { id: 'merman', name: '머맨', level: 46, hp: 750, exp: 13500, atk: 165, img: '/monster/underwater/머맨.png', map: 'water_dungeon' },
    { id: 'shark', name: '상어', level: 48, hp: 1100, exp: 16000, atk: 195, img: '/monster/underwater/상어.png', map: 'water_dungeon', isLarge: true },
    { id: 'beholder', name: '비홀더', level: 47, hp: 850, exp: 15000, atk: 178, img: '/monster/underwater/비홀더.png', map: 'water_dungeon', isMagic: true, spellName: '석화 광선', spellType: 'earth' },
    { id: 'asthe', name: '아스테', level: 48, hp: 900, exp: 16500, atk: 182, img: '/monster/underwater/아스테.png', map: 'water_dungeon', isMagic: true, spellName: '워터 해저드', spellType: 'water' },
    { id: 'elekkadum', name: '일렉카둠', level: 50, hp: 1300, exp: 20000, atk: 215, img: '/monster/underwater/일렉카둠.png', map: 'water_dungeon', isMagic: true, spellName: '라이트닝 쇼크', spellType: 'electric' },
    { id: 'crabman', name: '크랩맨', level: 52, hp: 1600, exp: 25000, atk: 228, img: '/monster/underwater/크랩맨.png', map: 'water_dungeon' },
    { id: 'seadancer', name: '시댄서', level: 54, hp: 2200, exp: 32000, atk: 235, img: '/monster/underwater/시댄서.png', map: 'water_dungeon', isMagic: true },
    { id: 'crustacean', name: '크러스트시안', level: 55, hp: 3500, exp: 45000, atk: 265, img: '/monster/underwater/크러스터시안.png', map: 'water_dungeon', isLarge: true },
];

export const MAPS = [
    { id: 'village', name: '글루디오 마을', minLevel: 1, img: '/assets/maps/gludio_village.jpg' },
    { id: 'elf_village', name: '요정 마을', minLevel: 1, img: '/assets/maps/elf_village.png' },
    { id: 'talking_island', name: '말하는 섬 사냥터', minLevel: 1, img: '/maps/talking_island.png' },
    { id: 'dungeon', name: '글루디오 던전', minLevel: 15, img: '/maps/gludio_dungeon.png' },
    { id: 'orc_forest', name: '오크 숲', minLevel: 25, img: '/maps/orc_field.png' },
    { id: 'desert', name: '사막', minLevel: 35, img: '/maps/desert.png' },
    { id: 'dragon_valley', name: '용의 계곡', minLevel: 40, img: '/maps/dragon_valley.png' },
    { id: 'hell', name: '커츠의 방 (Hell)', minLevel: 55, img: '/maps/hell.png' },
    { id: 'baphomet_room', name: '바포메트의 방', minLevel: 60, img: '/maps/baphomet_room.png' },
    { id: 'water_dungeon', name: '수중 던전', minLevel: 50, img: '/maps/underwater.png' },
];
