const STORAGE_KEY = "simulador-investimentos-v1";

const Utils = {
  formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2,
    }).format(value || 0);
  },
  toMonthlyRate(rate, unit) {
    const r = rate / 100;
    return unit === "annual" ? Math.pow(1 + r, 1 / 12) - 1 : r;
  },
  monthsFromTerm(term, unit) {
    return unit === "years" ? term * 12 : term;
  },
};

const state = loadState();

const elements = {
  formA: document.getElementById("formA"),
  formB: document.getElementById("formB"),
  panelB: document.getElementById("panelB"),
  btnToggleB: document.getElementById("btnToggleB"),
  btnSwap: document.getElementById("btnSwap"),
  btnCopyToB: document.getElementById("btnCopyToB"),
  btnExport: document.getElementById("btnExport"),
  btnToggleSettings: document.getElementById("btnToggleSettings"),
  btnDownloadChart: document.getElementById("btnDownloadChart"),
  kpiGrid: document.getElementById("kpiGrid"),
  compareGrid: document.getElementById("compareGrid"),
  chart: document.getElementById("growthChart"),
  settingsModal: document.getElementById("settingsModal"),
  toggleMotion: document.getElementById("toggleMotion"),
  toast: document.getElementById("toast"),
};

function loadState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return {
      reduceMotion: null,
      scenarioA: {},
      scenarioB: {},
    };
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    return { reduceMotion: null, scenarioA: {}, scenarioB: {} };
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function readForm(form) {
  const data = new FormData(form);
  return {
    initial: Number(data.get("initial")) || 0,
    monthly: Number(data.get("monthly")) || 0,
    term: Number(data.get("term")) || 1,
    termUnit: data.get("termUnit"),
    rate: Number(data.get("rate")) || 0,
    rateUnit: data.get("rateUnit"),
    inflation: Number(data.get("inflation")) || 0,
    inflationUnit: data.get("inflationUnit"),
  };
}

function simulate(input) {
  const months = Utils.monthsFromTerm(input.term, input.termUnit);
  const rateMonthly = Utils.toMonthlyRate(input.rate, input.rateUnit);
  const inflationMonthly = Utils.toMonthlyRate(input.inflation, input.inflationUnit);

  let balance = input.initial;
  let totalInvested = input.initial;
  const series = [];
  for (let i = 1; i <= months; i++) {
    balance = (balance + input.monthly) * (1 + rateMonthly);
    totalInvested += input.monthly;
    series.push({
      month: i,
      balance,
      totalInvested,
      interest: balance - totalInvested,
    });
  }

  const finalBalance = series[series.length - 1]?.balance || input.initial;
  const realBalance = input.inflation
    ? finalBalance / Math.pow(1 + inflationMonthly, months)
    : null;

  return {
    months,
    series,
    totalInvested,
    finalBalance,
    interest: finalBalance - totalInvested,
    realBalance,
  };
}

function drawGrowthChart(seriesA, seriesB) {
  const ctx = elements.chart.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const width = elements.chart.clientWidth;
  const height = elements.chart.clientHeight;
  elements.chart.width = width * dpr;
  elements.chart.height = height * dpr;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, width, height);

  const padding = 28;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxValue = Math.max(
    ...seriesA.map((p) => p.balance),
    ...(seriesB ? seriesB.map((p) => p.balance) : [0]),
    1
  );

  ctx.strokeStyle = "rgba(76, 201, 240, 0.2)";
  ctx.beginPath();
  ctx.moveTo(padding, padding);
  ctx.lineTo(padding, height - padding);
  ctx.lineTo(width - padding, height - padding);
  ctx.stroke();

  const drawLine = (series, color) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    series.forEach((point, idx) => {
      const x = padding + (idx / (series.length - 1 || 1)) * chartWidth;
      const y = height - padding - (point.balance / maxValue) * chartHeight;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  };

  drawLine(seriesA, "rgba(76, 201, 240, 0.9)");
  if (seriesB) drawLine(seriesB, "rgba(74, 222, 128, 0.9)");
}

function renderResults(simA, simB) {
  elements.kpiGrid.innerHTML = "";
  const items = [
    { label: "Montante final A", value: Utils.formatCurrency(simA.finalBalance) },
    { label: "Total investido A", value: Utils.formatCurrency(simA.totalInvested) },
    { label: "Juros ganhos A", value: Utils.formatCurrency(simA.interest) },
  ];
  if (simA.realBalance !== null) {
    items.push({ label: "Valor real A", value: Utils.formatCurrency(simA.realBalance) });
  }

  items.forEach((item) => {
    const card = document.createElement("div");
    card.className = "kpi-card";
    card.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
    elements.kpiGrid.appendChild(card);
  });

  elements.compareGrid.innerHTML = "";
  if (simB) {
    const diff = simB.finalBalance - simA.finalBalance;
    const percent = simA.finalBalance ? (diff / simA.finalBalance) * 100 : 0;
    const cards = [
      { label: "Montante final B", value: Utils.formatCurrency(simB.finalBalance) },
      { label: "Diferenca", value: Utils.formatCurrency(diff) },
      { label: "Diferenca (%)", value: `${percent.toFixed(1)}%` },
    ];
    cards.forEach((item) => {
      const card = document.createElement("div");
      card.className = "kpi-card";
      card.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
      elements.compareGrid.appendChild(card);
    });
  }
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(elements.toast.timer);
  elements.toast.timer = setTimeout(() => elements.toast.classList.remove("show"), 2000);
}

function handleSimulation() {
  const inputA = readForm(elements.formA);
  const inputB = elements.panelB.dataset.hidden === "true" ? null : readForm(elements.formB);
  const simA = simulate(inputA);
  const simB = inputB ? simulate(inputB) : null;

  renderResults(simA, simB);
  drawGrowthChart(simA.series, simB ? simB.series : null);

  state.scenarioA = inputA;
  state.scenarioB = inputB || {};
  saveState();
}

function fillForm(form, data) {
  Object.keys(data).forEach((key) => {
    if (form[key]) form[key].value = data[key];
  });
}

function exportCSV() {
  const inputA = readForm(elements.formA);
  const simA = simulate(inputA);
  const headers = ["mes", "saldo", "investido", "juros"];
  const rows = simA.series.map((row) =>
    [row.month, row.balance, row.totalInvested, row.interest].map((v) => `"${v}"`).join(";")
  );
  const content = [headers.join(";"), ...rows].join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  downloadFile(blob, "simulacao.csv");
}

function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function toggleSettings() {
  elements.settingsModal.hidden = !elements.settingsModal.hidden;
  if (!elements.settingsModal.hidden) {
    elements.settingsModal.querySelector(".modal-content").focus();
  }
}

function applyMotionPreference() {
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const stored = state.reduceMotion;
  const reduce = stored === null ? prefersReduced.matches : stored;
  document.body.classList.toggle("reduce-motion", reduce);
  elements.toggleMotion.checked = stored === null ? prefersReduced.matches : stored;
}

function init() {
  fillForm(elements.formA, state.scenarioA || {});
  fillForm(elements.formB, state.scenarioB || {});
  handleSimulation();

  elements.formA.addEventListener("submit", (event) => {
    event.preventDefault();
    handleSimulation();
  });
  elements.formB.addEventListener("submit", (event) => {
    event.preventDefault();
    handleSimulation();
  });

  elements.btnToggleB.addEventListener("click", () => {
    const hidden = elements.panelB.dataset.hidden === "true";
    elements.panelB.dataset.hidden = hidden ? "false" : "true";
    elements.formB.style.display = hidden ? "grid" : "none";
    handleSimulation();
  });

  elements.btnSwap.addEventListener("click", () => {
    const dataA = readForm(elements.formA);
    const dataB = readForm(elements.formB);
    fillForm(elements.formA, dataB);
    fillForm(elements.formB, dataA);
    handleSimulation();
  });

  elements.btnCopyToB.addEventListener("click", () => {
    const dataA = readForm(elements.formA);
    fillForm(elements.formB, dataA);
    handleSimulation();
    showToast("Copiado para o cenario B.");
  });

  elements.btnExport.addEventListener("click", exportCSV);
  elements.btnToggleSettings.addEventListener("click", toggleSettings);
  elements.btnDownloadChart.addEventListener("click", () => {
    const url = elements.chart.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = url;
    link.download = "grafico.png";
    link.click();
  });

  document.body.addEventListener("click", (event) => {
    const closeTarget = event.target.closest("[data-close]");
    if (closeTarget) {
      elements.settingsModal.hidden = true;
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      elements.settingsModal.hidden = true;
    }
  });

  elements.toggleMotion.addEventListener("change", () => {
    state.reduceMotion = elements.toggleMotion.checked;
    applyMotionPreference();
    saveState();
  });

  window.addEventListener("resize", Utils.debounce(handleSimulation, 200));
  applyMotionPreference();
}

init();
