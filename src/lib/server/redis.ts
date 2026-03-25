import Redis from "ioredis";

export const REDIS_URL =
  (process.env.KV_URL as string | undefined) ||
  (process.env.REDIS_URL as string | undefined);

export const REDIS_HOST    = process.env.REDIS_HOST as string | undefined;
export const REDIS_PORT    = parseInt(process.env.REDIS_PORT    || "6379");
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
export const REDIS_DB      = parseInt(process.env.REDIS_DB      || "0");

export const redis = createRedisConn();

let _available = !!redis;

function createRedisConn(): Redis | undefined {
  const opts = {
    maxRetriesPerRequest: 1,
    connectTimeout:       3_000,
    commandTimeout:       2_000,
    lazyConnect:          true,
    enableReadyCheck:     false,
    enableOfflineQueue:   false,
    keepAlive:            10_000,
    retryStrategy(times: number) {
      if (times > 3) return null;
      return Math.min(times * 500, 2_000);
    },
  } as const;

  let client: Redis | undefined;

  try {
    if (REDIS_URL) {
      client = new Redis(REDIS_URL, opts);
    } else if (REDIS_HOST) {
      client = new Redis({
        ...opts,
        host:     REDIS_HOST,
        port:     REDIS_PORT,
        password: REDIS_PASSWORD,
        db:       REDIS_DB,
      });
    }
  } catch (err) {
    console.error("[Redis] Failed to initialise client:", err);
    return undefined;
  }

  if (!client) return undefined;

  client.on("ready",        ()    => { _available = true; });
  client.on("error",        (err) => { console.error("[Redis]", err.message); });
  client.on("close",        ()    => { _available = false; });
  client.on("reconnecting", ()    => { _available = false; });
  client.on("end",          ()    => { _available = false; });

  return client;
}

export function isRedisAvailable(): boolean {
  return _available;
}

export async function getRedisValue(key: string): Promise<string | null> {
  if (!redis || !_available) return null;
  try {
    return await redis.get(key);
  } catch (err) {
    console.error(`[Redis] GET error for ${key}:`, (err as Error).message);
    return null;
  }
}

export async function setRedisValue(
  key: string,
  value: string,
  ttl?: number,
): Promise<boolean> {
  if (!redis || !_available) return false;
  try {
    if (ttl && ttl > 0) {
      await redis.set(key, value, "EX", ttl);
    } else {
      await redis.set(key, value);
    }
    return true;
  } catch (err) {
    console.error(`[Redis] SET error for ${key}:`, (err as Error).message);
    return false;
  }
}

export async function deleteRedisValue(key: string): Promise<boolean> {
  if (!redis || !_available) return false;
  try {
    await redis.del(key);
    return true;
  } catch (err) {
    console.error(`[Redis] DEL error for ${key}:`, (err as Error).message);
    return false;
  }
}

export async function getRemainingTtl(key: string): Promise<number | null> {
  if (!redis || !_available) return null;
  try {
    const ttl = await redis.ttl(key);
    return ttl >= 0 ? ttl : null;
  } catch {
    return null;
  }
}

export async function getJsonRedisValue<T>(key: string): Promise<T | null> {
  const raw = await getRedisValue(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (err) {
    console.error("[Redis] JSON parse error:", err);
    return null;
  }
}

export async function setJsonRedisValue<T>(
  key: string,
  value: T,
  ttl?: number,
): Promise<boolean> {
  try {
    return await setRedisValue(key, JSON.stringify(value), ttl);
  } catch (err) {
    console.error("[Redis] JSON stringify error:", err);
    return false;
  }
}

export async function getJsonRedisValueWithTtl<T>(
  key: string,
): Promise<{ value: T; remainingTtl: number | null } | null> {
  if (!redis || !_available) return null;
  try {
    const [raw, ttl] = await Promise.all([redis.get(key), redis.ttl(key)]);
    if (!raw) return null;
    const value = JSON.parse(raw) as T;
    return { value, remainingTtl: ttl >= 0 ? ttl : null };
  } catch (err) {
    console.error(`[Redis] getWithTtl error for ${key}:`, (err as Error).message);
    return null;
  }
}
