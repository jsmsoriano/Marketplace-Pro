import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';
import { fetchSellerOrders, getEbayStatus } from './ebay-orders.mjs';

function last30daysPath() {
  return process.env.LAST30DAYS_PY || path.join(homedir(), '.agents', 'skills', 'last30days', 'scripts', 'last30days.py');
}

function run(cmd, args, { timeoutMs = 120_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { env: { ...process.env, NO_COLOR: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => { child.kill('SIGTERM'); reject(new Error(`Timed out after ${timeoutMs}ms.`)); }, timeoutMs);
    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });
    child.on('error', (error) => { clearTimeout(timer); reject(error); });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) return reject(new Error(stderr.trim() || stdout.trim() || `Process exited ${code}`));
      resolve(stdout);
    });
  });
}

function parseJsonLoose(text) {
  const trimmed = text.trim();
  try { return JSON.parse(trimmed); } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
    throw new Error('Research engine did not return JSON.');
  }
}

function boundedInteger(value, fallback, min, max) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) throw new Error(`value must be an integer from ${min} to ${max}`);
  return parsed;
}

async function runLast30Days(topic, { days = 30, quick = true, search } = {}) {
  const script = last30daysPath();
  if (!existsSync(script)) throw new Error(`last30days engine not found at ${script}.`);
  if (!topic?.trim()) throw new Error('topic is required');
  const args = [script, topic.trim(), '--days', String(days), '--emit=json', '--json-profile=agent'];
  if (quick) args.push('--quick');
  if (search) args.push('--search', search);
  return parseJsonLoose(await run('python3', args, { timeoutMs: 180_000 }));
}

function suggestListingOptimization({ title = '', description = '', salesStats }) {
  const cleanTitle = title.replace(/\s+/g, ' ').trim();
  const words = cleanTitle.split(' ').filter(Boolean);
  const tips = [];
  let optimizedTitle = cleanTitle;
  if (optimizedTitle.length > 80) {
    optimizedTitle = optimizedTitle.slice(0, 77).trimEnd() + '...';
    tips.push('Title truncated to eBay’s 80-character limit.');
  }
  if (words.length < 5) tips.push('Add brand, model, size/condition, and a key differentiator for search coverage.');
  if (!/\b(new|used|refurbished|nib|bnib|sealed)\b/i.test(optimizedTitle)) tips.push('Include condition language buyers search for (e.g. New, Used, Sealed).');
  if (/[!?]{2,}|\b(wow|amazing|must see)\b/i.test(optimizedTitle)) {
    optimizedTitle = optimizedTitle.replace(/[!?]+/g, '').replace(/\b(wow|amazing|must see)\b/gi, '').replace(/\s+/g, ' ').trim();
    tips.push('Removed hype words that make a listing look spammy.');
  }

  const mean = Number.isFinite(salesStats?.mean) ? salesStats.mean : null;
  const median = Number.isFinite(salesStats?.median) ? salesStats.median : null;
  const p25 = Number.isFinite(salesStats?.p25) ? salesStats.p25 : null;
  const p75 = Number.isFinite(salesStats?.p75) ? salesStats.p75 : null;
  const sample = Number.isFinite(salesStats?.sample_size) ? salesStats.sample_size : 0;
  const reference = median || mean;
  const suggestedPrice = sample > 0 && reference ? Number(reference.toFixed(2)) : null;
  if (suggestedPrice != null) tips.push(`Suggested price from your own ${sample} matching sale${sample === 1 ? '' : 's'}.`);
  else tips.push('No matching sales history yet; validate the price manually before listing.');

  const optimizedDescription = description.trim() || [cleanTitle, '', 'Condition: [describe carefully]', 'Includes: [what’s included]', 'Flaws: [none / list honestly]', '', 'Ships fast. Questions welcome.'].join('\n');
  return {
    optimizedTitle,
    optimizedDescription,
    suggestedPrice,
    priceBand: sample > 0 ? { low: p25, high: p75, median, mean } : { low: null, high: null, median: null, mean: null },
    tips,
    source: 'your imported sales history + local optimizer heuristics',
  };
}

export function createAppApiMiddleware() {
  let activeJobs = 0;
  return async function appApi(req, res, next) {
    if (!req.url?.startsWith('/api/')) return next();
    const url = new URL(req.url, 'http://localhost');
    const send = (status, body) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    };
    const readBody = () => new Promise((resolve, reject) => {
      let raw = '';
      req.on('data', (chunk) => {
        raw += chunk;
        if (raw.length > 1_000_000) { reject(new Error('Body too large')); req.destroy(); }
      });
      req.on('end', () => {
        if (!raw) return resolve({});
        try { resolve(JSON.parse(raw)); } catch { reject(new Error('Invalid JSON body')); }
      });
      req.on('error', reject);
    });

    const isJob = req.method === 'POST';
    if (isJob && activeJobs >= 3) return send(429, { ok: false, error: 'Research queue is full. Try again shortly.' });
    if (isJob) activeJobs += 1;
    try {
      if (req.method === 'GET' && url.pathname === '/api/doctor') {
        const script = last30daysPath();
        return send(200, { ebay: getEbayStatus(), last30days: { path: script, available: existsSync(script) } });
      }
      if (req.method === 'GET' && url.pathname === '/api/ebay/status') return send(200, getEbayStatus());
      if (req.method === 'POST' && url.pathname === '/api/ebay/orders') {
        const body = await readBody();
        return send(200, { ok: true, data: await fetchSellerOrders({ days: boundedInteger(body.days, 90, 1, 90) }) });
      }
      if (req.method === 'POST' && url.pathname === '/api/research/trends') {
        const body = await readBody();
        const topic = body.topic || body.query;
        const data = await runLast30Days(topic, { days: boundedInteger(body.days, 30, 1, 90), quick: body.quick !== false, search: body.search });
        return send(200, { ok: true, topic, data });
      }
      if (req.method === 'POST' && url.pathname === '/api/optimize') {
        const body = await readBody();
        const salesStats = body.salesStats || null;
        const optimization = suggestListingOptimization({ title: body.title || '', description: body.description || '', salesStats });
        return send(200, { ok: true, optimization, salesStats });
      }
      return send(404, { error: 'Not found' });
    } catch (error) {
      return send(error.statusCode || 500, { ok: false, error: error.message || String(error) });
    } finally {
      if (isJob) activeJobs -= 1;
    }
  };
}
