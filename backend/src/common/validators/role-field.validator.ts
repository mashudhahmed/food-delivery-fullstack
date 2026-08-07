// src/common/validators/role-field.validator.ts
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';
import { UserRole } from '../../users/entities/user.entity';

@ValidatorConstraint({ name: 'roleField', async: false })
export class RoleFieldValidator implements ValidatorConstraintInterface {
  validate(value: any, args: ValidationArguments) {
    const object = args.object as any;
    const role = object.role || object.userRole;

    if (!role) return true;

    const target = args.object?.constructor;
    const allowedRoles = Reflect.getMetadata('role:fields', target, args.property) || [];

    if (allowedRoles.length === 0) return true;

    return allowedRoles.includes(role);
  }

  defaultMessage(args: ValidationArguments) {
    const target = args.object?.constructor;
    const allowedRoles = Reflect.getMetadata('role:fields', target, args.property) || [];
    return `This field is only allowed for: ${allowedRoles.join(', ')}`;
  }
}