const CONFIG = {
  storageKey: "dashboard-metas-v1",
  schemaVersion: 1,
  channels: ["Loja", "WhatsApp", "Instagram", "Indicacao", "Outro"],
};

const Utils = {
  formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(value || 0);
  },
  parseCurrency(value) {
    const number = Number(String(value).replace(/[^0-9.-]+/g, ""));
    return Number.isNaN(number) ? 0 : number;
  },
  debounce(fn, wait = 250) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  },
  today() {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  },
  toISODate(date) {
    return date.toISOString().slice(0, 10);
  },
  monthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  },
  getDaysInMonth(year, month) {
    return new Date(year, month + 1, 0).getDate();
  },
  isBusinessDay(date) {
    const day = date.getDay();
    return day !== 0 && day !== 6;
  },
};

const DataStore = {
  loadState() {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) {
      return {
        version: CONFIG.schemaVersion,
        settings: { reduceMotion: null, useBusinessDays: false },
        goals: {},
        sales: {},
      };
    }
    try {
      const data = JSON.parse(raw);
      return this.migrateIfNeeded(data);
    } catch (error) {
      return {
        version: CONFIG.schemaVersion,
        settings: { reduceMotion: null, useBusinessDays: false },
        goals: {},
        sales: {},
      };
    }
  },
  saveState(state) {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
  },
  getMonthKey(year, month) {
    return `${year}-${String(month + 1).padStart(2, "0")}`;
  },
  migrateIfNeeded(data) {
    if (!data.version) {
      return {
        version: CONFIG.schemaVersion,
        settings: { reduceMotion: null, useBusinessDays: false },
        goals: {},
        sales: {},
      };
    }
    return data;
  },
};

const SalesService = {
  create(state, monthKey, payload) {
    const sale = {
      id: generateId(),
      ...payload,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    if (!state.sales[monthKey]) state.sales[monthKey] = [];
    state.sales[monthKey].push(sale);
    return sale;
  },
  update(state, monthKey, id, payload) {
    const list = state.sales[monthKey] || [];
    const index = list.findIndex((sale) => sale.id === id);
    if (index >= 0) {
      list[index] = {
        ...list[index],
        ...payload,
        updatedAt: new Date().toISOString(),
      };
    }
  },
  remove(state, monthKey, id) {
    const list = state.sales[monthKey] || [];
    state.sales[monthKey] = list.filter((sale) => sale.id !== id);
  },
  list(state, monthKey) {
    return state.sales[monthKey] ? [...state.sales[monthKey]] : [];
  },
  totalsByDay(sales, year, month) {
    const days = Utils.getDaysInMonth(year, month);
    const totals = Array.from({ length: days }, () => 0);
    sales.forEach((sale) => {
      const date = new Date(sale.data);
      if (date.getMonth() === month && date.getFullYear() === year) {
        totals[date.getDate() - 1] += sale.valor;
      }
    });
    return totals;
  },
  totalsByChannel(sales) {
    const totals = {};
    CONFIG.channels.forEach((channel) => {
      totals[channel] = 0;
    });
    sales.forEach((sale) => {
      totals[sale.canal] = (totals[sale.canal] || 0) + sale.valor;
    });
    return totals;
  },
};

const MetricsService = {
  compute({ sales, goal, year, month, useBusinessDays }) {
    const total = sales.reduce((sum, sale) => sum + sale.valor, 0);
    const daysInMonth = Utils.getDaysInMonth(year, month);
    const today = Utils.today();
    const inMonth = today.getFullYear() === year && today.getMonth() === month;
    const daysElapsed = inMonth ? today.getDate() : daysInMonth;

    const effectiveDays = useBusinessDays
      ? countBusinessDays(year, month, daysElapsed)
      : daysElapsed;
    const totalBusinessDays = useBusinessDays
      ? countBusinessDays(year, month, daysInMonth)
      : daysInMonth;

    const percent = goal ? Math.min((total / goal) * 100, 999) : 0;
    const remaining = Math.max(goal - total, 0);
    const avg = effectiveDays ? total / effectiveDays : 0;
    const projection = avg * totalBusinessDays;
    const remainingDays = Math.max(totalBusinessDays - effectiveDays, 1);
    const goalPerDay = remaining / remainingDays;

    const totalsByDay = SalesService.totalsByDay(sales, year, month);
    const maxDayValue = Math.max(0, ...totalsByDay);
    const bestDayIndex = totalsByDay.indexOf(maxDayValue);
    const bestDayLabel = maxDayValue > 0 ? bestDayIndex + 1 : null;

    const daysWithoutSales = totalsByDay.slice(0, daysElapsed).filter((value) => value === 0).length;

    const pace = avg * totalBusinessDays;
    const paceStatus = pace >= goal ? "acima" : "abaixo";

    return {
      total,
      percent,
      remaining,
      avg,
      projection,
      goalPerDay,
      bestDayValue: maxDayValue,
      bestDayLabel,
      daysWithoutSales,
      paceStatus,
      requiredDaily: remaining / remainingDays,
    };
  },
};

const Charts = {
  drawLineChart(canvas, series, options = {}) {
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    const padding = 24;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const maxValue = Math.max(...series, 1);

    ctx.strokeStyle = "rgba(124, 244, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    ctx.strokeStyle = "rgba(0, 233, 255, 0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    series.forEach((value, index) => {
      const x = padding + (index / (series.length - 1 || 1)) * chartWidth;
      const y = height - padding - (value / maxValue) * chartHeight;
      if (index === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  },
  drawBarChart(canvas, categories, values) {
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    const padding = 24;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;
    const maxValue = Math.max(...values, 1);
    const barWidth = chartWidth / categories.length - 12;

    categories.forEach((label, index) => {
      const value = values[index];
      const x = padding + index * (barWidth + 12);
      const barHeight = (value / maxValue) * chartHeight;
      const y = height - padding - barHeight;
      ctx.fillStyle = "rgba(255, 106, 61, 0.6)";
      ctx.fillRect(x, y, barWidth, barHeight);

      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.font = "10px sans-serif";
      ctx.fillText(label, x, height - padding + 12);
    });
  },
};

const UI = {
  state: DataStore.loadState(),
  currentDate: new Date(),
  editingId: null,
  init() {
    this.cache();
    this.bindEvents();
    this.applySettings();
    this.render();
  },
  cache() {
    this.monthLabel = document.getElementById("monthLabel");
    this.btnPrevMonth = document.getElementById("btnPrevMonth");
    this.btnNextMonth = document.getElementById("btnNextMonth");
    this.btnAddSale = document.getElementById("btnAddSale");
    this.btnExport = document.getElementById("btnExport");
    this.btnImport = document.getElementById("btnImport");
    this.btnSettings = document.getElementById("btnSettings");
    this.btnEditGoal = document.getElementById("btnEditGoal");
    this.fabAdd = document.getElementById("fabAdd");
    this.kpiGrid = document.getElementById("kpiGrid");
    this.insightGrid = document.getElementById("insightGrid");
    this.lineChart = document.getElementById("lineChart");
    this.barChart = document.getElementById("barChart");
    this.heatmap = document.getElementById("heatmap");
    this.salesBody = document.getElementById("salesBody");
    this.filterChannel = document.getElementById("filterChannel");
    this.filterStart = document.getElementById("filterStart");
    this.filterEnd = document.getElementById("filterEnd");
    this.searchInput = document.getElementById("searchInput");
    this.sortBy = document.getElementById("sortBy");
    this.saleModal = document.getElementById("saleModal");
    this.goalModal = document.getElementById("goalModal");
    this.importModal = document.getElementById("importModal");
    this.settingsModal = document.getElementById("settingsModal");
    this.saleForm = document.getElementById("saleForm");
    this.goalForm = document.getElementById("goalForm");
    this.importForm = document.getElementById("importForm");
    this.toggleBusinessDays = document.getElementById("toggleBusinessDays");
    this.toggleMotion = document.getElementById("toggleMotion");
    this.importPreview = document.getElementById("importPreview");
    this.toast = document.getElementById("toast");
  },
  bindEvents() {
    this.btnPrevMonth.addEventListener("click", () => this.changeMonth(-1));
    this.btnNextMonth.addEventListener("click", () => this.changeMonth(1));
    this.btnAddSale.addEventListener("click", () => this.openSaleModal());
    this.fabAdd.addEventListener("click", () => this.openSaleModal());
    this.btnEditGoal.addEventListener("click", () => this.openGoalModal());
    this.btnExport.addEventListener("click", () => this.handleExport());
    this.btnImport.addEventListener("click", () => this.openModal(this.importModal));
    this.btnSettings.addEventListener("click", () => this.openModal(this.settingsModal));

    const filterHandler = Utils.debounce(() => this.render(), 150);
    this.filterChannel.addEventListener("change", filterHandler);
    this.filterStart.addEventListener("change", filterHandler);
    this.filterEnd.addEventListener("change", filterHandler);
    this.searchInput.addEventListener("input", filterHandler);
    this.sortBy.addEventListener("change", filterHandler);

    this.saleForm.addEventListener("submit", (event) => this.handleSaleSubmit(event));
    this.goalForm.addEventListener("submit", (event) => this.handleGoalSubmit(event));
    this.importForm.addEventListener("submit", (event) => this.handleImport(event));

    this.toggleMotion.addEventListener("change", () => {
      this.state.settings.reduceMotion = this.toggleMotion.checked;
      this.applySettings();
      this.persist();
    });

    this.toggleBusinessDays.addEventListener("change", () => {
      this.state.settings.useBusinessDays = this.toggleBusinessDays.checked;
      this.persist();
      this.render();
    });

    this.importForm.file.addEventListener("change", () => this.previewImport());

    document.body.addEventListener("click", (event) => {
      const closeTarget = event.target.closest("[data-close]");
      if (closeTarget) {
        this.closeModal(document.getElementById(closeTarget.dataset.close));
        return;
      }

      const action = event.target.closest("[data-action]");
      if (!action) return;
      const id = action.dataset.id;
      if (action.dataset.action === "edit") {
        this.openSaleModal(id);
      }
      if (action.dataset.action === "delete") {
        this.deleteSale(id);
      }
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        this.closeAllModals();
      }
    });

    window.addEventListener(
      "resize",
      Utils.debounce(() => this.renderCharts(), 200)
    );
  },
  applySettings() {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stored = this.state.settings.reduceMotion;
    const reduce = stored === null ? prefersReduced.matches : stored;
    document.body.classList.toggle("reduce-motion", reduce);
    this.toggleMotion.checked = stored === null ? prefersReduced.matches : stored;
    this.toggleBusinessDays.checked = this.state.settings.useBusinessDays;
  },
  persist() {
    DataStore.saveState(this.state);
  },
  changeMonth(delta) {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + delta, 1);
    this.render();
  },
  openModal(modal) {
    modal.hidden = false;
    const focusable = modal.querySelector(".modal-content");
    if (focusable) focusable.focus();
  },
  closeModal(modal) {
    modal.hidden = true;
  },
  closeAllModals() {
    [this.saleModal, this.goalModal, this.importModal, this.settingsModal].forEach((modal) => {
      if (!modal.hidden) modal.hidden = true;
    });
  },
  openSaleModal(id) {
    this.editingId = id || null;
    this.saleForm.reset();
    const title = document.getElementById("saleModalTitle");
    if (id) {
      const sale = this.getCurrentSales().find((item) => item.id === id);
      if (sale) {
        title.textContent = "Editar venda";
        this.saleForm.data.value = sale.data;
        this.saleForm.valor.value = sale.valor;
        this.saleForm.canal.value = sale.canal;
        this.saleForm.cliente.value = sale.cliente || "";
        this.saleForm.observacoes.value = sale.observacoes || "";
      }
    } else {
      title.textContent = "Nova venda";
      this.saleForm.data.value = Utils.toISODate(Utils.today());
    }
    this.openModal(this.saleModal);
  },
  openGoalModal() {
    const monthKey = DataStore.getMonthKey(this.currentDate.getFullYear(), this.currentDate.getMonth());
    const goal = this.state.goals[monthKey] || 0;
    this.goalForm.meta.value = goal;
    this.toggleBusinessDays.checked = this.state.settings.useBusinessDays;
    this.openModal(this.goalModal);
  },
  handleSaleSubmit(event) {
    event.preventDefault();
    const data = new FormData(this.saleForm);
    const payload = {
      data: data.get("data"),
      valor: Number(data.get("valor")),
      canal: data.get("canal"),
      cliente: data.get("cliente")?.trim() || "",
      observacoes: data.get("observacoes")?.trim() || "",
    };

    if (!payload.data || payload.valor <= 0) {
      this.showToast("Preencha data e valor valido.");
      return;
    }

    const monthKey = DataStore.getMonthKey(this.currentDate.getFullYear(), this.currentDate.getMonth());
    if (this.editingId) {
      SalesService.update(this.state, monthKey, this.editingId, payload);
      this.showToast("Venda atualizada.");
    } else {
      SalesService.create(this.state, monthKey, payload);
      this.showToast("Venda registrada.");
    }
    this.persist();
    this.closeModal(this.saleModal);
    this.render();
  },
  handleGoalSubmit(event) {
    event.preventDefault();
    const data = new FormData(this.goalForm);
    const goal = Number(data.get("meta")) || 0;
    const monthKey = DataStore.getMonthKey(this.currentDate.getFullYear(), this.currentDate.getMonth());
    this.state.goals[monthKey] = goal;
    this.state.settings.useBusinessDays = this.toggleBusinessDays.checked;
    this.persist();
    this.closeModal(this.goalModal);
    this.render();
    this.showToast("Meta salva.");
  },
  deleteSale(id) {
    const confirmed = window.confirm("Deseja excluir esta venda?");
    if (!confirmed) return;
    const monthKey = DataStore.getMonthKey(this.currentDate.getFullYear(), this.currentDate.getMonth());
    SalesService.remove(this.state, monthKey, id);
    this.persist();
    this.render();
    this.showToast("Venda excluida.");
  },
  handleExport() {
    const exportData = {
      version: CONFIG.schemaVersion,
      settings: this.state.settings,
      goals: this.state.goals,
      sales: this.state.sales,
    };
    const jsonBlob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    downloadFile(jsonBlob, "dashboard-metas.json");

    const monthKey = DataStore.getMonthKey(this.currentDate.getFullYear(), this.currentDate.getMonth());
    const csvBlob = new Blob([convertSalesToCSV(this.getCurrentSales())], {
      type: "text/csv;charset=utf-8;",
    });
    downloadFile(csvBlob, `vendas-${monthKey}.csv`);
    this.showToast("Exportado em JSON e CSV.");
  },
  handleImport(event) {
    event.preventDefault();
    const file = this.importForm.file.files[0];
    if (!file) {
      this.showToast("Selecione um arquivo.");
      return;
    }
    const mode = this.importForm.importMode.value;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.version || !data.sales) {
          this.showToast("Arquivo invalido.");
          return;
        }
        if (mode === "replace") {
          const confirmReplace = window.confirm("Substituir todos os dados atuais?");
          if (!confirmReplace) return;
          this.state = data;
        } else {
          this.state.goals = { ...this.state.goals, ...data.goals };
          this.state.sales = { ...this.state.sales, ...data.sales };
          this.state.settings = { ...this.state.settings, ...data.settings };
        }
        this.persist();
        this.render();
        this.closeModal(this.importModal);
        this.showToast("Importacao concluida.");
      } catch (error) {
        this.showToast("Erro ao importar.");
      }
    };
    reader.readAsText(file);
  },
  previewImport() {
    const file = this.importForm.file.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        const months = data.sales ? Object.keys(data.sales).length : 0;
        let count = 0;
        if (data.sales) {
          Object.values(data.sales).forEach((list) => {
            count += Array.isArray(list) ? list.length : 0;
          });
        }
        this.importPreview.textContent = `Arquivo pronto: ${months} meses, ${count} vendas.`;
      } catch (error) {
        this.importPreview.textContent = "Arquivo invalido.";
      }
    };
    reader.readAsText(file);
  },
  getCurrentSales() {
    const monthKey = DataStore.getMonthKey(this.currentDate.getFullYear(), this.currentDate.getMonth());
    return SalesService.list(this.state, monthKey);
  },
  getFilteredSales() {
    const channel = this.filterChannel.value;
    const start = this.filterStart.value ? new Date(this.filterStart.value) : null;
    const end = this.filterEnd.value ? new Date(this.filterEnd.value) : null;
    const search = this.searchInput.value.toLowerCase();
    let sales = this.getCurrentSales();

    if (channel) {
      sales = sales.filter((sale) => sale.canal === channel);
    }

    if (start) {
      sales = sales.filter((sale) => new Date(sale.data) >= start);
    }

    if (end) {
      sales = sales.filter((sale) => new Date(sale.data) <= end);
    }

    if (search) {
      sales = sales.filter((sale) => {
        return (
          (sale.cliente || "").toLowerCase().includes(search) ||
          (sale.observacoes || "").toLowerCase().includes(search)
        );
      });
    }

    sales.sort((a, b) => this.sortSales(a, b));
    return sales;
  },
  sortSales(a, b) {
    switch (this.sortBy.value) {
      case "valor":
        return b.valor - a.valor;
      case "canal":
        return a.canal.localeCompare(b.canal, "pt-BR");
      case "data":
        return new Date(a.data) - new Date(b.data);
      default:
        return new Date(b.data) - new Date(a.data);
    }
  },
  render() {
    const monthLabel = this.currentDate.toLocaleDateString("pt-BR", {
      month: "long",
      year: "numeric",
    });
    this.monthLabel.textContent = monthLabel.replace(/^./, (char) => char.toUpperCase());

    const monthKey = DataStore.getMonthKey(this.currentDate.getFullYear(), this.currentDate.getMonth());
    const goal = this.state.goals[monthKey] || 0;
    const sales = this.getCurrentSales();
    const metrics = MetricsService.compute({
      sales,
      goal,
      year: this.currentDate.getFullYear(),
      month: this.currentDate.getMonth(),
      useBusinessDays: this.state.settings.useBusinessDays,
    });

    this.renderKPIs(goal, metrics);
    this.renderInsights(metrics, goal);
    this.renderCharts(sales, metrics);
    this.renderSalesTable(this.getFilteredSales());
  },
  renderKPIs(goal, metrics) {
    this.kpiGrid.innerHTML = "";
    const items = [
      { label: "Total vendido", value: Utils.formatCurrency(metrics.total) },
      { label: "% da meta", value: `${metrics.percent.toFixed(0)}%` },
      { label: "Faltante", value: Utils.formatCurrency(metrics.remaining) },
      { label: "Media diaria", value: Utils.formatCurrency(metrics.avg) },
      {
        label: "Melhor dia",
        value: metrics.bestDayValue
          ? `${Utils.formatCurrency(metrics.bestDayValue)} (dia ${metrics.bestDayLabel})`
          : "-",
      },
      { label: "Projecao", value: Utils.formatCurrency(metrics.projection) },
      { label: "Meta do dia", value: Utils.formatCurrency(metrics.goalPerDay) },
    ];
    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "kpi-card";
      card.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
      this.kpiGrid.appendChild(card);
    });
  },
  renderInsights(metrics, goal) {
    this.insightGrid.innerHTML = "";
    const paceText = metrics.paceStatus === "acima" ? "acima" : "abaixo";
    const cards = [
      {
        badge: metrics.paceStatus === "acima" ? "Ritmo forte" : "Atencao",
        title: `Voce esta ${paceText} do ritmo`,
        text: `Projecao atual: ${Utils.formatCurrency(metrics.projection)}.`,
      },
      {
        badge: "Meta",
        title: "Media diaria necessaria",
        text: `Para bater a meta, precisa de ${Utils.formatCurrency(metrics.requiredDaily)} por dia.`,
      },
      {
        badge: "Consistencia",
        title: "Dias sem venda",
        text: `${metrics.daysWithoutSales} dias sem vendas no periodo.`,
      },
    ];
    cards.forEach((cardData) => {
      const card = document.createElement("div");
      card.className = "insight-card";
      card.innerHTML = `<span class="badge">${cardData.badge}</span><strong>${cardData.title}</strong><span class="muted">${cardData.text}</span>`;
      this.insightGrid.appendChild(card);
    });
  },
  renderCharts(sales, metrics) {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const dailyTotals = SalesService.totalsByDay(sales, year, month);
    const cumulative = dailyTotals.reduce((acc, value) => {
      const last = acc[acc.length - 1] || 0;
      acc.push(last + value);
      return acc;
    }, []);
    Charts.drawLineChart(this.lineChart, cumulative);

    const totalsByChannel = SalesService.totalsByChannel(sales);
    const categories = Object.keys(totalsByChannel);
    const values = Object.values(totalsByChannel);
    Charts.drawBarChart(this.barChart, categories, values);

    this.renderHeatmap(dailyTotals);
  },
  renderHeatmap(dailyTotals) {
    this.heatmap.innerHTML = "";
    const max = Math.max(...dailyTotals, 1);
    dailyTotals.forEach((value, index) => {
      const cell = document.createElement("div");
      const intensity = value ? Math.min(value / max, 1) : 0;
      cell.className = "heatmap-cell";
      cell.style.background = `rgba(0, 233, 255, ${0.15 + intensity * 0.6})`;
      cell.title = `Dia ${index + 1}: ${Utils.formatCurrency(value)}`;
      this.heatmap.appendChild(cell);
    });
  },
  renderSalesTable(sales) {
    this.salesBody.innerHTML = "";
    if (sales.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6" class="muted">Nenhuma venda encontrada.</td>`;
      this.salesBody.appendChild(tr);
      return;
    }
    sales.forEach((sale) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${formatDate(sale.data)}</td>
        <td>${Utils.formatCurrency(sale.valor)}</td>
        <td>${sale.canal}</td>
        <td>${sale.cliente || "-"}</td>
        <td>${sale.observacoes || "-"}</td>
        <td>
          <button class="icon-btn" data-action="edit" data-id="${sale.id}" aria-label="Editar">
            <img src="assets/icons/edit.svg" alt="" aria-hidden="true" />
          </button>
          <button class="icon-btn" data-action="delete" data-id="${sale.id}" aria-label="Excluir">
            <img src="assets/icons/trash.svg" alt="" aria-hidden="true" />
          </button>
        </td>
      `;
      this.salesBody.appendChild(tr);
    });
  },
  showToast(message) {
    this.toast.textContent = message;
    this.toast.classList.add("show");
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toast.classList.remove("show");
    }, 2400);
  },
};

function generateId() {
  if (crypto && crypto.randomUUID) return crypto.randomUUID();
  return `sale_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function countBusinessDays(year, month, daysLimit) {
  let count = 0;
  for (let i = 1; i <= daysLimit; i++) {
    const date = new Date(year, month, i);
    if (Utils.isBusinessDay(date)) count += 1;
  }
  return count;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
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

function convertSalesToCSV(sales) {
  const headers = ["data", "valor", "canal", "cliente", "observacoes"];
  const rows = sales.map((sale) =>
    headers
      .map((key) => {
        const value = sale[key] ?? "";
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(";")
  );
  return [headers.join(";"), ...rows].join("\n");
}

UI.init();
