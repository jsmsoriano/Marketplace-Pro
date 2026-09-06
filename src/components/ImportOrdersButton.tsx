import { useRef, useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from '@/hooks/use-toast';
import { useSalesData } from '@/hooks/use-sales-data';

export function ImportOrdersButton({ compact = false }: { compact?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const { importCsv } = useSalesData();

  const importFile = async (file: File) => {
    setLoading(true);
    try {
      const count = await importCsv(file);
      toast({ title: 'Orders imported', description: `${count} Nifty orders are ready to analyze.` });
    } catch (error) {
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : 'Choose a valid Nifty order export.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,text/csv"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void importFile(file);
        }}
      />
      <Button variant={compact ? 'ghost' : 'default'} size={compact ? 'sm' : 'default'} onClick={() => inputRef.current?.click()} disabled={loading}>
        {loading ? <Loader2 className="animate-spin" /> : <FileUp />}
        {compact ? 'Import' : 'Import Nifty CSV'}
      </Button>
    </>
  );
}
