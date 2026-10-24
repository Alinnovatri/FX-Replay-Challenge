import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '@/db/schema';
import { setDbForTests } from '@/db/client';

/** A fresh in-memory database with every migration applied, injected into the app's client. */
export async function freshDb() {
  const client = new PGlite('memory://');
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
  setDbForTests(db);
  return { db, client };
}
