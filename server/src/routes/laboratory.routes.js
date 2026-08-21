import { Router } from "express";
import { laboratoryController } from "../controllers/laboratory.controller.js";
import { authenticate, requireRole } from "../middleware/auth.middleware.js";
import { asyncHandler } from "../utils/async-handler.js";
export const laboratoryRouter=Router(); laboratoryRouter.use(authenticate,requireRole("LAB_ATTENDANT","SUPER_ADMIN")); laboratoryRouter.get("/patients",asyncHandler(laboratoryController.search)); laboratoryRouter.get("/patients/:id",asyncHandler(laboratoryController.getPatient)); laboratoryRouter.get("/services",asyncHandler(laboratoryController.services)); laboratoryRouter.post("/patients/:patientId/services",asyncHandler(laboratoryController.addService));
