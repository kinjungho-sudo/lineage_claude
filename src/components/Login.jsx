import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { Shield } from 'lucide-react';

const Login = () => {
    const [view, setView] = useState('login'); // 'login' | 'signup' | 'forgot' | 'reset'
    const [userId, setUserId] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [forgotUserId, setForgotUserId] = useState('');
    const [forgotEmail, setForgotEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const { loginUser, signupUser, forgotPassword, resetPasswordDirect, isLoading } = useGame();

    const resetFields = (v) => {
        setUserId(''); setPassword(''); setName(''); setEmail('');
        setForgotUserId(''); setForgotEmail('');
        setNewPassword(''); setConfirmPassword('');
        setView(v);
    };

    const handleLogin = (e) => {
        e.preventDefault();
        if (!userId.trim() || !password.trim()) return;
        loginUser(userId.trim(), password.trim());
    };

    const handleSignup = (e) => {
        e.preventDefault();
        const idRegex = /^[a-zA-Z0-9]{4,12}$/;
        if (!idRegex.test(userId)) {
            alert('아이디는 영문, 숫자 4~12자리로 입력해주세요.');
            return;
        }
        if (password.length < 8) {
            alert('비밀번호는 최소 8자 이상이어야 합니다.');
            return;
        }
        if (!name.trim() || name.trim().length < 2) {
            alert('이름을 2자 이상 입력해주세요.');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('올바른 이메일 주소를 입력해주세요.');
            return;
        }
        signupUser(userId.trim(), password.trim(), name.trim(), email.trim());
    };

    const handleForgot = async (e) => {
        e.preventDefault();
        if (!forgotUserId.trim() || !forgotEmail.trim()) return;
        const ok = await forgotPassword(forgotUserId.trim(), forgotEmail.trim());
        if (ok) setView('reset');
    };

    const handleReset = async (e) => {
        e.preventDefault();
        if (newPassword.length < 8) { alert('비밀번호는 최소 8자 이상이어야 합니다.'); return; }
        if (newPassword !== confirmPassword) { alert('비밀번호가 일치하지 않습니다.'); return; }
        const ok = await resetPasswordDirect(forgotUserId.trim(), newPassword);
        if (ok) resetFields('login');
    };

    const inputClass = "w-full bg-black border border-[#3f3f3f] text-[#efefef] px-3 py-2 focus:border-[#d4af37] outline-none font-mono tracking-wider transition-colors text-center";
    const labelClass = "text-[#a59c77] text-xs font-bold tracking-widest pl-1";

    return (
        <div className="min-h-screen bg-black flex flex-col items-center justify-center p-4 font-serif select-none bg-[url('/assets/login_bg_v2.png')] bg-cover bg-center bg-no-repeat">
            {/* Branding */}
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

            {/* Box */}
            <div className="w-full max-w-[400px] bg-[#1a1a1a] border-2 border-[#555] p-1 shadow-[0_0_20px_rgba(0,0,0,0.8)] relative">
                <div className="border border-[#2a2a2a] p-6 flex flex-col gap-6 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-[#a59c77]"></div>
                    <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-[#a59c77]"></div>
                    <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-[#a59c77]"></div>
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-[#a59c77]"></div>

                    {/* ── LOGIN ── */}
                    {view === 'login' && (
                        <form onSubmit={handleLogin} className="flex flex-col gap-4 relative z-10">
                            <div className="text-center text-[#d4af37] font-bold tracking-widest text-lg mb-2">LOGIN</div>

                            <div className="space-y-1">
                                <label className={labelClass}>ACCOUNT (ID)</label>
                                <input type="text" value={userId} onChange={e => setUserId(e.target.value)}
                                    disabled={isLoading} autoFocus className={inputClass} placeholder="아이디" />
                            </div>
                            <div className="space-y-1">
                                <label className={labelClass}>PASSWORD</label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                    disabled={isLoading} className={inputClass} placeholder="비밀번호" />
                            </div>

                            <div className="flex gap-2 mt-2">
                                <button type="submit"
                                    disabled={isLoading || !userId.trim() || !password.trim()}
                                    className={`flex-1 py-3 text-sm font-bold tracking-widest transition-all border border-[#3f3f3f]
                                        ${isLoading || !userId.trim() || !password.trim()
                                            ? 'bg-[#222] text-[#555] cursor-not-allowed'
                                            : 'bg-[#2a2a2a] text-[#d4af37] hover:bg-[#333] hover:text-white hover:border-[#a59c77] active:scale-95'}`}>
                                    {isLoading ? 'Processing...' : 'Game Start'}
                                </button>
                            </div>

                            <div className="flex justify-between mt-1">
                                <button type="button" onClick={() => resetFields('signup')}
                                    className="text-[#666] text-xs hover:text-[#a59c77] underline underline-offset-4 transition-colors">
                                    계정 생성
                                </button>
                                <button type="button" onClick={() => resetFields('forgot')}
                                    className="text-[#666] text-xs hover:text-[#a59c77] underline underline-offset-4 transition-colors">
                                    비밀번호 찾기
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ── SIGNUP ── */}
                    {view === 'signup' && (
                        <form onSubmit={handleSignup} className="flex flex-col gap-4 relative z-10">
                            <div className="text-center text-[#d4af37] font-bold tracking-widest text-lg mb-2">ACCOUNT CREATION</div>

                            <div className="space-y-1">
                                <label className={labelClass}>ACCOUNT (ID)</label>
                                <input type="text" value={userId} onChange={e => setUserId(e.target.value)}
                                    disabled={isLoading} autoFocus className={inputClass} placeholder="영문+숫자 4~12자" />
                            </div>
                            <div className="space-y-1">
                                <label className={labelClass}>이름 (NAME)</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)}
                                    disabled={isLoading} className={inputClass} placeholder="실명 입력" />
                            </div>
                            <div className="space-y-1">
                                <label className={labelClass}>이메일 (EMAIL)</label>
                                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                                    disabled={isLoading} className={inputClass} placeholder="비밀번호 찾기에 사용" />
                            </div>
                            <div className="space-y-1">
                                <label className={labelClass}>PASSWORD <span className="text-[10px] text-red-400">(Min 8)</span></label>
                                <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                                    disabled={isLoading} className={inputClass} placeholder="비밀번호" />
                            </div>

                            <div className="flex gap-2 mt-2">
                                <button type="submit"
                                    disabled={isLoading || !userId.trim() || !password.trim() || !name.trim() || !email.trim()}
                                    className={`flex-1 py-3 text-sm font-bold tracking-widest transition-all border border-[#3f3f3f]
                                        ${isLoading || !userId.trim() || !password.trim() || !name.trim() || !email.trim()
                                            ? 'bg-[#222] text-[#555] cursor-not-allowed'
                                            : 'bg-[#2a2a2a] text-[#d4af37] hover:bg-[#333] hover:text-white hover:border-[#a59c77] active:scale-95'}`}>
                                    {isLoading ? 'Processing...' : 'Create Account'}
                                </button>
                            </div>

                            <div className="text-center mt-1">
                                <button type="button" onClick={() => resetFields('login')}
                                    className="text-[#666] text-xs hover:text-[#a59c77] underline underline-offset-4 transition-colors">
                                    이미 계정이 있으신가요? 로그인
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ── FORGOT PASSWORD (1단계: 본인 확인) ── */}
                    {view === 'forgot' && (
                        <form onSubmit={handleForgot} className="flex flex-col gap-4 relative z-10">
                            <div className="text-center text-[#d4af37] font-bold tracking-widest text-lg mb-2">비밀번호 재설정</div>
                            <p className="text-[#666] text-xs text-center -mt-2">가입 시 등록한 아이디와 이메일로 본인 확인을 합니다.</p>

                            <div className="space-y-1">
                                <label className={labelClass}>ACCOUNT (ID)</label>
                                <input type="text" value={forgotUserId} onChange={e => setForgotUserId(e.target.value)}
                                    disabled={isLoading} autoFocus className={inputClass} placeholder="아이디" />
                            </div>
                            <div className="space-y-1">
                                <label className={labelClass}>이메일 (EMAIL)</label>
                                <input type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                                    disabled={isLoading} className={inputClass} placeholder="가입 시 이메일" />
                            </div>

                            <div className="flex gap-2 mt-2">
                                <button type="submit"
                                    disabled={isLoading || !forgotUserId.trim() || !forgotEmail.trim()}
                                    className={`flex-1 py-3 text-sm font-bold tracking-widest transition-all border border-[#3f3f3f]
                                        ${isLoading || !forgotUserId.trim() || !forgotEmail.trim()
                                            ? 'bg-[#222] text-[#555] cursor-not-allowed'
                                            : 'bg-[#2a2a2a] text-[#d4af37] hover:bg-[#333] hover:text-white hover:border-[#a59c77] active:scale-95'}`}>
                                    {isLoading ? '확인 중...' : '본인 확인'}
                                </button>
                            </div>

                            <div className="text-center mt-1">
                                <button type="button" onClick={() => resetFields('login')}
                                    className="text-[#666] text-xs hover:text-[#a59c77] underline underline-offset-4 transition-colors">
                                    로그인으로 돌아가기
                                </button>
                            </div>
                        </form>
                    )}

                    {/* ── RESET PASSWORD (2단계: 새 비밀번호 입력) ── */}
                    {view === 'reset' && (
                        <form onSubmit={handleReset} className="flex flex-col gap-4 relative z-10">
                            <div className="text-center text-[#d4af37] font-bold tracking-widest text-lg mb-2">새 비밀번호 설정</div>
                            <p className="text-[#666] text-xs text-center -mt-2">사용할 새 비밀번호를 입력하세요.</p>

                            <div className="space-y-1">
                                <label className={labelClass}>새 비밀번호 <span className="text-[10px] text-red-400">(Min 8)</span></label>
                                <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                                    disabled={isLoading} autoFocus className={inputClass} placeholder="새 비밀번호" />
                            </div>
                            <div className="space-y-1">
                                <label className={labelClass}>비밀번호 확인</label>
                                <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                                    disabled={isLoading} className={inputClass} placeholder="비밀번호 재입력" />
                            </div>

                            <div className="flex gap-2 mt-2">
                                <button type="submit"
                                    disabled={isLoading || !newPassword || !confirmPassword}
                                    className={`flex-1 py-3 text-sm font-bold tracking-widest transition-all border border-[#3f3f3f]
                                        ${isLoading || !newPassword || !confirmPassword
                                            ? 'bg-[#222] text-[#555] cursor-not-allowed'
                                            : 'bg-[#2a2a2a] text-[#d4af37] hover:bg-[#333] hover:text-white hover:border-[#a59c77] active:scale-95'}`}>
                                    {isLoading ? '변경 중...' : '비밀번호 변경'}
                                </button>
                            </div>

                            <div className="text-center mt-1">
                                <button type="button" onClick={() => resetFields('login')}
                                    className="text-[#666] text-xs hover:text-[#a59c77] underline underline-offset-4 transition-colors">
                                    로그인으로 돌아가기
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-8 text-center space-y-2 opacity-60 relative group cursor-help">
                <p className="text-[#444] text-[10px] tracking-widest hover:text-[#a59c77] transition-colors">LINEAGE ENCHANT SIMULATOR</p>
                <p className="text-[#333] text-[9px]">COPYRIGHT © NCSOFT CORPORATION. ALL RIGHTS RESERVED. (v0.9.5)</p>
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 bg-black/90 border border-[#a59c77] p-2 text-xs text-[#a59c77] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 rounded shadow-lg text-center font-sans tracking-normal">
                    이 게임은 리니지를 모방하여 강화를 시뮬레이션 하는 팬 메이드 미니게임입니다.
                    실제 게임 서비스와는 무관하며, 상업적 용도로 사용되지 않습니다.
                </div>
            </div>
        </div>
    );
};

export default Login;
