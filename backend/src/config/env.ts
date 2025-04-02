import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('8000'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('15m'),
  CORS_ORIGIN: z.string().default('http://localhost:8085'),
  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  // Judge0 configuration
  JUDGE0_API_URL: z.string().default('https://judge0-ce.p.rapidapi.com'),
  JUDGE0_AUTH_TOKEN: z.string().optional(),
  JUDGE0_HOST: z.string().default('judge0-ce.p.rapidapi.com'),
  JUDGE0_TIMEOUT: z.string().default('10000'),
  // Judge0 Extra configuration (backup)
  JUDGE0_EXTRA_API_URL: z.string().default('https://judge0-extra-ce.p.rapidapi.com').optional(),
  JUDGE0_EXTRA_AUTH_TOKEN: z.string().optional(),
  JUDGE0_EXTRA_HOST: z.string().default('judge0-extra-ce.p.rapidapi.com').optional(),
});

const env = envSchema.parse(process.env);

export default env; 