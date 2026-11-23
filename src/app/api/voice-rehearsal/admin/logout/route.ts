import { NextRequest, NextResponse } from 'next/server';
import { isSameOriginRequest, REHEARSAL_ADMIN_COOKIE } from '@/lib/rehearsal-admin';

export async function POST(request: NextRequest) {
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ error: 'This request could not be verified.' }, { status: 403 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(REHEARSAL_ADMIN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  return response;
}
