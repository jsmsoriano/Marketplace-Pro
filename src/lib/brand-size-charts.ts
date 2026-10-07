import type { AlphaSize, Range, ShoeSize, SizeChart, WaistSize } from '@/lib/size-chart-types';

export type { AlphaSize, Range, ShoeSize, SizeChart, WaistSize } from '@/lib/size-chart-types';

const range = (min: number, max = min): Range => ({ min, max });

const RETRIEVED = '2026-10-07';

function shoes(rows: Array<[number, number | null, number | null]>): ShoeSize[] {
  return rows.map(([us, uk, eu]) => ({
    label: Number.isInteger(us) ? `US ${us}` : `US ${us}`,
    us,
    uk: uk ?? undefined,
    eu: eu ?? undefined,
  }));
}

const nikeMenShoeRows: Array<[number, number, number]> = [
  [6, 5.5, 38.5], [6.5, 6, 39], [7, 6, 40], [7.5, 6.5, 40.5], [8, 7, 41], [8.5, 7.5, 42],
  [9, 8, 42.5], [9.5, 8.5, 43], [10, 9, 44], [10.5, 9.5, 44.5], [11, 10, 45], [11.5, 10.5, 45.5],
  [12, 11, 46], [12.5, 11.5, 47], [13, 12, 47.5], [13.5, 12.5, 48], [14, 13, 48.5], [14.5, 13.5, 49], [15, 14, 49.5],
];

const levisMenShoeRows: Array<[number, number, number]> = [
  [5, 4, 36], [5.5, 4.5, 37], [6, 5, 38], [6.5, 5.5, 38.5], [7, 6, 39], [7.5, 6.5, 40],
  [8, 7, 40.5], [8.5, 7.5, 41], [9, 8, 42], [9.5, 8.5, 42.5], [10, 9, 43], [10.5, 9.5, 43.5],
  [11, 10, 44], [11.5, 10.5, 45], [12, 11, 46], [12.5, 11.5, 46.5], [13, 12, 47], [13.5, 12.5, 47.5],
  [14, 13, 48], [15, 14, 49], [16, 15, 50],
];

const levisWomenShoeRows: Array<[number, number, number]> = [
  [5, 3.5, 36], [5.5, 4, 36.5], [6, 4.5, 37], [6.5, 5, 38], [7, 5.5, 38.5], [7.5, 6, 39],
  [8, 6.5, 40], [8.5, 7, 40.5], [9, 7.5, 41], [9.5, 8, 42], [10, 8.5, 42.5], [10.5, 9, 43],
  [11, 9.5, 44], [11.5, 10, 44.5], [12, 10.5, 45], [13, 11.5, 46],
];

const tnfShoeRows: Array<[number, number, number]> = [
  [7, 6, 39], [7.5, 6.5, 40], [8, 7, 40.5], [8.5, 7.5, 41], [9, 8, 42], [9.5, 8.5, 42.5],
  [10, 9, 43], [10.5, 9.5, 44], [11, 10, 44.5], [11.5, 10.5, 45], [12, 11, 45.5], [12.5, 11.5, 46],
  [13, 12, 47], [13.5, 12.5, 47.5], [14, 13, 48], [14.5, 13.5, 49],
];

const docsShoeRows: Array<[number, number, number]> = [
  [7, 6, 39], [7.5, 6.5, 40], [8, 7, 41], [9, 8, 42], [10, 9, 43], [10.5, 9.5, 44],
  [11, 10, 45], [12, 11, 46], [13, 12, 47], [14, 13, 48], [15, 14, 49.5], [16, 15, 50.5],
];

const levisMenWaistBands = [
  { alpha: 'XS', waist: range(26, 28) },
  { alpha: 'S', waist: range(29, 31) },
  { alpha: 'M', waist: range(32, 34) },
  { alpha: 'L', waist: range(35, 37) },
  { alpha: 'XL', waist: range(38, 40) },
  { alpha: 'XXL', waist: range(41, 43) },
  { alpha: '3XL', waist: range(44, 46) },
  { alpha: '4XL', waist: range(48, 50) },
  { alpha: '5XL', waist: range(52, 54) },
];

const levisWomenWaistBands = [
  { alpha: 'XXS', waist: range(23, 24) },
  { alpha: 'XS', waist: range(25, 26) },
  { alpha: 'S', waist: range(27, 28) },
  { alpha: 'M', waist: range(29, 30) },
  { alpha: 'L', waist: range(31, 32) },
  { alpha: 'XL', waist: range(33, 34) },
  { alpha: 'XXL', waist: range(38.75) },
];

function levisMenJeans(): WaistSize[] {
  const rows: Array<[number, number, number, number, number]> = [
    [26, 26.5, 27, 32.5, 33], [27, 27.5, 28, 33.5, 34], [28, 28.5, 29, 34.5, 35], [29, 29.5, 30, 35.5, 36],
    [30, 30.5, 31, 36.5, 37], [31, 31.5, 32, 37.5, 38], [32, 32.5, 33, 38.5, 39], [33, 33.5, 34, 39.5, 40],
    [34, 34.5, 35, 40.5, 41], [35, 35.5, 36, 41.5, 42], [36, 36.5, 37.5, 42.5, 43.5], [38, 38.5, 39.5, 44.5, 45.5],
    [40, 40.5, 41.5, 46.5, 47.5], [42, 42.5, 43.5, 48.5, 49.5], [44, 44.5, 45.5, 50.5, 51.5], [46, 46.5, 47.5, 52.5, 53.5],
    [48, 48.5, 49.5, 54.5, 55.5], [50, 50.5, 51.5, 56.5, 57.5], [52, 52.5, 53.5, 58.5, 59.5], [54, 54.5, 55.5, 60.5, 61.5],
    [56, 56.5, 57.5, 62.5, 63.5], [58, 58.5, 59.5, 64.5, 65.5], [60, 60.5, 61.5, 66.5, 67.5],
  ];
  return rows.map(([waist, min, max, seatMin, seatMax]) => ({
    label: String(waist),
    waist,
    bodyWaist: range(min, max),
    seat: range(seatMin, seatMax),
  }));
}

function levisWomenJeans(): WaistSize[] {
  const rows: Array<[string, number, number, number, string]> = [
    ['24', 24, 25.25, 34, 'US 00/0'],
    ['25', 25, 26.25, 35, 'US 0/1'],
    ['26', 26, 27.25, 36, 'US 2/3'],
    ['27', 27, 28.25, 37, 'US 4/5'],
    ['28', 28, 29.25, 38, 'US 6/7'],
    ['29', 29, 30.25, 39, 'US 8/9'],
    ['30', 30, 31.25, 40, 'US 10/11'],
    ['31', 31, 32.75, 41.5, 'US 12/13'],
    ['32', 32, 34.25, 43, 'US 14/15'],
    ['33', 33, 35.75, 44.5, 'US 16/17'],
    ['34', 34, 37.75, 46.5, 'US 18/20'],
  ];
  return rows.map(([label, waist, body, hip, note]) => ({
    label,
    waist,
    bodyWaist: range(body),
    hip: range(hip),
    note,
  }));
}

const nikeMenTops: AlphaSize[] = [
  { label: 'XXS', alphas: ['XXS'], chest: range(28.1, 31.5), waist: range(22.5, 25.5), hip: range(28.5, 31.5) },
  { label: 'XS', alphas: ['XS'], chest: range(31.5, 35), waist: range(25.5, 29), hip: range(31.5, 35) },
  { label: 'S', alphas: ['S'], chest: range(35, 37.5), waist: range(29, 32), hip: range(35, 37.5) },
  { label: 'M', alphas: ['M'], chest: range(37.5, 41), waist: range(32, 35), hip: range(37.5, 41) },
  { label: 'L', alphas: ['L'], chest: range(41, 44), waist: range(35, 38), hip: range(41, 44) },
  { label: 'XL', alphas: ['XL'], chest: range(44, 48.5), waist: range(38, 43), hip: range(44, 47) },
  { label: 'XXL', alphas: ['XXL'], chest: range(48.5, 53.5), waist: range(43, 47.5), hip: range(47, 50.5) },
  { label: '3XL', alphas: ['3XL'], chest: range(53.5, 58), waist: range(47.5, 52.5), hip: range(50.5, 53.5) },
  { label: '4XL', alphas: ['4XL'], chest: range(58, 63), waist: range(52.5, 57), hip: range(53.5, 58.5) },
];

const levisMenTops: AlphaSize[] = [
  { label: 'XS', alphas: ['XS'], neck: range(14.75, 14.9), chest: range(32, 34), waist: range(26, 28), seat: range(32, 34) },
  { label: 'S', alphas: ['S'], neck: range(15, 15.25), chest: range(35, 37), waist: range(29, 31), seat: range(35, 37) },
  { label: 'M', alphas: ['M'], neck: range(15.4, 15.75), chest: range(38, 40), waist: range(32, 34), seat: range(38, 40) },
  { label: 'L', alphas: ['L'], neck: range(16.1, 16.5), chest: range(41, 43), waist: range(35, 37), seat: range(41, 43) },
  { label: 'XL', alphas: ['XL'], neck: range(16.9, 17.25), chest: range(44, 46), waist: range(38, 40), seat: range(44, 46) },
  { label: 'XXL', alphas: ['XXL'], neck: range(17.6, 18), chest: range(47, 49), waist: range(41, 43), seat: range(47, 49) },
  { label: '3XL', alphas: ['3XL'], neck: range(18.4, 18.75), chest: range(50, 52), waist: range(44, 46), seat: range(50, 52) },
  { label: '4XL', alphas: ['4XL'], neck: range(19.1, 19.5), chest: range(54, 56), waist: range(48, 50), seat: range(54, 56) },
  { label: '5XL', alphas: ['5XL'], neck: range(20.1, 20.5), chest: range(58, 60), waist: range(52, 54), seat: range(58, 60) },
];

const levisWomenTops: AlphaSize[] = [
  { label: 'XXS', alphas: ['XXS'], chest: range(31), waist: range(24.25), hip: range(34) },
  { label: 'XS', alphas: ['XS'], chest: range(33), waist: range(26.25), hip: range(36) },
  { label: 'S', alphas: ['S'], chest: range(35), waist: range(28.25), hip: range(38) },
  { label: 'M', alphas: ['M'], chest: range(37), waist: range(30.25), hip: range(40) },
  { label: 'L', alphas: ['L'], chest: range(39.5), waist: range(32.75), hip: range(42.5) },
  { label: 'XL', alphas: ['XL'], chest: range(42.5), waist: range(35.75), hip: range(45.5) },
  { label: 'XXL', alphas: ['XXL'], chest: range(45.5), waist: range(38.75), hip: range(48.5) },
];

const underArmourMenTops: AlphaSize[] = [
  { label: 'XS', alphas: ['XS'], chest: range(31, 34), waist: range(28, 29) },
  { label: 'SM', alphas: ['SM'], chest: range(34, 37), waist: range(29, 31) },
  { label: 'MD', alphas: ['MD'], chest: range(37, 41), waist: range(31, 34) },
  { label: 'LG', alphas: ['LG'], chest: range(41, 44), waist: range(34, 37) },
  { label: 'XL', alphas: ['XL'], chest: range(44, 48), waist: range(37, 41) },
  { label: 'XXL', alphas: ['XXL'], chest: range(48, 52), waist: range(41, 45.5) },
  { label: '3XL', alphas: ['3XL'], chest: range(52, 56), waist: range(45.5, 50) },
  { label: '4XL', alphas: ['4XL'], chest: range(56, 60), waist: range(50, 54.5) },
  { label: '5XL', alphas: ['5XL'], chest: range(60, 64), waist: range(54.5, 59) },
];

const tnfJackets: AlphaSize[] = [
  { label: 'XXS', alphas: ['XXS'], chest: range(29, 32.5), hip: range(31.5, 32.5) },
  { label: 'XS', alphas: ['XS'], chest: range(33, 35), hip: range(33, 34) },
  { label: 'S', alphas: ['S'], chest: range(36, 38), hip: range(35, 37) },
  { label: 'M', alphas: ['M'], chest: range(39, 41), hip: range(38, 40) },
  { label: 'L', alphas: ['L'], chest: range(42, 44), hip: range(41, 43) },
  { label: 'XL', alphas: ['XL'], chest: range(45, 48), hip: range(44, 46) },
  { label: '2XL', alphas: ['2XL'], chest: range(49, 52), hip: range(47, 49) },
  { label: '3XL', alphas: ['3XL'], chest: range(53, 56), hip: range(50, 52) },
];

const tnfTees: AlphaSize[] = [
  { label: '2XS', alphas: ['2XS'], chest: range(30, 33), hip: range(31, 33) },
  { label: 'XS', alphas: ['XS'], chest: range(33.5, 36.5), hip: range(33.5, 35.5) },
  { label: 'S', alphas: ['S'], chest: range(37, 39.5), hip: range(36, 38.5) },
  { label: 'M', alphas: ['M'], chest: range(40, 42.5), hip: range(39, 41.5) },
  { label: 'L', alphas: ['L'], chest: range(43, 46), hip: range(42, 44.5) },
  { label: 'XL', alphas: ['XL'], chest: range(46.5, 49.5), hip: range(45, 47.5) },
  { label: '2XL', alphas: ['2XL'], chest: range(50, 54), hip: range(48, 51) },
  { label: '3XL', alphas: ['3XL'], chest: range(54.5, 58.5), hip: range(51.5, 54) },
];

const lacosteMenTops: AlphaSize[] = [
  { label: 'XS', alphas: ['XS'], chest: range(34), waist: range(28) },
  { label: 'S', alphas: ['S'], chest: range(35, 37), waist: range(30, 31) },
  { label: 'M', alphas: ['M'], chest: range(38, 40), waist: range(33, 35) },
  { label: 'L', alphas: ['L'], chest: range(41, 43), waist: range(36, 38) },
  { label: 'XL', alphas: ['XL'], chest: range(44, 46), waist: range(39, 42) },
  { label: '2XL', alphas: ['2XL'], chest: range(48, 49), waist: range(44, 46) },
  { label: '3XL', alphas: ['3XL'], chest: range(51), waist: range(48) },
  { label: '4X', alphas: ['4X'], chest: range(53), waist: range(50) },
];

const lacosteMenShirts: AlphaSize[] = [
  { label: 'XS-S', alphas: ['XS', 'S'], neck: range(14), chest: range(35), waist: range(30) },
  { label: 'S', alphas: ['S'], neck: range(14.5), chest: range(37), waist: range(31) },
  { label: 'S-M', alphas: ['S', 'M'], neck: range(15), chest: range(38), waist: range(33) },
  { label: 'M', alphas: ['M'], neck: range(15.5), chest: range(40), waist: range(35) },
  { label: 'M-L', alphas: ['M', 'L'], neck: range(15.8), chest: range(41), waist: range(36) },
  { label: 'L', alphas: ['L'], neck: range(16), chest: range(43), waist: range(38) },
  { label: 'L-XL', alphas: ['L', 'XL'], neck: range(16.7), chest: range(44), waist: range(39) },
  { label: 'XL', alphas: ['XL'], neck: range(17), chest: range(46), waist: range(42) },
  { label: 'XL-2XL', alphas: ['XL', '2XL'], neck: range(17.5), chest: range(48), waist: range(44) },
  { label: '2XL', alphas: ['2XL'], neck: range(18), chest: range(49), waist: range(46) },
  { label: '1XG', alphas: ['1XG'], neck: range(18.7), chest: range(53), waist: range(50) },
  { label: '2XG', alphas: ['2XG'], neck: range(19.5), chest: range(57), waist: range(54) },
];

const lacosteWomenTops: AlphaSize[] = [
  { label: 'XS', alphas: ['XS'], chest: range(31), waist: range(24), hip: range(34) },
  { label: 'S', alphas: ['S'], chest: range(32, 34), waist: range(25, 27), hip: range(35, 37) },
  { label: 'M', alphas: ['M'], chest: range(35, 37), waist: range(28, 30), hip: range(39, 40) },
  { label: 'L', alphas: ['L'], chest: range(39, 40), waist: range(31, 33), hip: range(42, 43) },
  { label: 'XL', alphas: ['XL'], chest: range(42, 44), waist: range(35, 37), hip: range(45, 47) },
];

const brooksShirts: AlphaSize[] = [
  { label: 'XS', alphas: ['XS'], chest: range(32, 34), neck: range(14.5, 15) },
  { label: 'S', alphas: ['S'], chest: range(35, 37), neck: range(15, 15.5) },
  { label: 'M', alphas: ['M'], chest: range(38, 40), neck: range(15.5, 16) },
  { label: 'L', alphas: ['L'], chest: range(41, 43), neck: range(16, 16.5) },
  { label: 'XL', alphas: ['XL'], chest: range(44, 47), neck: range(16.5, 17) },
  { label: '2XL', alphas: ['2XL'], chest: range(48, 51), neck: range(17, 17.5) },
  { label: '3XL', alphas: ['3XL'], chest: range(52, 56), neck: range(17.5, 18) },
  { label: '4XL', alphas: ['4XL'], chest: range(57, 61), neck: range(18, 18.5) },
];

function tnfPants(): WaistSize[] {
  const rows: Array<[string, number, number, number, number, number, string]> = [
    ['28', 28, 28, 30, 33.5, 35.5, 'XS'],
    ['30', 30, 30.5, 32, 36, 38, 'S'],
    ['32', 32, 32.5, 33.5, 38, 39.5, 'M'],
    ['34', 34, 33.5, 35, 39.5, 41, 'M'],
    ['36', 36, 35, 36, 41, 42.5, 'L'],
    ['38', 38, 36.5, 38.5, 42.5, 44, 'L'],
    ['40', 40, 39, 40, 44, 45.5, 'XL'],
    ['42', 42, 40.5, 42.5, 45.5, 47, 'XL'],
    ['44', 44, 43, 45, 47, 48.5, '2XL'],
  ];
  return rows.map(([label, waist, min, max, hipMin, hipMax, alpha]) => ({
    label,
    waist,
    bodyWaist: range(min, max),
    hip: range(hipMin, hipMax),
    alpha,
  }));
}

export const SIZE_CHARTS: SizeChart[] = [
  {
    id: 'nike-men-tops',
    brand: 'Nike',
    department: 'Men',
    garment: 'Tops',
    family: 'alpha',
    sourceName: "Nike men's tops size chart",
    sourceUrl: 'https://www.nike.com/size-fit/mens_tops_alpha',
    retrieved: RETRIEVED,
    notes: 'Body measurements. Nike tall sizes use the same chest and are not a separate eBay Size.',
    alphaSizes: nikeMenTops,
  },
  {
    id: 'nike-men-shoes',
    brand: 'Nike',
    department: 'Men',
    garment: 'Shoes',
    family: 'shoes',
    sourceName: "Nike men's footwear size chart",
    sourceUrl: 'https://www.nike.com/size-fit/mens-footwear',
    retrieved: RETRIEVED,
    notes: 'US 6–15 from the official chart. Nike UK 6 is listed for both US 6.5 and US 7.',
    shoeSizes: shoes(nikeMenShoeRows),
  },
  {
    id: 'levis-men-tops',
    brand: "Levi's",
    department: 'Men',
    garment: 'Tops',
    family: 'alpha',
    sourceName: "Levi's US size guide, men's tops",
    sourceUrl: 'https://www.levi.com/US/en_US/info/sizeguide',
    retrieved: RETRIEVED,
    alphaSizes: levisMenTops,
  },
  {
    id: 'levis-men-jeans',
    brand: "Levi's",
    department: 'Men',
    garment: 'Jeans',
    family: 'waist',
    sourceName: "Levi's US size guide, men's waist",
    sourceUrl: 'https://www.levi.com/US/en_US/info/sizeguide',
    retrieved: RETRIEVED,
    notes: 'Labeled jean size is the tag waist. Body waist on the chart runs about half an inch larger. UK letter size uses the waist bands from the Levi\'s men\'s tops chart.',
    waistSizes: levisMenJeans(),
    alphaWaistBands: levisMenWaistBands,
  },
  {
    id: 'levis-men-shoes',
    brand: "Levi's",
    department: 'Men',
    garment: 'Shoes',
    family: 'shoes',
    sourceName: "Levi's US size guide, men's shoes",
    sourceUrl: 'https://www.levi.com/US/en_US/info/sizeguide',
    retrieved: RETRIEVED,
    shoeSizes: shoes(levisMenShoeRows),
  },
  {
    id: 'levis-women-tops',
    brand: "Levi's",
    department: 'Women',
    garment: 'Tops',
    family: 'alpha',
    sourceName: "Levi's US size guide, women's tops",
    sourceUrl: 'https://www.levi.com/US/en_US/info/sizeguide',
    retrieved: RETRIEVED,
    alphaSizes: levisWomenTops,
  },
  {
    id: 'levis-women-jeans',
    brand: "Levi's",
    department: 'Women',
    garment: 'Jeans',
    family: 'waist',
    sourceName: "Levi's US size guide, women's bottoms",
    sourceUrl: 'https://www.levi.com/US/en_US/info/sizeguide',
    retrieved: RETRIEVED,
    notes: 'Jean size is Levi\'s numbered waist. The US ready-to-wear pair (00/0, 2/3, and so on) is kept in the description.',
    waistSizes: levisWomenJeans(),
    alphaWaistBands: levisWomenWaistBands,
  },
  {
    id: 'levis-women-shoes',
    brand: "Levi's",
    department: 'Women',
    garment: 'Shoes',
    family: 'shoes',
    sourceName: "Levi's US size guide, women's shoes",
    sourceUrl: 'https://www.levi.com/US/en_US/info/sizeguide',
    retrieved: RETRIEVED,
    shoeSizes: shoes(levisWomenShoeRows),
  },
  {
    id: 'ua-men-tops',
    brand: 'Under Armour',
    department: 'Men',
    garment: 'Tops',
    family: 'alpha',
    sourceName: "Under Armour men's shirts and tops size chart",
    sourceUrl: 'https://www.underarmour.com/en-us/t/size-guide/mens-tops/',
    retrieved: RETRIEVED,
    notes: 'Under Armour prints SM, MD, and LG. Those become S, M, and L.',
    alphaSizes: underArmourMenTops,
  },
  {
    id: 'tnf-men-jackets',
    brand: 'The North Face',
    department: 'Men',
    garment: 'Jackets and tops',
    family: 'alpha',
    sourceName: "The North Face US men's jackets and tops chart",
    sourceUrl: 'https://www.thenorthface.com/en-us/help/size-charts',
    retrieved: RETRIEVED,
    alphaSizes: tnfJackets,
  },
  {
    id: 'tnf-men-tees',
    brand: 'The North Face',
    department: 'Men',
    garment: 'Short-sleeve shirts',
    family: 'alpha',
    sourceName: "The North Face US men's short-sleeve shirt chart",
    sourceUrl: 'https://www.thenorthface.com/en-us/help/size-charts',
    retrieved: RETRIEVED,
    alphaSizes: tnfTees,
  },
  {
    id: 'tnf-men-pants',
    brand: 'The North Face',
    department: 'Men',
    garment: 'Pants',
    family: 'waist',
    sourceName: "The North Face US men's pants chart",
    sourceUrl: 'https://www.thenorthface.com/en-us/help/size-charts',
    retrieved: RETRIEVED,
    notes: 'The chart assigns one letter to a pair of waists (32 and 34 are both M). Inseam is short 30, regular 32, or long 34, and stays out of the Size field.',
    waistSizes: tnfPants(),
  },
  {
    id: 'tnf-men-shoes',
    brand: 'The North Face',
    department: 'Men',
    garment: 'Shoes',
    family: 'shoes',
    sourceName: "The North Face US men's footwear chart",
    sourceUrl: 'https://www.thenorthface.com/en-us/help/size-charts',
    retrieved: RETRIEVED,
    shoeSizes: shoes(tnfShoeRows),
  },
  {
    id: 'lacoste-men-tops',
    brand: 'Lacoste',
    department: 'Men',
    garment: 'Tops',
    family: 'alpha',
    sourceName: "Lacoste US men's letter size chart",
    sourceUrl: 'https://www.lacoste.com/us/sizeguide',
    retrieved: RETRIEVED,
    alphaSizes: lacosteMenTops,
  },
  {
    id: 'lacoste-men-shirts',
    brand: 'Lacoste',
    department: 'Men',
    garment: 'Dress shirts',
    family: 'alpha',
    sourceName: "Lacoste US men's shirt size chart",
    sourceUrl: 'https://www.lacoste.com/us/sizeguide',
    retrieved: RETRIEVED,
    notes: 'A hyphenated Lacoste size such as M-L is two eBay sizes. Neck stays in the description because the Size field takes one value.',
    alphaSizes: lacosteMenShirts,
  },
  {
    id: 'lacoste-men-shoes',
    brand: 'Lacoste',
    department: 'Men',
    garment: 'Shoes',
    family: 'shoes',
    sourceName: "Lacoste US men's footwear chart",
    sourceUrl: 'https://www.lacoste.com/us/sizeguide',
    retrieved: RETRIEVED,
    notes: 'This chart publishes US and EU only.',
    shoeSizes: shoes([
      [7, null, 39.5], [7.5, null, 40], [8, null, 40.5], [8.5, null, 41], [9, null, 42], [9.5, null, 42.5],
      [10, null, 43], [10.5, null, 44], [11, null, 44.5], [11.5, null, 45], [12, null, 46], [12.5, null, 46.5],
      [13, null, 47], [14, null, 48], [15, null, 49],
    ]),
  },
  {
    id: 'lacoste-women-tops',
    brand: 'Lacoste',
    department: 'Women',
    garment: 'Tops',
    family: 'alpha',
    sourceName: "Lacoste US women's letter size chart",
    sourceUrl: 'https://www.lacoste.com/us/sizeguide',
    retrieved: RETRIEVED,
    alphaSizes: lacosteWomenTops,
  },
  {
    id: 'lacoste-women-shoes',
    brand: 'Lacoste',
    department: 'Women',
    garment: 'Shoes',
    family: 'shoes',
    sourceName: "Lacoste US women's footwear chart",
    sourceUrl: 'https://www.lacoste.com/us/sizeguide',
    retrieved: RETRIEVED,
    notes: 'This chart publishes US and EU only.',
    shoeSizes: shoes([
      [5, null, 35.5], [5.5, null, 36], [6, null, 37], [6.5, null, 37.5], [7, null, 38], [7.5, null, 39],
      [8, null, 39.5], [8.5, null, 40], [9, null, 40.5], [9.5, null, 41], [10, null, 42], [10.5, null, 42.5], [11, null, 43],
    ]),
  },
  {
    id: 'brooks-men-shirts',
    brand: 'Brooks Brothers',
    department: 'Men',
    garment: 'Dress shirts',
    family: 'alpha',
    sourceName: 'Brooks Brothers BB18000 size chart',
    sourceUrl: 'https://docs.companycasuals.com/productspecifications/SpecSheetMeasurements_BB18000.pdf',
    retrieved: RETRIEVED,
    notes: 'Neck is a range on the chart, so the Size field uses the letter. Put the neck range in the description, or the single neck printed on the garment tag if you have it.',
    alphaSizes: brooksShirts,
  },
  {
    id: 'drmartens-men-shoes',
    brand: 'Dr. Martens',
    department: 'Men',
    garment: 'Shoes',
    family: 'shoes',
    sourceName: "Dr. Martens men's size guide",
    sourceUrl: 'https://www.drmartens.com/eu/en_eu/shoe-size-guide',
    retrieved: RETRIEVED,
    notes: 'The published chart skips some half sizes, including US 8.5.',
    shoeSizes: shoes(docsShoeRows),
  },
];

export function brandsWithCharts(): string[] {
  return [...new Set(SIZE_CHARTS.map((chart) => chart.brand))];
}

export function chartsForBrand(brand: string): SizeChart[] {
  return SIZE_CHARTS.filter((chart) => chart.brand === brand);
}

export function chartById(id: string): SizeChart | undefined {
  return SIZE_CHARTS.find((chart) => chart.id === id);
}
