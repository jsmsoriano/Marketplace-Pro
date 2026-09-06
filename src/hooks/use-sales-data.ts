import { useContext } from 'react';
import { SalesDataContext } from '@/contexts/sales-data';

export function useSalesData() {
  const context = useContext(SalesDataContext);
  if (!context) throw new Error('useSalesData must be used within SalesDataProvider');
  return context;
}
