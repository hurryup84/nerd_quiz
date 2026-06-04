const { PrismaClient } = require('@prisma/client');
const { PrismaLibSql } = require('@prisma/adapter-libsql');
const path = require('path');

function getDatabaseUrl() {
  const rawUrl = process.env.TURSO_DATABASE_URL ?? process.env.DATABASE_URL ?? 'file:./dev.db';
  if (rawUrl.startsWith('file:')) {
    return `file:${path.resolve(process.cwd(), rawUrl.replace('file:', ''))}`;
  }
  return rawUrl;
}

async function main() {
  const url = getDatabaseUrl();
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const adapter = authToken ? new PrismaLibSql({ url, authToken }) : new PrismaLibSql({ url });
  const prisma = new PrismaClient({ adapter });

  try {
    // Create admin user
    try {
      const hashedPassword = await require('argon2').hash('admin1234');
      await prisma.user.upsert({
        where: { username: 'admin' },
        update: {},
        create: { username: 'admin', passwordHash: hashedPassword, role: 'ADMIN' },
      });
      console.log('✅ Admin created: username=admin  password=admin1234');
    } catch {
      console.log('ℹ️  Admin already exists — skipping');
    }

    // Check if questions exist
    const questionCount = await prisma.question.count();
    if (questionCount > 0) {
      console.log('ℹ️  Questions already exist — skipping seed');
      return;
    }

    // Create categories
    for (const name of ['Computer Science', 'Web Development', 'Mathematics']) {
      await prisma.category.upsert({
        where: { name },
        create: { name },
        update: {},
      });
    }

    // Create difficulties
    for (const name of ['Easy', 'Medium', 'Hard']) {
      await prisma.difficulty.upsert({
        where: { name },
        create: { name },
        update: {},
      });
    }

    // Get created entities
    const [cs, web, math] = await Promise.all([
      prisma.category.findUniqueOrThrow({ where: { name: 'Computer Science' } }),
      prisma.category.findUniqueOrThrow({ where: { name: 'Web Development' } }),
      prisma.category.findUniqueOrThrow({ where: { name: 'Mathematics' } }),
    ]);

    const [easy, medium] = await Promise.all([
      prisma.difficulty.findUniqueOrThrow({ where: { name: 'Easy' } }),
      prisma.difficulty.findUniqueOrThrow({ where: { name: 'Medium' } }),
    ]);

    // Create sample questions
    await prisma.question.upsert({
      where: { questionId: 'Q001' },
      update: {},
      create: {
        questionId: 'Q001',
        questionText: 'What does CPU stand for?',
        categoryId: cs.id,
        difficultyId: easy.id,
        info: 'CPU is short for Central Processing Unit, often described as the brain of a computer.',
        answerA: 'Central Process Unit',
        answerB: 'Central Processing Unit',
        answerC: 'Computer Personal Unit',
        answerD: 'Central Processor Utility',
        correctAnswer: 'B',
      },
    });

    await prisma.question.upsert({
      where: { questionId: 'Q002' },
      update: {},
      create: {
        questionId: 'Q002',
        questionText: 'Which language is used for web styling?',
        categoryId: web.id,
        difficultyId: easy.id,
        info: 'CSS controls presentation and layout, while HTML provides structure and JavaScript adds behavior.',
        answerA: 'HTML',
        answerB: 'Python',
        answerC: 'CSS',
        answerD: 'Java',
        correctAnswer: 'C',
      },
    });

    await prisma.question.upsert({
      where: { questionId: 'Q003' },
      update: {},
      create: {
        questionId: 'Q003',
        questionText: 'What is the binary representation of 5?',
        categoryId: math.id,
        difficultyId: medium.id,
        info: 'Decimal 5 equals binary 101 because 5 = 4 + 1.',
        answerA: '101',
        answerB: '110',
        answerC: '011',
        answerD: '111',
        correctAnswer: 'A',
      },
    });

    console.log('✅ 3 Default questions created');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error('Seed failed:', error);
  process.exit(1);
});