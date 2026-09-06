import {
  filterOrdersByPeriod,
  inferBrand,
  orderRevenue,
  previousPeriodOrders,
  type NiftyOrder,
  type Period,
} from '@/lib/orders';

export type Direction = 'Rising' | 'Steady' | 'Cooling' | 'New signal';
export type Confidence = 'High' | 'Medium' | 'Low';
export type BuySignal = 'Strong buy' | 'Selective buy' | 'Hold' | 'Avoid';

export type BrandRecommendation = {
  brand: string;
  units: number;
  previousUnits: number;
  revenue: number;
  profit: number;
  margin: number;
  averagePrice: number;
  averageCogs: number;
  averageDaysListed: number;
  medianDaysListed: number;
  soldWithin30Days: number;
  direction: Direction;
  change: number | null;
  score: number;
  confidence: Confidence;
  recommendedUnits: number;
  maxBuyCost: number;
  topMarketplace: string;
  buySignal: BuySignal;
};

export function summarizeOrders(orders: NiftyOrder[]) {
  const revenue = sum(orders, orderRevenue);
  const profit = sum(orders, (order) => order.totalProfit);
  const salePrice = sum(orders, (order) => order.salePrice);
  const fees = sum(orders, (order) => order.standardFees + order.shippingFees + order.promotedFees);
  return {
    orders: orders.length,
    revenue,
    profit,
    margin: revenue ? profit / revenue : 0,
    averageSalePrice: orders.length ? salePrice / orders.length : 0,
    averageDaysListed: orders.length ? sum(orders, (order) => order.daysListed) / orders.length : 0,
    fees,
    roi: sum(orders, (order) => order.costOfGoods) ? profit / sum(orders, (order) => order.costOfGoods) : 0,
  };
}

export function marketplaceBreakdown(orders: NiftyOrder[]) {
  return groupBy(orders, (order) => order.marketplace)
    .map(([marketplace, marketplaceOrders]) => ({
      marketplace,
      ...summarizeOrders(marketplaceOrders),
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

export function brandRecommendations(allOrders: NiftyOrder[], period: Period): BrandRecommendation[] {
  const current = filterOrdersByPeriod(allOrders, period);
  const previous = previousPeriodOrders(allOrders, period);
  const previousByBrand = new Map(groupBy(previous, normalizedBrand));

  return groupBy(current, normalizedBrand)
    .map(([brand, orders]) => {
      const summary = summarizeOrders(orders);
      const priorUnits = previousByBrand.get(brand)?.length ?? 0;
      const change = priorUnits ? (orders.length - priorUnits) / priorUnits : null;
      const direction = trendDirection(orders.length, priorUnits, change);
      const velocityScore = clamp(100 - summary.averageDaysListed / 1.2, 0, 100);
      const marginScore = clamp(summary.margin * 180, 0, 100);
      const demandScore = clamp(orders.length * 18, 0, 100);
      const trendScore = change == null ? 62 : clamp(50 + change * 45, 0, 100);
      const score = Math.round(velocityScore * 0.35 + marginScore * 0.3 + demandScore * 0.2 + trendScore * 0.15);
      const averageCogs = orders.length ? sum(orders, (order) => order.costOfGoods) / orders.length : 0;
      const medianDaysListed = median(orders.map((order) => order.daysListed));
      const soldWithin30Days = orders.length ? orders.filter((order) => order.daysListed <= 30).length / orders.length : 0;
      const platform = marketplaceBreakdown(orders)[0]?.marketplace ?? '—';
      const recommendedUnits = Math.max(1, Math.min(8, Math.round(orders.length * (direction === 'Rising' ? 1.25 : direction === 'Cooling' ? 0.5 : 0.85))));

      return {
        brand,
        units: orders.length,
        previousUnits: priorUnits,
        revenue: summary.revenue,
        profit: summary.profit,
        margin: summary.margin,
        averagePrice: summary.averageSalePrice,
        averageCogs,
        averageDaysListed: summary.averageDaysListed,
        medianDaysListed,
        soldWithin30Days,
        direction,
        change,
        score,
        confidence: confidenceForUnits(orders.length),
        recommendedUnits,
        maxBuyCost: Math.max(0, summary.averageSalePrice * 0.42),
        topMarketplace: platform,
        buySignal: buySignalFor({ units: orders.length, medianDaysListed, margin: summary.margin, direction }),
      };
    })
    .sort((a, b) => b.score - a.score);
}

export function recentSales(orders: NiftyOrder[], limit = 6): NiftyOrder[] {
  return [...orders]
    .sort((a, b) => b.soldAt.localeCompare(a.soldAt))
    .slice(0, limit);
}

export function weeklySales(orders: NiftyOrder[], weeks = 8) {
  if (!orders.length) return [];
  const latest = Math.max(...orders.map((order) => new Date(order.soldAt.replace(' ', 'T')).getTime()));
  return Array.from({ length: weeks }, (_, index) => {
    const reverseIndex = weeks - index - 1;
    const end = latest - reverseIndex * 7 * 86_400_000;
    const start = end - 7 * 86_400_000;
    const periodOrders = orders.filter((order) => {
      const sold = new Date(order.soldAt.replace(' ', 'T')).getTime();
      return sold > start && sold <= end;
    });
    return {
      label: new Date(end).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: sum(periodOrders, orderRevenue),
      profit: sum(periodOrders, (order) => order.totalProfit),
      orders: periodOrders.length,
    };
  });
}

function trendDirection(current: number, previous: number, change: number | null): Direction {
  if (current > 0 && previous === 0) return 'New signal';
  if (change != null && change >= 0.2) return 'Rising';
  if (change != null && change <= -0.2) return 'Cooling';
  return 'Steady';
}

function confidenceForUnits(units: number): Confidence {
  if (units >= 6) return 'High';
  if (units >= 3) return 'Medium';
  return 'Low';
}

function buySignalFor({ units, medianDaysListed, margin, direction }: { units: number; medianDaysListed: number; margin: number; direction: Direction }): BuySignal {
  if (units < 3) return 'Hold';
  if (medianDaysListed > 120 || margin < 0.2 || (direction === 'Cooling' && medianDaysListed > 60)) return 'Avoid';
  if (units >= 5 && medianDaysListed <= 30 && margin >= 0.35 && direction !== 'Cooling') return 'Strong buy';
  if (medianDaysListed <= 75 && margin >= 0.25) return 'Selective buy';
  return 'Hold';
}

function groupBy<T>(values: T[], getKey: (value: T) => string): Array<[string, T[]]> {
  const groups = new Map<string, T[]>();
  for (const value of values) {
    const key = getKey(value);
    groups.set(key, [...(groups.get(key) ?? []), value]);
  }
  return [...groups.entries()];
}

function normalizedBrand(order: NiftyOrder): string {
  return inferBrand(order.itemName);
}

function sum<T>(values: T[], getValue: (value: T) => number): number {
  return values.reduce((total, value) => total + getValue(value), 0);
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
