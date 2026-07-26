import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRefreshTokens1722000000000 implements MigrationInterface {
  name = 'CreateRefreshTokens1722000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refresh_tokens" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "tokenHash" character varying NOT NULL,
        "family" uuid NOT NULL,
        "expiresAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "revoked" boolean NOT NULL DEFAULT false,
        "revokedAt" TIMESTAMP WITH TIME ZONE,
        "replacedByTokenId" uuid,
        "userAgent" character varying,
        "ipAddress" character varying,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "FK_refresh_tokens_user" FOREIGN KEY ("userId")
          REFERENCES "users"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_userId" ON "refresh_tokens" ("userId")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_refresh_tokens_family" ON "refresh_tokens" ("family")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_family"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_refresh_tokens_userId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refresh_tokens"`);
  }
}