import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoundDto } from './dto/create-round.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

@Injectable()
export class QuizService {
  constructor(private prisma: PrismaService) {}

  async getActiveRound() {
    return this.prisma.quizRound.findFirst({
      where: { status: 'ACTIVE' },
      include: {
        questions: {
          include: {
            question: {
              include: { category: true, difficulty: true },
            },
          },
          orderBy: { order: 'asc' },
        },
        answers: {
          include: { user: { select: { id: true, username: true } } },
        },
        finalizations: {
          include: { user: { select: { id: true, username: true } } },
        },
        createdBy: { select: { id: true, username: true } },
      },
    });
  }

  async createRound(userId: number, dto: CreateRoundDto) {
    const active = await this.getActiveRound();
    if (active) throw new ConflictException('A quiz is currently in progress');

    const allQuestions = await this.prisma.question.findMany({
      select: { id: true },
    });
    if (allQuestions.length === 0) {
      throw new BadRequestException('No questions available to start a round');
    }

    const requestedQuestionCount = dto.questionCount ?? 4;
    const questionCount = Math.min(requestedQuestionCount, allQuestions.length);

    const shuffled = [...allQuestions];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    const selectedIds = shuffled.slice(0, questionCount).map((q) => q.id);

    let timeoutAt: Date | undefined;
    if (dto.timeoutMinutes) {
      timeoutAt = new Date(Date.now() + dto.timeoutMinutes * 60 * 1000);
    }

    return this.prisma.quizRound.create({
      data: {
        requiredParticipants: dto.requiredParticipants,
        createdById: userId,
        timeoutAt,
        questions: {
          create: selectedIds.map((id, index) => ({
            questionId: id,
            order: index + 1,
          })),
        },
      },
      include: {
        questions: {
          include: {
            question: {
              include: { category: true, difficulty: true },
            },
          },
        },
      },
    });
  }

  async submitAnswer(roundId: number, userId: number, dto: SubmitAnswerDto) {
    const round = await this.prisma.quizRound.findUnique({
      where: { id: roundId },
      include: { questions: true },
    });
    if (!round) throw new NotFoundException('Round not found');
    if (round.status !== 'ACTIVE')
      throw new BadRequestException('Round is not active');

    const rq = round.questions.find((q) => q.questionId === dto.questionId);
    if (!rq) throw new NotFoundException('Question not in this round');

    const finalized = await this.prisma.roundFinalization.findUnique({
      where: { quizRoundId_userId: { quizRoundId: roundId, userId } },
    });
    if (finalized) throw new ConflictException('Already finalized this round');

    if (round.timeoutAt && new Date() > round.timeoutAt) {
      await this.prisma.quizRound.update({
        where: { id: roundId },
        data: { status: 'CANCELLED' },
      });
      throw new BadRequestException('Round has timed out and was cancelled');
    }

    return this.prisma.answer.upsert({
      where: {
        userId_roundQuestionId: { userId, roundQuestionId: rq.id },
      },
      update: { selectedAnswer: dto.selectedAnswer },
      create: {
        quizRoundId: roundId,
        roundQuestionId: rq.id,
        userId,
        selectedAnswer: dto.selectedAnswer,
      },
    });
  }

  async finalizeRound(roundId: number, userId: number) {
    const round = await this.prisma.quizRound.findUnique({
      where: { id: roundId },
      include: { questions: true },
    });
    if (!round) throw new NotFoundException('Round not found');
    if (round.status !== 'ACTIVE')
      throw new BadRequestException('Round is not active');

    const alreadyFinalized = await this.prisma.roundFinalization.findUnique({
      where: { quizRoundId_userId: { quizRoundId: roundId, userId } },
    });
    if (alreadyFinalized) throw new ConflictException('Already finalized this round');

    const answersCount = await this.prisma.answer.count({
      where: { quizRoundId: roundId, userId },
    });

    if (answersCount < round.questions.length) {
      throw new BadRequestException(
        'All questions must be answered before finalization',
      );
    }

    await this.prisma.roundFinalization.create({
      data: { quizRoundId: roundId, userId },
    });

    const finalCount = await this.prisma.roundFinalization.count({
      where: { quizRoundId: roundId },
    });

    if (finalCount >= round.requiredParticipants) {
      await this.prisma.quizRound.update({
        where: { id: roundId },
        data: { status: 'FINISHED', finishedAt: new Date() },
      });
    }
  }

  async cancelRound(roundId: number) {
    const round = await this.prisma.quizRound.findUnique({
      where: { id: roundId },
    });
    if (!round) throw new NotFoundException('Round not found');
    if (round.status !== 'ACTIVE')
      throw new BadRequestException('Round is not active');

    return this.prisma.quizRound.update({
      where: { id: roundId },
      data: { status: 'CANCELLED' },
    });
  }

  async getRound(id: number) {
    const round = await this.prisma.quizRound.findUnique({
      where: { id },
      include: {
        questions: {
          include: {
            question: {
              include: { category: true, difficulty: true },
            },
          },
          orderBy: { order: 'asc' },
        },
        answers: {
          include: { user: { select: { id: true, username: true } } },
        },
        finalizations: {
          include: { user: { select: { id: true, username: true } } },
        },
        createdBy: { select: { id: true, username: true } },
      },
    });
    if (!round) throw new NotFoundException('Round not found');
    return round;
  }

  async getLastFinishedRound() {
    return this.prisma.quizRound.findFirst({
      where: { status: 'FINISHED' },
      orderBy: { finishedAt: 'desc' },
      include: {
        questions: {
          include: {
            question: {
              include: { category: true, difficulty: true },
            },
          },
          orderBy: { order: 'asc' },
        },
        answers: {
          include: { user: { select: { id: true, username: true } } },
        },
      },
    });
  }

  async getHistory(page: number, pageSize = 25) {
    const skip = (page - 1) * pageSize;
    const [rounds, total] = await Promise.all([
      this.prisma.quizRound.findMany({
        where: { status: { in: ['FINISHED', 'CANCELLED'] } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          questions: {
            include: { question: { select: { questionText: true, questionId: true } } },
          },
          _count: { select: { finalizations: true } },
        },
      }),
      this.prisma.quizRound.count({
        where: { status: { in: ['FINISHED', 'CANCELLED'] } },
      }),
    ]);
    return { rounds, total, page, pageSize };
  }

  async getInsights() {
    const users = await this.prisma.user.findMany({
      include: {
        answers: {
          include: {
            roundQuestion: {
              include: { question: true },
            },
          },
        },
      },
    });

    const stats = users.map((user) => {
      const played = user.answers.length;
      const correct = user.answers.filter((a) => {
        return a.roundQuestion.question.correctAnswer === a.selectedAnswer;
      }).length;
      return {
        id: user.id,
        username: user.username,
        played,
        correct,
        incorrect: played - correct,
        accuracy: played > 0 ? Math.round((correct / played) * 100) : 0,
      };
    });

    stats.sort((a, b) => b.correct - a.correct);

    return stats;
  }

  async getActivityStats() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const rounds = await this.prisma.quizRound.findMany({
      where: {
        status: 'FINISHED',
        finishedAt: { gte: thirtyDaysAgo },
      },
      select: { finishedAt: true },
    });

    const counts: Record<string, number> = {};
    for (let i = 0; i < 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      counts[d.toISOString().split('T')[0]] = 0;
    }

    rounds.forEach((r) => {
      if (r.finishedAt) {
        const dateStr = r.finishedAt.toISOString().split('T')[0];
        if (counts[dateStr] !== undefined) {
          counts[dateStr]++;
        }
      }
    });

    return Object.entries(counts)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
}
