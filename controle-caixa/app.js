const CONFIG = {
  storageKey: "controle-caixa-v1",
  version: 1,
  defaultCategories: [
    { name: "Alimentacao", limit: 0 },
    { name: "Transporte", limit: 0 },
    { name: "Contas", limit: 0 },
    { name: "Lazer", limit: 0 },
    { name: "Saude", limit: 0 },
    { name: "Outros", limit: 0 },
  ],
};

const Utils = {
  formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2,
    }).format(value || 0);
  },
  toISO(date) {
    return date.toISOString().slice(0, 10);
  },
  debounce(fn, wait = 200) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  },
};

const Store = {
  load() {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (!raw) return this.defaultState();
    try {
      const data = JSON.parse(raw);
      return this.migrate(data);
    } catch (error) {
      return this.defaultState();
    }
  },
  save(state) {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(state));
  },
  defaultState() {
    return {
      version: CONFIG.version,
      settings: { reduceMotion: null },
      categories: CONFIG.defaultCategories,
      transactions: [],
    };
  },
  migrate(data) {
    if (!data.version) return this.defaultState();
    return { ...this.defaultState(), ...data };
  },
};

const Charts = {
  drawBarByCategory(canvas, data) {
    const ctx = canvas.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const labels = Object.keys(data);
    const values = Object.values(data);
    const max = Math.max(...values, 1);
    const padding = 24;
    const barWidth = (width - padding * 2) / labels.length - 10;

    labels.forEach((label, idx) => {
      const value = values[idx];
      const x = padding + idx * (barWidth + 10);
      const barHeight = (value / max) * (height - padding * 2);
      ctx.fillStyle = "rgba(255, 196, 87, 0.7)";
      ctx.fillRect(x, height - padding - barHeight, barWidth, barHeight);
      ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
      ctx.font = "10px monospace";
      ctx.fillText(label.slice(0, 6), x, height - padding + 12);
    });
  },
  drawBalanceLine(canvas, series) {
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
    const max = Math.max(...series, 1);
    const min = Math.min(...series, 0);

    ctx.strokeStyle = "rgba(255, 196, 87, 0.25)";
    ctx.beginPath();
    ctx.moveTo(padding, padding);
    ctx.lineTo(padding, height - padding);
    ctx.lineTo(width - padding, height - padding);
    ctx.stroke();

    ctx.strokeStyle = "rgba(255, 127, 80, 0.8)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    series.forEach((value, idx) => {
      const x = padding + (idx / (series.length - 1 || 1)) * chartWidth;
      const y = height - padding - ((value - min) / (max - min || 1)) * chartHeight;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  },
};

const UI = {
  state: Store.load(),
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
    this.btnAdd = document.getElementById("btnAdd");
    this.btnReport = document.getElementById("btnReport");
    this.btnExport = document.getElementById("btnExport");
    this.btnImport = document.getElementById("btnImport");
    this.btnSettings = document.getElementById("btnSettings");
    this.kpiGrid = document.getElementById("kpiGrid");
    this.barChart = document.getElementById("barChart");
    this.lineChart = document.getElementById("lineChart");
    this.filterType = document.getElementById("filterType");
    this.filterCategory = document.getElementById("filterCategory");
    this.filterStart = document.getElementById("filterStart");
    this.filterEnd = document.getElementById("filterEnd");
    this.searchInput = document.getElementById("searchInput");
    this.sortBy = document.getElementById("sortBy");
    this.tableBody = document.getElementById("tableBody");
    this.transactionModal = document.getElementById("transactionModal");
    this.transactionForm = document.getElementById("transactionForm");
    this.settingsModal = document.getElementById("settingsModal");
    this.importModal = document.getElementById("importModal");
    this.reportModal = document.getElementById("reportModal");
    this.reportBody = document.getElementById("reportBody");
    this.categoryList = document.getElementById("categoryList");
    this.btnAddCategory = document.getElementById("btnAddCategory");
    this.toggleMotion = document.getElementById("toggleMotion");
    this.btnReset = document.getElementById("btnReset");
    this.importForm = document.getElementById("importForm");
    this.toast = document.getElementById("toast");
  },
  bindEvents() {
    this.btnPrevMonth.addEventListener("click", () => this.changeMonth(-1));
    this.btnNextMonth.addEventListener("click", () => this.changeMonth(1));
    this.btnAdd.addEventListener("click", () => this.openTransactionModal());
    this.btnReport.addEventListener("click", () => this.openReport());
    this.btnExport.addEventListener("click", () => this.exportData());
    this.btnImport.addEventListener("click", () => this.openModal(this.importModal));
    this.btnSettings.addEventListener("click", () => this.openModal(this.settingsModal));
    this.btnAddCategory.addEventListener("click", () => this.addCategory());
    this.btnReset.addEventListener("click", () => this.resetData());

    const filterHandler = Utils.debounce(() => this.render(), 150);
    this.filterType.addEventListener("change", filterHandler);
    this.filterCategory.addEventListener("change", filterHandler);
    this.filterStart.addEventListener("change", filterHandler);
    this.filterEnd.addEventListener("change", filterHandler);
    this.searchInput.addEventListener("input", filterHandler);
    this.sortBy.addEventListener("change", filterHandler);

    this.transactionForm.addEventListener("submit", (event) => this.saveTransaction(event));
    this.importForm.addEventListener("submit", (event) => this.handleImport(event));

    this.toggleMotion.addEventListener("change", () => {
      this.state.settings.reduceMotion = this.toggleMotion.checked;
      this.applySettings();
      this.persist();
    });

    document.body.addEventListener("click", (event) => {
      const closeTarget = event.target.closest("[data-close]");
      if (closeTarget) this.closeModal(document.getElementById(closeTarget.dataset.close));

      const actionBtn = event.target.closest("[data-action]");
      if (!actionBtn) return;
      if (actionBtn.dataset.action === "edit") this.openTransactionModal(actionBtn.dataset.id);
      if (actionBtn.dataset.action === "delete") this.deleteTransaction(actionBtn.dataset.id);
    });

    window.addEventListener(
      "resize",
      Utils.debounce(() => this.renderCharts(), 200)
    );

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") {
        [this.transactionModal, this.settingsModal, this.importModal, this.reportModal].forEach((modal) => {
          if (!modal.hidden) this.closeModal(modal);
        });
      }
    });
  },
  applySettings() {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stored = this.state.settings.reduceMotion;
    const reduce = stored === null ? prefersReduced.matches : stored;
    document.body.classList.toggle("reduce-motion", reduce);
    this.toggleMotion.checked = stored === null ? prefersReduced.matches : stored;
  },
  persist() {
    Store.save(this.state);
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
  openTransactionModal(id) {
    this.editingId = id || null;
    this.transactionForm.reset();
    this.populateCategorySelects();
    if (id) {
      const item = this.state.transactions.find((t) => t.id === id);
      if (item) {
        this.transactionForm.type.value = item.type;
        this.transactionForm.date.value = item.date;
        this.transactionForm.value.value = item.value;
        this.transactionForm.category.value = item.category;
        this.transactionForm.description.value = item.description || "";
      }
    } else {
      this.transactionForm.date.value = Utils.toISO(new Date());
    }
    this.openModal(this.transactionModal);
  },
  saveTransaction(event) {
    event.preventDefault();
    const data = new FormData(this.transactionForm);
    const payload = {
      type: data.get("type"),
      date: data.get("date"),
      value: Number(data.get("value")),
      category: data.get("category"),
      description: data.get("description")?.trim() || "",
    };
    if (!payload.date || payload.value <= 0) {
      this.showToast("Preencha data e valor valido.");
      return;
    }
    if (this.editingId) {
      const index = this.state.transactions.findIndex((t) => t.id === this.editingId);
      if (index >= 0) {
        this.state.transactions[index] = {
          ...this.state.transactions[index],
          ...payload,
          updatedAt: new Date().toISOString(),
        };
      }
      this.showToast("Lancamento atualizado.");
    } else {
      this.state.transactions.push({
        id: generateId(),
        ...payload,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      this.showToast("Lancamento criado.");
    }
    this.persist();
    this.closeModal(this.transactionModal);
    this.render();
  },
  deleteTransaction(id) {
    const confirmed = window.confirm("Deseja excluir este lancamento?");
    if (!confirmed) return;
    this.state.transactions = this.state.transactions.filter((t) => t.id !== id);
    this.persist();
    this.render();
    this.showToast("Lancamento removido.");
  },
  addCategory() {
    this.state.categories.push({ name: "Nova categoria", limit: 0 });
    this.persist();
    this.renderCategories();
    this.render();
  },
  resetData() {
    const confirmed = window.confirm("Resetar todos os dados?");
    if (!confirmed) return;
    this.state = Store.defaultState();
    this.persist();
    this.render();
    this.showToast("Dados resetados.");
  },
  exportData() {
    const jsonBlob = new Blob([JSON.stringify(this.state, null, 2)], { type: "application/json" });
    downloadFile(jsonBlob, "controle-caixa.json");
    const csvBlob = new Blob([convertToCSV(this.getCurrentTransactions())], {
      type: "text/csv;charset=utf-8;",
    });
    downloadFile(csvBlob, "lancamentos-mes.csv");
    this.showToast("Exportado em JSON e CSV.");
  },
  handleImport(event) {
    event.preventDefault();
    const file = this.importForm.file.files[0];
    if (!file) return;
    const mode = this.importForm.mode.value;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (!data.transactions) {
          this.showToast("Arquivo invalido.");
          return;
        }
        if (mode === "replace") {
          const confirmReplace = window.confirm("Substituir todos os dados?");
          if (!confirmReplace) return;
          this.state = data;
        } else {
          this.state.transactions = [...this.state.transactions, ...data.transactions];
          this.state.categories = data.categories || this.state.categories;
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
  openReport() {
    const summary = this.buildReport();
    this.reportBody.innerHTML = summary;
    this.openModal(this.reportModal);
  },
  buildReport() {
    const list = this.getCurrentTransactions();
    const expenses = list.filter((t) => t.type === "saida");
    const totalsByCategory = this.totalsByCategory(expenses);
    const topExpenses = [...expenses].sort((a, b) => b.value - a.value).slice(0, 5);
    const dayTotals = this.totalsByDay(expenses);
    const maxDay = Math.max(...Object.values(dayTotals), 0);
    const topDays = Object.entries(dayTotals)
      .filter(([, value]) => value === maxDay && value > 0)
      .map(([day]) => day);

    return `
      <div class="report-block">
        <h4>Resumo por categoria</h4>
        ${Object.entries(totalsByCategory)
          .map(([cat, value]) => `<p>${cat}: ${Utils.formatCurrency(value)}</p>`)
          .join("")}
      </div>
      <div class="report-block">
        <h4>Top 5 gastos</h4>
        ${topExpenses.map((item) => `<p>${item.date} - ${item.category}: ${Utils.formatCurrency(item.value)}</p>`).join("") || "<p>Nenhum gasto.</p>"}
      </div>
      <div class="report-block">
        <h4>Dia(s) de maior saida</h4>
        ${topDays.length ? `<p>${topDays.join(", ")} (${Utils.formatCurrency(maxDay)})</p>` : "<p>Sem dados.</p>"}
      </div>
    `;
  },
  getCurrentTransactions() {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    return this.state.transactions.filter((t) => {
      const date = new Date(t.date);
      return date.getFullYear() === year && date.getMonth() === month;
    });
  },
  getFilteredTransactions() {
    let list = this.getCurrentTransactions();
    const type = this.filterType.value;
    const category = this.filterCategory.value;
    const start = this.filterStart.value ? new Date(this.filterStart.value) : null;
    const end = this.filterEnd.value ? new Date(this.filterEnd.value) : null;
    const search = this.searchInput.value.toLowerCase();

    if (type) list = list.filter((t) => t.type === type);
    if (category) list = list.filter((t) => t.category === category);
    if (start) list = list.filter((t) => new Date(t.date) >= start);
    if (end) list = list.filter((t) => new Date(t.date) <= end);
    if (search) list = list.filter((t) => (t.description || "").toLowerCase().includes(search));

    list.sort((a, b) => {
      if (this.sortBy.value === "valor") return b.value - a.value;
      return new Date(b.date) - new Date(a.date);
    });
    return list;
  },
  totalsByCategory(list) {
    const totals = {};
    this.state.categories.forEach((cat) => {
      totals[cat.name] = 0;
    });
    list.forEach((t) => {
      totals[t.category] = (totals[t.category] || 0) + t.value;
    });
    return totals;
  },
  totalsByDay(list) {
    const totals = {};
    list.forEach((t) => {
      totals[t.date] = (totals[t.date] || 0) + t.value;
    });
    return totals;
  },
  render() {
    const label = this.currentDate.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    this.monthLabel.textContent = label.replace(/^./, (c) => c.toUpperCase());
    this.populateCategorySelects();
    this.renderKPIs();
    this.renderTable();
    this.renderCharts();
    this.renderCategories();
  },
  renderKPIs() {
    const list = this.getCurrentTransactions();
    const entradas = list.filter((t) => t.type === "entrada").reduce((sum, t) => sum + t.value, 0);
    const saidas = list.filter((t) => t.type === "saida").reduce((sum, t) => sum + t.value, 0);
    const saldo = entradas - saidas;
    const totalsByCategory = this.totalsByCategory(list.filter((t) => t.type === "saida"));
    const maxCategory = Object.entries(totalsByCategory).sort((a, b) => b[1] - a[1])[0];

    const items = [
      { label: "Saldo do mes", value: Utils.formatCurrency(saldo) },
      { label: "Total entradas", value: Utils.formatCurrency(entradas) },
      { label: "Total saidas", value: Utils.formatCurrency(saidas) },
      { label: "Maior gasto", value: maxCategory ? `${maxCategory[0]} (${Utils.formatCurrency(maxCategory[1])})` : "-" },
    ];

    this.kpiGrid.innerHTML = "";
    items.forEach((item) => {
      const card = document.createElement("div");
      card.className = "kpi-card";
      card.innerHTML = `<span>${item.label}</span><strong>${item.value}</strong>`;
      this.kpiGrid.appendChild(card);
    });
  },
  renderTable() {
    const list = this.getFilteredTransactions();
    this.tableBody.innerHTML = "";
    if (!list.length) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="6" class="muted">Nenhum lancamento encontrado.</td>`;
      this.tableBody.appendChild(tr);
      return;
    }
    list.forEach((t) => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${formatDate(t.date)}</td>
        <td>${t.type}</td>
        <td>${Utils.formatCurrency(t.value)}</td>
        <td>${t.category}</td>
        <td>${t.description || "-"}</td>
        <td>
          <button class="icon-btn" data-action="edit" data-id="${t.id}" aria-label="Editar">
            <img src="assets/icons/edit.svg" alt="" aria-hidden="true" />
          </button>
          <button class="icon-btn" data-action="delete" data-id="${t.id}" aria-label="Excluir">
            <img src="assets/icons/trash.svg" alt="" aria-hidden="true" />
          </button>
        </td>
      `;
      this.tableBody.appendChild(tr);
    });
  },
  renderCharts() {
    const list = this.getCurrentTransactions();
    const expenses = list.filter((t) => t.type === "saida");
    Charts.drawBarByCategory(this.barChart, this.totalsByCategory(expenses));
    Charts.drawBalanceLine(this.lineChart, this.buildBalanceSeries(list));
  },
  buildBalanceSeries(list) {
    const days = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 0).getDate();
    const series = [];
    let balance = 0;
    for (let day = 1; day <= days; day++) {
      const dateStr = Utils.toISO(new Date(this.currentDate.getFullYear(), this.currentDate.getMonth(), day));
      list
        .filter((t) => t.date === dateStr)
        .forEach((t) => {
          balance += t.type === "entrada" ? t.value : -t.value;
        });
      series.push(balance);
    }
    return series;
  },
  renderCategories() {
    this.categoryList.innerHTML = "";
    this.state.categories.forEach((cat, index) => {
      const row = document.createElement("div");
      row.className = "category-item";
      row.innerHTML = `
        <input type="text" value="${cat.name}" data-index="${index}" data-field="name" />
        <input type="number" min="0" step="0.01" value="${cat.limit}" data-index="${index}" data-field="limit" />
        <button class="icon-btn" data-remove="${index}" aria-label="Remover categoria">
          <img src="assets/icons/trash.svg" alt="" aria-hidden="true" />
        </button>
      `;
      this.categoryList.appendChild(row);
    });

    this.categoryList.querySelectorAll("input").forEach((input) => {
      input.addEventListener("input", () => {
        const index = Number(input.dataset.index);
        const field = input.dataset.field;
        if (field === "name") this.state.categories[index].name = input.value;
        if (field === "limit") this.state.categories[index].limit = Number(input.value) || 0;
        this.persist();
        this.render();
      });
    });

    this.categoryList.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const index = Number(btn.dataset.remove);
        this.state.categories.splice(index, 1);
        this.persist();
        this.render();
      });
    });
  },
  populateCategorySelects() {
    const options = this.state.categories
      .map((cat) => `<option value="${cat.name}">${cat.name}</option>`)
      .join("");
    this.filterCategory.innerHTML = `<option value="">Todas</option>${options}`;
    this.transactionForm.category.innerHTML = options;
  },
  showToast(message) {
    this.toast.textContent = message;
    this.toast.classList.add("show");
    clearTimeout(this.toast.timer);
    this.toast.timer = setTimeout(() => this.toast.classList.remove("show"), 2200);
  },
};

function generateId() {
  return `tx_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function formatDate(dateString) {
  const date = new Date(dateString);
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

function convertToCSV(list) {
  const headers = ["date", "type", "value", "category", "description"];
  const rows = list.map((item) =>
    headers
      .map((key) => `"${String(item[key] ?? "").replace(/"/g, '""')}"`)
      .join(";")
  );
  return [headers.join(";"), ...rows].join("\n");
}

UI.init();
