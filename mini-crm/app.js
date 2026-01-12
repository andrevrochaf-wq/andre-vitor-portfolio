const STATUS_LABELS = {
  novo: "Novo",
  contato: "Contato",
  proposta: "Proposta",
  fechado: "Fechado",
  perdido: "Perdido",
};

const STATUS_ORDER = ["novo", "contato", "proposta", "fechado", "perdido"];
const STORAGE_KEY = "mini-crm-leads";

const DataStore = {
  load() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        leads: [],
        settings: { view: "kanban", reduceMotion: null },
      };
    }
    try {
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        return { leads: data, settings: { view: "kanban", reduceMotion: null } };
      }
      return {
        leads: Array.isArray(data.leads) ? data.leads : [],
        settings: data.settings || { view: "kanban", reduceMotion: null },
      };
    } catch (error) {
      return { leads: [], settings: { view: "kanban", reduceMotion: null } };
    }
  },
  save(state) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  },
};

const Renderer = {
  renderAll(state, filteredLeads, allLeads) {
    this.renderLeadCount(filteredLeads.length);
    this.renderPriorities(allLeads);
    if (state.settings.view === "kanban") {
      this.renderKanban(filteredLeads);
    } else {
      this.renderList(filteredLeads);
    }
  },
  renderLeadCount(count) {
    const el = document.getElementById("leadCount");
    el.textContent = `${count} lead${count === 1 ? "" : "s"} na visualizacao atual`;
  },
  renderPriorities(leads) {
    const container = document.getElementById("priorityList");
    container.innerHTML = "";
    const today = startOfDay(new Date());
    const priorities = leads
      .filter((lead) => lead.followup)
      .map((lead) => ({
        ...lead,
        followupDate: startOfDay(new Date(lead.followup)),
      }))
      .filter((lead) => lead.followupDate <= today)
      .sort((a, b) => a.followupDate - b.followupDate)
      .slice(0, 5);

    if (priorities.length === 0) {
      container.innerHTML = `<div class="muted">Sem follow-ups urgentes hoje.</div>`;
      return;
    }

    priorities.forEach((lead) => {
      const badge = lead.followupDate < today ? "Atrasado" : "Hoje";
      const card = document.createElement("div");
      card.className = "priority-card";
      card.innerHTML = `
        <div class="badge">${badge}</div>
        <strong>${lead.nome}</strong>
        <span class="muted">${STATUS_LABELS[lead.status] || ""} &middot; ${lead.origem || ""}</span>
        <span class="muted">${lead.acao || "Sem proxima acao"}</span>
      `;
      container.appendChild(card);
    });
  },
  renderKanban(leads) {
    const board = document.getElementById("kanbanBoard");
    board.innerHTML = "";
    STATUS_ORDER.forEach((status) => {
      const column = document.createElement("div");
      column.className = "column";
      column.dataset.status = status;
      column.innerHTML = `
        <div class="column-header">
          <h3>${STATUS_LABELS[status]}</h3>
          <span class="count">${leads.filter((lead) => lead.status === status).length}</span>
        </div>
        <div class="column-body" data-dropzone="true"></div>
      `;
      const body = column.querySelector(".column-body");
      leads
        .filter((lead) => lead.status === status)
        .forEach((lead) => body.appendChild(this.renderCard(lead)));
      board.appendChild(column);
    });
    board.hidden = false;
    document.getElementById("listView").hidden = true;
  },
  renderCard(lead) {
    const card = document.createElement("div");
    card.className = "lead-card";
    card.draggable = true;
    card.dataset.id = lead.id;
    const follow = formatFollowupBadge(lead.followup);
    const value = lead.valor ? formatCurrency(lead.valor) : "-";
    card.innerHTML = `
      <div class="card-top">
        <span class="card-title">${lead.nome}</span>
        <span class="tag">${lead.origem || "-"}</span>
      </div>
      <div class="card-meta">
        <span>Proxima acao: ${lead.acao || "-"}</span>
        <span>Follow-up: ${follow.label}</span>
        <span>Valor: ${value}</span>
      </div>
      <div class="card-actions">
        <button class="icon-btn" data-action="edit" aria-label="Editar lead">
          <img src="assets/icons/edit.svg" alt="" aria-hidden="true" />
        </button>
        <button class="icon-btn" data-action="delete" aria-label="Excluir lead">
          <img src="assets/icons/trash.svg" alt="" aria-hidden="true" />
        </button>
      </div>
    `;
    if (follow.status) {
      card.dataset.followup = follow.status;
    }
    return card;
  },
  renderList(leads) {
    const body = document.getElementById("listBody");
    body.innerHTML = "";
    leads.forEach((lead) => {
      const tr = document.createElement("tr");
      const follow = formatFollowupBadge(lead.followup);
      tr.innerHTML = `
        <td>
          <strong>${lead.nome}</strong><br />
          <span class="muted">${lead.email || lead.telefone || "-"}</span>
        </td>
        <td>${lead.origem || "-"}</td>
        <td>${STATUS_LABELS[lead.status]}</td>
        <td>${lead.acao || "-"}</td>
        <td>${follow.label}</td>
        <td>${lead.valor ? formatCurrency(lead.valor) : "-"}</td>
        <td>${formatDate(lead.updatedAt)}</td>
        <td>
          <button class="icon-btn" data-action="edit" data-id="${lead.id}" aria-label="Editar lead">
            <img src="assets/icons/edit.svg" alt="" aria-hidden="true" />
          </button>
          <button class="icon-btn" data-action="delete" data-id="${lead.id}" aria-label="Excluir lead">
            <img src="assets/icons/trash.svg" alt="" aria-hidden="true" />
          </button>
        </td>
      `;
      if (follow.status) {
        tr.dataset.followup = follow.status;
      }
      body.appendChild(tr);
    });
    document.getElementById("kanbanBoard").hidden = true;
    document.getElementById("listView").hidden = false;
  },
};

const Controller = {
  state: DataStore.load(),
  filters: {
    search: "",
    status: "",
    origem: "",
    sort: "recente",
  },
  currentLeadId: null,
  init() {
    this.cacheElements();
    this.bindEvents();
    this.applySettings();
    this.render();
    document.getElementById("footerDate").textContent = formatDate(new Date().toISOString());
  },
  cacheElements() {
    this.searchInput = document.getElementById("searchInput");
    this.filterStatus = document.getElementById("filterStatus");
    this.filterOrigem = document.getElementById("filterOrigem");
    this.sortBy = document.getElementById("sortBy");
    this.btnAdd = document.getElementById("btnAdd");
    this.btnToggleView = document.getElementById("btnToggleView");
    this.btnExport = document.getElementById("btnExport");
    this.btnImport = document.getElementById("btnImport");
    this.btnSettings = document.getElementById("btnSettings");
    this.leadModal = document.getElementById("leadModal");
    this.importModal = document.getElementById("importModal");
    this.settingsModal = document.getElementById("settingsModal");
    this.leadForm = document.getElementById("leadForm");
    this.importForm = document.getElementById("importForm");
    this.toggleMotion = document.getElementById("toggleMotion");
    this.btnReset = document.getElementById("btnReset");
    this.toast = document.getElementById("toast");
  },
  bindEvents() {
    this.searchInput.addEventListener("input", (event) => {
      this.filters.search = event.target.value.trim();
      this.render();
    });
    this.filterStatus.addEventListener("change", (event) => {
      this.filters.status = event.target.value;
      this.render();
    });
    this.filterOrigem.addEventListener("change", (event) => {
      this.filters.origem = event.target.value;
      this.render();
    });
    this.sortBy.addEventListener("change", (event) => {
      this.filters.sort = event.target.value;
      this.render();
    });
    this.btnAdd.addEventListener("click", () => this.openLeadModal());
    this.btnToggleView.addEventListener("click", () => this.toggleView());
    this.btnExport.addEventListener("click", () => this.exportData());
    this.btnImport.addEventListener("click", () => this.openModal(this.importModal));
    this.btnSettings.addEventListener("click", () => this.openModal(this.settingsModal));
    this.btnReset.addEventListener("click", () => this.resetData());
    this.toggleMotion.addEventListener("change", () => {
      this.state.settings.reduceMotion = this.toggleMotion.checked;
      this.applyMotionPreference();
      this.persist();
    });
    this.leadForm.addEventListener("submit", (event) => this.handleFormSubmit(event));
    this.importForm.addEventListener("submit", (event) => this.handleImport(event));

    document.body.addEventListener("click", (event) => {
      const closeTarget = event.target.closest("[data-close]");
      if (closeTarget) {
        this.closeModal(document.getElementById(closeTarget.dataset.close));
        return;
      }
      const actionButton = event.target.closest("[data-action]");
      if (actionButton) {
        const action = actionButton.dataset.action;
        const id = actionButton.dataset.id || actionButton.closest(".lead-card")?.dataset.id;
        if (action === "edit") this.openLeadModal(id);
        if (action === "delete") this.deleteLead(id);
      }
    });

    document.body.addEventListener("dragstart", (event) => {
      const card = event.target.closest(".lead-card");
      if (!card) return;
      card.classList.add("dragging");
      event.dataTransfer.setData("text/plain", card.dataset.id);
    });

    document.body.addEventListener("dragend", (event) => {
      const card = event.target.closest(".lead-card");
      if (card) card.classList.remove("dragging");
    });

    document.body.addEventListener("dragover", (event) => {
      if (event.target.closest("[data-dropzone]") || event.target.closest(".column")) {
        event.preventDefault();
      }
    });

    document.body.addEventListener("drop", (event) => {
      const column = event.target.closest(".column");
      if (!column) return;
      event.preventDefault();
      const id = event.dataTransfer.getData("text/plain");
      if (!id) return;
      this.moveLead(id, column.dataset.status);
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "/") {
        event.preventDefault();
        this.searchInput.focus();
      }
      if (event.key.toLowerCase() === "n") {
        this.openLeadModal();
      }
      if (event.key.toLowerCase() === "k") {
        this.toggleView();
      }
    });
  },
  applySettings() {
    this.applyMotionPreference();
    this.btnToggleView.textContent = this.state.settings.view === "kanban" ? "Kanban" : "Lista";
  },
  applyMotionPreference() {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stored = this.state.settings.reduceMotion;
    const reduce = stored === null ? prefersReduced.matches : stored;
    document.body.classList.toggle("reduce-motion", reduce);
    this.toggleMotion.checked = stored === null ? prefersReduced.matches : stored;
  },
  persist() {
    DataStore.save(this.state);
  },
  getFilteredLeads() {
    const search = this.filters.search.toLowerCase();
    let leads = [...this.state.leads];

    if (search) {
      leads = leads.filter((lead) => {
        return (
          lead.nome.toLowerCase().includes(search) ||
          (lead.telefone || "").toLowerCase().includes(search) ||
          (lead.email || "").toLowerCase().includes(search)
        );
      });
    }

    if (this.filters.status) {
      leads = leads.filter((lead) => lead.status === this.filters.status);
    }

    if (this.filters.origem) {
      leads = leads.filter((lead) => lead.origem === this.filters.origem);
    }

    leads.sort((a, b) => this.sortLeads(a, b));
    return leads;
  },
  sortLeads(a, b) {
    switch (this.filters.sort) {
      case "nome":
        return a.nome.localeCompare(b.nome, "pt-BR");
      case "valor":
        return (b.valor || 0) - (a.valor || 0);
      case "followup":
        return sortByFollowup(a, b);
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  },
  render() {
    const leads = this.getFilteredLeads();
    Renderer.renderAll(this.state, leads, this.state.leads);
  },
  openModal(modal) {
    modal.hidden = false;
  },
  closeModal(modal) {
    modal.hidden = true;
    if (modal === this.leadModal) {
      this.currentLeadId = null;
    }
  },
  openLeadModal(id) {
    this.currentLeadId = id || null;
    const title = document.getElementById("leadModalTitle");
    this.leadForm.reset();
    if (id) {
      const lead = this.state.leads.find((item) => item.id === id);
      if (lead) {
        title.textContent = "Editar lead";
        this.leadForm.nome.value = lead.nome;
        this.leadForm.telefone.value = lead.telefone || "";
        this.leadForm.email.value = lead.email || "";
        this.leadForm.origem.value = lead.origem || "Outro";
        this.leadForm.status.value = lead.status;
        this.leadForm.valor.value = lead.valor || "";
        this.leadForm.acao.value = lead.acao || "";
        this.leadForm.followup.value = lead.followup || "";
        this.leadForm.observacoes.value = lead.observacoes || "";
      }
    } else {
      title.textContent = "Novo lead";
      this.leadForm.status.value = "novo";
    }
    this.openModal(this.leadModal);
  },
  handleFormSubmit(event) {
    event.preventDefault();
    const data = new FormData(this.leadForm);
    const nome = data.get("nome").trim();
    const email = data.get("email").trim();

    if (!nome) {
      this.showToast("Nome e obrigatorio.");
      return;
    }

    if (email && !isValidEmail(email)) {
      this.showToast("Email invalido.");
      return;
    }

    const now = new Date().toISOString();
    const payload = {
      nome,
      telefone: data.get("telefone").trim(),
      email,
      origem: data.get("origem"),
      status: data.get("status"),
      valor: parseFloat(data.get("valor")) || 0,
      acao: data.get("acao").trim(),
      followup: data.get("followup"),
      observacoes: data.get("observacoes").trim(),
      updatedAt: now,
    };

    if (this.currentLeadId) {
      const index = this.state.leads.findIndex((lead) => lead.id === this.currentLeadId);
      if (index >= 0) {
        this.state.leads[index] = {
          ...this.state.leads[index],
          ...payload,
        };
      }
      this.showToast("Lead atualizado.");
    } else {
      let newId = generateId();
      while (this.state.leads.some((lead) => lead.id === newId)) {
        newId = generateId();
      }
      this.state.leads.unshift({
        ...payload,
        id: newId,
        createdAt: now,
      });
      this.showToast("Lead criado.");
    }

    this.persist();
    this.closeModal(this.leadModal);
    this.currentLeadId = null;
    this.render();
  },
  deleteLead(id) {
    if (!id) return;
    const confirmed = window.confirm("Deseja excluir este lead?");
    if (!confirmed) return;
    this.state.leads = this.state.leads.filter((lead) => lead.id !== id);
    this.persist();
    this.render();
    this.showToast("Lead removido.");
  },
  moveLead(id, newStatus) {
    const lead = this.state.leads.find((item) => item.id === id);
    if (!lead || lead.status === newStatus) return;
    lead.status = newStatus;
    lead.updatedAt = new Date().toISOString();
    this.persist();
    this.render();
    this.showToast(`Movido para ${STATUS_LABELS[newStatus]}.`);
  },
  toggleView() {
    this.state.settings.view = this.state.settings.view === "kanban" ? "lista" : "kanban";
    this.btnToggleView.textContent = this.state.settings.view === "kanban" ? "Kanban" : "Lista";
    this.persist();
    this.render();
  },
  exportData() {
    const jsonBlob = new Blob([JSON.stringify(this.state.leads, null, 2)], {
      type: "application/json",
    });
    downloadFile(jsonBlob, "leads.json");

    const csvBlob = new Blob([convertToCSV(this.state.leads)], {
      type: "text/csv;charset=utf-8;",
    });
    downloadFile(csvBlob, "leads.csv");
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
        if (!Array.isArray(data)) {
          this.showToast("JSON invalido.");
          return;
        }
        const validLeads = data.filter((item) => item.nome && item.status);
        if (mode === "replace") {
          const confirmReplace = window.confirm("Isso vai substituir todos os dados atuais. Continuar?");
          if (!confirmReplace) return;
          this.state.leads = validLeads.map((lead) => normalizeLead(lead));
        } else {
          const existingIds = new Set(this.state.leads.map((lead) => lead.id));
          validLeads.forEach((lead) => {
            const normalized = normalizeLead(lead);
            if (!normalized.id || existingIds.has(normalized.id)) {
              normalized.id = generateId();
            }
            this.state.leads.push(normalized);
          });
        }
        this.persist();
        this.render();
        this.closeModal(this.importModal);
        this.showToast("Importacao concluida.");
      } catch (error) {
        this.showToast("Erro ao importar JSON.");
      }
    };
    reader.readAsText(file);
  },
  resetData() {
    const confirmed = window.confirm("Tem certeza que deseja resetar todos os dados?");
    if (!confirmed) return;
    this.state.leads = [];
    this.persist();
    this.render();
    this.showToast("Dados resetados.");
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
  return `lead_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function startOfDay(date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatFollowupBadge(dateString) {
  if (!dateString) return { label: "-", status: null };
  const date = startOfDay(new Date(dateString));
  const today = startOfDay(new Date());
  if (date < today) return { label: "Atrasado", status: "overdue" };
  if (date.getTime() === today.getTime()) return { label: "Hoje", status: "today" };
  return { label: formatDate(dateString), status: null };
}

function sortByFollowup(a, b) {
  if (!a.followup && !b.followup) return 0;
  if (!a.followup) return 1;
  if (!b.followup) return -1;
  return new Date(a.followup) - new Date(b.followup);
}

function isValidEmail(email) {
  return /\S+@\S+\.\S+/.test(email);
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

function convertToCSV(leads) {
  const headers = [
    "id",
    "nome",
    "telefone",
    "email",
    "origem",
    "status",
    "valor",
    "acao",
    "followup",
    "observacoes",
    "createdAt",
    "updatedAt",
  ];
  const rows = leads.map((lead) =>
    headers
      .map((key) => {
        const value = lead[key] ?? "";
        return `"${String(value).replace(/"/g, '""')}"`;
      })
      .join(",")
  );
  return [headers.join(","), ...rows].join("\n");
}

function normalizeLead(lead) {
  return {
    id: lead.id || generateId(),
    nome: lead.nome,
    telefone: lead.telefone || "",
    email: lead.email || "",
    origem: lead.origem || "Outro",
    status: lead.status || "novo",
    valor: parseFloat(lead.valor) || 0,
    acao: lead.acao || "",
    followup: lead.followup || "",
    observacoes: lead.observacoes || "",
    createdAt: lead.createdAt || new Date().toISOString(),
    updatedAt: lead.updatedAt || new Date().toISOString(),
  };
}

Controller.init();
