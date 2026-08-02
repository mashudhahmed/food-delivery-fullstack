import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateCoreSchema1690000000000 implements MigrationInterface {
  name = 'CreateCoreSchema1690000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Required for uuid_generate_v4()
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);

    // ── Enum types ──────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "users_role_enum" AS ENUM ('customer', 'owner', 'agent', 'admin');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "users_status_enum" AS ENUM ('pending', 'approved', 'rejected', 'suspended');
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "orders_status_enum" AS ENUM (
          'pending', 'preparing', 'ready', 'picked_up', 'on_the_way', 'delivered', 'cancelled'
        );
      EXCEPTION WHEN duplicate_object THEN NULL; END $$;
    `);

    // ── users ────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "fullName" character varying NOT NULL,
        "email" character varying NOT NULL UNIQUE,
        "phone" character varying NOT NULL,
        "address" character varying,
        "role" "users_role_enum" NOT NULL DEFAULT 'customer',
        "status" "users_status_enum" NOT NULL DEFAULT 'approved',
        "isDeleted" boolean NOT NULL DEFAULT false,
        "businessName" character varying,
        "businessAddress" character varying,
        "taxId" character varying,
        "nidNumber" character varying,
        "vehicleType" character varying,
        "vehicleNumber" character varying,
        "drivingLicense" character varying,
        "passwordHash" character varying NOT NULL,
        "approvedAt" TIMESTAMP,
        "approvedBy" character varying,
        "rejectionReason" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "resetPasswordToken" character varying,
        "resetPasswordExpires" TIMESTAMP,
        "lastLogin" TIMESTAMP
      )
    `);

    // ── restaurants ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "restaurants" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text NOT NULL,
        "address" character varying NOT NULL,
        "phone" character varying NOT NULL,
        "cuisineType" character varying NOT NULL,
        "isOpen" boolean NOT NULL DEFAULT true,
        "rating" numeric(3,2) NOT NULL DEFAULT 0,
        "imageUrl" character varying,
        "isVerified" boolean NOT NULL DEFAULT false,
        "isDeleted" boolean NOT NULL DEFAULT false,
        "ownerId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_restaurants_owner" FOREIGN KEY ("ownerId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    // ── menu_items ──────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "menu_items" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "description" text NOT NULL,
        "price" numeric(10,2) NOT NULL,
        "imageUrl" character varying,
        "isAvailable" boolean NOT NULL DEFAULT true,
        "category" character varying NOT NULL,
        "restaurantId" uuid NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_menu_items_restaurant" FOREIGN KEY ("restaurantId")
          REFERENCES "restaurants"("id") ON DELETE CASCADE
      )
    `);

    // ── orders ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "orders" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "customerId" uuid NOT NULL,
        "restaurantId" uuid NOT NULL,
        "agentId" uuid,
        "status" "orders_status_enum" NOT NULL DEFAULT 'pending',
        "subtotal" numeric(10,2) NOT NULL DEFAULT 0,
        "deliveryFee" numeric(10,2) NOT NULL DEFAULT 50,
        "platformFee" numeric(10,2) NOT NULL DEFAULT 20,
        "totalAmount" numeric(10,2) NOT NULL,
        "deliveryAddress" character varying NOT NULL,
        "deliveryInstructions" character varying,
        "customerName" character varying,
        "customerEmail" character varying,
        "customerPhone" character varying,
        "paymentMethod" character varying,
        "placedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_orders_customer" FOREIGN KEY ("customerId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_orders_restaurant" FOREIGN KEY ("restaurantId")
          REFERENCES "restaurants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_orders_agent" FOREIGN KEY ("agentId")
          REFERENCES "users"("id") ON DELETE SET NULL
      )
    `);

    // ── order_items ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "order_items" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "orderId" uuid NOT NULL,
        "menuItemId" uuid NOT NULL,
        "quantity" integer NOT NULL,
        "unitPrice" numeric(10,2) NOT NULL,
        CONSTRAINT "FK_order_items_order" FOREIGN KEY ("orderId")
          REFERENCES "orders"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_items_menu_item" FOREIGN KEY ("menuItemId")
          REFERENCES "menu_items"("id") ON DELETE CASCADE
      )
    `);

    // ── reviews ─────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reviews" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "customerId" uuid NOT NULL,
        "restaurantId" uuid NOT NULL,
        "orderId" uuid NOT NULL,
        "rating" integer NOT NULL,
        "comment" text NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_reviews_customer" FOREIGN KEY ("customerId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_reviews_restaurant" FOREIGN KEY ("restaurantId")
          REFERENCES "restaurants"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_reviews_order" FOREIGN KEY ("orderId")
          REFERENCES "orders"("id") ON DELETE CASCADE
      )
    `);

    // ── notifications ───────────────────────────────────────────
    // No FK on userId — the entity doesn't declare a relation, kept as-is.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "type" character varying NOT NULL,
        "title" character varying NOT NULL,
        "message" character varying NOT NULL,
        "data" json,
        "read" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // ── favorites ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "favorites" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "restaurantId" uuid NOT NULL,
        "restaurantName" character varying NOT NULL,
        "restaurantImage" character varying,
        "cuisineType" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "FK_favorites_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_favorites_restaurant" FOREIGN KEY ("restaurantId")
          REFERENCES "restaurants"("id") ON DELETE CASCADE
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "favorites"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "notifications"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reviews"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "menu_items"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "restaurants"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "users"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "orders_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "users_role_enum"`);
  }
}