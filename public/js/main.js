/**
 * main.js - Main Application Entry Point & Module Wiring
 * Instantiates EventBus, GameEngine, StateMachine, InputManager, ResponsiveScaler, UIManager,
 * and attaches global inspection/automation API window.__FLAPPY_GAME__.
 */

import { EventBus } from './engine/EventBus.js';
import { GameEngine } from './engine/GameEngine.js';
import { StateMachine, GameState } from './state/StateMachine.js';
import { InputManager } from './input/InputManager.js';
import { ResponsiveScaler } from './ui/ResponsiveScaler.js';
import { UIManager } from './ui/UIManager.js';

export function initGame() {
  const eventBus = new EventBus();

  const canvas = typeof document !== 'undefined' ? document.getElementById('game-canvas') : null;
  const container = typeof document !== 'undefined' ? document.getElementById('game-container') : null;

  const gameEngine = new GameEngine({ canvas, eventBus });
  const stateMachine = new StateMachine({ eventBus, initialState: GameState.START });
  const scaler = new ResponsiveScaler({ container, canvas });
  const inputManager = new InputManager({ element: container || canvas, stateMachine, gameEngine, eventBus });
  const uiManager = new UIManager({ document, stateMachine, gameEngine, eventBus });

  // Sync State Machine transitions with Game Engine state
  stateMachine.onEnter(GameState.START, () => gameEngine.setState(GameState.START));
  stateMachine.onEnter(GameState.PLAYING, () => gameEngine.setState(GameState.PLAYING));
  stateMachine.onEnter(GameState.PAUSED, () => gameEngine.setState(GameState.PAUSED));
  stateMachine.onEnter(GameState.GAME_OVER, () => gameEngine.setState(GameState.GAME_OVER));

  // Attach event listeners
  scaler.attach();
  inputManager.attach();

  // Start fixed timestep game loop
  gameEngine.start();

  // Attach global window.__FLAPPY_GAME__ inspection & automation API
  if (typeof window !== 'undefined') {
    window.__FLAPPY_GAME__ = {
      getState: () => stateMachine.getState(),
      getScore: () => gameEngine.score,
      getHighScore: () => gameEngine.highScore,
      getBird: () => ({
        x: gameEngine.bird.x,
        y: gameEngine.bird.y,
        vy: gameEngine.bird.vy,
        rotation: gameEngine.bird.rotation,
        isDead: gameEngine.bird.isDead
      }),
      getPipes: () => gameEngine.pipeManager.getPipes().map(p => ({
        x: p.x,
        topHeight: p.topHeight,
        bottomY: p.bottomY,
        scored: p.scored
      })),
      triggerFlap: () => {
        const state = stateMachine.getState();
        if (state === GameState.START) {
          stateMachine.setState(GameState.PLAYING);
          gameEngine.bird.flap();
        } else if (state === GameState.PLAYING) {
          gameEngine.bird.flap();
        } else if (state === GameState.GAME_OVER) {
          stateMachine.setState(GameState.START);
        }
      },
      triggerPause: () => {
        const state = stateMachine.getState();
        if (state === GameState.PLAYING) {
          stateMachine.setState(GameState.PAUSED);
        } else if (state === GameState.PAUSED) {
          stateMachine.setState(GameState.PLAYING);
        }
      },
      restartGame: () => {
        stateMachine.setState(GameState.START);
        gameEngine.setState(GameState.START);
      }
    };
  }

  return {
    eventBus,
    gameEngine,
    stateMachine,
    scaler,
    inputManager,
    uiManager
  };
}

// Auto-run if loaded in browser context
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGame);
  } else {
    initGame();
  }
}
