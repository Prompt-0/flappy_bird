/**
 * AchievementManager.js - Tracks 10 unlockable achievements and triggers slide-in toast notifications.
 */

export const ACHIEVEMENTS = [
  { id: 'FIRST_FLAP', title: 'First Flap', description: 'Flap your wings for the very first time!', icon: '🐣' },
  { id: 'SCORE_10', title: 'Novice Flapper', description: 'Reach a score of 10 in a single game.', icon: '🥉' },
  { id: 'SCORE_25', title: 'Sky Cadet', description: 'Reach a score of 25 in a single game.', icon: '🥈' },
  { id: 'SCORE_50', title: 'Centurion', description: 'Reach a score of 50 in a single game.', icon: '🥇' },
  { id: 'SHIELD_MASTER', title: 'Shield Bearer', description: 'Collect a Shield power-up.', icon: '🛡️' },
  { id: 'STAR_COLLECTOR', title: 'Star Catcher', description: 'Collect a Star multiplier power-up.', icon: '⭐' },
  { id: 'TIME_WARPER', title: 'Time Bender', description: 'Collect a Slow-Motion power-up.', icon: '⏳' },
  { id: 'SKIN_COLLECTOR', title: 'Fashionista', description: 'Unlock all 5 bird skin avatars.', icon: '🎨' },
  { id: 'CHALLENGE_CONQUEROR', title: 'Stage Master', description: 'Clear Level 5 in Challenge Mode.', icon: '🏆' },
  { id: 'FLAPMASTER', title: 'Flap Legend', description: 'Pass 100 total pipes across all games.', icon: '👑' }
];

export class AchievementManager {
  /**
   * @param {import('../engine/EventBus.js').EventBus} eventBus
   * @param {import('../storage/StorageEngine.js').StorageEngine} storageEngine
   */
  constructor(eventBus, storageEngine) {
    this.eventBus = eventBus;
    this.storageEngine = storageEngine;
    this.unlockedIds = new Set();

    this.loadUnlocked();

    if (this.eventBus) {
      this.eventBus.on('BIRD_FLAP', () => this.unlock('FIRST_FLAP'));
      this.eventBus.on('PIPE_PASS', ({ score }) => {
        if (score >= 10) this.unlock('SCORE_10');
        if (score >= 25) this.unlock('SCORE_25');
        if (score >= 50) this.unlock('SCORE_50');
      });
      this.eventBus.on('POWERUP_COLLECTED', ({ type }) => {
        if (type === 'SHIELD') this.unlock('SHIELD_MASTER');
        if (type === 'STAR') this.unlock('STAR_COLLECTOR');
        if (type === 'SLOW_MO') this.unlock('TIME_WARPER');
      });
      this.eventBus.on('CHALLENGE_LEVEL_CLEARED', ({ level }) => {
        if (level >= 5) this.unlock('CHALLENGE_CONQUEROR');
      });
    }
  }

  loadUnlocked() {
    if (!this.storageEngine) return;
    const stats = this.storageEngine.getStats();
    if (stats && Array.isArray(stats.achievements)) {
      stats.achievements.forEach(id => this.unlockedIds.add(id));
    }
  }

  unlock(id) {
    if (this.unlockedIds.has(id)) return;
    const ach = ACHIEVEMENTS.find(a => a.id === id);
    if (!ach) return;

    this.unlockedIds.add(id);

    if (this.storageEngine) {
      const stats = this.storageEngine.getStats();
      const current = Array.isArray(stats.achievements) ? stats.achievements : [];
      if (!current.includes(id)) {
        this.storageEngine.updateStats({ achievements: [...current, id] });
      }
    }

    if (this.eventBus) {
      this.eventBus.emit('ACHIEVEMENT_UNLOCKED', ach);
    }
  }

  isUnlocked(id) {
    return this.unlockedIds.has(id);
  }

  getAchievements() {
    return ACHIEVEMENTS.map(ach => ({
      ...ach,
      unlocked: this.unlockedIds.has(ach.id)
    }));
  }
}
