import { Router } from 'express';
import { doctorController } from '../controllers/doctor.controller.js';
import { authenticate, requirePermission, requireRole } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
export const doctorRouter = Router();
doctorRouter.use(authenticate);
doctorRouter.get('/', requirePermission('PATIENT_VIEW'), asyncHandler(doctorController.list)); doctorRouter.get('/:id', requirePermission('PATIENT_VIEW'), asyncHandler(doctorController.get));
doctorRouter.post('/', requireRole('SUPER_ADMIN'), asyncHandler(doctorController.create)); doctorRouter.put('/:id', requireRole('SUPER_ADMIN'), asyncHandler(doctorController.update)); doctorRouter.patch('/:id/status', requireRole('SUPER_ADMIN'), asyncHandler(doctorController.status));
