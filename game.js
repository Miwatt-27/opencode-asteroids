'use strict';

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const W = 800;
const H = 600;

// ── Input ─────────────────────────────────────────────────────────────────────
const keys = {};
const justPressed = {};

window.addEventListener('keydown', e => {
  justPressed[e.code] = !keys[e.code];
  keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code))
    e.preventDefault();
});
window.addEventListener('keyup', e => { keys[e.code] = false; });

function pressed(code) {
  const val = justPressed[code];
  justPressed[code] = false;
  return val;
}

// ── Utils ─────────────────────────────────────────────────────────────────────
const wrap  = (v, max) => ((v % max) + max) % max;
const dist  = (a, b)   => Math.hypot(a.x - b.x, a.y - b.y);
const rand  = (min, max) => min + Math.random() * (max - min);
const randInt = (min, max) => Math.floor(rand(min, max + 1));

// ── Bullet ────────────────────────────────────────────────────────────────────
class Bullet {
  constructor(x, y, angle) {
    this.x = x;
    this.y = y;
    const SPEED = 520;
    this.vx = Math.cos(angle) * SPEED;
    this.vy = Math.sin(angle) * SPEED;
    this.ttl  = 1.1;
    this.radius = 2;
    this.dead = false;
  }

  update(dt) {
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Skins ─────────────────────────────────────────────────────────────────────
const SKINS = [
  { name: 'CLÁSICA', color: '#fff', thrustColor: 'rgba(255, 130, 0, 0.85)',
    verts: [[20, 0], [-12, -9], [-7, 0], [-12, 9]], thrustBase: -8 },
  { name: 'CAZA', color: '#0ff', thrustColor: 'rgba(255, 0, 255, 0.85)',
    verts: [[22, 0], [-4, -6], [-10, -2], [-13, 0], [-10, 2], [-4, 6]], thrustBase: -10 },
  { name: 'CARGUERO', color: '#6f6', thrustColor: 'rgba(170, 255, 80, 0.85)',
    verts: [[18, 0], [2, -13], [-14, -10], [-10, 0], [-14, 10], [2, 13]], thrustBase: -11 },
  { name: 'CUERVO', color: '#f55', thrustColor: 'rgba(200, 100, 255, 0.85)',
    verts: [[20, 0], [2, -12], [-16, -6], [-10, 0], [-16, 6], [2, 12]], thrustBase: -10 },
];

// ── Asteroid ──────────────────────────────────────────────────────────────────
const RADII  = [0, 16, 30, 50];   // por tamaño 1, 2, 3
const SPEEDS = [0, 85, 55, 32];   // velocidad base por tamaño
const POINTS = [0, 100, 50, 20];  // puntos por tamaño

class Asteroid {
  constructor(x, y, size = 3) {
    this.x    = x;
    this.y    = y;
    this.size = size;
    this.radius = RADII[size];
    this.dead = false;

    const angle = rand(0, Math.PI * 2);
    const speed = SPEEDS[size] + rand(-15, 15);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.rotSpeed = rand(-1.2, 1.2);
    this.rot = rand(0, Math.PI * 2);

    // Polígono irregular
    const n = randInt(8, 13);
    this.verts = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = this.radius * rand(0.6, 1.0);
      this.verts.push([Math.cos(a) * r, Math.sin(a) * r]);
    }
  }

  update(dt) {
    this.x   = wrap(this.x + this.vx * dt, W);
    this.y   = wrap(this.y + this.vy * dt, H);
    this.rot += this.rotSpeed * dt;
  }

  split() {
    if (this.size <= 1) return [];
    return [
      new Asteroid(this.x, this.y, this.size - 1),
      new Asteroid(this.x, this.y, this.size - 1),
    ];
  }

  draw() {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rot);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(this.verts[0][0], this.verts[0][1]);
    for (let i = 1; i < this.verts.length; i++)
      ctx.lineTo(this.verts[i][0], this.verts[i][1]);
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }
}

// ── Ship ──────────────────────────────────────────────────────────────────────
class Ship {
  constructor() { this.reset(); }

  reset() {
    this.x      = W / 2;
    this.y      = H / 2;
    this.angle  = -Math.PI / 2;
    this.vx     = 0;
    this.vy     = 0;
    this.radius = 12;
    this.thrusting     = false;
    this.invincible    = 3;
    this.shootCooldown = 0;
    this.speedBoost    = 0;
    this.dead          = false;
  }

  update(dt) {
    if (this.dead) return;
    if (this.invincible    > 0) this.invincible    -= dt;
    if (this.shootCooldown > 0) this.shootCooldown -= dt;
    if (this.speedBoost    > 0) this.speedBoost    -= dt;

    const ROT    = 3.5;   // rad/s
    const THRUST = 260 * (this.speedBoost > 0 ? 2 : 1);  // px/s²
    const DRAG   = 0.987;

    if (keys['ArrowLeft'])  this.angle -= ROT * dt;
    if (keys['ArrowRight']) this.angle += ROT * dt;

    this.thrusting = !!keys['ArrowUp'];
    if (this.thrusting) {
      this.vx += Math.cos(this.angle) * THRUST * dt;
      this.vy += Math.sin(this.angle) * THRUST * dt;
    }

    this.vx *= DRAG;
    this.vy *= DRAG;
    this.x = wrap(this.x + this.vx * dt, W);
    this.y = wrap(this.y + this.vy * dt, H);
  }

  tryShoot() {
    if (this.shootCooldown > 0 || this.dead) return [];
    this.shootCooldown = 0.2;
    const NOSE = 21;
    const ox = this.x + Math.cos(this.angle) * NOSE;
    const oy = this.y + Math.sin(this.angle) * NOSE;
    return [new Bullet(ox, oy, this.angle)];
  }

  draw() {
    if (this.dead) return;
    // Parpadeo durante invencibilidad de reaparición
    if (this.invincible > 0 && Math.floor(this.invincible * 8) % 2 === 0) return;

    const skin = SKINS[skinIndex];

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    ctx.strokeStyle = skin.color;
    ctx.lineWidth   = 1.5;
    ctx.lineJoin    = 'round';

    // Silueta del skin activo
    ctx.beginPath();
    ctx.moveTo(skin.verts[0][0], skin.verts[0][1]);
    for (let i = 1; i < skin.verts.length; i++)
      ctx.lineTo(skin.verts[i][0], skin.verts[i][1]);
    ctx.closePath();
    ctx.stroke();

    // Llama del propulsor
    if (this.thrusting && Math.random() > 0.35) {
      ctx.beginPath();
      ctx.moveTo(skin.thrustBase, -4);
      ctx.lineTo(skin.thrustBase - rand(6, 14), 0);
      ctx.lineTo(skin.thrustBase,  4);
      ctx.strokeStyle = skin.thrustColor;
      ctx.stroke();
    }

    ctx.restore();
  }
}

// ── Partículas (explosión) ────────────────────────────────────────────────────
class Particle {
  constructor(x, y) {
    this.x  = x;
    this.y  = y;
    const angle = rand(0, Math.PI * 2);
    const speed = rand(30, 130);
    this.vx   = Math.cos(angle) * speed;
    this.vy   = Math.sin(angle) * speed;
    this.life = rand(0.4, 1.1);
    this.ttl  = this.life;
    this.dead = false;
  }

  update(dt) {
    this.x  += this.vx * dt;
    this.y  += this.vy * dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    const alpha = this.ttl / this.life;
    ctx.strokeStyle = `rgba(255,255,255,${alpha.toFixed(2)})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.05, this.y - this.vy * 0.05);
    ctx.stroke();
  }
}

// ── Power-up (Velocidad) ──────────────────────────────────────────────────────
class PowerUp {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 10;
    this.ttl  = 10;
    this.pulse = 0;
    this.dead  = false;
  }

  update(dt) {
    this.pulse += dt;
    this.ttl -= dt;
    if (this.ttl <= 0) this.dead = true;
  }

  draw() {
    if (this.ttl < 3 && Math.floor(this.ttl * 6) % 2 === 0) return;

    const r = this.radius + Math.sin(this.pulse * 4) * 1.5;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.stroke();

    // Icono: doble chevron ">>"
    ctx.strokeStyle = '#0ff';
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';
    ctx.beginPath();
    ctx.moveTo(-4, -5);
    ctx.lineTo( 2,  0);
    ctx.lineTo(-4,  5);
    ctx.moveTo( 2, -5);
    ctx.lineTo( 8,  0);
    ctx.lineTo( 2,  5);
    ctx.stroke();
    ctx.restore();
  }
}

// ── Estrella fugaz ────────────────────────────────────────────────────────────
class ShootingStar {
  constructor() {
    // Elegimos un borde de la pantalla al azar: 0=arriba, 1=derecha, 2=abajo, 3=izquierda
    const edge = randInt(0, 3);

    // Según el borde, fijamos el punto de entrada (x, y) justo sobre ese borde
    if (edge === 0) { this.x = rand(0, W); this.y = 0; }          // entra por arriba
    else if (edge === 1) { this.x = W; this.y = rand(0, H); }      // entra por la derecha
    else if (edge === 2) { this.x = rand(0, W); this.y = H; }      // entra por abajo
    else { this.x = 0; this.y = rand(0, H); }                      // entra por la izquierda

    // Ángulo base: apuntamos hacia el centro de la pantalla (atan2 al centro),
    // y le sumamos una desviación aleatoria de ±30° (0.52 rad) para que la
    // trayectoria no sea perfecta y siempre haya una ruta para esquivarla
    const angle = Math.atan2(H / 2 - this.y, W / 2 - this.x) + rand(-0.52, 0.52);

    // Velocidad constante de 320 px/s: mucho más rápida que los asteroides
    // (que van de ~32 a ~100 px/s), pero con aviso previo sigue siendo esquivable
    this.vx = Math.cos(angle) * 320;
    this.vy = Math.sin(angle) * 320;

    // warning: tiempo de aviso (0.8s) en el que queda parpadeando en el borde
    // sin moverse, para que el jugador la vea llegar y tenga tiempo de reaccionar
    this.warning = 0.8;

    // ttl: tiempo de vida activa (2.5s). Al agotarse se desvanece y muere;
    // esto limita cuánto tiempo está en pantalla y la hace esquivable
    this.ttl = 2.5;

    // Radio pequeño (8px): es un objetivo fino que solo cruza la pantalla
    this.radius = 8;
    this.dead = false;
  }

  update(dt) {
    if (this.warning > 0) {
      // Fase de aviso: solo descontamos el temporizador; la estrella
      // permanece quieta en el borde parpadeando (ver draw)
      this.warning -= dt;
    } else {
      // Fase activa: avanza en línea recta (a diferencia de los asteroides
      // NO usamos wrap()), manteniéndose dentro de los límites de la pantalla
      this.x += this.vx * dt;
      this.y += this.vy * dt;

      // Descontamos la vida restante de la estrella
      this.ttl -= dt;

      // Muere si agotó su tiempo de vida (se desvaneció) o si ya salió por
      // completo de la pantalla (margen de 30px para que desaparezca fuera de vista)
      if (this.ttl <= 0 ||
          this.x < -30 || this.x > W + 30 ||
          this.y < -30 || this.y > H + 30) this.dead = true;
    }
  }

  draw() {
    if (this.warning > 0) {
      // Fase de aviso: dibujamos una "X" amarilla parpadeante en el punto de
      // entrada (parpadea 8 veces por segundo, igual que la nave invencible)
      if (Math.floor(this.warning * 8) % 2 === 0) return;
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.strokeStyle = '#ff5';
      ctx.lineWidth   = 2;
      ctx.lineJoin    = 'round';
      ctx.beginPath();
      ctx.moveTo(-6, -6); ctx.lineTo(6, 6);
      ctx.moveTo( 6, -6); ctx.lineTo(-6, 6);
      ctx.stroke();
      ctx.restore();
      return;
    }

    // Fase activa: calculamos la opacidad (alpha). Durante los primeros 2s es 1
    // y en el último 0.5s de vida va bajando de 1 a 0 para desvanecerse
    const alpha = this.ttl > 0.5 ? 1 : Math.max(0, this.ttl / 0.5);

    // Estela: una línea en dirección opuesta a la velocidad, como los Particle,
    // para dar sensación de que se mueve muy rápido
    ctx.strokeStyle = `rgba(255, 235, 150, ${(alpha * 0.7).toFixed(2)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(this.x, this.y);
    ctx.lineTo(this.x - this.vx * 0.06, this.y - this.vy * 0.06);
    ctx.stroke();

    // Núcleo brillante de la estrella, con la misma opacidad que la estela
    ctx.fillStyle = `rgba(255, 255, 220, ${alpha.toFixed(2)})`;
    ctx.beginPath();
    ctx.arc(this.x, this.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// ── Estado del juego ──────────────────────────────────────────────────────────
let ship, bullets, asteroids, particles, powerups;
let shootingStars, starTimer; // estrellas fugaces en curso y timer hasta la próxima
let score, lives, level;
let skinIndex = 0;   // skin activo
let state;      // 'playing' | 'dead' | 'gameover'
let deadTimer;

function spawnAsteroids(count) {
  const SAFE_DIST = 130;
  for (let i = 0; i < count; i++) {
    let x, y;
    do {
      x = rand(0, W);
      y = rand(0, H);
    } while (Math.hypot(x - W / 2, y - H / 2) < SAFE_DIST);
    asteroids.push(new Asteroid(x, y, 3));
  }
}

function initGame() {
  ship          = new Ship();
  bullets   = [];
  asteroids = [];
  particles = [];
  powerups  = [];
  shootingStars = [];         // al empezar no hay estrellas fugaces en pantalla
  starTimer     = rand(5, 9); // la primera estrella aparecerá entre 5 y 9 segundos
  score  = 0;
  lives  = 3;
  level  = 1;
  state  = 'playing';
  spawnAsteroids(4);
}

function nextLevel() {
  level++;
  bullets   = [];
  particles = [];
  powerups  = [];
  shootingStars = []; // las estrellas fugaces en curso se descartan al cambiar de nivel
  ship.reset();
  spawnAsteroids(3 + level);
}

function explode(x, y, count = 8) {
  for (let i = 0; i < count; i++) particles.push(new Particle(x, y));
}

function killShip() {
  explode(ship.x, ship.y, 14);
  ship.dead = true;
  lives--;
  if (lives <= 0) {
    state = 'gameover';
  } else {
    state     = 'dead';
    deadTimer = 2;
  }
}

// ── Update ────────────────────────────────────────────────────────────────────
function update(dt) {
  if (pressed('KeyS')) skinIndex = (skinIndex + 1) % SKINS.length;

  if (state === 'gameover') {
    if (pressed('Space')) initGame();
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    return;
  }

  if (state === 'dead') {
    deadTimer -= dt;
    particles.forEach(p => p.update(dt));
    particles = particles.filter(p => !p.dead);
    asteroids.forEach(a => a.update(dt));
    shootingStars.forEach(s => s.update(dt)); // las estrellas siguen cruzando la pantalla mientras la nave muere
    shootingStars = shootingStars.filter(s => !s.dead); // quitamos las que se desvanecieron o salieron
    if (deadTimer <= 0) { state = 'playing'; ship.reset(); }
    return;
  }

  // Disparar
  if (pressed('Space')) {
    bullets.push(...ship.tryShoot());
  }

  // Aparición de estrellas fugaces (solo en 'playing'): descontamos el timer
  // y cuando llega a 0 nace una estrella desde un borde aleatorio
  starTimer -= dt;
  if (starTimer <= 0) {
    shootingStars.push(new ShootingStar());
    starTimer = rand(5, 9); // programamos la siguiente entre 5 y 9 segundos
  }

  ship.update(dt);
  bullets.forEach(b => b.update(dt));
  asteroids.forEach(a => a.update(dt));
  shootingStars.forEach(s => s.update(dt));
  particles.forEach(p => p.update(dt));
  powerups.forEach(pu => pu.update(dt));

  bullets       = bullets.filter(b => !b.dead);
  shootingStars = shootingStars.filter(s => !s.dead);
  particles     = particles.filter(p => !p.dead);
  powerups      = powerups.filter(pu => !pu.dead);

  // Bala vs asteroide
  const newAsteroids = [];
  for (const b of bullets) {
    for (const a of asteroids) {
      if (!a.dead && !b.dead && dist(b, a) < a.radius) {
        b.dead = true;
        a.dead = true;
        score += POINTS[a.size];
        explode(a.x, a.y, a.size * 5);
        newAsteroids.push(...a.split());
        if (Math.random() < 0.08) powerups.push(new PowerUp(a.x, a.y));
      }
    }
  }
  asteroids = asteroids.filter(a => !a.dead).concat(newAsteroids);
  bullets   = bullets.filter(b => !b.dead);

  // Nave vs asteroide
  if (ship.invincible <= 0) {
    for (const a of asteroids) {
      if (dist(ship, a) < ship.radius + a.radius * 0.82) {
        killShip();
        break;
      }
    }
  }

  // Nave vs estrella fugaz: misma lógica que con asteroides; solo colisiona
  // cuando está activa (no durante el aviso) y si la nave no es invencible
  if (ship.invincible <= 0) {
    for (const s of shootingStars) {
      if (s.warning <= 0 && dist(ship, s) < ship.radius + s.radius) {
        killShip();
        break;
      }
    }
  }

  // Nave vs power-up
  for (const pu of powerups) {
    if (!pu.dead && dist(ship, pu) < ship.radius + pu.radius) {
      pu.dead = true;
      ship.speedBoost = 5;
      explode(pu.x, pu.y, 6);
    }
  }

  // Nivel completado
  if (asteroids.length === 0) nextLevel();
}

// ── Draw ──────────────────────────────────────────────────────────────────────
function drawLifeIcon(x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-Math.PI / 2);
  ctx.strokeStyle = '#fff';
  ctx.lineWidth   = 1.2;
  ctx.lineJoin    = 'round';
  ctx.beginPath();
  ctx.moveTo( 9,  0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-3,  0);
  ctx.lineTo(-6,  5);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

function drawHUD() {
  ctx.fillStyle = '#fff';
  ctx.font = '15px monospace';

  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  ${score}`, 14, 26);

  ctx.textAlign = 'center';
  ctx.fillText(`NIVEL ${level}`, W / 2, 26);

  ctx.font      = '13px monospace';
  ctx.fillStyle = SKINS[skinIndex].color;
  ctx.fillText(`SKIN: ${SKINS[skinIndex].name}`, W / 2, 44);
  ctx.fillStyle = '#fff';

  for (let i = 0; i < lives; i++)
    drawLifeIcon(W - 16 - i * 22, 18);

  // Barra de velocidad activa
  if (ship.speedBoost > 0) {
    const boostTime = Math.max(0, ship.speedBoost);
    ctx.textAlign   = 'center';
    ctx.fillStyle   = '#0ff';
    ctx.font        = '13px monospace';
    ctx.fillText(`VELOCIDAD ${boostTime.toFixed(1)}s`, W / 2, H - 36);

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth   = 1;
    ctx.strokeRect(W / 2 - 80, H - 30, 160, 6);

    ctx.fillStyle = '#0ff';
    ctx.fillRect(W / 2 - 80, H - 30, 160 * (boostTime / 5), 6);
  }
}

function drawOverlay(title, sub) {
  ctx.textAlign   = 'center';
  ctx.fillStyle   = '#fff';
  ctx.font        = 'bold 46px monospace';
  ctx.fillText(title, W / 2, H / 2 - 18);
  ctx.font        = '18px monospace';
  ctx.fillStyle   = 'rgba(255,255,255,0.65)';
  ctx.fillText(sub, W / 2, H / 2 + 22);
}

function draw() {
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, W, H);

  particles.forEach(p => p.draw());
  asteroids.forEach(a => a.draw());
  shootingStars.forEach(s => s.draw()); // estrellas fugaces y sus avisos de entrada
  powerups.forEach(pu => pu.draw());
  bullets.forEach(b => b.draw());
  ship.draw();

  drawHUD();

  if (state === 'gameover')
    drawOverlay('GAME OVER', `PUNTAJE: ${score}   —   ESPACIO PARA REINICIAR   —   S: CAMBIAR SKIN`);
}

// ── Loop principal ────────────────────────────────────────────────────────────
let lastTime = null;

function loop(ts) {
  const dt = lastTime === null ? 0 : Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

initGame();
requestAnimationFrame(loop);
