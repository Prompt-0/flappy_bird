/**
 * StateMachine.js - 6-State Game Transition Coordinator
 * Manages game lifecycle states: START, PLAYING, PAUSED, GAME_OVER, SKIN_SELECT, SETTINGS.
 */

export const GameState = {
  START: 'START',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  GAME_OVER: 'GAME_OVER',
  SKIN_SELECT: 'SKIN_SELECT',
  SETTINGS: 'SETTINGS'
};

const VALID_TRANSITIONS = {
  [GameState.START]: [GameState.PLAYING, GameState.SKIN_SELECT, GameState.SETTINGS],
  [GameState.PLAYING]: [GameState.PAUSED, GameState.GAME_OVER],
  [GameState.PAUSED]: [GameState.PLAYING, GameState.START, GameState.SETTINGS],
  [GameState.GAME_OVER]: [GameState.START, GameState.PLAYING],
  [GameState.SKIN_SELECT]: [GameState.START],
  [GameState.SETTINGS]: [GameState.START, GameState.PAUSED]
};

export class StateMachine {
  /**
   * @param {Object} [options={}]
   * @param {import('../engine/EventBus.js').EventBus} [options.eventBus]
   * @param {string} [options.initialState=GameState.START]
   */
  constructor(options = {}) {
    this.eventBus = options.eventBus || null;
    this.state = options.initialState || GameState.START;
    this.enterHooks = new Map();
    this.exitHooks = new Map();

    this._isEmitting = false;

    if (this.eventBus) {
      this.eventBus.on('ENGINE_STATE_CHANGE', ({ oldState, newState }) => {
        if (!this._isEmitting && this.state !== newState) {
          this._applyState(newState, oldState);
        }
      });
    }
  }

  /**
   * Get current game state.
   * @returns {string}
   */
  getState() {
    return this.state;
  }

  /**
   * Check if transition to target state is allowed from current state.
   * @param {string} targetState
   * @returns {boolean}
   */
  canTransition(targetState) {
    if (!Object.values(GameState).includes(targetState)) {
      return false;
    }
    if (this.state === targetState) {
      return false;
    }
    const allowed = VALID_TRANSITIONS[this.state];
    return allowed ? allowed.includes(targetState) : false;
  }

  /**
   * Register lifecycle hook called upon entering state.
   * @param {string} state
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  onEnter(state, callback) {
    if (typeof callback !== 'function') return () => {};
    if (!this.enterHooks.has(state)) {
      this.enterHooks.set(state, new Set());
    }
    this.enterHooks.get(state).add(callback);
    return () => {
      const set = this.enterHooks.get(state);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.enterHooks.delete(state);
      }
    };
  }

  /**
   * Register lifecycle hook called upon exiting state.
   * @param {string} state
   * @param {Function} callback
   * @returns {Function} Unsubscribe function
   */
  onExit(state, callback) {
    if (typeof callback !== 'function') return () => {};
    if (!this.exitHooks.has(state)) {
      this.exitHooks.set(state, new Set());
    }
    this.exitHooks.get(state).add(callback);
    return () => {
      const set = this.exitHooks.get(state);
      if (set) {
        set.delete(callback);
        if (set.size === 0) this.exitHooks.delete(state);
      }
    };
  }

  /**
   * Internal helper to trigger lifecycle hooks and set internal state.
   * @private
   */
  _applyState(newState, oldState, payload = {}) {
    // Call exit hooks for oldState
    if (this.exitHooks.has(oldState)) {
      const callbacks = Array.from(this.exitHooks.get(oldState));
      for (const cb of callbacks) {
        try {
          cb(oldState, newState, payload);
        } catch (err) {
          console.error(`[StateMachine] Error in exit hook for ${oldState}:`, err);
        }
      }
    }

    this.state = newState;

    // Call enter hooks for newState
    if (this.enterHooks.has(newState)) {
      const callbacks = Array.from(this.enterHooks.get(newState));
      for (const cb of callbacks) {
        try {
          cb(newState, oldState, payload);
        } catch (err) {
          console.error(`[StateMachine] Error in enter hook for ${newState}:`, err);
        }
      }
    }
  }

  /**
   * Transition to a new state if valid.
   * @param {string} newState
   * @param {Object} [payload={}]
   * @returns {boolean} True if transition succeeded, false otherwise.
   */
  setState(newState, payload = {}) {
    if (!this.canTransition(newState)) {
      return false;
    }

    const oldState = this.state;
    this._applyState(newState, oldState, payload);

    if (this.eventBus) {
      this._isEmitting = true;
      try {
        this.eventBus.emit('ENGINE_STATE_CHANGE', { oldState, newState, ...payload });
      } finally {
        this._isEmitting = false;
      }
    }

    return true;
  }
}
