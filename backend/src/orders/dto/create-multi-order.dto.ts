import { 
  IsArray, 
  ValidateNested, 
  IsString, 
  IsOptional,
  ArrayMinSize,
  ArrayMaxSize,
  ValidateIf,
  IsEmail,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CartRestaurantDto } from './cart-restaurant.dto';

class CustomerInfoDto {
  @IsString()
  fullName: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  phone: string;
}

export class CreateMultiOrderDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartRestaurantDto)
  @ArrayMinSize(1, { message: 'Cart must have at least one restaurant' })
  @ArrayMaxSize(5, { message: 'Cannot order from more than 5 restaurants at once' })
  restaurants: CartRestaurantDto[];

  @IsString()
  deliveryAddress: string;

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