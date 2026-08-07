// src/common/decorators/roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../../users/entities/user.entity';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

// Role-based validation decorator for DTOs
export const RoleField = (roles: UserRole[]) => {
  return (target: any, propertyKey: string) => {
    Reflect.defineMetadata('role:fields', roles, target, propertyKey);
  };
};