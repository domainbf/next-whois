import { many, isDbReady } from "@/lib/db-query";
import type { TldLifecycle } from "@/lib/lifecycle";

let _cache: Record<string, TldLifecycle> | null = null;
let _cacheExpiry = 0;
const TTL = 5 * 60 * 1000; // 5 minutes

export async function loadLifecycleOverrides(): Promise<Record<string, TldLifecycle>> {
  if (_cache && Date.now() < _cacheExpiry) return _cache;
  if (!(await isDbReady())) return {};
  try {
    const rows = await many<{
      tld: string; grace: number; redemption: number;
      pending_delete: number; registry: string | null;
    }>(
      `SELECT tld, grace, redemption, pending_delete, registry
       FROM tld_lifecycle_overrides ORDER BY tld`,
    );
    const map: Record<string, TldLifecycle> = {};
    for (const r of rows) {
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
