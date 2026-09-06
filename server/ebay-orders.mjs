const ENVIRONMENTS = {
  sandbox: 'https://api.sandbox.ebay.com',
  production: 'https://api.ebay.com',
};

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
    })),
  };
}

function ebayErrorMessage(payload, status) {
  const detail = payload?.errors?.[0];
  if (status === 401) {
    return 'eBay rejected the user token. Generate a new Sandbox user token and restart the dev server.';
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
    if (!response.ok) throw new EbayApiError(ebayErrorMessage(payload, response.status), response.status);

    const batch = Array.isArray(payload.orders) ? payload.orders : [];
    orders.push(...batch.map(normalizeOrder));
    total = Number(payload.total || orders.length);
    offset += batch.length;
    if (!payload.next || batch.length < limit || offset >= total) break;
  }

  return {
    environment: config.environment,
    fetchedAt: new Date().toISOString(),
    window: { days, start: start.toISOString(), end: end.toISOString() },
    total,
    orders,
  };
}
