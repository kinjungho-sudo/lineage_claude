// balanceConfig.js — 전투/밸런스 상수 중앙 관리
// combat.js의 CONFIG 객체 및 공식 파라미터를 export 형태로 재구성

export const CONFIG = {
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

// 명중/회피 공식 파라미터
export const HIT_CHANCE_MAX = 0.95;
export const HIT_CHANCE_MIN = 0.35;
export const MONSTER_EVASION_BASE = 15;
export const PLAYER_ACCURACY_BASE = 20;

// 무기 인챈트 크리티컬 파라미터
export const WEAPON_ENCHANT_CRIT_THRESHOLD = 7;
export const WEAPON_ENCHANT_CRIT_CHANCE = 0.3;

// 사망 패널티
export const DEATH_EXP_PENALTY_RATE = 0.05;

// 레벨 상한
export const MAX_LEVEL = 80;

// 공격 속도
export const ATTACK_INTERVAL_BASE_MS = 1500;
export const BRAVE_SPEED_KNIGHT = 1.5;
export const BRAVE_SPEED_ELF = 1.3;
export const HASTE_SPEED_MULTIPLIER = 1.6;

// 직업별 기본 스탯
export const CLASS_BASE_STATS = {
    knight: { str: 18, dex: 12, con: 14, int: 8,  wis: 9  },
    elf:    { str: 10, dex: 18, con: 12, int: 8,  wis: 10 },
    wizard: { str: 8,  dex: 8,  con: 8,  int: 18, wis: 18 },
};
