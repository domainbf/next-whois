import { run, many, isDbReady } from "@/lib/db-query";

const FALLBACK_THRESHOLD = 3;

function extractTld(domain: string): string {
  const parts = domain.toLowerCase().split(".");
  return parts.length >= 2 ? parts[parts.length - 1] : domain.toLowerCase();
}

// ─── In-memory cache ──────────────────────────────────────────────────────────
// Loaded once from DB at startup (or on first use).  All reads after that are
// synchronous — zero DB latency in the hot lookup path.
const _enabled  = new Set<string>(); // TLDs with use_fallback = true
const _failCount = new Map<string, number>(); // TLD → fail_count

let _loaded = false;

async function maybeLoad(): Promise<void> {
  if (_loaded) return;
  _loaded = true;
  if (!(await isDbReady())) return;
  try {
    const rows = await many<{ tld: string; fail_count: number; use_fallback: boolean }>(
      `SELECT tld, fail_count, use_fallback FROM tld_fallback_stats`,
    ).catch(() => [] as { tld: string; fail_count: number; use_fallback: boolean }[]);
    for (const r of rows) {
      _failCount.set(r.tld, r.fail_count ?? 0);
      if (r.use_fallback) _enabled.add(r.tld);
    }
  } catch {}
}

/**
 * Returns true if the fallback gate is open for this TLD (i.e., native WHOIS
 * / RDAP has failed enough times that we should start yisi/tianhu immediately).
 * Hot-path: synchronous after the one-time DB seed.
 */
export async function isTldFallbackEnabled(domain: string): Promise<boolean> {
  await maybeLoad();
  return _enabled.has(extractTld(domain));
}

export async function recordTldNativeFailure(domain: string): Promise<void> {
  await maybeLoad();
  const tld = extractTld(domain);
  const prev = _failCount.get(tld) ?? 0;
  const next = prev + 1;
  _failCount.set(tld, next);
  if (next >= FALLBACK_THRESHOLD) _enabled.add(tld);

  if (!(await isDbReady())) return;
  try {
    await run(
      `INSERT INTO tld_fallback_stats (tld, fail_count, use_fallback, last_fail_at)
       VALUES ($1, 1, false, NOW())
       ON CONFLICT (tld) DO UPDATE
         SET fail_count   = tld_fallback_stats.fail_count + 1,
             use_fallback = (tld_fallback_stats.fail_count + 1) >= $2,
             last_fail_at = NOW()`,
      [tld, FALLBACK_THRESHOLD],
    );
  } catch {}
}

export async function recordTldNativeSuccess(domain: string): Promise<void> {
  await maybeLoad();
  const tld = extractTld(domain);
  _failCount.set(tld, 0);
  _enabled.delete(tld);

  if (!(await isDbReady())) return;
  try {
    await run(
      `UPDATE tld_fallback_stats SET fail_count = 0, use_fallback = false WHERE tld = $1`,
      [tld],
    );
  } catch {}
}

/**
 * Immediately open the fallback gate for a TLD regardless of fail_count.
 * Called when the progressive fallback won the race, meaning native WHOIS / RDAP
 * was too slow — we want yisi/tianhu to race from the very start next time.
 */
export async function forceTldFallback(domain: string): Promise<void> {
  await maybeLoad();
  const tld = extractTld(domain);
  _failCount.set(tld, Math.max(_failCount.get(tld) ?? 0, FALLBACK_THRESHOLD));
  _enabled.add(tld);

  if (!(await isDbReady())) return;
  try {
    await run(
      `INSERT INTO tld_fallback_stats (tld, fail_count, use_fallback, last_fail_at)
       VALUES ($1, $2, true, NOW())
       ON CONFLICT (tld) DO UPDATE
         SET fail_count   = GREATEST(tld_fallback_stats.fail_count, $2),
             use_fallback = true,
             last_fail_at = NOW()`,
      [tld, FALLBACK_THRESHOLD],
    );
  } catch {}
}
