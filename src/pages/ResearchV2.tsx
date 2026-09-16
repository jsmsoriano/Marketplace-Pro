import { useMemo, useRef, useState, type ReactNode } from 'react';
import { ArrowDownRight, ArrowUpRight, BarChart3, Clock3, ExternalLink, Loader2, Minus, Search, ShoppingBag, Sparkles, Store } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useSalesData } from '@/hooks/use-sales-data';
import { brandRecommendations, type BrandRecommendation, type BuySignal, type Direction } from '@/lib/analytics';
import { fetchEbayOrders, researchTrends, type EbayOrdersResponse } from '@/lib/api';
import { categoryForOrder, filterOrdersByPeriod, formatCurrency, formatPercent, type NiftyOrder, type Period } from '@/lib/orders';

export default function ResearchV2() {
  const [params] = useSearchParams();
  const { orders, mergeEbayOrders } = useSalesData();
  const suggestions = useMemo(() => brandRecommendations(orders, '90d').slice(0, 5), [orders]);
  const [query, setQuery] = useState(params.get('q') ?? 'fashion resale trends');
  const [loading, setLoading] = useState<'ebay' | 'trends' | null>(null);
  const [ebay, setEbay] = useState<EbayOrdersResponse | null>(null);
  const [trends, setTrends] = useState<Record<string, unknown> | null>(null);
  const runningRef = useRef(false);

  const syncEbay = async () => {
    if (runningRef.current) return;
    runningRef.current = true;
    setLoading('ebay');
    setEbay(null);
    try {
      const result = await fetchEbayOrders(90);
      setEbay(result.data);
      const merged = mergeEbayOrders(result.data);
      toast({ title: 'eBay sales synced', description: `${result.data.total} orders · ${result.data.categorizedItems} officially categorized · ${merged.added} added · ${merged.enriched} enriched.` });
    } catch (error) {
      toast({ title: 'eBay sync failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    } finally {
      runningRef.current = false;
      setLoading(null);
    }
  };

  const scanTrends = async () => {
    const topic = query.trim();
    if (!topic || runningRef.current) return;
    runningRef.current = true;
    setLoading('trends');
    setTrends(null);
    try {
      const result = await researchTrends(topic, { days: 30 });
      setTrends(result.data);
      toast({ title: 'Social signal ready', description: 'Recent fashion and community conversation updated.' });
    } catch (error) {
      toast({ title: 'Trend scan failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    } finally {
      runningRef.current = false;
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Decision evidence</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your sales and market signals.</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Sync your authenticated eBay seller orders and separately scan current social and fashion conversation. eBay data here is your account history—not market-wide sold comps.</p>
      </div>

      <Tabs defaultValue="store">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="store">Store trends</TabsTrigger>
          <TabsTrigger value="ebay">Your eBay sales</TabsTrigger>
          <TabsTrigger value="signals">Social & fashion signals</TabsTrigger>
        </TabsList>
        <TabsContent value="store" className="mt-4">
          <StoreTrends orders={orders} />
        </TabsContent>
        <TabsContent value="ebay" className="mt-4">
          <Panel icon={BarChart3} title="Official eBay order sync" action="Sync last 90 days" loading={loading === 'ebay'} onAction={() => void syncEbay()}>
            {ebay ? <EbaySummary data={ebay} /> : <Empty text="Connect to the configured eBay environment and retrieve only your seller orders." />}
          </Panel>
        </TabsContent>
        <TabsContent value="signals" className="mt-4 space-y-4">
          <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void scanTrends(); }} placeholder="Brand, style, model, or aesthetic" /></div>
              <Button onClick={() => void scanTrends()} disabled={loading === 'trends' || !query.trim()}>{loading === 'trends' ? <Loader2 className="animate-spin" /> : <Sparkles />}Scan signals</Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">{suggestions.map((item) => <button key={item.brand} type="button" onClick={() => setQuery(item.brand)} className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted">{item.brand}</button>)}</div>
          </section>
          <Panel icon={Sparkles} title="Last 30 days" action="Refresh" loading={loading === 'trends'} onAction={() => void scanTrends()}>
            {trends ? <TrendSummary data={trends} query={query} /> : <Empty text="Scan recent social, forum, and web conversation for demand direction and emerging language." />}
          </Panel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StoreTrends({ orders }: { orders: NiftyOrder[] }) {
  const [period, setPeriod] = useState<Period>('30d');
  const [marketplace, setMarketplace] = useState('All');
  const [itemType, setItemType] = useState('All');
  const marketplaces = useMemo(() => ['All', ...Array.from(new Set(orders.map((order) => order.marketplace))).sort()], [orders]);
  const itemTypes = useMemo(() => ['All', ...Array.from(new Set(orders.map(categoryForOrder))).sort()], [orders]);
  const officialCategories = useMemo(() => new Set(orders.filter((order) => order.categorySource === 'official-ebay').map(categoryForOrder)), [orders]);
  const scopedOrders = useMemo(() => orders.filter((order) => (marketplace === 'All' || order.marketplace === marketplace) && (itemType === 'All' || categoryForOrder(order) === itemType)), [itemType, marketplace, orders]);
  const currentOrders = useMemo(() => filterOrdersByPeriod(scopedOrders, period), [scopedOrders, period]);
  const recommendations = useMemo(() => [...brandRecommendations(scopedOrders, period)].sort((a, b) => b.units - a.units || b.score - a.score), [scopedOrders, period]);
  const fastSales = currentOrders.filter((order) => order.daysListed <= 30).length;
  const medianDays = median(currentOrders.map((order) => order.daysListed));
  const leader = recommendations[0];
  const officialCategorySales = currentOrders.filter((order) => order.categorySource === 'official-ebay').length;

  return <div className="space-y-4">
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div><div className="flex items-center gap-2"><Store className="h-4 w-4 text-emerald-700 dark:text-emerald-400" /><h2 className="font-semibold">What is trending in your store</h2></div><p className="mt-2 max-w-2xl text-sm text-muted-foreground">eBay sync uses official listing categories. Nifty rows without category data use title inference so Poshmark, Depop, and historical sales remain filterable.</p></div>
        <div className="flex flex-wrap gap-2">
          <select aria-label="Store trends marketplace" value={marketplace} onChange={(event) => setMarketplace(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{marketplaces.map((item) => <option key={item} value={item}>{item === 'All' ? 'All marketplaces' : item}</option>)}</select>
          <select aria-label="Store trends item type" value={itemType} onChange={(event) => setItemType(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">{itemTypes.map((item) => <option key={item} value={item}>{item === 'All' ? 'All categories' : `${item} · ${officialCategories.has(item) ? 'eBay official' : 'inferred'}`}</option>)}</select>
          <select aria-label="Store trends period" value={period} onChange={(event) => setPeriod(event.target.value as Period)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="7d">Last 7 days</option><option value="30d">Last 30 days</option><option value="90d">Last 90 days</option><option value="180d">Last 6 months</option><option value="365d">Last 12 months</option><option value="all">All imported sales</option></select>
        </div>
      </div>
    </section>

    <p className="px-1 text-xs text-muted-foreground">Category coverage: <strong className="text-foreground">{officialCategorySales}</strong> sales use official eBay categories; <strong className="text-foreground">{currentOrders.length - officialCategorySales}</strong> use inferred categories.</p>

    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StoreMetric label="Items sold" value={String(currentOrders.length)} detail={marketplace === 'All' ? 'Across all platforms' : `On ${marketplace}`} icon={ShoppingBag} />
      <StoreMetric label="Median days to sell" value={`${Math.round(medianDays)}d`} detail="Less distorted by old inventory" icon={Clock3} />
      <StoreMetric label="Sold within 30 days" value={formatPercent(currentOrders.length ? fastSales / currentOrders.length : 0)} detail={`${fastSales} fast-moving item${fastSales === 1 ? '' : 's'}`} icon={BarChart3} />
      <StoreMetric label="Top-selling brand" value={leader?.brand ?? '—'} detail={leader ? `${leader.units} sold · ${formatFrequency(leader)} · ${leader.buySignal}` : 'Import Nifty orders'} icon={Sparkles} />
    </section>

    {marketplace === 'All' ? <section className="grid gap-3 md:grid-cols-3">{['eBay', 'Poshmark', 'Depop'].map((platform) => <PlatformTrendCard key={platform} platform={platform} orders={orders} period={period} itemType={itemType} />)}</section> : null}

    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="flex flex-col justify-between gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-center"><div><h2 className="font-semibold">{itemType === 'All' ? 'Brands selling most' : `Brands trending in ${itemType}`}</h2><p className="mt-1 text-xs text-muted-foreground">Sorted by units sold, then signal score. A minimum of three sales is required before recommending a buy.</p></div><span className="text-xs text-muted-foreground">{recommendations.length} observed brands</span></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1050px] text-sm">
          <thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-4 py-3">Brand</th><th className="px-4 py-3 text-right">Sales frequency</th><th className="px-4 py-3">Direction</th><th className="px-4 py-3 text-right">Median days</th><th className="px-4 py-3 text-right">≤30 days</th><th className="px-4 py-3 text-right">Avg price</th><th className="px-4 py-3 text-right">Avg profit</th><th className="px-4 py-3">Best platform</th><th className="px-4 py-3">Buy decision</th></tr></thead>
          <tbody>{recommendations.map((item) => <BrandTrendRow key={item.brand} item={item} />)}</tbody>
        </table>
        {!recommendations.length ? <div className="px-5 py-16 text-center text-sm text-muted-foreground">No imported sales match this marketplace and period.</div> : null}
      </div>
    </section>

    <section className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-4 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">How to use this:</strong> prioritize Strong buy brands, source Selective buy brands only in proven styles and price ranges, and wait for more evidence on Hold brands. Import Nifty Active Inventory next to add true sell-through and overstock protection.</section>
  </div>;
}

function BrandTrendRow({ item }: { item: BrandRecommendation }) {
  return <tr className="border-t border-border [content-visibility:auto]"><td className="px-4 py-4"><p className="font-semibold">{item.brand}</p><p className="mt-1 text-[11px] text-muted-foreground">{item.confidence} confidence</p></td><td className="px-4 py-4 text-right"><p className="text-base font-bold tabular-nums">{item.units} sold</p><p className="mt-1 whitespace-nowrap text-[11px] text-muted-foreground">{formatFrequency(item)} · every {formatDays(item.daysPerSale)}</p></td><td className="px-4 py-4"><DirectionBadge direction={item.direction} change={item.change} /></td><td className="px-4 py-4 text-right font-medium tabular-nums">{Math.round(item.medianDaysListed)}d</td><td className="px-4 py-4 text-right tabular-nums">{formatPercent(item.soldWithin30Days)}</td><td className="px-4 py-4 text-right tabular-nums">{formatCurrency(item.averagePrice)}</td><td className="px-4 py-4 text-right font-medium tabular-nums">{formatCurrency(item.units ? item.profit / item.units : 0)}</td><td className="px-4 py-4">{item.topMarketplace}</td><td className="px-4 py-4"><BuySignalBadge signal={item.buySignal} /></td></tr>;
}

function DirectionBadge({ direction, change }: { direction: Direction; change: number | null }) {
  const Icon = direction === 'Rising' || direction === 'New signal' ? ArrowUpRight : direction === 'Cooling' ? ArrowDownRight : Minus;
  const style = direction === 'Rising' || direction === 'New signal' ? 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200' : direction === 'Cooling' ? 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200' : 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200';
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${style}`}><Icon className="h-3.5 w-3.5" />{direction}{change == null ? '' : ` ${change >= 0 ? '+' : ''}${Math.round(change * 100)}%`}</span>;
}

function BuySignalBadge({ signal }: { signal: BuySignal }) {
  const styles: Record<BuySignal, string> = { 'Strong buy': 'bg-emerald-600 text-white', 'Selective buy': 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-200', Hold: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200', Avoid: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-200' };
  return <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${styles[signal]}`}>{signal}</span>;
}

function PlatformTrendCard({ platform, orders, period, itemType }: { platform: string; orders: NiftyOrder[]; period: Period; itemType: string }) {
  const platformOrders = orders.filter((order) => order.marketplace.toLowerCase() === platform.toLowerCase() && (itemType === 'All' || categoryForOrder(order) === itemType));
  const current = filterOrdersByPeriod(platformOrders, period);
  const leaders = brandRecommendations(platformOrders, period).sort((a, b) => b.units - a.units || b.score - a.score);
  return <div className="rounded-xl border border-border bg-card p-4 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-semibold">{platform}</h3><span className="text-xs text-muted-foreground">{current.length} sold</span></div><p className="mt-4 text-2xl font-semibold">{leaders[0]?.brand ?? 'No sales'}</p><p className="mt-1 text-xs text-muted-foreground">{leaders[0] ? `${leaders[0].units} sold · ${formatFrequency(leaders[0])} · ${Math.round(leaders[0].medianDaysListed)} median days` : 'No signal for this period'}</p></div>;
}

function formatFrequency(item: BrandRecommendation) {
  return `${item.salesPerMonth < 0.1 ? item.salesPerMonth.toFixed(2) : item.salesPerMonth.toFixed(1)}/month`;
}

function formatDays(days: number) {
  return days < 1 ? '<1d' : `${Math.round(days)}d`;
}

function StoreMetric({ label, value, detail, icon: Icon }: { label: string; value: string; detail: string; icon: typeof Search }) {
  return <div className="rounded-xl border border-border bg-card p-4 shadow-sm"><div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-muted-foreground" /></div><p className="mt-2 truncate text-2xl font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}

function median(values: number[]) { if (!values.length) return 0; const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; }

function Panel({ icon: Icon, title, action, loading, onAction, children }: { icon: typeof Search; title: string; action: string; loading: boolean; onAction: () => void; children: ReactNode }) {
  return <section className="rounded-xl border border-border bg-card shadow-sm"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div className="flex items-center gap-2"><Icon className="h-4 w-4" /><h2 className="text-sm font-semibold">{title}</h2></div><Button variant="outline" size="sm" onClick={onAction} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <ExternalLink />}{action}</Button></div><div className="p-5">{children}</div></section>;
}

function EbaySummary({ data }: { data: EbayOrdersResponse }) {
  const itemCount = data.orders.reduce((sum, order) => sum + order.lineItems.reduce((count, item) => count + item.quantity, 0), 0);
  const gross = data.orders.reduce((sum, order) => sum + order.total, 0);
  const average = data.total ? gross / data.total : 0;
  return <div className="space-y-5"><div className="flex items-center justify-between"><div><p className="text-xs text-muted-foreground">Environment</p><h3 className="mt-1 text-lg font-semibold capitalize">{data.environment}</h3></div><p className="text-xs text-muted-foreground">Last 90 days</p></div><div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Orders" value={String(data.total)} /><Metric label="Items" value={String(itemCount)} /><Metric label="Gross sales" value={money(gross)} /><Metric label="Avg. order" value={money(average)} /></div>{data.orders.length === 0 ? <div className="rounded-lg border border-dashed border-border px-5 py-10 text-center text-sm text-muted-foreground">No Sandbox orders were found. Create a test listing and complete a purchase with a separate Sandbox buyer account, then sync again.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="text-left text-xs text-muted-foreground"><tr><th className="py-2">Date</th><th>Items</th><th>Status</th><th className="text-right">Total</th></tr></thead><tbody>{data.orders.map((order) => <tr key={order.orderId} className="border-t border-border"><td className="py-3">{new Date(order.creationDate).toLocaleDateString()}</td><td>{order.lineItems.map((item) => item.title).join(', ') || 'Order'}</td><td>{order.orderPaymentStatus}</td><td className="text-right">{money(order.total, order.currency)}</td></tr>)}</tbody></table></div>}</div>;
}

function TrendSummary({ data, query }: { data: Record<string, unknown>; query: string }) {
  const narrative = [data.summary, data.answer, data.report, data.brief].find((value) => typeof value === 'string') as string | undefined;
  return <div className="space-y-4"><div><p className="text-xs text-muted-foreground">Live signal brief for</p><h3 className="mt-1 text-lg font-semibold">{query}</h3></div>{narrative ? <p className="whitespace-pre-wrap text-sm leading-6">{narrative}</p> : null}<details open={!narrative}><summary className="cursor-pointer text-xs text-muted-foreground">Source-backed response</summary><pre className="mt-3 max-h-[32rem] overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(data, null, 2)}</pre></details></div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-border p-3"><p className="text-[10px] text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-lg border border-dashed border-border px-5 py-14 text-center text-sm text-muted-foreground">{text}</div>; }
function money(value: number, currency = 'USD') { return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(value); }
