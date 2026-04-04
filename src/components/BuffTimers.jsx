import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { GAME_ACTIONS } from '../constants/gameActions';

const fmt = (ms) => {
    const s = Math.max(0, Math.ceil(ms / 1000));
    const m = Math.floor(s / 60);
    return `${m}:${(s % 60).toString().padStart(2, '0')}`;
};

const BuffEntry = ({ icon, label, stat, color, glow, endTime, now, onCancel, pulse = true }) => {
    if (!endTime || endTime <= now) return null;
    return (
        <div
            className={`flex items-center gap-1.5 bg-black/75 px-2.5 py-1.5 rounded-full border ${color} ${glow} ${pulse ? 'animate-pulse' : ''} ${onCancel ? 'pointer-events-auto cursor-pointer' : ''} transition-colors`}
            onClick={onCancel}
            title={onCancel ? '클릭 시 버프 취소' : label}
        >
            {icon.startsWith('/') ? (
                <img src={icon} alt={label} className="w-7 h-7 object-contain rounded border border-white/20 flex-shrink-0" />
            ) : (
                <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs overflow-hidden border-2 ${icon}`}>
                    {label.slice(0, 1)}
                </div>
            )}
            <span className={`font-mono text-sm font-bold tracking-wider ${color.replace('border-', 'text-').split('/')[0]}`}>
                {fmt(endTime - now)}
            </span>
            {stat && <span className={`text-xs font-bold opacity-80 ${color.replace('border-', 'text-').split('/')[0]}`}>{stat}</span>}
        </div>
    );
};

const BuffTimers = () => {
    const { state, dispatch } = useGame();
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(t);
    }, []);

    const cs = state.combatState || {};
    const isElf = state.characterClass === 'elf';
    const isWizard = state.characterClass === 'wizard';

    return (
        <div className="absolute top-2 right-2 md:right-[450px] z-20 pointer-events-none flex flex-row gap-1.5 flex-wrap justify-end">

            {/* ── 초록 물약 (가속) ─────────────────────────────── */}
            {cs.hasteEndTime > now && (
                <div
                    className="flex items-center gap-1.5 bg-black/75 px-2.5 py-1.5 rounded-full border border-green-700/60 shadow-[0_0_8px_rgba(0,200,0,0.5)] animate-pulse pointer-events-auto cursor-pointer"
                    onClick={() => dispatch({ type: GAME_ACTIONS.CANCEL_BUFF, payload: 'haste' })}
                    title="클릭 시 버프 취소"
                >
                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-black text-green-100 text-xs border-2 border-green-400 bg-green-800 shadow-[0_0_8px_#00ff00] italic">&gt;&gt;</div>
                    <span className="text-green-400 font-mono text-sm font-bold tracking-wider">{fmt(cs.hasteEndTime - now)}</span>
                </div>
            )}

            {/* ── 용기의 물약 ──────────────────────────────────── */}
            {cs.bravePotionEndTime > now && (
                <div
                    className={`flex items-center gap-1.5 bg-black/75 px-2.5 py-1.5 rounded-full border animate-pulse pointer-events-auto cursor-pointer ${isElf ? 'border-yellow-600/60 shadow-[0_0_8px_rgba(200,180,0,0.5)]' : 'border-purple-600/60 shadow-[0_0_8px_rgba(140,0,220,0.5)]'}`}
                    onClick={() => dispatch({ type: GAME_ACTIONS.CANCEL_BUFF, payload: 'brave' })}
                    title="클릭 시 버프 취소"
                >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-base border-2 italic ${isElf ? 'text-yellow-100 border-yellow-400 bg-yellow-700' : 'text-purple-100 border-purple-400 bg-purple-800'}`}>!</div>
                    <span className={`font-mono text-sm font-bold tracking-wider ${isElf ? 'text-yellow-300' : 'text-purple-300'}`}>{fmt(cs.bravePotionEndTime - now)}</span>
                </div>
            )}

            {/* ── 마법 투구 STR 버프 ────────────────────────────── */}
            {cs.magicHelmStrEndTime > now && (
                <div className="flex items-center gap-1.5 bg-black/75 px-2.5 py-1.5 rounded-full border border-yellow-700/60 shadow-[0_0_8px_rgba(212,175,55,0.4)] animate-pulse pointer-events-auto">
                    <img src="/assets/skill_enchant_mighty.png" alt="마법 투구" className="w-7 h-7 object-contain rounded border border-yellow-600/40" />
                    <span className="text-yellow-400 font-mono text-sm font-bold tracking-wider">{fmt(cs.magicHelmStrEndTime - now)}</span>
                    <span className="text-yellow-300 text-xs font-bold">STR+5</span>
                </div>
            )}

            {/* ── 바운스 어택 ──────────────────────────────────── */}
            {cs.bounceAttackEndTime > now && (
                <div className="flex items-center gap-1.5 bg-black/75 px-2.5 py-1.5 rounded-full border border-orange-700/60 shadow-[0_0_8px_rgba(255,100,0,0.4)] animate-pulse pointer-events-auto">
                    <img src="/assets/skill_bounce_attack.png" alt="바운스 어택" className="w-7 h-7 object-contain rounded border border-orange-600/40" />
                    <span className="text-orange-400 font-mono text-sm font-bold tracking-wider">{fmt(cs.bounceAttackEndTime - now)}</span>
                    <span className="text-orange-300 text-xs font-bold">ATK+10</span>
                </div>
            )}

            {/* ── 마나 회복 물약 ────────────────────────────────── */}
            {cs.mpRegenPotionEndTime > now && (
                <div className="flex items-center gap-1.5 bg-black/75 px-2.5 py-1.5 rounded-full border border-sky-600/60 shadow-[0_0_8px_rgba(0,150,255,0.4)] animate-pulse pointer-events-auto">
                    <img src="/assets/마나 회복 물약.png" alt="마나 회복 물약" className="w-7 h-7 object-contain rounded border border-sky-500/40" />
                    <span className="text-sky-300 font-mono text-sm font-bold tracking-wider">{fmt(cs.mpRegenPotionEndTime - now)}</span>
                    <span className="text-sky-200 text-xs font-bold">MP회복↑</span>
                </div>
            )}

            {/* ════ 마법사 전용 버프 ═══════════════════════════════ */}

            {/* 실드 (AC -3) */}
            {isWizard && cs.wizardShieldEndTime > now && (
                <div className="flex items-center gap-1.5 bg-black/75 px-2.5 py-1.5 rounded-full border border-blue-600/60 shadow-[0_0_8px_rgba(60,120,255,0.4)] animate-pulse pointer-events-auto">
                    <img src="/assets/실드.png" alt="실드" className="w-7 h-7 object-contain rounded border border-blue-500/40" />
                    <span className="text-blue-300 font-mono text-sm font-bold tracking-wider">{fmt(cs.wizardShieldEndTime - now)}</span>
                    <span className="text-blue-200 text-xs font-bold">AC-3</span>
                </div>
            )}

            {/* 메디테이션 (MP 회복↑↑) */}
            {isWizard && cs.meditationEndTime > now && (
                <div className="flex items-center gap-1.5 bg-black/75 px-2.5 py-1.5 rounded-full border border-indigo-600/60 shadow-[0_0_8px_rgba(100,80,255,0.4)] animate-pulse pointer-events-auto">
                    <img src="/assets/마력서.png" alt="메디테이션" className="w-7 h-7 object-contain rounded border border-indigo-500/40" />
                    <span className="text-indigo-300 font-mono text-sm font-bold tracking-wider">{fmt(cs.meditationEndTime - now)}</span>
                    <span className="text-indigo-200 text-xs font-bold">MP↑↑</span>
                </div>
            )}

            {/* 버스커스 (ATK+5 / AC+5 패널티) */}
            {isWizard && cs.berserkerEndTime > now && (
                <div className="flex items-center gap-1.5 bg-black/75 px-2.5 py-1.5 rounded-full border border-red-600/60 shadow-[0_0_8px_rgba(220,50,50,0.4)] animate-pulse pointer-events-auto">
                    <img src="/assets/버서커스.png" alt="버스커스" className="w-7 h-7 object-contain rounded border border-red-500/40" />
                    <span className="text-red-400 font-mono text-sm font-bold tracking-wider">{fmt(cs.berserkerEndTime - now)}</span>
                    <span className="text-red-300 text-xs font-bold">ATK+5</span>
                </div>
            )}

            {/* 서먼 몬스터 (ATK+15) */}
            {isWizard && cs.summonMonsterEndTime > now && (
                <div className="flex items-center gap-1.5 bg-black/75 px-2.5 py-1.5 rounded-full border border-violet-600/60 shadow-[0_0_8px_rgba(160,80,255,0.4)] animate-pulse pointer-events-auto">
                    <img src="/assets/서먼 몬스터.png" alt="서먼 몬스터" className="w-7 h-7 object-contain rounded border border-violet-500/40" />
                    <span className="text-violet-300 font-mono text-sm font-bold tracking-wider">{fmt(cs.summonMonsterEndTime - now)}</span>
                    <span className="text-violet-200 text-xs font-bold">ATK+15</span>
                </div>
            )}

            {/* ════ 파티 공유 버프 (마법사 시전, 전 클래스 적용) ══ */}

            {/* 인챈트 웨폰 (ATK+3) */}
            {cs.enchantWeaponEndTime > now && (
                <div className="flex items-center gap-1.5 bg-black/75 px-2.5 py-1.5 rounded-full border border-orange-500/60 shadow-[0_0_8px_rgba(255,140,0,0.4)] animate-pulse pointer-events-auto">
                    <img src="/assets/인챈트 웨폰.png" alt="인챈트 웨폰" className="w-7 h-7 object-contain rounded border border-orange-400/40" />
                    <span className="text-orange-300 font-mono text-sm font-bold tracking-wider">{fmt(cs.enchantWeaponEndTime - now)}</span>
                    <span className="text-orange-200 text-xs font-bold">ATK+3</span>
                </div>
            )}

            {/* 블레스드 아머 (AC-3) */}
            {cs.blessedArmorEndTime > now && (
                <div className="flex items-center gap-1.5 bg-black/75 px-2.5 py-1.5 rounded-full border border-cyan-600/60 shadow-[0_0_8px_rgba(0,200,220,0.4)] animate-pulse pointer-events-auto">
                    <img src="/assets/블레스 웨폰.png" alt="블레스드 아머" className="w-7 h-7 object-contain rounded border border-cyan-500/40" />
                    <span className="text-cyan-300 font-mono text-sm font-bold tracking-wider">{fmt(cs.blessedArmorEndTime - now)}</span>
                    <span className="text-cyan-200 text-xs font-bold">AC-3</span>
                </div>
            )}

            {/* 인챈트 덱스터리 (DEX+5) */}
            {cs.enchantDexEndTime > now && (
                <div className="flex items-center gap-1.5 bg-black/75 px-2.5 py-1.5 rounded-full border border-teal-600/60 shadow-[0_0_8px_rgba(0,200,160,0.4)] animate-pulse pointer-events-auto">
                    <img src="/assets/인챈트 덱스터리.png" alt="인챈트 덱스터리" className="w-7 h-7 object-contain rounded border border-teal-500/40" />
                    <span className="text-teal-300 font-mono text-sm font-bold tracking-wider">{fmt(cs.enchantDexEndTime - now)}</span>
                    <span className="text-teal-200 text-xs font-bold">DEX+5</span>
                </div>
            )}

            {/* 인챈트 마이티 (STR+5) */}
            {cs.enchantMightyEndTime > now && (
                <div className="flex items-center gap-1.5 bg-black/75 px-2.5 py-1.5 rounded-full border border-yellow-500/60 shadow-[0_0_8px_rgba(220,180,0,0.4)] animate-pulse pointer-events-auto">
                    <img src="/assets/인챈트 마이티.png" alt="인챈트 마이티" className="w-7 h-7 object-contain rounded border border-yellow-400/40" />
                    <span className="text-yellow-300 font-mono text-sm font-bold tracking-wider">{fmt(cs.enchantMightyEndTime - now)}</span>
                    <span className="text-yellow-200 text-xs font-bold">STR+5</span>
                </div>
            )}

            {/* ── 보스 리스폰 타이머 ────────────────────────────── */}
            {cs.kurzRespawnTime > now && (
                <div className="flex items-center gap-1.5 bg-black/80 px-2.5 py-1.5 rounded border border-red-900 shadow-[0_0_8px_rgba(255,0,0,0.4)] pointer-events-auto">
                    <span className="text-red-500 font-bold text-xs whitespace-nowrap">커츠 리스폰</span>
                    <span className="text-red-400 font-mono text-sm font-bold tracking-wider">{fmt(cs.kurzRespawnTime - now)}</span>
                </div>
            )}
            {cs.baphometRespawnTime > now && (
                <div className="flex items-center gap-1.5 bg-black/80 px-2.5 py-1.5 rounded border border-orange-900 shadow-[0_0_8px_rgba(255,165,0,0.4)] pointer-events-auto">
                    <span className="text-orange-500 font-bold text-xs whitespace-nowrap">바포메트 리스폰</span>
                    <span className="text-orange-400 font-mono text-sm font-bold tracking-wider">{fmt(cs.baphometRespawnTime - now)}</span>
                </div>
            )}
        </div>
    );
};

export default BuffTimers;
