import { useState } from 'react'
import Swal from 'sweetalert2'
import {
  ArrowLeft, Plus, FolderOpen, PlusCircle, MoreHorizontal,
  Edit2, Trash2, CheckCircle, PlayCircle, Lock, RefreshCw, ClipboardList,
  Wrench, Users,
} from 'lucide-react'

import { useSPES } from '../../contexts/SPESContext'
import type { SPESBatch } from '../../contexts/SPESContext'
import SPESMaintenanceForm from './SPESMaintenanceForm'

// ─── Types ────────────────────────────────────────────────────────────────────

type MaintenanceTab = 'CDSP' | 'GIP' | 'SPES' | 'Livelihood' | 'Skills Training'
type SPESAction = '' | 'add_batch' | 'view_batches'
type SPESBatchAction = '' | 'view_batch' | 'edit_batch' | 'view_participants'

interface MaintenanceProps {
  onBack?: () => void
}

// ─── Status badge colors ──────────────────────────────────────────────────────

const BATCH_STATUS_COLORS: Record<SPESBatch['status'], string> = {
  Open:      'bg-blue-100 text-blue-700',
  Closed:    'bg-gray-100 text-gray-600',
  Ongoing:   'bg-green-100 text-green-700',
  Completed: 'bg-blue-100 text-blue-700',
}

const APPLICANT_STATUS_COLORS: Record<string, string> = {
  Active:   'bg-blue-100 text-blue-700',
  Inactive: 'bg-gray-100 text-gray-500',
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TABS: { key: MaintenanceTab; label: string }[] = [
  { key: 'CDSP',           label: 'CDSP' },
  { key: 'GIP',            label: 'GIP' },
  { key: 'SPES',           label: 'SPES' },
  { key: 'Livelihood',     label: 'Livelihood' },
  { key: 'Skills Training',label: 'Skills Training' },
]

// ─── Coming soon placeholder ──────────────────────────────────────────────────

function ComingSoon({ tab }: { tab: string }) {
  return (
    <div className="bg-white rounded-xl shadow-md py-24 text-center">
      <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Wrench size={28} className="text-brand-blue" />
      </div>
      <h3 className="text-gray-700 mb-2">{tab} Maintenance</h3>
      <p className="text-gray-400 text-sm text-center px-8">
        This tab is under construction. Check back soon.
      </p>
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

function MaintenanceInner({ onBack }: MaintenanceProps) {
  const { spesBatches, setSpesBatches, updateSpesBatch, applicants: spesApplicants, setApplicants } = useSPES()

  const [activeTab, setActiveTab] = useState<MaintenanceTab>('SPES')
  const [spesAction, setSpesAction] = useState<SPESAction>('')
  const [spesBatchAction, setSpesBatchAction] = useState<SPESBatchAction>('')
  const [selectedBatch, setSelectedBatch] = useState<SPESBatch | null>(null)

  // Ellipsis menu
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)

  // Status change confirm
  const [statusConfirm, setStatusConfirm] = useState<{
    batch: SPESBatch
    nextStatus: SPESBatch['status']
    action: string
  } | null>(null)

  // Delete confirm
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)

  // ── Helpers ────────────────────────────────────────────────────────────────

  const resetSpesState = () => {
    setSpesAction('')
    setSpesBatchAction('')
    setSelectedBatch(null)
  }

  const handleTabChange = (tab: MaintenanceTab) => {
    setActiveTab(tab)
    resetSpesState()
  }

  // ── SPES: Add Batch ────────────────────────────────────────────────────────

  const handleAddBatch = (data: Omit<SPESBatch, 'id'>, isDraft?: boolean) => {
    setSpesBatches(prev => [...prev, { ...data, id: Date.now(), isDraft: isDraft ?? false }])
    setSpesAction('')
    Swal.fire({
      icon: 'success',
      title: isDraft ? 'Draft Saved' : 'Batch Added',
      text: isDraft ? 'Draft saved successfully.' : 'New SPES batch has been added successfully.',
      confirmButtonText: 'OK',
      confirmButtonColor: '#0077BE',
    })
  }

  // ── SPES: Update Batch ─────────────────────────────────────────────────────

  const handleUpdateBatch = (updated: SPESBatch) => {
    updateSpesBatch(updated)
    setSpesBatchAction('')
    setSelectedBatch(null)
    Swal.fire({
      icon: 'success',
      title: 'Batch Updated',
      text: 'Batch details have been saved successfully.',
      confirmButtonText: 'OK',
      confirmButtonColor: '#0077BE',
    })
  }

  // ── SPES: Status change ────────────────────────────────────────────────────

  // (status change is handled by the inline modal below)

  // ── SPES: Delete ───────────────────────────────────────────────────────────

  const confirmDelete = () => {
    if (deleteConfirm === null) return
    const batchId = deleteConfirm
    setApplicants(prev => prev.map(a => {
      if (a.assignedBatchId !== batchId) return a
      return { ...a, assignedBatchId: null, assignedActivity: '', status: 'Inactive' as const }
    }))
    setSpesBatches(prev => prev.filter(b => b.id !== batchId))
    setDeleteConfirm(null)
  }

  // ── SPES: Render batch form (add/view/edit) ────────────────────────────────

  if (activeTab === 'SPES' && (spesBatchAction === 'view_batch' || spesBatchAction === 'edit_batch')) {
    const mode = spesBatchAction === 'view_batch' ? 'batch-view' : 'batch-edit'
    return (
      <div className="w-full px-6 py-8">
        <div className="mb-4">
          <button
            onClick={() => { setSpesBatchAction(''); setSelectedBatch(null) }}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            <ArrowLeft size={16} /> Back to Batches
          </button>
        </div>
        <SPESMaintenanceForm
          mode={mode}
          initialBatch={selectedBatch ?? undefined}
          onSaveBatch={handleAddBatch}
          onUpdateBatch={handleUpdateBatch}
          onCancel={() => { setSpesBatchAction(''); setSelectedBatch(null) }}
        />
      </div>
    )
  }

  // ── SPES: View Participants sub-view ───────────────────────────────────────

  if (activeTab === 'SPES' && spesBatchAction === 'view_participants' && selectedBatch) {
    const participants = spesApplicants.filter(a =>
      a.assignedBatchId === selectedBatch.id ||
      a.assignmentHistory.some(h => h.batchId === selectedBatch.id)
    )
    return (
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-4">
          <button
            onClick={() => { setSpesBatchAction(''); setSelectedBatch(null) }}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            <ArrowLeft size={16} /> Back to Batches
          </button>
        </div>
        <div className="bg-brand-blue rounded-xl px-6 py-4 mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-white text-base font-semibold">{selectedBatch.batchName}</h3>
            <p className="text-white/80 text-sm mt-0.5">
              {participants.length} participant{participants.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${BATCH_STATUS_COLORS[selectedBatch.status]}`}>
            {selectedBatch.status}
          </span>
        </div>
        {participants.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
            <p className="text-gray-500 text-sm">No participants assigned to this batch yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-blue">
                  <th className="px-4 py-3 text-left text-white font-semibold">Full Name</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Gender</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Contact Number</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">School</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {participants.map((a, i) => (
                  <tr key={a.id} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{a.lastName}, {a.firstName} {a.middleName}</td>
                    <td className="px-4 py-3 text-gray-600">{a.sex || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{a.contactNumber || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{a.email || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <p>{a.schoolName || '—'}</p>
                      {a.gradeYearLevel && <p className="text-xs text-gray-400">{a.gradeYearLevel}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${APPLICANT_STATUS_COLORS[a.status] ?? 'bg-gray-100 text-gray-500'}`}>
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

  // ── Main layout ────────────────────────────────────────────────────────────

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">

      {/* Page header */}
      <div className="flex items-center gap-4 mb-6">
        {onBack && (
          <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
        )}
        <div>
          <h2 className="text-gray-800 m-0">Maintenance</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Manage {activeTab} program projects and services
          </p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-white rounded-xl p-1 shadow-md overflow-x-auto">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => handleTabChange(tab.key)}
            className={`px-5 py-2 rounded-lg transition-all text-sm whitespace-nowrap flex-shrink-0 ${
              activeTab === tab.key
                ? 'bg-brand-blue text-white'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Non-SPES tabs: coming soon */}
      {activeTab !== 'SPES' && <ComingSoon tab={activeTab} />}

      {/* SPES tab content */}
      {activeTab === 'SPES' && (
        <>
          {/* Action cards */}
          <div className="bg-white rounded-xl shadow-md p-6 mb-6">
            <p className="text-gray-500 mb-5">
              Select an action for <span className="text-brand-blue font-medium">SPES</span>
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {[
                { key: 'add_batch' as SPESAction, label: 'Add Batch', icon: <PlusCircle size={32} />, desc: 'Create a new SPES deployment batch' },
                { key: 'view_batches' as SPESAction, label: 'View Batches', icon: <FolderOpen size={32} />, desc: 'Browse all batches' },
              ].map(action => (
                <button
                  key={action.key}
                  onClick={() => setSpesAction(action.key)}
                  className={`flex flex-col items-center gap-4 py-8 px-4 rounded-2xl border-2 transition-all ${
                    spesAction === action.key
                      ? 'border-brand-blue bg-blue-50 text-brand-blue'
                      : 'border-gray-200 hover:border-brand-blue hover:bg-blue-50 text-gray-600 hover:text-brand-blue'
                  }`}
                >
                  <div className={`p-4 rounded-2xl ${spesAction === action.key ? 'bg-brand-blue text-white' : 'bg-gray-100'}`}>
                    {action.icon}
                  </div>
                  <div className="text-center">
                    <p className="font-medium">{action.label}</p>
                    <p className="text-xs text-gray-400 mt-1">{action.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Empty idle state */}
          {spesAction === '' && (
            <div className="bg-white rounded-xl shadow-md py-20 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <FolderOpen size={32} className="text-brand-blue" />
              </div>
              <h3 className="text-gray-700 mb-2">SPES Program Maintenance</h3>
              <p className="text-gray-400 text-center px-8">
                Select an action above to manage projects and services for the SPES program.
              </p>
            </div>
          )}

          {/* Add Batch form — inline below action cards */}
          {spesAction === 'add_batch' && (
            <SPESMaintenanceForm
              mode="batch"
              onSaveBatch={handleAddBatch}
              onCancel={() => setSpesAction('')}
            />
          )}

          {/* View Batches table */}
          {spesAction === 'view_batches' && (
            <>
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                <div className="bg-brand-blue px-6 py-4 flex items-center justify-between">
                  <div>
                    <h3 className="text-white m-0">SPES Batches</h3>
                    <p className="text-white/70 text-sm">{spesBatches.length} batch(es) found</p>
                  </div>
                  <button
                    onClick={() => setSpesAction('add_batch')}
                    className="flex items-center gap-2 px-4 py-2 bg-white text-brand-blue rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium"
                  >
                    <Plus size={16} /> Add Batch
                  </button>
                </div>

                {spesBatches.length === 0 ? (
                  <div className="text-center py-16">
                    <FolderOpen size={48} className="mx-auto text-gray-300 mb-3" />
                    <p className="text-gray-500">No SPES batches found.</p>
                    <button
                      onClick={() => setSpesAction('add_batch')}
                      className="mt-4 px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors text-sm"
                    >
                      Add First Batch
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-6 py-4 text-left text-gray-700 whitespace-nowrap">Batch Name</th>
                          <th className="px-6 py-4 text-left text-gray-700 whitespace-nowrap">Employer / Agency</th>
                          <th className="px-6 py-4 text-left text-gray-700 whitespace-nowrap">Slots</th>
                          <th className="px-6 py-4 text-left text-gray-700 whitespace-nowrap">Program Period</th>
                          <th className="px-6 py-4 text-left text-gray-700 whitespace-nowrap">Funding Source</th>
                          <th className="px-6 py-4 text-left text-gray-700 whitespace-nowrap">Status</th>
                          <th className="px-6 py-4 text-left text-gray-700 whitespace-nowrap w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {spesBatches.map(b => (
                          <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="px-6 py-4">
                              <span className="text-gray-800 font-medium">{b.batchName}</span>
                              {b.isDraft && (
                                <span className="ml-2 px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">Draft</span>
                              )}
                              {b.description && (
                                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{b.description}</p>
                              )}
                              {(() => {
                                const count = spesApplicants.filter(a => a.assignedBatchId === b.id).length
                                return count > 0 ? (
                                  <span className="inline-flex items-center gap-1 text-xs text-brand-blue mt-1">
                                    <Users size={11} /> {count} applicant{count !== 1 ? 's' : ''} assigned
                                  </span>
                                ) : null
                              })()}
                            </td>
                            <td className="px-6 py-4 text-gray-600 max-w-[180px]">
                              <p className="line-clamp-1">{b.employer || '—'}</p>
                              {b.deploymentLocation && (
                                <p className="text-xs text-gray-400 line-clamp-1">{b.deploymentLocation}</p>
                              )}
                            </td>
                            <td className="px-6 py-4 text-gray-600 text-center whitespace-nowrap">
                              {b.availableSlots || '—'}
                            </td>
                            <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                              {b.programStartDate && b.programEndDate
                                ? `${b.programStartDate} – ${b.programEndDate}`
                                : '—'}
                            </td>
                            <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                              {b.fundingSource || '—'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${BATCH_STATUS_COLORS[b.status]}`}>
                                {b.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <button
                                onClick={e => {
                                  const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                                  const dropdownW = 192
                                  const dropdownH = 200
                                  const left = Math.min(rect.right - dropdownW, window.innerWidth - dropdownW - 8)
                                  const spaceBelow = window.innerHeight - rect.bottom - 8
                                  const top = spaceBelow >= dropdownH ? rect.bottom + 4 : rect.top - dropdownH - 4
                                  setMenuPos({ top: Math.max(8, top), left: Math.max(8, left) })
                                  setOpenMenuId(openMenuId === b.id ? null : b.id)
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

              {/* Batch action menu portal */}
              {openMenuId !== null && menuPos && (() => {
                const b = spesBatches.find(x => x.id === openMenuId)
                if (!b) return null
                return (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                    <div
                      style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
                      className="w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1"
                    >
                      <button
                        onClick={() => { setSelectedBatch(b); setSpesBatchAction('view_batch'); setOpenMenuId(null) }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                      >
                        <FolderOpen size={15} className="text-brand-blue" />
                        View Batch Details
                      </button>
                      <button
                        onClick={() => { setSelectedBatch(b); setSpesBatchAction('view_participants'); setOpenMenuId(null) }}
                        className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                      >
                        <ClipboardList size={15} className="text-gray-500" />
                        View Participants
                      </button>
                      <div className="my-1 border-t border-gray-100" />
                      <button
                        onClick={() => { setSelectedBatch(b); setSpesBatchAction('edit_batch'); setOpenMenuId(null) }}
                        className="w-full px-4 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2.5"
                      >
                        <Edit2 size={15} className="text-blue-500" />
                        Edit
                      </button>
                      {b.status === 'Open' && (
                        <button
                          onClick={() => { setStatusConfirm({ batch: b, nextStatus: 'Closed', action: 'Close Batch' }); setOpenMenuId(null) }}
                          className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                        >
                          <Lock size={15} className="text-gray-500" />
                          Close Batch
                        </button>
                      )}
                      {b.status === 'Closed' && (
                        <button
                          onClick={() => { setStatusConfirm({ batch: b, nextStatus: 'Ongoing', action: 'Mark as Ongoing' }); setOpenMenuId(null) }}
                          className="w-full px-4 py-2.5 text-left text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2.5"
                        >
                          <PlayCircle size={15} className="text-blue-500" />
                          Mark as Ongoing
                        </button>
                      )}
                      {b.status === 'Ongoing' && (
                        <button
                          onClick={() => { setStatusConfirm({ batch: b, nextStatus: 'Completed', action: 'Mark as Completed' }); setOpenMenuId(null) }}
                          className="w-full px-4 py-2.5 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2.5"
                        >
                          <CheckCircle size={15} className="text-green-600" />
                          Mark as Completed
                        </button>
                      )}
                      {b.status === 'Completed' && (
                        <button
                          onClick={() => { setStatusConfirm({ batch: b, nextStatus: 'Open', action: 'Reopen Batch' }); setOpenMenuId(null) }}
                          className="w-full px-4 py-2.5 text-left text-sm text-brand-blue hover:bg-blue-50 flex items-center gap-2.5"
                        >
                          <RefreshCw size={15} className="text-brand-blue" />
                          Reopen Batch
                        </button>
                      )}
                      <div className="my-1 border-t border-gray-100" />
                      <button
                        onClick={() => { setDeleteConfirm(b.id); setOpenMenuId(null) }}
                        className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2.5"
                      >
                        <Trash2 size={15} className="text-red-500" />
                        Delete
                      </button>
                    </div>
                  </>
                )
              })()}
            </>
          )}
        </>
      )}

      {/* Status change confirmation modal */}
      {statusConfirm !== null && (() => {
        const { batch, nextStatus, action } = statusConfirm
        const stepOrder: SPESBatch['status'][] = ['Open', 'Closed', 'Ongoing', 'Completed']
        const currentIdx = stepOrder.indexOf(batch.status)
        const nextIdx = stepOrder.indexOf(nextStatus)
        const isForward = nextIdx > currentIdx

        const circleClass = (step: SPESBatch['status']) => {
          const idx = stepOrder.indexOf(step)
          if (isForward) {
            if (idx < nextIdx) return { bg: 'bg-blue-400', text: 'text-white', label: 'text-blue-400 font-semibold' }
            if (idx === nextIdx) return nextStatus === 'Completed'
              ? { bg: 'bg-green-600', text: 'text-white', label: 'text-green-600 font-semibold' }
              : { bg: 'bg-blue-600', text: 'text-white', label: 'text-blue-600 font-semibold' }
            return { bg: 'bg-gray-200', text: 'text-gray-400', label: 'text-gray-400' }
          } else {
            if (idx === currentIdx) return { bg: 'bg-blue-400', text: 'text-white', label: 'text-blue-400 font-semibold' }
            if (idx === nextIdx) return { bg: 'bg-blue-600', text: 'text-white', label: 'text-blue-600 font-semibold' }
            return { bg: 'bg-gray-200', text: 'text-gray-400', label: 'text-gray-400' }
          }
        }

        const connectorClass = (i: number) =>
          isForward && i + 1 <= nextIdx ? 'bg-blue-400' : 'bg-gray-200'

        const actionIcon =
          action === 'Close Batch' ? <Lock size={20} className="text-gray-600" /> :
          action === 'Mark as Ongoing' ? <PlayCircle size={20} className="text-blue-600" /> :
          action === 'Mark as Completed' ? <CheckCircle size={20} className="text-green-600" /> :
          <RefreshCw size={20} className="text-brand-blue" />

        const confirmBtnClass =
          nextStatus === 'Completed' ? 'bg-green-600 hover:bg-green-700 text-white' :
          'bg-blue-600 hover:bg-blue-700 text-white'

        const nextStatusTextClass =
          nextStatus === 'Completed' ? 'text-green-600' : 'text-blue-600'

        return (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-5">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                  {actionIcon}
                </div>
                <h3 className="text-gray-800 m-0 text-lg">{action}</h3>
              </div>

              {/* Progress stepper */}
              <div className="relative flex items-start justify-between mb-6 px-2">
                <div className="absolute top-4 left-10 right-10 flex">
                  {[0, 1, 2].map(i => (
                    <div key={i} className={`flex-1 h-0.5 ${connectorClass(i)}`} />
                  ))}
                </div>
                {stepOrder.map((step, i) => {
                  const styles = circleClass(step)
                  return (
                    <div key={step} className="flex flex-col items-center gap-1.5 relative z-10 w-16">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${styles.bg} ${styles.text}`}>
                        {i + 1}
                      </div>
                      <span className={`text-xs text-center leading-tight ${styles.label}`}>{step}</span>
                    </div>
                  )
                })}
              </div>

              <p className="text-gray-600 text-sm mb-6">
                Change <span className="font-semibold text-gray-800">{batch.batchName}</span> status from{' '}
                <span className="text-blue-400 font-semibold">{batch.status}</span> to{' '}
                <span className={`font-semibold ${nextStatusTextClass}`}>{nextStatus}</span>?
              </p>

              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setStatusConfirm(null)}
                  className="px-6 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    updateSpesBatch({ ...batch, status: nextStatus })
                    setStatusConfirm(null)
                    Swal.fire({
                      icon: 'success',
                      title: 'Status Updated',
                      text: `Batch status changed to ${nextStatus}.`,
                      confirmButtonText: 'OK',
                      confirmButtonColor: '#0077BE',
                    })
                  }}
                  className={`px-6 py-2.5 rounded-lg transition-colors font-medium ${confirmBtnClass}`}
                >
                  {action}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Delete confirmation modal */}
      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
            <div className="p-6 text-center">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-500" />
              </div>
              <h3 className="text-gray-800 mb-2">Delete SPES Batch</h3>
              <p className="text-gray-600 mb-6 text-sm">
                Are you sure you want to delete this batch? This action cannot be undone.
              </p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={() => setDeleteConfirm(null)}
                  className="px-6 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function Maintenance({ onBack }: MaintenanceProps) {
  return <MaintenanceInner onBack={onBack} />
}
