import { Type } from 'class-transformer';
import { IsString, IsIn, IsInt, IsOptional, IsBoolean } from 'class-validator';

export class CreateQuestionDto {
  @IsString() questionText!: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  difficultyId?: number;

  @IsOptional()
  @IsString()
  info?: string;

  @IsString() answerA!: string;
  @IsString() answerB!: string;
  @IsString() answerC!: string;
  @IsString() answerD!: string;
  @IsIn(['A', 'B', 'C', 'D']) correctAnswer!: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  creatorId?: number;

  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  aiAssisted?: boolean;
}
