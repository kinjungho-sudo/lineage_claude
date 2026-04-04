import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';

const SLOT_COUNT = 8;

const ItemSlot = ({ item, onClick, isOffer, readOnly }) => (
    <div
        onClick={() => !readOnly && onClick && onClick(item)}
        className={`w-11 h-11 bg-[#111] border flex items-center justify-center relative overflow-hidden
            ${item
                ? isOffer
                    ? readOnly ? 'border-emerald-700 cursor-default' : 'border-blue-700 cursor-pointer hover:border-red-500 group'
                    : 'border-[#444] cursor-pointer hover:border-blue-500'
                : 'border-[#2a2a2a]'
            }`}
        title={item ? `${item.enchant > 0 ? `+${item.enchant} ` : ''}${item.name}${!readOnly && isOffer ? ' (클릭하여 제거)' : ''}` : ''}
    >
        {item ? (
            <>
                <img src={item.image} alt={item.name} className="w-10 h-10 object-contain" />
                {item.enchant > 0 && (
                    <span className="absolute bottom-0 right-0.5 text-[9px] text-green-400 font-bold leading-none">{`+${item.enchant}`}</span>
                )}
                {item.count > 1 && (
                    <span className="absolute top-0 left-0.5 text-[8px] text-gray-400 leading-none">{item.count}</span>
                )}
                {!readOnly && isOffer && (
                    <div className="absolute inset-0 bg-red-900/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
            </>
        ) : null}
    </div>
);

const TradeWindow = () => {
    const { state, tradeState, updateMyOffer, confirmTrade, cancelTrade } = useGame();
    const [adenaInput, setAdenaInput] = useState('0');

    const adenaFromOffer = tradeState?.myOffer?.adena;
    useEffect(() => {
        if (adenaFromOffer !== undefined) {
            // eslint-disable-next-line react-hooks/set-state-in-effect
            setAdenaInput(String(adenaFromOffer || 0));
        }
    }, [adenaFromOffer]);

    if (!tradeState) return null;

    const { status, partner, myOffer, partnerOffer, myConfirmed, partnerConfirmed } = tradeState;
    const myItems = myOffer.items;
    const myAdena = myOffer.adena;

    const handleAddItem = (item) => {
        if (item.isEquipped) return;
        if (myItems.find(i => i.uid === item.uid)) return;
        if (myItems.length >= SLOT_COUNT) return;
        updateMyOffer([...myItems, item], myAdena);
    };

    const handleRemoveItem = (item) => {
        updateMyOffer(myItems.filter(i => i.uid !== item.uid), myAdena);
    };

    const applyAdena = (val) => {
        const num = Math.max(0, Math.min(state.adena, parseInt(val, 10) || 0));
        setAdenaInput(String(num));
        updateMyOffer(myItems, num);
    };

    const handleAdenaClick = () => {
        const num = Math.min(state.adena, myAdena + 1000);
        setAdenaInput(String(num));
        updateMyOffer(myItems, num);
    };

    const availableInventory = state.inventory.filter(
        i => !i.isEquipped && !myItems.find(m => m.uid === i.uid)
    );

    if (status === 'pending') {
        return (
            <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                <div className="bg-[#1a1a1a] border border-[#a59c77] p-6 text-center w-72">
                    <div className="text-[#d4af37] font-bold text-base mb-1">거래 신청 중</div>
                    <div className="text-gray-300 text-xs mb-3">
                        <span className="text-white font-bold">{partner}</span>님에게 거래를 신청했습니다.<br />
                        상대방의 응답을 기다리는 중...
                    </div>
                    <div className="flex justify-center gap-1 mb-4">
                        {[0, 1, 2].map(i => (
                            <span key={i} className="w-2 h-2 rounded-full bg-[#d4af37] animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                        ))}
                    </div>
                    <button
                        onClick={cancelTrade}
                        className="px-4 py-1.5 bg-red-900/40 border border-red-700 text-red-300 text-xs hover:bg-red-800/60"
                    >
                        취소
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/75 backdrop-blur-sm">
            <div className="bg-[#1a1a1a] border border-[#a59c77] w-[580px] max-w-[96vw] flex flex-col select-none">
                {/* Header */}
                <div className="bg-[#2a2a1a] border-b border-[#3f3f3f] px-3 py-2 flex justify-between items-center">
                    <span className="text-[#d4af37] font-bold text-sm">
                        ⚔ 거래 — <span className="text-white">{partner}</span>
                    </span>
                    <button
                        onClick={cancelTrade}
                        className="px-2 py-1 text-red-400 hover:text-red-300 border border-red-900/60 hover:border-red-700 text-[11px]"
                    >
                        거래 취소
                    </button>
                </div>

                {/* Offer panels */}
                <div className="flex border-b border-[#3f3f3f]">

                    {/* My offer */}
                    <div className="flex-1 p-2.5 border-r border-[#3f3f3f]">
                        <div className="text-[#a59c77] text-[11px] font-bold mb-1.5">내 제안 (클릭하여 제거)</div>
                        <div className="grid grid-cols-4 gap-1 mb-2">
                            {Array.from({ length: SLOT_COUNT }).map((_, idx) => (
                                <ItemSlot
                                    key={idx}
                                    item={myItems[idx] || null}
                                    onClick={handleRemoveItem}
                                    isOffer
                                    readOnly={false}
                                />
                            ))}
                        </div>
                        {/* Adena row */}
                        <div className="flex items-center gap-1.5 mt-1">
                            <span className="text-[#a59c77] text-[11px] flex-shrink-0">아데나</span>
                            <input
                                type="number"
                                value={adenaInput}
                                onChange={e => setAdenaInput(e.target.value)}
                                onBlur={e => applyAdena(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && applyAdena(adenaInput)}
                                min={0}
                                max={state.adena}
                                className="w-24 bg-[#111] border border-[#444] focus:border-[#d4af37] text-[#d4af37] text-xs px-1.5 py-0.5 text-right outline-none"
                            />
                            <button
                                onClick={handleAdenaClick}
                                className="px-2 py-0.5 bg-[#2a2a1a] border border-[#666] text-[#a59c77] text-[10px] hover:border-[#d4af37] hover:text-[#d4af37] whitespace-nowrap"
                            >
                                +1,000
                            </button>
                        </div>
                        <div className="text-[#555] text-[10px] mt-0.5">
                            보유: {state.adena.toLocaleString()} 아데나
                        </div>
                    </div>

                    {/* Partner offer */}
                    <div className="flex-1 p-2.5">
                        <div className="text-[#a59c77] text-[11px] font-bold mb-1.5">상대 제안</div>
                        <div className="grid grid-cols-4 gap-1 mb-2">
                            {Array.from({ length: SLOT_COUNT }).map((_, idx) => (
                                <ItemSlot
                                    key={idx}
                                    item={partnerOffer.items[idx] || null}
                                    isOffer
                                    readOnly
                                />
                            ))}
                        </div>
                        <div className="text-[#a59c77] text-[11px] mt-1">
                            아데나: <span className="text-[#d4af37] font-bold">{(partnerOffer.adena || 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                {/* Inventory */}
                <div className="p-2.5 border-b border-[#3f3f3f]">
                    <div className="text-[#666] text-[10px] mb-1.5">
                        인벤토리 — 아이템 클릭 시 내 제안에 추가 ({myItems.length}/{SLOT_COUNT} 슬롯 사용)
                    </div>
                    <div className="flex flex-wrap gap-1 max-h-[88px] overflow-y-auto custom-scrollbar">
                        {availableInventory.length === 0 ? (
                            <div className="text-[#444] text-xs py-3 w-full text-center">추가할 아이템이 없습니다.</div>
                        ) : (
                            availableInventory.map(item => (
                                <ItemSlot
                                    key={item.uid}
                                    item={item}
                                    onClick={handleAddItem}
                                    isOffer={false}
                                />
                            ))
                        )}
                    </div>
                </div>

                {/* Confirm bar */}
                <div className="px-3 py-2 flex items-center justify-between bg-[#161616]">
                    <div className="text-[11px]">
                        {partnerConfirmed
                            ? <span className="text-green-400 font-bold">● 상대방 교환 확인 완료</span>
                            : <span className="text-[#555]">● 상대방 확인 대기 중</span>
                        }
                    </div>
                    <button
                        onClick={confirmTrade}
                        disabled={myConfirmed}
                        className={`px-5 py-1.5 text-sm font-bold border transition-all ${
                            myConfirmed
                                ? 'border-green-700 text-green-500 bg-green-900/20 cursor-not-allowed'
                                : 'border-[#d4af37] text-[#d4af37] bg-[#2a2a1a] hover:bg-[#d4af37]/20 active:scale-95'
                        }`}
                    >
                        {myConfirmed ? '✓ 확인 완료' : '교환 확인'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default TradeWindow;
