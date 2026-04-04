import React, { useState } from 'react';
import { useGame } from '../context/GameContext';
import { GAME_ACTIONS } from '../context/GameReducer';
import { saveSoundSettings } from '../hooks/useSoundManager';

const Settings = ({ soundSettings, setSoundSettings }) => {
    const [view, setView] = useState('main'); // 'main' | 'account'
    const [currentPw, setCurrentPw] = useState('');
    const [newPw, setNewPw] = useState('');
    const [confirmPw, setConfirmPw] = useState('');
    const { user, changePassword, isLoading, state, dispatch } = useGame();

    const autoMask = state?.autoSlotMask || [false, false, false, false, true, true, true, true];

    const toggleAutoSlot = (i) => {
        const newMask = [...autoMask];
        newMask[i] = !newMask[i];
        dispatch({ type: GAME_ACTIONS.SET_AUTO_SLOT_MASK, payload: newMask });
    };

    const handleChangePassword = async (e) => {
        e.preventDefault();
        if (newPw !== confirmPw) {
            alert('새 비밀번호가 일치하지 않습니다.');
            return;
        }
        const ok = await changePassword(user.id, currentPw, newPw);
        if (ok) {
            setCurrentPw('');
            setNewPw('');
            setConfirmPw('');
            setView('main');
        }
    };

    const updateSound = (key, value) => {
        const next = { ...soundSettings, [key]: value };
        setSoundSettings(next);
        saveSoundSettings(next);
    };

    const inputClass = "w-full bg-[#111] border border-[#333] text-[#efefef] px-3 py-2 focus:border-[#d4af37] outline-none font-mono text-sm transition-colors";
    const labelClass = "text-[#a59c77] text-xs font-bold tracking-wider";

    if (view === 'account') {
        return (
            <div className="p-5 space-y-4">
                <div className="flex items-center gap-2 mb-2">
                    <button
                        onClick={() => setView('main')}
                        className="text-[#a59c77] hover:text-[#d4af37] text-xs"
                    >
                        ← 뒤로
                    </button>
                    <h2 className="text-[#d4af37] font-bold text-sm tracking-widest">계정 정보 변경</h2>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-3">
                    <div>
                        <label className={`${labelClass} block mb-1`}>현재 비밀번호</label>
                        <input type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)}
                            className={inputClass} placeholder="현재 비밀번호 입력" />
                    </div>
                    <div>
                        <label className={`${labelClass} block mb-1`}>새 비밀번호 (최소 8자)</label>
                        <input type="password" value={newPw} onChange={e => setNewPw(e.target.value)}
                            className={inputClass} placeholder="새 비밀번호 입력" />
                    </div>
                    <div>
                        <label className={`${labelClass} block mb-1`}>새 비밀번호 확인</label>
                        <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                            className={inputClass} placeholder="새 비밀번호 재입력" />
                    </div>
                    <button type="submit"
                        disabled={isLoading || !currentPw || !newPw || !confirmPw}
                        className={`w-full py-2 text-xs font-bold tracking-widest border transition-all mt-2
                            ${isLoading || !currentPw || !newPw || !confirmPw
                                ? 'bg-[#1a1a1a] border-[#333] text-[#444] cursor-not-allowed'
                                : 'bg-[#2a2a2a] border-[#d4af37] text-[#d4af37] hover:bg-[#d4af37] hover:text-black'}`}>
                        {isLoading ? '처리 중...' : '비밀번호 변경'}
                    </button>
                </form>
            </div>
        );
    }

    return (
        <div className="p-5 space-y-5">
            <h2 className="text-[#d4af37] font-bold text-sm tracking-widest">설정</h2>

            {/* 사운드 설정 */}
            <div className="space-y-4">
                <div className="text-[#888] text-[10px] uppercase tracking-widest border-b border-[#333] pb-1">사운드</div>

                {/* BGM */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className={labelClass}>배경음악 (BGM)</span>
                        <button
                            onClick={() => updateSound('bgmEnabled', !soundSettings.bgmEnabled)}
                            className={`px-3 py-1 text-xs font-bold border transition-all ${
                                soundSettings.bgmEnabled
                                    ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]'
                                    : 'bg-[#1a1a1a] border-[#444] text-[#555]'
                            }`}
                        >
                            {soundSettings.bgmEnabled ? 'ON' : 'OFF'}
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[#555] text-[10px] w-6">🔈</span>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={soundSettings.bgmVolume}
                            onChange={e => updateSound('bgmVolume', parseFloat(e.target.value))}
                            disabled={!soundSettings.bgmEnabled}
                            className="flex-1 accent-[#d4af37] disabled:opacity-30 cursor-pointer"
                        />
                        <span className="text-[#a59c77] text-[10px] font-mono w-8 text-right">
                            {Math.round(soundSettings.bgmVolume * 100)}%
                        </span>
                    </div>
                </div>

                {/* 게임 사운드(SFX) */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <span className={labelClass}>게임 사운드 (SFX)</span>
                        <button
                            onClick={() => updateSound('sfxEnabled', !soundSettings.sfxEnabled)}
                            className={`px-3 py-1 text-xs font-bold border transition-all ${
                                soundSettings.sfxEnabled
                                    ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]'
                                    : 'bg-[#1a1a1a] border-[#444] text-[#555]'
                            }`}
                        >
                            {soundSettings.sfxEnabled ? 'ON' : 'OFF'}
                        </button>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-[#555] text-[10px] w-6">🔈</span>
                        <input
                            type="range"
                            min="0"
                            max="1"
                            step="0.05"
                            value={soundSettings.sfxVolume}
                            onChange={e => updateSound('sfxVolume', parseFloat(e.target.value))}
                            disabled={!soundSettings.sfxEnabled}
                            className="flex-1 accent-[#d4af37] disabled:opacity-30 cursor-pointer"
                        />
                        <span className="text-[#a59c77] text-[10px] font-mono w-8 text-right">
                            {Math.round(soundSettings.sfxVolume * 100)}%
                        </span>
                    </div>
                </div>
            </div>

            {/* 스킬 단축키 AUTO 설정 */}
            <div className="space-y-3">
                <div className="text-[#888] text-[10px] uppercase tracking-widest border-b border-[#333] pb-1">스킬 단축키 AUTO 설정</div>
                <p className="text-[#666] text-[10px] leading-relaxed">
                    AUTO로 설정된 슬롯은 쿨다운 종료 시 자동으로 재시전됩니다.
                </p>
                <div className="grid grid-cols-8 gap-1">
                    {autoMask.map((isAuto, i) => (
                        <button
                            key={i}
                            onClick={() => toggleAutoSlot(i)}
                            className={`
                                flex flex-col items-center justify-center py-2 gap-1 border text-[10px] font-bold transition-all
                                ${isAuto
                                    ? 'bg-[#d4af37]/20 border-[#d4af37] text-[#d4af37]'
                                    : 'bg-[#1a1a1a] border-[#333] text-[#555] hover:border-[#555]'
                                }
                            `}
                        >
                            <span className="text-[13px] font-mono">{i + 1}</span>
                            <span className="text-[8px] tracking-wide leading-none">
                                {isAuto ? 'AUTO' : '수동'}
                            </span>
                        </button>
                    ))}
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => dispatch({ type: GAME_ACTIONS.SET_AUTO_SLOT_MASK, payload: [false, false, false, false, true, true, true, true] })}
                        className="flex-1 py-1.5 text-[10px] font-bold border border-[#333] text-[#666] hover:border-[#555] hover:text-[#888] transition-all"
                    >
                        기본값 (5~8 AUTO)
                    </button>
                    <button
                        onClick={() => dispatch({ type: GAME_ACTIONS.SET_AUTO_SLOT_MASK, payload: Array(8).fill(true) })}
                        className="flex-1 py-1.5 text-[10px] font-bold border border-[#333] text-[#666] hover:border-[#555] hover:text-[#888] transition-all"
                    >
                        전체 AUTO
                    </button>
                    <button
                        onClick={() => dispatch({ type: GAME_ACTIONS.SET_AUTO_SLOT_MASK, payload: Array(8).fill(false) })}
                        className="flex-1 py-1.5 text-[10px] font-bold border border-[#333] text-[#666] hover:border-[#555] hover:text-[#888] transition-all"
                    >
                        전체 수동
                    </button>
                </div>
            </div>

            {/* 계정 설정 */}
            <div className="space-y-2">
                <div className="text-[#888] text-[10px] uppercase tracking-widest border-b border-[#333] pb-1">계정</div>
                <button
                    onClick={() => setView('account')}
                    className="w-full text-left py-3 px-4 bg-[#222] border border-[#333] text-[#efefef] text-sm hover:border-[#d4af37] hover:text-[#d4af37] transition-all"
                >
                    계정 정보 변경
                    <span className="text-[#555] text-xs ml-2">비밀번호 변경</span>
                </button>
            </div>
        </div>
    );
};

export default Settings;
