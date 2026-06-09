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

  @Get('active-rounds')
  getActiveRounds(@Request() req: { user: { id: number } }) {
    return this.quizService.getActiveRoundsForUser(req.user.id);
  }

  @Get('stats')
  getStats(@Request() req: { user: { id: number } }) {
    return this.quizService.getStatsForUser();
  }

  @Get('last')
  getLast(@Request() req: { user: { id: number } }) {
    return this.quizService.getLastFinishedRound(req.user.id);
  }

  @Get('history')
  getHistory(
    @Request() req: { user: { id: number; role: string } },
    @Query('page') page = '1',
    @Query('teamId') teamId?: string,
  ) {
    return this.quizService.getHistory(req.user, Number(page), teamId);
  }

  @Get('insights')
  getInsights(
    @Request() req: { user: { id: number; role: string } },
    @Query('teamId') teamId?: string,
  ) {
    return this.quizService.getInsights(req.user, teamId);
  }

  @Get('activity')
  getActivity(
    @Request() req: { user: { id: number; role: string } },
    @Query('teamId') teamId?: string,
  ) {
    return this.quizService.getActivityStats(req.user, teamId);
  }

  @Get(':id')
  getOne(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number; role: string } },
  ) {
    return this.quizService.getRound(id, req.user);
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
  cancel(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { id: number; role: string } },
  ) {
    return this.quizService.cancelRound(id, req.user);
  }
}
