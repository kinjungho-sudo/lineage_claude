import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { supabase } from '../lib/supabase';
import { calculateStats, getMaxHp, getMaxMp } from '../mechanics/combat';

const FriendList = () => {
    const { state, dispatch } = useGame();
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [friendInfo, setFriendInfo] = useState(null);
    const [isLoadingInfo, setIsLoadingInfo] = useState(false);

    const handleFriendClick = async (friendName) => {
        setSelectedFriend(friendName);
        setFriendInfo(null);
        setIsLoadingInfo(true);

        try {
            if (supabase.isOffline) {
                // 임시 오프라인 데이터
                setTimeout(() => {
                    setFriendInfo({
                        level: Math.floor(Math.random() * 50) + 1,
                        hp: '???', maxHp: '???', mp: '???', maxMp: '???',
                        ac: '???',
                        equipment: null
                    });
                    setIsLoadingInfo(false);
                }, 500);
                return;
            }

            const { data, error } = await supabase
                .from('users')
                .select('game_data')
                .eq('nickname', friendName)
                .single();

            if (error || !data || !data.game_data) {
                setFriendInfo({ notFound: true });
            } else {
                const gd = data.game_data;
                const stats = calculateStats(gd);
                const maxHp = getMaxHp(gd, stats);
                const maxMp = getMaxMp(gd, stats);

                // calculate base + total stats
                const totalStr = (16 + Math.floor(gd.level / 10)) + (stats.str || 0) + (gd.allocatedStr || 0);
                const totalDex = (13 + Math.floor(gd.level / 12)) + (stats.dex || 0);
                const totalCon = (18 + Math.floor(gd.level / 15)) + (stats.con || 0) + (gd.allocatedCon || 0);
                const totalInt = 8 + (stats.int || 0);
                const totalWis = (9 + Math.floor(gd.level / 12)) + (stats.wis || 0);
                const totalCha = 12 + (stats.cha || 0);
                
                const mr = 10 + Math.floor(totalWis / 2) + Math.floor(totalInt / 2) + (stats.mrBonus || 0);

                setFriendInfo({
                    gd: gd,
                    stats: stats,
                    maxHp, maxMp, mr,
                    totalStr, totalDex, totalCon, totalInt, totalWis, totalCha
                });
            }
        } catch (err) {
            setFriendInfo({ error: true });
        } finally {
            setIsLoadingInfo(false);
        }
    };

    const slots = [
        { key: 'helm', x: 120, y: 30, label: '투구' },
        { key: 'cloak', x: 170, y: 70, label: '망토' },
        { key: 'shirt', x: 120, y: 70, label: '티셔츠' },
        { key: 'armor', x: 120, y: 120, label: '갑옷' },
        { key: 'gloves', x: 70, y: 160, label: '장갑' },
        { key: 'boots', x: 170, y: 160, label: '부츠' },
        { key: 'weapon', x: 70, y: 90, label: '무기' },
        { key: 'shield', x: 170, y: 110, label: '방패' },
        { key: 'belt', x: 120, y: 160, label: '벨트' },
        { key: 'necklace', x: 170, y: 30, label: '목걸이' },
        { key: 'ring_l', x: 70, y: 200, label: '반지' },
        { key: 'ring_r', x: 170, y: 200, label: '반지' }
    ];

    const handleRemoveFriend = (friendName, e) => {
        e.stopPropagation();
        if (window.confirm(`${friendName}님을 친구 목록에서 삭제하시겠습니까?`)) {
            dispatch({ type: 'REMOVE_FRIEND', payload: friendName });
            if (selectedFriend === friendName) {
                setSelectedFriend(null);
                setFriendInfo(null);
            }
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#111] text-gray-200 text-xs p-2 gap-2">
            <div className="flex gap-2 h-full min-h-0">
                {/* 왼쪽: 친구 목록 (30%) */}
                <div className="w-[35%] flex flex-col border border-[#444] bg-[#1a1a1a]">
                    <div className="bg-[#2a2a2a] border-b border-[#444] p-1 text-center font-bold text-[#d4af37]">
                        목록 ({state.friends.length})
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                        {state.friends.length === 0 ? (
                            <div className="text-gray-500 text-center mt-4">
                                친구 없음<br />
                                <span className="text-[9px]">/친구추가 [이름]</span>
                            </div>
                        ) : (
                            state.friends.map(f => (
                                <div 
                                    key={f}
                                    onClick={() => handleFriendClick(f)}
                                    className={`flex justify-between items-center p-1.5 cursor-pointer border-b border-[#333] hover:bg-[#333] transition-colors ${selectedFriend === f ? 'bg-[#444] text-[#d4af37] border-l-2 border-l-[#d4af37]' : ''}`}
                                >
                                    <span className="truncate max-w-[80px]" title={f}>{f}</span>
                                    <button 
                                        onClick={(e) => handleRemoveFriend(f, e)}
                                        className="text-red-500 hover:text-red-400 px-1 text-xs"
                                        title="삭제"
                                    >×</button>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* 오른쪽: 상세 정보 (65%) */}
                <div className="flex-1 border border-[#444] bg-black/60 relative flex flex-col min-w-0">
                    <div className="bg-[#2a2a2a] border-b border-[#444] p-1 flex justify-between items-center px-2">
                        <span className="font-bold text-[#fff]">캐릭터 상세 정보</span>
                        <button 
                            className={`px-2 py-0.5 rounded text-[10px] ${selectedFriend ? 'bg-pink-900/50 border border-pink-700 text-pink-300 hover:bg-pink-800/80 cursor-pointer' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                            onClick={() => {
                                if (selectedFriend) alert(`채팅창에 ["${selectedFriend} 할말] 을 입력해 귓속말을 보내세요!`);
                            }}
                            disabled={!selectedFriend}
                        >
                            귓속말
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                        {!selectedFriend && (
                            <div className="text-gray-500 text-center mt-10">
                                리스트에서 친구를 선택해주세요.
                            </div>
                        )}
                        {isLoadingInfo && (
                            <div className="text-[#d4af37] text-center animate-pulse mt-10">
                                데이터를 동기화 중입니다...<br />(데이터베이스 조회 중)
                            </div>
                        )}
                        {friendInfo && !isLoadingInfo && (
                            <div className="w-full flex flex-col gap-2 relative">
                                {friendInfo.notFound || friendInfo.error ? (
                                    <div className="text-red-400 text-center mt-10 p-4 border border-red-900 bg-red-950/20 rounded">
                                        <span className="text-xl px-2">👻</span><br/>
                                        캐릭터 데이터를 불러올 수 없습니다.<br/>
                                        해당 아이디가 생성되지 않았거나<br/>
                                        서버 연결 문제일 수 있습니다.
                                    </div>
                                ) : (
                                    <>
                                        <div className="text-[#aaddff] text-base font-bold text-center border-b border-blue-900/50 pb-1 mb-1 shadow-[0_4px_10px_rgba(0,0,0,0.5)]">
                                            {selectedFriend} <span className="text-[#d4af37] text-sm ml-1">Lv.{friendInfo.gd.level}</span>
                                        </div>

                                        {/* Paper Doll Section */}
                                        <div className="h-[250px] relative bg-[#151515] border border-[#3f3f3f] mt-1 mb-2 rounded overflow-hidden">
                                            <div className="absolute inset-0 opacity-10 pointer-events-none flex justify-center items-center">
                                                <svg width="200" height="200" viewBox="0 0 200 200" fill="#333">
                                                    <path d="M100 20 L130 50 L120 150 L100 180 L80 150 L70 50 Z" />
                                                </svg>
                                            </div>

                                            {slots.map(({ key, x, y, label }) => {
                                                const item = friendInfo.gd.equipment[key];
                                                // Adjust local coordinates for smaller pane if necessary.
                                                // FriendList right panel is narrower.
                                                const scale = 0.9;
                                                const adjX = (x * scale) + 10;
                                                const adjY = (y * scale) - 10;

                                                return (
                                                    <div key={key}
                                                        className="absolute flex items-center justify-center border border-[#333] bg-black/40"
                                                        style={{ left: adjX, top: adjY, width: 40, height: 40 }}
                                                    >
                                                        <div className="relative w-full h-full flex items-center justify-center">
                                                            {item ? (
                                                                <>
                                                                    <img src={item.image} alt={item.name} className="w-8 h-8 object-contain" title={item.name} />
                                                                    {item.enchant > 0 && (
                                                                        <span className="absolute bottom-[-2px] right-0 text-[9px] text-[#00ff00] font-bold text-shadow-sm truncate">+{item.enchant}</span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span className="text-[8px] text-[#444]">{label}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* 테이블 형식 스탯 */}
                                        <div className="bg-[#1a1a1a] p-2 text-xs text-[#aaa] border border-[#333]">
                                            <table className="w-full">
                                                <tbody>
                                                    <tr>
                                                        <td className="text-[#a59c77]">HP</td>
                                                        <td className="text-right text-red-300 font-bold whitespace-nowrap">
                                                            {friendInfo.gd.hp} <span className="text-[10px] text-[#666] font-normal">/ {friendInfo.maxHp}</span>
                                                        </td>
                                                        <td className="w-2"></td>
                                                        <td className="text-[#a59c77]">MP</td>
                                                        <td className="text-right text-blue-300 font-bold">{friendInfo.gd.mp} / {friendInfo.maxMp}</td>
                                                    </tr>
                                                    <tr>
                                                        <td className="text-[#a59c77]">AC</td>
                                                        <td className="text-right text-green-300 font-bold">
                                                            {friendInfo.stats.ac}
                                                        </td>
                                                        <td></td>
                                                        <td className="text-[#a59c77]">MR</td>
                                                        <td className="text-right font-bold text-white">{friendInfo.mr}%</td>
                                                    </tr>
                                                    <tr><td colSpan={5} className="h-2"></td></tr>
                                                    <tr>
                                                        <td>STR</td><td className="text-right text-white font-bold">{friendInfo.totalStr}</td>
                                                        <td></td>
                                                        <td>DEX</td><td className="text-right text-white font-bold">{friendInfo.totalDex}</td>
                                                    </tr>
                                                    <tr>
                                                        <td>CON</td><td className="text-right text-white font-bold">{friendInfo.totalCon}</td>
                                                        <td></td>
                                                        <td>INT</td><td className="text-right text-white font-bold">{friendInfo.totalInt}</td>
                                                    </tr>
                                                    <tr>
                                                        <td>WIS</td><td className="text-right text-white font-bold">{friendInfo.totalWis}</td>
                                                        <td></td>
                                                        <td>CHA</td><td className="text-right text-white font-bold">{friendInfo.totalCha}</td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FriendList;
