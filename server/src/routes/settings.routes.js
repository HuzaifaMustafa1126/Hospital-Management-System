import { Router } from 'express';
import { settingsController } from '../controllers/settings.controller.js';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
export const settingsRouter = Router();
settingsRouter.use(authenticate);
settingsRouter.get('/registration-fee', requirePermission('REGISTRATION_FEE_VIEW'), asyncHandler(settingsController.getRegistrationFee));
settingsRouter.put('/registration-fee', requirePermission('REGISTRATION_FEE_UPDATE'), asyncHandler(settingsController.updateRegistrationFee));
