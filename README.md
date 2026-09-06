# Marketplace Pro

Marketplace Pro turns Nifty order exports into sourcing decisions for cross-listed inventory on eBay, Poshmark, and Depop.

## MVP workflow

1. Import a Nifty order CSV.
2. Review revenue, profit, margin, days-to-sell, platform mix, and brand performance.
3. Open the sourcing queue for prioritized brands, unit targets, and maximum buy costs.
4. Validate a recommendation against your authenticated eBay seller orders and last-30-days social/fashion signals.
5. Optimize the listing title and description, with pricing guidance from your own matching sales.

The browser stores imported order data locally. No order data is sent to a hosted database.

## Routes

| Route | Purpose |
|---|---|
| `/` | Sales and brand-performance dashboard |
| `/sourcing` | Confidence-aware buying recommendations |
| `/pull-list` | Daily cross-platform SKU pull workflow |
| `/inventory` | Shelf/bin capacity map with multiple SKUs per bin |
| `/research` | Store trends by brand, item type, and marketplace plus external validation |
| `/optimize` | Listing title, description, and pricing assistant |

## Metrics

- **Net revenue:** sale price + collected shipping − refunds
- **Profit and margin:** uses Nifty's exported Total Profit
- **Sales velocity:** median Days Listed and percent sold within 30 days
- **Buy score:** 35% velocity, 30% margin, 20% repeat demand, 15% period direction
- **Max buy cost:** 42% of observed average selling price, leaving room for fees and target contribution margin

Nifty's order export does not contain active inventory counts or dedicated brand/category fields. The MVP therefore infers normalized brands and item types from listing titles, and uses days-to-sell as a velocity proxy. True sell-through requires a future active-listings or inventory import.

## Daily pull and inventory map

The pull list uses the latest sales day from the imported Nifty export and sorts open items by storage bin. Each shelf has 15 bins (`A01`–`A15`, `B01`–`B15`, and so on), and every bin has a configurable capacity of 15–20 clothing pieces. SKU-to-bin assignments and pull statuses are stored locally in a versioned browser record; raw eBay API responses remain temporary. Marking an item **pulled** releases one space in its bin. Import an existing location map as CSV with `SKU` and `Bin` columns; multiple rows can use the same bin.

## Local integration setup

- Node 18+
- [`last30days`](https://github.com/mvanhorn/last30days-skill) at `~/.agents/skills/last30days`

```sh
cp .env.example .env.local
npm install
npm run dev
```

Set `EBAY_USER_ACCESS_TOKEN` in `.env.local` to a user token generated for the matching eBay environment. Keep this file private. Sandbox contains test data only; switch to production credentials and `EBAY_ENV=production` for real seller orders.

Open <http://127.0.0.1:8080>. The server binds to loopback because its API uses locally stored credentials and research tools. Override the trend script path with `LAST30DAYS_PY` when needed.

eBay's public APIs do not provide general market-wide sold comps. Marketplace Pro uses the official Fulfillment API only for the authenticated seller's own completed-checkout orders. Imported Nifty orders remain the unified source for eBay, Poshmark, and Depop analytics.

## API

| Endpoint | Backend |
|---|---|
| `GET /api/doctor` | Local integration status (never returns a token) |
| `GET /api/ebay/status` | Safe eBay environment/configuration status |
| `POST /api/ebay/orders` | Authenticated seller's own eBay orders |
| `POST /api/research/trends` | Recent social, forum, and web signals |
| `POST /api/optimize` | Listing optimization plus own-sales pricing |

## Quality checks

```sh
npm run lint
npm run build
```
