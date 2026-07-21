// src/main.ts
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import compression from 'compression';
import helmet from 'helmet';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  // Determine log levels based on environment - use mutable array
  let logLevels: ('error' | 'warn' | 'log' | 'debug' | 'verbose')[];
  
  if (process.env.NODE_ENV === 'production') {
    logLevels = ['error', 'warn', 'log'];
  } else {
    logLevels = ['error', 'warn', 'log', 'debug', 'verbose'];
  }
  
  const app = await NestFactory.create(AppModule, {
    logger: logLevels,
  });
  
  // Security middleware
  app.use(helmet());
  app.use(compression());
  
  // Global prefix
  app.setGlobalPrefix('api');
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
  }));
  
  // Global interceptors
  app.useGlobalInterceptors(new ResponseInterceptor());
  
  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());
  
  // CORS configuration
  const allowedOrigins = [
    'https://project-quickbite.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
  ];
  
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else if (process.env.NODE_ENV === 'development') {
        // Allow all origins in development
        callback(null, true);
      } else {
        logger.warn(`CORS blocked: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 3600,
  });
  
  // Swagger - only in development
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('QuickBite Food Delivery API')
      .setDescription('RESTful API for food ordering, restaurant management, and delivery tracking')
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('auth', 'Authentication endpoints')
      .addTag('restaurants', 'Restaurant management')
      .addTag('menu', 'Menu item management')
      .addTag('orders', 'Order placement and tracking')
      .addTag('reviews', 'Customer reviews and ratings')
      .addTag('admin', 'Admin management endpoints')
      .addTag('uploads', 'File upload endpoints')
      .addTag('notifications', 'Real-time notifications')
      .addTag('favorites', 'Favorite restaurants')
      .build();
      
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
    logger.log('📚 Swagger UI enabled at /api-docs');
  }
  
  // Start server
  const port = process.env.PORT || 3001;
  
  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGTERM', 'SIGINT'];
  signals.forEach(signal => {
    process.on(signal, async () => {
      logger.log(`Received ${signal}, closing server gracefully...`);
      await app.close();
      logger.log('Server closed successfully');
      process.exit(0);
    });
  });
  
  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    logger.error('Uncaught Exception:', error);
    // Don't exit immediately, let the process handle it
  });
  
  // Handle unhandled rejections
  process.on('unhandledRejection', (reason, promise) => {
    logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  });
  
  await app.listen(port, '0.0.0.0');
  
  logger.log(`✅ Application running on: http://localhost:${port}`);
  logger.log(`🔗 API endpoints available at: http://localhost:${port}/api`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`📊 Health check: http://localhost:${port}/api/health`);
  
  if (process.env.NODE_ENV !== 'production') {
    logger.log(`📚 API Docs: http://localhost:${port}/api-docs`);
  }
}

bootstrap();