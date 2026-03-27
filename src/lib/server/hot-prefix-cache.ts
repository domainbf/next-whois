/**
 * Hot prefix cache — loads active hot prefixes from DB with Redis caching.
 * Used server-side to enrich domain value analysis and email alerts.
 */

import { many } from "@/lib/db-query";
import { redis, isRedisAvailable } from "./redis";

export interface HotPrefix {
  id: number;
  prefix: string;
  category: string;
  weight: number;
  source: string;
  sale_examples: string | null;
  notes: string | null;
}

const CACHE_KEY = "hot_prefixes_v1";
const CACHE_TTL = 300; // 5 minutes

let memCache: { data: HotPrefix[]; at: number } | null = null;
const MEM_TTL = 60_000; // 1 minute in-process cache

export async function getHotPrefixes(): Promise<HotPrefix[]> {
  // In-process cache (fastest)
  if (memCache && Date.now() - memCache.at < MEM_TTL) {
    return memCache.data;
  }

  // Redis cache
  if (isRedisAvailable() && redis) {
    try {
      const cached = await redis.get(CACHE_KEY);
      if (cached) {
        const data = JSON.parse(cached) as HotPrefix[];
        memCache = { data, at: Date.now() };
        return data;
      }
    } catch { /* fall through to DB */ }
  }

  // DB fetch
  try {
    const rows = await many<HotPrefix>(
      `SELECT id, prefix, category, weight, source, sale_examples, notes
       FROM hot_prefixes WHERE enabled = true ORDER BY weight DESC`,
      [],
    );
    memCache = { data: rows, at: Date.now() };
    if (isRedisAvailable() && redis) {
      try {
        await redis.set(CACHE_KEY, JSON.stringify(rows), "EX", CACHE_TTL);
      } catch { /* ignore */ }
    }
    return rows;
  } catch {
    // Table may not exist yet — return empty
    return [];
  }
}

export interface HotPrefixMatch {
  prefix: HotPrefix;
  matchType: "exact" | "contains";
}

/**
 * Check if a domain name (SLD only, e.g. "agent" from "agent.ai") matches
 * any active hot prefix.
 */
export async function checkHotPrefix(name: string): Promise<HotPrefixMatch | null> {
  const lower = name.toLowerCase();
  const prefixes = await getHotPrefixes();

  // Exact match first
  const exact = prefixes.find(p => p.prefix === lower);
  if (exact) return { prefix: exact, matchType: "exact" };

  // Contains match (name starts with or equals prefix)
  const contains = prefixes.find(p => lower.startsWith(p.prefix) && p.prefix.length >= 3);
  if (contains) return { prefix: contains, matchType: "contains" };

  return null;
}

/**
 * Get the score boost for a domain from hot prefixes.
 * Returns 0 if no match.
 */
export async function getHotPrefixBoost(name: string): Promise<{ boost: number; match: HotPrefixMatch | null }> {
  const match = await checkHotPrefix(name);
  if (!match) return { boost: 0, match: null };
  const boost = match.matchType === "exact" ? match.prefix.weight : Math.floor(match.prefix.weight * 0.6);
  return { boost, match };
}
