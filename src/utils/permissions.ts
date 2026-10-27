// Permission helper: reads the logged-in user App.tsx stores in localStorage and
// answers whether they may manage/view a module ('manage-<module>' / 'view-<module>').

export interface StoredUser {
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
  | 'cdsp-maintenance' | 'spes-maintenance' | 'gip-maintenance'
  | 'livelihood-maintenance' | 'skills-maintenance'

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

// Every module an account can be granted access to, in the same order (and
// Records/Maintenance split) the Profile and Add/Edit User screens show them.
export const ALL_MODULE_KEYS: ModuleKey[] = [
  'employment',
  'cdsp', 'cdsp-maintenance',
  'gip', 'gip-maintenance',
  'spes', 'spes-maintenance',
  'livelihood', 'livelihood-maintenance',
  'skills', 'skills-maintenance',
  'ofw', 'documents', 'security', 'report',
]

export const MODULE_LABELS: Record<ModuleKey, string> = {
  employment:               'Employment Facilitation',
  cdsp:                     'CDSP Records',
  'cdsp-maintenance':       'CDSP Maintenance',
  gip:                      'GIP Records',
  'gip-maintenance':        'GIP Maintenance',
  spes:                     'SPES Records',
  'spes-maintenance':       'SPES Maintenance',
  livelihood:               'Livelihood Records',
  'livelihood-maintenance': 'Livelihood Maintenance',
  skills:                   'Skills Training Records',
  'skills-maintenance':     'Skills Training Maintenance',
  ofw:                      'OFW',
  documents:                'Documents',
  maintenance:              'Maintenance',
  security:                 'Security',
  report:                   'Report',
}

export type PermissionLevel = 'Full Access' | 'Editor' | 'Viewer' | 'No Access'

function levelFor(u: StoredUser, module: ModuleKey): PermissionLevel {
  if (u.role === 'Administrator') return 'Full Access'
  const list = u.permissions ?? []
  if (list.includes(`manage-${module}`)) return 'Editor'
  if (list.includes(`view-${module}`)) return 'Viewer'
  return 'No Access'
}

export type PermissionChange = { module: ModuleKey; label: string; from: PermissionLevel; to: PermissionLevel }

// Compares two {role, permissions} snapshots module-by-module and returns only
// the ones that changed, so a user can be told exactly what an admin changed.
export function diffPermissionLevels(before: StoredUser, after: StoredUser): PermissionChange[] {
  const changes: PermissionChange[] = []
  for (const module of ALL_MODULE_KEYS) {
    const from = levelFor(before, module)
    const to = levelFor(after, module)
    if (from !== to) changes.push({ module, label: MODULE_LABELS[module], from, to })
  }
  return changes
}
