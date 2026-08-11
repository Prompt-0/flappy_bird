/**
 * SkinManager.js
 * Manages procedural bird skins, palette definitions, unlock condition evaluations,
 * and persistence integration via StorageEngine.
 */

export const SKIN_DEFINITIONS = [
  {
    id: 'classic_yellow',
    name: 'Classic Yellow',
    description: 'The iconic yellow flapper.',
    unlockCondition: 'Unlocked by default',
    isUnlocked: (highScore, stats) => true,
    palette: {
      body: '#F7D02C',
      wing: '#E2AB18',
      belly: '#FFF59D',
      beak: '#FF6F00',
      eye: '#000000',
      outline: '#553C00'
    }
  },
  {
    id: 'crimson_phoenix',
    name: 'Crimson Phoenix',
    description: 'Rises from the embers of defeat.',
    unlockCondition: 'High Score >= 20',
    isUnlocked: (highScore, stats) => (highScore >= 20),
    palette: {
      body: '#E53935',
      wing: '#D32F2F',
      belly: '#FFCDD2',
      beak: '#FFB300',
      eye: '#FFFFFF',
      outline: '#4A0000'
    }
  },
  {
    id: 'neon_cyber',
    name: 'Neon Cyber',
    description: 'Powered by retro synthwave energy.',
    unlockCondition: 'High Score >= 50',
    isUnlocked: (highScore, stats) => (highScore >= 50),
    palette: {
      body: '#00E5FF',
      wing: '#D500F9',
      belly: '#84FFFF',
      beak: '#FF007F',
      eye: '#00FFCC',
      outline: '#003366'
    }
  },
  {
    id: 'golden_eagle',
    name: 'Golden Eagle',
    description: 'Forged in pure gold for true masters.',
    unlockCondition: 'High Score >= 100',
    isUnlocked: (highScore, stats) => (highScore >= 100),
    palette: {
      body: '#FFD700',
      wing: '#DAA520',
      belly: '#FFF8DC',
      beak: '#CCAC00',
      eye: '#2F4F4F',
      outline: '#8B6508'
    }
  },
  {
    id: 'midnight_raven',
    name: 'Midnight Raven',
    description: 'A creature of stealth born in the dark.',
    unlockCondition: 'Total Games >= 50',
    isUnlocked: (highScore, stats) => Boolean(stats && stats.totalGames >= 50),
    palette: {
      body: '#263238',
      wing: '#1A237E',
      belly: '#37474F',
      beak: '#455A64',
      eye: '#FF1744',
      outline: '#102A43'
    }
  }
];

export class SkinManager {
  constructor(storageEngine = null) {
    this.storageEngine = storageEngine;
    this.unlockedSkins = new Set(['classic_yellow']);
    this.selectedSkin = 'classic_yellow';

    if (this.storageEngine) {
      this.loadFromStorage();
    }
  }

  loadFromStorage() {
    if (!this.storageEngine) return;
    const skinInfo = this.storageEngine.getSkins();
    if (skinInfo.unlockedSkins && Array.isArray(skinInfo.unlockedSkins)) {
      skinInfo.unlockedSkins.forEach(id => this.unlockedSkins.add(id));
    }
    if (skinInfo.selectedSkin && this.isUnlocked(skinInfo.selectedSkin)) {
      this.selectedSkin = skinInfo.selectedSkin;
    }
  }

  isUnlocked(skinId) {
    return this.unlockedSkins.has(skinId);
  }

  getSkins() {
    return SKIN_DEFINITIONS.map(skin => ({
      ...skin,
      unlocked: this.isUnlocked(skin.id),
      selected: skin.id === this.selectedSkin
    }));
  }

  getSelectedSkin() {
    return this.selectedSkin;
  }

  getSkinDetails(skinId = this.selectedSkin) {
    const skin = SKIN_DEFINITIONS.find(s => s.id === skinId);
    if (skin) {
      return {
        ...skin,
        unlocked: this.isUnlocked(skin.id),
        selected: skin.id === this.selectedSkin
      };
    }
    const fallback = SKIN_DEFINITIONS[0];
    return {
      ...fallback,
      unlocked: true,
      selected: true
    };
  }

  selectSkin(skinId) {
    if (!this.isUnlocked(skinId)) {
      return false;
    }
    this.selectedSkin = skinId;
    if (this.storageEngine) {
      this.storageEngine.saveSkins(this.selectedSkin, Array.from(this.unlockedSkins));
    }
    return true;
  }

  checkUnlocks(highScore = 0, stats = {}) {
    const newlyUnlocked = [];

    SKIN_DEFINITIONS.forEach(skin => {
      if (!this.unlockedSkins.has(skin.id)) {
        if (skin.isUnlocked(highScore, stats)) {
          this.unlockedSkins.add(skin.id);
          newlyUnlocked.push(skin.id);
        }
      }
    });

    if (newlyUnlocked.length > 0 && this.storageEngine) {
      this.storageEngine.saveSkins(this.selectedSkin, Array.from(this.unlockedSkins));
    }

    return newlyUnlocked;
  }
}
