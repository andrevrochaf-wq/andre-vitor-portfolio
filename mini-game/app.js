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
  best: Number(localStorage.getItem("neonBest")) || 0,
  shield: 0,
  time: 0,
  difficulty: 1,
};

const player = {
  x: 200,
  y: 200,
  r: 12,
  vx: 0,
  vy: 0,
  targetX: 200,
  targetY: 200,
};

const hazards = [];
const orbs = [];
const sparks = [];

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
}

function resetGame() {
  state.score = 0;
  state.combo = 1;
  state.shield = 0;
  state.time = 0;
  state.difficulty = 1;
  hazards.length = 0;
  orbs.length = 0;
  sparks.length = 0;
  player.x = canvas.clientWidth / 2;
  player.y = canvas.clientHeight / 2;
  player.targetX = player.x;
  player.targetY = player.y;
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
  const side = Math.floor(Math.random() * 4);
  const margin = 20;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  let x = 0;
  let y = 0;
  if (side === 0) {
    x = -margin;
    y = Math.random() * h;
  } else if (side === 1) {
    x = w + margin;
    y = Math.random() * h;
  } else if (side === 2) {
    x = Math.random() * w;
    y = -margin;
  } else {
    x = Math.random() * w;
    y = h + margin;
  }
  const angle = Math.atan2(player.y - y, player.x - x);
  const speed = 1.2 + state.difficulty * 0.4;
  hazards.push({
    x,
    y,
    r: 10 + Math.random() * 6,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
  });
}

function spawnOrb() {
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  orbs.push({
    x: 40 + Math.random() * (w - 80),
    y: 40 + Math.random() * (h - 80),
    r: 8,
    type: Math.random() > 0.9 ? "shield" : "score",
  });
}

function addSpark(x, y, color) {
  for (let i = 0; i < 10; i++) {
    sparks.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3,
      life: 20 + Math.random() * 10,
      color,
    });
  }
}

function update(dt) {
  if (!state.running || state.paused) return;
  state.time += dt;
  state.score += dt * 10 * state.combo;
  state.difficulty = 1 + state.score / 600;

  if (state.time % 60 < 1) {
    spawnHazard();
  }
  if (orbs.length < 3 && Math.random() > 0.98) {
    spawnOrb();
  }

  const dx = player.targetX - player.x;
  const dy = player.targetY - player.y;
  player.x += dx * 0.08;
  player.y += dy * 0.08;

  hazards.forEach((h) => {
    h.x += h.vx;
    h.y += h.vy;
  });

  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i];
    if (
      h.x < -50 ||
      h.x > canvas.clientWidth + 50 ||
      h.y < -50 ||
      h.y > canvas.clientHeight + 50
    ) {
      hazards.splice(i, 1);
    }
  }

  for (let i = orbs.length - 1; i >= 0; i--) {
    const orb = orbs[i];
    if (distance(player.x, player.y, orb.x, orb.y) < player.r + orb.r + 4) {
      if (orb.type === "shield") {
        state.shield = 1;
        addSpark(orb.x, orb.y, "#7b5cff");
        setStatus("Escudo ativo!");
      } else {
        state.combo += 1;
        state.score += 100 * state.combo;
        addSpark(orb.x, orb.y, "#00f0ff");
      }
      orbs.splice(i, 1);
    }
  }

  for (let i = hazards.length - 1; i >= 0; i--) {
    const h = hazards[i];
    if (distance(player.x, player.y, h.x, h.y) < player.r + h.r) {
      if (state.shield > 0) {
        state.shield = 0;
        hazards.splice(i, 1);
        addSpark(player.x, player.y, "#ff6ad5");
      } else {
        endGame();
        return;
      }
    }
  }

  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.x += s.vx;
    s.y += s.vy;
    s.life -= 1;
    if (s.life <= 0) sparks.splice(i, 1);
  }

  if (state.combo > 1 && state.time % 120 < 1) {
    state.combo = Math.max(1, state.combo - 1);
  }

  updateHUD();
}

function draw() {
  ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  ctx.fillStyle = "rgba(123, 92, 255, 0.12)";
  ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);

  hazards.forEach((h) => {
    ctx.beginPath();
    ctx.fillStyle = "rgba(255, 106, 213, 0.8)";
    ctx.arc(h.x, h.y, h.r, 0, Math.PI * 2);
    ctx.fill();
  });

  orbs.forEach((orb) => {
    ctx.beginPath();
    ctx.fillStyle = orb.type === "shield" ? "#7b5cff" : "#00f0ff";
    ctx.arc(orb.x, orb.y, orb.r, 0, Math.PI * 2);
    ctx.fill();
  });

  sparks.forEach((s) => {
    ctx.beginPath();
    ctx.fillStyle = s.color;
    ctx.arc(s.x, s.y, 2, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.beginPath();
  ctx.fillStyle = state.shield ? "#7b5cff" : "#00f0ff";
  ctx.arc(player.x, player.y, player.r, 0, Math.PI * 2);
  ctx.fill();

  if (state.shield) {
    ctx.strokeStyle = "rgba(123, 92, 255, 0.6)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(player.x, player.y, player.r + 6, 0, Math.PI * 2);
    ctx.stroke();
  }
}

let last = 0;
function loop(timestamp) {
  const dt = (timestamp - last) / 16;
  last = timestamp;
  update(dt);
  draw();
  requestAnimationFrame(loop);
}

function startGame() {
  state.running = true;
  state.paused = false;
  overlay.classList.add("hidden");
  setStatus("Desvie e colete energia!");
}

function pauseGame() {
  state.paused = !state.paused;
  setStatus(state.paused ? "Jogo pausado" : "Em andamento");
}

function endGame() {
  state.running = false;
  overlay.classList.remove("hidden");
  setStatus("Fim de jogo. Tente de novo!");
  if (state.score > state.best) {
    state.best = state.score;
    localStorage.setItem("neonBest", Math.floor(state.best));
  }
  updateHUD();
}

function distance(x1, y1, x2, y2) {
  return Math.hypot(x1 - x2, y1 - y2);
}

function handlePointer(event) {
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX || event.touches?.[0].clientX) - rect.left;
  const y = (event.clientY || event.touches?.[0].clientY) - rect.top;
  player.targetX = Math.max(0, Math.min(rect.width, x));
  player.targetY = Math.max(0, Math.min(rect.height, y));
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

canvas.addEventListener("mousemove", handlePointer);
canvas.addEventListener("touchmove", (event) => {
  event.preventDefault();
  handlePointer(event);
});

window.addEventListener("resize", resizeCanvas);

resizeCanvas();
resetGame();
requestAnimationFrame(loop);
