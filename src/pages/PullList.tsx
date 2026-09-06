import { useDeferredValue, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Check, Grid3X3, MapPin, PackageCheck, Printer, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import { useInventory } from '@/hooks/use-inventory';
import { useSalesData } from '@/hooks/use-sales-data';
import { cellForSku, latestSalesDay, pullKey, validCell, type PullStatus } from '@/lib/inventory';
import type { NiftyOrder } from '@/lib/orders';

type DateFilter = 'latest' | '7d' | 'all';

export default function PullList() {
  const { orders, mode, fileName } = useSalesData();
  const { state, assign, setPullStatus } = useInventory();
  const latestDay = useMemo(() => latestSalesDay(orders), [orders]);
  const [dateFilter, setDateFilter] = useState<DateFilter>('latest');
  const [marketplace, setMarketplace] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'open' | PullStatus | 'all'>('open');
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [draftCells, setDraftCells] = useState<Record<string, string>>({});

  const batchOrders = useMemo(() => filterByDate(orders, dateFilter, latestDay), [dateFilter, latestDay, orders]);
  const visibleOrders = useMemo(() => {
    const filtered = batchOrders.filter((order) => {
      const status = state.pulls[pullKey(order)]?.status ?? 'ready';
      const matchesStatus = statusFilter === 'all' || (statusFilter === 'open' ? status === 'ready' || status === 'missing' : status === statusFilter);
      const matchesMarketplace = marketplace === 'all' || order.marketplace === marketplace;
      const haystack = `${order.sku} ${order.itemName} ${order.marketplace} ${cellForSku(state.assignments, order.sku) ?? ''}`.toLowerCase();
      return matchesStatus && matchesMarketplace && (!deferredQuery || haystack.includes(deferredQuery));
    });
    return filtered.sort((a, b) => {
      const aCell = cellForSku(state.assignments, a.sku) ?? 'ZZZ';
      const bCell = cellForSku(state.assignments, b.sku) ?? 'ZZZ';
      return aCell.localeCompare(bCell, undefined, { numeric: true }) || a.sku.localeCompare(b.sku, undefined, { numeric: true });
    });
  }, [batchOrders, deferredQuery, marketplace, state.assignments, state.pulls, statusFilter]);

  const metrics = useMemo(() => summarize(batchOrders, state.pulls), [batchOrders, state.pulls]);
  const platforms = useMemo(() => [...new Set(orders.map((order) => order.marketplace))].sort(), [orders]);

  const updateOne = (order: NiftyOrder, status: PullStatus) => {
    setPullStatus([order], status);
    setSelected((current) => {
      const next = new Set(current);
      next.delete(pullKey(order));
      return next;
    });
    toast({ title: status === 'pulled' ? `${order.sku} pulled` : `${order.sku} marked ${status}`, description: status === 'pulled' ? 'One space in its bin is now available.' : undefined });
  };

  const updateSelected = (status: PullStatus) => {
    const chosen = visibleOrders.filter((order) => selected.has(pullKey(order)));
    if (!chosen.length) return;
    setPullStatus(chosen, status);
    setSelected(new Set());
    toast({ title: `${chosen.length} item${chosen.length === 1 ? '' : 's'} marked ${status}`, description: status === 'pulled' ? 'Released bin spaces are available for putaway.' : undefined });
  };

  const saveCell = (order: NiftyOrder) => {
    const draft = draftCells[order.sku] ?? '';
    if (!validCell(draft)) {
      toast({ title: 'Use a bin like A01', description: 'Use one shelf letter and a bin number from 01 through 15.', variant: 'destructive' });
      return;
    }
    const error = assign(draft, order.sku);
    if (error) {
      toast({ title: 'Bin unavailable', description: error, variant: 'destructive' });
      return;
    }
    setDraftCells((current) => ({ ...current, [order.sku]: '' }));
    toast({ title: `${draft.toUpperCase()} assigned`, description: `SKU ${order.sku} is stored in this bin.` });
  };

  const toggleAll = () => {
    const keys = visibleOrders.map(pullKey);
    const allSelected = keys.length > 0 && keys.every((key) => selected.has(key));
    setSelected(allSelected ? new Set() : new Set(keys));
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Fulfillment workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Daily Pull List</h1><p className="mt-2 text-sm text-muted-foreground">Pull sold inventory in bin order. One bin space is released after you confirm the item was physically pulled.</p></div>
        <div className="flex gap-2 print:hidden"><Button variant="outline" asChild><Link to="/inventory"><Grid3X3 />Inventory map</Link></Button><Button variant="outline" onClick={() => window.print()}><Printer />Print list</Button></div>
      </div>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Ready" value={metrics.ready} tone="amber" />
        <Metric label="Pulled" value={metrics.pulled} tone="emerald" />
        <Metric label="Missing" value={metrics.missing} tone="red" />
        <Metric label="Without location" value={batchOrders.filter((order) => !cellForSku(state.assignments, order.sku) && (state.pulls[pullKey(order)]?.status ?? 'ready') === 'ready').length} />
        <Metric label="Batch items" value={batchOrders.length} />
      </section>

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border p-4 print:hidden lg:flex-row lg:items-center">
          <div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="pl-9" placeholder="Search SKU, title, platform, or bin" /></div>
          <Select value={dateFilter} onChange={(value) => setDateFilter(value as DateFilter)} options={[['latest', latestDay ? `Latest day · ${formatDay(latestDay)}` : 'Latest day'], ['7d', 'Last 7 days'], ['all', 'All sales']]} label="Date range" />
          <Select value={marketplace} onChange={setMarketplace} options={[['all', 'All platforms'], ...platforms.map((item) => [item, item] as [string, string])]} label="Marketplace" />
          <Select value={statusFilter} onChange={(value) => setStatusFilter(value as typeof statusFilter)} options={[['open', 'Open pulls'], ['ready', 'Ready'], ['pulled', 'Pulled'], ['missing', 'Missing'], ['packed', 'Packed'], ['shipped', 'Shipped'], ['all', 'All statuses']]} label="Status" />
        </div>

        <div className="flex items-center justify-between gap-3 border-b border-border bg-muted/30 px-4 py-3 text-xs print:hidden"><p className="text-muted-foreground">{mode === 'demo' ? 'Demonstration orders' : fileName ?? 'Imported Nifty orders'} · sorted by storage bin</p><div className="flex gap-2"><Button size="sm" variant="outline" disabled={!selected.size} onClick={() => updateSelected('missing')}><AlertTriangle />Cannot find</Button><Button size="sm" disabled={!selected.size} onClick={() => updateSelected('pulled')}><PackageCheck />Mark pulled ({selected.size})</Button></div></div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="w-12 px-4 py-3 print:hidden"><input type="checkbox" aria-label="Select all visible pull items" checked={visibleOrders.length > 0 && visibleOrders.every((order) => selected.has(pullKey(order)))} onChange={toggleAll} /></th><th className="px-4 py-3">Bin</th><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Sold item</th><th className="px-4 py-3">Platform</th><th className="px-4 py-3">Sold</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right print:hidden">Action</th></tr></thead>
            <tbody>{visibleOrders.map((order) => {
              const key = pullKey(order);
              const status = state.pulls[key]?.status ?? 'ready';
              const cell = cellForSku(state.assignments, order.sku);
              return <tr key={key} className="border-t border-border align-middle [content-visibility:auto]"><td className="px-4 py-4 print:hidden"><input type="checkbox" aria-label={`Select SKU ${order.sku}`} checked={selected.has(key)} onChange={() => setSelected((current) => { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; })} /></td><td className="px-4 py-4">{cell ? <span className="inline-flex items-center gap-1 rounded-md bg-slate-950 px-2.5 py-1 font-semibold text-white dark:bg-slate-100 dark:text-slate-950"><MapPin className="h-3.5 w-3.5" />{cell}</span> : <div className="flex w-40 gap-1 print:hidden"><Input aria-label={`Cell for SKU ${order.sku}`} value={draftCells[order.sku] ?? ''} onChange={(event) => setDraftCells((current) => ({ ...current, [order.sku]: event.target.value }))} onKeyDown={(event) => { if (event.key === 'Enter') saveCell(order); }} className="h-8 uppercase" placeholder="A01" maxLength={4} /><Button size="sm" variant="outline" className="h-8 px-2" onClick={() => saveCell(order)}>Assign</Button></div>}</td><td className="px-4 py-4 text-base font-bold tabular-nums">{order.sku || '—'}</td><td className="max-w-sm px-4 py-4"><p className="font-medium">{order.itemName}</p><p className="mt-1 text-xs text-muted-foreground">{order.daysListed} days listed</p></td><td className="px-4 py-4"><Platform name={order.marketplace} /></td><td className="px-4 py-4 text-xs text-muted-foreground">{formatSold(order.soldAt)}</td><td className="px-4 py-4"><Status status={status} /></td><td className="px-4 py-4 text-right print:hidden">{status === 'ready' || status === 'missing' ? <div className="flex justify-end gap-1"><Button size="sm" variant="ghost" onClick={() => updateOne(order, 'missing')}><AlertTriangle /></Button><Button size="sm" onClick={() => updateOne(order, 'pulled')} disabled={!cell}><Check />Pulled</Button></div> : <span className="text-xs text-muted-foreground">Updated {new Date(state.pulls[key].updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>}</td></tr>;
            })}</tbody>
          </table>
          {!visibleOrders.length ? <div className="px-5 py-16 text-center text-sm text-muted-foreground">No pull items match these filters.</div> : null}
        </div>
      </section>
    </div>
  );
}

function filterByDate(orders: NiftyOrder[], filter: DateFilter, latest: string | null) {
  if (filter === 'all' || !latest) return orders;
  if (filter === 'latest') return orders.filter((order) => order.soldAt.startsWith(latest));
  const end = new Date(`${latest}T23:59:59`);
  const start = end.getTime() - 6 * 86_400_000;
  return orders.filter((order) => new Date(order.soldAt.replace(' ', 'T')).getTime() >= start);
}
function summarize(orders: NiftyOrder[], pulls: Record<string, { status: PullStatus }>) { const values = { ready: 0, pulled: 0, missing: 0 }; for (const order of orders) { const status = pulls[pullKey(order)]?.status ?? 'ready'; if (status === 'ready') values.ready += 1; if (status === 'pulled' || status === 'packed' || status === 'shipped') values.pulled += 1; if (status === 'missing') values.missing += 1; } return values; }
function Metric({ label, value, tone = 'slate' }: { label: string; value: number; tone?: 'slate' | 'amber' | 'emerald' | 'red' }) { const tones = { slate: 'border-border bg-card', amber: 'border-amber-300/60 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30', emerald: 'border-emerald-300/60 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30', red: 'border-red-300/60 bg-red-50 dark:border-red-900 dark:bg-red-950/30' }; return <div className={`rounded-xl border p-4 shadow-sm ${tones[tone]}`}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p></div>; }
function Select({ value, onChange, options, label }: { value: string; onChange: (value: string) => void; options: [string, string][]; label: string }) { return <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}</select>; }
function Platform({ name }: { name: string }) { return <span className="rounded-full border border-border px-2.5 py-1 text-xs font-medium">{name}</span>; }
function Status({ status }: { status: PullStatus }) { const styles: Record<PullStatus, string> = { ready: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200', pulled: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200', packed: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200', shipped: 'bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-200', missing: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200' }; return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${styles[status]}`}>{status}</span>; }
function formatDay(day: string) { return new Date(`${day}T12:00:00`).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); }
function formatSold(value: string) { const date = new Date(value.replace(' ', 'T')); return Number.isNaN(date.getTime()) ? value : date.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }); }
