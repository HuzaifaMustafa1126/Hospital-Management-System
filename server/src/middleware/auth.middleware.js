import { authService } from '../services/auth.service.js';
import { AppError } from '../utils/app-error.js';
import { asyncHandler } from '../utils/async-handler.js';
import { verifyAccessToken } from '../utils/jwt.js';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : null;
  if (!token) throw new AppError(401, 'Authentication required');

  try {
    const { sub } = verifyAccessToken(token);
    req.user = await authService.getAuthenticatedUser(sub);
    next();
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(401, 'Invalid or expired token');
  }
});

export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user || !roles.some((role) => req.user.roles.includes(role))) {
    return next(new AppError(403, 'You do not have permission to access this resource'));
  }
  return next();
};

export const requirePermission = (...permissions) => (req, _res, next) => {
  if (!req.user || !permissions.every((permission) => req.user.permissions.includes(permission))) {
    return next(new AppError(403, 'You do not have the required permission'));
  }
  return next();
};
