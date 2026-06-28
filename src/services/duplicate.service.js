const crypto = require("crypto");
const alertRepository = require("../repositories/alert.repository");
const { normalizeText } = require("../utils/text");

const RESEND_AFTER_MS = 24 * 60 * 60 * 1000;

function createAlertHash(product, watchlistItem) {
  const identity = [
    watchlistItem.id,
    normalizeText(product.store),
    normalizeText(product.link || product.title),
    normalizeText(product.title)
  ].join("|");

  return crypto.createHash("sha256").update(identity).digest("hex");
}

function shouldSendAlert(product, watchlistItem) {
  const hash = createAlertHash(product, watchlistItem);
  const latestAlert = alertRepository.findLatestByHash(hash);

  if (!latestAlert) {
    return {
      shouldSend: true,
      hash,
      reason: "new_opportunity"
    };
  }

  if (Number(product.price) < Number(latestAlert.price)) {
    return {
      shouldSend: true,
      hash,
      reason: "price_dropped"
    };
  }

  const lastSentAt = new Date(latestAlert.sentAt).getTime();
  const ageMs = Number.isFinite(lastSentAt) ? Date.now() - lastSentAt : RESEND_AFTER_MS;

  if (ageMs >= RESEND_AFTER_MS) {
    return {
      shouldSend: true,
      hash,
      reason: "older_than_24h"
    };
  }

  return {
    shouldSend: false,
    hash,
    reason: "duplicate_recent"
  };
}

module.exports = {
  createAlertHash,
  shouldSendAlert
};
