import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Shield } from 'lucide-react';

const Login = () => {
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState('');
    const [isSignup, setIsSignup] = useState(false); // Toggle State
    const { loginUser, signupUser, isLoading } = useGame();

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!userId.trim() || !password.trim()) return;

        if (isSignup) {
            // ID Valid Check (English & Numbers, 4-12 length)
            const idRegex = /^[a-zA-Z0-9]{4,12}$/;
            if (!idRegex.test(userId)) {
                alert('아이디는 영문, 숫자 4~12자리로 입력해주세요.');
                return;
            }

            if (password.length < 8) {
                alert('비밀번호는 최소 8자 이상이어야 합니다.');
                return;
            }
            if (!nickname.trim()) {
                alert('캐릭터 이름을 입력해주세요.');
                return;
            }
            // Nickname regex (Korean, English, Numbers, 2-10 length)
            const nickRegex = /^[가-힣a-zA-Z0-9]{2,10}$/;
            if (!nickRegex.test(nickname)) {
                alert('닉네임은 한글, 영문, 숫자 2~10자리로 입력해주세요.');
                return;
            }

            signupUser(userId.trim(), password.trim(), nickname.trim());
        } else {
            loginUser(userId.trim(), password.trim());
        }
    };

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 font-serif select-none bg-[url('/assets/login_bg_v2.png')] bg-cover bg-center bg-no-repeat">
            {/* Branding / Logo Area */}
            <div className="mb-8 animate-fade-in-down flex flex-col items-center">
                <div className="relative">
                    <Shield className="w-16 h-16 text-[#a59c77] absolute -top-8 left-1/2 -translate-x-1/2 opacity-20" />
                    <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-[#d4af37] to-[#8a6d3b] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] tracking-tighter"
                        style={{ fontFamily: '"Cinzel", serif' }}>
                        LINEAGE
                    </h1>
                </div>
                <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-[#a59c77] to-transparent mt-2 mb-1 opacity-50"></div>
                <p className="text-[#a59c77] text-xs tracking-[0.5em] font-bold opacity-80">THE BLOOD PLEDGE</p>
            </div>

            {/* Login Box Container */}
            <div className="w-full max-w-[400px] bg-[#1a1a1a] border-2 border-[#555] p-1 shadow-[0_0_20px_rgba(0,0,0,0.8)] relative">
                {/* Inner Border */}
                <div className="border border-[#2a2a2a] p-6 flex flex-col gap-6 relative overflow-hidden">

                    {/* Decorative Corners */}
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#a59c77]"></div>
                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#a59c77]"></div>
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#a59c77]"></div>
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#a59c77]"></div>

                    <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
                        {/* Header for Mode */}
                        <div className="text-center text-[#d4af37] font-bold tracking-widest text-lg mb-2">
                            {isSignup ? 'ACCOUNT CREATION' : 'LOGIN'}
                        </div>

                        {/* Account Field */}
                        <div className="space-y-1">
                            <label className="text-[#a59c77] text-xs font-bold tracking-widest pl-1">ACCOUNT (ID)</label>
                            <input
                                type="text"
                                value={userId}
                                onChange={(e) => setUserId(e.target.value)}
                                disabled={isLoading}
                                autoFocus
                                className="w-full bg-black border border-[#3f3f3f] text-[#efefef] px-3 py-2 focus:border-[#d4af37] outline-none font-mono tracking-wider transition-colors text-center"
                                placeholder="아이디 (Login ID)"
                            />
                        </div>

                        {/* Nickname Field (Signup Only) */}
                        {isSignup && (
                            <div className="space-y-1 animate-fade-in-down">
                                <label className="text-[#a59c77] text-xs font-bold tracking-widest pl-1">CHARACTER NAME</label>
                                <input
                                    type="text"
                                    value={nickname}
                                    onChange={(e) => setNickname(e.target.value)}
                                    disabled={isLoading}
                                    className="w-full bg-black border border-[#3f3f3f] text-[#efefef] px-3 py-2 focus:border-[#d4af37] outline-none font-mono tracking-wider transition-colors text-center"
                                    placeholder="캐릭터 이름 (별명)"
                                />
                            </div>
                        )}

                        {/* Password Field */}
                        <div className="space-y-1">
                            <label className="text-[#a59c77] text-xs font-bold tracking-widest pl-1">
                                PASSWORD {isSignup && <span className="text-[10px] text-red-400">(Min 8)</span>}
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                disabled={isLoading}
                                className="w-full bg-black border border-[#3f3f3f] text-[#efefef] px-3 py-2 focus:border-[#d4af37] outline-none font-mono tracking-wider transition-colors text-center"
                                placeholder="비밀번호"
                            />
                        </div>

                        {/* Buttons */}
                        <div className="flex gap-2 mt-4">
                            <button
                                type="submit"
                                disabled={isLoading || !userId.trim() || !password.trim() || (isSignup && !nickname.trim())}
                                className={`
                                    flex-1 py-3 text-sm font-bold tracking-widest transition-all border border-[#3f3f3f]
                                    ${isLoading || !userId.trim() || !password.trim() || (isSignup && !nickname.trim())
                                        ? 'bg-[#222] text-[#555] cursor-not-allowed'
                                        : 'bg-[#2a2a2a] text-[#d4af37] hover:bg-[#333] hover:text-white hover:border-[#a59c77] active:scale-95 shadow-md'
                                    }
                                `}
                            >
                                {isLoading ? 'Processing...' : (isSignup ? 'Create Account' : 'Game Start')}
                            </button>
                        </div>

                        {/* Toggle Mode */}
                        <div className="text-center mt-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsSignup(!isSignup);
                                    setUserId('');
                                    setPassword('');
                                    setNickname('');
                                }}
                                className="text-[#666] text-xs hover:text-[#a59c77] underline underline-offset-4 transition-colors"
                            >
                                {isSignup ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 계정 생성'}
                            </button>
                        </div>

                    </form>
                </div>
            </div>

            {/* Footer Text */}
            <div className="mt-8 text-center space-y-2 opacity-60 relative group cursor-help">
                <p className="text-[#444] text-[10px] tracking-widest hover:text-[#a59c77] transition-colors">
                    LINEAGE ENCHANT SIMULATOR
                </p>
                <p className="text-[#333] text-[9px]">
                    COPYRIGHT © NCSOFT CORPORATION. ALL RIGHTS RESERVED. (v0.9.5)
                </p>

                {/* Disclaimer Tooltip */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-black/90 border border-[#a59c77] p-2 text-xs text-[#a59c77] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 rounded shadow-lg text-center font-sans tracking-normal">
                    이 게임은 리니지를 모방하여 강화를 시뮬레이션 하는 팬 메이드 미니게임입니다.
                    실제 게임 서비스와는 무관하며, 상업적 용도로 사용되지 않습니다.
                </div>
            </div>
        </div>
    );
};

export default Login;
