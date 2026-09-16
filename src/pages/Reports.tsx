import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, CalendarClock, ChevronLeft, ChevronRight, Columns3, FileSpreadsheet, Package, Printer, Search, Tags, Upload, WalletCards } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

type ReportData = {
  name: string;
  importedAt: string;
  headers: string[];
  rows: Record<string, string>[];
};

type SortDirection = 'asc' | 'desc';
type ReportView = 'active' | 'aging';
type AgingAction = 'Keep' | 'Send offer' | 'Reduce price' | 'Relist' | 'Liquidate';

type AgingRow = Record<string, string> & {
  'Days listed': string;
  'Age band': string;
  'Recommended action': AgingAction;
  'Bin': string;
};

const STORAGE_KEY = 'marketplace-pro:ebay-active-report';
const COLUMN_KEY = 'marketplace-pro:ebay-active-columns';
const PAGE_SIZE = 50;
const REQUIRED_HEADERS = ['Item number', 'Title', 'Custom label (SKU)', 'Available quantity', 'Current price'];
const DEFAULT_COLUMNS = ['Item number', 'Title', 'Custom label (SKU)', 'Available quantity', 'Current price', 'Watchers', 'Start date', 'End date', 'eBay category 1 name', 'Condition'];
const AGING_COLUMNS = ['Title', 'Custom label (SKU)', 'Bin', 'eBay category 1 name', 'Days listed', 'Current price', 'Watchers', 'Recommended action'];
const AGE_BANDS = ['All ages', '0–30 days', '31–60 days', '61–90 days', '91–180 days', '180+ days'];
const ACTIONS = ['All actions', 'Keep', 'Send offer', 'Reduce price', 'Relist', 'Liquidate'];

export default function Reports() {
  const fileInput = useRef<HTMLInputElement>(null);
  const [view, setView] = useState<ReportView>('active');
  const [report, setReport] = useState<ReportData | null>(() => loadJson<ReportData>(STORAGE_KEY));
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => loadJson<string[]>(COLUMN_KEY) ?? DEFAULT_COLUMNS);
  const [reportTitle, setReportTitle] = useState('eBay Active Listings');
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('All categories');
  const [sortKey, setSortKey] = useState('Start date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [page, setPage] = useState(1);
  const [ageBand, setAgeBand] = useState('All ages');
  const [actionFilter, setActionFilter] = useState('All actions');
  const [message, setMessage] = useState('');

  useEffect(() => {
    try { localStorage.setItem(COLUMN_KEY, JSON.stringify(visibleColumns)); } catch { /* Preferences still work for this session. */ }
  }, [visibleColumns]);

  const availableColumns = report?.headers ?? [];
  const selectedColumns = visibleColumns.filter((column) => availableColumns.includes(column));
  const categories = useMemo(() => {
    if (!report) return [];
    return [...new Set(report.rows.map((row) => row['eBay category 1 name']).filter(Boolean))].sort((a, b) => a.localeCompare(b));
  }, [report]);

  const filteredRows = useMemo(() => {
    if (!report) return [];
    const needle = query.trim().toLowerCase();
    const rows = report.rows.filter((row) => {
      if (category !== 'All categories' && row['eBay category 1 name'] !== category) return false;
      if (!needle) return true;
      return [row.Title, row['Custom label (SKU)'], row['Item number'], row.Condition, row['eBay category 1 name']].some((value) => value?.toLowerCase().includes(needle));
    });
    return [...rows].sort((a, b) => compareValues(a[sortKey], b[sortKey], sortDirection));
  }, [category, query, report, sortDirection, sortKey]);

  useEffect(() => { setPage(1); }, [actionFilter, ageBand, category, query, report, view]);

  const summary = useMemo(() => summarize(filteredRows), [filteredRows]);
  const agingRows = useMemo(() => filteredRows.map(toAgingRow).filter((row) => {
    if (ageBand !== 'All ages' && row['Age band'] !== ageBand) return false;
    if (actionFilter !== 'All actions' && row['Recommended action'] !== actionFilter) return false;
    return true;
  }).sort((left, right) => numberValue(right['Days listed']) - numberValue(left['Days listed'])), [actionFilter, ageBand, filteredRows]);
  const agingSummary = useMemo(() => summarizeAging(agingRows), [agingRows]);
  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const visibleRows = filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const agingTotalPages = Math.max(1, Math.ceil(agingRows.length / PAGE_SIZE));
  const visibleAgingRows = agingRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const importReport = async (file: File) => {
    try {
      const parsed = parseReportCsv(await file.text(), file.name);
      const nextColumns = DEFAULT_COLUMNS.filter((column) => parsed.headers.includes(column));
      setReport(parsed);
      setVisibleColumns(nextColumns);
      setSortKey(parsed.headers.includes('Start date') ? 'Start date' : parsed.headers[0]);
      setMessage(`${parsed.rows.length.toLocaleString()} active listings imported.`);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed)); } catch { setMessage(`${parsed.rows.length.toLocaleString()} listings loaded for this session. Browser storage is full.`); }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'The report could not be imported.');
    } finally {
      if (fileInput.current) fileInput.current.value = '';
    }
  };

  const toggleColumn = (column: string) => {
    setVisibleColumns((current) => current.includes(column) ? current.filter((item) => item !== column) : [...current, column]);
  };

  const moveColumn = (column: string, direction: -1 | 1) => {
    setVisibleColumns((current) => {
      const index = current.indexOf(column);
      const target = index + direction;
      if (index < 0 || target < 0 || target >= current.length) return current;
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  if (!report) {
    return <div className="mx-auto max-w-4xl print:hidden">
      <PageHeading />
      <section className="mt-8 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="grid gap-8 p-6 md:grid-cols-[1fr_280px] md:p-10">
          <div><span className="inline-flex rounded-xl bg-emerald-100 p-3 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"><FileSpreadsheet className="h-6 w-6" /></span><h2 className="mt-5 text-2xl font-semibold">Import an eBay Active Listings report</h2><p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Export your All Active Listings report from eBay Seller Hub, then import the CSV here. Marketplace Pro recognizes the eBay columns automatically.</p><Button className="mt-6" onClick={() => fileInput.current?.click()}><Upload className="h-4 w-4" /> Choose eBay CSV</Button>{message ? <p className="mt-3 text-sm text-red-600 dark:text-red-400">{message}</p> : null}</div>
          <div className="rounded-xl bg-muted p-5"><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Included in your report</p><ul className="mt-4 space-y-3 text-sm"><li>Listing and unit totals</li><li>List-value summary</li><li>Search and category filters</li><li>Customizable columns</li><li>Print-ready layout</li></ul></div>
        </div>
      </section>
      <ReportFileInput inputRef={fileInput} onFile={importReport} />
    </div>;
  }

  const currentCount = view === 'active' ? filteredRows.length : agingRows.length;
  const currentPages = view === 'active' ? totalPages : agingTotalPages;

  return <>
    <div className="report-screen mx-auto max-w-[1600px] space-y-5">
      <PageHeading />
      <Tabs value={view} onValueChange={(value) => setView(value as ReportView)}>
        <TabsList className="grid h-auto w-full grid-cols-2 rounded-xl border border-border bg-card p-1 shadow-sm sm:w-[480px]">
          <TabsTrigger value="active" className="gap-2 py-2.5"><FileSpreadsheet className="h-4 w-4" />Active listings</TabsTrigger>
          <TabsTrigger value="aging" className="gap-2 py-2.5"><CalendarClock className="h-4 w-4" />Aging & actions</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0"><p className="truncate text-sm font-semibold">{report.name}</p><p className="mt-1 text-xs text-muted-foreground">Imported {formatDateTime(report.importedAt)} · {report.rows.length.toLocaleString()} source rows</p>{message ? <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-400">{message}</p> : null}</div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => fileInput.current?.click()}><Upload className="h-4 w-4" /> Replace CSV</Button>{view === 'active' ? <ColumnManager headers={availableColumns} visible={selectedColumns} onToggle={toggleColumn} onMove={moveColumn} onReset={() => setVisibleColumns(DEFAULT_COLUMNS.filter((column) => availableColumns.includes(column)))} /> : null}<Button size="sm" onClick={() => window.print()} disabled={view === 'active' && !selectedColumns.length}><Printer className="h-4 w-4" /> Print report</Button></div>
      </div>

      {view === 'active' ? <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={FileSpreadsheet} label="Active listings" value={summary.listings.toLocaleString()} />
        <SummaryCard icon={Package} label="Available units" value={summary.units.toLocaleString()} />
        <SummaryCard icon={WalletCards} label="Total list value" value={money(summary.listValue)} />
        <SummaryCard icon={Tags} label="Average price" value={money(summary.averagePrice)} />
      </section> : <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryCard icon={CalendarClock} label="Median age" value={`${agingSummary.medianAge.toLocaleString()} days`} />
        <SummaryCard icon={AlertTriangle} label="Over 90 days" value={agingSummary.over90.toLocaleString()} />
        <SummaryCard icon={Package} label="Units needing action" value={agingSummary.actionUnits.toLocaleString()} />
        <SummaryCard icon={WalletCards} label="List value at risk" value={money(agingSummary.valueAtRisk)} />
      </section>}

      {view === 'aging' ? <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"><strong>Action guide:</strong> keep listings through 60 days; reduce price at 61–90 days; after 90 days, send offers when watchers exist or relist when they do not; after 180 days with no watchers, liquidate.</p> : null}

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className={cn('grid gap-3 border-b border-border p-4 md:items-end', view === 'active' ? 'md:grid-cols-[minmax(220px,1fr)_260px_auto]' : 'md:grid-cols-[minmax(220px,1fr)_220px_200px_200px]')}>
          <div><label className="text-xs font-medium" htmlFor="report-search">Search listings</label><div className="relative mt-2"><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="report-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Title, SKU, item number, category…" className="pl-9" /></div></div>
          <div><label className="text-xs font-medium" htmlFor="report-category">Category</label><select id="report-category" value={category} onChange={(event) => setCategory(event.target.value)} className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"><option>All categories</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
          {view === 'aging' ? <><div><label className="text-xs font-medium" htmlFor="report-age">Listing age</label><select id="report-age" value={ageBand} onChange={(event) => setAgeBand(event.target.value)} className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{AGE_BANDS.map((item) => <option key={item}>{item}</option>)}</select></div><div><label className="text-xs font-medium" htmlFor="report-action">Recommended action</label><select id="report-action" value={actionFilter} onChange={(event) => setActionFilter(event.target.value)} className="mt-2 flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm">{ACTIONS.map((item) => <option key={item}>{item}</option>)}</select></div></> : <p className="pb-2 text-xs text-muted-foreground">{filteredRows.length.toLocaleString()} matching listings</p>}
        </div>

        {view === 'active' ? (!selectedColumns.length ? <div className="p-10 text-center"><p className="font-semibold">Choose at least one column</p><p className="mt-1 text-sm text-muted-foreground">Open Columns to select what should appear in the report.</p></div> : <ScreenTable columns={selectedColumns} rows={visibleRows} sortKey={sortKey} sortDirection={sortDirection} onSort={(column) => { if (sortKey === column) setSortDirection((current) => current === 'asc' ? 'desc' : 'asc'); else { setSortKey(column); setSortDirection('asc'); } }} />) : <AgingTable rows={visibleAgingRows} />}

        <Pagination page={page} totalPages={currentPages} totalRows={currentCount} onPage={setPage} />
      </section>
      <ReportFileInput inputRef={fileInput} onFile={importReport} />
    </div>

    {view === 'active' ? <PrintReport title={reportTitle} onTitleChange={setReportTitle} fileName={report.name} columns={selectedColumns} rows={filteredRows} summary={summary} /> : <AgingPrintReport fileName={report.name} rows={agingRows} summary={agingSummary} />}
  </>;
}

function PageHeading() {
  return <header><p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-400">Reports</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Inventory reports</h1><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Review active listings, find aging inventory, choose the columns you need, and print clean action reports.</p></header>;
}

function ReportFileInput({ inputRef, onFile }: { inputRef: React.RefObject<HTMLInputElement>; onFile: (file: File) => void }) {
  return <input ref={inputRef} type="file" accept=".csv,text/csv" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) void onFile(file); }} />;
}

function SummaryCard({ icon: Icon, label, value }: { icon: typeof FileSpreadsheet; label: string; value: string }) {
  return <article className="rounded-xl border border-border bg-card p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><p className="text-xs text-muted-foreground">{label}</p><span className="rounded-lg bg-muted p-2"><Icon className="h-4 w-4" /></span></div><p className="mt-2 text-xl font-semibold tabular-nums sm:text-2xl">{value}</p></article>;
}

function ColumnManager({ headers, visible, onToggle, onMove, onReset }: { headers: string[]; visible: string[]; onToggle: (column: string) => void; onMove: (column: string, direction: -1 | 1) => void; onReset: () => void }) {
  return <Sheet><SheetTrigger asChild><Button variant="outline" size="sm"><Columns3 className="h-4 w-4" /> Columns <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px]">{visible.length}/{headers.length}</span></Button></SheetTrigger><SheetContent side="right" className="flex w-[92vw] max-w-md flex-col p-0"><SheetHeader className="border-b border-border p-5 text-left"><SheetTitle>Report columns</SheetTitle><SheetDescription>Show, hide, and arrange the columns in the screen and printed report.</SheetDescription></SheetHeader><div className="flex items-center justify-between border-b border-border px-5 py-3"><button className="text-xs font-medium text-primary" onClick={() => headers.forEach((header) => { if (!visible.includes(header)) onToggle(header); })}>Show all</button><Button variant="ghost" size="sm" onClick={onReset}>Reset defaults</Button></div><div className="flex-1 overflow-y-auto p-3"><div className="space-y-1">{headers.map((header) => { const selected = visible.includes(header); const index = visible.indexOf(header); return <div key={header} className={cn('flex items-center gap-2 rounded-lg border px-3 py-2', selected ? 'border-border bg-card' : 'border-transparent bg-muted/40')}><label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3"><input type="checkbox" checked={selected} onChange={() => onToggle(header)} className="h-4 w-4 rounded border-input accent-primary" /><span className="truncate text-sm">{header}</span></label>{selected ? <div className="flex"><button type="button" disabled={index <= 0} onClick={() => onMove(header, -1)} className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-25" aria-label={`Move ${header} left`}><ArrowUp className="h-4 w-4" /></button><button type="button" disabled={index >= visible.length - 1} onClick={() => onMove(header, 1)} className="rounded p-1 text-muted-foreground hover:bg-muted disabled:opacity-25" aria-label={`Move ${header} right`}><ArrowDown className="h-4 w-4" /></button></div> : null}</div>; })}</div></div></SheetContent></Sheet>;
}

function ScreenTable({ columns, rows, sortKey, sortDirection, onSort }: { columns: string[]; rows: Record<string, string>[]; sortKey: string; sortDirection: SortDirection; onSort: (column: string) => void }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-max text-left text-xs"><thead className="sticky top-0 z-10 bg-muted/80 text-muted-foreground backdrop-blur"><tr>{columns.map((column) => <th key={column} className={cn('whitespace-nowrap px-4 py-3 font-medium', numericColumn(column) && 'text-right')}><button type="button" className="inline-flex items-center gap-1 hover:text-foreground" onClick={() => onSort(column)}>{shortColumn(column)}{sortKey === column ? sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : null}</button></th>)}</tr></thead><tbody className="divide-y divide-border">{rows.map((row, index) => <tr key={`${row['Item number'] || index}-${index}`} className="hover:bg-muted/30">{columns.map((column) => <td key={column} className={cn('max-w-[320px] whitespace-nowrap px-4 py-3', column === 'Title' && 'min-w-[280px] whitespace-normal font-medium', numericColumn(column) && 'text-right tabular-nums')}>{formatCell(column, row[column])}</td>)}</tr>)}</tbody></table></div>;
}

function AgingTable({ rows }: { rows: AgingRow[] }) {
  return <div className="overflow-x-auto"><table className="w-full min-w-max text-left text-xs"><thead className="sticky top-0 z-10 bg-muted/80 text-muted-foreground backdrop-blur"><tr>{AGING_COLUMNS.map((column) => <th key={column} className={cn('whitespace-nowrap px-4 py-3 font-medium', numericColumn(column) && 'text-right')}>{shortColumn(column)}</th>)}</tr></thead><tbody className="divide-y divide-border">{rows.map((row, index) => <tr key={`${row['Item number'] || index}-${index}`} className="hover:bg-muted/30">{AGING_COLUMNS.map((column) => <td key={column} className={cn('max-w-[320px] whitespace-nowrap px-4 py-3', column === 'Title' && 'min-w-[280px] whitespace-normal font-medium', numericColumn(column) && 'text-right tabular-nums')}>{column === 'Recommended action' ? <ActionBadge action={row[column] as AgingAction} /> : formatCell(column, row[column])}</td>)}</tr>)}</tbody></table></div>;
}

function ActionBadge({ action }: { action: AgingAction }) {
  const styles: Record<AgingAction, string> = {
    Keep: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300',
    'Send offer': 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
    'Reduce price': 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
    Relist: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-300',
    Liquidate: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  };
  return <span className={cn('inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold', styles[action])}>{action}</span>;
}

function Pagination({ page, totalPages, totalRows, onPage }: { page: number; totalPages: number; totalRows: number; onPage: (page: number) => void }) {
  return <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-3"><p className="text-xs text-muted-foreground">Rows {totalRows ? ((page - 1) * PAGE_SIZE + 1).toLocaleString() : 0}–{Math.min(page * PAGE_SIZE, totalRows).toLocaleString()} of {totalRows.toLocaleString()}</p><div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(Math.max(1, page - 1))}><ChevronLeft className="h-4 w-4" /><span className="sr-only sm:not-sr-only">Previous</span></Button><span className="text-xs tabular-nums">{page} / {totalPages}</span><Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPage(Math.min(totalPages, page + 1))}><span className="sr-only sm:not-sr-only">Next</span><ChevronRight className="h-4 w-4" /></Button></div></div>;
}

function PrintReport({ title, onTitleChange, fileName, columns, rows, summary }: { title: string; onTitleChange: (value: string) => void; fileName: string; columns: string[]; rows: Record<string, string>[]; summary: ReturnType<typeof summarize> }) {
  return <section className="report-print">
    <div className="report-print-title"><input aria-label="Printed report title" value={title} onChange={(event) => onTitleChange(event.target.value)} /><p>Generated {new Date().toLocaleDateString()} from {fileName}</p></div>
    <div className="report-print-summary"><div><span>Listings</span><strong>{summary.listings.toLocaleString()}</strong></div><div><span>Available units</span><strong>{summary.units.toLocaleString()}</strong></div><div><span>Total list value</span><strong>{money(summary.listValue)}</strong></div><div><span>Average price</span><strong>{money(summary.averagePrice)}</strong></div></div>
    <table><thead><tr>{columns.map((column) => <th key={column}>{shortColumn(column)}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row['Item number'] || index}-${index}`}>{columns.map((column) => <td key={column} className={numericColumn(column) ? 'number' : ''}>{formatCell(column, row[column])}</td>)}</tr>)}</tbody></table>
    <p className="report-print-footer">Marketplace Pro · {rows.length.toLocaleString()} filtered listings</p>
  </section>;
}

function AgingPrintReport({ fileName, rows, summary }: { fileName: string; rows: AgingRow[]; summary: ReturnType<typeof summarizeAging> }) {
  return <section className="report-print">
    <div className="report-print-title"><h1>Inventory Aging & Action Report</h1><p>Generated {new Date().toLocaleDateString()} from {fileName}</p></div>
    <div className="report-print-summary"><div><span>Median age</span><strong>{summary.medianAge.toLocaleString()} days</strong></div><div><span>Over 90 days</span><strong>{summary.over90.toLocaleString()}</strong></div><div><span>Units needing action</span><strong>{summary.actionUnits.toLocaleString()}</strong></div><div><span>List value at risk</span><strong>{money(summary.valueAtRisk)}</strong></div></div>
    <table><thead><tr>{AGING_COLUMNS.map((column) => <th key={column}>{shortColumn(column)}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row['Item number'] || index}-${index}`}>{AGING_COLUMNS.map((column) => <td key={column} className={numericColumn(column) ? 'number' : ''}>{formatCell(column, row[column])}</td>)}</tr>)}</tbody></table>
    <p className="report-print-footer">Marketplace Pro · {rows.length.toLocaleString()} filtered listings</p>
  </section>;
}

function parseReportCsv(text: string, name: string): ReportData {
  const records = parseCsv(text.replace(/^\uFEFF/, ''));
  if (records.length < 2) throw new Error('The CSV contains headers but no listing rows.');
  const headers = records[0].map((header) => header.trim());
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`This does not look like an eBay Active Listings report. Missing: ${missing.join(', ')}`);
  const rows = records.slice(1).filter((record) => record.some((value) => value.trim())).map((record) => Object.fromEntries(headers.map((header, index) => [header, record[index]?.trim() ?? ''])));
  return { name, importedAt: new Date().toISOString(), headers, rows };
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') { field += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(field); field = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) { if (char === '\r' && next === '\n') index += 1; row.push(field); if (row.some((value) => value.length)) rows.push(row); row = []; field = ''; }
    else field += char;
  }
  row.push(field);
  if (row.some((value) => value.length)) rows.push(row);
  return rows;
}

function summarize(rows: Record<string, string>[]) {
  const units = rows.reduce((sum, row) => sum + numberValue(row['Available quantity']), 0);
  const listValue = rows.reduce((sum, row) => sum + numberValue(row['Available quantity']) * numberValue(row['Current price']), 0);
  const pricedRows = rows.filter((row) => numericLike(row['Current price']));
  return { listings: rows.length, units, listValue, averagePrice: pricedRows.length ? pricedRows.reduce((sum, row) => sum + numberValue(row['Current price']), 0) / pricedRows.length : 0 };
}

function toAgingRow(row: Record<string, string>): AgingRow {
  const startedAt = Date.parse(row['Start date'] || '');
  const days = Number.isFinite(startedAt) ? Math.max(0, Math.floor((Date.now() - startedAt) / 86_400_000)) : 0;
  const watchers = numberValue(row.Watchers);
  let action: AgingAction = 'Keep';
  if (days > 180) action = watchers > 0 ? 'Send offer' : 'Liquidate';
  else if (days > 90) action = watchers > 0 ? 'Send offer' : 'Relist';
  else if (days > 60) action = 'Reduce price';
  return {
    ...row,
    'Days listed': String(days),
    'Age band': ageBandFor(days),
    'Recommended action': action,
    'Bin': extractBin(row['Custom label (SKU)']),
  };
}

function summarizeAging(rows: AgingRow[]) {
  const ages = rows.map((row) => numberValue(row['Days listed'])).sort((left, right) => left - right);
  const middle = Math.floor(ages.length / 2);
  const medianAge = ages.length ? ages.length % 2 ? ages[middle] : Math.round((ages[middle - 1] + ages[middle]) / 2) : 0;
  const actionRows = rows.filter((row) => row['Recommended action'] !== 'Keep');
  return {
    medianAge,
    over90: rows.filter((row) => numberValue(row['Days listed']) > 90).length,
    actionUnits: actionRows.reduce((sum, row) => sum + numberValue(row['Available quantity']), 0),
    valueAtRisk: actionRows.reduce((sum, row) => sum + numberValue(row['Available quantity']) * numberValue(row['Current price']), 0),
  };
}

function ageBandFor(days: number) {
  if (days <= 30) return '0–30 days';
  if (days <= 60) return '31–60 days';
  if (days <= 90) return '61–90 days';
  if (days <= 180) return '91–180 days';
  return '180+ days';
}

function extractBin(sku = '') {
  const match = sku.trim().match(/^([A-Za-z]+\d+)-/);
  return match ? match[1].toUpperCase() : 'Unassigned';
}

function compareValues(left = '', right = '', direction: SortDirection) {
  const multiplier = direction === 'asc' ? 1 : -1;
  const leftNumber = numberValue(left);
  const rightNumber = numberValue(right);
  if (numericLike(left) && numericLike(right)) return (leftNumber - rightNumber) * multiplier;
  const leftDate = Date.parse(left);
  const rightDate = Date.parse(right);
  if (Number.isFinite(leftDate) && Number.isFinite(rightDate)) return (leftDate - rightDate) * multiplier;
  return left.localeCompare(right, undefined, { numeric: true, sensitivity: 'base' }) * multiplier;
}

function formatCell(column: string, value = '') {
  if (!value) return '—';
  if (['Start price', 'Auction Buy It Now price', 'Reserve price', 'Current price'].includes(column)) return money(numberValue(value));
  if (['Available quantity', 'Sold quantity', 'Watchers', 'Bids', 'Days listed'].includes(column)) return numberValue(value).toLocaleString();
  return value;
}

function shortColumn(column: string) {
  const labels: Record<string, string> = { 'Custom label (SKU)': 'SKU', 'Available quantity': 'Available', 'eBay category 1 name': 'Category', 'eBay category 1 number': 'Category ID', 'Item number': 'Item ID', 'Current price': 'Price' };
  return labels[column] ?? column;
}

function numericColumn(column: string) {
  return ['Available quantity', 'Sold quantity', 'Watchers', 'Bids', 'Days listed', 'Start price', 'Auction Buy It Now price', 'Reserve price', 'Current price'].includes(column);
}

function numberValue(value = '') {
  const parsed = Number(value.replace(/[$,%]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

function numericLike(value = '') { return value.trim() !== '' && Number.isFinite(Number(value.replace(/[$,%]/g, ''))); }
function money(value: number) { return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value); }
function formatDateTime(value: string) { return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }); }
function loadJson<T>(key: string): T | null { try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : null; } catch { return null; } }
