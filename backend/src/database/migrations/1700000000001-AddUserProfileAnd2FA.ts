// src/database/migrations/1700000000001-AddUserProfileAnd2FA.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserProfileAnd2FA1700000000001 implements MigrationInterface {
  name = 'AddUserProfileAnd2FA1700000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Profile picture fields
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "profilePicture" character varying,
      ADD COLUMN IF NOT EXISTS "profilePicturePublicId" character varying
    `);

    // Email change fields
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "pendingEmail" character varying,
      ADD COLUMN IF NOT EXISTS "emailChangeToken" character varying,
      ADD COLUMN IF NOT EXISTS "emailChangeTokenExpires" TIMESTAMP
    `);

    // 2FA fields
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "twoFactorEnabled" boolean NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "twoFactorSecret" character varying,
      ADD COLUMN IF NOT EXISTS "twoFactorBackupCodes" character varying
    `);

    // Notification preferences table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notification_preferences" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "emailOrderStatus" boolean NOT NULL DEFAULT true,
        "emailNewOrder" boolean NOT NULL DEFAULT true,
        "emailDeliveryUpdate" boolean NOT NULL DEFAULT true,
        "emailPromotional" boolean NOT NULL DEFAULT false,
        "emailReview" boolean NOT NULL DEFAULT true,
        "emailSystem" boolean NOT NULL DEFAULT true,
        "emailEarnings" boolean NOT NULL DEFAULT true,
        "pushOrderStatus" boolean NOT NULL DEFAULT true,
        "pushNewOrder" boolean NOT NULL DEFAULT true,
        "pushDeliveryUpdate" boolean NOT NULL DEFAULT true,
        "pushPromotional" boolean NOT NULL DEFAULT false,
        "pushReview" boolean NOT NULL DEFAULT true,
        "pushSystem" boolean NOT NULL DEFAULT true,
        "pushEarnings" boolean NOT NULL DEFAULT true,
        "inAppOrderStatus" boolean NOT NULL DEFAULT true,
        "inAppNewOrder" boolean NOT NULL DEFAULT true,
        "inAppDeliveryUpdate" boolean NOT NULL DEFAULT true,
        "inAppPromotional" boolean NOT NULL DEFAULT false,
        "inAppReview" boolean NOT NULL DEFAULT true,
        "inAppSystem" boolean NOT NULL DEFAULT true,
        "inAppEarnings" boolean NOT NULL DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
      )
    `);

    // Index for notification preferences
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notification_preferences_userId"
      ON "notification_preferences" ("userId")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "notification_preferences"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "twoFactorBackupCodes"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "twoFactorSecret"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "twoFactorEnabled"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "emailChangeTokenExpires"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "emailChangeToken"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "pendingEmail"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "profilePicturePublicId"`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "profilePicture"`);
  }
}