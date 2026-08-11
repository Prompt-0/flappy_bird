/**
 * AudioManager.js
 * Audio manager handling autoplay gesture unlocking, master gain & volume,
 * mute toggling, storage persistence integration, and EventBus sound subscriptions.
 */

import { AudioSynthesizer } from './AudioSynthesizer.js';

export class AudioManager {
  constructor(options = {}) {
    this.eventBus = options.eventBus || null;
    this.storageEngine = options.storageEngine || null;

    // Load persisted audio preferences
    const prefs = this.storageEngine ? this.storageEngine.getAudioPrefs() : { muted: false, volume: 0.8 };
    this.muted = prefs.muted ?? false;
    this.volume = typeof prefs.volume === 'number' ? prefs.volume : 0.8;

    this.ctx = null;
    this.masterGain = null;
    this.unlocked = false;

    this._initAudioContext();
    this.synth = new AudioSynthesizer(this.ctx, this.masterGain);
    this.synth.setMuted(this.muted);
    this.updateMasterGain();

    this.initOnUserGesture();
    this.subscribeEvents();
  }

  _initAudioContext() {
    if (typeof window === 'undefined') return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;

    try {
      this.ctx = new AudioContextClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);
    } catch (err) {
      this.ctx = null;
      this.masterGain = null;
    }
  }

  initOnUserGesture() {
    if (typeof window === 'undefined' || !this.ctx) return;

    const unlock = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          this.unlocked = true;
        }).catch(() => {});
      } else {
        this.unlocked = true;
      }
      ['click', 'touchstart', 'keydown'].forEach(evt => {
        try {
          window.removeEventListener(evt, unlock, true);
        } catch (e) {}
      });
    };

    ['click', 'touchstart', 'keydown'].forEach(evt => {
      try {
        window.addEventListener(evt, unlock, { once: true, capture: true });
      } catch (e) {}
    });
  }

  subscribeEvents() {
    if (!this.eventBus) return;

    this.eventBus.on('BIRD_FLAP', () => this.playFlap());
    this.eventBus.on('PIPE_PASS', () => this.playScore());
    this.eventBus.on('BIRD_HIT', () => this.playHit());
    this.eventBus.on('POWERUP_COLLECTED', () => this.playPowerUp());
    this.eventBus.on('SHIELD_BROKEN', () => this.playHit());
    this.eventBus.on('ACHIEVEMENT_UNLOCKED', () => this.playAchievement());
    this.eventBus.on('CHALLENGE_LEVEL_CLEARED', () => this.playAchievement());
  }

  updateMasterGain() {
    if (!this.masterGain || !this.ctx) return;
    try {
      const targetGain = this.muted ? 0 : this.volume;
      this.masterGain.gain.setValueAtTime(targetGain, this.ctx.currentTime);
    } catch (e) {}
  }

  toggleMute() {
    this.muted = !this.muted;
    this.synth.setMuted(this.muted);
    this.updateMasterGain();
    if (this.storageEngine) {
      this.storageEngine.setAudioPrefs({ muted: this.muted, volume: this.volume });
    }
    return this.muted;
  }

  isMuted() {
    return this.muted;
  }

  setVolume(vol) {
    if (typeof vol !== 'number' || isNaN(vol)) return this.volume;
    this.volume = Math.max(0, Math.min(1, vol));
    this.updateMasterGain();
    if (this.storageEngine) {
      this.storageEngine.setAudioPrefs({ muted: this.muted, volume: this.volume });
    }
    return this.volume;
  }

  getVolume() {
    return this.volume;
  }

  playFlap() {
    if (this.muted) return;
    this.synth.playFlap();
  }

  playScore() {
    if (this.muted) return;
    this.synth.playScore();
  }

  playHit() {
    if (this.muted) return;
    this.synth.playHit();
  }

  playClick() {
    if (this.muted) return;
    this.synth.playClick();
  }

  playPowerUp() {
    if (this.muted) return;
    this.synth.playPowerUp();
  }

  playAchievement() {
    if (this.muted) return;
    this.synth.playAchievement();
  }
}
