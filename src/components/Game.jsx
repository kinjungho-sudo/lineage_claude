import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { GAME_ACTIONS } from '../context/GameReducer';
import StatusWindow from './StatusWindow';
import Inventory from './Inventory';
import Shop from './Shop';
import Warehouse from './Warehouse';
import GameField from './GameField';
import ChatWindow from './ChatWindow'; // Global Chat
import SkillBar from './SkillBar'; // [NEW] 스킬 바 (Phase 103)
import Settings from './Settings'; // Settings Window
import FriendList from './FriendList'; // Friend List Layout
import { calculateStats, getRequiredExp, getMaxHp, getMaxMp } from '../mechanics/combat';
import { Shield, User, LogOut } from 'lucide-react';


// Draggable Floating Window
const DraggableWindow = ({ title, children, onClose, defaultPosition, defaultSize }) => {
    const [position, setPosition] = useState(defaultPosition || { x: 100, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        setIsDragging(true);
        dragOffset.current = {
            x: e.clientX - position.x,
            y: e.clientY - position.y
        };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) {
                setPosition({
                    x: e.clientX - dragOffset.current.x,
                    y: e.clientY - dragOffset.current.y
                });
            }
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    return (
        <div
            className="absolute bg-[#1a1a1a] border border-[#555] shadow-[0_0_15px_rgba(0,0,0,0.8)] flex flex-col z-50 text-gray-200 select-none overflow-hidden"
            style={{
                left: position.x,
                top: position.y,
                width: defaultSize?.width || '320px',
                height: defaultSize?.height || '480px'
            }}
        >
            {/* Header / Drag Handle */}
            <div
                className="bg-[#2a2a2a] p-2 border-b border-[#444] flex justify-between items-center cursor-move active:bg-[#333]"
                onMouseDown={handleMouseDown}
            >
                <span className="text-sm font-bold text-[#d4af37] px-1 drop-shadow-md">{title}</span>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white px-2 py-0.5 rounded hover:bg-red-900/50 transition-colors"
                >
                    ✕
                </button>
            </div>
            {/* Content */}
            <div className="flex-1 overflow-auto bg-black/90 relative custom-scrollbar">
                {children}
            </div>
        </div>
    );
};

const Game = () => {
    const { state, logout, saveData, user, isSaving, dispatch } = useGame();
    const [activeWindows, setActiveWindows] = useState({
        inventory: false,
        status: true,
        shop: false,
        warehouse: false,
        chat: true,
        settings: false, // Settings
        friends: false,
        market: false,
    });
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false); // [캐릭터 선택] 나기기 모달 상테

    const toggleWindow = (win) => {
        setActiveWindows(prev => ({ ...prev, [win]: !prev[win] }));
    };

    // [New] Tick Timer for Buff UI
    const [currentTime, setCurrentTime] = useState(Date.now());
    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Keyboard Shortcuts (Phase 44)
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in an input (if any exist later)
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key.toLowerCase()) {
                case 'i':
                    toggleWindow('inventory');
                    break;
                case 's':
                    toggleWindow('shop');
                    break;
                case 'w':
                    if (state.currentMapId === 'village') toggleWindow('warehouse');
                    else dispatch({ type: 'ADD_LOG', payload: '[시스템] 마을에서만 창고를 이용할 수 있습니다.' });
                    break;
                case 'c':
                    toggleWindow('status');
                    break;
                case 'f':
                    toggleWindow('friends');
                    break;
                case 'o': // Option
                    toggleWindow('settings');
                    break;
                case 'f4': e.preventDefault(); handleManualSave(); break;
                case 'escape': 
                    e.preventDefault();
                    setIsLogoutModalOpen(true);
                    break;
                default:
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // [New] Screen Message Auto-Clear (Phase 3)
    useEffect(() => {
        if (state.screenMessage) {
            const timer = setTimeout(() => {
                dispatch({ type: 'CLEAR_SCREEN_MESSAGE' });
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [state.screenMessage, dispatch]);

    const handleManualSave = async () => {
        if (user) {
            await saveData(user.id, state);
            alert("저장되었습니다.");
        }
    };

    return (
        <div className="h-screen w-screen relative overflow-hidden font-sans bg-black select-none text-sm text-gray-200" translate="no">
            {/* 1. Background Game Field (Full Screen) */}
            <div className="absolute inset-0 z-0">
                <GameField />
            </div>

            {/* [New] 마을 NPC 마커스 (창고/상점) */}
            {state.currentMapId === 'village' && (
                <>
                    {/* 창고지기 NPC */}
                    <div 
                        className="absolute z-10 cursor-pointer group hover:scale-105 transition-transform animate-float-slow" 
                        style={{ right: 'max(10%, 150px)', top: 'calc(50% - 120px)' }}
                        onClick={() => toggleWindow('warehouse')}
                        title="창고지기 (W)"
                    >
                        <div className="flex flex-col items-center">
                            <div className="w-16 h-16 bg-gradient-to-br from-yellow-800 to-yellow-900 border-2 border-yellow-600 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.4)] group-hover:shadow-[0_0_30px_rgba(212,175,55,0.8)] transition-all">
                                <span className="text-3xl drop-shadow-lg pointer-events-none">📦</span>
                            </div>
                            <div className="mt-2 px-3 py-1 bg-black/90 rounded border border-yellow-700 backdrop-blur-sm shadow-xl">
                                <div className="text-yellow-400 font-bold text-xs whitespace-nowrap group-hover:text-yellow-300 text-center">
                                    [창고]
                                </div>
                                <div className="text-gray-400 text-[10px] whitespace-nowrap text-center">
                                    창고지기 난쟁이
                                </div>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* [New] Central Screen Message Overlay (Phase 3) */}
            {state.screenMessage && (
                <div className="absolute inset-0 flex items-center justify-center z-[100] pointer-events-none select-none">
                    <div className="bg-black/70 border-y-2 border-[#d4af37]/60 px-20 py-6 transform scale-110 animate-fade-in-up shadow-[0_0_50px_rgba(212,175,55,0.3)]">
                        <span className="text-[#d4af37] text-2xl font-bold tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,1)] uppercase italic">
                            {state.screenMessage}
                        </span>
                        <div className="absolute bottom-0 left-0 h-1 bg-[#d4af37] animate-progress-shrink"></div>
                    </div>
                </div>
            )}

            {/* 2. System Overlay (Saving, Info) */}
            <div className="absolute top-2 left-2 z-20 pointer-events-none">
                <div className="text-white/90 font-bold bg-black/60 px-3 py-1.5 rounded border border-[#444] text-shadow-md">
                    {user?.nickname || user?.id} (Lv.{state.level})
                </div>
            </div>
            {isSaving && (
                <div className="absolute top-2 left-40 z-50 text-[#d4af37] animate-pulse bg-black/60 px-3 py-1.5 rounded border border-[#d4af37]/50">
                    Saving...
                </div>
            )}

            {/* 3. Buff Status (Centered top area to avoid sidebar or teleport) */}
            <div className="absolute top-2 right-[450px] z-20 pointer-events-none flex flex-col gap-2">
                {/* 초록 물약 버프 타이머 */}
                {(() => {
                    const hasteEndTime = state.combatState?.hasteEndTime || 0;
                    const hasHaste = hasteEndTime > currentTime;
                    if (!hasHaste) return null;
                    const hasteRemainingRaw = Math.max(0, Math.ceil((hasteEndTime - currentTime) / 1000));
                    const minutes = Math.floor(hasteRemainingRaw / 60);
                    const seconds = hasteRemainingRaw % 60;
                    
                    return (
                        <div 
                            className="flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full border border-green-900/50 shadow-[0_4px_12px_rgba(0,100,0,0.5)] animate-pulse pointer-events-auto cursor-pointer hover:bg-green-900/30 transition-colors"
                            onClick={() => dispatch({ type: GAME_ACTIONS.CANCEL_BUFF, payload: 'haste' })}
                            title="클릭 시 버프 취소 및 자동 소모 중단"
                        >
                            <div className="w-6 h-6 rounded-full flex items-center justify-center font-black text-green-100 text-[10px] overflow-hidden border-2 border-green-400 bg-green-800 shadow-[0_0_8px_#00ff00] italic">
                                &gt;&gt;
                            </div>
                            <span className="text-green-400 font-mono text-sm font-bold tracking-widest text-shadow-md pr-1">
                                {minutes}:{seconds.toString().padStart(2, '0')}
                            </span>
                        </div>
                    );
                })()}

                {/* 용기의 물약 버프 타이머 */}
                {(() => {
                    const braveEndTime = state.combatState?.bravePotionEndTime || 0;
                    const hasBrave = braveEndTime > currentTime;
                    if (!hasBrave) return null;
                    const braveRemainingRaw = Math.max(0, Math.ceil((braveEndTime - currentTime) / 1000));
                    const minutes = Math.floor(braveRemainingRaw / 60);
                    const seconds = braveRemainingRaw % 60;
                    
                    return (
                        <div 
                            className="flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full border border-blue-900/50 shadow-[0_4px_12px_rgba(0,0,100,0.5)] animate-pulse pointer-events-auto cursor-pointer hover:bg-blue-900/30 transition-colors"
                            onClick={() => dispatch({ type: GAME_ACTIONS.CANCEL_BUFF, payload: 'brave' })}
                            title="클릭 시 버프 취소 및 자동 소모 중단"
                        >
                            <div className="w-6 h-6 rounded-full flex items-center justify-center font-black text-blue-100 text-sm overflow-hidden border-2 border-blue-400 bg-blue-800 shadow-[0_0_8px_rgba(0,100,255,0.8)] italic">
                                !
                            </div>
                            <span className="text-blue-400 font-mono text-sm font-bold tracking-widest text-shadow-md pr-1">
                                {minutes}:{seconds.toString().padStart(2, '0')}
                            </span>
                        </div>
                    );
                })()}

                {/* 보스 리스폰 타이머 */}
                {(() => {
                    const kurzRespawnTime = state.combatState?.kurzRespawnTime || 0;
                    const baphometRespawnTime = state.combatState?.baphometRespawnTime || 0;
                    
                    const hasKurz = kurzRespawnTime > currentTime;
                    const hasBaphomet = baphometRespawnTime > currentTime;
                    
                    if (!hasKurz && !hasBaphomet) return null;
                    
                    return (
                        <div className="flex flex-col gap-2">
                            {hasKurz && (() => {
                                const remaining = Math.max(0, Math.ceil((kurzRespawnTime - currentTime) / 1000));
                                return (
                                    <div className="flex items-center gap-2 bg-black/80 px-3 py-1.5 rounded border border-red-900 shadow-[0_4px_12px_rgba(255,0,0,0.5)]">
                                        <div className="text-red-500 font-bold text-xs whitespace-nowrap">커츠 리스폰</div>
                                        <span className="text-[#ff5555] font-mono text-sm font-bold tracking-widest pl-1">
                                            {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, '0')}
                                        </span>
                                    </div>
                                );
                            })()}
                            {hasBaphomet && (() => {
                                const remaining = Math.max(0, Math.ceil((baphometRespawnTime - currentTime) / 1000));
                                return (
                                    <div className="flex items-center gap-2 bg-black/80 px-3 py-1.5 rounded border border-orange-900 shadow-[0_4px_12px_rgba(255,165,0,0.5)]">
                                        <div className="text-orange-500 font-bold text-xs whitespace-nowrap">바포메트 리스폰</div>
                                        <span className="text-[#ffa500] font-mono text-sm font-bold tracking-widest pl-1">
                                            {Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, '0')}
                                        </span>
                                    </div>
                                );
                            })()}
                        </div>
                    );
                })()}

                {/* 인챈트 마이티 버프 타이머 */}
                {(() => {
                    const mightyEndTime = state.combatState?.magicHelmStrEndTime || 0;
                    const hasMighty = mightyEndTime > currentTime;
                    if (!hasMighty) return null;
                    const mightyRemainingRaw = Math.max(0, Math.ceil((mightyEndTime - currentTime) / 1000));
                    const minutes = Math.floor(mightyRemainingRaw / 60);
                    const seconds = mightyRemainingRaw % 60;
                    
                    return (
                        <div className="flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full border border-yellow-700/60 shadow-[0_4px_12px_rgba(212,175,55,0.5)] animate-pulse pointer-events-auto">
                            <img
                                src="/assets/skill_enchant_mighty.png"
                                alt="인챈트 마이티"
                                className="w-6 h-6 object-contain rounded border border-yellow-600/50"
                            />
                            <span className="text-[#d4af37] font-mono text-sm font-bold tracking-widest text-shadow-md pr-1">
                                {minutes}:{seconds.toString().padStart(2, '0')}
                            </span>
                            <span className="text-yellow-400 text-[9px] font-bold">STR+5</span>
                        </div>
                    );
                })()}

                {/* 바운스 어택 버프 타이머 */}
                {(() => {
                    const bounceEndTime = state.combatState?.bounceAttackEndTime || 0;
                    const hasBounce = bounceEndTime > currentTime;
                    if (!hasBounce) return null;
                    const bounceRemainingRaw = Math.max(0, Math.ceil((bounceEndTime - currentTime) / 1000));
                    const minutes = Math.floor(bounceRemainingRaw / 60);
                    const seconds = bounceRemainingRaw % 60;
                    
                    return (
                        <div className="flex items-center gap-2 bg-black/70 px-3 py-1.5 rounded-full border border-orange-700/60 shadow-[0_4px_12px_rgba(255,100,0,0.5)] animate-pulse pointer-events-auto">
                            <img
                                src="/assets/skill_bounce_attack.png"
                                alt="바운스 어택"
                                className="w-6 h-6 object-contain rounded border border-orange-600/50"
                            />
                            <span className="text-[#ff9933] font-mono text-sm font-bold tracking-widest text-shadow-md pr-1">
                                {minutes}:{seconds.toString().padStart(2, '0')}
                            </span>
                            <span className="text-orange-300 text-[9px] font-bold">ATK+10</span>
                        </div>
                    );
                })()}
            </div>

            {/* 4. Bottom HUD (Classic Bar) - Full Width Rebuilt */}
            <div className="absolute bottom-0 left-0 right-0 h-[220px] bg-gradient-to-t from-black via-black/95 to-transparent z-40 flex items-end pointer-events-none">
                <div className="w-full h-[180px] bg-[#0a0a0a]/95 border-t-2 border-[#333] flex pointer-events-auto relative shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">

                    {/* Section 1: HP/MP/EXP (Left) */}
                    <div className="w-[320px] p-3 flex flex-col justify-center gap-2 border-r border-[#222] bg-gradient-to-r from-black/50 to-transparent">
                        <div className="flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-tighter">Status Monitor</span>
                        </div>
                        {/* HP Bar */}
                        {(() => {
                            const hpStats = calculateStats(state);
                            const maxHp = getMaxHp(state, hpStats);
                            return (
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between text-[#ccc] text-xs font-bold">
                                        <span className="text-red-500/80">HP</span> <span>{state.hp} / {maxHp}</span>
                                    </div>
                                    <div className="w-full h-4 bg-gray-900 rounded-sm overflow-hidden border border-gray-800 relative">
                                        <div className="h-full bg-gradient-to-r from-red-900 via-red-600 to-red-500 transition-all duration-300" style={{ width: `${Math.min(100, (state.hp / maxHp) * 100)}%` }}></div>
                                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                                    </div>
                                </div>
                            );
                        })()}
                        {/* MP Bar */}
                        {(() => {
                            const mpStats = calculateStats(state, state.equipment);
                            const maxMp = getMaxMp(state, mpStats);
                            return (
                                <div className="flex flex-col gap-1">
                                    <div className="flex justify-between text-[#ccc] text-xs font-bold">
                                        <span className="text-blue-500/80">MP</span> <span>{state.mp} / {maxMp}</span>
                                    </div>
                                    <div className="w-full h-4 bg-gray-900 rounded-sm overflow-hidden border border-gray-800 relative">
                                        <div className="h-full bg-gradient-to-r from-blue-900 via-blue-600 to-blue-500 transition-all duration-300" style={{ width: `${Math.min(100, (state.mp / maxMp) * 100)}%` }}></div>
                                        <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent"></div>
                                    </div>
                                </div>
                            );
                        })()}
                        {/* EXP Bar */}
                        {(() => {
                            const requiredExp = getRequiredExp(state.level);
                            return (
                                <div className="mt-1">
                                    <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-[#222] relative">
                                        <div className="h-full bg-gradient-to-r from-purple-800 to-purple-400 transition-all duration-500" style={{ width: `${Math.min(100, (state.currentExp / requiredExp) * 100)}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-[#555] mt-0.5 px-0.5 font-mono">
                                        <span>LV.{state.level}</span>
                                        <span>{((state.currentExp / requiredExp) * 100).toFixed(2)}%</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Section 2: Combat Logs (Middle Left) */}
                    <div className="flex-1 min-w-[300px] p-2 overflow-y-auto custom-scrollbar font-mono text-xs text-gray-400 leading-tight bg-black/40 border-r border-[#222] flex flex-col-reverse">
                        <div className="flex flex-col justify-end min-h-full">
                            {/* 시스템 로그 (최신순 10개) */}
                            {(state.logs || []).slice(0, 10).map((log, i) => (
                                <div key={`sys-${i}`} className="text-[#ffff00] px-2 py-0.5 border-l-2 border-[#ffff00]/50 bg-yellow-500/5 font-bold text-[11px] animate-pulse">
                                    {log}
                                </div>
                            ))}
                            {/* 구분선 */}
                            {(state.logs || []).length > 0 && <div className="h-[1px] bg-gray-800 my-1 mx-2"></div>}
                            {/* 전투 로그 */}
                            {(state.combatLogs || []).slice(-50).map((log, i) => {
                                let color = "text-gray-400";
                                if (log.type === 'kill') color = "text-[#d4af37] font-bold";
                                if (log.type === 'drop') color = "text-[#00ff00]";
                                if (log.type === 'hit') color = "text-red-400";
                                if (log.type === 'death') color = "text-red-600 font-bold";
                                return (
                                    <div key={i} className={`${color} px-2 py-0.5 border-l-2 border-transparent hover:border-white/20 hover:bg-white/5 transition-all text-[11px]`}>
                                        {log.text}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Section 3: Skill Bar + Global Chat (Middle Right - Embedded) */}
                    <div className="w-[350px] border-r border-[#222] bg-black/20 flex flex-col min-h-0">
                        <SkillBar />
                        <ChatWindow user={user} />
                    </div>

                    {/* Section 4: Menu Buttons (Right) */}
                    <div className="w-[320px] p-2 grid grid-cols-4 gap-1 bg-[#111]/50 items-center content-center">
                        {[
                            { id: 'inventory', label: 'INV', key: 'I', color: 'from-[#3a3a3a] to-[#222]' },
                            { id: 'status', label: 'CHAR', key: 'C', color: 'from-[#3a3a3a] to-[#222]' },
                            { id: 'shop', label: 'MARKET', key: 'S', color: 'from-[#3a3a3a] to-[#222]' },
                            { id: 'warehouse', label: 'BOX', key: 'W', color: 'from-[#3a3a3a] to-[#222]', action: () => { if(state.currentMapId === 'village') toggleWindow('warehouse'); else dispatch({type: 'ADD_LOG', payload: '[시스템] 마을에서만 창고를 이용할 수 있습니다.'}); } },
                            { id: 'friends', label: 'FRIENDS', key: 'F', color: 'from-[#3a3a3a] to-[#222]' },
                            { id: 'settings', label: 'OPT', key: 'O', color: 'from-[#3a3a3a] to-[#222]' },
                            { id: 'save', label: 'SAVE', key: 'F4', color: 'from-[#1a3a1a] to-[#0a1a0a]', action: handleManualSave, isLoading: isSaving },
                            { id: 'logout', label: 'EXIT', key: 'ESC', color: 'from-[#4a1a1a] to-[#2a0a0a]', action: () => setIsLogoutModalOpen(true) }
                        ].map((btn) => (
                            <button
                                key={btn.id}
                                onClick={btn.action || (() => toggleWindow(btn.id))}
                                className={`
                                    relative h-12 rounded border border-[#444] bg-gradient-to-b ${btn.color}
                                    flex flex-col items-center justify-center transition-all group overflow-hidden
                                    hover:border-[#d4af37]/50 active:translate-y-0.5 shadow-lg
                                `}
                            >
                                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <span className={`text-[10px] font-bold tracking-widest ${btn.id === 'save' ? 'text-green-400' : btn.id === 'logout' ? 'text-red-400' : 'text-gray-300'} group-hover:text-white`}>
                                    {btn.isLoading ? 'SAV...' : btn.label}
                                </span>
                                <span className="text-[8px] text-gray-500 font-mono mt-[-2px]">({btn.key})</span>
                                <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* 5. Draggable Windows */}
            {
                activeWindows.status && (
                    <DraggableWindow
                        title="CHARACTER INFO"
                        onClose={() => toggleWindow('status')}
                        defaultPosition={{ x: 20, y: 80 }}
                        defaultSize={{ width: '300px', height: '580px' }}
                    >
                        <StatusWindow />
                    </DraggableWindow>
                )
            }

            {
                activeWindows.inventory && (
                    <DraggableWindow
                        title="INVENTORY"
                        onClose={() => toggleWindow('inventory')}
                        defaultPosition={{ x: window.innerWidth - 350, y: 80 }}
                        defaultSize={{ width: '330px', height: '520px' }}
                    >
                        <Inventory />
                    </DraggableWindow>
                )
            }

            {
                activeWindows.shop && (
                    <DraggableWindow
                        title="DWARVEN SHOP"
                        onClose={() => toggleWindow('shop')}
                        defaultPosition={{ x: window.innerWidth - 740, y: 80 }}
                        defaultSize={{ width: '340px', height: '520px' }}
                    >
                        <Shop />
                    </DraggableWindow>
                )
            }

            {
                activeWindows.warehouse && (
                    <DraggableWindow
                        title="WAREHOUSE"
                        onClose={() => toggleWindow('warehouse')}
                        defaultPosition={{ x: window.innerWidth - 740, y: 120 }}
                        defaultSize={{ width: '340px', height: '520px' }}
                    >
                        <Warehouse />
                    </DraggableWindow>
                )
            }

            {/* Settings */}
            {
                activeWindows.settings && (
                    <DraggableWindow
                        title="SETTINGS"
                        onClose={() => toggleWindow('settings')}
                        defaultPosition={{ x: window.innerWidth / 2 - 150, y: window.innerHeight / 2 - 100 }}
                        defaultSize={{ width: '300px', height: '200px' }}
                    >
                        <Settings />
                    </DraggableWindow>
                )
            }

            {/* Friends */}
            {
                activeWindows.friends && (
                    <DraggableWindow
                        title="FRIEND LIST"
                        onClose={() => toggleWindow('friends')}
                        defaultPosition={{ x: window.innerWidth / 2 - 100, y: 100 }}
                        defaultSize={{ width: '450px', height: '520px' }}
                    >
                        <FriendList />
                    </DraggableWindow>
                )
            }
            {/* [New] Logout Confirmation Modal */}
            {isLogoutModalOpen && (
                <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
                    <div className="w-[320px] bg-[#1a1a1a] border-2 border-[#d4af37] p-1 shadow-[0_0_50px_rgba(0,0,0,0.6)]">
                        <div className="border border-[#333] p-6 flex flex-col gap-6 text-center relative overflow-hidden">
                             {/* Decorative Background Icon */}
                            <Shield className="absolute -top-4 -right-4 w-24 h-24 text-[#d4af37]/5 rotate-12 pointer-events-none" />
                            
                            <h2 className="text-[#d4af37] font-bold tracking-[0.3em] text-lg drop-shadow-lg">EXIT SYSTEM</h2>
                            <p className="text-gray-400 text-xs tracking-tighter">어떤 작업을 수행하시겠습니까?</p>
                            
                            <div className="flex flex-col gap-2 relative z-10">
                                <button 
                                    onClick={logoutToSelect}
                                    disabled={isSaving}
                                    className="w-full py-3 bg-[#2a2a2a] border border-[#3f3f3f] text-[#efefef] text-[11px] font-bold hover:bg-[#333] hover:text-[#d4af37] hover:border-[#d4af37]/50 transition-all active:scale-95 flex items-center justify-center gap-2 group disabled:opacity-50"
                                >
                                    <User className={`w-4 h-4 ${isSaving ? 'animate-spin' : ''}`} /> 
                                    {isSaving ? '저장 중...' : '캐릭터 선택으로 나가기'}
                                </button>
                                <button 
                                    onClick={logout}
                                    className="w-full py-3 bg-[#2a2a2a] border border-[#3f3f3f] text-[#efefef] text-[11px] font-bold hover:bg-[#333] hover:text-red-400 hover:border-red-900/50 transition-all active:scale-95 flex items-center justify-center gap-2"
                                >
                                    <LogOut className="w-4 h-4" /> 게임 종료 (로그아웃)
                                </button>
                                <div className="h-[1px] bg-gradient-to-r from-transparent via-[#333] to-transparent my-1"></div>
                                <button 
                                    onClick={() => setIsLogoutModalOpen(false)}
                                    className="w-full py-2 text-gray-500 text-[10px] font-bold hover:text-gray-300 transition-colors uppercase tracking-[0.2em]"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default Game;
