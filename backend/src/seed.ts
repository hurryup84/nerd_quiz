import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { UsersService } from './users/users.service';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const usersService = app.get(UsersService);
  const prisma = app.get(PrismaService);

  try {
    await usersService.create('admin', 'admin1234', 'ADMIN');
    console.log('✅ Admin created: username=admin  password=admin1234');
  } catch {
    console.log('ℹ️  Admin already exists — skipping seed');
  }

  const questionCount = await prisma.question.count();
  if (questionCount === 0) {
    const categories = ['Computer Science', 'Web Development', 'Mathematics'];
    const difficulties = ['Easy', 'Medium', 'Hard'];

    for (const name of categories) {
      await prisma.category.upsert({
        where: { name },
        create: { name },
        update: {},
      });
    }

    for (const name of difficulties) {
      await prisma.difficulty.upsert({
        where: { name },
        create: { name },
        update: {},
      });
    }

    const [cs, web, math] = await Promise.all([
      prisma.category.findUniqueOrThrow({ where: { name: 'Computer Science' } }),
      prisma.category.findUniqueOrThrow({ where: { name: 'Web Development' } }),
      prisma.category.findUniqueOrThrow({ where: { name: 'Mathematics' } }),
    ]);

    const [easy, medium] = await Promise.all([
      prisma.difficulty.findUniqueOrThrow({ where: { name: 'Easy' } }),
      prisma.difficulty.findUniqueOrThrow({ where: { name: 'Medium' } }),
    ]);

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
  }

  await app.close();
}
bootstrap();
