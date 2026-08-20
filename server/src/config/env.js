import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  CLIENT_URL: z.string().url().default('http://localhost:5173'),
  DB_HOST: z.string().min(1).default('127.0.0.1'),
  DB_PORT: z.coerce.number().int().positive().default(3306),
  DB_USER: z.string().min(1).default('root'),
  DB_PASSWORD: z.string().default(''),
  DB_NAME: z.string().min(1).default('hospital_management'),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET is required'),
  JWT_EXPIRES_IN: z.string().min(1).default('8h'),
  SUPER_ADMIN_EMAIL: z.string().email().default('admin@hospital.local'),
  SUPER_ADMIN_PASSWORD: z.string().min(1).default('admin123@'),
  NODE_ENV: z.string().default('development'),
});

export const env = schema.parse(process.env);
