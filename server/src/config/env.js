import 'dotenv/config';
import { z } from 'zod';

const raw = z.object({
  DATABASE_URL: z.string().url().optional(),
  DB_HOST: z.string().min(1).optional(), DB_PORT: z.coerce.number().int().positive().optional(), DB_USER: z.string().min(1).optional(), DB_PASSWORD: z.string().optional(), DB_NAME: z.string().min(1).optional(), DB_CONNECTION_LIMIT: z.coerce.number().int().positive().default(10),
  JWT_SECRET: z.string().min(32), JWT_EXPIRES_IN: z.string().default('1d'), PORT: z.coerce.number().default(5000), CLIENT_URL: z.string().url().default('http://localhost:5173'), NODE_ENV: z.string().default('development'), SUPER_ADMIN_EMAIL: z.string().email().optional(), SUPER_ADMIN_PASSWORD: z.string().optional(),
}).parse(process.env);

const legacyUrl = raw.DATABASE_URL ? new URL(raw.DATABASE_URL) : null;

// DATABASE_URL is a backwards-compatible fallback for existing local setups.
// New configuration should use the explicit DB_* variables in .env.example.
export const env = {
  ...raw,
  DB_HOST: raw.DB_HOST ?? legacyUrl?.hostname ?? 'localhost',
  DB_PORT: raw.DB_PORT ?? (legacyUrl?.port ? Number(legacyUrl.port) : 3306),
  DB_USER: raw.DB_USER ?? (legacyUrl?.username ? decodeURIComponent(legacyUrl.username) : 'root'),
  DB_PASSWORD: raw.DB_PASSWORD ?? (legacyUrl?.password ? decodeURIComponent(legacyUrl.password) : ''),
  DB_NAME: raw.DB_NAME ?? (legacyUrl?.pathname.slice(1) || 'hospital_management'),
};
