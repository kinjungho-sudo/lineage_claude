import React from 'react';
import { useGame } from '../context/GameContext';
import Tooltip from './Tooltip';
import { calculateStats, getRequiredExp, getMaxHp, getMaxMp } from '../mechanics/combat';

const StatusWindow = () => {
    const { state, unequipItem, user, calculateAc, allocateStat } = useGame();
    
    const requiredExp = getRequiredExp(state.level);
    const { equipment } = state;

    // Classic Lineage 1 Style "Paper Doll" positions (approximate)
    // Based on 280x300 grid of the window.
    const slots = [
        { key: 'helm', x: 120, y: 30, label: '투구' },
        { key: 'cloak', x: 170, y: 70, label: '망토' },
        { key: 'shirt', x: 120, y: 70, label: '티셔츠' },
        { key: 'armor', x: 120, y: 120, label: '갑옷' },
        { key: 'gloves', x: 70, y: 160, label: '장갑' },
        { key: 'boots', x: 170, y: 160, label: '부츠' },
        { key: 'weapon', x: 70, y: 90, label: '무기' },
        { key: 'shield', x: 170, y: 110, label: '방패' },
        { key: 'belt', x: 120, y: 160, label: '벨트' }, // Added Belt Slot (Center Bottom)
        { key: 'necklace', x: 170, y: 30, label: '목걸이' }, // Added Necklace Slot
        { key: 'ring_l', x: 70, y: 200, label: '반지' }, // [New] 반지(좌)
        { key: 'ring_r', x: 170, y: 200, label: '반지' }, // [New] 반지(우)
    ];

    const totalAc = calculateAc();

    // Calculate Stats
    const stats = calculateStats(state);
    // Calculate Base Stats (Class: Knight)
    const baseStr = 16 + Math.floor(state.level / 10);
    const totalStr = baseStr + (stats.str || 0) + (state.allocatedStr || 0);

    const baseDex = 13 + Math.floor(state.level / 12);
    const totalDex = baseDex + (stats.dex || 0);

    const baseCon = 18 + Math.floor(state.level / 15);
    const totalCon = baseCon + (stats.con || 0) + (state.allocatedCon || 0);

    // [스탯 시스템] 50레벨 이후 남은 포인트 계산
    const totalAllocated = (state.allocatedStr || 0) + (state.allocatedCon || 0);
    const availablePoints = Math.max(0, state.level - 50) - totalAllocated;

    const baseInt = 8;
    const totalInt = baseInt + (stats.int || 0);

    const baseWis = 9 + Math.floor(state.level / 12);
    const totalWis = baseWis + (stats.wis || 0);

    const baseCha = 12;
    const totalCha = baseCha + (stats.cha || 0);

    // Derived Stats
    const mpRegen = 5 + Math.max(0, (totalWis - 12) * 1);
    // [New] 아이템 MR 보너스 합산 반영
    const mr = 10 + Math.floor(totalWis / 2) + Math.floor(totalInt / 2) + (stats.mrBonus || 0);

    return (
        <div className="w-full h-full bg-[#1a1a1a] relative select-none flex flex-col font-sans">
            {/* Status Header */}
            <div className="p-2 border-b border-[#333] flex justify-between items-end bg-[#222]">
                <div className="flex flex-col">
                    <span className="text-[#a59c77] font-bold text-sm tracking-wider uppercase">Knight</span>
                    <span className="text-white text-xs">{user?.nickname || user?.id || 'Unknown'}</span>
                </div>
                <div className="text-right">
                    <div className="text-[#d4af37] font-bold text-sm">Lv.{state.level}</div>
                    <div className="text-[10px] text-[#888]">Lawful</div>
                </div>
            </div>

            {/* Paper Doll Section - 높이를 확장(260px)하여 전체 슬롯 수용 */}
            <div className="h-[260px] relative bg-[#151515] border-b border-[#3f3f3f]">
                {/* Silhouette Background (CSS Grid or similar) */}
                <div className="absolute inset-0 opacity-10 pointer-events-none flex justify-center items-center">
                    {/* Placeholder for character outline */}
                    <svg width="200" height="200" viewBox="0 0 200 200" fill="#333">
                        <path d="M100 20 L130 50 L120 150 L100 180 L80 150 L70 50 Z" />
                    </svg>
                </div>

                {slots.map(({ key, x, y, label }) => {
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

            {/* Stats Table (Classic Look) */}
            <div className="flex-1 bg-[#1a1a1a] p-2 text-xs text-[#aaa]">
                <table className="w-full">
                    <tbody>
                        <tr>
                            <td className="text-[#a59c77]">HP</td>
                            <td className="text-right text-red-300 font-bold whitespace-nowrap">
                                {state.hp}
                                <span className="text-[10px] text-[#666] font-normal ml-0.5">/ {getMaxHp(state, stats)}</span>
                                {stats.hpRegenBonus > 0 && (
                                    <span className="text-[#00ff00] text-[9px] ml-1">(Regen +{stats.hpRegenBonus})</span>
                                )}
                            </td>
                            <td className="w-4"></td>
                            <td className="text-[#a59c77]">MP</td>
                            <td className="text-right text-blue-300 font-bold">{state.mp} / {getMaxMp(state, stats)} <span className="text-[#555] font-normal">(+{mpRegen})</span></td>
                        </tr>
                        <tr>
                            <td className="text-[#a59c77]">AC</td>
                            <td className="text-right text-green-300">
                                {totalAc}
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
                        <tr>
                            <td colSpan={5} className="h-2"></td>
                        </tr>
                        <tr>
                            <td>STR</td>
                            <td className="text-right text-white whitespace-nowrap">
                                {totalStr}
                                {stats.str > 0 && <span className="text-[#00ff00] text-[9px]"> (+{stats.str})</span>}
                                {(state.allocatedStr || 0) > 0 && <span className="text-yellow-400 text-[9px]"> (+{state.allocatedStr})</span>}
                                {state.combatState?.magicHelmStrEndTime && Date.now() < state.combatState.magicHelmStrEndTime && (
                                    <span className="text-blue-400 text-[9px] ml-1 font-bold animate-pulse" title="마법 투구 (힘) 효과">[마법+3]</span>
                                )}
                                {availablePoints > 0 && (
                                    <button onClick={() => allocateStat('str')} className="ml-1 px-1 bg-yellow-700 hover:bg-yellow-600 text-white text-[9px] rounded leading-none" title="STR +1 (공격력 증가)">+</button>
                                )}
                            </td>
                            <td></td>
                            <td>DEX</td><td className="text-right text-white">{totalDex} {stats.dex > 0 && <span className="text-[#00ff00] text-[9px]">(+{stats.dex})</span>}</td>
                        </tr>
                        <tr>
                            <td>CON</td>
                            <td className="text-right text-white whitespace-nowrap">
                                {totalCon}
                                {stats.con > 0 && <span className="text-[#00ff00] text-[9px]"> (+{stats.con})</span>}
                                {(state.allocatedCon || 0) > 0 && <span className="text-yellow-400 text-[9px]"> (+{state.allocatedCon})</span>}
                                {availablePoints > 0 && (
                                    <button onClick={() => allocateStat('con')} className="ml-1 px-1 bg-yellow-700 hover:bg-yellow-600 text-white text-[9px] rounded leading-none" title="CON +1 (레벨당 최대 HP +1 상승)">+</button>
                                )}
                            </td>
                            <td></td>
                            <td>INT</td><td className="text-right text-white">{totalInt} {stats.int > 0 && <span className="text-[#00ff00] text-[9px]">(+{stats.int})</span>}</td>
                        </tr>
                        <tr>
                            <td>WIS</td><td className="text-right text-white">{totalWis} {stats.wis > 0 && <span className="text-[#00ff00] text-[9px]">(+{stats.wis})</span>}</td>
                            <td></td>
                            <td>CHA</td><td className="text-right text-white">{totalCha}</td>
                        </tr>
                        <tr>
                            <td className="text-[#a59c77]">Atk</td>
                            <td className="text-right text-orange-300 font-bold whitespace-nowrap">
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-1">
                                        <span className="text-[9px] text-[#888]">작은몹</span>
                                        <span>{Math.floor(stats.smallAtk * (1.5 + state.level / 10) + (totalStr * 0.6))}</span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[9px] text-[#888]">큰몹</span>
                                        <span>{Math.floor(stats.largeAtk * (1.5 + state.level / 10) + (totalStr * 0.6))}</span>
                                    </div>
                                </div>
                                {state.combatState?.bravePotionEndTime && Date.now() < state.combatState.bravePotionEndTime && (
                                    <span className="text-[9px] text-red-500 ml-1 block leading-none mt-0.5 font-bold animate-pulse">[가속]</span>
                                )}
                            </td>
                            <td></td>
                            <td className="text-[#a59c77]">EXP</td>
                            <td className="text-right text-white italic">{((state.currentExp / requiredExp) * 100).toFixed(4)}%</td>
                        </tr>
                    </tbody>
                </table>

                {/* [스탯 시스템] 남은 포인트 표시 (50레벨 이상만) */}
                {state.level > 50 && (
                    <div className="mt-1 text-center text-[10px] text-yellow-500">
                        스탯 포인트: <span className="font-bold">{availablePoints}</span> 남음
                        <span className="text-[#666] ml-1">(STR: {state.allocatedStr || 0} / CON: {state.allocatedCon || 0})</span>
                    </div>
                )}

                <div className="mt-2 border-t border-[#333] pt-1">
                    <div className="flex justify-between text-[10px]">
                        <span>EXP</span>
                        <span>{((state.currentExp / requiredExp) * 100).toFixed(4)}%</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatusWindow;
