import bcrypt from 'bcrypt';
import { database } from '../db/database.js';
import { AppError } from '../utils/app-error.js';
import { createAccessToken } from '../utils/jwt.js';

const userQuery = `
  SELECT u.id, u.first_name AS firstName, u.last_name AS lastName, u.email, u.phone,
         u.password_hash AS passwordHash, u.is_active AS isActive,
         u.created_at AS createdAt, u.updated_at AS updatedAt,
         r.name AS roleName, p.name AS permissionName
  FROM users u
  LEFT JOIN user_roles ur ON ur.user_id = u.id
  LEFT JOIN roles r ON r.id = ur.role_id
  LEFT JOIN role_permissions rp ON rp.role_id = r.id
  LEFT JOIN permissions p ON p.id = rp.permission_id`;

const presentUser = (rows) => {
  if (!rows.length) return null;
  const first = rows[0];
  return {
    id: first.id,
    firstName: first.firstName,
    lastName: first.lastName,
    email: first.email,
    phone: first.phone,
    isActive: Boolean(first.isActive),
    createdAt: first.createdAt,
    updatedAt: first.updatedAt,
    roles: [...new Set(rows.map((row) => row.roleName).filter(Boolean))],
    permissions: [...new Set(rows.map((row) => row.permissionName).filter(Boolean))],
  };
};

const findUser = async (column, value) => {
  const [rows] = await database.execute(`${userQuery} WHERE ${column} = ?`, [value]);
  return { user: presentUser(rows), passwordHash: rows[0]?.passwordHash };
};

export const authService = {
  async login(email, password) {
    const { user, passwordHash } = await findUser('u.email', email.toLowerCase());
    if (!user || !user.isActive || !(await bcrypt.compare(password, passwordHash))) {
      throw new AppError(401, 'Invalid email or password');
    }
    return { user, role: user.roles[0] ?? null, token: createAccessToken(user.id) };
  },

  async getAuthenticatedUser(id) {
    const { user } = await findUser('u.id', id);
    if (!user || !user.isActive) throw new AppError(401, 'Authentication required');
    return user;
  },
};
