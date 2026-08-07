import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsService } from '../services/feature-flags.service';
import { FEATURE_FLAG_KEY } from '../decorators/feature-flag.decorator';

@Injectable()
export class FeatureFlagInterceptor implements NestInterceptor {
  private readonly logger = new Logger(FeatureFlagInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlags: FeatureFlagsService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const flagName = this.reflector.get<string>(
      FEATURE_FLAG_KEY,
      context.getHandler(),
    ) ?? this.reflector.get<string>(
      FEATURE_FLAG_KEY,
      context.getClass(),
    );

    if (!flagName) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const userContext = user ? { userId: user.id, email: user.email } : undefined;

    const isEnabled = this.featureFlags.isEnabled(flagName, userContext);

    if (!isEnabled) {
      this.logger.debug(`Feature flag "${flagName}" is disabled for user ${user?.email || 'anonymous'}`);
      throw new ForbiddenException(`Feature "${flagName}" is not available`);
    }

    this.logger.debug(`Feature flag "${flagName}" is enabled for user ${user?.email || 'anonymous'}`);
    return next.handle();
  }
}