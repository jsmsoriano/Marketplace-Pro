const ENVIRONMENTS = {
  sandbox: 'https://api.sandbox.ebay.com',
  production: 'https://api.ebay.com',
};

const categoryCache = new Map();

export class EbayApiError extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.name = 'EbayApiError';
    this.statusCode = statusCode;
  }
}

function configuration() {
  const environment = process.env.EBAY_ENV === 'production' ? 'production' : 'sandbox';
  return {
    environment,
    apiBase: ENVIRONMENTS[environment],
    token: (process.env.EBAY_USER_ACCESS_TOKEN || '').trim(),
    runameConfigured: Boolean(process.env.EBAY_RUNAME?.trim()),
  };
}

export function getEbayStatus() {
  const config = configuration();
  return {
    environment: config.environment,
    configured: Boolean(config.token),
    runameConfigured: config.runameConfigured,
    source: 'official-eBay-Fulfillment-API',
  };
}

function amount(value) {
  const parsed = Number(value?.value ?? value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeOrder(order) {
  const lineItems = Array.isArray(order.lineItems) ? order.lineItems : [];
  return {
    orderId: order.orderId || '',
    creationDate: order.creationDate || '',
    lastModifiedDate: order.lastModifiedDate || '',
    orderFulfillmentStatus: order.orderFulfillmentStatus || '',
    orderPaymentStatus: order.orderPaymentStatus || '',
    cancelState: order.cancelStatus?.cancelState || null,
    currency: order.pricingSummary?.total?.currency || lineItems[0]?.lineItemCost?.currency || 'USD',
    total: amount(order.pricingSummary?.total),
    subtotal: amount(order.pricingSummary?.priceSubtotal),
    deliveryCost: amount(order.pricingSummary?.deliveryCost),
    lineItems: lineItems.map((item) => ({
      lineItemId: item.lineItemId || '',
      legacyItemId: item.legacyItemId || '',
      sku: item.sku || '',
      title: item.title || '',
      quantity: Number(item.quantity || 0),
      lineItemCost: amount(item.lineItemCost),
      total: amount(item.total),
      shippingCost: amount(item.deliveryCost?.shippingCost),
      fulfillmentStatus: item.lineItemFulfillmentStatus || '',
      categoryId: '',
      categoryName: '',
      categorySource: 'unavailable',
    })),
  };
}

function xmlValue(xml, tag) {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml);
  return match?.[1]?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim() || '';
}

async function fetchOfficialCategory(config, legacyItemId) {
  if (!/^\d+$/.test(legacyItemId)) return null;
  const cacheKey = `${config.environment}:${legacyItemId}`;
  if (categoryCache.has(cacheKey)) return categoryCache.get(cacheKey);
  const request = `<?xml version="1.0" encoding="utf-8"?><GetItemRequest xmlns="urn:ebay:apis:eBLBaseComponents"><ItemID>${legacyItemId}</ItemID><DetailLevel>ReturnAll</DetailLevel></GetItemRequest>`;
  const endpoint = config.environment === 'production' ? 'https://api.ebay.com/ws/api.dll' : 'https://api.sandbox.ebay.com/ws/api.dll';
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml',
      'X-EBAY-API-CALL-NAME': 'GetItem',
      'X-EBAY-API-COMPATIBILITY-LEVEL': '1423',
      'X-EBAY-API-SITEID': '0',
      'X-EBAY-API-IAF-TOKEN': config.token,
    },
    body: request,
  });
  const xml = await response.text();
  const primaryCategory = /<PrimaryCategory>([\s\S]*?)<\/PrimaryCategory>/.exec(xml)?.[1] || '';
  const category = response.ok ? {
    categoryId: xmlValue(primaryCategory, 'CategoryID'),
    categoryName: xmlValue(primaryCategory, 'CategoryName'),
    categorySource: 'official-ebay',
  } : null;
  const result = category?.categoryId ? category : null;
  categoryCache.set(cacheKey, result);
  return result;
}

async function enrichOrderCategories(config, orders) {
  const lineItems = orders.flatMap((order) => order.lineItems);
  const uniqueIds = [...new Set(lineItems.map((item) => item.legacyItemId).filter(Boolean))];
  const categoryById = new Map();
  for (let index = 0; index < uniqueIds.length; index += 5) {
    const batch = uniqueIds.slice(index, index + 5);
    const results = await Promise.all(batch.map(async (itemId) => {
      try { return [itemId, await fetchOfficialCategory(config, itemId)]; }
      catch { return [itemId, null]; }
    }));
    for (const [itemId, category] of results) categoryById.set(itemId, category);
  }
  for (const item of lineItems) {
    const category = categoryById.get(item.legacyItemId);
    if (category) Object.assign(item, category);
  }
  return categoryById.size;
}

function ebayErrorMessage(payload, status, environment = 'sandbox') {
  const detail = payload?.errors?.[0];
  if (status === 401) {
    const label = environment === 'production' ? 'Production' : 'Sandbox';
    return `eBay rejected the user token. Generate a new ${label} user token and restart the dev server.`;
  }
  return detail?.longMessage || detail?.message || `eBay request failed (${status}).`;
}

export async function fetchSellerOrders({ days = 90 } = {}) {
  const config = configuration();
  if (!config.token) throw new EbayApiError('EBAY_USER_ACCESS_TOKEN is not configured in .env.local.', 400);
  if (!Number.isInteger(days) || days < 1 || days > 90) {
    throw new EbayApiError('days must be an integer from 1 to 90.', 400);
  }

  const end = new Date();
  const start = new Date(end.getTime() - days * 86_400_000);
  const orders = [];
  const limit = 50;
  let offset = 0;
  let total = 0;

  while (true) {
    const params = new URLSearchParams({
      filter: `creationdate:[${start.toISOString()}..${end.toISOString()}]`,
      limit: String(limit),
      offset: String(offset),
    });
    const response = await fetch(`${config.apiBase}/sell/fulfillment/v1/order?${params}`, {
      headers: { Authorization: `Bearer ${config.token}`, Accept: 'application/json' },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new EbayApiError(ebayErrorMessage(payload, response.status, config.environment), response.status);

    const batch = Array.isArray(payload.orders) ? payload.orders : [];
    orders.push(...batch.map(normalizeOrder));
    total = Number(payload.total || orders.length);
    offset += batch.length;
    if (!payload.next || batch.length < limit || offset >= total) break;
  }

  await enrichOrderCategories(config, orders);
  return {
    environment: config.environment,
    fetchedAt: new Date().toISOString(),
    window: { days, start: start.toISOString(), end: end.toISOString() },
    total,
    categorizedItems: orders.flatMap((order) => order.lineItems).filter((item) => item.categorySource === 'official-ebay').length,
    orders,
  };
}
