import { useMemo, useState } from 'react';
import { FileUp, Grid3X3, ListChecks, MapPin, PackagePlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ImportOrdersButton } from '@/components/ImportOrdersButton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { useInventory } from '@/hooks/use-inventory';
import { useSalesData } from '@/hooks/use-sales-data';
import { reconcileInventory } from '@/lib/inventory-analytics';
import {
  BINS_PER_SHELF,
  capacityForBin,
  latestSalesDay,
  normalizeCell,
  pullKey,
  skusInBin,
  validCell,
  type PullStatus,
} from '@/lib/inventory';

const DEFAULT_ROWS = 8;
const DEFAULT_COLUMNS = BINS_PER_SHELF;

type CellState = 'available' | 'occupied' | 'nearly-full' | 'full' | 'attention';

export default function InventoryMap() {
  const { orders, activeInventory } = useSalesData();
  const { state, assign, setBinCapacity } = useInventory();
  const [cellDraft, setCellDraft] = useState('');
  const [skuDraft, setSkuDraft] = useState('');
  const [selectedBin, setSelectedBin] = useState('A01');
  const [selectedShelf, setSelectedShelf] = useState('A');
  const [capacityDraft, setCapacityDraft] = useState('20');
  const latestDay = useMemo(() => latestSalesDay(orders), [orders]);
  const latestOrders = useMemo(() => latestDay ? orders.filter((order) => order.soldAt.startsWith(latestDay)) : [], [latestDay, orders]);
  const skuPullStates = useMemo(() => {
    const result = new Map<string, PullStatus>();
    for (const order of latestOrders) result.set(order.sku, state.pulls[pullKey(order)]?.status ?? 'ready');
    return result;
  }, [latestOrders, state.pulls]);
  const assignedBins = useMemo(() => Object.values(state.assignments), [state.assignments]);
  const dimensions = useMemo(() => gridDimensions(assignedBins), [assignedBins]);
  const cells = useMemo(() => makeCells(dimensions.rows, dimensions.columns), [dimensions.columns, dimensions.rows]);
  const binContents = useMemo(() => new Map(cells.map((bin) => [bin, skusInBin(state.assignments, bin)])), [cells, state.assignments]);
  const totalCapacity = useMemo(() => cells.reduce((sum, bin) => sum + capacityForBin(state, bin), 0), [cells, state]);
  const availableSpaces = totalCapacity - Object.keys(state.assignments).length;
  const binsWithSpace = useMemo(() => cells.filter((bin) => (binContents.get(bin)?.length ?? 0) < capacityForBin(state, bin)), [binContents, cells, state]);
  const reserved = useMemo(() => Object.keys(state.assignments).filter((sku) => skuPullStates.get(sku) === 'ready').length, [skuPullStates, state.assignments]);
  const missing = useMemo(() => Object.keys(state.assignments).filter((sku) => skuPullStates.get(sku) === 'missing').length, [skuPullStates, state.assignments]);
  const selectedSkus = binContents.get(selectedBin) ?? [];
  const shelves = useMemo(() => Array.from({ length: dimensions.rows }, (_, index) => String.fromCharCode(65 + index)), [dimensions.rows]);
  const shelfCells = useMemo(() => cells.filter((cell) => cell.startsWith(selectedShelf)), [cells, selectedShelf]);
  const reconciliation = useMemo(() => reconcileInventory(orders, activeInventory, state.assignments), [activeInventory, orders, state.assignments]);

  const selectBin = (cell: string) => {
    setSelectedBin(cell);
    setSelectedShelf(cell.charAt(0));
    setCellDraft(cell);
    setCapacityDraft(String(capacityForBin(state, cell)));
  };

  const saveAssignment = () => {
    const cell = normalizeCell(cellDraft);
    const sku = skuDraft.trim();
    if (!sku) {
      toast({ title: 'SKU required', variant: 'destructive' });
      return;
    }
    if (!validCell(cell)) {
      toast({ title: 'Use a bin from A01 to Z15', description: 'Use one shelf letter and a bin number from 01 through 15.', variant: 'destructive' });
      return;
    }
    const error = assign(cell, sku);
    if (error) {
      toast({ title: 'Bin unavailable', description: error, variant: 'destructive' });
      return;
    }
    setCellDraft('');
    setSkuDraft('');
    setSelectedBin(cell);
    setSelectedShelf(cell.charAt(0));
    toast({ title: `${sku} assigned to ${cell}`, description: `${skusInBin({ ...state.assignments, [sku]: cell }, cell).length}/${capacityForBin(state, cell)} spaces used.` });
  };

  const saveCapacity = () => {
    const capacity = Number(capacityDraft);
    const error = setBinCapacity(selectedBin, capacity);
    if (error) {
      toast({ title: 'Capacity not updated', description: error, variant: 'destructive' });
      return;
    }
    toast({ title: `${selectedBin} capacity set to ${capacity}` });
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Storage capacity</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Inventory Map</h1><p className="mt-2 text-sm text-muted-foreground">Each shelf has 15 bins. Every bin holds multiple clothing SKUs and releases one space when an item is pulled.</p></div>
        <Button variant="outline" asChild><Link to="/pull-list"><ListChecks />Open pull list</Link></Button>
      </div>

      <section className="grid grid-cols-3 gap-2 lg:hidden">
        <MobileMetric label="Open" value={availableSpaces} tone="emerald" />
        <MobileMetric label="Stored" value={Object.keys(state.assignments).length} tone="blue" />
        <MobileMetric label="Pull" value={reserved} tone="amber" />
      </section>

      <section className="hidden gap-3 lg:grid lg:grid-cols-5">
        <Metric label="Total bins" value={cells.length} />
        <Metric label="Open spaces" value={availableSpaces} tone="emerald" />
        <Metric label="Stored pieces" value={Object.keys(state.assignments).length} tone="blue" />
        <Metric label="Sold · pull next" value={reserved} tone="amber" />
        <Metric label="Exceptions" value={missing} tone="red" />
      </section>

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-border p-4 sm:flex-row sm:items-center"><div><h2 className="font-semibold">Shelf and bin grid</h2><p className="mt-1 text-xs text-muted-foreground">Rows are shelves; each shelf contains 15 numbered bins.</p></div><div className="flex flex-wrap gap-3 text-[11px]"><Legend color="bg-emerald-100 border-emerald-300" label="Empty" /><Legend color="bg-blue-100 border-blue-300" label="In use" /><Legend color="bg-amber-100 border-amber-300" label="Nearly full" /><Legend color="bg-slate-800 border-slate-900" label="Full" /><Legend color="bg-red-100 border-red-300" label="Needs attention" /></div></div>
          <div className="border-b border-border p-4 lg:hidden">
            <div className="flex items-center justify-between gap-3">
              <div>
                <Label htmlFor="mobile-shelf" className="text-xs text-muted-foreground">Shelf</Label>
                <p className="mt-1 text-sm font-semibold">Shelf {selectedShelf} · 15 bins</p>
              </div>
              <select id="mobile-shelf" value={selectedShelf} onChange={(event) => setSelectedShelf(event.target.value)} className="h-10 min-w-24 rounded-md border border-input bg-background px-3 text-sm font-semibold shadow-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {shelves.map((shelf) => <option key={shelf} value={shelf}>Shelf {shelf}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 p-3 sm:grid-cols-5 lg:hidden">
            {shelfCells.map((cell) => {
              const skus = binContents.get(cell) ?? [];
              const capacity = capacityForBin(state, cell);
              const binState = stateForBin(skus, capacity, skuPullStates);
              return <button key={cell} type="button" onClick={() => selectBin(cell)} className={`min-h-24 rounded-lg border p-3 text-left transition active:scale-[0.98] ${cellStyles[binState]} ${selectedBin === cell ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}><span className="block text-xs font-semibold uppercase tracking-wide opacity-70">{cell}</span><span className="mt-2 block text-base font-bold tabular-nums">{skus.length}/{capacity}</span><span className="mt-1 block text-[10px] leading-tight opacity-70">{capacity - skus.length} open</span></button>;
            })}
          </div>
          <div className="hidden overflow-auto p-4 lg:block">
            <div className="grid min-w-[900px] gap-2" style={{ gridTemplateColumns: `repeat(${dimensions.columns}, minmax(64px, 1fr))` }}>
              {cells.map((cell) => {
                const skus = binContents.get(cell) ?? [];
                const capacity = capacityForBin(state, cell);
                const binState = stateForBin(skus, capacity, skuPullStates);
                return <button key={cell} type="button" onClick={() => selectBin(cell)} className={`min-h-20 rounded-lg border p-2 text-left transition hover:-translate-y-0.5 hover:shadow-sm ${cellStyles[binState]} ${selectedBin === cell ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}><span className="block text-[10px] font-semibold uppercase tracking-wide opacity-70">{cell}</span><span className="mt-2 block text-sm font-bold tabular-nums">{skus.length}/{capacity}</span><span className="mt-1 block text-[10px] opacity-70">{capacity - skus.length} spaces open</span></button>;
              })}
            </div>
          </div>
        </div>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center gap-2"><PackagePlus className="h-4 w-4" /><h2 className="font-semibold">Put away inventory</h2></div><div className="mt-4 space-y-4"><div className="space-y-2"><Label htmlFor="inventory-sku">Permanent SKU</Label><Input id="inventory-sku" value={skuDraft} onChange={(event) => setSkuDraft(event.target.value)} placeholder="7859" /></div><div className="space-y-2"><Label htmlFor="inventory-cell">Bin</Label><Input id="inventory-cell" value={cellDraft} onChange={(event) => setCellDraft(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') saveAssignment(); }} className="uppercase" placeholder="A01" maxLength={3} /></div><Button className="w-full" onClick={saveAssignment}><MapPin />Assign to bin</Button></div></div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center justify-between gap-2"><div><p className="text-xs text-muted-foreground">Selected bin</p><h2 className="text-lg font-semibold">{selectedBin}</h2></div><span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold tabular-nums">{selectedSkus.length}/{capacityForBin(state, selectedBin)}</span></div><div className="mt-4 flex gap-2"><Input aria-label={`Capacity for ${selectedBin}`} type="number" min={15} max={20} value={capacityDraft} onChange={(event) => setCapacityDraft(event.target.value)} /><Button variant="outline" onClick={saveCapacity}>Set capacity</Button></div><div className="mt-4 max-h-44 space-y-1 overflow-auto">{selectedSkus.map((sku) => <div key={sku} className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm"><span className="font-semibold tabular-nums">SKU {sku}</span>{skuPullStates.get(sku) ? <span className="text-xs capitalize text-muted-foreground">{skuPullStates.get(sku)}</span> : null}</div>)}{selectedSkus.length === 0 ? <p className="py-4 text-center text-xs text-muted-foreground">This bin is empty.</p> : null}</div></div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center gap-2"><FileUp className="h-4 w-4" /><h2 className="font-semibold">Import existing map</h2></div><p className="mt-2 text-xs leading-5 text-muted-foreground">Use the Inventory Locations template to map SKU and Bin columns before updating storage.</p><div className="mt-4"><ImportOrdersButton defaultTemplate="inventory-locations" /></div></div>

          <div className="rounded-xl border border-border bg-muted/30 p-5"><div className="flex items-center gap-2"><Grid3X3 className="h-4 w-4" /><h2 className="text-sm font-semibold">Bins with space</h2></div><div className="mt-3 flex max-h-44 flex-wrap gap-1.5 overflow-auto">{binsWithSpace.slice(0, 48).map((bin) => <button key={bin} type="button" onClick={() => selectBin(bin)} className="rounded-md border border-emerald-300 bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-900 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">{bin} · {capacityForBin(state, bin) - (binContents.get(bin)?.length ?? 0)}</button>)}</div>{binsWithSpace.length > 48 ? <p className="mt-2 text-xs text-muted-foreground">+{binsWithSpace.length - 48} more bins with space</p> : null}</div>
        </aside>
      </section>

      <ReconciliationPanel summary={reconciliation} hasInventory={activeInventory.length > 0} />
    </div>
  );
}

function ReconciliationPanel({ summary, hasInventory }: { summary: ReturnType<typeof reconcileInventory>; hasInventory: boolean }) {
  if (!hasInventory) return <section className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-6"><h2 className="font-semibold">Inventory reconciliation</h2><p className="mt-2 text-sm text-muted-foreground">Import the Nifty Active Inventory template to compare listings, SKUs, and bin assignments.</p></section>;
  const issues = [
    { label: 'Missing SKU', count: summary.missingSku.length, detail: 'Cannot match sales or bins', samples: summary.missingSku.map((item) => item.itemName) },
    { label: 'Missing COGS', count: summary.missingCogs.length, detail: 'Profit is incomplete', samples: summary.missingCogs.map((item) => item.sku || item.itemName) },
    { label: 'Missing category', count: summary.missingCategory.length, detail: 'Uses title inference', samples: summary.missingCategory.map((item) => item.sku || item.itemName) },
    { label: 'No bin assigned', count: summary.missingBin.length, detail: 'Cannot create a reliable pull', samples: summary.missingBin.map((item) => item.sku) },
    { label: 'Duplicate SKU', count: summary.duplicateSkus.length, detail: 'Review repeated identifiers', samples: summary.duplicateSkus },
    { label: 'Sold but still active', count: summary.soldStillActive.length, detail: 'Check cross-list delisting', samples: summary.soldStillActive },
    { label: 'Bin without active item', count: summary.binWithoutActive.length, detail: 'Storage record may be stale', samples: summary.binWithoutActive },
  ];
  return <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"><div className="border-b border-border px-5 py-4"><h2 className="font-semibold">Inventory reconciliation</h2><p className="mt-1 text-xs text-muted-foreground">{summary.activeListings} active listings · {summary.activeUnits} pieces checked against sales and storage</p></div><div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-4">{issues.map((issue) => <div key={issue.label} className={`rounded-lg border p-4 ${issue.count ? 'border-amber-300/70 bg-amber-50/70 dark:border-amber-900 dark:bg-amber-950/20' : 'border-emerald-300/70 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/20'}`}><div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold">{issue.label}</p><p className="mt-1 text-xs text-muted-foreground">{issue.detail}</p></div><span className="text-xl font-semibold tabular-nums">{issue.count}</span></div>{issue.samples.length ? <p className="mt-3 truncate text-[11px] text-muted-foreground" title={issue.samples.slice(0, 5).join(', ')}>Examples: {issue.samples.slice(0, 3).join(', ')}</p> : <p className="mt-3 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">No issues found</p>}</div>)}</div></section>;
}

const cellStyles: Record<CellState, string> = {
  available: 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
  occupied: 'border-blue-300 bg-blue-50 text-blue-950 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-100',
  'nearly-full': 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
  full: 'border-slate-900 bg-slate-900 text-white dark:border-slate-300 dark:bg-slate-100 dark:text-slate-950',
  attention: 'border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100',
};

function stateForBin(skus: string[], capacity: number, states: Map<string, PullStatus>): CellState { if (skus.some((sku) => states.get(sku) === 'missing')) return 'attention'; if (skus.length === 0) return 'available'; if (skus.length >= capacity) return 'full'; if (skus.length / capacity >= 0.8) return 'nearly-full'; return 'occupied'; }
function makeCells(rowCount: number, columnCount: number) { const cells: string[] = []; for (let row = 0; row < rowCount; row += 1) for (let column = 1; column <= columnCount; column += 1) cells.push(`${String.fromCharCode(65 + row)}${String(column).padStart(2, '0')}`); return cells; }
function gridDimensions(assignedCells: string[]) { let rows = DEFAULT_ROWS; for (const cell of assignedCells) { const match = /^([A-Z])(\d{2})$/.exec(cell); if (!match) continue; rows = Math.max(rows, match[1].charCodeAt(0) - 64); } return { rows: Math.min(rows, 26), columns: DEFAULT_COLUMNS }; }
function Metric({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'slate' | 'emerald' | 'blue' | 'amber' | 'red' }) { const tones = { slate: 'border-border bg-card', emerald: 'border-emerald-300/60 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30', blue: 'border-blue-300/60 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30', amber: 'border-amber-300/60 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30', red: 'border-red-300/60 bg-red-50 dark:border-red-900 dark:bg-red-950/30' }; return <div className={`rounded-xl border p-4 shadow-sm ${tones[tone]}`}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p></div>; }
function MobileMetric({ label, value, tone }: { label: string; value: number; tone: 'emerald' | 'blue' | 'amber' }) { const tones = { emerald: 'border-emerald-300/60 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30', blue: 'border-blue-300/60 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30', amber: 'border-amber-300/60 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30' }; return <div className={`rounded-lg border px-3 py-2.5 ${tones[tone]}`}><p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p></div>; }
function Legend({ color, label }: { color: string; label: string }) { return <span className="inline-flex items-center gap-1.5"><span className={`h-2.5 w-2.5 rounded-sm border ${color}`} />{label}</span>; }
