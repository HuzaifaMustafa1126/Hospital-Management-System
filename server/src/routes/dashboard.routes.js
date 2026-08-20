import { Router } from 'express';
import { dashboardController } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';
import { asyncHandler } from '../utils/async-handler.js';
export const dashboardRouter = Router(); dashboardRouter.use(authenticate); dashboardRouter.get('/summary', asyncHandler(dashboardController.summary));
