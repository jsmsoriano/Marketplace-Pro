import { useMemo, useState } from 'react';
import { Check, ClipboardCheck, Copy, Loader2, Sparkles } from 'lucide-react';
import TitleAudit from '@/components/TitleAudit';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { useSalesData } from '@/hooks/use-sales-data';
import { optimizeListing } from '@/lib/api';
import { inferBrand } from '@/lib/orders';

type Optimization = Awaited<ReturnType<typeof optimizeListing>>['optimization'];

export default function OptimizeListingV2() {
  const { orders } = useSalesData();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Optimization | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const brand = title.trim() ? inferBrand(title) : '';
  const matchingPrices = useMemo(() => orders.filter((order) => order.brand.toLowerCase() === brand.toLowerCase() && order.salePrice > 0).map((order) => order.salePrice).sort((a, b) => a - b), [brand, orders]);
  const salesStats = useMemo(() => stats(matchingPrices), [matchingPrices]);

  const handleOptimize = async () => {
    if (!title.trim()) {
      toast({ title: 'Title required', description: 'Enter a draft listing title to optimize.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const response = await optimizeListing({ title, description, salesStats });
      setResult(response.optimization);
      toast({ title: 'Listing optimized', description: 'Title, description guidance, and own-sales pricing updated.' });
    } catch (error) {
      toast({ title: 'Optimize failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
    } finally { setLoading(false); }
  };

  const copyText = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div><h1 className="text-3xl font-semibold tracking-tight">Listing Lab</h1><p className="mt-2 text-muted-foreground">Optimize a listing or audit active titles.</p></div>
      <Tabs defaultValue="optimizer" className="space-y-5">
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl border border-border bg-card p-1 shadow-sm sm:w-[420px]"><TabsTrigger value="optimizer" className="gap-2 py-2.5"><Sparkles className="h-4 w-4" />Optimize</TabsTrigger><TabsTrigger value="audit" className="gap-2 py-2.5"><ClipboardCheck className="h-4 w-4" />Audit</TabsTrigger></TabsList>
        <TabsContent value="optimizer"><div className="max-w-3xl space-y-8">
      <div className="space-y-5">
        <div className="space-y-2"><Label htmlFor="title">Draft title</Label><Input id="title" value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Nike Air Max 270 Black White Size 10 Used" maxLength={120} /><p className="text-xs text-muted-foreground">{title.length}/80 eBay limit · inferred brand: {brand || '—'}</p></div>
        <div className="space-y-2"><Label htmlFor="description">Draft description</Label><Textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Condition, what’s included, flaws, shipping notes…" rows={6} /></div>
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm"><strong>Your sales reference:</strong> {matchingPrices.length ? `${matchingPrices.length} matching ${brand} sale${matchingPrices.length === 1 ? '' : 's'}` : `No matching ${brand || 'brand'} sales yet`}</div>
        <Button onClick={() => void handleOptimize()} disabled={loading} className="gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}Optimize listing</Button>
      </div>
      {result ? <div className="space-y-6 border-t border-border pt-8">
        <ResultBlock label="Optimized title" value={result.optimizedTitle} copied={copied === 'title'} onCopy={() => void copyText('title', result.optimizedTitle)} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4"><Metric label="Suggested" value={money(result.suggestedPrice)} /><Metric label="Median" value={money(result.priceBand.median)} /><Metric label="Low (p25)" value={money(result.priceBand.low)} /><Metric label="High (p75)" value={money(result.priceBand.high)} /></div>
        <ResultBlock label="Description guidance" value={result.optimizedDescription} copied={copied === 'description'} onCopy={() => void copyText('description', result.optimizedDescription)} multiline />
        <div><Label>Tips</Label><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-muted-foreground">{result.tips.map((tip) => <li key={tip}>{tip}</li>)}</ul></div>
        <p className="text-xs text-muted-foreground">Source: {result.source}. This is decision support, not a guarantee of sale price.</p>
      </div> : null}
        </div></TabsContent>
        <TabsContent value="audit"><TitleAudit /></TabsContent>
      </Tabs>
    </div>
  );
}

function ResultBlock({ label, value, copied, onCopy, multiline = false }: { label: string; value: string; copied: boolean; onCopy: () => void; multiline?: boolean }) {
  return <div className="space-y-2"><div className="flex items-center justify-between"><Label>{label}</Label><Button variant="ghost" size="sm" onClick={onCopy}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}</Button></div>{multiline ? <pre className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 px-3 py-2 font-sans text-sm">{value}</pre> : <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">{value}</p>}</div>;
}
function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-md border border-border px-3 py-2"><p className="text-xs text-muted-foreground">{label}</p><p className="text-lg font-semibold tabular-nums">{value}</p></div>; }
function money(value: number | null | undefined) { return value == null ? '—' : new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value); }
function stats(values: number[]) {
  if (!values.length) return null;
  const percentile = (p: number) => {
    const index = (values.length - 1) * p;
    const lower = Math.floor(index);
    const fraction = index - lower;
    return values[lower + 1] == null ? values[lower] : values[lower] + fraction * (values[lower + 1] - values[lower]);
  };
  return { mean: values.reduce((sum, value) => sum + value, 0) / values.length, median: percentile(0.5), p25: percentile(0.25), p75: percentile(0.75), sample_size: values.length };
}
