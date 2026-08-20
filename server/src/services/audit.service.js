import { auditRepository } from '../repositories/audit.repository.js';
export const auditService = { record: (data) => auditRepository.create(data).catch(() => undefined) };
