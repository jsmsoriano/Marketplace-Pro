import SizeConversion from '@/components/SizeConversion';

export default function SizeConversionPage() {
  return (
    <div className="mx-auto max-w-[1500px] space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Size conversion</h1>
        <p className="mt-2 max-w-3xl text-muted-foreground">
          Convert a brand’s official size chart to an eBay Size value, or standardize a tag when that brand’s chart is not loaded yet.
        </p>
      </div>
      <SizeConversion />
    </div>
  );
}
