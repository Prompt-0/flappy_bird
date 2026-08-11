/**
 * StorageEngine.js
 * JSON localStorage driver for key `flappy_bird_data_v1`
 * featuring robust in-memory fallback for environments without localStorage
 * or when SecurityError / QuotaExceededError is thrown.
 */

const STORAGE_KEY = 'flappy_bird_data_v1';

const DEFAULT_DATA = {
  highScore: 0,
  stats: {
    totalGames: 0,
    totalFlaps: 0,
    totalPipes: 0,
    totalTime: 0
  },
  unlockedSkins: ['classic_yellow'],
  selectedSkin: 'classic_yellow',
  audio: {
    muted: false,
    volume: 0.8
  }
};

export class StorageEngine {
  constructor(storageKey = STORAGE_KEY) {
    this.key = storageKey;
    this.memoryStore = null;
    this.useMemoryFallback = false;
    this._checkAvailability();
    this.data = this.load();
  }

  /**
   * Check if localStorage is available and writable.
   */
  _checkAvailability() {
    try {
      if (typeof localStorage === 'undefined' || localStorage === null) {
        this.useMemoryFallback = true;
        return;
      }
      const testKey = `__storage_test__`;
      localStorage.setItem(testKey, testKey);
      localStorage.removeItem(testKey);
      this.useMemoryFallback = false;
    } catch (e) {
      this.useMemoryFallback = true;
    }
  }

  /**
   * Load data from storage or memory fallback.
   * Merges loaded data with DEFAULT_DATA schema.
   */
  load() {
    let raw = null;
    if (!this.useMemoryFallback) {
      try {
        raw = localStorage.getItem(this.key);
      } catch (e) {
        this.useMemoryFallback = true;
        raw = this.memoryStore;
      }
    } else {
      raw = this.memoryStore;
    }

    if (!raw) {
      this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
      return this.data;
    }

    try {
      const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
      const isValidObj = parsed && typeof parsed === 'object';
      const rawStats = (isValidObj && parsed.stats && typeof parsed.stats === 'object') ? parsed.stats : {};

      const sanitizeStat = (val, defaultVal) => {
        return (typeof val === 'number' && Number.isFinite(val) && val >= 0) ? val : defaultVal;
      };

      const rawHighScore = isValidObj ? parsed.highScore : undefined;
      const highScoreVal = Math.max(0, (typeof rawHighScore === 'number' && Number.isFinite(rawHighScore)) ? Math.floor(rawHighScore) : DEFAULT_DATA.highScore);

      this.data = {
        highScore: highScoreVal,
        stats: {
          totalGames: sanitizeStat(rawStats.totalGames, DEFAULT_DATA.stats.totalGames),
          totalFlaps: sanitizeStat(rawStats.totalFlaps, DEFAULT_DATA.stats.totalFlaps),
          totalPipes: sanitizeStat(rawStats.totalPipes, DEFAULT_DATA.stats.totalPipes),
          totalTime: sanitizeStat(rawStats.totalTime, DEFAULT_DATA.stats.totalTime)
        },
        unlockedSkins: (isValidObj && Array.isArray(parsed.unlockedSkins) && parsed.unlockedSkins.length > 0)
          ? Array.from(new Set(parsed.unlockedSkins.filter(s => typeof s === 'string')))
          : [...DEFAULT_DATA.unlockedSkins],
        selectedSkin: (isValidObj && typeof parsed.selectedSkin === 'string') ? parsed.selectedSkin : DEFAULT_DATA.selectedSkin,
        audio: {
          muted: (isValidObj && parsed.audio && typeof parsed.audio.muted === 'boolean') ? parsed.audio.muted : DEFAULT_DATA.audio.muted,
          volume: (isValidObj && parsed.audio && typeof parsed.audio.volume === 'number' && Number.isFinite(parsed.audio.volume))
            ? Math.max(0, Math.min(1, parsed.audio.volume))
            : DEFAULT_DATA.audio.volume
        }
      };
    } catch (err) {
      this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    }

    return this.data;
  }

  /**
   * Save state data to localStorage or in-memory fallback.
   */
  save(data = this.data) {
    this.data = data;
    const jsonString = JSON.stringify(this.data);
    if (!this.useMemoryFallback) {
      try {
        localStorage.setItem(this.key, jsonString);
      } catch (err) {
        this.useMemoryFallback = true;
        this.memoryStore = jsonString;
      }
    } else {
      this.memoryStore = jsonString;
    }
    return true;
  }

  /**
   * Get current high score.
   */
  getHighScore() {
    return (typeof this.data.highScore === 'number' && Number.isFinite(this.data.highScore) && this.data.highScore >= 0) ? this.data.highScore : 0;
  }

  /**
   * Set new high score if score is higher than existing high score.
   * Returns boolean indicating if a new high score was set.
   */
  setHighScore(score) {
    if (typeof score !== 'number' || !Number.isFinite(score) || score < 0 || score <= this.data.highScore) {
      return false;
    }
    this.data.highScore = Math.floor(score);
    this.save();
    return true;
  }

  /**
   * Get stats copy.
   */
  getStats() {
    return { ...this.data.stats };
  }

  /**
   * Update stats by adding delta values.
   * @param {Object} deltas - e.g. { totalGames: 1, totalFlaps: 5, totalPipes: 2, totalTime: 10 }
   */
  updateStats(deltas = {}) {
    if (!deltas || typeof deltas !== 'object') {
      return this.getStats();
    }
    const applyDelta = (currentVal, deltaVal) => {
      if (typeof deltaVal === 'number' && Number.isFinite(deltaVal) && deltaVal > 0) {
        const next = currentVal + deltaVal;
        if (Number.isFinite(next)) {
          return next;
        }
      }
      return currentVal;
    };

    this.data.stats.totalGames = applyDelta(this.data.stats.totalGames, deltas.totalGames);
    this.data.stats.totalFlaps = applyDelta(this.data.stats.totalFlaps, deltas.totalFlaps);
    this.data.stats.totalPipes = applyDelta(this.data.stats.totalPipes, deltas.totalPipes);
    this.data.stats.totalTime = applyDelta(this.data.stats.totalTime, deltas.totalTime);

    this.save();
    return this.getStats();
  }

  /**
   * Get audio preferences.
   */
  getAudioPrefs() {
    return { ...this.data.audio };
  }

  /**
   * Update audio preferences.
   * @param {Object} prefs - { muted: boolean, volume: number }
   */
  setAudioPrefs(prefs = {}) {
    if (typeof prefs.muted === 'boolean') {
      this.data.audio.muted = prefs.muted;
    }
    if (typeof prefs.volume === 'number' && !isNaN(prefs.volume)) {
      this.data.audio.volume = Math.max(0, Math.min(1, prefs.volume));
    }
    this.save();
    return this.getAudioPrefs();
  }

  /**
   * Get skins information.
   */
  getSkins() {
    return {
      selectedSkin: this.data.selectedSkin,
      unlockedSkins: [...this.data.unlockedSkins]
    };
  }

  /**
   * Save skins selection and unlocked status.
   */
  saveSkins(selectedSkin, unlockedArray) {
    if (typeof selectedSkin === 'string') {
      this.data.selectedSkin = selectedSkin;
    }
    if (Array.isArray(unlockedArray)) {
      this.data.unlockedSkins = Array.from(new Set(unlockedArray));
    }
    this.save();
    return this.getSkins();
  }

  /**
   * Reset data to default schema.
   */
  reset() {
    this.data = JSON.parse(JSON.stringify(DEFAULT_DATA));
    this.save();
    return this.data;
  }
}
