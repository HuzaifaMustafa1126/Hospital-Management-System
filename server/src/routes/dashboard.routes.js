import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { authenticate, requirePermission } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
export const dashboardRouter = Router(); dashboardRouter.use(authenticate); dashboardRouter.get('/summary', asyncHandler(dashboardController.summary)); dashboardRouter.get('/financial', requirePermission('REVENUE_VIEW'), asyncHandler(dashboardController.financial));
