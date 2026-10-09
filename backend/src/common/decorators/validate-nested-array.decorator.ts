import {
  ValidateNested,
  ValidationOptions,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { applyDecorators } from '@nestjs/common';

export function ValidateNestedArray(
  type: any,
  minSize: number = 1,
  maxSize: number = 50,
  validationOptions?: ValidationOptions,
) {
  const typeFn = () => {
    try {
      const res = typeof type === 'function' ? type() : type;
      return typeof res === 'function' ? res : type;
    } catch {
      return type;
    }
  };

  return applyDecorators(
    ArrayMinSize(minSize, { message: `Must have at least ${minSize} item(s)` }),
    ArrayMaxSize(maxSize, { message: `Cannot have more than ${maxSize} items` }),
    ValidateNested({ each: true, ...validationOptions }),
    Type(typeFn),
  );
}