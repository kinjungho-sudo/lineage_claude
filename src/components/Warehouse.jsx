import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { GAME_ACTIONS } from '../context/GameReducer';

const Warehouse = () => {
    const { state, dispatch } = useGame();
    const [quantities, setQuantities] = useState({});
    const [activeTab, setActiveTab] = useState('deposit'); // 'deposit' | 'withdraw'

    const handleQuantityChange = (key, change, maxCount) => {
        setQuantities(prev => {
            const current = prev[key] || 1;
            const next = Math.max(1, Math.min(maxCount, current + change));
            return { ...prev, [key]: next };
        });
    };

    const handleDeposit = (item) => {
        const qty = quantities[`dep_${item.uid}`] || 1;
        dispatch({ type: GAME_ACTIONS.DEPOSIT_WAREHOUSE, payload: { uid: item.uid, quantity: qty } });
        setQuantities(prev => {
            const next = { ...prev };
            delete next[`dep_${item.uid}`];
            return next;
        });
    };

    const handleWithdraw = (item) => {
        const qty = quantities[`with_${item.uid}`] || 1;
        dispatch({ type: GAME_ACTIONS.WITHDRAW_WAREHOUSE, payload: { uid: item.uid, quantity: qty } });
        setQuantities(prev => {
            const next = { ...prev };
            delete next[`with_${item.uid}`];
            return next;
        });
    };

    return (
        <div className="h-full flex flex-col relative bg-[#1a1a1a]">
            {/* Tabs */}
            <div className="flex border-b border-[#3f3f3f] flex-shrink-0">
                <button
                    className={`flex-1 py-3 text-sm font-bold ${activeTab === 'deposit' ? 'bg-[#2a2a2a] text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-[#666] hover:bg-[#222]'}`}
                    onClick={() => setActiveTab('deposit')}
                >
                    보관 (Deposit)
                </button>
                <button
                    className={`flex-1 py-3 text-sm font-bold ${activeTab === 'withdraw' ? 'bg-[#2a2a2a] text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-[#666] hover:bg-[#222]'}`}
                    onClick={() => setActiveTab('withdraw')}
                >
                    출고 (Withdraw)
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-1 md:p-2 pb-2">
                {activeTab === 'deposit' ? (
                    <div className="space-y-1">
                        {state.inventory.length === 0 ? (
                            <div className="text-gray-500 text-center py-10 text-xs">
                                맡길 인벤토리 아이템이 없습니다.
                            </div>
                        ) : (
                            state.inventory.map((item) => {
                                const depQty = quantities[`dep_${item.uid}`] || 1;
                                const isStackable = item.count > 1;

                                return (
                                    <div key={item.uid} className="flex flex-col bg-black/40 p-1 md:p-1.5 rounded-sm border border-[#3f3f3f] hover:border-[#a59c77] transition-all group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 flex-grow min-w-0">
                                                {/* Item Icon */}
                                                <div className={`w-9 h-9 bg-[#111] border flex items-center justify-center relative flex-shrink-0 overflow-hidden ${item.isBlessed ? 'border-yellow-400' : 'border-[#3f3f3f] group-hover:border-[#a59c77]'}`}>
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                                    {item.enchant > 0 && <div className="absolute top-0 right-0 w-3 h-3 bg-blue-400 rounded-full shadow-[0_0_4px_#3b82f6] border border-black"></div>}
                                                    {item.isEquipped && <div className="absolute bottom-0 right-0 text-[8px] bg-red-900/80 text-white px-1 border border-red-500 rounded-tl">E</div>}
                                                </div>
                                                {/* Name */}
                                                <div className="flex flex-col min-w-0 flex-shrink pr-1">
                                                    <div className="flex items-center gap-1">
                                                        <span className={`text-[11px] md:text-xs font-bold truncate ${item.isBlessed ? 'text-white' : 'text-[#efefef]'}`}>
                                                            {item.enchant > 0 ? `+${item.enchant} ` : ''}{item.name}
                                                        </span>
                                                        {item.count > 1 && <span className="text-gray-400 text-[9px] font-mono">[{item.count}]</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action */}
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {isStackable && !item.isEquipped && (
                                                    <div className="flex items-center gap-1 bg-black/60 rounded-sm border border-[#3f3f3f] px-1">
                                                        <button onClick={() => handleQuantityChange(`dep_${item.uid}`, -1, item.count)} className="text-[#a59c77] hover:text-white text-[10px] w-5 h-5 flex items-center justify-center">▼</button>
                                                        <span className="text-[#d4af37] text-xs font-mono w-6 text-center">{depQty}</span>
                                                        <button onClick={() => handleQuantityChange(`dep_${item.uid}`, 1, item.count)} className="text-[#a59c77] hover:text-white text-[10px] w-5 h-5 flex items-center justify-center">▲</button>
                                                        <button onClick={() => setQuantities(prev => ({ ...prev, [`dep_${item.uid}`]: item.count }))} className="text-[#a59c77] hover:text-white text-[9px] px-1 border-l border-[#3f3f3f] ml-1">ALL</button>
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => handleDeposit(item)}
                                                    disabled={item.isEquipped}
                                                    className={`px-3 py-1.5 rounded-sm text-[10px] font-bold border flex-shrink-0 ${item.isEquipped ? 'border-gray-600 text-gray-600 cursor-not-allowed' : 'border-blue-900 bg-blue-900/20 text-blue-400 hover:bg-blue-900 hover:text-white active:scale-95 transition-all'}`}
                                                >
                                                    {item.isEquipped ? '장착중' : '맡기기'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                ) : (
                    <div className="space-y-1">
                        {!state.warehouse || state.warehouse.length === 0 ? (
                            <div className="text-gray-500 text-center py-10 text-xs">
                                창고가 비어 있습니다.
                            </div>
                        ) : (
                            state.warehouse.map((item) => {
                                const withQty = quantities[`with_${item.uid}`] || 1;
                                const isStackable = item.count > 1;

                                return (
                                    <div key={item.uid} className="flex flex-col bg-black/40 p-1 md:p-1.5 rounded-sm border border-[#3f3f3f] hover:border-[#a59c77] transition-all group">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2 flex-grow min-w-0">
                                                {/* Item Icon */}
                                                <div className={`w-9 h-9 bg-[#111] border flex items-center justify-center relative flex-shrink-0 overflow-hidden ${item.isBlessed ? 'border-yellow-400' : 'border-[#3f3f3f] group-hover:border-[#a59c77]'}`}>
                                                    <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                                                    {item.enchant > 0 && <div className="absolute top-0 right-0 w-3 h-3 bg-blue-400 rounded-full shadow-[0_0_4px_#3b82f6] border border-black"></div>}
                                                </div>
                                                {/* Name */}
                                                <div className="flex flex-col min-w-0 flex-shrink pr-1">
                                                    <div className="flex items-center gap-1">
                                                        <span className={`text-[11px] md:text-xs font-bold truncate ${item.isBlessed ? 'text-white' : 'text-[#efefef]'}`}>
                                                            {item.enchant > 0 ? `+${item.enchant} ` : ''}{item.name}
                                                        </span>
                                                        {item.count > 1 && <span className="text-gray-400 text-[9px] font-mono">[{item.count}]</span>}
                                                    </div>
                                                    <span className="text-[#ff5555] font-mono text-[9px]">
                                                        비용: 100 A
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Action */}
                                            <div className="flex items-center gap-1.5 flex-shrink-0">
                                                {isStackable && (
                                                    <div className="flex items-center gap-1 bg-black/60 rounded-sm border border-[#3f3f3f] px-1">
                                                        <button onClick={() => handleQuantityChange(`with_${item.uid}`, -1, item.count)} className="text-[#a59c77] hover:text-white text-[10px] w-5 h-5 flex items-center justify-center">▼</button>
                                                        <span className="text-[#d4af37] text-xs font-mono w-6 text-center">{withQty}</span>
                                                        <button onClick={() => handleQuantityChange(`with_${item.uid}`, 1, item.count)} className="text-[#a59c77] hover:text-white text-[10px] w-5 h-5 flex items-center justify-center">▲</button>
                                                        <button onClick={() => setQuantities(prev => ({ ...prev, [`with_${item.uid}`]: item.count }))} className="text-[#a59c77] hover:text-white text-[9px] px-1 border-l border-[#3f3f3f] ml-1">ALL</button>
                                                    </div>
                                                )}

                                                <button
                                                    onClick={() => handleWithdraw(item)}
                                                    disabled={state.adena < 100}
                                                    className={`px-3 py-1.5 rounded-sm text-[10px] font-bold border flex-shrink-0 ${state.adena < 100 ? 'border-gray-600 text-gray-600 cursor-not-allowed' : 'border-green-900 bg-green-900/20 text-green-400 hover:bg-green-900 hover:text-white active:scale-95 transition-all'}`}
                                                >
                                                    꺼내기
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
        </div>
    );
};

export default Warehouse;
