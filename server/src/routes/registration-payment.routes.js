import { Router } from 'express';
import { registrationPaymentController } from '../controllers/registration-payment.controller.js';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
export const registrationPaymentRouter = Router();
registrationPaymentRouter.use(authenticate);
registrationPaymentRouter.get('/', requirePermission('REGISTRATION_FEE_RECEIPT_VIEW'), asyncHandler(registrationPaymentController.list));
registrationPaymentRouter.get('/:id', requirePermission('REGISTRATION_FEE_RECEIPT_VIEW'), asyncHandler(registrationPaymentController.get));
