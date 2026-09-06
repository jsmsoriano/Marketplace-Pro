import { Database, Info, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSalesData } from '@/hooks/use-sales-data';

export function DataQualityBanner({ visibleOrders }: { visibleOrders: number }) {
  const { mode, fileName, importedAt, useDemoData } = useSalesData();
  const sparse = visibleOrders < 10;

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-lg bg-muted p-2 text-muted-foreground">
          {mode === 'demo' ? <Info className="h-4 w-4" /> : <Database className="h-4 w-4" />}
        </div>
        <div>
          <p className="text-sm font-medium">
            {mode === 'demo' ? 'Exploring with demonstration data' : `${fileName} · ${visibleOrders} orders in view`}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {mode === 'demo'
              ? 'Import a Nifty order export to replace this example dataset.'
              : sparse
                ? 'Low sample: recommendations are directional until at least 10 relevant sales are available.'
                : `Stored locally in this browser · imported ${new Date(importedAt ?? '').toLocaleString()}`}
          </p>
        </div>
      </div>
      {mode === 'imported' ? (
        <Button variant="ghost" size="sm" onClick={useDemoData} className="self-start sm:self-auto">
          <RotateCcw /> Demo data
        </Button>
      ) : null}
    </div>
  );
}
