export type ImportTemplateId = 'nifty-orders' | 'active-inventory' | 'inventory-locations';

export type ImportField = {
  key: string;
  label: string;
  required: boolean;
  aliases: string[];
};

export type ImportTemplate = {
  id: ImportTemplateId;
  name: string;
  description: string;
  fields: ImportField[];
};

const field = (label: string, required: boolean, ...aliases: string[]): ImportField => ({
  key: label.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
  label,
  required,
  aliases: [label, ...aliases],
});

export const IMPORT_TEMPLATES: ImportTemplate[] = [
  {
    id: 'nifty-orders',
    name: 'Nifty Orders',
    description: 'Completed sales from eBay, Poshmark, and Depop for trend and profit analysis.',
    fields: [
      field('Marketplace', true, 'Platform', 'Channel'),
      field('Item Name', true, 'Title', 'Item Title', 'Listing Title'),
      field('SKU', true, 'Custom Label', 'Stock Number'),
      field('Days Listed', true, 'Days Active', 'Days to Sell'),
      field('Order Status', false, 'Status'),
      field('Sold At', true, 'Sale Date', 'Date Sold', 'Order Date'),
      field('Buyer State', false, 'State'),
      field('Buyer Country', false, 'Country'),
      field('Sale Price', true, 'Sold Price', 'Item Price'),
      field('Collected Shipping', false, 'Shipping Collected'),
      field('Amount Refunded to Buyer', false, 'Refund', 'Refunded'),
      field('Standard Fees', false, 'Marketplace Fees', 'Fees'),
      field('Shipping Fees', false),
      field('Promoted Fees', false, 'Ad Fees'),
      field('Cost of Goods', false, 'COGS', 'Item Cost'),
      field('Shipping Expenses', false, 'Shipping Cost'),
      field('Other Expenses', false),
      field('Total Profit', true, 'Profit', 'Net Profit'),
      field('Category ID', false, 'eBay Category ID'),
      field('Category', false, 'Category Name', 'eBay Category'),
    ],
  },
  {
    id: 'active-inventory',
    name: 'Active Inventory',
    description: 'Currently listed items used to calculate sell-through, stock depth, and replenishment needs.',
    fields: [
      field('Marketplace', false, 'Platform', 'Channel'),
      field('Item Name', true, 'Title', 'Item Title', 'Listing Title'),
      field('SKU', true, 'Custom Label', 'Stock Number'),
      field('Imported/Created At', true, 'Created At', 'Imported At'),
      field('Listed At', false, 'List Date', 'Date Listed'),
      field('Listing Price', false, 'Price', 'Current Price'),
      field('Quantity', true, 'Qty', 'Available Quantity'),
      field('Brand', false),
      field('Cost of Goods', false, 'COGS', 'Item Cost'),
      field('Category ID', false, 'eBay Category ID'),
      field('Category', false, 'Category Name', 'eBay Category'),
      field('Bin', false, 'Cell', 'Location', 'Storage Location'),
    ],
  },
  {
    id: 'inventory-locations',
    name: 'Inventory Locations',
    description: 'Permanent SKU-to-bin assignments for the Inventory Map and daily pull list.',
    fields: [
      field('SKU', true, 'Custom Label', 'Stock Number'),
      field('Bin', true, 'Cell', 'Location', 'Storage Location'),
    ],
  },
];

export type ImportInspection = {
  rowCount: number;
  mappings: Array<ImportField & { sourceHeader: string | null; sample: string }>;
  missingRequired: string[];
  rowWarnings: string[];
  normalizedCsv: string;
  records: Array<Record<string, string>>;
};

export function inspectImportCsv(text: string, templateId: ImportTemplateId): ImportInspection {
  const template = IMPORT_TEMPLATES.find((item) => item.id === templateId);
  if (!template) throw new Error('Unknown import template.');
  const rows = parseCsvRows(text.replace(/^\uFEFF/, ''));
  if (rows.length < 2) throw new Error('This CSV has headers but no data rows.');
  const headers = rows[0].map((header) => header.trim());
  const normalizedHeaders = headers.map(normalizeHeader);
  const mappings = template.fields.map((item) => {
    const sourceIndex = normalizedHeaders.findIndex((header) => item.aliases.some((alias) => normalizeHeader(alias) === header));
    return {
      ...item,
      sourceHeader: sourceIndex >= 0 ? headers[sourceIndex] : null,
      sample: sourceIndex >= 0 ? rows.slice(1).find((row) => row[sourceIndex]?.trim())?.[sourceIndex]?.trim() ?? '' : '',
    };
  });
  const missingRequired = mappings.filter((item) => item.required && !item.sourceHeader).map((item) => item.label);
  const records = rows.slice(1).filter((row) => row.some((value) => value.trim())).map((row) => Object.fromEntries(mappings.map((item) => {
    const sourceIndex = item.sourceHeader == null ? -1 : headers.indexOf(item.sourceHeader);
    return [item.label, sourceIndex >= 0 ? row[sourceIndex]?.trim() ?? '' : ''];
  }))).filter((record) => normalizeHeader(record['Item Name'] ?? '') !== 'total');
  const normalizedRows = [template.fields.map((item) => item.label), ...records.map((record) => template.fields.map((item) => record[item.label] ?? ''))];
  const rowWarnings = mappings.filter((item) => item.required && item.sourceHeader).flatMap((item) => {
    const blankRows = records.filter((record) => !record[item.label]?.trim()).length;
    return blankRows ? [`${blankRows} row${blankRows === 1 ? '' : 's'} missing ${item.label}`] : [];
  });
  return {
    rowCount: records.length,
    mappings,
    missingRequired,
    rowWarnings,
    normalizedCsv: normalizedRows.map((row) => row.map(csvCell).join(',')).join('\n'),
    records,
  };
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function csvCell(value: string) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function parseCsvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') { value += '"'; index += 1; }
    else if (char === '"') quoted = !quoted;
    else if (char === ',' && !quoted) { row.push(value); value = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(value);
      if (row.some((cell) => cell.length)) rows.push(row);
      row = [];
      value = '';
    } else value += char;
  }
  row.push(value);
  if (row.some((cell) => cell.length)) rows.push(row);
  return rows;
}

export type ActiveInventoryItem = {
  id: string;
  marketplace: string;
  itemName: string;
  sku: string;
  listedAt: string;
  listingPrice: number;
  quantity: number;
  brand: string;
  costOfGoods: number;
  categoryId: string;
  categoryName: string;
  bin: string;
};

export function activeInventoryFromRecords(records: Array<Record<string, string>>): ActiveInventoryItem[] {
  return records.map((record, index) => ({
    id: `${record.Marketplace}:${record.SKU}:${index}`,
    marketplace: record.Marketplace,
    itemName: record['Item Name'],
    sku: record.SKU,
    listedAt: record['Listed At'] || record['Imported/Created At'],
    listingPrice: numeric(record['Listing Price']),
    quantity: Math.max(0, numeric(record.Quantity)),
    brand: record.Brand,
    costOfGoods: numeric(record['Cost of Goods']),
    categoryId: record['Category ID'],
    categoryName: record.Category,
    bin: record.Bin,
  }));
}

function numeric(value: string) {
  const parsed = Number(String(value ?? '').replace(/[$,()]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}
