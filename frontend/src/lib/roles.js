// Single source of truth for roles, home screens and path permissions.
// A role is NEVER guessed: anything not listed here resolves to null and must be handled as an error.

export const ROLE_HOME = {
  user: '/',
  staff: '/staff',
  shop_admin: '/shop-admin',
  super_admin: '/admin',
}

// Every spelling the database or older code may use, mapped to one canonical role.
const ROLE_ALIASES = {
  user: 'user',
  customer: 'user',
  student: 'user',
  staff: 'staff',
  shop_staff: 'staff',
  shop_admin: 'shop_admin',
  owner: 'shop_admin',
  super_admin: 'super_admin',
  superadmin: 'super_admin',
  admin: 'super_admin',
}

export function normalizeRole(raw) {
  if (typeof raw !== 'string') return null
  return ROLE_ALIASES[raw.trim().toLowerCase()] || null
}

function cleanPath(pathname) {
  return (String(pathname || '/').toLowerCase().replace(/\/+$/, '')) || '/'
}

function underPrefix(path, prefix) {
  return path === prefix || path.startsWith(prefix + '/')
}

// True when the role may be on this path. User paths are everything outside the three operator areas.
export function pathAllowedFor(role, pathname) {
  const p = cleanPath(pathname)
  switch (role) {
    case 'staff':
      return underPrefix(p, '/staff')
    case 'shop_admin':
      return underPrefix(p, '/shop-admin')
    case 'super_admin':
      return underPrefix(p, '/admin')
    case 'user':
      return !(underPrefix(p, '/staff') || underPrefix(p, '/shop-admin') || underPrefix(p, '/admin'))
    default:
      return false
  }
}
