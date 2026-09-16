import { useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, CheckCircle2, ChevronDown, CircleAlert, ClipboardCheck, Copy, FileSpreadsheet, FileUp, Loader2, PackageSearch, Plus, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useInventoryAudit } from '@/hooks/use-inventory-audit';
import { cn } from '@/lib/utils';
import type { AuditListing, AuditStatus } from '@/lib/inventory-audit';

type ListingFilter = 'all' | AuditStatus;
type SortOption = 'sku-asc' | 'sku-desc' | 'title-asc' | 'end-date';
type DuplicateGroup = { sku: string; listings: AuditListing[] };

export default function InventoryAudit() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { state, importReport, setStatus, markManyFound, addRelistingItem, removeRelistingItem } = useInventoryAudit();
  const [importing, setImporting] = useState(false);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<ListingFilter>('all');
  const [sort, setSort] = useState<SortOption>('sku-asc');
  const [showRelistingForm, setShowRelistingForm] = useState(false);
  const [relistingDraft, setRelistingDraft] = useState({ sku: '', title: '', quantity: '1', notes: '' });

  const counts = useMemo(() => ({
    total: state.listings.length,
    found: state.listings.filter((item) => item.status === 'found').length,
    missing: state.listings.filter((item) => item.status === 'missing').length,
    unchecked: state.listings.filter((item) => item.status === 'unchecked').length,
  }), [state.listings]);
  const visibleListings = useMemo(() => filterAndSort(state.listings, search, filter, sort), [filter, search, sort, state.listings]);
  const missingListings = useMemo(() => filterAndSort(state.listings.filter((item) => item.status === 'missing'), search, 'all', sort), [search, sort, state.listings]);
  const duplicateSource = useMemo(() => loadReportsListings() ?? state.listings, [state.listings]);
  const duplicateGroups = useMemo(() => findDuplicateSkus(duplicateSource, search), [duplicateSource, search]);
  const duplicateListings = duplicateGroups.reduce((sum, group) => sum + group.listings.length, 0);
  const progress = counts.total ? Math.round(((counts.found + counts.missing) / counts.total) * 100) : 0;

  const importFile = async (file: File | undefined) => {
    if (!file) return;
    setImporting(true);
    try {
      const result = await importReport(file);
      const details = [
        `${result.rowCount.toLocaleString()} active listings imported`,
        result.preservedChecks ? `${result.preservedChecks.toLocaleString()} prior checks kept` : '',
        result.missingSkuCount ? `${result.missingSkuCount.toLocaleString()} without a SKU` : '',
      ].filter(Boolean).join(' · ');
      toast({ title: 'Inventory report ready', description: details });
    } catch (cause) {
      toast({ title: 'Import failed', description: cause instanceof Error ? cause.message : 'Choose a valid eBay Active Listings CSV.', variant: 'destructive' });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const saveRelistingItem = () => {
    try {
      addRelistingItem({ ...relistingDraft, quantity: Number(relistingDraft.quantity) });
      setRelistingDraft({ sku: '', title: '', quantity: '1', notes: '' });
      setShowRelistingForm(false);
      toast({ title: 'Added to Needs Relisting', description: 'The item is saved until you relist it or remove it.' });
    } catch (cause) {
      toast({ title: 'Item not added', description: cause instanceof Error ? cause.message : 'Enter the item details.', variant: 'destructive' });
    }
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-5">
      <input ref={fileInputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void importFile(event.target.files?.[0])} />
      <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground"><ClipboardCheck className="h-4 w-4" />Physical inventory check</div>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Inventory Audit</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">Import your eBay Active Listings report, walk your inventory by SKU, and record what is found or missing.</p>
            {state.importedAt ? <p className="mt-3 text-xs text-muted-foreground">Current report: <span className="font-medium text-foreground">{state.sourceFile}</span> · imported {formatTimestamp(state.importedAt)}</p> : null}
          </div>
          <Button size="lg" onClick={() => fileInputRef.current?.click()} disabled={importing} className="shrink-0">{importing ? <Loader2 className="animate-spin" /> : <FileUp />}{state.listings.length ? 'Replace eBay report' : 'Import eBay report'}</Button>
        </div>
        {counts.total ? <div className="border-t border-border bg-muted/20 px-5 py-4 sm:px-6"><div className="mb-2 flex items-center justify-between text-xs"><span className="font-medium">Audit progress</span><span className="tabular-nums text-muted-foreground">{counts.found + counts.missing} of {counts.total} checked · {progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${progress}%` }} /></div></div> : null}
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard label="Active listings" value={counts.total} detail="In current eBay report" />
        <SummaryCard label="Found" value={counts.found} detail="Verified in inventory" tone="emerald" />
        <SummaryCard label="Missing" value={counts.missing} detail="Could not be located" tone="red" />
        <SummaryCard label="Not checked" value={counts.unchecked} detail="Still to verify" tone="amber" />
      </section>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList className="grid h-auto w-full grid-cols-2 sm:w-auto sm:min-w-[760px] sm:grid-cols-4">
          <TabsTrigger value="active" className="gap-2 py-2.5">Active Listings <CountBadge>{counts.total}</CountBadge></TabsTrigger>
          <TabsTrigger value="missing" className="gap-2 py-2.5">Missing Inventory <CountBadge>{counts.missing}</CountBadge></TabsTrigger>
          <TabsTrigger value="relisting" className="gap-2 py-2.5">Needs Relisting <CountBadge>{state.relistingItems.length}</CountBadge></TabsTrigger>
          <TabsTrigger value="duplicates" className="gap-2 py-2.5">Duplicate SKUs <AlertCountBadge count={duplicateGroups.length} /></TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {state.listings.length ? <><AuditToolbar search={search} setSearch={setSearch} filter={filter} setFilter={setFilter} sort={sort} setSort={setSort} /><div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground"><span>Showing {visibleListings.length.toLocaleString()} of {counts.total.toLocaleString()} listings</span>{visibleListings.some((item) => item.status === 'unchecked') ? <Button variant="outline" size="sm" onClick={() => markManyFound(visibleListings.filter((item) => item.status === 'unchecked').map((item) => item.id))}><Check />Mark visible as found</Button> : null}</div><ListingTable listings={visibleListings} onStatusChange={setStatus} /></> : <ImportEmptyState onImport={() => fileInputRef.current?.click()} />}
        </TabsContent>

        <TabsContent value="missing" className="space-y-4">
          {counts.missing ? <><AuditToolbar search={search} setSearch={setSearch} sort={sort} setSort={setSort} /><ListingTable listings={missingListings} onStatusChange={setStatus} /></> : <EmptyState icon={CheckCircle2} title="No missing inventory" description={state.listings.length ? 'Items marked Missing will appear here for follow-up.' : 'Import an eBay Active Listings report to start the audit.'} />}
        </TabsContent>

        <TabsContent value="relisting" className="space-y-4">
          <div className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-card p-5 sm:flex-row sm:items-center"><div><h3 className="font-semibold">Items found without an active listing</h3><p className="mt-1 text-sm text-muted-foreground">Add physical inventory that does not appear in the eBay report.</p></div><Button onClick={() => setShowRelistingForm((current) => !current)}>{showRelistingForm ? <X /> : <Plus />}{showRelistingForm ? 'Cancel' : 'Add unlisted item'}</Button></div>
          {showRelistingForm ? <RelistingForm draft={relistingDraft} setDraft={setRelistingDraft} onSave={saveRelistingItem} /> : null}
          {state.relistingItems.length ? <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"><div className="hidden grid-cols-[minmax(120px,0.7fr)_minmax(240px,2fr)_90px_minmax(180px,1fr)_48px] gap-4 border-b border-border bg-muted/40 px-4 py-3 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground md:grid"><span>SKU</span><span>Title</span><span>Quantity</span><span>Notes</span><span /></div><div className="divide-y divide-border">{state.relistingItems.map((item) => <div key={item.id} className="grid gap-2 px-4 py-4 md:grid-cols-[minmax(120px,0.7fr)_minmax(240px,2fr)_90px_minmax(180px,1fr)_48px] md:items-center md:gap-4"><div><MobileLabel>SKU</MobileLabel><span className="font-mono text-sm font-semibold">{item.sku || '—'}</span></div><div><MobileLabel>Title</MobileLabel><p className="text-sm font-medium">{item.title || 'Untitled item'}</p></div><div><MobileLabel>Quantity</MobileLabel><span className="text-sm tabular-nums">{item.quantity}</span></div><div><MobileLabel>Notes</MobileLabel><p className="text-sm text-muted-foreground">{item.notes || '—'}</p></div><Button variant="ghost" size="icon" aria-label={`Remove ${item.sku || item.title}`} onClick={() => removeRelistingItem(item.id)}><Trash2 className="h-4 w-4" /></Button></div>)}</div></div> : <EmptyState icon={PackageSearch} title="Nothing needs relisting" description="When you find an item that is not in the active report, add it here." />}
        </TabsContent>

        <TabsContent value="duplicates" className="space-y-4">
          {duplicateSource.length ? <>
            <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search duplicate SKU or title" className="pl-9" /></div>
              <div className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm"><strong className="tabular-nums">{duplicateGroups.length}</strong> SKU conflicts</div>
              <div className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm"><strong className="tabular-nums">{duplicateListings}</strong> affected listings</div>
            </div>
            {duplicateGroups.length ? <DuplicateSkuList groups={duplicateGroups} /> : <EmptyState icon={CheckCircle2} title="No duplicate SKUs found" description={search ? 'No duplicate groups match your search.' : 'Every populated SKU in the current report is unique.'} />}
          </> : <ImportEmptyState onImport={() => fileInputRef.current?.click()} />}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function AuditToolbar({ search, setSearch, filter, setFilter, sort, setSort }: { search: string; setSearch: (value: string) => void; filter?: ListingFilter; setFilter?: (value: ListingFilter) => void; sort: SortOption; setSort: (value: SortOption) => void }) {
  return <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-3 shadow-sm md:flex-row md:items-center"><div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search SKU, title, or item number" className="pl-9" /></div>{setFilter ? <Select value={filter} onChange={(value) => setFilter(value as ListingFilter)} label="Filter"><option value="all">All statuses</option><option value="unchecked">Not checked</option><option value="found">Found</option><option value="missing">Missing</option></Select> : null}<Select value={sort} onChange={(value) => setSort(value as SortOption)} label="Sort"><option value="sku-asc">SKU: low to high</option><option value="sku-desc">SKU: high to low</option><option value="title-asc">Title: A to Z</option><option value="end-date">End date</option></Select></div>;
}

function ListingTable({ listings, onStatusChange }: { listings: AuditListing[]; onStatusChange: (id: string, status: AuditStatus) => void }) {
  if (!listings.length) return <EmptyState icon={Search} title="No listings match" description="Clear the search or choose a different status filter." />;
  return <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"><div className="hidden grid-cols-[72px_minmax(110px,0.7fr)_minmax(260px,2fr)_minmax(130px,0.8fr)_76px_100px_120px_110px] gap-3 border-b border-border bg-muted/40 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground lg:grid"><span>Found</span><span>SKU</span><span>Title</span><span>Item number</span><span>Qty</span><span>Price</span><span>End date</span><span>Status</span></div><div className="divide-y divide-border">{listings.map((item) => <ListingRow key={item.id} item={item} onStatusChange={onStatusChange} />)}</div></div>;
}

function ListingRow({ item, onStatusChange }: { item: AuditListing; onStatusChange: (id: string, status: AuditStatus) => void }) {
  return <div className={cn('grid gap-3 px-4 py-4 transition-colors lg:grid-cols-[72px_minmax(110px,0.7fr)_minmax(260px,2fr)_minmax(130px,0.8fr)_76px_100px_120px_110px] lg:items-center', item.status === 'found' && 'bg-emerald-50/50 dark:bg-emerald-950/10', item.status === 'missing' && 'bg-red-50/60 dark:bg-red-950/10')}><div className="flex items-center justify-between lg:block"><MobileLabel>Found</MobileLabel><button type="button" role="checkbox" aria-checked={item.status === 'found'} aria-label={`Mark ${item.sku || item.title} found`} onClick={() => onStatusChange(item.id, item.status === 'found' ? 'unchecked' : 'found')} className={cn('flex h-8 w-8 items-center justify-center rounded-md border-2 transition', item.status === 'found' ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-input bg-background hover:border-emerald-500')}>{item.status === 'found' ? <Check className="h-5 w-5" /> : null}</button></div><div><MobileLabel>SKU / Custom Label</MobileLabel><span className="font-mono text-sm font-semibold">{item.sku || 'No SKU'}</span></div><div className="min-w-0"><MobileLabel>Title</MobileLabel><p className="text-sm font-medium leading-5 lg:line-clamp-2" title={item.title}>{item.title || 'Untitled listing'}</p></div><div><MobileLabel>Item number</MobileLabel><span className="font-mono text-xs text-muted-foreground">{item.itemNumber || '—'}</span></div><div><MobileLabel>Quantity</MobileLabel><span className="text-sm tabular-nums">{item.quantity}</span></div><div><MobileLabel>Price</MobileLabel><span className="text-sm font-medium tabular-nums">{formatCurrency(item.price)}</span></div><div><MobileLabel>End date</MobileLabel><span className="text-xs text-muted-foreground">{formatDate(item.endDate)}</span></div><div className="flex items-center justify-between gap-2 lg:block"><MobileLabel>Status</MobileLabel>{item.status === 'missing' ? <Button variant="outline" size="sm" className="border-red-300 text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-300" onClick={() => onStatusChange(item.id, 'unchecked')}><X />Missing</Button> : <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-red-700" onClick={() => onStatusChange(item.id, 'missing')}><CircleAlert />Mark missing</Button>}</div></div>;
}

function DuplicateSkuList({ groups }: { groups: DuplicateGroup[] }) {
  return <div className="space-y-3">{groups.map((group) => <section key={group.sku.toLowerCase()} className="overflow-hidden rounded-xl border border-amber-300/70 bg-card shadow-sm dark:border-amber-900"><header className="flex items-center justify-between gap-3 border-b border-border bg-amber-50 px-4 py-3 dark:bg-amber-950/25"><div className="flex min-w-0 items-center gap-3"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"><Copy className="h-4 w-4" /></span><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Duplicate SKU</p><p className="truncate font-mono text-base font-bold">{group.sku}</p></div></div><span className="shrink-0 rounded-full bg-amber-200 px-2.5 py-1 text-xs font-semibold text-amber-950 dark:bg-amber-900 dark:text-amber-100">{group.listings.length} listings</span></header><div className="divide-y divide-border">{group.listings.map((item) => <div key={item.id} className="grid gap-2 px-4 py-4 sm:grid-cols-[minmax(220px,1fr)_140px_70px_100px] sm:items-center sm:gap-4"><div className="min-w-0"><MobileLabel>Listing</MobileLabel><p className="text-sm font-medium leading-5">{item.title || 'Untitled listing'}</p></div><div><MobileLabel>Item number</MobileLabel><span className="font-mono text-xs text-muted-foreground">{item.itemNumber || '—'}</span></div><div><MobileLabel>Quantity</MobileLabel><span className="text-sm tabular-nums">{item.quantity}</span></div><div className="sm:text-right"><MobileLabel>Price</MobileLabel><span className="text-sm font-semibold tabular-nums">{formatCurrency(item.price)}</span></div></div>)}</div></section>)}</div>;
}

function RelistingForm({ draft, setDraft, onSave }: { draft: { sku: string; title: string; quantity: string; notes: string }; setDraft: (value: { sku: string; title: string; quantity: string; notes: string }) => void; onSave: () => void }) {
  const update = (key: keyof typeof draft, value: string) => setDraft({ ...draft, [key]: value });
  return <div className="rounded-xl border border-border bg-card p-5 shadow-sm"><div className="grid gap-4 md:grid-cols-[1fr_2fr_100px]"><Field label="SKU / Custom Label"><Input value={draft.sku} onChange={(event) => update('sku', event.target.value)} placeholder="Example: A-1042" /></Field><Field label="Title"><Input value={draft.title} onChange={(event) => update('title', event.target.value)} placeholder="Describe the item" /></Field><Field label="Quantity"><Input type="number" min="1" value={draft.quantity} onChange={(event) => update('quantity', event.target.value)} /></Field></div><div className="mt-4"><Field label="Notes"><Input value={draft.notes} onChange={(event) => update('notes', event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onSave(); }} placeholder="Location or anything needed before relisting" /></Field></div><div className="mt-4 flex justify-end"><Button onClick={onSave}><Plus />Add to relisting list</Button></div></div>;
}

function ImportEmptyState({ onImport }: { onImport: () => void }) { return <div className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-background shadow-sm"><FileSpreadsheet className="h-7 w-7" /></span><h3 className="mt-5 text-lg font-semibold">Import your eBay Active Listings report</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Use the CSV downloaded from eBay. Marketplace Pro maps Custom Label, Title, Item Number, Quantity, Price, and End Date automatically.</p><Button className="mt-5" onClick={onImport}><FileUp />Choose CSV report</Button></div>; }
function EmptyState({ icon: Icon, title, description }: { icon: typeof Search; title: string; description: string }) { return <div className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-12 text-center"><Icon className="mx-auto h-7 w-7 text-muted-foreground" /><h3 className="mt-3 font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>; }
function SummaryCard({ label, value, detail, tone = 'slate' }: { label: string; value: number; detail: string; tone?: 'slate' | 'emerald' | 'red' | 'amber' }) { const tones = { slate: 'border-border bg-card', emerald: 'border-emerald-300/70 bg-emerald-50/60 dark:border-emerald-900 dark:bg-emerald-950/20', red: 'border-red-300/70 bg-red-50/60 dark:border-red-900 dark:bg-red-950/20', amber: 'border-amber-300/70 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/20' }; return <div className={cn('rounded-xl border p-4 shadow-sm', tones[tone])}><p className="text-xs font-medium text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p><p className="mt-1 hidden text-[11px] text-muted-foreground sm:block">{detail}</p></div>; }
function CountBadge({ children }: { children: number }) { return <span className="rounded-full bg-background/80 px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground shadow-sm">{children.toLocaleString()}</span>; }
function AlertCountBadge({ count }: { count: number }) { return count > 0 ? <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-none tabular-nums text-white shadow-sm" aria-label={`${count} duplicate SKU conflicts`}>{count > 99 ? '99+' : count}</span> : <CountBadge>{0}</CountBadge>; }
function MobileLabel({ children }: { children: ReactNode }) { return <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground lg:hidden">{children}</span>; }
function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="space-y-2"><span className="text-sm font-medium">{label}</span>{children}</label>; }
function Select({ value, onChange, label, children }: { value: string; onChange: (value: string) => void; label: string; children: ReactNode }) { return <label className="relative min-w-[170px]"><span className="sr-only">{label}</span><select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-9 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring">{children}</select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /></label>; }

function filterAndSort(listings: AuditListing[], query: string, filter: ListingFilter, sort: SortOption) {
  const needle = query.trim().toLowerCase();
  return listings.filter((item) => {
    const matchesQuery = !needle || [item.sku, item.title, item.itemNumber].some((value) => value.toLowerCase().includes(needle));
    return matchesQuery && (filter === 'all' || item.status === filter);
  }).sort((a, b) => {
    if (sort === 'sku-desc') return naturalCompare(b.sku, a.sku);
    if (sort === 'title-asc') return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' });
    if (sort === 'end-date') return sortableDate(a.endDate).localeCompare(sortableDate(b.endDate));
    return naturalCompare(a.sku, b.sku);
  });
}

function findDuplicateSkus(listings: AuditListing[], query: string): DuplicateGroup[] {
  const grouped = new Map<string, AuditListing[]>();
  const labels = new Map<string, string>();
  listings.forEach((listing) => {
    const sku = listing.sku.trim();
    if (!sku) return;
    const key = sku.toLowerCase();
    labels.set(key, labels.get(key) ?? sku);
    grouped.set(key, [...(grouped.get(key) ?? []), listing]);
  });
  const needle = query.trim().toLowerCase();
  return [...grouped.entries()].filter(([, items]) => items.length > 1).map(([key, items]) => ({ sku: labels.get(key) ?? key, listings: items })).filter((group) => !needle || group.sku.toLowerCase().includes(needle) || group.listings.some((item) => item.title.toLowerCase().includes(needle) || item.itemNumber.toLowerCase().includes(needle))).sort((left, right) => naturalCompare(left.sku, right.sku));
}

function loadReportsListings(): AuditListing[] | null {
  try {
    const raw = localStorage.getItem('marketplace-pro:ebay-active-report');
    if (!raw) return null;
    const report = JSON.parse(raw) as { rows?: Record<string, string>[] };
    if (!Array.isArray(report.rows) || !report.rows.length) return null;
    return report.rows.map((row, index) => ({
      id: `report:${index}:${row['Item number'] ?? ''}:${row['Custom label (SKU)'] ?? ''}`,
      sku: row['Custom label (SKU)']?.trim() ?? '',
      title: row.Title?.trim() ?? '',
      itemNumber: row['Item number']?.trim() ?? '',
      quantity: Math.max(0, Number.parseInt(row['Available quantity'] ?? '0', 10) || 0),
      price: Number(row['Current price'] ?? '0') || 0,
      endDate: row['End date']?.trim() ?? '',
      status: 'unchecked',
      checkedAt: null,
    }));
  } catch {
    return null;
  }
}

function naturalCompare(left: string, right: string) { return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }); }
function sortableDate(value: string) { const parsed = Date.parse(value); return Number.isNaN(parsed) ? '9999' : new Date(parsed).toISOString(); }
function formatCurrency(value: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value); }
function formatDate(value: string) { if (!value) return '—'; const parsed = Date.parse(value); return Number.isNaN(parsed) ? value : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(parsed); }
function formatTimestamp(value: string) { const parsed = Date.parse(value); return Number.isNaN(parsed) ? value : new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(parsed); }
