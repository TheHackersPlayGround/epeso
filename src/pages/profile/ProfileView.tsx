import { ArrowLeft, LogOut, User } from 'lucide-react'

interface ProfileUser {
  id: number
  firstName: string
  lastName: string
  username: string
  email: string
  role: string
  status: string
  lastLogin: string
  permissions: string[]
}

interface ProfileViewProps {
  onBack: () => void
  onLogout: () => void
}

const DEFAULT_USER: ProfileUser = {
  id: 1,
  firstName: 'Vicky',
  lastName: 'Administrator',
  username: 'admin',
  email: 'admin@peso.gov.ph',
  role: 'Administrator',
  status: 'Active',
  lastLogin: new Date().toLocaleString(),
  permissions: [],
}

function getCurrentUser(): ProfileUser {
  try {
    const stored = localStorage.getItem('peso_current_user')
    if (stored) return JSON.parse(stored) as ProfileUser
  } catch { /* */ }
  return DEFAULT_USER
}

const PERMISSION_GROUPS = [
  { title: 'APPLICANT MANAGEMENT',       viewPerm: 'view-applicants',    editorPerms: ['add-applicant', 'edit-applicant', 'delete-applicant'] },
  { title: 'EMPLOYER MANAGEMENT',        viewPerm: 'view-employers',     editorPerms: ['add-employer', 'edit-employer', 'delete-employer'] },
  { title: 'PROGRAM / EVENTS MANAGEMENT', viewPerm: 'view-programs',     editorPerms: ['add-program', 'edit-program', 'delete-program'] },
  { title: 'MAINTENANCE',                viewPerm: 'access-maintenance', editorPerms: ['add-records', 'edit-records', 'delete-records'] },
  { title: 'ACTIVITY LOG',               viewPerm: 'view-activity-log',  editorPerms: ['export-activity-log'] },
  { title: 'REPORTS',                    viewPerm: 'view-reports',       editorPerms: ['generate-reports', 'export-reports'] },
  { title: 'USER MANAGEMENT',            viewPerm: 'view-users',         editorPerms: ['add-user', 'edit-user', 'delete-user', 'assign-permissions'] },
  { title: 'SYSTEM SETTINGS',            viewPerm: 'view-settings',      editorPerms: ['edit-settings', 'backup-restore'] },
]

type AccessLevel = 'Full Access' | 'Editor' | 'Viewer' | 'No Access'

function getAccessLevel(
  perms: string[],
  group: (typeof PERMISSION_GROUPS)[0],
  isAdmin: boolean
): AccessLevel {
  if (isAdmin) return 'Full Access'
  const hasEditor = group.editorPerms.some((p) => perms.includes(p))
  if (hasEditor) return 'Editor'
  if (perms.includes(group.viewPerm)) return 'Viewer'
  return 'No Access'
}

function AccessBadge({ level }: { level: AccessLevel }) {
  const styles: Record<AccessLevel, string> = {
    'Full Access': 'bg-[#0077BE] text-white',
    'Editor':      'bg-green-100 text-green-700 border border-green-200',
    'Viewer':      'bg-gray-100 text-gray-600 border border-gray-200',
    'No Access':   'bg-red-50 text-red-500 border border-red-100',
  }
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[level]}`}>
      {level}
    </span>
  )
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || '—'}</p>
    </div>
  )
}

export default function ProfileView({ onBack, onLogout }: ProfileViewProps) {
  const user = getCurrentUser()
  const isAdmin = user.role === 'Administrator'
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
  const fullName = `${user.firstName} ${user.lastName}`

  return (
    <div className="bg-gray-50 flex flex-col" style={{ minHeight: 'calc(100vh - 72px)' }}>
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#0077BE] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto py-8 px-8">
        <div className="max-w-3xl mx-auto flex flex-col gap-5">

          {/* Profile header card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="h-2 bg-[#0077BE]" />
            <div className="px-10 py-8 flex flex-col items-center text-center">
              <div
                className="w-24 h-24 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-md mb-4"
                style={{ background: '#0077BE' }}
              >
                {initials || <User size={36} />}
              </div>
              <p className="text-2xl font-bold mb-1" style={{ color: '#111827' }}>{fullName}</p>
              <p className="text-sm text-gray-400 mb-4">@{user.username}</p>
              <div className="flex items-center gap-2 flex-wrap justify-center">
                <span className="px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ background: '#0077BE' }}>
                  {user.role}
                </span>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    user.status === 'Active'
                      ? 'bg-green-100 text-green-700 border border-green-200'
                      : 'bg-gray-100 text-gray-500 border border-gray-200'
                  }`}
                >
                  {user.status}
                </span>
              </div>
            </div>
          </div>

          {/* Basic Information card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 rounded-full" style={{ background: '#0077BE' }} />
              <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#0077BE' }}>
                Basic Information
              </p>
            </div>
            <div className="grid grid-cols-3 gap-x-8 gap-y-5">
              <InfoField label="First Name" value={user.firstName} />
              <InfoField label="Last Name"  value={user.lastName} />
              <InfoField label="Username"   value={user.username} />
              <InfoField label="Email"      value={user.email} />
              <InfoField label="Role"       value={user.role} />
              <InfoField label="Status"     value={user.status} />
              <div className="col-span-3">
                <InfoField label="Last Login" value={user.lastLogin} />
              </div>
            </div>
          </div>

          {/* Access Control & Permissions card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 rounded-full" style={{ background: '#0077BE' }} />
              <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#0077BE' }}>
                Access Control &amp; Permissions
              </p>
            </div>
            <div className="grid grid-cols-2 gap-x-8">
              {PERMISSION_GROUPS.map((group) => {
                const level = getAccessLevel(user.permissions, group, isAdmin)
                return (
                  <div key={group.title} className="flex items-center justify-between py-3 border-b border-gray-50">
                    <p className="text-xs font-semibold text-gray-500 tracking-wide">{group.title}</p>
                    <AccessBadge level={level} />
                  </div>
                )
              })}
            </div>
          </div>

          {/* Logout button */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-8 py-5">
            <button
              onClick={onLogout}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold transition-colors bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
            >
              <LogOut size={16} />
              Logout
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}
