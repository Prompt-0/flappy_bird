/**
 * GameModeManager.js - Controls game modes (Classic Endless, Challenge Levels, Zen Practice)
 */

export const GameMode = {
  CLASSIC: 'CLASSIC',
  CHALLENGE: 'CHALLENGE',
  ZEN: 'ZEN'
};

export class GameModeManager {
  /**
   * @param {import('../engine/EventBus.js').EventBus} eventBus
   */
  constructor(eventBus) {
    this.eventBus = eventBus;
    this.currentMode = GameMode.CLASSIC;
    this.currentLevel = 1;
    this.totalLevels = 10;

    this.levelConfigs = [
      { level: 1, targetScore: 5, gapHeight: 145, speed: 140, theme: 'CLASSIC' },
      { level: 2, targetScore: 10, gapHeight: 140, speed: 150, theme: 'AUTUMN' },
      { level: 3, targetScore: 15, gapHeight: 135, speed: 160, theme: 'SNOW' },
      { level: 4, targetScore: 20, gapHeight: 130, speed: 170, theme: 'CYBER' },
      { level: 5, targetScore: 25, gapHeight: 125, speed: 175, theme: 'CLASSIC' },
      { level: 6, targetScore: 30, gapHeight: 120, speed: 180, theme: 'AUTUMN' },
      { level: 7, targetScore: 35, gapHeight: 118, speed: 185, theme: 'SNOW' },
      { level: 8, targetScore: 40, gapHeight: 115, speed: 190, theme: 'CYBER' },
      { level: 9, targetScore: 45, gapHeight: 112, speed: 195, theme: 'CLASSIC' },
      { level: 10, targetScore: 50, gapHeight: 110, speed: 200, theme: 'CYBER' }
    ];
  }

  setMode(mode) {
    if (Object.values(GameMode).includes(mode)) {
      this.currentMode = mode;
      if (this.eventBus) this.eventBus.emit('MODE_CHANGED', { mode });
    }
  }

  setLevel(levelNum) {
    this.currentLevel = Math.max(1, Math.min(this.totalLevels, levelNum));
  }

  getLevelConfig() {
    if (this.currentMode === GameMode.CHALLENGE) {
      return this.levelConfigs[this.currentLevel - 1] || this.levelConfigs[0];
    }
    return {
      gapHeight: 135,
      speed: 160,
      theme: 'CLASSIC'
    };
  }

  checkLevelCompletion(score) {
    if (this.currentMode !== GameMode.CHALLENGE) return false;
    const config = this.getLevelConfig();
    if (score >= config.targetScore) {
      if (this.currentLevel < this.totalLevels) {
        this.currentLevel++;
        if (this.eventBus) this.eventBus.emit('CHALLENGE_LEVEL_CLEARED', { level: this.currentLevel - 1, nextLevel: this.currentLevel });
        return true;
      } else {
        if (this.eventBus) this.eventBus.emit('CHALLENGE_ALL_CLEARED');
        return true;
      }
    }
    return false;
  }
}
