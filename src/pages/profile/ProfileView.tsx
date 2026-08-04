import { useState, useRef } from 'react'
import { ArrowLeft, LogOut, User, Pencil, Minus, Check, X } from 'lucide-react'
import { updateUser } from '../../services/userService'
import ConfirmModal from '../shared/ConfirmModal'

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
  onNameChange?: (firstName: string) => void
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

const PHOTO_LS_KEY = 'peso_profile_photo'

interface PermissionSection {
  label: string | null
  viewPerm: string
  editorPerms: string[]
}
interface PermissionGroupDef {
  title: string
  sections: PermissionSection[]
}

// Programs with their own "Maintenance" screen (batches/activities/projects)
// show two independent sections -- Records (applicant/profile access) and
// Maintenance (batch/activity/project management) -- matching the Add/Edit
// User screen in Security. Everything else keeps a single section.
const PERMISSION_GROUPS: PermissionGroupDef[] = [
  { title: 'EMPLOYMENT FACILITATION', sections: [
    { label: null, viewPerm: 'view-employment', editorPerms: ['manage-employment'] },
  ] },
  { title: 'CDSP', sections: [
    { label: 'Records',     viewPerm: 'view-cdsp',               editorPerms: ['manage-cdsp'] },
    { label: 'Maintenance', viewPerm: 'view-cdsp-maintenance',   editorPerms: ['manage-cdsp-maintenance'] },
  ] },
  { title: 'GIP', sections: [
    { label: 'Records',     viewPerm: 'view-gip',                editorPerms: ['manage-gip'] },
    { label: 'Maintenance', viewPerm: 'view-gip-maintenance',    editorPerms: ['manage-gip-maintenance'] },
  ] },
  { title: 'SPES', sections: [
    { label: 'Records',     viewPerm: 'view-spes',               editorPerms: ['manage-spes'] },
    { label: 'Maintenance', viewPerm: 'view-spes-maintenance',   editorPerms: ['manage-spes-maintenance'] },
  ] },
  { title: 'LIVELIHOOD', sections: [
    { label: 'Records',     viewPerm: 'view-livelihood',             editorPerms: ['manage-livelihood'] },
    { label: 'Maintenance', viewPerm: 'view-livelihood-maintenance', editorPerms: ['manage-livelihood-maintenance'] },
  ] },
  { title: 'SKILLS TRAINING', sections: [
    { label: 'Records',     viewPerm: 'view-skills',             editorPerms: ['manage-skills'] },
    { label: 'Maintenance', viewPerm: 'view-skills-maintenance', editorPerms: ['manage-skills-maintenance'] },
  ] },
  { title: 'OFW', sections: [
    { label: null, viewPerm: 'view-ofw', editorPerms: ['manage-ofw'] },
  ] },
  { title: 'DOCUMENTS', sections: [
    { label: null, viewPerm: 'view-documents', editorPerms: ['manage-documents'] },
  ] },
  { title: 'SECURITY', sections: [
    { label: null, viewPerm: 'view-security', editorPerms: ['manage-security'] },
  ] },
  { title: 'REPORT', sections: [
    { label: null, viewPerm: 'view-report', editorPerms: ['manage-report'] },
  ] },
]

type AccessLevel = 'Full Access' | 'Editor' | 'Viewer' | 'No Access'

function getAccessLevel(perms: string[], section: PermissionSection, isAdmin: boolean): AccessLevel {
  if (isAdmin) return 'Full Access'
  const list = perms ?? []
  if (section.editorPerms.some((p) => list.includes(p))) return 'Editor'
  if (list.includes(section.viewPerm)) return 'Viewer'
  return 'No Access'
}

function AccessBadge({ level }: { level: AccessLevel }) {
  const styles: Record<AccessLevel, string> = {
    'Full Access': 'bg-[#0077BE] text-white',
    'Editor':      'bg-green-100 text-green-700 border border-green-200',
    'Viewer':      'bg-gray-100 text-gray-600 border border-gray-200',
    'No Access':   'bg-red-50 text-red-500 border border-red-100',
  }
  return <span className={`px-3 py-1 rounded-full text-xs font-medium ${styles[level]}`}>{level}</span>
}

function InfoField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value || '—'}</p>
    </div>
  )
}

function EditField({
  label, value, onChange, type = 'text',
  options,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  options?: string[]
}) {
  return (
    <div>
      <p className="text-xs text-gray-400 uppercase tracking-wide mb-1.5">{label}</p>
      {options ? (
        <select
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#0077BE]"
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-800 focus:outline-none focus:border-[#0077BE]"
        />
      )}
    </div>
  )
}

export default function ProfileView({ onBack, onLogout, onNameChange }: ProfileViewProps) {
  const [user, setUser] = useState<ProfileUser>(getCurrentUser)
  const [saveError, setSaveError] = useState(false)
  const isAdmin = user.role === 'Administrator'
  const initials = `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`.toUpperCase()
  const fullName = `${user.firstName} ${user.lastName}`

  // Photo state
  const [photo, setPhoto] = useState<string | null>(() => {
    try { return localStorage.getItem(PHOTO_LS_KEY) } catch { return null }
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result as string
      setPhoto(dataUrl)
      try { localStorage.setItem(PHOTO_LS_KEY, dataUrl) } catch { /* quota */ }
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  function handleRemovePhoto() {
    setPhoto(null)
    try { localStorage.removeItem(PHOTO_LS_KEY) } catch { /* */ }
  }

  // Edit mode
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<ProfileUser>(user)

  function startEdit() {
    setDraft({ ...user })
    setIsEditing(true)
  }

  async function saveEdit() {
    try {
      await updateUser(draft.id, {
        firstName: draft.firstName,
        lastName: draft.lastName,
        username: draft.username,
        role: draft.role,
        status: draft.status,
        permissions: draft.permissions ?? [],
      })
      setUser(draft)
      try { localStorage.setItem('peso_current_user', JSON.stringify(draft)) } catch { /* quota */ }
      onNameChange?.(draft.firstName)
      setIsEditing(false)
    } catch {
      setSaveError(true)
    }
  }

  function cancelEdit() {
    setIsEditing(false)
  }

  function field(key: keyof ProfileUser) {
    return (draft[key] as string) ?? ''
  }

  return (
    <>
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

              {/* Avatar with photo controls */}
              <div className="relative mb-4 group">
                <div
                  className="w-24 h-24 rounded-full overflow-hidden flex items-center justify-center text-white text-3xl font-bold shadow-md"
                  style={{ background: '#0077BE' }}
                >
                  {photo
                    ? <img src={photo} alt="Profile" className="w-full h-full object-cover" />
                    : (initials || <User size={36} />)
                  }
                </div>

                {/* Pencil when no photo, Minus when photo exists */}
                {photo ? (
                  <button
                    onClick={handleRemovePhoto}
                    title="Remove photo"
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-red-500 text-white flex items-center justify-center shadow border-2 border-white hover:bg-red-600 transition-colors"
                  >
                    <Minus size={12} />
                  </button>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    title="Change photo"
                    className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-[#0077BE] text-white flex items-center justify-center shadow border-2 border-white hover:bg-[#005f9e] transition-colors"
                  >
                    <Pencil size={12} />
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoChange}
                />
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
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 rounded-full" style={{ background: '#0077BE' }} />
                <p className="text-sm font-semibold uppercase tracking-widest" style={{ color: '#0077BE' }}>
                  Basic Information
                </p>
              </div>

              {/* Edit / Save / Cancel — admin only */}
              {isAdmin && (
                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <>
                      <button
                        onClick={saveEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#0077BE] text-white hover:bg-[#005f9e] transition-colors"
                      >
                        <Check size={13} />
                        Save
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                      >
                        <X size={13} />
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={startEdit}
                      className="px-5 py-2 rounded-lg text-sm font-semibold border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Edit
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-x-8 gap-y-5">
              {isEditing ? (
                <>
                  <EditField label="First Name" value={field('firstName')} onChange={v => setDraft(d => ({ ...d, firstName: v }))} />
                  <EditField label="Last Name"  value={field('lastName')}  onChange={v => setDraft(d => ({ ...d, lastName: v }))} />
                  <EditField label="Username"   value={field('username')}  onChange={v => setDraft(d => ({ ...d, username: v }))} />
                  <EditField label="Role"       value={field('role')}      onChange={v => setDraft(d => ({ ...d, role: v }))}      options={['Administrator', 'Staff']} />
                  <EditField label="Status"     value={field('status')}    onChange={v => setDraft(d => ({ ...d, status: v }))}    options={['Active', 'Inactive']} />
                </>
              ) : (
                <>
                  <InfoField label="First Name" value={user.firstName} />
                  <InfoField label="Last Name"  value={user.lastName} />
                  <InfoField label="Username"   value={user.username} />
                  <InfoField label="Role"       value={user.role} />
                  <InfoField label="Status"     value={user.status} />
                </>
              )}
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
            <div className="divide-y divide-gray-50">
              {PERMISSION_GROUPS.map((group) => (
                <div key={group.title} className="flex items-center justify-between py-3">
                  <p className="text-xs font-semibold text-gray-500 tracking-wide">{group.title}</p>
                  <div className="flex items-center gap-4">
                    {group.sections.map((section) => (
                      <div key={section.label ?? '_'} className="flex items-center gap-2">
                        {section.label && <span className="text-xs text-gray-400">{section.label}</span>}
                        <AccessBadge level={getAccessLevel(user.permissions, section, isAdmin)} />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
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
    <ConfirmModal
      isOpen={saveError} type="error" title="Save failed"
      message="Could not update your profile. Please try again."
      confirmText="OK" onConfirm={() => setSaveError(false)} onCancel={() => setSaveError(false)}
    />
    </>
  )
}
