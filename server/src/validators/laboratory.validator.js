import { z } from "zod";
const positiveInteger = z.coerce.number().int().positive();
export const laboratorySearchSchema = z.object({ cnic: z.string().trim().max(15).optional(), patientNumber: z.string().trim().max(20).optional(), phone: z.string().trim().max(30).optional(), search: z.string().trim().max(150).optional(), page: z.coerce.number().int().positive().default(1), limit: z.coerce.number().int().min(1).max(50).default(20) });
export const laboratoryServiceSchema = z.object({ serviceId: positiveInteger, quantity: positiveInteger, notes: z.string().trim().max(1000).optional().nullable() });
