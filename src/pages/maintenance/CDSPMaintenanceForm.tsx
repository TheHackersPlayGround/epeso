import { useState, useEffect, useRef } from 'react'
import Swal from 'sweetalert2'
import DatePicker from '../../components/DatePicker'
import {
  PlusCircle, FolderOpen, MoreHorizontal,
  Edit2, Trash2, PlayCircle, CheckCircle, RefreshCw, ArrowLeft,
  Search, Users, Plus, ChevronLeft, ChevronRight, X, Loader2,
} from 'lucide-react'
import { canManage } from '../../utils/permissions'
import { useCDSP } from '../../contexts/CDSPContext'
import type { CdspActivity } from '../../contexts/CDSPContext'
import * as cdspService from '../../services/cdspService'
import { useFieldValidation, NAME_REGEX, type ValidationError } from '../../hooks/useFieldValidation'

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_SERVICES = [
  'Career Coaching',
  'Pre-Employment Coaching',
  'Labor Employment for Graduating Students',
]

type ActivityStatus = 'Planned' | 'Ongoing' | 'Completed' | 'Cancelled'
type Action =
  | ''
  | 'add_activity'
  | 'edit_activity'
  | 'view_activity'
  | 'view_activities'
  | 'view_participants'

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600 text-sm text-gray-900 placeholder:text-gray-400'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="text-xs font-bold tracking-widest uppercase px-3 py-1 rounded-full text-white bg-brand-blue">
        {title}
      </span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  )
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ActivityStatus, string> = {
  Planned:   'bg-yellow-100 text-yellow-700',
  Ongoing:   'bg-green-100 text-green-700',
  Completed: 'bg-blue-100 text-blue-700',
  Cancelled: 'bg-red-100 text-red-600',
}

function StatusBadge({ status }: { status: ActivityStatus }) {
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status}
    </span>
  )
}


// ─── Participant record ───────────────────────────────────────────────────────

interface ParticipantRecord {
  id: number
  beneficiaryServiceId: number
  lastName: string
  firstName: string
  middleName: string
  contactNumber: string
  serviceAvailed: string
  classification: string[]
  status: string
  attended: boolean | null
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
  status: 'Planned' as ActivityStatus,
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function CDSPMaintenanceForm() {
  const { activities: cdspActivities, services: apiServices, refreshActivities, refreshProfiles } = useCDSP()
  const services = apiServices.length > 0 ? apiServices.map(s => s.name) : DEFAULT_SERVICES

  // Navigation
  const [action, setAction] = useState<Action>('')
  const [selectedActivity, setSelectedActivity] = useState<CdspActivity | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  // Activity form
  const [selectedService, setSelectedService] = useState('')
  const [formData, setFormData] = useState(blankForm)

  // View Activities filters
  const [filterService, setFilterService] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [participantPage, setParticipantPage] = useState(1)
  const [participantPerPage, setParticipantPerPage] = useState(10)

  // Participants state
  const [activityParticipants, setActivityParticipants] = useState<ParticipantRecord[]>([])
  const [loadingParticipants, setLoadingParticipants] = useState(false)

  // Ellipsis menu
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)

  // Confirm modals
  const [statusConfirm, setStatusConfirm] = useState<{
    activity: CdspActivity
    nextStatus: ActivityStatus
    label: string
  } | null>(null)

  // Field-level validation (activity form + add-service form)
  const { clearFieldError, errCls, fieldMessage, runValidation, setFieldErrors } = useFieldValidation()
  const serviceTypeWrapRef = useRef<HTMLDivElement>(null)
  const titleRef = useRef<HTMLInputElement>(null)
  const dateWrapRef = useRef<HTMLDivElement>(null)
  const facilitatorRef = useRef<HTMLInputElement>(null)
  const counselorRef = useRef<HTMLInputElement>(null)

  // Load participants when viewing
  useEffect(() => {
    if (action === 'view_participants' && selectedActivity) {
      setLoadingParticipants(true)
      cdspService.listActivityParticipants(selectedActivity.id)
        .then(res => setActivityParticipants(res.data ?? []))
        .catch(() => setActivityParticipants([]))
        .finally(() => setLoadingParticipants(false))
    } else {
      setActivityParticipants([])
    }
  }, [action, selectedActivity])

  const handleAttendance = async (beneficiaryServiceId: number, activityId: number, value: boolean) => {
    try {
      await cdspService.updateAttendance({ activityId, beneficiaryServiceId, attended: value })
      setActivityParticipants(prev => prev.map(p =>
        p.beneficiaryServiceId === beneficiaryServiceId ? { ...p, attended: value } : p
      ))
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update attendance.', confirmButtonColor: '#0077BE' })
    }
  }

  // ── Derived data ─────────────────────────────────────────────────────────

  const statusRank = (s: string) => ({ Planned: 0, Open: 0, Ongoing: 1, Active: 1, Completed: 2, Cancelled: 3 }[s] ?? 1)
  const filteredActivities = cdspActivities.filter(a => {
    const matchesService = filterService === 'All' || a.service === filterService
    const matchesStatus  = filterStatus  === 'All' || a.status  === filterStatus
    const matchesSearch  = !searchQuery  ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.service.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesService && matchesStatus && matchesSearch
  }).sort((a, b) => statusRank(a.status) - statusRank(b.status))
  const totalPages = Math.max(1, Math.ceil(filteredActivities.length / perPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedActivities = filteredActivities.slice((safePage - 1) * perPage, safePage * perPage)
  const recordStart = filteredActivities.length === 0 ? 0 : (safePage - 1) * perPage + 1
  const recordEnd = Math.min(safePage * perPage, filteredActivities.length)

  // ── Helpers ───────────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData(blankForm)
    setSelectedService('')
    setEditingId(null)
    setSelectedActivity(null)
    setFieldErrors({})
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

  const fillFormFromActivity = (a: CdspActivity) => {
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
      status:          a.status,
    })
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (isSaving) return
    const facilitator = formData.facilitator.trim()
    const counselor = formData.counselor.trim()
    const errors: ValidationError[] = []

    if (!selectedService) {
      errors.push({ field: 'serviceType', message: 'Please select a service type.', focus: () => serviceTypeWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) })
    }
    if (!formData.title.trim()) {
      errors.push({ field: 'title', message: 'Activity title is required.', focus: () => titleRef.current?.focus() })
    }
    if (!formData.date) {
      errors.push({ field: 'date', message: 'Activity date is required.', focus: () => dateWrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }) })
    }
    if (facilitator && !NAME_REGEX.test(facilitator)) {
      errors.push({ field: 'facilitator', message: 'Facilitator name must contain letters only (no numbers or symbols).', focus: () => facilitatorRef.current?.focus() })
    }
    if (counselor && !NAME_REGEX.test(counselor)) {
      errors.push({ field: 'counselor', message: 'Counselor name must contain letters only (no numbers or symbols).', focus: () => counselorRef.current?.focus() })
    }
    if (runValidation(errors)) return

    const payload = {
      serviceName:     selectedService,
      title:           formData.title.trim(),
      description:     formData.description.trim() || '',
      date:            formData.date,
      location:        formData.location,
      facilitator:     formData.facilitator || '',
      counselor:       formData.counselor || '',
      sessionDuration: formData.sessionDuration || '',
      participants:    formData.participants ? parseInt(formData.participants) : null,
      status:          formData.status,
    }

    setIsSaving(true)
    try {
      if (editingId !== null) {
        await cdspService.updateActivity(editingId, payload)
        Swal.fire({ icon: 'success', title: 'Activity Updated', text: 'The activity has been updated.', confirmButtonColor: '#0077BE', timer: 2000, timerProgressBar: true })
      } else {
        await cdspService.createActivity(payload)
        Swal.fire({ icon: 'success', title: 'Activity Added', text: 'New CDSP activity has been saved.', confirmButtonColor: '#0077BE', timer: 2000, timerProgressBar: true })
      }
      await refreshActivities()
      await refreshProfiles()
      goToList()
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (e as { message?: string })?.message ?? 'Failed to save activity.'
      Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#0077BE' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await cdspService.deleteActivity(id)
      await refreshActivities()
      await refreshProfiles()
      Swal.fire({ icon: 'success', title: 'Deleted', text: 'The activity has been deleted.', confirmButtonColor: '#0077BE', timer: 1500, showConfirmButton: false })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (e as { message?: string })?.message ?? 'Failed to delete activity.'
      Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#0077BE' })
    }
  }

  const confirmDelete = async (a: CdspActivity) => {
    setOpenMenuId(null)
    const result = await Swal.fire({
      title: 'Delete Activity?',
      text: `Are you sure you want to delete "${a.title}"? This will move the activity to the recycle bin.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
    })
    if (!result.isConfirmed) return
    await handleDelete(a.id)
  }

  const handleStatusChange = async () => {
    if (!statusConfirm) return
    const { activity, nextStatus, label } = statusConfirm

    if (nextStatus === 'Completed') {
      try {
        const res = await cdspService.listActivityParticipants(activity.id)
        const participants: ParticipantRecord[] = res.data ?? []
        const unmarked = participants.filter(p => p.attended === null).length
        if (unmarked > 0) {
          await Swal.fire({
            icon: 'warning',
            title: 'Attendance Incomplete',
            html: `<b>${unmarked} participant${unmarked !== 1 ? 's have' : ' has'}</b> not been marked present or absent yet.<br><br>Please mark attendance for all participants before completing this activity.`,
            confirmButtonText: 'Go to Attendance',
            confirmButtonColor: '#0077BE',
          })
          setStatusConfirm(null)
          setSelectedActivity(activity)
          setAction('view_participants')
          return
        }
      } catch { /* proceed if participants can't be fetched */ }
    }

    try {
      await cdspService.updateActivityStatus(activity.id, nextStatus)
      await refreshActivities()
      await refreshProfiles()
      Swal.fire({ icon: 'success', title: 'Status Updated', text: `Activity is now ${nextStatus}.`, confirmButtonColor: '#0077BE', timer: 2000, timerProgressBar: true })
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message ?? (e as { message?: string })?.message ?? `Failed to ${label.toLowerCase()}.`
      Swal.fire({ icon: 'error', title: 'Error', text: msg, confirmButtonColor: '#0077BE' })
    } finally {
      setStatusConfirm(null)
    }
  }

  // ── Render: landing ───────────────────────────────────────────────────────

  const renderLanding = () => {
    const cards: { key: Action; icon: React.ReactNode; label: string; desc: string; editorOnly?: boolean }[] = [
      { key: 'add_activity',    icon: <PlusCircle    size={32} />, label: 'Add Activity',    desc: 'Create a new CDSP activity',   editorOnly: true },
      { key: 'view_activities', icon: <FolderOpen    size={32} />, label: 'View Activities', desc: 'Browse all CDSP activities' },
    ]

    return (
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <p className="text-gray-500 mb-5">
          Select an action for <span className="text-brand-blue font-medium">CDSP</span>
        </p>
        <div className="grid grid-cols-2 gap-5">
          {cards.map(card => (
            <button
              key={card.key}
              onClick={() => setAction(card.key)}
              disabled={card.editorOnly && !canManage('cdsp-maintenance')}
              className={`flex flex-col items-center gap-4 py-8 px-4 rounded-2xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
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
          <SectionHeader title="Activity Information" />
          <div className="mb-6" ref={serviceTypeWrapRef}>
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
                onChange={e => { setSelectedService(e.target.value); clearFieldError('serviceType') }}
                disabled={isView || mode === 'edit'}
                className={`${inputCls} bg-white ${errCls('serviceType')}`}
              >
                <option value="">Select Service Type</option>
                {services.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            )}
            {fieldMessage('serviceType') && <p className="text-red-500 text-xs mt-1">{fieldMessage('serviceType')}</p>}
          </div>

          {(selectedService || mode !== 'add') && (
            <div className="space-y-5">
              <div>
                <label className={labelCls}>Activity Title <span className="text-red-500">*</span></label>
                <input
                  ref={titleRef}
                  type="text"
                  value={formData.title}
                  readOnly={isView}
                  onChange={e => { setFormData(p => ({ ...p, title: e.target.value })); clearFieldError('title') }}
                  className={`${inputCls} ${errCls('title')}`}
                  placeholder="e.g. Career Coaching Workshop – Batch 1"
                />
                {fieldMessage('title') && <p className="text-red-500 text-xs mt-1">{fieldMessage('title')}</p>}
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

              <SectionHeader title="Schedule & Personnel" />
              <div className="grid grid-cols-2 gap-4">
                <div ref={dateWrapRef}>
                  <label className={labelCls}>Date <span className="text-red-500">*</span></label>
                  <DatePicker className={`${inputCls} ${errCls('date')}`} value={formData.date} readOnly={isView}
                    onChange={value => { setFormData(p => ({ ...p, date: value })); clearFieldError('date') }} />
                  {fieldMessage('date') && <p className="text-red-500 text-xs mt-1">{fieldMessage('date')}</p>}
                </div>
                <div>
                  <label className={labelCls}>Location / Venue</label>
                  <input type="text" value={formData.location} readOnly={isView}
                    onChange={e => setFormData(p => ({ ...p, location: e.target.value }))}
                    className={inputCls} placeholder="Enter location" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Person In Charge / Facilitator</label>
                  <input ref={facilitatorRef} type="text" value={formData.facilitator} readOnly={isView}
                    onChange={e => { setFormData(p => ({ ...p, facilitator: e.target.value })); clearFieldError('facilitator') }}
                    className={`${inputCls} ${errCls('facilitator')}`} placeholder="Enter facilitator name" />
                  {fieldMessage('facilitator') && <p className="text-red-500 text-xs mt-1">{fieldMessage('facilitator')}</p>}
                </div>
                <div>
                  <label className={labelCls}>Number of Participants</label>
                  <input type="number" min="0" value={formData.participants} readOnly={isView}
                    onChange={e => setFormData(p => ({ ...p, participants: e.target.value }))}
                    className={inputCls} placeholder="0" />
                </div>
              </div>

              <div>
                <label className={labelCls}>Status</label>
                <div className="flex gap-6 mt-1">
                  {(['Planned', 'Ongoing', 'Completed'] as ActivityStatus[]).map(s => {
                    const isDisabled = isView || (mode === 'add' && s !== 'Planned')
                    return (
                    <label key={s} className={`flex items-center gap-2 ${isDisabled ? 'cursor-default opacity-40' : 'cursor-pointer'}`}>
                      <input
                        type="radio"
                        name="cdsp-status"
                        value={s}
                        checked={formData.status === s}
                        onChange={() => setFormData(p => ({ ...p, status: s }))}
                        disabled={isDisabled}
                        className="w-4 h-4 text-brand-blue focus:ring-brand-blue disabled:cursor-default"
                      />
                      <span className="text-sm text-gray-700">{s}</span>
                    </label>
                    )
                  })}
                </div>
              </div>

              <SectionHeader title="Additional Counseling / Session Information" />
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={labelCls}>Counselor / Career Advisor</label>
                  <input ref={counselorRef} type="text" value={formData.counselor} readOnly={isView}
                    onChange={e => { setFormData(p => ({ ...p, counselor: e.target.value })); clearFieldError('counselor') }}
                    className={`${inputCls} ${errCls('counselor')}`} placeholder="Enter counselor name" />
                  {fieldMessage('counselor') && <p className="text-red-500 text-xs mt-1">{fieldMessage('counselor')}</p>}
                </div>
                <div>
                  <label className={labelCls}>Session Duration / No. of Sessions</label>
                  <input type="text" value={formData.sessionDuration} readOnly={isView}
                    onChange={e => setFormData(p => ({ ...p, sessionDuration: e.target.value }))}
                    className={inputCls} placeholder="e.g. 3 sessions, 1 hour each" />
                </div>
              </div>

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
                    disabled={!canManage('cdsp-maintenance') || isSaving}
                    className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue flex items-center gap-2"
                  >
                    {isSaving && <Loader2 size={16} className="animate-spin" />}
                    {isSaving ? 'Saving…' : (mode === 'edit' ? 'Update Activity' : 'Save Activity')}
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
      <div className="bg-white rounded-xl shadow-md p-5 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by title or service..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
              className={inputCls + ' pl-9'}
            />
          </div>
          <select
            value={filterService}
            onChange={e => { setFilterService(e.target.value); setCurrentPage(1) }}
            className={inputCls + ' bg-white'}
          >
            <option value="All">All Services</option>
            {services.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1) }}
            className={inputCls + ' bg-white'}
          >
            <option value="All">All Status</option>
            <option value="Planned">Planned</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="bg-brand-blue px-6 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-white m-0">CDSP Activities</h3>
          </div>
          <button
            onClick={() => { resetForm(); setAction('add_activity') }}
            disabled={!canManage('cdsp-maintenance')}
            className="flex items-center gap-2 px-4 py-2 bg-white text-brand-blue rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            <Plus size={15} /> Add Activity
          </button>
        </div>

        {openMenuId !== null && menuPos !== null && (() => {
          const a = cdspActivities.find(x => x.id === openMenuId)
          if (!a) return null
          return (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
              <div
                style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, maxHeight: 'calc(100vh - 24px)' }}
                className="w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1 overflow-y-auto"
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
                  disabled={!canManage('cdsp-maintenance')}
                  className="w-full px-4 py-2.5 text-left text-sm text-brand-blue hover:bg-blue-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <Edit2 size={14} className="text-blue-500" />
                  Edit
                </button>
                {a.status === 'Planned' && (
                  <button
                    onClick={() => { setStatusConfirm({ activity: a, nextStatus: 'Ongoing', label: 'Mark as Ongoing' }); setOpenMenuId(null) }}
                    disabled={!canManage('cdsp-maintenance')}
                    className="w-full px-4 py-2.5 text-left text-sm text-brand-blue hover:bg-blue-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <PlayCircle size={14} className="text-blue-500" />
                    Mark as Ongoing
                  </button>
                )}
                {a.status === 'Ongoing' && (
                  <button
                    onClick={() => { setStatusConfirm({ activity: a, nextStatus: 'Completed', label: 'Mark as Completed' }); setOpenMenuId(null) }}
                    disabled={!canManage('cdsp-maintenance')}
                    className="w-full px-4 py-2.5 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <CheckCircle size={14} className="text-green-600" />
                    Mark as Completed
                  </button>
                )}
                {a.status === 'Completed' && (
                  <button
                    onClick={() => { setStatusConfirm({ activity: a, nextStatus: 'Planned', label: 'Reopen Activity' }); setOpenMenuId(null) }}
                    disabled={!canManage('cdsp-maintenance')}
                    className="w-full px-4 py-2.5 text-left text-sm text-brand-blue hover:bg-blue-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <RefreshCw size={14} className="text-blue-500" />
                    Reopen Activity
                  </button>
                )}
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => confirmDelete(a)}
                  disabled={!canManage('cdsp-maintenance')}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <Trash2 size={14} className="text-red-500" />
                  Delete
                </button>
              </div>
            </>
          )
        })()}

        {filteredActivities.length === 0 ? (
          <div className="py-16 text-center">
            <FolderOpen size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">No CDSP activities found.</p>
            <button
              onClick={() => { resetForm(); setAction('add_activity') }}
              disabled={!canManage('cdsp-maintenance')}
              className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                {paginatedActivities.map(a => (
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
                      {a.participants !== null ? (
                        <span className={a.assignedCount >= a.participants ? 'text-red-500 font-semibold' : ''}>
                          {a.assignedCount}/{a.participants}
                        </span>
                      ) : '—'}
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
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                Show
                <select value={perPage} onChange={e => { setPerPage(Number(e.target.value)); setCurrentPage(1) }} className="border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-brand-blue">
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                per page
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={16} /></button>
                <span>{recordStart} to {recordEnd} of {filteredActivities.length} records</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight size={16} /></button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )

  // ── Render: view participants ─────────────────────────────────────────────

  const renderViewParticipants = () => {
    if (!selectedActivity) return null
    const ptotal = Math.max(1, Math.ceil(activityParticipants.length / participantPerPage))
    const psafe = Math.min(participantPage, ptotal)
    const paginatedPts = activityParticipants.slice((psafe - 1) * participantPerPage, psafe * participantPerPage)
    const pStart = activityParticipants.length === 0 ? 0 : (psafe - 1) * participantPerPage + 1
    const pEnd = Math.min(psafe * participantPerPage, activityParticipants.length)
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

        <div className="bg-brand-blue rounded-xl px-6 py-4 mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-white text-base font-semibold m-0">{selectedActivity.title}</h3>
            <p className="text-white/80 text-sm mt-0.5">
              {loadingParticipants ? 'Loading…' : `${activityParticipants.length} participant${activityParticipants.length !== 1 ? 's' : ''} found`}
            </p>
          </div>
          <StatusBadge status={selectedActivity.status} />
        </div>

        {loadingParticipants ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
            <p className="text-gray-400 text-sm">Loading participants…</p>
          </div>
        ) : activityParticipants.length === 0 ? (
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
                  <th className="px-4 py-3 text-left text-white font-semibold">Attendance</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPts.map((p, i) => (
                  <tr key={p.beneficiaryServiceId} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {p.lastName}, {p.firstName} {p.middleName}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.serviceAvailed || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      {(p.classification ?? []).slice(0, 2).join(', ')}
                      {(p.classification ?? []).length > 2 && (
                        <span className="text-gray-400"> +{p.classification.length - 2}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{p.contactNumber || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS_APPLICANT[p.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {selectedActivity.status === 'Planned' ? (
                        <span className="text-gray-400 text-sm">—</span>
                      ) : selectedActivity.status === 'Completed' ? (
                        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.attended === true ? 'bg-green-100 text-green-700' : p.attended === false ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                          {p.attended === true ? 'Present' : p.attended === false ? 'Absent' : '—'}
                        </span>
                      ) : (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleAttendance(p.beneficiaryServiceId, selectedActivity.id, true)}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${p.attended === true ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'}`}
                          >Present</button>
                          <button
                            onClick={() => handleAttendance(p.beneficiaryServiceId, selectedActivity.id, false)}
                            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${p.attended === false ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-700'}`}
                          >Absent</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Rows per page:</span>
                <select value={participantPerPage} onChange={e => { setParticipantPerPage(Number(e.target.value)); setParticipantPage(1) }} className="border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue">
                  {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{pStart}–{pEnd} of {activityParticipants.length} records</span>
                <div className="flex gap-1">
                  <button onClick={() => setParticipantPage(p => Math.max(1, p - 1))} disabled={psafe === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={16} /></button>
                  <button onClick={() => setParticipantPage(p => Math.min(ptotal, p + 1))} disabled={psafe === ptotal} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight size={16} /></button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Main render ───────────────────────────────────────────────────────────

  return (
    <div className="pb-8">
      {action !== 'view_participants' && action !== 'view_activity' && action !== 'edit_activity' && renderLanding()}

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
