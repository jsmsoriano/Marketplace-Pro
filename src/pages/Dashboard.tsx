import { useMemo, useState } from 'react';
import { ArrowUpRight, CircleDollarSign, Clock3, PackageCheck, ShoppingBag, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DataQualityBanner } from '@/components/DataQualityBanner';
import { ImportOrdersButton } from '@/components/ImportOrdersButton';
import { MetricCard } from '@/components/MetricCard';
import { PeriodPicker } from '@/components/PeriodPicker';
import { TrendBadge } from '@/components/TrendBadge';
import { Button } from '@/components/ui/button';
import { useSalesData } from '@/hooks/use-sales-data';
import { brandRecommendations, marketplaceBreakdown, recentSales, summarizeOrders, weeklySales } from '@/lib/analytics';
import { filterOrdersByPeriod, formatCurrency, formatPercent, type Period } from '@/lib/orders';

export default function Dashboard() {
  const { orders, mode } = useSalesData();
  const [period, setPeriod] = useState<Period>('30d');
  const visibleOrders = useMemo(() => filterOrdersByPeriod(orders, period), [orders, period]);
  const summary = useMemo(() => summarizeOrders(visibleOrders), [visibleOrders]);
  const platforms = useMemo(() => marketplaceBreakdown(visibleOrders), [visibleOrders]);
  const brands = useMemo(() => brandRecommendations(orders, period).slice(0, 5), [orders, period]);
  const sales = useMemo(() => recentSales(visibleOrders), [visibleOrders]);
  const weekly = useMemo(() => weeklySales(orders), [orders]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Resale intelligence</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Know what to source next.</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Turn Nifty sales into clear buying signals across eBay, Poshmark, and Depop.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PeriodPicker value={period} onChange={setPeriod} />
          <ImportOrdersButton />
        </div>
      </div>

      <DataQualityBanner visibleOrders={visibleOrders.length} />

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard label="Net revenue" value={formatCurrency(summary.revenue)} detail={`${summary.orders} completed sales`} icon={CircleDollarSign} tone="blue" />
        <MetricCard label="Total profit" value={formatCurrency(summary.profit)} detail={`${formatPercent(summary.margin)} net margin`} icon={TrendingUp} tone="green" />
        <MetricCard label="Avg. sale price" value={formatCurrency(summary.averageSalePrice)} detail={`${formatPercent(summary.roi)} return on COGS`} icon={ShoppingBag} tone="amber" />
        <MetricCard label="Days to sell" value={`${Math.round(summary.averageDaysListed)}d`} detail={summary.averageDaysListed <= 30 ? 'Healthy inventory velocity' : 'Review stale inventory'} icon={Clock3} />
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.55fr_1fr]">
        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Sales pulse</h2>
              <p className="mt-1 text-xs text-muted-foreground">Eight-week revenue and profit rhythm</p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">Latest sale anchored</span>
          </div>
          <SalesPulseChart data={weekly} />
        </section>

        <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
          <div>
            <h2 className="text-base font-semibold">Marketplace mix</h2>
            <p className="mt-1 text-xs text-muted-foreground">Where revenue and margin are strongest</p>
          </div>
          <div className="mt-5 space-y-5">
            {platforms.map((platform) => (
              <div key={platform.marketplace}>
                <div className="mb-2 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">{platform.marketplace}</p>
                    <p className="text-xs text-muted-foreground">{platform.orders} sales · {formatPercent(platform.margin)} margin</p>
                  </div>
                  <p className="text-sm font-semibold tabular-nums">{formatCurrency(platform.revenue)}</p>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-foreground" style={{ width: `${summary.revenue ? (platform.revenue / summary.revenue) * 100 : 0}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold">Brands worth another look</h2>
            <p className="mt-1 text-xs text-muted-foreground">Ranked by margin, velocity, demand, and period-over-period direction</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <Link to="/sourcing">Open sourcing plan <ArrowUpRight /></Link>
          </Button>
        </div>
        <div className="divide-y divide-border">
          {brands.map((brand, index) => (
            <div key={brand.brand} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-5 py-4 sm:grid-cols-[auto_1.5fr_1fr_1fr_auto]">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-xs font-semibold">{index + 1}</span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{brand.brand}</p>
                <p className="text-xs text-muted-foreground">{brand.units} sold · {Math.round(brand.averageDaysListed)}d avg</p>
              </div>
              <div className="hidden sm:block">
                <p className="text-xs text-muted-foreground">Profit</p>
                <p className="text-sm font-semibold tabular-nums">{formatCurrency(brand.profit)}</p>
              </div>
              <div className="hidden sm:block"><TrendBadge direction={brand.direction} /></div>
              <div className="text-right">
                <p className="text-lg font-semibold tabular-nums">{brand.score}</p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">buy score</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card shadow-sm">
        <div className="border-b border-border px-5 py-4">
          <h2 className="text-base font-semibold">Recent sales</h2>
          <p className="mt-1 text-xs text-muted-foreground">The transactions driving your current signals</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead className="bg-muted/50 text-xs text-muted-foreground">
              <tr><th className="px-5 py-3 font-medium">Item</th><th className="px-4 py-3 font-medium">Marketplace</th><th className="px-4 py-3 font-medium">Days listed</th><th className="px-4 py-3 text-right font-medium">Sale</th><th className="px-5 py-3 text-right font-medium">Profit</th></tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td className="max-w-[340px] px-5 py-3"><p className="truncate font-medium">{sale.itemName}</p><p className="text-xs text-muted-foreground">{sale.brand} · SKU {sale.sku}</p></td>
                  <td className="px-4 py-3"><span className="rounded-full border border-border px-2 py-1 text-xs">{sale.marketplace}</span></td>
                  <td className="px-4 py-3 tabular-nums">{sale.daysListed}d</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(sale.salePrice)}</td>
                  <td className="px-5 py-3 text-right font-semibold tabular-nums text-emerald-700 dark:text-emerald-400">{formatCurrency(sale.totalProfit)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {mode === 'imported' ? (
        <p className="text-center text-xs text-muted-foreground">Brand names are inferred from listing titles. Confirmed brand and active-inventory imports are planned for the next data schema.</p>
      ) : null}
    </div>
  );
}

function SalesPulseChart({ data }: { data: ReturnType<typeof weeklySales> }) {
  const maxRevenue = Math.max(...data.map((point) => point.revenue), 1);
  return (
    <div className="mt-6">
      <div className="flex h-56 items-end gap-2 sm:gap-4" role="img" aria-label="Weekly revenue bar chart">
        {data.map((point) => (
          <div key={point.label} className="group flex h-full flex-1 flex-col justify-end">
            <div className="relative flex h-[calc(100%-1.75rem)] items-end justify-center">
              <div
                className="w-full max-w-12 rounded-t-md bg-slate-800 transition-colors group-hover:bg-emerald-600 dark:bg-slate-200 dark:group-hover:bg-emerald-400"
                style={{ height: `${Math.max(3, (point.revenue / maxRevenue) * 100)}%` }}
                title={`${point.label}: ${formatCurrency(point.revenue)} revenue, ${formatCurrency(point.profit)} profit`}
              />
            </div>
            <span className="mt-2 truncate text-center text-[10px] text-muted-foreground">{point.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><PackageCheck className="h-3.5 w-3.5" /> Hover bars for weekly revenue and profit</div>
    </div>
  );
}
