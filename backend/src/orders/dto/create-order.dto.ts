import {
  IsArray,
  IsString,
  ValidateNested,
  IsNumber,
  Min,
  IsOptional,
  IsObject,
  IsEmail,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ValidateNestedArray } from '../../common/decorators/validate-nested-array.decorator';
import { ValidateStringLength } from '../../common/decorators/validate-string-length.decorator';

class OrderItemDto {
  @IsString()
  menuItemId: string;

  @IsNumber()
  @Min(1)
  @Min(1)
  quantity: number;
}

class CustomerInfoDto {
  @IsString()
  @ValidateStringLength(2, 100)
  fullName: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @ValidateStringLength(10, 15)
  phone: string;
}

export class CreateOrderDto {
  @IsString()
  restaurantId: string;

  @IsString()
  @ValidateStringLength(5, 500)
  deliveryAddress: string;

  @ValidateNestedArray(() => OrderItemDto, 1, 50)
  items: OrderItemDto[];

  @IsOptional()
  @IsString()
  @ValidateStringLength(0, 200)
  deliveryInstructions?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerInfoDto)
  customerInfo?: CustomerInfoDto;

  @IsOptional()
  @IsString()
  @ValidateStringLength(0, 50)
  paymentMethod?: string;
}