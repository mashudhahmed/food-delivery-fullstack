import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FavoritesService } from './favorites.service';
import { FavoritesController } from './favorites.controller';
import { Favorite } from './entities/favorite.entity';
import { AuthModule } from '../auth/auth.module'; // 👈 add

@Module({
  imports: [
    TypeOrmModule.forFeature([Favorite]),
    AuthModule, // 👈 add
  ],
  controllers: [FavoritesController],
  providers: [FavoritesService],
  exports: [FavoritesService],
})
export class FavoritesModule {}