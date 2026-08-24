import { z } from "zod";

export const visitCreateSchema = z.object({
  doctorId: z.coerce.number().int().positive(),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "OTHER"]),
  feeType: z.enum(["FREE", "ACTUAL", "DISCOUNTED"]),
  visitFee: z.coerce.number().finite().min(0).max(99999999.99),
  serviceIds: z.array(z.coerce.number().int().positive()).max(100).default([]),
});
