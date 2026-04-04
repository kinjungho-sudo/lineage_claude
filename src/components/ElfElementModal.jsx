import React from 'react';
import { ELF_ELEMENT_NAMES } from '../data/spells';

const ELF_ELEMENT_INFO = {
    wind:  { label: '바람', desc: '명중 +5 / 회피 +5', color: '#88ddaa', icon: '🌿', spell: '윈드 샷' },
    earth: { label: '땅',   desc: 'AC -4',             color: '#bbaa55', icon: '🪨', spell: '어스 스킨' },
    fire:  { label: '불',   desc: '공격력 +3',          color: '#ff6644', icon: '🔥', spell: '파이어 웨폰' },
    water: { label: '물',   desc: 'HP +50 / 회복 +10', color: '#44aaff', icon: '💧', spell: '네이쳐스 터치' },
};

const ElfElementModal = ({ show, onChoose }) => {
    if (!show) return null;

    return (
        <div className="absolute inset-0 flex items-center justify-center z-[200] bg-black/80">
            <div className="bg-[#0d0d1a] border-2 border-[#336633]/60 rounded-xl p-8 w-[480px] shadow-[0_0_60px_rgba(100,200,100,0.3)] select-none">
                <div className="text-center mb-6">
                    <div className="text-[#88ddaa] text-xl font-bold tracking-wide mb-1">⚡ 속성 각성</div>
                    <div className="text-[#aaa] text-sm">레벨 50에 달했습니다. 요정의 속성 계열을 선택하세요.</div>
                    <div className="text-[#ff8844] text-xs mt-1 font-bold">※ 한번 선택하면 변경할 수 없습니다</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {Object.entries(ELF_ELEMENT_INFO).map(([key, info]) => (
                        <button
                            key={key}
                            onClick={() => onChoose(key)}
                            className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:scale-105 active:scale-95"
                            style={{ borderColor: info.color + '55', background: info.color + '11' }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = info.color}
                            onMouseLeave={e => e.currentTarget.style.borderColor = info.color + '55'}
                        >
                            <span className="text-3xl">{info.icon}</span>
                            <span className="font-bold text-base" style={{ color: info.color }}>{info.label} 계열</span>
                            <span className="text-[#aaa] text-xs text-center leading-tight">{info.desc}</span>
                            <span className="text-[#666] text-[10px]">마법: {info.spell}</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ElfElementModal;
