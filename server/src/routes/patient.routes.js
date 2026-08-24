import { Router } from "express";
import { patientController } from "../controllers/patient.controller.js";
import {
  authenticate,
  requirePermission,
} from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
import { AppError } from "../utils/app-error.js";
import { patientVisitRouter } from "./visit.routes.js";
const onlySuperAdminCanUpdate = (req, _res, next) =>
  req.user?.roles.includes("SUPER_ADMIN") &&
  req.user.permissions.includes("PATIENT_UPDATE")
    ? next()
    : next(new AppError(403, "Only Super Admin can edit patient registration"));
export const patientRouter = Router();
patientRouter.use(authenticate);
patientRouter.use("/", patientVisitRouter);
patientRouter.post(
  "/",
  requirePermission("PATIENT_CREATE", "REGISTRATION_FEE_COLLECT"),
  asyncHandler(patientController.create),
);
patientRouter.get(
  "/search",
  requirePermission("PATIENT_SEARCH"),
  asyncHandler(patientController.search),
);
patientRouter.get(
  "/check-cnic",
  requirePermission("PATIENT_CREATE"),
  asyncHandler(patientController.checkCnic),
);
patientRouter.get(
  "/check-phone",
  requirePermission("PATIENT_CREATE"),
  asyncHandler(patientController.checkPhone),
);
patientRouter.get(
  "/",
  requirePermission("PATIENT_VIEW"),
  asyncHandler(patientController.list),
);
patientRouter.get(
  "/:id",
  requirePermission("PATIENT_VIEW"),
  asyncHandler(patientController.get),
);
patientRouter.put(
  "/:id",
  onlySuperAdminCanUpdate,
  asyncHandler(patientController.update),
);
patientRouter.delete(
  "/:id",
  requirePermission("PATIENT_DELETE"),
  asyncHandler(patientController.remove),
);
