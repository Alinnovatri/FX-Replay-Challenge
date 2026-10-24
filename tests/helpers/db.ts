import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from '@/db/schema';
import { setDbForTests } from '@/db/client';

const open: PGlite[] = [];

/** Closes every database created by freshDb(); call from afterEach. */
export async function closeDbs() {
  await Promise.all(open.splice(0).map((client) => client.close()));
}

/** A fresh in-memory database with every migration applied, injected into the app's client. */
export async function freshDb() {
  const client = new PGlite('memory://');
  open.push(client);
  const db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: './drizzle' });
  setDbForTests(db);
  return { db, client };
}
