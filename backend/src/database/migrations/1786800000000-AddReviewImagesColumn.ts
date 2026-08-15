import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddReviewImagesColumn1786800000000 implements MigrationInterface {
  name = 'AddReviewImagesColumn1786800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // TypeORM's 'simple-array' column type stores as a plain text column
    // (comma-joined string), which is what this maps to under the hood.
    await queryRunner.query(`
      ALTER TABLE "reviews"
      ADD COLUMN IF NOT EXISTS "images" text
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "reviews" DROP COLUMN IF EXISTS "images"
    `);
  }
}