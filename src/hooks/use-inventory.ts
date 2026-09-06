import { useCallback, useState } from 'react';
import {
  EMPTY_INVENTORY,
  MAX_BIN_CAPACITY,
  MIN_BIN_CAPACITY,
  capacityForBin,
  cellForSku,
  loadInventoryState,
  normalizeCell,
  parseLocationCsv,
  pullKey,
  saveInventoryState,
  skusInBin,
  type InventoryState,
  type PullStatus,
} from '@/lib/inventory';
import type { NiftyOrder } from '@/lib/orders';

export function useInventory() {
  const [state, setState] = useState<InventoryState>(loadInventoryState);

  const commit = useCallback((update: (current: InventoryState) => InventoryState) => {
    setState((current) => {
      const next = update(current);
      saveInventoryState(next);
      return next;
    });
  }, []);

  const assign = useCallback((cellValue: string, skuValue: string) => {
    const bin = normalizeCell(cellValue);
    const sku = skuValue.trim();
    const alreadyInBin = state.assignments[sku] === bin;
    const occupancy = skusInBin(state.assignments, bin).length;
    const capacity = capacityForBin(state, bin);
    if (!alreadyInBin && occupancy >= capacity) return `${bin} is full (${occupancy}/${capacity}).`;
    commit((current) => ({ ...current, assignments: { ...current.assignments, [sku]: bin } }));
    return null;
  }, [commit, state]);

  const setBinCapacity = useCallback((cellValue: string, capacity: number) => {
    const bin = normalizeCell(cellValue);
    const occupancy = skusInBin(state.assignments, bin).length;
    if (capacity < MIN_BIN_CAPACITY || capacity > MAX_BIN_CAPACITY) return `Capacity must be ${MIN_BIN_CAPACITY}–${MAX_BIN_CAPACITY}.`;
    if (capacity < occupancy) return `${bin} already contains ${occupancy} items.`;
    commit((current) => ({ ...current, binCapacities: { ...current.binCapacities, [bin]: capacity } }));
    return null;
  }, [commit, state.assignments]);

  const setPullStatus = useCallback((orders: NiftyOrder[], status: PullStatus) => {
    commit((current) => {
      const assignments = { ...current.assignments };
      const pulls = { ...current.pulls };
      for (const order of orders) {
        const key = pullKey(order);
        const cell = cellForSku(assignments, order.sku);
        if (status === 'pulled' && cell) delete assignments[order.sku];
        pulls[key] = {
          status,
          updatedAt: new Date().toISOString(),
          releasedCell: status === 'pulled' ? cell ?? undefined : current.pulls[key]?.releasedCell,
        };
      }
      return { ...current, assignments, pulls };
    });
  }, [commit]);

  const importLocations = useCallback(async (file: File) => {
    const records = parseLocationCsv(await file.text());
    let added = 0;
    let conflicts = 0;
    const nextAssignments = { ...state.assignments };
    for (const record of records) {
      const alreadyInBin = nextAssignments[record.sku] === record.cell;
      const occupancy = skusInBin(nextAssignments, record.cell).length;
      if (!alreadyInBin && occupancy >= capacityForBin(state, record.cell)) {
        conflicts += 1;
        continue;
      }
      nextAssignments[record.sku] = record.cell;
      added += 1;
    }
    commit((current) => {
      return { ...current, assignments: nextAssignments };
    });
    return { added, conflicts };
  }, [commit, state]);

  const reset = useCallback(() => {
    saveInventoryState(EMPTY_INVENTORY);
    setState(EMPTY_INVENTORY);
  }, []);

  return { state, assign, setBinCapacity, setPullStatus, importLocations, reset };
}
