import { many } from "@/lib/db-query";

export interface ApiConfig {
  nazhumi_enabled: boolean;
  miqingju_enabled: boolean;
  tianhu_enabled: boolean;
  yisi_enabled: boolean;
  yisi_key: string;
}

let _cache: ApiConfig | null = null;
let _cacheAt = 0;
const CACHE_TTL = 60_000;

export async function getApiConfig(): Promise<ApiConfig> {
  if (_cache && Date.now() - _cacheAt < CACHE_TTL) return _cache;

  try {
    const rows = await many<{ key: string; value: string }>(
      "SELECT key, value FROM site_settings WHERE key LIKE 'api_%'",
    );
    const map = Object.fromEntries(rows.map((r) => [r.key, r.value]));

    _cache = {
      nazhumi_enabled: map.api_nazhumi_enabled !== "0",
      miqingju_enabled: map.api_miqingju_enabled !== "0",
      tianhu_enabled: map.api_tianhu_enabled !== "0",
      yisi_enabled: map.api_yisi_enabled !== "0",
      yisi_key: map.api_yisi_key || process.env.YISI_API_KEY || "",
    };
  } catch {
    _cache = {
      nazhumi_enabled: true,
      miqingju_enabled: true,
      tianhu_enabled: true,
      yisi_enabled: true,
      yisi_key: process.env.YISI_API_KEY || "",
    };
  }

  _cacheAt = Date.now();
  return _cache;
}

export function invalidateApiConfig() {
  _cache = null;
  _cacheAt = 0;
}
