import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { GAME_ACTIONS } from '../context/GameReducer';

const ItemRow = ({ item, actionLabel, actionColor, onAction, disabled, disabledLabel, quantities, onQtyChange, qtyKey }) => {
    const qty = quantities[qtyKey] || 1;
    const isStackable = item.count > 1;
    return (
        <div className="flex flex-col bg-black/40 p-1 md:p-1.5 rounded-sm border border-[#3f3f3f] hover:border-[#a59c77] transition-all group">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 flex-grow min-w-0">
                    <div className={`w-9 h-9 bg-[#111] border flex items-center justify-center relative flex-shrink-0 overflow-hidden ${item.isBlessed ? 'border-yellow-400' : 'border-[#3f3f3f] group-hover:border-[#a59c77]'}`}>
                        <img src={item.image} alt={item.name} className="w-full h-full object-contain" />
                        {item.enchant > 0 && <div className="absolute top-0 right-0 w-3 h-3 bg-blue-400 rounded-full shadow-[0_0_4px_#3b82f6] border border-black"></div>}
                        {item.isEquipped && <div className="absolute bottom-0 right-0 text-[8px] bg-red-900/80 text-white px-1 border border-red-500 rounded-tl">E</div>}
                    </div>
                    <div className="flex flex-col min-w-0 flex-shrink pr-1">
                        <div className="flex items-center gap-1">
                            <span className={`text-[11px] md:text-xs font-bold truncate ${item.isBlessed ? 'text-white' : 'text-[#efefef]'}`}>
                                {item.enchant > 0 ? `+${item.enchant} ` : ''}{item.name}
                            </span>
                            {item.count > 1 && <span className="text-gray-400 text-[9px] font-mono">[{item.count}]</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    {isStackable && !disabled && (
                        <div className="flex items-center gap-1 bg-black/60 rounded-sm border border-[#3f3f3f] px-1">
                            <button onClick={() => onQtyChange(qtyKey, -1, item.count)} className="text-[#a59c77] hover:text-white text-[10px] w-5 h-5 flex items-center justify-center">▼</button>
                            <span className="text-[#d4af37] text-xs font-mono w-6 text-center">{qty}</span>
                            <button onClick={() => onQtyChange(qtyKey, 1, item.count)} className="text-[#a59c77] hover:text-white text-[10px] w-5 h-5 flex items-center justify-center">▲</button>
                            <button onClick={() => onQtyChange(qtyKey, item.count, item.count)} className="text-[#a59c77] hover:text-white text-[9px] px-1 border-l border-[#3f3f3f] ml-1">ALL</button>
                        </div>
                    )}
                    <button
                        onClick={() => onAction(item, qty)}
                        disabled={disabled}
                        className={`px-3 py-1.5 rounded-sm text-[10px] font-bold border flex-shrink-0 ${disabled ? 'border-gray-600 text-gray-600 cursor-not-allowed' : actionColor}`}
                    >
                        {disabled ? (disabledLabel || actionLabel) : actionLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

const Warehouse = () => {
    const { state, dispatch } = useGame();
    const [quantities, setQuantities] = useState({});
    const [activeTab, setActiveTab] = useState('deposit'); // 'deposit' | 'withdraw'

    const handleQtyChange = (key, change, maxCount) => {
        setQuantities(prev => {
            const current = prev[key] || 1;
            const next = change > 1 ? change : Math.max(1, Math.min(maxCount, current + change));
            return { ...prev, [key]: next };
        });
    };

    const tabs = [
        { id: 'deposit',  label: '보관' },
        { id: 'withdraw', label: '출고' },
    ];

    return (
        <div className="h-full flex flex-col relative bg-[#1a1a1a]">
            {/* Tabs */}
            <div className="flex border-b border-[#3f3f3f] flex-shrink-0">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        className={`flex-1 py-2 text-[11px] font-bold ${activeTab === tab.id ? 'bg-[#2a2a2a] text-[#d4af37] border-b-2 border-[#d4af37]' : 'text-[#666] hover:bg-[#222]'}`}
                        onClick={() => setActiveTab(tab.id)}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Notice */}
            <div className="px-2 py-1.5 bg-[#1a2a1a] border-b border-[#2a4a2a] text-[10px] text-[#88cc88] flex-shrink-0">
                같은 계정의 모든 캐릭터가 공유하는 창고입니다. 수수료 없음.
            </div>

            {/* Content */}
            <div className="flex-1 min-h-0 overflow-y-auto custom-scrollbar p-1 md:p-2 pb-2 space-y-1">

                {/* 보관 */}
                {activeTab === 'deposit' && (
                    state.inventory.length === 0
                        ? <div className="text-gray-500 text-center py-10 text-xs">맡길 아이템이 없습니다.</div>
                        : state.inventory.map(item => (
                            <ItemRow
                                key={item.uid}
                                item={item}
                                actionLabel="맡기기"
                                disabledLabel="장착중"
                                actionColor="border-emerald-800 bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900 hover:text-white active:scale-95 transition-all"
                                disabled={item.isEquipped}
                                quantities={quantities}
                                qtyKey={`dep_${item.uid}`}
                                onQtyChange={handleQtyChange}
                                onAction={(it, qty) => {
                                    dispatch({ type: GAME_ACTIONS.DEPOSIT_SHARED_WAREHOUSE, payload: { uid: it.uid, quantity: qty } });
                                    setQuantities(p => { const n = { ...p }; delete n[`dep_${it.uid}`]; return n; });
                                }}
                            />
                        ))
                )}

                {/* 출고 */}
                {activeTab === 'withdraw' && (
                    !state.sharedWarehouse || state.sharedWarehouse.length === 0
                        ? <div className="text-gray-500 text-center py-10 text-xs">창고가 비어 있습니다.</div>
                        : state.sharedWarehouse.map(item => (
                            <ItemRow
                                key={item.uid}
                                item={item}
                                actionLabel="꺼내기"
                                actionColor="border-emerald-800 bg-emerald-900/20 text-emerald-400 hover:bg-emerald-900 hover:text-white active:scale-95 transition-all"
                                disabled={false}
                                quantities={quantities}
                                qtyKey={`with_${item.uid}`}
                                onQtyChange={handleQtyChange}
                                onAction={(it, qty) => {
                                    dispatch({ type: GAME_ACTIONS.WITHDRAW_SHARED_WAREHOUSE, payload: { uid: it.uid, quantity: qty } });
                                    setQuantities(p => { const n = { ...p }; delete n[`with_${it.uid}`]; return n; });
                                }}
                            />
                        ))
                )}
            </div>
        </div>
    );
};

export default Warehouse;
