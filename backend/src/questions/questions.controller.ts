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
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Public } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../admin/admin.guard';
import { ImporterGuard } from '../import/import.guard';

class CreateNamedMetaDto {
  @IsString() name!: string;
}

@Controller('questions')
@UseGuards(JwtAuthGuard)
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  @Get('meta')
  getMeta() {
    return this.questionsService.getMeta();
  }

  @Get()
  findAll(@Query('q') q?: string) {
    if (q) {
      return this.questionsService.search(q);
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
  create(@Body() dto: CreateQuestionDto) {
    return this.questionsService.create(dto);
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
    @Request() req: { user: { role: string } },
  ) {
    if (!file) throw new BadRequestException('No file uploaded');
    const csv = file.buffer
      ? file.buffer.toString('utf-8')
      : file.path
        ? readFileSync(file.path, 'utf-8')
        : '';
    const allowOverwrite = req.user.role === 'ADMIN';
    const count = await this.questionsService.importCsv(csv, allowOverwrite);
    return { imported: count };
  }
}
