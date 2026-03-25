import { many, isDbReady } from "@/lib/db-query";
import type { TldLifecycle } from "@/lib/lifecycle";

let _cache: Record<string, TldLifecycle> | null = null;
let _cacheExpiry = 0;
const TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Loads TLD lifecycle overrides from the database.
 *
 * Priority (highest wins):
 *   1. tld_lifecycle_overrides — manually curated admin overrides
 *   2. tld_rules               — AI-scraped rules (confidence: ai/high)
 *
 * Both tables are merged so the admin table can override any AI-scraped value.
 */
export async function loadLifecycleOverrides(): Promise<Record<string, TldLifecycle>> {
  if (_cache && Date.now() < _cacheExpiry) return _cache;
  if (!(await isDbReady())) return {};
  try {
    const map: Record<string, TldLifecycle> = {};

    // Layer 1: AI-scraped tld_rules (base layer, lower priority)
    const aiRows = await many<{
      tld: string;
      grace_period_days: number;
      redemption_period_days: number;
      pending_delete_days: number;
      confidence: string;
    }>(
      `SELECT tld, grace_period_days, redemption_period_days, pending_delete_days, confidence
       FROM tld_rules
       ORDER BY tld`,
    ).catch(() => []);

    for (const r of aiRows) {
      map[r.tld] = {
        grace: r.grace_period_days,
        redemption: r.redemption_period_days,
        pendingDelete: r.pending_delete_days,
        confidence: r.confidence === "high" ? "high" : "est",
      };
    }

    // Layer 2: Manually curated overrides (highest priority — overwrite AI data)
    const manualRows = await many<{
      tld: string; grace: number; redemption: number;
      pending_delete: number; registry: string | null;
    }>(
      `SELECT tld, grace, redemption, pending_delete, registry
       FROM tld_lifecycle_overrides ORDER BY tld`,
    ).catch(() => []);

    for (const r of manualRows) {
      map[r.tld] = {
        grace: r.grace,
        redemption: r.redemption,
        pendingDelete: r.pending_delete,
        registry: r.registry ?? undefined,
        confidence: "high",
      };
    }

    _cache = map;
    _cacheExpiry = Date.now() + TTL;
    return map;
  } catch {
    return {};
  }
}

export function invalidateLifecycleOverridesCache(): void {
  _cache = null;
  _cacheExpiry = 0;
}
