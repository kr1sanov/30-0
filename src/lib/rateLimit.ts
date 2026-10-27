import { NextResponse } from 'next/server';

import { FixedWindowLimit } from './fixedWindowLimit';

interface RateLimitOptions { limit: number; windowMs: number }
const globalRateLimit = globalThis as typeof globalThis & { __fixedWindowLimit?: FixedWindowLimit };
const store = globalRateLimit.__fixedWindowLimit ?? new FixedWindowLimit();
if (process.env.NODE_ENV !== 'production') globalRateLimit.__fixedWindowLimit = store;

function clientAddress(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim().slice(0, 128);
  return (request.headers.get('x-real-ip') || 'unknown').slice(0, 128);
}

export function enforceRateLimit(
  request: Request,
  scope: string,
  { limit, windowMs }: RateLimitOptions,
): NextResponse | null {
  const now = Date.now();
  const current = store.consume(`${scope}:${clientAddress(request)}`, { limit, windowMs }, now);
  if (!current.allowed) {
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

  return null;
}
