// src/config/env-validation.config.ts
import { plainToClass } from 'class-transformer';
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsBoolean,
  validateSync,
} from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Neon = 'neon',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3001;

  @IsString()
  @IsOptional()
  API_URL: string;

  @IsString()
  @IsOptional()
  FRONTEND_URL: string;

  @IsString()
  @IsOptional()
  ALLOWED_ORIGINS: string;

  // Database
  @IsString()
  DB_HOST: string;

  @IsNumber()
  DB_PORT: number;

  @IsString()
  DB_USERNAME: string;

  @IsString()
  DB_PASSWORD: string;

  @IsString()
  DB_DATABASE: string;

  @IsNumber()
  @IsOptional()
  DB_POOL_SIZE: number = 20;

  @IsNumber()
  @IsOptional()
  DB_IDLE_TIMEOUT: number = 30000;

  @IsNumber()
  @IsOptional()
  DB_CONNECTION_TIMEOUT: number = 5000;

  @IsBoolean()
  @IsOptional()
  DB_SSL_REJECT_UNAUTHORIZED: boolean = false;

  @IsString()
  @IsOptional()
  DB_CA_CERT: string;

  // JWT
  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '7d';

  // Email
  @IsString()
  MAIL_HOST: string;

  @IsNumber()
  MAIL_PORT: number;

  @IsString()
  MAIL_USER: string;

  @IsString()
  MAIL_PASSWORD: string;

  @IsString()
  MAIL_FROM: string;

  // Cloudinary
  @IsString()
  @IsOptional()
  CLOUDINARY_CLOUD_NAME: string;

  @IsString()
  @IsOptional()
  CLOUDINARY_API_KEY: string;

  @IsString()
  @IsOptional()
  CLOUDINARY_API_SECRET: string;

  // File upload
  @IsNumber()
  @IsOptional()
  MAX_FILE_SIZE: number = 5242880;

  @IsString()
  @IsOptional()
  ALLOWED_FILE_TYPES: string;

  // Admin
  @IsString()
  @IsOptional()
  ADMIN_EMAIL: string = 'admin@quickbite.com';

  @IsString()
  @IsOptional()
  ADMIN_PASSWORD: string = 'Admin@123';

  @IsString()
  @IsOptional()
  ADMIN_NAME: string = 'Super Admin';

  // Sentry
  @IsString()
  @IsOptional()
  SENTRY_DSN: string;
}

export function validateEnv(config: Record<string, unknown>) {
  const validatedConfig = plainToClass(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors.map((err) => {
      const constraints = Object.values(err.constraints || {}).join(', ');
      return `${err.property}: ${constraints}`;
    });
    throw new Error(`Environment validation failed:\n${errorMessages.join('\n')}`);
  }

  // Custom validation for JWT_SECRET
  if (
    validatedConfig.JWT_SECRET === 'your_super_secret_jwt_key_change_this' ||
    validatedConfig.JWT_SECRET === 'your_super_secret_key_here'
  ) {
    throw new Error('JWT_SECRET must be changed from default value');
  }

  // Custom validation for production
  if (validatedConfig.NODE_ENV === 'production') {
    if (validatedConfig.DB_SSL_REJECT_UNAUTHORIZED !== true) {
      throw new Error('DB_SSL_REJECT_UNAUTHORIZED must be true in production');
    }
    if (!validatedConfig.SENTRY_DSN) {
      console.warn('⚠️ SENTRY_DSN not set in production - error tracking disabled');
    }
  }

  return validatedConfig;
}