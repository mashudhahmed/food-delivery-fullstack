import { IsString, IsBoolean, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class CreateRestaurantDto {
  @IsString()
  name: string;

  @IsString()
  description: string;

  @IsString()
  address: string;

  @IsString()
  phone: string;

  @IsString()
  cuisineType: string;

  @IsBoolean()
  @IsOptional()
  isOpen?: boolean;
}