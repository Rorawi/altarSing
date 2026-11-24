import 'server-only';

import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';

export const REHEARSAL_ADMIN_COOKIE = 'altarsing_rehearsal_admin';
const SESSION_TTL_SECONDS = 60 * 60 * 12;

export function isRehearsalAdminConfigured() {
  return Boolean(
    process.env.REHEARSAL_ADMIN_PASSWORD &&
      process.env.REHEARSAL_ADMIN_SESSION_SECRET &&
      process.env.REHEARSAL_ADMIN_SESSION_SECRET.length >= 32 &&
      process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
}

function signature(expiresAt: number) {
  const secret = process.env.REHEARSAL_ADMIN_SESSION_SECRET;
  if (!secret) return '';
  return createHmac('sha256', secret).update(`voice-admin:${expiresAt}`).digest('base64url');
}

export function verifyRehearsalAdminPassword(candidate: string) {
  const expected = process.env.REHEARSAL_ADMIN_PASSWORD;
  if (!expected || !isRehearsalAdminConfigured()) return false;
  const candidateHash = createHash('sha256').update(candidate).digest();
  const expectedHash = createHash('sha256').update(expected).digest();
  return timingSafeEqual(candidateHash, expectedHash);
}

export function createRehearsalAdminSession() {
  const expiresAt = Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS;
  return `${expiresAt}.${signature(expiresAt)}`;
}

export function isValidRehearsalAdminSession(token?: string | null) {
  if (!token || !isRehearsalAdminConfigured()) return false;
  const [expiresText, suppliedSignature, extra] = token.split('.');
  const expiresAt = Number(expiresText);
  if (extra !== undefined || !Number.isSafeInteger(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000)) {
    return false;
  }

  const expectedSignature = signature(expiresAt);
  const supplied = Buffer.from(suppliedSignature ?? '');
  const expected = Buffer.from(expectedSignature);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

export async function hasRehearsalAdminSession() {
  const cookieStore = await cookies();
  return isValidRehearsalAdminSession(cookieStore.get(REHEARSAL_ADMIN_COOKIE)?.value);
}

export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get('origin');
  if (!origin) return false;
  try {
    return new URL(origin).origin === new URL(request.url).origin;
  } catch {
    return false;
  }
}
