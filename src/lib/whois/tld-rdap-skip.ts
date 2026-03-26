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

// ─── Static list: ccTLDs with NO public RDAP server ──────────────────────────
// Only include TLDs that GENUINELY have no RDAP endpoint.
// TLDs that have RDAP via the IANA bootstrap (data.iana.org/rdap/dns.json) or
// via CCTLD_RDAP_OVERRIDES in rdap_client.ts must NOT be listed here — doing so
// forces them through the slower WHOIS path and defeats the point of RDAP.
//
// If a TLD is wrongly absent from this list (i.e., RDAP fails at runtime),
// markRdapSkipped() is called automatically and it will be added to the DB-backed
// runtime skip set so future queries go straight to WHOIS.
const STATIC_NO_RDAP = new Set<string>([
  // China / Macao — CNNIC / MONIC have no public RDAP endpoint
  "cn", "mo",
  // Iran — no public RDAP
  "ir",
  // Middle East — no public RDAP (sa confirmed unreachable; others added below separately)
  "sa",
  // North Africa — no public RDAP
  "eg", "ma", "dz", "tn",
  // South Asia — no public RDAP
  "bd", "lk",
  // Latin America — no public RDAP
  "bo", "py",
  // Sub-Saharan Africa — confirmed no RDAP (no IANA entry, no known public endpoint)
  "bi", "cg", "sz", "ne", "gw", "sl", "lr", "km", "er",
  //
  // NOTE: The following TLDs were previously (incorrectly) listed here but HAVE
  // been confirmed to have RDAP servers and are now in CCTLD_RDAP_OVERRIDES.
  // DO NOT re-add them here — doing so will break their fast RDAP path.
  //
  // Eastern Europe / CIS:
  //   ru (rdap.nic.ru), by (rdap.cctld.by), kz (rdap.nic.kz),
  //   lb (rdap.lbdr.org.lb), ve (rdap.nic.ve), ec (rdap.registry.ec),
  //   tl (rdap.nic.tl), cd (rdap.nic.cd), af (rdap.nic.af),
  //   gh (rdap.nic.gh), ug (rdap.nic.ug), et (rdap.nic.et),
  //   ci (rdap.nic.ci), dj (rdap.nic.dj), ss (rdap.nic.ss)
  //
  // Caribbean — ALL have RDAP servers in CCTLD_RDAP_OVERRIDES:
  //   kn (rdap.nic.kn), ag (rdap.nic.ag), lc (rdap.nic.lc), vc (rdap.nic.vc),
  //   gd (rdap.centralnic.com/gd), dm (rdap.nic.dm), tt (rdap.nic.tt), bb (rdap.nic.bb)
  //
  // Pacific / Asia — ALL have RDAP servers in CCTLD_RDAP_OVERRIDES:
  //   ws (rdap.nic.ws), tv (rdap.nic.tv), pw (rdap.radix.host), fm (rdap.centralnic.com/fm)
  //
  // Africa / Middle East — ALL have RDAP servers in CCTLD_RDAP_OVERRIDES:
  //   sd (rdap.nic.sd), so (rdap.nic.so), ye (rdap.y.net.ye),
  //   ht (rdap.nic.ht), cu (rdap.nic.cu)
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
