export type DoctorResponse = {
  ebay: EbayStatusResponse;
  last30days: { path: string; available: boolean };
};

export type EbayStatusResponse = {
  environment: 'sandbox' | 'production';
  configured: boolean;
  runameConfigured: boolean;
  source: string;
};

export type EbayOrder = {
  orderId: string;
  creationDate: string;
  lastModifiedDate: string;
  orderFulfillmentStatus: string;
  orderPaymentStatus: string;
  cancelState: string | null;
  currency: string;
  total: number;
  subtotal: number;
  deliveryCost: number;
  lineItems: Array<{
    lineItemId: string;
    legacyItemId: string;
    sku: string;
    title: string;
    quantity: number;
    lineItemCost: number;
    total: number;
    shippingCost: number;
    fulfillmentStatus: string;
    categoryId: string;
    categoryName: string;
    categorySource: 'official-ebay' | 'unavailable';
  }>;
};

export type EbayOrdersResponse = {
  environment: 'sandbox' | 'production';
  fetchedAt: string;
  window: { days: number; start: string; end: string };
  total: number;
  categorizedItems: number;
  orders: EbayOrder[];
};

async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok || data?.ok === false) {
    throw new Error(data?.error || `Request failed (${res.status})`);
  }
  return data as T;
}

export async function fetchDoctor(): Promise<DoctorResponse> {
  const res = await fetch('/api/doctor');
  if (!res.ok) throw new Error('Doctor check failed');
  return res.json();
}

export async function fetchEbayStatus(): Promise<EbayStatusResponse> {
  const res = await fetch('/api/ebay/status');
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error || 'eBay status check failed');
  return data;
}

export function fetchEbayOrders(days = 90) {
  return post<{ ok: true; data: EbayOrdersResponse }>('/api/ebay/orders', { days });
}

export function researchTrends(topic: string, opts: { days?: number; search?: string } = {}) {
  return post<{ ok: true; topic: string; data: Record<string, unknown> }>(
    '/api/research/trends',
    { topic, days: opts.days ?? 30, quick: true, search: opts.search }
  );
}

export function optimizeListing(input: {
  title: string;
  description?: string;
  salesStats?: {
    mean: number;
    median: number;
    p25: number;
    p75: number;
    sample_size: number;
  } | null;
}) {
  return post<{
    ok: true;
    optimization: {
      optimizedTitle: string;
      optimizedDescription: string;
      suggestedPrice: number | null;
      priceBand: { low: number | null; high: number | null; median: number | null; mean: number | null };
      tips: string[];
      source: string;
    };
    salesStats: Record<string, unknown> | null;
  }>('/api/optimize', input);
}
