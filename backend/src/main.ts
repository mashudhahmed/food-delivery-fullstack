import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'], // Enable all logging in production
  });
  
  // Add global prefix for all API routes
  app.setGlobalPrefix('api');
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  
  // Dynamic CORS configuration for production
  const allowedOrigins = process.env.FRONTEND_URL 
    ? [process.env.FRONTEND_URL, 'http://localhost:3000', 'http://localhost:3001']
    : ['*']; // Allow all in development, but restrict in production
  
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 3600, // Cache preflight requests for 1 hour
  });
  
  // Only enable Swagger in non-production environments
  const isProduction = process.env.NODE_ENV === 'production';
  
  if (!isProduction) {
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
      .build();
      
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api-docs', app, document);
    logger.log('📚 Swagger UI enabled at /api-docs');
  } else {
    logger.log('🔒 Swagger UI disabled in production');
  }
  
  // Use PORT from environment (Render injects this)
  const port = process.env.PORT || 3001;
  
  // Graceful shutdown for Render
  const server = await app.listen(port, '0.0.0.0'); // Bind to all network interfaces
  
  // Handle graceful shutdown
  const signals = ['SIGTERM', 'SIGINT'];
  signals.forEach(signal => {
    process.on(signal, async () => {
      logger.log(`Received ${signal}, closing server gracefully...`);
      await app.close();
      server.close(() => {
        logger.log('Server closed successfully');
        process.exit(0);
      });
      
      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Force shutdown after timeout');
        process.exit(1);
      }, 10000);
    });
  });
  
  logger.log(`✅ Application running on: http://localhost:${port}`);
  logger.log(`🔗 API endpoints available at: http://localhost:${port}/api`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
}

bootstrap();