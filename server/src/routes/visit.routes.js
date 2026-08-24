import { Router } from "express";
import { visitController } from "../controllers/visit.controller.js";
import {
  authenticate,
  requirePermission,
} from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
export const visitRouter = Router();
visitRouter.use(authenticate);
visitRouter.get(
  "/:id",
  requirePermission("VISIT_VIEW"),
  asyncHandler(visitController.get),
);
export const patientVisitRouter = Router();
patientVisitRouter.use(authenticate);
patientVisitRouter.get(
  "/:id/visits",
  requirePermission("VISIT_VIEW"),
  asyncHandler(visitController.list),
);
patientVisitRouter.post(
  "/:id/visits",
  requirePermission("VISIT_CREATE", "REGISTRATION_FEE_COLLECT"),
  asyncHandler(visitController.create),
);
