import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateQuestionDto } from './dto/create-question.dto';

@Injectable()
export class QuestionsService {
  constructor(private prisma: PrismaService) {}

  private async generateQuestionId(): Promise<string> {
    const last = await this.prisma.question.findFirst({
      orderBy: { id: 'desc' },
      select: { id: true },
    });
    const num = (last?.id ?? 0) + 1;
    return `Q${String(num).padStart(4, '0')}`;
  }

  private normalizeOptionalString(value: string | undefined): string | null {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  }

  private async ensureMetaExists(categoryId?: number, difficultyId?: number) {
    if (categoryId !== undefined) {
      const category = await this.prisma.category.findUnique({
        where: { id: categoryId },
      });
      if (!category)
        throw new BadRequestException('Selected category does not exist');
    }

    if (difficultyId !== undefined) {
      const difficulty = await this.prisma.difficulty.findUnique({
        where: { id: difficultyId },
      });
      if (!difficulty)
        throw new BadRequestException('Selected difficulty does not exist');
    }
  }

  async getMeta() {
    const [categories, difficulties] = await Promise.all([
      this.prisma.category.findMany({ orderBy: { name: 'asc' } }),
      this.prisma.difficulty.findMany({ orderBy: { name: 'asc' } }),
    ]);
    return { categories, difficulties };
  }

  async createCategory(name: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException('Category name is required');

    try {
      return await this.prisma.category.create({ data: { name: trimmed } });
    } catch {
      throw new ConflictException('Category already exists');
    }
  }

  async createDifficulty(name: string) {
    const trimmed = name.trim();
    if (!trimmed) throw new BadRequestException('Difficulty name is required');

    try {
      return await this.prisma.difficulty.create({ data: { name: trimmed } });
    } catch {
      throw new ConflictException('Difficulty already exists');
    }
  }

  async create(dto: CreateQuestionDto) {
    const questionId = await this.generateQuestionId();

    await this.ensureMetaExists(dto.categoryId, dto.difficultyId);

    return this.prisma.question.create({
      data: {
        questionId,
        questionText: dto.questionText,
        answerA: dto.answerA,
        answerB: dto.answerB,
        answerC: dto.answerC,
        answerD: dto.answerD,
        correctAnswer: dto.correctAnswer,
        info: this.normalizeOptionalString(dto.info),
        categoryId: dto.categoryId,
        difficultyId: dto.difficultyId,
      },
      include: { category: true, difficulty: true },
    });
  }

  async findAll() {
    return this.prisma.question.findMany({
      orderBy: { id: 'asc' },
      include: { category: true, difficulty: true },
    });
  }

  async count() {
    return this.prisma.question.count();
  }

  async findOne(id: number) {
    const q = await this.prisma.question.findUnique({
      where: { id },
      include: { category: true, difficulty: true },
    });
    if (!q) throw new NotFoundException('Question not found');
    return q;
  }

  async update(id: number, dto: Partial<CreateQuestionDto>) {
    await this.findOne(id);
    await this.ensureMetaExists(dto.categoryId, dto.difficultyId);

    return this.prisma.question.update({
      where: { id },
      data: {
        ...dto,
        info:
          dto.info !== undefined
            ? this.normalizeOptionalString(dto.info)
            : undefined,
      },
      include: { category: true, difficulty: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.question.delete({ where: { id } });
  }

  async exportCsv(): Promise<string> {
    const questions = await this.findAll();
    const header =
      'questionId,questionText,category,difficulty,info,answerA,answerB,answerC,answerD,correctAnswer';
    const rows = questions.map((q) =>
      [
        q.questionId,
        q.questionText,
        q.category?.name ?? '',
        q.difficulty?.name ?? '',
        q.info ?? '',
        q.answerA,
        q.answerB,
        q.answerC,
        q.answerD,
        q.correctAnswer,
      ]
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(','),
    );
    return [header, ...rows].join('\n');
  }

  private parseCsvLine(line: string, delimiter: string): string[] {
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let index = 0; index < line.length; index++) {
      const char = line[index];

      if (char === '"') {
        if (inQuotes && line[index + 1] === '"') {
          current += '"';
          index++;
        } else {
          inQuotes = !inQuotes;
        }
        continue;
      }

      if (char === delimiter && !inQuotes) {
        fields.push(current.trim());
        current = '';
        continue;
      }

      current += char;
    }

    fields.push(current.trim());
    return fields.map((field) =>
      field.replace(/^"|"$/g, '').replace(/""/g, '"'),
    );
  }

  async importCsv(csv: string): Promise<number> {
    const lines = csv.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return 0;

    const delimiter = lines[0].includes(';') ? ';' : ',';
    const header = this.parseCsvLine(lines[0], delimiter).map((h) => h.trim());
    const headerIndex = new Map(header.map((key, index) => [key, index]));
    let count = 0;

    for (const [lineIndex, line] of lines.entries()) {
      if (lineIndex === 0) continue;

      const cols = this.parseCsvLine(line, delimiter);
      if (cols.length < 7) {
        throw new BadRequestException(
          `Import failed: row ${lineIndex + 1} has too few columns`,
        );
      }

      const valueByHeader = (key: string): string => {
        const index = headerIndex.get(key);
        if (index === undefined) return '';
        return (cols[index] ?? '').trim();
      };

      const csvQuestionId =
        valueByHeader('questionId') || cols[0]?.trim() || '';
      const questionText =
        valueByHeader('questionText') || cols[1]?.trim() || '';
      const categoryName = valueByHeader('category');
      const difficultyName = valueByHeader('difficulty');
      const info = valueByHeader('info');

      const answerA =
        valueByHeader('answerA') || cols[cols.length - 5]?.trim() || '';
      const answerB =
        valueByHeader('answerB') || cols[cols.length - 4]?.trim() || '';
      const answerC =
        valueByHeader('answerC') || cols[cols.length - 3]?.trim() || '';
      const answerD =
        valueByHeader('answerD') || cols[cols.length - 2]?.trim() || '';
      const correctAnswer =
        valueByHeader('correctAnswer') || cols[cols.length - 1]?.trim() || '';

      // Generate ID if empty (for CSV imports without questionId column)
      const questionIdToUse = csvQuestionId || (await this.generateQuestionId());
      if (!questionText || !answerA || !answerB || !answerC || !answerD) {
        throw new BadRequestException(
          `Import failed: row ${lineIndex + 1} is missing question text or answers`,
        );
      }
      if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
        throw new BadRequestException(
          `Import failed: row ${lineIndex + 1} has invalid correctAnswer`,
        );
      }

      let categoryId: number | undefined;
      if (categoryName) {
        const category = await this.prisma.category.upsert({
          where: { name: categoryName },
          create: { name: categoryName },
          update: {},
        });
        categoryId = category.id;
      }

      let difficultyId: number | undefined;
      if (difficultyName) {
        const difficulty = await this.prisma.difficulty.findUnique({
          where: { name: difficultyName },
        });
        if (!difficulty) {
          throw new BadRequestException(
            `Import failed: row ${lineIndex + 1} references unknown difficulty "${difficultyName}"`,
          );
        }
        difficultyId = difficulty.id;
      }

      const exists = await this.prisma.question.findUnique({
        where: { questionId: questionIdToUse },
      });

      if (exists) {
        await this.prisma.question.update({
          where: { questionId: questionIdToUse },
          data: {
            questionText,
            answerA,
            answerB,
            answerC,
            answerD,
            correctAnswer,
            categoryId,
            difficultyId,
            info: this.normalizeOptionalString(info ?? undefined),
          },
        });
      } else {
        await this.prisma.question.create({
          data: {
            questionId: questionIdToUse,
            questionText,
            answerA,
            answerB,
            answerC,
            answerD,
            correctAnswer,
            categoryId,
            difficultyId,
            info: this.normalizeOptionalString(info ?? undefined),
          },
        });
      }
      count++;
    }

    return count;
  }
}
