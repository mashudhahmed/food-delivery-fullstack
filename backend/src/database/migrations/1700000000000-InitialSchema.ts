import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1700000000000 implements MigrationInterface {
  name = 'InitialSchema1700000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create indexes for performance
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orders_customer_id" ON "orders" ("customerId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orders_restaurant_id" ON "orders" ("restaurantId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orders_status" ON "orders" ("status")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_orders_placed_at" ON "orders" ("placedAt")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_restaurants_owner_id" ON "restaurants" ("ownerId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_restaurants_cuisine_type" ON "restaurants" ("cuisineType")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_menu_items_restaurant_id" ON "menu_items" ("restaurantId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_menu_items_category" ON "menu_items" ("category")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_reviews_restaurant_id" ON "reviews" ("restaurantId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_notifications_user_id" ON "notifications" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_favorites_user_id" ON "favorites" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "idx_favorites_restaurant_id" ON "favorites" ("restaurantId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_favorites_restaurant_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_favorites_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_restaurant_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_menu_items_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_menu_items_restaurant_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_restaurants_cuisine_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_restaurants_owner_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_placed_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_restaurant_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_customer_id"`);
  }
}