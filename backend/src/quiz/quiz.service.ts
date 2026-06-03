import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { CreateRoundDto } from './dto/create-round.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';

type AuthUser = { id: number; role: string };

const roundDetailInclude = {
  questions: {
    include: {
      question: {
        include: { category: true, difficulty: true },
      },
    },
    orderBy: { order: 'asc' as const },
  },
  answers: {
    include: { user: { select: { id: true, username: true } } },
  },
  finalizations: {
    include: { user: { select: { id: true, username: true } } },
  },
  createdBy: { select: { id: true, username: true } },
  team: { select: { id: true, name: true } },
};

@Injectable()
export class QuizService {
  constructor(private prisma: PrismaService) {}

  private isAdmin(user: AuthUser): boolean {
    return user.role === 'ADMIN';
  }

  private async getMyTeamIds(userId: number): Promise<string[]> {
    const membership = await this.prisma.userTeam.findMany({
      where: { userId },
      select: { teamId: true },
    });
    return membership.map((m) => m.teamId);
  }

  private async assertTeamMember(userId: number, teamId: string) {
    const membership = await this.prisma.userTeam.findUnique({
      where: { userId_teamId: { userId, teamId } },
    });
    if (!membership) {
      throw new ForbiddenException('You are not a member of this team');
    }
  }

  private async assertCanParticipate(
    round: { teamId: string | null },
    userId: number,
  ) {
    if (round.teamId === null) return;
    await this.assertTeamMember(userId, round.teamId);
  }

  private async assertCanViewRound(
    round: { teamId: string | null },
    user: AuthUser,
  ) {
    if (round.teamId === null) return;
    if (this.isAdmin(user)) return;
    await this.assertTeamMember(user.id, round.teamId);
  }

  private async getActiveForScope(teamId: string | null) {
    return this.prisma.quizRound.findFirst({
      where: { status: 'ACTIVE', teamId },
    });
  }

  async getActiveRoundsForUser(userId: number) {
    const teamIds = await this.getMyTeamIds(userId);
    return this.prisma.quizRound.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ teamId: null }, { teamId: { in: teamIds } }],
      },
      include: roundDetailInclude,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRound(userId: number, dto: CreateRoundDto) {
    const teamId = dto.teamId ?? null;

    if (teamId) {
      await this.assertTeamMember(userId, teamId);
    }

    const active = await this.getActiveForScope(teamId);
    if (active) {
      const scope = teamId ? 'this team' : 'global';
      throw new ConflictException(
        `A quiz is already in progress for ${scope}`,
      );
    }

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
        teamId,
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
        team: { select: { id: true, name: true } },
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

    await this.assertCanParticipate(round, userId);

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

    await this.assertCanParticipate(round, userId);

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

  async cancelRound(roundId: number, user: AuthUser) {
    const round = await this.prisma.quizRound.findUnique({
      where: { id: roundId },
    });
    if (!round) throw new NotFoundException('Round not found');
    if (round.status !== 'ACTIVE')
      throw new BadRequestException('Round is not active');

    if (
      round.createdById !== user.id &&
      !this.isAdmin(user)
    ) {
      throw new ForbiddenException(
        'Only the round creator or an admin can cancel this round',
      );
    }

    return this.prisma.quizRound.update({
      where: { id: roundId },
      data: { status: 'CANCELLED' },
    });
  }

  async getRound(id: number, user: AuthUser) {
    const round = await this.prisma.quizRound.findUnique({
      where: { id },
      include: roundDetailInclude,
    });
    if (!round) throw new NotFoundException('Round not found');
    await this.assertCanViewRound(round, user);
    return round;
  }

  async getLastFinishedRound(userId: number) {
    const teamIds = await this.getMyTeamIds(userId);
    return this.prisma.quizRound.findFirst({
      where: {
        status: 'FINISHED',
        OR: [{ teamId: null }, { teamId: { in: teamIds } }],
      },
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
        team: { select: { id: true, name: true } },
      },
    });
  }

  private async buildRoundFilter(
    user: AuthUser,
    teamFilter?: string,
  ): Promise<Prisma.QuizRoundWhereInput> {
    const base: Prisma.QuizRoundWhereInput = {
      status: { in: ['FINISHED', 'CANCELLED'] },
    };

    if (!teamFilter || teamFilter === 'all') {
      if (this.isAdmin(user)) {
        return base;
      }
      const teamIds = await this.getMyTeamIds(user.id);
      return {
        ...base,
        OR: [{ teamId: null }, { teamId: { in: teamIds } }],
      };
    }

    if (teamFilter === 'global') {
      return { ...base, teamId: null };
    }

    if (!this.isAdmin(user)) {
      await this.assertTeamMember(user.id, teamFilter);
    }

    return { ...base, teamId: teamFilter };
  }

  async getHistory(user: AuthUser, page: number, teamFilter?: string, pageSize = 25) {
    const where = await this.buildRoundFilter(user, teamFilter);
    const skip = (page - 1) * pageSize;
    const [rounds, total] = await Promise.all([
      this.prisma.quizRound.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
        include: {
          questions: {
            include: { question: { select: { questionText: true, questionId: true } } },
          },
          team: { select: { id: true, name: true } },
          _count: { select: { finalizations: true } },
        },
      }),
      this.prisma.quizRound.count({ where }),
    ]);
    return { rounds, total, page, pageSize };
  }

  async getInsights(user: AuthUser, teamFilter?: string) {
    const roundWhere = await this.buildRoundFilter(user, teamFilter);

    const users = await this.prisma.user.findMany({
      where: {
        answers: {
          some: {
            quizRound: roundWhere,
          },
        },
      },
      include: {
        answers: {
          where: {
            quizRound: roundWhere,
          },
          include: {
            roundQuestion: {
              include: { question: true },
            },
          },
        },
      },
    });

    const stats = users.map((u) => {
      const played = u.answers.length;
      const correct = u.answers.filter(
        (a) =>
          a.roundQuestion.question.correctAnswer === a.selectedAnswer,
      ).length;
      return {
        id: u.id,
        username: u.username,
        played,
        correct,
        incorrect: played - correct,
        accuracy: played > 0 ? Math.round((correct / played) * 100) : 0,
      };
    });

    stats.sort((a, b) => b.correct - a.correct);
    return stats;
  }

  async getActivityStats(user: AuthUser, teamFilter?: string) {
    const roundWhere = await this.buildRoundFilter(user, teamFilter);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const rounds = await this.prisma.quizRound.findMany({
      where: {
        ...roundWhere,
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
