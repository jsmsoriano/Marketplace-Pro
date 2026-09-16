import type { NiftyOrder } from '@/lib/orders';

export type PullStatus = 'ready' | 'pulled' | 'packed' | 'shipped' | 'missing';

export type PullRecord = {
  status: PullStatus;
  updatedAt: string;
  releasedCell?: string;
};

export type InventoryState = {
  version: 2;
  assignments: Record<string, string>;
  binCapacities: Record<string, number>;
  pulls: Record<string, PullRecord>;
};

type LegacyInventoryState = {
  version: 1;
  assignments: Record<string, string>;
  pulls: Record<string, PullRecord>;
};

export const DEFAULT_BIN_CAPACITY = 20;
export const MIN_BIN_CAPACITY = 15;
export const MAX_BIN_CAPACITY = 20;
export const BINS_PER_SHELF = 15;
export const INVENTORY_STORAGE_KEY = 'marketplace-pro:inventory:v2';
export const INVENTORY_UPDATED_EVENT = 'marketplace-pro:inventory-updated';
const LEGACY_STORAGE_KEY = 'marketplace-pro:inventory:v1';

export const EMPTY_INVENTORY: InventoryState = {
  version: 2,
  assignments: {},
  binCapacities: {},
  pulls: {},
};

export function loadInventoryState(): InventoryState {
  try {
    const current = localStorage.getItem(INVENTORY_STORAGE_KEY);
    if (current) {
      const parsed = JSON.parse(current) as InventoryState;
      if (parsed.version === 2 && parsed.assignments && parsed.binCapacities && parsed.pulls) return parsed;
    }

    const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!legacy) return EMPTY_INVENTORY;
    const parsed = JSON.parse(legacy) as LegacyInventoryState;
    if (parsed.version !== 1 || !parsed.assignments || !parsed.pulls) return EMPTY_INVENTORY;
    const migrated: InventoryState = {
      version: 2,
      assignments: Object.fromEntries(Object.entries(parsed.assignments).map(([bin, sku]) => [sku, bin])),
      binCapacities: {},
      pulls: parsed.pulls,
    };
    saveInventoryState(migrated);
    return migrated;
  } catch {
    return EMPTY_INVENTORY;
  }
}

export function saveInventoryState(state: InventoryState) {
  localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(state));
  queueMicrotask(() => window.dispatchEvent(new CustomEvent(INVENTORY_UPDATED_EVENT, { detail: state })));
}

export function pullKey(order: NiftyOrder): string {
  return [order.marketplace, order.sku, order.soldAt, order.salePrice, order.itemName]
    .map((part) => String(part).trim().toLowerCase())
    .join('|');
}

export function normalizeCell(value: string): string {
  return value.replace(/\s+/g, '').toUpperCase();
}

export function validCell(value: string): boolean {
  return /^[A-Z](?:0[1-9]|1[0-5])$/.test(normalizeCell(value));
}

export function cellForSku(assignments: Record<string, string>, sku: string): string | null {
  return assignments[sku] ?? null;
}

export function skusInBin(assignments: Record<string, string>, bin: string): string[] {
  return Object.entries(assignments)
    .filter(([, assignedBin]) => assignedBin === bin)
    .map(([sku]) => sku)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

export function capacityForBin(state: InventoryState, bin: string): number {
  return state.binCapacities[bin] ?? DEFAULT_BIN_CAPACITY;
}

export function parseLocationCsv(text: string): Array<{ cell: string; sku: string }> {
  const rows = text.replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (rows.length < 2) throw new Error('Location CSV has no inventory rows.');
  const headers = rows[0].split(',').map((header) => header.trim().toLowerCase());
  const skuIndex = headers.findIndex((header) => header === 'sku');
  const cellIndex = headers.findIndex((header) => ['cell', 'location', 'bin'].includes(header));
  if (skuIndex < 0 || cellIndex < 0) throw new Error('Location CSV needs SKU and Bin (or Cell/Location) columns.');
  return rows.slice(1).flatMap((line) => {
    const fields = line.split(',').map((field) => field.trim().replace(/^"|"$/g, ''));
    const sku = fields[skuIndex] ?? '';
    const cell = normalizeCell(fields[cellIndex] ?? '');
    return sku && validCell(cell) ? [{ sku, cell }] : [];
  });
}

export function latestSalesDay(orders: NiftyOrder[]): string | null {
  let latest = '';
  for (const order of orders) {
    const day = order.soldAt.slice(0, 10);
    if (day > latest) latest = day;
  }
  return latest || null;
}
