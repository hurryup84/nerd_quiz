import { IsIn, IsInt } from 'class-validator';

export class SubmitAnswerDto {
  @IsInt() questionId!: number;
  @IsIn(['A', 'B', 'C', 'D']) selectedAnswer!: string;
}
