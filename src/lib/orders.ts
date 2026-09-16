export type Marketplace = 'eBay' | 'Poshmark' | 'Depop' | string;

export type NiftyOrder = {
  id: string;
  marketplace: Marketplace;
  itemName: string;
  sku: string;
  brand: string;
  daysListed: number;
  orderStatus: string;
  soldAt: string;
  buyerState: string;
  buyerCountry: string;
  salePrice: number;
  collectedShipping: number;
  refunded: number;
  standardFees: number;
  shippingFees: number;
  promotedFees: number;
  costOfGoods: number;
  shippingExpenses: number;
  otherExpenses: number;
  totalProfit: number;
  categoryId?: string;
  categoryName?: string;
  categorySource?: 'official-ebay' | 'inferred';
  source?: 'nifty' | 'ebay-api' | 'nifty+ebay';
  externalOrderId?: string;
  externalLineItemId?: string;
};

export type Period = '7d' | '30d' | '90d' | '180d' | '365d' | 'all';

const TWO_WORD_BRANDS = [
  'Heritage America',
  'Smoke Rise',
  'Free People',
  'Urban Outfitters',
  'American Eagle',
  'Lucky Brand',
  'True Religion',
  'Ralph Lauren',
  'Banana Republic',
  'North Face',
  'New Balance',
  'Dr Martens',
  'Brooks Brothers',
  'Peter Millar',
  'Travis Mathew',
  'Under Armour',
  'Hugo Boss',
  'Vineyard Vines',
  'David Donahue',
];

const BRAND_ALIASES: Array<[RegExp, string]> = [
  [/^(?:polo |lauren |ralph ralph )?ralph lauren\b/i, 'Ralph Lauren'],
  [/^brooks brothers\b/i, 'Brooks Brothers'],
  [/^(?:hugo boss|boss)\b/i, 'Hugo Boss'],
  [/^peter millar\b/i, 'Peter Millar'],
  [/^travis mathew\b/i, 'Travis Mathew'],
  [/^under armour\b/i, 'Under Armour'],
  [/^(?:levis|levi['’]s)\b/i, "Levi's"],
  [/^(?:seven\s?7|seven7)\b/i, 'Seven7'],
  [/^lucky brand\b/i, 'Lucky Brand'],
  [/^(?:\d{4}\s+pokemon|pokemon|charmander|lapras|vaporeon)\b/i, 'Pokemon'],
];

const BRAND_CASE: Record<string, string> = {
  lacoste: 'Lacoste', nike: 'Nike', filson: 'Filson', faherty: 'Faherty',
  zanella: 'Zanella', santorelli: 'Santorelli', armani: 'Armani', canali: 'Canali',
  everlane: 'Everlane', bonobos: 'Bonobos', reebok: 'Reebok', adidas: 'Adidas',
};

const REQUIRED_HEADERS = ['Marketplace', 'Item Name', 'SKU', 'Days Listed', 'Sold At', 'Sale Price', 'Total Profit'];

const ITEM_TYPE_RULES: Array<[string, RegExp]> = [
  ['Trading Cards', /\b(pokemon|mtg|magic the gathering|trading card|base set|charizard|charmander|lapras|vaporeon)\b/i],
  ['Jeans', /\b(jeans?|denim pants?|jeggings?)\b/i],
  ['Dress Pants', /\b(dress pants?|dress slacks?|slacks?|trousers?|suit pants?|wool pants?)\b/i],
  ['Casual Pants', /\b(chinos?|khakis?|corduroy pants?|casual pants?|performance pants?)\b/i],
  ['Polo Shirts', /\b(polo shirts?|golf polos?)\b/i],
  ['Button-Down Shirts', /\b(button[ -](?:down|up)|dress shirts?|flannel shirts?)\b/i],
  ['T-Shirts', /\b(t-?shirts?|graphic tees?|henleys?)\b/i],
  ['Suits', /\b(two-piece suit|2-piece suit|suits?)\b/i],
  ['Blazers & Sport Coats', /\b(blazers?|sport coats?)\b/i],
  ['Jackets & Coats', /\b(jackets?|coats?|windbreakers?|parkas?|vests?)\b/i],
  ['Shorts', /\bshorts?\b/i],
  ['Sweaters', /\b(sweaters?|cardigans?|pullovers?|quarter zip|1\/4 zip)\b/i],
  ['Dresses', /\bdresses?\b/i],
  ['Skirts', /\bskirts?\b/i],
  ['Athletic Shoes', /\b(sneakers?|running shoes?|basketball shoes?|trainers?)\b/i],
  ['Dress Shoes', /\b(loafers?|oxfords?|dress shoes?|monk straps?)\b/i],
  ['Boots', /\bboots?\b/i],
  ['Hats', /\b(hats?|caps?|snapbacks?|fitted)\b/i],
  ['Accessories', /\b(ties?|belts?|scarves?|wallets?|bags?|purses?)\b/i],
];

export function parseNiftyCsv(text: string): NiftyOrder[] {
  const rows = parseCsv(text.replace(/^\uFEFF/, ''));
  if (rows.length < 2) throw new Error('This CSV has headers but no order rows.');

  const headers = rows[0].map((header) => header.trim());
  const missing = REQUIRED_HEADERS.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Missing Nifty columns: ${missing.join(', ')}`);

  const index = new Map(headers.map((header, column) => [header, column]));
  const get = (row: string[], header: string) => row[index.get(header) ?? -1]?.trim() ?? '';

  return rows
    .slice(1)
    .filter((row) => row.some((value) => value.trim()))
    .map((row, rowIndex) => {
      const itemName = get(row, 'Item Name');
      const sku = get(row, 'SKU');
      const soldAt = get(row, 'Sold At');
      return {
        id: `${sku || 'order'}-${soldAt || rowIndex}-${rowIndex}`,
        marketplace: get(row, 'Marketplace') || 'Unknown',
        itemName,
        sku,
        brand: inferBrand(itemName),
        daysListed: numberValue(get(row, 'Days Listed')),
        orderStatus: get(row, 'Order Status'),
        soldAt,
        buyerState: get(row, 'Buyer State'),
        buyerCountry: get(row, 'Buyer Country'),
        salePrice: numberValue(get(row, 'Sale Price')),
        collectedShipping: numberValue(get(row, 'Collected Shipping')),
        refunded: numberValue(get(row, 'Amount Refunded to Buyer')),
        standardFees: numberValue(get(row, 'Standard Fees')),
        shippingFees: numberValue(get(row, 'Shipping Fees')),
        promotedFees: numberValue(get(row, 'Promoted Fees')),
        costOfGoods: numberValue(get(row, 'Cost of Goods')),
        shippingExpenses: numberValue(get(row, 'Shipping Expenses')),
        otherExpenses: numberValue(get(row, 'Other Expenses')),
        totalProfit: numberValue(get(row, 'Total Profit')),
        categoryId: get(row, 'Category ID') || undefined,
        categoryName: get(row, 'Category') || get(row, 'Category Name') || undefined,
        categorySource: get(row, 'Category ID') || get(row, 'Category') || get(row, 'Category Name') ? 'official-ebay' : 'inferred',
        source: 'nifty',
      };
    });
}

export function inferBrand(title: string): string {
  const normalized = title.replace(/\s+/g, ' ').trim();
  const alias = BRAND_ALIASES.find(([pattern]) => pattern.test(normalized));
  if (alias) return alias[1];
  const known = TWO_WORD_BRANDS.find((brand) => normalized.toLowerCase().startsWith(brand.toLowerCase()));
  if (known) return known;
  const firstWord = normalized.split(' ')[0] || '';
  return (BRAND_CASE[firstWord.toLowerCase()] ?? firstWord) || 'Unclassified';
}

export function inferItemType(title: string): string {
  const normalized = title.replace(/\s+/g, ' ').trim();
  return ITEM_TYPE_RULES.find(([, pattern]) => pattern.test(normalized))?.[0] ?? 'Other';
}

export function categoryForOrder(order: NiftyOrder): string {
  if (order.categoryName?.trim()) {
    const parts = order.categoryName.split(/\s*(?::|>)\s*/).filter(Boolean);
    return parts.at(-1) || order.categoryName.trim();
  }
  return inferItemType(order.itemName);
}

export function periodDays(period: Period): number | null {
  if (period === 'all') return null;
  return Number(period.slice(0, -1));
}

export function filterOrdersByPeriod(orders: NiftyOrder[], period: Period, now = new Date()): NiftyOrder[] {
  const days = periodDays(period);
  if (days == null || !orders.length) return orders;
  const latestOrderMs = Math.max(...orders.map((order) => orderDate(order).getTime()).filter(Number.isFinite));
  const anchor = latestOrderMs > now.getTime() ? new Date(latestOrderMs) : now;
  const start = anchor.getTime() - days * 86_400_000;
  return orders.filter((order) => orderDate(order).getTime() >= start && orderDate(order).getTime() <= anchor.getTime());
}

export function previousPeriodOrders(orders: NiftyOrder[], period: Period, now = new Date()): NiftyOrder[] {
  const days = periodDays(period);
  if (days == null || !orders.length) return [];
  const latestOrderMs = Math.max(...orders.map((order) => orderDate(order).getTime()).filter(Number.isFinite));
  const anchor = latestOrderMs > now.getTime() ? new Date(latestOrderMs) : now;
  const currentStart = anchor.getTime() - days * 86_400_000;
  const previousStart = currentStart - days * 86_400_000;
  return orders.filter((order) => {
    const sold = orderDate(order).getTime();
    return sold >= previousStart && sold < currentStart;
  });
}

export function orderRevenue(order: NiftyOrder): number {
  return order.salePrice + order.collectedShipping - order.refunded;
}

export function orderDate(order: NiftyOrder): Date {
  const parsed = new Date(order.soldAt.replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-US', { style: 'percent', maximumFractionDigits: 1 }).format(value);
}

function numberValue(value: string): number {
  const negative = /^\(.*\)$/.test(value.trim());
  const parsed = Number(value.replace(/[$,()]/g, ''));
  if (!Number.isFinite(parsed)) return 0;
  return negative ? -parsed : parsed;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field);
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field);
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some((value) => value.length)) rows.push(row);
  return rows;
}
