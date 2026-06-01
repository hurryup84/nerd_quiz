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
    await prisma.question.createMany({
      data: [
        {
          questionId: 'Q001',
          questionText: 'What does CPU stand for?',
          answerA: 'Central Process Unit',
          answerB: 'Central Processing Unit',
          answerC: 'Computer Personal Unit',
          answerD: 'Central Processor Utility',
          correctAnswer: 'B',
        },
        {
          questionId: 'Q002',
          questionText: 'Which language is used for web styling?',
          answerA: 'HTML',
          answerB: 'Python',
          answerC: 'CSS',
          answerD: 'Java',
          correctAnswer: 'C',
        },
        {
          questionId: 'Q003',
          questionText: 'What is the binary representation of 5?',
          answerA: '101',
          answerB: '110',
          answerC: '011',
          answerD: '111',
          correctAnswer: 'A',
        },
      ],
    });
    console.log('✅ 3 Default questions created');
  }

  await app.close();
}
bootstrap();
