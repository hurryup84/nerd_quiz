import { IsInt, IsPositive, IsOptional, Max, IsString } from 'class-validator';

export class CreateRoundDto {
  @IsOptional() @IsInt() @IsPositive() @Max(100) questionCount?: number = 1;
  @IsOptional() @IsInt() @IsPositive() requiredParticipants: number = 3;
  @IsOptional() @IsInt() @IsPositive() timeoutMinutes?: number;
  @IsOptional() @IsString() teamId?: string;
}
