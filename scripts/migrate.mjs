#!/usr/bin/env node
// Applies Drizzle migrations from ./drizzle. Production runs this only from scripts/vercel-build.mjs.
// Driver: Neon on Vercel; elsewhere DB_DRIVER must be "neon" or "pglite". Fails loudly if anything is missing.

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`migrate: ${name} is required`);
  return value;
}

const driver = process.env.VERCEL ? 'neon' : process.env.DB_DRIVER;
if (driver !== 'neon' && driver !== 'pglite')
  throw new Error('migrate: DB_DRIVER must be "neon" or "pglite" outside Vercel');

if (driver === 'neon') {
  const { neon } = await import('@neondatabase/serverless');
  const { drizzle } = await import('drizzle-orm/neon-http');
  const { migrate } = await import('drizzle-orm/neon-http/migrator');
  await migrate(drizzle(neon(required('DATABASE_URL'))), { migrationsFolder: './drizzle' });
} else {
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const { migrate } = await import('drizzle-orm/pglite/migrator');
  const client = new PGlite(required('PGLITE_DIR'));
  await migrate(drizzle(client), { migrationsFolder: './drizzle' });
  await client.close();
}
console.log(`migrate: applied migrations with ${driver}`);
