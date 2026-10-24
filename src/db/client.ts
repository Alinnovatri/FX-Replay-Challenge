import 'server-only';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-http';
import { drizzle as drizzlePglite } from 'drizzle-orm/pglite';
import { neon } from '@neondatabase/serverless';
import { PGlite } from '@electric-sql/pglite';
import * as schema from './schema';

export type Db = ReturnType<typeof drizzleNeon<typeof schema>> | ReturnType<typeof drizzlePglite<typeof schema>>;

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

/** On Vercel the driver is always Neon; elsewhere DB_DRIVER must be set explicitly. No silent default. */
export function resolveDriver(env: NodeJS.ProcessEnv = process.env): 'neon' | 'pglite' {
  if (env.VERCEL) return 'neon';
  const driver = env.DB_DRIVER;
  if (driver === 'neon' || driver === 'pglite') return driver;
  throw new Error('DB_DRIVER must be "neon" or "pglite" outside Vercel');
}

let db: Db | undefined;

export function getDb(): Db {
  if (db) return db;
  db =
    resolveDriver() === 'neon'
      ? drizzleNeon(neon(required('DATABASE_URL')), { schema })
      : drizzlePglite(new PGlite(required('PGLITE_DIR')), { schema });
  return db;
}

/** Test hook: lets integration tests inject a migrated in-memory database. */
export function setDbForTests(instance: Db): void {
  db = instance;
}
