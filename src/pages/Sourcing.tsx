import { useMemo, useState } from 'react';
import { ArrowRight, BadgeDollarSign, Boxes, CircleGauge, Clock3, Search, ShieldCheck, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { ImportOrdersButton } from '@/components/ImportOrdersButton';
import { PeriodPicker } from '@/components/PeriodPicker';
import { TrendBadge } from '@/components/TrendBadge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSalesData } from '@/hooks/use-sales-data';
import { brandRecommendations, type BrandRecommendation } from '@/lib/analytics';
import { filterOrdersByPeriod, formatCurrency, formatPercent, orderDate, periodDays, type Period } from '@/lib/orders';
import { inventoryOpportunities, type InventoryAction, type InventoryOpportunity } from '@/lib/inventory-analytics';

export default function Sourcing() {
  const { orders, activeInventory } = useSalesData();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('90d');
  const visibleOrders = useMemo(() => filterOrdersByPeriod(orders, period), [orders, period]);
  const recommendations = useMemo(() => brandRecommendations(orders, period), [orders, period]);
  const leader = recommendations[0];
  const inventoryPlan = useMemo(() => inventoryOpportunities(orders, activeInventory, period), [activeInventory, orders, period]);
  const activeUnits = useMemo(() => activeInventory.reduce((sum, item) => sum + Math.max(0, item.quantity), 0), [activeInventory]);
  const storeSellThrough = visibleOrders.length + activeUnits ? visibleOrders.length / (visibleOrders.length + activeUnits) : null;
  const measurementDays = useMemo(() => reportingWindowDays(visibleOrders, period), [period, visibleOrders]);
  const inventoryTurnover = activeUnits && measurementDays ? (visibleOrders.length / activeUnits) * (365 / measurementDays) : null;
  const knownDays = useMemo(() => visibleOrders.map((order) => order.daysListed).filter((days) => days > 0).sort((a, b) => a - b), [visibleOrders]);
  const medianDaysToSell = medianValue(knownDays);
  const sellThroughBenchmark = storeSellThrough == null ? null : sellThroughStatus(storeSellThrough, measurementDays);
  const turnoverBenchmark = inventoryTurnover == null ? null : turnoverStatus(inventoryTurnover);
  const daysToSellBenchmark = knownDays.length ? daysToSellStatus(medianDaysToSell) : null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Buy plan</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Source with a thesis.</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Convert recent sales into unit targets, cost ceilings, and the marketplace most likely to pay.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2"><PeriodPicker value={period} onChange={setPeriod} /><ImportOrdersButton /></div>
      </div>

      <section className="grid gap-3 sm:grid-cols-3">
        <SourcingSummaryTile icon={TrendingUp} label="Store sell-through" value={storeSellThrough == null ? '—' : formatPercent(storeSellThrough)} detail={activeInventory.length ? `${visibleOrders.length} sold · ${activeUnits} currently active` : 'Import Active Inventory to calculate'} benchmark={sellThroughBenchmark} target="Healthy: 25–39% per 90 days" />
        <SourcingSummaryTile icon={Boxes} label="Inventory turnover" value={inventoryTurnover == null ? '—' : `${inventoryTurnover.toFixed(1)}×`} detail={activeInventory.length ? `Annualized from this ${measurementDays}-day window` : 'Requires an inventory snapshot'} benchmark={turnoverBenchmark} target="Healthy: 4–6 turns per year" />
        <SourcingSummaryTile icon={Clock3} label="Median days to sell" value={knownDays.length ? `${Math.round(medianDaysToSell)}d` : '—'} detail={knownDays.length ? `Based on ${knownDays.length} sales with listing age` : 'No listing-age data in this period'} benchmark={daysToSellBenchmark} target="Healthy: 31–60 days" />
      </section>

      <Tabs defaultValue="inventory" className="min-w-0">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl border border-border bg-card p-1 shadow-sm">
          <TabsTrigger value="inventory" className="gap-2 py-2.5"><Boxes className="hidden h-4 w-4 sm:block" />Inventory plan</TabsTrigger>
          <TabsTrigger value="queue" className="gap-2 py-2.5"><BadgeDollarSign className="hidden h-4 w-4 sm:block" />Buy queue</TabsTrigger>
          <TabsTrigger value="scoring" className="gap-2 py-2.5"><CircleGauge className="hidden h-4 w-4 sm:block" />Scoring</TabsTrigger>
        </TabsList>

        <TabsContent value="inventory" className="mt-4">
          <InventoryAwarePlan items={inventoryPlan} hasInventory={activeInventory.length > 0} />
        </TabsContent>

        <TabsContent value="queue" className="mt-4 space-y-4">
          {leader ? (
            <section className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-lg dark:bg-slate-900">
              <div className="grid gap-8 p-6 md:grid-cols-[1.4fr_1fr] md:p-8">
                <div>
                  <div className="flex items-center gap-2"><span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">Top opportunity</span><TrendBadge direction={leader.direction} /></div>
                  <h2 className="mt-5 text-3xl font-semibold">Rebuy {leader.brand}</h2>
                  <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Fast turns and healthy observed margin put this brand at the top of the current sourcing queue. Favor styles similar to your recent wins on {leader.topMarketplace}.</p>
                  <Button className="mt-6 bg-white text-slate-950 hover:bg-slate-100" onClick={() => navigate(`/research?q=${encodeURIComponent(leader.brand)}`)}>Validate market demand <Search /></Button>
                </div>
                <div className="grid grid-cols-2 gap-3 self-end">
                  <PlanMetric label="Buy target" value={`${leader.recommendedUnits} units`} />
                  <PlanMetric label="Max unit cost" value={formatCurrency(leader.maxBuyCost)} />
                  <PlanMetric label="Observed margin" value={formatPercent(leader.margin)} />
                  <PlanMetric label="Confidence" value={leader.confidence} />
                </div>
              </div>
            </section>
          ) : null}
          <RecommendedBuyQueue items={recommendations} onResearch={(brand) => navigate(`/research?q=${encodeURIComponent(brand)}`)} />
        </TabsContent>

        <TabsContent value="scoring" className="mt-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-base font-semibold">How the sourcing score works</h2>
              <p className="mt-1 text-xs text-muted-foreground">Each brand is ranked using your own sales from the selected period.</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <Rule icon={CircleGauge} label="Velocity" detail="35% · fewer days listed wins" />
                <Rule icon={BadgeDollarSign} label="Margin" detail="30% · profit after fees and COGS" />
                <Rule icon={Boxes} label="Repeat demand" detail="20% · observed units sold" />
                <Rule icon={ShieldCheck} label="Direction" detail="15% · versus prior period" />
              </div>
            </section>
            <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
              <h2 className="text-base font-semibold">Reseller benchmarks</h2>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground"><BenchmarkKey status="Strong" /><BenchmarkKey status="Healthy" /><BenchmarkKey status="Watch" /><BenchmarkKey status="Slow" /></div>
              <div className="mt-5 space-y-3 text-sm">
                <BenchmarkRow label="90-day sell-through" strong="40%+" healthy="25–39%" />
                <BenchmarkRow label="Annual turnover" strong="6×+" healthy="4–6×" />
                <BenchmarkRow label="Median days to sell" strong="≤30d" healthy="31–60d" />
              </div>
              <p className="mt-5 text-xs leading-5 text-muted-foreground">Compare category + brand before buying. Store-wide averages can hide strong item types inside a mixed brand.</p>
            </section>
          </div>
          <div className="mt-4 rounded-xl border border-amber-300/60 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <h3 className="text-sm font-semibold">{activeInventory.length ? 'Estimated sell-through' : 'Sell-through needs inventory'}</h3>
            <p className="mt-2 text-xs leading-5 opacity-80">{activeInventory.length ? 'The active file is a current snapshot, so sell-through uses sold ÷ (sold + current active). Import regular snapshots to improve historical accuracy.' : 'Order exports show what sold, not how many items were available. Import Active Inventory to add stock-aware recommendations.'}</p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function InventoryAwarePlan({ items, hasInventory }: { items: InventoryOpportunity[]; hasInventory: boolean }) {
  if (!hasInventory) return <section className="rounded-xl border border-dashed border-border bg-muted/20 px-5 py-8 text-center"><h2 className="font-semibold">Import Active Inventory for true sell-through</h2><p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">Choose the Active Inventory template under Import data. Marketplace Pro will compare current stock with sales in this reporting period.</p><div className="mt-4 flex justify-center"><ImportOrdersButton /></div></section>;
  const visible = items.slice(0, 30);
  return <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"><div className="border-b border-border px-5 py-4"><h2 className="font-semibold">Inventory-aware sourcing plan</h2><p className="mt-1 text-xs text-muted-foreground">Estimated sell-through = sold ÷ (sold + current active). Buy targets aim for roughly two months of observed demand.</p></div><div className="space-y-2 p-3 lg:hidden">{visible.slice(0, 12).map((item) => <div key={item.key} className="rounded-lg border border-border p-3"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold">{item.brand}</p><p className="text-xs text-muted-foreground">{item.category}</p></div><ActionBadge action={item.action} /></div><div className="mt-3 grid grid-cols-4 gap-2 text-center"><TinyMetric label="Sold" value={String(item.soldUnits)} /><TinyMetric label="Stock" value={String(item.activeUnits)} /><TinyMetric label="Sell-thru" value={formatPercent(item.sellThrough)} /><TinyMetric label="Buy" value={String(item.suggestedBuy)} /></div></div>)}</div><div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[920px] text-sm"><thead className="bg-muted/40 text-left text-xs text-muted-foreground"><tr><th className="px-5 py-3">Brand & category</th><th className="px-4 py-3 text-right">Sold</th><th className="px-4 py-3 text-right">In stock</th><th className="px-4 py-3 text-right">Est. sell-through</th><th className="px-4 py-3 text-right">Sales/month</th><th className="px-4 py-3 text-right">Days supply</th><th className="px-4 py-3 text-right">Suggested buy</th><th className="px-5 py-3">Action</th></tr></thead><tbody className="divide-y divide-border">{visible.map((item) => <tr key={item.key}><td className="px-5 py-4"><p className="font-semibold">{item.brand}</p><p className="text-xs text-muted-foreground">{item.category}</p></td><td className="px-4 py-4 text-right tabular-nums">{item.soldUnits}</td><td className="px-4 py-4 text-right tabular-nums">{item.activeUnits}</td><td className="px-4 py-4 text-right font-semibold tabular-nums">{formatPercent(item.sellThrough)}</td><td className="px-4 py-4 text-right tabular-nums">{item.salesPerMonth.toFixed(1)}</td><td className="px-4 py-4 text-right tabular-nums">{item.daysOfSupply == null ? 'No sales' : `${Math.round(item.daysOfSupply)}d`}</td><td className="px-4 py-4 text-right font-semibold tabular-nums">{item.suggestedBuy}</td><td className="px-5 py-4"><ActionBadge action={item.action} /></td></tr>)}</tbody></table></div></section>;
}

function RecommendedBuyQueue({ items, onResearch }: { items: BrandRecommendation[]; onResearch: (brand: string) => void }) {
  return <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
    <div className="border-b border-border px-5 py-4">
      <h2 className="text-base font-semibold">Recommended buy queue</h2>
      <p className="mt-1 text-xs text-muted-foreground">Cost ceilings assume room for fees and a 35–40% target contribution margin.</p>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr><th className="px-5 py-3 font-medium">Priority</th><th className="px-4 py-3 font-medium">Brand</th><th className="px-4 py-3 font-medium">Direction</th><th className="px-4 py-3 text-right font-medium">Avg sold</th><th className="px-4 py-3 text-right font-medium">Avg days</th><th className="px-4 py-3 text-right font-medium">Buy target</th><th className="px-4 py-3 text-right font-medium">Max COGS</th><th className="px-5 py-3"></th></tr>
        </thead>
        <tbody className="divide-y divide-border">
          {items.map((item) => <tr key={item.brand} className="hover:bg-muted/30">
            <td className="px-5 py-4"><span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border font-semibold tabular-nums">{item.score}</span></td>
            <td className="px-4 py-4"><p className="font-medium">{item.brand}</p><p className="text-xs text-muted-foreground">{item.units} sold · {item.confidence} confidence</p></td>
            <td className="px-4 py-4"><TrendBadge direction={item.direction} /></td>
            <td className="px-4 py-4 text-right tabular-nums">{formatCurrency(item.averagePrice)}</td>
            <td className="px-4 py-4 text-right tabular-nums">{Math.round(item.averageDaysListed)}d</td>
            <td className="px-4 py-4 text-right font-semibold tabular-nums">{item.recommendedUnits}</td>
            <td className="px-4 py-4 text-right font-semibold tabular-nums">{formatCurrency(item.maxBuyCost)}</td>
            <td className="px-5 py-4 text-right"><Button variant="ghost" size="icon" aria-label={`Research ${item.brand}`} onClick={() => onResearch(item.brand)}><ArrowRight /></Button></td>
          </tr>)}
        </tbody>
      </table>
    </div>
  </section>;
}

function ActionBadge({ action }: { action: InventoryAction }) { const styles: Record<InventoryAction, string> = { Replenish: 'bg-emerald-600 text-white', Healthy: 'bg-blue-100 text-blue-900 dark:bg-blue-950 dark:text-blue-100', Watch: 'bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-100', Overstock: 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100' }; return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${styles[action]}`}>{action}</span>; }
function TinyMetric({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold tabular-nums">{value}</p></div>; }

type BenchmarkStatus = 'Strong' | 'Healthy' | 'Watch' | 'Slow';

const benchmarkStyles: Record<BenchmarkStatus, { tile: string; badge: string; dot: string }> = {
  Strong: { tile: 'border-emerald-300/70 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30', badge: 'bg-emerald-600 text-white', dot: 'bg-emerald-600' },
  Healthy: { tile: 'border-lime-300/70 bg-lime-50 dark:border-lime-900 dark:bg-lime-950/30', badge: 'bg-lime-600 text-white', dot: 'bg-lime-600' },
  Watch: { tile: 'border-amber-300/70 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30', badge: 'bg-amber-500 text-amber-950', dot: 'bg-amber-500' },
  Slow: { tile: 'border-red-300/70 bg-red-50 dark:border-red-900 dark:bg-red-950/30', badge: 'bg-red-600 text-white', dot: 'bg-red-600' },
};

function SourcingSummaryTile({ icon: Icon, label, value, detail, benchmark, target }: { icon: typeof Boxes; label: string; value: string; detail: string; benchmark: BenchmarkStatus | null; target: string }) {
  const style = benchmark ? benchmarkStyles[benchmark] : null;
  return <article className={`rounded-xl border p-4 shadow-sm ${style?.tile ?? 'border-border bg-card'}`}><div className="flex items-center justify-between gap-3"><p className="text-xs font-medium text-muted-foreground">{label}</p><Icon className="h-4 w-4 text-muted-foreground" /></div><div className="mt-2 flex items-end justify-between gap-3"><p className="text-2xl font-semibold tabular-nums">{value}</p>{benchmark ? <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${style?.badge}`}>{benchmark}</span> : null}</div><p className="mt-1 text-xs text-muted-foreground">{detail}</p><p className="mt-3 border-t border-current/10 pt-2 text-[11px] font-medium opacity-75">{target}</p></article>;
}

function BenchmarkKey({ status }: { status: BenchmarkStatus }) {
  return <span className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${benchmarkStyles[status].dot}`} />{status}</span>;
}

function BenchmarkRow({ label, strong, healthy }: { label: string; strong: string; healthy: string }) {
  return <div className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg bg-muted/50 px-3 py-2.5"><span className="font-medium">{label}</span><span className="text-xs text-muted-foreground">Strong <b className="text-foreground">{strong}</b></span><span className="text-xs text-muted-foreground">Healthy <b className="text-foreground">{healthy}</b></span></div>;
}

function reportingWindowDays(orders: ReturnType<typeof filterOrdersByPeriod>, period: Period) {
  const fixedDays = periodDays(period);
  if (fixedDays != null) return fixedDays;
  const dates = orders.map((order) => orderDate(order).getTime()).filter(Number.isFinite);
  if (dates.length < 2) return dates.length ? 1 : 0;
  return Math.max(1, Math.ceil((Math.max(...dates) - Math.min(...dates)) / 86_400_000) + 1);
}

function sellThroughStatus(value: number, days: number): BenchmarkStatus {
  const scaleThreshold = (ninetyDayRate: number) => {
    const odds = ninetyDayRate / (1 - ninetyDayRate);
    const scaledOdds = odds * Math.max(days, 1) / 90;
    return scaledOdds / (1 + scaledOdds);
  };
  if (value >= scaleThreshold(0.4)) return 'Strong';
  if (value >= scaleThreshold(0.25)) return 'Healthy';
  if (value >= scaleThreshold(0.1)) return 'Watch';
  return 'Slow';
}

function turnoverStatus(value: number): BenchmarkStatus {
  if (value >= 6) return 'Strong';
  if (value >= 4) return 'Healthy';
  if (value >= 2) return 'Watch';
  return 'Slow';
}

function daysToSellStatus(value: number): BenchmarkStatus {
  if (value <= 30) return 'Strong';
  if (value <= 60) return 'Healthy';
  if (value <= 90) return 'Watch';
  return 'Slow';
}

function medianValue(values: number[]) {
  if (!values.length) return 0;
  const middle = Math.floor(values.length / 2);
  return values.length % 2 ? values[middle] : (values[middle - 1] + values[middle]) / 2;
}

function PlanMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div>;
}

function Rule({ icon: Icon, label, detail }: { icon: typeof CircleGauge; label: string; detail: string }) {
  return <div className="flex items-start gap-3"><span className="rounded-lg bg-muted p-2"><Icon className="h-4 w-4" /></span><div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{detail}</p></div></div>;
}
