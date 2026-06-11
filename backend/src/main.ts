import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Add global prefix for all API routes
  app.setGlobalPrefix('api');
  
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
    forbidNonWhitelisted: true,
  }));
  
  app.enableCors();
  
  // Change Swagger path to avoid conflict with API routes
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
  SwaggerModule.setup('api-docs', app, document);  // Changed from 'api' to 'api-docs'
  
  // Change default port to avoid conflict with Next.js (3001)
  const port = process.env.PORT || 3001;  // Changed from 3000 to 3001
  await app.listen(port);
  console.log(`✅ Application running on: http://localhost:${port}`);
  console.log(`📚 Swagger UI available at: http://localhost:${port}/api-docs`);
  console.log(`🔗 API endpoints available at: http://localhost:${port}/api`);
}
bootstrap();