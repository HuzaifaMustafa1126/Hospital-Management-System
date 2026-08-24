import { Router } from "express";
import { bloodBankController } from "../controllers/blood-bank.controller.js";
import { authenticate, requireRole, requirePermission } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";

export const bloodBankRouter = Router();
bloodBankRouter.use(authenticate, requireRole("BLOOD_BANK_STAFF", "SUPER_ADMIN"));
bloodBankRouter.get("/", requirePermission("BLOOD_BANK_VIEW"), asyncHandler(bloodBankController.overview));
bloodBankRouter.get("/patients", requirePermission("BLOOD_BANK_PATIENT_SEARCH"), asyncHandler(bloodBankController.search));
bloodBankRouter.get("/patients/:id", requirePermission("BLOOD_BANK_SERVICE_VIEW"), asyncHandler(bloodBankController.getPatient));
bloodBankRouter.get("/services", requirePermission("BLOOD_BANK_SERVICE_VIEW"), asyncHandler(bloodBankController.services));
bloodBankRouter.get("/visits/:visitId/services", requirePermission("BLOOD_BANK_SERVICE_VIEW"), asyncHandler(bloodBankController.visitServices));
bloodBankRouter.post("/visits/:visitId/services", requirePermission("BLOOD_BANK_SERVICE_ADD"), asyncHandler(bloodBankController.addService));
