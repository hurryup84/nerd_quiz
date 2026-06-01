import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  UseGuards,
  Request,
  Delete,
  Query,
} from '@nestjs/common';
import { QuizService } from './quiz.service';
import { CreateRoundDto } from './dto/create-round.dto';
import { SubmitAnswerDto } from './dto/submit-answer.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('quiz')
@UseGuards(JwtAuthGuard)
export class QuizController {
  constructor(private quizService: QuizService) {}

  @Get('active')
  getActive() {
    return this.quizService.getActiveRound();
  }

  @Get('last')
  getLast() {
    return this.quizService.getLastFinishedRound();
  }

  @Get('history')
  getHistory(@Query('page') page = '1') {
    return this.quizService.getHistory(Number(page));
  }

  @Get('insights')
  getInsights() {
    return this.quizService.getInsights();
  }
  @Get('activity')
  getActivity() {
    return this.quizService.getActivityStats();
  }
  @Get(':id')
  getOne(@Param('id', ParseIntPipe) id: number) {
    return this.quizService.getRound(id);
  }

  @Post()
  create(
    @Request() req: { user: { id: number } },
    @Body() dto: CreateRoundDto,
  ) {
    return this.quizService.createRound(req.user.id, dto);
  }

  @Post(':id/answers')
  submit(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
    @Body() dto: SubmitAnswerDto,
  ) {
    return this.quizService.submitAnswer(id, req.user.id, dto);
  }

  @Post(':id/finalize')
  finalize(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number } },
  ) {
    return this.quizService.finalizeRound(id, req.user.id);
  }

  @Delete(':id')
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.quizService.cancelRound(id);
  }
}
