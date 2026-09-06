import { useMemo, useRef, useState, type ReactNode } from 'react';
import { BarChart3, ExternalLink, Loader2, Search, Sparkles } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useSalesData } from '@/hooks/use-sales-data';
import { brandRecommendations } from '@/lib/analytics';
import { researchComps, researchTrends } from '@/lib/api';

type LoadingState = 'comps' | 'trends' | 'both' | null;

export default function Research() {
  const [params] = useSearchParams();
  const { orders } = useSalesData();
  const suggestions = useMemo(() => brandRecommendations(orders, '90d').slice(0, 5), [orders]);
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [loading, setLoading] = useState<LoadingState>(null);
  const [comps, setComps] = useState<Record<string, unknown> | null>(null);
  const [trends, setTrends] = useState<Record<string, unknown> | null>(null);
  const [resultQuery, setResultQuery] = useState('');
  const runningRef = useRef(false);

  const run = async (kind: Exclude<LoadingState, null>) => {
    const submittedQuery = query.trim();
    if (!submittedQuery || runningRef.current) return;
    runningRef.current = true;
    setLoading(kind);
    setResultQuery(submittedQuery);
    if (kind === 'comps' || kind === 'both') setComps(null);
    if (kind === 'trends' || kind === 'both') setTrends(null);

    try {
      if (kind === 'both') {
        const [compResult, trendResult] = await Promise.allSettled([
          researchComps(submittedQuery, { days: 30 }),
          researchTrends(submittedQuery, { days: 30 }),
        ]);
        if (compResult.status === 'fulfilled') setComps(compResult.value.data);
        if (trendResult.status === 'fulfilled') setTrends(trendResult.value.data);
        const failures = [compResult, trendResult].filter((result) => result.status === 'rejected').length;
        if (failures === 2) throw new Error('Both research sources failed. Check local integrations and try again.');
        toast({ title: failures ? 'Research partially complete' : 'Market brief ready', description: failures ? 'One source was unavailable.' : 'Sold comps and social signals are updated.' });
      } else if (kind === 'comps') {
        const result = await researchComps(submittedQuery, { days: 30 });
        setComps(result.data);
        toast({ title: 'Sold comps ready', description: 'Last 30 days · outliers trimmed' });
      } else {
        const result = await researchTrends(submittedQuery, { days: 30 });
        setTrends(result.data);
        toast({ title: 'Social signal ready', description: 'Recent fashion and community conversation' });
      }
    } catch (error) {
      toast({ title: 'Research failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    } finally {
      runningRef.current = false;
      setLoading(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Market validation</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Check demand beyond your closet.</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Validate a sourcing idea with eBay sold comps and current social, forum, and fashion conversation before spending.</p>
      </div>

      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') void run('both'); }} className="h-11 pl-9" placeholder="Brand, style, model, size, or aesthetic" />
          </div>
          <Button className="h-11" onClick={() => void run('both')} disabled={Boolean(loading) || !query.trim()}>
            {loading === 'both' ? <Loader2 className="animate-spin" /> : <Sparkles />} Research both
          </Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">From your sales:</span>
          {suggestions.map((suggestion) => <button key={suggestion.brand} type="button" onClick={() => setQuery(suggestion.brand)} className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-muted">{suggestion.brand}</button>)}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <Tabs defaultValue="pricing" className="min-w-0">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pricing">Marketplace pricing</TabsTrigger>
            <TabsTrigger value="signals">Social & fashion signals</TabsTrigger>
          </TabsList>
          <TabsContent value="pricing" className="mt-4">
            <ResearchPanel icon={BarChart3} title="eBay sold comps" actionLabel="Run comps" loading={loading === 'comps'} onAction={() => void run('comps')}>
              {comps ? <CompsSummary data={comps} query={resultQuery} /> : <EmptyResearch text="Run comps for a recommended price, median, price band, and sample size." />}
            </ResearchPanel>
          </TabsContent>
          <TabsContent value="signals" className="mt-4">
            <ResearchPanel icon={Sparkles} title="Last 30 days" actionLabel="Scan signals" loading={loading === 'trends'} onAction={() => void run('trends')}>
              {trends ? <TrendSummary data={trends} query={resultQuery} /> : <EmptyResearch text="Scan recent Reddit, web, and fashion conversation for demand direction and emerging language." />}
            </ResearchPanel>
          </TabsContent>
        </Tabs>

        <aside className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <h2 className="text-sm font-semibold">Three checks before buying</h2>
            <ol className="mt-4 space-y-4 text-xs text-muted-foreground">
              <li><strong className="block text-foreground">1. Your evidence</strong>At least 3 relevant sales with healthy margin and days-to-sell.</li>
              <li><strong className="block text-foreground">2. Market evidence</strong>A sufficient sold-comps sample with a price band above your cost ceiling.</li>
              <li><strong className="block text-foreground">3. Social direction</strong>Conversation is rising or steady—not only one viral post.</li>
            </ol>
          </div>
          <div className="rounded-xl border border-border bg-muted/40 p-5">
            <p className="text-xs leading-5 text-muted-foreground">External signals are fetched live and shown separately from your sales. Marketplace Pro does not fabricate trend scores when a source is unavailable.</p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function ResearchPanel({ icon: Icon, title, actionLabel, loading, onAction, children }: { icon: typeof Search; title: string; actionLabel: string; loading: boolean; onAction: () => void; children: ReactNode }) {
  return <section className="rounded-xl border border-border bg-card shadow-sm"><div className="flex items-center justify-between border-b border-border px-5 py-4"><div className="flex items-center gap-2"><Icon className="h-4 w-4" /><h2 className="text-sm font-semibold">{title}</h2></div><Button variant="outline" size="sm" onClick={onAction} disabled={loading}>{loading ? <Loader2 className="animate-spin" /> : <ExternalLink />}{actionLabel}</Button></div><div className="p-5">{children}</div></section>;
}

function EmptyResearch({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-border px-5 py-14 text-center text-sm text-muted-foreground">{text}</div>;
}

function CompsSummary({ data, query }: { data: Record<string, unknown>; query: string }) {
  const mean = number(data.mean ?? data.avg ?? data.average);
  const median = number(data.median);
  const sample = number(data.sample_size ?? data.count);
  const p25 = number(data.p25 ?? data.percentile_25);
  const p75 = number(data.p75 ?? data.percentile_75);
  const noResults = sample === 0;
  return <div className="space-y-5"><div><p className="text-xs text-muted-foreground">Pricing evidence for</p><h3 className="mt-1 text-lg font-semibold">{query}</h3></div>{noResults ? <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100">No matching sold listings were found. Broaden the query before using marketplace pricing.</div> : null}<div className="grid grid-cols-2 gap-3 sm:grid-cols-5"><ResearchMetric label="Recommended" value={money(noResults ? null : median ?? mean)} featured /><ResearchMetric label="Mean" value={money(noResults ? null : mean)} /><ResearchMetric label="Low band" value={money(noResults ? null : p25)} /><ResearchMetric label="High band" value={money(noResults ? null : p75)} /><ResearchMetric label="Sample" value={sample == null ? '—' : String(sample)} /></div><details><summary className="cursor-pointer text-xs text-muted-foreground">View source response</summary><pre className="mt-3 max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(data, null, 2)}</pre></details></div>;
}

function TrendSummary({ data, query }: { data: Record<string, unknown>; query: string }) {
  const narrative = [data.summary, data.answer, data.report, data.brief].find((value) => typeof value === 'string') as string | undefined;
  return <div className="space-y-5"><div><p className="text-xs text-muted-foreground">Live signal brief for</p><h3 className="mt-1 text-lg font-semibold">{query}</h3></div>{narrative ? <p className="whitespace-pre-wrap text-sm leading-6">{narrative}</p> : null}<details open={!narrative}><summary className="cursor-pointer text-xs text-muted-foreground">{narrative ? 'View source response' : 'Source-backed trend response'}</summary><pre className="mt-3 max-h-[32rem] overflow-auto rounded-lg bg-muted p-3 text-xs">{JSON.stringify(data, null, 2)}</pre></details></div>;
}

function ResearchMetric({ label, value, featured = false }: { label: string; value: string; featured?: boolean }) {
  return <div className={featured ? 'rounded-lg bg-slate-950 p-3 text-white dark:bg-slate-100 dark:text-slate-950' : 'rounded-lg border border-border p-3'}><p className={featured ? 'text-[10px] text-slate-300 dark:text-slate-600' : 'text-[10px] text-muted-foreground'}>{label}</p><p className="mt-1 text-lg font-semibold tabular-nums">{value}</p></div>;
}

function number(value: unknown): number | null {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function money(value: number | null) {
  return value == null || value <= 0 ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}
