const body = document.body;
const navLinks = Array.from(document.querySelectorAll(".nav-link"));
const sections = navLinks.map((link) => document.querySelector(link.getAttribute("href")));
const backToTop = document.getElementById("backToTop");
const toggleMotion = document.getElementById("toggleMotion");
const spotlight = document.querySelector(".spotlight");
const canvas = document.getElementById("space");
const form = document.getElementById("contactForm");

const motionKey = "prefersReducedMotion";
const storedPreference = localStorage.getItem(motionKey);
const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
let reduceMotion = storedPreference ? storedPreference === "true" : prefersReduced.matches;

function applyMotionPreference() {
  body.classList.toggle("reduce-motion", reduceMotion);
  if (toggleMotion) {
    toggleMotion.setAttribute("aria-pressed", String(reduceMotion));
    toggleMotion.textContent = reduceMotion ? "Ativar animações" : "Reduzir animações";
  }
}

applyMotionPreference();

if (toggleMotion) {
  toggleMotion.addEventListener("click", () => {
    reduceMotion = !reduceMotion;
    localStorage.setItem(motionKey, String(reduceMotion));
    applyMotionPreference();
  });
}

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.2 }
);

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

function updateScrollSpy() {
  const scrollPos = window.scrollY + window.innerHeight * 0.4;
  sections.forEach((section, index) => {
    if (!section) return;
    const isActive =
      scrollPos >= section.offsetTop && scrollPos < section.offsetTop + section.offsetHeight;
    navLinks[index].classList.toggle("active", isActive);
  });
}

window.addEventListener("scroll", updateScrollSpy, { passive: true });
updateScrollSpy();

window.addEventListener(
  "scroll",
  () => {
    if (window.scrollY > 600) {
      backToTop.classList.add("show");
    } else {
      backToTop.classList.remove("show");
    }
  },
  { passive: true }
);

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
});

const supportsHover = window.matchMedia("(hover: hover)").matches;
if (supportsHover && spotlight) {
  document.addEventListener("mousemove", (event) => {
    if (reduceMotion) return;
    const x = (event.clientX / window.innerWidth) * 100;
    const y = (event.clientY / window.innerHeight) * 100;
    spotlight.style.background = `radial-gradient(circle at ${x}% ${y}%, rgba(0, 233, 255, 0.18), transparent 55%)`;
  });
}

let ctx;
let particles = [];
let animationId;

function initCanvas() {
  if (!canvas || reduceMotion) return;
  ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 1.6);
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  const count = Math.min(90, Math.floor(window.innerWidth / 12));
  particles = Array.from({ length: count }, () => createParticle());
  animate();
}

function createParticle() {
  return {
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    vx: (Math.random() - 0.5) * 0.4,
    vy: (Math.random() - 0.5) * 0.4,
    radius: Math.random() * 1.8 + 0.6,
  };
}

function animate() {
  if (!ctx || reduceMotion) return;
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  ctx.fillStyle = "rgba(124, 244, 255, 0.35)";

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.x += p.vx;
    p.y += p.vy;

    if (p.x < 0 || p.x > window.innerWidth) p.vx *= -1;
    if (p.y < 0 || p.y > window.innerHeight) p.vy *= -1;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();

    for (let j = i + 1; j < particles.length; j++) {
      const q = particles[j];
      const dx = p.x - q.x;
      const dy = p.y - q.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 120) {
        ctx.strokeStyle = `rgba(0, 233, 255, ${0.08 - dist / 2000})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
        ctx.stroke();
      }
    }
  }

  animationId = requestAnimationFrame(animate);
}

function stopCanvas() {
  if (animationId) cancelAnimationFrame(animationId);
  animationId = null;
  if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

window.addEventListener("resize", () => {
  stopCanvas();
  initCanvas();
});

if (!reduceMotion) {
  initCanvas();
}

if (toggleMotion) {
  toggleMotion.addEventListener("click", () => {
    stopCanvas();
    if (!reduceMotion) {
      initCanvas();
    }
  });
}

if (form) {
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(form);
    const name = data.get("name");
    const email = data.get("email");
    const message = data.get("message");

    const subject = encodeURIComponent("Contato via portfólio");
    const bodyText = encodeURIComponent(
      `Nome: ${name}\nEmail: ${email}\n\nMensagem:\n${message}`
    );

    window.location.href = `mailto:andrevrochaf@gmail.com?subject=${subject}&body=${bodyText}`;
  });
}

prefersReduced.addEventListener("change", (event) => {
  if (storedPreference) return;
  reduceMotion = event.matches;
  applyMotionPreference();
});
