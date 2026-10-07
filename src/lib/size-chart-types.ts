export type Range = { min: number; max: number };

export type AlphaSize = {
  label: string;
  /** One brand alpha, or two when the official label spans a hyphen. */
  alphas: string[];
  chest?: Range;
  waist?: Range;
  hip?: Range;
  neck?: Range;
  seat?: Range;
};

export type WaistSize = {
  label: string;
  waist: number;
  bodyWaist: Range;
  hip?: Range;
  seat?: Range;
  /** Letter printed on the brand chart for this waist, when the chart assigns one. */
  alpha?: string;
  note?: string;
};

export type ShoeSize = {
  label: string;
  us: number;
  uk?: number;
  eu?: number;
};

export type SizeChart = {
  id: string;
  brand: string;
  department: 'Men' | 'Women';
  garment: string;
  family: 'alpha' | 'waist' | 'shoes';
  sourceName: string;
  sourceUrl: string;
  retrieved: string;
  notes?: string;
  alphaSizes?: AlphaSize[];
  waistSizes?: WaistSize[];
  shoeSizes?: ShoeSize[];
  /** Used for UK letter sizes when a waist chart does not print a letter on each row. */
  alphaWaistBands?: Array<{ alpha: string; waist: Range }>;
};
