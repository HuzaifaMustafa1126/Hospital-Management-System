import { z } from 'zod';

const required = (max) => z.string().trim().min(1).max(max);
const phone = required(30).refine((value) => /^[+\d][\d\s()-]{5,29}$/.test(value), 'Enter a valid phone number');
export const patientSchema = z.object({
  firstName: required(100), lastName: required(100), fatherName: required(100),
  cnic: required(20), phone, address: required(500), doctorId: z.coerce.number().int().positive(),
  paymentMethod: z.enum(['CASH', 'CARD', 'BANK_TRANSFER', 'OTHER']), feeType: z.enum(['FREE', 'ACTUAL', 'DISCOUNTED']).default('FREE'), registrationFee: z.coerce.number().finite().min(0).max(99999999.99).optional(),
});
export const patientUpdateSchema = patientSchema.omit({ paymentMethod: true }).partial().refine((value) => Object.keys(value).length > 0, 'At least one field is required');
const positiveInteger = (value) => typeof value === 'number' ? value : (/^\d+$/.test(String(value ?? '').trim()) ? Number.parseInt(value, 10) : NaN);
const safePage = (value) => { const number = positiveInteger(value); return Number.isInteger(number) && number > 0 ? Math.min(number, 1000000) : 1; };
const safeLimit = (value) => { const number = positiveInteger(value); return Number.isInteger(number) && number > 0 ? Math.min(number, 100) : 20; };
export const patientListSchema = z.object({ page: z.preprocess(safePage, z.number().int()), limit: z.preprocess(safeLimit, z.number().int()), search: z.string().trim().max(191).optional() });
