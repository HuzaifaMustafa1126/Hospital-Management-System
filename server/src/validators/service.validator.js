import { z } from 'zod';

const text = (max) => z.string().trim().min(1).max(max);
const optionalText = (max) => z.string().trim().max(max).optional().nullable();
const safeInteger = (value, fallback, maximum) => { const number = /^\d+$/.test(String(value ?? '').trim()) ? Number.parseInt(value, 10) : fallback; return Math.max(1, Math.min(number, maximum)); };
const price = z.coerce.number().finite().min(0).max(99999999.99);
const departmentIds = z.array(z.coerce.number().int().positive()).min(1).transform((values) => [...new Set(values)]);

export const serviceCreateSchema = z.object({ departmentIds, name: text(150), code: text(50).regex(/^[A-Za-z0-9_]+$/).transform((value) => value.toUpperCase()), description: optionalText(500), price, isActive: z.boolean().default(true) });
export const serviceUpdateSchema = z.object({ departmentIds: departmentIds.optional(), name: text(150).optional(), description: optionalText(500), price: price.optional(), isActive: z.boolean().optional() }).refine((value) => Object.keys(value).length > 0, 'At least one field is required');
export const serviceStatusSchema = z.object({ isActive: z.boolean() });
export const serviceListSchema = z.object({
  page: z.preprocess((value) => safeInteger(value, 1, 1000000), z.number().int().positive()), limit: z.preprocess((value) => safeInteger(value, 20, 100), z.number().int().positive()),
  departmentId: z.preprocess((value) => value === undefined || value === '' ? undefined : Number(value), z.number().int().positive().optional()), status: z.enum(['active', 'inactive', 'all']).optional().default('all'), search: z.string().trim().max(150).optional(),
});
