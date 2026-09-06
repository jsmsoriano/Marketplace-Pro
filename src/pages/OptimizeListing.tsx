import { useState } from 'react';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { optimizeListing } from '@/lib/api';

type Optimization = Awaited<ReturnType<typeof optimizeListing>>['optimization'];

const OptimizeListing = () => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [researchQuery, setResearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Optimization | null>(null);
  const [comps, setComps] = useState<Record<string, unknown> | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const handleOptimize = async () => {
    if (!title.trim()) {
      toast({ title: 'Title required', description: 'Enter a draft listing title to optimize.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const res = await optimizeListing({
        title,
        description,
        researchQuery: researchQuery.trim() || title,
        days: 30,
      });
      setResult(res.optimization);
      setComps(res.comps);
      toast({ title: 'Listing optimized', description: 'Title, description, and sold-comp pricing updated.' });
    } catch (err) {
      toast({
        title: 'Optimize failed',
        description: err instanceof Error ? err.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const copyText = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Listing Optimizer</h1>
        <p className="text-muted-foreground mt-2">
          Tighten titles and descriptions, then price from Matt Van Horn’s{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">ebay-pp-cli</code> sold comps (last 30 days).
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="title">Draft title</Label>
          <Input
            id="title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nike Air Max 270 Black White Size 10"
            maxLength={120}
          />
          <p className="text-xs text-muted-foreground">{title.length}/80 eBay limit (optimizer will trim)</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="researchQuery">Sold-comp query (optional)</Label>
          <Input
            id="researchQuery"
            value={researchQuery}
            onChange={(e) => setResearchQuery(e.target.value)}
            placeholder="Defaults to title — use a cleaner query for better comps"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Draft description</Label>
          <Textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Condition, what’s included, flaws, shipping notes…"
            rows={6}
          />
        </div>

        <Button onClick={handleOptimize} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Optimize with sold comps
        </Button>
      </div>

      {result && (
        <div className="space-y-6 border-t border-border pt-8">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Optimized title</Label>
              <Button variant="ghost" size="sm" onClick={() => copyText('title', result.optimizedTitle)}>
                {copied === 'title' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">{result.optimizedTitle}</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Metric label="Suggested" value={fmtMoney(result.suggestedPrice)} />
            <Metric label="Median" value={fmtMoney(result.priceBand.median)} />
            <Metric label="Low (p25)" value={fmtMoney(result.priceBand.low)} />
            <Metric label="High (p75)" value={fmtMoney(result.priceBand.high)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label>Optimized description</Label>
              <Button variant="ghost" size="sm" onClick={() => copyText('desc', result.optimizedDescription)}>
                {copied === 'desc' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-sans">
              {result.optimizedDescription}
            </pre>
          </div>

          {result.tips.length > 0 && (
            <div className="space-y-2">
              <Label>Tips</Label>
              <ul className="list-disc pl-5 text-sm text-muted-foreground space-y-1">
                {result.tips.map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </div>
          )}

          {comps && !('error' in comps) && (
            <details className="text-sm">
              <summary className="cursor-pointer text-muted-foreground">Raw ebay-pp-cli comps JSON</summary>
              <pre className="mt-2 overflow-auto rounded-md border border-border bg-muted/40 p-3 text-xs">
                {JSON.stringify(comps, null, 2)}
              </pre>
            </details>
          )}
          {comps && typeof comps.error === 'string' && (
            <p className="text-sm text-destructive">Comps unavailable: {comps.error}</p>
          )}
        </div>
      )}
    </div>
  );
};

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border px-3 py-2">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

function fmtMoney(n: number | null | undefined) {
  if (n == null || Number.isNaN(Number(n))) return '—';
  return `$${Number(n).toFixed(2)}`;
}

export default OptimizeListing;
