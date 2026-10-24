import 'server-only';
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import { HttpError, requiredEnv } from './http';

export const PROFILE_COOKIE = '__Host-fxr_profile';
export const PROFILE_COOKIE_MAX_AGE = 30 * 60;

function sameSecret(a: string, b: string): boolean {
  // Hash first so the comparison is constant-time regardless of length.
  return timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());
}

/** True when the request carries the admin bearer token. The token never reaches the browser. */
export function isAdmin(request: Request): boolean {
  const header = request.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return false;
  return sameSecret(header.slice('Bearer '.length), requiredEnv('ADMIN_TOKEN'));
}

export function requireAdmin(request: Request): void {
  if (!isAdmin(request)) throw new HttpError(401, 'UNAUTHORIZED', 'A valid admin token is required');
}

const b64 = (value: string | Buffer) => Buffer.from(value).toString('base64url');

function signature(payload: string): string {
  return createHmac('sha256', requiredEnv('SESSION_SECRET')).update(payload).digest('base64url');
}

/** Signed value bound to one user id, expiring after PROFILE_COOKIE_MAX_AGE seconds. */
export function signProfileToken(userId: string, now = Date.now()): string {
  const payload = b64(JSON.stringify({ uid: userId, exp: Math.floor(now / 1000) + PROFILE_COOKIE_MAX_AGE }));
  return `${payload}.${signature(payload)}`;
}

/** The user id the token was issued for, or null when it is missing, tampered with or expired. */
export function verifyProfileToken(token: string | undefined, now = Date.now()): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || !parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part))) return null;
  const [payload, sig] = parts as [string, string];
  try {
    const given = Buffer.from(sig, 'base64url');
    const expected = Buffer.from(signature(payload), 'base64url');
    if (given.length !== expected.length || !timingSafeEqual(given, expected)) return null;
    const { uid, exp } = JSON.parse(Buffer.from(payload, 'base64url').toString()) as { uid?: unknown; exp?: unknown };
    if (typeof uid !== 'string' || typeof exp !== 'number' || exp <= Math.floor(now / 1000)) return null;
    return uid;
  } catch {
    return null;
  }
}

export function profileCookie(userId: string): string {
  return `${PROFILE_COOKIE}=${signProfileToken(userId)}; Path=/; Max-Age=${PROFILE_COOKIE_MAX_AGE}; HttpOnly; Secure; SameSite=Strict`;
}

export function readCookie(request: Request, name: string): string | undefined {
  for (const part of request.headers.get('cookie')?.split(';') ?? []) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return rest.join('=');
  }
  return undefined;
}
