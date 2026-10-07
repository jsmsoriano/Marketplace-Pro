/** eBay Apparel & Footwear size standardization, enforced August 2026. */

export const EBAY_ALPHA_SIZES = ['2XS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;
export type EbayAlpha = (typeof EBAY_ALPHA_SIZES)[number];

/**
 * Even waist numbers. After enforcement, sellers reported that odd waists such as
 * 33 and 35 are rejected. eBay did not publish one universal numeric list — confirm
 * the leaf-category dropdown.
 */
export const EBAY_EVEN_WAISTS = [26, 28, 30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60] as const;

export type EbayMarketplace = 'EBAY_US' | 'EBAY_UK';

export const EBAY_SIZE_SOURCES = [
  {
    name: 'eBay seller notice',
    detail: 'August 2026 enforcement, quoted by Value Added Resource (updated August 11, 2026)',
    url: 'https://www.valueaddedresource.net/ebay-fashion-size-standardization/',
  },
  {
    name: 'Sellertivity seller guide',
    detail: 'July 31, 2026. Closest supported size, then the real size in the description.',
    url: 'https://sellertivity.com/blogs/blog/ebay-size-standardisation-2026-fashion-and-footwear-seller-guide',
  },
  {
    name: 'eBay UK Business Seller Board',
    detail: 'eBay UK told sellers variation clothing uses alpha sizes 2XS–XXL, with numeric sizes moved to the description.',
    url: 'https://community.ebay.co.uk/forum/business-seller-board-12/topic/new-clothing-size-requirements-huge-problems-51842/',
  },
] as const;

const ALPHA_CANONICAL: Record<string, string> = {
  '2xs': '2XS',
  xxs: '2XS',
  xxsmall: '2XS',
  extraextrasmall: '2XS',
  xs: 'XS',
  xsmall: 'XS',
  extrasmall: 'XS',
  s: 'S',
  sm: 'S',
  small: 'S',
  m: 'M',
  md: 'M',
  med: 'M',
  medium: 'M',
  l: 'L',
  lg: 'L',
  large: 'L',
  xl: 'XL',
  xlarge: 'XL',
  extralarge: 'XL',
  xxl: 'XXL',
  '2xl': 'XXL',
  '2x': 'XXL',
  xxlarge: 'XXL',
  extraextralarge: 'XXL',
  '3xl': '3XL',
  xxxl: '3XL',
  '3x': '3XL',
  '4xl': '4XL',
  '4x': '4XL',
  '5xl': '5XL',
  '5x': '5XL',
  '1xg': '1XG',
  '2xg': '2XG',
};

export function compactSize(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9.]+/g, '');
}

export function canonicalAlpha(value: string): string | null {
  return ALPHA_CANONICAL[compactSize(value)] ?? null;
}

export function toEbayAlpha(value: string): { size: EbayAlpha; beyond: boolean } {
  const canonical = canonicalAlpha(value);
  if (canonical && (EBAY_ALPHA_SIZES as readonly string[]).includes(canonical)) {
    return { size: canonical as EbayAlpha, beyond: false };
  }
  return { size: 'XXL', beyond: true };
}

export function formatRegionSize(region: 'US' | 'UK' | 'EU', value: number): string {
  const shown = Number.isInteger(value) ? String(value) : String(value);
  return `${region} ${shown}`;
}

export function closestEvenWaists(waist: number): { sizes: string[]; tie: boolean } {
  const ranked = EBAY_EVEN_WAISTS.map((value) => ({ value, distance: Math.abs(value - waist) }));
  const best = Math.min(...ranked.map((entry) => entry.distance));
  const sizes = ranked.filter((entry) => entry.distance === best).map((entry) => String(entry.value));
  return { sizes, tie: sizes.length > 1 };
}

export function formatInches(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded);
}

export function formatInchRange(min: number, max: number): string {
  if (min === max) return `${formatInches(min)} in`;
  return `${formatInches(min)}–${formatInches(max)} in`;
}
