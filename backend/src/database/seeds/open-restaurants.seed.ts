import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const repo = app.get<Repository<Restaurant>>(getRepositoryToken(Restaurant));

  const result = await repo
    .createQueryBuilder()
    .update(Restaurant)
    .set({ isOpen: true })
    .where('isDeleted = :isDeleted', { isDeleted: false })
    .execute();

  console.log(`✅ Opened ${result.affected ?? 0} restaurant(s)`);
  await app.close();
}

bootstrap();