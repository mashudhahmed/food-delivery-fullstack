import { IsString, IsNumber, Min, IsUUID } from 'class-validator';

export class CartItemDto {
  @IsUUID()
  menuItemId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}