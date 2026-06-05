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
  'playCount',
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

  // Check Question table columns - allow missing playCount column (incremental update)
  const questionColumns = await client.execute('PRAGMA table_info("Question")');
  const existingColumns = new Set(
    questionColumns.rows.map((row) => String(row.name)),
  );

  // Required columns excluding playCount (which is added incrementally)
  const requiredColumnsExcludingPlayCount = REQUIRED_QUESTION_COLUMNS.filter(
    (col) => col !== 'playCount',
  );

  return requiredColumnsExcludingPlayCount.every((column) =>
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

  const existingTableNames = new Set(
    existingTables.rows.map((row) => String(row.name)),
  );

  // Check for missing TeamExcludedCategory table (incremental update)
  const missingTeamExcludedCategory = !existingTableNames.has('TeamExcludedCategory');

  // Check for missing playCount column
  const questionColumns = await client.execute('PRAGMA table_info("Question")');
  const existingColumnNames = new Set(
    questionColumns.rows.map((row) => String(row.name)),
  );
  const missingPlayCount = !existingColumnNames.has('playCount');

  // Handle incremental updates
  if (existingTableNames.size > 0 && (missingTeamExcludedCategory || missingPlayCount)) {
    let sql = '';

    if (missingTeamExcludedCategory) {
      sql += `
        CREATE TABLE IF NOT EXISTS "TeamExcludedCategory" (
          "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
          "teamId" TEXT NOT NULL,
          "categoryId" INTEGER NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "TeamExcludedCategory_teamId_categoryId_key"
          ON "TeamExcludedCategory"("teamId", "categoryId");
      `;
    }

    if (missingPlayCount) {
      sql += `
        ALTER TABLE "Question" ADD COLUMN "playCount" INTEGER NOT NULL DEFAULT 0;
        CREATE INDEX IF NOT EXISTS "Question_playCount_idx" ON "Question"("playCount");
      `;
    }

    await client.execute(sql);
    console.log('Applied incremental schema migrations.');
    return;
  }

  if (existingTableNames.size > 0) {
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
  run('NODE_OPTIONS=--max-old-space-size=512 npm run seed:direct', {
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
