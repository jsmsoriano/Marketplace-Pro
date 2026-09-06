import type { NiftyOrder } from '@/lib/orders';

type DemoInput = Pick<
  NiftyOrder,
  'marketplace' | 'itemName' | 'sku' | 'brand' | 'daysListed' | 'soldAt' | 'salePrice' | 'costOfGoods' | 'totalProfit'
> & { promotedFees?: number; collectedShipping?: number };

function order(input: DemoInput): NiftyOrder {
  return {
    id: `demo-${input.sku}`,
    orderStatus: 'Completed',
    buyerState: '',
    buyerCountry: 'US',
    refunded: 0,
    standardFees: Number((input.salePrice * 0.13).toFixed(2)),
    shippingFees: 0,
    shippingExpenses: 0,
    otherExpenses: 0,
    promotedFees: input.promotedFees ?? 0,
    collectedShipping: input.collectedShipping ?? 0,
    ...input,
  };
}

export const demoOrders: NiftyOrder[] = [
  order({ marketplace: 'eBay', itemName: 'Free People We The Free Barrel Jeans', sku: 'D-101', brand: 'Free People', daysListed: 11, soldAt: '2026-08-31 11:20:00', salePrice: 58, costOfGoods: 12, totalProfit: 35.46, promotedFees: 3.1 }),
  order({ marketplace: 'Poshmark', itemName: 'Free People Quilted Dolman Jacket', sku: 'D-102', brand: 'Free People', daysListed: 18, soldAt: '2026-08-28 14:10:00', salePrice: 72, costOfGoods: 16, totalProfit: 41.6 }),
  order({ marketplace: 'Depop', itemName: 'Free People Good Luck Cord Jeans', sku: 'D-103', brand: 'Free People', daysListed: 9, soldAt: '2026-08-24 09:32:00', salePrice: 64, costOfGoods: 14, totalProfit: 41.68 }),
  order({ marketplace: 'eBay', itemName: 'Free People Movement Cropped Pullover', sku: 'D-104', brand: 'Free People', daysListed: 22, soldAt: '2026-08-15 16:45:00', salePrice: 39, costOfGoods: 9, totalProfit: 23.93 }),
  order({ marketplace: 'Depop', itemName: 'Smoke Rise Distressed Stacked Jeans', sku: 'D-105', brand: 'Smoke Rise', daysListed: 8, soldAt: '2026-08-30 10:05:00', salePrice: 42, costOfGoods: 8, totalProfit: 28.54 }),
  order({ marketplace: 'eBay', itemName: 'Smoke Rise Cargo Utility Jeans', sku: 'D-106', brand: 'Smoke Rise', daysListed: 16, soldAt: '2026-08-20 19:20:00', salePrice: 38, costOfGoods: 8, totalProfit: 24.96, promotedFees: 2.1 }),
  order({ marketplace: 'Depop', itemName: 'True Religion Y2K Joey Flare Jeans', sku: 'D-107', brand: 'True Religion', daysListed: 13, soldAt: '2026-08-27 12:15:00', salePrice: 68, costOfGoods: 15, totalProfit: 44.16 }),
  order({ marketplace: 'Poshmark', itemName: 'True Religion Billy Bootcut Jeans', sku: 'D-108', brand: 'True Religion', daysListed: 34, soldAt: '2026-08-11 08:40:00', salePrice: 54, costOfGoods: 13, totalProfit: 30.2 }),
  order({ marketplace: 'eBay', itemName: 'Levis 501 Made in USA Vintage Jeans', sku: 'D-109', brand: "Levi's", daysListed: 27, soldAt: '2026-08-18 13:00:00', salePrice: 76, costOfGoods: 18, totalProfit: 45.12, promotedFees: 3 }),
  order({ marketplace: 'Poshmark', itemName: 'Patagonia Synchilla Snap T Fleece', sku: 'D-110', brand: 'Patagonia', daysListed: 19, soldAt: '2026-08-08 17:28:00', salePrice: 52, costOfGoods: 12, totalProfit: 29.6 }),
  order({ marketplace: 'eBay', itemName: 'Carhartt Detroit Blanket Lined Jacket', sku: 'D-111', brand: 'Carhartt', daysListed: 31, soldAt: '2026-08-05 15:15:00', salePrice: 89, costOfGoods: 24, totalProfit: 49.43, promotedFees: 4 }),
  order({ marketplace: 'Depop', itemName: 'J Crew Linen Blend Vest Womens', sku: 'D-112', brand: 'J.Crew', daysListed: 71, soldAt: '2026-08-03 11:10:00', salePrice: 28, costOfGoods: 7, totalProfit: 17.36 }),
  order({ marketplace: 'eBay', itemName: 'Free People Printed Maxi Dress', sku: 'D-113', brand: 'Free People', daysListed: 42, soldAt: '2026-07-24 10:20:00', salePrice: 48, costOfGoods: 12, totalProfit: 28.76 }),
  order({ marketplace: 'Poshmark', itemName: 'Free People Oversized Tunic Top', sku: 'D-114', brand: 'Free People', daysListed: 36, soldAt: '2026-07-15 15:20:00', salePrice: 34, costOfGoods: 9, totalProfit: 18.2 }),
  order({ marketplace: 'Depop', itemName: 'Smoke Rise Slim Moto Jeans', sku: 'D-115', brand: 'Smoke Rise', daysListed: 49, soldAt: '2026-07-21 18:30:00', salePrice: 31, costOfGoods: 8, totalProfit: 18.97 }),
  order({ marketplace: 'eBay', itemName: 'True Religion Ricky Straight Jeans', sku: 'D-116', brand: 'True Religion', daysListed: 56, soldAt: '2026-07-10 10:00:00', salePrice: 44, costOfGoods: 13, totalProfit: 24.28 }),
  order({ marketplace: 'Poshmark', itemName: 'Patagonia Better Sweater Jacket', sku: 'D-117', brand: 'Patagonia', daysListed: 28, soldAt: '2026-07-05 14:25:00', salePrice: 46, costOfGoods: 13, totalProfit: 23.8 }),
  order({ marketplace: 'eBay', itemName: 'Carhartt Relaxed Fit Work Pants', sku: 'D-118', brand: 'Carhartt', daysListed: 38, soldAt: '2026-06-29 09:18:00', salePrice: 36, costOfGoods: 9, totalProfit: 21.32 }),
];
