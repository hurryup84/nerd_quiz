import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
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

  async create(dto: CreateQuestionDto) {
    const questionId = await this.generateQuestionId();
    return this.prisma.question.create({ data: { ...dto, questionId } });
  }

  async findAll() {
    return this.prisma.question.findMany({ orderBy: { id: 'asc' } });
  }

  async findOne(id: number) {
    const q = await this.prisma.question.findUnique({ where: { id } });
    if (!q) throw new NotFoundException('Question not found');
    return q;
  }

  async update(id: number, dto: Partial<CreateQuestionDto>) {
    await this.findOne(id);
    return this.prisma.question.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.question.delete({ where: { id } });
  }

  async exportCsv(): Promise<string> {
    const questions = await this.findAll();
    const header = 'questionId,questionText,answerA,answerB,answerC,answerD,correctAnswer';
    const rows = questions.map((q) =>
      [q.questionId, q.questionText, q.answerA, q.answerB, q.answerC, q.answerD, q.correctAnswer]
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
    return fields.map((field) => field.replace(/^"|"$/g, '').replace(/""/g, '"'));
  }

  async importCsv(csv: string): Promise<number> {
    const lines = csv.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return 0;

    const delimiter = lines[0].includes(';') ? ';' : ',';
    let count = 0;

    for (const [lineIndex, line] of lines.entries()) {
      if (lineIndex === 0) continue;

      const cols = this.parseCsvLine(line, delimiter);
      if (cols.length < 7) {
        throw new BadRequestException(`Import failed: row ${lineIndex + 1} has too few columns`);
      }

      while (cols.length > 0 && cols[cols.length - 1] === '') {
        cols.pop();
      }

      const csvQuestionId = cols[0];
      const correctAnswer = cols[cols.length - 1];
      const answerD = cols[cols.length - 2];
      const answerC = cols[cols.length - 3];
      const answerB = cols[cols.length - 4];
      const answerA = cols[cols.length - 5];
      const questionText = cols.slice(1, cols.length - 5).join(delimiter).trim();

      if (!csvQuestionId) {
        throw new BadRequestException(`Import failed: row ${lineIndex + 1} is missing questionId`);
      }
      if (!questionText || !answerA || !answerB || !answerC || !answerD) {
        throw new BadRequestException(`Import failed: row ${lineIndex + 1} is missing question text or answers`);
      }
      if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
        throw new BadRequestException(`Import failed: row ${lineIndex + 1} has invalid correctAnswer`);
      }

      const exists = await this.prisma.question.findUnique({ where: { questionId: csvQuestionId } });

      if (exists) {
        await this.prisma.question.update({
          where: { questionId: csvQuestionId },
          data: { questionText, answerA, answerB, answerC, answerD, correctAnswer },
        });
      } else {
        await this.prisma.question.create({
          data: { questionId: csvQuestionId, questionText, answerA, answerB, answerC, answerD, correctAnswer },
        });
      }
      count++;
    }

    return count;
  }
}
