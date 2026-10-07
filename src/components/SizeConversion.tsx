import { useMemo, useState, type ReactNode } from 'react';
import { Check, Copy, Ruler } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { brandsWithCharts, chartById, chartsForBrand } from '@/lib/brand-size-charts';
import { EBAY_ALPHA_SIZES, EBAY_SIZE_SOURCES, type EbayMarketplace } from '@/lib/ebay-size-policy';
import { Input } from '@/components/ui/input';
import { convertBrandSize, convertUnlistedBrand, defaultChartId, defaultSizeLabel, OTHER_BRAND, previewChart, rowLabels, type TieChoice, type UnlistedFamily } from '@/lib/size-conversion';
import { cn } from '@/lib/utils';

type SizeConversionProps = {
  onUseDescription?: (snippet: string) => void;
};

export default function SizeConversion({ onUseDescription }: SizeConversionProps) {
  const brands = useMemo(() => brandsWithCharts(), []);
  const [brand, setBrand] = useState(brands[0] ?? '');
  const [chartId, setChartId] = useState(() => defaultChartId(brands[0] ?? ''));
  const [marketplace, setMarketplace] = useState<EbayMarketplace>('EBAY_US');
  const [brandSize, setBrandSize] = useState(() => {
    const chart = chartById(defaultChartId(brands[0] ?? ''));
    return chart ? defaultSizeLabel(chart) : '';
  });
  const [otherName, setOtherName] = useState('');
  const [otherFamily, setOtherFamily] = useState<UnlistedFamily>('tops');
  const [otherSize, setOtherSize] = useState('');
  const [inseam, setInseam] = useState('');
  const [tieChoice, setTieChoice] = useState<TieChoice>('smaller');
  const [copied, setCopied] = useState<string | null>(null);

  const unlisted = brand === OTHER_BRAND;
  const charts = chartsForBrand(brand);
  const chart = unlisted ? undefined : chartById(chartId) ?? charts[0];
  const labels = chart ? rowLabels(chart) : [];
  const inseamValue = inseam === '' ? null : Number(inseam);
  const result = unlisted
    ? (otherName.trim() && otherSize.trim()
      ? convertUnlistedBrand({ brandName: otherName, family: otherFamily, brandSize: otherSize, marketplace, inseam: inseamValue, tieChoice })
      : { ok: false as const, error: '' })
    : chart
      ? convertBrandSize({ chartId: chart.id, brandSize, marketplace, inseam: inseamValue, tieChoice })
      : { ok: false as const, error: 'Choose a brand chart.' };
  const conversion = result.ok === true ? result.conversion : null;
  const conversionError = result.ok === false ? result.error : null;
  const preview = chart ? previewChart(chart, marketplace) : [];

  const selectChart = (nextBrand: string, nextChartId = defaultChartId(nextBrand)) => {
    if (nextBrand === OTHER_BRAND) {
      setBrand(OTHER_BRAND);
      setTieChoice('smaller');
      setInseam('');
      return;
    }
    const next = chartById(nextChartId);
    setBrand(nextBrand);
    setChartId(nextChartId);
    setBrandSize(next ? defaultSizeLabel(next) : '');
    setTieChoice('smaller');
    setInseam('');
  };

  const copyText = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopied(key);
    window.setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div className="max-w-5xl space-y-6">
      <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <Ruler className="mt-0.5 h-5 w-5 text-emerald-700 dark:text-emerald-400" />
          <div>
            <h2 className="font-semibold">Brand chart to eBay Size</h2>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              Since August 2026, eBay only accepts a supported Size on apparel and footwear. The values they named are alpha sizes ({EBAY_ALPHA_SIZES.join(', ')}), numeric sizes where that category still offers them, and region formats (US, UK, EU). Placeholders such as “See description” and combined values such as S/M/L or 32x30 are rejected. If the brand is not listed, choose Another brand. The tag is still standardized, and measurements are left blank until that brand’s chart is loaded.
            </p>
          </div>
        </div>
      </section>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Field label="Brand">
          <Select value={brand} onChange={(value) => selectChart(value)}>
            {brands.map((item) => <option key={item} value={item}>{item}</option>)}
            <option value={OTHER_BRAND}>Another brand</option>
          </Select>
        </Field>
        {unlisted ? (
          <Field label="Brand name">
            <Input value={otherName} onChange={(event) => setOtherName(event.target.value)} placeholder="Name on the label" />
          </Field>
        ) : (
          <Field label="Official chart">
            <Select value={chart?.id ?? ''} onChange={(value) => selectChart(brand, value)}>
              {charts.map((item) => <option key={item.id} value={item.id}>{item.department} · {item.garment}</option>)}
            </Select>
          </Field>
        )}
        {unlisted ? (
          <Field label="Garment">
            <Select value={otherFamily} onChange={(value) => { setOtherFamily(value as UnlistedFamily); setTieChoice('smaller'); setInseam(''); }}>
              <option value="tops">Tops and outerwear</option>
              <option value="pants">Pants and jeans</option>
              <option value="shoes">Shoes</option>
            </Select>
          </Field>
        ) : (
          <Field label="Brand size">
            <Select value={labels.includes(brandSize) ? brandSize : ''} onChange={(value) => { setBrandSize(value); setTieChoice('smaller'); }}>
              {labels.map((label) => <option key={label} value={label}>{label}</option>)}
            </Select>
          </Field>
        )}
        <Field label="eBay site">
          <Select value={marketplace} onChange={(value) => setMarketplace(value as EbayMarketplace)}>
            <option value="EBAY_US">eBay US</option>
            <option value="EBAY_UK">eBay UK</option>
          </Select>
        </Field>
      </div>

      {unlisted ? (
        <Field label="Size on the tag">
          <div className="max-w-xs">
            <Input value={otherSize} onChange={(event) => { setOtherSize(event.target.value); setTieChoice('smaller'); }} placeholder={otherFamily === 'shoes' ? '10 or UK 9' : otherFamily === 'pants' ? '32 or 32x30' : 'M or Medium'} />
          </div>
        </Field>
      ) : null}

      {(unlisted ? otherFamily === 'pants' : chart?.family === 'waist') ? (
        <Field label="Inseam, if the tag has one">
          <div className="max-w-xs"><Select value={inseam} onChange={setInseam}>
            <option value="">Not on the tag</option>
            {['28', '30', '32', '34', '36', '38'].map((value) => <option key={value} value={value}>{value} in</option>)}
          </Select></div>
          <p className="mt-2 text-xs text-muted-foreground">Inseam stays in the description. eBay rejects a combined Size such as 32x30.</p>
        </Field>
      ) : null}

      {conversion ? (
        <section className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Size field</p>
            <p className="mt-3 text-4xl font-semibold tracking-tight" aria-live="polite">{conversion.ebaySize}</p>
            <p className={cn('mt-3 inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', badgeClass(conversion.match))}>{badgeLabel(conversion.match)}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => void copyText('size', conversion.ebaySize)}>
                {copied === 'size' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copy Size
              </Button>
            </div>
            {conversion.alternates.length > 1 ? (
              <div className="mt-4 space-y-2">
                <p className="text-xs text-muted-foreground">These supported sizes are equally close. Pick the one you will put in Size.</p>
                <div className="flex gap-2">
                  {conversion.alternates.map((size, index) => {
                    const choice: TieChoice = index === 0 ? 'smaller' : 'larger';
                    return (
                      <Button key={size} type="button" size="sm" variant={tieChoice === choice ? 'default' : 'outline'} onClick={() => setTieChoice(choice)}>{size}</Button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="font-semibold">What to put in the description</h3>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{conversion.detail}</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => void copyText('snippet', conversion.descriptionSnippet)}>
                {copied === 'snippet' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <pre className="mt-4 whitespace-pre-wrap rounded-md border border-border bg-muted/40 px-3 py-3 font-sans text-sm leading-6">{conversion.descriptionSnippet}</pre>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">{conversion.hasChart ? 'Official measurements' : 'Chart'}</dt>
                <dd className="mt-1">{conversion.measurements}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">Custom item specific</dt>
                <dd className="mt-1">Actual size: {conversion.actualSize}</dd>
              </div>
            </dl>
            {onUseDescription ? (
              <Button type="button" className="mt-4" variant="secondary" onClick={() => onUseDescription(conversion.descriptionSnippet)}>Add to draft description</Button>
            ) : null}
          </div>
        </section>
              ) : conversionError ? (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{conversionError}</p>
      ) : unlisted ? (
        <p className="text-sm text-muted-foreground">Enter the brand and the size on the tag. Listed brands are the ones with an official chart.</p>
      ) : null}

      {chart ? (
        <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
          <div className="flex flex-col gap-1 border-b border-border px-5 py-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h3 className="font-semibold">{chart.brand} {chart.department.toLowerCase()}'s {chart.garment.toLowerCase()}</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                <a className="underline-offset-2 hover:underline" href={chart.sourceUrl} target="_blank" rel="noreferrer">{chart.sourceName}</a>
                {' · '}retrieved {chart.retrieved}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">{marketplace === 'EBAY_UK' ? 'eBay UK alpha for clothing' : 'eBay US Size value'}</p>
          </div>
          {chart.notes ? <p className="border-b border-border px-5 py-3 text-xs leading-5 text-muted-foreground">{chart.notes}</p> : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Brand size</th>
                  <th className="px-4 py-3 font-medium">Official chart</th>
                  <th className="px-4 py-3 font-medium">eBay Size</th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row) => (
                  <tr key={row.label} className={cn('border-t border-border', row.label === brandSize && 'bg-emerald-500/10')}>
                    <td className="px-4 py-3 font-medium">{row.label}</td>
                    <td className="px-4 py-3 text-muted-foreground">{row.conversion.measurements}</td>
                    <td className="px-4 py-3">
                      <span className="font-semibold">{row.conversion.ebaySize}</span>
                      {row.conversion.match !== 'exact' ? <span className="ml-2 text-xs text-muted-foreground">{row.conversion.match === 'tie' ? 'tie' : 'closest'}</span> : null}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border border-dashed border-border px-5 py-4 text-xs leading-5 text-muted-foreground">
        <p>Allowed values still depend on the leaf category. Open the sell form and confirm the suggested value is in that dropdown before you revise a listing.</p>
        <ul className="mt-3 space-y-1">
          {EBAY_SIZE_SOURCES.map((source) => (
            <li key={source.url}>
              <a className="text-foreground underline-offset-2 hover:underline" href={source.url} target="_blank" rel="noreferrer">{source.name}</a>
              {' · '}{source.detail}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <Label className="text-xs">{label}</Label>
      <div className="mt-2">{children}</div>
    </label>
  );
}

function Select({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {children}
    </select>
  );
}

function badgeLabel(match: 'exact' | 'closest' | 'tie') {
  if (match === 'exact') return 'Exact supported size';
  if (match === 'tie') return 'Two sizes equally close';
  return 'Closest supported size';
}

function badgeClass(match: 'exact' | 'closest' | 'tie') {
  if (match === 'exact') return 'bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200';
  if (match === 'tie') return 'bg-amber-100 text-amber-950 dark:bg-amber-950 dark:text-amber-200';
  return 'bg-blue-100 text-blue-950 dark:bg-blue-950 dark:text-blue-200';
}
