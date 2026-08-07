// src/auth/guards/jwt-auth.guard.ts
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { AuthService } from '../auth.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private authService: AuthService, // This works because AuthService is injected here
  ) {
    super();
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Add custom logic here if you need to check permissions before activation
    const canActivate = await super.canActivate(context);
    
    if (!canActivate) {
      return false;
    }

    // Optional: If you want to attach the user to the request
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    
    // You can also add additional validation here (e.g., check if user is active, etc.)
    if (user && user.status === 'suspended') {
        throw new UnauthorizedException('Account is suspended');
    }

    return true;
  }

  handleRequest(err, user, info) {
    // You can throw an exception based on either "info" or "err" arguments
    if (err || !user) {
      throw err || new UnauthorizedException('Invalid or expired token');
    }
    return user;
  }
}