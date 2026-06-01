import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

@Module({
  imports: [MulterModule.register({ limits: { fileSize: 5 * 1024 * 1024 } })],
  controllers: [QuestionsController],
  providers: [QuestionsService],
})
export class QuestionsModule {}
