import { useState, useRef } from 'react'
import Swal from 'sweetalert2'
import DatePicker from '../../components/DatePicker'
import {
  PlusCircle, Tag, FolderOpen, ClipboardList, MoreHorizontal,
  Edit2, Trash2, PlayCircle, CheckCircle, RefreshCw, ArrowLeft,
  Search, Users, Plus, AlertCircle, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { canManage } from '../../utils/permissions'
import { useProgramActivities } from '../../contexts/ProgramActivitiesContext'
import type { ProgramActivity } from '../../contexts/ProgramActivitiesContext'
import { LIVELIHOOD_SEED, CLPEP_INTERVENTIONS_SEED } from '../../contexts/LivelihoodContext'
import type { LivelihoodBeneficiary, CLPEPIntervention } from '../../contexts/LivelihoodContext'
import DILPForm from './DILPForm'
import type { DILPFormData, AttachmentItem } from './DILPForm'
import TUPADForm from './TUPADForm'
import type { TUPADFormData } from './TUPADForm'
import SLPForm from './SLPForm'
import type { SLPFormData } from './SLPForm'
import CLPEPForm from './CLPEPForm'
import type { CLPEPFormData } from './CLPEPForm'

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_SERVICES = [
  'DILEEP (DILP)',
  'DILEEP (TUPAD)',
  'SLP',
  'CLPEP',
]

// ─── CLPEP localStorage helpers ───────────────────────────────────────────────

const CLPEP_INTERVENTIONS_LS_KEY = 'lp_clpep_interventions_v1'
const SLP_BENEFICIARIES_LS_KEY = 'lp_slp_v7'
const DILP_BENEFICIARIES_LS_KEY = 'lp_dileep_v5'
const CLPEP_BENEFICIARIES_LS_KEY = 'lp_clpep_v8'

function loadCLPEPInterventions(): CLPEPIntervention[] {
  try {
    const raw = localStorage.getItem(CLPEP_INTERVENTIONS_LS_KEY)
    const parsed = raw ? (JSON.parse(raw) as CLPEPIntervention[]) : []
    return parsed.length > 0 ? parsed : CLPEP_INTERVENTIONS_SEED
  } catch {
    return CLPEP_INTERVENTIONS_SEED
  }
}

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
  | 'add_service'
  | 'view_services'

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
  beneficiaryType: '',
}

const blankSlpForm: SLPFormData = {
  projectName: '',
  description: '',
  slpTrack: '',
  projectCategory: '',
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
  targetBeneficiaries: '',
  startDate: '',
  endDate: '',
  implementingOfficer: '',
  partnerAgency: '',
  location: '',
  referralRequired: 'No',
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
  streetPurok: '',
  assistanceAmount: '',
  dateReleased: '',
  status: 'Planned',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadBeneficiaries(): LivelihoodBeneficiary[] {
  const raw = localStorage.getItem(DILP_BENEFICIARIES_LS_KEY)
  return raw ? JSON.parse(raw) : LIVELIHOOD_SEED
}

function saveBeneficiaries(data: LivelihoodBeneficiary[]) {
  localStorage.setItem(DILP_BENEFICIARIES_LS_KEY, JSON.stringify(data))
}

function loadSlpBeneficiaries(): LivelihoodBeneficiary[] {
  try {
    const raw = localStorage.getItem(SLP_BENEFICIARIES_LS_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function loadClpepBeneficiaries(): LivelihoodBeneficiary[] {
  try {
    const raw = localStorage.getItem(CLPEP_BENEFICIARIES_LS_KEY)
    return raw ? JSON.parse(raw) : LIVELIHOOD_SEED.filter(b => b.service === 'CLPEP')
  } catch { return [] }
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function LivelihoodMaintenanceForm() {
  const { activities, setActivities } = useProgramActivities()

  // Navigation
  const [action, setAction] = useState<Action>('')
  const [selectedProject, setSelectedProject] = useState<ProgramActivity | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)

  // Services list (user-editable)
  const [services, setServices] = useState<string[]>(DEFAULT_SERVICES)
  const [newServiceName, setNewServiceName] = useState('')
  const [serviceDeleteConfirm, setServiceDeleteConfirm] = useState<string | null>(null)

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
  const [servicePage, setServicePage] = useState(1)
  const [servicePerPage, setServicePerPage] = useState(10)

  // CLPEP interventions from CLPEPTab localStorage (settable so new adds appear immediately)
  const [clpepInterventions, setClpepInterventions] = useState<CLPEPIntervention[]>(loadCLPEPInterventions)
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

  const newServiceRef = useRef<HTMLInputElement>(null)

  // ── Derived data ─────────────────────────────────────────────────────────

  // CLPEP interventions converted to ProgramActivity shape for display (ID offset 900000)
  const clpepAsActivities: ProgramActivity[] = clpepInterventions.map(i => ({
    id: i.id + 900000,
    program: 'Livelihood',
    service: 'CLPEP',
    title: i.title,
    date: i.startDate ?? '',
    location: i.location,
    description: i.description,
    participants: i.targetBeneficiaries,
    status: (i.status === 'Active' ? 'Ongoing' : i.status) as ProjectStatus,
    facilitator: i.implementingOfficer,
    typeOfProject: i.type,
    startDate: i.startDate,
    endDate: i.endDate,
    partnerAgency: i.partnerAgency,
  }))

  const livelihoodProjects = [
    ...activities.filter(a => a.program === 'Livelihood' || DEFAULT_SERVICES.includes(a.service)),
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
  const sTotalPages = Math.max(1, Math.ceil(services.length / servicePerPage))
  const sSafePage = Math.min(servicePage, sTotalPages)
  const paginatedServices = services.slice((sSafePage - 1) * servicePerPage, sSafePage * servicePerPage)
  const sRecordStart = services.length === 0 ? 0 : (sSafePage - 1) * servicePerPage + 1
  const sRecordEnd = Math.min(sSafePage * servicePerPage, services.length)

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
      setDilpFormData({
        projectIdNumber:    a.projectIdNumber    ?? '',
        projectName:        a.projectName        ?? a.title,
        typeOfProject:      a.typeOfProject      ?? '',
        programComponent:   a.programComponent   ?? '',
        wayOfImplementation: a.wayOfImplementation ?? '',
        region:             a.region             ?? '',
        province:           a.province           ?? '',
        cityMunicipality:   a.cityMunicipality   ?? a.location ?? '',
        barangay:           a.barangay           ?? '',
        streetPurok:        a.streetPurok        ?? '',
        assistanceAmount:   a.assistanceAmount   ?? '',
        dateReleased:       a.dateReleased       ?? '',
        status:             a.status,
      })
    } else if (a.service === 'DILEEP (TUPAD)') {
      setTupadFormData({
        title:            a.title,
        description:      a.description      ?? '',
        date:             a.date,
        location:         a.location,
        facilitator:      a.facilitator      ?? '',
        participants:     a.participants != null ? String(a.participants) : '',
        status:           (a.status === 'Cancelled' ? 'Planned' : a.status) as TUPADFormData['status'],
        assistanceAmount: a.assistanceAmount  ?? '',
        dateReleased:     a.dateReleased      ?? '',
        beneficiaryType:  a.beneficiaryType   ?? '',
      })
    } else if (a.service === 'CLPEP') {
      setClpepFormData({
        interventionName:     a.title,
        description:          a.description          ?? '',
        interventionCategory: a.typeOfProject         ?? '',
        targetBeneficiaries:  a.participants != null ? String(a.participants) : '',
        startDate:            a.startDate             ?? '',
        endDate:              a.endDate               ?? '',
        implementingOfficer:  a.facilitator           ?? '',
        partnerAgency:        a.partnerAgency         ?? '',
        location:             a.location              ?? '',
        referralRequired:     'No',
        status:               (a.status === 'Ongoing' ? 'Active' : a.status) as CLPEPFormData['status'],
      })
    } else if (a.service === 'SLP') {
      setSlpFormData({
        projectName:      a.projectName      ?? a.title,
        description:      a.description      ?? '',
        slpTrack:         a.slpTrack         ?? '',
        projectCategory:  a.projectCategory  ?? '',
        dateStarted:      a.date             ?? '',
        location:         a.location         ?? '',
        facilitator:      a.facilitator      ?? '',
        status:           a.status as SLPFormData['status'],
        assistanceAmount: a.assistanceAmount  ?? '',
        dateReleased:     a.dateReleased      ?? '',
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

  const handleSave = () => {
    if (!selectedService) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please select a service type.', confirmButtonColor: '#0077BE' }); return }

    let payload: ProgramActivity

    if (selectedService === 'DILEEP (DILP)') {
      if (!dilpFormData.projectIdNumber.trim()) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter a Project ID Number.', confirmButtonColor: '#0077BE' }); return }
      if (!dilpFormData.projectName.trim()) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter a Project Name.', confirmButtonColor: '#0077BE' }); return }

      const loc = [dilpFormData.cityMunicipality, dilpFormData.province].filter(Boolean).join(', ')
      payload = {
        id:                 editingId ?? Date.now(),
        program:            'Livelihood',
        service:            'DILEEP (DILP)',
        title:              dilpFormData.projectName.trim(),
        date:               dilpFormData.dateReleased,
        location:           loc,
        status:             dilpFormData.status,
        projectIdNumber:    dilpFormData.projectIdNumber,
        projectName:        dilpFormData.projectName,
        typeOfProject:      dilpFormData.typeOfProject        || undefined,
        programComponent:   dilpFormData.programComponent     || undefined,
        wayOfImplementation: dilpFormData.wayOfImplementation || undefined,
        region:             dilpFormData.region               || undefined,
        province:           dilpFormData.province             || undefined,
        cityMunicipality:   dilpFormData.cityMunicipality     || undefined,
        barangay:           dilpFormData.barangay             || undefined,
        streetPurok:        dilpFormData.streetPurok          || undefined,
        assistanceAmount:   dilpFormData.assistanceAmount      || undefined,
        dateReleased:       dilpFormData.dateReleased          || undefined,
      }
    } else if (selectedService === 'DILEEP (TUPAD)') {
      if (!tupadFormData.title.trim()) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter an activity title.', confirmButtonColor: '#0077BE' }); return }

      payload = {
        id:               editingId ?? Date.now(),
        program:          'Livelihood',
        service:          'DILEEP (TUPAD)',
        title:            tupadFormData.title.trim(),
        description:      tupadFormData.description.trim() || undefined,
        date:             tupadFormData.date,
        location:         tupadFormData.location,
        facilitator:      tupadFormData.facilitator         || undefined,
        participants:     parseInt(tupadFormData.participants) || undefined,
        status:           tupadFormData.status,
        assistanceAmount: tupadFormData.assistanceAmount    || undefined,
        dateReleased:     tupadFormData.dateReleased        || undefined,
        beneficiaryType:  (tupadFormData.beneficiaryType as 'Individual' | 'Group') || undefined,
        tupadDocuments:   tupadAttachments.map(a => a.name),
      }
    } else if (selectedService === 'CLPEP') {
      if (!clpepFormData.interventionName.trim()) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter an Intervention Name.', confirmButtonColor: '#0077BE' }); return }
      if (!clpepFormData.interventionCategory) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please select an Intervention Category.', confirmButtonColor: '#0077BE' }); return }
      if (!clpepFormData.startDate) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter a Start Date.', confirmButtonColor: '#0077BE' }); return }
      if (!clpepFormData.implementingOfficer.trim()) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter an Implementing Officer.', confirmButtonColor: '#0077BE' }); return }

      // CLPEP interventions are stored in shared localStorage so CLPEPTab stays in sync
      const realId = editingId !== null ? editingId - 900000 : null
      const existing = loadCLPEPInterventions()
      const clpepStatus = clpepFormData.status === 'Archived' ? 'Completed' : clpepFormData.status as 'Planned' | 'Active' | 'Completed'
      const intervention: CLPEPIntervention = {
        id:                   realId ?? Math.max(0, ...existing.map(i => i.id)) + 1,
        title:                clpepFormData.interventionName.trim(),
        type:                 clpepFormData.interventionCategory,
        status:               clpepStatus,
        location:             clpepFormData.location,
        description:          clpepFormData.description,
        targetBeneficiaries:  parseInt(clpepFormData.targetBeneficiaries) || undefined,
        startDate:            clpepFormData.startDate  || undefined,
        endDate:              clpepFormData.endDate    || undefined,
        implementingOfficer:  clpepFormData.implementingOfficer || undefined,
        partnerAgency:        clpepFormData.partnerAgency       || undefined,
      }
      const updatedInterventions = realId !== null
        ? existing.map(i => i.id === realId ? intervention : i)
        : [...existing, intervention]
      localStorage.setItem(CLPEP_INTERVENTIONS_LS_KEY, JSON.stringify(updatedInterventions))
      setClpepInterventions(updatedInterventions)

      Swal.fire({ icon: 'success', title: realId !== null ? 'Intervention Updated' : 'Intervention Added', text: realId !== null ? 'The intervention has been updated.' : 'New CLPEP intervention has been saved.', confirmButtonColor: '#0077BE', timer: 2000, timerProgressBar: true })
      goToList()
      return
    } else if (selectedService === 'SLP') {
      if (!slpFormData.projectName.trim()) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter a Project Name.', confirmButtonColor: '#0077BE' }); return }
      if (!slpFormData.dateStarted) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter the Date Started.', confirmButtonColor: '#0077BE' }); return }
      if (!slpFormData.facilitator.trim()) { Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter a Facilitator / Person In Charge.', confirmButtonColor: '#0077BE' }); return }

      payload = {
        id:               editingId ?? Date.now(),
        program:          'Livelihood',
        service:          'SLP',
        title:            slpFormData.projectName.trim(),
        description:      slpFormData.description.trim()    || undefined,
        date:             slpFormData.dateStarted,
        location:         slpFormData.location,
        facilitator:      slpFormData.facilitator            || undefined,
        status:           slpFormData.status,
        assistanceAmount: slpFormData.assistanceAmount       || undefined,
        dateReleased:     slpFormData.dateReleased           || undefined,
        projectName:      slpFormData.projectName,
        slpTrack:         slpFormData.slpTrack               || undefined,
        projectCategory:  slpFormData.projectCategory        || undefined,
      }
    } else {
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

  const handleSaveDraft = () => {
    if (!clpepFormData.interventionName.trim()) {
      Swal.fire({ icon: 'warning', title: 'Required', text: 'Please enter an Intervention Name.', confirmButtonColor: '#0077BE' })
      return
    }
    const existing = loadCLPEPInterventions()
    const newId = Math.max(0, ...existing.map(i => i.id)) + 1
    const draft: CLPEPIntervention = {
      id:                  newId,
      title:               clpepFormData.interventionName.trim(),
      type:                clpepFormData.interventionCategory || 'Draft',
      status:              'Planned',
      location:            clpepFormData.location,
      description:         clpepFormData.description,
      targetBeneficiaries: parseInt(clpepFormData.targetBeneficiaries) || undefined,
      startDate:           clpepFormData.startDate           || undefined,
      endDate:             clpepFormData.endDate             || undefined,
      implementingOfficer: clpepFormData.implementingOfficer || undefined,
      partnerAgency:       clpepFormData.partnerAgency       || undefined,
    }
    const updated = [...existing, draft]
    localStorage.setItem(CLPEP_INTERVENTIONS_LS_KEY, JSON.stringify(updated))
    setClpepInterventions(updated)
    Swal.fire({ icon: 'success', title: 'Draft Saved', text: 'CLPEP intervention saved as draft.', confirmButtonColor: '#0077BE', timer: 2000, timerProgressBar: true })
    goToList()
  }

  const handleDelete = () => {
    if (deleteConfirm === null) return
    if (deleteConfirm >= 900000) {
      const realId = deleteConfirm - 900000
      const updated = clpepInterventions.filter(i => i.id !== realId)
      localStorage.setItem(CLPEP_INTERVENTIONS_LS_KEY, JSON.stringify(updated))
      setClpepInterventions(updated)
    } else {
      setActivities(prev => prev.filter(a => a.id !== deleteConfirm))
    }
    setDeleteConfirm(null)
  }

  const handleStatusChange = () => {
    if (!statusConfirm) return
    const { project, nextStatus } = statusConfirm
    if (project.id >= 900000) {
      const realId = project.id - 900000
      const clpepStatus = nextStatus === 'Ongoing' ? 'Active' : nextStatus as 'Planned' | 'Active' | 'Completed'
      const updated = clpepInterventions.map(i => i.id === realId ? { ...i, status: clpepStatus } : i)
      localStorage.setItem(CLPEP_INTERVENTIONS_LS_KEY, JSON.stringify(updated))
      setClpepInterventions(updated)
    } else {
      setActivities(prev =>
        prev.map(a => a.id === project.id ? { ...a, status: nextStatus } : a)
      )
      if (nextStatus === 'Completed') {
        // Auto-Inactive DILP beneficiaries
        const dilpBeneficiaries = loadBeneficiaries()
        const updatedDilp = dilpBeneficiaries.map(b =>
          b.assignedDilpProjectId === project.id ? { ...b, status: 'Inactive' as const } : b
        )
        saveBeneficiaries(updatedDilp)
        // Auto-Inactive SLP beneficiaries (stored separately)
        if (project.service === 'SLP') {
          try {
            const raw = localStorage.getItem(SLP_BENEFICIARIES_LS_KEY)
            if (raw) {
              const slpBeneficiaries: LivelihoodBeneficiary[] = JSON.parse(raw)
              const updatedSlp = slpBeneficiaries.map(b =>
                b.assignedSlpProjectId === project.id && b.status === 'Active'
                  ? { ...b, status: 'Inactive' as const }
                  : b
              )
              localStorage.setItem(SLP_BENEFICIARIES_LS_KEY, JSON.stringify(updatedSlp))
            }
          } catch { /* storage unavailable */ }
        }
      }
    }
    Swal.fire({ icon: 'success', title: 'Status Updated', text: `Project is now ${nextStatus}.`, confirmButtonColor: '#0077BE', timer: 2000, timerProgressBar: true })
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
      { key: 'add_project',   icon: <PlusCircle    size={32} />, label: 'Add Project',    desc: 'Create a new Livelihood project' },
      { key: 'add_service',   icon: <Tag           size={32} />, label: 'Add Service',    desc: 'Add a new service type' },
      { key: 'view_projects', icon: <FolderOpen    size={32} />, label: 'View Projects',  desc: 'Browse all Livelihood projects' },
      { key: 'view_services', icon: <ClipboardList size={32} />, label: 'View Services',  desc: 'Manage service types' },
    ]

    return (
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <p className="text-gray-500 mb-5">
          Select an action for <span className="text-brand-blue font-medium">Livelihood</span>
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
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

  const dilpBeneficiaryCountMap = (() => {
    const map: Record<number, number> = {}
    loadBeneficiaries().forEach(b => {
      if (b.assignedDilpProjectId != null)
        map[b.assignedDilpProjectId] = (map[b.assignedDilpProjectId] ?? 0) + 1
    })
    return map
  })()

  const slpBeneficiaryCountMap = (() => {
    const map: Record<number, number> = {}
    loadSlpBeneficiaries().forEach(b => {
      if (b.assignedSlpProjectId != null)
        map[b.assignedSlpProjectId] = (map[b.assignedSlpProjectId] ?? 0) + 1
    })
    return map
  })()

  const clpepBeneficiaryCountMap = (() => {
    const map: Record<number, number> = {}
    loadClpepBeneficiaries().forEach(b => {
      if (b.assignedInterventionId != null)
        map[b.assignedInterventionId] = (map[b.assignedInterventionId] ?? 0) + 1
    })
    return map
  })()

  const getParticipantCount = (a: ProgramActivity): number | undefined => {
    if (a.service === 'DILEEP (DILP)' || a.service === 'DILEEP (TUPAD)')
      return dilpBeneficiaryCountMap[a.id]
    if (a.service === 'SLP')
      return slpBeneficiaryCountMap[a.id]
    if (a.id >= 900000)
      return clpepBeneficiaryCountMap[a.id - 900000]
    return undefined
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
          const isCLPEP = a.id >= 900000
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
                    onClick={() => { setStatusConfirm({ project: a, nextStatus: 'Ongoing', label: isCLPEP ? 'Mark as Active' : 'Mark as Ongoing' }); setOpenMenuId(null) }}
                    disabled={!canManage('maintenance')}
                    className="w-full px-4 py-2.5 text-left text-sm text-brand-blue hover:bg-blue-50 flex items-center gap-2.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                  >
                    <PlayCircle size={14} className="text-blue-500" />
                    {isCLPEP ? 'Mark as Active' : 'Mark as Ongoing'}
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
                  <th className="px-6 py-4 text-center text-sm text-gray-700 font-semibold">Participants</th>
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
                      {getParticipantCount(a) ?? '—'}
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
    const isCLPEP = selectedProject.id >= 900000
    let participants: LivelihoodBeneficiary[]
    if (isCLPEP) {
      const realId = selectedProject.id - 900000
      participants = loadClpepBeneficiaries().filter(b => b.assignedInterventionId === realId)
    } else if (selectedProject.service === 'SLP') {
      participants = loadSlpBeneficiaries().filter(b => b.assignedSlpProjectId === selectedProject.id)
    } else {
      // DILEEP (DILP) or DILEEP (TUPAD)
      participants = loadBeneficiaries().filter(b => b.assignedDilpProjectId === selectedProject.id)
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

  // ── Render: add service ───────────────────────────────────────────────────

  const renderAddService = () => (
    <div className="bg-white rounded-xl shadow-md overflow-hidden">
      <div className="bg-brand-blue px-6 py-4">
        <h3 className="text-white m-0">Add New Service</h3>
        <p className="text-white/70 text-sm">Livelihood Program</p>
      </div>
      <div className="p-6">
        <p className="text-gray-600 text-sm mb-6">
          Add a new service type to the Livelihood program. This service will be available when creating new projects.
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
              placeholder="e.g. Community Livelihood, Skills Development..."
              className={inputCls + ' flex-1'}
            />
            <button
              onClick={handleAddService}
              disabled={!canManage('maintenance')}
              className="flex items-center gap-2 px-5 py-2.5 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors text-sm whitespace-nowrap disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-blue"
            >
              <Plus size={16} /> Add Service
            </button>
          </div>
          <p className="text-gray-400 text-xs mt-1.5">Press Enter or click "Add Service" to save.</p>
        </div>

        {services.length > 0 && (
          <div className="mt-8">
            <h4 className="text-gray-700 text-sm font-semibold mb-3">Current Services in Livelihood</h4>
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
          <h3 className="text-white m-0">Livelihood Services</h3>
        </div>
        <button
          onClick={() => setAction('add_service')}
          disabled={!canManage('maintenance')}
          className="flex items-center gap-2 px-4 py-2 bg-white text-brand-blue rounded-lg hover:bg-blue-50 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white"
        >
          <Plus size={15} /> Add Service
        </button>
      </div>

      {services.length === 0 ? (
        <div className="py-16 text-center">
          <Tag size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">No services defined yet.</p>
          <button onClick={() => setAction('add_service')} disabled={!canManage('maintenance')} className="mt-4 px-5 py-2 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed">
            Add First Service
          </button>
        </div>
      ) : (
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Service Name</th>
              <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold">Projects Count</th>
              <th className="px-6 py-4 text-left text-sm text-gray-700 font-semibold w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedServices.map(svc => {
              const count = livelihoodProjects.filter(a => a.service === svc).length
              return (
                <tr key={svc} className="border-b border-gray-100 hover:bg-gray-50">
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
                      disabled={!canManage('maintenance')}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
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
      {services.length > 0 && (
        <div className="px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Rows per page:</span>
            <select value={servicePerPage} onChange={e => { setServicePerPage(Number(e.target.value)); setServicePage(1) }} className="border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue">
              {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">{sRecordStart}–{sRecordEnd} of {services.length} records</span>
            <div className="flex gap-1">
              <button onClick={() => setServicePage(p => Math.max(1, p - 1))} disabled={sSafePage === 1} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronLeft size={16} /></button>
              <button onClick={() => setServicePage(p => Math.min(sTotalPages, p + 1))} disabled={sSafePage === sTotalPages} className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"><ChevronRight size={16} /></button>
            </div>
          </div>
        </div>
      )}
    </div>
  )

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
      {action === 'add_service'      && renderAddService()}
      {action === 'view_services'    && renderViewServices()}

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

      {/* Delete service modal */}
      <ConfirmModal
        open={serviceDeleteConfirm !== null}
        title="Remove Service"
        message={`Remove "${serviceDeleteConfirm}" from Livelihood?\nExisting projects with this service will not be affected.`}
        confirmLabel="Remove"
        destructive
        onConfirm={handleDeleteService}
        onCancel={() => setServiceDeleteConfirm(null)}
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
