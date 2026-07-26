import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserIsDeleted1722100000000 implements MigrationInterface {
  name = 'AddUserIsDeleted1722100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "isDeleted" boolean NOT NULL DEFAULT false
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_users_isDeleted" ON "users" ("isDeleted")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_users_isDeleted"`);
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "isDeleted"`,
    );
  }
}