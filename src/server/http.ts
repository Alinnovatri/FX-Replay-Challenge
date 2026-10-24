import 'server-only';
import type { ApiError, ErrorCode } from '@/contracts/users';

const MAX_BODY_BYTES = 10_000;

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

/** A required setting is missing: fail the request loudly instead of falling back. */
export class ConfigError extends Error {
  constructor(readonly setting: string) {
    super(`${setting} is not configured`);
    this.name = 'ConfigError';
  }
}

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new ConfigError(name);
  return value;
}

const noStore = { 'cache-control': 'no-store' };

export function json(body: unknown, status: number, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers: { ...noStore, ...headers } });
}

export function errorResponse(error: HttpError, requestId: string): Response {
  const body: ApiError = { error: { code: error.code, message: error.message, requestId } };
  if (error.fields) body.error.fields = error.fields;
  return json(body, error.status, { 'x-request-id': requestId });
}

/** SQLSTATE from PGlite or Neon errors; drizzle wraps driver errors in `cause`. */
export function sqlstate(error: unknown): string | undefined {
  const e = error as { code?: unknown; cause?: { code?: unknown } } | undefined;
  const code = e?.code ?? e?.cause?.code;
  return typeof code === 'string' && /^[0-9A-Z]{5}$/.test(code) ? code : undefined;
}

/** Logs carry the error class and SQLSTATE only: never messages, which can contain SQL or personal data. */
export function logError(event: string, error: unknown, requestId: string): void {
  const entry: Record<string, string | undefined> = {
    event,
    requestId,
    errorClass: error instanceof Error ? error.name : 'unknown',
    sqlstate: sqlstate(error),
  };
  if (error instanceof ConfigError) entry.setting = error.setting;
  console.error(JSON.stringify(entry));
}

/** Wraps a handler: known errors map to the uniform shape, anything else is a logged 500. */
export async function handle(fn: (requestId: string) => Promise<Response>): Promise<Response> {
  const requestId = crypto.randomUUID();
  try {
    const response = await fn(requestId);
    response.headers.set('x-request-id', requestId);
    return response;
  } catch (error) {
    if (error instanceof HttpError) return errorResponse(error, requestId);
    logError('request_failed', error, requestId);
    return errorResponse(new HttpError(500, 'INTERNAL', 'Something went wrong. Please try again.'), requestId);
  }
}

export async function readJson(request: Request): Promise<unknown> {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) {
    throw new HttpError(400, 'VALIDATION_FAILED', 'Send a JSON body with Content-Type: application/json');
  }
  const text = await request.text();
  if (new TextEncoder().encode(text).byteLength > MAX_BODY_BYTES) {
    throw new HttpError(400, 'VALIDATION_FAILED', 'Request body is too large');
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new HttpError(400, 'VALIDATION_FAILED', 'Request body is not valid JSON');
  }
}

interface SafeParse<T> {
  success: boolean;
  data?: T;
  error?: { issues: { path: PropertyKey[]; message: string; code?: string; keys?: string[] }[] };
}

/** Turns schema issues into `fields`: { "email": "Enter a valid email address" }. */
export function parseOr400<T>(result: SafeParse<T>): T {
  if (result.success) return result.data as T;
  const fields: Record<string, string> = {};
  for (const issue of result.error?.issues ?? []) {
    if (issue.code === 'unrecognized_keys' && issue.keys) {
      for (const key of issue.keys) fields[key] = 'Unknown field';
      continue;
    }
    const path = issue.path.map(String).join('.') || '_';
    fields[path] ??= issue.message;
  }
  throw new HttpError(400, 'VALIDATION_FAILED', 'Some fields are invalid', fields);
}
