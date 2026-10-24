import { z } from "zod";

export const visitCreateSchema = z.object({
  departmentId: z.coerce.number().int().positive(),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "OTHER"]),
  feeType: z.enum(["FREE", "ACTUAL", "DISCOUNTED"]),
  visitFee: z.coerce.number().finite().min(0).max(99999999.99),
  serviceIds: z.array(z.coerce.number().int().positive()).max(100).default([]),
});

export const visitStatusSchema = z.object({ status: z.enum(["IN_CONSULTATION", "SHORT_STAY", "COMPLETED", "CANCELLED"]) });
export const shortStayOrderSchema = z.object({
  medicineName: z.string().trim().min(1).max(255),
  dose: z.string().trim().min(1).max(100),
  route: z.enum(["IV", "IM"]),
  quantity: z.string().trim().min(1).max(100),
});
