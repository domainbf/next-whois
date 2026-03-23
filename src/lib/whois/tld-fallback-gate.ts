import { run, one, isDbReady } from "@/lib/db-query";

const FALLBACK_THRESHOLD = 3;

function extractTld(domain: string): string {
  const parts = domain.toLowerCase().split(".");
  return parts.length >= 2 ? parts[parts.length - 1] : domain.toLowerCase();
}

export async function isTldFallbackEnabled(domain: string): Promise<boolean> {
  if (!(await isDbReady())) return false;
  try {
    const tld = extractTld(domain);
    const row = await one<{ use_fallback: boolean }>(
      `SELECT use_fallback FROM tld_fallback_stats WHERE tld = $1`,
      [tld],
    );
    return row?.use_fallback === true;
  } catch {
    return false;
  }
}

export async function recordTldNativeFailure(domain: string): Promise<void> {
  if (!(await isDbReady())) return;
  try {
    const tld = extractTld(domain);
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
  if (!(await isDbReady())) return;
  try {
    const tld = extractTld(domain);
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
  if (!(await isDbReady())) return;
  try {
    const tld = extractTld(domain);
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
