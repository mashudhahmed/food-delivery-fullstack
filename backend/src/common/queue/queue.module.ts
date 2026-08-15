// src/common/queue/queue.module.ts
import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationPreferencesModule } from '../../users/notification-preferences.module';
import { MailModule } from '../../mail/mail.module';

@Global()
@Module({
  imports: [
    NotificationPreferencesModule,
    MailModule,
  ],
  // ✅ REMOVED: EmailQueueService and EmailProcessor are no longer needed
  providers: [],
  exports: [],
})
export class QueueModule {}