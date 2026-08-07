import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditLog } from '../entities/audit-log.entity';
import { AuditLogService } from '../services/audit-log.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([AuditLog]), // THIS IS THE FIX! It creates the repository.
  ],
  providers: [AuditLogService],
  exports: [AuditLogService],
})
export class AuditLogModule {}