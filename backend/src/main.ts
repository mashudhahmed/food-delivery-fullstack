import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  
  // Add global prefix for all API routes
  app.setGlobalPrefix('api');
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  
  // Define allowed origins for CORS
  const allowedOrigins = [
    'https://projectquickbite.vercel.app',        // Your Vercel frontend
    'https://quickbite-frontend.vercel.app',      // Alternative Vercel URL
    'https://food-delivery-fullstack.vercel.app', // Another possible URL
    'http://localhost:3000',                      // Local development
    'http://localhost:3001',                      // Alternative local
    'http://localhost:3002',                      // Another local option
  ];
  
  // Add FRONTEND_URL from environment if provided
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL);
  }
  
  // Configure CORS
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, Postman)
      if (!origin) {
        return callback(null, true);
      }
      
      // Check if origin is allowed
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        logger.warn(`CORS blocked request from origin: ${origin}`);
        callback(new Error(`Origin ${origin} not allowed by CORS`));
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
    ],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 3600, // Cache preflight requests for 1 hour
  });
  
  // Log allowed origins in production
  if (process.env.NODE_ENV === 'production') {
    logger.log(`✅ CORS configured for origins: ${allowedOrigins.join(', ')}`);
  }
  
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
  
  // Start server - bind to all network interfaces
  const server = await app.listen(port, '0.0.0.0');
  logger.log(`✅ Application running on: http://localhost:${port}`);
  logger.log(`🔗 API endpoints available at: http://localhost:${port}/api`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Handle graceful shutdown for Render
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
}

bootstrap();