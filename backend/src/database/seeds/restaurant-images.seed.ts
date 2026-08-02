import { NestFactory } from '@nestjs/core';
import { AppModule } from '../../app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Restaurant } from '../../restaurants/entities/restaurant.entity';

/** Free Unsplash food images by cuisine (stable source IDs) */
const CUISINE_IMAGES: Record<string, string[]> = {
  pizza: [
    'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=800&q=80',
    'https://images.unsplash.com/photo-1574071318508-1cdbab80d264?w=800&q=80',
  ],
  burger: [
    'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800&q=80',
    'https://images.unsplash.com/photo-1550547660-d9450f859349?w=800&q=80',
  ],
  biryani: [
    'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=800&q=80',
    'https://images.unsplash.com/photo-1589302168068-964664d93dc0?w=800&q=80',
  ],
  indian: [
    'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800&q=80',
    'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=800&q=80',
  ],
  chinese: [
    'https://images.unsplash.com/photo-1525755662778-989d0524087e?w=800&q=80',
    'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=800&q=80',
  ],
  thai: [
    'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800&q=80',
    'https://images.unsplash.com/photo-1562565652-a0d8f0c59eb4?w=800&q=80',
  ],
  japanese: [
    'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&q=80',
    'https://images.unsplash.com/photo-1553621042-f6e147245754?w=800&q=80',
  ],
  dessert: [
    'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=800&q=80',
    'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=800&q=80',
  ],
  cafe: [
    'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&q=80',
    'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80',
  ],
  default: [
    'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=80',
    'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&q=80',
    'https://images.unsplash.com/photo-1540189549336-e9fbaf65ed3e?w=800&q=80',
  ],
};

function pickImage(cuisineType: string, index: number): string {
  const key = (cuisineType || '').toLowerCase();
  let pool = CUISINE_IMAGES.default;

  for (const [cuisine, images] of Object.entries(CUISINE_IMAGES)) {
    if (key.includes(cuisine)) {
      pool = images;
      break;
    }
  }

  return pool[index % pool.length];
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const repo = app.get<Repository<Restaurant>>(getRepositoryToken(Restaurant));

  const restaurants = await repo.find({
    where: { isDeleted: false },
  });

  let updated = 0;

  for (let i = 0; i < restaurants.length; i++) {
    const r = restaurants[i];
    if (r.imageUrl) continue; // keep existing images

    r.imageUrl = pickImage(r.cuisineType, i);
    await repo.save(r);
    updated++;
    console.log(`  ✓ ${r.name} → ${r.cuisineType || 'default'}`);
  }

  console.log(`\n✅ Updated ${updated} restaurant(s) with food images`);
  await app.close();
}

bootstrap();