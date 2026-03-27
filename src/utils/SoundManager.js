/**
 * Sound Manager
 * Handles playing sound effects and background music.
 * Fails silently if files are missing.
 */
class SoundManager {
    constructor() {
        this.sounds = {};
        this.muted = false;
    }

    // Preload commonly used sounds if needed (optional for now)
    preload() {
        // defined but not strictly enforcing buffer loading
    }

    playSound(soundName) {
        if (this.muted) return;

        try {
            const audio = new Audio(`/assets/sounds/${soundName}.mp3`);
            audio.volume = 0.5;
            audio.play().catch(e => {
                // Ignore errors (e.g., file not found or interaction required)
                // console.warn(`Sound ${soundName} failed to play:`, e);
            });
        } catch (e) {
            console.error(e);
        }
    }

    // Play with slight random pitch for variety? (Advanced, skip for now)
}

export const soundManager = new SoundManager();
