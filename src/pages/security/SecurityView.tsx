import { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import {
  ArrowLeft, UserPlus, Edit2, Trash2, Eye, EyeOff, CheckCircle,
  X, Database, Download, RefreshCw, Search, ChevronDown,
  ChevronLeft, ChevronRight, Trash, RotateCcw, Clock, AlertTriangle,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import ConfirmModal from '../shared/ConfirmModal'
import { useCDSP } from '../../contexts/CDSPContext'
import { useGIP } from '../../contexts/GIPContext'
import { useSPES } from '../../contexts/SPESContext'
import { useSkillsTraining } from '../../contexts/SkillsTrainingContext'

interface User {
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

interface SecurityViewProps {
  onBack: () => void
  recycleBin?: RecycleBinItem[]
  setRecycleBin?: React.Dispatch<React.SetStateAction<RecycleBinItem[]>>
}

const mockUsers: User[] = [
  { id: 1,  firstName: 'System',   lastName: 'Administrator', username: 'admin',       email: 'admin@peso.gov.ph',       role: 'Administrator', status: 'Active',   lastLogin: '2026-06-14 09:30 AM', permissions: [] },
  { id: 2,  firstName: 'Juan',     lastName: 'Dela Cruz',     username: 'staff001',    email: 'staff001@peso.gov.ph',    role: 'Staff',         status: 'Active',   lastLogin: '2026-06-13 02:15 PM', permissions: ['view-applicants', 'view-employers'] },
  { id: 3,  firstName: 'Maria',    lastName: 'Santos',        username: 'staff002',    email: 'staff002@peso.gov.ph',    role: 'Staff',         status: 'Active',   lastLogin: '2026-06-13 11:45 AM', permissions: ['view-applicants', 'add-applicant'] },
  { id: 4,  firstName: 'Carlo',    lastName: 'Reyes',         username: 'staff003',    email: 'staff003@peso.gov.ph',    role: 'Staff',         status: 'Inactive', lastLogin: '2026-05-28 03:20 PM', permissions: [] },
  { id: 5,  firstName: 'Ana',      lastName: 'Bautista',      username: 'staff004',    email: 'staff004@peso.gov.ph',    role: 'Staff',         status: 'Active',   lastLogin: '2026-06-12 10:00 AM', permissions: ['view-applicants', 'view-employers', 'add-applicant'] },
  { id: 6,  firstName: 'Roberto',  lastName: 'Alvarez',       username: 'staff005',    email: 'staff005@peso.gov.ph',    role: 'Staff',         status: 'Active',   lastLogin: '2026-06-11 08:45 AM', permissions: ['view-applicants'] },
  { id: 7,  firstName: 'Liza',     lastName: 'Mendoza',       username: 'staff006',    email: 'staff006@peso.gov.ph',    role: 'Staff',         status: 'Inactive', lastLogin: '2026-05-15 01:30 PM', permissions: ['view-applicants', 'view-employers'] },
  { id: 8,  firstName: 'Ramon',    lastName: 'Cruz',          username: 'staff007',    email: 'staff007@peso.gov.ph',    role: 'Staff',         status: 'Active',   lastLogin: '2026-06-14 07:55 AM', permissions: ['view-applicants', 'add-applicant', 'edit-applicant'] },
  { id: 9,  firstName: 'Cristina', lastName: 'Villanueva',    username: 'staff008',    email: 'staff008@peso.gov.ph',    role: 'Staff',         status: 'Active',   lastLogin: '2026-06-10 04:10 PM', permissions: ['view-applicants', 'view-employers', 'view-programs'] },
  { id: 10, firstName: 'Dennis',   lastName: 'Ocampo',        username: 'staff009',    email: 'staff009@peso.gov.ph',    role: 'Staff',         status: 'Active',   lastLogin: '2026-06-09 09:20 AM', permissions: ['view-applicants'] },
  { id: 11, firstName: 'Joana',    lastName: 'Fernandez',     username: 'staff010',    email: 'staff010@peso.gov.ph',    role: 'Staff',         status: 'Inactive', lastLogin: '2026-04-30 02:00 PM', permissions: [] },
  { id: 12, firstName: 'Miguel',   lastName: 'Torres',        username: 'staff011',    email: 'staff011@peso.gov.ph',    role: 'Staff',         status: 'Active',   lastLogin: '2026-06-13 03:45 PM', permissions: ['view-applicants', 'view-employers', 'add-applicant', 'edit-applicant'] },
  { id: 13, firstName: 'Grace',    lastName: 'Limbo',         username: 'staff012',    email: 'staff012@peso.gov.ph',    role: 'Staff',         status: 'Active',   lastLogin: '2026-06-12 11:10 AM', permissions: ['view-applicants', 'view-programs'] },
  { id: 14, firstName: 'Patrick',  lastName: 'Manalac',       username: 'staff013',    email: 'staff013@peso.gov.ph',    role: 'Staff',         status: 'Active',   lastLogin: '2026-06-11 12:30 PM', permissions: ['view-applicants', 'view-employers'] },
  { id: 15, firstName: 'Sheila',   lastName: 'Aguilar',       username: 'staff014',    email: 'staff014@peso.gov.ph',    role: 'Staff',         status: 'Inactive', lastLogin: '2026-05-20 09:00 AM', permissions: ['view-applicants'] },
  { id: 16, firstName: 'Ronaldo',  lastName: 'Magno',         username: 'staff015',    email: 'staff015@peso.gov.ph',    role: 'Staff',         status: 'Active',   lastLogin: '2026-06-14 08:15 AM', permissions: ['view-applicants', 'add-applicant'] },
  { id: 17, firstName: 'Norma',    lastName: 'Cuevas',        username: 'supervisor01',email: 'supervisor01@peso.gov.ph',role: 'Administrator', status: 'Active',   lastLogin: '2026-06-14 07:30 AM', permissions: [] },
  { id: 18, firstName: 'Felix',    lastName: 'Sanchez',       username: 'staff016',    email: 'staff016@peso.gov.ph',    role: 'Staff',         status: 'Active',   lastLogin: '2026-06-13 05:00 PM', permissions: ['view-applicants', 'view-employers', 'view-programs', 'add-applicant'] },
  { id: 19, firstName: 'Lourdes',  lastName: 'Bayot',         username: 'staff017',    email: 'staff017@peso.gov.ph',    role: 'Staff',         status: 'Active',   lastLogin: '2026-06-12 10:50 AM', permissions: ['view-applicants'] },
  { id: 20, firstName: 'Rodel',    lastName: 'Cañete',        username: 'staff018',    email: 'staff018@peso.gov.ph',    role: 'Staff',         status: 'Inactive', lastLogin: '2026-05-05 03:30 PM', permissions: [] },
]

const permissionGroups = [
  {
    title: 'APPLICANT MANAGEMENT',
    editorDescription: 'View, Add, Edit & Delete',
    permissions: [
      { id: 'view-applicants',  label: 'View Applicants' },
      { id: 'add-applicant',    label: 'Add Applicant' },
      { id: 'edit-applicant',   label: 'Edit Applicant' },
      { id: 'delete-applicant', label: 'Delete Applicant' },
    ],
  },
  {
    title: 'EMPLOYER MANAGEMENT',
    editorDescription: 'View, Add, Edit & Delete',
    permissions: [
      { id: 'view-employers',  label: 'View Employers' },
      { id: 'add-employer',    label: 'Add Employer' },
      { id: 'edit-employer',   label: 'Edit Employer' },
      { id: 'delete-employer', label: 'Delete Employer' },
    ],
  },
  {
    title: 'PROGRAM / EVENTS MANAGEMENT',
    editorDescription: 'View, Add, Edit & Delete',
    permissions: [
      { id: 'view-programs',   label: 'View Programs' },
      { id: 'add-program',     label: 'Add Program/Event' },
      { id: 'edit-program',    label: 'Edit Program/Event' },
      { id: 'delete-program',  label: 'Delete Program/Event' },
    ],
  },
  {
    title: 'MAINTENANCE',
    editorDescription: 'View, Add, Edit & Delete',
    permissions: [
      { id: 'access-maintenance', label: 'Access Maintenance Page' },
      { id: 'add-records',        label: 'Add Records' },
      { id: 'edit-records',       label: 'Edit Records' },
      { id: 'delete-records',     label: 'Delete Records' },
    ],
  },
  {
    title: 'ACTIVITY LOG',
    editorDescription: 'View & Export',
    permissions: [
      { id: 'view-activity-log',   label: 'View Activity Log' },
      { id: 'export-activity-log', label: 'Export Activity Log' },
    ],
  },
  {
    title: 'REPORTS',
    editorDescription: 'View, Generate & Export',
    permissions: [
      { id: 'view-reports',     label: 'View Reports' },
      { id: 'generate-reports', label: 'Generate Reports' },
      { id: 'export-reports',   label: 'Export Reports' },
    ],
  },
  {
    title: 'USER MANAGEMENT',
    editorDescription: 'View, Add, Edit, Delete & Assign',
    permissions: [
      { id: 'view-users',    label: 'View Users' },
      { id: 'add-user',      label: 'Add User' },
      { id: 'edit-user',     label: 'Edit User' },
      { id: 'delete-user',   label: 'Delete User' },
      { id: 'assign-roles',  label: 'Assign Roles & Permissions' },
    ],
  },
  {
    title: 'SYSTEM SETTINGS',
    editorDescription: 'View & Modify',
    permissions: [
      { id: 'access-settings', label: 'Access System Settings' },
      { id: 'modify-config',   label: 'Modify System Configuration' },
    ],
  },
]

type GroupAccessLevel = 'viewer' | 'editor'

function AccessLevelDropdown({ value, onChange, editorDescription }: {
  value: GroupAccessLevel
  onChange: (v: GroupAccessLevel) => void
  editorDescription: string
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
      setPanelStyle({
        position: 'fixed',
        top: r.bottom + 6,
        right: window.innerWidth - r.right,
        zIndex: 99999,
        minWidth: 224,
      })
    }
    setOpen(v => !v)
  }

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (!buttonRef.current?.contains(e.target as Node) && !panelRef.current?.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const buttonColor =
    value === 'editor'
      ? 'border-blue-200 bg-blue-50 text-[#0077BE]'
      : 'border-blue-200 bg-blue-50 text-blue-600'

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={handleToggle}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm transition-all ${buttonColor} hover:shadow-sm`}
      >
        <span>{value === 'editor' ? 'Editor' : 'Viewer'}</span>
        <ChevronDown size={13} className={`transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          style={panelStyle}
          className="bg-white rounded-xl shadow-2xl border border-gray-100 py-1.5 overflow-hidden"
        >
          {options.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => { onChange(opt.value); setOpen(false) }}
              className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors hover:bg-gray-50 ${opt.value === value ? 'bg-blue-50/60' : ''}`}
            >
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
  formData: {
    firstName: string
    lastName: string
    username: string
    email: string
    password: string
    role: string
    status: string
  }
  selectedPermissions: string[]
  permissionGroups: typeof permissionGroups
  onClose: () => void
  onSubmit: () => void
  onFormChange: (field: string, value: string) => void
  onRoleChange: (role: string) => void
  onSetGroupAccess: (groupPermissions: { id: string; label: string }[], level: GroupAccessLevel) => void
}

function UserFormModal({
  isEdit,
  formData,
  selectedPermissions,
  permissionGroups,
  onClose,
  onSubmit,
  onFormChange,
  onRoleChange,
  onSetGroupAccess,
}: UserFormModalProps) {
  function getGroupAccessLevel(groupPermissions: { id: string; label: string }[]): GroupAccessLevel {
    const ids = groupPermissions.map(p => p.id)
    const selectedInGroup = ids.filter(id => selectedPermissions.includes(id))
    if (selectedInGroup.length === ids.length) return 'editor'
    return 'viewer'
  }

  const [showPassword,        setShowPassword]        = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [changePassword,      setChangePassword]      = useState(false)
  const [showNewPassword,     setShowNewPassword]     = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [newPassword,         setNewPassword]         = useState('')
  const [confirmPassword,     setConfirmPassword]     = useState('')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between flex-shrink-0">
          <h3 className="text-gray-800 m-0">{isEdit ? 'Edit User' : 'Add New User'}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-6">
          {/* Basic Information */}
          <div>
            <h4 className="text-gray-700 mb-4">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-2">First Name *</label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={e => onFormChange('firstName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent outline-none text-gray-900 placeholder:text-gray-900"
                  placeholder="Enter first name"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Last Name *</label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={e => onFormChange('lastName', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent outline-none text-gray-900 placeholder:text-gray-900"
                  placeholder="Enter last name"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Username *</label>
                <input
                  type="text"
                  value={formData.username}
                  onChange={e => onFormChange('username', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent outline-none text-gray-900 placeholder:text-gray-900"
                  placeholder="Enter username"
                />
              </div>

              {/* Password Field */}
              {!isEdit ? (
                <div>
                  <label className="block text-sm text-gray-700 mb-2">Password *</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={e => onFormChange('password', e.target.value)}
                      className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent outline-none text-gray-900 placeholder:text-gray-900"
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm text-gray-700">Password</label>
                    {!changePassword ? (
                      <button
                        type="button"
                        onClick={() => setChangePassword(true)}
                        className="text-sm text-[#0077BE] hover:text-[#006699] font-medium"
                      >
                        Change Password
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => { setChangePassword(false); setNewPassword(''); setConfirmPassword('') }}
                        className="text-sm text-gray-600 hover:text-gray-800"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                  {!changePassword ? (
                    <div className="relative">
                      <input
                        type="text"
                        value={showCurrentPassword ? 'CurrentPassword123' : '••••••••••••'}
                        disabled
                        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
                      />
                      <button
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          value={newPassword}
                          onChange={e => setNewPassword(e.target.value)}
                          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent outline-none text-gray-900 placeholder:text-gray-900"
                          placeholder="Enter new password"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={e => setConfirmPassword(e.target.value)}
                          className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent outline-none text-gray-900 placeholder:text-gray-900"
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-700 mb-2">Role {!isEdit && '*'}</label>
                <select
                  value={formData.role}
                  onChange={e => onRoleChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent outline-none text-gray-900 placeholder:text-gray-900"
                >
                  <option value="Staff">Staff</option>
                  <option value="Administrator">Administrator</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-2">Status {!isEdit && '*'}</label>
                <select
                  value={formData.status}
                  onChange={e => onFormChange('status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent outline-none text-gray-900 placeholder:text-gray-900"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </div>

          {/* Access Control */}
          <div>
            <h4 className="text-gray-700 mb-4">Access Control & Permissions</h4>
            <div className="bg-gray-50 rounded-lg divide-y divide-gray-100">
              {permissionGroups.map(group => {
                const level = getGroupAccessLevel(group.permissions)
                return (
                  <div key={group.title} className="flex items-center justify-between px-4 py-3">
                    <span className="text-xs text-[#0077BE] font-medium">{group.title}</span>
                    <AccessLevelDropdown
                      value={level}
                      onChange={lvl => onSetGroupAccess(group.permissions, lvl)}
                      editorDescription={group.editorDescription}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSubmit}
            className="px-4 py-2 bg-[#0077BE] text-white rounded-lg hover:bg-[#006699] transition-colors"
          >
            {isEdit ? 'Save Changes' : 'Add User'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Activity Logs ────────────────────────────────────────────────────────────
interface ActivityLog {
  id: number
  timestamp: string
  user: string
  role: string
  action: string
  module: string
  details: string
  status: 'Success' | 'Failed'
}

const mockActivityLogs: ActivityLog[] = [
  { id: 1,  timestamp: '2026-05-11 09:02 AM', user: 'admin',    role: 'Administrator', action: 'Login',         module: 'System',          details: 'Successful login',                         status: 'Success' },
  { id: 2,  timestamp: '2026-05-11 09:05 AM', user: 'admin',    role: 'Administrator', action: 'Add Record',    module: 'Applicants',      details: 'Added applicant: Juan Dela Cruz',          status: 'Success' },
  { id: 3,  timestamp: '2026-05-11 09:18 AM', user: 'staff001', role: 'Staff',         action: 'View Record',   module: 'Employers',       details: 'Viewed employer: ABC Corporation',         status: 'Success' },
  { id: 4,  timestamp: '2026-05-11 09:31 AM', user: 'staff002', role: 'Staff',         action: 'Edit Record',   module: 'Applicants',      details: 'Edited applicant: Maria Santos',           status: 'Success' },
  { id: 5,  timestamp: '2026-05-11 09:45 AM', user: 'staff001', role: 'Staff',         action: 'Login',         module: 'System',          details: 'Failed login attempt',                     status: 'Failed'  },
  { id: 6,  timestamp: '2026-05-11 10:00 AM', user: 'admin',    role: 'Administrator', action: 'Delete Record', module: 'Applicants',      details: 'Deleted applicant: Pedro Reyes',           status: 'Success' },
  { id: 7,  timestamp: '2026-05-11 10:12 AM', user: 'staff002', role: 'Staff',         action: 'Export',        module: 'Reports',         details: 'Exported ELPOR report to Excel',           status: 'Success' },
  { id: 8,  timestamp: '2026-05-11 10:25 AM', user: 'admin',    role: 'Administrator', action: 'Add Record',    module: 'OFW Services',    details: 'Added OFW profile: Ana Reyes',             status: 'Success' },
  { id: 9,  timestamp: '2026-05-11 10:40 AM', user: 'staff001', role: 'Staff',         action: 'View Record',   module: 'Skills Training', details: 'Viewed skills training participant list',  status: 'Success' },
  { id: 10, timestamp: '2026-05-11 10:55 AM', user: 'admin',    role: 'Administrator', action: 'Edit Record',   module: 'Employers',       details: 'Updated employer: XYZ Enterprise',         status: 'Success' },
  { id: 11, timestamp: '2026-05-11 11:08 AM', user: 'staff002', role: 'Staff',         action: 'Add Record',    module: 'Skills Training', details: 'Assigned training to: Jose Garcia',        status: 'Success' },
  { id: 12, timestamp: '2026-05-11 11:20 AM', user: 'staff001', role: 'Staff',         action: 'Export',        module: 'Applicants',      details: 'Exported applicant list to CSV',           status: 'Failed'  },
  { id: 13, timestamp: '2026-05-11 11:35 AM', user: 'admin',    role: 'Administrator', action: 'Add User',      module: 'User Management', details: 'Created user: staff004',                   status: 'Success' },
  { id: 14, timestamp: '2026-05-11 11:50 AM', user: 'admin',    role: 'Administrator', action: 'Edit Record',   module: 'OFW Services',    details: 'Updated ELPOR entry: Ramon Cruz',          status: 'Success' },
  { id: 15, timestamp: '2026-05-11 12:02 PM', user: 'staff001', role: 'Staff',         action: 'View Record',   module: 'Reports',         details: 'Viewed monthly PESO report',               status: 'Success' },
  { id: 16, timestamp: '2026-05-11 01:10 PM', user: 'staff002', role: 'Staff',         action: 'Login',         module: 'System',          details: 'Successful login after session timeout',   status: 'Success' },
  { id: 17, timestamp: '2026-05-11 01:25 PM', user: 'admin',    role: 'Administrator', action: 'Delete Record', module: 'Employers',       details: "Deleted employer: Old Co.",                status: 'Success' },
  { id: 18, timestamp: '2026-05-11 01:38 PM', user: 'staff001', role: 'Staff',         action: 'Edit Record',   module: 'OFW Services',    details: 'Updated OFW request status: Liza Mendoza',status: 'Success' },
  { id: 19, timestamp: '2026-05-11 02:00 PM', user: 'admin',    role: 'Administrator', action: 'Export',        module: 'Skills Training', details: 'Exported skills training list to Excel',   status: 'Success' },
  { id: 20, timestamp: '2026-05-11 02:15 PM', user: 'staff002', role: 'Staff',         action: 'Delete Record', module: 'Skills Training', details: 'Unauthorized delete attempt blocked',      status: 'Failed'  },
]

// ── Recycle Bin ──────────────────────────────────────────────────────────────
interface RecycleBinItem {
  id: number
  name: string
  module: string
  description: string
  deletedBy: string
  deletedAt: string
}

const TODAY_DATE = new Date('2026-05-11')

function daysAgo(n: number): string {
  const d = new Date(TODAY_DATE)
  d.setDate(d.getDate() - n)
  return d.toISOString().split('T')[0]
}

function getDaysRemaining(deletedAt: string): number {
  const deleted = new Date(deletedAt)
  const diff = Math.floor((TODAY_DATE.getTime() - deleted.getTime()) / (1000 * 60 * 60 * 24))
  return Math.max(0, 30 - diff)
}

const initialRecycleBin: RecycleBinItem[] = [
  { id: 1,  name: 'Pedro Reyes',           module: 'Applicants',      description: 'Applicant record – Machinist, Batch 2025',         deletedBy: 'admin',    deletedAt: daysAgo(29) },
  { id: 2,  name: 'Old Co. Enterprises',   module: 'Employers',       description: 'Employer profile – Manufacturing sector',           deletedBy: 'admin',    deletedAt: daysAgo(27) },
  { id: 3,  name: 'ELPOR Entry #0032',     module: 'OFW Services',    description: 'ELPOR Form A2 – Ramon Cruz, Deployment 2024',      deletedBy: 'admin',    deletedAt: daysAgo(24) },
  { id: 4,  name: 'Livelihood Training Q1',module: 'Skills Training', description: 'NC II Batch BATCH-003 – Cancelled program',        deletedBy: 'staff001', deletedAt: daysAgo(20) },
  { id: 5,  name: 'Jose Garcia',           module: 'Applicants',      description: 'Applicant record – Welder, duplicate entry',       deletedBy: 'staff002', deletedAt: daysAgo(16) },
  { id: 6,  name: 'XYZ Trading Corp.',     module: 'Employers',       description: 'Employer profile – closed business',               deletedBy: 'admin',    deletedAt: daysAgo(12) },
  { id: 7,  name: 'OWWA Case #2025-018',   module: 'OFW Services',    description: 'OWWA Welfare Case – Liza Mendoza, resolved',       deletedBy: 'staff001', deletedAt: daysAgo(8)  },
  { id: 8,  name: 'Community Fair 2025',   module: 'Programs',        description: 'Job fair event record – concluded',                deletedBy: 'staff002', deletedAt: daysAgo(5)  },
  { id: 9,  name: 'Ana Reyes',             module: 'Applicants',      description: 'Applicant record – Caregiver, transferred abroad', deletedBy: 'admin',    deletedAt: daysAgo(3)  },
  { id: 10, name: 'PESO Request #1045',    module: 'OFW Services',    description: 'Request for Assistance – withdrawn by applicant',  deletedBy: 'staff001', deletedAt: daysAgo(1)  },
]

export default function SecurityView({ onBack, recycleBin: externalRecycleBin, setRecycleBin: externalSetRecycleBin }: SecurityViewProps) {
  const { applicants: cdspApplicants } = useCDSP()
  const { applicants: gipApplicants }  = useGIP()
  const { applicants: spesApplicants } = useSPES()
  const { profiles: skillsProfiles }   = useSkillsTraining()

  const [activeTab,      setActiveTab]      = useState<'users' | 'data' | 'logs' | 'bin'>('users')
  const [users,          setUsers]          = useState<User[]>(mockUsers)
  const [showAddModal,   setShowAddModal]   = useState(false)
  const [showEditModal,  setShowEditModal]  = useState(false)
  const [editingUser,    setEditingUser]    = useState<User | null>(null)

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    type: 'confirm' | 'success' | 'error'
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    onConfirm: () => void
  }>({
    isOpen: false,
    type: 'confirm',
    title: '',
    message: '',
    onConfirm: () => {},
  })

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    password: '',
    role: 'Staff',
    status: 'Active',
  })

  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])

  const totalPermissionsCount = permissionGroups.flatMap(g => g.permissions).length

  const handleRoleChange = (newRole: string) => {
    setFormData(prev => ({ ...prev, role: newRole }))
    if (newRole === 'Administrator') {
      setSelectedPermissions(permissionGroups.flatMap(g => g.permissions.map(p => p.id)))
    } else {
      setSelectedPermissions(permissionGroups.map(g => g.permissions[0].id))
    }
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setFormData({
      firstName: user.firstName,
      lastName:  user.lastName,
      username:  user.username,
      email:     user.email,
      password:  '',
      role:      user.role,
      status:    user.status,
    })
    setSelectedPermissions(user.permissions || [])
    setShowEditModal(true)
  }

  const handleSaveEdit = () => {
    if (!editingUser) return
    setUsers(users.map(u =>
      u.id === editingUser.id
        ? { ...u, firstName: formData.firstName, lastName: formData.lastName, username: formData.username, email: formData.email, role: formData.role, status: formData.status, permissions: selectedPermissions }
        : u
    ))
    setShowEditModal(false)
    setEditingUser(null)
    resetForm()
    setConfirmModal({ isOpen: true, type: 'success', title: 'Success!', message: 'User updated successfully!', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) })
  }

  const handleAddUserClick = () => {
    if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.username.trim() || !formData.password.trim()) {
      setConfirmModal({ isOpen: true, type: 'error', title: 'Validation Error', message: 'Please fill in all required fields (First Name, Last Name, Username, Password)', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) })
      return
    }

    setConfirmModal({
      isOpen: true,
      type: 'confirm',
      title: 'Confirm Add User',
      message: `Add new user "${formData.firstName} ${formData.lastName}" (${formData.username}) as ${formData.role}?`,
      confirmText: 'Yes, Add User',
      cancelText: 'Cancel',
      onConfirm: () => {
        const newUser: User = {
          id: users.length + 1,
          firstName:   formData.firstName,
          lastName:    formData.lastName,
          username:    formData.username,
          email:       `${formData.username}@peso.gov.ph`,
          role:        formData.role,
          status:      formData.status,
          lastLogin:   'Never',
          permissions: selectedPermissions,
        }
        setUsers([...users, newUser])
        setShowAddModal(false)
        resetForm()
        setConfirmModal({ isOpen: true, type: 'success', title: 'Success!', message: 'User added successfully!', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) })
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
      isOpen: true,
      type: 'confirm',
      title: 'Confirm Delete',
      message: `Are you sure you want to delete user "${userToDelete?.username}"?\n\nThis action cannot be undone.`,
      confirmText: 'Yes, Delete',
      cancelText: 'Cancel',
      onConfirm: () => {
        setUsers(users.filter(u => u.id !== userId))
        setConfirmModal({ isOpen: true, type: 'success', title: 'Success!', message: 'User deleted successfully!', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) })
      },
    })
  }

  const defaultViewerPermissions = permissionGroups.map(g => g.permissions[0].id)

  const resetForm = () => {
    setFormData({ firstName: '', lastName: '', username: '', email: '', password: '', role: 'Staff', status: 'Active' })
    setSelectedPermissions(defaultViewerPermissions)
  }

  const handleOpenAddModal = () => { resetForm(); setShowAddModal(true) }

  const handleSetGroupAccess = (groupPermissions: { id: string; label: string }[], level: GroupAccessLevel) => {
    const ids     = groupPermissions.map(p => p.id)
    const viewerId = ids[0]
    setSelectedPermissions(prev => {
      const without = prev.filter(p => !ids.includes(p))
      if (level === 'viewer') return [...without, viewerId]
      return [...without, ...ids]
    })
  }

  // ── Users filter & pagination ────────────────────────────────────────────
  const [userSearch,      setUserSearch]      = useState('')
  const [userRoleFilter,  setUserRoleFilter]  = useState('All')
  const [userStatusFilter,setUserStatusFilter]= useState('All')
  const [userPage,        setUserPage]        = useState(1)
  const [usersPerPage,    setUsersPerPage]    = useState(10)

  const filteredUsers = users.filter(u => {
    const q = userSearch.toLowerCase()
    const matchesSearch =
      q === '' ||
      u.firstName.toLowerCase().includes(q) ||
      u.lastName.toLowerCase().includes(q) ||
      u.username.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    const matchesRole   = userRoleFilter   === 'All' || u.role   === userRoleFilter
    const matchesStatus = userStatusFilter === 'All' || u.status === userStatusFilter
    return matchesSearch && matchesRole && matchesStatus
  })

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / usersPerPage))
  const paginatedUsers = filteredUsers.slice((userPage - 1) * usersPerPage, userPage * usersPerPage)

  // ── Activity Logs ────────────────────────────────────────────────────────
  const [logSearch,       setLogSearch]       = useState('')
  const [logActionFilter, setLogActionFilter] = useState('All')
  const [logModuleFilter, setLogModuleFilter] = useState('All')
  const [logStatusFilter, setLogStatusFilter] = useState('All')
  const [logsPerPage,     setLogsPerPage]     = useState(10)
  const [logPage,         setLogPage]         = useState(1)

  const logActions  = ['All', 'Login', 'Add Record', 'Edit Record', 'Delete Record', 'Export', 'Add User', 'View Record']
  const logModules  = ['All', 'System', 'Applicants', 'Employers', 'OFW Services', 'Skills Training', 'Reports', 'User Management']
  const logStatuses = ['All', 'Success', 'Failed']

  const filteredLogs = useMemo(() => mockActivityLogs.filter(log => {
    const matchSearch = logSearch === '' || log.user.toLowerCase().includes(logSearch.toLowerCase()) || log.details.toLowerCase().includes(logSearch.toLowerCase())
    const matchAction = logActionFilter === 'All' || log.action === logActionFilter
    const matchModule = logModuleFilter === 'All' || log.module === logModuleFilter
    const matchStatus = logStatusFilter === 'All' || log.status === logStatusFilter
    return matchSearch && matchAction && matchModule && matchStatus
  }), [logSearch, logActionFilter, logModuleFilter, logStatusFilter])

  const totalLogPages  = Math.max(1, Math.ceil(filteredLogs.length / logsPerPage))
  const paginatedLogs  = filteredLogs.slice((logPage - 1) * logsPerPage, logPage * logsPerPage)

  // ── Recycle Bin ──────────────────────────────────────────────────────────
  const [localRecycleBin,    setLocalRecycleBin]    = useState<RecycleBinItem[]>(initialRecycleBin)
  const recycleBin    = externalRecycleBin    ?? localRecycleBin
  const setRecycleBin = externalSetRecycleBin ?? setLocalRecycleBin

  const [binPerPage,      setBinPerPage]      = useState(10)
  const [binPage,         setBinPage]         = useState(1)
  const [binModuleFilter, setBinModuleFilter] = useState('All')
  const [binSearch,       setBinSearch]       = useState('')

  const binModules = ['All', 'Applicants', 'Employers', 'OFW Services', 'Skills Training', 'Programs']

  const filteredBin = useMemo(() => recycleBin.filter(item => {
    const matchModule = binModuleFilter === 'All' || item.module === binModuleFilter
    const matchSearch = binSearch === '' || item.name.toLowerCase().includes(binSearch.toLowerCase()) || item.description.toLowerCase().includes(binSearch.toLowerCase())
    return matchModule && matchSearch
  }), [recycleBin, binModuleFilter, binSearch])

  const totalBinPages  = Math.max(1, Math.ceil(filteredBin.length / binPerPage))
  const paginatedBin   = filteredBin.slice((binPage - 1) * binPerPage, binPage * binPerPage)
  const expiringCount  = recycleBin.filter(i => getDaysRemaining(i.deletedAt) <= 7).length

  // Reset pages on filter change
  useEffect(() => { setUserPage(1) }, [userSearch, userRoleFilter, userStatusFilter])
  useEffect(() => { setLogPage(1) },  [logSearch, logActionFilter, logModuleFilter, logStatusFilter])
  useEffect(() => { setBinPage(1) },  [binModuleFilter, binSearch])

  // ── Export ───────────────────────────────────────────────────────────────
  const handleExportLogs = () => {
    const rows = [
      ['Timestamp', 'User', 'Role', 'Action', 'Module', 'Details', 'Status'],
      ...filteredLogs.map(l => [l.timestamp, l.user, l.role, l.action, l.module, l.details, l.status]),
    ]
    const csv  = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href  = URL.createObjectURL(blob)
    link.download = `ActivityLogs_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportFormat,    setExportFormat]    = useState<'csv' | 'excel'>('excel')
  const [exportSelected,  setExportSelected]  = useState<string[]>([])

  const exportModules = [
    { id: 'applicants', label: 'Applicants',      description: 'Employment facilitation applicant records' },
    { id: 'employers',  label: 'Employers',        description: 'Registered employer profiles' },
    { id: 'vacancies',  label: 'Vacancies',        description: 'Job vacancy listings' },
    { id: 'referrals',  label: 'Referrals',        description: 'Applicant referral records' },
    { id: 'placements', label: 'Placements',       description: 'Employment placement records' },
    { id: 'cdsp',       label: 'CDSP',             description: 'Community development program records' },
    { id: 'gip',        label: 'GIP',              description: 'Government internship program records' },
    { id: 'spes',       label: 'SPES',             description: 'Special program for employment of students' },
    { id: 'livelihood', label: 'Livelihood',        description: 'Livelihood program records' },
    { id: 'skills',     label: 'Skills Training',  description: 'Skills training program records' },
    { id: 'ofw',        label: 'OFW Services',     description: 'Overseas Filipino worker records' },
    { id: 'users',      label: 'System Users',     description: 'User accounts and roles' },
  ]

  const toggleExportModule = (id: string) => {
    setExportSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  const buildModuleSheets = (): Record<string, { label: string; headers: string[]; rows: (string | number)[][] }> => {
    const readLS = (key: string) => { try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] } }
    const efApplicants = readLS('ef_applicants')
    const efEmployers  = readLS('ef_employers')
    const efVacancies  = readLS('ef_vacancies')
    const efReferrals  = readLS('ef_referrals')
    const efPlacements = readLS('ef_placements')

    return {
      applicants: {
        label: 'Applicants',
        headers: ['ID', 'Name', 'Gender', 'Age', 'Education', 'Skills', 'Employment Status', 'Contact Number', 'Email', 'Address', 'Civil Status'],
        rows: efApplicants.map((a: any) => [a.id, a.name, a.gender, a.age, a.education, a.skills, a.employmentStatus, a.contactNumber, a.email, a.address, a.civilStatus ?? '']),
      },
      employers: {
        label: 'Employers',
        headers: ['ID', 'Company Name', 'Industry', 'Contact Person', 'Contact Number', 'Email', 'Company Size', 'Status', 'Date Registered'],
        rows: efEmployers.map((e: any) => [e.id, e.companyName, e.industry, e.contactPerson, e.contactNumber, e.email, e.companySize, e.status, e.dateRegistered]),
      },
      vacancies: {
        label: 'Vacancies',
        headers: ['ID', 'Job Title', 'Employer', 'Industry', 'Vacancies Count', 'Job Type', 'Status', 'Salary', 'Description', 'Requirements'],
        rows: efVacancies.map((v: any) => [v.id, v.jobTitle, v.employer, v.industry, v.vacanciesCount, v.jobType, v.status, v.salary, v.description, v.requirements]),
      },
      referrals: {
        label: 'Referrals',
        headers: ['ID', 'Applicant Name', 'Job Title', 'Employer', 'Date Referred', 'Status'],
        rows: efReferrals.map((r: any) => [r.id, r.applicantName, r.jobTitle, r.employer, r.dateReferred, r.status]),
      },
      placements: {
        label: 'Placements',
        headers: ['ID', 'Applicant Name', 'Job Title', 'Employer', 'Date Hired', 'Employment Type', 'Status', 'Source'],
        rows: efPlacements.map((p: any) => [p.id, p.applicantName, p.jobTitle, p.employer, p.dateHired, p.employmentType, p.status, p.source]),
      },
      cdsp: {
        label: 'CDSP',
        headers: ['Name', 'Sex', 'Birthdate', 'Age', 'Contact Number', 'Email', 'City/Municipality', 'Service Availed', 'Status'],
        rows: cdspApplicants.map((a: any) => [`${a.lastName}, ${a.firstName} ${a.middleName ?? ''}`.trim(), a.sex, a.birthdate, a.age, a.contactNumber, a.email ?? '', a.cityMunicipality, a.serviceAvailed, a.status]),
      },
      gip: {
        label: 'GIP',
        headers: ['Name', 'Sex', 'Birthdate', 'Age', 'Contact Number', 'Assigned Office', 'Position', 'Start Date', 'End Date', 'Status'],
        rows: gipApplicants.map((a: any) => [`${a.lastName}, ${a.firstName} ${a.middleName ?? ''}`.trim(), a.sex, a.birthdate, a.age, a.contactNumber, a.assignedOffice ?? '', a.position ?? '', a.startDate ?? '', a.endDate ?? '', a.status]),
      },
      spes: {
        label: 'SPES',
        headers: ['Name', 'Sex', 'Birthdate', 'Age', 'Contact Number', 'School', 'Employer', 'Position', 'Work Start Date', 'Status'],
        rows: spesApplicants.map((a: any) => [`${a.lastName}, ${a.firstName} ${a.middleName ?? ''}`.trim(), a.sex, a.birthdate, a.age, a.contactNumber, a.schoolName ?? '', a.employer ?? '', a.position ?? '', a.workStartDate ?? '', a.status]),
      },
      livelihood: {
        label: 'Livelihood',
        headers: ['Name', 'Sex', 'Birthdate', 'Age', 'Contact Number', 'City/Municipality', 'Service', 'Status', 'Date Applied'],
        rows: [], // Livelihood uses local state — no shared context
      },
      skills: {
        label: 'Skills Training',
        headers: ['Name', 'Sex', 'Birthdate', 'Age', 'Contact Number', 'Address', 'Desired Qualification', 'Training Batch No', 'Status'],
        rows: skillsProfiles.map((p: any) => [`${p.lastName}, ${p.firstName} ${p.middleName ?? ''}`.trim(), p.sex, p.birthdate, p.age, p.contactNumber, p.address ?? '', (p.desiredQualification ?? []).join(', '), p.trainingBatchNo ?? '', p.status]),
      },
      ofw: {
        label: 'OFW Services',
        headers: ['Reference No', 'Name', 'Contact Number', 'Email', 'Municipality', 'Employment Status', 'Type of Request', 'Status', 'Date Filed'],
        rows: [],
      },
      users: {
        label: 'System Users',
        headers: ['ID', 'Username', 'Email', 'Role', 'Status', 'Last Login'],
        rows: users.map(u => [u.id, u.username, u.email, u.role, u.status, u.lastLogin]),
      },
    }
  }

  const handleExportConfirm = () => {
    if (exportSelected.length === 0) return
    const date   = new Date().toISOString().split('T')[0]
    const sheets = buildModuleSheets()

    if (exportFormat === 'excel') {
      const wb = XLSX.utils.book_new()
      exportSelected.forEach(id => {
        const { label, headers, rows } = sheets[id]
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        ws['!cols'] = headers.map((h, i) => ({ wch: Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length), 10) }))
        XLSX.utils.book_append_sheet(wb, ws, label.substring(0, 31))
      })
      XLSX.writeFile(wb, `PESO_Export_${date}.xlsx`)
    } else {
      const csvParts = exportSelected.map(id => {
        const { label, headers, rows } = sheets[id]
        const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
        const lines  = [[...headers].map(escape).join(','), ...rows.map(r => r.map(escape).join(','))]
        return `${label}\n${lines.join('\n')}`
      })
      const blob = new Blob([csvParts.join('\n\n')], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href     = url
      a.download = `PESO_Export_${date}.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    }

    setExportModalOpen(false)
    setExportSelected([])
  }

  // ── Recycle Bin handlers ─────────────────────────────────────────────────
  const handleRestoreItem = (item: RecycleBinItem) => {
    setConfirmModal({
      isOpen: true, type: 'confirm', title: 'Restore Record',
      message: `Restore "${item.name}" back to ${item.module}?\n\nThis record will be fully accessible again.`,
      confirmText: 'Yes, Restore', cancelText: 'Cancel',
      onConfirm: () => {
        setRecycleBin(prev => prev.filter(i => i.id !== item.id))
        setConfirmModal({ isOpen: true, type: 'success', title: 'Record Restored', message: `"${item.name}" has been successfully restored to ${item.module}.`, onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) })
      },
    })
  }

  const handlePermanentDelete = (item: RecycleBinItem) => {
    setConfirmModal({
      isOpen: true, type: 'confirm', title: 'Permanently Delete',
      message: `Permanently delete "${item.name}"?\n\nThis action CANNOT be undone. The record will be lost forever.`,
      confirmText: 'Yes, Delete Permanently', cancelText: 'Cancel',
      onConfirm: () => {
        setRecycleBin(prev => prev.filter(i => i.id !== item.id))
        setConfirmModal({ isOpen: true, type: 'success', title: 'Permanently Deleted', message: `"${item.name}" has been permanently deleted.`, onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) })
      },
    })
  }

  const handleEmptyBin = () => {
    if (recycleBin.length === 0) return
    setConfirmModal({
      isOpen: true, type: 'confirm', title: 'Empty Recycle Bin',
      message: `Permanently delete all ${recycleBin.length} item(s) in the recycle bin?\n\nThis action CANNOT be undone.`,
      confirmText: 'Yes, Empty Bin', cancelText: 'Cancel',
      onConfirm: () => {
        setRecycleBin([])
        setConfirmModal({ isOpen: true, type: 'success', title: 'Bin Emptied', message: 'All items in the recycle bin have been permanently deleted.', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) })
      },
    })
  }

  const handleBackupDatabase = () => {
    setConfirmModal({
      isOpen: true, type: 'confirm', title: 'Backup Database',
      message: 'This will create a secure backup of the entire system database. Do you want to proceed?',
      confirmText: 'Yes, Backup Now', cancelText: 'Cancel',
      onConfirm: () => {
        setConfirmModal({ isOpen: true, type: 'success', title: 'Backup Successful', message: 'Database backup created successfully!\n\nBackup file: PESO_DB_Backup_2026-06-20.sql', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) })
      },
    })
  }

  const handleClearCache = () => {
    setConfirmModal({
      isOpen: true, type: 'confirm', title: 'Clear Cache',
      message: 'This will clear all cached data which may temporarily affect system performance.\n\nAre you sure you want to proceed?',
      confirmText: 'Yes, Clear Cache', cancelText: 'Cancel',
      onConfirm: () => {
        setConfirmModal({ isOpen: true, type: 'success', title: 'Cache Cleared', message: 'System cache has been cleared successfully!\n\nThe system will now rebuild the cache as needed.', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) })
      },
    })
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <span className="text-xl font-bold" style={{ color: '#111827' }}>Security & User Management</span>
        </div>
        {activeTab === 'users' && (
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-[#0077BE] text-white rounded-lg hover:bg-[#006699] transition-colors"
          >
            <UserPlus size={20} />
            Add User
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-md mb-6">
        <div className="border-b border-gray-200">
          <div className="flex gap-2 px-6">
            {(['users', 'data', 'logs'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-4 font-medium transition-colors border-b-2 ${
                  activeTab === tab || (tab === 'logs' && activeTab === 'bin')
                    ? 'border-[#0077BE] text-[#0077BE]'
                    : 'border-transparent text-gray-600 hover:text-gray-800'
                }`}
              >
                {tab === 'users' ? 'System Users' : tab === 'data' ? 'Data Management' : 'Activity Logs'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── System Users Tab ── */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-gray-800 m-0">System Users</h3>
            <span className="text-sm text-gray-400">{filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''} found</span>
          </div>

          {/* Filter bar */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, username, or email..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent outline-none bg-white text-gray-900 placeholder:text-gray-900"
              />
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

          {/* Table */}
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
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400 text-sm">No users match your search or filters.</td>
                </tr>
              ) : paginatedUsers.map(user => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-800 font-medium whitespace-nowrap">{user.firstName} {user.lastName}</td>
                  <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{user.username}</td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${user.role === 'Administrator' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-sm ${user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">{user.lastLogin}</td>
                  <td className="px-6 py-4 text-gray-600">
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
                      <button onClick={() => handleEditUser(user)} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Users pagination */}
          <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Show</span>
              <select value={usersPerPage} onChange={e => { setUsersPerPage(Number(e.target.value)); setUserPage(1) }} className="px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0077BE] outline-none bg-white">
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
              <span className="text-sm text-gray-500">per page</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setUserPage(p => Math.max(1, p - 1))} disabled={userPage === 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronLeft size={16} />
              </button>
              <span className="text-sm text-[#0077BE] font-medium">
                {(userPage - 1) * usersPerPage + 1}–{Math.min(userPage * usersPerPage, filteredUsers.length)} of {filteredUsers.length}
              </span>
              <button onClick={() => setUserPage(p => Math.min(totalUserPages, p + 1))} disabled={userPage === totalUserPages} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed">
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Data Management Tab ── */}
      {activeTab === 'data' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="mb-6">
              <h3 className="text-gray-800 m-0 mb-1">Data Management</h3>
              <p className="text-gray-600 text-sm">Manage system data, backups, and performance</p>
            </div>
            <div className="grid grid-cols-3 gap-6">
              {/* Backup */}
              <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex flex-col h-full">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#0077BE] to-[#006699] rounded-xl flex items-center justify-center mb-4 shadow-md">
                    <Database size={28} className="text-white" />
                  </div>
                  <h4 className="text-gray-800 mb-2">Backup Database</h4>
                  <p className="text-gray-600 text-sm mb-4 flex-grow">Create a secure backup of the system database</p>
                  <button onClick={handleBackupDatabase} className="w-full px-4 py-2.5 bg-[#0077BE] text-white rounded-lg hover:bg-[#006699] transition-colors font-medium shadow-sm hover:shadow-md">
                    Backup Now
                  </button>
                </div>
              </div>
              {/* Export */}
              <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex flex-col h-full">
                  <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-md">
                    <Download size={28} className="text-white" />
                  </div>
                  <h4 className="text-gray-800 mb-2">Export Data</h4>
                  <p className="text-gray-600 text-sm mb-4 flex-grow">Export system data as CSV or Excel</p>
                  <button onClick={() => { setExportSelected([]); setExportFormat('excel'); setExportModalOpen(true) }} className="w-full px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-sm hover:shadow-md">
                    Export Data
                  </button>
                </div>
              </div>
              {/* Clear Cache */}
              <div className="bg-gradient-to-br from-red-50 to-white border border-red-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
                <div className="flex flex-col h-full">
                  <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-4 shadow-md">
                    <RefreshCw size={28} className="text-white" />
                  </div>
                  <h4 className="text-gray-800 mb-2">Clear Cache</h4>
                  <p className="text-gray-600 text-sm mb-4 flex-grow">Clear cached data to improve performance</p>
                  <button onClick={handleClearCache} className="w-full px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium shadow-sm hover:shadow-md">
                    Clear Cache
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Activity Logs Tab ── */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-gray-800 m-0 mb-0.5">Activity Logs</h3>
              <p className="text-gray-500 text-sm m-0">{filteredLogs.length} record{filteredLogs.length !== 1 ? 's' : ''} found</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setActiveTab('bin')} className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 transition-colors text-sm">
                <Trash size={15} />
                Recycle Bin
                {recycleBin.length > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs ${expiringCount > 0 ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
                    {recycleBin.length}
                  </span>
                )}
              </button>
              <button onClick={handleExportLogs} className="flex items-center gap-2 px-4 py-2 bg-[#0077BE] text-white rounded-lg hover:bg-[#006699] transition-colors text-sm">
                <Download size={16} />
                Export CSV
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search user or details..." value={logSearch} onChange={e => setLogSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent outline-none bg-white text-gray-900 placeholder:text-gray-900" />
            </div>
            <div className="relative">
              <select value={logActionFilter} onChange={e => setLogActionFilter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] outline-none bg-white text-gray-700 cursor-pointer">
                {logActions.map(a => <option key={a} value={a}>{a === 'All' ? 'All Actions' : a}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={logModuleFilter} onChange={e => setLogModuleFilter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] outline-none bg-white text-gray-700 cursor-pointer">
                {logModules.map(m => <option key={m} value={m}>{m === 'All' ? 'All Modules' : m}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
            <div className="relative">
              <select value={logStatusFilter} onChange={e => setLogStatusFilter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] outline-none bg-white text-gray-700 cursor-pointer">
                {logStatuses.map(s => <option key={s} value={s}>{s === 'All' ? 'All Statuses' : s}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">Timestamp</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">User</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">Action</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">Module</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500">Details</th>
                  <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length > 0 ? paginatedLogs.map(log => (
                  <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{log.timestamp}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-800">{log.user}</span>
                        <span className={`text-xs ${log.role === 'Administrator' ? 'text-purple-500' : 'text-blue-400'}`}>{log.role}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        log.action === 'Login'         ? 'bg-gray-100 text-gray-600' :
                        log.action === 'Add Record' || log.action === 'Add User' ? 'bg-green-50 text-green-700' :
                        log.action === 'Edit Record'   ? 'bg-blue-50 text-blue-700' :
                        log.action === 'Delete Record' ? 'bg-red-50 text-red-700' :
                        log.action === 'Export'        ? 'bg-purple-50 text-purple-700' :
                        'bg-gray-50 text-gray-600'
                      }`}>{log.action}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{log.module}</td>
                    <td className="px-4 py-3 text-xs text-gray-600 max-w-[240px]">{log.details}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded-full text-xs ${log.status === 'Success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400 text-sm">No activity logs match your filters.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Logs pagination */}
          {totalLogPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Show</span>
                <select value={logsPerPage} onChange={e => { setLogsPerPage(Number(e.target.value)); setLogPage(1) }} className="px-2 py-1 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#0077BE] outline-none bg-white">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-xs text-gray-500">per page</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setLogPage(p => Math.max(1, p - 1))} disabled={logPage === 1} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronLeft size={15} />
                </button>
                <span className="text-xs text-gray-500 px-2">{(logPage - 1) * logsPerPage + 1}–{Math.min(logPage * logsPerPage, filteredLogs.length)} of {filteredLogs.length}</span>
                <button onClick={() => setLogPage(p => Math.min(totalLogPages, p + 1))} disabled={logPage === totalLogPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Recycle Bin Sub-tab ── */}
      {activeTab === 'bin' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setActiveTab('logs')} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
                <ChevronLeft size={16} />
                Back to Logs
              </button>
              <span className="text-gray-300">|</span>
              <div>
                <h3 className="text-gray-800 m-0 mb-0.5 flex items-center gap-2">
                  <Trash size={18} className="text-gray-500" /> Recycle Bin
                </h3>
                <p className="text-gray-500 text-sm m-0">{recycleBin.length} item{recycleBin.length !== 1 ? 's' : ''} · Auto-deleted after 30 days</p>
              </div>
            </div>
            <button onClick={handleEmptyBin} disabled={recycleBin.length === 0} className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed">
              <Trash size={16} />
              Empty Bin
            </button>
          </div>

          {expiringCount > 0 && (
            <div className="mx-6 mt-4 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
              <AlertTriangle size={18} className="text-amber-500 flex-shrink-0" />
              <p className="text-sm text-amber-700 m-0">
                <span className="font-medium">{expiringCount} item{expiringCount !== 1 ? 's' : ''}</span> will be permanently deleted within 7 days. Restore them now if needed.
              </p>
            </div>
          )}

          {/* Filters */}
          <div className="px-6 py-4 flex flex-wrap gap-3 items-center border-b border-gray-100 bg-gray-50 mt-0">
            <div className="relative flex-1 min-w-[200px]">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" placeholder="Search deleted records..." value={binSearch} onChange={e => setBinSearch(e.target.value)} className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent outline-none bg-white text-gray-900 placeholder:text-gray-900" />
            </div>
            <div className="relative">
              <select value={binModuleFilter} onChange={e => setBinModuleFilter(e.target.value)} className="appearance-none pl-3 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] outline-none bg-white text-gray-700 cursor-pointer">
                {binModules.map(m => <option key={m} value={m}>{m === 'All' ? 'All Modules' : m}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>
          </div>

          {filteredBin.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <Trash size={48} className="mb-4 text-gray-300" />
              <p className="text-sm">{recycleBin.length === 0 ? 'The recycle bin is empty.' : 'No records match your filters.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs text-gray-500">Record Name</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">Module</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500">Description</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">Deleted By</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">Deleted On</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">Expires In</th>
                    <th className="px-4 py-3 text-left text-xs text-gray-500 whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBin.map(item => {
                    const daysLeft  = getDaysRemaining(item.deletedAt)
                    const isUrgent  = daysLeft <= 3
                    const isWarning = daysLeft <= 7 && daysLeft > 3
                    return (
                      <tr key={item.id} className={`border-b border-gray-100 hover:bg-gray-50 ${isUrgent ? 'bg-red-50/40' : isWarning ? 'bg-amber-50/40' : ''}`}>
                        <td className="px-4 py-3"><span className="text-sm text-gray-800">{item.name}</span></td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            item.module === 'Applicants'      ? 'bg-blue-50 text-blue-700' :
                            item.module === 'Employers'       ? 'bg-purple-50 text-purple-700' :
                            item.module === 'OFW Services'    ? 'bg-orange-50 text-orange-700' :
                            item.module === 'Skills Training' ? 'bg-green-50 text-green-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>{item.module}</span>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 max-w-[220px]">{item.description}</td>
                        <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{item.deletedBy}</td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{item.deletedAt}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className={`flex items-center gap-1.5 text-xs font-medium ${isUrgent ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-gray-500'}`}>
                            <Clock size={13} />
                            {daysLeft === 0 ? 'Expires today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
                          </div>
                          <div className="mt-1 h-1.5 w-20 rounded-full bg-gray-200 overflow-hidden">
                            <div className={`h-full rounded-full ${isUrgent ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-green-400'}`} style={{ width: `${(daysLeft / 30) * 100}%` }} />
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button onClick={() => handleRestoreItem(item)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors">
                              <RotateCcw size={13} />
                              Restore
                            </button>
                            <button onClick={() => handlePermanentDelete(item)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                              <Trash2 size={13} />
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {filteredBin.length > 0 && (
            <div className="px-6 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Show</span>
                <select value={binPerPage} onChange={e => { setBinPerPage(Number(e.target.value)); setBinPage(1) }} className="px-2 py-1 border border-gray-300 rounded-lg text-xs focus:ring-2 focus:ring-[#0077BE] outline-none bg-white">
                  <option value={10}>10</option>
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                </select>
                <span className="text-xs text-gray-500">per page</span>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setBinPage(p => Math.max(1, p - 1))} disabled={binPage === 1} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronLeft size={15} />
                </button>
                <span className="text-xs text-gray-500 px-2">{(binPage - 1) * binPerPage + 1}–{Math.min(binPage * binPerPage, filteredBin.length)} of {filteredBin.length}</span>
                <button onClick={() => setBinPage(p => Math.min(totalBinPages, p + 1))} disabled={binPage === totalBinPages} className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {showAddModal && (
        <UserFormModal
          isEdit={false}
          formData={formData}
          selectedPermissions={selectedPermissions}
          permissionGroups={permissionGroups}
          onClose={() => setShowAddModal(false)}
          onSubmit={handleAddUserClick}
          onFormChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
          onRoleChange={handleRoleChange}
          onSetGroupAccess={handleSetGroupAccess}
        />
      )}
      {showEditModal && (
        <UserFormModal
          isEdit={true}
          formData={formData}
          selectedPermissions={selectedPermissions}
          permissionGroups={permissionGroups}
          onClose={() => setShowEditModal(false)}
          onSubmit={handleSaveEdit}
          onFormChange={(field, value) => setFormData(prev => ({ ...prev, [field]: value }))}
          onRoleChange={handleRoleChange}
          onSetGroupAccess={handleSetGroupAccess}
        />
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        type={confirmModal.type}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />

      {/* Export Data Modal */}
      {exportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Download size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-gray-800 font-semibold m-0">Export Data</h3>
                  <p className="text-gray-500 text-xs mt-0.5 m-0">Select the modules and format to export</p>
                </div>
              </div>
              <button onClick={() => setExportModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {/* Format */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Export Format</p>
                <div className="flex gap-3">
                  {(['excel', 'csv'] as const).map(fmt => (
                    <button key={fmt} onClick={() => setExportFormat(fmt)} className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${exportFormat === fmt ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                      {fmt === 'excel' ? 'Excel (.xlsx)' : 'CSV (.csv)'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Modules */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700 m-0">Select Modules</p>
                  <div className="flex gap-3 text-xs">
                    <button onClick={() => setExportSelected(exportModules.map(m => m.id))} className="text-blue-500 hover:underline">Select all</button>
                    <button onClick={() => setExportSelected([])} className="text-gray-400 hover:underline">Clear</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {exportModules.map(mod => {
                    const checked = exportSelected.includes(mod.id)
                    return (
                      <button key={mod.id} onClick={() => toggleExportModule(mod.id)} className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${checked ? 'bg-blue-50 border-blue-300' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <div className={`w-4 h-4 mt-0.5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                          {checked && (
                            <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10">
                              <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          )}
                        </div>
                        <div>
                          <p className={`text-sm font-medium m-0 ${checked ? 'text-blue-700' : 'text-gray-700'}`}>{mod.label}</p>
                          <p className="text-xs text-gray-400 mt-0.5 m-0">{mod.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500 m-0">{exportSelected.length === 0 ? 'No modules selected' : `${exportSelected.length} module${exportSelected.length > 1 ? 's' : ''} selected`}</p>
              <div className="flex gap-3">
                <button onClick={() => setExportModalOpen(false)} className="px-5 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm">Cancel</button>
                <button onClick={handleExportConfirm} disabled={exportSelected.length === 0} className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">Export</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
