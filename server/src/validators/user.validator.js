import { z } from 'zod';
const roles = ['SUPER_ADMIN', 'RECEPTION', 'LAB_ATTENDANT', 'SURGERY_STAFF', 'BLOOD_BANK_STAFF', 'BILLING_STAFF'];
export const createUserSchema = z.object({ firstName: z.string().trim().min(1).max(80), lastName: z.string().trim().min(1).max(80), email: z.string().trim().email(), phone: z.string().trim().max(30).optional(), password: z.string().min(8).max(128), role: z.enum(roles), isActive: z.boolean().default(true) });
export const updateUserSchema = createUserSchema.omit({ password: true, isActive: true, email: true }).partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required'); export const statusSchema = z.object({ isActive: z.boolean() }); export const resetPasswordSchema = z.object({ password: z.string().min(8).max(128) });
