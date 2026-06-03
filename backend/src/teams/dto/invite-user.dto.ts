import { IsString, MinLength } from 'class-validator';

export class InviteUserDto {
  @IsString()
  @MinLength(1)
  username: string;
}
