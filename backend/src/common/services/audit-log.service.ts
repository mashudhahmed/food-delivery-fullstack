// src/common/services/audit-log.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../entities/audit-log.entity';

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  async log(
    userId: string | null,
    action: string,
    resource: string,
    resourceId?: string | null,
    changes?: any,
    request?: any,
    wasSuccessful?: boolean,
    errorMessage?: string,
    metadata?: { duration: number; responseStatus: number },
  ): Promise<AuditLog | null> {
    try {
      const finalResourceId = resourceId && String(resourceId).trim() ? String(resourceId) : 'unknown';
      const auditLog = this.auditLogRepository.create({
        userId,
        action,
        resource: resource || 'unknown',
        resourceId: finalResourceId,
        changes,
        ipAddress: request?.ip || request?.headers?.['x-forwarded-for'] || null,
        userAgent: request?.headers?.['user-agent'] || null,
        requestId: request?.headers?.['x-request-id'] || null,
        wasSuccessful: wasSuccessful ?? false,
        errorMessage,
        metadata,
      });

      return await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error(`Failed to save audit log: ${error.message}`, error.stack);
      return null;
    }
  }
}