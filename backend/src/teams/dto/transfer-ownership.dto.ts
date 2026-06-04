import { IsInt, Min } from 'class-validator';

export class TransferOwnershipDto {
  @IsInt()
  @Min(1)
  newOwnerId: number;
}
