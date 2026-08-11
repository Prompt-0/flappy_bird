/**
 * AudioSynthesizer.js
 * 100% procedural Web Audio API synthesizer for Flappy Bird sound effects.
 * Includes safe fallback mechanics for environments where Web Audio API is unsupported
 * or AudioContext is uninitialized/closed/suspended.
 */

export class AudioSynthesizer {
  constructor(audioCtx = null, masterGainNode = null) {
    this.ctx = audioCtx;
    this.masterGain = masterGainNode;
    this.isMuted = false;

    if (!this.ctx && typeof window !== 'undefined') {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        try {
          this.ctx = new AudioContextClass();
        } catch (e) {
          this.ctx = null;
        }
      }
    }

    if (this.ctx && !this.masterGain) {
      try {
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
      } catch (e) {
        this.masterGain = null;
      }
    }
  }

  /**
   * Helper check to ensure Web Audio API context and master gain are operational and unmuted.
   */
  isReady() {
    if (this.isMuted) return false;
    if (!this.ctx || !this.masterGain) return false;
    if (this.ctx.state === 'closed') return false;
    return true;
  }

  /**
   * Set mute flag for synthesizer output.
   */
  setMuted(muted) {
    this.isMuted = Boolean(muted);
  }

  /**
   * Flap sound effect: Oscillator pitch sweep 220Hz -> 580Hz over ~0.15s with exponential gain decay.
   */
  playFlap() {
    if (!this.isReady()) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(580, now + 0.15);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch (err) {
      // Safe fallback: exit cleanly
    }
  }

  /**
   * Score sound effect: 2-note chime (C6 ~ 1046.5Hz for 0.08s then E6 ~ 1318.5Hz for 0.15s).
   */
  playScore() {
    if (!this.isReady()) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const now = this.ctx.currentTime;

      // Note 1: C6 (1046.5 Hz)
      const osc1 = this.ctx.createOscillator();
      const gain1 = this.ctx.createGain();
      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(1046.5, now);
      gain1.gain.setValueAtTime(0.25, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc1.connect(gain1);
      gain1.connect(this.masterGain);
      osc1.start(now);
      osc1.stop(now + 0.08);

      // Note 2: E6 (1318.5 Hz)
      const osc2 = this.ctx.createOscillator();
      const gain2 = this.ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1318.5, now + 0.08);
      gain2.gain.setValueAtTime(0.3, now + 0.08);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.08 + 0.15);

      osc2.connect(gain2);
      gain2.connect(this.masterGain);
      osc2.start(now + 0.08);
      osc2.stop(now + 0.08 + 0.15);
    } catch (err) {
      // Safe fallback
    }
  }

  /**
   * Hit sound effect: Square wave oscillator pitch drop + lowpass filtered white noise crash burst.
   */
  playHit() {
    if (!this.isReady()) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const now = this.ctx.currentTime;

      // 1. Square wave thud
      const osc = this.ctx.createOscillator();
      const oscGain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(160, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

      oscGain.gain.setValueAtTime(0.4, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(oscGain);
      oscGain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.2);

      // 2. White noise crash burst with lowpass filter
      const bufferSize = Math.floor(this.ctx.sampleRate * 0.25);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1000, now);
      filter.frequency.exponentialRampToValueAtTime(100, now + 0.25);

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.35, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

      noise.connect(filter);
      filter.connect(noiseGain);
      noiseGain.connect(this.masterGain);

      noise.start(now);
      noise.stop(now + 0.25);
    } catch (err) {
      // Safe fallback
    }
  }

  /**
   * Click sound effect: Quick 800Hz sine burst for UI interactions.
   */
  playClick() {
    if (!this.isReady()) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (err) {
      // Safe fallback
    }
  }

  /**
   * Power-up pickup chime: 4-note ascending arpeggio (C5, E5, G5, C6).
   */
  playPowerUp() {
    if (!this.isReady()) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const now = this.ctx.currentTime;
      const freqs = [523.25, 659.25, 783.99, 1046.50];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.05);
        gain.gain.setValueAtTime(0.25, now + idx * 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.05 + 0.12);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + idx * 0.05);
        osc.stop(now + idx * 0.05 + 0.12);
      });
    } catch (err) {}
  }

  /**
   * Achievement fanfare sound: 3-note triumph chord.
   */
  playAchievement() {
    if (!this.isReady()) return;
    try {
      if (this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
      const now = this.ctx.currentTime;
      const freqs = [587.33, 739.99, 880.00, 1174.66];
      freqs.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);
        gain.gain.setValueAtTime(0.3, now + idx * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.2);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.2);
      });
    } catch (err) {}
  }
}
