import { Router } from "express";
import { surgeryController } from "../controllers/surgery.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
export const surgeryRouter = Router();
surgeryRouter.use(
  authenticate,
  requireRole("SURGERY_ATTENDANT", "SUPER_ADMIN"),
);
surgeryRouter.get("/", asyncHandler(surgeryController.overview));
