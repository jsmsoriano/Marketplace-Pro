import { createContext } from 'react';
import type { NiftyOrder } from '@/lib/orders';

export type DataMode = 'demo' | 'imported';

export type SalesDataContextValue = {
  orders: NiftyOrder[];
  mode: DataMode;
  fileName: string | null;
  importedAt: string | null;
  importCsv: (file: File) => Promise<number>;
  useDemoData: () => void;
};

export const SalesDataContext = createContext<SalesDataContextValue | null>(null);
