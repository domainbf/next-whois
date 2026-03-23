export const VERSION = "2.2";

export const HISTORY_LIMIT: number = intEnv("NEXT_PUBLIC_HISTORY_LIMIT", -1);

export const MAX_WHOIS_FOLLOW = intEnv("NEXT_PUBLIC_MAX_WHOIS_FOLLOW", 0);

export const LOOKUP_TIMEOUT = intEnv("WHOIS_TIMEOUT_MS", 8_000);

// Moz API Configuration
export const MOZ_ACCESS_ID = strEnv("MOZ_ACCESS_ID");
export const MOZ_SECRET_KEY = strEnv("MOZ_SECRET_KEY");

function intEnv(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (!value) return defaultValue;

  const parsed = parseInt(value);
  if (isNaN(parsed)) return defaultValue;

  return parsed;
}

export function strEnv(name: string, defaultValue?: string): string {
  return process.env[name] || defaultValue || "";
}
