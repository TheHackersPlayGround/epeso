import { useState, useMemo, useEffect } from 'react'
import { fmtDate } from '../../utils/formatDate'
import {
  Search, Plus, ChevronDown, ChevronRight, ChevronLeft, X, Download, Upload,
  MoreHorizontal, Users, Info, AlertCircle,
} from 'lucide-react'
import * as XLSX from 'xlsx'
import Swal from 'sweetalert2'
import type { LivelihoodBeneficiary, LivelihoodStatus } from '../../contexts/LivelihoodContext'
import { LIVELIHOOD_SEED } from '../../contexts/LivelihoodContext'
import DILPProfileForm, { EMPTY_DILP_RECORD } from './DILPProfileForm'
import TUPADProfileForm, { EMPTY_TUPAD_RECORD } from './TUPADProfileForm'
import { useProgramActivities } from '../../contexts/ProgramActivitiesContext'

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'lp_dileep_v5'

type DILEEPProgram = 'DILEEP (DILP)' | 'DILEEP (TUPAD)'

const PROGRAM_STATUS_OPTIONS: LivelihoodStatus[] = [
  'Accepted', 'Waitlisted', 'Rejected', 'Active', 'Inactive', 'Dropped',
]

const SEX_OPTIONS = ['Male', 'Female']

const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Annulled']

const STATUS_COLORS: Record<LivelihoodStatus, string> = {
  Active:     'bg-green-100 text-green-700',
  Completed:  'bg-blue-100 text-blue-700',
  Dropped:    'bg-red-100 text-red-600',
  Pending:    'bg-yellow-100 text-yellow-700',
  Closed:     'bg-gray-100 text-gray-500',
  Approved:   'bg-emerald-100 text-emerald-700',
  Released:   'bg-purple-100 text-purple-700',
  Inactive:   'bg-gray-200 text-gray-400',
  Accepted:   'bg-emerald-100 text-emerald-700',
  Waitlisted: 'bg-yellow-100 text-yellow-700',
  Rejected:   'bg-red-100 text-red-600',
}

// ─── Data helpers ─────────────────────────────────────────────────────────────

function loadAllDILEEP(): LivelihoodBeneficiary[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    const parsed = raw ? (JSON.parse(raw) as LivelihoodBeneficiary[]) : []
    if (parsed.length > 0) return parsed
    const seed = LIVELIHOOD_SEED.filter(b => b.service === 'DILEEP (DILP)' || b.service === 'DILEEP (TUPAD)')
    try { localStorage.setItem(LS_KEY, JSON.stringify(seed)) } catch { /* quota */ }
    return seed
  } catch {
    return LIVELIHOOD_SEED.filter(b => b.service === 'DILEEP (DILP)' || b.service === 'DILEEP (TUPAD)')
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FilterOption = { id: string; label: string; options: string[] }

// ─── Name helpers ─────────────────────────────────────────────────────────────

function formatDisplayName(b: { name: string; firstName?: string; lastName?: string; middleName?: string; nameExtension?: string }): string {
  if (b.firstName && b.lastName) {
    const given = [b.firstName, b.middleName, b.nameExtension].filter(Boolean).join(' ')
    return `${b.lastName}, ${given}`
  }
  return b.name
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: LivelihoodStatus }) {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

// ─── Assign Project Modal ─────────────────────────────────────────────────────

type AssignProjectModalProps = {
  beneficiary: LivelihoodBeneficiary
  program: DILEEPProgram
  onAssign: (projectId: number, projectName: string) => void
  onUnassign: () => void
  onClose: () => void
}

function AssignProjectModal({ beneficiary, program, onAssign, onUnassign, onClose }: AssignProjectModalProps) {
  const { activities } = useProgramActivities()
  const [projectSearch, setProjectSearch] = useState('')
  const canAssign = !['Waitlisted', 'Rejected'].includes(beneficiary.status)

  const serviceLabel = program === 'DILEEP (DILP)' ? 'DILP' : 'DILEEP (TUPAD)'

  const currentProject = beneficiary.assignedDilpProjectId
    ? activities.find(a => a.id === beneficiary.assignedDilpProjectId) ?? null
    : null

  const programProjects = activities.filter(
    a => a.service === program && a.status === 'Planned'
  )

  const filteredProjects = projectSearch.trim()
    ? programProjects.filter(p =>
        (p.projectName ?? p.title).toLowerCase().includes(projectSearch.toLowerCase())
      )
    : programProjects

  function projectStatusClass(status: string) {
    if (status === 'Ongoing') return 'bg-green-100 text-green-700'
    if (status === 'Planned') return 'bg-yellow-100 text-yellow-700'
    return 'bg-gray-100 text-gray-500'
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-brand-blue px-5 pt-5 pb-4 flex items-start justify-between">
          <div>
            <h3 className="text-white font-bold text-base">Assign Project</h3>
            <p className="text-white/80 text-xs mt-0.5">{formatDisplayName(beneficiary)}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-white/80 hover:text-white transition-colors p-1 mt-0.5">
            <X size={18} />
          </button>
        </div>

        {!canAssign && (
          <div className="px-4 py-3 bg-amber-50 border-b border-amber-200 flex items-start gap-2">
            <AlertCircle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Applicant status is <span className="font-semibold">{beneficiary.status}</span>. Update to <span className="font-semibold">Accepted</span> before assigning a project.
            </p>
          </div>
        )}

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
                <p className="text-xs font-bold text-brand-blue">{currentProject.projectName ?? currentProject.title}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  {currentProject.typeOfProject && (
                    <span className="text-xs border border-brand-blue text-brand-blue rounded-full px-2 py-0.5">
                      {currentProject.typeOfProject}
                    </span>
                  )}
                  <span className={`text-xs rounded-full px-2 py-0.5 font-medium ${projectStatusClass(currentProject.status)}`}>
                    {currentProject.status}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => { onUnassign(); onClose() }}
                className="text-red-500 text-xs font-semibold hover:text-red-700 transition-colors flex-shrink-0 border border-red-200 rounded-lg px-2 py-1 hover:bg-red-50"
              >
                Unassign
              </button>
            </div>
          </div>
        )}

        {/* Project list */}
        <div className={`px-4 max-h-56 overflow-y-auto${!canAssign ? ' pointer-events-none opacity-40' : ''}`}>
          {filteredProjects.length === 0 ? (
            <p className="text-center text-xs text-gray-400 py-6">No projects found</p>
          ) : (
            filteredProjects.map(project => {
              const isCurrent = project.id === beneficiary.assignedDilpProjectId
              return (
                <button
                  key={project.id}
                  onClick={() => { onAssign(project.id, project.projectName ?? project.title); onClose() }}
                  className="w-full text-left py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition-colors flex items-start justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <p className="text-xs font-semibold text-gray-800">{project.projectName ?? project.title}</p>
                      {isCurrent && (
                        <span className="text-xs bg-orange-100 text-orange-600 rounded-full px-2 py-0.5 font-medium">Current</span>
                      )}
                    </div>
                    {program === 'DILEEP (TUPAD)' ? (
                      <>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {[project.date, project.location].filter(Boolean).join(' • ')}
                        </p>
                        {project.description && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{project.description}</p>
                        )}
                      </>
                    ) : (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {[project.typeOfProject, project.programComponent].filter(Boolean).join(' • ')}
                      </p>
                    )}
                  </div>
                  <span className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${projectStatusClass(project.status)}`}>
                    {project.status}
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
      </div>
    </div>
  )
}

// ─── View Assigned Project Modal ─────────────────────────────────────────────

type ViewAssignedProjectModalProps = {
  beneficiary: LivelihoodBeneficiary
  program: DILEEPProgram
  onChangeAssignment: () => void
  onClose: () => void
}

function ViewAssignedProjectModal({ beneficiary: b, program, onChangeAssignment, onClose }: ViewAssignedProjectModalProps) {
  const { activities } = useProgramActivities()
  const assignedProject = b.assignedDilpProjectId
    ? activities.find(a => a.id === b.assignedDilpProjectId)
    : null
  const canChange = assignedProject?.status === 'Completed'

  function Row({ label, value }: { label: string; value?: string | null }) {
    return (
      <div className="flex justify-between py-2 border-b border-gray-100 last:border-b-0">
        <span className="text-xs text-gray-500 font-medium w-36 flex-shrink-0">{label}</span>
        <span className="text-xs text-gray-900 font-semibold text-right">{value || '—'}</span>
      </div>
    )
  }

  const header = (
    <div className="bg-brand-blue px-5 pt-5 pb-4 flex items-start justify-between">
      <div>
        <h2 className="text-base font-bold text-white">Assigned Project</h2>
        <p className="text-blue-200 text-sm mt-0.5">{formatDisplayName(b)}</p>
      </div>
      <button type="button" onClick={onClose} aria-label="Close" className="text-white/70 hover:text-white transition-colors mt-0.5">
        <X size={18} />
      </button>
    </div>
  )

  const footer = (
    <div className="px-5 pb-5 pt-2 flex gap-2">
      <button
        type="button"
        onClick={onChangeAssignment}
        disabled={!canChange}
        className={`flex-1 py-2.5 border border-brand-blue text-brand-blue rounded-xl text-xs font-semibold hover:bg-blue-50 transition-colors${!canChange ? ' opacity-50 cursor-not-allowed' : ''}`}
      >
        Change Assignment
      </button>
      <button type="button" onClick={onClose} className="flex-1 py-2.5 bg-brand-blue text-white rounded-xl text-xs font-semibold hover:bg-brand-blue-dark transition-colors">
        Close
      </button>
    </div>
  )

  function statusBadgeClass(status?: string) {
    if (status === 'Ongoing') return 'text-green-600 border border-green-500 bg-white'
    if (status === 'Planned') return 'bg-yellow-100 text-yellow-700 border border-yellow-200'
    if (status === 'Completed') return 'bg-blue-100 text-blue-600 border border-blue-200'
    return 'bg-gray-100 text-gray-600'
  }

  if (program === 'DILEEP (TUPAD)') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
          {header}
          <div className="px-5 py-4 max-h-[65vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-bold text-gray-900 text-base">{assignedProject?.title || b.projectName}</p>
                <span className="inline-block mt-0.5 text-xs font-semibold text-gray-500">DILEEP (TUPAD)</span>
              </div>
              {assignedProject?.status && (
                <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(assignedProject.status)}`}>
                  {assignedProject.status}
                </span>
              )}
            </div>
            <Row label="Description" value={assignedProject?.description} />
            <Row label="Date" value={assignedProject?.date} />
            <Row label="Location" value={assignedProject?.location} />
            <Row label="Facilitator" value={assignedProject?.facilitator} />
            <Row label="Participants" value={assignedProject?.participants != null ? String(assignedProject.participants) : undefined} />
            <Row label="Assistance Amount" value={assignedProject?.assistanceAmount ? `₱${Number(assignedProject.assistanceAmount).toLocaleString()}` : undefined} />
            <Row label="Date Released" value={assignedProject?.dateReleased} />
          </div>
          {footer}
        </div>
      </div>
    )
  }

  // DILP layout
  const assistanceDisplay = b.assistanceAmount ? `₱${Number(b.assistanceAmount).toLocaleString()}` : '—'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
        {header}
        <div className="px-5 py-4 max-h-[65vh] overflow-y-auto">
          {/* Project title + status + ID */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <p className="font-bold text-gray-900 text-base">{assignedProject?.projectName ?? b.projectName}</p>
              {assignedProject?.projectIdNumber && (
                <p className="text-xs text-gray-400 mt-0.5">{assignedProject.projectIdNumber}</p>
              )}
            </div>
            {assignedProject?.status && (
              <span className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${statusBadgeClass(assignedProject.status)}`}>
                {assignedProject.status}
              </span>
            )}
          </div>
          <Row label="Project Type" value={assignedProject?.typeOfProject} />
          <Row label="Program Component" value={assignedProject?.programComponent} />
          <Row label="Way of Implementation" value={assignedProject?.wayOfImplementation} />
          <Row label="Region" value={b.region} />
          <Row label="Province" value={b.province} />
          <Row label="City / Municipality" value={b.cityMunicipality} />
          <Row label="Barangay" value={b.barangay} />
          <Row label="Street / Purok" value={b.streetPurok} />
          <Row label="Assistance Amount" value={assistanceDisplay} />
          <Row label="Date Released" value={b.dateReleased} />
        </div>
        {footer}
      </div>
    </div>
  )
}

// ─── Beneficiary List (sub-view inside DILEEP) ────────────────────────────────
// Renders 3 separate cards: action buttons | search+filter | table+pagination

type BeneficiaryListProps = {
  program: DILEEPProgram
  allRecords: LivelihoodBeneficiary[]
  onPersistAll: (records: LivelihoodBeneficiary[]) => void
  onWizardChange: (open: boolean) => void
}

function BeneficiaryList({ program, allRecords, onPersistAll, onWizardChange }: BeneficiaryListProps) {
  const { activities } = useProgramActivities()
  const [searchQuery, setSearchQuery] = useState('')
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [activeFilters, setActiveFilters] = useState<string[]>([])
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [perPage, setPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [sortOrder, setSortOrder] = useState<'firstName_asc' | 'firstName_desc' | 'lastName_asc' | 'lastName_desc' | 'dateApplied_newest' | 'dateApplied_oldest' | ''>('')
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)
  const [viewingBeneficiary, setViewingBeneficiary] = useState<LivelihoodBeneficiary | null>(null)
  const [editingBeneficiary, setEditingBeneficiary] = useState<LivelihoodBeneficiary | null>(null)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [assigningBeneficiary, setAssigningBeneficiary] = useState<LivelihoodBeneficiary | null>(null)
  const [viewingAssignedProject, setViewingAssignedProject] = useState<LivelihoodBeneficiary | null>(null)
  const [viewingAssignmentHistoryFor, setViewingAssignmentHistoryFor] = useState<LivelihoodBeneficiary | null>(null)

  useEffect(() => {
    onWizardChange(isAddOpen || !!editingBeneficiary || !!viewingBeneficiary)
  }, [isAddOpen, editingBeneficiary, viewingBeneficiary])

  const programRecords = allRecords.filter(b => b.service === program)
  const programLabel = program === 'DILEEP (DILP)' ? 'DILP' : 'TUPAD'

  const availableFilters: FilterOption[] = [
    { id: 'status',      label: 'Status',       options: PROGRAM_STATUS_OPTIONS },
    { id: 'sex',         label: 'Sex',           options: SEX_OPTIONS },
    { id: 'civilStatus', label: 'Civil Status',  options: CIVIL_STATUS_OPTIONS },
  ]

  function persistProgram(updated: LivelihoodBeneficiary[]) {
    const others = allRecords.filter(b => b.service !== program)
    onPersistAll([...others, ...updated])
  }

  function handleAddBeneficiary(data: Omit<LivelihoodBeneficiary, 'id'>) {
    const newRecord: LivelihoodBeneficiary = {
      ...data,
      id: Date.now(),
      service: program,
      // Keep projectName in sync with the project title for table display
      projectName: data.projectName ?? data.name,
    }
    persistProgram([...programRecords, newRecord])
    setIsAddOpen(false)
  }

  function handleEditSave(data: Omit<LivelihoodBeneficiary, 'id'>) {
    if (!editingBeneficiary) return
    persistProgram(
      programRecords.map(b =>
        b.id === editingBeneficiary.id ? { ...b, ...data, id: b.id, service: program } : b
      )
    )
    setEditingBeneficiary(null)
  }

  function handleRemoveBeneficiary(id: number) {
    persistProgram(programRecords.filter(b => b.id !== id))
    setOpenMenuId(null)
  }

  function handleAddFilter(id: string) {
    setActiveFilters(prev => [...prev, id])
    setCurrentPage(1)
  }

  function handleRemoveFilter(id: string) {
    setActiveFilters(prev => prev.filter(f => f !== id))
    setFilterValues(prev => { const n = { ...prev }; delete n[id]; return n })
    setCurrentPage(1)
  }

  function handleFilterValueChange(id: string, value: string) {
    setFilterValues(prev => ({ ...prev, [id]: value }))
    setCurrentPage(1)
  }

  function handleToggleMenu(e: React.MouseEvent, id: number) {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const menuHeight = 170
    const showAbove = window.innerHeight - rect.bottom < menuHeight + 8
    setMenuPos({
      top: showAbove ? rect.top - menuHeight - 4 : rect.bottom + 4,
      right: window.innerWidth - rect.right,
    })
    setOpenMenuId(openMenuId === id ? null : id)
  }

  function closeMenu() { setOpenMenuId(null) }

  async function handleConfirmRemove(id: number, name: string) {
    closeMenu()
    const result = await Swal.fire({
      title: 'Remove Beneficiary?',
      text: `This will permanently remove ${name} from the list.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, remove',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ef4444',
    })
    if (!result.isConfirmed) return
    handleRemoveBeneficiary(id)
  }

  function handleAssignProject(projectId: number, projectName: string) {
    if (!assigningBeneficiary) return
    const today = new Date().toISOString().split('T')[0]
    persistProgram(
      programRecords.map(b => {
        if (b.id !== assigningBeneficiary.id) return b
        const history = [...(b.projectAssignmentHistory ?? [])]
        // Mark previous project as completed if its activity was completed
        if (b.assignedDilpProjectId && b.assignedDilpProjectId !== projectId) {
          const prevAct = activities.find(a => a.id === b.assignedDilpProjectId)
          if (prevAct?.status === 'Completed') {
            const prevIdx = history.findIndex(h => h.projectId === b.assignedDilpProjectId)
            if (prevIdx >= 0 && !history[prevIdx].completedDate) {
              history[prevIdx] = { ...history[prevIdx], completedDate: today }
            }
          }
        }
        if (!history.some(h => h.projectId === projectId)) {
          history.push({ projectId, projectName, assignedDate: today })
        }
        return { ...b, assignedDilpProjectId: projectId, projectName, projectAssignmentHistory: history }
      })
    )
    setAssigningBeneficiary(null)
  }

  function handleUnassignProject() {
    if (!assigningBeneficiary) return
    persistProgram(
      programRecords.map(b =>
        b.id === assigningBeneficiary.id
          ? { ...b, assignedDilpProjectId: null, projectName: '', dilpBeneficiaryType: '' }
          : b
      )
    )
    setAssigningBeneficiary(null)
  }

  const filtered = useMemo(() => {
    let result = programRecords
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter(b =>
        b.name.toLowerCase().includes(q) ||
        (b.barangay ?? '').toLowerCase().includes(q) ||
        (b.projectName ?? '').toLowerCase().includes(q)
      )
    }
    for (const filterId of activeFilters) {
      const value = filterValues[filterId]
      if (!value) continue
      if (filterId === 'status')      result = result.filter(b => b.status === value)
      if (filterId === 'sex')         result = result.filter(b => b.sex === value)
      if (filterId === 'civilStatus') result = result.filter(b => b.civilStatus === value)
    }
    return result
  }, [programRecords, searchQuery, activeFilters, filterValues])

  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === 'dateApplied_newest') return (b.dateApplied || b.dateEnrolled || '').localeCompare(a.dateApplied || a.dateEnrolled || '')
    if (sortOrder === 'dateApplied_oldest') return (a.dateApplied || a.dateEnrolled || '').localeCompare(b.dateApplied || b.dateEnrolled || '')
    if (!sortOrder) return 0
    const keyA = (sortOrder.startsWith('firstName') ? (a.firstName ?? a.name.split(' ')[0] ?? '') : (a.lastName ?? a.name.split(' ').at(-1) ?? '')).toLowerCase()
    const keyB = (sortOrder.startsWith('firstName') ? (b.firstName ?? b.name.split(' ')[0] ?? '') : (b.lastName ?? b.name.split(' ').at(-1) ?? '')).toLowerCase()
    return sortOrder.endsWith('asc') ? keyA.localeCompare(keyB) : keyB.localeCompare(keyA)
  })

  const isFiltered = searchQuery.trim() !== '' || activeFilters.some(f => filterValues[f])
  const totalPages = Math.max(1, Math.ceil(sorted.length / perPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginated = sorted.slice((safePage - 1) * perPage, safePage * perPage)
  const recordStart = sorted.length === 0 ? 0 : (safePage - 1) * perPage + 1
  const recordEnd = Math.min(safePage * perPage, sorted.length)

  const menuBeneficiary = paginated.find(b => b.id === openMenuId) ?? null

  function buildExportRows() {
    return filtered.map(b => ({
      'Name': b.name,
      'Sex': b.sex ?? '',
      'Barangay': b.barangay ?? '',
      'Assigned Project': b.projectName ?? '',
      'Wage Rate': b.wageRate ?? '',
      'Project Duration': b.projectDuration ?? '',
      'Date Applied': b.dateEnrolled ?? '',
      'Status': b.status,
    }))
  }

  function handleExportExcel() {
    const ws = XLSX.utils.json_to_sheet(buildExportRows())
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, programLabel)
    XLSX.writeFile(wb, `${programLabel}_beneficiaries.xlsx`)
    setIsExportOpen(false)
  }

  function handleExportCsv() {
    const ws = XLSX.utils.json_to_sheet(buildExportRows())
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${programLabel}_beneficiaries.csv`
    link.click()
    URL.revokeObjectURL(url)
    setIsExportOpen(false)
  }

  if (program === 'DILEEP (DILP)') {
    if (isAddOpen) {
      return (
        <DILPProfileForm
          mode="add"
          initial={{ ...EMPTY_DILP_RECORD, service: program }}
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
          initial={editingBeneficiary}
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
          initial={viewingBeneficiary}
          onSave={() => {}}
          onClose={() => setViewingBeneficiary(null)}
          onEdit={() => { setEditingBeneficiary(viewingBeneficiary); setViewingBeneficiary(null) }}
        />
      )
    }
  }

  if (program === 'DILEEP (TUPAD)') {
    if (isAddOpen) {
      return (
        <TUPADProfileForm
          mode="add"
          initial={{ ...EMPTY_TUPAD_RECORD, service: program }}
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
          initial={editingBeneficiary}
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
          initial={viewingBeneficiary}
          onSave={() => {}}
          onClose={() => setViewingBeneficiary(null)}
          onEdit={() => { setEditingBeneficiary(viewingBeneficiary); setViewingBeneficiary(null) }}
        />
      )
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Card 1 — Action buttons */}
      <div className="bg-white rounded-xl shadow-sm px-5 py-4 flex items-center gap-3">
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-blue text-white rounded-lg text-sm font-medium hover:bg-brand-blue-dark transition-colors"
        >
          <Plus size={16} />
          Add Profile
        </button>

        <button
          className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Upload size={16} />
          Import
        </button>

        <div className="relative">
          <button
            onClick={() => setIsExportOpen(o => !o)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg bg-white text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download size={16} />
            Export
          </button>
          {isExportOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setIsExportOpen(false)} />
              <div className="absolute left-0 top-full mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                <button onClick={handleExportExcel} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 border-b border-gray-100">
                  Export as Excel
                </button>
                <button onClick={handleExportCsv} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">
                  Export as CSV
                </button>
              </div>
            </>
          )}
        </div>
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
              paginated.map((b, idx) => (
                <tr key={b.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-800 font-semibold whitespace-nowrap">{formatDisplayName(b)}</td>
                  {activeFilters.includes('sex') && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.sex ?? '—'}</td>}
                  {activeFilters.includes('civilStatus') && <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.civilStatus ?? '—'}</td>}
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{b.barangay ?? '-'}</td>
                  <td className="px-4 py-3">
                    {b.projectName ? (
                      <div>
                        <p className="text-gray-800 font-medium whitespace-nowrap">{b.projectName}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1.5">
                          {(() => {
                            const proj = b.assignedDilpProjectId ? activities.find(a => a.id === b.assignedDilpProjectId) : null
                            if (!proj) return null
                            const colors: Record<string, string> = {
                              Planned:   'bg-yellow-100 text-yellow-700 border border-yellow-200',
                              Ongoing:   'text-green-600 border border-green-500 bg-white',
                              Completed: 'bg-blue-100 text-blue-600 border border-blue-200',
                            }
                            return (
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[proj.status] ?? 'bg-gray-100 text-gray-500'}`}>
                                {proj.status}
                              </span>
                            )
                          })()}
                          {b.dilpBeneficiaryType && (
                            <span className="text-xs text-brand-blue">{b.dilpBeneficiaryType}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400 italic">Not assigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtDate(b.dateApplied ?? b.dateEnrolled)}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={b.status} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <button
                      onClick={e => handleToggleMenu(e, b.id)}
                      aria-label={`Actions for ${b.name}`}
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
        const assignedAct = menuBeneficiary.assignedDilpProjectId
          ? activities.find(a => a.id === menuBeneficiary.assignedDilpProjectId)
          : null
        const isCompleted = assignedAct?.status === 'Completed'
        return (
          <>
            <div className="fixed inset-0 z-[200]" onClick={closeMenu} />
            <div
              style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
              className="w-48 bg-white rounded-lg shadow-lg border border-gray-200 z-[201] py-1"
            >
              <button onClick={() => { setViewingBeneficiary(menuBeneficiary); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View</button>
              <button onClick={() => { setEditingBeneficiary(menuBeneficiary); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-brand-blue hover:bg-blue-50">Edit</button>
              {menuBeneficiary.projectName && !isCompleted
                ? <button onClick={() => { setViewingAssignedProject(menuBeneficiary); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-gray-700 hover:bg-gray-50">View Assigned Project</button>
                : <button onClick={() => { setAssigningBeneficiary(menuBeneficiary); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-green-700 hover:bg-green-50">Assign Project</button>
              }
              {program === 'DILEEP (TUPAD)' && (
                <button onClick={() => { setViewingAssignmentHistoryFor(menuBeneficiary); closeMenu() }} className="w-full px-3 py-2 text-left text-xs text-brand-blue hover:bg-blue-50">View Assignment History</button>
              )}
              <div className="border-t border-gray-100 my-1" />
              <button onClick={() => handleConfirmRemove(menuBeneficiary.id, menuBeneficiary.name)} className="w-full px-3 py-2 text-left text-xs text-red-600 hover:bg-red-50">Remove</button>
            </div>
          </>
        )
      })()}

      {assigningBeneficiary && (
        <AssignProjectModal
          beneficiary={assigningBeneficiary}
          program={program}
          onAssign={handleAssignProject}
          onUnassign={handleUnassignProject}
          onClose={() => setAssigningBeneficiary(null)}
        />
      )}

      {viewingAssignedProject && (
        <ViewAssignedProjectModal
          beneficiary={viewingAssignedProject}
          program={program}
          onChangeAssignment={() => {
            const b = viewingAssignedProject
            setViewingAssignedProject(null)
            setAssigningBeneficiary(b)
          }}
          onClose={() => setViewingAssignedProject(null)}
        />
      )}

      {/* Assignment History Modal */}
      {viewingAssignmentHistoryFor && (() => {
        const b = viewingAssignmentHistoryFor
        const statusCls = (s?: string) =>
          s === 'Completed' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' :
          s === 'Ongoing'   ? 'bg-green-100 text-green-700 border border-green-200' :
          'bg-amber-100 text-amber-700 border border-amber-200'
        const visibleHistory = (b.projectAssignmentHistory ?? []).filter(entry => {
          const act = activities.find(a => a.id === entry.projectId)
          const isCurrent = b.assignedDilpProjectId === entry.projectId
          return act?.status === 'Completed' || isCurrent
        })
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">
              <div className="bg-white border-b border-gray-200 rounded-t-2xl px-6 py-5 flex items-center justify-between flex-shrink-0">
                <div>
                  <p className="text-black font-extrabold text-lg tracking-tight">Assignment History</p>
                  <p className="text-gray-500 text-sm mt-0.5">{b.lastName ?? ''}{b.firstName ? `, ${b.firstName}` : ''} {b.middleName ?? ''}</p>
                </div>
                <button onClick={() => setViewingAssignmentHistoryFor(null)} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"><X size={20} /></button>
              </div>
              <div className="px-6 py-5 overflow-y-auto flex-1">
                {visibleHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                      <Users size={26} className="text-gray-400" />
                    </div>
                    <p className="text-sm font-bold text-black">No assignments yet</p>
                    <p className="text-xs text-gray-600 text-center">Completed or active project assignments will appear here.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {[...visibleHistory].reverse().map((entry, i) => {
                      const act = activities.find(a => a.id === entry.projectId)
                      const isCurrent = b.assignedDilpProjectId === entry.projectId
                      return (
                        <div key={i} className={`rounded-xl border px-5 py-4 flex items-start justify-between gap-3 ${isCurrent ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'}`}>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-gray-800 font-semibold leading-snug">{entry.projectName}</p>
                            <p className="text-xs text-gray-400 mt-1">Date Assigned: {fmtDate(entry.assignedDate)}</p>
                            {entry.completedDate && act?.status === 'Completed' && (
                              <p className="text-xs text-blue-500 mt-0.5">Date Completed: {fmtDate(entry.completedDate)}</p>
                            )}
                          </div>
                          <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-2">
                            {act && <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusCls(act.status)}`}>{act.status}</span>}
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
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DILEEPTab() {
  const [activeProgram, setActiveProgram] = useState<DILEEPProgram | null>(null)
  const [allRecords, setAllRecords] = useState<LivelihoodBeneficiary[]>(loadAllDILEEP)
  const [isWizardOpen, setIsWizardOpen] = useState(false)

  function handlePersistAll(records: LivelihoodBeneficiary[]) {
    setAllRecords(records)
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(records))
    } catch { /* quota */ }
  }

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
          allRecords={allRecords}
          onPersistAll={handlePersistAll}
          onWizardChange={setIsWizardOpen}
        />
      )}
    </div>
  )
}
