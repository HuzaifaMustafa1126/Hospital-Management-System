import { z } from "zod";

export const paymentSchema = z.object({
  amount: z.coerce
    .number()
    .finite()
    .positive()
    .max(99999999.99)
    .refine(
      (value) => Math.abs(value * 100 - Math.round(value * 100)) < 1e-7,
      "Amount may have at most two decimal places",
    ),
  paymentMethod: z.enum(["CASH", "CARD", "BANK_TRANSFER", "OTHER"]),
  referenceNumber: z.string().trim().max(100).optional().nullable(),
  notes: z.string().trim().max(1000).optional().nullable(),
});

export const billingListSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().max(150).optional(),
  status: z.enum(["ALL", "UNPAID", "PARTIALLY_PAID", "PAID"]).default("ALL"),
});

export const printEventSchema = z
  .object({
    documentType: z.enum(["INVOICE", "PAYMENT_RECEIPT"]),
    format: z.enum(["A4", "80MM", "58MM"]),
    paymentNumber: z.string().trim().max(50).optional(),
  })
  .refine(
    (input) => input.documentType !== "PAYMENT_RECEIPT" || input.paymentNumber,
    { message: "Payment number is required for a payment receipt." },
  );
