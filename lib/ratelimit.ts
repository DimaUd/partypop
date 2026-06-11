// Simple in-memory rate limiting — per server instance.
// In production behind multiple instances, replace with Upstash/Redis.

type Bucket = { count: number; resetAt: number };
const g = globalThis as any;
if (!g.__PP_RL__) g.__PP_RL__ = new Map<string, Bucket>();
const buckets: Map<string, Bucket> = g.__PP_RL__;

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now > b.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count++;
  return b.count <= max;
}

export function clientIp(req: Request): string {
  const h = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim();
  return h || "local";
}

// Admin PIN check with brute-force lockout: 5 wrong attempts → 10 min lock per IP.
export function checkAdminPin(req: Request): { ok: boolean; locked: boolean } {
  const pin = req.headers.get("x-admin-pin") || "";
  const ip = clientIp(req);
  const lockKey = `pinlock:${ip}`;
  const lock = buckets.get(lockKey);
  if (lock && lock.count > 5 && Date.now() < lock.resetAt) return { ok: false, locked: true };
  if (pin === (process.env.ADMIN_PIN || "2468")) return { ok: true, locked: false };
  rateLimit(lockKey, 5, 10 * 60 * 1000);
  return { ok: false, locked: false };
}

export const ISRAELI_PHONE = /^0(5\d|[2-4]|[8-9]|7[0-9])-?\d{7}$/;
export const cap = (s: unknown, n: number) => String(s ?? "").slice(0, n);
