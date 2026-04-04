import React, { useState, useRef, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { GAME_ACTIONS } from '../context/GameReducer';
import Tooltip from './Tooltip';

const Inventory = () => {
    const {
        state, dispatch, useScroll: applyScroll, equipItem, unequipItem, moveItem, usePotion: applyPotion,
        ITEM_TYPES, ITEMS
    } = useGame();
    const applyCrystal = (uid) => dispatch({ type: 'USE_CRYSTAL', payload: { itemUid: uid } });
    const [selectedScroll, setSelectedScroll] = useState(null);

    // ── 터치 드래그 앤 드롭 ────────────────────────────────────────────────
    const [ghostState, setGhostState] = useState(null); // { fromIndex, x, y }
    const isDraggingRef = useRef(false);
    const fromIndexRef  = useRef(null);
    const touchTimerRef = useRef(null);
    const touchStartRef = useRef(null);
    const gridRef       = useRef(null);

    // 드래그 중 스크롤 방지 (non-passive)
    useEffect(() => {
        const grid = gridRef.current;
        if (!grid) return;
        const onMove = (e) => {
            if (isDraggingRef.current) {
                e.preventDefault();
                const t = e.touches[0];
                setGhostState(prev => prev ? { ...prev, x: t.clientX, y: t.clientY } : null);
                return;
            }
            // 드래그 시작 전 손가락이 8px 이상 움직이면 타이머 취소 (스크롤 의도)
            if (touchStartRef.current && touchTimerRef.current) {
                const t = e.touches[0];
                const dx = Math.abs(t.clientX - touchStartRef.current.x);
                const dy = Math.abs(t.clientY - touchStartRef.current.y);
                if (dx > 8 || dy > 8) {
                    clearTimeout(touchTimerRef.current);
                    touchTimerRef.current = null;
                }
            }
        };
        grid.addEventListener('touchmove', onMove, { passive: false });
        return () => grid.removeEventListener('touchmove', onMove);
    }, []);

    const handleTouchStart = (e, index) => {
        const item = slots[index];
        if (!item) return;
        const t = e.touches[0];
        fromIndexRef.current = index;
        touchStartRef.current = { x: t.clientX, y: t.clientY };

        touchTimerRef.current = setTimeout(() => {
            isDraggingRef.current = true;
            setGhostState({ fromIndex: index, x: t.clientX, y: t.clientY });
            navigator.vibrate?.(40); // 햅틱 피드백
        }, 320);
    };

    const handleTouchEnd = (e) => {
        clearTimeout(touchTimerRef.current);
        touchTimerRef.current = null;

        if (!isDraggingRef.current) {
            isDraggingRef.current = false;
            touchStartRef.current = null;
            return;
        }

        const t = e.changedTouches[0];
        const el = document.elementFromPoint(t.clientX, t.clientY);
        const targetEl = el?.closest('[data-slot-index]');
        if (targetEl) {
            const toIndex = parseInt(targetEl.getAttribute('data-slot-index'));
            const fromIndex = fromIndexRef.current;
            if (!isNaN(toIndex) && fromIndex !== null && toIndex !== fromIndex) {
                moveItem(fromIndex, toIndex);
            }
        }

        isDraggingRef.current = false;
        fromIndexRef.current = null;
        touchStartRef.current = null;
        setGhostState(null);
    };

    // ── 아이템 클릭 핸들러 ──────────────────────────────────────────────────
    const handleItemClick = (item) => {
        if (isDraggingRef.current) return; // 드래그 중엔 클릭 무시
        if (selectedScroll) {
            if (item.uid === selectedScroll.uid) { setSelectedScroll(null); return; }
            applyScroll(selectedScroll.uid, item.uid);
            setSelectedScroll(null);
            return;
        }
    };

    const handleItemDoubleClick = (item) => {
        if (isDraggingRef.current) return;
        if (item.type === ITEM_TYPES.SCROLL) {
            setSelectedScroll(item);
        } else if (item.type === 'crystal') {
            applyCrystal(item.uid);
        } else if (item.type === ITEM_TYPES.POTION || item.type === 'book') {
            applyPotion(item.uid);
        } else if (item.slot) {
            if (item.isEquipped) {
                unequipItem(item);
            } else {
                const masterItem = ITEMS.find(i => i.id === item.id);
                if (masterItem?.restrictedClasses && masterItem.restrictedClasses.includes(state.characterClass)) {
                    const className = state.characterClass === 'knight' ? '기사' : '요정';
                    dispatch({ type: GAME_ACTIONS.SET_SCREEN_MESSAGE, payload: `${className}는 착용할 수 없는 장비입니다.` });
                    return;
                }
                equipItem(item);
            }
        }
    };

    // ── HTML5 드래그 앤 드롭 (데스크탑) ─────────────────────────────────────
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
        if (!isNaN(fromIndex) && fromIndex !== toIndex) moveItem(fromIndex, toIndex);
    };

    // ── 슬롯 배열 ──────────────────────────────────────────────────────────
    const inventory  = state.inventory || [];
    const totalSlots = Math.max(inventory.length + 5, 30);
    const slots      = Array(totalSlots).fill(null).map((_, i) => inventory[i] || null);

    return (
        <div className="flex flex-col relative bg-[#1a1a1a] h-full min-h-0">

            {/* Adena Display */}
            <div className="flex items-center justify-between p-2 border-b border-[#3f3f3f] bg-[#222]">
                <div className="flex items-center gap-2">
                    <img src="/assets/adena.png" alt="Adena" className="w-5 h-5 object-contain" />
                    <span className="text-[#d4af37] font-mono text-sm">{state.adena.toLocaleString()}</span>
                </div>
                <span className="text-xs text-[#666]">WEIGHT 14%</span>
            </div>

            {/* Grid Area */}
            <div
                ref={gridRef}
                className="flex-grow p-1 overflow-y-auto overflow-x-hidden custom-scrollbar relative"
                onContextMenu={(e) => e.preventDefault()}
            >
                <div className="grid grid-cols-6 gap-0.5 pb-1">
                    {slots.map((item, index) => {
                        const colIndex = index % 6;
                        const align = colIndex >= 4 ? 'right' : 'center';
                        const isScrollSelected = selectedScroll && item && item.uid === selectedScroll.uid;
                        const isBeingDragged = ghostState?.fromIndex === index;

                        return (
                            <Tooltip key={item?.uid || `empty-${index}`} item={item} align={align}>
                                <div
                                    data-slot-index={index}
                                    translate="no"
                                    draggable={!!item}
                                    onDragStart={(e) => item && handleDragStart(e, index)}
                                    onDragOver={handleDragOver}
                                    onDrop={(e) => handleDrop(e, index)}
                                    onTouchStart={(e) => handleTouchStart(e, index)}
                                    onTouchEnd={handleTouchEnd}
                                    onContextMenu={(e) => e.preventDefault()}
                                    className={`
                                        aspect-square border flex items-center justify-center relative select-none box-border rounded-sm transition-all duration-75
                                        ${isScrollSelected ? 'border-red-500 bg-red-500/30' : ''}
                                        ${isBeingDragged ? 'opacity-30 border-[#d4af37]/50' : ''}
                                        ${!isScrollSelected && !isBeingDragged
                                            ? (item
                                                ? 'border-[#a59c77] bg-black/40 hover:bg-[#333] cursor-grab active:cursor-grabbing'
                                                : 'border-[#2a2a2a] bg-black/20')
                                            : ''}
                                    `}
                                    onClick={() => item && handleItemClick(item)}
                                    onDoubleClick={(e) => {
                                        e.preventDefault();
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
                                                    style={{
                                                        transform: item.scale ? `scale(${item.scale})` : 'scale(1.0)',
                                                        WebkitTouchCallout: 'none',
                                                        userSelect: 'none',
                                                    }}
                                                    draggable="false"
                                                />
                                                {item.count > 1 && (
                                                    <span className="absolute bottom-0 right-0 text-[10px] text-white bg-black/80 px-1 rounded-tl-sm leading-none font-mono z-10">
                                                        {item.count}
                                                    </span>
                                                )}
                                            </div>
                                            {item.enchant > 0 && (
                                                <div className="absolute top-0 right-0 w-2 h-2 bg-blue-400 rounded-full shadow-[0_0_4px_#3b82f6] z-10 border border-black"></div>
                                            )}
                                            {item.isEquipped && (
                                                <>
                                                    <div className="absolute inset-0 border-2 border-[#2ecc71] z-10 pointer-events-none shadow-[0_0_8px_#2ecc71]"></div>
                                                    <div className="absolute top-0 left-0 bg-[#2ecc71] text-black text-[9px] px-1 rounded-br-sm leading-none font-bold z-20">E</div>
                                                </>
                                            )}
                                        </>
                                    )}
                                </div>
                            </Tooltip>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Status */}
            <div className="py-1 px-2 text-center text-[12px] h-10 flex items-center justify-center border-t border-[#3f3f3f] bg-[#1d1d1d] font-bold">
                {selectedScroll ? (
                    <span className="text-yellow-400 animate-pulse w-full">강화할 아이템을 선택하세요</span>
                ) : (
                    <span className="text-[#888] w-full text-center">인벤토리</span>
                )}
            </div>

            {/* 터치 드래그 고스트 아이콘 */}
            {ghostState && slots[ghostState.fromIndex] && (
                <div
                    className="fixed pointer-events-none z-[9999] flex items-center justify-center border-2 border-[#d4af37] bg-black/90 rounded shadow-[0_0_24px_rgba(212,175,55,0.8)]"
                    style={{
                        width: 52,
                        height: 52,
                        left: ghostState.x - 26,
                        top: ghostState.y - 26,
                        transform: 'scale(1.25)',
                    }}
                >
                    <img
                        src={slots[ghostState.fromIndex].image}
                        alt={slots[ghostState.fromIndex].name}
                        className="w-10 h-10 object-contain"
                        style={{ WebkitTouchCallout: 'none' }}
                    />
                </div>
            )}
        </div>
    );
};

export default Inventory;
