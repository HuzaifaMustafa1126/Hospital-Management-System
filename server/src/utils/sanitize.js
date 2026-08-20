export const withoutPassword = ({ passwordHash: _passwordHash, ...user }) => user;
export const sanitizeAuditData = (data) => { if (!data || typeof data !== 'object') return data; const safe = { ...data }; delete safe.password; delete safe.passwordHash; return safe; };
