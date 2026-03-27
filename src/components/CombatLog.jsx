import React, { useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';

const CombatLog = () => {
    const { state } = useGame();
    const bottomRef = useRef(null);

    // Auto-scroll logic
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [state.combatLogs]);

    const logs = state.combatLogs || [];

    return (
        <div className="w-full h-full bg-black/40 text-shadow-sm font-sans text-xs flex flex-col justify-end p-2 rounded pointer-events-auto hover:bg-black/60 transition-colors">
            <div className="overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
                {logs.length === 0 && <div className="text-gray-500 italic">전투 기록이 없습니다.</div>}

                {logs.map((log, i) => {
                    let color = "text-gray-300";
                    if (log.type === 'kill') color = "text-[#d4af37] font-bold";
                    if (log.type === 'drop') color = "text-[#00ff00] font-bold";
                    if (log.type === 'damage') color = "text-gray-400";
                    if (log.type === 'hit') color = "text-red-400"; // Player took damage

                    return (
                        <div key={i} className={`${color} break-words leading-tight`}>
                            {log.text}
                        </div>
                    );
                })}
                <div ref={bottomRef} />
            </div>
        </div>
    );
};

export default CombatLog;
