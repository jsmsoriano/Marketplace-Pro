import { useMemo, useState, type ReactNode } from 'react';
import { demoOrders } from '@/data/demoOrders';
import { inferBrand, parseNiftyCsv, type NiftyOrder } from '@/lib/orders';
import type { EbayOrdersResponse } from '@/lib/api';
import type { ActiveInventoryItem } from '@/lib/import-templates';
import { SalesDataContext, type SalesDataContextValue } from '@/contexts/sales-data';

type StoredSalesData = {
  version: 1;
  orders: NiftyOrder[];
  fileName: string;
  importedAt: string;
};

const STORAGE_KEY = 'marketplace-pro:sales-data:v1';
const ACTIVE_INVENTORY_STORAGE_KEY = 'marketplace-pro:active-inventory:v1';

type StoredActiveInventory = { version: 1; items: ActiveInventoryItem[]; importedAt: string };

function loadActiveInventory(): StoredActiveInventory | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(ACTIVE_INVENTORY_STORAGE_KEY) || 'null') as StoredActiveInventory | null;
    return parsed?.version === 1 && Array.isArray(parsed.items) ? parsed : null;
  } catch { return null; }
}
function loadStoredData(): StoredSalesData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredSalesData;
    return parsed.version === 1 && Array.isArray(parsed.orders) ? parsed : null;
  } catch {
    return null;
  }
}

export function SalesDataProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = useState<StoredSalesData | null>(loadStoredData);
  const [active, setActive] = useState<StoredActiveInventory | null>(loadActiveInventory);

  const value = useMemo<SalesDataContextValue>(() => ({
    orders: stored?.orders ?? demoOrders,
    mode: stored ? 'imported' : 'demo',
    fileName: stored?.fileName ?? null,
    importedAt: stored?.importedAt ?? null,
    activeInventory: active?.items ?? [],
    activeInventoryImportedAt: active?.importedAt ?? null,
    importCsv: async (file) => {
      const orders = parseNiftyCsv(await file.text());
      const next: StoredSalesData = {
        version: 1,
        orders,
        fileName: file.name,
        importedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStored(next);
      return orders.length;
    },
    importActiveInventory: (items) => {
      const next: StoredActiveInventory = { version: 1, items, importedAt: new Date().toISOString() };
      localStorage.setItem(ACTIVE_INVENTORY_STORAGE_KEY, JSON.stringify(next));
      setActive(next);
      return items.reduce((sum, item) => sum + item.quantity, 0);
    },
    mergeEbayOrders: (data) => {
      const incoming = normalizeEbaySales(data);
      const current = stored?.orders ?? [];
      const nextOrders = [...current];
      const matchedExisting = new Set<number>();
      let added = 0;
      let enriched = 0;
      for (const sale of incoming) {
        const exactIndex = nextOrders.findIndex((order) => order.id === sale.id);
        if (exactIndex >= 0) {
          nextOrders[exactIndex] = { ...nextOrders[exactIndex], ...sale };
          continue;
        }
        const previouslyEnrichedIndex = nextOrders.findIndex((order) => order.externalOrderId === sale.externalOrderId && order.externalLineItemId === sale.externalLineItemId);
        if (previouslyEnrichedIndex >= 0) {
          nextOrders[previouslyEnrichedIndex] = {
            ...nextOrders[previouslyEnrichedIndex],
            categoryId: sale.categoryId,
            categoryName: sale.categoryName,
            categorySource: sale.categorySource,
          };
          continue;
        }
        const matchIndex = nextOrders.findIndex((order, index) => !matchedExisting.has(index) && order.marketplace.toLowerCase() === 'ebay' && order.sku && order.sku === sale.sku && order.soldAt.slice(0, 10) === sale.soldAt.slice(0, 10));
        if (matchIndex >= 0) {
          nextOrders[matchIndex] = {
            ...nextOrders[matchIndex],
            categoryId: sale.categoryId,
            categoryName: sale.categoryName,
            categorySource: sale.categorySource,
            source: 'nifty+ebay',
            externalOrderId: sale.externalOrderId,
            externalLineItemId: sale.externalLineItemId,
          };
          matchedExisting.add(matchIndex);
          enriched += 1;
          continue;
        }
        nextOrders.push(sale);
        added += 1;
      }
      const next: StoredSalesData = {
        version: 1,
        orders: nextOrders,
        fileName: stored?.fileName ?? 'Official eBay sync',
        importedAt: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      setStored(next);
      return { added, enriched };
    },
    useDemoData: () => {
      localStorage.removeItem(STORAGE_KEY);
      setStored(null);
    },
  }), [active, stored]);

  return <SalesDataContext.Provider value={value}>{children}</SalesDataContext.Provider>;
}

function normalizeEbaySales(data: EbayOrdersResponse): NiftyOrder[] {
  return data.orders.flatMap((order) => order.lineItems.flatMap((item) => {
    const quantity = Math.max(1, item.quantity || 1);
    return Array.from({ length: quantity }, (_, unitIndex) => ({
      id: `ebay:${order.orderId}:${item.lineItemId}:${unitIndex + 1}`,
      marketplace: 'eBay',
      itemName: item.title || 'eBay item',
      sku: item.sku,
      brand: inferBrand(item.title || ''),
      daysListed: 0,
      orderStatus: order.orderPaymentStatus || order.orderFulfillmentStatus,
      soldAt: order.creationDate,
      buyerState: '',
      buyerCountry: '',
      salePrice: item.lineItemCost / quantity,
      collectedShipping: item.shippingCost / quantity,
      refunded: 0,
      standardFees: 0,
      shippingFees: 0,
      promotedFees: 0,
      costOfGoods: 0,
      shippingExpenses: 0,
      otherExpenses: 0,
      totalProfit: 0,
      categoryId: item.categoryId || undefined,
      categoryName: item.categoryName || undefined,
      categorySource: item.categorySource === 'official-ebay' ? 'official-ebay' : 'inferred',
      source: 'ebay-api',
      externalOrderId: order.orderId,
      externalLineItemId: item.lineItemId,
    }));
  }));
}
