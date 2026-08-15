import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { resolve } from 'path';

/**
 * Env loading strategy
 * ---------------------------------------------------------------
 * Problem this fixes: previously, if NODE_ENV wasn't EXACTLY 'neon',
 * the CLI silently fell back to .env.local (or nothing), so
 * `npm run migration:run` could connect to a totally different
 * database than the one your app actually runs against.
 *
 * New strategy: load ALL relevant env files in increasing priority
 * order, so a missing/mistyped NODE_ENV can never silently swap
 * out the database. Later files override earlier ones (override: true).
 *
 *   1. .env                (base defaults, optional)
 *   2. .env.local           (local overrides, optional)
 *   3. .env.<NODE_ENV>      (environment-specific, optional)
 *
 * Whatever NODE_ENV actually is (development / neon / production / undefined),
 * if a matching .env.<NODE_ENV> file exists, it wins. If not, you still get
 * .env.local. Nothing is silently skipped.
 */
const nodeEnv = process.env.NODE_ENV || 'development';

const candidateFiles = ['.env', '.env.local', `.env.${nodeEnv}`];

const loadedFiles: string[] = [];
for (const file of candidateFiles) {
  const fullPath = resolve(process.cwd(), file);
  if (existsSync(fullPath)) {
    config({ path: fullPath, override: true });
    loadedFiles.push(file);
  }
}

const required = ['DB_HOST', 'DB_PORT', 'DB_USERNAME', 'DB_PASSWORD', 'DB_DATABASE'];
const missing = required.filter((key) => !process.env[key]);

if (missing.length > 0) {
  throw new Error(
    `[data-source] Missing required env vars: ${missing.join(', ')}. ` +
      `NODE_ENV="${nodeEnv}", loaded files: [${loadedFiles.join(', ') || 'none found'}]. ` +
      `Check that one of ${candidateFiles.join(', ')} exists in the project root and defines these values.`,
  );
}

const isNeon =
  process.env.DB_HOST?.includes('neon.tech') || process.env.DB_SSL === 'true';

// Never log the password. Log everything else so a wrong-DB connection
// is obvious immediately instead of surfacing as a mystery 404 later.
console.log(
  `[data-source] NODE_ENV="${nodeEnv}" | loaded: [${loadedFiles.join(', ') || 'none'}] | ` +
    `host=${process.env.DB_HOST} port=${process.env.DB_PORT} db=${process.env.DB_DATABASE} ` +
    `ssl=${isNeon} user=${process.env.DB_USERNAME}`,
);

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: true,
  ssl: isNeon ? { rejectUnauthorized: false } : false,
});