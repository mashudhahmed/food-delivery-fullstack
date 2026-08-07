import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { READ_ONLY_KEY } from '../decorators/read-only.decorator';
import { DataSource } from 'typeorm';

@Injectable()
export class ReadReplicaInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ReadReplicaInterceptor.name);
  private readonly masterQueries: string[] = [];
  private readonly replicaQueries: string[] = [];

  constructor(
    private readonly reflector: Reflector,
    private readonly dataSource: DataSource,
  ) {
    // Log query distribution
    setInterval(() => {
      if (this.masterQueries.length > 0 || this.replicaQueries.length > 0) {
        this.logger.debug(
          `Query distribution - Master: ${this.masterQueries.length}, Replica: ${this.replicaQueries.length}`,
        );
        this.masterQueries.length = 0;
        this.replicaQueries.length = 0;
      }
    }, 60000);
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isReadOnly = this.reflector.get<boolean>(
      READ_ONLY_KEY,
      context.getHandler(),
    ) ?? this.reflector.get<boolean>(
      READ_ONLY_KEY,
      context.getClass(),
    ) ?? false;

    // Determine if the request is a read operation
    const request = context.switchToHttp().getRequest();
    const method = request.method;
    const isReadOperation = ['GET', 'HEAD', 'OPTIONS'].includes(method);

    if (isReadOperation && isReadOnly) {
      // Use replica for read operations
      this.replicaQueries.push(request.url);
      // The actual routing is handled by TypeORM's replication
    } else {
      this.masterQueries.push(request.url);
    }

    return next.handle();
  }
}