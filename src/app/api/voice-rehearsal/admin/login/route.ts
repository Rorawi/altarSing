import { NextRequest, NextResponse } from 'next/server';
import {
  createRehearsalAdminSession,
  isRehearsalAdminConfigured,
  isSameOriginRequest,
  REHEARSAL_ADMIN_COOKIE,
  verifyRehearsalAdminPassword,
} from '@/lib/rehearsal-admin';

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 8;
const attempts = new Map<string, { count: number; resetAt: number }>();

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'This request could not be verified.' }, { status: 403 });
  }
  if (!isRehearsalAdminConfigured()) {
    return NextResponse.json({ error: 'Admin access is not configured on this deployment.' }, { status: 503 });
  }

  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const now = Date.now();
  const current = attempts.get(ip);
  if (current && now < current.resetAt && current.count >= RATE_LIMIT_MAX) {
    return NextResponse.json({ error: 'Too many attempts. Wait a few minutes and try again.' }, { status: 429 });
  }
  attempts.set(ip, current && now < current.resetAt
    ? { ...current, count: current.count + 1 }
    : { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });

  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Enter the admin passphrase.' }, { status: 400 });
  }

  if (typeof body.password !== 'string' || !verifyRehearsalAdminPassword(body.password)) {
    return NextResponse.json({ error: 'That passphrase is not correct.' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(REHEARSAL_ADMIN_COOKIE, createRehearsalAdminSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
  return response;
}
