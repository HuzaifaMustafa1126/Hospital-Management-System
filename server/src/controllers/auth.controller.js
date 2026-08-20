import { auditService } from '../services/audit.service.js';
import { authService } from '../services/auth.service.js';
import { loginSchema } from '../validators/auth.validator.js';

const auditContext = (req) => ({ ipAddress: req.ip, userAgent: req.get('user-agent') });

export const authController = {
  async login(req, res) {
    const { email, password } = loginSchema.parse(req.body);
    const result = await authService.login(email, password);
    await auditService.record({ userId: result.user.id, action: 'LOGIN', entity: 'AUTH', entityId: result.user.id, ...auditContext(req) });
    res.json({ success: true, message: 'Login successful', data: result });
  },

  async me(req, res) {
    res.json({ success: true, message: 'Authenticated user retrieved', data: req.user });
  },

  async logout(req, res) {
    await auditService.record({ userId: req.user.id, action: 'LOGOUT', entity: 'AUTH', entityId: req.user.id, ...auditContext(req) });
    res.json({ success: true, message: 'Logout successful', data: {} });
  },
};
