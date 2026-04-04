import React, { useState, useEffect, useRef } from 'react';
import { useGame } from '../context/GameContext';
import { GAME_ACTIONS } from '../context/GameReducer';
import StatusWindow from './StatusWindow';
import Inventory from './Inventory';
import Shop from './Shop';
import SpellBook from './SpellBook';
import GameField from './GameField';
import ChatWindow from './ChatWindow'; // Global Chat
import SkillBar from './SkillBar'; // [NEW] 스킬 바 (Phase 103)
import Settings from './Settings'; // Settings Window
import FriendList from './FriendList'; // Friend List Layout
import Warehouse from './Warehouse'; // 창고
import GameGuide from './GameGuide'; // 게임 가이드북
import TradeWindow from './TradeWindow'; // 거래창
import { calculateStats, getRequiredExp, getMaxHp, getMaxMp } from '../mechanics/combat';
import { Shield, User, LogOut } from 'lucide-react';
import { useParty } from '../hooks/useParty';

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
    useEffect(() => {
        const handler = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handler);
        return () => window.removeEventListener('resize', handler);
    }, []);
    return isMobile;
};

// Draggable Floating Window
const DraggableWindow = ({ title, children, onClose, defaultPosition, defaultSize }) => {
    const isMobile = useIsMobile();
    const [position, setPosition] = useState(defaultPosition || { x: 100, y: 100 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        setIsDragging(true);
        dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (isDragging) setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
        };
        const handleMouseUp = () => setIsDragging(false);
        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    if (isMobile) {
        return (
            <div className="fixed inset-0 z-[150] flex items-center justify-center p-2">
                <div className="absolute inset-0 bg-black/70" onClick={onClose} />
                <div
                    className="relative bg-[#1a1a1a] border border-[#555] shadow-[0_0_40px_rgba(0,0,0,0.95)] flex flex-col rounded-lg w-full max-w-[380px] overflow-hidden"
                    style={{ maxHeight: 'calc(100dvh - 16px)' }}
                >
                    <div className="bg-[#2a2a2a] px-3 py-2 border-b border-[#444] flex justify-between items-center flex-shrink-0">
                        <span className="text-sm font-bold text-[#d4af37]">{title}</span>
                        <button onClick={onClose} className="text-gray-400 hover:text-white w-10 h-10 flex items-center justify-center rounded hover:bg-red-900/50 transition-colors text-lg leading-none">✕</button>
                    </div>
                    <div className="flex-1 overflow-auto relative custom-scrollbar min-h-0">
                        {children}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="absolute bg-[#1a1a1a] border border-[#555] shadow-[0_0_15px_rgba(0,0,0,0.8)] flex flex-col z-50 text-gray-200 select-none overflow-hidden"
            style={{ left: position.x, top: position.y, width: defaultSize?.width || '320px', height: defaultSize?.height || '480px' }}
        >
            <div
                className="bg-[#2a2a2a] p-2 border-b border-[#444] flex justify-between items-center cursor-move active:bg-[#333]"
                onMouseDown={handleMouseDown}
            >
                <span className="text-sm font-bold text-[#d4af37] px-1 drop-shadow-md">{title}</span>
                <button onClick={onClose} className="text-gray-400 hover:text-white px-2 py-0.5 rounded hover:bg-red-900/50 transition-colors">✕</button>
            </div>
            <div className="flex-1 overflow-auto bg-black/90 relative custom-scrollbar">
                {children}
            </div>
        </div>
    );
};

const Game = ({ soundSettings, setSoundSettings }) => {
    const { state, logout, logoutToSelect, user, isSaving, dispatch, incomingRequest, acceptTrade, declineTrade, teleport, MAPS, selectedPartyTarget, setSelectedPartyTarget } = useGame();
    const [teleportOpen, setTeleportOpen] = useState(false);

    const [activeWindows, setActiveWindows] = useState({
        inventory: false,
        status: window.innerWidth >= 1024, // 데스크탑에서만 기본으로 열기
        shop: false,
        spellbook: false,
        chat: true,
        settings: false,
        friends: false,
        market: false,
        warehouse: false,
        guide: false,
    });
    const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
    const [isPortrait, setIsPortrait] = useState(() => window.innerHeight > window.innerWidth);
    const isMobile = useIsMobile();
    const [isMobileLogActive, setIsMobileLogActive] = useState(false);
    const [isMobileChatActive, setIsMobileChatActive] = useState(false);
    // Party hook
    const {
        inviteToParty,
        acceptInvite,
        declineInvite,
        leaveParty,
        sendBossConfirm,
        acceptBossConfirm,
        declineBossConfirm,
        castBuffOnTarget,
        partnerOfflineStatuses,
    } = useParty(dispatch, user, state);

    // Boss confirm timer state
    const [bossConfirmSecsLeft, setBossConfirmSecsLeft] = useState(0);
    const bossConfirmTimerRef = useRef(null);

    // 가로 모드 강제 + pull-to-refresh 방지
    useEffect(() => {
        const checkOrientation = () => setIsPortrait(window.innerHeight > window.innerWidth);
        window.addEventListener('resize', checkOrientation);
        window.addEventListener('orientationchange', checkOrientation);
        // 가로 모드 잠금 시도 (지원 브라우저에서만 동작)
        if (screen?.orientation?.lock) {
            screen.orientation.lock('landscape').catch(() => {});
        }
        return () => {
            window.removeEventListener('resize', checkOrientation);
            window.removeEventListener('orientationchange', checkOrientation);
        };
    }, []);

    const toggleWindow = (win) => {
        setActiveWindows(prev => ({ ...prev, [win]: !prev[win] }));
    };

    // [New] Tick Timer for Buff UI
    const [currentTime, setCurrentTime] = useState(() => Date.now());
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
                case 's': {
                    const inVillage = state.currentMapId === 'village' || state.currentMapId === 'elf_village';
                    if (!inVillage) { dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: '[상점] 마을에서만 이용 가능합니다.' }); return; }
                    toggleWindow('shop');
                    break;
                }
                case 'w':
                    toggleWindow('spellbook');
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
                case 'b': {
                    const inVillage = state.currentMapId === 'village' || state.currentMapId === 'elf_village';
                    if (!inVillage) { dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: '[창고] 마을에서만 이용 가능합니다.' }); return; }
                    toggleWindow('warehouse');
                    break;
                }
                case 'f4': e.preventDefault(); break;
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
    }, [state.currentMapId]); // eslint-disable-line react-hooks/exhaustive-deps

    // [New] Screen Message Auto-Clear (Phase 3)
    useEffect(() => {
        if (state.screenMessage) {
            const timer = setTimeout(() => {
                dispatch({ type: 'CLEAR_SCREEN_MESSAGE' });
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [state.screenMessage, dispatch]);

    // [파티] 보스 맵 입장 시 파티원에게 확인 요청 전송
    useEffect(() => {
        const BOSS_MAPS = { hell: '커츠', baphomet_room: '바포메트' };
        const bossName = BOSS_MAPS[state.currentMapId];
        if (bossName && state.party && state.party.members?.length > 1) {
            sendBossConfirm(bossName, state.currentMapId);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [state.currentMapId]);

    // [파티] 보스 확인 모달 30초 카운트다운
    useEffect(() => {
        if (state.partyBossConfirm) {
            setBossConfirmSecsLeft(30);
            if (bossConfirmTimerRef.current) clearInterval(bossConfirmTimerRef.current);
            bossConfirmTimerRef.current = setInterval(() => {
                setBossConfirmSecsLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(bossConfirmTimerRef.current);
                        declineBossConfirm();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        } else {
            if (bossConfirmTimerRef.current) clearInterval(bossConfirmTimerRef.current);
            setBossConfirmSecsLeft(0);
        }
        return () => { if (bossConfirmTimerRef.current) clearInterval(bossConfirmTimerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [!!state.partyBossConfirm]);

    // 요정 속성 선택 팝업: 레벨 50 이상 + 요정 + 아직 속성 미선택
    const showElfElementModal = state.characterClass === 'elf' && state.level >= 50 && !state.elfElement;
    const hasAnyWindowOpen = activeWindows.inventory || activeWindows.status || activeWindows.shop || activeWindows.spellbook || activeWindows.settings || activeWindows.friends || activeWindows.warehouse;

    const ELF_ELEMENT_INFO = {
        wind: { label: '바람', desc: '명중 +5 / 회피 +5', color: '#88ddaa', icon: '🌿', spell: '윈드 샷' },
        earth: { label: '땅',  desc: 'AC -4',             color: '#bbaa55', icon: '🪨', spell: '어스 스킨' },
        fire:  { label: '불',  desc: '공격력 +3',          color: '#ff6644', icon: '🔥', spell: '파이어 웨폰' },
        water: { label: '물',  desc: 'HP +50 / 회복 +10', color: '#44aaff', icon: '💧', spell: '네이쳐스 터치' },
    };

    const portraitStyle = (isMobile && isPortrait) ? {
        transform: 'rotate(90deg)',
        transformOrigin: 'center center',
        width: '100vh',
        height: '100vw',
        position: 'fixed',
        top: 'calc((100vh - 100vw) / 2)',
        left: 'calc((100vw - 100vh) / 2)',
    } : {};

    return (
        <div className="relative overflow-hidden font-sans bg-black select-none text-sm text-gray-200" translate="no"
            style={{ ...portraitStyle, ...(!isMobile || !isPortrait ? { width: '100vw', height: '100vh' } : {}) }}
        >
            {/* 1. Background Game Field (Full Screen) */}
            <div className="absolute inset-0 z-0">
                <GameField />
            </div>


            {/* [New] Central Screen Message Overlay (Phase 3) */}
            {state.screenMessage && (
                <div className="absolute inset-0 flex items-center justify-center z-[100] pointer-events-none select-none">
                    <div className="bg-black/70 border-y-2 border-[#d4af37]/60 px-4 lg:px-20 py-3 lg:py-6 transform scale-110 animate-fade-in-up shadow-[0_0_50px_rgba(212,175,55,0.3)] max-w-[90vw] text-center">
                        <span className="text-[#d4af37] text-base lg:text-2xl font-bold tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,1)] uppercase italic">
                            {state.screenMessage}
                        </span>
                        <div className="absolute bottom-0 left-0 h-1 bg-[#d4af37] animate-progress-shrink"></div>
                    </div>
                </div>
            )}

            {/* [요정] 레벨 50 속성 선택 팝업 — 블로킹 모달 */}
            {showElfElementModal && (
                <div className="absolute inset-0 flex items-center justify-center z-[200] bg-black/80">
                    <div className="bg-[#0d0d1a] border-2 border-[#336633]/60 rounded-xl p-4 lg:p-8 w-[480px] max-w-[90vw] shadow-[0_0_60px_rgba(100,200,100,0.3)] select-none">
                        <div className="text-center mb-6">
                            <div className="text-[#88ddaa] text-xl font-bold tracking-wide mb-1">⚡ 속성 각성</div>
                            <div className="text-[#aaa] text-sm">레벨 50에 달했습니다. 요정의 속성 계열을 선택하세요.</div>
                            <div className="text-[#ff8844] text-xs mt-1 font-bold">※ 한번 선택하면 변경할 수 없습니다</div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {Object.entries(ELF_ELEMENT_INFO).map(([key, info]) => (
                                <button
                                    key={key}
                                    onClick={() => dispatch({ type: 'CHOOSE_ELF_ELEMENT', payload: key })}
                                    className="flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all hover:scale-105 active:scale-95"
                                    style={{ borderColor: info.color + '55', background: info.color + '11' }}
                                    onMouseEnter={e => e.currentTarget.style.borderColor = info.color}
                                    onMouseLeave={e => e.currentTarget.style.borderColor = info.color + '55'}
                                >
                                    <span className="text-3xl">{info.icon}</span>
                                    <span className="font-bold text-base" style={{ color: info.color }}>{info.label} 계열</span>
                                    <span className="text-[#aaa] text-xs text-center leading-tight">{info.desc}</span>
                                    <span className="text-[#666] text-[10px]">마법: {info.spell}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* [파티] 파티원 HP 바 + 버프 시전 */}
            {state.party && state.party.members && state.party.members.length > 1 && (() => {
                const isElf = state.characterClass === 'elf';
                // 요정이 배운 마법 중 아군 시전 가능한 버프 (리덕션 아머 제외)
                const learnedIds = state.learnedSpells || [];
                const castableBuffs = isElf
                    ? (state.characterClass === 'elf' ? [
                        { id: 'resist_magic',            name: '레지스트 매직',    icon: '/assets/spell_resist_magic.png',    type: 'resist_magic' },
                        { id: 'summon_lesser_elemental', name: '서먼 레서 엘리멘탈', icon: '/assets/spell_summon_elemental.png', type: 'summon_lesser_elemental' },
                        { id: 'wind_shot',               name: '윈드 샷',          icon: '/assets/spell_wind_shot.png',       type: 'wind_shot' },
                        { id: 'earth_skin',              name: '어스 스킨',         icon: '/assets/spell_earth_skin.png',      type: 'earth_skin' },
                        { id: 'fire_weapon',             name: '파이어 웨폰',       icon: '/assets/spell_fire_weapon.png',     type: 'fire_weapon' },
                        { id: 'natures_touch',           name: '네이쳐스 터치',     icon: '/assets/spell_natures_touch.png',   type: 'natures_touch' },
                    ].filter(b => learnedIds.includes(b.id)) : [])
                    : [];

                return (
                    <div className="absolute left-2 z-30 flex flex-col gap-1 pointer-events-auto" style={{ top: '56px' }}>
                        {state.party.members
                            .filter(m => m.characterName !== state.characterName)
                            .map(member => {
                                const hpPct = member.maxHp > 0 ? Math.min(100, (member.hp / member.maxHp) * 100) : 0;
                                const classLabel = member.characterClass === 'elf' ? '요정' : member.characterClass === 'wizard' ? '마법사' : '기사';
                                const classColor = member.characterClass === 'elf' ? '#88ddaa' : member.characterClass === 'wizard' ? '#aaaaff' : '#d4af37';
                                const isSelected = selectedPartyTarget === member.characterName;
                                const isOffline = !!partnerOfflineStatuses?.[member.characterName];
                                return (
                                    <div key={member.characterName} className="flex flex-col gap-0.5">
                                        {/* 파티원 카드 — 클릭 시 선택 (요정만) */}
                                        <div
                                            className={`bg-black/80 border rounded px-2 py-1.5 w-[140px] lg:w-[180px] transition-all ${isOffline ? 'opacity-60' : ''} ${isElf && castableBuffs.length > 0 && !isOffline ? 'cursor-pointer' : ''} ${isOffline ? 'border-red-900' : isSelected ? 'border-[#88ddaa] shadow-[0_0_8px_rgba(136,221,170,0.5)]' : 'border-[#444]'}`}
                                            onClick={() => {
                                                if (!isElf || castableBuffs.length === 0 || isOffline) return;
                                                setSelectedPartyTarget(isSelected ? null : member.characterName);
                                            }}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <div className="flex items-center gap-1 min-w-0">
                                                    {isOffline && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" title="오프라인" />}
                                                    <span className={`text-[10px] font-bold truncate max-w-[80px] ${isOffline ? 'text-white/40' : 'text-white/90'}`}>{member.characterName}</span>
                                                </div>
                                                {isOffline
                                                    ? <span className="text-[9px] text-red-400 font-bold flex-shrink-0">오프라인</span>
                                                    : <span className="text-[9px] font-bold flex-shrink-0" style={{ color: classColor }}>{classLabel} Lv.{member.level}</span>
                                                }
                                            </div>
                                            <div className="w-full h-2 bg-gray-900 rounded-sm overflow-hidden border border-gray-800">
                                                <div className={`h-full transition-all duration-300 ${isOffline ? 'bg-gray-700' : 'bg-gradient-to-r from-red-900 via-red-600 to-red-500'}`} style={{ width: `${hpPct}%` }} />
                                            </div>
                                            <div className="flex justify-between items-center mt-0.5">
                                                <span className={`text-[9px] font-mono ${isOffline ? 'text-gray-600' : 'text-gray-400'}`}>{member.hp}/{member.maxHp}</span>
                                                {!isOffline && isElf && castableBuffs.length > 0 && (
                                                    <span className="text-[8px] text-[#88ddaa]/70">{isSelected ? '▲ 닫기' : '▼ 버프'}</span>
                                                )}
                                            </div>
                                        </div>

                                        {/* 버프 시전 패널 — 선택된 파티원에게만 표시 */}
                                        {isSelected && castableBuffs.length > 0 && (
                                            <div className="bg-black/90 border border-[#88ddaa]/40 rounded p-1 w-[140px] lg:w-[180px] flex flex-wrap gap-1">
                                                {castableBuffs.map(buff => {
                                                    const hasMp = state.mp >= (state.learnedSpells ? 100 : 0);
                                                    return (
                                                        <button
                                                            key={buff.id}
                                                            title={`${buff.name} — ${member.characterName}에게 시전`}
                                                            onClick={() => {
                                                                castBuffOnTarget(buff.type, member.characterName);
                                                                setSelectedPartyTarget(null);
                                                            }}
                                                            disabled={!hasMp}
                                                            className="w-8 h-8 border border-[#88ddaa]/40 rounded bg-black/60 hover:bg-[#88ddaa]/20 hover:border-[#88ddaa] active:scale-95 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center"
                                                        >
                                                            <img src={buff.icon} alt={buff.name} className="w-6 h-6 object-contain" />
                                                        </button>
                                                    );
                                                })}
                                                <div className="w-full text-[8px] text-[#88ddaa]/50 text-center mt-0.5">아이콘 탭 → 버프 시전</div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        }
                        <button
                            onClick={leaveParty}
                            className="text-[9px] text-red-500 hover:text-red-300 border border-red-900/50 rounded px-1.5 py-0.5 bg-black/60 hover:bg-red-900/20 transition-colors active:scale-95 w-full"
                        >
                            파티 탈퇴
                        </button>
                    </div>
                );
            })()}

            {/* [파티] 파티 초대 수신 모달 */}
            {state.partyInvite && (
                <div className="absolute inset-0 z-[180] flex items-center justify-center bg-black/60">
                    <div className="bg-[#0d0d1a] border-2 border-[#d4af37]/60 rounded-xl p-6 w-[320px] max-w-[90vw] shadow-[0_0_40px_rgba(212,175,55,0.3)] select-none">
                        <div className="text-center mb-4">
                            <div className="text-[#d4af37] text-lg font-bold tracking-wide mb-1">파티 초대</div>
                            <div className="text-white/80 text-sm">
                                <span className="font-bold text-[#88ddaa]">{state.partyInvite.from}</span>님이 파티 초대를 보냈습니다.
                            </div>
                            <div className="text-gray-400 text-xs mt-1">
                                {state.partyInvite.fromClass === 'elf' ? '요정' : '기사'} Lv.{state.partyInvite.fromLevel}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={acceptInvite}
                                className="flex-1 py-2.5 bg-emerald-900/40 border border-emerald-700 text-emerald-300 text-sm font-bold rounded hover:bg-emerald-900/70 active:scale-95 transition-all"
                            >
                                수락
                            </button>
                            <button
                                onClick={declineInvite}
                                className="flex-1 py-2.5 bg-red-900/20 border border-red-800/50 text-red-400 text-sm font-bold rounded hover:bg-red-900/40 active:scale-95 transition-all"
                            >
                                거절
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* [파티] 보스 전투 참여 확인 모달 */}
            {state.partyBossConfirm && (
                <div className="absolute inset-0 z-[180] flex items-center justify-center bg-black/60">
                    <div className="bg-[#1a0a0a] border-2 border-red-900/70 rounded-xl p-6 w-[340px] max-w-[90vw] shadow-[0_0_40px_rgba(255,0,0,0.2)] select-none">
                        <div className="text-center mb-4">
                            <div className="text-red-400 text-xl font-bold tracking-wide mb-1">⚠ 보스 전투</div>
                            <div className="text-white/80 text-sm mb-1">
                                <span className="font-bold text-[#88ddaa]">{state.partyBossConfirm.from}</span>님이
                                {' '}<span className="text-red-300 font-bold">{state.partyBossConfirm.bossName}</span> 토벌을 제안합니다.
                            </div>
                            <div className="text-[#ff9933] text-2xl font-mono font-bold mt-2">{bossConfirmSecsLeft}s</div>
                            <div className="text-gray-500 text-xs">시간 초과 시 자동 거절됩니다</div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={acceptBossConfirm}
                                className="flex-1 py-2.5 bg-red-900/40 border border-red-700 text-red-300 text-sm font-bold rounded hover:bg-red-900/70 active:scale-95 transition-all"
                            >
                                참여
                            </button>
                            <button
                                onClick={declineBossConfirm}
                                className="flex-1 py-2.5 bg-gray-900/40 border border-gray-700 text-gray-400 text-sm font-bold rounded hover:bg-gray-900/70 active:scale-95 transition-all"
                            >
                                거절
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* [파티] 파티원 거절 후 혼자 입장 모달 */}
            {state.partyBossDeclined && (
                <div className="absolute inset-0 z-[180] flex items-center justify-center bg-black/60">
                    <div className="bg-[#1a0a0a] border-2 border-orange-800/70 rounded-xl p-6 w-[340px] max-w-[90vw] shadow-[0_0_40px_rgba(255,100,0,0.2)] select-none">
                        <div className="text-center mb-5">
                            <div className="text-orange-400 text-xl font-bold tracking-wide mb-2">파티원 거절</div>
                            <div className="text-white/80 text-sm mb-1">
                                파티원이 <span className="text-red-300 font-bold">{state.partyBossDeclined.bossName}</span> 토벌을 거절했습니다.
                            </div>
                            <div className="text-gray-400 text-xs mt-2">혼자 입장하면 보스 능력치가 1인 플레이에 맞게 조정됩니다.</div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={() => {
                                    const mapId = state.partyBossDeclined.mapId;
                                    dispatch({ type: GAME_ACTIONS.PARTY_BOSS_DECLINED_CLEAR });
                                    dispatch({ type: GAME_ACTIONS.SET_SOLO_BOSS_MODE, payload: true });
                                    teleport(mapId);
                                }}
                                className="flex-1 py-2.5 bg-orange-900/40 border border-orange-700 text-orange-300 text-sm font-bold rounded hover:bg-orange-900/70 active:scale-95 transition-all"
                            >
                                혼자 입장하기
                            </button>
                            <button
                                onClick={() => dispatch({ type: GAME_ACTIONS.PARTY_BOSS_DECLINED_CLEAR })}
                                className="flex-1 py-2.5 bg-gray-900/40 border border-gray-700 text-gray-400 text-sm font-bold rounded hover:bg-gray-900/70 active:scale-95 transition-all"
                            >
                                취소
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 2. System Overlay (Saving, Info) */}
            <div className="absolute top-2 left-2 z-20 flex items-center gap-1.5">
                <div className="text-white/90 font-bold bg-black/60 px-3 py-1.5 rounded border border-[#444] text-shadow-md pointer-events-none">
                    {state.characterName || user?.nickname || user?.id} (Lv.{state.level})
                </div>
                <button
                    onClick={() => toggleWindow('guide')}
                    className="w-7 h-7 rounded border border-[#446644]/70 bg-[#1a2a1a]/80 text-[#88cc88] text-sm font-bold flex items-center justify-center hover:border-[#88cc88] hover:bg-[#1a3a1a] active:scale-95 transition-all pointer-events-auto"
                    title="게임 가이드 (Guide)"
                >
                    ?
                </button>
            </div>
            {isSaving && (
                <div className="absolute top-2 left-40 z-50 text-[#d4af37] animate-pulse bg-black/60 px-3 py-1.5 rounded border border-[#d4af37]/50">
                    Saving...
                </div>
            )}

            {/* 3. Buff Status (Centered top area to avoid sidebar or teleport) */}
            <div className="absolute top-2 right-[148px] lg:right-[450px] z-20 pointer-events-none flex flex-row gap-1 flex-wrap justify-end max-w-[calc(100vw-310px)] lg:max-w-none">
                {/* 초록 물약 버프 타이머 */}
                {(() => {
                    const hasteEndTime = state.combatState?.hasteEndTime || 0;
                    if (hasteEndTime <= currentTime) return null;
                    const rem = Math.max(0, Math.ceil((hasteEndTime - currentTime) / 1000));
                    const m = Math.floor(rem / 60); const s = rem % 60;
                    return (
                        <div className={`group relative flex items-center bg-black/70 px-1.5 py-1 rounded-full border border-green-900/50 shadow-[0_4px_12px_rgba(0,100,0,0.5)] pointer-events-auto cursor-pointer hover:bg-green-900/30 transition-colors${rem < 30 ? ' animate-pulse' : ''}`}
                            onClick={() => dispatch({ type: GAME_ACTIONS.CANCEL_BUFF, payload: 'haste' })}>
                            <img src="/assets/헤이스트.png" alt="하스트" className="w-6 h-6 lg:w-7 lg:h-7 object-contain rounded border border-green-600/50" />
                            <span className="hidden group-hover:inline ml-1.5 text-green-400 font-mono text-xs font-bold tracking-widest pr-0.5">{m}:{s.toString().padStart(2, '0')}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/95 border border-green-800/60 text-green-300 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-[100] pointer-events-none">하스트 — 공격속도 ÷1.6</div>
                        </div>
                    );
                })()}

                {/* 용기의 물약 버프 타이머 */}
                {(() => {
                    const braveEndTime = state.combatState?.bravePotionEndTime || 0;
                    if (braveEndTime <= currentTime) return null;
                    const rem = Math.max(0, Math.ceil((braveEndTime - currentTime) / 1000));
                    const m = Math.floor(rem / 60); const s = rem % 60;
                    const isElf = state.characterClass === 'elf';
                    return (
                        <div className={`group relative flex items-center bg-black/70 px-1.5 py-1 rounded-full border pointer-events-auto cursor-pointer transition-colors${rem < 30 ? ' animate-pulse' : ''} ${isElf ? 'border-yellow-600/50 shadow-[0_4px_12px_rgba(200,180,0,0.5)] hover:bg-yellow-900/30' : 'border-purple-700/50 shadow-[0_4px_12px_rgba(140,0,220,0.5)] hover:bg-purple-900/30'}`}
                            onClick={() => dispatch({ type: GAME_ACTIONS.CANCEL_BUFF, payload: 'brave' })}>
                            <img src={isElf ? '/assets/엘븐 와퍼.png' : '/assets/potion_brave.png'} alt={isElf ? '엘븐 와퍼' : '용기의 물약'} className={`w-6 h-6 lg:w-7 lg:h-7 object-contain rounded border ${isElf ? 'border-yellow-500/50' : 'border-purple-500/50'}`} />
                            <span className={`hidden group-hover:inline ml-1.5 font-mono text-xs font-bold tracking-widest pr-0.5 ${isElf ? 'text-yellow-300' : 'text-purple-300'}`}>{m}:{s.toString().padStart(2, '0')}</span>
                            <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/95 border text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-[100] pointer-events-none ${isElf ? 'border-yellow-700/60 text-yellow-300' : 'border-purple-700/60 text-purple-300'}`}>바이탈리티 — 공격속도 ÷1.5 · HP 대량 회복</div>
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
                        <div className="flex flex-row gap-1">
                            {hasKurz && (() => {
                                const remaining = Math.max(0, Math.ceil((kurzRespawnTime - currentTime) / 1000));
                                return (
                                    <div className="flex items-center gap-1.5 bg-black/80 px-2 py-1.5 rounded border border-red-900 shadow-[0_4px_12px_rgba(255,0,0,0.5)]">
                                        <div className="text-red-500 font-bold text-xs whitespace-nowrap">커츠</div>
                                        <span className="text-[#ff5555] font-mono text-xs font-bold tracking-widest">{Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, '0')}</span>
                                    </div>
                                );
                            })()}
                            {hasBaphomet && (() => {
                                const remaining = Math.max(0, Math.ceil((baphometRespawnTime - currentTime) / 1000));
                                return (
                                    <div className="flex items-center gap-1.5 bg-black/80 px-2 py-1.5 rounded border border-orange-900 shadow-[0_4px_12px_rgba(255,165,0,0.5)]">
                                        <div className="text-orange-500 font-bold text-xs whitespace-nowrap">바포</div>
                                        <span className="text-[#ffa500] font-mono text-xs font-bold tracking-widest">{Math.floor(remaining / 60)}:{(remaining % 60).toString().padStart(2, '0')}</span>
                                    </div>
                                );
                            })()}
                        </div>
                    );
                })()}

                {/* 인챈트 마이티 (헬멧) */}
                {(() => {
                    const endTime = state.combatState?.magicHelmStrEndTime || 0;
                    if (endTime <= currentTime) return null;
                    const rem = Math.max(0, Math.ceil((endTime - currentTime) / 1000));
                    const m = Math.floor(rem / 60); const s = rem % 60;
                    return (
                        <div className={`group relative flex items-center bg-black/70 px-1.5 py-1 rounded-full border border-yellow-700/60 shadow-[0_4px_12px_rgba(212,175,55,0.5)] pointer-events-auto${rem < 30 ? ' animate-pulse' : ''}`}>
                            <img src="/assets/skill_enchant_mighty.png" alt="인챈트 마이티" className="w-6 h-6 lg:w-7 lg:h-7 object-contain rounded border border-yellow-600/50" />
                            <span className="hidden group-hover:inline ml-1.5 text-[#d4af37] font-mono text-xs font-bold tracking-widest pr-0.5">{m}:{s.toString().padStart(2, '0')}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/95 border border-yellow-700/60 text-yellow-300 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-[100] pointer-events-none">마법 투구 — STR 보너스</div>
                        </div>
                    );
                })()}

                {/* 바운스 어택 */}
                {(() => {
                    const endTime = state.combatState?.bounceAttackEndTime || 0;
                    if (endTime <= currentTime) return null;
                    const rem = Math.max(0, Math.ceil((endTime - currentTime) / 1000));
                    const m = Math.floor(rem / 60); const s = rem % 60;
                    return (
                        <div className={`group relative flex items-center bg-black/70 px-1.5 py-1 rounded-full border border-orange-700/60 shadow-[0_4px_12px_rgba(255,100,0,0.5)] pointer-events-auto${rem < 30 ? ' animate-pulse' : ''}`}>
                            <img src="/assets/skill_bounce_attack.png" alt="바운스 어택" className="w-6 h-6 lg:w-7 lg:h-7 object-contain rounded border border-orange-600/50" />
                            <span className="hidden group-hover:inline ml-1.5 text-[#ff9933] font-mono text-xs font-bold tracking-widest pr-0.5">{m}:{s.toString().padStart(2, '0')}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/95 border border-orange-700/60 text-orange-300 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-[100] pointer-events-none">바운스 어택 — 공격 반사</div>
                        </div>
                    );
                })()}

                {/* 레지스트 매직 */}
                {(() => {
                    const endTime = state.combatState?.resistMagicEndTime || 0;
                    if (endTime <= currentTime) return null;
                    const rem = Math.max(0, Math.ceil((endTime - currentTime) / 1000));
                    const m = Math.floor(rem / 60); const s = rem % 60;
                    return (
                        <div className={`group relative flex items-center bg-black/70 px-1.5 py-1 rounded-full border border-blue-700/60 shadow-[0_4px_12px_rgba(0,100,255,0.5)] pointer-events-auto${rem < 30 ? ' animate-pulse' : ''}`}>
                            <img src="/assets/spell_resist_magic.png" alt="레지스트 매직" className="w-6 h-6 lg:w-7 lg:h-7 object-contain rounded border border-blue-600/50" />
                            <span className="hidden group-hover:inline ml-1.5 text-blue-300 font-mono text-xs font-bold tracking-widest pr-0.5">{m}:{s.toString().padStart(2, '0')}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/95 border border-blue-700/60 text-blue-300 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-[100] pointer-events-none">레지스트 매직 — MR +10%</div>
                        </div>
                    );
                })()}

                {/* 서먼 레서 엘리멘탈 */}
                {(() => {
                    const endTime = state.combatState?.summonElementalEndTime || 0;
                    if (endTime <= currentTime) return null;
                    const rem = Math.max(0, Math.ceil((endTime - currentTime) / 1000));
                    const m = Math.floor(rem / 60); const s = rem % 60;
                    return (
                        <div className={`group relative flex items-center bg-black/70 px-1.5 py-1 rounded-full border border-cyan-700/60 shadow-[0_4px_12px_rgba(0,200,200,0.5)] pointer-events-auto${rem < 30 ? ' animate-pulse' : ''}`}>
                            <img src="/assets/spell_summon_elemental.png" alt="서먼 레서 엘리멘탈" className="w-6 h-6 lg:w-7 lg:h-7 object-contain rounded border border-cyan-600/50" />
                            <span className="hidden group-hover:inline ml-1.5 text-cyan-300 font-mono text-xs font-bold tracking-widest pr-0.5">{m}:{s.toString().padStart(2, '0')}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/95 border border-cyan-700/60 text-cyan-300 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-[100] pointer-events-none">서먼 엘리멘탈 — 정령 동반 (공격력의 20%)</div>
                        </div>
                    );
                })()}

                {/* 윈드 샷 */}
                {(() => {
                    const endTime = state.combatState?.windShotEndTime || 0;
                    if (endTime <= currentTime) return null;
                    const rem = Math.max(0, Math.ceil((endTime - currentTime) / 1000));
                    const m = Math.floor(rem / 60); const s = rem % 60;
                    return (
                        <div className={`group relative flex items-center bg-black/70 px-1.5 py-1 rounded-full border border-sky-600/60 shadow-[0_4px_12px_rgba(100,200,255,0.5)] pointer-events-auto${rem < 30 ? ' animate-pulse' : ''}`}>
                            <img src="/assets/spell_wind_shot.png" alt="윈드 샷" className="w-6 h-6 lg:w-7 lg:h-7 object-contain rounded border border-sky-500/50" />
                            <span className="hidden group-hover:inline ml-1.5 text-sky-300 font-mono text-xs font-bold tracking-widest pr-0.5">{m}:{s.toString().padStart(2, '0')}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/95 border border-sky-600/60 text-sky-300 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-[100] pointer-events-none">윈드 샷 — 명중/회피 +5</div>
                        </div>
                    );
                })()}

                {/* 어스 스킨 */}
                {(() => {
                    const endTime = state.combatState?.earthSkinEndTime || 0;
                    if (endTime <= currentTime) return null;
                    const rem = Math.max(0, Math.ceil((endTime - currentTime) / 1000));
                    const m = Math.floor(rem / 60); const s = rem % 60;
                    return (
                        <div className={`group relative flex items-center bg-black/70 px-1.5 py-1 rounded-full border border-lime-700/60 shadow-[0_4px_12px_rgba(100,200,0,0.5)] pointer-events-auto${rem < 30 ? ' animate-pulse' : ''}`}>
                            <img src="/assets/spell_earth_skin.png" alt="어스 스킨" className="w-6 h-6 lg:w-7 lg:h-7 object-contain rounded border border-lime-600/50" />
                            <span className="hidden group-hover:inline ml-1.5 text-lime-300 font-mono text-xs font-bold tracking-widest pr-0.5">{m}:{s.toString().padStart(2, '0')}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/95 border border-lime-700/60 text-lime-300 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-[100] pointer-events-none">어스 스킨 — AC -4</div>
                        </div>
                    );
                })()}

                {/* 파이어 웨폰 */}
                {(() => {
                    const endTime = state.combatState?.fireWeaponEndTime || 0;
                    if (endTime <= currentTime) return null;
                    const rem = Math.max(0, Math.ceil((endTime - currentTime) / 1000));
                    const m = Math.floor(rem / 60); const s = rem % 60;
                    return (
                        <div className={`group relative flex items-center bg-black/70 px-1.5 py-1 rounded-full border border-red-700/60 shadow-[0_4px_12px_rgba(255,80,0,0.5)] pointer-events-auto${rem < 30 ? ' animate-pulse' : ''}`}>
                            <img src="/assets/spell_fire_weapon.png" alt="파이어 웨폰" className="w-6 h-6 lg:w-7 lg:h-7 object-contain rounded border border-red-600/50" />
                            <span className="hidden group-hover:inline ml-1.5 text-red-300 font-mono text-xs font-bold tracking-widest pr-0.5">{m}:{s.toString().padStart(2, '0')}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/95 border border-red-700/60 text-red-300 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-[100] pointer-events-none">파이어 웨폰 — 공격력 +3</div>
                        </div>
                    );
                })()}

                {/* 네이쳐스 터치 */}
                {(() => {
                    const endTime = state.combatState?.naturesTouchEndTime || 0;
                    if (endTime <= currentTime) return null;
                    const rem = Math.max(0, Math.ceil((endTime - currentTime) / 1000));
                    const m = Math.floor(rem / 60); const s = rem % 60;
                    return (
                        <div className={`group relative flex items-center bg-black/70 px-1.5 py-1 rounded-full border border-emerald-700/60 shadow-[0_4px_12px_rgba(0,180,100,0.5)] pointer-events-auto${rem < 30 ? ' animate-pulse' : ''}`}>
                            <img src="/assets/spell_natures_touch.png" alt="네이쳐스 터치" className="w-6 h-6 lg:w-7 lg:h-7 object-contain rounded border border-emerald-600/50" />
                            <span className="hidden group-hover:inline ml-1.5 text-emerald-300 font-mono text-xs font-bold tracking-widest pr-0.5">{m}:{s.toString().padStart(2, '0')}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/95 border border-emerald-700/60 text-emerald-300 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-[100] pointer-events-none">네이쳐스 터치 — HP +50 · 회복량 +10</div>
                        </div>
                    );
                })()}

                {/* 마나 회복 물약 */}
                {(() => {
                    const endTime = state.combatState?.mpRegenPotionEndTime || 0;
                    if (endTime <= currentTime) return null;
                    const rem = Math.max(0, Math.ceil((endTime - currentTime) / 1000));
                    const m = Math.floor(rem / 60); const s = rem % 60;
                    return (
                        <div className={`group relative flex items-center bg-black/70 px-1.5 py-1 rounded-full border border-sky-600/60 shadow-[0_4px_12px_rgba(0,150,255,0.5)] pointer-events-auto cursor-pointer hover:bg-sky-900/30 transition-colors${rem < 30 ? ' animate-pulse' : ''}`}
                            onClick={() => dispatch({ type: GAME_ACTIONS.CANCEL_BUFF, payload: 'mana_regen' })}>
                            <img src="/assets/마나 회복 물약.png" alt="마나 회복 물약" className="w-6 h-6 lg:w-7 lg:h-7 object-contain rounded border border-sky-500/50" />
                            <span className="hidden group-hover:inline ml-1.5 text-sky-300 font-mono text-xs font-bold tracking-widest pr-0.5">{m}:{s.toString().padStart(2, '0')}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/95 border border-sky-600/60 text-sky-300 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-[100] pointer-events-none">마나 회복 — 초당 MP +5</div>
                        </div>
                    );
                })()}

                {/* 파란 물약 */}
                {(() => {
                    const endTime = state.combatState?.bluePotionEndTime || 0;
                    if (endTime <= currentTime) return null;
                    const rem = Math.max(0, Math.ceil((endTime - currentTime) / 1000));
                    const m = Math.floor(rem / 60); const s = rem % 60;
                    return (
                        <div className={`group relative flex items-center bg-black/70 px-1.5 py-1 rounded-full border border-blue-500/60 shadow-[0_4px_12px_rgba(50,100,255,0.5)] pointer-events-auto cursor-pointer hover:bg-blue-900/30 transition-colors${rem < 30 ? ' animate-pulse' : ''}`}
                            onClick={() => dispatch({ type: GAME_ACTIONS.CANCEL_BUFF, payload: 'blue' })}>
                            <img src="/assets/파란 물약.png" alt="파란 물약" className="w-6 h-6 lg:w-7 lg:h-7 object-contain rounded border border-blue-400/50" />
                            <span className="hidden group-hover:inline ml-1.5 text-blue-300 font-mono text-xs font-bold tracking-widest pr-0.5">{m}:{s.toString().padStart(2, '0')}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/95 border border-blue-500/60 text-blue-300 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-[100] pointer-events-none">파란 물약 — MP +20 즉시 회복</div>
                        </div>
                    );
                })()}

                {/* 마법사: 실드 */}
                {state.characterClass === 'wizard' && (() => {
                    const endTime = state.combatState?.wizardShieldEndTime || 0;
                    if (endTime <= currentTime) return null;
                    const rem = Math.max(0, Math.ceil((endTime - currentTime) / 1000));
                    const m = Math.floor(rem / 60); const s = rem % 60;
                    return (
                        <div className={`group relative flex items-center bg-black/70 px-1.5 py-1 rounded-full border border-blue-600/60 shadow-[0_4px_12px_rgba(60,120,255,0.5)] pointer-events-auto${rem < 30 ? ' animate-pulse' : ''}`}>
                            <img src="/assets/실드.png" alt="실드" className="w-6 h-6 lg:w-7 lg:h-7 object-contain rounded border border-blue-500/50" />
                            <span className="hidden group-hover:inline ml-1.5 text-blue-300 font-mono text-xs font-bold tracking-widest pr-0.5">{m}:{s.toString().padStart(2, '0')}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/95 border border-blue-600/60 text-blue-300 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-[100] pointer-events-none">실드 — AC 감소</div>
                        </div>
                    );
                })()}

                {/* 마법사: 메디테이션 */}
                {state.characterClass === 'wizard' && (() => {
                    const endTime = state.combatState?.meditationEndTime || 0;
                    if (endTime <= currentTime) return null;
                    const rem = Math.max(0, Math.ceil((endTime - currentTime) / 1000));
                    const m = Math.floor(rem / 60); const s = rem % 60;
                    return (
                        <div className={`group relative flex items-center bg-black/70 px-1.5 py-1 rounded-full border border-indigo-600/60 shadow-[0_4px_12px_rgba(100,80,255,0.5)] pointer-events-auto${rem < 30 ? ' animate-pulse' : ''}`}>
                            <img src="/assets/마력서.png" alt="메디테이션" className="w-6 h-6 lg:w-7 lg:h-7 object-contain rounded border border-indigo-500/50" />
                            <span className="hidden group-hover:inline ml-1.5 text-indigo-300 font-mono text-xs font-bold tracking-widest pr-0.5">{m}:{s.toString().padStart(2, '0')}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/95 border border-indigo-600/60 text-indigo-300 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-[100] pointer-events-none">메디테이션 — MP 회복 증가</div>
                        </div>
                    );
                })()}

                {/* 마법사: 버스커스 */}
                {state.characterClass === 'wizard' && (() => {
                    const endTime = state.combatState?.berserkerEndTime || 0;
                    if (endTime <= currentTime) return null;
                    const rem = Math.max(0, Math.ceil((endTime - currentTime) / 1000));
                    const m = Math.floor(rem / 60); const s = rem % 60;
                    return (
                        <div className={`group relative flex items-center bg-black/70 px-1.5 py-1 rounded-full border border-red-600/60 shadow-[0_4px_12px_rgba(220,50,50,0.5)] pointer-events-auto${rem < 30 ? ' animate-pulse' : ''}`}>
                            <img src="/assets/버서커스.png" alt="버스커스" className="w-6 h-6 lg:w-7 lg:h-7 object-contain rounded border border-red-500/50" />
                            <span className="hidden group-hover:inline ml-1.5 text-red-400 font-mono text-xs font-bold tracking-widest pr-0.5">{m}:{s.toString().padStart(2, '0')}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/95 border border-red-600/60 text-red-300 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-[100] pointer-events-none">버서커스 — 공격력 · 공속 강화</div>
                        </div>
                    );
                })()}

                {/* 마법사: 서먼 몬스터 */}
                {state.characterClass === 'wizard' && (() => {
                    const endTime = state.combatState?.summonMonsterEndTime || 0;
                    if (endTime <= currentTime) return null;
                    const rem = Math.max(0, Math.ceil((endTime - currentTime) / 1000));
                    const m = Math.floor(rem / 60); const s = rem % 60;
                    return (
                        <div className={`group relative flex items-center bg-black/70 px-1.5 py-1 rounded-full border border-violet-600/60 shadow-[0_4px_12px_rgba(160,80,255,0.5)] pointer-events-auto${rem < 30 ? ' animate-pulse' : ''}`}>
                            <img src="/assets/서먼 몬스터.png" alt="서먼 몬스터" className="w-6 h-6 lg:w-7 lg:h-7 object-contain rounded border border-violet-500/50" />
                            <span className="hidden group-hover:inline ml-1.5 text-violet-300 font-mono text-xs font-bold tracking-widest pr-0.5">{m}:{s.toString().padStart(2, '0')}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/95 border border-violet-600/60 text-violet-300 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-[100] pointer-events-none">서먼 몬스터 — 소환수 활성</div>
                        </div>
                    );
                })()}

                {/* 인챈트 웨폰 */}
                {(() => {
                    const endTime = state.combatState?.enchantWeaponEndTime || 0;
                    if (endTime <= currentTime) return null;
                    const rem = Math.max(0, Math.ceil((endTime - currentTime) / 1000));
                    const m = Math.floor(rem / 60); const s = rem % 60;
                    return (
                        <div className={`group relative flex items-center bg-black/70 px-1.5 py-1 rounded-full border border-orange-500/60 shadow-[0_4px_12px_rgba(255,140,0,0.5)] pointer-events-auto${rem < 30 ? ' animate-pulse' : ''}`}>
                            <img src="/assets/인챈트 웨폰.png" alt="인챈트 웨폰" className="w-6 h-6 lg:w-7 lg:h-7 object-contain rounded border border-orange-400/50" />
                            <span className="hidden group-hover:inline ml-1.5 text-orange-300 font-mono text-xs font-bold tracking-widest pr-0.5">{m}:{s.toString().padStart(2, '0')}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/95 border border-orange-500/60 text-orange-300 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-[100] pointer-events-none">인챈트 웨폰 — 공격력 강화</div>
                        </div>
                    );
                })()}

                {/* 블레스드 아머 */}
                {(() => {
                    const endTime = state.combatState?.blessedArmorEndTime || 0;
                    if (endTime <= currentTime) return null;
                    const rem = Math.max(0, Math.ceil((endTime - currentTime) / 1000));
                    const m = Math.floor(rem / 60); const s = rem % 60;
                    return (
                        <div className={`group relative flex items-center bg-black/70 px-1.5 py-1 rounded-full border border-cyan-600/60 shadow-[0_4px_12px_rgba(0,200,220,0.5)] pointer-events-auto${rem < 30 ? ' animate-pulse' : ''}`}>
                            <img src="/assets/블레스 웨폰.png" alt="블레스드 아머" className="w-6 h-6 lg:w-7 lg:h-7 object-contain rounded border border-cyan-500/50" />
                            <span className="hidden group-hover:inline ml-1.5 text-cyan-300 font-mono text-xs font-bold tracking-widest pr-0.5">{m}:{s.toString().padStart(2, '0')}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/95 border border-cyan-600/60 text-cyan-300 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-[100] pointer-events-none">블레스드 아머 — AC 감소</div>
                        </div>
                    );
                })()}

                {/* 인챈트 덱스터리 */}
                {(() => {
                    const endTime = state.combatState?.enchantDexEndTime || 0;
                    if (endTime <= currentTime) return null;
                    const rem = Math.max(0, Math.ceil((endTime - currentTime) / 1000));
                    const m = Math.floor(rem / 60); const s = rem % 60;
                    return (
                        <div className={`group relative flex items-center bg-black/70 px-1.5 py-1 rounded-full border border-teal-600/60 shadow-[0_4px_12px_rgba(0,200,160,0.5)] pointer-events-auto${rem < 30 ? ' animate-pulse' : ''}`}>
                            <img src="/assets/인챈트 덱스터리.png" alt="인챈트 덱스터리" className="w-6 h-6 lg:w-7 lg:h-7 object-contain rounded border border-teal-500/50" />
                            <span className="hidden group-hover:inline ml-1.5 text-teal-300 font-mono text-xs font-bold tracking-widest pr-0.5">{m}:{s.toString().padStart(2, '0')}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/95 border border-teal-600/60 text-teal-300 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-[100] pointer-events-none">인챈트 덱스터리 — DEX 강화</div>
                        </div>
                    );
                })()}

                {/* 인챈트 마이티 (마법사 시전) */}
                {(() => {
                    const endTime = state.combatState?.enchantMightyEndTime || 0;
                    if (endTime <= currentTime) return null;
                    const rem = Math.max(0, Math.ceil((endTime - currentTime) / 1000));
                    const m = Math.floor(rem / 60); const s = rem % 60;
                    return (
                        <div className={`group relative flex items-center bg-black/70 px-1.5 py-1 rounded-full border border-yellow-500/60 shadow-[0_4px_12px_rgba(220,180,0,0.5)] pointer-events-auto${rem < 30 ? ' animate-pulse' : ''}`}>
                            <img src="/assets/인챈트 마이티.png" alt="인챈트 마이티" className="w-6 h-6 lg:w-7 lg:h-7 object-contain rounded border border-yellow-400/50" />
                            <span className="hidden group-hover:inline ml-1.5 text-yellow-300 font-mono text-xs font-bold tracking-widest pr-0.5">{m}:{s.toString().padStart(2, '0')}</span>
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block bg-black/95 border border-yellow-500/60 text-yellow-300 text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg z-[100] pointer-events-none">인챈트 마이티 — STR 강화</div>
                        </div>
                    );
                })()}
            </div>

            {/* Mobile: Left-side toggle buttons + overlays */}
            {isMobile && !hasAnyWindowOpen && (
                <>
                    {/* 토글 버튼 2개 */}
                    <div className="absolute left-1 z-30 lg:hidden flex flex-col gap-1" style={{ bottom: 'calc(88px + 6px)' }}>
                        <button
                            onTouchStart={(e) => { e.stopPropagation(); setIsMobileLogActive(v => !v); setIsMobileChatActive(false); }}
                            onClick={() => { setIsMobileLogActive(v => !v); setIsMobileChatActive(false); }}
                            className={`text-[11px] font-bold px-2 py-1 rounded-sm transition-all select-none ${isMobileLogActive ? 'text-red-400 bg-black/70' : 'text-[#555] bg-black/30'}`}
                            style={{ WebkitTouchCallout: 'none' }}
                        >⚔</button>
                        <button
                            onTouchStart={(e) => { e.stopPropagation(); setIsMobileChatActive(v => !v); setIsMobileLogActive(false); }}
                            onClick={() => { setIsMobileChatActive(v => !v); setIsMobileLogActive(false); }}
                            className={`text-[11px] font-bold px-2 py-1 rounded-sm transition-all select-none ${isMobileChatActive ? 'text-[#d4af37] bg-black/70' : 'text-[#555] bg-black/30'}`}
                            style={{ WebkitTouchCallout: 'none' }}
                        >💬</button>
                    </div>

                    {/* 전투 로그 오버레이 — 테두리 없이 글자만 흐릿하게 */}
                    {isMobileLogActive && (
                        <div
                            className="absolute lg:hidden pointer-events-none"
                            style={{ left: '36px', bottom: 'calc(88px + 4px)', width: '55vw', maxHeight: '26vh', zIndex: 22, overflow: 'hidden' }}
                        >
                            <div className="flex flex-col-reverse font-mono text-[10px] leading-[1.35]" style={{ maxHeight: '26vh' }}>
                                {(state.combatLogs || []).slice(-40).reverse().map((log, i) => {
                                    let c = 'rgba(200,200,200,0.88)';
                                    if (log.type === 'kill')  c = 'rgba(212,175,55,0.95)';
                                    if (log.type === 'drop')  c = 'rgba(80,220,80,0.95)';
                                    if (log.type === 'hit')   c = 'rgba(230,100,100,0.90)';
                                    if (log.type === 'death') c = 'rgba(230,60,60,0.95)';
                                    if (log.type === 'spell') c = 'rgba(180,120,240,0.90)';
                                    return (
                                        <div key={i} style={{ color: c, textShadow: '0 1px 3px rgba(0,0,0,0.9)' }} className="truncate py-px">
                                            {log.text}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* 채팅 오버레이 — 테두리 없이 글자만 흐릿하게 */}
                    {isMobileChatActive && (
                        <div
                            className="absolute lg:hidden"
                            style={{ left: '36px', bottom: 'calc(88px + 4px)', width: '60vw', maxHeight: '26vh', zIndex: 22, overflow: 'hidden' }}
                            onClick={() => { toggleWindow('chat'); setIsMobileChatActive(false); }}
                        >
                            <div className="flex flex-col-reverse font-sans text-[10px] leading-[1.35] pointer-events-none" style={{ maxHeight: '26vh' }}>
                                {(state.globalChatMessages || []).slice(-30).reverse().map((msg, i) => (
                                    <div key={i} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }} className="truncate py-px">
                                        <span style={{ color: 'rgba(212,175,55,0.95)' }}>{msg.user}: </span>
                                        <span style={{ color: 'rgba(220,220,200,0.90)' }}>{msg.text}</span>
                                    </div>
                                ))}
                                {(!state.globalChatMessages || state.globalChatMessages.length === 0) && (
                                    <div style={{ color: 'rgba(120,120,120,0.45)', textShadow: '0 1px 3px rgba(0,0,0,0.9)' }} className="text-[9px]">
                                        탭하면 채팅창 열림
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Teleport Menu — fixed, z-[45] (HUD z-40 위) */}
            <div className="fixed right-2 z-[45] min-w-[130px] bottom-[92px] lg:bottom-[184px]">
                {teleportOpen && (
                    <div
                        className="mb-1 bg-black/95 border border-[#555] rounded shadow-[0_-4px_20px_rgba(0,0,0,0.8)] overflow-y-auto custom-scrollbar"
                        style={{ maxHeight: 'calc(100dvh - 200px)' }}
                    >
                        <div className="flex flex-col gap-0.5 px-1.5 py-1.5">
                            {MAPS.filter(m => {
                                if (m.id === 'hell' || m.id === 'baphomet_room') return false;
                                if (m.id === 'village' && state.characterClass === 'elf') return false;
                                if (m.id === 'elf_village' && state.characterClass !== 'elf') return false;
                                return true;
                            }).map((map) => (
                                <button
                                    key={map.id}
                                    onClick={() => { teleport(map.id); setTeleportOpen(false); }}
                                    className={`text-xs px-2 py-1.5 text-left rounded whitespace-nowrap ${state.currentMapId === map.id ? 'bg-[#a59c77] text-black font-bold' : 'text-gray-300 hover:bg-[#333]'}`}
                                >
                                    {map.name}{map.minLevel > 1 && map.id !== 'village' && map.id !== 'elf_village' ? ` (Lv.${map.minLevel}+)` : ''}
                                </button>
                            ))}
                            <div className="h-[1px] bg-red-900/50 my-0.5" />
                            <div className="text-red-500 text-[10px] font-bold px-1 py-0.5">BOSS DOMAIN</div>
                            {MAPS.filter(m => m.id === 'hell' || m.id === 'baphomet_room').map((map) => (
                                <button
                                    key={map.id}
                                    onClick={() => { teleport(map.id); setTeleportOpen(false); }}
                                    className={`text-xs px-2 py-1.5 text-left rounded border shadow-[0_0_8px_rgba(255,0,0,0.2)] whitespace-nowrap ${state.currentMapId === map.id ? 'bg-red-900 text-white font-bold border-red-500' : (map.id === 'baphomet_room' ? 'text-orange-200 hover:bg-orange-900/40 border-orange-900/50 bg-orange-950/20' : 'text-red-200 hover:bg-red-900/40 border-red-900/50 bg-red-950/20')}`}
                                >
                                    {map.name}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
                <button
                    onClick={() => setTeleportOpen(o => !o)}
                    className="w-full flex items-center justify-between px-3 py-2 lg:py-1.5 text-[#a59c77] text-xs font-bold bg-black/70 border border-[#555] rounded hover:bg-white/5 transition-colors"
                >
                    <span>TELEPORT</span>
                    <span className="ml-2 text-[10px] transition-transform" style={{ display: 'inline-block', transform: teleportOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
                </button>
            </div>

            {/* 4. Bottom HUD */}
            <div className="absolute bottom-0 left-0 right-0 z-40 pointer-events-none">
                {/* Desktop gradient overlay */}
                <div className="hidden lg:block h-10 bg-gradient-to-t from-black to-transparent" />

                {/* HUD Content */}
                <div className="w-full h-[88px] lg:h-[180px] bg-[#0a0a0a]/95 border-t-2 border-[#333] flex pointer-events-auto shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">

                    {/* Section 1: HP/MP/EXP */}
                    <div className="flex flex-col w-[38%] lg:w-[320px] p-1 lg:p-3 justify-center lg:gap-2 border-r border-[#222] bg-gradient-to-r from-black/50 to-transparent">
                        <div className="hidden lg:flex items-center gap-2 mb-1">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <span className="text-[11px] text-gray-400 font-bold uppercase tracking-tighter">Status Monitor</span>
                        </div>
                        {/* HP Bar */}
                        {(() => {
                            const hpStats = calculateStats(state);
                            const maxHp = getMaxHp(state, hpStats);
                            return (
                                <div className="flex flex-col gap-0.5 md:gap-1">
                                    <div className="flex justify-between text-[#ccc] text-[10px] lg:text-xs font-bold">
                                        <span className="text-red-500/80">HP</span> <span>{state.hp} / {maxHp}</span>
                                    </div>
                                    <div className="w-full h-2.5 lg:h-4 bg-gray-900 rounded-sm overflow-hidden border border-gray-800 relative">
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
                                <div className="flex flex-col gap-0.5 md:gap-1">
                                    <div className="flex justify-between text-[#ccc] text-[10px] lg:text-xs font-bold">
                                        <span className="text-blue-500/80">MP</span> <span>{state.mp} / {maxMp}</span>
                                    </div>
                                    <div className="w-full h-2.5 lg:h-4 bg-gray-900 rounded-sm overflow-hidden border border-gray-800 relative">
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
                                <div>
                                    <div className="w-full h-1.5 bg-black rounded-full overflow-hidden border border-[#222] relative">
                                        <div className="h-full bg-gradient-to-r from-purple-800 to-purple-400 transition-all duration-500" style={{ width: `${Math.min(100, (state.currentExp / requiredExp) * 100)}%` }}></div>
                                    </div>
                                    <div className="flex justify-between text-[10px] text-[#555] px-0.5 font-mono">
                                        <span>LV.{state.level}</span>
                                        <span>{((state.currentExp / requiredExp) * 100).toFixed(2)}%</span>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>

                    {/* Section 2: Combat Logs — desktop only (mobile uses left overlay) */}
                    <div className="hidden lg:flex flex-1 lg:min-w-[300px] p-2 overflow-y-auto custom-scrollbar font-mono text-xs text-gray-400 leading-tight bg-black/40 border-r border-[#222] flex-col-reverse">
                        <div className="flex flex-col justify-end min-h-full">
                            {(state.logs || []).slice(0, 10).map((log, i) => (
                                <div key={`sys-${i}`} className="text-[#ffff00] px-2 py-0.5 border-l-2 border-[#ffff00]/50 bg-yellow-500/5 font-bold text-[11px] animate-pulse">
                                    {log}
                                </div>
                            ))}
                            {(state.logs || []).length > 0 && <div className="h-[1px] bg-gray-800 my-1 mx-2"></div>}
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

                    {/* Section 3: Global Chat — desktop only */}
                    <div className="hidden lg:flex flex-col w-full lg:w-[350px] border-r border-[#222] bg-black/20 min-h-0">
                        <ChatWindow user={user} />
                    </div>

                    {/* Section 4: 스킬 + 메뉴 */}
                    <div className="flex flex-1 min-w-0">
                        {/* 모바일: 4×2 스킬 그리드 + 4×2 메뉴 그리드 (나란히) */}
                        <div className="flex lg:hidden flex-row flex-1 h-full min-w-0">
                            {/* 좌측: 4×2 스킬 그리드 */}
                            <div className="flex-1 min-w-0">
                                <SkillBar mobileGrid />
                            </div>
                            {/* 구분선 */}
                            <div className="w-px bg-[#333] flex-shrink-0" />
                            {/* 우측: 4×2 메뉴 그리드 */}
                            <div className="flex-1 grid grid-cols-4 grid-rows-2 gap-0.5 p-0.5 min-w-0">
                                {[
                                    { id: 'inventory', label: '장비',   color: 'from-[#3a3a3a] to-[#222]' },
                                    { id: 'status',    label: '캐릭터', color: 'from-[#3a3a3a] to-[#222]' },
                                    { id: 'shop',      label: '상점',   color: 'from-[#3a3a3a] to-[#222]', action: () => { const iv = state.currentMapId==='village'||state.currentMapId==='elf_village'; if(!iv){dispatch({type:GAME_ACTIONS.ADD_LOG,payload:'[상점] 마을에서만 이용 가능합니다.'});return;} toggleWindow('shop'); } },
                                    { id: 'spellbook', label: '마법',   color: 'from-[#1a1a3a] to-[#0a0a22]' },
                                    { id: 'friends',   label: '친구',   color: 'from-[#3a3a3a] to-[#222]' },
                                    { id: 'warehouse', label: '창고',   color: 'from-[#3a3a3a] to-[#222]', action: () => { const iv = state.currentMapId==='village'||state.currentMapId==='elf_village'; if(!iv){dispatch({type:GAME_ACTIONS.ADD_LOG,payload:'[창고] 마을에서만 이용 가능합니다.'});return;} toggleWindow('warehouse'); } },
                                    { id: 'settings',  label: '설정',   color: 'from-[#3a3a3a] to-[#222]' },
                                    { id: 'logout',    label: '종료',   color: 'from-[#4a1a1a] to-[#2a0a0a]', action: () => setIsLogoutModalOpen(true) },
                                ].map(btn => (
                                    <button
                                        key={btn.id}
                                        onClick={btn.action || (() => toggleWindow(btn.id))}
                                        className={`rounded border border-[#444] bg-gradient-to-b ${btn.color} flex items-center justify-center text-[10px] font-bold active:scale-95 transition-all ${btn.id==='logout'?'text-red-400':'text-gray-300'}`}
                                    >
                                        {btn.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                        {/* 데스크탑: 기존 세로 레이아웃 (SkillBar + 8버튼 그리드) */}
                        <div className="hidden lg:flex flex-col w-[320px] bg-[#111]/50">
                            <SkillBar />
                            <div className="flex-1 p-1.5 grid grid-cols-4 gap-1.5 items-center content-center">
                                {[
                                    { id: 'inventory', label: '장비',   key: 'I',   color: 'from-[#3a3a3a] to-[#222]' },
                                    { id: 'status',    label: '캐릭터', key: 'C',   color: 'from-[#3a3a3a] to-[#222]' },
                                    { id: 'shop',      label: '상점',   key: 'S',   color: 'from-[#3a3a3a] to-[#222]', action: () => { const inVillage = state.currentMapId === 'village' || state.currentMapId === 'elf_village'; if (!inVillage) { dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: '[상점] 마을에서만 이용 가능합니다.' }); return; } toggleWindow('shop'); } },
                                    { id: 'friends',   label: '친구',   key: 'F',   color: 'from-[#3a3a3a] to-[#222]' },
                                    { id: 'warehouse', label: '창고',   key: 'B',   color: 'from-[#3a3a3a] to-[#222]', action: () => { const inVillage = state.currentMapId === 'village' || state.currentMapId === 'elf_village'; if (!inVillage) { dispatch({ type: GAME_ACTIONS.ADD_LOG, payload: '[창고] 마을에서만 이용 가능합니다.' }); return; } toggleWindow('warehouse'); } },
                                    { id: 'settings',  label: '설정',   key: 'O',   color: 'from-[#3a3a3a] to-[#222]' },
                                    { id: 'spellbook', label: '마법',   key: 'W',   color: 'from-[#1a1a3a] to-[#0a0a22]' },
                                    { id: 'logout',    label: '종료',   key: 'ESC', color: 'from-[#4a1a1a] to-[#2a0a0a]', action: () => setIsLogoutModalOpen(true) }
                                ].map((btn) => (
                                    <button
                                        key={btn.id}
                                        onClick={btn.action || (() => toggleWindow(btn.id))}
                                        className={`relative h-11 md:h-12 rounded border border-[#444] bg-gradient-to-b ${btn.color} flex flex-col items-center justify-center transition-all group overflow-hidden hover:border-[#d4af37]/50 active:translate-y-0.5 active:scale-95 shadow-lg`}
                                    >
                                        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <span className={`text-xs font-bold ${btn.id === 'logout' ? 'text-red-400' : 'text-gray-300'} group-hover:text-white`}>{btn.label}</span>
                                        <span className="text-[8px] text-gray-500 font-mono mt-[-2px]">({btn.key})</span>
                                        <div className="absolute bottom-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#d4af37]/30 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-300"></div>
                                    </button>
                                ))}
                            </div>
                        </div>
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
                        defaultSize={{ width: '300px', height: `${Math.min(560, window.innerHeight - 140)}px` }}
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
                        defaultPosition={{ x: Math.max(10, window.innerWidth - 305), y: 80 }}
                        defaultSize={{ width: '295px', height: `${Math.min(480, window.innerHeight - 140)}px` }}
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
                        defaultPosition={{ x: Math.max(10, window.innerWidth - 615), y: 80 }}
                        defaultSize={{ width: '305px', height: `${Math.min(480, window.innerHeight - 140)}px` }}
                    >
                        <Shop />
                    </DraggableWindow>
                )
            }

            {
                activeWindows.spellbook && (
                    <DraggableWindow
                        title="MAGIC / SKILL"
                        onClose={() => toggleWindow('spellbook')}
                        defaultPosition={{ x: window.innerWidth - 740, y: 120 }}
                        defaultSize={{ width: '320px', height: '480px' }}
                    >
                        <SpellBook />
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
                        defaultSize={{ width: '380px', height: '420px' }}
                    >
                        <Settings soundSettings={soundSettings} setSoundSettings={setSoundSettings} />
                    </DraggableWindow>
                )
            }

            {/* Warehouse */}
            {
                activeWindows.warehouse && (
                    <DraggableWindow
                        title="창고 (WAREHOUSE)"
                        onClose={() => toggleWindow('warehouse')}
                        defaultPosition={{ x: window.innerWidth / 2 - 175, y: 100 }}
                        defaultSize={{ width: '350px', height: '520px' }}
                    >
                        <Warehouse />
                    </DraggableWindow>
                )
            }

            {/* Game Guide */}
            {
                activeWindows.guide && (
                    <DraggableWindow
                        title="📖 게임 가이드북"
                        onClose={() => toggleWindow('guide')}
                        defaultPosition={{ x: window.innerWidth / 2 - 280, y: 60 }}
                        defaultSize={{ width: '560px', height: '600px' }}
                    >
                        <GameGuide />
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
                        <FriendList onInviteToParty={inviteToParty} currentParty={state.party} />
                    </DraggableWindow>
                )
            }

            {/* 거래 창 */}
            <TradeWindow />

            {/* 거래 수신 알림 */}
            {incomingRequest && (
                <div className="fixed inset-0 z-[350] flex items-center justify-center bg-black/70 backdrop-blur-sm">
                    <div className="bg-[#1a1a1a] border border-[#d4af37] p-5 text-center w-72 shadow-[0_0_30px_rgba(212,175,55,0.2)]">
                        <div className="text-[#d4af37] font-bold text-base mb-1">거래 신청</div>
                        <div className="text-gray-300 text-sm mb-4">
                            <span className="text-white font-bold">{incomingRequest.from}</span>님이<br />거래를 신청했습니다.
                        </div>
                        <div className="flex gap-2 justify-center">
                            <button onClick={acceptTrade} className="px-5 py-1.5 bg-[#2a2a1a] border border-[#d4af37] text-[#d4af37] text-sm font-bold hover:bg-[#d4af37]/20 active:scale-95">수락</button>
                            <button onClick={declineTrade} className="px-5 py-1.5 bg-red-900/30 border border-red-700 text-red-300 text-sm hover:bg-red-900/60 active:scale-95">거절</button>
                        </div>
                    </div>
                </div>
            )}

            {/* [New] Logout Confirmation Modal */}
            {isLogoutModalOpen && (
                <div className="absolute inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
                    <div className="w-[320px] max-w-[90vw] bg-[#1a1a1a] border-2 border-[#d4af37] p-1 shadow-[0_0_50px_rgba(0,0,0,0.6)]">
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
