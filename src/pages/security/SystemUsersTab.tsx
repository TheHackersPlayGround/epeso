import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  UserPlus, Edit2, Trash2, Eye, EyeOff, CheckCircle,
  X, Search, ChevronDown, ChevronLeft, ChevronRight,
} from 'lucide-react'
import ConfirmModal from '../shared/ConfirmModal'
import { getUsers, createUser, updateUser, deleteUser } from '../../services/userService'
import { canManage } from '../../utils/permissions'

// Format the backend timestamp ("2026-06-26 16:21:41.5+08") into a readable string.
function fmtLastLogin(v: string | null): string {
  if (!v) return 'Never'
  const d = new Date(v.replace(' ', 'T'))
  return isNaN(d.getTime()) ? v : d.toLocaleString()
}

export interface User {
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

export interface PermissionSection {
  label: string | null
  editorDescription: string
  permissions: { id: string; label: string }[]
}
export interface PermissionGroup {
  title: string
  sections: PermissionSection[]
}

// Programs with their own "Maintenance" screen (batches/activities/projects)
// get two independent sections -- Records (applicant/profile access) and
// Maintenance (batch/activity/project management) -- so an admin can grant
// either, or both, per staff member. Everything else keeps a single section.
const permissionGroups: PermissionGroup[] = [
  { title: 'EMPLOYMENT FACILITATION', sections: [
    { label: null, editorDescription: 'View, Add, Edit & Delete', permissions: [{ id: 'view-employment', label: 'View Employment Facilitation' }, { id: 'manage-employment', label: 'Manage Employment Facilitation' }] },
  ] },
  { title: 'CDSP', sections: [
    { label: 'Records',     editorDescription: 'View, Add, Edit & Delete Applicant Records',        permissions: [{ id: 'view-cdsp',               label: 'View CDSP Records' },     { id: 'manage-cdsp',               label: 'Manage CDSP Records' }] },
    { label: 'Maintenance', editorDescription: 'View, Add, Edit & Delete Services/Activities',       permissions: [{ id: 'view-cdsp-maintenance',   label: 'View CDSP Maintenance' },  { id: 'manage-cdsp-maintenance',   label: 'Manage CDSP Maintenance' }] },
  ] },
  { title: 'GIP', sections: [
    { label: 'Records',     editorDescription: 'View, Add, Edit & Delete Applicant Records',        permissions: [{ id: 'view-gip',                label: 'View GIP Records' },      { id: 'manage-gip',                label: 'Manage GIP Records' }] },
    { label: 'Maintenance', editorDescription: 'View, Add, Edit & Delete Batches',                  permissions: [{ id: 'view-gip-maintenance',    label: 'View GIP Maintenance' },   { id: 'manage-gip-maintenance',    label: 'Manage GIP Maintenance' }] },
  ] },
  { title: 'SPES', sections: [
    { label: 'Records',     editorDescription: 'View, Add, Edit & Delete Applicant Records',        permissions: [{ id: 'view-spes',               label: 'View SPES Records' },     { id: 'manage-spes',               label: 'Manage SPES Records' }] },
    { label: 'Maintenance', editorDescription: 'View, Add, Edit & Delete Batches',                  permissions: [{ id: 'view-spes-maintenance',   label: 'View SPES Maintenance' },  { id: 'manage-spes-maintenance',   label: 'Manage SPES Maintenance' }] },
  ] },
  { title: 'LIVELIHOOD', sections: [
    { label: 'Records',     editorDescription: 'View, Add, Edit & Delete Applicant Records',        permissions: [{ id: 'view-livelihood',             label: 'View Livelihood Records' },     { id: 'manage-livelihood',             label: 'Manage Livelihood Records' }] },
    { label: 'Maintenance', editorDescription: 'View, Add, Edit & Delete Projects/Interventions',   permissions: [{ id: 'view-livelihood-maintenance', label: 'View Livelihood Maintenance' },  { id: 'manage-livelihood-maintenance', label: 'Manage Livelihood Maintenance' }] },
  ] },
  { title: 'SKILLS TRAINING', sections: [
    { label: 'Records',     editorDescription: 'View, Add, Edit & Delete Applicant Records',        permissions: [{ id: 'view-skills',             label: 'View Skills Training Records' },    { id: 'manage-skills',             label: 'Manage Skills Training Records' }] },
    { label: 'Maintenance', editorDescription: 'View, Add, Edit & Delete Batches/Activities',        permissions: [{ id: 'view-skills-maintenance', label: 'View Skills Training Maintenance' }, { id: 'manage-skills-maintenance', label: 'Manage Skills Training Maintenance' }] },
  ] },
  { title: 'OFW', sections: [
    { label: null, editorDescription: 'View, Add, Edit & Delete', permissions: [{ id: 'view-ofw', label: 'View OFW' }, { id: 'manage-ofw', label: 'Manage OFW' }] },
  ] },
  { title: 'DOCUMENTS', sections: [
    { label: null, editorDescription: 'View, Upload, Rename & Delete', permissions: [{ id: 'view-documents', label: 'View Documents' }, { id: 'manage-documents', label: 'Manage Documents' }] },
  ] },
  { title: 'SECURITY', sections: [
    { label: null, editorDescription: 'Manage Users, Logs & Data', permissions: [{ id: 'view-security', label: 'View Security' }, { id: 'manage-security', label: 'Manage Security' }] },
  ] },
  { title: 'REPORT', sections: [
    { label: null, editorDescription: 'View, Generate & Export', permissions: [{ id: 'view-report', label: 'View Report' }, { id: 'manage-report', label: 'Manage Report' }] },
  ] },
]

type GroupAccessLevel = 'viewer' | 'editor'

function AccessLevelDropdown({ value, onChange, editorDescription, disabled }: {
  value: GroupAccessLevel
  onChange: (v: GroupAccessLevel) => void
  editorDescription: string
  disabled?: boolean
}) {
  const [open, setOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const panelRef  = useRef<HTMLDivElement>(null)
  const [panelStyle, setPanelStyle] = useState<React.CSSProperties>({})

  const options = [
    { value: 'viewer' as GroupAccessLevel, label: 'Viewer', description: 'View only' },
    { value: 'editor' as GroupAccessLevel, label: 'Editor', description: editorDescription },
  ]

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const r = buttonRef.current.getBoundingClientRect()
      setPanelStyle({ position: 'fixed', top: r.bottom + 6, right: window.innerWidth - r.right, zIndex: 99999, minWidth: 224 })
    }
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!buttonRef.current?.contains(e.target as Node) && !panelRef.current?.contains(e.target as Node))
        setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  return (
    <>
      <button ref={buttonRef} type="button" onClick={handleToggle} disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all border-blue-200 bg-blue-50 text-[#0077BE] hover:shadow-sm disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:shadow-none">
        <span>{value === 'editor' ? 'Editor' : 'Viewer'}</span>
        {!disabled && <ChevronDown size={13} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />}
      </button>
      {open && createPortal(
        <div ref={panelRef} style={panelStyle} className="bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 overflow-hidden">
          {options.map(opt => (
            <button key={opt.value} type="button" onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors hover:bg-gray-50 ${opt.value === value ? 'bg-blue-50/60' : ''}`}>
              <span className="mt-0.5 w-4 flex-shrink-0 text-[#0077BE]">
                {opt.value === value && <CheckCircle size={15} />}
              </span>
              <div>
                <p className="text-sm text-gray-800 m-0 leading-snug">{opt.label}</p>
                <p className="text-xs text-gray-400 m-0 mt-0.5">{opt.description}</p>
              </div>
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}

interface UserFormModalProps {
  isEdit: boolean
  formData: { firstName: string; lastName: string; username: string; email: string; password: string; role: string; status: string }
  selectedPermissions: string[]
  onClose: () => void
  onSubmit: (newPassword?: string) => void
  onFormChange: (field: string, value: string) => void
  onRoleChange: (role: string) => void
  onSetGroupAccess: (groupPermissions: { id: string; label: string }[], level: GroupAccessLevel) => void
}

function UserFormModal({ isEdit, formData, selectedPermissions, onClose, onSubmit, onFormChange, onRoleChange, onSetGroupAccess }: UserFormModalProps) {
  function getGroupAccessLevel(groupPermissions: { id: string; label: string }[]): GroupAccessLevel {
    const ids = groupPermissions.map(p => p.id)
    return ids.filter(id => selectedPermissions.includes(id)).length === ids.length ? 'editor' : 'viewer'
  }

  const [showPassword,        setShowPassword]        = useState(false)
  const [changePassword,      setChangePassword]      = useState(false)
  const [showNewPassword,     setShowNewPassword]     = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [newPassword,         setNewPassword]         = useState('')
  const [confirmPassword,     setConfirmPassword]     = useState('')
  const [passwordError,       setPasswordError]       = useState('')

  const inp = 'w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent outline-none text-gray-900 placeholder:text-gray-400'

  // Validate the optional password change (edit only) before handing control to the parent.
  // The new password is passed up so it actually reaches the backend.
  const handleSubmitClick = () => {
    if (isEdit && changePassword) {
      if (newPassword.length < 8) { setPasswordError('New password must be at least 8 characters.'); return }
      if (newPassword !== confirmPassword) { setPasswordError('Passwords do not match.'); return }
    }
    setPasswordError('')
    onSubmit(isEdit && changePassword ? newPassword : undefined)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h3 className="text-gray-800 m-0">{isEdit ? 'Edit User' : 'Add New User'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          <div>
            <h4 className="text-gray-700 mb-4">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">First Name *</label>
                <input type="text" value={formData.firstName} onChange={e => onFormChange('firstName', e.target.value)} className={inp} placeholder="Enter first name" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Last Name *</label>
                <input type="text" value={formData.lastName} onChange={e => onFormChange('lastName', e.target.value)} className={inp} placeholder="Enter last name" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Username *</label>
                <input type="text" value={formData.username} onChange={e => onFormChange('username', e.target.value)} className={inp} placeholder="Enter username" />
              </div>

              {!isEdit ? (
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Password *</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={formData.password} onChange={e => onFormChange('password', e.target.value)} className={`${inp} pr-10`} placeholder="Enter password" />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-gray-700">Password</label>
                    {!changePassword ? (
                      <button type="button" onClick={() => setChangePassword(true)} className="text-sm text-[#0077BE] hover:text-[#006699] font-medium">Change Password</button>
                    ) : (
                      <button type="button" onClick={() => { setChangePassword(false); setNewPassword(''); setConfirmPassword('') }} className="text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                    )}
                  </div>
                  {!changePassword ? (
                    <div>
                      <input type="text" value="••••••••••••" disabled className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-400" />
                      <p className="mt-1.5 text-xs text-gray-400">The password is encrypted and can't be displayed. Click "Change Password" to set a new one.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <input type={showNewPassword ? 'text' : 'password'} value={newPassword} onChange={e => setNewPassword(e.target.value)} className={`${inp} pr-10`} placeholder="Enter new password" />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700" onClick={() => setShowNewPassword(!showNewPassword)}>
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <div className="relative">
                        <input type={showConfirmPassword ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} className={`${inp} pr-10`} placeholder="Confirm new password" />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {passwordError && <p className="text-xs text-red-600">{passwordError}</p>}
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-700 mb-2">Role {!isEdit && '*'}</label>
                <select value={formData.role} onChange={e => onRoleChange(e.target.value)} className={inp}>
                  <option value="Staff">Staff</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Status {!isEdit && '*'}</label>
                {/* New users always start Active; the status can be changed later via Edit. */}
                <select value={formData.status} onChange={e => onFormChange('status', e.target.value)} disabled={!isEdit}
                  className={`${inp} ${!isEdit ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : ''}`}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          <div>
            <h4 className="text-gray-700 mb-4">Access Control & Permissions</h4>
            {formData.role === 'Administrator' && (
              <div className="mb-3 px-4 py-2.5 rounded-lg bg-purple-50 border border-purple-200 text-xs text-purple-700">
                Administrators automatically have full access to all modules. Permissions can't be customized for this role.
              </div>
            )}
            <div className="bg-gray-50 rounded-lg divide-y divide-gray-100">
              {permissionGroups.map(group => {
                const isAdmin = formData.role === 'Administrator'
                const securityForStaff = group.title === 'SECURITY' && !isAdmin
                return (
                  <div key={group.title} className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-[#0077BE] font-medium">{group.title}</span>
                    <div className="flex items-center gap-4">
                      {securityForStaff ? (
                        <span className="text-xs text-gray-400 italic px-3 py-1.5">Administrator only</span>
                      ) : (
                        group.sections.map(section => (
                          <div key={section.label ?? '_'} className="flex items-center gap-2">
                            {section.label && <span className="text-xs text-gray-400">{section.label}</span>}
                            <AccessLevelDropdown
                              value={getGroupAccessLevel(section.permissions)}
                              onChange={lvl => onSetGroupAccess(section.permissions, lvl)}
                              editorDescription={section.editorDescription}
                              disabled={isAdmin}
                            />
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSubmitClick} className="px-4 py-2 bg-[#0077BE] text-white rounded-lg hover:bg-[#006699] transition-colors">
            {isEdit ? 'Save Changes' : 'Add User'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SystemUsersTab() {
  const [users,          setUsers]          = useState<User[]>([])
  const [loading,        setLoading]        = useState(true)
  const [showAddModal,   setShowAddModal]   = useState(false)
  const [showEditModal,  setShowEditModal]  = useState(false)
  const [editingUser,    setEditingUser]    = useState<User | null>(null)

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; type: 'confirm' | 'success' | 'error'
    title: string; message: string; confirmText?: string; cancelText?: string; onConfirm: () => void
  }>({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: () => {} })

  // Load real users from the backend on mount.
  const loadUsers = async () => {
    try {
      const data = await getUsers()
      setUsers(data.map(u => ({ ...u, lastLogin: fmtLastLogin(u.lastLogin) })))
    } catch (err) {
      setConfirmModal({
        isOpen: true, type: 'error', title: 'Failed to load users',
        message: err instanceof Error ? err.message : 'Could not load users from the server.',
        onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadUsers() }, [])

  const [formData, setFormData] = useState({ firstName: '', lastName: '', username: '', email: '', password: '', role: 'Staff', status: 'Active' })
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  const totalPermissionsCount = permissionGroups.flatMap(g => g.sections.flatMap(s => s.permissions)).length
  // Security is administrator-only, so Staff never start with (or can be given) it.
  const staffGroups = permissionGroups.filter(g => g.title !== 'SECURITY')
  const defaultViewerPermissions = staffGroups.flatMap(g => g.sections.map(s => s.permissions[0].id))

  const resetForm = () => {
    setFormData({ firstName: '', lastName: '', username: '', email: '', password: '', role: 'Staff', status: 'Active' })
    setSelectedPermissions(defaultViewerPermissions)
  }

  const handleRoleChange = (newRole: string) => {
    setFormData(prev => ({ ...prev, role: newRole }))
    if (newRole === 'Administrator') setSelectedPermissions(permissionGroups.flatMap(g => g.sections.flatMap(s => s.permissions.map(p => p.id))))
    else setSelectedPermissions(defaultViewerPermissions)
  }

  const handleSetGroupAccess = (groupPermissions: { id: string; label: string }[], level: GroupAccessLevel) => {
    const ids = groupPermissions.map(p => p.id)
    setSelectedPermissions(prev => {
      const without = prev.filter(p => !ids.includes(p))
      return level === 'viewer' ? [...without, ids[0]] : [...without, ...ids]
    })
  }

  const handleOpenAddModal = () => { resetForm(); setShowAddModal(true) }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setFormData({ firstName: user.firstName, lastName: user.lastName, username: user.username, email: user.email, password: '', role: user.role, status: user.status })
    setSelectedPermissions(user.permissions || [])
    setShowEditModal(true)
  }

  const handleSaveEdit = async (newPassword?: string) => {
    if (!editingUser) return
    try {
      await updateUser(editingUser.id, {
        firstName: formData.firstName, lastName: formData.lastName, username: formData.username,
        role: formData.role, status: formData.status, permissions: selectedPermissions,
        ...(newPassword ? { newPassword } : {}),
      })
      await loadUsers()
      setShowEditModal(false)
      setEditingUser(null)
      resetForm()
      setConfirmModal({ isOpen: true, type: 'success', title: 'Success!', message: 'User updated successfully!', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) })
    } catch (err) {
      setConfirmModal({ isOpen: true, type: 'error', title: 'Update Failed', message: err instanceof Error ? err.message : 'Could not update user.', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) })
    }
  }

  const handleAddUserClick = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.username.trim() || !formData.password.trim()) {
      setConfirmModal({ isOpen: true, type: 'error', title: 'Validation Error', message: 'Please fill in all required fields (First Name, Last Name, Username, Password)', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) })
      return
    }
    setConfirmModal({
      isOpen: true, type: 'confirm', title: 'Confirm Add User',
      message: `Add new user "${formData.firstName} ${formData.lastName}" (${formData.username}) as ${formData.role}?`,
      confirmText: 'Yes, Add User', cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await createUser({
            firstName: formData.firstName, lastName: formData.lastName, username: formData.username,
            password: formData.password, role: formData.role, status: formData.status,
            permissions: selectedPermissions,
          })
          await loadUsers()
          setShowAddModal(false)
          resetForm()
          setConfirmModal({ isOpen: true, type: 'success', title: 'Success!', message: 'User added successfully!', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) })
        } catch (err) {
          setConfirmModal({ isOpen: true, type: 'error', title: 'Add Failed', message: err instanceof Error ? err.message : 'Could not add user.', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) })
        }
      },
    })
  }

  const handleDeleteUser = (userId: number) => {
    const userToDelete = users.find(u => u.id === userId)
    if (userToDelete?.role === 'Administrator' && users.filter(u => u.role === 'Administrator').length === 1) {
      setConfirmModal({ isOpen: true, type: 'error', title: 'Cannot Delete', message: 'Cannot delete the last administrator account!', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) })
      return
    }
    setConfirmModal({
      isOpen: true, type: 'confirm', title: 'Confirm Delete',
      message: `Are you sure you want to delete user "${userToDelete?.username}"?\n\nThis action cannot be undone.`,
      confirmText: 'Yes, Delete', cancelText: 'Cancel',
      onConfirm: async () => {
        try {
          await deleteUser(userId)
          await loadUsers()
          setConfirmModal({ isOpen: true, type: 'success', title: 'Success!', message: 'User deleted successfully!', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) })
        } catch (err) {
          setConfirmModal({ isOpen: true, type: 'error', title: 'Delete Failed', message: err instanceof Error ? err.message : 'Could not delete user.', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) })
        }
      },
    })
  }

  // ── Filter & pagination ──────────────────────────────────────────────────────
  const [userSearch,       setUserSearch]       = useState('')
  const [userRoleFilter,   setUserRoleFilter]   = useState('All')
  const [userStatusFilter, setUserStatusFilter] = useState('All')
  const [userPage,         setUserPage]         = useState(1)
  const [usersPerPage,     setUsersPerPage]     = useState(10)

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase()
    const matchesSearch = q === '' || u.firstName.toLowerCase().includes(q) || u.lastName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
    return matchesSearch && (userRoleFilter === 'All' || u.role === userRoleFilter) && (userStatusFilter === 'All' || u.status === userStatusFilter)
  })

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage))
  const paginatedUsers = filteredUsers.slice((userPage - 1) * usersPerPage, userPage * usersPerPage)

  useEffect(() => { setUserPage(1) }, [userSearch, userRoleFilter, userStatusFilter])

  return (
    <>
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-gray-800 m-0">System Users</h3>
            <span className="text-sm text-gray-400">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found</span>
          </div>
          <button onClick={handleOpenAddModal} disabled={!canManage('security')} className="flex items-center gap-2 px-4 py-2 bg-[#0077BE] text-white rounded-lg hover:bg-[#006699] transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#0077BE]">
            <UserPlus size={18} />
            Add User
          </button>
        </div>

        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" placeholder="Search by name, username, or email..." value={userSearch} onChange={e => setUserSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent outline-none bg-white text-gray-900 placeholder:text-gray-400" />
          </div>
          <div className="relative">
            <select value={userRoleFilter} onChange={e => setUserRoleFilter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent outline-none bg-white text-gray-700 cursor-pointer">
              <option value="All">All Roles</option>
              <option value="Administrator">Administrator</option>
              <option value="Staff">Staff</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={userStatusFilter} onChange={e => setUserStatusFilter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent outline-none bg-white text-gray-700 cursor-pointer">
              <option value="All">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        </div>

        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Name</th>
              <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Username</th>
              <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Role</th>
              <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Status</th>
              <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Last Login</th>
              <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Permissions</th>
              <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">Loading users…</td></tr>
            ) : filteredUsers.length === 0 ? (
              <tr><td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">No users match your search or filters.</td></tr>
            ) : paginatedUsers.map(user => (
              <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-6 py-4 text-sm text-gray-800 font-medium whitespace-nowrap">{user.firstName} {user.lastName}</td>
                <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{user.username}</td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-3 py-1 rounded-full text-sm ${user.role === 'Administrator' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>{user.role}</span>
                </td>
                <td className="px-6 py-4 text-sm">
                  <span className={`px-3 py-1 rounded-full text-sm ${user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{user.status}</span>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">{user.lastLogin}</td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {user.permissions.length === 0 ? (
                    <span className="text-sm text-gray-400">None</span>
                  ) : user.permissions.length === totalPermissionsCount ? (
                    <span className="text-sm font-medium text-[#0077BE]">All</span>
                  ) : (
                    <span className="text-sm">{user.permissions.length} assigned</span>
                  )}
                </td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    <button onClick={() => handleEditUser(user)} disabled={!canManage('security')} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"><Edit2 size={18} /></button>
                    <button onClick={() => handleDeleteUser(user.id)} disabled={!canManage('security')} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"><Trash2 size={18} /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Show</span>
            <select value={usersPerPage} onChange={e => { setUsersPerPage(Number(e.target.value)); setUserPage(1) }} className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0077BE] outline-none bg-white">
              <option value={5}>5</option><option value={10}>10</option><option value={20}>20</option>
            </select>
            <span className="text-sm text-gray-500">per page</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft size={16} /></button>
            <span className="text-sm text-[#0077BE] font-medium">{(userPage - 1) * usersPerPage + 1}–{Math.min(userPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length}</span>
            <button onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))} disabled={userPage === totalUserPages} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight size={16} /></button>
          </div>
        </div>
      </div>

      {showAddModal && (
        <UserFormModal isEdit={false} formData={formData} selectedPermissions={selectedPermissions}
          onClose={() => setShowAddModal(false)} onSubmit={handleAddUserClick}
          onFormChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
          onRoleChange={handleRoleChange} onSetGroupAccess={handleSetGroupAccess} />
      )}
      {showEditModal && (
        <UserFormModal isEdit={true} formData={formData} selectedPermissions={selectedPermissions}
          onClose={() => setShowEditModal(false)} onSubmit={handleSaveEdit}
          onFormChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
          onRoleChange={handleRoleChange} onSetGroupAccess={handleSetGroupAccess} />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen} type={confirmModal.type} title={confirmModal.title}
        message={confirmModal.message} confirmText={confirmModal.confirmText} cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  )
}
