#!/usr/bin/env node
// Applies Drizzle migrations from ./drizzle.
// - PGlite: local development and tests (DB_DRIVER=pglite, PGLITE_DIR required).
// - Neon: only inside a Vercel production build (migrate-on-deploy). Anywhere else it refuses to run, so a
//   laptop or CI job that happens to hold a Neon URL can't change the production schema.
// Errors are logged as error class and SQLSTATE only: driver messages can carry SQL or connection details.

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`migrate: ${name} is required`);
  return value;
}

const driver = process.env.VERCEL ? 'neon' : process.env.DB_DRIVER;

try {
  if (driver === 'neon') {
    if (process.env.VERCEL_ENV !== 'production') {
      throw new Error('migrate: Neon migrations run only in a Vercel production build');
    }
    const { neon } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-http');
    const { migrate } = await import('drizzle-orm/neon-http/migrator');
    await migrate(drizzle(neon(required('DATABASE_URL'))), { migrationsFolder: './drizzle' });
  } else if (driver === 'pglite') {
    const { PGlite } = await import('@electric-sql/pglite');
    const { drizzle } = await import('drizzle-orm/pglite');
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    const client = new PGlite(required('PGLITE_DIR'));
    await migrate(drizzle(client), { migrationsFolder: './drizzle' });
    await client.close();
  } else {
    throw new Error('migrate: DB_DRIVER must be "neon" or "pglite" outside Vercel');
  }
  console.log(`migrate: applied migrations with ${driver}`);
} catch (error) {
  // Our own guard messages are safe to print; driver errors are reduced to class and SQLSTATE.
  const ours = error instanceof Error && error.message.startsWith('migrate: ');
  const sqlstate = error?.cause?.code ?? error?.code;
  console.error(
    ours ? error.message : JSON.stringify({ event: 'migrate_failed', errorClass: error?.name ?? 'unknown', sqlstate }),
  );
  process.exit(1);
}
