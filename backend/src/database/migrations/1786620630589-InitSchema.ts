import { MigrationInterface, QueryRunner } from "typeorm";

export class InitSchema1786620630589 implements MigrationInterface {
    name = 'InitSchema1786620630589'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "menu_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text NOT NULL, "price" numeric(10,2) NOT NULL, "imageUrl" character varying, "isAvailable" boolean NOT NULL DEFAULT true, "category" character varying NOT NULL, "restaurantId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_57e6188f929e5dc6919168620c8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "order_items" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "orderId" uuid NOT NULL, "menuItemId" uuid NOT NULL, "quantity" integer NOT NULL, "unitPrice" numeric(10,2) NOT NULL, CONSTRAINT "PK_005269d8574e6fac0493715c308" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TYPE "public"."orders_status_enum" AS ENUM('pending', 'preparing', 'ready', 'picked_up', 'on_the_way', 'delivered', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "orders" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customerId" uuid NOT NULL, "restaurantId" uuid NOT NULL, "agentId" uuid, "status" "public"."orders_status_enum" NOT NULL DEFAULT 'pending', "subtotal" numeric(10,2) NOT NULL DEFAULT '0', "deliveryFee" numeric(10,2) NOT NULL DEFAULT '50', "platformFee" numeric(10,2) NOT NULL DEFAULT '20', "totalAmount" numeric(10,2) NOT NULL, "deliveryAddress" character varying NOT NULL, "deliveryInstructions" character varying, "customerName" character varying, "customerEmail" character varying, "customerPhone" character varying, "paymentMethod" character varying, "placedAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_710e2d4957aa5878dfe94e4ac2f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "reviews" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "user_id" uuid NOT NULL, "order_id" uuid NOT NULL, "restaurant_id" uuid NOT NULL, "rating" integer NOT NULL, "comment" text, "images" text, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "deleted_at" TIMESTAMP, CONSTRAINT "PK_231ae565c273ee700b283f15c1d" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "restaurants" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "name" character varying NOT NULL, "description" text NOT NULL, "address" character varying NOT NULL, "phone" character varying NOT NULL, "cuisineType" character varying NOT NULL, "isOpen" boolean NOT NULL DEFAULT true, "rating" numeric(3,2) NOT NULL DEFAULT '0', "imageUrl" character varying, "isVerified" boolean NOT NULL DEFAULT false, "isDeleted" boolean NOT NULL DEFAULT false, "ownerId" uuid NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_e2133a72eb1cc8f588f7b503e68" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "selector" character varying NOT NULL, "tokenHash" character varying NOT NULL, "family" character varying NOT NULL, "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL, "revoked" boolean NOT NULL DEFAULT false, "revokedAt" TIMESTAMP WITH TIME ZONE, "replacedByTokenId" character varying, "userAgent" character varying, "ipAddress" character varying, "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "UQ_6e71a912647d2d0cea5070cffbb" UNIQUE ("selector"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_610102b60fea1455310ccd299d" ON "refresh_tokens" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_6e71a912647d2d0cea5070cffb" ON "refresh_tokens" ("selector") `);
        await queryRunner.query(`CREATE INDEX "IDX_968936751ab847471635be8dc0" ON "refresh_tokens" ("family") `);
        await queryRunner.query(`CREATE TYPE "public"."users_role_enum" AS ENUM('customer', 'owner', 'agent', 'admin')`);
        await queryRunner.query(`CREATE TYPE "public"."users_status_enum" AS ENUM('pending', 'approved', 'rejected', 'suspended')`);
        await queryRunner.query(`CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "fullName" character varying NOT NULL, "email" character varying NOT NULL, "phone" character varying NOT NULL, "address" character varying, "profilePicture" character varying, "profilePicturePublicId" character varying, "pendingEmail" character varying, "emailChangeToken" character varying, "emailChangeTokenExpires" TIMESTAMP, "twoFactorEnabled" boolean NOT NULL DEFAULT false, "twoFactorSecret" character varying, "twoFactorBackupCodes" character varying, "role" "public"."users_role_enum" NOT NULL DEFAULT 'customer', "status" "public"."users_status_enum" NOT NULL DEFAULT 'approved', "isDeleted" boolean NOT NULL DEFAULT false, "businessName" character varying, "businessAddress" character varying, "taxId" character varying, "nidNumber" character varying, "vehicleType" character varying, "vehicleNumber" character varying, "drivingLicense" character varying, "passwordHash" character varying NOT NULL, "approvedAt" TIMESTAMP, "approvedBy" character varying, "rejectionReason" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), "resetPasswordToken" character varying, "resetPasswordExpires" TIMESTAMP, "lastLogin" TIMESTAMP, CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"), CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "notification_preferences" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "emailOrderStatus" boolean NOT NULL DEFAULT true, "emailNewOrder" boolean NOT NULL DEFAULT true, "emailDeliveryUpdate" boolean NOT NULL DEFAULT true, "emailPromotional" boolean NOT NULL DEFAULT false, "emailReview" boolean NOT NULL DEFAULT true, "emailSystem" boolean NOT NULL DEFAULT true, "emailEarnings" boolean NOT NULL DEFAULT true, "pushOrderStatus" boolean NOT NULL DEFAULT true, "pushNewOrder" boolean NOT NULL DEFAULT true, "pushDeliveryUpdate" boolean NOT NULL DEFAULT true, "pushPromotional" boolean NOT NULL DEFAULT false, "pushReview" boolean NOT NULL DEFAULT true, "pushSystem" boolean NOT NULL DEFAULT true, "pushEarnings" boolean NOT NULL DEFAULT true, "inAppOrderStatus" boolean NOT NULL DEFAULT true, "inAppNewOrder" boolean NOT NULL DEFAULT true, "inAppDeliveryUpdate" boolean NOT NULL DEFAULT true, "inAppPromotional" boolean NOT NULL DEFAULT false, "inAppReview" boolean NOT NULL DEFAULT true, "inAppSystem" boolean NOT NULL DEFAULT true, "inAppEarnings" boolean NOT NULL DEFAULT true, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "REL_b70c44e8b00757584a39322559" UNIQUE ("userId"), CONSTRAINT "PK_e94e2b543f2f218ee68e4f4fad2" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "notifications" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying NOT NULL, "type" character varying NOT NULL, "title" character varying NOT NULL, "message" character varying NOT NULL, "data" json, "read" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_6a72c3c0f683f6462415e653c3a" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "favorites" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "restaurantId" uuid NOT NULL, "restaurantName" character varying NOT NULL, "restaurantImage" character varying, "cuisineType" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_890818d27523748dd36a4d1bdc8" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "order_batches" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "customerId" character varying NOT NULL, "deliveryAddress" character varying NOT NULL, "deliveryInstructions" character varying, "totalAmount" numeric(10,2) NOT NULL, "isComplete" boolean NOT NULL DEFAULT false, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_2b6b9ed5fdd6411e9f9c1d727f3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "audit_logs" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" character varying, "action" character varying NOT NULL, "resource" character varying NOT NULL, "resourceId" character varying NOT NULL, "changes" json, "ipAddress" character varying, "userAgent" character varying, "requestId" character varying, "wasSuccessful" boolean NOT NULL DEFAULT false, "errorMessage" character varying, "timestamp" TIMESTAMP NOT NULL DEFAULT now(), "metadata" json, CONSTRAINT "PK_1bb179d048bbc581caa3b013439" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_5db7a2b9e2bd2563b2377c293c" ON "audit_logs" ("resource", "resourceId") `);
        await queryRunner.query(`CREATE INDEX "IDX_5ee52ff271c0f9bca5f97daa0a" ON "audit_logs" ("userId", "action") `);
        await queryRunner.query(`ALTER TABLE "menu_items" ADD CONSTRAINT "FK_a8ff5699334d3ca7b07421af0a9" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "order_items" ADD CONSTRAINT "FK_d8453d5a71e525d9b406c35aab8" FOREIGN KEY ("menuItemId") REFERENCES "menu_items"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_e5de51ca888d8b1f5ac25799dd1" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_2312cd07a04f50ba29d76c9564e" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "orders" ADD CONSTRAINT "FK_98f71dbb92cea9a36e3a196f7b9" FOREIGN KEY ("agentId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_e4b0ed40bdd0f318108612c2851" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "FK_2269110d10df8d494b99e1381d2" FOREIGN KEY ("restaurant_id") REFERENCES "restaurants"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "restaurants" ADD CONSTRAINT "FK_9519e81d388514ec631d23fefca" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "notification_preferences" ADD CONSTRAINT "FK_b70c44e8b00757584a393225593" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "favorites" ADD CONSTRAINT "FK_e747534006c6e3c2f09939da60f" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "favorites" ADD CONSTRAINT "FK_05922e2bde7d7faf600bc586e84" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "favorites" DROP CONSTRAINT "FK_05922e2bde7d7faf600bc586e84"`);
        await queryRunner.query(`ALTER TABLE "favorites" DROP CONSTRAINT "FK_e747534006c6e3c2f09939da60f"`);
        await queryRunner.query(`ALTER TABLE "notification_preferences" DROP CONSTRAINT "FK_b70c44e8b00757584a393225593"`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_610102b60fea1455310ccd299de"`);
        await queryRunner.query(`ALTER TABLE "restaurants" DROP CONSTRAINT "FK_9519e81d388514ec631d23fefca"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_2269110d10df8d494b99e1381d2"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_e4b0ed40bdd0f318108612c2851"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "FK_728447781a30bc3fcfe5c2f1cdf"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_98f71dbb92cea9a36e3a196f7b9"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_2312cd07a04f50ba29d76c9564e"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP CONSTRAINT "FK_e5de51ca888d8b1f5ac25799dd1"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_d8453d5a71e525d9b406c35aab8"`);
        await queryRunner.query(`ALTER TABLE "order_items" DROP CONSTRAINT "FK_f1d359a55923bb45b057fbdab0d"`);
        await queryRunner.query(`ALTER TABLE "menu_items" DROP CONSTRAINT "FK_a8ff5699334d3ca7b07421af0a9"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5ee52ff271c0f9bca5f97daa0a"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_5db7a2b9e2bd2563b2377c293c"`);
        await queryRunner.query(`DROP TABLE "audit_logs"`);
        await queryRunner.query(`DROP TABLE "order_batches"`);
        await queryRunner.query(`DROP TABLE "favorites"`);
        await queryRunner.query(`DROP TABLE "notifications"`);
        await queryRunner.query(`DROP TABLE "notification_preferences"`);
        await queryRunner.query(`DROP TABLE "users"`);
        await queryRunner.query(`DROP TYPE "public"."users_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_968936751ab847471635be8dc0"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_6e71a912647d2d0cea5070cffb"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_610102b60fea1455310ccd299d"`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);
        await queryRunner.query(`DROP TABLE "restaurants"`);
        await queryRunner.query(`DROP TABLE "reviews"`);
        await queryRunner.query(`DROP TABLE "orders"`);
        await queryRunner.query(`DROP TYPE "public"."orders_status_enum"`);
        await queryRunner.query(`DROP TABLE "order_items"`);
        await queryRunner.query(`DROP TABLE "menu_items"`);
    }

}
