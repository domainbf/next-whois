const store = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000;

export function checkRateLimit(
  ip: string,
  maxRequests = 5
): { ok: boolean; remaining: number } {
  const now = Date.now();
  const entry = store.get(ip);

  if (!entry || now > entry.resetAt) {
    store.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true, remaining: maxRequests - 1 };
  }

  if (entry.count >= maxRequests) {
    return { ok: false, remaining: 0 };
  }

  entry.count += 1;
  return { ok: true, remaining: maxRequests - entry.count };
}

setInterval(() => {
  const now = Date.now();
  store.forEach((val, key) => {
    if (now > val.resetAt) store.delete(key);
  });
}, 120_000);
