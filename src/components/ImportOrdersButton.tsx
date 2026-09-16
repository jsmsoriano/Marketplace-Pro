import { useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, FileSpreadsheet, FileUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from '@/hooks/use-toast';
import { useInventory } from '@/hooks/use-inventory';
import { useSalesData } from '@/hooks/use-sales-data';
import { activeInventoryFromRecords, IMPORT_TEMPLATES, inspectImportCsv, type ImportInspection, type ImportTemplateId } from '@/lib/import-templates';

export function ImportOrdersButton({ compact = false, defaultTemplate = 'nifty-orders' }: { compact?: boolean; defaultTemplate?: ImportTemplateId }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [templateId, setTemplateId] = useState<ImportTemplateId>(defaultTemplate);
  const [file, setFile] = useState<File | null>(null);
  const [rawCsv, setRawCsv] = useState('');
  const [inspection, setInspection] = useState<ImportInspection | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { importCsv, importActiveInventory } = useSalesData();
  const { importLocations } = useInventory();
  const template = IMPORT_TEMPLATES.find((item) => item.id === templateId) ?? IMPORT_TEMPLATES[0];

  const inspect = (text: string, nextTemplate: ImportTemplateId) => {
    try {
      setInspection(inspectImportCsv(text, nextTemplate));
      setError('');
    } catch (cause) {
      setInspection(null);
      setError(cause instanceof Error ? cause.message : 'Could not read this CSV.');
    }
  };

  const selectTemplate = (nextTemplate: ImportTemplateId) => {
    setTemplateId(nextTemplate);
    if (rawCsv) inspect(rawCsv, nextTemplate);
  };

  const selectFile = async (nextFile: File | undefined) => {
    if (!nextFile) return;
    setFile(nextFile);
    const text = await nextFile.text();
    setRawCsv(text);
    inspect(text, templateId);
  };

  const reset = () => {
    setFile(null);
    setRawCsv('');
    setInspection(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const importFile = async () => {
    if (!file || !inspection || inspection.missingRequired.length) return;
    setLoading(true);
    try {
      if (templateId === 'nifty-orders') {
        const count = await importCsv(new File([inspection.normalizedCsv], file.name, { type: 'text/csv' }));
        toast({ title: 'Orders imported', description: `${count} sales are ready to analyze using the Nifty Orders template.` });
      } else if (templateId === 'active-inventory') {
        const pieces = importActiveInventory(activeInventoryFromRecords(inspection.records));
        toast({ title: 'Active inventory imported', description: `${inspection.rowCount} listings and ${pieces} available pieces were saved for sell-through analysis.` });
      } else {
        const result = await importLocations(new File([inspection.normalizedCsv], file.name, { type: 'text/csv' }));
        toast({ title: 'Inventory locations imported', description: `${result.added} SKU locations added${result.conflicts ? ` · ${result.conflicts} capacity conflicts skipped` : ''}.` });
      }
      setOpen(false);
      reset();
    } catch (cause) {
      toast({ title: 'Import failed', description: cause instanceof Error ? cause.message : 'Choose a valid CSV for this template.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button variant={compact ? 'ghost' : 'default'} size={compact ? 'sm' : 'default'} onClick={() => setOpen(true)}>
        <FileUp />{compact ? 'Import' : 'Import data'}
      </Button>
      <Sheet open={open} onOpenChange={(nextOpen) => { setOpen(nextOpen); if (!nextOpen) reset(); }}>
        <SheetContent className="flex h-full w-full flex-col overflow-hidden sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Import data</SheetTitle>
            <SheetDescription>Select the file template first so Marketplace Pro can map and validate each column.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto py-2 pr-1">
            <div className="space-y-2">
              <label htmlFor="import-template" className="text-sm font-medium">1. Choose a template</label>
              <select id="import-template" value={templateId} onChange={(event) => selectTemplate(event.target.value as ImportTemplateId)} className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm font-medium">
                {IMPORT_TEMPLATES.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <p className="text-xs leading-5 text-muted-foreground">{template.description}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">2. Choose the CSV file</p>
              <input ref={inputRef} type="file" accept=".csv,text/csv" className="sr-only" onChange={(event) => void selectFile(event.target.files?.[0])} />
              <button type="button" onClick={() => inputRef.current?.click()} className="flex w-full items-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 p-4 text-left transition hover:bg-muted/40">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-background shadow-sm"><FileSpreadsheet className="h-5 w-5" /></span>
                <span className="min-w-0"><span className="block truncate text-sm font-semibold">{file?.name ?? 'Select CSV file'}</span><span className="mt-0.5 block text-xs text-muted-foreground">{file ? `${inspection?.rowCount ?? 0} data rows detected` : 'The file is analyzed before anything is imported.'}</span></span>
              </button>
            </div>
            {error ? <div className="flex gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div> : null}
            {inspection ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between"><p className="text-sm font-medium">3. Review column mapping</p><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${inspection.missingRequired.length ? 'bg-red-100 text-red-900 dark:bg-red-950 dark:text-red-100' : 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-100'}`}>{inspection.missingRequired.length ? `${inspection.missingRequired.length} required missing` : 'Ready to import'}</span></div>
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="grid grid-cols-[1fr_1fr] bg-muted/50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"><span>Template field</span><span>File column</span></div>
                  <div className="max-h-72 divide-y divide-border overflow-y-auto">
                    {inspection.mappings.map((mapping) => <div key={mapping.key} className="grid grid-cols-[1fr_1fr] gap-2 px-3 py-2.5 text-xs"><span className="font-medium">{mapping.label}{mapping.required ? <span className="ml-1 text-red-600">*</span> : null}</span><span className={mapping.sourceHeader ? 'text-foreground' : 'text-muted-foreground'}>{mapping.sourceHeader ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />{mapping.sourceHeader}</span> : 'Not provided'}</span>{mapping.sample ? <span className="col-start-2 truncate text-[10px] text-muted-foreground" title={mapping.sample}>Example: {mapping.sample}</span> : null}</div>)}
                  </div>
                </div>
                {inspection.missingRequired.length ? <p className="text-xs text-red-700 dark:text-red-300">Missing required columns: {inspection.missingRequired.join(', ')}.</p> : null}
                {inspection.rowWarnings.length ? <div className="flex gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span><strong>Data-quality warning:</strong> {inspection.rowWarnings.join(' · ')}. These rows will remain in the import so inventory totals stay accurate.</span></div> : null}
              </div>
            ) : null}
          </div>
          <SheetFooter className="border-t border-border pt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => void importFile()} disabled={loading || !inspection || Boolean(inspection.missingRequired.length)}>{loading ? <Loader2 className="animate-spin" /> : <FileUp />}Import {inspection?.rowCount ?? 0} rows</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
