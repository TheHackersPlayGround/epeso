// Shared across every program module (starting with Skills Training) -- one
// modal, backed by the one shared job_placements table, instead of a
// separate placement form built per module. Any module's action menu can
// open this the same way, passing that applicant's own beneficiaryServiceId.

import { useState, useEffect } from 'react'
import { X, Briefcase, Edit2, Trash2, Loader2, Plus } from 'lucide-react'
import ConfirmModal from './ConfirmModal'
import DatePicker from '../../components/DatePicker'
import * as jobPlacementService from '../../services/jobPlacementService'
import type { JobPlacement } from '../../services/jobPlacementService'

interface JobPlacementModalProps {
  beneficiaryServiceId: number
  applicantName: string
  canManage: boolean
  onClose: () => void
}

const inputCls = 'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent placeholder-gray-400'
const labelCls = 'block text-sm font-medium text-gray-700 mb-1'

function emptyFormState() {
  return { jobTitle: '', employer: '', dateHired: '', employmentType: '', remarks: '' }
}

// Mirrors job_placement_employment_type_enum (migration 057).
const EMPLOYMENT_TYPE_OPTIONS = ['Full-time', 'Part-time', 'Contractual']

function errMsg(e: unknown, fallback: string) {
  return (e as { response?: { data?: { message?: string } }; message?: string })?.response?.data?.message
    ?? (e as { message?: string })?.message ?? fallback
}

export default function JobPlacementModal({ beneficiaryServiceId, applicantName, canManage, onClose }: JobPlacementModalProps) {
  const [placements, setPlacements] = useState<JobPlacement[]>([])
  const [loading, setLoading] = useState(true)
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyFormState())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; label: string } | null>(null)
  const [resultModal, setResultModal] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({ isOpen: false, type: 'success', title: '', message: '' })

  const load = async () => {
    setLoading(true)
    try {
      setPlacements(await jobPlacementService.listByApplicant(beneficiaryServiceId))
    } catch {
      // silent — show empty list rather than crashing
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [beneficiaryServiceId])

  const openAdd = () => { setEditingId(null); setForm(emptyFormState()); setErrors({}); setFormOpen(true) }
  const openEdit = (p: JobPlacement) => {
    setEditingId(p.id)
    setForm({ jobTitle: p.jobTitle, employer: p.employer, dateHired: p.dateHired, employmentType: p.employmentType, remarks: p.remarks })
    setErrors({})
    setFormOpen(true)
  }
  const closeForm = () => { setFormOpen(false); setEditingId(null) }

  const set = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.jobTitle.trim()) errs.jobTitle = 'Job title is required'
    if (!form.employer.trim()) errs.employer = 'Employer is required'
    if (!form.dateHired) errs.dateHired = 'Date hired is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (isSaving || !validate()) return
    setIsSaving(true)
    try {
      if (editingId) {
        await jobPlacementService.updatePlacement(editingId, form)
      } else {
        await jobPlacementService.createPlacement({ ...form, beneficiaryServiceId })
      }
      await load()
      closeForm()
      setResultModal({ isOpen: true, type: 'success', title: 'Saved', message: editingId ? 'Job placement updated.' : 'Job placement recorded.' })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to save job placement.') })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteConfirm) return
    try {
      await jobPlacementService.deletePlacement(deleteConfirm.id)
      setDeleteConfirm(null)
      await load()
      setResultModal({ isOpen: true, type: 'success', title: 'Deleted', message: 'Job placement deleted.' })
    } catch (e: unknown) {
      setDeleteConfirm(null)
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to delete job placement.') })
    }
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
            <div>
              <h3 className="text-gray-800 font-semibold">Job Placement</h3>
              <p className="text-sm text-gray-400 mt-0.5">{applicantName}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {formOpen ? (
              <div className="space-y-4">
                <div>
                  <label className={labelCls}>Job Title<span className="text-red-500 ml-0.5">*</span></label>
                  <input className={`${inputCls} ${errors.jobTitle ? 'border-red-400' : ''}`} value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} placeholder="e.g. Welder" />
                  {errors.jobTitle && <p className="text-red-500 text-xs mt-1">{errors.jobTitle}</p>}
                </div>
                <div>
                  <label className={labelCls}>Employer<span className="text-red-500 ml-0.5">*</span></label>
                  <input className={`${inputCls} ${errors.employer ? 'border-red-400' : ''}`} value={form.employer} onChange={e => set('employer', e.target.value)} placeholder="e.g. ABC Construction Corp." />
                  {errors.employer && <p className="text-red-500 text-xs mt-1">{errors.employer}</p>}
                </div>
                <div>
                  <label className={labelCls}>Date Hired<span className="text-red-500 ml-0.5">*</span></label>
                  <DatePicker className={`${inputCls} ${errors.dateHired ? 'border-red-400' : ''}`} value={form.dateHired} onChange={v => set('dateHired', v)} />
                  {errors.dateHired && <p className="text-red-500 text-xs mt-1">{errors.dateHired}</p>}
                </div>
                <div>
                  <label className={labelCls}>Employment Type</label>
                  <select className={inputCls} value={form.employmentType} onChange={e => set('employmentType', e.target.value)}>
                    <option value="">Select type</option>
                    {EMPLOYMENT_TYPE_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Remarks</label>
                  <textarea className={inputCls} rows={2} value={form.remarks} onChange={e => set('remarks', e.target.value)} placeholder="Optional notes" />
                </div>
              </div>
            ) : loading ? (
              <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
            ) : placements.length === 0 ? (
              <div className="text-center py-8">
                <Briefcase size={40} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm text-gray-400">No job placement recorded yet.</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {placements.map(p => (
                  <li key={p.id} className="border border-gray-200 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800">{p.jobTitle}</p>
                        <p className="text-xs text-gray-500">{p.employer}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Hired {p.dateHired}{p.employmentType ? ` · ${p.employmentType}` : ''}
                        </p>
                        {p.remarks && <p className="text-xs text-gray-500 mt-1">{p.remarks}</p>}
                      </div>
                      {canManage && (
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button onClick={() => openEdit(p)} className="p-1.5 text-gray-400 hover:text-brand-blue hover:bg-blue-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
                          <button onClick={() => setDeleteConfirm({ id: p.id, label: `${p.jobTitle} at ${p.employer}` })} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="px-6 py-4 border-t border-gray-100 flex gap-2 flex-shrink-0">
            {formOpen ? (
              <>
                <button onClick={closeForm} disabled={isSaving} className="flex-1 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50">Cancel</button>
                <button onClick={handleSave} disabled={isSaving} className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark disabled:opacity-50 flex items-center justify-center gap-1.5">
                  {isSaving && <Loader2 size={14} className="animate-spin" />}
                  {isSaving ? 'Saving…' : 'Save'}
                </button>
              </>
            ) : (
              <>
                {canManage && (
                  <button onClick={openAdd} className="flex-1 py-2 border border-brand-blue text-brand-blue rounded-lg text-sm hover:bg-blue-50 flex items-center justify-center gap-1.5">
                    <Plus size={14} /> Add Placement
                  </button>
                )}
                <button onClick={onClose} className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark">Close</button>
              </>
            )}
          </div>
        </div>
      </div>

      <ConfirmModal
        isOpen={!!deleteConfirm}
        type="confirm"
        title="Delete Job Placement?"
        message={`Are you sure you want to delete "${deleteConfirm?.label}"? This cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />
      <ConfirmModal
        isOpen={resultModal.isOpen}
        type={resultModal.type}
        title={resultModal.title}
        message={resultModal.message}
        confirmText="OK"
        onConfirm={() => setResultModal(prev => ({ ...prev, isOpen: false }))}
        onCancel={() => setResultModal(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  )
}
