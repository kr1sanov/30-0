import { createHmac, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'run_access';
const DEVELOPMENT_SECRET = '30-0-local-development-only';

function sessionSecret(): string {
  const configured = process.env.RUN_SESSION_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV !== 'production') return DEVELOPMENT_SECRET;
  throw new Error('RUN_SESSION_SECRET is required in production');
}

function signature(runId: string): string {
  return createHmac('sha256', sessionSecret()).update(runId).digest('base64url');
}

function cookieValue(request: Request): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;

  for (const part of header.split(';')) {
    const [name, ...valueParts] = part.trim().split('=');
    if (name === COOKIE_NAME) return decodeURIComponent(valueParts.join('='));
  }

  return undefined;
}

export function ensureRunAccessConfigured(): void {
  sessionSecret();
}

export function setRunAccessCookie(response: NextResponse, runId: string): void {
  response.cookies.set(COOKIE_NAME, `${runId}.${signature(runId)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60,
    path: `/api/runs/${runId}`,
  });
}

export function authorizeRun(request: Request, runId: string): NextResponse | null {
  try {
    const value = cookieValue(request);
    if (!value) return unauthorized();

    const separator = value.indexOf('.');
    if (separator < 1) return unauthorized();

    const tokenRunId = value.slice(0, separator);
    const supplied = value.slice(separator + 1);
    const expected = signature(runId);

    if (tokenRunId !== runId) return unauthorized();

    const suppliedBuffer = Buffer.from(supplied);
    const expectedBuffer = Buffer.from(expected);
    if (
      suppliedBuffer.length !== expectedBuffer.length ||
      !timingSafeEqual(suppliedBuffer, expectedBuffer)
    ) {
      return unauthorized();
    }

    return null;
  } catch {
    return unauthorized();
  }
}

function unauthorized(): NextResponse {
  return NextResponse.json({ error: 'Run access denied' }, { status: 403 });
}
