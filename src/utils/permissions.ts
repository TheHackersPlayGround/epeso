// Permission helper.
// Reads the logged-in user (with permissions) that App.tsx stores in localStorage
// after /auth/login or /auth/me, and answers whether the current user may manage
// (add / edit / delete) a given dashboard module.
//
// Permission names arrive as 'view-<module>' / 'manage-<module>'. A user can manage
// a module when they are an Administrator or hold 'manage-<module>'.

interface StoredUser {
  role?: string
  permissions?: string[]
}

function currentUser(): StoredUser {
  try {
    return JSON.parse(localStorage.getItem('peso_current_user') || '{}') as StoredUser
  } catch {
    return {}
  }
}

export type ModuleKey =
  | 'employment' | 'cdsp' | 'gip' | 'spes' | 'livelihood'
  | 'skills' | 'ofw' | 'documents' | 'maintenance' | 'security' | 'report'

// True if the current user may add/edit/delete in this module (Editor or Administrator).
export function canManage(module: ModuleKey): boolean {
  const u = currentUser()
  if (u.role === 'Administrator') return true
  return Array.isArray(u.permissions) && u.permissions.includes(`manage-${module}`)
}

// True if the current user may at least view this module.
export function canView(module: ModuleKey): boolean {
  const u = currentUser()
  if (u.role === 'Administrator') return true
  return Array.isArray(u.permissions) &&
    (u.permissions.includes(`manage-${module}`) || u.permissions.includes(`view-${module}`))
}
