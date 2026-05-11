import { IsArray, IsString, ValidateNested, IsNumber, Min, IsOptional, IsObject, IsEmail } from 'class-validator';
import { Type } from 'class-transformer';

class OrderItemDto {
  @IsString()
  menuItemId: string;

  @IsNumber()
  @Min(1)
  quantity: number;
}

class CustomerInfoDto {
  @IsString()
  fullName: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  phone: string;
}

export class CreateOrderDto {
  @IsString()
  restaurantId: string;

  @IsString()
  deliveryAddress: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  deliveryInstructions?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerInfoDto)
  customerInfo?: CustomerInfoDto;

  @IsOptional()
  @IsString()
  paymentMethod?: string;
}