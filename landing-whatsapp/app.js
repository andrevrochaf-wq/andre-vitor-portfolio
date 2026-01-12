const WA_PHONE = "5500000000000";
const motionKey = "landingReduceMotion";

const navLinks = Array.from(document.querySelectorAll(".nav-link"));
const sections = navLinks.map((link) => document.querySelector(link.getAttribute("href")));
const toggleMotion = document.getElementById("toggleMotion");
const backToTop = document.getElementById("backToTop");
const form = document.getElementById("messageForm");
const output = document.getElementById("messageOutput");
const btnCopy = document.getElementById("btnCopy");
const btnOpen = document.getElementById("btnOpen");
const toast = document.getElementById("toast");
const faqItems = document.querySelectorAll(".faq-item");

const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
let reduceMotion = localStorage.getItem(motionKey);
reduceMotion = reduceMotion ? reduceMotion === "true" : prefersReduced.matches;

function applyMotionPreference() {
  document.body.classList.toggle("reduce-motion", reduceMotion);
  toggleMotion.setAttribute("aria-pressed", String(reduceMotion));
  toggleMotion.textContent = reduceMotion ? "Ativar animacoes" : "Reduzir animacoes";
}

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => toast.classList.remove("show"), 2000);
}

function updateScrollSpy() {
  const scrollPos = window.scrollY + window.innerHeight * 0.35;
  sections.forEach((section, index) => {
    if (!section) return;
    const isActive =
      scrollPos >= section.offsetTop && scrollPos < section.offsetTop + section.offsetHeight;
    navLinks[index].classList.toggle("active", isActive);
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

function buildMessage(data) {
  const base = `Ola, meu nome e ${data.name}. Tenho interesse em ${data.interest}. Meu melhor horario e ${
    data.time
  }.`;
  const extra = data.extra ? `Mensagem adicional: ${data.extra}` : "";
  return [base, extra].filter(Boolean).join(" ");
}

function openWhatsapp(message) {
  const encoded = encodeURIComponent(message);
  const url = `https://wa.me/${WA_PHONE}?text=${encoded}`;
  window.open(url, "_blank");
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(form);
  const message = buildMessage({
    name: data.get("name"),
    interest: data.get("interest"),
    time: data.get("time"),
    extra: data.get("extra"),
  });
  output.value = message;
  showToast("Mensagem gerada.");
});

btnCopy.addEventListener("click", () => {
  if (!output.value) {
    showToast("Gere a mensagem primeiro.");
    return;
  }
  navigator.clipboard
    .writeText(output.value)
    .then(() => showToast("Mensagem copiada."))
    .catch(() => showToast("Nao foi possivel copiar."));
});

btnOpen.addEventListener("click", () => {
  if (!output.value) {
    showToast("Gere a mensagem primeiro.");
    return;
  }
  openWhatsapp(output.value);
});

faqItems.forEach((item) => {
  item.addEventListener("click", () => {
    const expanded = item.getAttribute("aria-expanded") === "true";
    item.setAttribute("aria-expanded", String(!expanded));
  });
  item.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      item.click();
    }
  });
});

window.addEventListener("scroll", updateScrollSpy, { passive: true });
updateScrollSpy();

window.addEventListener(
  "scroll",
  () => {
    if (window.scrollY > 600) backToTop.classList.add("show");
    else backToTop.classList.remove("show");
  },
  { passive: true }
);

backToTop.addEventListener("click", () => {
  window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
});

toggleMotion.addEventListener("click", () => {
  reduceMotion = !reduceMotion;
  localStorage.setItem(motionKey, String(reduceMotion));
  applyMotionPreference();
});

prefersReduced.addEventListener("change", (event) => {
  if (localStorage.getItem(motionKey)) return;
  reduceMotion = event.matches;
  applyMotionPreference();
});

applyMotionPreference();
