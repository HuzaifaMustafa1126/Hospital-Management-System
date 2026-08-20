import { Router } from 'express'; import { auditController } from '../controllers/audit.controller.js'; import { authenticate, requirePermission } from '../middleware/auth.middleware.js'; import { asyncHandler } from '../utils/async-handler.js';
export const auditRouter = Router(); auditRouter.get('/', authenticate, requirePermission('AUDIT_LOG_VIEW'), asyncHandler(auditController.list));
