import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const EBAY_CLI = process.env.EBAY_PP_CLI || path.join(homedir(), 'go', 'bin', 'ebay-pp-cli');
const LAST30DAYS =
  process.env.LAST30DAYS_PY ||
  path.join(homedir(), '.agents', 'skills', 'last30days', 'scripts', 'last30days.py');

function run(cmd, args, { timeoutMs = 120_000 } = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      env: { ...process.env, NO_COLOR: '1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`Timed out after ${timeoutMs}ms: ${cmd} ${args.join(' ')}`));
    }, timeoutMs);

    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString();
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      if (code !== 0) {
        reject(new Error(stderr.trim() || stdout.trim() || `${cmd} exited ${code}`));
        return;
      }
      resolve({ stdout, stderr });
    });
  });
}

function parseJsonLoose(text) {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf('{');
    const end = trimmed.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1));
    }
    const aStart = trimmed.indexOf('[');
    const aEnd = trimmed.lastIndexOf(']');
    if (aStart >= 0 && aEnd > aStart) {
      return JSON.parse(trimmed.slice(aStart, aEnd + 1));
    }
    throw new Error('CLI did not return JSON');
  }
}

export async function getDoctor() {
  const ebayOk = existsSync(EBAY_CLI);
  const last30Ok = existsSync(LAST30DAYS);
  let ebayDoctor = null;
  if (ebayOk) {
    try {
      const { stdout } = await run(EBAY_CLI, ['doctor', '--json', '--agent'], { timeoutMs: 30_000 });
      ebayDoctor = parseJsonLoose(stdout);
    } catch (err) {
      ebayDoctor = { error: err.message };
    }
  }
  return {
    ebayCli: { path: EBAY_CLI, available: ebayOk, doctor: ebayDoctor },
    last30days: { path: LAST30DAYS, available: last30Ok },
  };
}

export async function runSoldComps(query, { days = 30, condition, trim = true } = {}) {
  if (!existsSync(EBAY_CLI)) {
    throw new Error(`ebay-pp-cli not found at ${EBAY_CLI}. Install via Printing Press / go install.`);
  }
  if (!query?.trim()) throw new Error('query is required');

  const args = [
    'comp',
    query.trim(),
    '--days',
    String(days),
    '--json',
    '--agent',
    '--include-items',
  ];
  if (trim) args.push('--trim');
  if (condition) args.push('--condition', condition);

  const { stdout } = await run(EBAY_CLI, args, { timeoutMs: 90_000 });
  return parseJsonLoose(stdout);
}

export async function runActiveListings(query, { limit = 20 } = {}) {
  if (!existsSync(EBAY_CLI)) {
    throw new Error(`ebay-pp-cli not found at ${EBAY_CLI}`);
  }
  if (!query?.trim()) throw new Error('query is required');
  const safeLimit = boundedInteger(limit, 20, 1, 50);
  const args = ['listings', query.trim(), '--json', '--agent', '--compact'];
  const { stdout } = await run(EBAY_CLI, args, { timeoutMs: 90_000 });
  const data = parseJsonLoose(stdout);
  if (Array.isArray(data)) return data.slice(0, safeLimit);
  if (Array.isArray(data?.items)) return data.items.slice(0, safeLimit);
  return data;
}

export async function runLast30Days(topic, { days = 30, quick = true, search } = {}) {
  if (!existsSync(LAST30DAYS)) {
    throw new Error(
      `last30days engine not found at ${LAST30DAYS}. Install with: npx skills add mvanhorn/last30days-skill -g`
    );
  }
  if (!topic?.trim()) throw new Error('topic is required');

  const args = [
    LAST30DAYS,
    topic.trim(),
    '--days',
    String(days),
    '--emit=json',
    '--json-profile=agent',
  ];
  if (quick) args.push('--quick');
  if (search) args.push('--search', search);

  const { stdout } = await run('python3', args, { timeoutMs: 180_000 });
  return parseJsonLoose(stdout);
}

function boundedInteger(value, fallback, min, max) {
  const parsed = Number(value ?? fallback);
  if (!Number.isInteger(parsed) || parsed < min || parsed > max) {
    throw new Error(`value must be an integer from ${min} to ${max}`);
  }
  return parsed;
}

export function suggestListingOptimization({ title = '', description = '', comps }) {
  const cleanTitle = title.replace(/\s+/g, ' ').trim();
  const words = cleanTitle.split(' ').filter(Boolean);
  const tips = [];

  let optimizedTitle = cleanTitle;
  if (optimizedTitle.length > 80) {
    optimizedTitle = optimizedTitle.slice(0, 77).trimEnd() + '...';
    tips.push('Title truncated to eBay’s 80-character limit.');
  }
  if (words.length < 5) {
    tips.push('Add brand, model, size/condition, and a key differentiator for search coverage.');
  }
  if (!/\b(new|used|refurbished|nib|bnib|sealed)\b/i.test(optimizedTitle)) {
    tips.push('Include condition language buyers search for (e.g. New, Used, Sealed).');
  }
  if (/[!?]{2,}|\b(wow|amazing|must see)\b/i.test(optimizedTitle)) {
    optimizedTitle = optimizedTitle.replace(/[!?]+/g, '').replace(/\b(wow|amazing|must see)\b/gi, '').replace(/\s+/g, ' ').trim();
    tips.push('Removed hype words that hurt CTR and look spammy.');
  }

  const mean = comps?.mean ?? comps?.avg ?? comps?.average ?? null;
  const median = comps?.median ?? null;
  const p25 = comps?.p25 ?? comps?.percentile_25 ?? null;
  const p75 = comps?.p75 ?? comps?.percentile_75 ?? null;
  const sample = comps?.sample_size ?? comps?.count ?? null;

  let suggestedPrice = null;
  if (sample !== 0 && typeof median === 'number' && median > 0) suggestedPrice = Number(median.toFixed(2));
  else if (sample !== 0 && typeof mean === 'number' && mean > 0) suggestedPrice = Number(mean.toFixed(2));

  if (suggestedPrice != null) {
    tips.push(
      `Suggested price from ebay-pp-cli sold comps (last ${comps?.days ?? 30} days` +
        (sample != null ? `, n=${sample}` : '') +
        ').'
    );
  } else {
    tips.push('Run product research to pull sold-comp pricing before listing.');
  }

  const optimizedDescription =
    description.trim() ||
    [
      cleanTitle,
      '',
      'Condition: [describe carefully]',
      'Includes: [what’s in the box]',
      'Flaws: [none / list honestly]',
      '',
      'Ships fast. Questions welcome.',
    ].join('\n');

  return {
    optimizedTitle,
    optimizedDescription,
    suggestedPrice,
    priceBand:
      sample !== 0 && p25 != null && p75 != null && p25 > 0 && p75 > 0
        ? { low: p25, high: p75, median, mean }
        : { low: null, high: null, median, mean },
    tips,
    source: 'ebay-pp-cli + local optimizer heuristics',
  };
}

export function createResearchApiMiddleware() {
  let activeJobs = 0;
  return async function researchApi(req, res, next) {
    if (!req.url?.startsWith('/api/')) return next();

    const url = new URL(req.url, 'http://localhost');
    const send = (status, body) => {
      res.statusCode = status;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(body));
    };

    const readBody = () =>
      new Promise((resolve, reject) => {
        let raw = '';
        req.on('data', (c) => {
          raw += c;
          if (raw.length > 1_000_000) {
            reject(new Error('Body too large'));
            req.destroy();
          }
        });
        req.on('end', () => {
          if (!raw) return resolve({});
          try {
            resolve(JSON.parse(raw));
          } catch {
            reject(new Error('Invalid JSON body'));
          }
        });
        req.on('error', reject);
      });

    const isJob = req.method === 'POST';
    if (isJob && activeJobs >= 3) return send(429, { ok: false, error: 'Research queue is full. Try again shortly.' });
    if (isJob) activeJobs += 1;

    try {
      if (req.method === 'GET' && url.pathname === '/api/doctor') {
        return send(200, await getDoctor());
      }

      if (req.method === 'POST' && url.pathname === '/api/research/comps') {
        const body = await readBody();
        const data = await runSoldComps(body.query, {
          days: boundedInteger(body.days, 30, 1, 90),
          condition: body.condition,
          trim: body.trim !== false,
        });
        return send(200, { ok: true, query: body.query, days: boundedInteger(body.days, 30, 1, 90), data });
      }

      if (req.method === 'POST' && url.pathname === '/api/research/listings') {
        const body = await readBody();
        const data = await runActiveListings(body.query, { limit: boundedInteger(body.limit, 20, 1, 50) });
        return send(200, { ok: true, query: body.query, data });
      }

      if (req.method === 'POST' && url.pathname === '/api/research/trends') {
        const body = await readBody();
        const data = await runLast30Days(body.topic || body.query, {
          days: boundedInteger(body.days, 30, 1, 90),
          quick: body.quick !== false,
          search: body.search,
        });
        return send(200, { ok: true, topic: body.topic || body.query, data });
      }

      if (req.method === 'POST' && url.pathname === '/api/optimize') {
        const body = await readBody();
        let comps = body.comps ?? null;
        const researchQuery = body.researchQuery || body.title;
        if (!comps && researchQuery) {
          try {
            comps = await runSoldComps(researchQuery, {
              days: boundedInteger(body.days, 30, 1, 90),
              condition: body.condition,
              trim: true,
            });
          } catch (err) {
            comps = { error: err.message };
          }
        }
        const optimization = suggestListingOptimization({
          title: body.title || '',
          description: body.description || '',
          comps: comps?.error ? null : comps,
        });
        return send(200, { ok: true, optimization, comps });
      }

      return send(404, { error: 'Not found' });
    } catch (err) {
      return send(500, { ok: false, error: err.message || String(err) });
    } finally {
      if (isJob) activeJobs -= 1;
    }
  };
}
