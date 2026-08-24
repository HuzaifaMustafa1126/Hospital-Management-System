import { Router } from "express";
import { billingController } from "../controllers/billing.controller.js";
import {
  authenticate,
  requirePermission,
} from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
export const billingRouter = Router();
billingRouter.use(authenticate);
billingRouter.get(
  "/",
  requirePermission("BILL_VIEW"),
  asyncHandler(billingController.list),
);
billingRouter.get(
  "/visit/:visitId",
  requirePermission("BILL_VIEW"),
  asyncHandler(billingController.byVisit),
);
billingRouter.get(
  "/:id/print",
  requirePermission("BILL_VIEW", "BILL_PRINT"),
  asyncHandler(billingController.printable),
);
billingRouter.get(
  "/:id/payments/:paymentNumber/print",
  requirePermission("BILL_VIEW", "BILL_PRINT"),
  asyncHandler(billingController.paymentReceipt),
);
billingRouter.post(
  "/:id/print-events",
  requirePermission("BILL_VIEW", "BILL_PRINT"),
  asyncHandler(billingController.recordPrint),
);
billingRouter.get(
  "/:id",
  requirePermission("BILL_VIEW"),
  asyncHandler(billingController.get),
);
billingRouter.post(
  "/:id/payments",
  requirePermission("BILL_VIEW", "PAYMENT_CREATE"),
  asyncHandler(billingController.addPayment),
);
