import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, CheckCircle2, ChevronLeft, ChevronRight, Copy, FileSpreadsheet, Search, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { loadTitleAuditRows, type TitleAuditRow, type TitleAuditSeverity } from '@/lib/title-audit';

const PAGE_SIZE = 25;
type ScoreFilter = 'all' | TitleAuditSeverity;

export default function TitleAudit() {
  const navigate = useNavigate();
  const [rows] = useState(loadTitleAuditRows);
  const [query, setQuery] = useState('');
  const [scoreFilter, setScoreFilter] = useState<ScoreFilter>('all');
  const [category, setCategory] = useState('All categories');
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState<string | null>(null);

  const categories = useMemo(() => [...new Set(rows.map((row) => row.category).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [rows]);
  const counts = useMemo(() => ({
    total: rows.length,
    critical: rows.filter((row) => row.severity === 'critical').length,
    needsWork: rows.filter((row) => row.severity === 'needs-work').length,
    strong: rows.filter((row) => row.severity === 'strong').length,
  }), [rows]);
  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => (scoreFilter === 'all' || row.severity === scoreFilter) && (category === 'All categories' || row.category === category) && (!needle || [row.title, row.sku, row.itemNumber, row.category].some((value) => value.toLowerCase().includes(needle)))).sort((left, right) => left.score - right.score || left.title.localeCompare(right.title));
  }, [category, query, rows, scoreFilter]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const visibleRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => setPage(1), [category, query, scoreFilter]);

  const copySuggestion = async (row: TitleAuditRow) => {
    await navigator.clipboard.writeText(row.suggestion);
    setCopied(row.id);
    window.setTimeout(() => setCopied(null), 1500);
  };

  if (!rows.length) return <section className="rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-14 text-center"><FileSpreadsheet className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-4 text-lg font-semibold">Import an eBay Active Listings report first</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Title Audit uses the listing titles, SKUs, and categories from the report in Marketplace Pro.</p><Button className="mt-5" onClick={() => navigate('/reports')}>Open Reports</Button></section>;

  return <div className="space-y-4">
    <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <AuditMetric label="Titles audited" value={counts.total} icon={Sparkles} />
      <AuditMetric label="Critical" value={counts.critical} icon={AlertTriangle} tone="red" />
      <AuditMetric label="Needs work" value={counts.needsWork} icon={AlertTriangle} tone="amber" />
      <AuditMetric label="Strong" value={counts.strong} icon={CheckCircle2} tone="green" />
    </section>

    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[minmax(220px,1fr)_190px_240px]">
        <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search title, SKU, item number…" className="pl-9" /></div>
        <select aria-label="Title score" value={scoreFilter} onChange={(event) => setScoreFilter(event.target.value as ScoreFilter)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option value="all">All scores</option><option value="critical">Critical (0–49)</option><option value="needs-work">Needs work (50–79)</option><option value="strong">Strong (80–100)</option></select>
        <select aria-label="Category" value={category} onChange={(event) => setCategory(event.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm"><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select>
      </div>

      <div className="hidden grid-cols-[76px_minmax(280px,1.5fr)_110px_minmax(220px,1fr)_80px] gap-4 border-b border-border bg-muted/40 px-4 py-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground lg:grid"><span>Score</span><span>Current title</span><span>SKU</span><span>Audit result</span><span /></div>
      <div className="divide-y divide-border">{visibleRows.map((row) => <TitleAuditItem key={row.id} row={row} copied={copied === row.id} onCopy={() => void copySuggestion(row)} />)}</div>
      {!visibleRows.length ? <div className="px-5 py-12 text-center"><CheckCircle2 className="mx-auto h-7 w-7 text-muted-foreground" /><h3 className="mt-3 font-semibold">No titles match</h3><p className="mt-1 text-sm text-muted-foreground">Clear the search or choose another score range.</p></div> : null}
      <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3"><p className="text-xs text-muted-foreground">Showing {filtered.length ? (page - 1) * PAGE_SIZE + 1 : 0}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length.toLocaleString()}</p><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft className="h-4 w-4" /><span className="sr-only">Previous</span></Button><span className="text-xs tabular-nums">{page} / {totalPages}</span><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))}><ChevronRight className="h-4 w-4" /><span className="sr-only">Next</span></Button></div></div>
    </section>

    <p className="text-xs leading-5 text-muted-foreground">Scores are decision support based on title structure, category alignment, and eBay’s 80-character limit. Suggested titles only use words already present in your listing, so missing item details still require your review.</p>
  </div>;
}

function TitleAuditItem({ row, copied, onCopy }: { row: TitleAuditRow; copied: boolean; onCopy: () => void }) {
  return <article className="grid gap-3 px-4 py-4 lg:grid-cols-[76px_minmax(280px,1.5fr)_110px_minmax(220px,1fr)_80px] lg:items-start lg:gap-4"><div><MobileLabel>Score</MobileLabel><ScoreBadge score={row.score} severity={row.severity} /></div><div className="min-w-0"><MobileLabel>Current title</MobileLabel><p className="text-sm font-medium leading-5">{row.title}</p><p className="mt-1 text-[11px] tabular-nums text-muted-foreground">{row.title.length}/80 characters · {row.category || 'No category'}</p></div><div><MobileLabel>SKU</MobileLabel><p className="font-mono text-xs font-semibold">{row.sku || 'No SKU'}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{row.itemNumber || '—'}</p></div><div className="min-w-0"><MobileLabel>Audit result</MobileLabel><ul className="space-y-1 text-xs text-muted-foreground">{row.issues.slice(0, 2).map((issue) => <li key={issue}>• {issue}</li>)}</ul><details className="mt-2"><summary className="cursor-pointer text-xs font-medium text-primary">{row.suggestionChanged ? 'View rewritten title' : row.manualGuidance.length ? 'View information needed' : 'Why no rewrite?'}</summary><div className="mt-2 rounded-lg border border-border bg-muted/30 p-3">{row.suggestionChanged ? <><p className="text-sm leading-5">{row.suggestion}</p><p className="mt-1 text-[10px] text-muted-foreground">{row.suggestion.length}/80 characters</p></> : row.manualGuidance.length ? <><p className="text-xs font-semibold">The CSV does not contain enough verified information for a safe rewrite.</p><ul className="mt-2 space-y-1 text-xs text-muted-foreground">{row.manualGuidance.map((guidance) => <li key={guidance}>• {guidance}</li>)}</ul></> : <p className="text-xs text-muted-foreground">The current title already passes the available automated checks, so no change is recommended.</p>}</div></details></div><div className="flex justify-end">{row.suggestionChanged ? <Button variant="outline" size="sm" onClick={onCopy} aria-label={`Copy rewritten title for ${row.sku || row.title}`}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}<span className="lg:sr-only">{copied ? 'Copied' : 'Copy'}</span></Button> : <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-medium text-muted-foreground">No safe edit</span>}</div></article>;
}

function ScoreBadge({ score, severity }: { score: number; severity: TitleAuditSeverity }) {
  const style = severity === 'critical' ? 'bg-red-600 text-white' : severity === 'needs-work' ? 'bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100' : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-900 dark:text-emerald-100';
  return <span className={cn('inline-flex h-11 w-11 items-center justify-center rounded-full text-sm font-bold tabular-nums', style)}>{score}</span>;
}

function AuditMetric({ label, value, icon: Icon, tone = 'slate' }: { label: string; value: number; icon: typeof Sparkles; tone?: 'slate' | 'red' | 'amber' | 'green' }) {
  const styles = { slate: 'bg-muted text-foreground', red: 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300', amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300', green: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300' };
  return <div className="rounded-xl border border-border bg-card p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{label}</p><span className={cn('rounded-lg p-2', styles[tone])}><Icon className="h-4 w-4" /></span></div><p className="mt-2 text-2xl font-semibold tabular-nums">{value.toLocaleString()}</p></div>;
}

function MobileLabel({ children }: { children: string }) { return <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-muted-foreground lg:hidden">{children}</span>; }
