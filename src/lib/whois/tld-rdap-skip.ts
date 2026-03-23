/**
 * Tracks which TLDs do NOT support RDAP so we can skip the RDAP attempt
 * entirely, going straight to WHOIS (and saving the parallel connection cost
 * and any latency introduced by a failing RDAP probe).
 *
 * Three layers:
 *   1. STATIC_NO_RDAP  – statically curated list of ccTLDs known to have no
 *                        public RDAP endpoint (vetted against IANA bootstrap +
 *                        node-rdap override list).
 *   2. _runtimeSkip    – in-memory set updated as queries succeed / fail within
 *                        the current process lifetime.
 *   3. DB persistence  – when a new TLD is learned to be RDAP-unsupported it
 *                        is written to tld_fallback_stats so restarts
 *                        immediately benefit without another cold trial.
 */

import { run, many, isDbReady } from "@/lib/db-query";

// ─── Static list: ccTLDs with no public RDAP server ──────────────────────────
// Derived from cross-checking IANA RDAP bootstrap (data.iana.org/rdap/dns.json)
// and the node-rdap/rdap_client.ts override table.
// Do NOT include TLDs that are in rdap_client.ts CCTLD_RDAP_OVERRIDES – those
// do have working RDAP endpoints.
const STATIC_NO_RDAP = new Set<string>([
  // East Asia
  "cn", "jp", "kr", "tw", "hk", "mo", "vn", "th", "sg", "my", "id", "ph",
  "mm", "kh", "la", "tl",
  // South Asia
  "in", "bd", "lk", "np",
  // Central Asia (not in overrides)
  "ir",
  // Middle East (not in overrides)
  "tr", "sa", "ae", "eg", "iq", "il", "lb", "ly", "ma", "dz", "tn",
  // Eastern Europe / CIS (not in overrides)
  "ru", "ua", "by", "kz",
  // Western / Central Europe
  "de", "it", "pl", "hu", "ro", "bg", "gr", "sk", "no", "fi", "lt", "lv",
  // Latin America
  "mx", "ar", "co", "pe", "cl", "ve", "ec", "bo", "py", "uy",
  // Africa (not in overrides)
  "za", "ke", "gh", "tz", "ug", "et", "sn", "ma",
]);

// Runtime-learned skip set (updated by markRdapSkipped / markRdapSupported)
const _runtimeSkip = new Set<string>();
// Runtime-confirmed RDAP-supported set (prevents oscillation)
const _runtimeSupport = new Set<string>();

// DB seed loaded once per process
let _dbLoaded = false;

/**
 * Load any previously discovered RDAP-unsupported TLDs from the DB.
 * Called lazily on first use.
 */
async function maybeLoadFromDb(): Promise<void> {
  if (_dbLoaded) return;
  _dbLoaded = true;
  if (!(await isDbReady())) return;
  try {
    const rows = await many<{ tld: string }>(
      `SELECT tld FROM tld_fallback_stats WHERE rdap_skip = true`,
      [],
    ).catch(() => [] as { tld: string }[]);
    for (const r of rows) _runtimeSkip.add(r.tld);
  } catch {}
}

/**
 * Returns true if we should skip RDAP for this TLD.
 * This is a sync check after the one-time async DB seed.
 */
export function isRdapSkipped(tld: string): boolean {
  const t = tld.toLowerCase();
  if (_runtimeSupport.has(t)) return false; // Confirmed supported – never skip
  return STATIC_NO_RDAP.has(t) || _runtimeSkip.has(t);
}

/**
 * Call after RDAP fails with "No RDAP server found" for this TLD.
 * Persists to DB so future process restarts also skip RDAP.
 */
export async function markRdapSkipped(tld: string): Promise<void> {
  const t = tld.toLowerCase();
  if (STATIC_NO_RDAP.has(t) || _runtimeSkip.has(t)) return; // Already known
  _runtimeSkip.add(t);
  if (!(await isDbReady())) return;
  try {
    await run(
      `INSERT INTO tld_fallback_stats (tld, fail_count, use_fallback, rdap_skip, last_fail_at)
       VALUES ($1, 0, false, true, NOW())
       ON CONFLICT (tld) DO UPDATE SET rdap_skip = true`,
      [t],
    );
  } catch {}
}

/**
 * Call after RDAP succeeds for a TLD (ensures it won't be wrongly skipped).
 */
export async function markRdapSupported(tld: string): Promise<void> {
  const t = tld.toLowerCase();
  _runtimeSupport.add(t);
  _runtimeSkip.delete(t);
  if (!(await isDbReady())) return;
  try {
    await run(
      `INSERT INTO tld_fallback_stats (tld, fail_count, use_fallback, rdap_skip)
       VALUES ($1, 0, false, false)
       ON CONFLICT (tld) DO UPDATE SET rdap_skip = false`,
      [t],
    );
  } catch {}
}

/**
 * Initialise the DB-backed layer. Call once at startup / on first query.
 */
export async function initRdapSkipCache(): Promise<void> {
  await maybeLoadFromDb();
}
