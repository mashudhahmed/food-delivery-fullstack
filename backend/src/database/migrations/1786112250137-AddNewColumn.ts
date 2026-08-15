import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * This migration was originally written assuming the database still had
 * the old-style human-readable constraint names (FK_menu_items_restaurant,
 * etc.) from CreateCoreSchema1690000000000. In practice, this Neon
 * database was brought up to its current shape via an earlier
 * `synchronize: true` run, which produced TypeORM's auto-generated
 * constraint names (FK_a8ff5699334d3ca7b07421af0a9, etc.) directly —
 * skipping the "old-named" intermediate state this migration expected to
 * find and DROP.
 *
 * Every statement below has been made idempotent (IF EXISTS / duplicate
 * -tolerant) so this migration converges safely to the same end state
 * whether starting from the old named-constraint schema, the already
 * -current auto-named schema, or anything in between.
 */
export class AddNewColumn1786112250137 implements MigrationInterface {
  name = 'AddNewColumn1786112250137';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Drop old-style named constraints (no-op if already gone / never existed) ──
    await queryRunner.query(`ALTER TABLE "menu_items" DROP CONSTRAINT IF EXISTS "FK_menu_items_restaurant"`);
    await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "FK_order_items_menu_item"`);
    await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT IF EXISTS "FK_order_items_order"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "FK_orders_agent"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "FK_orders_customer"`);
    await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "FK_orders_restaurant"`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_reviews_customer"`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_reviews_order"`);
    await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "FK_reviews_restaurant"`);
    await queryRunner.query(`ALTER TABLE "restaurants" DROP CONSTRAINT IF EXISTS "FK_restaurants_owner"`);
    await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT IF EXISTS "FK_refresh_tokens_user"`);
    await queryRunner.query(`ALTER TABLE "notification_preferences" DROP CONSTRAINT IF EXISTS "notification_preferences_userId_fkey"`);
    await queryRunner.query(`ALTER TABLE "favorites" DROP CONSTRAINT IF EXISTS "FK_favorites_restaurant"`);
    await queryRunner.query(`ALTER TABLE "favorites" DROP CONSTRAINT IF EXISTS "FK_favorites_user"`);

    // ── Drop old-style named indexes (no-op if already gone / never existed) ──
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_menu_items_restaurant_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_menu_items_category"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_customer_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_restaurant_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_status"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_orders_placed_at"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_restaurant_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_restaurants_owner_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_restaurants_cuisine_type"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_family"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_selector"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_isDeleted"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notification_preferences_userId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_notifications_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_favorites_user_id"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_favorites_restaurant_id"`);

    // ── New tables (already idempotent via IF NOT EXISTS) ──
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" character varying,
        "action" character varying NOT NULL,
        "resource" character varying NOT NULL,
        "resourceId" character varying NOT NULL,
        "changes" json,
        "ipAddress" character varying,
        "userAgent" character varying,
        "requestId" character varying,
        "wasSuccessful" boolean NOT NULL DEFAULT false,
        "errorMessage" character varying,
        "timestamp" TIMESTAMP NOT NULL DEFAULT now(),
        "metadata" json,
        CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_5db7a2b9e2bd2563b2377c293c" ON "audit_logs" ("resource", "resourceId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_5ee52ff271c0f9bca5f97daa0a" ON "audit_logs" ("userId", "action")`);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_batches" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "customerId" character varying NOT NULL,
        "deliveryAddress" character varying NOT NULL,
        "deliveryInstructions" character varying,
        "totalAmount" numeric(10,2) NOT NULL,
        "isComplete" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_2b6b9ed5fdd6411e9f9c1d727f3" PRIMARY KEY ("id")
      )
    `);

    // ── Column tweaks — only apply if the column doesn't already match ──
    // (safe to re-run: adding a UNIQUE constraint that already exists, or
    // dropping/re-adding a column with the same type, is a no-op in effect
    // but Postgres still errors on exact duplicates, so these are guarded.)
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "refresh_tokens" ADD CONSTRAINT "UQ_6e71a912647d2d0cea5070cffbb" UNIQUE ("selector");
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'refresh_tokens' AND column_name = 'family' AND data_type = 'uuid'
        ) THEN
          ALTER TABLE "refresh_tokens" DROP COLUMN "family";
          ALTER TABLE "refresh_tokens" ADD "family" character varying NOT NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'refresh_tokens' AND column_name = 'replacedByTokenId' AND data_type = 'uuid'
        ) THEN
          ALTER TABLE "refresh_tokens" DROP COLUMN "replacedByTokenId";
          ALTER TABLE "refresh_tokens" ADD "replacedByTokenId" character varying;
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "notification_preferences" ADD CONSTRAINT "UQ_b70c44e8b00757584a393225593" UNIQUE ("userId");
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'notifications' AND column_name = 'userId' AND data_type = 'uuid'
        ) THEN
          ALTER TABLE "notifications" DROP COLUMN "userId";
          ALTER TABLE "notifications" ADD "userId" character varying NOT NULL;
        END IF;
      END $$;
    `);

    // ── Re-create indexes with final (auto-generated-style) names ──
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_610102b60fea1455310ccd299d" ON "refresh_tokens" ("userId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_6e71a912647d2d0cea5070cffb" ON "refresh_tokens" ("selector")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_968936751ab847471635be8dc0" ON "refresh_tokens" ("family")`);

    // ── Re-add foreign keys using the final (auto-generated-style) names ──
    // Each wrapped so "constraint already exists" (duplicate_object) is
    // silently accepted — that's the expected/desired outcome on this DB.
    const fks: Array<[string, string]> = [
      [`menu_items`, `ALTER TABLE "menu_items" ADD CONSTRAINT "FK_a8ff5699334d3ca7b07421af0a9" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`],
      [`order_items->orders`, `ALTER TABLE "order_items" ADD CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`],
      [`order_items->menu_items`, `ALTER TABLE "order_items" ADD CONSTRAINT "FK_d8453d5a71e525d9b406c35aab8" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`],
      [`orders->customer`, `ALTER TABLE "orders" ADD CONSTRAINT "FK_e5de51ca888d8b1f5ac25799dd1" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`],
      [`orders->restaurant`, `ALTER TABLE "orders" ADD CONSTRAINT "FK_2312cd07a04f50ba29d76c9564e" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`],
      [`orders->agent`, `ALTER TABLE "orders" ADD CONSTRAINT "FK_98f71dbb92cea9a36e3a196f7b9" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`],
      [`reviews->customer`, `ALTER TABLE "reviews" ADD CONSTRAINT "FK_6d99bdfa69280ede313699fab92" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`],
      [`reviews->restaurant`, `ALTER TABLE "reviews" ADD CONSTRAINT "FK_92ad8cd051c76d10e284bbc3283" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`],
      [`reviews->order`, `ALTER TABLE "reviews" ADD CONSTRAINT "FK_53a68dc905777554b7f702791fa" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`],
      [`restaurants->owner`, `ALTER TABLE "restaurants" ADD CONSTRAINT "FK_9519e81d388514ec631d23fefca" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`],
      [`refresh_tokens->user`, `ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`],
      [`notification_preferences->user`, `ALTER TABLE "notification_preferences" ADD CONSTRAINT "FK_b70c44e8b00757584a393225593" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`],
      [`favorites->user`, `ALTER TABLE "favorites" ADD CONSTRAINT "FK_e747534006c6e3c2f09939da60f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`],
      [`favorites->restaurant`, `ALTER TABLE "favorites" ADD CONSTRAINT "FK_05922e2bde7d7faf600bc586e84" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`],
    ];

    for (const [, sql] of fks) {
      await queryRunner.query(`DO $$ BEGIN ${sql}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Down migration intentionally omitted for this corrective/idempotent
    // rewrite — reverting would need to know which pre-state (old-named vs
    // auto-named schema) to revert to, which isn't well-defined here.
    // If you need to roll back, restore from a Neon branch/snapshot instead.
  }
}