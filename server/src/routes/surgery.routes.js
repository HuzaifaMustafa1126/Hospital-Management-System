import { Router } from "express";
import { surgeryController } from "../controllers/surgery.controller.js";
import { authenticate, requireRole, requirePermission } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
export const surgeryRouter = Router();
surgeryRouter.use(
  authenticate,
  requireRole("SURGERY_ATTENDANT", "SUPER_ADMIN"),
);
surgeryRouter.get("/", asyncHandler(surgeryController.overview));
surgeryRouter.get("/patients", requirePermission("SURGERY_PATIENT_SEARCH"), asyncHandler(surgeryController.search));
surgeryRouter.get("/patients/:id", requirePermission("SURGERY_SERVICE_VIEW"), asyncHandler(surgeryController.getPatient));
surgeryRouter.get("/patients/:id/services", requirePermission("SURGERY_SERVICE_VIEW"), asyncHandler(surgeryController.patientServices));
surgeryRouter.get("/services", requirePermission("SURGERY_SERVICE_VIEW"), asyncHandler(surgeryController.services));
surgeryRouter.post("/patients/:patientId/services", requirePermission("SURGERY_SERVICE_ADD"), asyncHandler(surgeryController.addService));
