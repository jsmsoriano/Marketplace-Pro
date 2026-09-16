export type TitleAuditSeverity = 'critical' | 'needs-work' | 'strong';

export type TitleAuditRow = {
  id: string;
  itemNumber: string;
  sku: string;
  title: string;
  category: string;
  score: number;
  severity: TitleAuditSeverity;
  issues: string[];
  suggestion: string;
  suggestionChanged: boolean;
  manualGuidance: string[];
};

const REPORT_STORAGE_KEY = 'marketplace-pro:ebay-active-report';
const APPAREL_TERMS = /\b(size|men'?s|women'?s|boys?|girls?|unisex|xxs|xs|small|medium|large|xl|xxl|\d{1,2}(?:\.5)?(?:x\d{1,2})?|\d{1,2}[rwls])\b/i;
const FILLER = /\b(wow|l@@k|look|must see|great deal|nice item)\b/i;
const SPECIAL = /[*|{}<>~^]/;

export function loadTitleAuditRows(): TitleAuditRow[] {
  try {
    const raw = localStorage.getItem(REPORT_STORAGE_KEY);
    if (!raw) return [];
    const report = JSON.parse(raw) as { rows?: Record<string, string>[] };
    if (!Array.isArray(report.rows)) return [];
    return report.rows.flatMap((row, index) => {
      const title = row.Title?.trim() ?? '';
      if (!title) return [];
      return [auditTitle({
        id: `title:${index}:${row['Item number'] ?? ''}`,
        itemNumber: row['Item number']?.trim() ?? '',
        sku: row['Custom label (SKU)']?.trim() ?? '',
        title,
        category: row['eBay category 1 name']?.trim() ?? '',
      })];
    });
  } catch {
    return [];
  }
}

export function auditTitle(listing: Pick<TitleAuditRow, 'id' | 'itemNumber' | 'sku' | 'title' | 'category'>): TitleAuditRow {
  const issues: string[] = [];
  const manualGuidance: string[] = [];
  const title = listing.title.trim();
  let score = 100;

  if (title.length > 80) { score -= 30; issues.push(`${title.length} characters — exceeds eBay’s 80-character limit`); }
  else if (title.length < 35) { score -= 20; issues.push(`Only ${title.length} characters — add relevant product details`); manualGuidance.push('Add verified details such as brand, model, color, material, style, or fit.'); }
  else if (title.length < 55) { score -= 10; issues.push(`${title.length} characters — useful title space remains`); manualGuidance.push('Use remaining space for verified color, material, style, model, or fit details.'); }

  if (SPECIAL.test(title)) { score -= 10; issues.push('Contains unnecessary special characters'); }
  if (FILLER.test(title)) { score -= 15; issues.push('Contains promotional filler instead of product details'); }
  if (hasRepeatedWords(title)) { score -= 10; issues.push('Repeats one or more keywords'); }
  if (hasExcessiveCaps(title)) { score -= 10; issues.push('Uses excessive capitalization'); }
  if (looksLikeApparel(listing.category) && !APPAREL_TERMS.test(title)) { score -= 15; issues.push('Size or intended wearer may be missing'); manualGuidance.push('Add the exact size and Men’s, Women’s, Boys’, Girls’, or Unisex when applicable.'); }
  if (listing.category && !containsCategoryTerm(title, listing.category)) { score -= 10; issues.push(`Product type may not clearly match “${listing.category}”`); }

  const boundedScore = Math.max(0, Math.min(100, score));
  const suggestion = improveTitle(title, listing.category);
  return {
    ...listing,
    score: boundedScore,
    severity: boundedScore < 50 ? 'critical' : boundedScore < 80 ? 'needs-work' : 'strong',
    issues: issues.length ? issues : ['No major title issues detected'],
    suggestion,
    suggestionChanged: suggestion !== title,
    manualGuidance,
  };
}

function improveTitle(title: string, category: string) {
  let clean = title.replace(/[*|{}<>~^]+/g, ' ').replace(/\s+/g, ' ').trim();
  clean = removeRepeatedWords(clean);
  if (mostlyLowercase(clean)) clean = smartTitleCase(clean);
  const categoryTerm = preferredCategoryTerm(category);
  if (categoryTerm && !containsCategoryTerm(clean, category) && `${clean} ${categoryTerm}`.length <= 80) clean = `${clean} ${categoryTerm}`;
  if (clean.length > 80) {
    const shortened = clean.slice(0, 80);
    clean = shortened.includes(' ') ? shortened.slice(0, shortened.lastIndexOf(' ')) : shortened;
  }
  return clean;
}

function preferredCategoryTerm(category: string) {
  const terms: Record<string, string> = {
    jeans: 'Jeans',
    'casual button-down shirts': 'Button-Down Shirt',
    pants: 'Pants',
    'ccg individual cards': 'Trading Card',
    polos: 'Polo Shirt',
    'suits & suit separates': 'Suit',
    'dress shirts': 'Dress Shirt',
    sweaters: 'Sweater',
    'coats, jackets & vests': 'Jacket',
    shorts: 'Shorts',
    'shirts & tops': 'Shirt',
    'casual shoes': 'Casual Shoes',
    'activewear pants': 'Activewear Pants',
    'hoodies & sweatshirts': 'Hoodie',
    'athletic shoes': 'Athletic Shoes',
    'ccg mixed card lots': 'Trading Card Lot',
    'tops, shirts & t-shirts': 'Shirt',
    'trading card singles': 'Trading Card',
    't-shirts': 'T-Shirt',
    'dress shoes': 'Dress Shoes',
    sandals: 'Sandals',
    dresses: 'Dress',
  };
  return terms[category.toLowerCase()] ?? '';
}

function removeRepeatedWords(value: string) {
  const seen = new Set<string>();
  return value.split(/\s+/).filter((word) => {
    const normalized = word.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (normalized.length < 3 || !seen.has(normalized)) { if (normalized.length >= 3) seen.add(normalized); return true; }
    return false;
  }).join(' ');
}

function hasRepeatedWords(value: string) {
  const words = value.toLowerCase().split(/\s+/).map((word) => word.replace(/[^a-z0-9]/g, '')).filter((word) => word.length >= 4);
  return new Set(words).size < words.length;
}

function hasExcessiveCaps(value: string) {
  const words = value.split(/\s+/).filter((word) => /[a-z]/i.test(word) && word.length > 2);
  return words.length >= 3 && words.filter((word) => word === word.toUpperCase()).length / words.length > 0.5;
}

function mostlyLowercase(value: string) {
  const letters = value.replace(/[^a-z]/gi, '');
  return letters.length > 5 && letters === letters.toLowerCase();
}

function smartTitleCase(value: string) {
  const small = new Set(['and', 'or', 'of', 'the', 'with', 'for', 'in']);
  return value.split(' ').map((word, index) => {
    if (/^(xs|xl|xxl|xxxl|usa|nfl|nba|mlb)$/i.test(word)) return word.toUpperCase();
    if (index > 0 && small.has(word.toLowerCase())) return word.toLowerCase();
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

function looksLikeApparel(category: string) {
  return /shirt|jeans|pants|shorts|jacket|coat|blazer|dress|sweater|hoodie|shoe|boot|hat|cap|skirt|blouse|suit|clothing/i.test(category);
}

function containsCategoryTerm(title: string, category: string) {
  const normalizedTitle = title.toLowerCase().replace(/[^a-z0-9]+/g, ' ');
  const aliases: Record<string, string[]> = {
    't-shirts': ['t shirt', 'tee', 'shirt'],
    jeans: ['jean', 'denim'],
    pants: ['pant', 'trouser', 'chino', 'slack'],
    'suit jackets': ['suit jacket', 'blazer', 'sport coat'],
    'coats, jackets & vests': ['coat', 'jacket', 'vest', 'blazer'],
    hats: ['hat', 'cap', 'snapback'],
    'athletic shoes': ['shoe', 'sneaker', 'trainer'],
  };
  const key = category.toLowerCase();
  const terms = aliases[key] ?? key.split(/[^a-z0-9]+/).filter((term) => term.length > 3).map((term) => term.replace(/s$/, ''));
  return terms.some((term) => normalizedTitle.includes(term));
}
