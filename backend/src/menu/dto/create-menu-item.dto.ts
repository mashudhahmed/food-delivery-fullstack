import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreateMenuItemDto {
  @IsString()
  name!: string;

  @IsString()
  description!: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsString()
  category!: string;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}

export class CreateCategoryDto {
  @IsString()
  name!: string;
}