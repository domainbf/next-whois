import Redis from "ioredis";

export const REDIS_URL =
  (process.env.KV_URL as string | undefined) ||
  (process.env.REDIS_URL as string | undefined);

export const REDIS_HOST = process.env.REDIS_HOST as string | undefined;
export const REDIS_PORT = parseInt(process.env.REDIS_PORT || "6379");
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
export const REDIS_DB = parseInt(process.env.REDIS_DB || "0");
export const REDIS_CACHE_TTL = parseInt(process.env.REDIS_CACHE_TTL || "3600");

export const redis = createRedisConn();

function createRedisConn(): Redis | undefined {
  if (REDIS_URL) {
    try {
      const client = new Redis(REDIS_URL, {
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        commandTimeout: 2000,
        lazyConnect: false,
        enableReadyCheck: false,
        keepAlive: 10000,
      });
      client.on("error", (err) => {
        console.error("Redis connection error:", err.message);
      });
      return client;
    } catch (error) {
      console.error("Failed to connect to Redis via URL:", error);
    }
  }
  if (REDIS_HOST) {
    try {
      const client = new Redis({
        host: REDIS_HOST,
        port: REDIS_PORT,
        password: REDIS_PASSWORD,
        db: REDIS_DB,
        maxRetriesPerRequest: 1,
        connectTimeout: 3000,
        commandTimeout: 2000,
        enableReadyCheck: false,
        keepAlive: 10000,
      });
      client.on("error", (err) => {
        console.error("Redis connection error:", err.message);
      });
      return client;
    } catch (error) {
      console.error("Failed to connect to Redis:", error);
    }
  }
}

export function isRedisAvailable(): boolean {
  return !!redis;
}

export async function getRedisValue(key: string): Promise<string | null> {
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch (err) {
    console.error(`Redis GET error for key ${key}:`, err);
    return null;
  }
}

export async function setRedisValue(
  key: string,
  value: string,
  ttl?: number,
): Promise<boolean> {
  if (!redis) return false;
  try {
    const effectiveTtl = ttl !== undefined ? ttl : REDIS_CACHE_TTL;
    if (effectiveTtl > 0) {
      await redis.set(key, value, "EX", effectiveTtl);
    } else {
      await redis.set(key, value);
    }
    return true;
  } catch (err) {
    console.error(`Redis SET error for key ${key}:`, err);
    return false;
  }
}

export async function deleteRedisValue(key: string): Promise<boolean> {
  if (!redis) return false;
  try {
    await redis.del(key);
    return true;
  } catch (err) {
    console.error(`Redis DEL error for key ${key}:`, err);
    return false;
  }
}

export async function getJsonRedisValue<T>(key: string): Promise<T | null> {
  const res = await getRedisValue(key);
  if (!res) return null;
  try {
    return JSON.parse(res) as T;
  } catch (error) {
    console.error("Failed to parse JSON from Redis:", error);
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
  } catch (error) {
    console.error("Failed to stringify JSON for Redis:", error);
    return false;
  }
}
