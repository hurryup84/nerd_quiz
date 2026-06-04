const { execSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createClient } = require('@libsql/client');

const PRISMA_BIN = './node_modules/.bin/prisma';

const REQUIRED_TABLES = [
  'User',
  'Question',
  'Category',
  'Difficulty',
  'QuizRound',
  'RoundQuestion',
  'Settings',
  'Answer',
  'RoundFinalization',
  'Team',
  'UserTeam',
  'TeamInvite',
  'TeamExcludedCategory',
];

const REQUIRED_QUESTION_COLUMNS = [
  'id',
  'questionId',
  'questionText',
  'categoryId',
  'difficultyId',
  'info',
  'answerA',
  'answerB',
  'answerC',
  'answerD',
  'correctAnswer',
  'createdAt',
  'updatedAt',
];

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
  const hasTables = REQUIRED_TABLES.every((table) => existing.has(table));
  if (!hasTables) return false;

  const questionColumns = await client.execute('PRAGMA table_info("Question")');
  const existingColumns = new Set(
    questionColumns.rows.map((row) => String(row.name)),
  );

  return REQUIRED_QUESTION_COLUMNS.every((column) =>
    existingColumns.has(column),
  );
}

function runCapture(command, env = process.env) {
  return execSync(command, {
    stdio: ['ignore', 'pipe', 'inherit'],
    env,
    encoding: 'utf8',
  });
}

async function bootstrapLibsqlSchema(url, authToken) {
  const client = createDbClient(url, authToken);
  const existingTables = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'",
  );

  if (existingTables.rows.length > 0) {
    throw new Error(
      'Incompatible existing libSQL schema detected. Please recreate the database, then redeploy.',
    );
  }

  const tempSqlFile = path.join(
    os.tmpdir(),
    `nerd-quiz-bootstrap-${Date.now()}.sql`,
  );

  run(
    `${PRISMA_BIN} migrate diff --from-empty --to-schema prisma/schema.prisma --script --output "${tempSqlFile}"`,
    process.env,
  );

  const sql = fs.existsSync(tempSqlFile)
    ? fs.readFileSync(tempSqlFile, 'utf8')
    : '';

  if (!sql.trim()) {
    throw new Error(
      'Generated schema SQL is empty. Ensure Prisma CLI is available during build and retry deployment.',
    );
  }

  await client.executeMultiple(sql);

  if (fs.existsSync(tempSqlFile)) {
    fs.unlinkSync(tempSqlFile);
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
      console.log('Schema missing tables/columns in libSQL database. Applying schema SQL...');
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
