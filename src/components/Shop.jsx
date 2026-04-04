import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import Tooltip from './Tooltip';

const Shop = () => {
    const { buyItems, state, sellItem, ITEMS } = useGame();
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
                if (item) itemsToBuy.push({ item, count });
            }
        });
        if (itemsToBuy.length > 0) {
            buyItems(itemsToBuy);
            setQuantities({});
        }
    };

    const totalPrice = Object.entries(quantities).reduce((sum, [itemId, count]) => {
        const item = ITEMS.find(i => i.id === itemId);
        return sum + (item ? item.price * count : 0);
    }, 0);

    return (
        <div className="h-full flex flex-col relative bg-[#1a1a1a]">
            {/* Tabs */}
            <div className="flex border-b border-[#3f3f3f] flex-shrink-0">
                <button
                    className={`flex-1 py-2 text-sm font-bold ${activeTab === 'buy' ? 'bg-[#2a2a2a] text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-[#666] hover:bg-[#222]'}`}
                    onClick={() => setActiveTab('buy')}
                >구매 (Buy)</button>
                <button
                    className={`flex-1 py-2 text-sm font-bold ${activeTab === 'sell' ? 'bg-[#2a2a2a] text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-[#666] hover:bg-[#222]'}`}
                    onClick={() => setActiveTab('sell')}
                >판매 (Sell)</button>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-1 pb-[72px]">
                {activeTab === 'buy' ? (
                    <div className="space-y-1">
                        {ITEMS.filter(i => !i.unbuyable).map((item) => (
                            <div key={item.id} className="bg-black/40 border border-[#3f3f3f] hover:bg-[#2a2a2a] hover:border-[#a59c77] transition-all group rounded-sm">
                                {/* Row 1: 아이콘 + 아이템명 + 가격 */}
                                <div className="flex items-center gap-2 px-1.5 pt-1.5 pb-1">
                                    <div className={`w-8 h-8 bg-[#111] border flex items-center justify-center flex-shrink-0 overflow-hidden
                                        ${item.isBlessed ? 'border-yellow-400 shadow-[0_0_5px_rgba(250,204,21,0.6)]' : 'border-[#3f3f3f] group-hover:border-[#a59c77]'}`}>
                                        <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-[12px] font-bold truncate leading-tight ${item.isBlessed ? 'text-white' : 'text-[#efefef]'}`}>
                                            {item.name}
                                        </div>
                                        <div className="text-[#d4af37] font-mono text-[10px] leading-tight">
                                            {item.price.toLocaleString()} A
                                        </div>
                                    </div>
                                </div>
                                {/* Row 2: 수량 조절 */}
                                <div className="flex items-center gap-0 border-t border-[#2a2a2a] px-1 py-0.5">
                                    <button onClick={() => handleQuantityChange(item.id, -1)}
                                        className="text-[#a59c77] hover:text-white text-[10px] w-7 h-6 flex items-center justify-center active:scale-95 select-none">▼</button>
                                    <span className="text-[#d4af37] text-[11px] font-mono w-6 text-center select-none">
                                        {quantities[item.id] || 0}
                                    </span>
                                    <button onClick={() => handleQuantityChange(item.id, 1)}
                                        className="text-[#a59c77] hover:text-white text-[10px] w-7 h-6 flex items-center justify-center active:scale-95 select-none">▲</button>
                                    <div className="flex-1" />
                                    <button onClick={() => handleQuantityChange(item.id, 10)}
                                        className="text-[#a59c77] hover:text-white text-[10px] px-2 h-6 flex items-center justify-center active:scale-95 select-none border border-[#3f3f3f] rounded-sm">+10</button>
                                    <button onClick={() => handleQuantityChange(item.id, 100)}
                                        className="text-[#a59c77] hover:text-white text-[10px] px-2 h-6 flex items-center justify-center active:scale-95 select-none border border-[#3f3f3f] rounded-sm ml-1">+100</button>
                                    <button onClick={() => setQuantities(prev => ({ ...prev, [item.id]: 0 }))}
                                        className="text-[#666] hover:text-red-400 text-[10px] px-2 h-6 flex items-center justify-center active:scale-95 select-none border border-[#3f3f3f] rounded-sm ml-1">✕</button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    // Sell Tab
                    <div className="space-y-1">
                        {state.inventory.length === 0 ? (
                            <div className="text-gray-500 text-center py-10 text-xs">판매할 아이템이 없습니다.</div>
                        ) : (
                            state.inventory.map((item) => {
                                const baseSellPrice = Math.floor(item.price / 2);
                                const sellPrice = item.enchant > 0 ? Math.floor(baseSellPrice * Math.pow(1.5, item.enchant)) : baseSellPrice;
                                const sellQty = quantities[`sell_${item.uid}`] || 1;
                                const isStackable = item.count > 1;

                                return (
                                    <div key={item.uid}
                                        className="flex items-center gap-1.5 bg-black/40 px-1.5 py-1 border border-[#3f3f3f] hover:border-[#a59c77] transition-all group rounded-sm">
                                        {/* 아이콘 */}
                                        <div className={`w-8 h-8 bg-[#111] border flex-shrink-0 flex items-center justify-center relative overflow-hidden
                                            ${item.isBlessed ? 'border-yellow-400' : 'border-[#3f3f3f] group-hover:border-[#a59c77]'}`}>
                                            <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                            {item.enchant > 0 && (
                                                <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-blue-400 rounded-full border border-black" />
                                            )}
                                            {item.isEquipped && (
                                                <div className="absolute bottom-0 right-0 text-[7px] bg-red-900/80 text-white px-0.5 border border-red-500">E</div>
                                            )}
                                        </div>

                                        {/* 이름+가격 */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-baseline gap-1 min-w-0">
                                                <span className={`text-[12px] font-bold truncate ${item.isBlessed ? 'text-white' : 'text-[#efefef]'}`}>
                                                    {item.enchant > 0 ? `+${item.enchant} ` : ''}{item.name}
                                                </span>
                                                {item.count > 1 && <span className="text-gray-400 text-[9px] font-mono flex-shrink-0">[{item.count}]</span>}
                                            </div>
                                            <div className="text-[#d4af37] font-mono text-[10px]">{sellPrice.toLocaleString()} A</div>
                                        </div>

                                        {/* 수량 + 판매 */}
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            {isStackable && !item.isEquipped && (
                                                <div className="flex items-center bg-black/60 border border-[#3f3f3f] rounded-sm">
                                                    <button onClick={() => handleQuantityChange(`sell_${item.uid}`, -1)}
                                                        className="text-[#a59c77] hover:text-white text-[10px] w-5 h-6 flex items-center justify-center">▼</button>
                                                    <span className="text-[#d4af37] text-[10px] font-mono w-5 text-center">{sellQty}</span>
                                                    <button onClick={() => { const cur = quantities[`sell_${item.uid}`] || 1; if (cur < item.count) handleQuantityChange(`sell_${item.uid}`, 1); }}
                                                        className="text-[#a59c77] hover:text-white text-[10px] w-5 h-6 flex items-center justify-center">▲</button>
                                                    <button onClick={() => setQuantities(prev => ({ ...prev, [`sell_${item.uid}`]: item.count }))}
                                                        className="text-[#a59c77] hover:text-white text-[9px] px-1 h-6 border-l border-[#3f3f3f] flex items-center">ALL</button>
                                                </div>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (!item.isEquipped) {
                                                        sellItem(item.uid, sellQty);
                                                        setQuantities(prev => { const next = { ...prev }; delete next[`sell_${item.uid}`]; return next; });
                                                    }
                                                }}
                                                disabled={item.isEquipped}
                                                className={`h-7 px-2 text-[11px] font-bold border rounded-sm flex-shrink-0 flex items-center
                                                    ${item.isEquipped
                                                        ? 'border-gray-600 text-gray-600 cursor-not-allowed'
                                                        : 'border-red-900 bg-red-900/20 text-red-400 hover:bg-red-900 hover:text-white active:scale-95 transition-all'}`}
                                            >
                                                {item.isEquipped ? '장착중' : '판매'}
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}
            </div>

            {/* 구매 하단 바 */}
            {activeTab === 'buy' && (
                <div className="absolute bottom-0 left-0 right-0 px-2 py-1.5 bg-[#1B1B1B] border-t border-[#3f3f3f] flex items-center justify-between gap-2">
                    <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                        <div className="flex justify-between text-[10px]">
                            <span className="text-[#a59c77]">총 구매 금액</span>
                            <span className="text-[#ff5555] font-mono font-bold">- {totalPrice.toLocaleString()} A</span>
                        </div>
                        <div className="flex justify-between text-[10px] border-t border-[#333] pt-0.5">
                            <span className="text-[#888]">남은 아데나</span>
                            <span className={`${state.adena >= totalPrice ? 'text-[#00ff00]' : 'text-red-600'} font-mono`}>
                                {(state.adena - totalPrice).toLocaleString()} A
                            </span>
                        </div>
                    </div>
                    <button
                        onClick={handleBuyAll}
                        disabled={totalPrice === 0 || state.adena < totalPrice}
                        className={`flex-shrink-0 h-9 px-4 text-xs font-bold border rounded-sm
                            ${totalPrice > 0 && state.adena >= totalPrice
                                ? 'border-[#a59c77] text-[#a59c77] hover:bg-[#a59c77] hover:text-black cursor-pointer active:scale-95'
                                : 'border-[#444] text-[#444] cursor-not-allowed bg-transparent'}`}
                    >
                        구매하기
                    </button>
                </div>
            )}
        </div>
    );
};

export default Shop;
