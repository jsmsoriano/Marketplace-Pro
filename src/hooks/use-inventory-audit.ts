import { useCallback, useEffect, useState } from 'react';
import {
  EMPTY_INVENTORY_AUDIT,
  INVENTORY_AUDIT_UPDATED_EVENT,
  loadInventoryAuditState,
  parseEbayActiveListingsCsv,
  saveInventoryAuditState,
  type AuditStatus,
  type InventoryAuditState,
} from '@/lib/inventory-audit';

export function useInventoryAudit() {
  const [state, setState] = useState<InventoryAuditState>(loadInventoryAuditState);

  useEffect(() => {
    const sync = (event: Event) => setState((event as CustomEvent<InventoryAuditState>).detail);
    window.addEventListener(INVENTORY_AUDIT_UPDATED_EVENT, sync);
    return () => window.removeEventListener(INVENTORY_AUDIT_UPDATED_EVENT, sync);
  }, []);

  const commit = useCallback((update: (current: InventoryAuditState) => InventoryAuditState) => {
    setState((current) => {
      const next = update(current);
      saveInventoryAuditState(next);
      return next;
    });
  }, []);

  const importReport = useCallback(async (file: File) => {
    const result = parseEbayActiveListingsCsv(await file.text(), state.listings);
    commit((current) => ({
      ...current,
      sourceFile: file.name,
      importedAt: new Date().toISOString(),
      listings: result.listings,
    }));
    return result;
  }, [commit, state.listings]);

  const setStatus = useCallback((id: string, status: AuditStatus) => {
    commit((current) => ({
      ...current,
      listings: current.listings.map((item) => item.id === id ? {
        ...item,
        status,
        checkedAt: status === 'unchecked' ? null : new Date().toISOString(),
      } : item),
    }));
  }, [commit]);

  const markManyFound = useCallback((ids: string[]) => {
    const selected = new Set(ids);
    const checkedAt = new Date().toISOString();
    commit((current) => ({
      ...current,
      listings: current.listings.map((item) => selected.has(item.id) ? { ...item, status: 'found', checkedAt } : item),
    }));
  }, [commit]);

  const addRelistingItem = useCallback((input: { sku: string; title: string; quantity: number; notes: string }) => {
    const sku = input.sku.trim();
    const title = input.title.trim();
    if (!sku && !title) throw new Error('Enter a SKU or title for the unlisted item.');
    const createdAt = new Date().toISOString();
    commit((current) => ({
      ...current,
      relistingItems: [{
        id: `relist:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        sku,
        title,
        quantity: Math.max(1, Math.floor(input.quantity) || 1),
        notes: input.notes.trim(),
        createdAt,
      }, ...current.relistingItems],
    }));
  }, [commit]);

  const removeRelistingItem = useCallback((id: string) => {
    commit((current) => ({ ...current, relistingItems: current.relistingItems.filter((item) => item.id !== id) }));
  }, [commit]);

  const reset = useCallback(() => {
    saveInventoryAuditState(EMPTY_INVENTORY_AUDIT);
    setState(EMPTY_INVENTORY_AUDIT);
  }, []);

  return { state, importReport, setStatus, markManyFound, addRelistingItem, removeRelistingItem, reset };
}
