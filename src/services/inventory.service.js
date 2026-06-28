const { defaultMarketplace, getMarketplace, normalizeMarketplaceKey } = require("../config/marketplaces");
const inventoryRepository = require("../repositories/inventory.repository");
const profitService = require("./profit.service");
const { normalizeTitle } = require("./productNormalizer");
const { roundMoney } = require("../utils/money");

const ITEM_STATUSES = new Set(["active", "sold_out", "archived"]);
const MOVEMENT_TYPES = new Set(["purchase", "sale", "adjustment"]);

function optionalText(value, fallback = null) {
  if (value === undefined) {
    return fallback;
  }
  const normalized = String(value ?? "").trim();
  return normalized || null;
}

function number(value, fallback) {
  return value === undefined ? Number(fallback) : Number(value);
}

function normalizeItem(input, existing = {}) {
  const quantity = number(input.quantity, existing.quantity ?? 0);
  const purchasePrice = number(input.purchasePrice ?? input.purchase_price, existing.purchasePrice);
  const expectedSellPrice = number(input.expectedSellPrice ?? input.expected_sell_price, existing.expectedSellPrice);
  const marketplace = normalizeMarketplaceKey(input.marketplace ?? existing.marketplace ?? defaultMarketplace);
  let status = input.status ?? existing.status ?? (quantity > 0 ? "active" : "sold_out");

  if (status !== "archived") {
    status = quantity > 0 ? "active" : "sold_out";
  }

  return {
    name: optionalText(input.name, existing.name),
    sku: optionalText(input.sku, existing.sku ?? null),
    category: optionalText(input.category, existing.category ?? null),
    quantity,
    purchasePrice,
    expectedSellPrice,
    marketplace,
    status,
    notes: optionalText(input.notes, null)
  };
}

function validateItem(item) {
  const errors = [];
  if (!item.name) errors.push("name obrigatorio");
  if (!Number.isInteger(item.quantity) || item.quantity < 0) errors.push("quantity deve ser inteiro maior ou igual a zero");
  if (!Number.isFinite(item.purchasePrice) || item.purchasePrice <= 0) errors.push("purchasePrice deve ser positivo");
  if (!Number.isFinite(item.expectedSellPrice) || item.expectedSellPrice <= 0) errors.push("expectedSellPrice deve ser positivo");
  if (!getMarketplace(item.marketplace)) errors.push("marketplace nao suportado");
  if (!ITEM_STATUSES.has(item.status)) errors.push("status invalido");

  if (errors.length) {
    const error = new Error(`Campos invalidos: ${errors.join(", ")}`);
    error.statusCode = 400;
    throw error;
  }
}

function enrichItem(item) {
  const profit = profitService.calculateProfit({
    purchasePrice: item.purchasePrice,
    sellPrice: item.expectedSellPrice,
    marketplace: item.marketplace
  });

  return {
    ...item,
    totalCost: roundMoney(item.quantity * item.purchasePrice),
    expectedSaleValue: roundMoney(item.quantity * item.expectedSellPrice),
    estimatedProfitPerUnit: profit.netProfit,
    estimatedTotalProfit: roundMoney(item.quantity * profit.netProfit),
    estimatedRoi: profit.roi,
    reorderRecommended: item.status !== "archived" && item.quantity <= 2
  };
}

function summarize(items) {
  const active = items.filter((item) => item.status !== "archived");
  return {
    productsInStock: active.filter((item) => item.quantity > 0).length,
    totalQuantity: active.reduce((total, item) => total + item.quantity, 0),
    totalCost: roundMoney(active.reduce((total, item) => total + item.totalCost, 0)),
    expectedSaleValue: roundMoney(active.reduce((total, item) => total + item.expectedSaleValue, 0)),
    expectedProfit: roundMoney(active.reduce((total, item) => total + item.estimatedTotalProfit, 0))
  };
}

function list(options = {}) {
  const items = inventoryRepository.list(options).map(enrichItem);
  return { items, summary: summarize(items) };
}

function get(id) {
  const item = inventoryRepository.findById(id);
  return item ? enrichItem(item) : null;
}

function translateDatabaseError(error) {
  if (/UNIQUE constraint failed: inventory_items\.sku/i.test(error.message)) {
    error.statusCode = 409;
    error.message = "Ja existe um item com este SKU.";
  }
  throw error;
}

function create(input) {
  const item = normalizeItem(input);
  validateItem(item);
  try {
    return enrichItem(inventoryRepository.create(item));
  } catch (error) {
    return translateDatabaseError(error);
  }
}

function update(id, input) {
  const existing = inventoryRepository.findById(id);
  if (!existing) return null;
  const item = normalizeItem(input, existing);
  validateItem(item);
  try {
    return enrichItem(inventoryRepository.update(id, item, existing));
  } catch (error) {
    return translateDatabaseError(error);
  }
}

function addMovement(id, input) {
  const item = inventoryRepository.findById(id);
  if (!item) return null;
  const type = String(input.type || "").toLowerCase();
  const quantity = Number(input.quantity);
  const unitPrice = input.unitPrice === undefined || input.unitPrice === ""
    ? (type === "sale" ? item.expectedSellPrice : item.purchasePrice)
    : Number(input.unitPrice);

  if (!MOVEMENT_TYPES.has(type)) {
    const error = new Error("type deve ser purchase, sale ou adjustment.");
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isInteger(quantity) || quantity === 0 || (type !== "adjustment" && quantity < 0)) {
    const error = new Error("quantity deve ser inteiro positivo; adjustment aceita valor negativo.");
    error.statusCode = 400;
    throw error;
  }
  if (!Number.isFinite(unitPrice) || unitPrice < 0) {
    const error = new Error("unitPrice deve ser maior ou igual a zero.");
    error.statusCode = 400;
    throw error;
  }

  const delta = type === "sale" ? -quantity : quantity;
  if (item.quantity + delta < 0) {
    const error = new Error(`Estoque insuficiente. Saldo atual: ${item.quantity}.`);
    error.statusCode = 409;
    throw error;
  }

  const result = inventoryRepository.addMovement(item, {
    type,
    quantity,
    unitPrice,
    notes: optionalText(input.notes, null)
  });
  return { item: enrichItem(result.item), movement: result.movement };
}

function extractSku(product) {
  return optionalText(product?.sku || product?.raw?.sku || product?.raw?.productId || product?.raw?.id, null);
}

function tokenScore(first, second) {
  const firstTokens = new Set(normalizeTitle(first).split(/\s+/).filter((token) => token.length > 2));
  const secondTokens = new Set(normalizeTitle(second).split(/\s+/).filter((token) => token.length > 2));
  if (!firstTokens.size || !secondTokens.size) return 0;
  const common = [...firstTokens].filter((token) => secondTokens.has(token)).length;
  return common / Math.min(firstTokens.size, secondTokens.size);
}

function getStockForProduct(product, watchlistItem = {}) {
  const items = inventoryRepository.list().filter((item) => item.status !== "archived");
  const sku = extractSku(product);
  let matches = sku ? items.filter((item) => item.sku && item.sku.toLowerCase() === sku.toLowerCase()) : [];
  let matchedBy = matches.length ? "sku" : null;

  if (!matches.length) {
    const names = [product?.title, watchlistItem.name].filter(Boolean);
    const exactNames = new Set(names.map(normalizeTitle));
    matches = items.filter((item) => exactNames.has(normalizeTitle(item.name)));
    matchedBy = matches.length ? "name" : null;
  }

  if (!matches.length) {
    const candidates = [product?.title, watchlistItem.name].filter(Boolean);
    const scored = items
      .map((item) => ({ item, score: Math.max(...candidates.map((name) => tokenScore(item.name, name))) }))
      .filter((candidate) => candidate.score >= 0.7)
      .sort((first, second) => second.score - first.score);
    if (scored.length) {
      const bestScore = scored[0].score;
      matches = scored.filter((candidate) => candidate.score === bestScore).map((candidate) => candidate.item);
      matchedBy = "title_similarity";
    }
  }

  return {
    quantity: matches.reduce((total, item) => total + item.quantity, 0),
    matchedBy,
    itemIds: matches.map((item) => item.id),
    reorderRecommended: matches.reduce((total, item) => total + item.quantity, 0) <= 2
  };
}

module.exports = {
  list,
  get,
  create,
  update,
  addMovement,
  getStockForProduct,
  remove: inventoryRepository.remove,
  listMovements: inventoryRepository.listMovements
};
