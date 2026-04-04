import { useEffect, useRef } from 'react';
import { soundManager } from '../utils/SoundManager';

const BGM_SRC = '/assets/Lineage_BGM_2.m4a';

/**
 * BGM 관리 훅
 * - soundSettings는 ref로 추적 → stale closure 문제 완전 해결
 * - 파일 로드 완료 후 재생 시도 (canplaythrough 이벤트)
 * - 브라우저 autoplay 정책: 첫 인터랙션(click/keydown) 후 재생 보장
 */
export const useBgm = (soundSettings) => {
    const audioRef = useRef(null);
    const settingsRef = useRef(soundSettings);

    // soundSettings 변경 시 ref 동기화 (stale closure 방지)
    useEffect(() => {
        settingsRef.current = soundSettings;
    });

    // 최초 마운트: Audio 생성
    useEffect(() => {
        const audio = new Audio();
        audio.loop = true;
        audio.preload = 'auto';
        audioRef.current = audio;

        const tryPlay = () => {
            if (!audioRef.current) return;
            if (!settingsRef.current.bgmEnabled) return;
            audioRef.current.volume = settingsRef.current.bgmVolume ?? 0.5;
            audioRef.current.play().catch(() => {
                // 실패 시 다음 인터랙션에서 재시도 — handler가 계속 등록돼 있음
            });
        };

        // 파일 로드 완료 후 자동 재생 시도 (canplay: 일부만 로드돼도 재생 가능)
        audio.addEventListener('canplay', tryPlay, { once: true });

        // 인터랙션 후 재시도 (autoplay 정책 대응)
        const handler = () => {
            if (audioRef.current?.paused) tryPlay();
        };
        window.addEventListener('click', handler);
        window.addEventListener('keydown', handler);

        // 탭 닫기 / 페이지 이탈 시 강제 정지
        const handleHide = () => { if (audioRef.current) audioRef.current.pause(); };
        window.addEventListener('pagehide', handleHide);
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && audioRef.current) audioRef.current.pause();
        });

        // src 마지막에 설정 (위 리스너 등록 후)
        audio.src = BGM_SRC;
        audio.load();

        return () => {
            window.removeEventListener('click', handler);
            window.removeEventListener('keydown', handler);
            window.removeEventListener('pagehide', handleHide);
            audio.pause();
            audio.src = '';
            audioRef.current = null;
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // bgmEnabled / bgmVolume 변경 시 즉시 반영
    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;
        if (soundSettings.bgmEnabled) {
            audio.volume = soundSettings.bgmVolume ?? 0.5;
            if (audio.paused) audio.play().catch(() => {});
        } else {
            audio.pause();
        }
    }, [soundSettings.bgmEnabled, soundSettings.bgmVolume]);
};

export const useSfx = (soundSettings) => {
    useEffect(() => {
        soundManager.setEnabled(soundSettings.sfxEnabled);
        soundManager.setVolume(soundSettings.sfxVolume ?? 0.8);
    }, [soundSettings.sfxEnabled, soundSettings.sfxVolume]);
};

export const DEFAULT_SOUND_SETTINGS = {
    bgmEnabled: true,
    sfxEnabled: true,
    bgmVolume: 0.5,
    sfxVolume: 0.8,
};

export const loadSoundSettings = () => {
    try {
        const saved = localStorage.getItem('lineage_sound_settings');
        return saved ? { ...DEFAULT_SOUND_SETTINGS, ...JSON.parse(saved) } : { ...DEFAULT_SOUND_SETTINGS };
    } catch {
        return { ...DEFAULT_SOUND_SETTINGS };
    }
};

export const saveSoundSettings = (settings) => {
    localStorage.setItem('lineage_sound_settings', JSON.stringify(settings));
};
