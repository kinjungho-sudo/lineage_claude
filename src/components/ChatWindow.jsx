import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { useGame } from '../context/GameContext';
import { GAME_ACTIONS } from '../context/GameReducer';
import { soundManager } from '../utils/SoundManager';

const ChatWindow = ({ user }) => {
    const { state, dispatch } = useGame(); // [친구 시스템용 GameContext 연결]
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const messagesEndRef = useRef(null);
    const channelRef = useRef(null);

    const [isConnected, setIsConnected] = useState(false);

    // Scroll to bottom
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Connect to Supabase Realtime
    const connectChat = () => {
        if (channelRef.current) {
            supabase.removeChannel(channelRef.current);
            channelRef.current = null;
        }

        const channel = supabase.channel('game_global', {
            config: { broadcast: { self: false } },
        });

        channel
            .on('broadcast', { event: 'chat' }, (payload) => {
                const msg = payload.payload;
                if (msg.isWhisper) {
                    if (msg.targetUser === (user?.nickname || user?.id) || msg.user === (user?.nickname || user?.id)) {
                        setMessages((prev) => [...prev, msg]);
                        if (msg.targetUser === (user?.nickname || user?.id)) soundManager.playSound('party_join');
                    }
                } else {
                    setMessages((prev) => [...prev, msg]);
                }
            })
            .on('broadcast', { event: 'login' }, (payload) => {
                const loggedInUser = payload.payload.user;
                if (state.friends?.includes(loggedInUser)) {
                    const text = `[친구 접속] ${loggedInUser}님이 게임에 입장하셨습니다.`;
                    setMessages((prev) => [...prev, { user: 'System', text, isSystem: true }]);
                    dispatch({ type: GAME_ACTIONS.SET_STATE, payload: { screenMessage: text } });
                    soundManager.playSound('party_join');
                }
            })
            .on('broadcast', { event: 'announcement' }, (payload) => {
                const msg = payload.payload;
                const isFriend = state.friends?.includes(msg.sender);
                if (msg.type === 'boss_kill' || isFriend) {
                    setMessages((prev) => [...prev, { ...msg, isSystem: true }]);
                    dispatch({ type: GAME_ACTIONS.SET_STATE, payload: { screenMessage: msg.text } });
                }
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setIsConnected(true);
                    setMessages(prev => [...prev, { user: 'System', text: '채팅 서버에 접속했습니다.', isSystem: true }]);
                    channel.send({
                        type: 'broadcast',
                        event: 'login',
                        payload: { user: user?.nickname || user?.id }
                    }).catch(console.error);
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    setIsConnected(false);
                    console.error('Chat Connection Error:', status);
                    setMessages(prev => [...prev, { user: 'System', text: `채팅 연결 끊김 (${status})`, isSystem: true }]);
                }
            });

        channelRef.current = channel;
    };

    useEffect(() => {
        connectChat();
        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
                setIsConnected(false);
            }
        };
    }, []);

    // [전역 공지 발송 로직] pendingAnnouncements가 있으면 읽어서 서버에 브로드캐스트
    useEffect(() => {
        if (state.pendingAnnouncements && state.pendingAnnouncements.length > 0 && channelRef.current && isConnected) {
            state.pendingAnnouncements.forEach(ann => {
                const text = ann.text.replace('__USER__', state.characterName || user?.nickname || user?.id || 'Unknown');
                const messageData = {
                    type: ann.type,
                    text: text,
                    sender: user?.nickname || user?.id,
                    timestamp: Date.now()
                };

                // 본인 화면에도 즉시 표시
                setMessages(prev => [...prev, { ...messageData, isSystem: true }]);

                // 서버로 브로드캐스트
                channelRef.current.send({
                    type: 'broadcast',
                    event: 'announcement',
                    payload: messageData,
                }).catch(err => console.error("Broadcast err:", err));
                
                // 화면 중앙 팝업 (본인)
                dispatch({ type: GAME_ACTIONS.SET_STATE, payload: { screenMessage: text }});
            });

            // 모두 발송 후 큐 비우기
            dispatch({ type: GAME_ACTIONS.CLEAR_ANNOUNCEMENTS });
        }
    }, [state.pendingAnnouncements, isConnected, user, dispatch]);

    const sendMessage = async () => {
        if (!inputText.trim()) return;
        if (!user) return;
        if (!channelRef.current || !isConnected) {
            setMessages(prev => [...prev, { user: 'System', text: '채팅 서버에 연결되지 않았습니다.', isSystem: true }]);
            return;
        }

        let parsedText = inputText.trim();

        // 1. 친구 추가
        if (parsedText.startsWith('/친구추가 ')) {
            const friendName = parsedText.replace('/친구추가 ', '').trim();
            if (friendName) {
                dispatch({ type: GAME_ACTIONS.ADD_FRIEND, payload: friendName });
                setMessages(prev => [...prev, { user: 'System', text: `${friendName}님을 친구로 등록했습니다.`, isSystem: true }]);
            }
            setInputText('');
            return;
        }

        // 2. 친구 삭제
        if (parsedText.startsWith('/친구삭제 ')) {
            const friendName = parsedText.replace('/친구삭제 ', '').trim();
            if (friendName) {
                dispatch({ type: GAME_ACTIONS.REMOVE_FRIEND, payload: friendName });
                setMessages(prev => [...prev, { user: 'System', text: `${friendName}님을 친구 목록에서 삭제했습니다.`, isSystem: true }]);
            }
            setInputText('');
            return;
        }

        // 3. 친구 목록 조회
        if (parsedText === '/친구목록' || parsedText === '/친구') {
            const currentFriends = state.friends || [];
            if (currentFriends.length > 0) {
                setMessages(prev => [...prev, { user: 'System', text: `[친구 목록] ${currentFriends.join(', ')}`, isSystem: true }]);
            } else {
                setMessages(prev => [...prev, { user: 'System', text: `등록된 친구가 없습니다. (/친구추가 [이름])`, isSystem: true }]);
            }
            setInputText('');
            return;
        }

        // 4. 귓속말 (형식: "닉네임 할말)
        let isWhisper = false;
        let targetUser = '';
        if (parsedText.startsWith('"')) {
            const firstSpaceIdx = parsedText.indexOf(' ');
            if (firstSpaceIdx > 1) { // '"A B' 형태 보장
                targetUser = parsedText.substring(1, firstSpaceIdx).trim();
                parsedText = parsedText.substring(firstSpaceIdx + 1).trim();
                isWhisper = true;
            }
        }

        const messageData = {
            user: user.nickname || user.id, // Use Nickname
            text: parsedText,
            timestamp: Date.now(),
            isWhisper,
            targetUser
        };

        // 내 화면에 귓속말 표시 안하도록 보장 (broadcast on에서 본인 확인으로 그릴 예정)
        // 일반 채팅은 우선 그리기 (Optimistic UI)
        if (!isWhisper) {
            setMessages((prev) => [...prev, messageData]);
        }

        // Note: 'broadcast' confirms reception but doesn't persist.
        await channelRef.current.send({
            type: 'broadcast',
            event: 'chat',
            payload: messageData,
        });

        setInputText('');
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            sendMessage();
        }
    };

    return (
        <div className="flex flex-col flex-1 min-h-0 bg-black/40 text-xs font-sans">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-2 custom-scrollbar flex flex-col gap-1 text-[11px]">
                {messages.map((msg, idx) => {
                    const isSystem = msg.isSystem;
                    const isMe = msg.user === user?.nickname || msg.user === user?.id;

                    if (isSystem) {
                        // Announcement Style
                        if (msg.type === 'enchant_success') {
                            return (
                                <div key={idx} className="text-[#00ff00] font-bold drop-shadow-md text-center py-1 bg-white/5 border-y border-white/10">
                                    [축복] {msg.text}
                                </div>
                            );
                        }
                        if (msg.type === 'enchant_fail') {
                            return (
                                <div key={idx} className="text-[#ff0000] font-bold drop-shadow-md text-center py-1 bg-white/5 border-y border-white/10">
                                    [저주] {msg.text}
                                </div>
                            );
                        }
                        if (msg.type === 'boss_kill') {
                            return (
                                <div key={idx} className="text-[#d4af37] font-bold drop-shadow-[0_0_5px_rgba(212,175,55,1)] text-center py-1.5 bg-yellow-900/30 border-y border-yellow-700">
                                    👑 {msg.text}
                                </div>
                            );
                        }
                        return (
                            <div key={idx} className="text-[#ffff00] font-bold italic">
                                [시스템] {msg.text}
                            </div>
                        );
                    }

                    if (msg.isWhisper) {
                        const amISender = msg.user === (user?.nickname || user?.id);
                        if (amISender) {
                            return (
                                <div key={idx} className="text-[#ff99ff] break-words leading-tight">
                                    <span className="font-bold">-&gt; {msg.targetUser} :</span> <span className="text-[#ffccff] ml-1">{msg.text}</span>
                                </div>
                            );
                        } else {
                            return (
                                <div key={idx} className="text-[#ff99ff] break-words leading-tight bg-pink-900/20 px-1 rounded">
                                    <span className="font-bold">{msg.user} -&gt; :</span> <span className="text-[#ffccff] ml-1">{msg.text}</span>
                                    {/* 귓속말 왔을 때 사운드 추가 등 기능 확장 가능 */}
                                </div>
                            );
                        }
                    }

                    return (
                        <div key={idx} className={`${isMe ? 'text-[#aaddff]' : 'text-gray-300'} break-words leading-tight`}>
                            <span className="font-bold text-[#bbaaff]">{msg.user}:</span> <span className="text-white ml-1">{msg.text}</span>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-1 border-t border-[#444] bg-[#222] flex gap-1 items-center">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} title={isConnected ? '연결됨' : '연결 끊김'} />
                {!isConnected && (
                    <button
                        onClick={connectChat}
                        className="text-[#d4af37] text-[10px] font-bold hover:text-white px-1 flex-shrink-0"
                        title="재연결"
                    >
                        재연결
                    </button>
                )}
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={!isConnected}
                    placeholder={isConnected ? '대화 입력 (Enter)...' : '연결 중...'}
                    className="flex-1 bg-[#111] border border-[#555] text-white px-2 py-1 rounded focus:outline-none focus:border-[#777] disabled:opacity-50"
                />
            </div>
        </div>
    );
};

export default ChatWindow;
