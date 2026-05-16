import { IsString, IsUUID, IsOptional } from 'class-validator';

export class CreateFavoriteDto {
  @IsUUID()
  restaurantId: string;

  @IsString()
  restaurantName: string;

  @IsString()
  @IsOptional()
  restaurantImage?: string;

  @IsString()
  @IsOptional()
  cuisineType?: string;
}