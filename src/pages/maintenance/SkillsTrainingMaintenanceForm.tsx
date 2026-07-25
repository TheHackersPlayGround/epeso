import { useEffect, useState } from 'react'
import Swal from 'sweetalert2'
import DatePicker from '../../components/DatePicker'
import {
  PlusCircle, Tag, FolderOpen, ClipboardList, MoreHorizontal,
  Trash2, PlayCircle, CheckCircle, RefreshCw, Search, Plus,
  ArrowLeft, Edit2, Users, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { canManage } from '../../utils/permissions'
import { useSkillsTraining } from '../../contexts/SkillsTrainingContext'
import type { SkillsTrainingBatch, SkillsTrainingActivity } from '../../contexts/SkillsTrainingContext'
import * as skillsTrainingService from '../../services/skillsTrainingService'

// ─── Constants ────────────────────────────────────────────────────────────────

const BRAND_BLUE = '#0077BE'

const ACTIVITY_STATUS_COLORS: Record<SkillsTrainingActivity['status'], string> = {
  Planned:   'bg-yellow-100 text-yellow-700',
  Ongoing:   'bg-green-100 text-green-700',
  Completed: 'bg-blue-100 text-blue-700',
  Cancelled: 'bg-red-100 text-red-600',
}

const PARTICIPANT_STATUS_COLORS: Record<string, string> = {
  Accepted:   'bg-green-100 text-green-700',
  Waitlisted: 'bg-yellow-100 text-yellow-700',
}

function errMsg(e: unknown, fallback: string) {
  return (e as { message?: string })?.message ?? fallback
}

interface ParticipantRecord {
  id: number
  beneficiaryServiceId: number
  lastName: string
  firstName: string
  middleName: string
  sex: string
  contactNumber: string
  status: string
  attended: boolean | null
}

type STAction = '' | 'add_training' | 'add_batch' | 'view_trainings' | 'view_batches'
type TrainingSubView = '' | 'view_details' | 'edit' | 'view_participants'
type TrainingStatus = 'Planned' | 'Ongoing' | 'Completed' | 'Cancelled'

const blank = {
  selectedBatch: '',
  title: '',
  description: '',
  date: '',
  location: '',
  facilitator: '',
  participants: '',
  status: 'Planned' as TrainingStatus,
}

const ACTION_CARDS: { key: STAction; label: string; icon: React.ReactNode; desc: string }[] = [
  { key: 'add_training',   label: 'Add Training',  icon: <PlusCircle size={32} />,    desc: 'Create a new training or activity' },
  { key: 'add_batch',      label: 'Add Batch',     icon: <Tag size={32} />,           desc: 'Add a new batch type' },
  { key: 'view_trainings', label: 'View Trainings', icon: <FolderOpen size={32} />,   desc: 'Browse all trainings' },
  { key: 'view_batches',   label: 'View Batches',  icon: <ClipboardList size={32} />, desc: 'Manage batch types' },
]

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent placeholder-gray-400'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1.5'

// ─── Training form (shared between Add / Edit / View) ─────────────────────────

function TrainingForm({
  mode,
  form,
  errors = {},
  batches,
  onChange,
  onSave,
  onCancel,
}: {
  mode: 'add' | 'edit' | 'view'
  form: typeof blank
  errors?: Record<string, string>
  batches: SkillsTrainingBatch[]
  onChange: (field: keyof typeof blank, value: string) => void
  onSave?: () => void
  onCancel: () => void
}) {
  const isView = mode === 'view'
  const isAdd  = mode === 'add'
  const selectedBatchName = batches.find(b => String(b.id) === form.selectedBatch)?.batchName ?? ''

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="bg-brand-blue px-6 py-4">
        <h3 className="text-white m-0">
          {mode === 'add' ? 'Add New Training' : mode === 'edit' ? 'Edit Training' : 'View Training Details'}
        </h3>
        <p className="text-white/70 text-sm mt-0.5">Skills Training Program</p>
      </div>
      <div className="p-6 space-y-6">
        {/* Batch */}
        <div>
          <label className={labelCls}>Training Batch <span className="text-red-500">*</span></label>
          {isView ? (
            <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">
              {selectedBatchName || '—'}
            </div>
          ) : (
            <>
              <select
                value={form.selectedBatch}
                onChange={e => onChange('selectedBatch', e.target.value)}
                className={`${inputCls} ${errors.selectedBatch ? 'border-red-400' : ''}`}
              >
                <option value="">Select Training Batch</option>
                {batches.map(b => (
                  <option key={b.id} value={String(b.id)}>{b.batchName}</option>
                ))}
              </select>
              {errors.selectedBatch && <p className="text-red-500 text-xs mt-1">{errors.selectedBatch}</p>}
              {!form.selectedBatch && (
                <p className="text-gray-400 text-sm mt-2">Please select a service type to continue.</p>
              )}
            </>
          )}
        </div>

        {(isView || form.selectedBatch) && (
          <>
            <div className="border-t border-gray-100 pt-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">Details</p>
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Title / Name {!isView && <span className="text-red-500">*</span>}</label>
                  {isView ? (
                    <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">{form.title || '—'}</div>
                  ) : (
                    <>
                      <input type="text" value={form.title} onChange={e => onChange('title', e.target.value)}
                        placeholder="Enter activity title" className={`${inputCls} ${errors.title ? 'border-red-400' : ''}`} />
                      {errors.title && <p className="text-red-500 text-xs mt-1">{errors.title}</p>}
                    </>
                  )}
                </div>

                <div>
                  <label className={labelCls}>Description</label>
                  {isView ? (
                    <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800 min-h-[72px]">{form.description || '—'}</div>
                  ) : (
                    <textarea value={form.description} onChange={e => onChange('description', e.target.value)}
                      placeholder="Enter activity description" rows={3} className={inputCls} />
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Date</label>
                    {isView ? (
                      <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">{form.date || '—'}</div>
                    ) : (
                      <DatePicker className={inputCls} value={form.date} onChange={value => onChange('date', value)} />
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Location / Venue</label>
                    {isView ? (
                      <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">{form.location || '—'}</div>
                    ) : (
                      <input type="text" value={form.location} onChange={e => onChange('location', e.target.value)}
                        placeholder="Enter location" className={inputCls} />
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Person In Charge / Facilitator</label>
                    {isView ? (
                      <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">{form.facilitator || '—'}</div>
                    ) : (
                      <input type="text" value={form.facilitator} onChange={e => onChange('facilitator', e.target.value)}
                        placeholder="Enter person in charge" className={inputCls} />
                    )}
                  </div>
                  <div>
                    <label className={labelCls}>Number of Participants / Beneficiaries</label>
                    {isView ? (
                      <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">{form.participants || '—'}</div>
                    ) : (
                      <input type="number" min="0" value={form.participants} onChange={e => onChange('participants', e.target.value)}
                        placeholder="Enter number" className={inputCls} />
                    )}
                  </div>
                </div>

                <div>
                  <label className={labelCls}>Status</label>
                  {isView ? (
                    <div className="px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">{form.status}</div>
                  ) : (
                    <div className="flex gap-6 mt-1">
                      {(['Planned', 'Ongoing', 'Completed'] as const).map(s => {
                        const isDisabled = isAdd && s !== 'Planned'
                        return (
                        <label key={s} className={`flex items-center gap-2 text-sm text-gray-700 ${isDisabled ? 'cursor-default opacity-40' : 'cursor-pointer'}`}>
                          <input type="radio" name="st-status" value={s} checked={form.status === s}
                            onChange={() => onChange('status', s)} disabled={isDisabled} className="accent-brand-blue disabled:cursor-default" />
                          {s}
                        </label>
                        )
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button onClick={onCancel}
                className="px-6 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors text-sm">
                {isView ? 'Close' : 'Cancel'}
              </button>
              {!isView && onSave && (
                <button onClick={onSave} disabled={!canManage('skills-maintenance')}
                  className="px-6 py-2.5 bg-brand-blue text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue">
                  {mode === 'add' ? 'Save Activity' : 'Save Changes'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function SkillsTrainingMaintenanceForm() {
  const { batches, activities, refreshBatches, refreshActivities, refreshProfiles } = useSkillsTraining()

  const [action, setAction] = useState<STAction>('')

  // — batch management
  const [newBatchName, setNewBatchName]         = useState('')
  const [isSavingBatch, setIsSavingBatch]       = useState(false)

  // — add training form
  const [addForm, setAddForm]   = useState(blank)
  const [addErrors, setAddErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)

  // — view trainings
  const [trainingSearch, setTrainingSearch]             = useState('')
  const [trainingBatchFilter, setTrainingBatchFilter]   = useState('All')
  const [trainingStatusFilter, setTrainingStatusFilter] = useState('All')
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [participantPage, setParticipantPage] = useState(1)
  const [participantPerPage, setParticipantPerPage] = useState(10)
  const [batchPage, setBatchPage] = useState(1)
  const [batchPerPage, setBatchPerPage] = useState(10)
  const [trainingMenuId, setTrainingMenuId]             = useState<number | null>(null)
  const [trainingMenuPos, setTrainingMenuPos]           = useState<{ top: number; left: number } | null>(null)
  const [trainingSubView, setTrainingSubView]           = useState<TrainingSubView>('')
  const [selectedTraining, setSelectedTraining]         = useState<SkillsTrainingActivity | null>(null)
  const [editForm, setEditForm]                         = useState(blank)
  const [activityParticipants, setActivityParticipants] = useState<ParticipantRecord[]>([])
  const [loadingParticipants, setLoadingParticipants]   = useState(false)
  const [trainingStatusConfirm, setTrainingStatusConfirm] = useState<{
    activity: SkillsTrainingActivity; nextStatus: TrainingStatus; label: string
  } | null>(null)
  const [trainingDeleteConfirm, setTrainingDeleteConfirm] = useState<number | null>(null)

  // ── Derived ────────────────────────────────────────────────────────────────

  const statusRank = (s: string) => ({ Planned: 0, Ongoing: 1, Completed: 2, Cancelled: 3 }[s] ?? 1)
  const filteredTrainings = activities.filter(a => {
    const matchSearch = !trainingSearch ||
      a.title.toLowerCase().includes(trainingSearch.toLowerCase()) ||
      (a.service || '').toLowerCase().includes(trainingSearch.toLowerCase())
    const matchBatch  = trainingBatchFilter === 'All' || a.service === trainingBatchFilter
    const matchStatus = trainingStatusFilter === 'All' || a.status === trainingStatusFilter
    return matchSearch && matchBatch && matchStatus
  }).sort((a, b) => statusRank(a.status) - statusRank(b.status))
  const totalPages = Math.max(1, Math.ceil(filteredTrainings.length / perPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedTrainings = filteredTrainings.slice((safePage - 1) * perPage, safePage * perPage)
  const recordStart = filteredTrainings.length === 0 ? 0 : (safePage - 1) * perPage + 1
  const recordEnd = Math.min(safePage * perPage, filteredTrainings.length)

  const batchTotalPages = Math.max(1, Math.ceil(batches.length / batchPerPage))
  const batchSafePage = Math.min(batchPage, batchTotalPages)
  const paginatedBatches = batches.slice((batchSafePage - 1) * batchPerPage, batchSafePage * batchPerPage)
  const batchRecordStart = batches.length === 0 ? 0 : (batchSafePage - 1) * batchPerPage + 1
  const batchRecordEnd = Math.min(batchSafePage * batchPerPage, batches.length)

  const isBatchName = (s: string) => batches.some(b => b.batchName === s)

  // Load participants (with attendance) whenever the participants sub-view opens.
  useEffect(() => {
    if (action === 'view_trainings' && trainingSubView === 'view_participants' && selectedTraining) {
      setLoadingParticipants(true)
      skillsTrainingService.listActivityParticipants(selectedTraining.id)
        .then(res => setActivityParticipants(res.data ?? []))
        .catch(() => setActivityParticipants([]))
        .finally(() => setLoadingParticipants(false))
    } else {
      setActivityParticipants([])
    }
  }, [action, trainingSubView, selectedTraining])

  const handleAttendance = async (beneficiaryServiceId: number, activityId: number, value: boolean) => {
    try {
      await skillsTrainingService.updateAttendance({ activityId, beneficiaryServiceId, attended: value })
      setActivityParticipants(prev => prev.map(p =>
        p.beneficiaryServiceId === beneficiaryServiceId ? { ...p, attended: value } : p
      ))
    } catch {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to update attendance.', confirmButtonColor: BRAND_BLUE })
    }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  const setAdd = (field: keyof typeof blank, value: string) =>
    setAddForm(prev => ({ ...prev, [field]: value }))

  const setEdit = (field: keyof typeof blank, value: string) =>
    setEditForm(prev => ({ ...prev, [field]: value }))

  const resetAdd = () => { setAddForm(blank); setAddErrors({}) }

  const validateAdd = () => {
    const errs: Record<string, string> = {}
    if (!addForm.selectedBatch) errs.selectedBatch = 'Please select a training batch'
    if (!addForm.title.trim())  errs.title         = 'Title is required'
    setAddErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSaveAdd = async () => {
    if (!validateAdd() || isSaving) return
    setIsSaving(true)
    try {
      await skillsTrainingService.createActivity({
        batchId: Number(addForm.selectedBatch),
        title: addForm.title.trim(),
        description: addForm.description.trim(),
        date: addForm.date,
        location: addForm.location.trim(),
        facilitator: addForm.facilitator.trim(),
        participants: addForm.participants ? Number(addForm.participants) : 0,
      })
      await Promise.all([refreshActivities(), refreshBatches()])
      resetAdd()
      setAction('')
      Swal.fire({ icon: 'success', title: 'Training Saved', text: `"${addForm.title.trim()}" has been added.`, confirmButtonColor: BRAND_BLUE })
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: errMsg(e, 'Failed to save training.'), confirmButtonColor: BRAND_BLUE })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!selectedTraining || isSaving) return
    if (!editForm.title.trim()) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Title is required.', confirmButtonColor: BRAND_BLUE })
      return
    }
    setIsSaving(true)
    try {
      const res = await skillsTrainingService.updateActivity(selectedTraining.id, {
        batchId: Number(editForm.selectedBatch) || selectedTraining.batchId,
        title: editForm.title.trim(),
        description: editForm.description.trim(),
        date: editForm.date,
        location: editForm.location.trim(),
        facilitator: editForm.facilitator.trim(),
        participants: editForm.participants ? Number(editForm.participants) : 0,
        status: editForm.status,
      })
      await Promise.all([refreshActivities(), refreshProfiles(), refreshBatches()])
      setSelectedTraining(res.data)
      setTrainingSubView('')
      Swal.fire({ icon: 'success', title: 'Training Updated', text: 'Changes saved successfully.', confirmButtonColor: BRAND_BLUE })
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: errMsg(e, 'Failed to update training.'), confirmButtonColor: BRAND_BLUE })
    } finally {
      setIsSaving(false)
    }
  }

  const openEdit = (a: SkillsTrainingActivity) => {
    setSelectedTraining(a)
    setEditForm({
      selectedBatch: String(a.batchId),
      title:        a.title,
      description:  a.description ?? '',
      date:         a.date,
      location:     a.location,
      facilitator:  a.facilitator ?? '',
      participants: a.participants ? String(a.participants) : '',
      status:       a.status,
    })
    setTrainingSubView('edit')
  }

  const openMenuForTraining = (e: React.MouseEvent<HTMLButtonElement>, id: number) => {
    const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
    const dropdownW = 210; const dropdownH = 200
    const left = Math.min(rect.right - dropdownW, window.innerWidth - dropdownW - 8)
    const spaceBelow = window.innerHeight - rect.bottom - 8
    const top = spaceBelow >= dropdownH ? rect.bottom + 4 : rect.top - dropdownH - 4
    setTrainingMenuPos({ top: Math.max(8, top), left: Math.max(8, left) })
    setTrainingMenuId(trainingMenuId === id ? null : id)
  }

  const nextStatusLabel = (status: SkillsTrainingActivity['status']): { next: TrainingStatus; label: string } | null => {
    if (status === 'Planned')   return { next: 'Ongoing',   label: 'Mark as Ongoing' }
    if (status === 'Ongoing')   return { next: 'Completed', label: 'Mark as Completed' }
    if (status === 'Completed') return { next: 'Planned',   label: 'Reopen Training' }
    return null
  }

  const handleAddBatch = async () => {
    const name = newBatchName.trim()
    if (!name) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter a batch name.', confirmButtonColor: BRAND_BLUE }); return }
    if (isSavingBatch) return
    setIsSavingBatch(true)
    try {
      await skillsTrainingService.createBatch({ batchName: name })
      await refreshBatches()
      setNewBatchName('')
      Swal.fire({ icon: 'success', title: 'Batch Added', text: `${name} has been added.`, confirmButtonColor: BRAND_BLUE })
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: errMsg(e, 'Failed to add batch.'), confirmButtonColor: BRAND_BLUE })
    } finally {
      setIsSavingBatch(false)
    }
  }

  const handleDeleteBatch = async (id: number) => {
    try {
      await skillsTrainingService.deleteBatch(id)
      await refreshBatches()
      Swal.fire({ icon: 'success', title: 'Deleted', text: 'The batch has been deleted.', confirmButtonColor: BRAND_BLUE, timer: 1500, showConfirmButton: false })
    } catch (e) {
      Swal.fire({ icon: 'error', title: 'Error', text: errMsg(e, 'Failed to delete batch.'), confirmButtonColor: BRAND_BLUE })
    }
  }

  const confirmDeleteBatch = async (b: SkillsTrainingBatch) => {
    const result = await Swal.fire({
      title: 'Delete Batch?',
      text: `Are you sure you want to delete "${b.batchName}"? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Delete',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#6b7280',
    })
    if (!result.isConfirmed) return
    await handleDeleteBatch(b.id)
  }

  const handleDeleteTraining = async () => {
    if (trainingDeleteConfirm === null) return
    try {
      await skillsTrainingService.deleteActivity(trainingDeleteConfirm)
      setTrainingDeleteConfirm(null)
      await Promise.all([refreshActivities(), refreshBatches()])
    } catch (e) {
      setTrainingDeleteConfirm(null)
      Swal.fire({ icon: 'error', title: 'Error', text: errMsg(e, 'Failed to delete training.'), confirmButtonColor: BRAND_BLUE })
    }
  }

  const handleConfirmStatusChange = async () => {
    if (!trainingStatusConfirm) return
    const { activity, nextStatus } = trainingStatusConfirm

    if (nextStatus === 'Completed') {
      try {
        const res = await skillsTrainingService.listActivityParticipants(activity.id)
        const participants: ParticipantRecord[] = res.data ?? []
        const unmarked = participants.filter(p => p.attended === null).length
        if (unmarked > 0) {
          await Swal.fire({
            icon: 'warning',
            title: 'Attendance Incomplete',
            html: `<b>${unmarked} participant${unmarked !== 1 ? 's have' : ' has'}</b> not been marked present or absent yet.<br><br>Please mark attendance for all participants before completing this training.`,
            confirmButtonText: 'Go to Attendance',
            confirmButtonColor: BRAND_BLUE,
          })
          setTrainingStatusConfirm(null)
          setSelectedTraining(activity)
          setAction('view_trainings')
          setTrainingSubView('view_participants')
          return
        }
      } catch { /* proceed if participants can't be fetched */ }
    }

    try {
      await skillsTrainingService.updateActivityStatus(activity.id, nextStatus)
      await Promise.all([refreshActivities(), refreshProfiles()])
      setTrainingStatusConfirm(null)
      Swal.fire({ icon: 'success', title: 'Status Updated', text: `Status changed to ${nextStatus}.`, confirmButtonColor: BRAND_BLUE })
    } catch (e) {
      setTrainingStatusConfirm(null)
      Swal.fire({ icon: 'error', title: 'Error', text: errMsg(e, 'Failed to update status.'), confirmButtonColor: BRAND_BLUE })
    }
  }

  // ── Sub-view: participants ─────────────────────────────────────────────────

  if (action === 'view_trainings' && trainingSubView === 'view_participants' && selectedTraining) {
    const participants = activityParticipants
    const ptotal = Math.max(1, Math.ceil(participants.length / participantPerPage))
    const psafe = Math.min(participantPage, ptotal)
    const paginatedPts = participants.slice((psafe - 1) * participantPerPage, psafe * participantPerPage)
    const pStart = participants.length === 0 ? 0 : (psafe - 1) * participantPerPage + 1
    const pEnd = Math.min(psafe * participantPerPage, participants.length)
    return (
      <>
        {/* Action cards */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <p className="text-gray-500 mb-5">
            Select an action for <span className="text-brand-blue font-medium">Skills Training</span>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {ACTION_CARDS.map(card => (
              <button key={card.key} onClick={() => { setAction(card.key); setTrainingSubView('') }}
                disabled={card.label.startsWith('Add') && !canManage('skills-maintenance')}
                className={`flex flex-col items-center gap-4 py-8 px-4 rounded-2xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  action === card.key ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-gray-200 hover:border-brand-blue hover:bg-blue-50 text-gray-600 hover:text-brand-blue'
                }`}>
                <div className={`p-4 rounded-2xl ${action === card.key ? 'bg-brand-blue text-white' : 'bg-gray-100'}`}>{card.icon}</div>
                <div className="text-center"><p className="font-medium">{card.label}</p><p className="text-xs text-gray-400 mt-1">{card.desc}</p></div>
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => setTrainingSubView('')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 text-sm font-medium">
          <ArrowLeft size={16} /> Back to Trainings
        </button>

        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-brand-blue px-6 py-4">
            <h3 className="text-white m-0">Training Participants</h3>
            <p className="text-white/70 text-sm mt-0.5">{selectedTraining.title}</p>
          </div>
          <div className="p-6">
            <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 rounded-lg mb-5 text-sm text-brand-blue">
              <Users size={16} />
              <span><span className="font-semibold">{participants.length}</span> participant{participants.length !== 1 ? 's' : ''} assigned to this training</span>
            </div>
            {loadingParticipants ? (
              <div className="text-center py-12 text-gray-400">Loading participants…</div>
            ) : participants.length === 0 ? (
              <div className="text-center py-12 text-gray-400">No participants assigned to this training yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-brand-blue">
                    <tr>
                      {['Full Name', 'Gender', 'Contact Number', 'Batch No.', 'Status', 'Attendance'].map(h => (
                        <th key={h} className="px-5 py-3 text-left text-white text-sm font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPts.map(p => (
                      <tr key={p.beneficiaryServiceId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-5 py-3.5 text-gray-800 font-medium text-sm">
                          {p.lastName}, {p.firstName} {p.middleName}
                        </td>
                        <td className="px-5 py-3.5 text-gray-600 text-sm">{p.sex}</td>
                        <td className="px-5 py-3.5 text-gray-600 text-sm">{p.contactNumber}</td>
                        <td className="px-5 py-3.5 text-gray-600 text-sm">{selectedTraining.service || '—'}</td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${PARTICIPANT_STATUS_COLORS[p.status] ?? 'bg-gray-100 text-gray-600'}`}>
                            {p.status}
                          </span>
                        </td>
                        <td className="px-5 py-3.5">
                          {selectedTraining.status === 'Planned' ? (
                            <span className="text-gray-400 text-sm">—</span>
                          ) : selectedTraining.status === 'Completed' ? (
                            <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${p.attended === true ? 'bg-green-100 text-green-700' : p.attended === false ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                              {p.attended === true ? 'Present' : p.attended === false ? 'Absent' : '—'}
                            </span>
                          ) : (
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => handleAttendance(p.beneficiaryServiceId, selectedTraining.id, true)}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${p.attended === true ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-green-100 hover:text-green-700'}`}
                              >Present</button>
                              <button
                                onClick={() => handleAttendance(p.beneficiaryServiceId, selectedTraining.id, false)}
                                className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors ${p.attended === false ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-red-100 hover:text-red-700'}`}
                              >Absent</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {participants.length > 0 && (
              <div className="px-4 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Rows per page:</span>
                  <select value={participantPerPage} onChange={e => { setParticipantPerPage(Number(e.target.value)); setParticipantPage(1) }} className="border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue">
                    {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500">{pStart}–{pEnd} of {participants.length} records</span>
                  <div className="flex gap-1">
                    <button onClick={() => setParticipantPage(p => Math.max(1, p - 1))} disabled={psafe === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={16} /></button>
                    <button onClick={() => setParticipantPage(p => Math.min(ptotal, p + 1))} disabled={psafe === ptotal} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight size={16} /></button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  // ── Sub-view: view details / edit ─────────────────────────────────────────

  if (action === 'view_trainings' && (trainingSubView === 'view_details' || trainingSubView === 'edit') && selectedTraining) {
    const formToUse = trainingSubView === 'edit' ? editForm : {
      selectedBatch: String(selectedTraining.batchId),
      title:        selectedTraining.title,
      description:  selectedTraining.description ?? '',
      date:         selectedTraining.date,
      location:     selectedTraining.location,
      facilitator:  selectedTraining.facilitator ?? '',
      participants: selectedTraining.participants ? String(selectedTraining.participants) : '',
      status:       selectedTraining.status,
    }

    return (
      <>
        {/* Action cards */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <p className="text-gray-500 mb-5">
            Select an action for <span className="text-brand-blue font-medium">Skills Training</span>
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {ACTION_CARDS.map(card => (
              <button key={card.key} onClick={() => { setAction(card.key); setTrainingSubView('') }}
                disabled={card.label.startsWith('Add') && !canManage('skills-maintenance')}
                className={`flex flex-col items-center gap-4 py-8 px-4 rounded-2xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                  action === card.key ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-gray-200 hover:border-brand-blue hover:bg-blue-50 text-gray-600 hover:text-brand-blue'
                }`}>
                <div className={`p-4 rounded-2xl ${action === card.key ? 'bg-brand-blue text-white' : 'bg-gray-100'}`}>{card.icon}</div>
                <div className="text-center"><p className="font-medium">{card.label}</p><p className="text-xs text-gray-400 mt-1">{card.desc}</p></div>
              </button>
            ))}
          </div>
        </div>

        <button onClick={() => setTrainingSubView('')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 mb-4 text-sm font-medium">
          <ArrowLeft size={16} /> Back to Trainings
        </button>

        <TrainingForm
          mode={trainingSubView === 'edit' ? 'edit' : 'view'}
          form={formToUse}
          batches={batches}
          onChange={setEdit}
          onSave={handleSaveEdit}
          onCancel={() => setTrainingSubView('')}
        />
      </>
    )
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <>
      {/* Action cards */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <p className="text-gray-500 mb-5">
          Select an action for <span className="text-brand-blue font-medium">Skills Training</span>
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {ACTION_CARDS.map(card => (
            <button key={card.key} onClick={() => { setAction(card.key); resetAdd(); setTrainingSubView('') }}
              disabled={card.label.startsWith('Add') && !canManage('skills-maintenance')}
              className={`flex flex-col items-center gap-4 py-8 px-4 rounded-2xl border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
                action === card.key ? 'border-brand-blue bg-blue-50 text-brand-blue' : 'border-gray-200 hover:border-brand-blue hover:bg-blue-50 text-gray-600 hover:text-brand-blue'
              }`}>
              <div className={`p-4 rounded-2xl ${action === card.key ? 'bg-brand-blue text-white' : 'bg-gray-100'}`}>{card.icon}</div>
              <div className="text-center"><p className="font-medium">{card.label}</p><p className="text-xs text-gray-400 mt-1">{card.desc}</p></div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Idle ── */}
      {action === '' && (
        <div className="bg-white rounded-xl shadow-md py-20 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen size={32} className="text-brand-blue" />
          </div>
          <h3 className="text-gray-700 mb-2">Skills Training Maintenance</h3>
          <p className="text-gray-400 px-8">Select an action above to manage trainings and batches.</p>
        </div>
      )}

      {/* ── Add Training ── */}
      {action === 'add_training' && (
        <TrainingForm
          mode="add"
          form={addForm}
          errors={addErrors}
          batches={batches}
          onChange={setAdd}
          onSave={handleSaveAdd}
          onCancel={() => { resetAdd(); setAction('') }}
        />
      )}

      {/* ── View Trainings ── */}
      {action === 'view_trainings' && trainingSubView === '' && (
        <>
          {/* Filter bar */}
          <div className="bg-white rounded-xl shadow-md p-5 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <select value={trainingBatchFilter} onChange={e => { setTrainingBatchFilter(e.target.value); setCurrentPage(1) }}
                className={inputCls + ' bg-white'}>
                <option value="All">All Batches</option>
                {batches.map(b => <option key={b.id} value={b.batchName}>{b.batchName}</option>)}
              </select>
              <select value={trainingStatusFilter} onChange={e => { setTrainingStatusFilter(e.target.value); setCurrentPage(1) }}
                className={inputCls + ' bg-white'}>
                <option value="All">All Status</option>
                <option value="Planned">Planned</option>
                <option value="Ongoing">Ongoing</option>
                <option value="Completed">Completed</option>
              </select>
              <div className="relative col-span-2">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input type="text" value={trainingSearch} onChange={e => { setTrainingSearch(e.target.value); setCurrentPage(1) }}
                  placeholder="Search by title or service..."
                  className={inputCls + ' pl-9'} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md overflow-hidden">
            <div className="bg-brand-blue px-6 py-4 flex items-center justify-between">
              <div>
                <h3 className="text-white m-0">Skills Training Trainings</h3>
              </div>
              <button onClick={() => setAction('add_training')} disabled={!canManage('skills-maintenance')}
                className="flex items-center gap-2 px-4 py-2 bg-white text-brand-blue rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white">
                <Plus size={16} /> Add Training
              </button>
            </div>

            {filteredTrainings.length === 0 ? (
              <div className="text-center py-16">
                <FolderOpen size={48} className="mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">No trainings found.</p>
                <button onClick={() => setAction('add_training')} disabled={!canManage('skills-maintenance')}
                  className="mt-4 px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                  Add First Training
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Training Title</th>
                      <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Batch</th>
                      <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Date</th>
                      <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Location / Venue</th>
                      <th className="px-6 py-4 text-center text-sm text-gray-700 font-semibold">Participants</th>
                      <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Status</th>
                      <th className="px-6 py-4 w-16 text-right text-sm text-gray-700 font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTrainings.map(a => (
                      <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="px-6 py-4">
                          <p className="font-medium text-gray-800 text-sm">{a.title}</p>
                          {a.description && (
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{a.description}</p>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {a.service && isBatchName(a.service) ? (
                            <span className="px-2 py-1 bg-blue-50 text-brand-blue rounded-md text-xs font-medium">
                              {a.service}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{a.date || '—'}</td>
                        <td className="px-6 py-4 text-sm text-gray-600 max-w-[160px]">
                          <span className="line-clamp-1">{a.location || '—'}</span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600 text-center">
                          {a.assignedCount}{a.participants != null ? `/${a.participants}` : ''}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${ACTIVITY_STATUS_COLORS[a.status]}`}>
                            {a.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button onClick={e => openMenuForTraining(e, a.id)}
                            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
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
                    <span>{recordStart} to {recordEnd} of {filteredTrainings.length} records</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight size={16} /></button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Training action menu */}
          {trainingMenuId !== null && trainingMenuPos && (() => {
            const a = activities.find(x => x.id === trainingMenuId)
            if (!a) return null
            const ns = nextStatusLabel(a.status)
            return (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setTrainingMenuId(null)} />
                <div style={{ position: 'fixed', top: trainingMenuPos.top, left: trainingMenuPos.left }}
                  className="w-56 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1">
                  <button onClick={() => { setSelectedTraining(a); setTrainingSubView('view_details'); setTrainingMenuId(null) }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
                    <FolderOpen size={15} className="text-brand-blue" /> View Training Details
                  </button>
                  <button onClick={() => { setSelectedTraining(a); setTrainingSubView('view_participants'); setTrainingMenuId(null) }}
                    className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5">
                    <Users size={15} className="text-gray-500" /> View Participants
                  </button>
                  <div className="my-1 border-t border-gray-100" />
                  <button onClick={() => { openEdit(a); setTrainingMenuId(null) }} disabled={!canManage('skills-maintenance')}
                    className="w-full px-4 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                    <Edit2 size={15} className="text-blue-500" /> Edit
                  </button>
                  {ns && (
                    <button onClick={() => { setTrainingStatusConfirm({ activity: a, nextStatus: ns.next, label: ns.label }); setTrainingMenuId(null) }} disabled={!canManage('skills-maintenance')}
                      className={`w-full px-4 py-2.5 text-left text-sm flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent ${ns.next === 'Planned' ? 'text-brand-blue hover:bg-blue-50' : 'text-green-600 hover:bg-green-50'}`}>
                      {ns.next === 'Ongoing'   && <PlayCircle  size={15} className="text-green-600" />}
                      {ns.next === 'Completed' && <CheckCircle size={15} className="text-green-600" />}
                      {ns.next === 'Planned'   && <RefreshCw   size={15} className="text-brand-blue" />}
                      {ns.label}
                    </button>
                  )}
                  <div className="my-1 border-t border-gray-100" />
                  <button onClick={() => { setTrainingDeleteConfirm(a.id); setTrainingMenuId(null) }} disabled={!canManage('skills-maintenance')}
                    className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">
                    <Trash2 size={15} className="text-red-500" /> Delete
                  </button>
                </div>
              </>
            )
          })()}
        </>
      )}

      {/* ── Add Batch ── */}
      {action === 'add_batch' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-brand-blue px-6 py-4">
            <h3 className="text-white m-0">Add New Batch</h3>
            <p className="text-white/70 text-sm mt-0.5">Skills Training Program</p>
          </div>
          <div className="p-6">
            <p className="text-gray-500 text-sm mb-6 leading-relaxed">
              Add a new training batch number to the Skills Training program.{' '}
              This batch number will be available when creating new trainings.
            </p>
            <div className="max-w-lg space-y-5">
              <div>
                <label className={labelCls}>Batch Name <span className="text-red-500">*</span></label>
                <div className="flex gap-3">
                  <input type="text" value={newBatchName} onChange={e => setNewBatchName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddBatch()}
                    placeholder="e.g. BATCH-004, BATCH-005..."
                    className={`${inputCls} flex-1`} />
                  <button
                    onClick={handleAddBatch}
                    disabled={isSavingBatch}
                    className="px-5 py-2.5 bg-brand-blue text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed">
                    <Plus size={16} /> Add Batch
                  </button>
                </div>
                <p className="text-gray-400 text-sm mt-2">Press Enter or click "Add Batch" to save.</p>
              </div>

              {batches.length > 0 && (
                <div className="pt-2">
                  <p className="text-sm font-semibold text-gray-700 mb-3">Current Batches in Skills Training</p>
                  <div className="flex flex-wrap gap-2">
                    {batches.map(b => (
                      <span key={b.id} className="px-3 py-1.5 border border-brand-blue text-brand-blue rounded-full text-sm">
                        {b.batchName}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── View Batches ── */}
      {action === 'view_batches' && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="bg-brand-blue px-6 py-4 flex items-center justify-between">
            <div>
              <h3 className="text-white m-0">Skills Training Batches</h3>
            </div>
            <button onClick={() => setAction('add_batch')} disabled={!canManage('skills-maintenance')}
              className="flex items-center gap-2 px-4 py-2 bg-white text-brand-blue rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white">
              <Plus size={15} /> Add Batch
            </button>
          </div>

          {batches.length === 0 ? (
            <div className="text-center py-16">
              <FolderOpen size={48} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No batches yet.</p>
              <button onClick={() => setAction('add_batch')} disabled={!canManage('skills-maintenance')}
                className="mt-4 px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-blue-700 transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
                Add First Batch
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b-2 border-gray-200">
                  <tr>
                    <th className="px-8 py-5 text-left text-gray-800 font-bold">Batch Number</th>
                    <th className="px-8 py-5 text-left text-gray-800 font-bold">Trainings Count</th>
                    <th className="px-8 py-5 text-right text-gray-800 font-bold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedBatches.map(b => (
                    <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <span className="w-2.5 h-2.5 rounded-full bg-brand-blue flex-shrink-0" />
                          <span className="text-gray-800 font-semibold">{b.batchName}</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {b.trainingCount > 0
                          ? <span className="px-4 py-2 bg-blue-50 text-brand-blue rounded-full text-sm font-medium">{b.trainingCount} training{b.trainingCount !== 1 ? 's' : ''}</span>
                          : <span className="text-gray-400 text-sm">None</span>}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <button onClick={() => confirmDeleteBatch(b)}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {batches.length > 0 && (
            <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Rows per page:</span>
                <select value={batchPerPage} onChange={e => { setBatchPerPage(Number(e.target.value)); setBatchPage(1) }} className="border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue">
                  {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">{batchRecordStart}–{batchRecordEnd} of {batches.length} records</span>
                <div className="flex gap-1">
                  <button onClick={() => setBatchPage(p => Math.max(1, p - 1))} disabled={batchSafePage === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={16} /></button>
                  <button onClick={() => setBatchPage(p => Math.min(batchTotalPages, p + 1))} disabled={batchSafePage === batchTotalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight size={16} /></button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Training status confirmation modal ── */}
      {trainingStatusConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                {trainingStatusConfirm.nextStatus === 'Completed' ? <CheckCircle size={20} className="text-green-600" />
                  : trainingStatusConfirm.nextStatus === 'Ongoing' ? <PlayCircle size={20} style={{ color: BRAND_BLUE }} />
                  : <RefreshCw size={20} style={{ color: BRAND_BLUE }} />}
              </div>
              <h3 className="text-gray-800 m-0 text-lg">{trainingStatusConfirm.label}</h3>
            </div>
            <div className="relative flex items-start justify-between mb-6 px-2">
              <div className="absolute top-4 left-10 right-10 flex">
                {[0, 1].map(i => {
                  const steps = ['Planned', 'Ongoing', 'Completed']
                  const nextIdx = steps.indexOf(trainingStatusConfirm.nextStatus)
                  const currentIdx = steps.indexOf(trainingStatusConfirm.activity.status)
                  return <div key={i} className="flex-1 h-0.5" style={{ backgroundColor: nextIdx > currentIdx && i + 1 <= nextIdx ? BRAND_BLUE : '#e5e7eb' }} />
                })}
              </div>
              {(['Planned', 'Ongoing', 'Completed'] as const).map((s, i) => {
                const steps = ['Planned', 'Ongoing', 'Completed']
                const nextIdx = steps.indexOf(trainingStatusConfirm.nextStatus)
                const currentIdx = steps.indexOf(trainingStatusConfirm.activity.status)
                const isForward = nextIdx > currentIdx
                const isActive = isForward ? i <= nextIdx : i === currentIdx || i === nextIdx
                const isGreen = s === 'Completed' && trainingStatusConfirm.nextStatus === 'Completed' && i === nextIdx
                return (
                  <div key={s} className="flex flex-col items-center gap-1.5 relative z-10 w-20">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{ backgroundColor: isActive ? (isGreen ? '#16a34a' : BRAND_BLUE) : '#e5e7eb', color: isActive ? 'white' : '#9ca3af' }}>
                      {i + 1}
                    </div>
                    <span className="text-xs text-center leading-tight"
                      style={{ color: isActive ? (isGreen ? '#16a34a' : BRAND_BLUE) : '#9ca3af', fontWeight: isActive ? '600' : '400' }}>
                      {s}
                    </span>
                  </div>
                )
              })}
            </div>
            <p className="text-gray-600 text-sm mb-6">
              Change <span className="font-semibold text-gray-800">{trainingStatusConfirm.activity.title}</span> status from{' '}
              <span className="font-semibold" style={{ color: BRAND_BLUE }}>{trainingStatusConfirm.activity.status}</span> to{' '}
              <span className="font-semibold" style={{ color: trainingStatusConfirm.nextStatus === 'Completed' ? '#16a34a' : BRAND_BLUE }}>
                {trainingStatusConfirm.nextStatus}
              </span>?
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setTrainingStatusConfirm(null)}
                className="px-6 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium">Cancel</button>
              <button
                onClick={handleConfirmStatusChange}
                className="px-6 py-2.5 rounded-lg transition-colors font-medium text-white"
                style={{ backgroundColor: trainingStatusConfirm.nextStatus === 'Completed' ? '#16a34a' : BRAND_BLUE }}>
                {trainingStatusConfirm.label}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Training delete modal ── */}
      {trainingDeleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 text-center">
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 size={24} className="text-red-500" />
            </div>
            <h3 className="text-gray-800 mb-2">Delete Training</h3>
            <p className="text-gray-600 mb-6 text-sm">Are you sure? This action cannot be undone.</p>
            <div className="flex gap-3 justify-center">
              <button onClick={() => setTrainingDeleteConfirm(null)} className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">Cancel</button>
              <button onClick={handleDeleteTraining}
                className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
