const state = {
  health: null,
  crawlerStores: [],
  dealSources: [],
  topProfits: [],
  marketplaceAdvice: [],
  marketplaceAdvisorProduct: null,
  inventory: [],
  inventorySummary: {},
  alerts: [],
  history: [],
  watchlist: [],
  watchlistFilters: {
    search: "",
    category: ""
  },
  pendingDeleteId: null,
  cachedLastRun: readCachedLastRun()
};

const elements = {
  syncState: document.querySelector("#sync-state"),
  lastUpdated: document.querySelector("#last-updated"),
  systemStatus: document.querySelector("#system-status"),
  systemDetail: document.querySelector("#system-detail"),
  systemDot: document.querySelector("#system-dot"),
  whatsappStatus: document.querySelector("#whatsapp-status"),
  whatsappDetail: document.querySelector("#whatsapp-detail"),
  whatsappDot: document.querySelector("#whatsapp-dot"),
  lastRun: document.querySelector("#last-run"),
  lastRunDetail: document.querySelector("#last-run-detail"),
  productsFound: document.querySelector("#products-found"),
  opportunitiesFound: document.querySelector("#opportunities-found"),
  alertsSent: document.querySelector("#alerts-sent"),
  storesCount: document.querySelector("#stores-count"),
  storesStatusList: document.querySelector("#stores-status-list"),
  dealSourcesCount: document.querySelector("#deal-sources-count"),
  dealSourcesStatusList: document.querySelector("#deal-sources-status-list"),
  profitForm: document.querySelector("#profit-form"),
  profitBuy: document.querySelector("#profit-buy"),
  profitSell: document.querySelector("#profit-sell"),
  profitMarketplace: document.querySelector("#profit-marketplace"),
  profitShipping: document.querySelector("#profit-shipping"),
  profitPackaging: document.querySelector("#profit-packaging"),
  profitSubmit: document.querySelector("#profit-submit"),
  profitGross: document.querySelector("#profit-gross"),
  profitNet: document.querySelector("#profit-net"),
  profitRoi: document.querySelector("#profit-roi"),
  profitFees: document.querySelector("#profit-fees"),
  profitRecommended: document.querySelector("#profit-recommended"),
  topProfitsCount: document.querySelector("#top-profits-count"),
  topProfitsList: document.querySelector("#top-profits-list"),
  marketplaceAdvisorProduct: document.querySelector("#marketplace-advisor-product"),
  marketplaceAdvisorContent: document.querySelector("#marketplace-advisor-content"),
  inventoryProducts: document.querySelector("#inventory-products"),
  inventoryQuantity: document.querySelector("#inventory-quantity"),
  inventoryCost: document.querySelector("#inventory-cost"),
  inventorySaleValue: document.querySelector("#inventory-sale-value"),
  inventoryProfit: document.querySelector("#inventory-profit"),
  inventoryTableBody: document.querySelector("#inventory-table-body"),
  inventoryAddButton: document.querySelector("#inventory-add-button"),
  inventoryDialog: document.querySelector("#inventory-dialog"),
  inventoryDialogClose: document.querySelector("#inventory-dialog-close"),
  inventoryForm: document.querySelector("#inventory-form"),
  inventoryName: document.querySelector("#inventory-name"),
  inventorySku: document.querySelector("#inventory-sku"),
  inventoryCategory: document.querySelector("#inventory-category"),
  inventoryItemQuantity: document.querySelector("#inventory-item-quantity"),
  inventoryPurchasePrice: document.querySelector("#inventory-purchase-price"),
  inventorySellPrice: document.querySelector("#inventory-sell-price"),
  inventoryMarketplace: document.querySelector("#inventory-marketplace"),
  inventoryNotes: document.querySelector("#inventory-notes"),
  inventoryFeedback: document.querySelector("#inventory-feedback"),
  inventoryCancel: document.querySelector("#inventory-cancel"),
  inventorySubmit: document.querySelector("#inventory-submit"),
  movementDialog: document.querySelector("#movement-dialog"),
  movementDialogTitle: document.querySelector("#movement-dialog-title"),
  movementDialogClose: document.querySelector("#movement-dialog-close"),
  movementForm: document.querySelector("#movement-form"),
  movementItemId: document.querySelector("#movement-item-id"),
  movementType: document.querySelector("#movement-type"),
  movementProductName: document.querySelector("#movement-product-name"),
  movementQuantityLabel: document.querySelector("#movement-quantity-label"),
  movementQuantity: document.querySelector("#movement-quantity"),
  movementUnitPrice: document.querySelector("#movement-unit-price"),
  movementNotes: document.querySelector("#movement-notes"),
  movementFeedback: document.querySelector("#movement-feedback"),
  movementCancel: document.querySelector("#movement-cancel"),
  movementSubmit: document.querySelector("#movement-submit"),
  alertsCount: document.querySelector("#alerts-count"),
  alertsTableBody: document.querySelector("#alerts-table-body"),
  historyCount: document.querySelector("#history-count"),
  historyList: document.querySelector("#history-list"),
  watchlistCount: document.querySelector("#watchlist-count"),
  watchlistResultCount: document.querySelector("#watchlist-result-count"),
  watchlistTableBody: document.querySelector("#watchlist-table-body"),
  watchlistSearch: document.querySelector("#watchlist-search"),
  watchlistCategoryFilter: document.querySelector("#watchlist-category-filter"),
  newProductButton: document.querySelector("#new-product-button"),
  watchlistDialog: document.querySelector("#watchlist-dialog"),
  watchlistDialogTitle: document.querySelector("#watchlist-dialog-title"),
  watchlistDialogClose: document.querySelector("#watchlist-dialog-close"),
  watchlistForm: document.querySelector("#watchlist-form"),
  watchlistId: document.querySelector("#watchlist-id"),
  watchlistName: document.querySelector("#watchlist-name"),
  watchlistQuery: document.querySelector("#watchlist-query"),
  watchlistMaxBuyPrice: document.querySelector("#watchlist-max-buy-price"),
  watchlistExpectedSellPrice: document.querySelector("#watchlist-expected-sell-price"),
  watchlistMinMargin: document.querySelector("#watchlist-min-margin"),
  watchlistCategory: document.querySelector("#watchlist-category"),
  watchlistPriority: document.querySelector("#watchlist-priority"),
  watchlistEnabled: document.querySelector("#watchlist-enabled"),
  watchlistStoreInputs: document.querySelectorAll('input[name="allowedStores"]'),
  watchlistFormFeedback: document.querySelector("#watchlist-form-feedback"),
  watchlistFormCancel: document.querySelector("#watchlist-form-cancel"),
  watchlistFormSubmit: document.querySelector("#watchlist-form-submit"),
  deleteDialog: document.querySelector("#delete-dialog"),
  deleteDialogClose: document.querySelector("#delete-dialog-close"),
  deleteProductName: document.querySelector("#delete-product-name"),
  deleteCancelButton: document.querySelector("#delete-cancel-button"),
  deleteConfirmButton: document.querySelector("#delete-confirm-button"),
  radarRunButton: document.querySelector("#radar-run-button"),
  whatsappTestButton: document.querySelector("#whatsapp-test-button"),
  toast: document.querySelector("#toast")
};

let toastTimer;

function readCachedLastRun() {
  try {
    return JSON.parse(localStorage.getItem("radarVoltix.lastRun")) || null;
  } catch (_error) {
    return null;
  }
}

function cacheLastRun(summary) {
  if (!summary) {
    return;
  }

  state.cachedLastRun = summary;
  localStorage.setItem("radarVoltix.lastRun", JSON.stringify(summary));
}

async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const knownReasons = {
      missing_target_number: "Configure o número de destino do WhatsApp no arquivo .env.",
      whatsapp_not_ready: "O WhatsApp ainda não está pronto para enviar mensagens."
    };
    const message = knownReasons[payload.reason] || payload.error || payload.reason || `Falha HTTP ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function safeUrl(value) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value, window.location.origin);
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch (_error) {
    return null;
  }
}

function formatCurrency(value) {
  const amount = Number(value);
  if (!Number.isFinite(amount)) {
    return "--";
  }

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(amount);
}

function parseDate(value) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateTime(value) {
  const date = parseDate(value);
  if (!date) {
    return "--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatDuration(seconds) {
  const total = Math.max(0, Number(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}min`;
  }

  if (minutes > 0) {
    return `${minutes}min`;
  }

  return `${Math.floor(total)}s`;
}

function getRunDuration(summary) {
  const startedAt = parseDate(summary?.startedAt);
  const finishedAt = parseDate(summary?.finishedAt);

  if (!startedAt || !finishedAt) {
    return null;
  }

  return Math.max(0, Math.round((finishedAt - startedAt) / 1000));
}

function setDot(element, status) {
  element.className = `status-dot status-dot--${status}`;
}

function pluralize(count, singular, plural) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function getLastRun() {
  return state.health?.radar?.lastRun || state.cachedLastRun;
}

function renderHealth() {
  const health = state.health;
  const isOnline = health?.status === "ok";

  elements.systemStatus.textContent = isOnline ? "Operacional" : "Indisponível";
  elements.systemDetail.textContent = isOnline
    ? `Ativo há ${formatDuration(health.uptimeSeconds)}`
    : "Sem resposta do serviço local";
  setDot(elements.systemDot, isOnline ? "online" : "offline");

  const whatsapp = health?.whatsapp;
  let whatsappLabel = "Indisponível";
  let whatsappDetail = "Sem dados da sessão";
  let whatsappDot = "offline";

  if (whatsapp) {
    if (!whatsapp.hasTargetNumber) {
      whatsappLabel = "Não configurado";
      whatsappDetail = "Número de destino ausente";
      whatsappDot = "warning";
    } else if (whatsapp.ready) {
      whatsappLabel = "Conectado";
      whatsappDetail = "Pronto para enviar alertas";
      whatsappDot = "online";
    } else if (whatsapp.initialized) {
      whatsappLabel = "Conectando";
      whatsappDetail = whatsapp.lastQrAt ? "Aguardando autenticação" : "Iniciando sessão";
      whatsappDot = "warning";
    } else {
      whatsappLabel = "Desconectado";
      whatsappDetail = whatsapp.lastError ? "Falha ao conectar à sessão" : "Sessão não iniciada";
    }
  }

  elements.whatsappStatus.textContent = whatsappLabel;
  elements.whatsappDetail.textContent = whatsappDetail;
  setDot(elements.whatsappDot, whatsappDot);

  const running = Boolean(health?.radar?.running);
  const lastRun = getLastRun();

  if (running) {
    elements.lastRun.textContent = "Em execução";
    elements.lastRunDetail.textContent = "Buscando preços nas lojas";
  } else if (lastRun) {
    elements.lastRun.textContent = formatDateTime(lastRun.finishedAt || lastRun.startedAt);
    const duration = getRunDuration(lastRun);
    elements.lastRunDetail.textContent = duration === null
      ? `Origem: ${lastRun.source || "manual"}`
      : `${formatDuration(duration)} · ${lastRun.source || "manual"}`;
  } else {
    elements.lastRun.textContent = "Nenhuma";
    elements.lastRunDetail.textContent = "Aguardando primeira busca";
  }

  elements.productsFound.textContent = lastRun?.productsFound ?? "--";
  elements.opportunitiesFound.textContent = lastRun?.opportunitiesFound ?? "--";
  elements.alertsSent.textContent = lastRun?.alertsSent ?? "--";

  elements.radarRunButton.disabled = running;
  elements.radarRunButton.textContent = running ? "Radar em execução..." : "Executar Radar Agora";
}

function formatTime(value) {
  const date = parseDate(value);
  if (!date) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function getCrawlerPresentation(status) {
  if (["success", "empty"].includes(status)) {
    return { dot: "online", label: "OK" };
  }

  if (["timeout", "partial"].includes(status)) {
    return { dot: "warning", label: status === "timeout" ? "Timeout" : "Parcial" };
  }

  if (["never", "skipped", "disabled"].includes(status)) {
    const labels = { never: "Aguardando", skipped: "Ignorado", disabled: "Desativada" };
    return { dot: "muted", label: labels[status] };
  }

  if (status === "blocked") {
    return { dot: "warning", label: "Bloqueada" };
  }

  return { dot: "offline", label: String(status || "Erro").toUpperCase() };
}

function renderCrawlerStatus() {
  const stores = state.crawlerStores;
  const enabledCount = stores.filter((store) => store.enabled).length;
  elements.storesCount.textContent = `${enabledCount}/${stores.length} habilitadas`;

  if (!stores.length) {
    elements.storesStatusList.innerHTML = '<p class="empty-state">Nenhuma loja habilitada.</p>';
    return;
  }

  elements.storesStatusList.innerHTML = stores.map((store) => {
    const presentation = getCrawlerPresentation(store.status);
    let result = `${store.productsFound || 0} ${Number(store.productsFound) === 1 ? "produto" : "produtos"}`;

    if (store.status === "timeout") {
      result = "Tempo limite excedido";
    } else if (store.status === "partial") {
      result = `${store.productsFound || 0} produtos · falha parcial`;
    } else if (store.status === "never") {
      result = "Aguardando primeira execução";
    } else if (store.status === "disabled") {
      result = "Crawler desativado no .env";
    } else if (store.status === "blocked") {
      result = "Loja bloqueou a consulta";
    } else if (!["success", "empty", "skipped"].includes(store.status)) {
      result = /^\d{3}$/.test(String(store.status)) ? `Erro HTTP ${store.status}` : "Falha na última busca";
    }

    const duration = Number.isFinite(Number(store.durationMs))
      ? ` · ${formatDuration(Number(store.durationMs) / 1000)}`
      : "";

    return `
      <article class="store-status-item">
        <div class="store-status-heading">
          <strong class="store-status-name"><span class="status-dot status-dot--${presentation.dot}"></span>${escapeHtml(store.crawler)}</strong>
          <span class="store-status-code">${escapeHtml(presentation.label)}</span>
        </div>
        <span class="store-status-meta">${store.enabled ? "Habilitada" : "Desativada"} · ${escapeHtml(store.status || "never")}</span>
        <span class="store-status-meta">Última busca: ${formatTime(store.finishedAt)}${duration}</span>
        <span class="store-status-result" title="${escapeHtml(store.errorMessage || result)}">${escapeHtml(result)}</span>
        <span class="store-status-error" title="${escapeHtml(store.errorMessage || "Sem erro")}">Último erro: ${escapeHtml(store.errorMessage || "nenhum")}</span>
      </article>
    `;
  }).join("");
}

function renderDealSourceStatus() {
  const sources = state.dealSources;
  const enabledCount = sources.filter((source) => source.enabled).length;
  elements.dealSourcesCount.textContent = `${enabledCount}/${sources.length} habilitadas`;

  if (!sources.length) {
    elements.dealSourcesStatusList.innerHTML = '<p class="empty-state">Nenhuma fonte configurada.</p>';
    return;
  }

  elements.dealSourcesStatusList.innerHTML = sources.map((source) => {
    const presentation = getCrawlerPresentation(source.status);
    let result = `${source.productsFound || 0} ${Number(source.productsFound) === 1 ? "produto" : "produtos"}`;

    if (source.status === "timeout") {
      result = "Tempo limite excedido";
    } else if (source.status === "partial") {
      result = `${source.productsFound || 0} produtos · falha parcial`;
    } else if (source.status === "never") {
      result = "Aguardando primeira execução";
    } else if (source.status === "disabled") {
      result = "Fonte desativada no .env";
    } else if (source.status === "blocked") {
      result = "Fonte bloqueou a consulta";
    } else if (!["success", "empty", "skipped"].includes(source.status)) {
      result = /^\d{3}$/.test(String(source.status)) ? `Erro HTTP ${source.status}` : "Falha na última busca";
    }

    const duration = Number.isFinite(Number(source.durationMs))
      ? ` · ${formatDuration(Number(source.durationMs) / 1000)}`
      : "";

    return `
      <article class="store-status-item">
        <div class="store-status-heading">
          <strong class="store-status-name"><span class="status-dot status-dot--${presentation.dot}"></span>${escapeHtml(source.source || source.crawler)}</strong>
          <span class="store-status-code">${escapeHtml(presentation.label)}</span>
        </div>
        <span class="store-status-meta">${source.enabled ? "Habilitada" : "Desativada"} · ${escapeHtml(source.status || "never")}</span>
        <span class="store-status-meta">Última busca: ${formatTime(source.finishedAt)}${duration}</span>
        <span class="store-status-result" title="${escapeHtml(source.errorMessage || result)}">${escapeHtml(result)}</span>
        <span class="store-status-error" title="${escapeHtml(source.errorMessage || "Sem erro")}">Último erro: ${escapeHtml(source.errorMessage || "nenhum")}</span>
      </article>
    `;
  }).join("");
}

function renderAlerts() {
  const alerts = state.alerts;
  elements.alertsCount.textContent = pluralize(alerts.length, "registro", "registros");

  if (!alerts.length) {
    elements.alertsTableBody.innerHTML = '<tr><td class="loading-cell" colspan="5">Nenhum alerta enviado ainda.</td></tr>';
    return;
  }

  elements.alertsTableBody.innerHTML = alerts.map((alert) => {
    const link = safeUrl(alert.link);
    const title = escapeHtml(alert.productTitle || "Produto sem título");
    const product = link
      ? `<a class="product-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer" title="${title}">${title}</a>`
      : `<span class="product-name" title="${title}">${title}</span>`;

    return `
      <tr>
        <td>${product}<span class="cell-meta">${escapeHtml(alert.recommendation || "Alerta")}</span></td>
        <td>${escapeHtml(alert.store || "--")}</td>
        <td class="price-cell">${formatCurrency(alert.price)}</td>
        <td><span class="score">${escapeHtml(alert.score ?? "--")}</span></td>
        <td>${formatDateTime(alert.sentAt)}</td>
      </tr>
    `;
  }).join("");
}

function renderHistory() {
  const history = state.history;
  elements.historyCount.textContent = pluralize(history.length, "item", "itens");

  if (!history.length) {
    elements.historyList.innerHTML = '<p class="empty-state">Nenhum preço capturado ainda.</p>';
    return;
  }

  elements.historyList.innerHTML = history.map((item) => {
    const lastSeen = item.lastSeen || {};
    const image = safeUrl(lastSeen.image);
    const imageContent = image
      ? `<img src="${escapeHtml(image)}" alt="" loading="lazy" onerror="this.parentElement.textContent='VTX'">`
      : "VTX";
    const source = lastSeen.crawler || "Radar Voltix";
    const minimum = Number.isFinite(Number(item.lowestPrice)) ? `mín. ${formatCurrency(item.lowestPrice)}` : "sem mínimo";

    return `
      <article class="history-item">
        <div class="history-image">${imageContent}</div>
        <div class="history-copy">
          <span class="history-title" title="${escapeHtml(item.productTitle || "Produto")}">${escapeHtml(item.productTitle || "Produto")}</span>
          <span class="history-meta">${escapeHtml(source)} · ${minimum} · ${pluralize(item.recordsCount || 0, "captura", "capturas")}</span>
        </div>
        <strong class="history-price">${formatCurrency(item.lastPrice)}</strong>
      </article>
    `;
  }).join("");
}

function renderTopProfits() {
  const profits = state.topProfits;
  elements.topProfitsCount.textContent = pluralize(profits.length, "produto", "produtos");

  if (!profits.length) {
    elements.topProfitsList.innerHTML = '<p class="empty-state">Nenhum lucro estimado hoje.</p>';
    return;
  }

  elements.topProfitsList.innerHTML = profits.map((item, index) => {
    const link = safeUrl(item.url);
    const title = escapeHtml(item.productTitle || "Produto");
    const titleContent = link
      ? `<a class="product-link" href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">${title}</a>`
      : `<span class="product-name">${title}</span>`;

    return `
      <article class="profit-item">
        <span class="profit-position">${index + 1}</span>
        <div class="profit-copy">
          ${titleContent}
          <span class="history-meta">${escapeHtml(item.crawler || "Radar Voltix")} · compra ${formatCurrency(item.purchasePrice)} · ROI ${escapeHtml(item.roi)}%</span>
        </div>
        <strong class="profit-value">${formatCurrency(item.netProfit)}</strong>
      </article>
    `;
  }).join("");
}

function renderMarketplaceAdvisor() {
  const comparison = state.marketplaceAdvice;
  const sourceProduct = state.marketplaceAdvisorProduct;
  elements.marketplaceAdvisorProduct.textContent = sourceProduct?.productTitle || "Aguardando oportunidade";

  if (!comparison.length) {
    elements.marketplaceAdvisorContent.innerHTML = '<p class="empty-state">O comparativo aparecerá após a primeira oportunidade aprovada.</p>';
    return;
  }

  const best = comparison[0];
  const runnersUp = comparison.slice(1, 4);
  elements.marketplaceAdvisorContent.innerHTML = `
    <article class="advisor-best">
      <span class="advisor-rank">Melhor lugar para vender</span>
      <strong class="advisor-marketplace">${escapeHtml(best.marketplace)}</strong>
      <div class="advisor-best-metrics">
        <span>Lucro líquido <b>${formatCurrency(best.netProfit)}</b></span>
        <span>ROI <b>${escapeHtml(best.roi)}%</b></span>
      </div>
    </article>
    <div class="advisor-ranking">
      ${runnersUp.map((item) => `
        <article class="advisor-runner" title="${escapeHtml(item.notes || "")}">
          <span>${escapeHtml(item.ranking)}º lugar</span>
          <strong>${escapeHtml(item.marketplace)}</strong>
          <b>${formatCurrency(item.netProfit)}</b>
          <small>ROI ${escapeHtml(item.roi)}%</small>
        </article>
      `).join("")}
    </div>
  `;
}

function marketplaceLabel(value) {
  return {
    mercadolivre: "Mercado Livre",
    shopee: "Shopee",
    tiktokshop: "TikTok Shop",
    facebook: "Facebook Marketplace"
  }[value] || value || "--";
}

function renderInventory() {
  const items = state.inventory;
  const summary = state.inventorySummary;
  elements.inventoryProducts.textContent = summary.productsInStock || 0;
  elements.inventoryQuantity.textContent = summary.totalQuantity || 0;
  elements.inventoryCost.textContent = formatCurrency(summary.totalCost || 0);
  elements.inventorySaleValue.textContent = formatCurrency(summary.expectedSaleValue || 0);
  elements.inventoryProfit.textContent = formatCurrency(summary.expectedProfit || 0);

  if (!items.length) {
    elements.inventoryTableBody.innerHTML = '<tr><td class="loading-cell" colspan="9">Nenhum produto em estoque.</td></tr>';
    return;
  }

  elements.inventoryTableBody.innerHTML = items.map((item) => {
    const lowStock = item.reorderRecommended;
    const status = item.status === "archived"
      ? "Arquivado"
      : lowStock ? "Hora de repor" : "Em estoque";

    return `
      <tr data-inventory-row="${item.id}" class="${lowStock ? "inventory-row--low" : ""}">
        <td>
          <span class="product-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
          <span class="cell-meta">${escapeHtml(item.sku || "Sem SKU")} · ${escapeHtml(item.category || "Sem categoria")}</span>
        </td>
        <td><strong class="inventory-quantity-value">${escapeHtml(item.quantity)}</strong></td>
        <td class="price-cell">${formatCurrency(item.purchasePrice)}</td>
        <td class="price-cell">${formatCurrency(item.totalCost)}</td>
        <td class="price-cell">${formatCurrency(item.expectedSaleValue)}</td>
        <td class="price-cell inventory-profit-value">${formatCurrency(item.estimatedTotalProfit)}</td>
        <td>${escapeHtml(marketplaceLabel(item.marketplace))}</td>
        <td><span class="state-label ${lowStock ? "state-label--low" : ""}">${escapeHtml(status)}</span></td>
        <td>
          <div class="row-actions">
            <button class="button button--secondary button--small" type="button" data-inventory-action="purchase" data-id="${item.id}">Adicionar compra</button>
            <button class="button button--secondary button--small" type="button" data-inventory-action="sale" data-id="${item.id}"${item.quantity <= 0 ? " disabled" : ""}>Registrar venda</button>
            <button class="button button--secondary button--small" type="button" data-inventory-action="adjustment" data-id="${item.id}">Ajuste manual</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function findInventoryItem(id) {
  return state.inventory.find((item) => Number(item.id) === Number(id));
}

function openInventoryDialog() {
  elements.inventoryForm.reset();
  elements.inventoryItemQuantity.value = "1";
  elements.inventoryMarketplace.value = "mercadolivre";
  elements.inventoryFeedback.textContent = "";
  elements.inventoryFeedback.className = "form-feedback";
  elements.inventoryDialog.showModal();
}

function closeInventoryDialog() {
  elements.inventoryDialog.close();
}

async function saveInventoryItem(event) {
  event.preventDefault();
  elements.inventorySubmit.disabled = true;
  elements.inventorySubmit.textContent = "Salvando...";
  elements.inventoryFeedback.textContent = "";

  try {
    await request("/inventory", {
      method: "POST",
      body: JSON.stringify({
        name: elements.inventoryName.value,
        sku: elements.inventorySku.value,
        category: elements.inventoryCategory.value,
        quantity: Number(elements.inventoryItemQuantity.value),
        purchasePrice: Number(elements.inventoryPurchasePrice.value),
        expectedSellPrice: Number(elements.inventorySellPrice.value),
        marketplace: elements.inventoryMarketplace.value,
        notes: elements.inventoryNotes.value
      })
    });
    closeInventoryDialog();
    showToast("Compra adicionada ao estoque.");
    await loadDashboard({ silent: true });
  } catch (error) {
    elements.inventoryFeedback.textContent = error.message;
    elements.inventoryFeedback.className = "form-feedback form-feedback--error";
  } finally {
    elements.inventorySubmit.disabled = false;
    elements.inventorySubmit.textContent = "Salvar compra";
  }
}

function openMovementDialog(item, type) {
  elements.movementForm.reset();
  elements.movementItemId.value = item.id;
  elements.movementType.value = type;
  elements.movementProductName.textContent = `${item.name} · saldo atual: ${item.quantity}`;
  elements.movementFeedback.textContent = "";
  elements.movementFeedback.className = "form-feedback";

  if (type === "purchase") {
    elements.movementDialogTitle.textContent = "Adicionar compra";
    elements.movementQuantityLabel.innerHTML = "Quantidade comprada <b>*</b>";
    elements.movementQuantity.min = "1";
    elements.movementQuantity.removeAttribute("max");
    elements.movementQuantity.value = "1";
    elements.movementUnitPrice.value = item.purchasePrice;
  } else if (type === "sale") {
    elements.movementDialogTitle.textContent = "Registrar venda";
    elements.movementQuantityLabel.innerHTML = "Quantidade vendida <b>*</b>";
    elements.movementQuantity.min = "1";
    elements.movementQuantity.max = String(item.quantity);
    elements.movementQuantity.value = "1";
    elements.movementUnitPrice.value = item.expectedSellPrice;
  } else {
    elements.movementDialogTitle.textContent = "Ajuste manual";
    elements.movementQuantityLabel.innerHTML = "Variação positiva ou negativa <b>*</b>";
    elements.movementQuantity.removeAttribute("min");
    elements.movementQuantity.removeAttribute("max");
    elements.movementQuantity.value = "";
    elements.movementUnitPrice.value = item.purchasePrice;
  }

  elements.movementDialog.showModal();
}

function closeMovementDialog() {
  elements.movementDialog.close();
}

async function saveMovement(event) {
  event.preventDefault();
  const itemId = elements.movementItemId.value;
  elements.movementSubmit.disabled = true;
  elements.movementSubmit.textContent = "Salvando...";

  try {
    await request(`/inventory/${itemId}/movement`, {
      method: "POST",
      body: JSON.stringify({
        type: elements.movementType.value,
        quantity: Number(elements.movementQuantity.value),
        unitPrice: elements.movementUnitPrice.value,
        notes: elements.movementNotes.value
      })
    });
    closeMovementDialog();
    const successMessages = {
      purchase: "Compra adicionada ao estoque.",
      sale: "Venda registrada.",
      adjustment: "Estoque ajustado."
    };
    showToast(successMessages[elements.movementType.value] || "Movimento registrado.");
    await loadDashboard({ silent: true });
  } catch (error) {
    elements.movementFeedback.textContent = error.message;
    elements.movementFeedback.className = "form-feedback form-feedback--error";
  } finally {
    elements.movementSubmit.disabled = false;
    elements.movementSubmit.textContent = "Salvar movimento";
  }
}

async function simulateProfit(event) {
  event.preventDefault();
  elements.profitSubmit.disabled = true;
  elements.profitSubmit.textContent = "Calculando...";

  const params = new URLSearchParams({
    buy: elements.profitBuy.value,
    sell: elements.profitSell.value,
    marketplace: elements.profitMarketplace.value,
    packaging: elements.profitPackaging.value || "0"
  });

  if (elements.profitShipping.value !== "") {
    params.set("shipping", elements.profitShipping.value);
  }

  try {
    const result = await request(`/profit/simulate?${params.toString()}`);
    elements.profitGross.textContent = formatCurrency(result.grossProfit);
    elements.profitNet.textContent = formatCurrency(result.netProfit);
    elements.profitRoi.textContent = `${Number(result.roi).toLocaleString("pt-BR")}%`;
    elements.profitFees.textContent = formatCurrency(result.totalFees);
    elements.profitRecommended.textContent = result.recommended ? "Recomendado" : "Não recomendado";
    elements.profitRecommended.className = result.recommended ? "is-recommended" : "is-rejected";
  } catch (error) {
    showToast(`Erro no simulador: ${error.message}`, "error");
  } finally {
    elements.profitSubmit.disabled = false;
    elements.profitSubmit.textContent = "Calcular";
  }
}

function normalizeFilterText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function renderWatchlistCategoryOptions() {
  const selected = state.watchlistFilters.category;
  const categories = [...new Set(
    state.watchlist
      .map((item) => item.category?.trim())
      .filter(Boolean)
  )].sort((first, second) => first.localeCompare(second, "pt-BR"));

  elements.watchlistCategoryFilter.innerHTML = [
    '<option value="">Todas as categorias</option>',
    ...categories.map((category) => `<option value="${escapeHtml(category)}">${escapeHtml(category)}</option>`)
  ].join("");

  elements.watchlistCategoryFilter.value = categories.includes(selected) ? selected : "";
  state.watchlistFilters.category = elements.watchlistCategoryFilter.value;
}

function getFilteredWatchlist() {
  const search = normalizeFilterText(state.watchlistFilters.search);
  const category = normalizeFilterText(state.watchlistFilters.category);

  return state.watchlist.filter((item) => {
    const matchesSearch = !search || [item.name, item.query]
      .some((value) => normalizeFilterText(value).includes(search));
    const matchesCategory = !category || normalizeFilterText(item.category) === category;

    return matchesSearch && matchesCategory;
  });
}

function renderWatchlist() {
  renderWatchlistCategoryOptions();

  const watchlist = getFilteredWatchlist();
  const total = state.watchlist.length;
  elements.watchlistCount.textContent = pluralize(total, "item", "itens");
  elements.watchlistResultCount.textContent = total === watchlist.length
    ? "Todos os itens"
    : `${watchlist.length} de ${total} itens`;

  if (!watchlist.length) {
    const message = total ? "Nenhum item corresponde aos filtros." : "Nenhum item cadastrado na watchlist.";
    elements.watchlistTableBody.innerHTML = `<tr><td class="loading-cell" colspan="10">${message}</td></tr>`;
    return;
  }

  elements.watchlistTableBody.innerHTML = watchlist.map((item) => {
    const stores = item.allowedStores?.length ? item.allowedStores.join(", ") : "Todas as lojas";
    const checked = item.enabled ? " checked" : "";
    const statusLabel = item.enabled ? "Ativo" : "Inativo";
    const toggleLabel = item.enabled ? `Pausar ${item.name}` : `Ativar ${item.name}`;

    return `
      <tr data-watchlist-row="${item.id}">
        <td><span class="product-name" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span></td>
        <td>${escapeHtml(item.query)}</td>
        <td class="price-cell">${formatCurrency(item.maxBuyPrice)}</td>
        <td class="price-cell">${formatCurrency(item.expectedSellPrice)}</td>
        <td class="margin-cell">${escapeHtml(Number(item.minMarginPercent).toLocaleString("pt-BR"))}%</td>
        <td class="category-cell">${escapeHtml(item.category || "Sem categoria")}</td>
        <td><span class="priority-value">${escapeHtml(item.priority)}</span></td>
        <td class="stores-cell" title="${escapeHtml(stores)}">${escapeHtml(stores)}</td>
        <td>
          <label class="quick-status">
            <span class="switch">
              <input type="checkbox" data-watchlist-action="toggle" data-id="${item.id}" aria-label="${escapeHtml(toggleLabel)}"${checked}>
              <span class="switch-track" aria-hidden="true"></span>
            </span>
            <span>${statusLabel}</span>
          </label>
        </td>
        <td>
          <div class="row-actions">
            <button class="button button--secondary button--small" type="button" data-watchlist-action="edit" data-id="${item.id}">Editar</button>
            <button class="button button--danger button--small" type="button" data-watchlist-action="delete" data-id="${item.id}">Excluir</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function setSyncState(label, status) {
  elements.syncState.innerHTML = `<span class="status-dot status-dot--${status}"></span>${escapeHtml(label)}`;
}

function showToast(message, type = "success") {
  clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.className = `toast toast--visible${type === "error" ? " toast--error" : ""}`;
  toastTimer = setTimeout(() => {
    elements.toast.className = "toast";
  }, 5000);
}

function findWatchlistItem(id) {
  return state.watchlist.find((item) => item.id === Number(id)) || null;
}

function clearWatchlistFormErrors() {
  elements.watchlistForm.querySelectorAll("[aria-invalid]").forEach((field) => {
    field.removeAttribute("aria-invalid");
  });
  elements.watchlistForm.querySelectorAll(".field-error").forEach((error) => {
    error.textContent = "";
  });
  elements.watchlistFormFeedback.textContent = "";
  elements.watchlistFormFeedback.className = "form-feedback";
}

function resetWatchlistForm() {
  elements.watchlistForm.reset();
  elements.watchlistId.value = "";
  elements.watchlistMinMargin.value = "25";
  elements.watchlistPriority.value = "3";
  elements.watchlistEnabled.checked = true;
  clearWatchlistFormErrors();
}

function openWatchlistForm(item = null) {
  resetWatchlistForm();
  elements.watchlistDialogTitle.textContent = item ? "Editar Produto" : "Novo Produto";

  if (item) {
    elements.watchlistId.value = item.id;
    elements.watchlistName.value = item.name || "";
    elements.watchlistQuery.value = item.query || "";
    elements.watchlistMaxBuyPrice.value = item.maxBuyPrice;
    elements.watchlistExpectedSellPrice.value = item.expectedSellPrice;
    elements.watchlistMinMargin.value = item.minMarginPercent;
    elements.watchlistCategory.value = item.category || "";
    elements.watchlistPriority.value = String(item.priority);
    elements.watchlistEnabled.checked = Boolean(item.enabled);
    elements.watchlistStoreInputs.forEach((input) => {
      input.checked = item.allowedStores?.includes(input.value) || false;
    });
  }

  if (!elements.watchlistDialog.open) {
    elements.watchlistDialog.showModal();
  }

  elements.watchlistName.focus();
}

function closeWatchlistForm() {
  if (elements.watchlistDialog.open) {
    elements.watchlistDialog.close();
  }
}

function setFieldError(name, message) {
  const field = elements.watchlistForm.elements.namedItem(name);
  const error = elements.watchlistForm.querySelector(`[data-error-for="${name}"]`);

  field?.setAttribute("aria-invalid", "true");
  if (error) {
    error.textContent = message;
  }
}

function getWatchlistFormData() {
  clearWatchlistFormErrors();

  const data = {
    name: elements.watchlistName.value.trim(),
    query: elements.watchlistQuery.value.trim(),
    maxBuyPrice: Number(elements.watchlistMaxBuyPrice.value),
    expectedSellPrice: Number(elements.watchlistExpectedSellPrice.value),
    minMarginPercent: Number(elements.watchlistMinMargin.value),
    category: elements.watchlistCategory.value.trim() || null,
    priority: Number(elements.watchlistPriority.value),
    allowedStores: Array.from(elements.watchlistStoreInputs)
      .filter((input) => input.checked)
      .map((input) => input.value),
    enabled: elements.watchlistEnabled.checked
  };
  const errors = {};

  if (!data.name) errors.name = "Informe o nome do produto.";
  if (!data.query) errors.query = "Informe a query de busca.";
  if (!Number.isFinite(data.maxBuyPrice) || data.maxBuyPrice <= 0) errors.maxBuyPrice = "Informe um valor positivo.";
  if (!Number.isFinite(data.expectedSellPrice) || data.expectedSellPrice <= 0) errors.expectedSellPrice = "Informe um valor positivo.";
  if (!Number.isFinite(data.minMarginPercent) || data.minMarginPercent < 0) errors.minMarginPercent = "Use um valor maior ou igual a zero.";
  if (!Number.isInteger(data.priority) || data.priority < 1 || data.priority > 5) errors.priority = "Escolha uma prioridade entre 1 e 5.";

  Object.entries(errors).forEach(([name, message]) => setFieldError(name, message));

  if (Object.keys(errors).length) {
    elements.watchlistFormFeedback.textContent = "Revise os campos destacados.";
    elements.watchlistFormFeedback.className = "form-feedback form-feedback--error";
    return null;
  }

  return data;
}

function setWatchlistFormBusy(busy) {
  elements.watchlistForm.querySelectorAll("input, select, button").forEach((control) => {
    control.disabled = busy;
  });
  elements.watchlistFormSubmit.textContent = busy ? "Salvando..." : "Salvar Produto";
}

async function loadWatchlist() {
  const response = await request("/watchlist?includeDisabled=true");
  state.watchlist = response.data || [];
  renderWatchlist();
}

async function saveWatchlistItem(event) {
  event.preventDefault();

  const data = getWatchlistFormData();
  if (!data) {
    return;
  }

  const id = Number(elements.watchlistId.value) || null;
  setWatchlistFormBusy(true);
  elements.watchlistFormFeedback.textContent = "Salvando...";

  try {
    await request(id ? `/watchlist/${id}` : "/watchlist", {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(data)
    });
    await loadWatchlist();
    closeWatchlistForm();
    showToast("Produto salvo com sucesso.");
  } catch (error) {
    elements.watchlistFormFeedback.textContent = "Erro ao salvar.";
    elements.watchlistFormFeedback.className = "form-feedback form-feedback--error";
    showToast(`Erro ao salvar: ${error.message}`, "error");
  } finally {
    setWatchlistFormBusy(false);
  }
}

async function toggleWatchlistItem(input) {
  const id = Number(input.dataset.id);
  const item = findWatchlistItem(id);

  if (!item) {
    return;
  }

  input.disabled = true;

  try {
    await request(`/watchlist/${id}`, {
      method: "PUT",
      body: JSON.stringify({ enabled: input.checked })
    });
    await loadWatchlist();
    showToast(input.checked ? "Produto ativado com sucesso." : "Produto pausado com sucesso.");
  } catch (error) {
    input.checked = item.enabled;
    input.disabled = false;
    showToast(`Erro ao atualizar status: ${error.message}`, "error");
  }
}

function openDeleteDialog(item) {
  state.pendingDeleteId = item.id;
  elements.deleteProductName.textContent = item.name;
  elements.deleteConfirmButton.disabled = false;
  elements.deleteConfirmButton.textContent = "Excluir Produto";

  if (!elements.deleteDialog.open) {
    elements.deleteDialog.showModal();
  }
}

function closeDeleteDialog() {
  state.pendingDeleteId = null;
  if (elements.deleteDialog.open) {
    elements.deleteDialog.close();
  }
}

async function deleteWatchlistItem() {
  const id = state.pendingDeleteId;
  if (!id) {
    return;
  }

  elements.deleteConfirmButton.disabled = true;
  elements.deleteConfirmButton.textContent = "Excluindo...";

  try {
    await request(`/watchlist/${id}`, { method: "DELETE" });
    closeDeleteDialog();
    await loadWatchlist();
    showToast("Produto excluído com sucesso.");
  } catch (error) {
    elements.deleteConfirmButton.disabled = false;
    elements.deleteConfirmButton.textContent = "Excluir Produto";
    showToast(`Erro ao excluir: ${error.message}`, "error");
  }
}

async function loadDashboard(options = {}) {
  if (!options.silent) {
    setSyncState("Atualizando", "muted");
  }

  const results = await Promise.allSettled([
    request("/health"),
    request("/crawlers/status"),
    request("/deal-sources/status"),
    request("/profit/top?limit=10"),
    request("/inventory"),
    request("/alerts?limit=8"),
    request("/history?limit=6&includeHistory=false"),
    request("/watchlist?includeDisabled=true")
  ]);

  const [healthResult, crawlersResult, dealSourcesResult, topProfitsResult, inventoryResult, alertsResult, historyResult, watchlistResult] = results;

  if (healthResult.status === "fulfilled") {
    state.health = healthResult.value;
    cacheLastRun(state.health.radar?.lastRun);
  } else {
    state.health = null;
  }

  if (alertsResult.status === "fulfilled") {
    state.alerts = alertsResult.value.data || [];
  }

  if (crawlersResult.status === "fulfilled") {
    state.crawlerStores = crawlersResult.value.stores || [];
  }

  if (dealSourcesResult.status === "fulfilled") {
    state.dealSources = dealSourcesResult.value.sources || [];
  }

  if (topProfitsResult.status === "fulfilled") {
    state.topProfits = topProfitsResult.value.data || [];
  }

  if (inventoryResult.status === "fulfilled") {
    state.inventory = inventoryResult.value.data || [];
    state.inventorySummary = inventoryResult.value.summary || {};
  }

  if (historyResult.status === "fulfilled") {
    state.history = historyResult.value.data || [];
  }

  if (watchlistResult.status === "fulfilled") {
    state.watchlist = watchlistResult.value.data || [];
  }

  state.marketplaceAdvice = [];
  state.marketplaceAdvisorProduct = state.alerts.find((alert) => alert.productId) || null;
  let marketplaceAdvisorFailed = false;
  if (state.marketplaceAdvisorProduct) {
    try {
      state.marketplaceAdvice = await request(`/marketplace-advisor/${state.marketplaceAdvisorProduct.productId}`);
    } catch (_error) {
      marketplaceAdvisorFailed = true;
    }
  }

  renderHealth();
  renderCrawlerStatus();
  renderDealSourceStatus();
  renderTopProfits();
  renderMarketplaceAdvisor();
  renderInventory();
  renderAlerts();
  renderHistory();
  renderWatchlist();

  const failures = results.filter((result) => result.status === "rejected");
  if (marketplaceAdvisorFailed) failures.push({ status: "rejected" });
  const now = new Date();
  elements.lastUpdated.dateTime = now.toISOString();
  elements.lastUpdated.textContent = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(now);

  if (failures.length) {
    setSyncState("Dados parciais", "warning");
    if (!options.silent) {
      showToast("Parte dos dados não pôde ser atualizada.", "error");
    }
    return;
  }

  setSyncState("Sistema sincronizado", "online");
}

async function runRadar() {
  elements.radarRunButton.disabled = true;
  elements.radarRunButton.textContent = "Executando radar...";
  elements.lastRun.textContent = "Em execução";
  elements.lastRunDetail.textContent = "Buscando preços nas lojas";

  try {
    const summary = await request("/radar/run", {
      method: "POST",
      body: JSON.stringify({ notify: true })
    });

    cacheLastRun(summary);
    showToast(`Radar concluído: ${summary.productsFound || 0} produtos e ${summary.opportunitiesFound || 0} oportunidades.`);
    await loadDashboard({ silent: true });
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    elements.radarRunButton.disabled = false;
    elements.radarRunButton.textContent = "Executar Radar Agora";
  }
}

async function testWhatsapp() {
  elements.whatsappTestButton.disabled = true;
  elements.whatsappTestButton.textContent = "Enviando teste...";

  try {
    await request("/whatsapp/test", {
      method: "POST",
      body: JSON.stringify({ text: "Teste do Dashboard Radar Voltix: WhatsApp conectado." })
    });
    showToast("Mensagem de teste enviada pelo WhatsApp.");
    await loadDashboard({ silent: true });
  } catch (error) {
    showToast(error.message, "error");
  } finally {
    elements.whatsappTestButton.disabled = false;
    elements.whatsappTestButton.textContent = "Testar WhatsApp";
  }
}

elements.newProductButton.addEventListener("click", () => openWatchlistForm());
elements.watchlistDialogClose.addEventListener("click", closeWatchlistForm);
elements.watchlistFormCancel.addEventListener("click", closeWatchlistForm);
elements.watchlistForm.addEventListener("submit", saveWatchlistItem);
elements.deleteDialogClose.addEventListener("click", closeDeleteDialog);
elements.deleteCancelButton.addEventListener("click", closeDeleteDialog);
elements.deleteConfirmButton.addEventListener("click", deleteWatchlistItem);

elements.watchlistSearch.addEventListener("input", (event) => {
  state.watchlistFilters.search = event.target.value;
  renderWatchlist();
});

elements.watchlistCategoryFilter.addEventListener("change", (event) => {
  state.watchlistFilters.category = event.target.value;
  renderWatchlist();
});

elements.watchlistTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-watchlist-action]");
  if (!button) {
    return;
  }

  const item = findWatchlistItem(button.dataset.id);
  if (!item) {
    return;
  }

  if (button.dataset.watchlistAction === "edit") {
    openWatchlistForm(item);
  } else if (button.dataset.watchlistAction === "delete") {
    openDeleteDialog(item);
  }
});

elements.watchlistTableBody.addEventListener("change", (event) => {
  const input = event.target.closest('input[data-watchlist-action="toggle"]');
  if (input) {
    toggleWatchlistItem(input);
  }
});

elements.radarRunButton.addEventListener("click", runRadar);
elements.whatsappTestButton.addEventListener("click", testWhatsapp);
elements.profitForm.addEventListener("submit", simulateProfit);
elements.inventoryAddButton.addEventListener("click", openInventoryDialog);
elements.inventoryDialogClose.addEventListener("click", closeInventoryDialog);
elements.inventoryCancel.addEventListener("click", closeInventoryDialog);
elements.inventoryForm.addEventListener("submit", saveInventoryItem);
elements.movementDialogClose.addEventListener("click", closeMovementDialog);
elements.movementCancel.addEventListener("click", closeMovementDialog);
elements.movementForm.addEventListener("submit", saveMovement);

elements.inventoryTableBody.addEventListener("click", (event) => {
  const button = event.target.closest("button[data-inventory-action]");
  if (!button) return;
  const item = findInventoryItem(button.dataset.id);
  if (item) openMovementDialog(item, button.dataset.inventoryAction);
});

document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible") {
    loadDashboard({ silent: true });
  }
});

loadDashboard();
setInterval(() => loadDashboard({ silent: true }), 30000);
