const { execSync } = require('node:child_process');
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

async function hasRequiredSchema(url, authToken) {
  const client = createClient({
    url,
    ...(authToken ? { authToken } : {}),
  });

  const placeholders = REQUIRED_TABLES.map(() => '?').join(', ');
  const result = await client.execute({
    sql: `SELECT name FROM sqlite_master WHERE type='table' AND name IN (${placeholders})`,
    args: REQUIRED_TABLES,
  });

  const existing = new Set(result.rows.map((row) => String(row.name)));
  return REQUIRED_TABLES.every((table) => existing.has(table));
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
    console.log('Schema missing tables. Running prisma db push...');
    run('npm exec prisma db push --skip-generate', {
      ...process.env,
      DATABASE_URL: targetUrl,
    });
  } else {
    console.log('Schema already present. Skipping schema update.');
  }

  console.log('Running seed...');
  run('npm run seed');
}

main().catch((error) => {
  console.error('Database bootstrap failed:', error);
  process.exit(1);
});
