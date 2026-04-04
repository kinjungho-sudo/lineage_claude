import React from 'react';
import { useGame } from '../context/GameContext';
import { calculateStats, getRequiredExp, getMaxHp, getMaxMp } from '../mechanics/combat';

const HUDStatusBar = () => {
    const { state } = useGame();

    return (
        <div className="flex flex-col w-[44%] md:w-[320px] p-1.5 md:p-3 justify-center gap-0.5 md:gap-2 border-r border-[#222] bg-gradient-to-r from-black/50 to-transparent">
            <div className="hidden md:flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-[11px] text-gray-400 font-bold uppercase tracking-tighter">Status Monitor</span>
            </div>
            {/* HP Bar */}
            {(() => {
                const hpStats = calculateStats(state);
                const maxHp = getMaxHp(state, hpStats);
                return (
                    <div className="flex flex-col gap-0.5 md:gap-1">
                        <div className="flex justify-between text-[#ccc] text-[10px] md:text-xs font-bold">
                            <span className="text-red-500/80">HP</span> <span>{state.hp} / {maxHp}</span>
                        </div>
                        <div className="w-full h-2.5 md:h-4 bg-gray-900 rounded-sm overflow-hidden border border-gray-800 relative">
                            <div className="h-full bg-gradient-to-r from-red-900 via-red-600 to-red-500 transition-all duration-300" style={{ width: `${Math.min(100, (state.hp / maxHp) * 100)}%` }}></div>
                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                        </div>
                    </div>
                );
            })()}
            {/* MP Bar */}
            {(() => {
                const mpStats = calculateStats(state, state.equipment);
                const maxMp = getMaxMp(state, mpStats);
                return (
                    <div className="flex flex-col gap-0.5 md:gap-1">
                        <div className="flex justify-between text-[#ccc] text-[10px] md:text-xs font-bold">
                            <span className="text-blue-500/80">MP</span> <span>{state.mp} / {maxMp}</span>
                        </div>
                        <div className="w-full h-2.5 md:h-4 bg-gray-900 rounded-sm overflow-hidden border border-gray-800 relative">
                            <div className="h-full bg-gradient-to-r from-blue-900 via-blue-600 to-blue-500 transition-all duration-300" style={{ width: `${Math.min(100, (state.mp / maxMp) * 100)}%` }}></div>
                            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                        </div>
                    </div>
                );
            })()}
            {/* EXP Bar */}
            {(() => {
                const requiredExp = getRequiredExp(state.level);
                return (
                    <div className="mt-1">
                        <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-[#222] relative">
                            <div className="h-full bg-gradient-to-r from-purple-800 to-purple-400 transition-all duration-500" style={{ width: `${Math.min(100, (state.currentExp / requiredExp) * 100)}%` }}></div>
                        </div>
                        <div className="flex justify-between text-[10px] text-[#555] mt-0.5 px-0.5 font-mono">
                            <span>LV.{state.level}</span>
                            <span>{((state.currentExp / requiredExp) * 100).toFixed(2)}%</span>
                        </div>
                    </div>
                );
            })()}
        </div>
    );
};

export default HUDStatusBar;
