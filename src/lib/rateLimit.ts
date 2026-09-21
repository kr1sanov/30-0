import { NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  limit: number;
  windowMs: number;
}

const globalRateLimit = globalThis as typeof globalThis & {
  __rateLimitStore?: Map<string, RateLimitEntry>;
};

const store = globalRateLimit.__rateLimitStore ?? new Map<string, RateLimitEntry>();

if (process.env.NODE_ENV !== 'production') {
  globalRateLimit.__rateLimitStore = store;
}

function clientAddress(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return request.headers.get('x-real-ip') || 'unknown';
}

export function enforceRateLimit(
  request: Request,
  scope: string,
  { limit, windowMs }: RateLimitOptions,
): NextResponse | null {
  const now = Date.now();
  const key = `${scope}:${clientAddress(request)}`;
  const current = store.get(key);

  if (!current || current.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  if (current.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfter),
          'X-RateLimit-Limit': String(limit),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(Math.ceil(current.resetAt / 1000)),
        },
      },
    );
  }

  current.count += 1;
  return null;
}
