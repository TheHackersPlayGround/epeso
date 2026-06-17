import { useState, useRef } from 'react'
import Swal from 'sweetalert2'
import {
  PlusCircle, Tag, FolderOpen, ClipboardList, MoreHorizontal,
  Edit2, Trash2, PlayCircle, CheckCircle, RefreshCw, ArrowLeft,
  Search, Users, Plus, AlertCircle,
} from 'lucide-react'
import { useProgramActivities } from '../../contexts/ProgramActivitiesContext'
import type { ProgramActivity } from '../../contexts/ProgramActivitiesContext'
import { useCDSP } from '../../contexts/CDSPContext'

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_SERVICES = [
  'Career Coaching',
  'Pre-Employment Coaching',
  'Labor Employment for Graduating Students',
]

type ActivityStatus = 'Planned' | 'Ongoing' | 'Completed'
type Action =
  | ''
  | 'add_activity'
  | 'edit_activity'
  | 'view_activity'
  | 'view_activities'
  | 'view_participants'
  | 'add_service'
  | 'view_services'

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600 text-sm placeholder:text-gray-900'
const labelCls = 'block text-sm text-gray-700 mb-1.5'

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ActivityStatus, string> = {
  Planned:   'bg-yellow-100 text-yellow-700',
  Ongoing:   'bg-green-100 text-green-700',
  Completed: 'bg-blue-100 text-blue-700',
}

function StatusBadge({ status }: { status: ActivityStatus }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}

// ─── Confirm modal ────────────────────────────────────────────────────────────

interface ConfirmModalProps {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  destructive?: boolean
  onConfirm: () => void
  onCancel: () => void
}

function ConfirmModal({ open, title, message, confirmLabel = 'Confirm', destructive, onConfirm, onCancel }: ConfirmModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <div className="flex justify-center mb-4">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${destructive ? 'bg-red-100' : 'bg-blue-100'}`}>
            <AlertCircle size={28} className={destructive ? 'text-red-500' : 'text-brand-blue'} />
          </div>
        </div>
        <h3 className="text-center text-gray-800 mb-2">{title}</h3>
        <p className="text-center text-gray-500 text-sm mb-6 whitespace-pre-line">{message}</p>
        <div className="flex gap-3 justify-center">
          <button onClick={onCancel} className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm">
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-5 py-2 text-white rounded-lg transition-colors text-sm ${destructive ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-blue hover:bg-brand-blue-dark'}`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Blank form data ──────────────────────────────────────────────────────────

const blankForm = {
  title: '',
  description: '',
  date: '',
  location: '',
  facilitator: '',
  counselor: '',
  sessionDuration: '',
  participants: '',
  startDate: '',
  endDate: '',
  status: 'Planned' as ActivityStatus,
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CDSPMaintenanceForm() {
  const { activities, setActivities } = useProgramActivities()
  const { applicants: cdspApplicants, setApplicants } = useCDSP()

  // Navigation
  const [action, setAction] = useState<Action>('')
  const [selectedActivity, setSelectedActivity] = useState<ProgramActivity | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Services list (user-editable)
  const [services, setServices] = useState<string[]>(DEFAULT_SERVICES)
  const [newServiceName, setNewServiceName] = useState('')
  const [serviceDeleteConfirm, setServiceDeleteConfirm] = useState<string | null>(null)

  // Activity form
  const [selectedService, setSelectedService] = useState('')
  const [formData, setFormData] = useState(blankForm)

  // View Activities filters
  const [filterService, setFilterService] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  // Ellipsis menu
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)

  // Confirm modals
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [statusConfirm, setStatusConfirm] = useState<{
    activity: ProgramActivity
    nextStatus: ActivityStatus
    label: string
  } | null>(null)

  const newServiceRef = useRef<HTMLInputElement>(null)

  // ── Derived data ─────────────────────────────────────────────────────────

  const cdspActivities = activities.filter(
    a => a.program === 'CDSP' || DEFAULT_SERVICES.includes(a.service)
  )

  const filteredActivities = cdspActivities.filter(a => {
    const matchesService = filterService === 'All' || a.service === filterService
    const matchesStatus  = filterStatus  === 'All' || a.status  === filterStatus
    const matchesSearch  = !searchQuery  ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.service.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesService && matchesStatus && matchesSearch
  })

  // ── Helpers ───────────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData(blankForm)
    setSelectedService('')
    setEditingId(null)
    setSelectedActivity(null)
  }

  const goToList = () => {
    resetForm()
    setAction('view_activities')
  }

  const goHome = () => {
    resetForm()
    setAction('')
    setFilterService('All')
    setFilterStatus('All')
    setSearchQuery('')
  }

  const fillFormFromActivity = (a: ProgramActivity) => {
    setSelectedService(a.service)
    setFormData({
      title:           a.title,
      description:     a.description     ?? '',
      date:            a.date,
      location:        a.location,
      facilitator:     a.facilitator     ?? '',
      counselor:       a.counselor       ?? '',
      sessionDuration: a.sessionDuration ?? '',
      participants:    a.participants != null ? String(a.participants) : '',
      startDate:       a.startDate       ?? '',
      endDate:         a.endDate         ?? '',
      status:          a.status,
    })
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const handleSave = () => {
    if (!selectedService) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please select a service type.', confirmButtonColor: '#0077BE' }); return }
    if (!formData.title.trim()) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter an activity title.', confirmButtonColor: '#0077BE' }); return }

    const payload: ProgramActivity = {
      id:              editingId ?? Date.now(),
      program:         'CDSP',
      service:         selectedService,
      title:           formData.title.trim(),
      description:     formData.description.trim()  || undefined,
      date:            formData.date,
      location:        formData.location,
      facilitator:     formData.facilitator          || undefined,
      counselor:       formData.counselor            || undefined,
      sessionDuration: formData.sessionDuration      || undefined,
      participants:    parseInt(formData.participants) || undefined,
      startDate:       formData.startDate            || undefined,
      endDate:         formData.endDate              || undefined,
      status:          formData.status,
    }

    if (editingId !== null) {
      setActivities(prev => prev.map(a => a.id === editingId ? payload : a))
      Swal.fire({ icon: 'success', title: 'Activity Updated', text: 'The activity has been updated.', confirmButtonColor: '#0077BE', timer: 2000, timerProgressBar: true })
    } else {
      setActivities(prev => [...prev, payload])
      Swal.fire({ icon: 'success', title: 'Activity Added', text: 'New CDSP activity has been saved.', confirmButtonColor: '#0077BE', timer: 2000, timerProgressBar: true })
    }

    goToList()
  }

  const handleDelete = () => {
    if (deleteConfirm === null) return
    setActivities(prev => prev.filter(a => a.id !== deleteConfirm))
    setDeleteConfirm(null)
  }

  const handleStatusChange = () => {
    if (!statusConfirm) return
    const { activity, nextStatus } = statusConfirm
    setActivities(prev =>
      prev.map(a => a.id === activity.id ? { ...a, status: nextStatus } : a)
    )
    if (nextStatus === 'Completed') {
      setApplicants(prev =>
        prev.map(a => a.assignedActivity === activity.title ? { ...a, status: 'Inactive' as const } : a)
      )
    }
    Swal.fire({ icon: 'success', title: 'Status Updated', text: `Activity is now ${nextStatus}.`, confirmButtonColor: '#0077BE', timer: 2000, timerProgressBar: true })
    setStatusConfirm(null)
  }

  const handleAddService = () => {
    const name = newServiceName.trim()
    if (!name) return
    if (services.includes(name)) {
      Swal.fire({ icon: 'warning', title: 'Duplicate', text: 'This service already exists.', confirmButtonColor: '#0077BE' })
      return
    }
    setServices(prev => [...prev, name])
    setNewServiceName('')
    newServiceRef.current?.focus()
  }

  const handleDeleteService = () => {
    if (!serviceDeleteConfirm) return
    setServices(prev => prev.filter(s => s !== serviceDeleteConfirm))
    setServiceDeleteConfirm(null)
  }

  // ── Render: landing ───────────────────────────────────────────────────────

  const renderLanding = () => {
    const cards: { key: Action; icon: React.ReactNode; label: string; desc: string }[] = [
      { key: 'add_activity',   icon: <PlusCircle  size={32} />, label: 'Add Activity',    desc: 'Create a new CDSP activity' },
      { key: 'add_service',    icon: <Tag         size={32} />, label: 'Add Service',     desc: 'Add a new service type' },
      { key: 'view_activities',icon: <FolderOpen  size={32} />, label: 'View Activities', desc: 'Browse all CDSP activities' },
      { key: 'view_services',  icon: <ClipboardList size={32}/>, label: 'View Services',  desc: 'Manage service types' },
    ]

    return (
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <p className="text-gray-500 mb-5">
          Select an action for <span className="text-brand-blue font-medium">CDSP</span>
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {cards.map(card => (
            <button
              key={card.key}
              onClick={() => setAction(card.key)}
              className={`flex flex-col items-center gap-4 py-8 px-4 rounded-2xl border-2 transition-all ${
                action === card.key
                  ? 'border-brand-blue bg-blue-50 text-brand-blue'
                  : 'border-gray-200 hover:border-brand-blue hover:bg-blue-50 text-gray-600 hover:text-brand-blue'
              }`}
            >
              <div className={`p-4 rounded-2xl ${action === card.key ? 'bg-brand-blue text-white' : 'bg-gray-100'}`}>
                {card.icon}
              </div>
              <div className="text-center">
                <p className="font-medium">{card.label}</p>
                <p className="text-xs text-gray-400 mt-1">{card.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  // ── Render: activity form (add / edit / view) ─────────────────────────────

  const renderActivityForm = (mode: 'add' | 'edit' | 'view') => {
    const isView = mode === 'view'
    const heading =
      mode === 'view' ? 'View Activity Details' :
      mode === 'edit' ? 'Edit Activity' : 'Add New Activity'

    return (
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-brand-blue px-6 py-4">
          <div className="flex items-center gap-3">
            {(mode === 'edit' || mode === 'view') && (
              <button onClick={goToList} className="p-1 text-white/80 hover:text-white transition-colors">
                <ArrowLeft size={20} />
              </button>
            )}
            <div>
              <h3 className="text-white m-0">{heading}</h3>
              <p className="text-white/70 text-sm mt-0.5">CDSP Program</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Service selector */}
          <div className="mb-6">
            <label className={labelCls}>
              Service Type <span className="text-red-500">*</span>
            </label>
            {services.length === 1 ? (
              <div className="px-4 py-2.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm">
                {services[0]}
              </div>
            ) : (
              <select
                value={selectedService}
                onChange={e => setSelectedService(e.target.value)}
                disabled={isView || mode === 'edit'}
                className={inputCls + ' bg-white'}
              >
                <option value="">Select Service Type</option>
                {services.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
          </div>

          {/* Activity fields */}
          {(selectedService || mode !== 'add') && (
            <div className="border-t pt-6 space-y-5">
              {/* Title + Description */}
              <div>
                <label className={labelCls}>Activity Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.title}
                  readOnly={isView}
                  onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                  className={inputCls}
                  placeholder="e.g. Career Coaching Workshop – Batch 1"
                />
              </div>
              <div>
                <label className={labelCls}>Description</label>
                <textarea
                  value={formData.description}
                  readOnly={isView}
                  onChange={e => setFormData(p => ({ ...p, description: e.target.value }))}
                  className={inputCls + ' resize-none'}
                  rows={3}
                  placeholder="Enter activity description"
                />
              </div>

              {/* Date + Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Date</label>
                  <input type="date" value={formData.date} readOnly={isView}
                    onChange={e => setFormData(p => ({ ...p, date: e.target.value }))}
                    className={inputCls} />
                </div>
                <div>
                  <label className={labelCls}>Location / Venue</label>
                  <input type="text" value={formData.location} readOnly={isView}
                    onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                    className={inputCls} placeholder="Enter location" />
                </div>
              </div>

              {/* Facilitator + Participants */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Person In Charge / Facilitator</label>
                  <input type="text" value={formData.facilitator} readOnly={isView}
                    onChange={e => setFormData(p => ({ ...p, facilitator: e.target.value }))}
                    className={inputCls} placeholder="Enter facilitator name" />
                </div>
                <div>
                  <label className={labelCls}>Number of Participants</label>
                  <input type="number" min="0" value={formData.participants} readOnly={isView}
                    onChange={e => setFormData(p => ({ ...p, participants: e.target.value }))}
                    className={inputCls} placeholder="0" />
                </div>
              </div>

              {/* Status */}
              <div>
                <label className={labelCls}>Status</label>
                <div className="flex gap-6 mt-1">
                  {(['Planned', 'Ongoing', 'Completed'] as ActivityStatus[]).map(s => (
                    <label key={s} className={`flex items-center gap-2 ${isView ? 'cursor-default' : 'cursor-pointer'}`}>
                      <input
                        type="radio"
                        name="cdsp-status"
                        value={s}
                        checked={formData.status === s}
                        onChange={() => setFormData(p => ({ ...p, status: s }))}
                        disabled={isView}
                        className="w-4 h-4 text-brand-blue focus:ring-brand-blue disabled:cursor-default"
                      />
                      <span className="text-sm text-gray-700">{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Section divider: Counseling info */}
              <div className="border-t pt-5 mt-1">
                <p className="text-xs font-semibold text-brand-blue uppercase tracking-wider mb-4">
                  Additional Counseling / Session Information
                </p>

                {/* Counselor + Session Duration */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={labelCls}>Counselor / Career Advisor</label>
                    <input type="text" value={formData.counselor} readOnly={isView}
                      onChange={e => setFormData(p => ({ ...p, counselor: e.target.value }))}
                      className={inputCls} placeholder="Enter counselor name" />
                  </div>
                  <div>
                    <label className={labelCls}>Session Duration / No. of Sessions</label>
                    <input type="text" value={formData.sessionDuration} readOnly={isView}
                      onChange={e => setFormData(p => ({ ...p, sessionDuration: e.target.value }))}
                      className={inputCls} placeholder="e.g. 3 sessions, 1 hour each" />
                  </div>
                </div>

                {/* Start + End dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Start Date</label>
                    <input type="date" value={formData.startDate} readOnly={isView}
                      onChange={e => setFormData(p => ({ ...p, startDate: e.target.value }))}
                      className={inputCls} />
                  </div>
                  <div>
                    <label className={labelCls}>End Date</label>
                    <input type="date" value={formData.endDate} readOnly={isView}
                      onChange={e => setFormData(p => ({ ...p, endDate: e.target.value }))}
                      className={inputCls} />
                  </div>
                </div>
              </div>

              {/* Buttons */}
              <div className="flex justify-end gap-3 border-t pt-4 mt-2">
                <button
                  type="button"
                  onClick={mode === 'add' ? goHome : goToList}
                  className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  {mode === 'add' ? 'Cancel' : 'Back to Activities'}
                </button>
                {!isView && (
                  <button
                    onClick={handleSave}
                    className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors text-sm"
                  >
                    {mode === 'edit' ? 'Update Activity' : 'Save Activity'}
                  </button>
                )}
              </div>
            </div>
          )}

          {mode === 'add' && !selectedService && (
            <p className="text-gray-400 text-sm italic mt-2">Please select a service type to continue.</p>
          )}
        </div>
      </div>
    )
  }

  // ── Render: view activities ───────────────────────────────────────────────

  const renderViewActivities = () => (
    <>
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-5 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <select
            value={filterService}
            onChange={e => setFilterService(e.target.value)}
            className={inputCls + ' bg-white'}
          >
            <option value="All">All Services</option>
            {services.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className={inputCls + ' bg-white'}
          >
            <option value="All">All Status</option>
            <option value="Planned">Planned</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
          </select>
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by title or service..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className={inputCls + ' pl-9'}
            />
          </div>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        {/* Table header */}
        <div className="bg-brand-blue px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white m-0">CDSP Activities</h3>
            <p className="text-white/70 text-sm">{filteredActivities.length} activity(s) found</p>
          </div>
          <button
            onClick={() => { resetForm(); setAction('add_activity') }}
            className="flex items-center gap-2 px-4 py-2 bg-white text-brand-blue rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
          >
            <Plus size={15} /> Add Activity
          </button>
        </div>

        {/* Ellipsis menu portal */}
        {openMenuId !== null && menuPos !== null && (() => {
          const a = cdspActivities.find(x => x.id === openMenuId)
          if (!a) return null
          return (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
              <div
                style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
                className="w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1"
              >
                <button
                  onClick={() => { fillFormFromActivity(a); setSelectedActivity(a); setAction('view_activity'); setOpenMenuId(null) }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                >
                  <FolderOpen size={14} className="text-blue-500" />
                  View Details
                </button>
                <button
                  onClick={() => { setSelectedActivity(a); setAction('view_participants'); setOpenMenuId(null) }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                >
                  <Users size={14} className="text-gray-500" />
                  View Participants
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => { fillFormFromActivity(a); setEditingId(a.id); setAction('edit_activity'); setOpenMenuId(null) }}
                  className="w-full px-4 py-2.5 text-left text-sm text-brand-blue hover:bg-blue-50 flex items-center gap-2.5"
                >
                  <Edit2 size={14} className="text-blue-500" />
                  Edit
                </button>
                {a.status === 'Planned' && (
                  <button
                    onClick={() => { setStatusConfirm({ activity: a, nextStatus: 'Ongoing', label: 'Mark as Ongoing' }); setOpenMenuId(null) }}
                    className="w-full px-4 py-2.5 text-left text-sm text-brand-blue hover:bg-blue-50 flex items-center gap-2.5"
                  >
                    <PlayCircle size={14} className="text-blue-500" />
                    Mark as Ongoing
                  </button>
                )}
                {a.status === 'Ongoing' && (
                  <button
                    onClick={() => { setStatusConfirm({ activity: a, nextStatus: 'Completed', label: 'Mark as Completed' }); setOpenMenuId(null) }}
                    className="w-full px-4 py-2.5 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2.5"
                  >
                    <CheckCircle size={14} className="text-green-600" />
                    Mark as Completed
                  </button>
                )}
                {a.status === 'Completed' && (
                  <button
                    onClick={() => { setStatusConfirm({ activity: a, nextStatus: 'Planned', label: 'Reopen Activity' }); setOpenMenuId(null) }}
                    className="w-full px-4 py-2.5 text-left text-sm text-brand-blue hover:bg-blue-50 flex items-center gap-2.5"
                  >
                    <RefreshCw size={14} className="text-blue-500" />
                    Reopen Activity
                  </button>
                )}
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => { setDeleteConfirm(a.id); setOpenMenuId(null) }}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2.5"
                >
                  <Trash2 size={14} className="text-red-500" />
                  Delete
                </button>
              </div>
            </>
          )
        })()}

        {/* Empty state */}
        {filteredActivities.length === 0 ? (
          <div className="py-16 text-center">
            <FolderOpen size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">No CDSP activities found.</p>
            <button
              onClick={() => { resetForm(); setAction('add_activity') }}
              className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors text-sm"
            >
              Add First Activity
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Activity Title</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Service</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Date</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Location</th>
                  <th className="px-6 py-4 text-center text-sm text-gray-700 font-semibold">Participants</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Status</th>
                  <th className="px-6 py-4 w-16" />
                </tr>
              </thead>
              <tbody>
                {filteredActivities.map(a => (
                  <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <p className="font-medium text-gray-800 text-sm">{a.title}</p>
                      {a.description && (
                        <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{a.description}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-blue-50 text-brand-blue rounded-md text-xs font-medium">{a.service}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{a.date || '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-[160px]">
                      <span className="line-clamp-1">{a.location || '—'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 text-center">
                      {a.participants ?? '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={a.status} />
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={e => {
                          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                          const menuH = 240
                          const top = window.innerHeight - rect.bottom < menuH + 8
                            ? rect.top - menuH - 4
                            : rect.bottom + 4
                          setMenuPos({ top, right: window.innerWidth - rect.right })
                          setOpenMenuId(openMenuId === a.id ? null : a.id)
                        }}
                        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                      >
                        <MoreHorizontal size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  )

  // ── Render: view participants ─────────────────────────────────────────────

  const renderViewParticipants = () => {
    if (!selectedActivity) return null
    const participants = cdspApplicants.filter(a => a.assignedActivity === selectedActivity.title)
    const STATUS_COLORS_APPLICANT: Record<string, string> = {
      Active:    'bg-blue-100 text-blue-700',
      Inactive:  'bg-gray-100 text-gray-500',
      Completed: 'bg-green-100 text-green-700',
      Referred:  'bg-purple-100 text-purple-700',
      Dropped:   'bg-red-100 text-red-500',
    }

    return (
      <div>
        <div className="mb-4">
          <button
            onClick={goToList}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            <ArrowLeft size={16} /> Back to Activities
          </button>
        </div>

        {/* Header */}
        <div className="bg-brand-blue rounded-xl px-6 py-4 mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-white text-base font-semibold m-0">{selectedActivity.title}</h3>
            <p className="text-white/80 text-sm mt-0.5">
              {participants.length} participant{participants.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <StatusBadge status={selectedActivity.status} />
        </div>

        {participants.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
            <Users size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 text-sm">No participants assigned to this activity yet.</p>
            <p className="text-gray-400 text-xs mt-1">Assign applicants from the CDSP module.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-blue">
                  <th className="px-4 py-3 text-left text-white font-semibold">Full Name</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Service Availed</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Classification</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Contact</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((a, i) => (
                  <tr key={a.id} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {a.lastName}, {a.firstName} {a.middleName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.serviceAvailed || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {a.classification.slice(0, 2).join(', ')}
                      {a.classification.length > 2 && (
                        <span className="text-gray-400"> +{a.classification.length - 2}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{a.contactNumber || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS_APPLICANT[a.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {a.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    )
  }

  // ── Render: add service ───────────────────────────────────────────────────

  const renderAddService = () => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="bg-brand-blue px-6 py-4">
        <h3 className="text-white m-0">Add New Service</h3>
        <p className="text-white/70 text-sm">CDSP Program</p>
      </div>
      <div className="p-6">
        <p className="text-gray-600 text-sm mb-6">
          Add a new service type to the CDSP program. This service will be available when creating new activities.
        </p>
        <div className="max-w-lg">
          <label className={labelCls}>Service Name <span className="text-red-500">*</span></label>
          <div className="flex gap-3">
            <input
              ref={newServiceRef}
              type="text"
              value={newServiceName}
              onChange={e => setNewServiceName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddService()}
              placeholder="e.g. Career Workshop, Job Matching..."
              className={inputCls + ' flex-1'}
            />
            <button
              onClick={handleAddService}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors text-sm whitespace-nowrap"
            >
              <Plus size={16} /> Add Service
            </button>
          </div>
          <p className="text-gray-400 text-xs mt-1.5">Press Enter or click "Add Service" to save.</p>
        </div>

        {services.length > 0 && (
          <div className="mt-8">
            <h4 className="text-gray-700 text-sm font-semibold mb-3">Current Services in CDSP</h4>
            <div className="flex flex-wrap gap-2">
              {services.map(s => (
                <span key={s} className="inline-flex items-center gap-2 px-3 py-1.5 bg-blue-50 text-brand-blue border border-blue-200 rounded-lg text-sm">
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )

  // ── Render: view services ─────────────────────────────────────────────────

  const renderViewServices = () => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="bg-brand-blue px-6 py-4 flex items-center justify-between">
        <div>
          <h3 className="text-white m-0">CDSP Services</h3>
          <p className="text-white/70 text-sm">{services.length} service(s)</p>
        </div>
        <button
          onClick={() => setAction('add_service')}
          className="flex items-center gap-2 px-4 py-2 bg-white text-brand-blue rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
        >
          <Plus size={15} /> Add Service
        </button>
      </div>

      {services.length === 0 ? (
        <div className="py-16 text-center">
          <Tag size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">No services defined yet.</p>
          <button onClick={() => setAction('add_service')} className="mt-4 px-5 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors text-sm">
            Add First Service
          </button>
        </div>
      ) : (
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">#</th>
              <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Service Name</th>
              <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Projects Count</th>
              <th className="px-6 py-4 w-20" />
            </tr>
          </thead>
          <tbody>
            {services.map((svc, idx) => {
              const count = cdspActivities.filter(a => a.service === svc).length
              return (
                <tr key={svc} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm text-gray-400">{idx + 1}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      <span className="text-sm font-medium text-gray-800">{svc}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${count > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'}`}>
                      {count} project{count !== 1 ? 's' : ''}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <button
                      onClick={() => setServiceDeleteConfirm(svc)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove service"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-6 pt-2 pb-8">
      {/* Action cards — always visible unless viewing participants or activity detail/edit */}
      {action !== 'view_participants' && action !== 'view_activity' && action !== 'edit_activity' && renderLanding()}

      {/* Content area */}
      {action === '' && (
        <div className="bg-white rounded-xl shadow-md py-20 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen size={32} className="text-brand-blue" />
          </div>
          <h3 className="text-gray-700 mb-2 text-center">CDSP Program Maintenance</h3>
          <p className="text-gray-400 text-center px-8">
            Select an action above to manage activities and services for the CDSP program.
          </p>
        </div>
      )}

      {action === 'add_activity'    && renderActivityForm('add')}
      {action === 'edit_activity'   && renderActivityForm('edit')}
      {action === 'view_activity'   && renderActivityForm('view')}
      {action === 'view_activities' && renderViewActivities()}
      {action === 'view_participants' && renderViewParticipants()}
      {action === 'add_service'     && renderAddService()}
      {action === 'view_services'   && renderViewServices()}

      {/* Delete activity modal */}
      <ConfirmModal
        open={deleteConfirm !== null}
        title="Delete Activity"
        message="Are you sure you want to delete this activity? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Delete service modal */}
      <ConfirmModal
        open={serviceDeleteConfirm !== null}
        title="Remove Service"
        message={`Remove "${serviceDeleteConfirm}" from CDSP?\nExisting activities with this service will not be affected.`}
        confirmLabel="Remove"
        destructive
        onConfirm={handleDeleteService}
        onCancel={() => setServiceDeleteConfirm(null)}
      />

      {/* Status change modal */}
      {statusConfirm !== null && (() => {
        const { activity, nextStatus, label } = statusConfirm
        const steps: ActivityStatus[] = ['Planned', 'Ongoing', 'Completed']
        const curIdx  = steps.indexOf(activity.status)
        const nextIdx = steps.indexOf(nextStatus)
        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-2.5 rounded-full ${nextStatus === 'Completed' ? 'bg-green-100' : 'bg-blue-100'}`}>
                  {nextStatus === 'Completed'
                    ? <CheckCircle size={22} className="text-green-600" />
                    : nextStatus === 'Planned'
                    ? <RefreshCw   size={22} className="text-brand-blue" />
                    : <PlayCircle  size={22} className="text-brand-blue" />}
                </div>
                <h3 className="text-gray-800 m-0 text-lg">{label}</h3>
              </div>

              {/* Progress indicator */}
              <div className="flex items-center gap-2 mb-5 bg-gray-50 rounded-xl px-4 py-3">
                {steps.map((s, i) => {
                  const isCur  = s === activity.status
                  const isNext = s === nextStatus
                  const isPast = i < Math.min(curIdx, nextIdx)
                  const dotCls = isPast || isCur ? 'bg-blue-500' : isNext ? 'bg-brand-blue ring-2 ring-blue-200' : 'bg-gray-200'
                  const lblCls = isNext ? 'text-brand-blue font-semibold' : isCur ? 'text-blue-500 font-semibold' : isPast ? 'text-gray-400' : 'text-gray-300'
                  return (
                    <div key={s} className="flex items-center gap-2 flex-1">
                      <div className="flex flex-col items-center gap-1 flex-1">
                        <div className={`w-3 h-3 rounded-full transition-all ${dotCls}`} />
                        <span className={`text-xs whitespace-nowrap ${lblCls}`}>{s}</span>
                      </div>
                      {i < steps.length - 1 && (
                        <div className={`h-0.5 flex-1 mb-4 ${i < Math.max(curIdx, nextIdx) ? 'bg-blue-400' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  )
                })}
              </div>

              <p className="text-gray-600 text-sm mb-6">
                Change <span className="font-medium text-gray-800">{activity.title}</span> from{' '}
                <span className="font-medium text-blue-500">{activity.status}</span> to{' '}
                <span className={`font-medium ${nextStatus === 'Completed' ? 'text-green-600' : 'text-brand-blue'}`}>{nextStatus}</span>?
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setStatusConfirm(null)}
                  className="px-5 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusChange}
                  className={`px-5 py-2 text-white rounded-lg transition-colors text-sm ${
                    nextStatus === 'Completed' ? 'bg-green-600 hover:bg-green-700' : 'bg-brand-blue hover:bg-brand-blue-dark'
                  }`}
                >
                  {label}
                </button>
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
