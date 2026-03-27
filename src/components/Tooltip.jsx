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

    const getDisplayName = () => {
        if (!item) return '';
        let name = item.name;
        if (enchant > 0) name = `+${enchant} ${name}`;
        return name;
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
                        {item.stats.str > 0 && (
                            <div className="flex justify-between gap-2">
                                <span className="text-[#aaa]">STR</span>
                                <span className="font-mono text-[#d4af37]">+{item.stats.str}</span>
                            </div>
                        )}
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
                                {item.stats.ac - enchant}
                                {enchant > 0 && <span className="text-[#4a90e2] ml-1">({-enchant})</span>}
                            </span>
                        </div>
                        {item.stats.str > 0 && (
                            <div className="flex justify-between gap-2">
                                <span className="text-[#aaa]">STR</span>
                                <span className="font-mono text-[#d4af37]">+{item.stats.str}</span>
                            </div>
                        )}
                        {item.stats.set && (
                            <div className="text-[#a59c77] text-[11px] mt-0.5">[세트] {item.stats.set === 'steel' ? '강철 세트' : item.stats.set}</div>
                        )}
                        {item.stats.option && (
                            <div className="text-[#a59c77] text-[11px] mt-0.5">{item.stats.option}</div>
                        )}
                    </>
                )}

                {/* Potion/Scroll Stats */}
                {item.heal > 0 && (
                    <div className="flex justify-between gap-2">
                        <span className="text-[#aaa]">회복량</span>
                        <span className="font-mono text-[#e74c3c]">{item.heal} HP</span>
                    </div>
                )}

                {/* Description */}
                {item.description && (
                    <div className="mt-2 text-[#888] pt-1 border-t border-[#333] italic">
                        {item.description}
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
