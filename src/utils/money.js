function parseMoney(value) {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (!value) {
    return null;
  }

  const cleaned = String(value).replace(/[^\d,.-]/g, "").trim();
  if (!cleaned) {
    return null;
  }

  const lastComma = cleaned.lastIndexOf(",");
  const lastDot = cleaned.lastIndexOf(".");
  let normalized = cleaned;

  if (lastComma > -1 && lastDot > -1) {
    normalized = lastComma > lastDot
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(/,/g, "");
  } else if (lastComma > -1) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (lastDot > -1) {
    const dotParts = cleaned.split(".");
    const finalGroup = dotParts.at(-1);

    normalized = dotParts.length > 2 || finalGroup.length === 3
      ? cleaned.replace(/\./g, "")
      : cleaned;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function formatBRL(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(Number(value || 0));
}

function roundMoney(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

module.exports = {
  parseMoney,
  formatBRL,
  roundMoney
};
