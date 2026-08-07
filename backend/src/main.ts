// src/main.ts
import { initSentry } from './common/sentry/sentry';
initSentry();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { RoleFieldInterceptor } from './common/interceptors/role-field.interceptor';
import compression from 'compression';
import helmet from 'helmet';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './common/logger/winston.config';
import { RequestIdMiddleware } from './common/middleware/request-id.middleware';
import { PerformanceInterceptor } from './common/interceptors/performance.interceptor';
import { PerformanceService } from './common/services/performance.service';
import { IdempotencyInterceptor } from './common/interceptors/idempotency.interceptor';
import { CircuitBreakerInterceptor } from './common/interceptors/circuit-breaker.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger(winstonConfig),
  });

  const logger = new Logger('Bootstrap');

  // ✅ Request ID Middleware
  app.use(RequestIdMiddleware);

  // Security Middleware
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
          scriptSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );
  app.use(compression());

  // API Versioning
  app.enableVersioning({
    type: VersioningType.URI,
    defaultVersion: '1',
    prefix: 'api/v',
  });

  // Global Prefix
  app.setGlobalPrefix('api/v1');

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global Interceptors
  app.useGlobalInterceptors(
    new ResponseInterceptor(),
    new RoleFieldInterceptor(),
  );

  // Global Filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // CORS Configuration
  const corsOrigins = process.env.ALLOWED_ORIGINS?.split(',')
    .map((o) => o.trim())
    .filter(Boolean) || [];

  const defaultOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
    'https://project-quickbite.vercel.app',
  ];

  if (process.env.FRONTEND_URL) {
    defaultOrigins.push(process.env.FRONTEND_URL);
  }

  const allowedOrigins = [...defaultOrigins, ...corsOrigins];

  app.enableCors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else if (process.env.NODE_ENV === 'development') {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'Accept',
      'Origin',
      'X-Requested-With',
      'X-Request-ID',
      'idempotency-key',
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range', 'X-Request-ID'],
    maxAge: 3600,
  });

  // Swagger - Development Only
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('QuickBite Food Delivery API')
      .setDescription(
        'RESTful API for food ordering, restaurant management, and delivery tracking',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('users', 'User profile management')
      .addTag('restaurants', 'Restaurant management')
      .addTag('menu', 'Menu item management')
      .addTag('orders', 'Order placement and tracking')
      .addTag('reviews', 'Customer reviews and ratings')
      .addTag('admin', 'Admin management endpoints')
      .addTag('uploads', 'File upload endpoints')
      .addTag('notifications', 'Real-time notifications')
      .addTag('favorites', 'Favorite restaurants')
      .addTag('health', 'Health check endpoints')
      .addTag('performance', 'Performance monitoring')
      .addServer('http://localhost:3001/api/v1', 'Development Server')
      .addServer('https://api.quickbite.com/api/v1', 'Production Server')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
        docExpansion: 'none',
        filter: true,
        tagsSorter: 'alpha',
        operationsSorter: 'alpha',
        displayRequestDuration: true,
      },
      customCss: `
        .swagger-ui .topbar { display: none }
        .swagger-ui .info { margin: 20px 0 }
        .swagger-ui .info .title { font-size: 24px }
      `,
      customSiteTitle: 'QuickBite API Documentation',
    });

    logger.log('📚 Swagger UI enabled at /api-docs');
  } else {
    // In production, return 404 for swagger
    app.use('/api-docs', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Swagger UI is not available in production',
      });
    });
  }

  const port = process.env.PORT || 3001;

  // Graceful Shutdown
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT', 'SIGQUIT'];
  signals.forEach((signal) => {
    process.on(signal, async () => {
      logger.log(`Received ${signal}, closing server gracefully...`);
      try {
        await app.close();
        logger.log('✅ Server closed successfully');
        process.exit(0);
      } catch (error) {
        logger.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    });
  });

  process.on('uncaughtException', (error) => {
    logger.error('💥 Uncaught Exception:', error);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

  process.on('unhandledRejection', (reason, promise) => {
    logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });

  await app.listen(port, '0.0.0.0');

  logger.log('═══════════════════════════════════════════════════════════');
  logger.log(`🚀 Application running on: http://localhost:${port}`);
  logger.log(`📡 API endpoints: http://localhost:${port}/api/v1`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`❤️ Health check: http://localhost:${port}/api/v1/health`);
  logger.log(`📊 Database: ${process.env.DB_HOST || 'not configured'}`);

  if (process.env.NODE_ENV !== 'production') {
    logger.log(`📚 API Docs: http://localhost:${port}/api-docs`);
  }
  logger.log('═══════════════════════════════════════════════════════════');
  logger.log('✅ QuickBite API is ready!');
  logger.log('═══════════════════════════════════════════════════════════');
}

bootstrap();