import { run, one, isDbReady } from "@/lib/db-query";

const WINDOW_MS = 60_000;

const localCache = new Map<string, { count: number; resetAt: number }>();

setInterval(() => {
  const now = Date.now();
  localCache.forEach((val, key) => {
    if (now > val.resetAt) localCache.delete(key);
  });
}, 120_000);

export async function checkRateLimit(
  ip: string,
  maxRequests = 5,
): Promise<{ ok: boolean; remaining: number }> {
  const now = Date.now();
  const resetAt = new Date(now + WINDOW_MS);

  const local = localCache.get(ip);
  if (local && now <= local.resetAt) {
    if (local.count >= maxRequests) return { ok: false, remaining: 0 };
    local.count += 1;
    return { ok: true, remaining: maxRequests - local.count };
  }

  if (!(await isDbReady())) {
    const entry = localCache.get(ip);
    if (!entry || now > entry.resetAt) {
      localCache.set(ip, { count: 1, resetAt: now + WINDOW_MS });
      return { ok: true, remaining: maxRequests - 1 };
    }
    if (entry.count >= maxRequests) return { ok: false, remaining: 0 };
    entry.count += 1;
    return { ok: true, remaining: maxRequests - entry.count };
  }

  try {
    await run(
      `INSERT INTO rate_limit_records (key, count, reset_at)
       VALUES ($1, 1, $2)
       ON CONFLICT (key) DO UPDATE
         SET count    = CASE WHEN rate_limit_records.reset_at < NOW() THEN 1
                             ELSE rate_limit_records.count + 1 END,
             reset_at = CASE WHEN rate_limit_records.reset_at < NOW() THEN $2
                             ELSE rate_limit_records.reset_at END`,
      [ip, resetAt.toISOString()],
    );
    const row = await one<{ count: number; reset_at: string }>(
      "SELECT count, reset_at FROM rate_limit_records WHERE key = $1",
      [ip],
    );
    const count = row?.count ?? 1;
    const rowResetAt = row ? new Date(row.reset_at).getTime() : now + WINDOW_MS;
    localCache.set(ip, { count, resetAt: rowResetAt });
    if (count > maxRequests) return { ok: false, remaining: 0 };
    return { ok: true, remaining: Math.max(0, maxRequests - count) };
  } catch {
    const entry = localCache.get(ip);
    if (!entry || now > entry.resetAt) {
      localCache.set(ip, { count: 1, resetAt: now + WINDOW_MS });
      return { ok: true, remaining: maxRequests - 1 };
    }
    if (entry.count >= maxRequests) return { ok: false, remaining: 0 };
    entry.count += 1;
    return { ok: true, remaining: maxRequests - entry.count };
  }
}
