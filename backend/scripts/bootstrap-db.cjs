const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const { createClient } = require('@libsql/client');

const REQUIRED_TABLES = [
  'User',
  'Question',
  'QuizRound',
  'RoundQuestion',
  'Settings',
  'Answer',
  'RoundFinalization',
];

const INITIAL_TABLES = ['User', 'Question', 'QuizRound', 'Answer'];
const ALIGN_TABLES = ['Settings', 'RoundQuestion', 'RoundFinalization'];

const INIT_MIGRATION_FILE = path.join(
  __dirname,
  '..',
  'prisma',
  'migrations',
  '20260601183749_init',
  'migration.sql',
);

const ALIGN_MIGRATION_FILE = path.join(
  __dirname,
  '..',
  'prisma',
  'migrations',
  '20260602002000_align_schema_with_current_models',
  'migration.sql',
);

function createDbClient(url, authToken) {
  return createClient({
    url,
    ...(authToken ? { authToken } : {}),
  });
}

async function hasRequiredSchema(url, authToken) {
  const client = createDbClient(url, authToken);

  const placeholders = REQUIRED_TABLES.map(() => '?').join(', ');
  const result = await client.execute({
    sql: `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${placeholders})`,
    args: REQUIRED_TABLES,
  });

  const existing = new Set(result.rows.map((row) => String(row.name)));
  return REQUIRED_TABLES.every((table) => existing.has(table));
}

async function getExistingTables(client, tableNames) {
  const placeholders = tableNames.map(() => '?').join(', ');
  const result = await client.execute({
    sql: `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${placeholders})`,
    args: tableNames,
  });
  return new Set(result.rows.map((row) => String(row.name)));
}

function hasAllTables(existingTables, requiredTables) {
  return requiredTables.every((table) => existingTables.has(table));
}

async function applyMigrationSql(client, filePath) {
  const sql = fs.readFileSync(filePath, 'utf8');
  await client.executeMultiple(sql);
}

async function bootstrapLibsqlSchema(url, authToken) {
  const client = createDbClient(url, authToken);
  let existingTables = await getExistingTables(client, REQUIRED_TABLES);

  if (!hasAllTables(existingTables, INITIAL_TABLES)) {
    console.log('Applying initial migration SQL to libSQL database...');
    await applyMigrationSql(client, INIT_MIGRATION_FILE);
    existingTables = await getExistingTables(client, REQUIRED_TABLES);
  }

  if (!hasAllTables(existingTables, ALIGN_TABLES)) {
    console.log('Applying alignment migration SQL to libSQL database...');
    await applyMigrationSql(client, ALIGN_MIGRATION_FILE);
  }

  const schemaReady = await hasRequiredSchema(url, authToken);
  if (!schemaReady) {
    throw new Error('Schema bootstrap did not produce all required tables');
  }
}

function run(command, env = process.env) {
  execSync(command, {
    stdio: 'inherit',
    env,
  });
}

async function main() {
  const targetUrl =
    process.env.TURSO_DATABASE_URL ??
    process.env.DATABASE_URL ??
    'file:./dev.db';

  const authToken = process.env.TURSO_AUTH_TOKEN;
  const schemaReady = await hasRequiredSchema(targetUrl, authToken);

  if (!schemaReady) {
    if (targetUrl.startsWith('libsql://')) {
      console.log('Schema missing tables in libSQL database. Applying migration SQL...');
      await bootstrapLibsqlSchema(targetUrl, authToken);
    } else {
      console.log('Schema missing tables. Running prisma db push...');
      run('npm exec prisma db push --skip-generate', {
        ...process.env,
        DATABASE_URL: targetUrl,
      });
    }
  } else {
    console.log('Schema already present. Skipping schema update.');
  }

  console.log('Running seed...');
  run('npm run seed', {
    ...process.env,
    DATABASE_URL: targetUrl,
    ...(targetUrl.startsWith('libsql://')
      ? { TURSO_DATABASE_URL: targetUrl }
      : {}),
  });
}

main().catch((error) => {
  console.error('Database bootstrap failed:', error);
  process.exit(1);
});
