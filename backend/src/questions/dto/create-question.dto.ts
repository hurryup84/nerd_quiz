import { IsString, IsIn } from 'class-validator';

export class CreateQuestionDto {
  @IsString() questionText!: string;
  @IsString() answerA!: string;
  @IsString() answerB!: string;
  @IsString() answerC!: string;
  @IsString() answerD!: string;
  @IsIn(['A', 'B', 'C', 'D']) correctAnswer!: string;
}
