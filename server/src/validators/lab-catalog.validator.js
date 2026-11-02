import { z } from "zod";

const safeInteger = (value, fallback, maximum) => {
  const parsed = /^\d+$/.test(String(value ?? "").trim())
    ? Number.parseInt(value, 10)
    : fallback;
  return Math.max(1, Math.min(parsed, maximum));
};

const pagination = {
  page: z.preprocess(
    (value) => safeInteger(value, 1, 1000000),
    z.number().int().positive(),
  ),
  limit: z.preprocess(
    (value) => safeInteger(value, 20, 100),
    z.number().int().positive(),
  ),
};
const search = z.string().trim().max(150).optional();
const status = z.enum(["active", "inactive", "all"]).default("all");
const optionalId = z.preprocess(
  (value) => (value === undefined || value === "" ? undefined : Number(value)),
  z.number().int().positive().optional(),
);

export const labCatalogIdSchema = z.coerce.number().int().positive();
export const labCategoryListSchema = z.object({
  ...pagination,
  search,
  status,
});
export const labTestListSchema = z.object({
  ...pagination,
  search,
  status,
  categoryId: optionalId,
  orderable: z.enum(["all", "yes", "no"]).default("all"),
});
export const labProfileListSchema = z.object({
  ...pagination,
  search,
  status,
  orderable: z.enum(["all", "yes", "no"]).default("all"),
});
export const labCombinationListSchema = z.object({
  ...pagination,
  search,
  status,
});
export const labPriceListSchema = z.object({
  ...pagination,
  itemType: z.enum(["TEST", "PROFILE", "COMBINATION"]).optional(),
  pricingStatus: z.enum(["PENDING", "CONFIGURED"]).optional(),
  status,
  targetId: optionalId,
});

const code = z
  .string()
  .trim()
  .min(1, "Code is required.")
  .max(50)
  .transform((value) => value.toUpperCase());
const name = z.string().trim().min(1, "Name is required.").max(150);
const activeStatus = z.object({ isActive: z.boolean() }).strict();

export const labCategoryCreateSchema = z
  .object({
    code,
    name,
    sortOrder: z.number().int().nonnegative().max(4294967295).default(0),
    isActive: z.boolean().default(true),
  })
  .strict();
export const labCategoryUpdateSchema = labCategoryCreateSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one category field is required.",
  );
export const labCategoryStatusSchema = activeStatus;

export const labTestCreateSchema = z
  .object({
    categoryId: z.number().int().positive(),
    code,
    name,
    isOrderable: z.boolean().default(true),
    isActive: z.boolean().default(true),
  })
  .strict();
export const labTestUpdateSchema = labTestCreateSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one test field is required.",
  );
export const labTestStatusSchema = activeStatus;

const nullableShortText = (maximum) =>
  z.union([z.string().trim().max(maximum), z.null()]).optional();
export const labParameterCreateSchema = z
  .object({
    code,
    name,
    unit: nullableShortText(50),
    referenceRangeText: nullableShortText(500),
    sortOrder: z.number().int().nonnegative().max(4294967295).default(0),
    isActive: z.boolean().default(true),
  })
  .strict();
export const labParameterUpdateSchema = labParameterCreateSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one parameter field is required.",
  );
export const labParameterStatusSchema = activeStatus;

export const labProfileCreateSchema = z
  .object({
    code,
    name,
    isOrderable: z.boolean().default(true),
    isActive: z.boolean().default(true),
  })
  .strict();
export const labProfileUpdateSchema = labProfileCreateSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one profile field is required.",
  );
export const labProfileStatusSchema = activeStatus;
export const labProfileTestsSchema = z
  .object({
    testIds: z
      .array(z.number().int().positive())
      .max(500)
      .superRefine((ids, context) => {
        if (new Set(ids).size !== ids.length)
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Duplicate test IDs are not allowed.",
          });
      }),
  })
  .strict();

export const labCombinationCreateSchema = z
  .object({
    code,
    name,
    isActive: z.boolean().default(true),
  })
  .strict();
export const labCombinationUpdateSchema = labCombinationCreateSchema
  .partial()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one combination field is required.",
  );
export const labCombinationStatusSchema = activeStatus;
const combinationItemSchema = z
  .object({
    itemType: z.enum(["TEST", "PROFILE"]),
    targetId: z.number().int().positive(),
  })
  .strict();
export const labCombinationItemsSchema = z
  .object({
    items: z
      .array(combinationItemSchema)
      .max(500)
      .superRefine((items, context) => {
        const keys = items.map((item) => `${item.itemType}:${item.targetId}`);
        if (new Set(keys).size !== keys.length)
          context.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Duplicate combination members are not allowed.",
          });
      }),
  })
  .strict();

const validLocalDateTime = (value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})$/.exec(
    value,
  );
  if (!match) return false;
  const parts = match.slice(1).map(Number);
  const date = new Date(
    Date.UTC(parts[0], parts[1] - 1, parts[2], parts[3], parts[4], parts[5]),
  );
  return (
    date.getUTCFullYear() === parts[0] &&
    date.getUTCMonth() === parts[1] - 1 &&
    date.getUTCDate() === parts[2] &&
    date.getUTCHours() === parts[3] &&
    date.getUTCMinutes() === parts[4] &&
    date.getUTCSeconds() === parts[5]
  );
};
const localDateTime = z
  .string()
  .trim()
  .refine(
    validLocalDateTime,
    "Use a valid database-local datetime in YYYY-MM-DDTHH:mm:ss format.",
  )
  .transform((value) => value.replace("T", " "));
const money = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine(
    (value) => /^\d{1,10}(\.\d{1,2})?$/.test(value),
    "Price amount must be a non-negative value with no more than two decimal places.",
  )
  .transform((value) => {
    const [whole, fraction = ""] = value.split(".");
    return `${whole}.${fraction.padEnd(2, "0")}`;
  });
const priceFields = {
  itemType: z.enum(["TEST", "PROFILE", "COMBINATION"]),
  targetId: z.number().int().positive(),
  priceAmount: z.union([money, z.null()]).optional(),
  currency: z.literal("PKR").default("PKR"),
  pricingStatus: z.enum(["PENDING", "CONFIGURED"]),
  effectiveFrom: localDateTime,
  effectiveTo: z.union([localDateTime, z.null()]).optional(),
  isActive: z.boolean().default(true),
};
const validatePriceStatus = (
  value,
  context,
  requireConfiguredAmount = false,
) => {
  if (
    value.pricingStatus === "PENDING" &&
    value.priceAmount !== undefined &&
    value.priceAmount !== null
  )
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["priceAmount"],
      message: "Pending prices must have a null amount.",
    });
  if (
    value.pricingStatus === "CONFIGURED" &&
    requireConfiguredAmount &&
    (value.priceAmount === undefined || value.priceAmount === null)
  )
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["priceAmount"],
      message: "Configured prices require an amount.",
    });
  if (
    value.effectiveFrom &&
    value.effectiveTo &&
    value.effectiveTo <= value.effectiveFrom
  )
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["effectiveTo"],
      message: "Effective-to must be later than effective-from.",
    });
};
export const labPriceCreateSchema = z
  .object(priceFields)
  .strict()
  .superRefine((value, context) => validatePriceStatus(value, context, true));
export const labPriceReplacementSchema = z
  .object({
    itemType: z.enum(["TEST", "PROFILE", "COMBINATION"]),
    targetId: z.number().int().positive(),
    priceAmount: z.union([money, z.null()]),
    currency: z.literal("PKR").default("PKR"),
    pricingStatus: z.enum(["PENDING", "CONFIGURED"]),
    effectiveFrom: localDateTime,
  })
  .strict()
  .superRefine((value, context) => validatePriceStatus(value, context, true));
export const labPriceUpdateSchema = z
  .object(priceFields)
  .partial()
  .strict()
  .refine(
    (value) => Object.keys(value).length > 0,
    "At least one price field is required.",
  )
  .superRefine((value, context) => validatePriceStatus(value, context, false));
export const labPriceStatusSchema = activeStatus;
export const labEffectivePriceSchema = z
  .object({
    itemType: z.enum(["TEST", "PROFILE", "COMBINATION"]),
    targetId: z.coerce.number().int().positive(),
    effectiveAt: localDateTime.optional(),
  })
  .strict();
