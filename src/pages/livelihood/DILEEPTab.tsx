import { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react'
import { fmtDate } from '../../utils/formatDate'
import SearchableSelect from '../../components/SearchableSelect'
import ProjectNameLabel from '../../components/ProjectNameLabel'
import { formatProjectName } from '../../utils/projectName'
import { searchProvinces, searchCities, searchBarangaysByCity } from '../../services/locationService'
import {
  Search, Plus, ChevronDown, ChevronRight, ChevronLeft, X, Download, Upload,
  MoreHorizontal, Users, Info, Loader2,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import ConfirmModal from '../shared/ConfirmModal'
import { canManage } from '../../utils/permissions'
import { useDILP } from '../../contexts/DILPContext'
import type { DILPApplicant, DILPProject } from '../../contexts/DILPContext'
import * as dilpService from '../../services/dilpService'
import { useTUPAD } from '../../contexts/TUPADContext'
import type { TUPADApplicant, TUPADProject } from '../../contexts/TUPADContext'
import * as tupadService from '../../services/tupadService'
import DILPProfileForm, { EMPTY_DILP_RECORD } from './DILPProfileForm'
import TUPADProfileForm, { EMPTY_TUPAD_RECORD } from './TUPADProfileForm'
import { downloadImportTemplate as downloadDilpTemplate, importDilpApplicants, type ImportResult as DilpImportResult } from './dilpImport'
import { downloadImportTemplate as downloadTupadTemplate, importTupadApplicants, type ImportResult as TupadImportResult } from './tupadImport'
import { useRefreshOnReturn } from '../../hooks/useRefreshOnReturn'
import WithdrawDialog from '../../components/WithdrawDialog'
import AssignedItemModal, { type AssignedItemAction } from '../../components/AssignedItemModal'
import { WithdrawalBanner, WithdrawalFootnote } from '../../components/WithdrawalNotice'

// ─── Constants ────────────────────────────────────────────────────────────────

type DILEEPProgram = 'DILEEP (DILP)' | 'DILEEP (TUPAD)'
type DILEEPApplicant = DILPApplicant | TUPADApplicant
type DILEEPProject = DILPProject | TUPADProject
type DILEEPStatus = 'Active' | 'Inactive' | 'Completed' | 'Withdrawn'

const PROGRAM_STATUS_OPTIONS: DILEEPStatus[] = ['Active', 'Inactive', 'Completed']
// Withdrawn (left an Ongoing project early) exists for TUPAD only.
const TUPAD_STATUS_OPTIONS: DILEEPStatus[] = [...PROGRAM_STATUS_OPTIONS, 'Withdrawn']

const SEX_OPTIONS = ['Male', 'Female']

const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Annulled']

const STATUS_COLORS: Record<DILEEPStatus, string> = {
  Active:    'bg-green-100 text-green-700',
  Completed: 'bg-blue-100 text-blue-700',
  Inactive:  'bg-gray-200 text-gray-400',
  Withdrawn: 'bg-orange-100 text-orange-700',
}

function errMsg(e: unknown, fallback: string) {
  return (e as { message?: string })?.message ?? fallback
}

function projectTitle(program: DILEEPProgram, project: DILEEPProject): string {
  return program === 'DILEEP (DILP)' ? (project as DILPProject).projectName : (project as TUPADProject).title
}

// Only DILP projects run per barangay (e.g. "Cassava Production" in many barangays), so only
// they get a barangay shown beside the name. TUPAD projects return '' and show the plain title.
function projectBarangay(program: DILEEPProgram, project: DILEEPProject): string {
  return program === 'DILEEP (DILP)' ? (project as DILPProject).barangay : ''
}

// Barangay of the project a beneficiary is assigned to (DILP only), looked up from the loaded projects.
function assignedBarangay(dilpProjects: DILPProject[], isDILP: boolean, b: DILEEPApplicant): string {
  if (!isDILP || !b.assignedProjectId) return ''
  return dilpProjects.find(p => p.id === b.assignedProjectId)?.barangay ?? ''
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterOption = { id: string; label: string; options: string[] }

// One step of the Address filter (Province / City / Barangay): the picked place's ID and name.
type AddressPick = { id: number; name: string } | null
type AddressFilter = { province: AddressPick; city: AddressPick; barangay: AddressPick }
const EMPTY_ADDRESS_FILTER: AddressFilter = { province: null, city: null, barangay: null }

// ─── Name helpers ─────────────────────────────────────────────────────────────

function formatDisplayName(b: { lastName: string; firstName: string; middleName?: string; nameExtension?: string }): string {
  const given = [b.firstName, b.middleName, b.nameExtension].filter(Boolean).join(' ')
  return `${b.lastName}, ${given}`
}

// Table rows show just the middle initial (e.g. "Salvador" -> "S."), matching
// the abbreviated-name convention used in list views elsewhere in the app
// (e.g. the recycle bin). Modal headers and confirmation dialogs keep using
// formatDisplayName's full middle name instead — this one is table-only.
function formatTableName(b: { lastName: string; firstName: string; middleName?: string; nameExtension?: string }): string {
  const middleInitial = b.middleName?.trim() ? `${b.middleName.trim().charAt(0)}.` : ''
  const given = [b.firstName, middleInitial, b.nameExtension].filter(Boolean).join(' ')
  return `${b.lastName}, ${given}`
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: DILEEPStatus }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

function projectStatusClass(status: string) {
  if (status === 'Ongoing') return 'bg-green-100 text-green-700'
  if (status === 'Planned') return 'bg-yellow-100 text-yellow-700'
  if (status === 'Completed') return 'bg-blue-100 text-blue-700'
  return 'bg-gray-100 text-gray-500'
}

// ─── Import modal ──────────────────────────────────────────────────────────────

type DileepImportResult = DilpImportResult | TupadImportResult

function DileepImportModal({
  isDILP, onClose, onImported,
}: {
  isDILP: boolean
  onClose: () => void
  onImported: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [result, setResult] = useState<DileepImportResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const programLabel = isDILP ? 'DILP' : 'TUPAD'
  // The beneficiary list reload is deferred until the modal actually closes --
  // triggering it while the modal is still open would flip the page's shared
  // `loading` flag, which unmounts this whole modal (and its success message)
  // before the user ever sees it.
  const [needsRefresh, setNeedsRefresh] = useState(false)

  function pickFile(f: File | null) {
    setFile(f)
    setResult(null)
    setError(null)
  }

  async function handleImport() {
    if (!file || isImporting) return
    setIsImporting(true)
    setError(null)
    setResult(null)
    setProgress({ done: 0, total: 0 })
    try {
      const res = isDILP
        ? await importDilpApplicants(file, (done, total) => setProgress({ done, total }))
        : await importTupadApplicants(file, (done, total) => setProgress({ done, total }))
      setResult(res)
      if (res.succeeded > 0) setNeedsRefresh(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the file. Make sure it's a valid .xlsx file.")
    } finally {
      setIsImporting(false)
      setProgress(null)
    }
  }

  function handleClose() {
    if (needsRefresh) onImported()
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 flex-shrink-0">
          <p className="text-gray-800 font-semibold">Import {programLabel} Beneficiaries</p>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto">
          {result ? (
            <DileepImportResultView result={result} />
          ) : (
            <>
              <div>
                <button onClick={() => { void (isDILP ? downloadDilpTemplate() : downloadTupadTemplate()) }} className="w-full py-2 border border-dashed border-gray-300 rounded-lg text-sm text-gray-500 hover:bg-gray-50">Download Template</button>
                <p className="text-xs text-gray-400 mt-1.5 text-center">Download the template file to ensure correct format.</p>
              </div>

              <label className={`block w-full border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${file ? 'border-brand-blue bg-blue-50' : 'border-gray-300 hover:border-brand-blue hover:bg-blue-50'}`}>
                <Upload size={28} className="mx-auto text-gray-400 mb-2" />
                <p className="text-sm text-gray-600 break-all">{file ? file.name : 'Click to upload or drag and drop'}</p>
                <p className="text-xs text-gray-400 mt-1">.xlsx files only</p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  disabled={isImporting}
                  onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                />
              </label>

              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
              {isImporting && progress && (
                <p className="text-sm text-gray-600 text-center">Importing {progress.done} of {progress.total}…</p>
              )}
            </>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-gray-200 flex-shrink-0">
          {result ? (
            <button onClick={handleClose} className="flex-1 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark text-sm">Done</button>
          ) : (
            <>
              <button onClick={handleClose} disabled={isImporting} className="flex-1 py-2 border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 text-sm disabled:opacity-50">Cancel</button>
              <button onClick={handleImport} disabled={!file || isImporting} className="flex-1 py-2 bg-brand-blue text-white rounded-lg text-sm hover:bg-brand-blue-dark disabled:opacity-50 disabled:cursor-not-allowed">
                {isImporting ? 'Importing…' : 'Import'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function DileepImportResultView({ result }: { result: DileepImportResult }) {
  return (
    <div>
      <div className="flex items-center gap-4 mb-3">
        <div className="flex-1 rounded-lg bg-green-50 border border-green-200 px-3 py-2 text-center">
          <p className="text-2xl font-semibold text-green-700">{result.succeeded}</p>
          <p className="text-xs text-green-700">Imported</p>
        </div>
        <div className="flex-1 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-center">
          <p className="text-2xl font-semibold text-red-700">{result.failed.length}</p>
          <p className="text-xs text-red-700">Failed</p>
        </div>
      </div>

      {result.total === 0 ? (
        <p className="text-sm text-gray-500 text-center">No applicant rows were found in the file.</p>
      ) : result.failed.length === 0 ? (
        <p className="text-sm text-green-700 text-center">All {result.succeeded} applicant{result.succeeded !== 1 ? 's' : ''} imported successfully.</p>
      ) : (
        <div className="mt-1">
          <p className="text-xs text-gray-500 mb-2">
            No records were imported — records are imported together as one batch, so if any row fails, none of them are saved. Fix the row{result.failed.length !== 1 ? 's' : ''} below and re-upload the file.
          </p>
          <p className="text-xs font-semibold text-gray-600 mb-1">Rows that could not be imported:</p>
          <ul className="space-y-1 max-h-48 overflow-y-auto text-xs">
            {result.failed.map((f) => (
              <li key={f.row} className="rounded border border-red-100 bg-red-50 px-2 py-1.5">
                <span className="font-medium text-gray-700">Row {f.row} — {f.name}:</span>{' '}
                <span className="text-red-600">{f.error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

// ─── Assign Project Modal ─────────────────────────────────────────────────────

type AssignProjectModalProps = {
  beneficiary: DILEEPApplicant
  program: DILEEPProgram
  projects: DILEEPProject[]
  onAssign: (projectId: number, projectName: string) => void
  onUnassign: () => void
  onClose: () => void
  isAssigning: boolean
}

function AssignProjectModal({ beneficiary, program, projects, onAssign, onUnassign, onClose, isAssigning }: AssignProjectModalProps) {
  const [projectSearch, setProjectSearch] = useState('')
  const [selectedProject, setSelectedProject] = useState<DILEEPProject | null>(null)
  const [confirmingAssign, setConfirmingAssign] = useState(false)

  const serviceLabel = program === 'DILEEP (DILP)' ? 'DILP' : 'DILEEP (TUPAD)'

  const exited = !!(beneficiary as TUPADApplicant).exitedAt
  const currentProject = beneficiary.assignedProjectId && !exited
    ? projects.find(p => p.id === beneficiary.assignedProjectId) ?? null
    : null

  const programProjects = projects.filter(p => p.status === 'Planned')

  const filteredProjects = projectSearch.trim()
    ? programProjects.filter(p => formatProjectName(projectTitle(program, p), projectBarangay(program, p)).toLowerCase().includes(projectSearch.toLowerCase()))
    : programProjects

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-brand-blue px-5 pt-5 pb-4 flex items-start justify-between">
          <div>
            <h3 className="text-white font-bold text-base">Assign Project</h3>
            <p className="text-white/80 text-xs mt-0.5">{formatDisplayName(beneficiary)}</p>
          </div>
          <button onClick={onClose} disabled={isAssigning} aria-label="Close" className="text-white/80 hover:text-white transition-colors p-1 mt-0.5 disabled:opacity-50 disabled:cursor-not-allowed">
            <X size={18} />
          </button>
        </div>

        {selectedProject ? (
          <>
            {/* Project details — read + confirm before assigning */}
            <div className="px-4 pt-4">
              <button
                onClick={() => setSelectedProject(null)}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 transition-colors mb-3"
              >
                <ChevronLeft size={14} /> Back to project list
              </button>
              <p className="text-xs font-bold text-brand-blue uppercase tracking-widest mb-3">Project Details</p>
              <div className="grid grid-cols-2 gap-3 max-h-56 overflow-y-auto pr-1">
                {(program === 'DILEEP (TUPAD)'
                  ? [
                      ['Title', (selectedProject as TUPADProject).title],
                      ['Date', (selectedProject as TUPADProject).date],
                      ['Location', (selectedProject as TUPADProject).location],
                      ['Description', (selectedProject as TUPADProject).description],
                    ]
                  : [
                      ['Project ID Number', (selectedProject as DILPProject).projectIdNumber || '—'],
                      ['Project Name', (selectedProject as DILPProject).projectName],
                      ['Project Type', (selectedProject as DILPProject).typeOfProject],
                      ['Program Component', (selectedProject as DILPProject).programComponent],
                      ['Implementation Type', (selectedProject as DILPProject).wayOfImplementation],
                    ]
                ).map(([detailLabel, detailValue]) => (
                  <div key={detailLabel} className={detailLabel === 'Description' || detailLabel === 'Implementation Type' ? 'col-span-2' : ''}>
                    <p className="text-xs text-gray-500">{detailLabel}</p>
                    <p className="text-sm text-gray-800 font-medium">{detailValue || '—'}</p>
                  </div>
                ))}
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-xs font-medium ${projectStatusClass(selectedProject.status)}`}>
                    {selectedProject.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="px-4 py-4 border-t border-gray-100 flex gap-3 mt-3">
              <button
                onClick={() => setSelectedProject(null)}
                disabled={isAssigning}
                className="flex-1 py-2.5 text-xs text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={() => setConfirmingAssign(true)}
                disabled={!canManage('livelihood') || isAssigning}
                className="flex-1 py-2.5 text-xs text-white bg-brand-blue rounded-xl hover:bg-brand-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
              >
                {isAssigning && <Loader2 size={14} className="animate-spin" />}
                {isAssigning ? 'Assigning…' : 'Assign'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Search */}
            <div className="px-4 pt-4 pb-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={projectSearch}
                  onChange={e => setProjectSearch(e.target.value)}
                  placeholder="Search projects..."
                  aria-label="Search projects"
                  className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-brand-blue placeholder:text-gray-400"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5 flex items-center gap-1">
                <Info size={11} />
                Only {serviceLabel} projects with <span className="font-semibold">Planned</span> status are shown
              </p>
            </div>

            {/* Currently assigned card */}
            {currentProject && (
              <div className="mx-4 mb-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
                <p className="text-xs font-bold text-brand-blue uppercase tracking-widest mb-1.5">Currently Assigned</p>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-brand-blue">
                      <ProjectNameLabel name={projectTitle(program, currentProject)} barangay={projectBarangay(program, currentProject)} />
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {program === 'DILEEP (DILP)' && (currentProject as DILPProject).typeOfProject && (
                        <span className="text-xs border border-brand-blue text-brand-blue rounded-full px-2 py-0.5">
                          {(currentProject as DILPProject).typeOfProject}
                        </span>
                      )}
                      <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${projectStatusClass(currentProject.status)}`}>
                        {currentProject.status}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onUnassign}
                    disabled={!canManage('livelihood') || isAssigning}
                    className="text-red-500 text-xs font-semibold hover:text-red-700 transition-colors flex-shrink-0 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {isAssigning && <Loader2 size={12} className="animate-spin" />}
                    {isAssigning ? 'Removing…' : 'Unassign'}
                  </button>
                </div>
              </div>
            )}

            {/* Project list */}
            <div className="px-4 max-h-56 overflow-y-auto">
              {filteredProjects.length === 0 ? (
                <p className="text-center text-xs text-gray-400 py-6">No projects found</p>
              ) : (
                filteredProjects.map(project => {
                  const isCurrent = project.id === beneficiary.assignedProjectId
                  const tupadProject = program === 'DILEEP (TUPAD)' ? (project as TUPADProject) : null
                  const isFull = !!tupadProject && !isCurrent && !!tupadProject.participants
                    && tupadProject.assignedCount >= parseInt(tupadProject.participants, 10)
                  return (
                    <button
                      key={project.id}
                      onClick={() => { if (!isFull) setSelectedProject(project) }}
                      disabled={isFull}
                      title={isFull ? 'This project is already at full capacity.' : undefined}
                      className={`w-full text-left py-3 border-b border-gray-100 last:border-b-0 transition-colors flex items-start justify-between gap-2 ${
                        isFull ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-xs font-semibold text-gray-800">
                            <ProjectNameLabel name={projectTitle(program, project)} barangay={projectBarangay(program, project)} />
                          </p>
                          {isCurrent && (
                            <span className="text-xs bg-orange-100 text-orange-600 rounded-full px-2 py-0.5 font-medium">Current</span>
                          )}
                        </div>
                        {tupadProject ? (
                          <>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {[tupadProject.date, tupadProject.location].filter(Boolean).join(' • ')}
                              {tupadProject.participants && ` • ${tupadProject.assignedCount}/${tupadProject.participants} participants`}
                            </p>
                            {tupadProject.description && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{tupadProject.description}</p>
                            )}
                          </>
                        ) : (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {[(project as DILPProject).typeOfProject, (project as DILPProject).programComponent].filter(Boolean).join(' • ')}
                          </p>
                        )}
                      </div>
                      <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${projectStatusClass(project.status)}`}>
                        {isFull ? 'Full' : project.status}
                      </span>
                    </button>
                  )
                })
              )}
            </div>

            {/* Cancel */}
            <div className="px-4 py-4 border-t border-gray-100">
              <button
                onClick={onClose}
                className="w-full py-2.5 text-xs text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </>
        )}
      </div>
      <ConfirmModal
        isOpen={confirmingAssign}
        type="confirm"
        title="Confirm Assignment"
        message={selectedProject ? `Assign "${formatProjectName(projectTitle(program, selectedProject), projectBarangay(program, selectedProject))}" to ${formatDisplayName(beneficiary)}?` : ''}
        confirmText="Yes, Assign"
        cancelText="Cancel"
        onConfirm={() => { setConfirmingAssign(false); if (selectedProject) onAssign(selectedProject.id, formatProjectName(projectTitle(program, selectedProject), projectBarangay(program, selectedProject))) }}
        onCancel={() => setConfirmingAssign(false)}
      />
    </div>
  )
}

// ─── View Assigned Project Modal ─────────────────────────────────────────────

type ViewAssignedProjectModalProps = {
  beneficiary: DILEEPApplicant
  program: DILEEPProgram
  projects: DILEEPProject[]
  onChangeAssignment: () => void
  onWithdraw?: () => void
  onClose: () => void
}

function ViewAssignedProjectModal({ beneficiary: b, program, projects, onChangeAssignment, onWithdraw, onClose }: ViewAssignedProjectModalProps) {
  const assignedProject = b.assignedProjectId ? projects.find(p => p.id === b.assignedProjectId) ?? null : null
  // Matches the backend's unassign guard (dilp.php/tupad.php): once the
  // project moves past Planned, changing/unassigning would erase the only
  // record this assignment ever happened -- so only Planned can be changed.
  const canChange = assignedProject?.status === 'Planned'
  const money = (v?: string | null) => (v ? `\u20B1${Number(v).toLocaleString()}` : undefined)

  const actions: AssignedItemAction[] = []
  if (onWithdraw && b.status === 'Active' && assignedProject?.status === 'Ongoing') {
    actions.push({
      label: 'Mark as withdrawn', variant: 'warning', disabled: !canManage('livelihood'),
      onClick: () => { onWithdraw(); onClose() },
    })
  }
  if (canChange && canManage('livelihood')) {
    actions.push({ label: 'Change Assignment', variant: 'primary', onClick: onChangeAssignment })
  }

  if (program === 'DILEEP (TUPAD)') {
    const p = assignedProject as TUPADProject | null
    const exitedAt = (b as TUPADApplicant).exitedAt
    const exitReason = (b as TUPADApplicant).exitReason
    return (
      <AssignedItemModal
        title="Assigned Project"
        personName={formatDisplayName(b)}
        itemName={p?.title || b.assignedProjectName}
        status={p?.status}
        description={p?.description}
        notFound={!p}
        rows={[
          { label: 'Date', value: p?.date },
          { label: 'Location', value: p?.location },
          { label: 'Facilitator', value: p?.facilitator },
          { label: 'Participants', value: p ? (p.participants ? `${p.assignedCount}/${p.participants}` : String(p.assignedCount)) : undefined },
          { label: 'Assistance Amount', value: money(p?.assistanceAmount) },
          { label: 'Date Released', value: p?.dateReleased },
        ]}
        banner={exitedAt ? <WithdrawalBanner exitedAt={exitedAt} reason={exitReason} /> : undefined}
        footnote={exitedAt ? <WithdrawalFootnote what="project" /> : undefined}
        actions={actions}
        onClose={onClose}
      />
    )
  }

  const p = assignedProject as DILPProject | null
  return (
    <AssignedItemModal
      title="Assigned Project"
      personName={formatDisplayName(b)}
      itemName={p ? <ProjectNameLabel name={p.projectName} barangay={p.barangay} /> : b.assignedProjectName}
      subtitle={p?.projectIdNumber}
      status={p?.status}
      notFound={!p}
      rows={[
        { label: 'Project Type', value: p?.typeOfProject },
        { label: 'Program Component', value: p?.programComponent },
        { label: 'Way of Implementation', value: p?.wayOfImplementation },
        { label: 'Region', value: b.region },
        { label: 'Province', value: b.province },
        { label: 'City / Municipality', value: b.cityMunicipality },
        { label: 'Barangay', value: b.barangay },
        { label: 'Street / Purok', value: b.streetPurok },
        { label: 'Assistance Amount', value: money(p?.assistanceAmount) },
        { label: 'Date Released', value: p?.dateReleased },
      ]}
      actions={actions}
      onClose={onClose}
    />
  )
}

// ─── Beneficiary List (sub-view inside DILEEP) ────────────────────────────────
// Renders 3 separate cards: action buttons | search+filter | table+pagination

type BeneficiaryListProps = {
  program: DILEEPProgram
  onWizardChange: (open: boolean) => void
}

function BeneficiaryList({ program, onWizardChange }: BeneficiaryListProps) {
  const dilp = useDILP()
  const tupad = useTUPAD()
  const isDILP = program === 'DILEEP (DILP)'
  const applicants: DILEEPApplicant[] = isDILP ? dilp.applicants : tupad.applicants
  const projects: DILEEPProject[] = isDILP ? dilp.projects : tupad.projects
  const refreshProfiles = isDILP ? dilp.refreshProfiles : tupad.refreshProfiles
  const refreshProjects = isDILP ? dilp.refreshProjects : tupad.refreshProjects
  useRefreshOnReturn(isDILP ? dilp.refreshIfStale : tupad.refreshIfStale)

  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [isImportOpen, setIsImportOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [addressFilter, setAddressFilter] = useState<AddressFilter>(EMPTY_ADDRESS_FILTER)
  const [perPage, setPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<'firstName_asc' | 'firstName_desc' | 'lastName_asc' | 'lastName_desc' | 'dateApplied_newest' | 'dateApplied_oldest' | ''>('')
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  // anchor is set immediately on click (button's own position); pos is the
  // menu's actual final placement, corrected by measuring the menu's real
  // rendered height once it mounts (see the layout effect below) -- a
  // hardcoded height guess drifts stale every time a menu item is added or
  // removed.
  const [menuAnchor, setMenuAnchor] = useState<{ top: number; bottom: number; right: number } | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (openMenuId === null || !menuAnchor || !menuRef.current) return
    const height = menuRef.current.getBoundingClientRect().height
    const spaceBelow = window.innerHeight - menuAnchor.bottom
    const showAbove = spaceBelow < height + 8 && menuAnchor.top > height
    const top = showAbove ? Math.max(8, menuAnchor.top - height - 4) : menuAnchor.bottom + 4
    setMenuPos(prev => (prev && prev.top === top && prev.right === menuAnchor.right) ? prev : { top, right: menuAnchor.right })
  }, [openMenuId, menuAnchor])
  const [viewingBeneficiary, setViewingBeneficiary] = useState<DILEEPApplicant | null>(null)
  const [editingBeneficiary, setEditingBeneficiary] = useState<DILEEPApplicant | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [assigningBeneficiary, setAssigningBeneficiary] = useState<DILEEPApplicant | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)
  const [viewingAssignedProject, setViewingAssignedProject] = useState<DILEEPApplicant | null>(null)
  const [viewingAssignmentHistoryFor, setViewingAssignmentHistoryFor] = useState<TUPADApplicant | null>(null)
  const [resultModal, setResultModal] = useState<{ isOpen: boolean; type: 'success' | 'error'; title: string; message: string }>({ isOpen: false, type: 'success', title: '', message: '' })
  const [removeConfirm, setRemoveConfirm] = useState<{ id: number; name: string } | null>(null)
  // Mark as withdrawn (TUPAD only): someone leaving a project that has already started.
  const [withdrawTarget, setWithdrawTarget] = useState<TUPADApplicant | null>(null)
  const [isWithdrawing, setIsWithdrawing] = useState(false)

  useEffect(() => {
    onWizardChange(isAddOpen || !!editingBeneficiary || !!viewingBeneficiary)
  }, [isAddOpen, editingBeneficiary, viewingBeneficiary])

  const programLabel = isDILP ? 'DILP' : 'TUPAD'

  const availableFilters: FilterOption[] = [
    { id: 'status',      label: 'Status',       options: isDILP ? PROGRAM_STATUS_OPTIONS : TUPAD_STATUS_OPTIONS },
    { id: 'sex',         label: 'Sex',           options: SEX_OPTIONS },
    { id: 'civilStatus', label: 'Civil Status',  options: CIVIL_STATUS_OPTIONS },
    // Address has three pickers instead of one dropdown, so it is drawn separately
    { id: 'address',     label: 'Address',       options: [] },
  ]

  async function handleAddBeneficiary(data: Record<string, unknown>) {
    try {
      if (isDILP) await dilpService.createProfile(data)
      else await tupadService.createProfile(data)
      await refreshProfiles()
      setIsAddOpen(false)
      setResultModal({ isOpen: true, type: 'success', title: 'Success', message: 'Beneficiary profile has been added successfully.' })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to save profile.') })
    }
  }

  async function handleEditSave(data: Record<string, unknown>) {
    if (!editingBeneficiary) return
    try {
      if (isDILP) await dilpService.updateProfile(editingBeneficiary.id, data)
      else await tupadService.updateProfile(editingBeneficiary.id, data)
      await refreshProfiles()
      setEditingBeneficiary(null)
      setResultModal({ isOpen: true, type: 'success', title: 'Success', message: 'Beneficiary profile has been updated successfully.' })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to update profile.') })
    }
  }

  function handleAddFilter(id: string) {
    setActiveFilters(prev => [...prev, id])
    setCurrentPage(1)
  }

  function handleRemoveFilter(id: string) {
    setActiveFilters(prev => prev.filter(f => f !== id))
    setFilterValues(prev => { const n = { ...prev }; delete n[id]; return n })
    if (id === 'address') setAddressFilter(EMPTY_ADDRESS_FILTER)
    setCurrentPage(1)
  }

  function handleFilterValueChange(id: string, value: string) {
    setFilterValues(prev => ({ ...prev, [id]: value }))
    setCurrentPage(1)
  }

  function handleToggleMenu(e: React.MouseEvent, id: number) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const right = window.innerWidth - rect.right
    // Provisional placement below the button; the layout effect corrects
    // this to the menu's real measured height right after it mounts, before
    // paint.
    setMenuAnchor({ top: rect.top, bottom: rect.bottom, right })
    setMenuPos({ top: rect.bottom + 4, right })
    setOpenMenuId(openMenuId === id ? null : id)
  }

  function closeMenu() { setOpenMenuId(null) }

  function handleConfirmRemove(id: number, name: string) {
    closeMenu()
    setRemoveConfirm({ id, name })
  }

  async function proceedRemove() {
    if (!removeConfirm) return
    const { id, name } = removeConfirm
    setRemoveConfirm(null)
    try {
      if (isDILP) await dilpService.deleteProfile(id)
      else await tupadService.deleteProfile(id)
      await refreshProfiles()
      setResultModal({ isOpen: true, type: 'success', title: 'Removed', message: `${name} moved to the recycle bin.` })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to remove beneficiary.') })
    }
  }

  async function handleAssignProject(projectId: number, projectName: string) {
    if (!assigningBeneficiary || isAssigning) return
    setIsAssigning(true)
    try {
      if (isDILP) await dilpService.assignProject(assigningBeneficiary.id, projectId)
      else await tupadService.assignProject(assigningBeneficiary.id, projectId)
      await refreshProfiles()
      await refreshProjects()
      setAssigningBeneficiary(null)
      setResultModal({ isOpen: true, type: 'success', title: 'Success', message: `Assigned to "${projectName}" successfully.` })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to assign project.') })
    } finally {
      setIsAssigning(false)
    }
  }

  async function handleUnassignProject() {
    if (!assigningBeneficiary || isAssigning) return
    setIsAssigning(true)
    try {
      if (isDILP) await dilpService.unassignProject(assigningBeneficiary.id)
      else await tupadService.unassignProject(assigningBeneficiary.id)
      await refreshProfiles()
      await refreshProjects()
      setAssigningBeneficiary(null)
      setResultModal({ isOpen: true, type: 'success', title: 'Removed', message: 'Assigned project has been removed.' })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to remove assignment.') })
    } finally {
      setIsAssigning(false)
    }
  }

  async function handleWithdraw(reason: string, exitDate: string) {
    if (!withdrawTarget || isWithdrawing) return
    const name = formatDisplayName(withdrawTarget)
    setIsWithdrawing(true)
    try {
      await tupadService.withdrawFromProject(withdrawTarget.id, reason, exitDate)
      await refreshProfiles()
      await refreshProjects()
      setWithdrawTarget(null)
      setResultModal({ isOpen: true, type: 'success', title: 'Withdrawn', message: `${name} has been marked as withdrawn.` })
    } catch (e: unknown) {
      setResultModal({ isOpen: true, type: 'error', title: 'Error', message: errMsg(e, 'Failed to mark as withdrawn.') })
    } finally {
      setIsWithdrawing(false)
    }
  }

  const filtered = useMemo(() => {
    let result = applicants
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(b =>
        formatDisplayName(b).toLowerCase().includes(q) ||
        (b.barangay ?? '').toLowerCase().includes(q) ||
        (b.assignedProjectName ?? '').toLowerCase().includes(q) ||
        assignedBarangay(dilp.projects, isDILP, b).toLowerCase().includes(q)
      )
    }
    // Address: IDs, not names -- barangay and city names repeat across places.
    // Each picked level narrows further; unpicked levels match everyone.
    if (activeFilters.includes('address')) {
      const { province, city, barangay } = addressFilter
      if (province) result = result.filter(b => b.provinceId === province.id)
      if (city)     result = result.filter(b => b.cityId === city.id)
      if (barangay) result = result.filter(b => b.barangayId === barangay.id)
    }
    for (const filterId of activeFilters) {
      const value = filterValues[filterId]
      if (!value) continue
      if (filterId === 'status')      result = result.filter(b => b.status === value)
      if (filterId === 'sex')         result = result.filter(b => b.sex === value)
      if (filterId === 'civilStatus') result = result.filter(b => b.civilStatus === value)
    }
    return result
  }, [applicants, searchQuery, activeFilters, filterValues, addressFilter, dilp.projects, isDILP])

  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === 'dateApplied_newest') return (b.dateApplied || '').localeCompare(a.dateApplied || '')
    if (sortOrder === 'dateApplied_oldest') return (a.dateApplied || '').localeCompare(b.dateApplied || '')
    if (!sortOrder) return 0
    const keyA = (sortOrder.startsWith('firstName') ? a.firstName : a.lastName).toLowerCase()
    const keyB = (sortOrder.startsWith('firstName') ? b.firstName : b.lastName).toLowerCase()
    return sortOrder.endsWith('asc') ? keyA.localeCompare(keyB) : keyB.localeCompare(keyA)
  })

  const isFiltered = searchQuery.trim() !== '' || activeFilters.some(f => filterValues[f]) ||
    (activeFilters.includes('address') && !!addressFilter.province)
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = sorted.slice((safePage - 1) * perPage, safePage * perPage)
  const recordStart = sorted.length === 0 ? 0 : (safePage - 1) * perPage + 1
  const recordEnd = Math.min(safePage * perPage, sorted.length)

  const menuBeneficiary = paginated.find(b => b.id === openMenuId) ?? null

  // Column order/names here must match dilpImport.ts's / tupadImport.ts's
  // expected headers exactly (Import looks columns up by name via
  // get()/norm(), not position) -- this is what makes an exported .xlsx
  // directly re-importable later. DILP and TUPAD have different field
  // sets (DILP has Email/Classification/4Ps, TUPAD doesn't), so each gets
  // its own header list and row shape.
  const DILP_IMPORT_HEADERS = [
    'Last Name', 'First Name', 'Middle Name', 'Extension Name', 'Sex', 'Birthdate (MM/DD/YYYY)', 'Civil Status',
    'Contact Number', 'Email Address',
    'Beneficiary Classification', 'Classification, if Others', '4Ps Beneficiary?', 'Year Graduated / Exited',
    'Province', 'City / Municipality', 'Barangay', 'Street / Purok',
    'Date Applied (MM/DD/YYYY)', 'Received By', 'Remarks',
    'Age', 'Assigned Project', 'Status',
  ]
  const TUPAD_IMPORT_HEADERS = [
    'Last Name', 'First Name', 'Middle Name', 'Extension Name', 'Sex', 'Birthdate (MM/DD/YYYY)', 'Civil Status',
    'Contact Number',
    'Province', 'City / Municipality', 'Barangay', 'Street / Purok',
    'Date Applied (MM/DD/YYYY)', 'Received By', 'Remarks',
    'Age', 'Assigned Project', 'Status',
  ]

  function buildImportCompatibleRows(): (string | number)[][] {
    if (isDILP) {
      return (filtered as DILPApplicant[]).map(b => [
        b.lastName, b.firstName, b.middleName, b.nameExtension, b.sex, b.birthdate, b.civilStatus,
        b.contactNumber, b.email,
        b.beneficiaryClassification, b.beneficiaryClassificationOther, b.is4PsBeneficiary ? 'Yes' : 'No', b.yearGraduated4Ps,
        b.province, b.cityMunicipality, b.barangay, b.streetPurok,
        b.dateApplied, b.receivedBy, b.remarks,
        b.age, b.assignedProjectName, b.status,
      ])
    }
    return (filtered as TUPADApplicant[]).map(b => [
      b.lastName, b.firstName, b.middleName, b.nameExtension, b.sex, b.birthdate, b.civilStatus,
      b.contactNumber,
      b.province, b.cityMunicipality, b.barangay, b.streetPurok,
      b.dateApplied, b.receivedBy, b.remarks,
      b.age, b.assignedProjectName, b.status,
    ])
  }

  async function handleExportExcel() {
    setIsExporting(true)
    await new Promise(resolve => setTimeout(resolve, 0))
    try {
      // Row 1 is left blank: Import always skips the physical first row
      // (range: 1), since the downloadable Template has a merged
      // section-label band there. Real headers go on row 2.
      const headers = isDILP ? DILP_IMPORT_HEADERS : TUPAD_IMPORT_HEADERS
      const aoa = [[], headers, ...buildImportCompatibleRows()]
      const ws = XLSX.utils.aoa_to_sheet(aoa)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, programLabel)
      XLSX.writeFile(wb, `${programLabel}_beneficiaries.xlsx`)
    } finally {
      setIsExporting(false)
    }
  }

  if (isDILP ? dilp.loading : tupad.loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400 text-sm">
        Loading {programLabel} beneficiaries…
      </div>
    )
  }

  if (isDILP) {
    if (isAddOpen) {
      return (
        <DILPProfileForm
          mode="add"
          initial={EMPTY_DILP_RECORD}
          onSave={handleAddBeneficiary}
          onClose={() => setIsAddOpen(false)}
        />
      )
    }
    if (editingBeneficiary) {
      return (
        <DILPProfileForm
          key={editingBeneficiary.id}
          mode="edit"
          initial={editingBeneficiary as DILPApplicant}
          onSave={handleEditSave}
          onClose={() => setEditingBeneficiary(null)}
        />
      )
    }
    if (viewingBeneficiary) {
      return (
        <DILPProfileForm
          key={viewingBeneficiary.id}
          mode="view"
          initial={viewingBeneficiary as DILPApplicant}
          onSave={() => {}}
          onClose={() => setViewingBeneficiary(null)}
          onEdit={() => { setEditingBeneficiary(viewingBeneficiary); setViewingBeneficiary(null) }}
        />
      )
    }
  } else {
    if (isAddOpen) {
      return (
        <TUPADProfileForm
          mode="add"
          initial={EMPTY_TUPAD_RECORD}
          onSave={handleAddBeneficiary}
          onClose={() => setIsAddOpen(false)}
        />
      )
    }
    if (editingBeneficiary) {
      return (
        <TUPADProfileForm
          key={editingBeneficiary.id}
          mode="edit"
          initial={editingBeneficiary as TUPADApplicant}
          onSave={handleEditSave}
          onClose={() => setEditingBeneficiary(null)}
        />
      )
    }
    if (viewingBeneficiary) {
      return (
        <TUPADProfileForm
          key={viewingBeneficiary.id}
          mode="view"
          initial={viewingBeneficiary as TUPADApplicant}
          onSave={() => {}}
          onClose={() => setViewingBeneficiary(null)}
          onEdit={() => { setEditingBeneficiary(viewingBeneficiary); setViewingBeneficiary(null) }}
        />
      )
    }
  }

  return (
    <>
    <div className="flex flex-col gap-4">
      {/* Card 1 — Action buttons */}
      <div className="bg-white rounded-xl shadow-sm px-5 py-4 flex items-center gap-3">
        <button
          onClick={() => setIsAddOpen(true)}
          disabled={!canManage('livelihood')}
          className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg text-sm font-medium hover:bg-brand-blue-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue"
        >
          <Plus size={16} />
          Add Profile
        </button>

        <button
          onClick={() => setIsImportOpen(true)}
          disabled={!canManage('livelihood')}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
          <Upload size={16} />
          Import
        </button>

        <button
          onClick={handleExportExcel}
          disabled={isExporting}
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
          {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          {isExporting ? 'Exporting…' : 'Export'}
        </button>
      </div>

      {/* Table card — search, filter, and table (GIP style) */}
      <div className="bg-white rounded-xl shadow-md p-4">
        <div className="mb-4">
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-48">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
                placeholder="Search by name..."
                aria-label={`Search ${programLabel} beneficiaries`}
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:border-brand-blue placeholder:text-gray-400"
              />
            </div>

            <div className="relative">
              <select
                value={sortOrder}
                onChange={e => setSortOrder(e.target.value as typeof sortOrder)}
                className="appearance-none pl-4 pr-8 py-2 border border-gray-300 rounded-full bg-white text-sm text-gray-700 focus:outline-none focus:border-brand-blue cursor-pointer whitespace-nowrap"
              >
                <option value="" disabled>Sort By</option>
          <option value="firstName_asc">First Name ASC</option>
                <option value="firstName_desc">First Name DSC</option>
                <option value="lastName_asc">Last Name ASC</option>
                <option value="lastName_desc">Last Name DSC</option>
                <option value="dateApplied_newest">Date Applied (Latest)</option>
                <option value="dateApplied_oldest">Date Applied (Oldest)</option>
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
            <div className="relative">
              <button
                onClick={() => setIsFilterOpen(o => !o)}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 transition-colors whitespace-nowrap text-sm text-gray-700"
              >
                <Plus size={16} />
                <span>Filter By</span>
                <ChevronDown size={14} className="text-gray-500" />
              </button>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setIsFilterOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-20">
                    {availableFilters.filter(f => !activeFilters.includes(f.id)).length === 0 ? (
                      <p className="px-4 py-3 text-sm text-gray-400 italic">All filters applied</p>
                    ) : (
                      availableFilters.filter(f => !activeFilters.includes(f.id)).map(f => (
                        <button
                          key={f.id}
                          onClick={() => { handleAddFilter(f.id); setIsFilterOpen(false) }}
                          className="w-full px-4 py-3 text-left text-sm text-gray-700 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
                        >
                          {f.label}
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          {activeFilters.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {activeFilters.map(filterId => {
                const filter = availableFilters.find(f => f.id === filterId)
                if (!filter) return null
                if (filterId === 'address') {
                  return (
                    <div key={filterId} className="flex flex-wrap items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
                      <span className="text-sm text-blue-700 font-medium whitespace-nowrap">Address:</span>
                      <div className="w-44">
                        <SearchableSelect
                          value={addressFilter.province?.name ?? ''}
                          placeholder="All provinces"
                          fetchOptions={s => searchProvinces(s)}
                          onSelect={opt => { setAddressFilter({ province: opt, city: null, barangay: null }); setCurrentPage(1) }}
                        />
                      </div>
                      <div className="w-44">
                        <SearchableSelect
                          value={addressFilter.city?.name ?? ''}
                          placeholder={addressFilter.province ? 'All cities' : 'Pick province first'}
                          disabled={!addressFilter.province}
                          refetchKey={addressFilter.province?.id ?? ''}
                          fetchOptions={s => searchCities(addressFilter.province?.id ?? 0, s)}
                          onSelect={opt => { setAddressFilter(prev => ({ ...prev, city: opt, barangay: null })); setCurrentPage(1) }}
                        />
                      </div>
                      <div className="w-44">
                        <SearchableSelect
                          value={addressFilter.barangay?.name ?? ''}
                          placeholder={addressFilter.city ? 'All barangays' : 'Pick city first'}
                          disabled={!addressFilter.city}
                          refetchKey={addressFilter.city?.id ?? ''}
                          fetchOptions={s => searchBarangaysByCity(addressFilter.city?.id ?? 0, s)}
                          onSelect={opt => { setAddressFilter(prev => ({ ...prev, barangay: opt })); setCurrentPage(1) }}
                        />
                      </div>
                      <button
                        onClick={() => setAddressFilter(EMPTY_ADDRESS_FILTER)}
                        className="text-xs text-blue-700 hover:text-blue-900 underline whitespace-nowrap"
                      >
                        Clear
                      </button>
                      <button
                        onClick={() => handleRemoveFilter(filterId)}
                        aria-label="Remove Address filter"
                        className="text-blue-700 hover:text-blue-900 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )
                }
                return (
                  <div key={filterId} className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-full">
                    <span className="text-sm text-blue-700 font-medium whitespace-nowrap">{filter.label}:</span>
                    <select
                      value={filterValues[filterId] ?? ''}
                      onChange={e => handleFilterValueChange(filterId, e.target.value)}
                      onClick={e => e.stopPropagation()}
                      className="text-sm bg-transparent border-none focus:outline-none text-blue-700 font-medium pr-1 cursor-pointer"
                    >
                      <option value="">All</option>
                      {filter.options.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                    <button
                      onClick={() => handleRemoveFilter(filterId)}
                      aria-label={`Remove ${filter.label} filter`}
                      className="text-blue-700 hover:text-blue-900 transition-colors"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="bg-brand-blue">
              <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">NAME</th>
              {activeFilters.includes('sex') && <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">SEX</th>}
              {activeFilters.includes('civilStatus') && <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">CIVIL STATUS</th>}
              <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">BARANGAY</th>
              <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">ASSIGNED PROJECT</th>
              <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">DATE APPLIED</th>
              <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">STATUS</th>
              <th className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={7 + ['sex', 'civilStatus'].filter(f => activeFilters.includes(f)).length} className="py-16 text-center">
                  <div className="flex flex-col items-center gap-3 text-gray-400">
                    <Users size={48} strokeWidth={1.5} />
                    {isFiltered ? (
                      <>
                        <p className="text-base font-medium text-gray-500">No beneficiaries match your filters</p>
                        <p className="text-sm">Try adjusting your search or removing some filters.</p>
                      </>
                    ) : (
                      <>
                        <p className="text-base font-medium text-gray-500">No beneficiaries yet</p>
                        <p className="text-sm">Click "Add Profile" to get started.</p>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map(b => (
                <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-800 font-semibold whitespace-nowrap">{formatTableName(b)}</td>
                  {activeFilters.includes('sex') && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.sex ?? '—'}</td>}
                  {activeFilters.includes('civilStatus') && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.civilStatus ?? '—'}</td>}
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.barangay ?? '-'}</td>
                  <td className="px-4 py-3">
                    {b.assignedProjectName ? (
                      <div>
                        <p className="text-gray-800 font-medium whitespace-nowrap">
                          <ProjectNameLabel name={b.assignedProjectName} barangay={assignedBarangay(dilp.projects, isDILP, b)} />
                        </p>
                        {/* Withdrawn (TUPAD): the project's own status would read as the person's, so show when they left instead. */}
                        {(b as TUPADApplicant).exitedAt ? (
                          <span className="inline-block mt-1.5 text-xs text-orange-600">Left on {fmtDate((b as TUPADApplicant).exitedAt as string)}</span>
                        ) : b.assignedProjectStatus && (
                          <span className={`inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${projectStatusClass(b.assignedProjectStatus)}`}>
                            {b.assignedProjectStatus}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Not assigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(b.dateApplied)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={e => handleToggleMenu(e, b.id)}
                      aria-label={`Actions for ${formatDisplayName(b)}`}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                    >
                      <MoreHorizontal size={16} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            Show
            <select
              value={perPage}
              onChange={e => { setPerPage(Number(e.target.value)); setCurrentPage(1) }}
              className="border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-brand-blue"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
            </select>
            per page
          </div>

          <div className="flex items-center gap-3 text-sm text-gray-600">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={safePage === 1}
              aria-label="Previous page"
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span>{recordStart} to {recordEnd} of {sorted.length} records</span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              aria-label="Next page"
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Context menu */}
      {openMenuId !== null && menuPos && menuBeneficiary && (() => {
        const isCompleted = menuBeneficiary.assignedProjectStatus === 'Completed'
        // DILP is one-time-only: once assigned to any project, ever, the menu
        // only ever offers to view it — never a fresh "Assign Project" again,
        // even after it's Completed (mirrors GIP's hasAssignment gate). TUPAD
        // supports a running history, so it keeps offering "Assign Project"
        // once the current one is Completed.
        // A TUPAD beneficiary who withdrew has no live assignment any more, so (like
        // Completed) the menu goes back to offering "Assign Project".
        const isWithdrawn = !!(menuBeneficiary as TUPADApplicant).exitedAt
        const showViewAssigned = !!menuBeneficiary.assignedProjectName && (isDILP || (!isCompleted && !isWithdrawn))
        const canWithdraw = !isDILP && menuBeneficiary.status === 'Active' && menuBeneficiary.assignedProjectStatus === 'Ongoing'
        return (
          <>
            <div className="fixed inset-0 z-[200]" onClick={closeMenu} />
            <div
              ref={menuRef}
              style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, maxHeight: 'calc(100vh - 24px)' }}
              className="w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-[201] py-1 overflow-y-auto"
            >
              <button onClick={() => { setViewingBeneficiary(menuBeneficiary); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View</button>
              <button onClick={() => { setEditingBeneficiary(menuBeneficiary); closeMenu() }} disabled={!canManage('livelihood')} className="w-full px-3 py-2 text-left text-xs text-brand-blue hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Edit</button>
              {showViewAssigned
                ? <button onClick={() => { setViewingAssignedProject(menuBeneficiary); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View Assigned Project</button>
                : <button onClick={() => { setAssigningBeneficiary(menuBeneficiary); closeMenu() }} disabled={!canManage('livelihood')} className="w-full px-3 py-2 text-left text-xs text-green-700 hover:bg-green-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Assign Project</button>
              }
              {canWithdraw && (
                <button onClick={() => { setWithdrawTarget(menuBeneficiary as TUPADApplicant); closeMenu() }} disabled={!canManage('livelihood')} className="w-full px-3 py-2 text-left text-xs text-orange-600 hover:bg-orange-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Mark as withdrawn</button>
              )}
              {!isDILP && (
                <button onClick={() => { setViewingAssignmentHistoryFor(menuBeneficiary as TUPADApplicant); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-brand-blue hover:bg-blue-50">View Assignment History</button>
              )}
              <div className="border-t border-gray-100 my-1" />
              <button onClick={() => handleConfirmRemove(menuBeneficiary.id, formatDisplayName(menuBeneficiary))} disabled={!canManage('livelihood')} className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent">Remove</button>
            </div>
          </>
        )
      })()}

      {assigningBeneficiary && (
        <AssignProjectModal
          beneficiary={assigningBeneficiary}
          program={program}
          projects={projects}
          onAssign={handleAssignProject}
          onUnassign={handleUnassignProject}
          onClose={() => setAssigningBeneficiary(null)}
          isAssigning={isAssigning}
        />
      )}

      {withdrawTarget && (
        <WithdrawDialog
          personName={formatDisplayName(withdrawTarget)}
          assignmentName={withdrawTarget.assignedProjectName || 'this project'}
          kind="project"
          minDate={withdrawTarget.assignmentHistory[0]?.assignedDate}
          isSaving={isWithdrawing}
          onConfirm={handleWithdraw}
          onClose={() => setWithdrawTarget(null)}
        />
      )}

      {viewingAssignedProject && (
        <ViewAssignedProjectModal
          beneficiary={viewingAssignedProject}
          program={program}
          projects={projects}
          onChangeAssignment={() => {
            const b = viewingAssignedProject
            setViewingAssignedProject(null)
            setAssigningBeneficiary(b)
          }}
          onWithdraw={!isDILP ? () => setWithdrawTarget(viewingAssignedProject as TUPADApplicant) : undefined}
          onClose={() => setViewingAssignedProject(null)}
        />
      )}

      {/* Assignment History Modal (TUPAD only) */}
      {viewingAssignmentHistoryFor && (() => {
        const b = viewingAssignmentHistoryFor
        const statusCls = (s?: string) =>
          s === 'Completed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
          s === 'Ongoing'   ? 'bg-green-100 text-green-700 border border-green-200' :
          s === 'Withdrawn' ? 'bg-orange-100 text-orange-700 border border-orange-200' :
          'bg-amber-100 text-amber-700 border border-amber-200'
        const history = b.assignmentHistory ?? []
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
              <div className="bg-white border-b border-gray-200 rounded-t-2xl px-6 py-5 flex items-center justify-between flex-shrink-0">
                <div>
                  <p className="text-black font-extrabold text-lg tracking-tight">Assignment History</p>
                  <p className="text-gray-500 text-sm mt-0.5">{formatDisplayName(b)}</p>
                </div>
                <button onClick={() => setViewingAssignmentHistoryFor(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><X size={20} /></button>
              </div>
              <div className="px-6 py-5 overflow-y-auto flex-1">
                {history.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                      <Users size={26} className="text-gray-400" />
                    </div>
                    <p className="text-sm font-bold text-black">No assignments yet</p>
                    <p className="text-xs text-gray-600 text-center">Assigned projects will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {history.map((entry, i) => {
                      const isCurrent = b.assignedProjectId === entry.projectId
                      // Left the project early: that, not the project's own status, is what happened to this person.
                      const entryStatus = entry.exitedAt ? 'Withdrawn' : isCurrent ? b.assignedProjectStatus : (entry.completedDate ? 'Completed' : undefined)
                      return (
                        <div key={i} className={`rounded-xl border px-5 py-4 flex items-start justify-between gap-3 ${isCurrent ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-800 font-semibold leading-snug">{entry.projectName}</p>
                            <p className="text-xs text-gray-400 mt-1">Date Assigned: {fmtDate(entry.assignedDate)}</p>
                            {entry.completedDate && (
                              <p className="text-xs text-blue-500 mt-0.5">Date Completed: {fmtDate(entry.completedDate)}</p>
                            )}
                            {entry.exitedAt && (
                              <>
                                <p className="text-xs text-orange-600 mt-0.5">Date Left: {fmtDate(entry.exitedAt)}</p>
                                {entry.exitReason && <p className="text-xs text-orange-600 mt-0.5">Reason: {entry.exitReason}</p>}
                              </>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-2">
                            {entryStatus && <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusCls(entryStatus)}`}>{entryStatus}</span>}
                            {isCurrent && <span className="text-[10px] px-2.5 py-1 rounded-full bg-brand-blue text-white font-semibold">Current</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
              <div className="px-6 pb-6 flex-shrink-0">
                <button onClick={() => setViewingAssignmentHistoryFor(null)} className="w-full py-3 border-2 border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 text-sm font-semibold transition-colors">Close</button>
              </div>
            </div>
          </div>
        )
      })()}

    </div>
    {isImportOpen && (
      <DileepImportModal
        isDILP={isDILP}
        onClose={() => setIsImportOpen(false)}
        onImported={() => { refreshProfiles(); }}
      />
    )}
    <ConfirmModal
      isOpen={removeConfirm !== null} type="confirm"
      title="Remove Beneficiary?" message={removeConfirm ? `This will move ${removeConfirm.name} to the recycle bin.` : ''}
      confirmText="Yes, remove" cancelText="Cancel"
      onConfirm={proceedRemove} onCancel={() => setRemoveConfirm(null)}
    />
    <ConfirmModal
      isOpen={resultModal.isOpen} type={resultModal.type} title={resultModal.title} message={resultModal.message}
      confirmText="OK" onConfirm={() => setResultModal(prev => ({ ...prev, isOpen: false }))} onCancel={() => setResultModal(prev => ({ ...prev, isOpen: false }))}
    />
    </>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DILEEPTab() {
  const [activeProgram, setActiveProgram] = useState<DILEEPProgram | null>(null)
  const [isWizardOpen, setIsWizardOpen] = useState(false)

  return (
    <div className="flex flex-col gap-4">
      {/* Program selector — hidden while a wizard is open */}
      {!isWizardOpen && (
        <div className="bg-white rounded-xl shadow-sm p-8">
          <div className="flex flex-col gap-2 mb-6">
            <p className="text-gray-800 font-bold text-xl">DILEEP Programs</p>
            <p className="text-gray-500 text-base">DOLE Integrated Livelihood and Emergency Employment Program</p>
          </div>
          <div className="flex gap-3">
            {(['DILEEP (DILP)', 'DILEEP (TUPAD)'] as DILEEPProgram[]).map(program => {
              const isDILP = program === 'DILEEP (DILP)'
              return (
                <button
                  key={program}
                  onClick={() => setActiveProgram(program)}
                  className={`flex-1 py-5 rounded-xl border transition-colors ${
                    activeProgram === program
                      ? 'bg-brand-blue border-brand-blue text-white'
                      : 'bg-blue-50 border-brand-blue text-brand-blue hover:bg-blue-100'
                  }`}
                >
                  <p className="text-xl font-bold">{isDILP ? 'DILP' : 'TUPAD'}</p>
                  <p className={`text-sm mt-1 font-normal ${activeProgram === program ? 'text-white/80' : 'text-brand-blue/70'}`}>
                    {isDILP ? 'DOLE Integrated Livelihood Program' : 'Tulong Panghanapbuhay sa Ating Disadvantaged/Displaced Workers'}
                  </p>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {activeProgram !== null && (
        <BeneficiaryList
          program={activeProgram}
          onWizardChange={setIsWizardOpen}
        />
      )}
    </div>
  )
}
