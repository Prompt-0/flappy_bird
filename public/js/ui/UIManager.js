/**
 * UIManager.js - DOM Overlay & HUD UI Controller
 * Binds state machine transitions to overlay modal visibilities and updates live scores and settings.
 */

import { GameState } from '../state/StateMachine.js';

export class UIManager {
  /**
   * @param {Object} [options={}]
   * @param {Document} [options.document]
   * @param {import('../state/StateMachine.js').StateMachine} [options.stateMachine]
   * @param {import('../engine/GameEngine.js').GameEngine} [options.gameEngine]
   * @param {import('../engine/EventBus.js').EventBus} [options.eventBus]
   */
  constructor(options = {}) {
    this.doc = options.document || (typeof document !== 'undefined' ? document : null);
    this.stateMachine = options.stateMachine || null;
    this.gameEngine = options.gameEngine || null;
    this.eventBus = options.eventBus || null;

    this.soundEnabled = true;
    this.selectedSkin = 'classic';

    this.screens = {};
    this.elements = {};

    if (this.doc) {
      this.init();
    }

    if (this.stateMachine) {
      this.stateMachine.onEnter(GameState.START, () => this.updateVisibility(GameState.START));
      this.stateMachine.onEnter(GameState.PLAYING, () => this.updateVisibility(GameState.PLAYING));
      this.stateMachine.onEnter(GameState.PAUSED, () => this.updateVisibility(GameState.PAUSED));
      this.stateMachine.onEnter(GameState.GAME_OVER, () => this.updateVisibility(GameState.GAME_OVER));
      this.stateMachine.onEnter(GameState.SKIN_SELECT, () => this.updateVisibility(GameState.SKIN_SELECT));
      this.stateMachine.onEnter(GameState.SETTINGS, () => this.updateVisibility(GameState.SETTINGS));
      this.stateMachine.onEnter(GameState.MODE_SELECT, () => this.updateVisibility(GameState.MODE_SELECT));
      this.stateMachine.onEnter(GameState.TROPHY_CABINET, () => this.updateVisibility(GameState.TROPHY_CABINET));
    }

    if (this.eventBus) {
      this.eventBus.on('PIPE_PASS', (data) => {
        const score = (data && typeof data.score === 'number') ? data.score : (this.gameEngine ? this.gameEngine.score : 0);
        this.updateScore(score);
      });

      this.eventBus.on('GAME_OVER', (data) => {
        const score = data ? data.score || data.finalScore || 0 : 0;
        const highScore = this.gameEngine ? this.gameEngine.highScore : score;
        this.updateScore(score);
        this.updateHighScore(highScore);
      });

      this.eventBus.on('ENGINE_STATE_CHANGE', ({ newState }) => {
        this.updateVisibility(newState);
      });

      this.eventBus.on('ACHIEVEMENT_UNLOCKED', ({ title, description, icon }) => {
        this.showToast(title, description, icon);
      });

      this.eventBus.on('POWERUP_COLLECTED', ({ title }) => {
        this.showToast('POWER-UP!', title, '⚡');
      });
    }
  }

  /**
   * Find DOM elements and attach click handlers to buttons.
   */
  init() {
    if (!this.doc) return;

    // Cache overlay screens
    this.screens = {
      [GameState.START]: this._getByTestId('start-screen') || this.doc.getElementById('start-screen'),
      [GameState.PAUSED]: this._getByTestId('pause-screen') || this.doc.getElementById('pause-screen'),
      [GameState.GAME_OVER]: this._getByTestId('game-over-screen') || this.doc.getElementById('game-over-screen'),
      [GameState.SKIN_SELECT]: this._getByTestId('skin-select-screen') || this.doc.getElementById('skin-select-screen'),
      [GameState.SETTINGS]: this._getByTestId('settings-screen') || this.doc.getElementById('settings-screen'),
      [GameState.MODE_SELECT]: this._getByTestId('mode-screen') || this.doc.getElementById('mode-screen'),
      [GameState.TROPHY_CABINET]: this._getByTestId('trophy-screen') || this.doc.getElementById('trophy-screen')
    };

    // Cache dynamic UI elements
    this.elements = {
      hudScore: this._getByTestId('score-display') || this.doc.getElementById('hud-score'),
      finalScore: this._getByTestId('final-score') || this.doc.getElementById('final-score'),
      bestScore: this._getByTestId('high-score-display') || this.doc.getElementById('best-score'),
      soundToggle: this._getByTestId('mute-btn') || this._getByTestId('sound-toggle') || this.doc.getElementById('sound-toggle'),
      startButton: this._getByTestId('start-btn') || this._getByTestId('start-button') || this.doc.getElementById('start-button'),
      skinSelectButton: this._getByTestId('skin-select-btn') || this._getByTestId('skin-select-button') || this.doc.getElementById('skin-select-button'),
      modeButton: this._getByTestId('mode-button') || this.doc.getElementById('mode-button'),
      trophyButton: this._getByTestId('trophy-button') || this.doc.getElementById('trophy-button'),
      settingsButton: this._getByTestId('settings-btn') || this._getByTestId('settings-button') || this.doc.getElementById('settings-button'),
      resumeButton: this._getByTestId('resume-btn') || this._getByTestId('resume-button') || this.doc.getElementById('resume-button'),
      restartButton: this._getByTestId('restart-btn') || this._getByTestId('restart-button') || this.doc.getElementById('restart-button'),
      retryButton: this._getByTestId('game-over-restart-btn') || this._getByTestId('retry-button') || this.doc.getElementById('retry-button'),
      closeSettingsButton: this._getByTestId('settings-back-btn') || this._getByTestId('close-settings-button') || this.doc.getElementById('close-settings-button'),
      closeSkinButton: this._getByTestId('skin-back-btn') || this.doc.getElementById('close-skin-button'),
      closeModeButton: this.doc.getElementById('close-mode-button'),
      closeTrophyButton: this.doc.getElementById('close-trophy-button')
    };

    // Attach button click handlers
    const addClick = (el, handler) => {
      if (!el) return;
      el.addEventListener('click', (e) => {
        if (this.gameEngine && this.gameEngine.audioManager) {
          this.gameEngine.audioManager.playClick();
        }
        handler(e);
      });
    };

    addClick(this.elements.startButton, () => {
      if (this.stateMachine) this.stateMachine.setState(GameState.PLAYING);
      if (this.gameEngine) this.gameEngine.triggerFlap();
    });

    addClick(this.elements.skinSelectButton, () => {
      if (this.stateMachine) this.stateMachine.setState(GameState.SKIN_SELECT);
    });

    addClick(this.elements.modeButton, () => {
      if (this.stateMachine) this.stateMachine.setState(GameState.MODE_SELECT);
    });

    addClick(this.elements.trophyButton, () => {
      if (this.stateMachine) this.stateMachine.setState(GameState.TROPHY_CABINET);
    });

    addClick(this.elements.settingsButton, () => {
      if (this.stateMachine) this.stateMachine.setState(GameState.SETTINGS);
    });

    addClick(this.elements.resumeButton, () => {
      if (this.stateMachine) this.stateMachine.setState(GameState.PLAYING);
    });

    addClick(this.elements.restartButton, () => {
      if (this.stateMachine) this.stateMachine.setState(GameState.START);
      if (this.gameEngine) this.gameEngine.setState(GameState.START);
    });

    addClick(this.elements.retryButton, () => {
      if (this.stateMachine) this.stateMachine.setState(GameState.START);
      if (this.gameEngine) this.gameEngine.setState(GameState.START);
    });

    addClick(this.elements.closeSettingsButton, () => {
      if (this.stateMachine) this.stateMachine.setState(GameState.START);
    });

    addClick(this.elements.closeSkinButton, () => {
      if (this.stateMachine) this.stateMachine.setState(GameState.START);
    });

    addClick(this.elements.closeModeButton, () => {
      if (this.stateMachine) this.stateMachine.setState(GameState.START);
    });

    addClick(this.elements.closeTrophyButton, () => {
      if (this.stateMachine) this.stateMachine.setState(GameState.START);
    });

    addClick(this.elements.soundToggle, () => {
      this.toggleSound();
    });

    // Attach Mode selection handlers
    const classicBtn = this.doc.getElementById('mode-classic-btn');
    const challengeBtn = this.doc.getElementById('mode-challenge-btn');
    const zenBtn = this.doc.getElementById('mode-zen-btn');

    const selectModeUI = (mode, btn) => {
      if (this.gameEngine && this.gameEngine.gameModeManager) {
        this.gameEngine.gameModeManager.setMode(mode);
      }
      [classicBtn, challengeBtn, zenBtn].forEach(b => b && b.classList.remove('selected'));
      if (btn) btn.classList.add('selected');
    };

    addClick(classicBtn, () => selectModeUI('CLASSIC', classicBtn));
    addClick(challengeBtn, () => selectModeUI('CHALLENGE', challengeBtn));
    addClick(zenBtn, () => selectModeUI('ZEN', zenBtn));

    // Attach skin option click handlers
    const skinOptions = this.doc.querySelectorAll('[data-testid^="skin-option"], .skin-option');
    skinOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        const skinId = opt.getAttribute('data-skin-id') || (opt.getAttribute('data-testid') ? opt.getAttribute('data-testid').replace('skin-option-', '') : null);
        this.selectSkin(skinId);
      });
    });
  }

  showToast(title, description, icon = '🏆') {
    if (!this.doc) return;
    const container = this.doc.getElementById('toast-container');
    if (!container) return;

    const toast = this.doc.createElement('div');
    toast.className = 'toast-item';
    toast.innerHTML = `
      <span class="toast-icon">${icon}</span>
      <div class="toast-body">
        <span class="toast-title">${title}</span>
        <span class="toast-desc">${description}</span>
      </div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 3500);
  }

  syncTrophyUI() {
    if (!this.doc) return;
    const container = this.doc.getElementById('trophy-list');
    if (!container) return;
    container.innerHTML = '';

    const achManager = this.gameEngine ? this.gameEngine.achievementManager : null;
    const achievements = achManager ? achManager.getAchievements() : [];

    achievements.forEach(ach => {
      const card = this.doc.createElement('div');
      card.className = `trophy-card ${ach.unlocked ? 'unlocked' : 'locked'}`;
      card.innerHTML = `
        <span class="trophy-status ${ach.unlocked ? 'unlocked' : 'locked'}">${ach.unlocked ? 'UNLOCKED' : 'LOCKED'}</span>
        <div class="trophy-info">
          <span class="trophy-title">${ach.title}</span>
          <span class="trophy-desc">${ach.unlocked ? ach.description : 'Locked Achievement'}</span>
        </div>
      `;
      container.appendChild(card);
    });
  }

  _getByTestId(id) {
    if (!this.doc) return null;
    return this.doc.querySelector(`[data-testid="${id}"]`);
  }

  /**
   * Update screen visibilities according to current game state.
   * @param {string} currentState
   */
  updateVisibility(currentState) {
    if (!this.doc) return;

    Object.keys(this.screens).forEach(stateKey => {
      const screenEl = this.screens[stateKey];
      if (screenEl) {
        if (stateKey === currentState) {
          screenEl.classList.remove('hidden');
          screenEl.classList.add('active');
        } else {
          screenEl.classList.add('hidden');
          screenEl.classList.remove('active');
        }
      }
    });

    // Update score displays when entering Game Over
    if (currentState === GameState.GAME_OVER && this.gameEngine) {
      this.updateScore(this.gameEngine.score);
      this.updateHighScore(this.gameEngine.highScore);
    }

    // Refresh skin status states when entering Skin Select screen
    if (currentState === GameState.SKIN_SELECT) {
      this.syncSkinUI();
    }

    // Refresh trophy cabinet list when entering Trophy Cabinet screen
    if (currentState === GameState.TROPHY_CABINET) {
      this.syncTrophyUI();
    }
  }

  /**
   * Sync visual locked/unlocked/selected state of skin list items.
   */
  syncSkinUI() {
    if (!this.doc) return;
    const skinManager = this.gameEngine ? this.gameEngine.skinManager : null;
    const skins = skinManager ? skinManager.getSkins() : [];
    const skinsMap = new Map(skins.map(s => [s.id, s]));

    const skinOptions = this.doc.querySelectorAll('[data-testid^="skin-option"], .skin-option');
    skinOptions.forEach(opt => {
      let optSkinId = opt.getAttribute('data-skin-id');
      const testId = opt.getAttribute('data-testid');

      // Map alias IDs
      if (optSkinId === 'classic' || (testId && testId.includes('classic'))) optSkinId = 'classic_yellow';
      if (optSkinId === 'crimson' || (testId && testId.includes('crimson'))) optSkinId = 'crimson_phoenix';
      if (optSkinId === 'cyber' || optSkinId === 'neon' || (testId && (testId.includes('cyber') || testId.includes('neon')))) optSkinId = 'neon_cyber';
      if (optSkinId === 'golden' || (testId && testId.includes('golden'))) optSkinId = 'golden_eagle';
      if (optSkinId === 'raven' || optSkinId === 'midnight' || (testId && (testId.includes('raven') || testId.includes('midnight')))) optSkinId = 'midnight_raven';

      const skinData = skinsMap.get(optSkinId);
      const isUnlocked = skinData ? skinData.unlocked : true;
      const isSelected = skinData ? skinData.selected : (optSkinId === 'classic_yellow');

      const statusEl = opt.querySelector('.skin-status');

      if (isUnlocked) {
        opt.classList.remove('locked');
        opt.classList.add('unlocked');
        if (isSelected) {
          opt.classList.add('selected');
          if (statusEl) statusEl.textContent = 'Equipped';
        } else {
          opt.classList.remove('selected');
          if (statusEl) statusEl.textContent = 'Select';
        }
      } else {
        opt.classList.add('locked');
        opt.classList.remove('unlocked', 'selected');
        if (statusEl && skinData) {
          statusEl.textContent = `LOCKED (${skinData.unlockCondition})`;
        }
      }
    });
  }

  /**
   * Update current score display in HUD and Game Over screen.
   * @param {number} score
   */
  updateScore(score) {
    if (this.elements.hudScore) {
      this.elements.hudScore.textContent = String(score);
    }
    if (this.elements.finalScore) {
      this.elements.finalScore.textContent = String(score);
    }
  }

  /**
   * Update high score display on Game Over screen.
   * @param {number} highScore
   */
  updateHighScore(highScore) {
    if (this.elements.bestScore) {
      this.elements.bestScore.textContent = String(highScore);
    }
  }

  /**
   * Toggle sound enabled/disabled state.
   * @returns {boolean} New sound state
   */
  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    if (this.elements.soundToggle) {
      this.elements.soundToggle.textContent = this.soundEnabled ? 'ON' : 'OFF';
      if (this.soundEnabled) {
        this.elements.soundToggle.classList.add('active');
      } else {
        this.elements.soundToggle.classList.remove('active');
      }
    }
    if (this.eventBus) {
      this.eventBus.emit('AUDIO_MUTED', { muted: !this.soundEnabled });
    }
    return this.soundEnabled;
  }

  /**
   * Select bird skin avatar.
   * @param {string} skinId
   */
  selectSkin(skinId) {
    if (!skinId) return;
    let fullSkinId = skinId;
    if (skinId === 'classic') fullSkinId = 'classic_yellow';
    if (skinId === 'crimson') fullSkinId = 'crimson_phoenix';
    if (skinId === 'cyber' || skinId === 'neon') fullSkinId = 'neon_cyber';
    if (skinId === 'golden') fullSkinId = 'golden_eagle';
    if (skinId === 'raven' || skinId === 'midnight') fullSkinId = 'midnight_raven';

    if (this.gameEngine && this.gameEngine.skinManager) {
      const ok = this.gameEngine.skinManager.selectSkin(fullSkinId);
      if (!ok) {
        // Sound feedback for locked skin attempt
        if (this.gameEngine.audioManager) {
          this.gameEngine.audioManager.playHit();
        }
        this.syncSkinUI();
        return;
      }
    }

    this.selectedSkin = fullSkinId;
    this.syncSkinUI();

    if (this.eventBus) {
      this.eventBus.emit('SKIN_CHANGED', { skinId: fullSkinId });
    }
  }

  /**
   * Get map of visibility for all 14 data-testid DOM elements.
   * @returns {Object<string, boolean>}
   */
  getOverlayVisibility() {
    if (!this.doc) return {};
    const testIds = [
      'start-screen', 'start-button', 'skin-select-button', 'settings-button',
      'pause-screen', 'resume-button', 'restart-button',
      'game-over-screen', 'retry-button',
      'skin-select-screen', 'skin-option',
      'settings-screen', 'sound-toggle', 'close-settings-button'
    ];

    const result = {};
    for (const id of testIds) {
      const el = this.doc.querySelector(`[data-testid="${id}"]`);
      if (!el) {
        result[id] = false;
      } else {
        // Element is visible if neither it nor any of its parents has 'hidden' or 'display: none'
        let current = el;
        let isVisible = true;
        while (current && current !== this.doc.body && current !== this.doc) {
          if (current.classList && current.classList.contains('hidden')) {
            isVisible = false;
            break;
          }
          if (current.style && current.style.display === 'none') {
            isVisible = false;
            break;
          }
          current = current.parentElement;
        }
        result[id] = isVisible;
      }
    }
    return result;
  }
}
