import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddRefreshTokenSelector1723000000000 implements MigrationInterface {
  name = 'AddRefreshTokenSelector1723000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
      ADD COLUMN IF NOT EXISTS "selector" character varying
    `);

    await queryRunner.query(`
      UPDATE "refresh_tokens"
      SET "selector" = gen_random_uuid()::text
      WHERE "selector" IS NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens"
      ALTER COLUMN "selector" SET NOT NULL
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "IDX_refresh_tokens_selector"
      ON "refresh_tokens" ("selector")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_selector"`);
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP COLUMN IF EXISTS "selector"`,
    );
  }
}