import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import Tooltip from './Tooltip';

const Inventory = () => {
    const {
        state, useScroll, equipItem, unequipItem, moveItem, usePotion,
        ITEM_TYPES
    } = useGame();
    const [selectedScroll, setSelectedScroll] = useState(null);

    const handleItemClick = (item) => {
        // Enchant Mode: If a scroll is selected and we click another item
        if (selectedScroll) {
            if (item.uid === selectedScroll.uid) {
                setSelectedScroll(null); // Cancel scroll selection
                return;
            }
            // Attempt enchant
            useScroll(selectedScroll.uid, item.uid);
            setSelectedScroll(null); // Reset after attempt
            return;
        }

        // Normal Mode: Select Item (no special action now, but placeholder for future)
        // setSelectedItemUid(item.uid); // Removed
    };

    const handleItemDoubleClick = (item) => {
        if (item.type === ITEM_TYPES.SCROLL) {
            setSelectedScroll(item);
        } else if (item.type === ITEM_TYPES.POTION || item.type === 'book') {
            // [Fix] 물약 및 마법서 더블클릭 사용 지원
            usePotion(item.uid);
        } else if (item.slot) {
            // Equipment logic
            if (item.isEquipped) {
                unequipItem(item);
            } else {
                equipItem(item);
            }
        }
    };

    // Drag and Drop Handlers
    const handleDragStart = (e, index) => {
        e.dataTransfer.setData('text/plain', index.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    const handleDrop = (e, toIndex) => {
        e.preventDefault();
        const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);

        if (!isNaN(fromIndex) && fromIndex !== toIndex) {
            moveItem(fromIndex, toIndex);
        }
    };

    // Sorting Logic (Phase 44)
    // Priority: Potion > Scroll > Weapon > Armor > Etc
    // Secondary: Name
    const getSortPriority = (item) => {
        if (!item) return 99;
        switch (item.type) {
            case ITEM_TYPES.POTION: return 1;
            case ITEM_TYPES.SCROLL: return 2;
            case ITEM_TYPES.WEAPON: return 3;
            case ITEM_TYPES.ARMOR: return 4;
            default: return 5;
        }
    };

    // Sorting removed to support Drag & Drop Reordering
    // const sortedInventory = [...(state.inventory || [])].sort((a, b) => {
    //     const priorityA = getSortPriority(a);
    //     const priorityB = getSortPriority(b);
    //     if (priorityA !== priorityB) return priorityA - priorityB;
    //     return a.name.localeCompare(b.name);
    // });

    const inventory = state.inventory || [];
    const totalSlots = Math.max(inventory.length + 5, 30);
    const slots = Array(totalSlots).fill(null).map((_, i) => inventory[i] || null);

    // Helper to get selected item name for status bar
    const selectedItem = null; // selectedItemUid ? state.inventory.find(i => i.uid === selectedItemUid) : null;

    return (
        <div className="h-full flex flex-col relative bg-[#1a1a1a]">

            {/* Adena Display */}
            <div className="flex items-center justify-between p-2 border-b border-[#3f3f3f] bg-[#222]">
                <div className="flex items-center gap-2">
                    <img src="/assets/adena.png" alt="Adena" className="w-5 h-5 object-contain" />
                    <span className="text-[#d4af37] font-mono text-sm">{state.adena.toLocaleString()}</span>
                </div>
                <span className="text-xs text-[#666]">WEIGHT 14%</span>
            </div>

            {/* Grid Area */}
            <div className="flex-grow p-1 md:p-2 overflow-y-auto overflow-x-hidden custom-scrollbar relative">
                <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-6 gap-1 pb-20 min-h-[400px]">
                    {slots.map((item, index) => {
                        const colIndex = index % 6;
                        const align = colIndex >= 4 ? 'right' : 'center';

                        // Selection Styles
                        const isScrollSelected = selectedScroll && item && item.uid === selectedScroll.uid;
                        const isItemSelected = false; // selectedItemUid && item && item.uid === selectedItemUid;

                        return (
                            <Tooltip key={item?.uid || `empty-${index}`} item={item} align={align}>
                                <div
                                    translate="no"
                                    draggable={!!item}
                                    onDragStart={(e) => item && handleDragStart(e, index)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, index)}
                                    className={`
                                        aspect-square border flex items-center justify-center relative select-none box-border rounded-sm transition-all duration-75
                                        ${isScrollSelected ? 'border-red-500 bg-red-500/30' : ''}
                                        ${isItemSelected ? 'border-2 border-[#d4af37] bg-[#d4af37]/20 shadow-[0_0_10px_rgba(212,175,55,0.3)]' : ''}
                                        ${!isScrollSelected && !isItemSelected ? (item ? 'border-[#a59c77] bg-black/40 hover:bg-[#333] cursor-grab active:cursor-grabbing' : 'border-[#2a2a2a] bg-black/20') : ''}
                                    `}
                                    onClick={() => item && handleItemClick(item)}
                                    onDoubleClick={(e) => {
                                        e.preventDefault(); // 브라우저 더블클릭 줌 방지
                                        if (item) handleItemDoubleClick(item);
                                    }}
                                >
                                    {item && (
                                        <>
                                            <div className={`
                                                w-full h-full flex items-center justify-center relative p-0 overflow-hidden bg-black
                                                ${item.isBlessed ? 'border-2 border-yellow-400 inset-0' : ''}
                                            `}>
                                                <img
                                                    src={item.image}
                                                    alt={item.name}
                                                    className="w-full h-full object-contain"
                                                    style={{ transform: item.scale ? `scale(${item.scale})` : 'scale(1.0)' }}
                                                />

                                                {/* Count Indicator */}
                                                {item.count > 1 && (
                                                    <span className="absolute bottom-0 right-0 text-[10px] text-white bg-black/80 px-1 rounded-tl-sm leading-none font-mono z-10">
                                                        {item.count}
                                                    </span>
                                                )}
                                            </div>

                                            {/* Enchant Indicator */}
                                            {item.enchant > 0 && (
                                                <div className="absolute top-0 right-0 w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_4px_#3b82f6] z-10 border border-black"></div>
                                            )}

                                            {/* Equipped Indicator (Phase 44: Enhanced) */}
                                            {item.isEquipped && (
                                                <>
                                                    <div className="absolute inset-0 border-2 border-[#2ecc71] z-10 pointer-events-none shadow-[0_0_8px_#2ecc71]"></div>
                                                    <div className="absolute top-0 left-0 bg-[#2ecc71] text-black text-[9px] px-1 rounded-br-sm leading-none font-bold z-20">
                                                        E
                                                    </div>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </Tooltip>
                        )
                    })}
                </div>
            </div>

            {/* Bottom Status / Selection Prompt */}
            <div className="py-1 px-2 text-center text-[12px] h-10 flex items-center justify-center border-t border-[#3f3f3f] bg-[#1d1d1d] font-bold">
                {selectedScroll ? (
                    <span className="text-yellow-400 animate-pulse w-full">강화할 아이템을 선택하세요</span>
                ) : (
                    <span className="text-[#888] w-full text-center">인벤토리</span>
                )}
            </div>
        </div>
    );
};

export default Inventory;
