import { z } from 'zod';

const text = (max) => z.string().trim().min(1).max(max);
const optionalText = (max) => z.string().trim().max(max).optional().nullable();
const integer = (value, fallback) => (/^\d+$/.test(String(value ?? '').trim()) ? Number.parseInt(value, 10) : fallback);
const pagination = z.object({
  page: z.preprocess((value) => Math.max(1, Math.min(integer(value, 1), 1000000)), z.number().int().positive()),
  limit: z.preprocess((value) => Math.max(1, Math.min(integer(value, 20), 100)), z.number().int().positive()),
  search: z.string().trim().max(150).optional(),
  status: z.enum(['active', 'inactive', 'all']).optional().default('all'),
  registrationOnly: z.preprocess((value) => value === true || value === 'true', z.boolean()).optional().default(false),
  sort: z.enum(['name', 'fee']).optional().default('name'),
  direction: z.enum(['asc', 'desc']).optional().default('asc'),
});

export const departmentCreateSchema = z.object({ name: text(150), code: text(30).transform((value) => value.toUpperCase()), description: optionalText(500), registrationFee: z.coerce.number().finite().min(0).max(99999999.99), isActive:z.boolean().default(true) });
export const departmentUpdateSchema = departmentCreateSchema.omit({code:true}).partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required');
export const departmentStatusSchema = z.object({ isActive: z.boolean() });
export const departmentListSchema = pagination;
