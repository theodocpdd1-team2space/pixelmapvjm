const attempts = new Map<string, { count: number; resetAt: number }>();

export function isRateLimited(key: string) {
  const now = Date.now();
  const current = attempts.get(key);

  if (!current || current.resetAt < now) {
    attempts.set(key, { count: 1, resetAt: now + 10 * 60 * 1000 });
    return false;
  }

  current.count += 1;
  return current.count > 8;
}

export function clearRateLimit(key: string) {
  attempts.delete(key);
}
