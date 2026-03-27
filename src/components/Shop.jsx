import React, { useState } from 'react';
import { useGame } from '../context/GameContext';

const Shop = () => {
    const { buyItems, state, selectedItemUid, sellItem, ITEMS } = useGame();
    const [quantities, setQuantities] = useState({});
    const [activeTab, setActiveTab] = useState('buy'); // 'buy' | 'sell'

    const handleQuantityChange = (itemId, change) => {
        setQuantities(prev => {
            const current = prev[itemId] || 0;
            const next = Math.max(0, Math.min(999, current + change));
            return { ...prev, [itemId]: next };
        });
    };

    const handleBuyAll = () => {
        const itemsToBuy = [];
        Object.entries(quantities).forEach(([itemId, count]) => {
            if (count > 0) {
                const item = ITEMS.find(i => i.id === itemId);
                if (item) {
                    itemsToBuy.push({ item, count });
                }
            }
        });

        if (itemsToBuy.length > 0) {
            buyItems(itemsToBuy);
            setQuantities({});
        }
    };

    // Calculate total price for Buy
    const totalPrice = Object.entries(quantities).reduce((sum, [itemId, count]) => {
        const item = ITEMS.find(i => i.id === itemId);
        return sum + (item ? item.price * count : 0);
    }, 0);

    return (
        <div className="h-full flex flex-col relative bg-[#1a1a1a]">
            {/* Tabs */}
            <div className="flex border-b border-[#3f3f3f] flex-shrink-0">
                <button
                    className={`flex-1 py-3 text-sm font-bold ${activeTab === 'buy' ? 'bg-[#2a2a2a] text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-[#666] hover:bg-[#222]'}`}
                    onClick={() => setActiveTab('buy')}
                >
                    구매 (Buy)
                </button>
                <button
                    className={`flex-1 py-3 text-sm font-bold ${activeTab === 'sell' ? 'bg-[#2a2a2a] text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-[#666] hover:bg-[#222]'}`}
                    onClick={() => setActiveTab('sell')}
                >
                    판매 (Sell)
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-1 md:p-2 pb-20"> {/* Increased bottom padding, added min-h-0 for flex scroll */}
                {activeTab === 'buy' ? (
                    <div className="space-y-1">
                        {ITEMS.filter(i => !i.unbuyable).map((item) => (
                            <div key={item.id} className="flex items-center justify-between bg-black/40 p-1 md:p-1.5 rounded-sm border border-[#3f3f3f] hover:bg-[#2a2a2a] hover:border-[#a59c77] transition-all group">
                                <div className="flex items-center gap-2 flex-grow min-w-0">
                                    {/* Item Icon */}
                                    <div className={`
                                        w-9 h-9 bg-[#111] border flex items-center justify-center relative flex-shrink-0 overflow-hidden
                                        ${item.isBlessed ? 'border-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.6)]' : 'border-[#3f3f3f] group-hover:border-[#a59c77]'}
                                    `}>
                                        <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                    </div>

                                    {/* Name & Price */}
                                    <div className="flex flex-col min-w-0 pr-2">
                                        <span className={`text-xs font-bold truncate ${item.isBlessed ? 'text-white' : 'text-[#efefef]'}`}>
                                            {item.name}
                                        </span>
                                        <span className="text-[#d4af37] font-mono text-[10px]">
                                            {item.price.toLocaleString()} A
                                        </span>
                                    </div>
                                </div>

                                {/* Quantity Control: ▼ 0 ~ 99 ▲ */}
                                <div className="flex items-center gap-1 bg-black/60 rounded-sm border border-[#3f3f3f] px-1 ml-auto">
                                    <button
                                        onClick={() => handleQuantityChange(item.id, -1)}
                                        className="text-[#a59c77] hover:text-white text-[10px] w-5 h-5 flex items-center justify-center active:scale-95 leading-none select-none"
                                    >
                                        ▼
                                    </button>
                                    <span className="text-[#d4af37] text-xs font-mono w-5 text-center select-none">
                                        {quantities[item.id] || 0}
                                    </span>
                                    <button
                                        onClick={() => handleQuantityChange(item.id, 1)}
                                        className="text-[#a59c77] hover:text-white text-[10px] w-5 h-5 flex items-center justify-center active:scale-95 leading-none select-none"
                                    >
                                        ▲
                                    </button>
                                    <button
                                        onClick={() => handleQuantityChange(item.id, 10)}
                                        className="text-[#a59c77] hover:text-white text-[9px] w-6 h-5 flex items-center justify-center active:scale-95 leading-none select-none border-l border-[#3f3f3f] ml-1"
                                        title="+10개"
                                    >
                                        +10
                                    </button>
                                    <button
                                        onClick={() => handleQuantityChange(item.id, 100)}
                                        className="text-[#a59c77] hover:text-white text-[9px] w-8 h-5 flex items-center justify-center active:scale-95 leading-none select-none border-l border-[#3f3f3f] ml-1"
                                        title="+100개"
                                    >
                                        +100
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    // Sell Tab Content (Inventory List)
                    <div className="space-y-1">
                        {state.inventory.length === 0 ? (
                            <div className="text-gray-500 text-center py-10 text-xs">
                                판매할 아이템이 없습니다.
                            </div>
                        ) : (
                            state.inventory.map((item) => {
                                const baseSellPrice = Math.floor(item.price / 2);
                                const sellPrice = item.enchant > 0 ? Math.floor(baseSellPrice * Math.pow(1.5, item.enchant)) : baseSellPrice;

                                // 로컬 상태로 판매 수량 관리
                                const sellQty = quantities[`sell_${item.uid}`] || 1;
                                const isStackable = item.count > 1;

                                return (
                                    <div
                                        key={item.uid}
                                        className="flex flex-col bg-black/40 p-1 md:p-1.5 rounded-sm border border-[#3f3f3f] hover:border-[#a59c77] transition-all group"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 flex-grow min-w-0">
                                                {/* Item Icon */}
                                                <div className={`
                                                    w-9 h-9 bg-[#111] border flex items-center justify-center relative flex-shrink-0 overflow-hidden
                                                    ${item.isBlessed ? 'border-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.6)]' : 'border-[#3f3f3f] group-hover:border-[#a59c77]'}
                                                `}>
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                                    {item.enchant > 0 && (
                                                        <div className="absolute top-0 right-0 w-3 h-3 bg-blue-400 rounded-full shadow-[0_0_4px_#3b82f6] border border-black"></div>
                                                    )}
                                                    {item.isEquipped && (
                                                        <div className="absolute bottom-0 right-0 text-[8px] bg-red-900/80 text-white px-1 border border-red-500 rounded-tl">E</div>
                                                    )}
                                                </div>

                                                {/* Name & Sell Price */}
                                                <div className="flex flex-col min-w-0 flex-shrink pr-1">
                                                    <div className="flex items-center gap-1">
                                                        <span className={`text-[11px] md:text-xs font-bold truncate ${item.isBlessed ? 'text-white' : 'text-[#efefef]'}`}>
                                                            {item.enchant > 0 ? `+${item.enchant} ` : ''}{item.name}
                                                        </span>
                                                        {item.count > 1 && <span className="text-gray-400 text-[9px] font-mono">[{item.count}]</span>}
                                                    </div>
                                                    <span className="text-[#d4af37] font-mono text-[9px]">
                                                        {sellPrice.toLocaleString()} A
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Sell Action */}
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {isStackable && !item.isEquipped && (
                                                    <div className="flex items-center gap-1 bg-black/60 rounded-sm border border-[#3f3f3f] px-1">
                                                        <button
                                                            onClick={() => handleQuantityChange(`sell_${item.uid}`, -1)}
                                                            className="text-[#a59c77] hover:text-white text-[10px] w-5 h-5 flex items-center justify-center"
                                                        >▼</button>
                                                        <span className="text-[#d4af37] text-xs font-mono w-6 text-center">{sellQty}</span>
                                                        <button
                                                            onClick={() => {
                                                                const current = quantities[`sell_${item.uid}`] || 1;
                                                                if (current < item.count) {
                                                                    handleQuantityChange(`sell_${item.uid}`, 1);
                                                                }
                                                            }}
                                                            className="text-[#a59c77] hover:text-white text-[10px] w-5 h-5 flex items-center justify-center"
                                                        >▲</button>
                                                        <button
                                                            onClick={() => setQuantities(prev => ({ ...prev, [`sell_${item.uid}`]: item.count }))}
                                                            className="text-[#a59c77] hover:text-white text-[9px] px-1 border-l border-[#3f3f3f] ml-1"
                                                        >ALL</button>
                                                    </div>
                                                )}

                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (!item.isEquipped) {
                                                            sellItem(item.uid, sellQty);
                                                            // 판매 후 해당 아이템의 수량 상태 초기화
                                                            setQuantities(prev => {
                                                                const next = { ...prev };
                                                                delete next[`sell_${item.uid}`];
                                                                return next;
                                                            });
                                                        }
                                                    }}
                                                    disabled={item.isEquipped}
                                                    className={`
                                                        px-3 py-1.5 rounded-sm text-[10px] font-bold border flex-shrink-0
                                                        ${item.isEquipped
                                                            ? 'border-gray-600 text-gray-600 cursor-not-allowed'
                                                            : 'border-red-900 bg-red-900/20 text-red-400 hover:bg-red-900 hover:text-white active:scale-95 transition-all'}
                                                    `}
                                                >
                                                    {item.isEquipped ? '장착중' : '판매하기'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* Bottom Action Area (Only for Buy Tab now, Sell is instant or per-item) */}
            {activeTab === 'buy' && (
                <div className="absolute bottom-0 left-0 right-0 p-3 bg-[#1B1B1B] border-t border-[#3f3f3f] flex items-center justify-between h-[68px]">
                    <div className="flex flex-col justify-center gap-1 w-[65%]">
                        <div className="flex justify-between text-[11px] md:text-xs">
                            <span className="text-[#a59c77]">총 구매 금액</span>
                            <span className="text-[#ff5555] font-mono font-bold">- {totalPrice.toLocaleString()} A</span>
                        </div>
                        <div className="flex justify-between text-[11px] md:text-xs border-t border-[#333] pt-1">
                            <span className="text-[#888]">남은 아데나</span>
                            <span className={`${state.adena >= totalPrice ? 'text-[#00ff00]' : 'text-red-600'} font-mono`}>
                                {(state.adena - totalPrice).toLocaleString()} A
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleBuyAll}
                        disabled={totalPrice === 0 || state.adena < totalPrice}
                        className={`
                            px-6 py-1.5 rounded-sm text-xs font-bold border h-8 flex items-center
                            ${totalPrice > 0 && state.adena >= totalPrice
                                ? 'border-[#a59c77] text-[#a59c77] hover:bg-[#a59c77] hover:text-black cursor-pointer'
                                : 'border-[#444] text-[#444] cursor-not-allowed bg-transparent'}
                        `}
                    >
                        구매하기
                    </button>
                </div>
            )}
        </div>
    );
};

export default Shop;
