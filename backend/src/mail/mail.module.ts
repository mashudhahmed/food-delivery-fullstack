import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/adapters/handlebars.adapter';
import { join } from 'path';
import { MailService } from './mail.service';
import { registerHandlebarsHelpers } from './helpers/handlebars.helpers';

registerHandlebarsHelpers();

@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        transport: {
          host: configService.get('MAIL_HOST') || configService.get('SMTP_HOST'),
          port: Number(configService.get('MAIL_PORT') || configService.get('SMTP_PORT')) || 587,
          secure: configService.get('SMTP_SECURE') === 'true' || false,
          auth: {
            user: configService.get('MAIL_USER') || configService.get('SMTP_USER'),
            pass: configService.get('MAIL_PASSWORD') || configService.get('SMTP_PASS'),
          },
        },
        defaults: {
          from: `"QuickBite" <${configService.get('MAIL_FROM') || configService.get('SMTP_USER') || 'noreply@quickbite.com'}>`,
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: {
            strict: true,
          },
        },
      }),
      inject: [ConfigService],
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}