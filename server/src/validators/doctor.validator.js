import { z } from 'zod';

const text = (max) => z.string().trim().min(1).max(max);
export const doctorSchema = z.object({
  firstName: text(100), lastName: text(100), specialization: z.string().trim().max(150).optional().nullable(),
  phone: z.string().trim().max(30).optional().nullable(), licenseNumber: z.string().trim().max(100).optional().nullable(),
});
export const doctorUpdateSchema = doctorSchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required');
export const doctorStatusSchema = z.object({ isActive: z.boolean() });
