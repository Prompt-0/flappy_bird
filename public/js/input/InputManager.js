/**
 * InputManager.js - Unified Input Handler & Dispatcher
 * Unifies touch, mouse, and keyboard input with touch debouncing and state-driven action mapping.
 */

import { GameState } from '../state/StateMachine.js';

export const InputAction = {
  FLAP: 'FLAP',
  PAUSE: 'PAUSE',
  BACK: 'BACK',
  ENTER: 'ENTER'
};

export class InputManager {
  /**
   * @param {Object} [options={}]
   * @param {HTMLElement|Window} [options.element] - Target element to attach listeners to
   * @param {import('../state/StateMachine.js').StateMachine} [options.stateMachine]
   * @param {import('../engine/GameEngine.js').GameEngine} [options.gameEngine]
   * @param {import('../engine/EventBus.js').EventBus} [options.eventBus]
   * @param {number} [options.debounceMs=300] - Touch debounce threshold in milliseconds
   */
  constructor(options = {}) {
    this.element = options.element || (typeof window !== 'undefined' ? window : null);
    this.stateMachine = options.stateMachine || null;
    this.gameEngine = options.gameEngine || null;
    this.eventBus = options.eventBus || null;
    this.debounceMs = options.debounceMs !== undefined ? options.debounceMs : 300;

    this.lastTouchTime = 0;
    this._attached = false;

    this._onKeyDown = this._onKeyDown.bind(this);
    this._onTouchStart = this._onTouchStart.bind(this);
    this._onMouseDown = this._onMouseDown.bind(this);
  }

  /**
   * Check if mouse click should be ignored due to recent touch interaction (touch debounce).
   * @returns {boolean}
   */
  isTouchDebounced() {
    return (Date.now() - this.lastTouchTime) < this.debounceMs;
  }

  /**
   * Dispatch action to state machine and game engine based on current game state.
   * @param {string} action - Value from InputAction enum ('FLAP', 'PAUSE', 'BACK', 'ENTER')
   */
  dispatchAction(action) {
    const currentState = this.stateMachine ? this.stateMachine.getState() : (this.gameEngine ? this.gameEngine.state : GameState.START);

    if (action === InputAction.FLAP || action === InputAction.ENTER) {
      if (currentState === GameState.START) {
        if (this.stateMachine) {
          this.stateMachine.setState(GameState.PLAYING);
        }
        if (this.gameEngine) {
          this.gameEngine.setState(GameState.PLAYING);
          this.gameEngine.bird.flap();
        }
      } else if (currentState === GameState.PLAYING) {
        if (this.gameEngine) {
          this.gameEngine.bird.flap();
        }
      } else if (currentState === GameState.GAME_OVER) {
        if (this.stateMachine) {
          this.stateMachine.setState(GameState.START);
        }
        if (this.gameEngine) {
          this.gameEngine.setState(GameState.START);
        }
      } else if (currentState === GameState.PAUSED) {
        // Unpause on enter/space if desired
        if (this.stateMachine) {
          this.stateMachine.setState(GameState.PLAYING);
        }
        if (this.gameEngine) {
          this.gameEngine.setState(GameState.PLAYING);
        }
      }
    } else if (action === InputAction.PAUSE) {
      if (currentState === GameState.PLAYING) {
        if (this.stateMachine) {
          this.stateMachine.setState(GameState.PAUSED);
        }
        if (this.gameEngine) {
          this.gameEngine.setState(GameState.PAUSED);
        }
      } else if (currentState === GameState.PAUSED) {
        if (this.stateMachine) {
          this.stateMachine.setState(GameState.PLAYING);
        }
        if (this.gameEngine) {
          this.gameEngine.setState(GameState.PLAYING);
        }
      }
    } else if (action === InputAction.BACK) {
      if (currentState === GameState.PLAYING) {
        if (this.stateMachine) {
          this.stateMachine.setState(GameState.PAUSED);
        }
        if (this.gameEngine) {
          this.gameEngine.setState(GameState.PAUSED);
        }
      } else if (currentState === GameState.PAUSED) {
        if (this.stateMachine) {
          this.stateMachine.setState(GameState.PLAYING);
        }
        if (this.gameEngine) {
          this.gameEngine.setState(GameState.PLAYING);
        }
      } else if (currentState === GameState.SKIN_SELECT || currentState === GameState.SETTINGS) {
        if (this.stateMachine) {
          this.stateMachine.setState(GameState.START);
        }
        if (this.gameEngine) {
          this.gameEngine.setState(GameState.START);
        }
      }
    }

    if (this.eventBus) {
      this.eventBus.emit('INPUT_ACTION', { action, state: currentState });
    }
  }

  /**
   * Keyboard listener
   * @param {KeyboardEvent} event
   */
  _onKeyDown(event) {
    if (event.repeat) return;

    const code = event.code;
    const key = event.key;

    if (code === 'Space' || key === ' ') {
      event.preventDefault();
      this.dispatchAction(InputAction.FLAP);
    } else if (code === 'Enter' || key === 'Enter') {
      event.preventDefault();
      this.dispatchAction(InputAction.ENTER);
    } else if (code === 'KeyP' || key === 'p' || key === 'P') {
      event.preventDefault();
      this.dispatchAction(InputAction.PAUSE);
    } else if (code === 'Escape' || key === 'Escape') {
      event.preventDefault();
      this.dispatchAction(InputAction.BACK);
    }
  }

  /**
   * Touch listener
   * @param {TouchEvent|PointerEvent} event
   */
  _onTouchStart(event) {
    this.lastTouchTime = Date.now();
    
    // Ignore touch interactions if target is an interactive UI button
    const target = event.target;
    if (target && (target.tagName === 'BUTTON' || target.closest('button'))) {
      return;
    }

    if (event.cancelable && event.type === 'touchstart') {
      event.preventDefault();
    }
    this.dispatchAction(InputAction.FLAP);
  }

  /**
   * Mouse listener
   * @param {MouseEvent} event
   */
  _onMouseDown(event) {
    if (this.isTouchDebounced()) {
      return; // Suppress duplicate click event following touch
    }

    const target = event.target;
    if (target && (target.tagName === 'BUTTON' || target.closest('button'))) {
      return;
    }

    this.dispatchAction(InputAction.FLAP);
  }

  /**
   * Attach input event listeners.
   */
  attach() {
    if (this._attached || !this.element) return;

    if (typeof window !== 'undefined') {
      window.addEventListener('keydown', this._onKeyDown);
    }

    if (this.element.addEventListener) {
      this.element.addEventListener('touchstart', this._onTouchStart, { passive: false });
      this.element.addEventListener('mousedown', this._onMouseDown);
    }

    this._attached = true;
  }

  /**
   * Detach input event listeners.
   */
  detach() {
    if (!this._attached || !this.element) return;

    if (typeof window !== 'undefined') {
      window.removeEventListener('keydown', this._onKeyDown);
    }

    if (this.element.removeEventListener) {
      this.element.removeEventListener('touchstart', this._onTouchStart);
      this.element.removeEventListener('mousedown', this._onMouseDown);
    }

    this._attached = false;
  }
}
