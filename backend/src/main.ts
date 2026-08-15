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
  try {
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
    // NOTE: prefix: 'api/v' + defaultVersion: '1' already produces the full
    // "api/v1" segment on every route. Do NOT also call app.setGlobalPrefix()
    // with an overlapping value here — Nest concatenates globalPrefix +
    // versioningPrefix + version + controllerPath, so setting both to
    // "api/v1" silently doubled every real route to
    // "/api/v1/api/v1/..." while RouterExplorer's startup log kept showing
    // the (correct-looking but wrong) single-prefix path, masking the bug.
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
      prefix: 'api/v',
    });

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
      app.use('/api-docs', (req, res) => {
        res.status(404).json({
          success: false,
          message: 'Swagger UI is not available in production',
        });
      });
    }

    const port = process.env.PORT || 3001;

    // ✅ Global unhandled rejection handler
    process.on('unhandledRejection', (reason, promise) => {
      logger.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
      if (reason instanceof Error) {
        logger.error(`Error name: ${reason.name}`);
        logger.error(`Error message: ${reason.message}`);
        logger.error(`Error stack: ${reason.stack}`);
      } else {
        logger.error('Reason:', reason);
      }
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    });

    // ✅ Global uncaught exception handler
    process.on('uncaughtException', (error) => {
      logger.error('💥 Uncaught Exception:', error);
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    });

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

    await app.listen(port, '0.0.0.0');

    // Route logging (best-effort only — Nest's own RouterExplorer already
    // logs every mapped route at startup, so this is purely a convenience
    // extra. It reaches into private Express internals that vary between
    // Express versions, so it's wrapped defensively and must never be
    // allowed to take down an already-listening server.)
    try {
      const server = app.getHttpServer();
      const router = server?._events?.request?._router;
      if (router?.stack?.length) {
        console.log('📋 Registered Routes:');
        router.stack.forEach((layer: any) => {
          if (layer.route) {
            const methods = Object.keys(layer.route.methods).join(' ');
            console.log(`  ${methods} ${layer.route.path}`);
          }
        });
      } else {
        logger.warn(
          '📋 Skipped route listing — Express router internals not in the expected shape (see RouterExplorer logs above for the full route list).',
        );
      }
    } catch (routeLogError) {
      logger.warn(
        `📋 Skipped route listing due to an internal error: ${(routeLogError as Error).message}`,
      );
    }

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
  } catch (error) {
    const logger = new Logger('Bootstrap');
    const err = error as Error;
    logger.error(`❌ Failed to start application: ${err?.message || err}`);
    if (err?.stack) {
      logger.error(err.stack);
    }
    process.exit(1);
  }
}

bootstrap();