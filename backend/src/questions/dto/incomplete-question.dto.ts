import { IsOptional, IsString, IsIn } from 'class-validator';

export class IncompleteQuestionDto {
  @IsOptional()
  @IsString()
  questionText?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  difficulty?: string;

  @IsOptional()
  @IsString()
  info?: string;

  @IsOptional()
  @IsString()
  answerA?: string;

  @IsOptional()
  @IsString()
  answerB?: string;

  @IsOptional()
  @IsString()
  answerC?: string;

  @IsOptional()
  @IsString()
  answerD?: string;

  @IsOptional()
  @IsIn(['A', 'B', 'C', 'D'])
  correctAnswer?: string;
}