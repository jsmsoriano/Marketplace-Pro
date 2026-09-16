import { createContext } from 'react';
import type { NiftyOrder } from '@/lib/orders';
import type { EbayOrdersResponse } from '@/lib/api';
import type { ActiveInventoryItem } from '@/lib/import-templates';

export type DataMode = 'demo' | 'imported';

export type SalesDataContextValue = {
  orders: NiftyOrder[];
  mode: DataMode;
  fileName: string | null;
  importedAt: string | null;
  activeInventory: ActiveInventoryItem[];
  activeInventoryImportedAt: string | null;
  importCsv: (file: File) => Promise<number>;
  importActiveInventory: (items: ActiveInventoryItem[]) => number;
  mergeEbayOrders: (data: EbayOrdersResponse) => { added: number; enriched: number };
  useDemoData: () => void;
};

export const SalesDataContext = createContext<SalesDataContextValue | null>(null);
