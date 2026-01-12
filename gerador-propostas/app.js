const DEFAULT_STATE = {
  template: "clean",
  emitter: {
    name: "Andre Vitor Diniz",
    role: "",
    email: "",
    whatsapp: "",
    linkedin: "",
  },
  client: {
    name: "",
    company: "",
    email: "",
    whatsapp: "",
  },
  items: [
    {
      id: generateId(),
      description: "",
      qty: 1,
      price: 0,
    },
  ],
  conditions: {
    discountType: "percent",
    discountValue: 0,
    delivery: "",
    validity: "",
    payment: "",
    support: "",
    notes: "",
  },
};

const Utils = {
  formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 2,
    }).format(value || 0);
  },
  parseNumber(value) {
    const number = Number(String(value).replace(/[^0-9.,-]/g, "").replace(",", "."));
    return Number.isNaN(number) ? 0 : number;
  },
  debounce(fn, wait = 200) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
  },
  sanitize(text) {
    return String(text || "").replace(/[<>]/g, "");
  },
  isValidEmail(email) {
    return !email || /\S+@\S+\.\S+/.test(email);
  },
};

const Store = {
  key: "proposal-draft-v1",
  load() {
    const raw = localStorage.getItem(this.key);
    if (!raw) return structuredClone(DEFAULT_STATE);
    try {
      const data = JSON.parse(raw);
      return { ...structuredClone(DEFAULT_STATE), ...data };
    } catch (error) {
      return structuredClone(DEFAULT_STATE);
    }
  },
  save(state) {
    localStorage.setItem(this.key, JSON.stringify(state));
  },
  reset() {
    localStorage.removeItem(this.key);
  },
};

const state = Store.load();

const elements = {
  form: document.getElementById("proposalForm"),
  itemsList: document.getElementById("itemsList"),
  previewEmitter: document.getElementById("previewEmitter"),
  previewClient: document.getElementById("previewClient"),
  previewItems: document.getElementById("previewItems"),
  previewTotals: document.getElementById("previewTotals"),
  previewConditions: document.getElementById("previewConditions"),
  previewFooter: document.getElementById("previewFooter"),
  previewSheet: document.getElementById("previewSheet"),
  templateButtons: document.querySelectorAll("[data-template]"),
  btnAddItem: document.getElementById("btnAddItem"),
  btnPrint: document.getElementById("btnPrint"),
  btnCopy: document.getElementById("btnCopy"),
  btnConfig: document.getElementById("btnConfig"),
  btnReset: document.getElementById("btnReset"),
  formError: document.getElementById("formError"),
  tabs: document.querySelectorAll(".tab"),
  split: document.querySelector(".split"),
  configModal: document.getElementById("configModal"),
  configForm: document.getElementById("configForm"),
  toast: document.getElementById("toast"),
};

function generateId() {
  return `item_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

function renderItemsForm() {
  elements.itemsList.innerHTML = "";
  state.items.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "item-card";
    card.innerHTML = `
      <div class="item-header">
        <h3>Item ${index + 1}</h3>
        <button class="icon-btn" type="button" data-remove="${item.id}" aria-label="Remover item">
          <img src="assets/icons/reset.svg" alt="" aria-hidden="true" />
        </button>
      </div>
      <label>
        Descricao*
        <input type="text" name="item-description" data-id="${item.id}" value="${Utils.sanitize(
          item.description
        )}" required />
      </label>
      <div class="grid-2">
        <label>
          Quantidade*
          <input type="number" min="1" step="1" name="item-qty" data-id="${item.id}" value="${
            item.qty
          }" required />
        </label>
        <label>
          Valor unitario*
          <input type="number" min="0.01" step="0.01" name="item-price" data-id="${item.id}" value="${
            item.price
          }" required />
        </label>
      </div>
    `;
    elements.itemsList.appendChild(card);
  });
}

function renderPreview() {
  elements.previewSheet.className = `preview-sheet template-${state.template}`;
  elements.previewEmitter.textContent = `${state.emitter.name} ${state.emitter.role || ""}`.trim();
  elements.previewClient.innerHTML = `
    <strong>Cliente:</strong> ${Utils.sanitize(state.client.name) || "-"}<br />
    <span>${Utils.sanitize(state.client.company)}</span><br />
    <span>${Utils.sanitize(state.client.email)}</span>
  `;

  elements.previewItems.innerHTML = "";
  let subtotal = 0;
  state.items.forEach((item) => {
    const itemSubtotal = item.qty * item.price;
    subtotal += itemSubtotal;
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${Utils.sanitize(item.description)}</td>
      <td>${item.qty}</td>
      <td>${Utils.formatCurrency(item.price)}</td>
      <td>${Utils.formatCurrency(itemSubtotal)}</td>
    `;
    elements.previewItems.appendChild(row);
  });

  const discount = calculateDiscount(subtotal);
  const total = Math.max(subtotal - discount, 0);

  elements.previewTotals.innerHTML = `
    <div>Subtotal: <strong>${Utils.formatCurrency(subtotal)}</strong></div>
    <div>Desconto: <strong>${Utils.formatCurrency(discount)}</strong></div>
    <div>Total: <strong>${Utils.formatCurrency(total)}</strong></div>
  `;

  elements.previewConditions.innerHTML = `
    <strong>Condicoes:</strong><br />
    Prazo de entrega: ${Utils.sanitize(state.conditions.delivery) || "-"}<br />
    Validade: ${Utils.sanitize(state.conditions.validity) || "-"}<br />
    Pagamento: ${Utils.sanitize(state.conditions.payment) || "-"}<br />
    Suporte: ${Utils.sanitize(state.conditions.support) || "-"}
  `;

  elements.previewFooter.innerHTML = `
    <div>Observacoes: ${Utils.sanitize(state.conditions.notes) || "-"}</div>
    <div>${new Date().toLocaleDateString("pt-BR")}</div>
    <div>Assinatura: ${Utils.sanitize(state.emitter.name)}</div>
  `;
}

function calculateDiscount(subtotal) {
  const type = state.conditions.discountType;
  const value = Number(state.conditions.discountValue) || 0;
  if (type === "percent") {
    const limited = Math.min(Math.max(value, 0), 100);
    return subtotal * (limited / 100);
  }
  return Math.min(value, subtotal);
}

function updateStateFromForm() {
  state.client.name = elements.form.clientName.value.trim();
  state.client.company = elements.form.clientCompany.value.trim();
  state.client.email = elements.form.clientEmail.value.trim();
  state.client.whatsapp = elements.form.clientWhatsapp.value.trim();

  state.conditions.discountType = elements.form.discountType.value;
  state.conditions.discountValue = Utils.parseNumber(elements.form.discountValue.value);
  state.conditions.delivery = elements.form.delivery.value.trim();
  state.conditions.validity = elements.form.validity.value.trim();
  state.conditions.payment = elements.form.payment.value.trim();
  state.conditions.support = elements.form.support.value.trim();
  state.conditions.notes = elements.form.notes.value.trim();
}

function validateForm() {
  if (!state.client.name) return "Nome do cliente e obrigatorio.";
  if (!Utils.isValidEmail(state.client.email)) return "Email invalido.";
  if (!state.items.length) return "Adicione pelo menos um item.";
  for (const item of state.items) {
    if (!item.description.trim()) return "Descricao do item obrigatoria.";
    if (item.qty < 1 || item.price <= 0) return "Quantidade e valor devem ser validos.";
  }
  return "";
}

const autosave = Utils.debounce(() => {
  updateStateFromForm();
  Store.save(state);
  renderPreview();
}, 250);

function addItem() {
  state.items.push({ id: generateId(), description: "", qty: 1, price: 0 });
  renderItemsForm();
  renderPreview();
  Store.save(state);
}

function removeItem(id) {
  if (state.items.length === 1) {
    showToast("Mantenha pelo menos 1 item.");
    return;
  }
  state.items = state.items.filter((item) => item.id !== id);
  renderItemsForm();
  renderPreview();
  Store.save(state);
}

function handleCopy() {
  const subtotal = state.items.reduce((sum, item) => sum + item.qty * item.price, 0);
  const discount = calculateDiscount(subtotal);
  const total = Math.max(subtotal - discount, 0);
  const summary = `Proposta para ${state.client.name}. Total: ${Utils.formatCurrency(total)}. Entrega: ${
    state.conditions.delivery || "-"
  }. Validade: ${state.conditions.validity || "-"}. Contato: ${
    state.emitter.email || "-"
  }.`;
  navigator.clipboard
    .writeText(summary)
    .then(() => showToast("Resumo copiado."))
    .catch(() => showToast("Nao foi possivel copiar."));
}

function handleTemplateChange(template) {
  state.template = template;
  elements.templateButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.template === template));
  renderPreview();
  Store.save(state);
}

function applyStateToForm() {
  elements.form.clientName.value = state.client.name;
  elements.form.clientCompany.value = state.client.company;
  elements.form.clientEmail.value = state.client.email;
  elements.form.clientWhatsapp.value = state.client.whatsapp;
  elements.form.discountType.value = state.conditions.discountType;
  elements.form.discountValue.value = state.conditions.discountValue;
  elements.form.delivery.value = state.conditions.delivery;
  elements.form.validity.value = state.conditions.validity;
  elements.form.payment.value = state.conditions.payment;
  elements.form.support.value = state.conditions.support;
  elements.form.notes.value = state.conditions.notes;
}

function openModal(modal) {
  modal.hidden = false;
  const focusable = modal.querySelector(".modal-content");
  if (focusable) focusable.focus();
}

function closeModal(modal) {
  modal.hidden = true;
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  clearTimeout(elements.toast.timer);
  elements.toast.timer = setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2200);
}

function bindEvents() {
  elements.form.addEventListener("input", autosave);
  elements.itemsList.addEventListener("input", (event) => {
    const id = event.target.dataset.id;
    if (!id) return;
    const item = state.items.find((entry) => entry.id === id);
    if (!item) return;
    if (event.target.name === "item-description") item.description = event.target.value;
    if (event.target.name === "item-qty") item.qty = Number(event.target.value) || 1;
    if (event.target.name === "item-price") item.price = Number(event.target.value) || 0;
    Store.save(state);
    renderPreview();
  });
  elements.itemsList.addEventListener("click", (event) => {
    const removeBtn = event.target.closest("[data-remove]");
    if (removeBtn) removeItem(removeBtn.dataset.remove);
  });
  elements.btnAddItem.addEventListener("click", addItem);
  elements.btnPrint.addEventListener("click", () => {
    const error = validateForm();
    elements.formError.textContent = error;
    if (error) return;
    window.print();
  });
  elements.btnCopy.addEventListener("click", handleCopy);
  elements.btnConfig.addEventListener("click", () => openModal(elements.configModal));
  elements.btnReset.addEventListener("click", () => {
    const confirmReset = window.confirm("Deseja resetar o rascunho?");
    if (!confirmReset) return;
    Object.assign(state, structuredClone(DEFAULT_STATE));
    Store.reset();
    applyStateToForm();
    renderItemsForm();
    renderPreview();
    showToast("Rascunho resetado.");
  });

  elements.templateButtons.forEach((btn) => {
    btn.addEventListener("click", () => handleTemplateChange(btn.dataset.template));
  });

  elements.configForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(elements.configForm);
    state.emitter.name = data.get("emitterName").trim();
    state.emitter.role = data.get("emitterRole").trim();
    state.emitter.email = data.get("emitterEmail").trim();
    state.emitter.whatsapp = data.get("emitterWhatsapp").trim();
    state.emitter.linkedin = data.get("emitterLinkedin").trim();
    Store.save(state);
    renderPreview();
    closeModal(elements.configModal);
    showToast("Emitente atualizado.");
  });

  document.body.addEventListener("click", (event) => {
    const closeTarget = event.target.closest("[data-close]");
    if (closeTarget) closeModal(document.getElementById(closeTarget.dataset.close));
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeModal(elements.configModal);
  });

  elements.tabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      elements.tabs.forEach((btn) => btn.classList.remove("active"));
      tab.classList.add("active");
      elements.split.classList.toggle("preview", tab.dataset.tab === "preview");
    });
  });
}

function init() {
  applyStateToForm();
  renderItemsForm();
  renderPreview();
  handleTemplateChange(state.template);
  elements.configForm.emitterName.value = state.emitter.name;
  elements.configForm.emitterRole.value = state.emitter.role;
  elements.configForm.emitterEmail.value = state.emitter.email;
  elements.configForm.emitterWhatsapp.value = state.emitter.whatsapp;
  elements.configForm.emitterLinkedin.value = state.emitter.linkedin;
  bindEvents();
}

init();
