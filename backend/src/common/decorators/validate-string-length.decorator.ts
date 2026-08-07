import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function ValidateStringLength(
  min: number,
  max: number,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'validateStringLength',
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          if (typeof value !== 'string') return false;
          return value.length >= min && value.length <= max;
        },
        defaultMessage(args: ValidationArguments) {
          return `${args.property} must be between ${min} and ${max} characters`;
        },
      },
    });
  };
}