import { z } from 'zod';

const required = (max) => z.string().trim().min(1).max(max);
const phone = required(30).refine((value) => /^[+\d][\d\s()-]{5,29}$/.test(value), 'Enter a valid phone number');
export const patientSchema = z.object({
  firstName: required(100), lastName: required(100), fatherName: required(100),
  cnic: required(20), phone, address: required(500), doctorId: z.coerce.number().int().positive(),
});
export const patientUpdateSchema = patientSchema.partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required');
export const patientListSchema = z.object({ page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(100).default(20), search: z.string().trim().max(191).optional() });
