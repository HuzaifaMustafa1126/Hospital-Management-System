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
  requirePermission("PATIENT_VIEW"),
  asyncHandler(visitController.get),
);
export const patientVisitRouter = Router();
patientVisitRouter.use(authenticate, requirePermission("PATIENT_VIEW"));
patientVisitRouter.get("/:id/visits", asyncHandler(visitController.list));
patientVisitRouter.post(
  "/:id/visits",
  requirePermission("PATIENT_CREATE"),
  asyncHandler(visitController.create),
);
