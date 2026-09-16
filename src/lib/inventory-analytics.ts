import type { ActiveInventoryItem } from '@/lib/import-templates';
import { categoryForOrder, filterOrdersByPeriod, inferBrand, inferItemType, orderDate, periodDays, type NiftyOrder, type Period } from '@/lib/orders';

export type InventoryAction = 'Replenish' | 'Healthy' | 'Watch' | 'Overstock';

export type InventoryOpportunity = {
  key: string;
  brand: string;
  category: string;
  soldUnits: number;
  activeUnits: number;
  sellThrough: number;
  salesPerMonth: number;
  daysOfSupply: number | null;
  suggestedBuy: number;
  action: InventoryAction;
};

export function inventoryOpportunities(orders: NiftyOrder[], inventory: ActiveInventoryItem[], period: Period): InventoryOpportunity[] {
  const sales = filterOrdersByPeriod(orders, period);
  const windowDays = measurementDays(sales, period);
  const groups = new Map<string, { brand: string; category: string; soldUnits: number; activeUnits: number }>();
  const ensure = (brand: string, category: string) => {
    const key = `${brand.toLowerCase()}|${category.toLowerCase()}`;
    const current = groups.get(key) ?? { brand, category, soldUnits: 0, activeUnits: 0 };
    groups.set(key, current);
    return current;
  };
  for (const order of sales) ensure(order.brand || inferBrand(order.itemName), categoryForOrder(order)).soldUnits += 1;
  for (const item of inventory) ensure(item.brand || inferBrand(item.itemName), inventoryCategory(item)).activeUnits += Math.max(0, item.quantity);

  return [...groups.entries()].map(([key, group]) => {
    const salesPerMonth = group.soldUnits / windowDays * 30;
    const sellThrough = group.soldUnits + group.activeUnits ? group.soldUnits / (group.soldUnits + group.activeUnits) : 0;
    const daysOfSupply = salesPerMonth > 0 ? group.activeUnits / salesPerMonth * 30 : null;
    const targetStock = Math.ceil(salesPerMonth * 2);
    const suggestedBuy = Math.max(0, targetStock - group.activeUnits);
    return { key, ...group, sellThrough, salesPerMonth, daysOfSupply, suggestedBuy, action: inventoryAction(group.soldUnits, group.activeUnits, sellThrough, daysOfSupply) };
  }).sort((a, b) => actionRank(a.action) - actionRank(b.action) || b.salesPerMonth - a.salesPerMonth || b.sellThrough - a.sellThrough);
}

export type ReconciliationSummary = {
  activeListings: number;
  activeUnits: number;
  missingSku: ActiveInventoryItem[];
  missingCogs: ActiveInventoryItem[];
  missingCategory: ActiveInventoryItem[];
  missingBin: ActiveInventoryItem[];
  duplicateSkus: string[];
  soldStillActive: string[];
  binWithoutActive: string[];
};

export function reconcileInventory(orders: NiftyOrder[], inventory: ActiveInventoryItem[], assignments: Record<string, string>): ReconciliationSummary {
  const skuCounts = new Map<string, number>();
  for (const item of inventory) if (item.sku.trim()) skuCounts.set(normalizeSku(item.sku), (skuCounts.get(normalizeSku(item.sku)) ?? 0) + 1);
  const activeSkus = new Set(skuCounts.keys());
  const soldSkus = new Set(orders.map((order) => normalizeSku(order.sku)).filter(Boolean));
  return {
    activeListings: inventory.length,
    activeUnits: inventory.reduce((sum, item) => sum + Math.max(0, item.quantity), 0),
    missingSku: inventory.filter((item) => !item.sku.trim()),
    missingCogs: inventory.filter((item) => item.costOfGoods <= 0),
    missingCategory: inventory.filter((item) => !item.categoryId && !item.categoryName),
    missingBin: inventory.filter((item) => item.sku.trim() && !item.bin.trim() && !assignments[item.sku.trim()]),
    duplicateSkus: [...skuCounts].filter(([, count]) => count > 1).map(([sku]) => sku),
    soldStillActive: [...soldSkus].filter((sku) => activeSkus.has(sku)),
    binWithoutActive: Object.keys(assignments).filter((sku) => !activeSkus.has(normalizeSku(sku))),
  };
}

function inventoryCategory(item: ActiveInventoryItem) {
  if (item.categoryName.trim()) {
    const parts = item.categoryName.split(/\s*(?::|>)\s*/).filter(Boolean);
    return parts.at(-1) || item.categoryName;
  }
  return inferItemType(item.itemName);
}

function measurementDays(orders: NiftyOrder[], period: Period) {
  const fixed = periodDays(period);
  if (fixed != null) return fixed;
  const dates = orders.map((order) => orderDate(order).getTime()).filter(Number.isFinite);
  if (dates.length < 2) return 1;
  return Math.max(1, Math.ceil((Math.max(...dates) - Math.min(...dates)) / 86_400_000) + 1);
}

function inventoryAction(sold: number, active: number, sellThrough: number, daysOfSupply: number | null): InventoryAction {
  if (active >= 3 && (sold === 0 || (daysOfSupply != null && daysOfSupply > 180))) return 'Overstock';
  if (sold >= 2 && sellThrough >= 0.4 && (daysOfSupply == null || daysOfSupply < 75)) return 'Replenish';
  if (sold < 2) return 'Watch';
  return 'Healthy';
}

function actionRank(action: InventoryAction) { return { Replenish: 0, Healthy: 1, Watch: 2, Overstock: 3 }[action]; }
function normalizeSku(value: string) { return value.trim().toLowerCase(); }
