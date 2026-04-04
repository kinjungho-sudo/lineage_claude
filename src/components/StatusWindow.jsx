import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import Tooltip from './Tooltip';
import { calculateStats, getRequiredExp, getMaxHp, getMaxMp } from '../mechanics/combat';

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);
    return isMobile;
};

const StatusWindow = () => {
    const { state, unequipItem, user, calculateAc, allocateStat } = useGame();
    const isMobile = useIsMobile();
    const [now, setNow] = useState(() => Date.now());
    useEffect(() => {
        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    const requiredExp = getRequiredExp(state.level);
    const { equipment } = state;


    // Paper doll positions (desktop only)
    const paperDollSlots = [
        { key: 'helm',     x: 120, y: 30,  label: '투구'   },
        { key: 'cloak',    x: 170, y: 70,  label: '망토'   },
        { key: 'shirt',    x: 120, y: 70,  label: '티셔츠' },
        { key: 'armor',    x: 120, y: 120, label: '갑옷'   },
        { key: 'gloves',   x: 70,  y: 160, label: '장갑'   },
        { key: 'boots',    x: 170, y: 160, label: '부츠'   },
        { key: 'weapon',   x: 70,  y: 90,  label: '무기'   },
        { key: 'shield',   x: 170, y: 110, label: '방패'   },
        { key: 'belt',     x: 120, y: 160, label: '벨트'   },
        { key: 'necklace', x: 170, y: 30,  label: '목걸이' },
        { key: 'ring_l',   x: 70,  y: 200, label: '반지'   },
        { key: 'ring_r',   x: 170, y: 200, label: '반지'   },
    ];

    const totalAc = calculateAc();
    const stats = calculateStats(state);
    const { str: totalStr, dex: totalDex, con: totalCon, int: totalInt, wis: totalWis, accuracy } = stats;

    const totalAllocated = (state.allocatedStr || 0) + (state.allocatedDex || 0) +
        (state.allocatedCon || 0) + (state.allocatedInt || 0) + (state.allocatedWis || 0);
    const availablePoints = Math.max(0, state.level - 50) - totalAllocated;

    // MP 재생: WIS 기반 (모든 클래스) + 레벨 기반 + 장비 보너스
    const mpRegen = 5 + Math.max(0, Math.floor(state.level / 12) + (totalWis - 12)) + (stats.mpRegenBonus || 0);
    // MR: WIS 기반 (마법 저항력) + 장비 보너스 / INT는 마법 공격력에만 사용
    const mr = 10 + Math.floor(totalWis / 2) + (stats.mrBonus || 0);
    const maxHp = getMaxHp(state, stats);
    const maxMp = getMaxMp(state, stats);
    const isElf = state.characterClass === 'elf';
    const baseBonus = isElf ? (totalDex * 0.2 + state.level / 12) : (totalStr / 3 + state.level / 10);
    const fixedBonus = (stats.weaponEnchant || 0) + Math.floor(baseBonus);
    const universalAtk = stats.smallAtk + fixedBonus;
    const expPct = ((state.currentExp / requiredExp) * 100).toFixed(3);

    // ── Mobile compact layout ──────────────────────────────────────────────
    if (isMobile) {
        return (
            <div className="w-full bg-[#1a1a1a] select-none font-sans text-xs text-[#aaa]">
                {/* Header */}
                <div className="px-3 py-2 bg-[#222] border-b border-[#333] flex justify-between items-center">
                    <span className="text-[#a59c77] font-bold tracking-wider uppercase text-[11px]">
                        {isElf ? 'ELF' : 'KNIGHT'}
                    </span>
                    <span className="text-white font-bold">{state.characterName || user?.nickname || 'Unknown'}</span>
                    <span className="text-[#d4af37] font-bold">Lv.{state.level}</span>
                </div>

                {/* HP / MP bars */}
                <div className="px-3 py-2 border-b border-[#2a2a2a] space-y-1.5">
                    <div>
                        <div className="flex justify-between mb-0.5">
                            <span className="text-red-400 font-bold">HP</span>
                            <span className="text-red-300 font-mono">{state.hp} / {maxHp}</span>
                        </div>
                        <div className="h-2 bg-gray-900 rounded overflow-hidden border border-gray-800">
                            <div className="h-full bg-gradient-to-r from-red-900 to-red-500 transition-all" style={{ width: `${Math.min(100, (state.hp / maxHp) * 100)}%` }} />
                        </div>
                    </div>
                    <div>
                        <div className="flex justify-between mb-0.5">
                            <span className="text-blue-400 font-bold">MP</span>
                            <span className="text-blue-300 font-mono">{state.mp} / {maxMp} <span className="text-[#555]">(+{mpRegen})</span></span>
                        </div>
                        <div className="h-2 bg-gray-900 rounded overflow-hidden border border-gray-800">
                            <div className="h-full bg-gradient-to-r from-blue-900 to-blue-500 transition-all" style={{ width: `${Math.min(100, (state.mp / maxMp) * 100)}%` }} />
                        </div>
                    </div>
                </div>

                {/* Core stats grid */}
                <div className="px-3 py-2 border-b border-[#2a2a2a] grid grid-cols-2 gap-x-6 gap-y-1">
                    {[
                        ['AC', <span className="text-green-300">{totalAc - 10}</span>],
                        ['MR', <span>{mr}%</span>],
                        ['STR', <span className="text-white">{totalStr}{availablePoints > 0 && <button onClick={() => allocateStat('str')} className="ml-1 px-1 bg-yellow-700 text-white text-[8px] rounded">+</button>}</span>],
                        ['DEX', <span className="text-white">{totalDex}{availablePoints > 0 && <button onClick={() => allocateStat('dex')} className="ml-1 px-1 bg-yellow-700 text-white text-[8px] rounded">+</button>}</span>],
                        ['CON', <span className="text-white">{totalCon}{availablePoints > 0 && <button onClick={() => allocateStat('con')} className="ml-1 px-1 bg-yellow-700 text-white text-[8px] rounded">+</button>}</span>],
                        ['INT', <span className="text-white">{totalInt}{availablePoints > 0 && <button onClick={() => allocateStat('int')} className="ml-1 px-1 bg-yellow-700 text-white text-[8px] rounded">+</button>}</span>],
                        ['WIS', <span className="text-white">{totalWis}{availablePoints > 0 && <button onClick={() => allocateStat('wis')} className="ml-1 px-1 bg-yellow-700 text-white text-[8px] rounded">+</button>}</span>],
                        ['명중', <span className={accuracy >= 100 ? 'text-green-400' : 'text-orange-400'}>{accuracy}/100</span>],
                        ['회피', <span className="text-blue-300">{stats.evasion || 0}</span>],
                        ['ATK', <span className="text-orange-300">{universalAtk}</span>],
                    ].map(([label, val]) => (
                        <div key={label} className="flex justify-between">
                            <span className="text-[#a59c77]">{label}</span>
                            <span>{val}</span>
                        </div>
                    ))}
                </div>

                {/* EXP */}
                <div className="px-3 py-2 border-b border-[#2a2a2a]">
                    <div className="flex justify-between mb-0.5">
                        <span className="text-[#666]">EXP  Lv.{state.level}</span>
                        <span className="text-white font-mono">{expPct}%</span>
                    </div>
                    <div className="h-1.5 bg-black rounded overflow-hidden border border-[#222]">
                        <div className="h-full bg-gradient-to-r from-purple-800 to-purple-400 transition-all" style={{ width: `${Math.min(100, (state.currentExp / requiredExp) * 100)}%` }} />
                    </div>
                    {availablePoints > 0 && (
                        <div className="mt-1 text-center text-[10px] text-yellow-500">
                            스탯 포인트 <span className="font-bold">{availablePoints}</span>개 남음
                        </div>
                    )}
                </div>

                {/* Paper Doll — 수평 중앙 정렬: 슬롯 범위 x=70~214 → 중심 x=142 */}
                <div className="relative bg-[#151515] border-t border-[#333]" style={{ height: '260px' }}>
                    <div className="absolute inset-0 opacity-10 pointer-events-none flex justify-center items-center">
                        <svg width="200" height="200" viewBox="0 0 200 200" fill="#333">
                            <path d="M100 20 L130 50 L120 150 L100 180 L80 150 L70 50 Z" />
                        </svg>
                    </div>
                    {/* 가운데 정렬 래퍼: left=50% 기준으로 슬롯 중심(142px)만큼 왼쪽 이동 */}
                    <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-142px)' }}>
                        {paperDollSlots.map(({ key, x, y, label }) => {
                            const item = equipment[key];
                            return (
                                <div key={key}
                                    className="absolute flex items-center justify-center border border-[#333] bg-black/40 active:border-[#a59c77] transition-colors overflow-hidden"
                                    style={{ left: x, top: y, width: 44, height: 44 }}
                                    onClick={() => item && unequipItem(item)}
                                >
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        {item ? (
                                            <Tooltip item={item}>
                                                <>
                                                    <img src={item.image} alt={item.name} className="w-10 h-10 object-contain p-1" />
                                                    {item.enchant > 0 && (
                                                        <span className="absolute bottom-0 right-0.5 text-[10px] text-[#00ff00] font-bold leading-none">+{item.enchant}</span>
                                                    )}
                                                </>
                                            </Tooltip>
                                        ) : (
                                            <span className="text-[9px] text-[#444]">{label}</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        );
    }

    // ── Desktop layout (original) ──────────────────────────────────────────
    return (
        <div className="w-full bg-[#1a1a1a] relative select-none flex flex-col font-sans">
            {/* Status Header */}
            <div className="p-2 border-b border-[#333] flex justify-between items-end bg-[#222]">
                <div className="flex flex-col">
                    <span className="text-[#a59c77] font-bold text-sm tracking-wider uppercase">
                        {isElf ? 'ELF' : 'KNIGHT'}
                    </span>
                    <span className="text-white text-xs">{state.characterName || user?.nickname || 'Unknown'}</span>
                </div>
                <div className="text-right">
                    <div className="text-[#d4af37] font-bold text-sm">Lv.{state.level}</div>
                    <div className="text-[10px] text-[#888]">Lawful</div>
                </div>
            </div>

            {/* Paper Doll Section */}
            <div className="h-[260px] relative bg-[#151515] border-b border-[#3f3f3f]">
                <div className="absolute inset-0 opacity-10 pointer-events-none flex justify-center items-center">
                    <svg width="200" height="200" viewBox="0 0 200 200" fill="#333">
                        <path d="M100 20 L130 50 L120 150 L100 180 L80 150 L70 50 Z" />
                    </svg>
                </div>

                {/* 가운데 정렬 래퍼 */}
                <div style={{ position: 'absolute', left: '50%', top: 0, transform: 'translateX(-142px)' }}>
                    {paperDollSlots.map(({ key, x, y, label }) => {
                        const item = equipment[key];
                        return (
                            <div key={key}
                                className="absolute flex items-center justify-center border border-[#333] bg-black/40 hover:border-[#555] transition-colors overflow-hidden group"
                                style={{ left: x, top: y, width: 44, height: 44 }}
                                onClick={() => item && unequipItem(item)}
                            >
                                <div className="relative w-full h-full flex items-center justify-center">
                                    {item ? (
                                        <Tooltip item={item}>
                                            <>
                                                <img src={item.image} alt={item.name} className="w-10 h-10 object-contain p-1 group-hover:scale-110 transition-transform" />
                                                {item.enchant > 0 && (
                                                    <span className="absolute bottom-0 right-0.5 text-[10px] text-[#00ff00] font-bold text-shadow-sm">+{item.enchant}</span>
                                                )}
                                            </>
                                        </Tooltip>
                                    ) : (
                                        <span className="text-[9px] text-[#444]">{label}</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Stats Table (Classic Look) */}
            <div className="flex-1 bg-[#1a1a1a] p-2 text-xs text-[#aaa]">
                <table className="w-full">
                    <tbody>
                        <tr>
                            <td className="text-[#a59c77]">HP</td>
                            <td className="text-right text-red-300 font-bold whitespace-nowrap">
                                {state.hp}
                                <span className="text-[10px] text-[#666] font-normal ml-0.5">/ {maxHp}</span>
                                {stats.hpRegenBonus > 0 && (
                                    <span className="text-[#00ff00] text-[9px] ml-1">(Regen +{stats.hpRegenBonus})</span>
                                )}
                            </td>
                            <td className="w-4"></td>
                            <td className="text-[#a59c77]">MP</td>
                            <td className="text-right text-blue-300 font-bold">{state.mp} / {maxMp} <span className="text-[#555] font-normal">(+{mpRegen})</span></td>
                        </tr>
                        <tr>
                            <td className="text-[#a59c77]">AC</td>
                            <td className="text-right text-green-300">
                                {totalAc - 10}
                                {Object.values(equipment).filter(i => i?.stats?.set === 'steel').length >= 5 && (
                                    <span className="text-[9px] text-yellow-400 block leading-none">(Set -3)</span>
                                )}
                                {Object.values(equipment).filter(i => i?.stats?.set === 'kurz').length >= 4 && (
                                    <span className="text-[9px] text-purple-400 block leading-none mt-0.5">(Kurz -4)</span>
                                )}
                            </td>
                            <td></td>
                            <td className="text-[#a59c77]">MR</td>
                            <td className="text-right">{mr}%</td>
                        </tr>
                        <tr><td colSpan={5} className="h-2"></td></tr>
                        <tr>
                            <td>STR</td>
                            <td className="text-right text-white whitespace-nowrap">
                                {totalStr}
                                {state.combatState?.magicHelmStrEndTime && now < state.combatState.magicHelmStrEndTime && (
                                    <span className="text-blue-400 text-[9px] ml-1 font-bold animate-pulse">[MIGHTY]</span>
                                )}
                                {availablePoints > 0 && (
                                    <button onClick={() => allocateStat('str')} className="ml-1 px-1 bg-yellow-700 hover:bg-yellow-600 text-white text-[9px] rounded leading-none">+</button>
                                )}
                            </td>
                            <td></td>
                            <td>DEX</td>
                            <td className="text-right text-white whitespace-nowrap">
                                {totalDex}
                                {availablePoints > 0 && (
                                    <button onClick={() => allocateStat('dex')} className="ml-1 px-1 bg-yellow-700 hover:bg-yellow-600 text-white text-[9px] rounded leading-none">+</button>
                                )}
                            </td>
                        </tr>
                        <tr>
                            <td>CON</td>
                            <td className="text-right text-white whitespace-nowrap">
                                {totalCon}
                                {availablePoints > 0 && (
                                    <button onClick={() => allocateStat('con')} className="ml-1 px-1 bg-yellow-700 hover:bg-yellow-600 text-white text-[9px] rounded leading-none">+</button>
                                )}
                            </td>
                            <td></td>
                            <td>INT</td>
                            <td className="text-right text-white whitespace-nowrap">
                                {totalInt}
                                {availablePoints > 0 && (
                                    <button onClick={() => allocateStat('int')} className="ml-1 px-1 bg-yellow-700 hover:bg-yellow-600 text-white text-[9px] rounded leading-none">+</button>
                                )}
                            </td>
                        </tr>
                        <tr>
                            <td>WIS</td>
                            <td className="text-right text-white whitespace-nowrap">
                                {totalWis}
                                {availablePoints > 0 && (
                                    <button onClick={() => allocateStat('wis')} className="ml-1 px-1 bg-yellow-700 hover:bg-yellow-600 text-white text-[9px] rounded leading-none">+</button>
                                )}
                            </td>
                            <td></td>
                            <td>명중</td>
                            <td className="text-right font-bold whitespace-nowrap">
                                {accuracy >= 100 ? (
                                    <span className="text-green-400">
                                        {accuracy}
                                        <span className="text-[9px] text-yellow-400 ml-1">(공속+{Math.floor((accuracy - 100) / 5) * 25}ms)</span>
                                    </span>
                                ) : (
                                    <span className="text-orange-400">{accuracy}<span className="text-[#555] font-normal">/100</span></span>
                                )}
                            </td>
                        </tr>
                        <tr>
                            <td>회피</td><td className="text-right text-blue-300 font-bold">{stats.evasion || 0}</td>
                            <td></td><td></td><td></td>
                        </tr>
                        <tr>
                            <td className="text-[#a59c77]">Atk</td>
                            <td className="text-right text-orange-300 font-bold whitespace-nowrap">
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-1">
                                        <span className="text-[9px] text-[#888]">공격력</span>
                                        <span>{universalAtk}</span>
                                    </div>
                                    <div className="text-[9px] text-[#555] mt-0.5 leading-none">
                                        기본:{stats.smallAtk}/보너스:{fixedBonus}
                                    </div>
                                </div>
                                {state.combatState?.bravePotionEndTime && now < state.combatState.bravePotionEndTime && (
                                    <span className="text-[9px] text-red-500 ml-1 block leading-none mt-0.5 font-bold animate-pulse">[가속]</span>
                                )}
                            </td>
                            <td></td>
                            <td className="text-[#a59c77]">EXP</td>
                            <td className="text-right text-white italic">{expPct}%</td>
                        </tr>
                    </tbody>
                </table>

                {state.level > 50 && (
                    <div className="mt-1 text-center text-[10px] text-yellow-500">
                        스탯 포인트: <span className="font-bold">{availablePoints}</span> 남음
                        <span className="text-[#666] ml-1">(STR:{state.allocatedStr||0} DEX:{state.allocatedDex||0} CON:{state.allocatedCon||0} INT:{state.allocatedInt||0} WIS:{state.allocatedWis||0})</span>
                    </div>
                )}

                <div className="mt-2 border-t border-[#333] pt-1">
                    <div className="flex justify-between text-[10px]">
                        <span>EXP</span>
                        <span>{expPct}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatusWindow;
