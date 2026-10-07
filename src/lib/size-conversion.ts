import { chartById, SIZE_CHARTS } from '@/lib/brand-size-charts';
import {
  canonicalAlpha,
  closestEvenWaists,
  compactSize,
  formatInchRange,
  formatRegionSize,
  toEbayAlpha,
  type EbayAlpha,
  type EbayMarketplace,
} from '@/lib/ebay-size-policy';
import type { AlphaSize, Range, ShoeSize, SizeChart, WaistSize } from '@/lib/size-chart-types';

export type SizeMatch = 'exact' | 'closest' | 'tie';
export type TieChoice = 'smaller' | 'larger';

export type SizeConversion = {
  ebaySize: string;
  match: SizeMatch;
  alternates: string[];
  beyondSupportedList: boolean;
  hasChart: boolean;
  measurements: string;
  detail: string;
  descriptionSnippet: string;
  actualSize: string;
  letterAlternative: string | null;
};

export const OTHER_BRAND = '__other__';
export type UnlistedFamily = 'tops' | 'pants' | 'shoes';

export type ConvertInput = {
  chartId: string;
  brandSize: string;
  marketplace: EbayMarketplace;
  inseam?: number | null;
  tieChoice?: TieChoice;
};

export type ConvertResult = { ok: true; chart: SizeChart; conversion: SizeConversion } | { ok: false; error: string };

const BLOCKED = /^(see\s*description|n\/?a|na|none|various|mixed|osfa|one\s*size|custom|unknown)$/i;

export function convertBrandSize(input: ConvertInput): ConvertResult {
  const chart = chartById(input.chartId);
  if (!chart) return { ok: false, error: 'Choose a brand chart.' };
  const parsed = parseTag(input.brandSize, chart.family);
  if (parsed.ok === false) return { ok: false, error: parsed.error };
  const inseam = input.inseam ?? parsed.inseam;
  const row = findRow(chart, parsed.token);
  if (!row) {
    if (/[/]/.test(parsed.token) || /\b(and|&)\b/i.test(parsed.token)) {
      return { ok: false, error: 'eBay rejects more than one size in the Size field. Choose a single brand size. S/M/L and similar combinations are blocked.' };
    }
    return { ok: false, error: `${parsed.token} is not on the ${chart.brand} ${chart.department.toLowerCase()} ${chart.garment.toLowerCase()} chart.` };
  }
  const conversion = buildConversion(chart, row, input.marketplace, inseam ?? null, input.tieChoice ?? 'smaller');
  return { ok: true, chart, conversion };
}

export function convertUnlistedBrand(input: {
  brandName: string;
  family: UnlistedFamily;
  brandSize: string;
  marketplace: EbayMarketplace;
  inseam?: number | null;
  tieChoice?: TieChoice;
}): { ok: true; conversion: SizeConversion } | { ok: false; error: string } {
  const brandName = input.brandName.replace(/\s+/g, ' ').trim();
  if (!brandName) return { ok: false, error: 'Enter the brand name printed on the label.' };
  const parsed = parseTag(input.brandSize, input.family === 'pants' ? 'waist' : input.family === 'shoes' ? 'shoes' : 'alpha');
  if (parsed.ok === false) return { ok: false, error: parsed.error };
  const known = SIZE_CHARTS.find((chart) => chart.brand.toLowerCase() === brandName.toLowerCase());
  const knownNote = known ? ` ${known.brand} is in the brand list. Switch to it for the official chart and measurements.` : '';
  const inseam = input.inseam ?? parsed.inseam;
  const built = standardizeUnlisted(brandName, input.family, parsed.token, input.marketplace, inseam, input.tieChoice ?? 'smaller');
  if (built.ok === false) return built;
  return {
    ok: true,
    conversion: {
      ...built.conversion,
      detail: `${built.conversion.detail}${knownNote}`,
    },
  };
}

export function previewChart(chart: SizeChart, marketplace: EbayMarketplace): Array<{ label: string; conversion: SizeConversion }> {
  return rowLabels(chart).map((label) => {
    const result = convertBrandSize({ chartId: chart.id, brandSize: label, marketplace });
    if (result.ok === false) throw new Error(result.error);
    return { label, conversion: result.conversion };
  });
}

export function rowLabels(chart: SizeChart): string[] {
  if (chart.family === 'alpha') return (chart.alphaSizes ?? []).map((row) => row.label);
  if (chart.family === 'waist') return (chart.waistSizes ?? []).map((row) => row.label);
  return (chart.shoeSizes ?? []).map((row) => row.label);
}

export function defaultChartId(brand: string): string {
  return SIZE_CHARTS.find((chart) => chart.brand === brand)?.id ?? SIZE_CHARTS[0].id;
}

export function defaultSizeLabel(chart: SizeChart): string {
  const labels = rowLabels(chart);
  return labels.find((label) => /^(M|MD|32|US 10)$/.test(label)) ?? labels[Math.floor(labels.length / 2)] ?? '';
}

type ParsedTag = { ok: true; token: string; inseam: number | null } | { ok: false; error: string };

function parseTag(raw: string, family: SizeChart['family']): ParsedTag {
  const value = raw.replace(/\s+/g, ' ').trim();
  if (!value) return { ok: false, error: 'Enter the size printed on the brand tag.' };
  if (BLOCKED.test(value)) {
    return { ok: false, error: 'eBay no longer accepts placeholder sizes such as "See description" or "N/A". Pick the closest supported size and put the detail in the description.' };
  }
  if (family === 'waist') {
    const combined = value.match(/^(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)$/i) ?? value.match(/^w\s*(\d+(?:\.\d+)?)\s*l\s*(\d+(?:\.\d+)?)$/i);
    if (combined) return { ok: true, token: combined[1], inseam: Number(combined[2]) };
  }
  return { ok: true, token: value, inseam: null };
}

function standardizeUnlisted(brandName: string, family: UnlistedFamily, token: string, marketplace: EbayMarketplace, inseam: number | null, tieChoice: TieChoice): { ok: true; conversion: SizeConversion } | { ok: false; error: string } {
  if (/[/]/.test(token) || /\b(and|&)\b/i.test(token)) {
    return { ok: false, error: 'eBay rejects more than one size in the Size field. Enter one tag size. S/M/L and similar combinations are blocked.' };
  }
  const garment = family === 'tops' ? 'tops' : family === 'pants' ? 'pants' : 'shoes';
  const actualSize = `${brandName} ${garment} ${token}`;
  const missingChart = `No official size chart is loaded for ${brandName}. The tag text was standardized only. Measurements are not estimated.`;

  if (family === 'shoes') return unlistedShoe(brandName, token, marketplace, actualSize, missingChart);
  if (family === 'pants') return unlistedPants(brandName, token, marketplace, inseam, tieChoice, actualSize, missingChart);
  return unlistedTops(brandName, token, marketplace, tieChoice, actualSize, missingChart);
}

function unlistedTops(brandName: string, token: string, marketplace: EbayMarketplace, tieChoice: TieChoice, actualSize: string, missingChart: string): { ok: true; conversion: SizeConversion } | { ok: false; error: string } {
  const split = token.split(/\s*-\s*/);
  const pieces = split.length === 2 && split.every((part) => canonicalAlpha(part)) ? split : [token];
  if (pieces.length === 1 && !canonicalAlpha(token)) {
    if (/^\d/.test(token)) {
      return { ok: false, error: `${token} looks like a waist or shoe size. Switch the garment, or enter the letter printed on the tag. ${brandName}'s chart is not loaded, so a number is not turned into a letter.` };
    }
    return { ok: false, error: `${token} is not a letter size eBay can standardize. Enter the tag letter, such as M or XL.` };
  }
  const mapped = pieces.map((piece) => toEbayAlpha(piece));
  const ordered = orderAlphas([...new Set(mapped.map((entry) => entry.size))]);
  const beyond = mapped.some((entry) => entry.beyond);
  const tie = ordered.length > 1;
  const ebaySize = tie ? (tieChoice === 'larger' ? ordered[ordered.length - 1] : ordered[0]) : ordered[0];
  const detail = tie
    ? `${brandName} ${token} spans ${ordered.join(' and ')}. eBay accepts one Size value. ${ebaySize} is selected.`
    : beyond
      ? `${brandName} ${token} is past the alpha list eBay published (2XS through XXL). ${ebaySize} is the closest supported value.`
      : `${brandName} ${token} standardizes to ${ebaySize}. ${brandName}'s measurement chart is not loaded.`;
  return { ok: true, conversion: unlistedResult({ ebaySize, match: tie ? 'tie' : beyond ? 'closest' : 'exact', alternates: tie ? ordered : [], beyond, actualSize, missingChart, detail, inseam: null, marketplace }) };
}

function unlistedPants(brandName: string, token: string, marketplace: EbayMarketplace, inseam: number | null, tieChoice: TieChoice, actualSize: string, missingChart: string): { ok: true; conversion: SizeConversion } | { ok: false; error: string } {
  if (canonicalAlpha(token) && !/^\d/.test(token)) {
    const mapped = toEbayAlpha(token);
    const detail = marketplace === 'EBAY_UK'
      ? `${brandName} ${token} standardizes to ${mapped.size}. The waist number, if you have one, stays in the description.`
      : `${brandName} ${token} standardizes to ${mapped.size}. If this pant category's dropdown is waist numbers instead of letters, use the tagged waist. It is not estimated without the brand chart.`;
    return { ok: true, conversion: unlistedResult({ ebaySize: mapped.size, match: mapped.beyond ? 'closest' : 'exact', alternates: [], beyond: mapped.beyond, actualSize, missingChart, detail, inseam, marketplace }) };
  }
  if (!/^\d+(?:\.\d+)?$/.test(token)) {
    return { ok: false, error: `Enter a waist number or a letter size from the ${brandName} tag.` };
  }
  if (marketplace === 'EBAY_UK') {
    return { ok: false, error: `eBay UK clothing Size has to be a letter from 2XS to XXL. ${brandName}'s chart is not loaded, so waist ${token} cannot be turned into a letter. Enter the letter on the tag and keep ${token} in the description.` };
  }
  const waist = Number(token);
  const closest = closestEvenWaists(waist);
  const ebaySize = closest.tie ? (tieChoice === 'larger' ? closest.sizes[1] : closest.sizes[0]) : closest.sizes[0];
  const detail = closest.tie
    ? `${closest.sizes[0]} and ${closest.sizes[1]} are equally close to waist ${token}. Odd waists such as 33 and 35 are the values sellers report as missing. ${ebaySize} is selected. ${brandName}'s body measurements are not loaded.`
    : `Waist ${token} is an even number eBay still describes as a numeric size. ${brandName}'s body measurements are not loaded.`;
  return { ok: true, conversion: unlistedResult({ ebaySize, match: closest.tie ? 'tie' : 'exact', alternates: closest.tie ? closest.sizes : [], beyond: false, actualSize, missingChart, detail, inseam, marketplace }) };
}

function unlistedShoe(brandName: string, token: string, marketplace: EbayMarketplace, actualSize: string, missingChart: string): { ok: true; conversion: SizeConversion } | { ok: false; error: string } {
  const primary = marketplace === 'EBAY_UK' ? 'UK' : 'US';
  const labeled = token.match(/^(us|uk|eu)\s*(\d+(?:\.\d+)?)$/i);
  const bare = token.match(/^(\d+(?:\.\d+)?)$/);
  if (!labeled && !bare) return { ok: false, error: 'Enter a shoe size such as 10, US 10, UK 9, or EU 43.' };
  if (labeled && labeled[1].toUpperCase() !== primary && labeled[1].toUpperCase() !== 'EU') {
    const typed = labeled[1].toUpperCase();
    return { ok: false, error: `${brandName}'s shoe chart is not loaded, so ${typed} ${labeled[2]} cannot be converted to ${primary}. Enter the ${primary} size from the tag, or switch the eBay site.` };
  }
  if (labeled && labeled[1].toUpperCase() === 'EU') {
    return { ok: false, error: `${brandName}'s shoe chart is not loaded, so EU ${labeled[2]} cannot be converted to ${primary}. Enter the ${primary} size from the tag.` };
  }
  const value = Number(labeled ? labeled[2] : bare?.[1]);
  const ebaySize = formatRegionSize(primary, value);
  return {
    ok: true,
    conversion: unlistedResult({
      ebaySize,
      match: 'exact',
      alternates: [],
      beyond: false,
      actualSize,
      missingChart,
      detail: `${ebaySize} keeps the size on the tag in eBay's region format. Other regions are not converted, because ${brandName}'s shoe chart is not loaded.`,
      inseam: null,
      marketplace,
    }),
  };
}

function unlistedResult(draft: {
  ebaySize: string;
  match: SizeMatch;
  alternates: string[];
  beyond: boolean;
  actualSize: string;
  missingChart: string;
  detail: string;
  inseam: number | null;
  marketplace: EbayMarketplace;
}): SizeConversion {
  const lines = [
    `eBay Size: ${draft.ebaySize}`,
    `Actual size: ${draft.actualSize}`,
    draft.missingChart,
  ];
  if (draft.inseam != null) lines.push(`Inseam: ${formatNumber(draft.inseam)} in. Do not combine inseam with the Size field.`);
  lines.push('Confirm this value is in the Size dropdown for the leaf category. eBay\'s allowed values still vary by category.');
  return {
    ebaySize: draft.ebaySize,
    match: draft.match,
    alternates: draft.alternates,
    beyondSupportedList: draft.beyond,
    hasChart: false,
    measurements: draft.missingChart,
    detail: draft.detail,
    descriptionSnippet: lines.join('\n'),
    actualSize: draft.actualSize,
    letterAlternative: null,
  };
}

type ChartRow = { kind: 'alpha'; row: AlphaSize } | { kind: 'waist'; row: WaistSize } | { kind: 'shoe'; row: ShoeSize };

function findRow(chart: SizeChart, token: string): ChartRow | null {
  if (chart.family === 'alpha') {
    const row = matchAlpha(chart.alphaSizes ?? [], token);
    return row ? { kind: 'alpha', row } : null;
  }
  if (chart.family === 'waist') {
    const row = matchWaist(chart.waistSizes ?? [], token);
    return row ? { kind: 'waist', row } : null;
  }
  const row = matchShoe(chart.shoeSizes ?? [], token);
  return row ? { kind: 'shoe', row } : null;
}

function matchAlpha(rows: AlphaSize[], token: string): AlphaSize | null {
  const exact = rows.find((row) => compactSize(row.label) === compactSize(token));
  if (exact) return exact;
  const wanted = canonicalAlpha(token);
  if (!wanted) return null;
  const hits = rows.filter((row) => row.alphas.some((alpha) => canonicalAlpha(alpha) === wanted) && row.alphas.length === 1);
  return hits.length === 1 ? hits[0] : null;
}

function matchWaist(rows: WaistSize[], token: string): WaistSize | null {
  const exact = rows.find((row) => compactSize(row.label) === compactSize(token));
  if (exact) return exact;
  const numeric = token.match(/^\d+(?:\.\d+)?$/);
  if (!numeric) return null;
  const hits = rows.filter((row) => row.waist === Number(token));
  return hits.length === 1 ? hits[0] : null;
}

function matchShoe(rows: ShoeSize[], token: string): ShoeSize | null {
  const exact = rows.find((row) => compactSize(row.label) === compactSize(token));
  if (exact) return exact;
  const region = token.match(/^(us|uk|eu)\s*(\d+(?:\.\d+)?)$/i);
  if (region) {
    const code = region[1].toUpperCase();
    const value = Number(region[2]);
    return rows.find((row) => (code === 'US' ? row.us : code === 'UK' ? row.uk : row.eu) === value) ?? null;
  }
  if (/^\d+(?:\.\d+)?$/.test(token)) {
    const value = Number(token);
    return rows.find((row) => row.us === value) ?? null;
  }
  return null;
}

function buildConversion(chart: SizeChart, found: ChartRow, marketplace: EbayMarketplace, inseam: number | null, tieChoice: TieChoice): SizeConversion {
  if (found.kind === 'shoe') return convertShoe(chart, found.row, marketplace);
  if (found.kind === 'waist') return convertWaist(chart, found.row, marketplace, inseam, tieChoice);
  return convertAlpha(chart, found.row, marketplace, tieChoice);
}

function convertAlpha(chart: SizeChart, row: AlphaSize, marketplace: EbayMarketplace, tieChoice: TieChoice): SizeConversion {
  const mapped = row.alphas.map((alpha) => toEbayAlpha(alpha));
  const unique = [...new Set(mapped.map((entry) => entry.size))];
  const beyond = mapped.some((entry) => entry.beyond);
  const tie = unique.length > 1;
  const ordered = orderAlphas(unique);
  const ebaySize = tie ? (tieChoice === 'larger' ? ordered[ordered.length - 1] : ordered[0]) : ordered[0];
  const measurements = measurementLine(row);
  const actualSize = brandSizeLabel(chart, row.label);
  const detail = alphaDetail(chart, row, ebaySize, ordered, beyond, marketplace);
  return finish(chart, row.label, {
    ebaySize,
    match: tie ? 'tie' : beyond ? 'closest' : 'exact',
    alternates: tie ? ordered : [],
    beyondSupportedList: beyond,
    measurements,
    detail,
    actualSize,
    letterAlternative: null,
    inseam: null,
    marketplace,
  });
}

function convertWaist(chart: SizeChart, row: WaistSize, marketplace: EbayMarketplace, inseam: number | null, tieChoice: TieChoice): SizeConversion {
  const measurements = [
    `labeled waist ${row.waist}`,
    `body waist ${formatInchRange(row.bodyWaist.min, row.bodyWaist.max)}`,
    row.hip ? `hip ${formatInchRange(row.hip.min, row.hip.max)}` : null,
    row.seat ? `seat ${formatInchRange(row.seat.min, row.seat.max)}` : null,
    row.note,
  ].filter(Boolean).join(', ');
  const letter = letterForWaist(chart, row);
  const actualSize = `${brandSizeLabel(chart, row.label)}${row.note ? ` (${row.note})` : ''}`;

  if (marketplace === 'EBAY_UK') {
    const mapped = toEbayAlpha(letter.alpha);
    const detail = letter.inside
      ? `eBay UK clothing Size is an alpha value. This waist falls in ${chart.brand}'s ${letter.alpha} band, which eBay writes as ${mapped.size}. Keep the numeric waist in the description.`
      : `eBay UK clothing Size is an alpha value. ${formatInchesPlain(midpoint(row.bodyWaist))} in body waist is closest to ${chart.brand}'s ${letter.alpha} band. Keep the numeric waist in the description.`;
    return finish(chart, row.label, {
      ebaySize: mapped.size,
      match: mapped.beyond || !letter.inside ? 'closest' : 'exact',
      alternates: [],
      beyondSupportedList: mapped.beyond,
      measurements,
      detail: mapped.beyond ? `${detail} eBay's published alpha list stops at XXL.` : detail,
      actualSize,
      letterAlternative: null,
      inseam,
      marketplace,
    });
  }

  const closest = closestEvenWaists(row.waist);
  const ordered = closest.sizes;
  const ebaySize = closest.tie ? (tieChoice === 'larger' ? ordered[1] : ordered[0]) : ordered[0];
  const detail = closest.tie
    ? `${ordered[0]} and ${ordered[1]} are equally close to labeled waist ${row.waist}. Odd waists such as 33 and 35 are the values sellers report as missing after the August 2026 change. ${ebaySize} is selected. Put the tag waist in the description.`
    : `Labeled waist ${row.waist} is a supported even number. Put inseam, fit, and the brand's body measurement in the description rather than in the Size field.`;
  return finish(chart, row.label, {
    ebaySize,
    match: closest.tie ? 'tie' : 'exact',
    alternates: closest.tie ? ordered : [],
    beyondSupportedList: false,
    measurements,
    detail,
    actualSize,
    letterAlternative: letter ? `Letter size on this chart: ${toEbayAlpha(letter.alpha).size}` : null,
    inseam,
    marketplace,
  });
}

function convertShoe(chart: SizeChart, row: ShoeSize, marketplace: EbayMarketplace): SizeConversion {
  const primaryRegion = marketplace === 'EBAY_UK' ? 'UK' : 'US';
  const primaryValue = primaryRegion === 'UK' ? row.uk : row.us;
  const regionLines = [formatRegionSize('US', row.us), row.uk != null ? formatRegionSize('UK', row.uk) : null, row.eu != null ? formatRegionSize('EU', row.eu) : null]
    .filter((line, index, all) => line && all.indexOf(line) === index);
  if (primaryValue == null) {
    const fallback = row.eu != null ? formatRegionSize('EU', row.eu) : formatRegionSize('US', row.us);
    return finish(chart, row.label, {
      ebaySize: fallback,
      match: 'closest',
      alternates: [],
      beyondSupportedList: false,
      measurements: regionLines.join(', '),
      detail: `${chart.sourceName} does not publish a ${primaryRegion} column for this size. ${fallback} is the region value on the chart. Confirm the ${primaryRegion} dropdown before publishing.`,
      actualSize: brandSizeLabel(chart, row.label),
      letterAlternative: null,
      inseam: null,
      marketplace,
    });
  }
  return finish(chart, row.label, {
    ebaySize: formatRegionSize(primaryRegion, primaryValue),
    match: 'exact',
    alternates: [],
    beyondSupportedList: false,
    measurements: regionLines.join(', '),
    detail: `Use one region format in the Size field. The other regions from ${chart.brand}'s chart belong in the description.`,
    actualSize: brandSizeLabel(chart, row.label),
    letterAlternative: null,
    inseam: null,
    marketplace,
  });
}

function finish(chart: SizeChart, label: string, draft: {
  ebaySize: string;
  match: SizeMatch;
  alternates: string[];
  beyondSupportedList: boolean;
  measurements: string;
  detail: string;
  actualSize: string;
  letterAlternative: string | null;
  inseam: number | null;
  marketplace: EbayMarketplace;
}): SizeConversion {
  const lines = [
    `eBay Size: ${draft.ebaySize}`,
    `Actual size: ${draft.actualSize}`,
    `Official chart: ${draft.measurements}`,
  ];
  if (draft.inseam != null) lines.push(`Inseam: ${formatNumber(draft.inseam)} in. Do not combine inseam with the Size field.`);
  if (draft.letterAlternative && draft.marketplace === 'EBAY_US') lines.push(draft.letterAlternative);
  lines.push('Confirm this value is in the Size dropdown for the leaf category. eBay\'s allowed values still vary by category.');
  return {
    ebaySize: draft.ebaySize,
    match: draft.match,
    alternates: draft.alternates,
    beyondSupportedList: draft.beyondSupportedList,
    hasChart: true,
    measurements: draft.measurements,
    detail: draft.detail,
    descriptionSnippet: lines.join('\n'),
    actualSize: draft.actualSize,
    letterAlternative: draft.letterAlternative,
  };
}

function alphaDetail(chart: SizeChart, row: AlphaSize, ebaySize: string, ordered: string[], beyond: boolean, marketplace: EbayMarketplace): string {
  if (ordered.length > 1) {
    return `${chart.brand} ${row.label} spans ${ordered.join(' and ')}. eBay accepts one Size value. ${ebaySize} is selected; state ${row.label} in the description.`;
  }
  if (beyond) {
    return `${chart.brand} ${row.label} is past the alpha list eBay published (2XS, XS, S, M, L, XL, XXL). ${ebaySize} is the closest supported value. State ${row.label} in the description.`;
  }
  if (compactSize(row.label) !== compactSize(ebaySize)) {
    return `${chart.brand} prints ${row.label}. eBay's standardized value is ${ebaySize}.`;
  }
  return marketplace === 'EBAY_UK'
    ? `${chart.brand} ${row.label} uses eBay UK alpha size ${ebaySize}.`
    : `${chart.brand} ${row.label} is already an eBay Size value. A word such as Medium is stored as this letter.`;
}

function letterForWaist(chart: SizeChart, row: WaistSize): { alpha: string; inside: boolean } {
  if (row.alpha) return { alpha: row.alpha, inside: true };
  const bands = chart.alphaWaistBands ?? [];
  const value = midpoint(row.bodyWaist);
  const containing = bands.filter((band) => value >= band.waist.min && value <= band.waist.max);
  if (containing.length) return { alpha: containing[0].alpha, inside: true };
  let best = bands[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const band of bands) {
    const distance = value < band.waist.min ? band.waist.min - value : value - band.waist.max;
    if (distance < bestDistance) {
      bestDistance = distance;
      best = band;
    }
  }
  return { alpha: best?.alpha ?? 'M', inside: false };
}

function measurementLine(row: AlphaSize): string {
  return [
    row.chest ? `chest ${formatInchRange(row.chest.min, row.chest.max)}` : null,
    row.waist ? `waist ${formatInchRange(row.waist.min, row.waist.max)}` : null,
    row.hip ? `hip ${formatInchRange(row.hip.min, row.hip.max)}` : null,
    row.seat ? `seat ${formatInchRange(row.seat.min, row.seat.max)}` : null,
    row.neck ? `neck ${formatInchRange(row.neck.min, row.neck.max)}` : null,
  ].filter(Boolean).join(', ');
}

function brandSizeLabel(chart: SizeChart, label: string): string {
  return `${chart.brand} ${chart.department.toLowerCase()}'s ${chart.garment.toLowerCase()} ${label}`;
}

function midpoint(range: Range): number {
  return (range.min + range.max) / 2;
}

function formatInchesPlain(value: number): string {
  return formatInchRange(value, value).replace(' in', '');
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : String(value);
}

const ALPHA_ORDER = ['2XS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'];

function orderAlphas(values: string[]): EbayAlpha[] {
  return [...values].sort((a, b) => ALPHA_ORDER.indexOf(a) - ALPHA_ORDER.indexOf(b)) as EbayAlpha[];
}
