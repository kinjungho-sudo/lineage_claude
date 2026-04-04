import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

const Tooltip = ({ item, children }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const triggerRef = useRef(null);

    const handleMouseEnter = () => {
        if (!item) return;
        updatePosition();
        setIsVisible(true);
    };

    const handleMouseLeave = () => {
        setIsVisible(false);
    };

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            // Default: Center below the element
            let top = rect.bottom + 8; // 8px margin
            let left = rect.left + rect.width / 2;

            // Boundary checks (prevent going off-screen)
            const tooltipWidth = 256; // w-64 is 16rem = 256px
            const windowWidth = window.innerWidth;
            const windowHeight = window.innerHeight;

            // X-axis check
            if (left + tooltipWidth / 2 > windowWidth) {
                left = windowWidth - tooltipWidth / 2 - 10;
            } else if (left - tooltipWidth / 2 < 0) {
                left = tooltipWidth / 2 + 10;
            }

            // Y-axis check (if bottom is too close, flip to top)
            // Estimated height max 300px?
            if (top + 300 > windowHeight) {
                top = rect.top - 8; // Flip to top if not enough space below
            }

            setPosition({ top, left });
        }
    };

    // Update position on scroll or resize while visible
    useEffect(() => {
        if (isVisible) {
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
            return () => {
                window.removeEventListener('scroll', updatePosition, true);
                window.removeEventListener('resize', updatePosition);
            };
        }
    }, [isVisible]);

    // Calculate stats - move down and add safety check
    const enchant = item?.enchant || 0;
    const isWeapon = item?.type === 'weapon';
    const isArmor = item && ['armor', 'helm', 'gloves', 'boots', 'shield', 'shirt', 'cloak'].includes(item.type);
    const isAccessory = item?.type === 'accessory';
    const STAT_LABELS = { str: 'STR', dex: 'DEX', con: 'CON', int: 'INT', wis: 'WIS', ac: 'AC', atkBonus: '공격력', hit: '명중률', evasion: '회피율', mrBonus: 'MR', hpBonus: 'HP', mpBonus: 'MP', hpRegenBonus: 'HP 재생', mpRegenBonus: 'MP 재생', mp: '최대 MP', mpRegen: 'MP 회복', mpOnHit: '공격 시 MP', magicAtkBonus: '마법 공격력' };

    const getDisplayName = () => {
        if (!item) return '';
        let name = item.name;
        if (enchant > 0) name = `+${enchant} ${name}`;
        return name;
    };

    // 강화도를 반영한 description 생성
    const getEnhancedDescription = () => {
        if (!item?.description) return '';
        let desc = item.description;

        // 무기: "공격력 XX-YY" → "공격력 (XX+enchant)-(YY+enchant)"
        if (isWeapon && enchant > 0) {
            desc = desc.replace(/(\d+)-(\d+)/, (match, min, max) => {
                const newMin = parseInt(min) + enchant;
                const newMax = parseInt(max) + enchant;
                return `${newMin}-${newMax} (+${enchant})`;
            });
        }

        // 방어구: "AC -X" → "AC -(X+enchant) (-enchant)"
        if (isArmor && enchant > 0) {
            desc = desc.replace(/AC -(\d+)/, (match, ac) => {
                const totalAc = parseInt(ac) + enchant;
                return `AC -${totalAc} (-${enchant})`;
            });
        }

        return desc;
    };

    const tooltipContent = item ? (
        <div
            translate="no"
            className="fixed z-[9999] w-64 bg-[#1a1a1a] border border-[#7e7255] p-2 shadow-[0_0_10px_rgba(0,0,0,0.8)] text-[#efefef] text-xs font-serif leading-relaxed pointer-events-none"
            style={{
                top: position.top,
                left: position.left,
                transform: 'translate(-50%, 0)',
            }}
        >
            {/* Header */}
            <div className="text-[#d4af37] font-bold border-b border-[#333] pb-1 mb-1 relative">
                {getDisplayName()}
                {/* Safe Enchant / Weight Info */}
                <div className="absolute right-0 top-0 flex gap-1">
                    {(item.safe !== undefined) && (
                        <span className="text-[#444] text-[10px] font-normal">
                            (Safe: +{item.safe})
                        </span>
                    )}
                </div>
            </div>

            {/* Stats */}
            <div className="space-y-1">
                {/* Weapon Stats */}
                {isWeapon && item.stats && (
                    <>
                        <div className="flex justify-between gap-2">
                            <span className="text-[#aaa]">공격력</span>
                            <span className="font-mono text-[#ddd]">
                                {item.stats.small + enchant}/{item.stats.large + enchant}
                                {enchant > 0 && <span className="text-[#4a90e2] ml-1">(+{enchant})</span>}
                            </span>
                        </div>
                        {item.stats.int > 0 && <div className="flex justify-between gap-2"><span className="text-[#aaa]">INT</span><span className="font-mono text-[#d4af37]">+{item.stats.int}</span></div>}
                        {item.stats.str > 0 && <div className="flex justify-between gap-2"><span className="text-[#aaa]">STR</span><span className="font-mono text-[#d4af37]">+{item.stats.str}</span></div>}
                        {item.stats.magicAtkBonus > 0 && <div className="flex justify-between gap-2"><span className="text-[#aaa]">마법 공격력</span><span className="font-mono text-[#d4af37]">+{item.stats.magicAtkBonus}</span></div>}
                        {item.stats.mpRegen > 0 && <div className="flex justify-between gap-2"><span className="text-[#aaa]">MP 회복</span><span className="font-mono text-[#4a90e2]">+{item.stats.mpRegen}</span></div>}
                        {item.stats.mpOnHit > 0 && <div className="flex justify-between gap-2"><span className="text-[#aaa]">공격 시 MP</span><span className="font-mono text-[#4a90e2]">+{item.stats.mpOnHit}</span></div>}
                        {item.stats.option && (
                            <div className="text-[#a59c77] text-[11px]">{item.stats.option}</div>
                        )}
                    </>
                )}

                {/* Armor Stats */}
                {isArmor && item.stats && (
                    <>
                        <div className="flex justify-between gap-2">
                            <span className="text-[#aaa]">방어력(AC)</span>
                            <span className="font-mono text-[#ddd]">
                                -{item.stats.ac + enchant}
                                {enchant > 0 && <span className="text-[#4a90e2] ml-1">(-{enchant})</span>}
                            </span>
                        </div>
                        {item.stats.str > 0 && <div className="flex justify-between gap-2"><span className="text-[#aaa]">STR</span><span className="font-mono text-[#d4af37]">+{item.stats.str}</span></div>}
                        {item.stats.int > 0 && <div className="flex justify-between gap-2"><span className="text-[#aaa]">INT</span><span className="font-mono text-[#d4af37]">+{item.stats.int}</span></div>}
                        {item.stats.mr > 0 && <div className="flex justify-between gap-2"><span className="text-[#aaa]">MR</span><span className="font-mono text-[#d4af37]">+{item.stats.mr}</span></div>}
                        {item.stats.mp > 0 && <div className="flex justify-between gap-2"><span className="text-[#aaa]">최대 MP</span><span className="font-mono text-[#4a90e2]">+{item.stats.mp}</span></div>}
                        {item.stats.mpRegen > 0 && <div className="flex justify-between gap-2"><span className="text-[#aaa]">MP 회복</span><span className="font-mono text-[#4a90e2]">+{item.stats.mpRegen}</span></div>}
                        {item.stats.set && (
                            <div className="text-[#a59c77] text-[11px] mt-0.5">[세트] {item.stats.set === 'steel' ? '강철 세트' : item.stats.set}</div>
                        )}
                        {item.stats.option && (
                            <div className="text-[#a59c77] text-[11px] mt-0.5">{item.stats.option}</div>
                        )}
                    </>
                )}

                {/* Accessory Stats */}
                {isAccessory && item.stats && Object.entries(item.stats).filter(([k, v]) => v !== 0 && STAT_LABELS[k]).map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-2">
                        <span className="text-[#aaa]">{STAT_LABELS[k]}</span>
                        <span className="font-mono text-[#d4af37]">{v > 0 ? `+${v}` : v}</span>
                    </div>
                ))}

                {/* Potion/Scroll Stats */}
                {(item.healAmount > 0 || item.heal > 0) && (
                    <div className="flex justify-between gap-2">
                        <span className="text-[#aaa]">회복량</span>
                        <span className="font-mono text-[#e74c3c]">{item.healAmount || item.heal} HP</span>
                    </div>
                )}

                {/* Description */}
                {getEnhancedDescription() && (
                    <div className="mt-2 text-[#888] pt-1 border-t border-[#333] italic">
                        {getEnhancedDescription()}
                    </div>
                )}
            </div>
        </div>
    ) : null;

    return (
        <>
            <div
                ref={triggerRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className="relative"
                translate="no"
            >
                {children}
            </div>
            {item && isVisible && tooltipContent && ReactDOM.createPortal(tooltipContent, document.body)}
        </>
    );
};

export default Tooltip;
