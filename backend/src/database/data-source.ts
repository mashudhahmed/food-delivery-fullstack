import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { resolve } from 'path';

const nodeEnv = process.env.NODE_ENV || 'development';

const envFile =
  nodeEnv === 'neon'
    ? '.env.neon'
    : nodeEnv === 'production'
      ? '.env.production'
      : '.env.local';

config({ path: resolve(process.cwd(), envFile) });
// fallback
config({ path: resolve(process.cwd(), '.env') });

const isNeon =
  process.env.DB_HOST?.includes('neon.tech') || process.env.DB_SSL === 'true';

console.log(`[data-source] env=${nodeEnv} file=${envFile} host=${process.env.DB_HOST}`);

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