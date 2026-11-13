// Pending inbox: what applicants submitted at the kiosk (/apply/), waiting for staff review.
// Staff open a submission (it opens in that program's normal Add form, pre-filled), finish the
// office-only sections and save = approve; or reject it with a reason. Nothing here is a real
// record until it is approved. One inbox for every kiosk program (Employment Facilitation, CDSP,
// GIP, SPES, Skills Training, DILP, TUPAD, SLP, CLPEP, OFW); staff only see the programs they have permission for.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, ChevronDown, Loader2, Search } from 'lucide-react'
import AddApplicantSidebar, { type ApplicantFormData } from '../employment/applicants/AddApplicantSidebar'
import ViewApplicantSidebar from '../employment/applicants/ViewApplicantSidebar'
import { createDefaultApplicantFormData } from '../employment/applicants/applicantDefaults'
import CDSPProfileForm, { ViewApplicantPanel as CdspViewPanel } from '../cdsp/CDSPProfileForm'
import { emptyForm as cdspEmptyForm } from '../cdsp/cdspDefaults'
import GIPProfileForm, { ViewApplicantPanel as GipViewPanel, emptyForm as gipEmptyForm } from '../gip/GIPProfileForm'
import SPESProfileForm, { ViewApplicantPanel as SpesViewPanel, emptyForm as spesEmptyForm } from '../spes/SPESProfileForm'
import SkillsTrainingProfileForm, { ViewProfilePanel as SkillsViewPanel } from '../skills-training/SkillsTrainingProfileForm'
import { emptyForm as skillsEmptyForm } from '../skills-training/skillsTrainingDefaults'
import DILPProfileForm, { EMPTY_DILP_RECORD } from '../livelihood/DILPProfileForm'
import TUPADProfileForm, { EMPTY_TUPAD_RECORD } from '../livelihood/TUPADProfileForm'
import SLPProfileForm, { EMPTY_SLP_RECORD } from '../livelihood/SLPProfileForm'
import CLPEPProfileForm, { EMPTY_CLPEP_RECORD } from '../livelihood/CLPEPProfileForm'
import AddOFWRequestForm from '../ofw/AddOFWRequestForm'
import OFWProfileModal from '../ofw/OFWProfileModal'
import { emptyOFWForm } from '../ofw/ofwDefaults'
import { toOfwApiPayload } from '../ofw/ofwPayload'
import TablePagination, { EF_ITEMS_PER_PAGE } from '../employment/shared/TablePagination'
import ConfirmModal from '../shared/ConfirmModal'
import KioskPanel from './KioskPanel'
import { useEmployment, type Applicant } from '../../contexts/EmploymentContext'
import { useCDSP, type CDSPApplicant } from '../../contexts/CDSPContext'
import { useGIP, type GIPApplicant } from '../../contexts/GIPContext'
import { useSPES, type SPESApplicant } from '../../contexts/SPESContext'
import { useSkillsTraining, type SkillsTrainingProfile } from '../../contexts/SkillsTrainingContext'
import { useDILP, type DILPApplicant } from '../../contexts/DILPContext'
import { useTUPAD, type TUPADApplicant } from '../../contexts/TUPADContext'
import { useSLP } from '../../contexts/SLPContext'
import { useCLPEP } from '../../contexts/CLPEPContext'
import { useOFW, type OFWProfile } from '../../contexts/OFWContext'
import type { LivelihoodBeneficiary } from '../../contexts/LivelihoodContext'
import { createApplicant, getApplicant } from '../../services/applicantService'
import * as cdspService from '../../services/cdspService'
import * as gipService from '../../services/gipService'
import * as spesService from '../../services/spesService'
import * as skillsTrainingService from '../../services/skillsTrainingService'
import * as dilpService from '../../services/dilpService'
import * as tupadService from '../../services/tupadService'
import * as slpService from '../../services/slpService'
import * as clpepService from '../../services/clpepService'
import * as ofwService from '../../services/ofwService'
import {
  deleteSubmission, getKioskSettings, getSubmission, listSubmissions, rejectSubmission, setKioskEnabled, setKioskPrograms,
  type KioskProgramSetting, type Submission, type SubmissionDetail, type SubmissionStatus,
} from '../../services/submissionService'
import { isAdministrator } from '../../utils/permissions'

const PROGRAM_OPTIONS = [
  { id: 'ef', label: 'Employment Facilitation' },
  { id: 'cdsp', label: 'CDSP' },
  { id: 'gip', label: 'GIP' },
  { id: 'spes', label: 'SPES' },
  { id: 'skills', label: 'Skills Training' },
  { id: 'dilp', label: 'DILP' },
  { id: 'tupad', label: 'TUPAD' },
  { id: 'slp', label: 'SLP' },
  { id: 'clpep', label: 'CLPEP' },
  { id: 'ofw', label: 'OFW' },
]
// The list reloads itself the moment the app's 5-second check (see usePendingCount) sees a change; this slower
// reload is only a safety net.
const REFRESH_MS = 60_000
const NEW_TAG_MS = 60_000
const MAX_REASON = 500

type StatusFilter = SubmissionStatus | 'all'

const errText = (e: unknown, fallback: string) => (e instanceof Error && e.message ? e.message : fallback)

// "2026-11-10 16:50:01.66" -> "2026-11-10 16:50" (same yyyy-mm-dd style as the other tables).
const fmtWhen = (v: string | null) => (v ? v.slice(0, 16) : '—')

// A read-only "Applicant" built from an Employment Facilitation submission, so the normal View Applicant screen can show it.
function toViewApplicant(d: SubmissionDetail): Applicant {
  const f = d.payload as Partial<ApplicantFormData>
  return {
    id: -1, name: d.applicantName, gender: f.sex ?? '', age: 0, education: '', skills: '', employmentStatus: f.employmentStatus ?? '',
    contactNumber: f.contactNumber ?? '', email: f.email ?? '', address: '',
    // The kiosk never sends Date Applied, so show the day it was submitted.
    fullFormData: { ...f, dateApplicationReceived: d.submittedAt.slice(0, 10) } as unknown as Record<string, unknown>,
  }
}

// The submission as a staff form's starting data: that program's empty form, then what the applicant
// typed. Date Applied is the day the applicant actually submitted, not the day staff got to it.
function toFormData(d: SubmissionDetail): ApplicantFormData {
  return { ...createDefaultApplicantFormData(), ...(d.payload as Partial<ApplicantFormData>), dateApplicationReceived: d.submittedAt.slice(0, 10), receivedBy: '', savedDocuments: [] }
}
// Each program names its "date the application came in" differently: livelihood = dateApplied, OFW = dateFiled.
function toProgramFormData<T extends object>(empty: T, d: SubmissionDetail): T {
  const day = d.submittedAt.slice(0, 10)
  const dateField = ['dilp', 'tupad', 'slp', 'clpep'].includes(d.program) ? { dateApplied: day }
    : d.program === 'ofw' ? { dateFiled: day }
    : { dateApplicationReceived: day }
  // Reference No. (OFW) is deliberately left blank: staff assign it.
  return { ...empty, ...d.payload, ...dateField, receivedBy: '' }
}

// A saved SLP / CLPEP record in the shape their forms start from.
function toLivelihoodFormRecord(a: { lastName: string; firstName: string }, service: string, rest: object): Omit<LivelihoodBeneficiary, 'id'> {
  return { ...rest, name: `${a.lastName}, ${a.firstName}`, service } as unknown as Omit<LivelihoodBeneficiary, 'id'>
}

// A kiosk submission shaped like a saved record, for the read-only View (the empty form supplies every
// field a View screen reads; id -1 = not saved). An Approved one shows the real saved record instead.
type ProgramRecord =
  | { program: 'cdsp'; value: CDSPApplicant }
  | { program: 'gip'; value: GIPApplicant }
  | { program: 'spes'; value: SPESApplicant }
  | { program: 'skills'; value: SkillsTrainingProfile }
  | { program: 'dilp'; value: DILPApplicant }
  | { program: 'tupad'; value: TUPADApplicant }
  | { program: 'slp'; value: Omit<LivelihoodBeneficiary, 'id'> }
  | { program: 'clpep'; value: Omit<LivelihoodBeneficiary, 'id'> }
  | { program: 'ofw'; value: OFWProfile }
  | { program: 'ef'; value: Applicant }

function toProgramRecord(d: SubmissionDetail, saved: unknown): ProgramRecord {
  switch (d.program) {
    case 'cdsp': return { program: 'cdsp', value: (saved ?? { ...toProgramFormData(cdspEmptyForm, d), id: -1 }) as CDSPApplicant }
    case 'gip': return { program: 'gip', value: (saved ?? { ...toProgramFormData(gipEmptyForm, d), id: -1 }) as GIPApplicant }
    case 'spes': return { program: 'spes', value: (saved ?? { ...toProgramFormData(spesEmptyForm, d), id: -1 }) as SPESApplicant }
    case 'skills': return { program: 'skills', value: (saved ?? { ...toProgramFormData(skillsEmptyForm, d), id: -1 }) as SkillsTrainingProfile }
    case 'dilp': return { program: 'dilp', value: (saved ?? { ...toProgramFormData(EMPTY_DILP_RECORD, d), id: -1 }) as DILPApplicant }
    case 'tupad': return { program: 'tupad', value: (saved ?? { ...toProgramFormData(EMPTY_TUPAD_RECORD, d), id: -1 }) as TUPADApplicant }
    case 'slp': return { program: 'slp', value: saved ? toLivelihoodFormRecord(saved as { lastName: string; firstName: string }, 'SLP', saved as object) : toProgramFormData(EMPTY_SLP_RECORD, d) }
    case 'clpep': return { program: 'clpep', value: saved ? toLivelihoodFormRecord(saved as { lastName: string; firstName: string }, 'CLPEP', saved as object) : toProgramFormData(EMPTY_CLPEP_RECORD, d) }
    case 'ofw': {
      const o = (saved ?? { ...toProgramFormData(emptyOFWForm, d), id: -1 }) as OFWProfile
      return { program: 'ofw', value: { ...o, name: o.name || `${o.lastName}, ${o.firstName}` } }
    }
    default: return { program: 'ef', value: (saved ?? toViewApplicant(d)) as Applicant }
  }
}

// Loads the real saved record of an Approved submission (null if it has since been deleted).
function fetchSavedRecord(program: string, id: number): Promise<unknown> {
  const load: Promise<unknown> = program === 'cdsp' ? cdspService.getProfile(id)
    : program === 'gip' ? gipService.getProfile(id)
    : program === 'spes' ? spesService.getProfile(id)
    : program === 'skills' ? skillsTrainingService.getProfile(id)
    : program === 'dilp' ? dilpService.getProfile(id)
    : program === 'tupad' ? tupadService.getProfile(id)
    : program === 'slp' ? slpService.getProfile(id)
    : program === 'clpep' ? clpepService.getProfile(id)
    : program === 'ofw' ? ofwService.getProfile(id)
    : getApplicant(id)
  return load.catch(() => null)
}

// An Approved entry whose saved record was deleted (in the Recycle Bin or gone for good): only history is left.
const recordGone = (row: Submission) => row.status === 'Approved' && (row.recordState === 'recycle' || row.recordState === 'deleted')

function StatusBadge({ row }: { row: Submission }) {
  if (row.status === 'Approved') return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-700">Approved</span>
  // The reason is kept out of the table row (it keeps rows one clean height); hover for it, or press View.
  if (row.status === 'Rejected') return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-600 cursor-help" title={row.rejectReason ? `Reason: ${row.rejectReason}` : undefined}>Rejected</span>
  return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700">Pending</span>
}

export default function PendingView({ onBack, onChanged, refreshSignal }: { onBack: () => void; onChanged: () => void; refreshSignal: string }) {
  const { refreshApplicants } = useEmployment()
  const { refreshProfiles: refreshCdsp, services: cdspServices } = useCDSP()
  const { refreshProfiles: refreshGip } = useGIP()
  const { refreshProfiles: refreshSpes } = useSPES()
  const { refreshProfiles: refreshSkills, qualifications, purposes } = useSkillsTraining()
  const { refreshProfiles: refreshDilp } = useDILP()
  const { refreshProfiles: refreshTupad } = useTUPAD()
  const { refreshProfiles: refreshSlp } = useSLP()
  const { refreshProfiles: refreshClpep } = useCLPEP()
  const { refreshProfiles: refreshOfw } = useOFW()
  const admin = isAdministrator()

  const [rows, setRows] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [programFilter, setProgramFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(EF_ITEMS_PER_PAGE)

  const [opening, setOpening] = useState<number | null>(null)
  const [review, setReview] = useState<SubmissionDetail | null>(null)
  const [viewing, setViewing] = useState<SubmissionDetail | null>(null)
  // What the View screen shows: for an Approved submission the real saved record (with the Received By /
  // Date Applied staff entered), otherwise the answers the applicant gave at the kiosk.
  const [viewRecord, setViewRecord] = useState<ProgramRecord | null>(null)
  const [viewIsSaved, setViewIsSaved] = useState(false)
  const [rejectTarget, setRejectTarget] = useState<Submission | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Submission | null>(null)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null)

  const [kioskOn, setKioskOn] = useState<boolean | null>(null)
  const [kioskPrograms, setKioskProgramList] = useState<KioskProgramSetting[]>([])
  const [togglingProgram, setTogglingProgram] = useState('')
  // Submissions that arrived while this page was open: tagged "New" for a minute, and counted in a short banner.
  const [newIds, setNewIds] = useState<Set<number>>(new Set())
  const [newCount, setNewCount] = useState(0)
  // A short result line under the services after a change (clears itself).
  const [serviceMsg, setServiceMsg] = useState('')
  const [confirmKioskOff, setConfirmKioskOff] = useState(false)
  const [togglingKiosk, setTogglingKiosk] = useState(false)
  const [copied, setCopied] = useState(false)
  const kioskUrl = `${window.location.origin}/apply/`

  // Loads the list for the current filters. The spinner is only shown by the filter handlers
  // (they set `loading` first), so the background refresh below never flickers the table.
  // Only the newest request may update the screen: a slow earlier answer (e.g. the unfiltered list that was
  // asked for before the Program filter changed) must not overwrite the filtered one.
  const loadSeq = useRef(0)
  // Which submissions this list has already shown (per filter), to spot ones that arrive while it is open.
  const seen = useRef<{ key: string; ids: Set<number> } | null>(null)
  const tagTimers = useRef<number[]>([])
  const noteNew = useCallback((fresh: number[]) => {
    setNewIds(prev => new Set([...prev, ...fresh]))
    setNewCount(n => n + fresh.length)
    const t = window.setTimeout(() => setNewIds(prev => { const next = new Set(prev); fresh.forEach(i => next.delete(i)); return next }), NEW_TAG_MS)
    tagTimers.current.push(t)
  }, [])
  const load = useCallback(() => {
    const mine = ++loadSeq.current
    return listSubmissions(statusFilter, programFilter)
      .then(r => {
        if (mine !== loadSeq.current) return
        setRows(r); setLoadError('')
        const key = `${statusFilter}|${programFilter}`
        if (seen.current === null || seen.current.key !== key) {
          seen.current = { key, ids: new Set(r.map(x => x.id)) } // first load of this view: nothing is "new" yet
        } else {
          const known = seen.current.ids
          const fresh = r.filter(x => x.status === 'Pending' && !known.has(x.id)).map(x => x.id)
          r.forEach(x => known.add(x.id))
          if (fresh.length > 0) noteNew(fresh)
        }
      })
      .catch(e => { if (mine === loadSeq.current) setLoadError(errText(e, 'Could not load the pending applications.')) })
      .finally(() => { if (mine === loadSeq.current) setLoading(false) })
  }, [statusFilter, programFilter, noteNew])

  useEffect(() => { void load() }, [load])

  // New kiosk submissions appear on their own while this page is open (not while a form is open).
  const busy = review !== null || viewing !== null
  useEffect(() => {
    if (busy) return
    const id = window.setInterval(() => { void load() }, REFRESH_MS)
    return () => window.clearInterval(id)
  }, [busy, load])

  // The app checks for changes every 5 seconds; when the signature moves, reload the list at once (not while a form is open:
  // closing it reloads anyway).
  const lastSignal = useRef(refreshSignal)
  useEffect(() => {
    if (lastSignal.current === refreshSignal) return
    lastSignal.current = refreshSignal
    if (!busy) void load()
  }, [refreshSignal, busy, load])

  useEffect(() => {
    const timers = tagTimers.current
    return () => { timers.forEach(t => window.clearTimeout(t)) }
  }, [])

  useEffect(() => {
    getKioskSettings()
      .then(s => { setKioskOn(s.enabled); setKioskProgramList(s.programs) })
      .catch(() => setKioskOn(null))
  }, [])

  useEffect(() => {
    if (!serviceMsg) return
    const id = window.setTimeout(() => setServiceMsg(''), 4000)
    return () => window.clearTimeout(id)
  }, [serviceMsg])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(r => r.applicantName.toLowerCase().includes(q) || r.referenceNo.toLowerCase().includes(q))
  }, [rows, search])
  const paged = useMemo(() => filtered.slice((page - 1) * perPage, page * perPage), [filtered, page, perPage])

  // Opens a submission: pending + editable ones in the pre-filled Add form, everything else read-only.
  async function openRow(row: Submission) {
    setOpening(row.id)
    try {
      const d = await getSubmission(row.id)
      if (d.status === 'Pending' && d.canEdit) {
        setReview(d)
      } else {
        // Approved: load the real record. If it has since been deleted, fall back to the kiosk answers.
        const saved = d.status === 'Approved' && d.beneficiaryId !== null
          ? await fetchSavedRecord(d.program, d.beneficiaryId)
          : null
        setViewRecord(toProgramRecord(d, saved))
        setViewIsSaved(saved !== null)
        setViewing(d)
      }
    } catch (e) {
      setNotice({ type: 'error', title: 'Could not open', message: errText(e, 'Could not open this submission.') })
    } finally {
      setOpening(null)
    }
  }

  // Save from the review form = approve. The backend marks the submission Approved in the same transaction.
  async function handleApprove(data: ApplicantFormData) {
    if (!review) return
    await createApplicant(data, review.id)
    await refreshApplicants()
    onChanged()
  }

  // The other programs' forms don't show save errors themselves: this page does. On success the review closes.
  async function approveProgram(data: object) {
    if (!review) return
    const target = review
    try {
      const record = data as Record<string, unknown>
      if (target.program === 'cdsp') { await cdspService.createProfile(record, target.id); await refreshCdsp() }
      else if (target.program === 'gip') { await gipService.createProfile(record, target.id); await refreshGip() }
      else if (target.program === 'spes') { await spesService.createProfile(record, target.id); await refreshSpes() }
      else if (target.program === 'skills') { await skillsTrainingService.createProfile(record, target.id); await refreshSkills() }
      else if (target.program === 'dilp') { await dilpService.createProfile(record, target.id); await refreshDilp() }
      else if (target.program === 'tupad') { await tupadService.createProfile(record, target.id); await refreshTupad() }
      else if (target.program === 'slp') { await slpService.createProfile(record, target.id); await refreshSlp() }
      else if (target.program === 'clpep') { await clpepService.createProfile(record, target.id); await refreshClpep() }
      else if (target.program === 'ofw') { await ofwService.createProfile(toOfwApiPayload(data as Omit<OFWProfile, 'id'>), target.id); await refreshOfw() }
      onChanged()
      setReview(null)
      setNotice({ type: 'success', title: 'Approved', message: `${target.applicantName} was added to ${target.programLabel}.` })
      await load()
    } catch (e) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? errText(e, 'Could not save this application.')
      setNotice({ type: 'error', title: 'Could not approve', message: msg })
    }
  }

  function closeReview() {
    setReview(null)
    void load()
    onChanged()
  }

  async function confirmReject(reason: string) {
    if (!rejectTarget) return
    try {
      await rejectSubmission(rejectTarget.id, reason)
      setNotice({ type: 'success', title: 'Rejected', message: `Submission ${rejectTarget.referenceNo} was rejected.` })
    } catch (e) {
      setNotice({ type: 'error', title: 'Could not reject', message: errText(e, 'Could not reject this submission.') })
    }
    setRejectTarget(null)
    await load()
    onChanged()
  }

  // Permanently removes a rejected submission, or an approved one whose record was deleted (the backend refuses anything else).
  async function confirmDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    try {
      await deleteSubmission(target.id)
      setNotice({ type: 'success', title: 'Deleted', message: `Submission ${target.referenceNo} was permanently deleted.` })
    } catch (e) {
      setNotice({ type: 'error', title: 'Could not delete', message: errText(e, 'Could not delete this submission.') })
    }
    setDeleteTarget(null)
    await load()
  }

  // Turns one service on/off at the kiosk (administrators). Sends the full list of services that should be on.
  async function toggleProgram(id: string) {
    setTogglingProgram(id)
    try {
      const on = kioskPrograms.filter(p => (p.id === id ? !p.enabled : p.enabled)).map(p => p.id)
      const saved = await setKioskPrograms(on)
      setKioskProgramList(saved)
      const changed = saved.find(x => x.id === id)
      if (changed) setServiceMsg(`${changed.label} is now ${changed.enabled ? 'open' : 'closed'} at the kiosk.`)
    } catch (e) {
      setNotice({ type: 'error', title: 'Could not change', message: errText(e, 'Could not change the kiosk services.') })
    } finally {
      setTogglingProgram('')
    }
  }

  async function toggleKiosk(next: boolean) {
    setTogglingKiosk(true)
    try {
      setKioskOn(await setKioskEnabled(next))
    } catch (e) {
      setNotice({ type: 'error', title: 'Could not change', message: errText(e, 'Could not change the kiosk setting.') })
    } finally {
      setTogglingKiosk(false)
      setConfirmKioskOff(false)
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(kioskUrl)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard blocked: the link is still shown on screen */ }
  }

  // ── Review / view screens (replace the list, like the Applicants tab does) ──
  if (review) {
    return (
      <div className="p-6 max-sm:p-3">
        <div className="mb-4 p-4 rounded-lg bg-blue-50 border border-blue-100 text-sm text-gray-700">
          <span className="font-semibold">Reviewing kiosk submission {review.referenceNo}</span>
          {' '}— submitted {fmtWhen(review.submittedAt)}. Check the answers (you can correct them), fill in the office-only sections
          if needed, then save to approve.
        </div>
        {review.program === 'cdsp' ? (
          <CDSPProfileForm noDraft mode="add" initialData={toProgramFormData(cdspEmptyForm, review)} serviceNames={cdspServices.length > 0 ? cdspServices.map(s => s.name) : undefined} onSave={approveProgram} onClose={closeReview} />
        ) : review.program === 'gip' ? (
          <GIPProfileForm noDraft mode="add" initial={toProgramFormData(gipEmptyForm, review)} onSave={approveProgram} onClose={closeReview} />
        ) : review.program === 'spes' ? (
          <SPESProfileForm noDraft mode="add" initial={toProgramFormData(spesEmptyForm, review)} onSave={approveProgram} onClose={closeReview} />
        ) : review.program === 'skills' ? (
          <SkillsTrainingProfileForm noDraft mode="add" initialData={toProgramFormData(skillsEmptyForm, review)} qualifications={qualifications} purposes={purposes} onSave={approveProgram} onClose={closeReview} />
        ) : review.program === 'dilp' ? (
          <DILPProfileForm noDraft mode="add" initial={toProgramFormData(EMPTY_DILP_RECORD, review)} onSave={approveProgram} onClose={closeReview} />
        ) : review.program === 'tupad' ? (
          <TUPADProfileForm noDraft mode="add" initial={toProgramFormData(EMPTY_TUPAD_RECORD, review)} onSave={approveProgram} onClose={closeReview} />
        ) : review.program === 'slp' ? (
          <SLPProfileForm noDraft mode="add" initial={toProgramFormData(EMPTY_SLP_RECORD, review)} onSave={approveProgram} onClose={closeReview} />
        ) : review.program === 'clpep' ? (
          <CLPEPProfileForm noDraft mode="add" initial={toProgramFormData(EMPTY_CLPEP_RECORD, review)} onSave={approveProgram} onClose={closeReview} />
        ) : review.program === 'ofw' ? (
          <AddOFWRequestForm noDraft initial={toProgramFormData(emptyOFWForm, review)} onSave={approveProgram} onClose={closeReview} />
        ) : (
          <AddApplicantSidebar noDraft initialData={toFormData(review)} onSave={handleApprove} onClose={closeReview} />
        )}
      </div>
    )
  }
  if (viewing && viewRecord) {
    const closeView = () => { setViewing(null); setViewRecord(null); setViewIsSaved(false) }
    return (
      <div className="p-6 max-sm:p-3">
        <div className="mb-4 p-4 rounded-lg bg-gray-50 border border-gray-200 text-sm text-gray-700">
          <span className="font-semibold">Kiosk submission {viewing.referenceNo}</span> — {viewing.status}
          {viewing.reviewedAt ? ` on ${fmtWhen(viewing.reviewedAt)}${viewing.reviewedBy ? ` by ${viewing.reviewedBy}` : ''}` : ''}
          {viewing.rejectReason ? `. Reason: ${viewing.rejectReason}` : ''}
          {viewing.status === 'Pending' && !viewing.canEdit ? '. You can view it, but only an editor can approve or reject it.' : ''}
          {viewing.status === 'Approved' && !viewIsSaved ? '. The saved record is no longer available, so this shows the answers the applicant gave at the kiosk.' : ''}
        </div>
        {viewRecord.program === 'cdsp' ? <CdspViewPanel applicant={viewRecord.value} onClose={closeView} hideStatus />
          : viewRecord.program === 'gip' ? <GipViewPanel applicant={viewRecord.value} onClose={closeView} hideStatus />
          : viewRecord.program === 'spes' ? <SpesViewPanel applicant={viewRecord.value} onClose={closeView} hideStatus />
          : viewRecord.program === 'skills' ? <SkillsViewPanel profile={viewRecord.value} onClose={closeView} hideStatus />
          : viewRecord.program === 'dilp' ? <DILPProfileForm mode="view" initial={viewRecord.value} onSave={() => {}} onClose={closeView} />
          : viewRecord.program === 'tupad' ? <TUPADProfileForm mode="view" initial={viewRecord.value} onSave={() => {}} onClose={closeView} />
          : viewRecord.program === 'slp' ? <SLPProfileForm mode="view" initial={viewRecord.value} onSave={() => {}} onClose={closeView} />
          : viewRecord.program === 'clpep' ? <CLPEPProfileForm mode="view" initial={viewRecord.value} onSave={() => {}} onClose={closeView} />
          : viewRecord.program === 'ofw' ? <OFWProfileModal mode="view" profile={viewRecord.value} onSave={() => {}} onClose={closeView} hideStatus />
          : <ViewApplicantSidebar applicant={viewRecord.value} onClose={closeView} />}
      </div>
    )
  }

  // ── The inbox ──
  return (
    <div className="p-6 max-sm:p-3">
      <div className="flex items-center gap-4 mb-6">
        <button type="button" onClick={onBack} aria-label="Back" className="p-2 rounded-lg hover:bg-gray-200 transition-colors">
          <ArrowLeft size={22} className="text-gray-700" />
        </button>
        <div>
          <h1 className="text-2xl! font-bold! leading-tight! tracking-normal! text-gray-800! m-0!">Applications</h1>
          <p className="text-sm text-gray-500 m-0">Applicants who filled in their own information at the kiosk, for any program. Review each one before it becomes a record.</p>
        </div>
      </div>

      <KioskPanel
        admin={admin}
        kioskOn={kioskOn}
        programs={kioskPrograms}
        togglingKiosk={togglingKiosk}
        togglingProgram={togglingProgram}
        message={serviceMsg}
        kioskUrl={kioskUrl}
        copied={copied}
        onToggleKiosk={next => (next ? void toggleKiosk(true) : setConfirmKioskOff(true))}
        onToggleProgram={id => void toggleProgram(id)}
        onCopy={() => void copyUrl()}
      />

      {newCount > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-blue-50 border border-blue-100 text-sm text-gray-700 flex items-center justify-between gap-3" role="status" aria-live="polite">
          <span><span className="font-semibold">{newCount}</span> new application{newCount === 1 ? '' : 's'} received</span>
          <button type="button" onClick={() => setNewCount(0)} className="text-xs text-brand-blue hover:underline">Dismiss</button>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="flex flex-wrap gap-3 p-4">
          <div className="relative flex-1 min-w-[220px]">
            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              placeholder="Search by name or reference number…"
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-full text-sm focus:outline-none focus:border-brand-blue"
            />
          </div>
          <div className="relative">
          <select
            value={programFilter}
            onChange={e => { setProgramFilter(e.target.value); setLoading(true); setPage(1) }}
            aria-label="Program"
            className="appearance-none pl-4 pr-10 py-2.5 border border-gray-200 rounded-full bg-white text-sm text-gray-700 focus:outline-none focus:border-brand-blue cursor-pointer"
          >
            <option value="">All programs</option>
            {PROGRAM_OPTIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
          <div className="relative">
          <select
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value as StatusFilter); setLoading(true); setPage(1) }}
            aria-label="Status"
            className="appearance-none pl-4 pr-10 py-2.5 border border-gray-200 rounded-full bg-white text-sm text-gray-700 focus:outline-none focus:border-brand-blue cursor-pointer"
          >
            <option value="all">All</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
          </select>
          <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {loadError && <div className="mx-4 mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">{loadError}</div>}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-blue">
                {['Applicant', 'Reference No.', 'Program', 'Submitted', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-white font-semibold whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-16 text-center text-gray-400">Loading…</td></tr>
              ) : paged.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center">
                    <p className="text-base font-medium text-gray-500 m-0">
                      {search || programFilter || (statusFilter !== 'all' && statusFilter !== 'Pending')
                        ? 'Nothing matches your filters'
                        : statusFilter === 'all' ? 'No kiosk applications yet' : 'No pending applications'}
                    </p>
                    {!search && !programFilter && (statusFilter === 'all' || statusFilter === 'Pending') && (
                      <p className="text-sm text-gray-400 mt-1 mb-0">New ones from the kiosk appear here automatically.</p>
                    )}
                  </td>
                </tr>
              ) : paged.map(r => (
                <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50 transition-colors align-top">
                  <td className="px-4 py-3 text-gray-800 font-medium whitespace-nowrap">
                    {r.applicantName}
                    {newIds.has(r.id) && <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-brand-orange text-white align-middle">NEW</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap font-mono text-xs pt-4">{r.referenceNo}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{r.programLabel}</td>
                  <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{fmtWhen(r.submittedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col items-start gap-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <StatusBadge row={r} />
                        {recordGone(r) && (
                          <span
                            className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-200 text-gray-600 cursor-help"
                            title={r.recordState === 'recycle' ? "The applicant's record is in the Recycle Bin (it can be restored)." : "The applicant's record was permanently deleted."}
                          >
                            Record deleted
                          </span>
                        )}
                      </div>
                      {r.status === 'Pending' && r.duplicates.length > 0 && (
                        <span
                          className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 cursor-help"
                          title={r.duplicates.map(d => `${d.name} (born ${d.birthdate}${d.dateApplied ? `, applied ${d.dateApplied}` : ''}${d.inRecycleBin ? ', in recycle bin' : ''})`).join('\n')}
                        >
                          Possible duplicate
                        </span>
                      )}
                      {r.status === 'Approved' && <span className="text-xs text-gray-500">{fmtWhen(r.reviewedAt)}{r.reviewedBy ? ` · ${r.reviewedBy}` : ''}</span>}
                      {r.status === 'Rejected' && r.purgeInDays !== null && (
                        <span className="text-xs text-gray-400">
                          {r.purgeInDays <= 1 ? 'Auto-deletes within a day' : `Auto-deletes in ${r.purgeInDays} days`}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={opening === r.id}
                        onClick={() => void openRow(r)}
                        className="px-3 py-1.5 text-xs font-medium border border-brand-blue text-brand-blue rounded-lg hover:bg-blue-50 disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        {opening === r.id && <Loader2 size={12} className="animate-spin" />}
                        {r.status === 'Pending' && r.canEdit ? 'Review' : 'View'}
                      </button>
                      {r.status === 'Pending' && r.canEdit && (
                        <button
                          type="button"
                          onClick={() => setRejectTarget(r)}
                          className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-500 rounded-lg hover:bg-red-50"
                        >
                          Reject
                        </button>
                      )}
                      {(r.status === 'Rejected' || recordGone(r)) && r.canEdit && (
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(r)}
                          className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-500 rounded-lg hover:bg-red-50"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TablePagination
          currentPage={page}
          totalItems={filtered.length}
          onPageChange={setPage}
          itemsPerPage={perPage}
          onItemsPerPageChange={n => { setPerPage(n); setPage(1) }}
        />
      </div>

      {rejectTarget && <RejectDialog row={rejectTarget} onCancel={() => setRejectTarget(null)} onConfirm={confirmReject} />}

      <ConfirmModal
        isOpen={deleteTarget !== null}
        type="confirm"
        title="Delete this submission?"
        message={deleteTarget
          ? (recordGone(deleteTarget)
            ? `${deleteTarget.applicantName} (${deleteTarget.referenceNo}) will be removed from this list. Only this history entry is deleted: the applicant's record is not affected${deleteTarget.recordState === 'recycle' ? ' and stays in the Recycle Bin' : ' (it was already deleted)'}. This cannot be undone and it will not go to the recycle bin.`
            : `${deleteTarget.applicantName} (${deleteTarget.referenceNo}) will be permanently deleted. This cannot be undone and it will not go to the recycle bin.`)
          : ''}
        confirmText="Yes, delete"
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      <ConfirmModal
        isOpen={confirmKioskOff}
        type="confirm"
        confirmVariant="brand"
        title="Turn the kiosk off?"
        message={'Applicants at the kiosk will see "closed" and will not be able to submit. Submissions already waiting stay in this list.'}
        confirmText="Turn off"
        cancelText="Cancel"
        onConfirm={() => toggleKiosk(false)}
        onCancel={() => setConfirmKioskOff(false)}
      />
      <ConfirmModal
        isOpen={notice !== null}
        type={notice?.type ?? 'success'}
        title={notice?.title ?? ''}
        message={notice?.message ?? ''}
        onConfirm={() => setNotice(null)}
        onCancel={() => setNotice(null)}
      />
    </div>
  )
}

// Asks for the reason (required, shown to other staff) before rejecting.
function RejectDialog({ row, onCancel, onConfirm }: { row: Submission; onCancel: () => void; onConfirm: (reason: string) => Promise<void> }) {
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async () => {
    const why = reason.trim()
    if (!why) { setError('Please enter the reason for rejecting this submission.'); return }
    setSaving(true)
    await onConfirm(why)
  }

  return (
    <div className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 m-0">Reject submission</h3>
        </div>
        <div className="px-6 py-5 space-y-3">
          <p className="text-sm text-gray-600 m-0">
            Reject <span className="font-semibold text-gray-900">{row.applicantName}</span> ({row.referenceNo})? It will not become a record.
          </p>
          <div>
            <label className="block text-xs uppercase tracking-wide text-gray-900 font-semibold mb-1">Reason <span className="text-red-500">*</span></label>
            <textarea
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:ring-2 focus:ring-brand-blue focus:border-transparent outline-none resize-none"
              rows={3}
              maxLength={MAX_REASON}
              value={reason}
              onChange={e => { setReason(e.target.value); setError('') }}
              placeholder="e.g. Already registered, incomplete information"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{reason.length}/{MAX_REASON}</p>
          </div>
          {error && <p className="text-red-500 text-sm m-0">{error}</p>}
        </div>
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
          <button type="button" onClick={onCancel} disabled={saving} className="px-5 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm disabled:opacity-50">Cancel</button>
          <button type="button" onClick={() => void submit()} disabled={saving} className="px-5 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium disabled:opacity-50 inline-flex items-center gap-2">
            {saving && <Loader2 size={15} className="animate-spin" />}Reject
          </button>
        </div>
      </div>
    </div>
  )
}
