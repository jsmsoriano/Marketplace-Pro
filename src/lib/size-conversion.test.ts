import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { convertBrandSize, previewChart } from './size-conversion.ts';
import { chartById } from './brand-size-charts.ts';

describe('eBay size conversion', () => {
  it('rewrites Nike XXS and spelled-out sizes to the published alpha token', () => {
    const xxs = convertBrandSize({ chartId: 'nike-men-tops', brandSize: 'XXS', marketplace: 'EBAY_US' });
    assert.equal(xxs.ok, true);
    if (!xxs.ok) return;
    assert.equal(xxs.conversion.ebaySize, '2XS');
    assert.equal(xxs.conversion.match, 'exact');
    assert.equal(xxs.conversion.beyondSupportedList, false);

    const medium = convertBrandSize({ chartId: 'nike-men-tops', brandSize: 'Medium', marketplace: 'EBAY_US' });
    assert.equal(medium.ok, true);
    if (!medium.ok) return;
    assert.equal(medium.conversion.ebaySize, 'M');
    assert.match(medium.conversion.detail, /already an eBay Size/);
    assert.match(medium.conversion.measurements, /chest 37\.5–41 in/);
  });

  it('maps sizes past XXL to the closest supported alpha', () => {
    const result = convertBrandSize({ chartId: 'nike-men-tops', brandSize: '3XL', marketplace: 'EBAY_UK' });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.conversion.ebaySize, 'XXL');
    assert.equal(result.conversion.match, 'closest');
    assert.equal(result.conversion.beyondSupportedList, true);
    assert.match(result.conversion.descriptionSnippet, /3XL/);
  });

  it('turns Under Armour SM into S', () => {
    const result = convertBrandSize({ chartId: 'ua-men-tops', brandSize: 'SM', marketplace: 'EBAY_US' });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.conversion.ebaySize, 'S');
    assert.match(result.conversion.detail, /SM/);
  });

  it('keeps an even jean waist and splits a combined tag', () => {
    const result = convertBrandSize({ chartId: 'levis-men-jeans', brandSize: '32x30', marketplace: 'EBAY_US' });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.conversion.ebaySize, '32');
    assert.equal(result.conversion.match, 'exact');
    assert.doesNotMatch(result.conversion.ebaySize, /x/i);
    assert.match(result.conversion.descriptionSnippet, /Inseam: 30 in/);
    assert.match(result.conversion.measurements, /body waist 32\.5–33 in/);
  });

  it('treats an odd waist as a tie between the neighboring even sizes', () => {
    const smaller = convertBrandSize({ chartId: 'levis-men-jeans', brandSize: '33', marketplace: 'EBAY_US' });
    assert.equal(smaller.ok, true);
    if (!smaller.ok) return;
    assert.equal(smaller.conversion.match, 'tie');
    assert.deepEqual(smaller.conversion.alternates, ['32', '34']);
    assert.equal(smaller.conversion.ebaySize, '32');

    const larger = convertBrandSize({ chartId: 'levis-men-jeans', brandSize: '33', marketplace: 'EBAY_US', tieChoice: 'larger' });
    assert.equal(larger.ok, true);
    if (!larger.ok) return;
    assert.equal(larger.conversion.ebaySize, '34');
  });

  it('uses the brand waist band for eBay UK letter sizes', () => {
    const result = convertBrandSize({ chartId: 'levis-men-jeans', brandSize: '33', marketplace: 'EBAY_UK' });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.conversion.ebaySize, 'M');
    assert.match(result.conversion.detail, /numeric waist/);
    assert.match(result.conversion.descriptionSnippet, /Levi's men's jeans 33/);
  });

  it('uses The North Face letter printed on the pants chart for the UK', () => {
    const result = convertBrandSize({ chartId: 'tnf-men-pants', brandSize: '34', marketplace: 'EBAY_UK' });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.conversion.ebaySize, 'M');
    const us = convertBrandSize({ chartId: 'tnf-men-pants', brandSize: '34', marketplace: 'EBAY_US' });
    assert.equal(us.ok, true);
    if (!us.ok) return;
    assert.equal(us.conversion.ebaySize, '34');
    assert.match(us.conversion.letterAlternative ?? '', /M/);
  });

  it('splits a hyphenated Lacoste shirt size into one eBay value', () => {
    const result = convertBrandSize({ chartId: 'lacoste-men-shirts', brandSize: 'M-L', marketplace: 'EBAY_US', tieChoice: 'larger' });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.conversion.match, 'tie');
    assert.deepEqual(result.conversion.alternates, ['M', 'L']);
    assert.equal(result.conversion.ebaySize, 'L');
    assert.match(result.conversion.measurements, /neck 15\.8 in/);
  });

  it('converts Nike shoes to the marketplace region', () => {
    const us = convertBrandSize({ chartId: 'nike-men-shoes', brandSize: '10', marketplace: 'EBAY_US' });
    assert.equal(us.ok, true);
    if (!us.ok) return;
    assert.equal(us.conversion.ebaySize, 'US 10');
    assert.match(us.conversion.measurements, /UK 9/);
    assert.match(us.conversion.measurements, /EU 44/);

    const uk = convertBrandSize({ chartId: 'nike-men-shoes', brandSize: 'UK 9', marketplace: 'EBAY_UK' });
    assert.equal(uk.ok, true);
    if (!uk.ok) return;
    assert.equal(uk.conversion.ebaySize, 'UK 9');
  });

  it('does not invent a UK shoe size the brand chart does not publish', () => {
    const result = convertBrandSize({ chartId: 'lacoste-men-shoes', brandSize: 'US 10', marketplace: 'EBAY_UK' });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.conversion.ebaySize, 'EU 43');
    assert.match(result.conversion.detail, /does not publish a UK/);
  });

  it('rejects placeholder and multi-size values', () => {
    const placeholder = convertBrandSize({ chartId: 'nike-men-tops', brandSize: 'See description', marketplace: 'EBAY_US' });
    assert.equal(placeholder.ok, false);
    const combined = convertBrandSize({ chartId: 'nike-men-tops', brandSize: 'S/M/L', marketplace: 'EBAY_US' });
    assert.equal(combined.ok, false);
    if (combined.ok) return;
    assert.match(combined.error, /one size/i);
  });

  it('previews every row of a chart', () => {
    const chart = chartById('brooks-men-shirts');
    assert.ok(chart);
    if (!chart) return;
    const rows = previewChart(chart, 'EBAY_US');
    assert.equal(rows.find((row) => row.label === 'M')?.conversion.ebaySize, 'M');
    assert.equal(rows.find((row) => row.label === '4XL')?.conversion.ebaySize, 'XXL');
  });
});
