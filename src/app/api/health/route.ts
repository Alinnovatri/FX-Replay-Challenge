import { sql } from 'drizzle-orm';
import { getDb } from '@/db/client';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<Response> {
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ status: 'ok', db: 'ok' }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    // Error class only: messages can carry connection details.
    console.error(
      JSON.stringify({ event: 'health_db_failed', errorClass: error instanceof Error ? error.name : 'unknown' }),
    );
    return Response.json(
      { status: 'degraded', db: 'unreachable' },
      { status: 503, headers: { 'cache-control': 'no-store' } },
    );
  }
}
