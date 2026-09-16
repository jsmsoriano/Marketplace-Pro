export type AuditStatus = 'unchecked' | 'found' | 'missing';

export type AuditListing = {
  id: string;
  sku: string;
  title: string;
  itemNumber: string;
  quantity: number;
  price: number;
  endDate: string;
  status: AuditStatus;
  checkedAt: string | null;
};

export type RelistingItem = {
  id: string;
  sku: string;
  title: string;
  quantity: number;
  notes: string;
  createdAt: string;
};

export type InventoryAuditState = {
  version: 1;
  sourceFile: string | null;
  importedAt: string | null;
  listings: AuditListing[];
  relistingItems: RelistingItem[];
};

export type AuditImportResult = {
  listings: AuditListing[];
  rowCount: number;
  preservedChecks: number;
  missingSkuCount: number;
};

export const INVENTORY_AUDIT_STORAGE_KEY = 'marketplace-pro:inventory-audit:v1';
export const INVENTORY_AUDIT_UPDATED_EVENT = 'marketplace-pro:inventory-audit-updated';

export const EMPTY_INVENTORY_AUDIT: InventoryAuditState = {
  version: 1,
  sourceFile: null,
  importedAt: null,
  listings: [],
  relistingItems: [],
};

const COLUMN_ALIASES = {
  sku: ['custom label', 'custom label sku', 'customlabel', 'sku', 'seller sku', 'stock number'],
  title: ['title', 'item title', 'listing title'],
  itemNumber: ['item number', 'item id', 'itemid', 'listing id', 'listingid'],
  quantity: ['quantity', 'available quantity', 'availablequantity', 'qty', 'quantity available'],
  price: ['price', 'current price', 'currentprice', 'start price', 'buy it now price'],
  endDate: ['end date', 'enddate', 'listing end date', 'scheduled end date'],
} as const;

export function loadInventoryAuditState(): InventoryAuditState {
  try {
    const raw = localStorage.getItem(INVENTORY_AUDIT_STORAGE_KEY);
    if (!raw) return EMPTY_INVENTORY_AUDIT;
    const parsed = JSON.parse(raw) as InventoryAuditState;
    if (parsed.version !== 1 || !Array.isArray(parsed.listings) || !Array.isArray(parsed.relistingItems)) {
      return EMPTY_INVENTORY_AUDIT;
    }
    return parsed;
  } catch {
    return EMPTY_INVENTORY_AUDIT;
  }
}

export function saveInventoryAuditState(state: InventoryAuditState) {
  localStorage.setItem(INVENTORY_AUDIT_STORAGE_KEY, JSON.stringify(state));
  queueMicrotask(() => window.dispatchEvent(new CustomEvent(INVENTORY_AUDIT_UPDATED_EVENT, { detail: state })));
}

export function parseEbayActiveListingsCsv(text: string, previous: AuditListing[] = []): AuditImportResult {
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ''));
  if (rows.length < 2) throw new Error('This CSV has headers but no listing rows.');

  const headers = rows[0].map((header) => header.trim());
  const normalizedHeaders = headers.map(normalizeHeader);
  const indexes = Object.fromEntries(Object.entries(COLUMN_ALIASES).map(([key, aliases]) => [
    key,
    normalizedHeaders.findIndex((header) => aliases.some((alias) => normalizeHeader(alias) === header)),
  ])) as Record<keyof typeof COLUMN_ALIASES, number>;

  const missing = (['title', 'itemNumber'] as const).filter((key) => indexes[key] < 0);
  if (missing.length) {
    const labels = missing.map((key) => key === 'itemNumber' ? 'Item Number' : 'Title');
    throw new Error(`This does not look like an eBay Active Listings report. Missing: ${labels.join(', ')}.`);
  }

  const previousByItem = new Map(previous.filter((item) => item.itemNumber).map((item) => [item.itemNumber, item]));
  const previousBySku = new Map(previous.filter((item) => item.sku).map((item) => [item.sku.toLowerCase(), item]));
  const seen = new Set<string>();
  let preservedChecks = 0;

  const listings = rows.slice(1).flatMap((row, rowIndex) => {
    if (!row.some((value) => value.trim())) return [];
    const read = (key: keyof typeof COLUMN_ALIASES) => indexes[key] < 0 ? '' : (row[indexes[key]] ?? '').trim();
    const itemNumber = read('itemNumber');
    const title = read('title');
    const sku = read('sku');
    if (!itemNumber && !title && !sku) return [];

    const identity = itemNumber || `${sku.toLowerCase()}|${title.toLowerCase()}`;
    if (seen.has(identity)) return [];
    seen.add(identity);

    const prior = previousByItem.get(itemNumber) || (sku ? previousBySku.get(sku.toLowerCase()) : undefined);
    if (prior?.status !== 'unchecked') preservedChecks += 1;
    return [{
      id: itemNumber ? `ebay:${itemNumber}` : `ebay:row-${rowIndex + 2}:${identity}`,
      sku,
      title,
      itemNumber,
      quantity: Math.max(0, integer(read('quantity'), 1)),
      price: money(read('price')),
      endDate: read('endDate'),
      status: prior?.status ?? 'unchecked',
      checkedAt: prior?.checkedAt ?? null,
    } satisfies AuditListing];
  });

  if (!listings.length) throw new Error('No active listings were found in this report.');
  return {
    listings,
    rowCount: listings.length,
    preservedChecks,
    missingSkuCount: listings.filter((item) => !item.sku).length,
  };
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '');
}

function integer(value: string, fallback: number) {
  const parsed = Number.parseInt(value.replace(/,/g, ''), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function money(value: string) {
  const negative = /^\s*\(.*\)\s*$/.test(value);
  const parsed = Number(value.replace(/[^0-9.-]/g, ''));
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -parsed : parsed;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(value); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value);
      if (row.some((cell) => cell.length)) rows.push(row);
      row = [];
      value = '';
    } else value += char;
  }
  row.push(value);
  if (row.some((cell) => cell.length)) rows.push(row);
  return rows;
}
