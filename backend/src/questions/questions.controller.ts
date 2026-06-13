import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Res,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Query,
  Request,
} from '@nestjs/common';
import type { Response } from 'express';
import { readFileSync } from 'node:fs';
import { FileInterceptor } from '@nestjs/platform-express';
import { IsString } from 'class-validator';
import { QuestionsService } from './questions.service';
import { CreateQuestionDto } from './dto/create-question.dto';
import { IncompleteQuestionDto } from './dto/incomplete-question.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { ImporterGuard } from '../import/import.guard';
import { SettingsService } from '../settings/settings.service';

// Debug logging removed for security - never log potentially sensitive request data

class CreateNamedMetaDto {
  @IsString() name!: string;
}

@Controller('questions')
@UseGuards(JwtAuthGuard)
export class QuestionsController {
  constructor(
    private questionsService: QuestionsService,
    private settingsService: SettingsService,
  ) {}

  @Get('meta')
  getMeta() {
    return this.questionsService.getMeta();
  }

  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('playCount') playCount?: string,
  ) {
    if (q || playCount) {
      return this.questionsService.search(q ?? '', playCount);
    }
    return this.questionsService.findAll();
  }

  @Get('count')
  @Public()
  async count() {
    const total = await this.questionsService.count();
    return { total };
  }

  @UseGuards(AdminGuard)
  @Get('latest')
  async findLatest() {
    return this.questionsService.findLatest();
  }

  @UseGuards(AdminGuard)
  @Post('categories')
  createCategory(@Body() dto: CreateNamedMetaDto) {
    return this.questionsService.createCategory(dto.name);
  }

  @UseGuards(AdminGuard)
  @Post('difficulties')
  createDifficulty(@Body() dto: CreateNamedMetaDto) {
    return this.questionsService.createDifficulty(dto.name);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.questionsService.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateQuestionDto, @Request() req: { user: { id: number } }) {
    return this.questionsService.create({ ...dto, creatorId: req.user.id });
  }

  @UseGuards(AdminGuard)
  @Put(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateQuestionDto,
  ) {
    return this.questionsService.update(id, dto);
  }

  @UseGuards(AdminGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.questionsService.remove(id);
  }

  @UseGuards(AdminGuard)
  @Get('export/csv')
  async exportCsv(@Res() res: Response) {
    const csv = await this.questionsService.exportCsv();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="questions.csv"',
    );
    res.send(csv);
  }

  @UseGuards(ImporterGuard)
  @Post('import/csv')
  @UseInterceptors(FileInterceptor('file'))
  async importCsv(
    @UploadedFile() file: Express.Multer.File,
    @Request() req: { user: { id: number; role: string } },
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const csv = file.buffer
      ? file.buffer.toString('utf-8')
      : file.path
        ? readFileSync(file.path, 'utf-8')
        : '';
    const allowOverwrite = req.user.role === 'ADMIN';
    const count = await this.questionsService.importCsv(csv, allowOverwrite, req.user.id);
    return { imported: count };
  }

  @Post('complete')
  async completeQuestion(@Body() partial: IncompleteQuestionDto) {
    const [endpoint, apiKey, promptTemplate, model] = await Promise.all([
      this.settingsService.get('openrouterEndpoint'),
      this.settingsService.get('openrouterApiKey'),
      this.settingsService.get('openrouterPrompt'),
      this.settingsService.get('openrouterModel'),
    ]);

    if (!apiKey) {
      throw new BadRequestException('OpenRouter API key not configured');
    }

    // Use explicit prompt to ensure all fields are requested
    const explicitPrompt = `Complete the following quiz question JSON. Fill in any missing fields including answers and correct answer. Return only valid JSON with these fields: questionText (string), category (string), difficulty (string), info (string), answerA (string), answerB (string), answerC (string), answerD (string), correctAnswer (A/B/C/D). Question JSON: ${JSON.stringify(partial)}`;

    const prompt = `${promptTemplate}${explicitPrompt}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new BadRequestException(`OpenRouter API error: ${errorText}`);
    }

    const data = await response.json();
    let content = data.choices?.[0]?.message?.content ?? data.content ?? '';

    // Strip markdown code fences if present
    const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      content = jsonMatch[1];
    }

    try {
      const result = JSON.parse(content) as CreateQuestionDto;
      // Validate that we have all required fields
      if (!result.questionText || !result.answerA || !result.answerB || !result.answerC || !result.answerD) {
        throw new BadRequestException('OpenRouter response missing required fields (questionText, answerA-D)');
      }
      return result;
    } catch (parseError) {
      throw new BadRequestException(`Invalid JSON returned from OpenRouter: ${content?.substring(0, 100)}...`);
    }
  }
}
