const cheerio = require("cheerio");
const { parseMoney } = require("../utils/money");
const { cleanProductTitle, compactText } = require("../utils/text");

const DEFAULT_BLOCK_PATTERNS = [
  /access denied/i,
  /acesso negado/i,
  /automated access/i,
  /captcha/i,
  /cloudflare ray id/i,
  /continue shopping/i,
  /digite os caracteres/i,
  /not a robot/i,
  /robot check/i,
  /servi[cç]o indispon[ií]vel/i,
  /unusual traffic/i
];

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

function safeSelect(root, selectors = []) {
  const selected = [];

  for (const selector of selectors) {
    try {
      root.find(selector).each((_index, element) => selected.push(element));
    } catch (_error) {
      // Um seletor antigo nunca deve invalidar os demais fallbacks.
    }
  }

  return unique(selected);
}

function firstText($, element, selectors = []) {
  for (const selector of selectors) {
    try {
      const selected = $(element).is(selector) ? $(element) : $(element).find(selector).first();
      const value = compactText(selected.text());
      if (value) {
        return value;
      }
    } catch (_error) {
      // Continua para o proximo seletor.
    }
  }

  return "";
}

function firstAttribute($, element, selectors, attributes) {
  for (const selector of selectors) {
    let selected;

    try {
      selected = selector === ":scope" || $(element).is(selector)
        ? $(element)
        : $(element).find(selector).first();
    } catch (_error) {
      continue;
    }

    for (const attribute of attributes) {
      const value = selected.attr(attribute);
      if (value) {
        return value;
      }
    }
  }

  return null;
}

function absoluteUrl(value, baseUrl) {
  if (!value || /^(?:data|javascript):/i.test(value)) {
    return null;
  }

  try {
    return new URL(value, baseUrl).href;
  } catch (_error) {
    return null;
  }
}

function minimum(values) {
  const valid = values.map(parseMoney).filter((value) => Number.isFinite(value) && value > 0);
  return valid.length ? Math.min(...valid) : null;
}

function maximum(values) {
  const valid = values.map(parseMoney).filter((value) => Number.isFinite(value) && value > 0);
  return valid.length ? Math.max(...valid) : null;
}

function extractPricesFromText(value) {
  const text = compactText(value);
  const matches = [];
  const expression = /R\$\s*[\d.]+(?:,\d{1,2})?/giu;
  let match;

  while ((match = expression.exec(text))) {
    const amount = parseMoney(match[0]);
    if (!Number.isFinite(amount) || amount <= 0) {
      continue;
    }

    const before = text.slice(Math.max(0, match.index - 32), match.index);
    const after = text.slice(expression.lastIndex, expression.lastIndex + 42);
    const context = `${before} ${match[0]} ${after}`;
    const installment = /(?:\b\d+\s*x\s*(?:de)?\s*$|parcela|por\s+m[eê]s)/iu.test(before)
      || /^\s*(?:por\s+)?m[eê]s/iu.test(after);
    const pixOrCash = /\b(?:pix|boleto|[aà]\s*vista|avista)\b/iu.test(context) && !installment;
    const old = /(?:^|\s)(?:de|antes|pre[cç]o\s+antigo)\s*:?[\s~]*$/iu.test(before);

    matches.push({ amount, installment, pixOrCash, old, source: match[0] });
  }

  const pixPrices = matches.filter((item) => item.pixOrCash && !item.old).map((item) => item.amount);
  const cashPrices = matches.filter((item) => !item.installment && !item.old).map((item) => item.amount);
  const oldPrices = matches.filter((item) => item.old).map((item) => item.amount);
  const price = minimum(pixPrices) ?? minimum(cashPrices);
  const oldPrice = maximum(oldPrices.filter((amount) => !Number.isFinite(price) || amount > price));

  return {
    price,
    pixPrice: minimum(pixPrices),
    cashPrice: minimum(cashPrices),
    oldPrice,
    matches
  };
}

function detectBlockedPage(html, extraPatterns = []) {
  const source = String(html || "").slice(0, 1_000_000);
  const pattern = [...DEFAULT_BLOCK_PATTERNS, ...extraPatterns].find((candidate) => candidate.test(source));
  return pattern ? `Pagina bloqueada (${pattern.source})` : null;
}

function availabilityFromText(text) {
  if (/indispon[ií]vel|esgotado|todos\s+vendidos|sem\s+estoque|avise-?me/iu.test(text)) {
    return "unavailable";
  }

  if (/em\s+estoque|pronta\s+entrega|dispon[ií]vel|comprar|adicionar\s+(?:ao|[aà])\s+(?:carrinho|sacola)/iu.test(text)) {
    return "available";
  }

  return "unknown";
}

function normalizeJsonLdImages(image) {
  if (Array.isArray(image)) {
    return image.map((item) => typeof item === "string" ? item : item?.url).filter(Boolean);
  }

  if (typeof image === "string") {
    return [image];
  }

  return image?.url ? [image.url] : [];
}

function collectJsonLdProducts(node, products = []) {
  if (!node || typeof node !== "object") {
    return products;
  }

  if (Array.isArray(node)) {
    node.forEach((item) => collectJsonLdProducts(item, products));
    return products;
  }

  const types = Array.isArray(node["@type"]) ? node["@type"] : [node["@type"]];
  if (types.some((type) => String(type).toLowerCase() === "product")) {
    products.push(node);
  }

  if (node["@graph"]) {
    collectJsonLdProducts(node["@graph"], products);
  }

  if (node.itemListElement) {
    collectJsonLdProducts(node.itemListElement, products);
  }

  if (node.item) {
    collectJsonLdProducts(node.item, products);
  }

  return products;
}

function extractJsonLdProducts($, definition, baseUrl) {
  const output = [];

  $("script[type='application/ld+json']").each((_index, script) => {
    try {
      const parsed = JSON.parse($(script).contents().text());
      const products = collectJsonLdProducts(parsed);

      for (const product of products) {
        const offers = Array.isArray(product.offers) ? product.offers : [product.offers || {}];
        const offerPrices = offers.flatMap((offer) => [offer.price, offer.lowPrice]).filter(Boolean);
        const price = minimum(offerPrices);
        const title = cleanProductTitle(product.name);

        if (!title || !Number.isFinite(price)) {
          continue;
        }

        const availability = offers.some((offer) => /OutOfStock|SoldOut/i.test(String(offer.availability)))
          ? "unavailable"
          : "available";

        output.push({
          title,
          price,
          oldPrice: null,
          link: absoluteUrl(product.url || offers[0]?.url, baseUrl),
          image: absoluteUrl(normalizeJsonLdImages(product.image)[0], baseUrl),
          store: definition.storeName,
          availability,
          raw: product
        });
      }
    } catch (_error) {
      // JSON-LD malformado e comum em lojas; os cards continuam sendo processados.
    }
  });

  return output;
}

function extractCardProduct($, element, definition, baseUrl) {
  const card = $(element);
  const text = compactText(card.text());
  const linkValue = firstAttribute($, element, definition.linkSelectors, ["href"]);
  const link = absoluteUrl(linkValue, baseUrl);
  const imageValue = firstAttribute($, element, definition.imageSelectors, ["src", "data-src", "data-original", "srcset"]);
  const image = absoluteUrl(String(imageValue || "").split(/\s+/)[0], baseUrl);
  const titleFromSelector = firstText($, element, definition.titleSelectors);
  const titleFromAttribute = firstAttribute($, element, definition.titleSelectors, ["title", "aria-label"])
    || firstAttribute($, element, definition.imageSelectors, ["alt"]);
  const title = cleanProductTitle(titleFromSelector || titleFromAttribute || text);
  const pixText = firstText($, element, definition.pixPriceSelectors);
  const priceText = firstText($, element, definition.priceSelectors);
  const oldPriceText = firstText($, element, definition.oldPriceSelectors);
  const allPrices = extractPricesFromText([priceText, pixText, oldPriceText, text].filter(Boolean).join(" "));
  const pixPrice = extractPricesFromText(pixText).price || allPrices.pixPrice;
  const regularPrice = extractPricesFromText(priceText).price || allPrices.price;
  const price = minimum([pixPrice, regularPrice, allPrices.price]);
  const oldPrice = maximum([
    extractPricesFromText(oldPriceText).price,
    allPrices.oldPrice
  ].filter((amount) => Number.isFinite(amount) && (!Number.isFinite(price) || amount > price)));

  if (!title || !Number.isFinite(price) || !link) {
    return null;
  }

  return {
    title,
    price,
    pixPrice,
    cashPrice: regularPrice,
    oldPrice,
    link,
    image,
    store: definition.storeName,
    availability: availabilityFromText(text),
    raw: {
      title: titleFromSelector || titleFromAttribute || text,
      text,
      priceText,
      pixText,
      oldPriceText,
      link: linkValue,
      image: imageValue
    }
  };
}

function extractProductsFromHtml(html, definition, baseUrl) {
  const blockedReason = detectBlockedPage(html, definition.blockPatterns);
  if (blockedReason) {
    const error = new Error(blockedReason);
    error.code = "BLOCKED";
    error.status = "blocked";
    throw error;
  }

  const $ = cheerio.load(String(html || ""));
  const cardElements = safeSelect($.root(), definition.cardSelectors);
  const products = cardElements
    .map((element) => extractCardProduct($, element, definition, baseUrl))
    .filter(Boolean);

  const combined = [...products, ...extractJsonLdProducts($, definition, baseUrl)];
  const seen = new Set();

  return combined.filter((product) => {
    const key = product.link || `${product.title}|${product.price}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

module.exports = {
  DEFAULT_BLOCK_PATTERNS,
  absoluteUrl,
  detectBlockedPage,
  extractPricesFromText,
  extractProductsFromHtml,
  availabilityFromText
};
