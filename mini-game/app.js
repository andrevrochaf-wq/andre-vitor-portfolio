const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreEl = document.getElementById("score");
const comboEl = document.getElementById("combo");
const bestEl = document.getElementById("best");
const statusEl = document.getElementById("status");
const overlay = document.getElementById("overlay");
const btnStart = document.getElementById("btnStart");
const btnPause = document.getElementById("btnPause");
const btnRestart = document.getElementById("btnRestart");
const btnOverlayStart = document.getElementById("btnOverlayStart");

const state = {
  running: false,
  paused: false,
  score: 0,
  combo: 1,
  best: Number(localStorage.getItem("tapOrbitBest")) || 0,
  time: 0,
  direction: 1,
  speed: 0.02,
};

const player = {
  angle: 0,
  radius: 120,
  size: 10,
};

const hazards = [];
const orbs = [];

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  player.radius = Math.min(rect.width, rect.height) * 0.35;
}

function resetGame() {
  state.score = 0;
  state.combo = 1;
  state.time = 0;
  state.direction = 1;
  state.speed = 0.02;
  player.angle = 0;
  hazards.length = 0;
  orbs.length = 0;
  updateHUD();
}

function updateHUD() {
  scoreEl.textContent = Math.floor(state.score);
  comboEl.textContent = `${state.combo}x`;
  bestEl.textContent = Math.floor(state.best);
}

function setStatus(text) {
  statusEl.textContent = text;
}

function spawnHazard() {
  const angle = Math.random() * Math.PI * 2;
  hazards.push({ angle, size: 12 + Math.random() * 6, life: 600 });
}

function spawnOrb() {
  const angle = Math.random() * Math.PI * 2;
  orbs.push({ angle, size: 9, life: 400 });
}

function update(dt) {
  if (!state.running || state.paused) return;
  state.time += dt;
  state.score += dt * 8 * state.combo;
  state.speed = 0.02 + Math.min(state.score / 5000, 0.04);

  player.angle += state.direction * state.speed * dt;

  if (Math.random() > 0.98 && hazards.length < 6) spawnHazard();
  if (Math.random() > 0.985 && orbs.length < 3) spawnOrb();

  const playerPos = getOrbitPosition(player.angle, player.radius);

  for (let i = hazards.length - 1; i >= 0; i--) {
    const hazard = hazards[i];
    hazard.life -= dt * 6;
    if (hazard.life <= 0) hazards.splice(i, 1);
    const hazardPos = getOrbitPosition(hazard.angle, player.radius);
    if (distance(playerPos.x, playerPos.y, hazardPos.x, hazardPos.y) < player.size + hazard.size) {
      endGame();
      return;
    }
  }

  for (let i = orbs.length - 1; i >= 0; i--) {
    const orb = orbs[i];
    orb.life -= dt * 6;
    if (orb.life <= 0) orbs.splice(i, 1);
    const orbPos = getOrbitPosition(orb.angle, player.radius);
    if (distance(playerPos.x, playerPos.y, orbPos.x, orbPos.y) < player.size + orb.size + 2) {
      state.combo += 1;
      state.score += 80 * state.combo;
      orbs.splice(i, 1);
    }
  }

  if (state.combo > 1 && state.time % 120 < 1) {
    state.combo = Math.max(1, state.combo - 1);
  }

  updateHUD();
}

function draw() {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
  const center = getCenter();

  ctx.strokeStyle = "rgba(0, 240, 255, 0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center.x, center.y, player.radius, 0, Math.PI * 2);
  ctx.stroke();

  hazards.forEach((hazard) => {
    const pos = getOrbitPosition(hazard.angle, player.radius);
    ctx.beginPath();
    ctx.fillStyle = "rgba(255, 143, 245, 0.9)";
    ctx.arc(pos.x, pos.y, hazard.size, 0, Math.PI * 2);
    ctx.fill();
  });

  orbs.forEach((orb) => {
    const pos = getOrbitPosition(orb.angle, player.radius);
    ctx.beginPath();
    ctx.fillStyle = "#00f0ff";
    ctx.arc(pos.x, pos.y, orb.size, 0, Math.PI * 2);
    ctx.fill();
  });

  const playerPos = getOrbitPosition(player.angle, player.radius);
  ctx.beginPath();
  ctx.fillStyle = "#7b5cff";
  ctx.arc(playerPos.x, playerPos.y, player.size, 0, Math.PI * 2);
  ctx.fill();
}

let last = 0;
function loop(timestamp) {
  const dt = (timestamp - last) / 16;
  last = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function getCenter() {
  return { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 };
}

function getOrbitPosition(angle, radius) {
  const center = getCenter();
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius,
  };
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function tap() {
  if (!state.running) {
    startGame();
    return;
  }
  state.direction *= -1;
}

function startGame() {
  state.running = true;
  state.paused = false;
  overlay.classList.add("hidden");
  setStatus("Toque para inverter o sentido!");
}

function pauseGame() {
  if (!state.running) return;
  state.paused = !state.paused;
  setStatus(state.paused ? "Jogo pausado" : "Em andamento");
}

function endGame() {
  state.running = false;
  overlay.classList.remove("hidden");
  setStatus("Fim de jogo. Tente de novo!");
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem("tapOrbitBest", Math.floor(state.best));
  }
  updateHUD();
}

btnStart.addEventListener("click", () => {
  resetGame();
  startGame();
});
btnOverlayStart.addEventListener("click", () => {
  resetGame();
  startGame();
});
btnPause.addEventListener("click", pauseGame);
btnRestart.addEventListener("click", () => {
  resetGame();
  startGame();
});

canvas.addEventListener("click", tap);
canvas.addEventListener("touchstart", (event) => {
  event.preventDefault();
  tap();
});

document.body.addEventListener("keydown", (event) => {
  if (event.key === " ") {
    event.preventDefault();
    tap();
  }
});

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
resetGame();
requestAnimationFrame(loop);
