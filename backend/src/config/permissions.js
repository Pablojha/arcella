/**
 * Site-wide staff roles, lowest first; each one has every permission of the roles before it. Hiring and running a firm
 * page are not site roles: they belong to a firm's owner and admins and a job's poster (see jobs.controller.js).
 */
export const ROLES = ['user', 'support', 'moderator', 'admin', 'super_admin'];

const GRANTS = {
  support: ['admin:access', 'users:read', 'reports:read', 'stats:read', 'support:read', 'support:answer'],
  moderator: ['reports:resolve', 'users:suspend', 'jobs:moderate'],
  admin: ['users:verify', 'users:ban', 'colleges:manage', 'firms:moderate', 'audit:read'],
  super_admin: ['roles:manage'],
};

export const PERMISSIONS = Object.fromEntries(ROLES.map((role, index) => [role, ROLES.slice(1, index + 1).flatMap((each) => GRANTS[each])]));

export const rankOf = (role) => Math.max(0, ROLES.indexOf(role ?? 'user'));

export const hasPermission = (user, permission) => Boolean(user && PERMISSIONS[user.role ?? 'user']?.includes(permission));

/** Site admins in the older sense (`isAdmin`), which most ownership checks use. */
export const isAdminRole = (role) => rankOf(role) >= rankOf('admin');
