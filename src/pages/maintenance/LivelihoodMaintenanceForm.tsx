import { useState } from 'react'
import Swal from 'sweetalert2'
import DatePicker from '../../components/DatePicker'
import {
  PlusCircle, FolderOpen, MoreHorizontal,
  Edit2, Trash2, PlayCircle, CheckCircle, RefreshCw, ArrowLeft,
  Search, Users, Plus, AlertCircle, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { canManage } from '../../utils/permissions'
import { useProgramActivities } from '../../contexts/ProgramActivitiesContext'
import type { ProgramActivity } from '../../contexts/ProgramActivitiesContext'
import { useDILP } from '../../contexts/DILPContext'
import * as dilpService from '../../services/dilpService'
import { useTUPAD } from '../../contexts/TUPADContext'
import * as tupadService from '../../services/tupadService'
import { useSLP } from '../../contexts/SLPContext'
import * as slpService from '../../services/slpService'
import { useCLPEP } from '../../contexts/CLPEPContext'
import * as clpepService from '../../services/clpepService'
import DILPForm from './DILPForm'
import type { DILPFormData, AttachmentItem } from './DILPForm'
import TUPADForm from './TUPADForm'
import type { TUPADFormData } from './TUPADForm'
import SLPForm from './SLPForm'
import type { SLPFormData } from './SLPForm'
import CLPEPForm from './CLPEPForm'
import type { CLPEPFormData } from './CLPEPForm'

// DILP/TUPAD/SLP/CLPEP projects now all live in their own backend-persisted
// tables (see DILPContext/TUPADContext/SLPContext/CLPEPContext), not
// ProgramActivitiesContext's localStorage blob. For this shared "all
// Livelihood projects" table, they're converted into ProgramActivity-shaped
// rows with an ID offset so the existing table/filter/pagination code
// doesn't need a parallel implementation.
const DILP_ID_OFFSET = 700000
const TUPAD_ID_OFFSET = 800000
const CLPEP_ID_OFFSET = 900000
const SLP_ID_OFFSET = 600000

// Today's date as YYYY-MM-DD, comparable lexicographically against the ISO
// date strings DatePicker fields already use.
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_SERVICES = [
  'DILEEP (DILP)',
  'DILEEP (TUPAD)',
  'SLP',
  'CLPEP',
]

const SERVICE_TABS = [
  { label: 'All Services', value: 'All' },
  { label: 'DILEEP – DILP', value: 'DILEEP (DILP)' },
  { label: 'DILEEP – TUPAD', value: 'DILEEP (TUPAD)' },
  { label: 'SLP', value: 'SLP' },
  { label: 'CLPEP', value: 'CLPEP' },
]

type ProjectStatus = 'Planned' | 'Ongoing' | 'Completed' | 'Cancelled'
type Action =
  | ''
  | 'add_project'
  | 'edit_project'
  | 'view_project'
  | 'view_projects'
  | 'view_participants'

// ─── Shared styles ────────────────────────────────────────────────────────────

const inputCls =
  'w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent disabled:bg-gray-50 disabled:text-gray-600 text-sm text-gray-900 placeholder:text-gray-400'
const labelCls = 'block text-sm text-gray-700 mb-1.5'

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<ProjectStatus, string> = {
  Planned:   'bg-yellow-100 text-yellow-700',
  Ongoing:   'bg-green-100 text-green-700',
  Completed: 'bg-blue-100 text-blue-700',
  Cancelled: 'bg-red-100 text-red-500',
}

function StatusBadge({ status }: { status: ProjectStatus }) {
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
  status: 'Planned' as ProjectStatus,
}

const blankTupadForm: TUPADFormData = {
  title: '',
  description: '',
  date: '',
  location: '',
  facilitator: '',
  participants: '',
  status: 'Planned',
  assistanceAmount: '',
  dateReleased: '',
}

const blankSlpForm: SLPFormData = {
  projectName: '',
  description: '',
  slpTrack: '',
  dateStarted: '',
  location: '',
  facilitator: '',
  status: 'Planned',
  assistanceAmount: '',
  dateReleased: '',
}

const blankClpepForm: CLPEPFormData = {
  interventionName: '',
  description: '',
  interventionCategory: '',
  interventionCategoryOther: '',
  targetBeneficiaries: '',
  date: '',
  implementingOfficer: '',
  partnerAgency: '',
  partnerAgencyOther: '',
  location: '',
  status: 'Planned',
}

const blankDilpForm: DILPFormData = {
  projectIdNumber: '',
  projectName: '',
  typeOfProject: '',
  programComponent: '',
  wayOfImplementation: '',
  region: '',
  province: '',
  cityMunicipality: '',
  barangay: '',
  barangayId: null,
  streetPurok: '',
  assistanceAmount: '',
  dateReleased: '',
  status: 'Planned',
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LivelihoodMaintenanceForm() {
  const { activities, setActivities } = useProgramActivities()
  const dilp = useDILP()
  const tupad = useTUPAD()
  const slp = useSLP()
  const clpep = useCLPEP()

  // Navigation
  const [action, setAction] = useState<Action>('')
  const [selectedProject, setSelectedProject] = useState<ProgramActivity | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Fixed set of Livelihood services — DILP/TUPAD/SLP/CLPEP are the only
  // sub-programs, so this is no longer a user-editable list.
  const services = DEFAULT_SERVICES

  // Project form
  const [selectedService, setSelectedService] = useState('')
  const [formData, setFormData] = useState(blankForm)
  const [dilpFormData, setDilpFormData] = useState<DILPFormData>(blankDilpForm)
  const [dilpAttachments, setDilpAttachments] = useState<AttachmentItem[]>([])
  const [tupadFormData, setTupadFormData] = useState<TUPADFormData>(blankTupadForm)
  const [tupadAttachments, setTupadAttachments] = useState<AttachmentItem[]>([])
  const [slpFormData, setSlpFormData] = useState<SLPFormData>(blankSlpForm)
  const [slpAttachments, setSlpAttachments] = useState<AttachmentItem[]>([])

  // View Projects filters
  const [filterService, setFilterService] = useState('All')
  const [filterStatus, setFilterStatus] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [participantPage, setParticipantPage] = useState(1)
  const [participantPerPage, setParticipantPerPage] = useState(10)

  const [clpepFormData, setClpepFormData] = useState<CLPEPFormData>(blankClpepForm)
  const [clpepAttachments, setClpepAttachments] = useState<AttachmentItem[]>([])

  // Ellipsis menu
  const [openMenuId, setOpenMenuId] = useState<number | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null)

  // Confirm modals
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [statusConfirm, setStatusConfirm] = useState<{
    project: ProgramActivity
    nextStatus: ProjectStatus
    label: string
  } | null>(null)

  // ── Derived data ─────────────────────────────────────────────────────────

  // CLPEP interventions converted to ProgramActivity shape for display (ID
  // offset 900000) — the real data lives in CLPEPContext, backed by
  // clpep_interventions, not this localStorage context.
  const clpepAsActivities: ProgramActivity[] = clpep.interventions.map(i => ({
    id: i.id + CLPEP_ID_OFFSET,
    program: 'Livelihood',
    service: 'CLPEP',
    title: i.interventionName,
    date: i.date ?? '',
    location: i.location,
    description: i.description,
    participants: i.targetBeneficiaries ? parseInt(i.targetBeneficiaries) : undefined,
    status: i.status as ProjectStatus,
    facilitator: i.implementingOfficer,
    typeOfProject: i.interventionCategory,
    partnerAgency: i.partnerAgency,
    partnerAgencyOther: i.partnerAgencyOther,
    interventionCategoryOther: i.interventionCategoryOther,
  }))

  // SLP projects converted to ProgramActivity shape for display (ID offset
  // 600000) — the real data lives in SLPContext, backed by slp_projects.
  const slpAsActivities: ProgramActivity[] = slp.projects.map(p => ({
    id: p.id + SLP_ID_OFFSET,
    program: 'Livelihood',
    service: 'SLP',
    title: p.projectName,
    date: p.dateStarted,
    location: p.location,
    description: p.description,
    facilitator: p.facilitator,
    status: p.status as ProjectStatus,
    assistanceAmount: p.assistanceAmount,
    dateReleased: p.dateReleased,
    slpTrack: p.slpTrack,
  }))

  // DILP/TUPAD projects converted to ProgramActivity shape for display (ID
  // offsets 700000/800000) — the real data lives in DILPContext/TUPADContext,
  // backed by dilp_projects/tupad_projects, not this localStorage context.
  const dilpAsActivities: ProgramActivity[] = dilp.projects.map(p => ({
    id: p.id + DILP_ID_OFFSET,
    program: 'Livelihood',
    service: 'DILEEP (DILP)',
    title: p.projectName,
    date: p.dateReleased,
    location: [p.cityMunicipality, p.province].filter(Boolean).join(', '),
    status: p.status as ProjectStatus,
    assistanceAmount: p.assistanceAmount,
    dateReleased: p.dateReleased,
  }))

  const tupadAsActivities: ProgramActivity[] = tupad.projects.map(p => ({
    id: p.id + TUPAD_ID_OFFSET,
    program: 'Livelihood',
    service: 'DILEEP (TUPAD)',
    title: p.title,
    date: p.date,
    location: p.location,
    description: p.description,
    facilitator: p.facilitator,
    participants: p.participants ? parseInt(p.participants) : undefined,
    status: p.status as ProjectStatus,
    assistanceAmount: p.assistanceAmount,
    dateReleased: p.dateReleased,
  }))

  const BACKEND_SERVICES = ['DILEEP (DILP)', 'DILEEP (TUPAD)', 'SLP', 'CLPEP']
  const livelihoodProjects = [
    ...activities.filter(a => a.program === 'Livelihood' && !BACKEND_SERVICES.includes(a.service)),
    ...dilpAsActivities,
    ...tupadAsActivities,
    ...slpAsActivities,
    ...clpepAsActivities,
  ]

  const statusRank = (s: string) => ({ Planned: 0, Open: 0, Ongoing: 1, Active: 1, Completed: 2, Cancelled: 3 }[s] ?? 1)
  const filteredProjects = livelihoodProjects.filter(a => {
    const matchesService = filterService === 'All' || a.service === filterService
    const matchesStatus  = filterStatus  === 'All' || a.status  === filterStatus
    const matchesSearch  = !searchQuery  ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.service.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesService && matchesStatus && matchesSearch
  }).sort((a, b) => statusRank(a.status) - statusRank(b.status))
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / perPage))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedProjects = filteredProjects.slice((safePage - 1) * perPage, safePage * perPage)
  const recordStart = filteredProjects.length === 0 ? 0 : (safePage - 1) * perPage + 1
  const recordEnd = Math.min(safePage * perPage, filteredProjects.length)

  // ── Helpers ───────────────────────────────────────────────────────────────

  const resetForm = () => {
    setFormData(blankForm)
    setDilpFormData(blankDilpForm)
    setDilpAttachments([])
    setTupadFormData(blankTupadForm)
    setTupadAttachments([])
    setSlpFormData(blankSlpForm)
    setSlpAttachments([])
    setClpepFormData(blankClpepForm)
    setClpepAttachments([])
    setSelectedService('')
    setEditingId(null)
    setSelectedProject(null)
  }

  const goToList = () => {
    resetForm()
    setAction('view_projects')
  }

  const goHome = () => {
    resetForm()
    setAction('')
    setFilterService('All')
    setFilterStatus('All')
    setSearchQuery('')
  }

  const fillFormFromProject = (a: ProgramActivity) => {
    setSelectedService(a.service)
    if (a.service === 'DILEEP (DILP)') {
      const p = dilp.projects.find(x => x.id === a.id - DILP_ID_OFFSET)
      setDilpFormData({
        projectIdNumber:    p?.projectIdNumber    ?? '',
        projectName:        p?.projectName        ?? a.title,
        typeOfProject:      (p?.typeOfProject      ?? '') as DILPFormData['typeOfProject'],
        programComponent:   (p?.programComponent   ?? '') as DILPFormData['programComponent'],
        wayOfImplementation: (p?.wayOfImplementation ?? '') as DILPFormData['wayOfImplementation'],
        region:             p?.region             ?? '',
        province:           p?.province           ?? '',
        cityMunicipality:   p?.cityMunicipality   ?? '',
        barangay:           p?.barangay           ?? '',
        barangayId:         p?.barangayId         ?? null,
        streetPurok:        p?.streetPurok        ?? '',
        assistanceAmount:   p?.assistanceAmount   ?? '',
        dateReleased:       p?.dateReleased       ?? '',
        status:             (p?.status ?? a.status) as DILPFormData['status'],
      })
      setDilpAttachments((p?.documents ?? []).map(d => ({ name: d.fileName, url: d.url, fileType: '', id: d.id })))
    } else if (a.service === 'DILEEP (TUPAD)') {
      const p = tupad.projects.find(x => x.id === a.id - TUPAD_ID_OFFSET)
      setTupadAttachments((p?.documents ?? []).map(d => ({ name: d.fileName, url: d.url, fileType: '', id: d.id })))
      setTupadFormData({
        title:            p?.title ?? a.title,
        description:      p?.description      ?? '',
        date:             p?.date ?? a.date,
        location:         p?.location ?? a.location,
        facilitator:      p?.facilitator      ?? '',
        participants:     p?.participants ?? '',
        status:           (p?.status ?? (a.status === 'Cancelled' ? 'Planned' : a.status)) as TUPADFormData['status'],
        assistanceAmount: p?.assistanceAmount  ?? '',
        dateReleased:     p?.dateReleased      ?? '',
      })
    } else if (a.service === 'CLPEP') {
      const i = clpep.interventions.find(x => x.id === a.id - CLPEP_ID_OFFSET)
      setClpepAttachments((i?.documents ?? []).map(d => ({ name: d.name, url: d.url, fileType: d.fileType, id: d.id })))
      setClpepFormData({
        interventionName:     i?.interventionName          ?? a.title,
        description:          i?.description               ?? '',
        interventionCategory: i?.interventionCategory       ?? '',
        interventionCategoryOther: i?.interventionCategoryOther ?? '',
        targetBeneficiaries:  i?.targetBeneficiaries         ?? '',
        date:                 i?.date                       ?? '',
        implementingOfficer:  i?.implementingOfficer         ?? '',
        partnerAgency:        i?.partnerAgency               ?? '',
        partnerAgencyOther:   i?.partnerAgencyOther          ?? '',
        location:             i?.location                    ?? '',
        status:               (i?.status ?? a.status) as CLPEPFormData['status'],
      })
    } else if (a.service === 'SLP') {
      const p = slp.projects.find(x => x.id === a.id - SLP_ID_OFFSET)
      setSlpAttachments((p?.documents ?? []).map(d => ({ name: d.name, url: d.url, fileType: d.fileType, id: d.id })))
      setSlpFormData({
        projectName:      p?.projectName      ?? a.title,
        description:      p?.description      ?? '',
        slpTrack:         p?.slpTrack         ?? '',
        dateStarted:      p?.dateStarted      ?? '',
        location:         p?.location         ?? '',
        facilitator:      p?.facilitator      ?? '',
        status:           (p?.status ?? a.status) as SLPFormData['status'],
        assistanceAmount: p?.assistanceAmount  ?? '',
        dateReleased:     p?.dateReleased      ?? '',
      })
    } else {
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
  }

  // ── CRUD ──────────────────────────────────────────────────────────────────

  // DILP/TUPAD projects are backend-persisted (dilp_projects/tupad_projects),
  // not part of this component's localStorage ProgramActivity model — build
  // and send the payload directly, then refresh the relevant context.
  const handleSaveDilpProject = async () => {
    if (!dilpFormData.projectIdNumber.trim()) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter a Project ID Number.', confirmButtonColor: '#0077BE' }); return }
    if (!dilpFormData.projectName.trim()) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter a Project Name.', confirmButtonColor: '#0077BE' }); return }

    const realId = editingId !== null ? editingId - DILP_ID_OFFSET : null
    const payload = {
      projectIdNumber:     dilpFormData.projectIdNumber,
      projectName:         dilpFormData.projectName,
      typeOfProject:       dilpFormData.typeOfProject,
      programComponent:    dilpFormData.programComponent,
      wayOfImplementation: dilpFormData.wayOfImplementation,
      barangayId:          dilpFormData.barangayId,
      streetPurok:         dilpFormData.streetPurok,
      assistanceAmount:    dilpFormData.assistanceAmount,
      dateReleased:        dilpFormData.dateReleased,
      status:              dilpFormData.status,
      documents:           dilpAttachments.map(a => ({ fileName: a.name, dataUrl: a.dataUrl, id: a.id })),
    }
    try {
      if (realId !== null) await dilpService.updateProject(realId, payload)
      else await dilpService.createProject(payload)
      await dilp.refreshProjects()
      Swal.fire({ icon: 'success', title: realId !== null ? 'Project Updated' : 'Project Added', text: realId !== null ? 'The project has been updated.' : 'New DILP project has been saved.', confirmButtonColor: '#0077BE', timer: 2000, timerProgressBar: true })
      goToList()
    } catch (e: unknown) {
      Swal.fire({ icon: 'error', title: 'Error', text: (e as { message?: string })?.message ?? 'Failed to save project.', confirmButtonColor: '#0077BE' })
    }
  }

  const handleSaveTupadProject = async () => {
    if (!tupadFormData.title.trim()) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter an activity title.', confirmButtonColor: '#0077BE' }); return }

    const realId = editingId !== null ? editingId - TUPAD_ID_OFFSET : null
    const payload = {
      title:            tupadFormData.title.trim(),
      description:      tupadFormData.description.trim(),
      date:             tupadFormData.date,
      location:         tupadFormData.location,
      facilitator:      tupadFormData.facilitator,
      participants:     tupadFormData.participants,
      status:           tupadFormData.status,
      assistanceAmount: tupadFormData.assistanceAmount,
      dateReleased:     tupadFormData.dateReleased,
      documents:        tupadAttachments.map(a => ({ fileName: a.name, dataUrl: a.dataUrl, id: a.id })),
    }
    try {
      if (realId !== null) await tupadService.updateProject(realId, payload)
      else await tupadService.createProject(payload)
      await tupad.refreshProjects()
      Swal.fire({ icon: 'success', title: realId !== null ? 'Project Updated' : 'Project Added', text: realId !== null ? 'The project has been updated.' : 'New TUPAD project has been saved.', confirmButtonColor: '#0077BE', timer: 2000, timerProgressBar: true })
      goToList()
    } catch (e: unknown) {
      Swal.fire({ icon: 'error', title: 'Error', text: (e as { message?: string })?.message ?? 'Failed to save project.', confirmButtonColor: '#0077BE' })
    }
  }

  const handleSaveClpepIntervention = async () => {
    if (!clpepFormData.interventionName.trim()) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter an Intervention Name.', confirmButtonColor: '#0077BE' }); return }
    if (!clpepFormData.interventionCategory) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please select an Intervention Category.', confirmButtonColor: '#0077BE' }); return }
    if (!clpepFormData.date) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter a Date.', confirmButtonColor: '#0077BE' }); return }
    if (!clpepFormData.implementingOfficer.trim()) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter an Implementing Officer.', confirmButtonColor: '#0077BE' }); return }

    const realId = editingId !== null ? editingId - CLPEP_ID_OFFSET : null
    const payload = {
      interventionName:          clpepFormData.interventionName.trim(),
      description:               clpepFormData.description,
      interventionCategory:      clpepFormData.interventionCategory,
      interventionCategoryOther: clpepFormData.interventionCategoryOther,
      targetBeneficiaries:       clpepFormData.targetBeneficiaries,
      date:                      clpepFormData.date,
      implementingOfficer:       clpepFormData.implementingOfficer,
      partnerAgency:             clpepFormData.partnerAgency,
      partnerAgencyOther:        clpepFormData.partnerAgencyOther,
      location:                 clpepFormData.location,
      status:                   clpepFormData.status,
      documents:                 clpepAttachments.map(a => ({ fileName: a.name, dataUrl: a.dataUrl, id: a.id })),
    }
    try {
      if (realId !== null) await clpepService.updateIntervention(realId, payload)
      else await clpepService.createIntervention(payload)
      await clpep.refreshInterventions()
      Swal.fire({ icon: 'success', title: realId !== null ? 'Intervention Updated' : 'Intervention Added', text: realId !== null ? 'The intervention has been updated.' : 'New CLPEP intervention has been saved.', confirmButtonColor: '#0077BE', timer: 2000, timerProgressBar: true })
      goToList()
    } catch (e: unknown) {
      Swal.fire({ icon: 'error', title: 'Error', text: (e as { message?: string })?.message ?? 'Failed to save intervention.', confirmButtonColor: '#0077BE' })
    }
  }

  const handleSaveSlpProject = async () => {
    if (!slpFormData.projectName.trim()) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter a Project Name.', confirmButtonColor: '#0077BE' }); return }
    if (!slpFormData.dateStarted) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter the Date Started.', confirmButtonColor: '#0077BE' }); return }
    if (!slpFormData.facilitator.trim()) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter a Facilitator / Person In Charge.', confirmButtonColor: '#0077BE' }); return }

    // Status is a manual staff judgment call, not derived -- this is a soft
    // nudge (not a block) for the case where Ongoing/Completed is picked
    // before the project's own Date Started has actually arrived yet.
    if ((slpFormData.status === 'Ongoing' || slpFormData.status === 'Completed') && slpFormData.dateStarted > todayIso()) {
      const confirm = await Swal.fire({
        icon: 'warning',
        title: 'Date Started is in the future',
        text: `This project's Date Started (${slpFormData.dateStarted}) hasn't happened yet. Mark it as ${slpFormData.status} anyway?`,
        showCancelButton: true,
        confirmButtonText: `Yes, mark as ${slpFormData.status}`,
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#0077BE',
      })
      if (!confirm.isConfirmed) return
    }

    const realId = editingId !== null ? editingId - SLP_ID_OFFSET : null
    const payload = {
      projectName:      slpFormData.projectName.trim(),
      description:      slpFormData.description.trim(),
      slpTrack:         slpFormData.slpTrack,
      dateStarted:      slpFormData.dateStarted,
      location:         slpFormData.location,
      facilitator:      slpFormData.facilitator,
      status:           slpFormData.status,
      assistanceAmount: slpFormData.assistanceAmount,
      dateReleased:     slpFormData.dateReleased,
      documents:        slpAttachments.map(a => ({ fileName: a.name, dataUrl: a.dataUrl, id: a.id })),
    }
    try {
      if (realId !== null) await slpService.updateProject(realId, payload)
      else await slpService.createProject(payload)
      await slp.refreshProjects()
      Swal.fire({ icon: 'success', title: realId !== null ? 'Project Updated' : 'Project Added', text: realId !== null ? 'The project has been updated.' : 'New SLP project has been saved.', confirmButtonColor: '#0077BE', timer: 2000, timerProgressBar: true })
      goToList()
    } catch (e: unknown) {
      Swal.fire({ icon: 'error', title: 'Error', text: (e as { message?: string })?.message ?? 'Failed to save project.', confirmButtonColor: '#0077BE' })
    }
  }

  const handleSave = () => {
    if (!selectedService) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please select a service type.', confirmButtonColor: '#0077BE' }); return }

    if (selectedService === 'DILEEP (DILP)') { handleSaveDilpProject(); return }
    if (selectedService === 'DILEEP (TUPAD)') { handleSaveTupadProject(); return }
    if (selectedService === 'CLPEP') { handleSaveClpepIntervention(); return }
    if (selectedService === 'SLP') { handleSaveSlpProject(); return }

    if (!formData.title.trim()) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter a project title.', confirmButtonColor: '#0077BE' }); return }

    payload = {
      id:              editingId ?? Date.now(),
      program:         'Livelihood',
      service:         selectedService,
      title:           formData.title.trim(),
      description:     formData.description.trim()   || undefined,
      date:            formData.date,
      location:        formData.location,
      facilitator:     formData.facilitator           || undefined,
      counselor:       formData.counselor             || undefined,
      sessionDuration: formData.sessionDuration       || undefined,
      participants:    parseInt(formData.participants) || undefined,
      startDate:       formData.startDate             || undefined,
      endDate:         formData.endDate               || undefined,
      status:          formData.status,
    }

    if (editingId !== null) {
      setActivities(prev => prev.map(a => a.id === editingId ? payload : a))
      Swal.fire({ icon: 'success', title: 'Project Updated', text: 'The project has been updated.', confirmButtonColor: '#0077BE', timer: 2000, timerProgressBar: true })
    } else {
      setActivities(prev => [...prev, payload])
      Swal.fire({ icon: 'success', title: 'Project Added', text: 'New Livelihood project has been saved.', confirmButtonColor: '#0077BE', timer: 2000, timerProgressBar: true })
    }

    goToList()
  }

  // The backend has no separate draft state for interventions, so "Save
  // Draft" now saves the same way "Save Intervention" does.
  const handleSaveDraft = () => { handleSaveClpepIntervention() }

  // Offsets checked largest-first: CLPEP (900000) > TUPAD (800000) > DILP
  // (700000) > SLP (600000) — checking TUPAD before CLPEP would misroute
  // every CLPEP id (which is always >= 800000 too) to the TUPAD endpoint.
  const handleDelete = async () => {
    if (deleteConfirm === null) return
    try {
      if (deleteConfirm >= CLPEP_ID_OFFSET) {
        await clpepService.deleteIntervention(deleteConfirm - CLPEP_ID_OFFSET)
        await clpep.refreshInterventions()
      } else if (deleteConfirm >= TUPAD_ID_OFFSET) {
        await tupadService.deleteProject(deleteConfirm - TUPAD_ID_OFFSET)
        await tupad.refreshProjects()
      } else if (deleteConfirm >= DILP_ID_OFFSET) {
        await dilpService.deleteProject(deleteConfirm - DILP_ID_OFFSET)
        await dilp.refreshProjects()
      } else if (deleteConfirm >= SLP_ID_OFFSET) {
        await slpService.deleteProject(deleteConfirm - SLP_ID_OFFSET)
        await slp.refreshProjects()
      } else {
        setActivities(prev => prev.filter(a => a.id !== deleteConfirm))
      }
    } catch (e: unknown) {
      Swal.fire({ icon: 'error', title: 'Error', text: (e as { message?: string })?.message ?? 'Failed to delete project.', confirmButtonColor: '#0077BE' })
    }
    setDeleteConfirm(null)
  }

  // DILP/TUPAD/SLP/CLPEP beneficiary status is all derived server-side from
  // the assigned project/intervention's own status now — no client-side
  // cascade write needed here for any of them.
  const handleStatusChange = async () => {
    if (!statusConfirm) return
    const { project, nextStatus } = statusConfirm
    try {
      if (project.id >= CLPEP_ID_OFFSET) {
        await clpepService.updateInterventionStatus(project.id - CLPEP_ID_OFFSET, nextStatus)
        await clpep.refreshInterventions()
        await clpep.refreshProfiles()
      } else if (project.id >= TUPAD_ID_OFFSET) {
        await tupadService.updateProjectStatus(project.id - TUPAD_ID_OFFSET, nextStatus)
        await tupad.refreshProjects()
        await tupad.refreshProfiles()
      } else if (project.id >= DILP_ID_OFFSET) {
        await dilpService.updateProjectStatus(project.id - DILP_ID_OFFSET, nextStatus)
        await dilp.refreshProjects()
        await dilp.refreshProfiles()
      } else if (project.id >= SLP_ID_OFFSET) {
        await slpService.updateProjectStatus(project.id - SLP_ID_OFFSET, nextStatus)
        await slp.refreshProjects()
        await slp.refreshProfiles()
      } else {
        setActivities(prev => prev.map(a => a.id === project.id ? { ...a, status: nextStatus } : a))
      }
    } catch (e: unknown) {
      Swal.fire({ icon: 'error', title: 'Error', text: (e as { message?: string })?.message ?? 'Failed to update status.', confirmButtonColor: '#0077BE' })
      setStatusConfirm(null)
      return
    }
    Swal.fire({ icon: 'success', title: 'Status Updated', text: `Project is now ${nextStatus}.`, confirmButtonColor: '#0077BE', timer: 2000, timerProgressBar: true })
    setStatusConfirm(null)
  }

  // ── Render: landing ───────────────────────────────────────────────────────

  const renderLanding = () => {
    const cards: { key: Action; icon: React.ReactNode; label: string; desc: string }[] = [
      { key: 'add_project',   icon: <PlusCircle    size={32} />, label: 'Add Project',    desc: 'Create a new Livelihood project' },
      { key: 'view_projects', icon: <FolderOpen    size={32} />, label: 'View Projects',  desc: 'Browse all Livelihood projects' },
    ]

    return (
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <p className="text-gray-500 mb-5">
          Select an action for <span className="text-brand-blue font-medium">Livelihood</span>
        </p>
        <div className="grid grid-cols-2 gap-5">
          {cards.map(card => (
            <button
              key={card.key}
              onClick={() => setAction(card.key)}
              disabled={card.label.startsWith('Add') && !canManage('maintenance')}
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

  // ── Render: project form (add / edit / view) ──────────────────────────────

  const renderProjectForm = (mode: 'add' | 'edit' | 'view') => {
    const isView = mode === 'view'
    const heading =
      mode === 'view' ? 'View Project Details' :
      mode === 'edit' ? 'Edit Project' : 'Add New Project'

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
              <p className="text-white/70 text-sm mt-0.5">Livelihood Program</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Service selector */}
          <div className="mb-6">
            <label className={labelCls}>
              Service Type <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedService}
              onChange={e => setSelectedService(e.target.value)}
              disabled={isView || mode === 'edit'}
              className={inputCls + ' bg-white'}
            >
              <option value="">Select Service Type</option>
              {services.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* DILP-specific form */}
          {selectedService === 'DILEEP (DILP)' && (
            <div className="border-t pt-6">
              <DILPForm
                formData={dilpFormData}
                onChange={setDilpFormData}
                onSave={handleSave}
                mode={mode}
                onCancel={mode === 'add' ? goHome : goToList}
                attachments={dilpAttachments}
                onAddAttachment={att => setDilpAttachments(prev => [...prev, att])}
                onRemoveAttachment={idx => setDilpAttachments(prev => prev.filter((_, i) => i !== idx))}
              />
            </div>
          )}

          {/* TUPAD-specific form */}
          {selectedService === 'DILEEP (TUPAD)' && (
            <div className="border-t pt-6">
              <TUPADForm
                formData={tupadFormData}
                onChange={setTupadFormData}
                onSave={handleSave}
                mode={mode}
                onCancel={mode === 'add' ? goHome : goToList}
                attachments={tupadAttachments}
                onAddAttachment={att => setTupadAttachments(prev => [...prev, att])}
                onRemoveAttachment={idx => setTupadAttachments(prev => prev.filter((_, i) => i !== idx))}
              />
            </div>
          )}

          {/* CLPEP-specific form */}
          {selectedService === 'CLPEP' && (
            <div className="border-t pt-6">
              <CLPEPForm
                formData={clpepFormData}
                onChange={setClpepFormData}
                onSave={handleSave}
                onSaveDraft={handleSaveDraft}
                mode={mode}
                onCancel={mode === 'add' ? goHome : goToList}
                attachments={clpepAttachments}
                onAddAttachment={att => setClpepAttachments(prev => [...prev, att])}
                onRemoveAttachment={idx => setClpepAttachments(prev => prev.filter((_, i) => i !== idx))}
              />
            </div>
          )}

          {/* SLP-specific form */}
          {selectedService === 'SLP' && (
            <div className="border-t pt-6">
              <SLPForm
                formData={slpFormData}
                onChange={setSlpFormData}
                onSave={handleSave}
                mode={mode}
                onCancel={mode === 'add' ? goHome : goToList}
                attachments={slpAttachments}
                onAddAttachment={att => setSlpAttachments(prev => [...prev, att])}
                onRemoveAttachment={idx => setSlpAttachments(prev => prev.filter((_, i) => i !== idx))}
              />
            </div>
          )}

          {/* Generic form for other services */}
          {selectedService !== 'DILEEP (DILP)' && selectedService !== 'DILEEP (TUPAD)' && selectedService !== 'SLP' && selectedService !== 'CLPEP' && (selectedService || mode !== 'add') && (
            <div className="border-t pt-6 space-y-5">
              {/* Title + Description */}
              <div>
                <label className={labelCls}>Project Title <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={formData.title}
                  readOnly={isView}
                  onChange={e => setFormData(p => ({ ...p, title: e.target.value }))}
                  className={inputCls}
                  placeholder="e.g. Community Livelihood Project – Batch 1"
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
                  placeholder="Enter project description"
                />
              </div>

              {/* Date + Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Date</label>
                  <DatePicker className={inputCls} value={formData.date} readOnly={isView}
                    onChange={value => setFormData(p => ({ ...p, date: value }))} />
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
                  {(['Planned', 'Ongoing', 'Completed'] as const).map(s => (
                    <label key={s} className={`flex items-center gap-2 ${isView ? 'cursor-default' : 'cursor-pointer'}`}>
                      <input
                        type="radio"
                        name="livelihood-status"
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

              {/* Section divider: Additional info */}
              <div className="border-t pt-5 mt-1">
                <p className="text-xs font-semibold text-brand-blue uppercase tracking-wider mb-4">
                  Additional Project / Session Information
                </p>

                {/* Coordinator + Session Duration */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className={labelCls}>Coordinator / Project Officer</label>
                    <input type="text" value={formData.counselor} readOnly={isView}
                      onChange={e => setFormData(p => ({ ...p, counselor: e.target.value }))}
                      className={inputCls} placeholder="Enter coordinator name" />
                  </div>
                  <div>
                    <label className={labelCls}>Session Duration / No. of Sessions</label>
                    <input type="text" value={formData.sessionDuration} readOnly={isView}
                      onChange={e => setFormData(p => ({ ...p, sessionDuration: e.target.value }))}
                      className={inputCls} placeholder="e.g. 10 days, 8 hours each" />
                  </div>
                </div>

                {/* Start + End dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={labelCls}>Start Date</label>
                    <DatePicker className={inputCls} value={formData.startDate} readOnly={isView}
                      onChange={value => setFormData(p => ({ ...p, startDate: value }))} />
                  </div>
                  <div>
                    <label className={labelCls}>End Date</label>
                    <DatePicker className={inputCls} value={formData.endDate} readOnly={isView}
                      onChange={value => setFormData(p => ({ ...p, endDate: value }))} />
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
                  {mode === 'add' ? 'Cancel' : 'Back to Projects'}
                </button>
                {!isView && (
                  <button
                    onClick={handleSave}
                    disabled={!canManage('maintenance')}
                    className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue"
                  >
                    {mode === 'edit' ? 'Update Project' : 'Save Project'}
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

  // ── Participant count helpers (read from localStorage on each render) ────────

  const getParticipantCount = (a: ProgramActivity): number | undefined => {
    if (a.service === 'DILEEP (DILP)')
      return dilp.projects.find(p => p.id === a.id - DILP_ID_OFFSET)?.assignedCount
    if (a.service === 'DILEEP (TUPAD)')
      return tupad.projects.find(p => p.id === a.id - TUPAD_ID_OFFSET)?.assignedCount
    if (a.service === 'SLP')
      return slp.projects.find(p => p.id === a.id - SLP_ID_OFFSET)?.assignedCount
    if (a.service === 'CLPEP')
      return clpep.interventions.find(i => i.id === a.id - CLPEP_ID_OFFSET)?.assignedCount
    return undefined
  }

  // TUPAD's "Number of Participants" and CLPEP's "Target Beneficiaries" are
  // both target headcounts the backend enforces as a cap — show
  // "assigned/target" for those instead of a bare count.
  const getParticipantLabel = (a: ProgramActivity): string => {
    const count = getParticipantCount(a)
    if ((a.service === 'DILEEP (TUPAD)' || a.service === 'CLPEP') && a.participants != null) {
      return `${count ?? 0}/${a.participants}`
    }
    return count != null ? String(count) : '—'
  }

  // ── Render: view projects ─────────────────────────────────────────────────

  const renderViewProjects = () => (
    <>
      {/* Filters */}
      <div className="bg-white rounded-xl shadow-md p-4 mb-4">
        {/* Service tabs */}
        <div className="flex flex-wrap gap-2 mb-3">
          {SERVICE_TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => { setFilterService(tab.value); setCurrentPage(1) }}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                filterService === tab.value
                  ? 'bg-brand-blue text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {/* Status dropdown + Search */}
        <div className="flex gap-3">
          <select
            value={filterStatus}
            onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1) }}
            className="w-44 flex-shrink-0 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent text-sm text-gray-900 bg-white"
          >
            <option value="All">All Status</option>
            <option value="Planned">Planned</option>
            <option value="Ongoing">Ongoing</option>
            <option value="Completed">Completed</option>
            <option value="Pending">Pending</option>
            <option value="Released">Released</option>
          </select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Search by project title or service..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1) }}
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
            <h3 className="text-white m-0">Livelihood Projects</h3>
          </div>
          <button
            onClick={() => { resetForm(); setAction('add_project') }}
            disabled={!canManage('maintenance')}
            className="flex items-center gap-2 px-4 py-2 bg-white text-brand-blue rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
          >
            <Plus size={15} /> Add Project
          </button>
        </div>

        {/* Ellipsis menu portal */}
        {openMenuId !== null && menuPos !== null && (() => {
          const a = livelihoodProjects.find(x => x.id === openMenuId)
          if (!a) return null
          return (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
              <div
                style={{ position: 'fixed', top: menuPos.top, right: menuPos.right }}
                className="w-52 bg-white rounded-lg shadow-lg border border-gray-200 z-50 py-1"
              >
                <button
                  onClick={() => { fillFormFromProject(a); setSelectedProject(a); setAction('view_project'); setOpenMenuId(null) }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                >
                  <FolderOpen size={14} className="text-blue-500" />
                  View Details
                </button>
                <button
                  onClick={() => { setSelectedProject(a); setAction('view_participants'); setOpenMenuId(null) }}
                  className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5"
                >
                  <Users size={14} className="text-gray-500" />
                  View Participants
                </button>
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => { fillFormFromProject(a); setEditingId(a.id); setAction('edit_project'); setOpenMenuId(null) }}
                  disabled={!canManage('maintenance')}
                  className="w-full px-4 py-2.5 text-left text-sm text-brand-blue hover:bg-blue-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <Edit2 size={14} className="text-blue-500" />
                  Edit
                </button>
                {a.status === 'Planned' && (
                  <button
                    onClick={() => { setStatusConfirm({ project: a, nextStatus: 'Ongoing', label: 'Mark as Ongoing' }); setOpenMenuId(null) }}
                    disabled={!canManage('maintenance')}
                    className="w-full px-4 py-2.5 text-left text-sm text-brand-blue hover:bg-blue-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <PlayCircle size={14} className="text-blue-500" />
                    Mark as Ongoing
                  </button>
                )}
                {a.status === 'Ongoing' && (
                  <button
                    onClick={() => { setStatusConfirm({ project: a, nextStatus: 'Completed', label: 'Mark as Completed' }); setOpenMenuId(null) }}
                    disabled={!canManage('maintenance')}
                    className="w-full px-4 py-2.5 text-left text-sm text-green-600 hover:bg-green-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <CheckCircle size={14} className="text-green-600" />
                    Mark as Completed
                  </button>
                )}
                {a.status === 'Completed' && (
                  <button
                    onClick={() => { setStatusConfirm({ project: a, nextStatus: 'Planned', label: 'Reopen' }); setOpenMenuId(null) }}
                    disabled={!canManage('maintenance')}
                    className="w-full px-4 py-2.5 text-left text-sm text-brand-blue hover:bg-blue-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <RefreshCw size={14} className="text-blue-500" />
                    Reopen
                  </button>
                )}
                <div className="my-1 border-t border-gray-100" />
                <button
                  onClick={() => { setDeleteConfirm(a.id); setOpenMenuId(null) }}
                  disabled={!canManage('maintenance')}
                  className="w-full px-4 py-2.5 text-left text-sm text-red-500 hover:bg-red-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                >
                  <Trash2 size={14} className="text-red-500" />
                  Delete
                </button>
              </div>
            </>
          )
        })()}

        {/* Empty state */}
        {filteredProjects.length === 0 ? (
          <div className="py-16 text-center">
            <FolderOpen size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">No Livelihood projects found.</p>
            <button
              onClick={() => { resetForm(); setAction('add_project') }}
              disabled={!canManage('maintenance')}
              className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add First Project
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Project Title</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Service</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Date</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Location</th>
                  <th className="px-6 py-4 text-center text-sm text-gray-700 font-semibold">Beneficiaries</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Status</th>
                  <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold w-16">Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedProjects.map(a => (
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
                      {getParticipantLabel(a)}
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
                <span>{recordStart} to {recordEnd} of {filteredProjects.length} records</span>
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
    if (!selectedProject) return null
    const isCLPEP = selectedProject.id >= CLPEP_ID_OFFSET
    type ParticipantRow = { id: number; name: string; service: string; barangay?: string; contactNumber?: string; status: string }
    let participants: ParticipantRow[]
    if (isCLPEP) {
      // CLPEP allows reassignment (like TUPAD), so a completed intervention
      // keeps showing everyone who was ever part of it via assignmentHistory.
      const realId = selectedProject.id - CLPEP_ID_OFFSET
      participants = clpep.applicants
        .filter(b => b.assignmentHistory.some(h => h.interventionId === realId))
        .map(b => ({ id: b.id, name: `${b.lastName}, ${b.firstName}`, service: 'CLPEP', barangay: b.barangay, status: b.status }))
    } else if (selectedProject.service === 'SLP') {
      const realId = selectedProject.id - SLP_ID_OFFSET
      participants = slp.applicants
        .filter(b => b.assignmentHistory.some(h => h.projectId === realId))
        .map(b => ({ id: b.id, name: `${b.lastName}, ${b.firstName}`, service: 'SLP', barangay: b.barangay, contactNumber: b.contactNumber, status: b.status }))
    } else if (selectedProject.service === 'DILEEP (DILP)') {
      const realId = selectedProject.id - DILP_ID_OFFSET
      participants = dilp.applicants
        .filter(b => b.assignedProjectId === realId)
        .map(b => ({ id: b.id, name: `${b.lastName}, ${b.firstName}`, service: 'DILEEP (DILP)', barangay: b.barangay, contactNumber: b.contactNumber, status: b.status }))
    } else {
      // DILEEP (TUPAD) — unlike DILP, a beneficiary can move on to a new
      // project after this one completes, so their *current* assignedProjectId
      // may no longer point here. Check the full assignmentHistory instead,
      // so a completed project keeps showing everyone who was ever part of it.
      const realId = selectedProject.id - TUPAD_ID_OFFSET
      participants = tupad.applicants
        .filter(b => b.assignmentHistory.some(h => h.projectId === realId))
        .map(b => ({ id: b.id, name: `${b.lastName}, ${b.firstName}`, service: 'DILEEP (TUPAD)', barangay: b.barangay, contactNumber: b.contactNumber, status: b.status }))
    }

    const ptotal = Math.max(1, Math.ceil(participants.length / participantPerPage))
    const psafe = Math.min(participantPage, ptotal)
    const paginatedPts = participants.slice((psafe - 1) * participantPerPage, psafe * participantPerPage)
    const pStart = participants.length === 0 ? 0 : (psafe - 1) * participantPerPage + 1
    const pEnd = Math.min(psafe * participantPerPage, participants.length)

    const BENEFICIARY_STATUS_COLORS: Record<string, string> = {
      Active:    'bg-blue-100 text-blue-700',
      Inactive:  'bg-gray-100 text-gray-500',
      Completed: 'bg-green-100 text-green-700',
      Dropped:   'bg-red-100 text-red-500',
      Pending:   'bg-yellow-100 text-yellow-700',
    }

    return (
      <div>
        <div className="mb-4">
          <button
            onClick={goToList}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
          >
            <ArrowLeft size={16} /> Back to Projects
          </button>
        </div>

        {/* Header */}
        <div className="bg-brand-blue rounded-xl px-6 py-4 mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-white text-base font-semibold m-0">{selectedProject.title}</h3>
            <p className="text-white/80 text-sm mt-0.5">
              {participants.length} participant{participants.length !== 1 ? 's' : ''} found
            </p>
          </div>
          <StatusBadge status={selectedProject.status} />
        </div>

        {participants.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 py-16 text-center">
            <Users size={40} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-500 text-sm">No participants assigned to this intervention yet.</p>
            <p className="text-gray-400 text-xs mt-1">Assign beneficiaries from the {isCLPEP ? 'CLPEP' : selectedProject?.service === 'SLP' ? 'SLP' : 'Livelihood (DILEEP)'} module.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-blue">
                  <th className="px-4 py-3 text-left text-white font-semibold">Full Name</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Service</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Barangay</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Contact</th>
                  <th className="px-4 py-3 text-left text-white font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPts.map((b, i) => (
                  <tr key={b.id} className={`border-t border-gray-100 ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                    <td className="px-4 py-3 font-medium text-gray-800">{b.name}</td>
                    <td className="px-4 py-3 text-gray-600">{b.service}</td>
                    <td className="px-4 py-3 text-gray-600">{b.barangay || '—'}</td>
                    <td className="px-4 py-3 text-gray-600">{b.contactNumber || '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${BENEFICIARY_STATUS_COLORS[b.status] ?? 'bg-gray-100 text-gray-500'}`}>
                        {b.status}
                      </span>
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
                <span className="text-sm text-gray-500">{pStart}–{pEnd} of {participants.length} records</span>
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
      {/* Action cards — always visible unless viewing participants or project detail/edit */}
      {action !== 'view_participants' && action !== 'view_project' && action !== 'edit_project' && renderLanding()}

      {/* Content area */}
      {action === '' && (
        <div className="bg-white rounded-xl shadow-md py-20 text-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderOpen size={32} className="text-brand-blue" />
          </div>
          <h3 className="text-gray-700 mb-2 text-center">Livelihood Program Maintenance</h3>
          <p className="text-gray-400 text-center px-8">
            Select an action above to manage projects and services for the Livelihood program.
          </p>
        </div>
      )}

      {action === 'add_project'      && renderProjectForm('add')}
      {action === 'edit_project'     && renderProjectForm('edit')}
      {action === 'view_project'     && renderProjectForm('view')}
      {action === 'view_projects'    && renderViewProjects()}
      {action === 'view_participants' && renderViewParticipants()}

      {/* Delete project modal */}
      <ConfirmModal
        open={deleteConfirm !== null}
        title="Delete Project"
        message="Are you sure you want to delete this project? This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Status change modal */}
      {statusConfirm !== null && (() => {
        const { project, nextStatus, label } = statusConfirm
        const steps: string[] = ['Planned', 'Ongoing', 'Completed']
        const curIdx  = steps.indexOf(project.status)
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
                  const isCur  = s === project.status
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
                Change <span className="font-medium text-gray-800">{project.title}</span> from{' '}
                <span className="font-medium text-blue-500">{project.status}</span> to{' '}
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
