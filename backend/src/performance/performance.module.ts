import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PerformanceController } from './performance.controller';
import { PerformanceService } from '../common/services/performance.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [
    AuthModule,
    EventEmitterModule,
  ],
  controllers: [PerformanceController],
  providers: [PerformanceService],
  exports: [PerformanceService],
})
export class PerformanceModule {}