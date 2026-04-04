/**
 * Sound Manager
 * Handles playing sound effects and background music.
 * Fails silently if files are missing.
 */
class SoundManager {
    constructor() {
        this.sounds = {};
        this.muted = false;
        this.volume = 0.8;
    }

    setEnabled(enabled) {
        this.muted = !enabled;
    }

    setVolume(volume) {
        this.volume = volume;
    }

    playSound(soundName) {
        if (this.muted) return;

        try {
            const audio = new Audio(`/assets/sounds/${soundName}.mp3`);
            audio.volume = this.volume;
            audio.play().catch(() => {});
        } catch (e) {
            console.error(e);
        }
    }
}

export const soundManager = new SoundManager();
