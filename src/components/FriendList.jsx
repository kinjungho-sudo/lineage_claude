import React, { useState, useEffect } from 'react';
import { useGame } from '../context/GameContext';
import { GAME_ACTIONS } from '../context/GameReducer';
import { supabase } from '../lib/supabase';
import { calculateStats, getMaxHp, getMaxMp } from '../mechanics/combat';

const ONLINE_THRESHOLD_MS = 90000; // 90초 이내 저장 = 온라인

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

// 모든 유저 데이터를 가져와 클라이언트 측에서 캐릭터 이름으로 검색
const fetchAllUsers = async () => {
    const { data, error } = await supabase.from('users').select('game_data').limit(200);
    if (error) return [];
    return data || [];
};

const FriendList = ({ onInviteToParty, currentParty }) => {
    const { state, dispatch, tradeState, sendTradeRequest } = useGame();
    const [selectedFriend, setSelectedFriend] = useState(null);
    const [friendInfo, setFriendInfo] = useState(null);
    const [isLoadingInfo, setIsLoadingInfo] = useState(false);
    const [friendStatuses, setFriendStatuses] = useState({});
    const [showAddPanel, setShowAddPanel] = useState(false);
    const [searchInput, setSearchInput] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // 컴포넌트 마운트 시 온라인 상태 일괄 조회
    useEffect(() => {
        if (state.friends.length === 0 || supabase.isOffline) return;
        loadAllFriendStatuses();
    }, [state.friends.length]); // eslint-disable-line react-hooks/exhaustive-deps

    const loadAllFriendStatuses = async () => {
        try {
            const rows = await fetchAllUsers();
            const statuses = {};
            rows.forEach(row => {
                const gd = row.game_data;
                if (!gd?.allCharacters) return;
                gd.allCharacters.forEach(char => {
                    if (char.characterName && state.friends.includes(char.characterName)) {
                        statuses[char.characterName] = !!(gd.lastSeen && (Date.now() - gd.lastSeen) < ONLINE_THRESHOLD_MS);
                    }
                });
            });
            setFriendStatuses(statuses);
        } catch { /* silent */ }
    };

    // 캐릭터 이름으로 검색
    const handleSearch = async () => {
        const name = searchInput.trim();
        if (!name) return;
        setIsSearching(true);
        setSearchResults([]);
        try {
            if (supabase.isOffline) { setIsSearching(false); return; }
            const rows = await fetchAllUsers();
            const matches = [];
            rows.forEach(row => {
                (row.game_data?.allCharacters || []).forEach(char => {
                    if (!char.characterName) return;
                    if (!char.characterName.toLowerCase().includes(name.toLowerCase())) return;
                    if (state.friends.includes(char.characterName)) return;
                    if (char.characterName === state.characterName) return;
                    matches.push({
                        characterName: char.characterName,
                        level: char.level || 1,
                        characterClass: char.characterClass || 'knight',
                    });
                });
            });
            setSearchResults(matches.slice(0, 20));
        } catch {
            setSearchResults([]);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddFriend = (characterName) => {
        dispatch({ type: GAME_ACTIONS.ADD_FRIEND, payload: characterName });
        setShowAddPanel(false);
        setSearchInput('');
        setSearchResults([]);
    };

    const handleFriendClick = async (friendName) => {
        setSelectedFriend(friendName);
        setFriendInfo(null);
        setIsLoadingInfo(true);
        setShowAddPanel(false);

        try {
            if (supabase.isOffline) {
                setTimeout(() => {
                    setFriendInfo({ level: '?', hp: '???', maxHp: '???', mp: '???', maxMp: '???', ac: '???', equipment: null });
                    setIsLoadingInfo(false);
                }, 500);
                return;
            }

            const rows = await fetchAllUsers();
            let targetChar = null;
            let lastSeen = null;

            for (const row of rows) {
                const gd = row.game_data;
                const char = gd?.allCharacters?.find(c => c.characterName === friendName);
                if (char) {
                    targetChar = char;
                    lastSeen = gd.lastSeen;
                    break;
                }
            }

            if (!targetChar) {
                setFriendInfo({ notFound: true });
                return;
            }

            // 온라인 상태 업데이트
            setFriendStatuses(prev => ({
                ...prev,
                [friendName]: !!(lastSeen && (Date.now() - lastSeen) < ONLINE_THRESHOLD_MS)
            }));

            const stats = calculateStats(targetChar);
            const maxHp = getMaxHp(targetChar, stats);
            const maxMp = getMaxMp(targetChar, stats);

            // calculateStats가 이미 base+equipment+allocated를 합산해서 반환 — 직접 사용
            const totalStr = stats.str || 0;
            const totalDex = stats.dex || 0;
            const totalCon = stats.con || 0;
            const totalInt = stats.int || 0;
            const totalWis = stats.wis || 0;
            const totalCha = 12;
            const mr = 10 + Math.floor(totalWis / 2) + Math.floor(totalInt / 2) + (stats.mrBonus || 0);

            setFriendInfo({ gd: targetChar, stats, maxHp, maxMp, mr, totalStr, totalDex, totalCon, totalInt, totalWis, totalCha });
        } catch {
            setFriendInfo({ error: true });
        } finally {
            setIsLoadingInfo(false);
        }
    };

    const handleRemoveFriend = (friendName, e) => {
        e.stopPropagation();
        if (window.confirm(`${friendName}님을 친구 목록에서 삭제하시겠습니까?`)) {
            dispatch({ type: GAME_ACTIONS.REMOVE_FRIEND, payload: friendName });
            if (selectedFriend === friendName) { setSelectedFriend(null); setFriendInfo(null); }
        }
    };

    const openAddPanel = () => {
        setShowAddPanel(true);
        setSelectedFriend(null);
        setFriendInfo(null);
        setSearchResults([]);
        setSearchInput('');
    };

    const isOnline = (name) => friendStatuses[name] === true;

    return (
        <div className="flex flex-col h-full bg-[#111] text-gray-200 text-xs p-2 gap-2">
            <div className="flex gap-2 h-full min-h-0">

                {/* 왼쪽: 친구 목록 */}
                <div className="w-[35%] flex flex-col border border-[#444] bg-[#1a1a1a]">
                    <div className="bg-[#2a2a2a] border-b border-[#444] p-1 text-center font-bold text-[#d4af37]">
                        목록 ({state.friends.length})
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-1">
                        {state.friends.length === 0 && (
                            <div className="text-gray-500 text-center mt-4 text-[10px]">
                                친구 없음
                            </div>
                        )}
                        {state.friends.map(f => (
                            <div
                                key={f}
                                onClick={() => handleFriendClick(f)}
                                className={`flex justify-between items-center p-1.5 cursor-pointer border-b border-[#333] hover:bg-[#333] transition-colors ${selectedFriend === f && !showAddPanel ? 'bg-[#444] text-[#d4af37] border-l-2 border-l-[#d4af37]' : ''}`}
                            >
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span
                                        className={`w-2 h-2 rounded-full flex-shrink-0 ${isOnline(f) ? 'bg-green-500 shadow-[0_0_4px_#22c55e]' : 'bg-red-600'}`}
                                        title={isOnline(f) ? '접속 중' : '오프라인'}
                                    />
                                    <span className="truncate max-w-[70px]" title={f}>{f}</span>
                                </div>
                                <button
                                    onClick={(e) => handleRemoveFriend(f, e)}
                                    className="text-red-500 hover:text-red-400 px-1 flex-shrink-0"
                                    title="삭제"
                                >×</button>
                            </div>
                        ))}
                    </div>
                    <div className="border-t border-[#444] p-1">
                        <button
                            onClick={openAddPanel}
                            className={`w-full py-1 text-[10px] font-bold border transition-all ${showAddPanel ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]' : 'bg-[#2a2a2a] border-[#555] text-[#a59c77] hover:border-[#d4af37] hover:text-[#d4af37]'}`}
                        >
                            + 친구 추가
                        </button>
                    </div>
                </div>

                {/* 오른쪽: 친구 추가 패널 or 상세 정보 */}
                <div className="flex-1 border border-[#444] bg-black/60 relative flex flex-col min-w-0">
                    {showAddPanel ? (
                        <>
                            <div className="bg-[#2a2a2a] border-b border-[#444] p-1 flex justify-between items-center px-2">
                                <span className="font-bold text-[#d4af37]">친구 추가</span>
                                <button onClick={() => setShowAddPanel(false)} className="text-gray-400 hover:text-white px-1">✕</button>
                            </div>
                            <div className="p-3 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
                                <div className="flex gap-1">
                                    <input
                                        type="text"
                                        value={searchInput}
                                        onChange={e => setSearchInput(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                                        placeholder="캐릭터 이름 검색..."
                                        className="flex-1 bg-[#111] border border-[#333] text-[#efefef] px-2 py-1 text-xs focus:border-[#d4af37] outline-none"
                                    />
                                    <button
                                        onClick={handleSearch}
                                        disabled={isSearching || !searchInput.trim()}
                                        className="px-3 py-1 bg-[#2a2a2a] border border-[#d4af37] text-[#d4af37] text-[10px] font-bold hover:bg-[#d4af37]/20 disabled:opacity-40 disabled:cursor-not-allowed"
                                    >
                                        {isSearching ? '...' : '검색'}
                                    </button>
                                </div>
                                {!isSearching && searchInput && searchResults.length === 0 && (
                                    <div className="text-gray-500 text-center py-4">검색 결과 없음</div>
                                )}
                                <div className="space-y-1">
                                    {searchResults.map(r => (
                                        <div key={r.characterName} className="flex justify-between items-center p-2 bg-[#1a1a1a] border border-[#333] hover:border-[#555]">
                                            <div>
                                                <span className="text-[#aaddff] font-bold">{r.characterName}</span>
                                                <span className="text-[#666] ml-2">Lv.{r.level} {r.characterClass === 'knight' ? '기사' : '요정'}</span>
                                            </div>
                                            <button
                                                onClick={() => handleAddFriend(r.characterName)}
                                                className="px-2 py-0.5 bg-[#d4af37]/20 border border-[#d4af37] text-[#d4af37] text-[10px] hover:bg-[#d4af37]/40"
                                            >
                                                추가
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="bg-[#2a2a2a] border-b border-[#444] p-1 flex justify-between items-center px-2">
                                <span className="font-bold text-[#fff]">캐릭터 상세 정보</span>
                                <div className="flex gap-1">
                                    {onInviteToParty && (
                                        <button
                                            className={`px-2 py-0.5 rounded text-[10px] ${selectedFriend && isOnline(selectedFriend) && !currentParty ? 'bg-emerald-900/50 border border-emerald-700 text-emerald-300 hover:bg-emerald-800/80 cursor-pointer' : 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed'}`}
                                            onClick={() => {
                                                if (!selectedFriend || !isOnline(selectedFriend) || currentParty) return;
                                                const info = friendInfo;
                                                onInviteToParty(selectedFriend, info?.gd?.characterClass || 'knight', info?.gd?.level || 1);
                                            }}
                                            disabled={!selectedFriend || !isOnline(selectedFriend) || !!currentParty}
                                            title={currentParty ? '이미 파티 중입니다' : !isOnline(selectedFriend) ? '오프라인 상태입니다' : '파티 초대'}
                                        >
                                            파티
                                        </button>
                                    )}
                                    <button
                                        className={`px-2 py-0.5 rounded text-[10px] ${selectedFriend && isOnline(selectedFriend) && !tradeState ? 'bg-yellow-900/50 border border-yellow-700 text-yellow-300 hover:bg-yellow-800/80 cursor-pointer' : 'bg-gray-800 border border-gray-700 text-gray-500 cursor-not-allowed'}`}
                                        onClick={() => { if (selectedFriend && isOnline(selectedFriend) && !tradeState) sendTradeRequest(selectedFriend); }}
                                        disabled={!selectedFriend || !isOnline(selectedFriend) || !!tradeState}
                                        title={!isOnline(selectedFriend) ? '오프라인 상태입니다' : tradeState ? '이미 거래 중입니다' : '거래 신청'}
                                    >
                                        거래
                                    </button>
                                    <button
                                        className={`px-2 py-0.5 rounded text-[10px] ${selectedFriend ? 'bg-pink-900/50 border border-pink-700 text-pink-300 hover:bg-pink-800/80 cursor-pointer' : 'bg-gray-800 text-gray-500 cursor-not-allowed'}`}
                                        onClick={() => { if (selectedFriend) alert(`채팅창에 ["${selectedFriend} 할말] 을 입력해 귓속말을 보내세요!`); }}
                                        disabled={!selectedFriend}
                                    >
                                        귓속말
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                                {!selectedFriend && !isLoadingInfo && (
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
                                    <div className="w-full flex flex-col gap-2">
                                        {friendInfo.notFound || friendInfo.error ? (
                                            <div className="text-red-400 text-center mt-10 p-4 border border-red-900 bg-red-950/20 rounded">
                                                <span className="text-xl px-2">👻</span><br />
                                                캐릭터 데이터를 불러올 수 없습니다.<br />
                                                해당 아이디가 생성되지 않았거나<br />
                                                서버 연결 문제일 수 있습니다.
                                            </div>
                                        ) : (
                                            <>
                                                <div className="text-[#aaddff] text-base font-bold text-center border-b border-blue-900/50 pb-1 mb-1">
                                                    <span className={`inline-block w-2 h-2 rounded-full mr-2 align-middle ${isOnline(selectedFriend) ? 'bg-green-500 shadow-[0_0_4px_#22c55e]' : 'bg-red-600'}`} />
                                                    {selectedFriend}
                                                    <span className="text-[#d4af37] text-sm ml-2">Lv.{friendInfo.gd.level}</span>
                                                    <span className={`text-[10px] ml-2 ${isOnline(selectedFriend) ? 'text-green-400' : 'text-red-400'}`}>
                                                        {isOnline(selectedFriend) ? '● 접속 중' : '● 오프라인'}
                                                    </span>
                                                </div>

                                                {/* Paper Doll */}
                                                <div className="h-[250px] relative bg-[#151515] border border-[#3f3f3f] mt-1 mb-2 rounded overflow-hidden">
                                                    <div className="absolute inset-0 opacity-10 pointer-events-none flex justify-center items-center">
                                                        <svg width="200" height="200" viewBox="0 0 200 200" fill="#333">
                                                            <path d="M100 20 L130 50 L120 150 L100 180 L80 150 L70 50 Z" />
                                                        </svg>
                                                    </div>
                                                    {slots.map(({ key, x, y, label }) => {
                                                        const item = friendInfo.gd.equipment?.[key];
                                                        const adjX = (x * 0.9) + 10;
                                                        const adjY = (y * 0.9) - 10;
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
                                                                                <span className="absolute bottom-[-2px] right-0 text-[9px] text-[#00ff00] font-bold truncate">+{item.enchant}</span>
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

                                                {/* 스탯 테이블 */}
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
                                                                <td className="text-right text-green-300 font-bold">{friendInfo.stats.ac}</td>
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
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default FriendList;
