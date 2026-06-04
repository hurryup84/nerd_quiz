import { IsInt, Min, IsBoolean } from 'class-validator';

export class ToggleExcludedCategoryDto {
  @IsInt()
  @Min(1)
  categoryId: number;

  @IsBoolean()
  isExcluded: boolean;
}