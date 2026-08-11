# AGENTS.md

Vanilla JS / HTML5 Canvas game. No package.json, no bundler, no dependencies, no tests or linting — do not run `npm` commands or add one without asking.

## Run

- Open `index.html` directly in a browser, or `npx serve .` (then `http://localhost:3000`).
- Verify changes by eye in the browser; there is no automated verification.

## Architecture

- All game logic lives in `game.js` (423 lines), loaded via plain `<script src="game.js">` in `index.html`. Everything is global scope — no modules, no `import`/`export`, no `class` fields syntax beyond what the file already uses. Keep it one file.
- Game loop is `requestAnimationFrame` with delta time in `update(dt)`; state machine via `state` (`'playing' | 'dead' | 'gameover'`).
- Canvas is 800x600, hardcoded as `W`/`H` in `game.js` (line 5) and duplicated as `width`/`height` in `index.html:23`. Change both if you resize.
- Entities (`Bullet`, `Asteroid`, `Ship`, `Particle`) follow the same pattern: constructor with `x`/`y`, `update(dt)`, `draw()`, `dead` flag for removal via `filter`.

## Conventions

- Code identifiers and comments are English; all HUD/UI strings are Spanish (`NIVEL`, `PUNTAJE`, `GAME OVER`). Match that split.
- `pressed(code)` is edge-triggered (fires once per press, e.g. Space to shoot/restart); `keys[code]` is held state (e.g. arrows). Use `pressed()` for new discrete actions.
- Input handlers use `e.code` (physical keys, e.g. `'ArrowLeft'`, `'Space'`), not `e.key`.
- Wrap positions with `wrap(v, max)` for toroidal edges; spawn new asteroids at least `SAFE_DIST` (130px) from the ship center.
