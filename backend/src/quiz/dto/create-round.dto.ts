import { IsInt, IsPositive, IsOptional, Max } from 'class-validator';

export class CreateRoundDto {
  @IsOptional() @IsInt() @IsPositive() @Max(100) questionCount?: number = 1;
  @IsInt() @IsPositive() requiredParticipants!: number;
  @IsOptional() @IsInt() @IsPositive() timeoutMinutes?: number;
}
