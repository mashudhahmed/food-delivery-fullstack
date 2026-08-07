import { Injectable, Inject, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
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
    resourceId: string,
    changes?: any,
    request?: Request,
    wasSuccessful: boolean = true,
    errorMessage?: string,
    metadata?: any,
  ): Promise<void> {
    try {
      const auditLog = this.auditLogRepository.create({
        userId,
        action,
        resource,
        resourceId,
        changes: changes || null,
        ipAddress: request?.ip || request?.socket?.remoteAddress,
        userAgent: request?.headers?.['user-agent'],
        requestId: request?.headers?.['x-request-id'] as string,
        wasSuccessful,
        errorMessage: errorMessage || null,
        metadata: metadata || null,
      });

      await this.auditLogRepository.save(auditLog);
    } catch (error) {
      this.logger.error(`Failed to create audit log: ${error.message}`);
      // Don't throw - audit logging should not break the main flow
    }
  }

  async logAsync(
    userId: string | null,
    action: string,
    resource: string,
    resourceId: string,
    changes?: any,
    request?: Request,
    wasSuccessful: boolean = true,
    errorMessage?: string,
    metadata?: any,
  ): Promise<void> {
    // Fire and forget - doesn't wait for completion
    this.log(userId, action, resource, resourceId, changes, request, wasSuccessful, errorMessage, metadata)
      .catch((error) => this.logger.error(`Async audit log failed: ${error.message}`));
  }

  async getAuditLogs(
    filters: {
      userId?: string;
      action?: string;
      resource?: string;
      resourceId?: string;
      fromDate?: Date;
      toDate?: Date;
      wasSuccessful?: boolean;
    },
    limit: number = 50,
    offset: number = 0,
  ): Promise<{ items: AuditLog[]; total: number }> {
    const query = this.auditLogRepository.createQueryBuilder('audit');

    if (filters.userId) {
      query.andWhere('audit.userId = :userId', { userId: filters.userId });
    }
    if (filters.action) {
      query.andWhere('audit.action = :action', { action: filters.action });
    }
    if (filters.resource) {
      query.andWhere('audit.resource = :resource', { resource: filters.resource });
    }
    if (filters.resourceId) {
      query.andWhere('audit.resourceId = :resourceId', { resourceId: filters.resourceId });
    }
    if (filters.fromDate) {
      query.andWhere('audit.timestamp >= :fromDate', { fromDate: filters.fromDate });
    }
    if (filters.toDate) {
      query.andWhere('audit.timestamp <= :toDate', { toDate: filters.toDate });
    }
    if (filters.wasSuccessful !== undefined) {
      query.andWhere('audit.wasSuccessful = :wasSuccessful', { wasSuccessful: filters.wasSuccessful });
    }

    const [items, total] = await query
      .orderBy('audit.timestamp', 'DESC')
      .skip(offset)
      .take(limit)
      .getManyAndCount();

    return { items, total };
  }
}