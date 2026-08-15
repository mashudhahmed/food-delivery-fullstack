// src/common/services/audit-log.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(
    userId: string | null,
    action: string,
    resource: string,
    resourceId: string,
    changes: any,
    request: any,
    wasSuccessful: boolean,
    errorMessage?: string,
    metadata?: { duration: number; responseStatus: number },
  ): Promise<AuditLog> {
    const auditLog = this.auditLogRepository.create({
      userId,
      action,
      resource,
      resourceId,
      changes,
      ipAddress: request.ip || request.headers['x-forwarded-for'] || null,
      userAgent: request.headers['user-agent'] || null,
      requestId: request.headers['x-request-id'] || null,
      wasSuccessful,
      errorMessage,
      metadata,
    });

    return this.auditLogRepository.save(auditLog);
  }
}