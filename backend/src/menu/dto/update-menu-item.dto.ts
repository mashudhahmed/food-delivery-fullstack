import { PartialType } from '@nestjs/swagger';
import { CreateMenuItemDto } from './create-menu-item.dto';
import { IsBoolean, IsOptional, IsNumber, IsString, Min } from 'class-validator';

export class UpdateMenuItemDto extends PartialType(CreateMenuItemDto) {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  price?: number;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean;
}