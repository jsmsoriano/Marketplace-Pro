import { useMemo, useState, type ReactNode } from 'react';
import { demoOrders } from '@/data/demoOrders';
import { parseNiftyCsv, type NiftyOrder } from '@/lib/orders';
import { SalesDataContext, type SalesDataContextValue } from '@/contexts/sales-data';

type StoredSalesData = {
  version: 1;
  orders: NiftyOrder[];
  fileName: string;
  importedAt: string;
};

const STORAGE_KEY = 'marketplace-pro:sales-data:v1';
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

  const value = useMemo<SalesDataContextValue>(() => ({
    orders: stored?.orders ?? demoOrders,
    mode: stored ? 'imported' : 'demo',
    fileName: stored?.fileName ?? null,
    importedAt: stored?.importedAt ?? null,
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
    useDemoData: () => {
      localStorage.removeItem(STORAGE_KEY);
      setStored(null);
    },
  }), [stored]);

  return <SalesDataContext.Provider value={value}>{children}</SalesDataContext.Provider>;
}
