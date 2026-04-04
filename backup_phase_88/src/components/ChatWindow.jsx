import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

const ChatWindow = ({ user }) => {
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
    useEffect(() => {
        // Prevent duplicate subscription
        if (channelRef.current) return;

        const channel = supabase.channel('game_global', {
            config: {
                broadcast: { self: false },
            },
        });

        channel
            .on('broadcast', { event: 'chat' }, (payload) => {
                setMessages((prev) => [...prev, payload.payload]);
            })
            .on('broadcast', { event: 'announcement' }, (payload) => {
                setMessages((prev) => [...prev, { ...payload.payload, isSystem: true }]);
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    setIsConnected(true);
                    setMessages(prev => [...prev, { user: 'System', text: '전체 채팅 채널에 접속했습니다.', isSystem: true }]);
                } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                    setIsConnected(false);
                    console.error('Chat Connection Error:', status);
                    setMessages(prev => [...prev, { user: 'System', text: `채팅 서버 연결 실패 (${status}) - 새로고침 해주세요.`, isSystem: true }]);
                }
            });

        channelRef.current = channel;

        return () => {
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
                channelRef.current = null;
                setIsConnected(false);
            }
        };
    }, []);

    const sendMessage = async () => {
        if (!inputText.trim()) return;
        if (!user) return;
        if (!channelRef.current || !isConnected) {
            setMessages(prev => [...prev, { user: 'System', text: '채팅 서버에 연결되지 않았습니다.', isSystem: true }]);
            return;
        }

        const messageData = {
            user: user.nickname || user.id, // Use Nickname
            text: inputText.trim(),
            timestamp: Date.now(),
        };

        // Optimistic UI Update (Show my message immediately)
        setMessages((prev) => [...prev, messageData]);

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
        <div className="flex flex-col h-full bg-black/40 text-xs font-sans">
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
                                    [공지] {msg.text}
                                </div>
                            );
                        }
                        if (msg.type === 'enchant_fail') {
                            return (
                                <div key={idx} className="text-[#ff0000] font-bold drop-shadow-md text-center py-1 bg-white/5 border-y border-white/10">
                                    [공지] {msg.text}
                                </div>
                            );
                        }
                        return (
                            <div key={idx} className="text-[#ffff00] font-bold italic">
                                [시스템] {msg.text}
                            </div>
                        );
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
            <div className="p-1 border-t border-[#444] bg-[#222]">
                <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="대화 입력 (Enter)..."
                    className="w-full bg-[#111] border border-[#555] text-white px-2 py-1 rounded focus:outline-none focus:border-[#777]"
                />
            </div>
        </div>
    );
};

export default ChatWindow;
