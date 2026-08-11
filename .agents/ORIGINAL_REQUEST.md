# Original User Request

## Initial Request — 2026-08-10T15:57:02Z

Build a feature-rich, bug-free, beautifully styled, and optimized web browser-based Flappy Bird game featuring custom physics, multi-layer parallax graphics, particle effects, skin customization, local high scores, procedural sound FX, dynamic day/night cycles, and responsive touch/keyboard controls.

Working directory: /root/Projects/flappy_bird
Integrity mode: development

## Requirements

### R1. Core Gameplay Engine & Physics
Build a responsive, bug-free Flappy Bird game engine using HTML5 Canvas & modern JavaScript. Mechanics must include accurate gravity physics, smooth bird velocity/tilt math, pipe generation with varied gap heights, precise collision detection, and score tracking.

### R2. Visuals & Polish (Deluxe Package)
Implement high-end visual features including multi-layer parallax scrolling backgrounds, dynamic day/night weather cycles, custom particle engines for flap trails and collision bursts, retro-modern artwork, dynamic lighting, and silky smooth 60 FPS performance.

### R3. Audio, Persistence & Customization
Implement Web Audio API sound effects for jump, point scoring, hit, and button clicks with a UI sound toggle. Include persistent high score tracking via `localStorage`, an achievement system, and a skin selection menu to unlock and switch bird avatars.

### R4. Responsive UI & Port Allocation
Design a mobile-friendly, touch and keyboard responsive UI with start screen, pause menu, skin selector, game over modal, and settings. Serve the web application locally on an allowed port (between 3000-3010) using host `0.0.0.0`.

## Acceptance Criteria

### Core Mechanics & Physics
- [ ] Bird jumps responsively on Space key, mouse click, or touch tap with natural acceleration and rotational tilt.
- [ ] Pipes spawn at consistent, playable intervals with randomized gap positions.
- [ ] Precise collision detection triggers game over state immediately upon collision with pipe, ground, or ceiling.
- [ ] Score increases by 1 each time the bird passes through a pipe pair.

### Visual & Audio Quality
- [ ] Multi-layer parallax background scrolls continuously and transitions smoothly between day and night themes.
- [ ] Particle effect system emits trail particles during flaps and impact particles upon collision.
- [ ] Audio system plays crisp sound effects for flap, score, collision, and menu interaction, with mute toggle state saved.

### UI, Customization & Verification
- [ ] Local storage saves personal high score, unlocked bird skins, and audio preferences.
- [ ] Skin selection screen allows switching bird avatars before starting a game.
- [ ] Responsive canvas scaling maintains crisp visuals on desktop and mobile viewports.
- [ ] The web app launches cleanly on an allowed port (3000-3010) and responds to HTTP requests without errors.
