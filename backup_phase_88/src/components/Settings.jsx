import React, { useState } from 'react';
import { soundManager } from '../utils/SoundManager';

const Settings = () => {
    const [isMuted, setIsMuted] = useState(soundManager.muted);

    const toggleMute = () => {
        const newState = !isMuted;
        soundManager.muted = newState;
        setIsMuted(newState);
    };

    return (
        <div className="p-4 text-center">
            <h2 className="text-[#d4af37] font-bold mb-4">환경 설정</h2>
            <div className="flex items-center justify-center gap-2 mb-4">
                <input
                    type="checkbox"
                    id="mute-check"
                    checked={isMuted}
                    onChange={toggleMute}
                    className="w-5 h-5 accent-[#d4af37]"
                />
                <label htmlFor="mute-check" className="text-gray-300">전체 소리 끄기</label>
            </div>
            <p className="text-xs text-gray-500">
                (사운드 파일은 public/assets/sounds에 있어야 합니다)
            </p>
        </div>
    );
};

export default Settings;
