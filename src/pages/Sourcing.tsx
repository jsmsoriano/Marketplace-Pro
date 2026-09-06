import { useMemo, useState } from 'react';
import { ArrowRight, BadgeDollarSign, Boxes, CircleGauge, Search, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DataQualityBanner } from '@/components/DataQualityBanner';
import { ImportOrdersButton } from '@/components/ImportOrdersButton';
import { PeriodPicker } from '@/components/PeriodPicker';
import { TrendBadge } from '@/components/TrendBadge';
import { Button } from '@/components/ui/button';
import { useSalesData } from '@/hooks/use-sales-data';
import { brandRecommendations } from '@/lib/analytics';
import { filterOrdersByPeriod, formatCurrency, formatPercent, type Period } from '@/lib/orders';

export default function Sourcing() {
  const { orders } = useSalesData();
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>('30d');
  const visibleOrders = useMemo(() => filterOrdersByPeriod(orders, period), [orders, period]);
  const recommendations = useMemo(() => brandRecommendations(orders, period), [orders, period]);
  const leader = recommendations[0];

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

      <DataQualityBanner visibleOrders={visibleOrders.length} />

      {leader ? (
        <section className="overflow-hidden rounded-2xl bg-slate-950 text-white shadow-lg dark:bg-slate-900">
          <div className="grid gap-8 p-6 md:grid-cols-[1.4fr_1fr] md:p-8">
            <div>
              <div className="flex items-center gap-2"><span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">Top opportunity</span><TrendBadge direction={leader.direction} /></div>
              <h2 className="mt-5 text-3xl font-semibold">Rebuy {leader.brand}</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Fast turns and healthy observed margin put this brand at the top of the current sourcing queue. Favor styles similar to your recent wins on {leader.topMarketplace}.</p>
              <Button className="mt-6 bg-white text-slate-950 hover:bg-slate-100" onClick={() => navigate(`/research?q=${encodeURIComponent(leader.brand)}`)}>
                Validate market demand <Search />
              </Button>
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

      <div className="grid gap-6 xl:grid-cols-[1fr_300px]">
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
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
                {recommendations.map((item) => (
                  <tr key={item.brand} className="hover:bg-muted/30">
                    <td className="px-5 py-4"><span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border font-semibold tabular-nums">{item.score}</span></td>
                    <td className="px-4 py-4"><p className="font-medium">{item.brand}</p><p className="text-xs text-muted-foreground">{item.units} sold · {item.confidence} confidence</p></td>
                    <td className="px-4 py-4"><TrendBadge direction={item.direction} /></td>
                    <td className="px-4 py-4 text-right tabular-nums">{formatCurrency(item.averagePrice)}</td>
                    <td className="px-4 py-4 text-right tabular-nums">{Math.round(item.averageDaysListed)}d</td>
                    <td className="px-4 py-4 text-right font-semibold tabular-nums">{item.recommendedUnits}</td>
                    <td className="px-4 py-4 text-right font-semibold tabular-nums">{formatCurrency(item.maxBuyCost)}</td>
                    <td className="px-5 py-4 text-right"><Button variant="ghost" size="icon" aria-label={`Research ${item.brand}`} onClick={() => navigate(`/research?q=${encodeURIComponent(item.brand)}`)}><ArrowRight /></Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-base font-semibold">How the score works</h2>
            <div className="mt-5 space-y-4">
              <Rule icon={CircleGauge} label="Velocity" detail="35% · fewer days listed wins" />
              <Rule icon={BadgeDollarSign} label="Margin" detail="30% · profit after fees and COGS" />
              <Rule icon={Boxes} label="Repeat demand" detail="20% · observed units sold" />
              <Rule icon={ShieldCheck} label="Direction" detail="15% · versus prior period" />
            </div>
          </div>
          <div className="rounded-xl border border-amber-300/60 bg-amber-50 p-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">
            <h3 className="text-sm font-semibold">Sell-through needs inventory</h3>
            <p className="mt-2 text-xs leading-5 opacity-80">Order exports show what sold, not how many items were available. This MVP uses days-to-sell as a velocity proxy and lowers confidence for small samples.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function PlanMetric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/10 bg-white/5 p-4"><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div>;
}

function Rule({ icon: Icon, label, detail }: { icon: typeof CircleGauge; label: string; detail: string }) {
  return <div className="flex items-start gap-3"><span className="rounded-lg bg-muted p-2"><Icon className="h-4 w-4" /></span><div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{detail}</p></div></div>;
}
