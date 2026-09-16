type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function allowRequest(
  key: string,
  max: number,
  windowMs: number,
  now = Date.now()
): boolean {
  if (buckets.size > 10_000) {
    for (const [id, bucket] of buckets) {
      if (now >= bucket.resetAt) buckets.delete(id);
    }
  }

  const current = buckets.get(key);
  if (!current || now >= current.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= max) return false;
  current.count += 1;
  return true;
}

export function resetRateLimits() {
  buckets.clear();
}

export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
