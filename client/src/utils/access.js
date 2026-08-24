export const hasRole = (user, role) => Boolean(user?.roles?.includes(role));
export const hasPermission = (user, permission) =>
  Boolean(user?.permissions?.includes(permission));
