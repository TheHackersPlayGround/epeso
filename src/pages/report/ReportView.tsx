import { useState, useEffect } from 'react'
import { ArrowLeft, FileText, Download, ChevronDown, Columns, BarChart2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import DatePicker from '../../components/DatePicker'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { registerPdfFont, PDF_FONT_FAMILY } from './fonts/registerPdfFont'
import ConfirmModal from '../shared/ConfirmModal'
import { fetchEfReport, fetchGeneralPesoReport, fetchSkillsAgingReport, type SkillsAgingRow, fetchCdspAgingReport, type CdspAgingRow, fetchGipAgingReport, type GipAgingRow } from '../../services/reportService'
import { monthsSince, relativeSince, agingBucket, AGING_BUCKET_ORDER, AGING_BUCKET_COLORS } from '../../utils/aging'
import { generatePesoMonthlyReport } from './pesoMonthlyReport'
import { generateGeneralPesoWorkbook } from './generalPesoReport'
import { graftAgingCharts, type AgingChartOptions } from './skillsAgingChart'
import { GENERAL_PESO_PROGRAM_COLORS } from './generalPesoColors'
import { useCDSP } from '../../contexts/CDSPContext'
import { useGIP } from '../../contexts/GIPContext'
import { useSPES } from '../../contexts/SPESContext'
import { useSkillsTraining } from '../../contexts/SkillsTrainingContext'
import { useOFW } from '../../contexts/OFWContext'
import { useDILP } from '../../contexts/DILPContext'
import { useTUPAD } from '../../contexts/TUPADContext'
import { useSLP } from '../../contexts/SLPContext'
import { useCLPEP } from '../../contexts/CLPEPContext'
import type { Referral, Placement } from '../../contexts/EmploymentContext'
import { listReferrals } from '../../services/referralService'
import { listPlacements } from '../../services/placementService'

interface ReportViewProps {
  onBack: () => void
}

type ReportCategory =
  | 'general-peso'
  | 'employment-facilitation'
  | 'ofw-services'
  | 'cdsp'
  | 'livelihood'
  | 'gip'
  | 'spes'
  | 'skills-training'

type ReportPeriod = 'monthly' | 'annual' | 'custom'

// Hoisted to module scope (rather than declared inside the component) so its
// first entry can seed the reportCategory state's initial value below — the
// dropdown no longer has an empty placeholder option, so it always needs a
// real default category selected from the start. Order (after the cross-program
// General PESO Report) matches the dashboard's module menu (dashboard.tsx).
const REPORT_CATEGORIES: { id: ReportCategory; name: string }[] = [
  { id: 'general-peso', name: 'General PESO Report' },
  { id: 'employment-facilitation', name: 'Employment Facilitation' },
  { id: 'cdsp', name: 'CDSP' },
  { id: 'gip', name: 'GIP' },
  { id: 'spes', name: 'SPES' },
  { id: 'livelihood', name: 'Livelihood' },
  { id: 'skills-training', name: 'Skills Training' },
  { id: 'ofw-services', name: 'OFW Services' },
]

export default function ReportView({ onBack }: ReportViewProps) {
  const { applicants: cdspApplicants, activities: cdspActivities, services: cdspServices, programInfo: cdspProgramInfo } = useCDSP()
  const { applicants: gipApplicants, gipWorkplaces } = useGIP()
  const { applicants: spesApplicants, spesBatches } = useSPES()
  const { profiles: skillsProfiles, activities: skillsActivities } = useSkillsTraining()
  const { profiles: ofwProfiles } = useOFW()
  const { applicants: dilpApplicants, projects: dilpProjects } = useDILP()
  const { applicants: tupadApplicants, projects: tupadProjects } = useTUPAD()
  const { applicants: slpApplicants, projects: slpProjects } = useSLP()
  const { applicants: clpepApplicants, interventions: clpepInterventions } = useCLPEP()

  // Employment Facilitation has no shared Context (see EmploymentContext.tsx —
  // it's types-only), so referrals/placements are fetched directly here,
  // unlike every other category above which reads from an already-live Context.
  const [efReferrals, setEfReferrals] = useState<Referral[]>([])
  const [efPlacements, setEfPlacements] = useState<Placement[]>([])
  useEffect(() => {
    listReferrals().then(setEfReferrals).catch(() => {})
    listPlacements().then(setEfPlacements).catch(() => {})
  }, [])

  const [infoModal, setInfoModal] = useState<{ isOpen: boolean; title: string; message: string }>({ isOpen: false, title: '', message: '' })
  const [reportCategory, setReportCategory] = useState<ReportCategory | ''>('')
  const [programType, setProgramType] = useState('')
  const [cdspReportType, setCdspReportType] = useState<'participants' | 'sessions' | 'aging'>('participants')
  const [cdspAgingLoading, setCdspAgingLoading] = useState(false)
  const [gipAgingLoading, setGipAgingLoading] = useState(false)
  const [gipReportType, setGipReportType] = useState<'participants' | 'batches' | 'aging'>('participants')
  const [spesReportType, setSpesReportType] = useState<'participants' | 'batches'>('participants')
  const [livelihoodReportType, setLivelihoodReportType] = useState<'beneficiaries' | 'projects'>('beneficiaries')
  const [skillsReportType, setSkillsReportType] = useState<'participants' | 'activities' | 'aging'>('participants')
  const [skillsAgingLoading, setSkillsAgingLoading] = useState(false)
  // General PESO Report: which programs to roll up — defaults to all of them
  // (matches the report's previous "always everything" behavior); the user
  // can narrow it down via the "Include Programs" picker.
  const [selectedGeneralPrograms, setSelectedGeneralPrograms] = useState<string[]>(
    REPORT_CATEGORIES.filter(c => c.id !== 'general-peso').map(c => c.id),
  )
  const [isProgramMenuOpen, setIsProgramMenuOpen] = useState(false)
  const [generalPesoLoading, setGeneralPesoLoading] = useState(false)
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('monthly')
  // Local Date getters, not toISOString() — the latter is UTC and can read back
  // as yesterday's date in the early-morning hours on a positive-UTC-offset
  // machine (same pitfall inSelectedPeriod/formatLongDate below avoid).
  const now = new Date()
  const currentYear = String(now.getFullYear())
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0')
  const todayIso = `${currentYear}-${currentMonth}-${String(now.getDate()).padStart(2, '0')}`
  const [month, setMonth] = useState(currentMonth)
  const [year, setYear] = useState(currentYear)
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`)
  const [toDate, setToDate] = useState(todayIso)
  const [generatedReport, setGeneratedReport] = useState<any>(null)
  // Skills Training's, CDSP's, and GIP's Aging Reports share identical
  // downstream handling everywhere below (Excel/PDF/on-screen) -- CDSP's only
  // extra is the sub-service breakdown, layered on top via
  // analytics.byGroupBySubService (GIP has no equivalent, same as Skills
  // Training). Defined once here (rather than recomputed in handleExport and
  // again at every JSX gate below) so the three can never drift out of sync.
  const isGeneratedReportAging = !!generatedReport && (
    (generatedReport.category === 'skills-training' && generatedReport.skillsReportType === 'aging')
    || (generatedReport.category === 'cdsp' && generatedReport.cdspReportType === 'aging')
    || (generatedReport.category === 'gip' && generatedReport.gipReportType === 'aging')
  )

  // A previously generated report is only a snapshot of the config at the time
  // "Generate Report" was clicked — if the user changes any filter afterward
  // without regenerating, clear it so the stale report can't be mistaken for
  // reflecting the new selection.
  useEffect(() => {
    setGeneratedReport(null)
  }, [reportCategory, programType, cdspReportType, gipReportType, spesReportType, livelihoodReportType, skillsReportType, selectedGeneralPrograms, reportPeriod, month, year, fromDate, toDate])

  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false)
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)
  // Which row's Export Attendees/Interns/Students dropdown is open, keyed by
  // that row's _activityId/_batchId (only one report type's rows are ever on
  // screen at a time, so a bare id is enough to disambiguate), plus its
  // computed viewport position — the menu renders via position:fixed outside
  // the scrollable table so it isn't clipped by overflow-x-auto or trapped
  // inside the sticky column's stacking context (which would otherwise paint
  // it underneath later rows' own sticky cells).
  const [rowExportMenuId, setRowExportMenuId] = useState<number | null>(null)
  const [rowExportMenuPos, setRowExportMenuPos] = useState<{ top: number; left: number } | null>(null)
  // Livelihood-only: which of the four sub-programs rowExportMenuId's id belongs
  // to -- needed because DILP/TUPAD/SLP/CLPEP each have their own id sequence, so
  // the bare id alone can't say whether it's (e.g.) DILP project 3 or SLP project 3.
  const [rowExportMenuProgram, setRowExportMenuProgram] = useState<string | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({})
  // Preview pagination — same pattern as the CDSP/GIP/SPES module list tables.
  const [previewPage, setPreviewPage] = useState(1)
  const [previewPerPage, setPreviewPerPage] = useState(10)

  const cdspPrograms = cdspServices.length > 0 ? cdspServices.map(s => s.name) : ['Career Coaching', 'Pre-Employment Coaching', 'Labor Employment for Graduating Students']
  const livelihoodPrograms = ['DILEEP (DILP)', 'DILEEP (TUPAD)', 'SLP', 'CLPEP']

  const months = [
    { value: '01', label: 'January' }, { value: '02', label: 'February' },
    { value: '03', label: 'March' },   { value: '04', label: 'April' },
    { value: '05', label: 'May' },     { value: '06', label: 'June' },
    { value: '07', label: 'July' },    { value: '08', label: 'August' },
    { value: '09', label: 'September' },{ value: '10', label: 'October' },
    { value: '11', label: 'November' }, { value: '12', label: 'December' },
  ]

  // 2 years back through 1 year ahead of today, so this stays current on its
  // own instead of needing to be manually bumped every year.
  const years = Array.from({ length: 4 }, (_, i) => String(Number(currentYear) - 2 + i))

  // Folio / long bond (8.5 × 13") — matches the Excel exports' paper size
  // (ExcelJS paperSize: 14) instead of jsPDF's A4 default. Shared by the main
  // report's PDF export and the per-activity/batch roster PDF exports below.
  const FOLIO_MM: [number, number] = [215.9, 330.2]

  // Renders one line made of alternating bold-label/normal-value segments,
  // centered as a whole block — used for the roster PDFs' info lines (mirrors
  // the Excel version's rich-text centered cells, since jsPDF has no single
  // call that centers mixed-weight text).
  const drawCenteredMixedLine = (doc: jsPDF, parts: { label: string; value: string | number }[], centerX: number, y: number) => {
    const segments = parts.flatMap(p => [{ text: p.label, bold: true }, { text: String(p.value), bold: false }])
    const widths = segments.map(s => {
      doc.setFont(PDF_FONT_FAMILY, s.bold ? 'bold' : 'normal')
      return doc.getTextWidth(s.text)
    })
    let x = centerX - widths.reduce((a, b) => a + b, 0) / 2
    segments.forEach((s, i) => {
      doc.setFont(PDF_FONT_FAMILY, s.bold ? 'bold' : 'normal')
      doc.text(s.text, x, y)
      x += widths[i]
    })
  }

  // "#RRGGBB" -> [r, g, b] -- jsPDF-autotable's fillColor/textColor styles take
  // an RGB triple, not a hex string. Used only for the Aging Report's
  // "Time Since Completion" cell highlight in the PDF export.
  const hexToRgb = (hex: string): [number, number, number] => {
    const n = parseInt(hex.replace('#', ''), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }

  // Splits usableWidth across columns proportional to each column's actual
  // rendered text width (header vs. longest value, measured via the doc's own
  // font metrics) instead of a raw character count. A character-count heuristic
  // treats every column as if its characters were equally wide and gives every
  // column the same floor regardless of how little room it really needs (e.g.
  // "No."/"Sex"), which starves genuinely tight fixed-width columns (e.g. a
  // 10-character "2026-07-28" date) of the space they need and forces them to
  // wrap onto a second line even when the page has plenty of room to spare.
  const computeColumnWidths = (
    doc: jsPDF,
    headerLabels: string[],
    bodyRows: (string | number)[][],
    usableWidth: number,
    headerFontSize: number,
    bodyFontSize: number,
  ): number[] => {
    doc.setFontSize(headerFontSize); doc.setFont(PDF_FONT_FAMILY, 'bold')
    const headerWidths = headerLabels.map(label => doc.getTextWidth(label))
    doc.setFontSize(bodyFontSize); doc.setFont(PDF_FONT_FAMILY, 'normal')
    const CELL_PADDING_MM = 5 // clears autoTable's own ~3.5mm combined left+right cell padding, with a little slack
    const colWeights = headerLabels.map((_, i) => {
      const maxValueWidth = bodyRows.reduce((max, r) => Math.max(max, doc.getTextWidth(String(r[i] ?? ''))), 0)
      return Math.max(headerWidths[i], maxValueWidth) + CELL_PADDING_MM
    })
    const totalWeight = colWeights.reduce((a, b) => a + b, 0)
    return colWeights.map(w => (w / totalWeight) * usableWidth)
  }

  // Shared PDF builder for the per-activity/batch roster exports (Export
  // Attendees/Interns/Students) — same title + centered info-block + table
  // shape as the ExcelJS version, on the same Folio paper as the main report.
  // Landscape, since these rosters run 7-8 columns wide.
  const buildRosterPdf = (
    title: string,
    infoLines: { label: string; value: string | number }[][],
    headerLabels: string[],
    rows: (string | number)[][],
  ): jsPDF => {
    const doc = new jsPDF({ orientation: 'landscape', format: [FOLIO_MM[1], FOLIO_MM[0]] })
    registerPdfFont(doc)
    const pageWidth = doc.internal.pageSize.getWidth()
    const centerX = pageWidth / 2
    const usableWidth = pageWidth - 28
    let y = 20

    doc.setFontSize(16); doc.setFont(PDF_FONT_FAMILY, 'bold')
    doc.text(title, centerX, y, { align: 'center' }); y += 10

    doc.setFontSize(10)
    infoLines.forEach(parts => { drawCenteredMixedLine(doc, parts, centerX, y); y += 6 })
    y += 4

    const colWidths = computeColumnWidths(doc, headerLabels, rows, usableWidth, 9, 8)
    const columnStyles = Object.fromEntries(headerLabels.map((_, i) => [i, { cellWidth: colWidths[i] }]))

    autoTable(doc, {
      startY: y,
      head: [headerLabels],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [0, 119, 190], textColor: 255, fontStyle: 'bold', fontSize: 9, font: PDF_FONT_FAMILY },
      bodyStyles: { fontSize: 8, font: PDF_FONT_FAMILY },
      margin: { left: 14, right: 14 },
      tableWidth: usableWidth,
      columnStyles,
      styles: { overflow: 'linebreak', font: PDF_FONT_FAMILY },
    })

    return doc
  }

  // Shared CSV builder for the per-activity/batch roster exports. CSV has no
  // styling — no bold, no merged/centered cells — so the info lines flatten to
  // plain "Label: Value" text rows above the header instead of the Excel/PDF
  // versions' formatted block; still gives a flat, importable file for anyone
  // who wants raw data instead of a formatted document. Uses SheetJS (already
  // used for the main report's CSV export) so values like "Last, First" names
  // get proper CSV quoting instead of a raw comma-joined string breaking columns.
  const buildRosterCsv = (
    title: string,
    infoLines: { label: string; value: string | number }[][],
    headerLabels: string[],
    rows: (string | number)[][],
  ): string => {
    const aoa: (string | number)[][] = [
      [title], [],
      ...infoLines.map(parts => [parts.map(p => `${p.label}${p.value}`).join('   ')]),
      [],
      headerLabels,
      ...rows,
    ]
    return XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(aoa))
  }

  // "Address" column (CDSP/GIP/SPES participant lists) — an ordinary extra
  // column alongside Street/Purok and Barangay (not a replacement for them),
  // combining the parts that actually vary between participants. Not labeled
  // "Full Address" — Province/Region are deliberately left out since a single
  // PESO office serves one jurisdiction, so those would just repeat the same
  // text on every row, and a partial address shouldn't claim to be complete.
  const formatAddress = (a: { streetPurok?: string; barangay?: string; cityMunicipality?: string }): string => {
    const parts = [a.streetPurok, a.barangay, a.cityMunicipality].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : '-'
  }

  // Peso-formats a raw numeric-string field (assistance amount, allowance, family
  // income, etc.) -- shared so every currency-like report column renders the
  // same way instead of some showing "₱20,000" and others a raw "20000".
  const formatCurrency = (value?: string | number | null): string =>
    value ? `₱${Number(value).toLocaleString()}` : '-'

  // CDSP Activity List columns — one row per activity/session, not per participant.
  const CDSP_SESSION_COLUMNS = ['Activity Title', 'Service Type', 'Date', 'Venue', 'Facilitator', 'Counselor', 'Duration', 'Participants', 'Status']
  // GIP Workplace/Office List columns — one row per internship workplace/office
  // deployment, not per intern. No "Facilitator"/"Counselor"/"Duration" here —
  // GIP's equivalent context is a workplace/office + Coordinator/Supervisor
  // overseeing an extended deployment, not a single-day session run by one
  // facilitator.
  const GIP_WORKPLACE_COLUMNS = ['Assigned Office', 'Workplace/Office Address', 'Supervisor', 'Allowance', 'Interns']
  // SPES Batch List columns — one row per SPES batch. SPES students are deployed
  // to an "Employer" (government office OR private establishment — unlike GIP,
  // which is government-office-only), so that's the accurate label here rather
  // than "Assigned Office". "Total Slots" is the batch's slot capacity (the
  // underlying field is named availableSlots, but it's the total, not the
  // remaining count — see the separate "Participants" column for how many are
  // filled); there's no per-batch wage/allowance field on SPESBatch the way
  // there is on GIPWorkplace, so "Funding Source" fills that context role.
  const SPES_BATCH_COLUMNS = ['Batch Name', 'Employer', 'Deployment Location', 'Start Date', 'End Date', 'Coordinator', 'Total Slots', 'Funding Source', 'Participants', 'Status']
  // Livelihood Project/Intervention List columns — one row per DILP/TUPAD project,
  // SLP project, or CLPEP intervention, not per beneficiary. Unlike CDSP/GIP/SPES's
  // single batch shape, DILP/TUPAD/SLP/CLPEP each store genuinely different fields
  // (e.g. only DILP/TUPAD/SLP have an assistance amount; CLPEP is a non-cash
  // intervention program and has none) — so once a specific Program Type is
  // selected, the columns are tailored exactly to what that one program stores,
  // with no "-" filler. Only the combined "All Programs" view still needs a
  // shared column set, since it's explicitly mixing four different shapes.
  const LIVELIHOOD_DILP_PROJECT_COLUMNS = ['No.', 'Project ID', 'Project Name', 'Type of Project', 'Program Component',
    'Way of Implementation', 'Location', 'Assistance Amount', 'Release Date', 'Beneficiaries Assigned', 'Status']
  const LIVELIHOOD_TUPAD_PROJECT_COLUMNS = ['No.', 'Project Title', 'Description', 'Date', 'Location', 'Facilitator',
    'Assistance Amount', 'Release Date', 'Beneficiaries Assigned', 'Status']
  const LIVELIHOOD_SLP_PROJECT_COLUMNS = ['No.', 'Project Name', 'SLP Track', 'Description', 'Date Started', 'Location',
    'Facilitator', 'Assistance Amount', 'Release Date', 'Beneficiaries Assigned', 'Status']
  const LIVELIHOOD_CLPEP_PROJECT_COLUMNS = ['No.', 'Intervention Name', 'Category', 'Description', 'Target Beneficiaries',
    'Date', 'Location', 'Implementing Officer', 'Partner Agency', 'Beneficiaries Assigned', 'Status']
  const LIVELIHOOD_ALL_PROJECT_COLUMNS = ['No.', 'Project/Intervention Name', 'Program Type', 'Category / Track',
    'Description', 'Date / Start Date', 'Location', 'Facilitator / Officer', 'Assistance Amount', 'Release Date',
    'Beneficiaries Assigned', 'Status']
  // Skills Training Activity List columns — one row per training session, not
  // per participant. "Training Batch" is the batch the training belongs to
  // (SkillsTrainingActivity.service, shown as the training's subtitle/category
  // everywhere else in the app) — there's no separate Counselor/Duration field
  // the way CDSP's sessions have.
  // Present/Absent only populate once a training is Completed -- attended is
  // still mostly unset for a Planned/Ongoing training (see generateData below).
  const SKILLS_TRAINING_ACTIVITY_COLUMNS = ['Training Title', 'Training Batch', 'Date', 'Venue', 'Facilitator', 'Participants', 'Present', 'Absent', 'Status']
  // Skills Training Aging Report columns — one row per beneficiary who has
  // genuinely completed at least one training (status Completed AND attended),
  // showing how long it's been since and whether a job placement followed.
  // Not period-filtered -- it's a live snapshot of "how long since completion,"
  // not a list of things that happened within a chosen date range.
  const SKILLS_AGING_COLUMNS = ['No.', 'Participant Name', 'Trainings Completed', 'Last Completed Training', 'Completed Date',
    'Time Since Completion', 'Employment Status', 'Job Title', 'Employer', 'Date Hired']
  // CDSP Aging Report columns — same shape as Skills Training's, plus
  // "Sub-Service" since CDSP (unlike Skills Training) has three of them
  // (Career Coaching / Pre-Employment Coaching / Labor Employment for
  // Graduating Students) sharing one Aging pool.
  const CDSP_AGING_COLUMNS = ['No.', 'Participant Name', 'Sub-Service', 'Activities Completed', 'Last Completed Activity', 'Completed Date',
    'Time Since Completion', 'Employment Status', 'Job Title', 'Employer', 'Date Hired']
  // GIP Aging Report columns — same shape as Skills Training's. GIP is
  // one-shot (an applicant only ever goes through the program once), so
  // there's no "X Completed" count column the way Skills Training/CDSP have
  // -- it would always just be 1.
  const GIP_AGING_COLUMNS = ['No.', 'Participant Name', 'Last Completed Workplace/Office', 'Completed Date',
    'Time Since Completion', 'Employment Status', 'Job Title', 'Employer', 'Date Hired']
  // General PESO Report columns — one row PER PROGRAM (aggregated server-side
  // from live data), not per-participant, so there's no Sex/Age/Address here.
  // "Activities Conducted" and "Placements" are null (rendered as "-") for
  // programs the concept doesn't apply to, rather than a faked number.
  const GENERAL_PESO_COLUMNS = ['Program / Service', 'Participants', 'Male', 'Female', 'Activities Conducted', 'Placements']

  const getLivelihoodProjectColumns = (): string[] => {
    if (programType === 'DILEEP (DILP)') return LIVELIHOOD_DILP_PROJECT_COLUMNS
    if (programType === 'DILEEP (TUPAD)') return LIVELIHOOD_TUPAD_PROJECT_COLUMNS
    if (programType === 'SLP') return LIVELIHOOD_SLP_PROJECT_COLUMNS
    if (programType === 'CLPEP') return LIVELIHOOD_CLPEP_PROJECT_COLUMNS
    return LIVELIHOOD_ALL_PROJECT_COLUMNS
  }

  // DILP/TUPAD/SLP each call their own record a "Project"; CLPEP calls its a
  // "Intervention" -- so report titles/labels should say whichever term the
  // currently selected program actually uses, not a blanket "Project/Intervention"
  // that only genuinely applies once all four are mixed together (All Programs).
  const livelihoodUnitLabel = (pt: string): { singular: string; plural: string } => {
    if (pt === 'CLPEP') return { singular: 'Intervention', plural: 'Interventions' }
    if (pt === 'DILEEP (DILP)' || pt === 'DILEEP (TUPAD)' || pt === 'SLP') return { singular: 'Project', plural: 'Projects' }
    return { singular: 'Project/Intervention', plural: 'Projects/Interventions' }
  }

  const getReportColumns = (category: ReportCategory): string[] => {
    if (category === 'cdsp' && cdspReportType === 'sessions') return CDSP_SESSION_COLUMNS
    if (category === 'gip' && gipReportType === 'batches') return GIP_WORKPLACE_COLUMNS
    if (category === 'spes' && spesReportType === 'batches') return SPES_BATCH_COLUMNS
    if (category === 'livelihood' && livelihoodReportType === 'projects') return getLivelihoodProjectColumns()
    if (category === 'skills-training' && skillsReportType === 'activities') return SKILLS_TRAINING_ACTIVITY_COLUMNS
    const map: Record<ReportCategory, string[]> = {
      'general-peso': GENERAL_PESO_COLUMNS,
      'employment-facilitation': ['Applicant Name', 'Employer', 'Job Title', 'Referral Status', 'Placement Status', 'Employment Type', 'Date Referred', 'Date Hired'],
      'ofw-services': ['No.', 'OFW Name', 'Sex', 'Civil Status', 'Contact Number', 'Email', 'Address', 'Barangay', 'Municipality',
                        'Type of Request', 'Employment Status', 'Desired Position', 'Type of Skill', 'Agencies',
                        'Date Filed', 'Status', 'Remarks'],
      'cdsp': ['No.', 'Participant Name', 'Sex', 'Age', 'Program Type', 'Date Applied', 'Highest Education',
               'Employment Status', 'School', 'Course / Program', 'Strand', 'Current Occupation', 'Civil Status',
               'Contact Number', 'Street/Purok', 'Barangay', 'Address', 'Status', 'Remarks'],
      'livelihood': ['No.', 'Beneficiary Name', 'Sex', 'Age', 'Program Type', 'Date Applied', 'Civil Status',
                     'Contact Number', 'Street/Purok', 'Barangay', 'Address', 'Assigned Project/Intervention',
                     'Assistance Amount', 'Release Date', 'Status', 'Remarks'],
      'gip': ['No.', 'Participant Name', 'Sex', 'Age', 'Highest Education', 'Assigned Office', 'Workplace/Office Address',
              'Start Date', 'End Date', 'Status', 'School Name', 'Course', 'Strand', 'Civil Status',
              'Contact Number', 'Street/Purok', 'Barangay', 'Address', 'Supervisor', 'Allowance', 'Remarks'],
      'spes': ['No.', 'Participant Name', 'Sex', 'Age', 'School Name', 'Grade/Year Level', 'Employer', 'Deployment Location',
               'Start Date', 'End Date', 'Status', 'Batch', 'Course', 'School Type', 'Civil Status', 'Contact Number',
               'Street/Purok', 'Barangay', 'Address', 'Annual Family Income', 'No. of Dependents', 'Remarks'],
      'skills-training': ['No.', 'Participant Name', 'Sex', 'Age', 'Civil Status', 'Classification', 'Desired Qualification',
                           'Purpose of Training', 'Assigned Training', 'Training Status', 'Date Applied', 'Contact Number', 'Street/Purok',
                           'Barangay', 'Address', 'Status'],
    }
    return map[category] || []
  }

  // Columns shown by default; the rest are optional (user turns them on via the
  // Columns menu). Only CDSP/GIP distinguish default vs optional; others show all.
  // "Status" specifically is never on by default anywhere (still toggleable via
  // the Columns menu, just not pre-checked) -- every branch below excludes it.
  const getDefaultColumns = (category: ReportCategory): string[] => {
    const withoutStatus = (cols: string[]) => cols.filter(c => c !== 'Status')
    // CDSP Activity List: few columns, all useful — show all by default.
    if (category === 'cdsp' && cdspReportType === 'sessions') return withoutStatus(CDSP_SESSION_COLUMNS)
    // GIP Workplace/Office List: few columns, all useful — show all by default.
    if (category === 'gip' && gipReportType === 'batches') return withoutStatus(GIP_WORKPLACE_COLUMNS)
    // CDSP: the fields that matter for a career-development report are on by default;
    // the rest (contact, address, occupation, civil status, status, remarks) are optional.
    if (category === 'cdsp') return ['No.', 'Participant Name', 'Sex', 'Age', 'Program Type', 'Date Applied', 'Highest Education', 'Employment Status']
    // GIP: interns deployed to government offices — identity, education, deployment office and period.
    // (Status is optional, matching CDSP.)
    if (category === 'gip') return ['No.', 'Participant Name', 'Sex', 'Age', 'Highest Education', 'Assigned Office', 'Workplace/Office Address', 'Start Date', 'End Date']
    // SPES Batch List: few columns, all useful — show all by default.
    if (category === 'spes' && spesReportType === 'batches') return withoutStatus(SPES_BATCH_COLUMNS)
    // SPES: working students — identity, school/year level, employer and period.
    // (Status is optional, matching CDSP.)
    if (category === 'spes') return ['No.', 'Participant Name', 'Sex', 'Age', 'School Name', 'Grade/Year Level', 'Employer', 'Deployment Location', 'Start Date', 'End Date']
    // Livelihood Project/Intervention List: few columns, all useful — show all by default.
    if (category === 'livelihood' && livelihoodReportType === 'projects') return withoutStatus(getLivelihoodProjectColumns())
    // Livelihood: identity, which of the four sub-programs, and the assistance
    // details PESO cares about most; address/contact/remarks/status are optional.
    if (category === 'livelihood') return ['No.', 'Beneficiary Name', 'Sex', 'Age', 'Program Type', 'Date Applied']
    // Skills Training Activity List: few columns, all useful — show all by default.
    if (category === 'skills-training' && skillsReportType === 'activities') return withoutStatus(SKILLS_TRAINING_ACTIVITY_COLUMNS)
    // Skills Training: identity, which training they're assigned to, and period;
    // classification/qualification/purpose/contact/address/status are optional.
    if (category === 'skills-training') return ['No.', 'Participant Name', 'Sex', 'Age', 'Assigned Training', 'Training Status', 'Date Applied']
    // OFW: identity, what they're requesting, employment status, and period;
    // contact/address/referral sub-fields/remarks/status are optional.
    if (category === 'ofw-services') return ['No.', 'OFW Name', 'Sex', 'Type of Request', 'Employment Status', 'Date Filed']
    return withoutStatus(getReportColumns(category))
  }

  // True when a date falls within the selected report period (monthly/annual/custom).
  // Compares the "YYYY-MM-DD" string's own digits directly rather than `new
  // Date(dateStr)` + local getters -- that combination parses the string as UTC
  // midnight but reads the year/month back in the viewer's local timezone, which
  // can misclassify Jan 1 / Dec 31 records into the wrong month or year on a
  // negative-UTC-offset machine (same pitfall formatLongDate below avoids).
  const inSelectedPeriod = (dateStr: string): boolean => {
    if (!dateStr) return false
    const [yStr, mStr, dStr] = dateStr.split('-')
    const recYear = Number(yStr), recMonth = Number(mStr)
    if (!recYear || !recMonth || !dStr) return false
    if (reportPeriod === 'annual') return recYear === Number(year)
    if (reportPeriod === 'custom') return dateStr >= fromDate && dateStr <= toDate
    return recYear === Number(year) && recMonth === Number(month)
  }

  const generateData = (category: ReportCategory): any[] => {
    switch (category) {
      case 'employment-facilitation': {
        const referrals = efReferrals
        const placements = efPlacements
        const placedIds = new Set(placements.map((p: any) => p.applicantId))
        const placedRows = placements.map((p: any) => ({
          'Applicant Name': p.applicantName,
          'Employer': p.employer,
          'Job Title': p.jobTitle,
          'Referral Status': 'Hired',
          'Placement Status': p.status,
          'Employment Type': p.employmentType || '-',
          'Date Referred': '-',
          'Date Hired': p.dateHired,
        }))
        const referralRows = referrals
          .filter((r: any) => !placedIds.has(r.applicantId))
          .map((r: any) => ({
            'Applicant Name': r.applicantName,
            'Employer': r.employer,
            'Job Title': r.jobTitle,
            'Referral Status': r.status,
            'Placement Status': '-',
            'Employment Type': '-',
            'Date Referred': r.referralDate,
            'Date Hired': '-',
          }))
        return [...placedRows, ...referralRows]
      }

      case 'cdsp':
        if (cdspReportType === 'sessions') {
          return cdspActivities
            // Service Type filter (from the "Program Type" dropdown; '' = All Programs)
            .filter(act => !programType || act.service === programType)
            // Period filter on the date the activity was conducted
            .filter(act => inSelectedPeriod(act.date))
            .map(act => ({
              'Activity Title': act.title || '-',
              'Service Type': act.service || '-',
              'Date': act.date || '-',
              'Venue': act.location || '-',
              'Facilitator': act.facilitator || '-',
              'Counselor': act.counselor || '-',
              'Duration': act.sessionDuration || '-',
              'Participants': act.assignedCount ?? act.participants ?? 0,
              'Status': act.status,
              _activityId: act.id, // not rendered as a column — used to export this session's roster
            }))
        }
        return cdspApplicants
          // Program Type filter (from the dropdown; '' = All Programs)
          .filter(a => !programType || a.serviceAvailed === programType)
          // Period filter on the date the application was received
          .filter(a => inSelectedPeriod(a.dateApplicationReceived))
          .map((a, i) => {
            return {
              'No.': i + 1,
              'Participant Name': `${a.lastName}, ${a.firstName}${a.middleName ? ' ' + a.middleName : ''}`.trim(),
              'Sex': a.sex || '-',
              'Program Type': a.serviceAvailed || '-',
              'Date Applied': a.dateApplicationReceived || '-',
              'Status': a.status,
              'Age': a.age || '-',
              'Civil Status': a.civilStatus || '-',
              'Highest Education': a.highestEducation || '-',
              'School': a.schoolName || '-',
              'Course / Program': a.course || '-',
              'Strand': a.strand || '-',
              'Employment Status': a.employmentStatus || '-',
              'Current Occupation': a.currentOccupation || '-',
              'Contact Number': a.contactNumber || '-',
              'Street/Purok': a.streetPurok || '-',
              'Barangay': a.barangay || '-',
              'Address': formatAddress(a),
              'Remarks': a.remarks || '-',
            }
          })

      case 'gip':
        if (gipReportType === 'batches') {
          // Workplaces are a reusable directory (no period of their own, like
          // EF's employers) -- not period-filtered, unlike other activity lists.
          return gipWorkplaces
            .map(w => ({
              'Assigned Office': w.workplaceName || '-',
              'Workplace/Office Address': w.deploymentLocation || '-',
              'Supervisor': w.supervisor || '-',
              'Allowance': formatCurrency(w.allowance),
              // All interns ever assigned here (Ongoing + Completed), not just
              // currently-active ones -- w.assignedCount is Ongoing-only and
              // used elsewhere (Assign modal) for capacity, which isn't the
              // question this report answers.
              'Interns': gipApplicants.filter(a => a.assignedWorkplaceId === w.id).length,
              _batchId: w.id, // not rendered as a column — used to export this workplace's interns
            }))
        }
        return gipApplicants
          // Period filter on the date the application was received
          .filter(a => inSelectedPeriod(a.dateApplicationReceived))
          .map((a, i) => {
            const workplace = gipWorkplaces.find(w => w.id === a.assignedWorkplaceId)
            const history = a.assignmentHistory[0]
            return {
              'No.': i + 1,
              'Participant Name': `${a.lastName}, ${a.firstName}${a.middleName ? ' ' + a.middleName : ''}`.trim(),
              'Sex': a.sex || '-',
              'Age': a.age || '-',
              'Highest Education': a.highestEducation || '-',
              'Assigned Office': workplace?.workplaceName || '-',
              'Workplace/Office Address': workplace?.deploymentLocation || '-',
              'Start Date': history?.assignedDate || '-',
              'End Date': history?.completedDate || '-',
              'Status': a.status,
              'School Name': a.schoolName || '-',
              'Course': a.course || '-',
              'Strand': a.strand || '-',
              'Civil Status': a.civilStatus || '-',
              'Contact Number': a.contactNumber || '-',
              'Street/Purok': a.streetPurok || '-',
              'Barangay': a.barangay || '-',
              'Address': formatAddress(a),
              'Supervisor': workplace?.supervisor || '-',
              'Allowance': formatCurrency(workplace?.allowance),
              'Remarks': a.remarks || '-',
            }
          })

      case 'spes':
        if (spesReportType === 'batches') {
          return spesBatches
            // Period filter on the batch's program start date
            .filter(b => inSelectedPeriod(b.programStartDate))
            .map(b => ({
              'Batch Name': b.batchName || '-',
              'Employer': b.employer || '-',
              'Deployment Location': b.deploymentLocation || '-',
              'Start Date': b.programStartDate || '-',
              'End Date': b.programEndDate || '-',
              'Coordinator': b.coordinator || '-',
              'Total Slots': b.availableSlots || '-',
              'Funding Source': b.fundingSource || '-',
              'Participants': b.assignedCount ?? 0,
              'Status': b.status,
              _batchId: b.id, // not rendered as a column — used to export this batch's students
            }))
        }
        return spesApplicants
          // Period filter on the date the application was received
          .filter(a => inSelectedPeriod(a.dateApplicationReceived))
          .map((a, i) => {
            const batch = spesBatches.find(b => b.id === a.assignedBatchId)
            return {
              'No.': i + 1,
              'Participant Name': `${a.lastName}, ${a.firstName}${a.middleName ? ' ' + a.middleName : ''}`.trim(),
              'Sex': a.sex || '-',
              'Age': a.age || '-',
              'School Name': a.schoolName || '-',
              'Grade/Year Level': a.gradeYearLevel || '-',
              'Employer': batch?.employer || '-',
              'Deployment Location': batch?.deploymentLocation || '-',
              'Start Date': batch?.programStartDate || '-',
              'End Date': batch?.programEndDate || '-',
              'Status': a.status,
              'Batch': batch?.batchName || '-',
              'Course': a.course || '-',
              'School Type': a.schoolType || '-',
              'Civil Status': a.civilStatus || '-',
              'Contact Number': a.contactNumber || '-',
              'Street/Purok': a.streetPurok || '-',
              'Barangay': a.barangay || '-',
              'Address': formatAddress(a),
              'Annual Family Income': formatCurrency(a.annualFamilyIncome),
              'No. of Dependents': a.numberOfDependents ?? '-',
              'Remarks': a.remarks || '-',
            }
          })

      case 'skills-training': {
        if (skillsReportType === 'activities') {
          return skillsActivities
            // Period filter on the date the training was conducted
            .filter(act => inSelectedPeriod(act.date))
            .map(act => ({
              'Training Title': act.title || '-',
              'Training Batch': act.service || '-',
              'Date': act.date || '-',
              'Venue': act.location || '-',
              'Facilitator': act.facilitator || '-',
              'Participants': act.assignedCount ?? act.participants ?? 0,
              // Only meaningful once Completed -- attended is still mostly unset
              // for a Planned/Ongoing training, so those show '-' rather than a
              // misleading 0/0 that looks like "nobody attended" instead of
              // "attendance hasn't happened yet".
              'Present': act.status === 'Completed' ? act.presentCount : '-',
              'Absent': act.status === 'Completed' ? act.absentCount : '-',
              'Status': act.status,
              _activityId: act.id, // not rendered as a column — used to export this training's roster
            }))
        }
        return skillsProfiles
          // Period filter on the date the application was received
          .filter(p => inSelectedPeriod(p.dateApplicationReceived))
          .map((p, i) => ({
            'No.': i + 1,
            'Participant Name': `${p.lastName}, ${p.firstName}${p.middleName ? ' ' + p.middleName : ''}`.trim(),
            'Sex': p.sex || '-',
            'Age': p.age || '-',
            'Civil Status': p.civilStatus || '-',
            'Classification': [...(p.classification ?? []), ...(p.classificationOther ?? []).filter(Boolean).map((v: string) => `Others: ${v}`)].join(', ') || '-',
            'Desired Qualification': [...(p.desiredQualification ?? []), ...(p.qualificationOther ?? []).filter(Boolean).map((v: string) => `Others: ${v}`)].join(', ') || '-',
            'Purpose of Training': [...(p.purposeOfTraining ?? []), ...(p.purposeOther ?? []).filter(Boolean).map((v: string) => `Others: ${v}`)].join(', ') || '-',
            'Assigned Training': p.assignedTrainingTitle || '-',
            'Training Status': p.assignedTrainingStatus || '-',
            'Date Applied': p.dateApplicationReceived || '-',
            'Contact Number': p.contactNumber || '-',
            'Street/Purok': p.streetPurok || '-',
            'Barangay': p.barangay || '-',
            'Address': formatAddress(p),
            'Status': p.status,
          }))
      }

      case 'livelihood': {
        if (livelihoodReportType === 'projects') {
          // A specific Program Type shows that program's own real columns with
          // exact field names -- no shared/generic naming and no "-" filler,
          // since every row genuinely comes from one program. Only "All
          // Programs" (below) needs the combined shape, since mixing all four
          // record types is an explicit, opt-in comparison view.
          if (programType === 'DILEEP (DILP)') {
            return dilpProjects
              .filter(p => inSelectedPeriod(p.dateReleased))
              .map((p, i) => ({
                'No.': i + 1,
                'Project ID': p.projectIdNumber || '-',
                'Project Name': p.projectName || '-',
                'Type of Project': p.typeOfProject || '-',
                'Program Component': p.programComponent || '-',
                'Way of Implementation': p.wayOfImplementation || '-',
                'Location': formatAddress({ streetPurok: p.streetPurok, barangay: p.barangay, cityMunicipality: p.cityMunicipality }),
                'Assistance Amount': formatCurrency(p.assistanceAmount),
                'Release Date': p.dateReleased || '-',
                'Beneficiaries Assigned': p.assignedCount ?? 0,
                'Status': p.status,
                _projectId: p.id, // not rendered as a column — used to export this project's beneficiaries
              }))
          }
          if (programType === 'DILEEP (TUPAD)') {
            return tupadProjects
              .filter(p => inSelectedPeriod(p.date))
              .map((p, i) => ({
                'No.': i + 1,
                'Project Title': p.title || '-',
                'Description': p.description || '-',
                'Date': p.date || '-',
                'Location': p.location || '-',
                'Facilitator': p.facilitator || '-',
                'Assistance Amount': formatCurrency(p.assistanceAmount),
                'Release Date': p.dateReleased || '-',
                'Beneficiaries Assigned': p.assignedCount ?? 0,
                'Status': p.status,
                _projectId: p.id, // not rendered as a column — used to export this project's beneficiaries
              }))
          }
          if (programType === 'SLP') {
            return slpProjects
              .filter(p => inSelectedPeriod(p.dateStarted))
              .map((p, i) => ({
                'No.': i + 1,
                'Project Name': p.projectName || '-',
                'SLP Track': p.slpTrack || '-',
                'Description': p.description || '-',
                'Date Started': p.dateStarted || '-',
                'Location': p.location || '-',
                'Facilitator': p.facilitator || '-',
                'Assistance Amount': formatCurrency(p.assistanceAmount),
                'Release Date': p.dateReleased || '-',
                'Beneficiaries Assigned': p.assignedCount ?? 0,
                'Status': p.status,
                _projectId: p.id, // not rendered as a column — used to export this project's beneficiaries
              }))
          }
          if (programType === 'CLPEP') {
            return clpepInterventions
              .filter(p => inSelectedPeriod(p.date))
              .map((p, i) => ({
                'No.': i + 1,
                'Intervention Name': p.interventionName || '-',
                'Category': (p.interventionCategory === 'Others' ? p.interventionCategoryOther : p.interventionCategory) || '-',
                'Description': p.description || '-',
                'Target Beneficiaries': p.targetBeneficiaries || '-',
                'Date': p.date || '-',
                'Location': p.location || '-',
                'Implementing Officer': p.implementingOfficer || '-',
                'Partner Agency': (p.partnerAgency === 'Others' ? p.partnerAgencyOther : p.partnerAgency) || '-',
                'Beneficiaries Assigned': p.assignedCount ?? 0,
                'Status': p.status,
                _projectId: p.id, // not rendered as a column — used to export this intervention's beneficiaries
              }))
          }
          // All Programs — combined view. Unlike the four branches above, these
          // four record types don't share a common shape (e.g. CLPEP has no
          // assistanceAmount/dateReleased -- it's a non-cash intervention program,
          // not an assistance one), so anything a program genuinely doesn't store
          // is left as "-" rather than invented -- unavoidable once four
          // differently-shaped record types are mixed into one table.
          const rows: any[] = [
            ...dilpProjects.map(p => ({
              ...p, _program: 'DILEEP (DILP)', _name: p.projectName,
              _category: [p.typeOfProject, p.programComponent].filter(Boolean).join(' - '),
              _desc: '-', _date: p.dateReleased,
              _location: formatAddress({ streetPurok: p.streetPurok, barangay: p.barangay, cityMunicipality: p.cityMunicipality }),
              _facilitator: '-',
            })),
            ...tupadProjects.map(p => ({
              ...p, _program: 'DILEEP (TUPAD)', _name: p.title, _category: '-',
              _desc: p.description, _date: p.date, _location: p.location, _facilitator: p.facilitator,
            })),
            ...slpProjects.map(p => ({
              ...p, _program: 'SLP', _name: p.projectName, _category: p.slpTrack,
              _desc: p.description, _date: p.dateStarted, _location: p.location, _facilitator: p.facilitator,
            })),
            ...clpepInterventions.map(p => ({
              ...p, _program: 'CLPEP', _name: p.interventionName,
              _category: p.interventionCategory === 'Others' ? p.interventionCategoryOther : p.interventionCategory,
              _desc: p.description, _date: p.date, _location: p.location, _facilitator: p.implementingOfficer,
            })),
          ]
          return rows
            // No Program Type filter needed here -- the four specific-program
            // branches above already handle every non-empty value, so reaching
            // this point means programType is '' (All Programs).
            // Period filter on the project/intervention's own date field -- DILP
            // has no start date (only a release date), so it filters on that instead.
            .filter(p => inSelectedPeriod(p._date))
            .map((p, i) => ({
              'No.': i + 1,
              'Project/Intervention Name': p._name || '-',
              'Program Type': p._program,
              'Category / Track': p._category || '-',
              'Description': p._desc || '-',
              'Date / Start Date': p._date || '-',
              'Location': p._location || '-',
              'Facilitator / Officer': p._facilitator || '-',
              'Assistance Amount': formatCurrency(p.assistanceAmount),
              'Release Date': p.dateReleased || '-',
              'Beneficiaries Assigned': p.assignedCount ?? 0,
              'Status': p.status,
              _projectId: p.id,
            }))
        }
        // Combines the four Livelihood sub-programs (each its own backend-driven
        // context, unlike CDSP/GIP/SPES which are single contexts) into one row
        // shape, joining each applicant to their assigned project/intervention
        // for the fields (assistance amount, release date) that live there —
        // same join pattern GIP/SPES use for batch-level fields above.
        const rows: any[] = [
          ...dilpApplicants.map(a => ({ ...a, _program: 'DILEEP (DILP)', _projectName: a.assignedProjectName, _project: dilpProjects.find(p => p.id === a.assignedProjectId) })),
          ...tupadApplicants.map(a => ({ ...a, _program: 'DILEEP (TUPAD)', _projectName: a.assignedProjectName, _project: tupadProjects.find(p => p.id === a.assignedProjectId) })),
          ...slpApplicants.map(a => ({ ...a, _program: 'SLP', _projectName: a.projectName, _project: slpProjects.find(p => p.id === a.assignedSlpProjectId) })),
          ...clpepApplicants.map(a => ({ ...a, _program: 'CLPEP', _projectName: a.assignedInterventionName, _project: clpepInterventions.find(p => p.id === a.assignedInterventionId) })),
        ]
        return rows
          // Program Type filter (from the dropdown; '' = All Programs)
          .filter(a => !programType || a._program === programType)
          // Period filter on the date the application was received
          .filter(a => inSelectedPeriod(a.dateApplied))
          .map((a, i) => ({
            'No.': i + 1,
            'Beneficiary Name': `${a.lastName}, ${a.firstName}${a.middleName ? ' ' + a.middleName : ''}`.trim(),
            'Sex': a.sex || '-',
            'Age': a.age || '-',
            'Program Type': a._program,
            'Date Applied': a.dateApplied || '-',
            'Civil Status': a.civilStatus || '-',
            'Contact Number': a.contactNumber || '-',
            'Street/Purok': a.streetPurok || '-',
            'Barangay': a.barangay || '-',
            'Address': formatAddress(a),
            'Assigned Project/Intervention': a._projectName || '-',
            'Assistance Amount': formatCurrency(a._project?.assistanceAmount),
            'Release Date': a._project?.dateReleased || '-',
            'Status': a.status,
            'Remarks': a.remarks || '-',
          }))
      }

      case 'ofw-services':
        return ofwProfiles
          // Period filter on the date the request was filed
          .filter(p => inSelectedPeriod(p.dateFiled))
          .map((p, i) => ({
            'No.': i + 1,
            'OFW Name': p.name,
            'Sex': p.sex || '-',
            'Civil Status': p.civilStatus || '-',
            'Contact Number': p.contactNumber || '-',
            'Email': p.email || '-',
            'Address': p.address || '-',
            'Barangay': p.barangay || '-',
            'Municipality': p.municipality || '-',
            'Type of Request': p.typeOfRequest.join(', '),
            'Employment Status': p.employmentStatus,
            'Desired Position': p.desiredPosition || '-',
            'Type of Skill': p.typeOfSkill || '-',
            'Agencies': p.agencies?.length ? p.agencies.join(', ') : '-',
            'Date Filed': p.dateFiled,
            'Status': p.status,
            'Remarks': p.remarks || '-',
          }))

      // 'general-peso' is handled entirely by handleGenerateGeneralPesoReport()
      // (a live backend call, since it aggregates across every program's real
      // data) — handleGenerateReport short-circuits to it before ever reaching
      // generateData(), the same way Employment Facilitation short-circuits to
      // handleGeneratePesoReport().
      default:
        return []
    }
  }

  // Participant-program summary (CDSP / GIP / SPES): total participants, a breakdown
  // grouped by the given column, and a male/female split. `groupLabel` is shown as the
  // breakdown heading (e.g. "Participants by Program Type" / "…by Assigned Office").
  const generateProgramAnalytics = (rows: any[], groupCol: string, groupLabel: string, allGroups?: string[]) => {
    const groupMap: Record<string, number> = {}
    allGroups?.forEach(g => { groupMap[g] = 0 })
    let male = 0, female = 0
    rows.forEach(r => {
      const g = r[groupCol] && r[groupCol] !== '-' ? r[groupCol] : 'Unspecified'
      groupMap[g] = (groupMap[g] || 0) + 1
      const s = String(r['Sex'] || '').toLowerCase()
      if (s === 'male') male++
      else if (s === 'female') female++
    })
    const byGroup = Object.entries(groupMap).map(([group, value]) => ({ group, value })).sort((a, b) => b.value - a.value)
    return { total: rows.length, byGroup, groupLabel, male, female }
  }


  const [pesoLoading, setPesoLoading] = useState(false)

  // PESO LMI/SPRS report — pulled from LIVE data, exported as the official
  // 4-sheet .xlsx. Supports Monthly / Annual / Custom Range periods.
  const handleGeneratePesoReport = async () => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December']
    // label = short period (chart title / "Period Covered" / filename);
    // phrase = the "For the …" line on the Monitoring Form sheets, grammar per mode.
    let from: string, to: string, label: string, phrase: string
    if (reportPeriod === 'annual') {
      from = `${year}-01-01`; to = `${year}-12-31`; label = `Year ${year}`; phrase = `For the Year ${year}`
    } else if (reportPeriod === 'custom') {
      if (!fromDate || !toDate) { setInfoModal({ isOpen: true, title: 'Error', message: 'Please select a From and To date.' }); return }
      from = fromDate; to = toDate
      const rangeLabel = `${formatLongDate(fromDate)} to ${formatLongDate(toDate)}`
      label = rangeLabel; phrase = `For the period ${rangeLabel}`
    } else {
      const m = Number(month)
      const lastDay = new Date(Number(year), m, 0).getDate()
      from = `${year}-${month}-01`
      to = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
      label = `${monthNames[m - 1]} ${year}`; phrase = `For the Month of ${label}`
    }
    setPesoLoading(true)
    try {
      const data = await fetchEfReport(from, to)
      await generatePesoMonthlyReport(data, label, phrase)
    } catch (err: unknown) {
      const msg = err instanceof Error && err.message ? err.message : 'Failed to generate the PESO report.'
      setInfoModal({ isOpen: true, title: 'Error', message: msg })
    } finally {
      setPesoLoading(false)
    }
  }

  // General PESO Report — cross-program summary pulled LIVE from the backend
  // (/reports/summary), scoped to whichever programs the user picked in the
  // "Include Programs" selector. Unlike Employment Facilitation, this DOES get
  // an on-screen preview (a per-program table + the usual Excel/CSV/PDF export
  // menu) — only the Excel format is special-cased later, to carry a real
  // native chart instead of the generic ExcelJS table.
  const handleGenerateGeneralPesoReport = async () => {
    if (selectedGeneralPrograms.length === 0) {
      setInfoModal({ isOpen: true, title: 'Error', message: 'Select at least one program to include.' })
      return
    }
    let from: string, to: string
    if (reportPeriod === 'annual') {
      from = `${year}-01-01`; to = `${year}-12-31`
    } else if (reportPeriod === 'custom') {
      if (!fromDate || !toDate) { setInfoModal({ isOpen: true, title: 'Error', message: 'Please select a From and To date.' }); return }
      from = fromDate; to = toDate
    } else {
      const m = Number(month)
      const lastDay = new Date(Number(year), m, 0).getDate()
      from = `${year}-${month}-01`
      to = `${year}-${month}-${String(lastDay).padStart(2, '0')}`
    }
    setGeneralPesoLoading(true)
    try {
      const result = await fetchGeneralPesoReport(from, to, selectedGeneralPrograms)
      const columns = GENERAL_PESO_COLUMNS
      const data = result.programs.map(r => ({
        'Program / Service': r.program,
        'Participants': r.participants,
        'Male': r.male,
        'Female': r.female,
        'Activities Conducted': r.activities ?? '-',
        'Placements': r.placements ?? '-',
      }))
      const initialColumns: Record<string, boolean> = {}
      columns.forEach(col => { initialColumns[col] = true })
      setVisibleColumns(initialColumns)
      setPreviewPage(1)

      const totalParticipants = result.programs.reduce((s, r) => s + r.participants, 0)
      const totalMale = result.programs.reduce((s, r) => s + r.male, 0)
      const totalFemale = result.programs.reduce((s, r) => s + r.female, 0)
      const barChartData = result.programs
        .map(r => ({ program: r.program, value: r.participants }))
        .sort((a, b) => b.value - a.value)
      const pieChartData = result.programs
        .filter(r => r.participants > 0)
        .map(r => ({
          program: r.program,
          value: totalParticipants > 0 ? parseFloat(((r.participants / totalParticipants) * 100).toFixed(1)) : 0,
          color: GENERAL_PESO_PROGRAM_COLORS[r.program] || '#94A3B8',
        }))
      // Same {total, byGroup, groupLabel, male, female} shape generateProgramAnalytics()
      // returns for CDSP/GIP/SPES/etc, so the on-screen Summary card, Excel Summary
      // sheet, and PDF summary block all render this the same way as every other
      // category — plus barChartData/pieChartData for the extra cross-program chart.
      const analytics = {
        total: totalParticipants,
        male: totalMale,
        female: totalFemale,
        byGroup: result.programs.map(r => ({ group: r.program, value: r.participants })),
        groupLabel: 'Participants by Program',
        barChartData,
        pieChartData,
      }

      setGeneratedReport({
        category: 'general-peso' as ReportCategory,
        categoryName: 'General PESO Report',
        programType: '',
        period: reportPeriod,
        periodDetails: getPeriodDetails(),
        columns,
        data,
        analytics,
        generalPrograms: result.programs, // raw per-program rows, used by the native-chart Excel export
      })
    } catch (err: unknown) {
      const msg = err instanceof Error && err.message ? err.message : 'Failed to generate the report.'
      setInfoModal({ isOpen: true, title: 'Error', message: msg })
    } finally {
      setGeneralPesoLoading(false)
    }
  }

  // Skills Training Aging Report — live from the backend (not period-scoped;
  // see SKILLS_AGING_COLUMNS). "Employment Status" + the day-bucket group a
  // placed beneficiary as "Placed" regardless of how long ago they finished,
  // since aging is about people who are STILL waiting, not everyone ever.
  const handleGenerateSkillsAgingReport = async () => {
    setSkillsAgingLoading(true)
    try {
      const rows = await fetchSkillsAgingReport()
      // Computed once per row and reused for both the bucket tally below and the
      // "Time Since Completion" cell's color highlight, so the two never disagree.
      const rowBucket = (r: SkillsAgingRow) => r.placed ? 'Placed' : agingBucket(monthsSince(r.completedDate))
      const data = rows.map((r, i) => ({
        'No.': i + 1,
        'Participant Name': r.name,
        'Trainings Completed': r.trainingsCompleted,
        'Last Completed Training': r.lastCompletedTrainingTitle,
        'Completed Date': r.completedDate,
        'Time Since Completion': r.placed ? '-' : relativeSince(r.completedDate),
        'Employment Status': r.placed ? 'Placed' : 'Not Yet Placed',
        'Job Title': r.jobTitle || '-',
        'Employer': r.employer || '-',
        'Date Hired': r.dateHired || '-',
        _agingBucket: rowBucket(r), // not a rendered column -- drives the "Time Since Completion" cell color
      }))
      const columns = SKILLS_AGING_COLUMNS
      const initialColumns: Record<string, boolean> = {}
      columns.forEach(col => { initialColumns[col] = true })
      setVisibleColumns(initialColumns)
      setPreviewPage(1)

      // Fixed bucket order (Placed last) rather than sorted by count, so the
      // progression from "just finished" to "long overdue" reads left to right.
      // Seeded to 0 up front so an empty bucket still shows on the chart/breakdown
      // instead of silently disappearing (matches generateProgramAnalytics's
      // allGroups seeding for CDSP/Livelihood above).
      const bucketOrder: string[] = AGING_BUCKET_ORDER
      const groupMap: Record<string, number> = {}
      const maleByGroup: Record<string, number> = {}
      const femaleByGroup: Record<string, number> = {}
      bucketOrder.forEach(g => { groupMap[g] = 0; maleByGroup[g] = 0; femaleByGroup[g] = 0 })
      let male = 0, female = 0
      rows.forEach(r => {
        const bucket = rowBucket(r)
        groupMap[bucket] += 1
        const s = String(r.sex || '').toLowerCase()
        if (s === 'male') { male++; maleByGroup[bucket] += 1 }
        else if (s === 'female') { female++; femaleByGroup[bucket] += 1 }
      })
      const byGroup = bucketOrder.map(group => ({ group, value: groupMap[group] }))
      // Per-bucket sex split -- feeds the Excel export's stacked-by-sex native
      // bar chart (see the Aging Report's Excel export handling below). Not
      // used by the on-screen/PDF charts, which stay single-series.
      const byGroupBySex = bucketOrder.map(group => ({ group, male: maleByGroup[group], female: femaleByGroup[group] }))
      const barChartData = byGroup
      const totalForPie = rows.length
      const pieChartData = byGroup
        .filter(g => g.value > 0)
        .map(g => ({ group: g.group, value: totalForPie > 0 ? parseFloat(((g.value / totalForPie) * 100).toFixed(1)) : 0, color: AGING_BUCKET_COLORS[g.group] }))
      const placedCount = groupMap['Placed']
      const notPlacedCount = rows.length - placedCount
      const analytics = { total: rows.length, byGroup, byGroupBySex, groupLabel: 'Beneficiaries by Status', male, female, barChartData, pieChartData, placedCount, notPlacedCount }

      setGeneratedReport({
        category: 'skills-training' as ReportCategory,
        categoryName: 'Skills Training',
        skillsReportType: 'aging' as const,
        programType: '',
        period: reportPeriod,
        periodDetails: `As of ${formatLongDate(todayIso)}`,
        columns,
        data,
        analytics,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error && err.message ? err.message : 'Failed to generate the Aging Report.'
      setInfoModal({ isOpen: true, title: 'Error', message: msg })
    } finally {
      setSkillsAgingLoading(false)
    }
  }

  // CDSP Aging Report — same shape as Skills Training's, plus a sub-service
  // dimension (Career Coaching / Pre-Employment Coaching / Labor Employment
  // for Graduating Students) CDSP has and Skills Training doesn't. The
  // existing "Program Type" dropdown (already shown for every CDSP report
  // type) doubles as the sub-service filter here -- picking one scopes the
  // whole report to it; "All Programs" shows everyone plus a by-sub-service
  // breakdown table, the same "breakdown only when nothing's filtered" rule
  // every other CDSP/Livelihood report already follows.
  const handleGenerateCdspAgingReport = async () => {
    setCdspAgingLoading(true)
    try {
      const allRows = await fetchCdspAgingReport()
      const rows = programType ? allRows.filter(r => r.subService === programType) : allRows
      const rowBucket = (r: CdspAgingRow) => r.placed ? 'Placed' : agingBucket(monthsSince(r.completedDate))
      const data = rows.map((r, i) => ({
        'No.': i + 1,
        'Participant Name': r.name,
        'Sub-Service': r.subService,
        'Activities Completed': r.activitiesCompleted,
        'Last Completed Activity': r.lastCompletedActivityTitle,
        'Completed Date': r.completedDate,
        'Time Since Completion': r.placed ? '-' : relativeSince(r.completedDate),
        'Employment Status': r.placed ? 'Placed' : 'Not Yet Placed',
        'Job Title': r.jobTitle || '-',
        'Employer': r.employer || '-',
        'Date Hired': r.dateHired || '-',
        _agingBucket: rowBucket(r), // not a rendered column -- drives the "Time Since Completion" cell color
      }))
      const columns = CDSP_AGING_COLUMNS
      const initialColumns: Record<string, boolean> = {}
      columns.forEach(col => { initialColumns[col] = true })
      setVisibleColumns(initialColumns)
      setPreviewPage(1)

      const bucketOrder: string[] = AGING_BUCKET_ORDER
      const groupMap: Record<string, number> = {}
      const maleByGroup: Record<string, number> = {}
      const femaleByGroup: Record<string, number> = {}
      bucketOrder.forEach(g => { groupMap[g] = 0; maleByGroup[g] = 0; femaleByGroup[g] = 0 })
      // Only meaningful ("All Programs") -- with one sub-service already
      // selected, every row already belongs to it, so this would just repeat
      // the Total below as a single 100% bar. Seeded with every known
      // sub-service at 0 first so one with no completions yet still shows
      // up in the table/report instead of silently disappearing.
      const subServiceMap: Record<string, number> = {}
      cdspPrograms.forEach(p => { subServiceMap[p] = 0 })
      let male = 0, female = 0
      rows.forEach(r => {
        const bucket = rowBucket(r)
        groupMap[bucket] += 1
        subServiceMap[r.subService] = (subServiceMap[r.subService] || 0) + 1
        const s = String(r.sex || '').toLowerCase()
        if (s === 'male') { male++; maleByGroup[bucket] += 1 }
        else if (s === 'female') { female++; femaleByGroup[bucket] += 1 }
      })
      const byGroup = bucketOrder.map(group => ({ group, value: groupMap[group] }))
      const byGroupBySex = bucketOrder.map(group => ({ group, male: maleByGroup[group], female: femaleByGroup[group] }))
      const byGroupBySubService = Object.entries(subServiceMap).map(([group, value]) => ({ group, value }))
      const barChartData = byGroup
      const totalForPie = rows.length
      const pieChartData = byGroup
        .filter(g => g.value > 0)
        .map(g => ({ group: g.group, value: totalForPie > 0 ? parseFloat(((g.value / totalForPie) * 100).toFixed(1)) : 0, color: AGING_BUCKET_COLORS[g.group] }))
      const placedCount = groupMap['Placed']
      const notPlacedCount = rows.length - placedCount
      const analytics = {
        total: rows.length, byGroup, byGroupBySex, byGroupBySubService, groupLabel: 'Beneficiaries by Status',
        male, female, barChartData, pieChartData, placedCount, notPlacedCount,
      }

      setGeneratedReport({
        category: 'cdsp' as ReportCategory,
        categoryName: 'CDSP',
        cdspReportType: 'aging' as const,
        programType,
        period: reportPeriod,
        periodDetails: `As of ${formatLongDate(todayIso)}`,
        columns,
        data,
        analytics,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error && err.message ? err.message : 'Failed to generate the Aging Report.'
      setInfoModal({ isOpen: true, title: 'Error', message: msg })
    } finally {
      setCdspAgingLoading(false)
    }
  }

  // GIP Aging Report — same shape as Skills Training's (no sub-service
  // dimension, no "X Completed" count column, since GIP is one-shot).
  const handleGenerateGipAgingReport = async () => {
    setGipAgingLoading(true)
    try {
      const rows = await fetchGipAgingReport()
      const rowBucket = (r: GipAgingRow) => r.placed ? 'Placed' : agingBucket(monthsSince(r.completedDate))
      const data = rows.map((r, i) => ({
        'No.': i + 1,
        'Participant Name': r.name,
        'Last Completed Workplace/Office': r.lastCompletedWorkplaceTitle,
        'Completed Date': r.completedDate,
        'Time Since Completion': r.placed ? '-' : relativeSince(r.completedDate),
        'Employment Status': r.placed ? 'Placed' : 'Not Yet Placed',
        'Job Title': r.jobTitle || '-',
        'Employer': r.employer || '-',
        'Date Hired': r.dateHired || '-',
        _agingBucket: rowBucket(r),
      }))
      const columns = GIP_AGING_COLUMNS
      const initialColumns: Record<string, boolean> = {}
      columns.forEach(col => { initialColumns[col] = true })
      setVisibleColumns(initialColumns)
      setPreviewPage(1)

      const bucketOrder: string[] = AGING_BUCKET_ORDER
      const groupMap: Record<string, number> = {}
      const maleByGroup: Record<string, number> = {}
      const femaleByGroup: Record<string, number> = {}
      bucketOrder.forEach(g => { groupMap[g] = 0; maleByGroup[g] = 0; femaleByGroup[g] = 0 })
      let male = 0, female = 0
      rows.forEach(r => {
        const bucket = rowBucket(r)
        groupMap[bucket] += 1
        const s = String(r.sex || '').toLowerCase()
        if (s === 'male') { male++; maleByGroup[bucket] += 1 }
        else if (s === 'female') { female++; femaleByGroup[bucket] += 1 }
      })
      const byGroup = bucketOrder.map(group => ({ group, value: groupMap[group] }))
      const byGroupBySex = bucketOrder.map(group => ({ group, male: maleByGroup[group], female: femaleByGroup[group] }))
      const barChartData = byGroup
      const totalForPie = rows.length
      const pieChartData = byGroup
        .filter(g => g.value > 0)
        .map(g => ({ group: g.group, value: totalForPie > 0 ? parseFloat(((g.value / totalForPie) * 100).toFixed(1)) : 0, color: AGING_BUCKET_COLORS[g.group] }))
      const placedCount = groupMap['Placed']
      const notPlacedCount = rows.length - placedCount
      const analytics = { total: rows.length, byGroup, byGroupBySex, groupLabel: 'Beneficiaries by Status', male, female, barChartData, pieChartData, placedCount, notPlacedCount }

      setGeneratedReport({
        category: 'gip' as ReportCategory,
        categoryName: 'GIP',
        gipReportType: 'aging' as const,
        programType: '',
        period: reportPeriod,
        periodDetails: `As of ${formatLongDate(todayIso)}`,
        columns,
        data,
        analytics,
      })
    } catch (err: unknown) {
      const msg = err instanceof Error && err.message ? err.message : 'Failed to generate the Aging Report.'
      setInfoModal({ isOpen: true, title: 'Error', message: msg })
    } finally {
      setGipAgingLoading(false)
    }
  }

  const handleGenerateReport = () => {
    if (!reportCategory) return
    // Employment Facilitation generates the official PESO/LMI report (live data,
    // downloaded as the 4-sheet .xlsx) rather than the generic on-screen view.
    if (reportCategory === 'employment-facilitation') { handleGeneratePesoReport(); return }
    // Skills Training's Aging Report needs its own live backend join (job
    // placements aren't loaded into any context), same shape as General PESO below.
    if (reportCategory === 'skills-training' && skillsReportType === 'aging') { handleGenerateSkillsAgingReport(); return }
    // CDSP's Aging Report needs the same kind of live backend join.
    if (reportCategory === 'cdsp' && cdspReportType === 'aging') { handleGenerateCdspAgingReport(); return }
    // GIP's Aging Report needs the same kind of live backend join.
    if (reportCategory === 'gip' && gipReportType === 'aging') { handleGenerateGipAgingReport(); return }
    // General PESO Report aggregates live across every selected program on the
    // backend — it does get an on-screen preview (unlike EF above), so it can't
    // just short-circuit to a download, but it does need its own async fetch.
    if (reportCategory === 'general-peso') { handleGenerateGeneralPesoReport(); return }
    const columns = getReportColumns(reportCategory)
    const data = generateData(reportCategory)
    // Default columns are visible; optional ones start hidden (toggle via Columns menu).
    const defaults = getDefaultColumns(reportCategory)
    const initialColumns: Record<string, boolean> = {}
    columns.forEach(col => { initialColumns[col] = defaults.includes(col) })
    setVisibleColumns(initialColumns)
    setPreviewPage(1) // start a freshly generated report on the first page
    let analytics = null
    // Activity List rows are per-activity, not per-participant, so the
    // participant-level Sex/Program breakdown below doesn't apply — skip analytics.
    if (reportCategory === 'cdsp' && cdspReportType === 'participants') analytics = generateProgramAnalytics(data, 'Program Type', 'Participants by Program Type', cdspPrograms)
    // Batch List rows are per-batch, not per-intern, so the participant-level
    // Sex/Assigned Office breakdown below doesn't apply — skip analytics.
    else if (reportCategory === 'gip' && gipReportType === 'participants') analytics = generateProgramAnalytics(data, 'Assigned Office', 'Participants by Assigned Office')
    // Batch List rows are per-batch, not per-student, so the participant-level
    // Sex/Employer breakdown below doesn't apply — skip analytics.
    else if (reportCategory === 'spes' && spesReportType === 'participants') analytics = generateProgramAnalytics(data, 'Employer', 'Participants by Employer')
    // Project/Intervention List rows are per-project, not per-beneficiary, so the
    // beneficiary-level Sex/Program breakdown below doesn't apply — skip analytics.
    else if (reportCategory === 'livelihood' && livelihoodReportType === 'beneficiaries') analytics = generateProgramAnalytics(data, 'Program Type', 'Beneficiaries by Program Type', livelihoodPrograms)
    // Activity List rows are per-training, not per-participant, so the
    // participant-level Sex/Assigned Training breakdown below doesn't apply — skip analytics.
    else if (reportCategory === 'skills-training' && skillsReportType === 'participants') analytics = generateProgramAnalytics(data, 'Assigned Training', 'Participants by Assigned Training')
    // OFW has no separate Activity/Batch List — every row is a request, so this always applies.
    else if (reportCategory === 'ofw-services') analytics = generateProgramAnalytics(data, 'Employment Status', 'Participants by Employment Status')
    // Employment Facilitation is handled earlier (downloads the PESO Excel) and
    // never reaches here, so it has no on-screen analytics branch.
    setGeneratedReport({
      category: reportCategory,
      categoryName: REPORT_CATEGORIES.find(c => c.id === reportCategory)?.name,
      programType,
      cdspReportType,
      gipReportType,
      spesReportType,
      livelihoodReportType,
      skillsReportType,
      period: reportPeriod,
      periodDetails: getPeriodDetails(),
      columns,
      data,
      analytics,
    })
  }

  // Parses "YYYY-MM-DD" into local-date parts (rather than `new Date(str)`, which
  // reads it as UTC midnight and can shift the displayed day by one depending on
  // the viewer's timezone) and spells it out to match the Monthly/Annual style.
  const formatLongDate = (dateStr: string) => {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const getPeriodDetails = () => {
    if (reportPeriod === 'monthly') return `${months.find(m => m.value === month)?.label} ${year}`
    if (reportPeriod === 'annual') return `Year ${year}`
    return `${formatLongDate(fromDate)} to ${formatLongDate(toDate)}`
  }

  const toggleColumn = (column: string) => {
    setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }))
  }

  const createBarChartImage = (data: any[]): Promise<string> => new Promise(resolve => {
    const canvas = document.createElement('canvas')
    canvas.width = 800; canvas.height = 400
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 800, 400)
    const padding = 60, chartWidth = 800 - padding * 2, barHeight = 35, barSpacing = 15
    const maxValue = Math.max(...data.map(d => d.value), 1)
    data.forEach((item, i) => {
      const bw = (item.value / maxValue) * (chartWidth - 150)
      const y = padding + i * (barHeight + barSpacing)
      ctx.fillStyle = '#0077BE'; ctx.fillRect(padding + 150, y, bw, barHeight)
      ctx.fillStyle = '#374151'; ctx.font = '12px Arial'; ctx.textAlign = 'right'
      ctx.fillText(item.program, padding + 140, y + barHeight / 2 + 5)
      ctx.fillStyle = '#1F2937'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'left'
      ctx.fillText(item.value.toString(), padding + 155 + bw, y + barHeight / 2 + 5)
    })
    resolve(canvas.toDataURL('image/png'))
  })

  // title is optional -- existing callers that don't pass one keep the
  // original untitled layout unchanged (see createHorizontalBarChartImage above).
  const createPieChartImage = (data: any[], title?: string): Promise<string> => new Promise(resolve => {
    const canvas = document.createElement('canvas')
    canvas.width = 800; canvas.height = 450
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 800, 450)
    const cy = title ? 245 : 225
    if (title) {
      ctx.fillStyle = '#1F2937'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'
      ctx.fillText(title, 400, 30)
    }
    let angle = -Math.PI / 2
    data.forEach(item => {
      const slice = (item.value / 100) * 2 * Math.PI
      ctx.beginPath(); ctx.moveTo(250, cy)
      ctx.arc(250, cy, 150, angle, angle + slice)
      ctx.closePath(); ctx.fillStyle = item.color; ctx.fill()
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke()
      angle += slice
    })
    let legendY = 100
    data.forEach(item => {
      ctx.fillStyle = item.color; ctx.fillRect(450, legendY - 10, 15, 15)
      ctx.fillStyle = '#374151'; ctx.font = '12px Arial'; ctx.textAlign = 'left'
      ctx.fillText(`${item.program || item.status || item.group} - ${item.value.toFixed(1)}%`, 475, legendY + 2)
      legendY += 30
    })
    resolve(canvas.toDataURL('image/png'))
  })

  // title is optional (existing callers pass '' and get the original untitled
  // layout unchanged) -- when given, it's drawn at the top and the bars shift
  // down to make room, so the chart image is self-explanatory even viewed on
  // its own (e.g. pasted elsewhere), not just when its external heading is visible.
  const createHorizontalBarChartImage = (data: any[], title: string, color: string): Promise<string> => new Promise(resolve => {
    const canvas = document.createElement('canvas')
    canvas.width = 800; canvas.height = 350
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 800, 350)
    const topOffset = title ? 34 : 0
    if (title) {
      ctx.fillStyle = '#1F2937'; ctx.font = 'bold 16px Arial'; ctx.textAlign = 'center'
      ctx.fillText(title, 400, 24)
    }
    const padding = 60, chartWidth = 800 - padding * 2, barHeight = 35, barSpacing = 15
    const maxValue = Math.max(...data.map(d => d.value), 1)
    data.forEach((item, i) => {
      const bw = (item.value / maxValue) * (chartWidth - 200)
      const y = topOffset + padding + i * (barHeight + barSpacing)
      ctx.fillStyle = color; ctx.fillRect(padding + 200, y, bw, barHeight)
      ctx.fillStyle = '#374151'; ctx.font = '12px Arial'; ctx.textAlign = 'right'
      ctx.fillText(item.month || item.jobTitle || item.employer || item.group, padding + 190, y + barHeight / 2 + 5)
      ctx.fillStyle = '#1F2937'; ctx.font = 'bold 12px Arial'; ctx.textAlign = 'left'
      ctx.fillText(item.value.toString(), padding + 205 + bw, y + barHeight / 2 + 5)
    })
    resolve(canvas.toDataURL('image/png'))
  })

  // Report titles show the spelled-out program name alongside its abbreviation
  // (e.g. "Career Development and Services Program (CDSP)"), matching the naming
  // convention used on the CDSP page itself — sourced from the `services` table
  // rather than hardcoded, so it stays correct if the program name ever changes.
  const reportDisplayTitle = (categoryId: string, shortName?: string): string => {
    if (categoryId === 'cdsp' && cdspProgramInfo) return `${cdspProgramInfo.name} (${cdspProgramInfo.code})`
    return shortName ?? ''
  }

  const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
    if (!generatedReport) return
    const filteredData = generatedReport.data.map((row: any) => {
      const f: any = {}
      // _agingBucket is a hidden helper (Aging Report only), never a toggleable
      // column, so it always passes through regardless of visibleColumns.
      Object.keys(row).forEach(k => { if (visibleColumns[k] || k === '_agingBucket') f[k] = row[k] })
      return f
    })
    const isAgingReport = isGeneratedReportAging
    // Report-type suffix so the filename alone tells you Participant List vs.
    // Activity/Batch List — without it, e.g. CDSP's two report types produce
    // identically-named files and silently overwrite each other on disk.
    const reportTypeSuffix =
      generatedReport.category === 'cdsp' ? (generatedReport.cdspReportType === 'sessions' ? 'Activity_List' : generatedReport.cdspReportType === 'aging' ? 'Aging_Report' : 'Participant_List') :
      generatedReport.category === 'gip'  ? (generatedReport.gipReportType === 'batches' ? 'Workplace_List' : generatedReport.gipReportType === 'aging' ? 'Aging_Report' : 'Participant_List') :
      generatedReport.category === 'spes' ? (generatedReport.spesReportType === 'batches' ? 'Batch_List' : 'Participant_List') :
      generatedReport.category === 'livelihood' ? (generatedReport.livelihoodReportType === 'projects' ? `${livelihoodUnitLabel(generatedReport.programType).plural.replace('/', '_')}_List` : 'Beneficiary_List') :
      generatedReport.category === 'skills-training' ? (generatedReport.skillsReportType === 'activities' ? 'Training_List' : generatedReport.skillsReportType === 'aging' ? 'Aging_Report' : 'Participant_List') :
      ''
    const fileName = [generatedReport.categoryName, reportTypeSuffix, generatedReport.periodDetails]
      .filter(Boolean).join('_').replace(/ /g, '_')

    // General PESO Report's Excel export carries a REAL native Excel chart
    // (built by patching a template workbook, the same technique the PESO/LMI
    // report uses for its own charts) rather than ExcelJS's plain data — so it
    // needs its own generator instead of the generic ExcelJS path below.
    if (format === 'excel' && generatedReport.category === 'general-peso') {
      await generateGeneralPesoWorkbook(generatedReport.generalPrograms, generatedReport.analytics, generatedReport.periodDetails, fileName)
      return
    }

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook()
      const THIN = { style: 'thin' as const, color: { argb: 'FFD9D9D9' } }
      const BORDERS = { top: THIN, left: THIN, bottom: THIN, right: THIN }
      // Set below (Aging Report only) once the Summary sheet's "Beneficiaries by
      // Status" table row positions are known -- consumed after wb.xlsx.writeBuffer()
      // to graft in real native Excel charts (see skillsAgingChart.ts) in place of
      // the picture-based charts every other report format still uses.
      let agingChartOptions: AgingChartOptions | null = null

      // Print setup for a report meant to be printed/submitted: Folio ("long", 8.5×13"),
      // landscape, scaled to fit all columns across one page width, header row repeated.
      const applyPrint = (ws: ExcelJS.Worksheet, repeatHeader = false) => {
        ws.pageSetup = {
          paperSize: 14 as ExcelJS.PaperSize, // 14 = Folio / Long bond (8.5 × 13") — not in exceljs's PaperSize enum, but a valid OOXML code
          orientation: 'landscape',
          fitToPage: true,
          fitToWidth: 1,
          fitToHeight: 0, // unlimited pages tall; rows flow down
          margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 },
        }
        if (repeatHeader) ws.pageSetup.printTitlesRow = '1:1'
      }

      // A properly-formatted data table: ALL-CAPS, bold, centered header (plain, no
      // fill); bordered cells; auto-fit column widths; frozen header row.
      // cellFill is optional -- only the Aging Report uses it, to highlight the
      // "Time Since Completion" cell with its bucket color (matches the on-screen
      // table and the chart). Returns a hex color, or undefined for no fill.
      const addTable = (ws: ExcelJS.Worksheet, cols: string[], rows: any[], cellFill?: (col: string, row: any) => string | undefined) => {
        const header = ws.addRow(cols.map(c => c.toUpperCase()))
        header.height = 20
        header.eachCell(cell => {
          cell.font = { bold: true, size: 11 }
          // No wrapText → headers always stay on ONE line.
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          cell.border = BORDERS
        })
        rows.forEach(row => {
          // Matches the "-" placeholder the PDF/on-screen table use for missing
          // values (typeof-number guard first, so a legitimate 0 isn't blanked) --
          // otherwise the Excel sheet shows an empty cell where PDF/preview show "-".
          const r = ws.addRow(cols.map(c => { const v = row[c]; return typeof v === 'number' ? v : (v || '-') }))
          r.eachCell((cell, colIdx) => {
            cell.border = BORDERS; cell.alignment = { vertical: 'middle' }
            const fillColor = cellFill?.(cols[colIdx - 1], row)
            if (fillColor) {
              cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${fillColor.replace('#', '')}` } }
              cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
            }
          })
        })
        cols.forEach((c, i) => {
          let dataMax = 0
          rows.forEach(row => { const v = String(row[c] ?? ''); if (v.length > dataMax) dataMax = v.length })
          // Column is wide enough for its bold, uppercased header (needs a little
          // extra room) AND its widest value — so the header never wraps. Floor of 6
          // (not 10) so short columns like "No." don't get padded far wider than
          // their single- or double-digit values actually need.
          ws.getColumn(i + 1).width = Math.min(Math.max(c.length + 4, dataMax + 2, 6), 60)
        })
        ws.views = [{ state: 'frozen', ySplit: 1 }]
        applyPrint(ws, true) // repeat the header row on each printed page
      }

      // Participant-program summary sheet (CDSP / GIP / SPES / Livelihood / Skills
      // Training / OFW) — matches the on-screen Summary.
      if (generatedReport.analytics && ['cdsp', 'gip', 'spes', 'livelihood', 'skills-training', 'ofw-services'].includes(generatedReport.category)) {
        const a = generatedReport.analytics
        const groupHeaderLabel = a.groupLabel.toUpperCase()
        const groupColHeader = a.groupLabel.replace(/^Participants by /i, '').replace(/^Beneficiaries by /i, '')
        // Breakdown by program is only meaningful when viewing all programs — see
        // matching note on the on-screen summary.
        const hasProgramTypeFilter = ['cdsp', 'livelihood'].includes(generatedReport.category)
        // For every OTHER report, byGroup means "count by program type" -- hiding
        // it once a specific program is already selected avoids a redundant single
        // 100% bar. For Aging, byGroup means the aging BUCKETS instead, which stay
        // meaningful (and are what the native chart reads from) no matter which
        // sub-service is selected -- so Aging always shows it.
        const showBreakdown = isAgingReport || !hasProgramTypeFilter || !generatedReport.programType
        // Skills Training's/CDSP's Participant List and Aging Report both fall into
        // this same generic Summary sheet, so a bare "SKILLS TRAINING SUMMARY" /
        // "CDSP SUMMARY" title can't tell them apart -- Aging gets its own explicit suffix.
        const isAgingSummary = isAgingReport
        const summaryTitle = `${String(generatedReport.categoryName).toUpperCase()}${isAgingSummary ? ' AGING REPORT' : ''} SUMMARY`
        const aoa: any[][] = [
          [summaryTitle], [],
          ...(generatedReport.category === 'cdsp' && cdspProgramInfo ? [['Program', reportDisplayTitle('cdsp')]] : []),
          ['Report Period', generatedReport.periodDetails],
          // Program Type filter only applies to CDSP/Livelihood; GIP/SPES have no such filter.
          ...(hasProgramTypeFilter ? [['Program Type', generatedReport.programType || (generatedReport.category === 'cdsp' ? cdspPrograms : livelihoodPrograms).join(', ')]] : []), [],
          ['Total Participants', a.total],
          ['Male', a.male],
          ['Female', a.female], [],
          ...(showBreakdown ? [[groupHeaderLabel], [groupColHeader, 'Participants'], ...a.byGroup.map((d: any) => [d.group, d.value])] : []),
        ]
        // Row positions of the table just pushed above -- captured right here,
        // before anything else is appended, so this can't be thrown off by
        // whatever gets added after it (e.g. the sex-breakdown table below).
        const groupTableCategoryStartRow = aoa.length - a.byGroup.length + 1
        const groupTableSeriesNameRow = groupTableCategoryStartRow - 1

        // Aging Report only: a second small table breaking each bucket down by
        // sex, feeding the Excel export's stacked-by-sex native bar chart below
        // (the on-screen/PDF bar charts stay single-series -- this table exists
        // purely as real cells for that one native chart to read from).
        if (isAgingSummary) {
          aoa.push(
            [], ['BENEFICIARIES BY STATUS AND SEX'], ['Status', 'Male', 'Female'],
            ...a.byGroupBySex.map((d: any) => [d.group, d.male, d.female]),
          )
        }
        // Same pattern as groupTableCategoryStartRow above, applied at this
        // later point now that the sex table has actually been appended -- MUST
        // be captured here, before anything else (e.g. the sub-service table
        // below) appends further and throws off aoa.length.
        const sexTableCategoryStartRow = aoa.length - a.byGroupBySex.length + 1
        // CDSP Aging only: a plain text breakdown by sub-service (Career Coaching /
        // Pre-Employment Coaching / Labor Employment for Graduating Students) --
        // only meaningful with "All Programs" selected, same rule as showBreakdown
        // above. Not fed to a native chart (unlike the two tables above) -- just a
        // supplementary count, so a plain table is enough here.
        if (isAgingSummary && generatedReport.category === 'cdsp' && !generatedReport.programType && a.byGroupBySubService?.length > 0) {
          aoa.push(
            [], ['BENEFICIARIES BY SUB-SERVICE'], ['Sub-Service', 'Participants'],
            ...a.byGroupBySubService.map((d: any) => [d.group, d.value]),
          )
        }
        // Captured only now that every table (including CDSP's sub-service one,
        // if it was just appended) has actually been pushed -- this is what the
        // native charts get positioned below, so nothing added above ever ends
        // up hidden underneath them.
        const summaryContentEndRow = aoa.length

        const ws = wb.addWorksheet('Summary')
        aoa.forEach(r => ws.addRow(r))
        ws.getColumn(1).width = 34; ws.getColumn(2).width = 18
        ws.getRow(1).font = { bold: true, size: 14 }
        const groupHeaderRow = aoa.findIndex(r => r[0] === groupHeaderLabel) + 1
        if (groupHeaderRow > 0) ws.getRow(groupHeaderRow).font = { bold: true }
        const sexHeaderRow = aoa.findIndex(r => r[0] === 'BENEFICIARIES BY STATUS AND SEX') + 1
        if (sexHeaderRow > 0) ws.getRow(sexHeaderRow).font = { bold: true }
        const subServiceHeaderRow = aoa.findIndex(r => r[0] === 'BENEFICIARIES BY SUB-SERVICE') + 1
        if (subServiceHeaderRow > 0) ws.getRow(subServiceHeaderRow).font = { bold: true }
        applyPrint(ws)

        // Aging Report: REAL native Excel charts (a stacked-by-sex bar chart +
        // a bucket-distribution pie chart), not pictures -- grafted in after
        // wb.xlsx.writeBuffer() below, using the exact row positions captured
        // above, so the charts and the cells they read can't drift out of sync.
        if (isAgingSummary) {
          agingChartOptions = {
            sheetName: 'Summary',
            contentEndRow: summaryContentEndRow,
            categories: a.byGroup.map((d: any) => d.group),
            pie: {
              seriesNameRow: groupTableSeriesNameRow,
              categoryStartRow: groupTableCategoryStartRow,
              values: a.byGroup.map((d: any) => d.value),
              colorMap: AGING_BUCKET_COLORS,
            },
            sexBar: {
              categoryStartRow: sexTableCategoryStartRow,
              maleValues: a.byGroupBySex.map((d: any) => d.male),
              femaleValues: a.byGroupBySex.map((d: any) => d.female),
              // A distinct blue from AGING_BUCKET_COLORS.Placed ('#0077BE') --
              // that blue means "Placed" in the pie chart right next to this
              // bar, so reusing it here for "Male" would make the same color
              // mean two different things across the two charts.
              maleColor: '#1D4ED8',
              femaleColor: '#EC4899',
            },
          }
        }
      }

      // CDSP Activity List summary sheet — activities have no Sex breakdown the
      // way participants do, so this mirrors the participant summary's shape
      // (totals + a breakdown) with activity-appropriate counts instead: total
      // activities/participants, and a split by Status and by Service Type.
      if (generatedReport.category === 'cdsp' && generatedReport.cdspReportType === 'sessions') {
        const rows = generatedReport.data as any[]
        const totalActivities = rows.length
        const totalParticipants = rows.reduce((sum, r) => sum + (Number(r['Participants']) || 0), 0)
        const statusCounts: Record<string, number> = {}
        const serviceCounts: Record<string, number> = {}
        rows.forEach(r => {
          const status = r['Status'] || 'Unspecified'
          statusCounts[status] = (statusCounts[status] || 0) + 1
          const service = r['Service Type'] || 'Unspecified'
          serviceCounts[service] = (serviceCounts[service] || 0) + 1
        })
        const aoa: any[][] = [
          [`${String(generatedReport.categoryName).toUpperCase()} ACTIVITY LIST SUMMARY`], [],
          ...(cdspProgramInfo ? [['Program', reportDisplayTitle('cdsp')]] : []),
          ['Report Period', generatedReport.periodDetails],
          ['Program Type', generatedReport.programType || cdspPrograms.join(', ')], [],
          ['Total Activities', totalActivities],
          ['Total Participants', totalParticipants], [],
          ['ACTIVITIES BY STATUS'], ['Status', 'Activities'],
          ...Object.entries(statusCounts).map(([k, v]) => [k, v]), [],
          ['ACTIVITIES BY SERVICE TYPE'], ['Service Type', 'Activities'],
          ...Object.entries(serviceCounts).map(([k, v]) => [k, v]),
        ]
        const ws = wb.addWorksheet('Summary')
        aoa.forEach(r => ws.addRow(r))
        ws.getColumn(1).width = 34; ws.getColumn(2).width = 18
        ws.getRow(1).font = { bold: true, size: 14 }
        const byStatusRow = aoa.findIndex(r => r[0] === 'ACTIVITIES BY STATUS') + 1
        if (byStatusRow > 0) ws.getRow(byStatusRow).font = { bold: true }
        const byServiceRow = aoa.findIndex(r => r[0] === 'ACTIVITIES BY SERVICE TYPE') + 1
        if (byServiceRow > 0) ws.getRow(byServiceRow).font = { bold: true }
        applyPrint(ws)
      }

      // GIP Workplace/Office List summary sheet — same shape as CDSP's Activity
      // List summary above. Assigned Office plays the role CDSP's Service Type
      // does (and matches the grouping GIP's own Participant List analytics
      // already uses). No status breakdown -- workplaces are a reusable
      // directory with no status of their own; status lives on applicants.
      if (generatedReport.category === 'gip' && generatedReport.gipReportType === 'batches') {
        const rows = generatedReport.data as any[]
        const totalWorkplaces = rows.length
        const totalInterns = rows.reduce((sum, r) => sum + (Number(r['Interns']) || 0), 0)
        const officeCounts: Record<string, number> = {}
        rows.forEach(r => {
          const office = r['Assigned Office'] || 'Unspecified'
          officeCounts[office] = (officeCounts[office] || 0) + 1
        })
        const aoa: any[][] = [
          [`${String(generatedReport.categoryName).toUpperCase()} WORKPLACE/OFFICE LIST SUMMARY`], [],
          ['Report Period', generatedReport.periodDetails], [],
          ['Total Workplaces/Offices', totalWorkplaces],
          ['Total Interns', totalInterns], [],
          ['WORKPLACES/OFFICES BY ASSIGNED OFFICE'], ['Assigned Office', 'Workplaces/Offices'],
          ...Object.entries(officeCounts).map(([k, v]) => [k, v]),
        ]
        const ws = wb.addWorksheet('Summary')
        aoa.forEach(r => ws.addRow(r))
        ws.getColumn(1).width = 34; ws.getColumn(2).width = 18
        ws.getRow(1).font = { bold: true, size: 14 }
        const byOfficeRow = aoa.findIndex(r => r[0] === 'WORKPLACES/OFFICES BY ASSIGNED OFFICE') + 1
        if (byOfficeRow > 0) ws.getRow(byOfficeRow).font = { bold: true }
        applyPrint(ws)
      }

      // SPES Batch List summary sheet — same shape again. Employer plays the
      // role CDSP's Service Type / GIP's Assigned Office do (and matches the
      // grouping SPES's own Participant List analytics already uses).
      if (generatedReport.category === 'spes' && generatedReport.spesReportType === 'batches') {
        const rows = generatedReport.data as any[]
        const totalBatches = rows.length
        const totalParticipants = rows.reduce((sum, r) => sum + (Number(r['Participants']) || 0), 0)
        const statusCounts: Record<string, number> = {}
        const employerCounts: Record<string, number> = {}
        rows.forEach(r => {
          const status = r['Status'] || 'Unspecified'
          statusCounts[status] = (statusCounts[status] || 0) + 1
          const employer = r['Employer'] || 'Unspecified'
          employerCounts[employer] = (employerCounts[employer] || 0) + 1
        })
        const aoa: any[][] = [
          [`${String(generatedReport.categoryName).toUpperCase()} BATCH LIST SUMMARY`], [],
          ['Report Period', generatedReport.periodDetails], [],
          ['Total Batches', totalBatches],
          ['Total Participants', totalParticipants], [],
          ['BATCHES BY STATUS'], ['Status', 'Batches'],
          ...Object.entries(statusCounts).map(([k, v]) => [k, v]), [],
          ['BATCHES BY EMPLOYER'], ['Employer', 'Batches'],
          ...Object.entries(employerCounts).map(([k, v]) => [k, v]),
        ]
        const ws = wb.addWorksheet('Summary')
        aoa.forEach(r => ws.addRow(r))
        ws.getColumn(1).width = 34; ws.getColumn(2).width = 18
        ws.getRow(1).font = { bold: true, size: 14 }
        const byStatusRow = aoa.findIndex(r => r[0] === 'BATCHES BY STATUS') + 1
        if (byStatusRow > 0) ws.getRow(byStatusRow).font = { bold: true }
        const byEmployerRow = aoa.findIndex(r => r[0] === 'BATCHES BY EMPLOYER') + 1
        if (byEmployerRow > 0) ws.getRow(byEmployerRow).font = { bold: true }
        applyPrint(ws)
      }

      // Livelihood Project/Intervention List summary sheet — same shape again.
      // The "by Program Type" breakdown only applies to the combined "All
      // Programs" view — a specific program's column set has no "Program Type"
      // column at all (see getLivelihoodProjectColumns), so it's skipped rather
      // than showing a single, redundant "100% one program" bucket.
      if (generatedReport.category === 'livelihood' && generatedReport.livelihoodReportType === 'projects') {
        const rows = generatedReport.data as any[]
        const unit = livelihoodUnitLabel(generatedReport.programType)
        const totalProjects = rows.length
        const totalBeneficiaries = rows.reduce((sum, r) => sum + (Number(r['Beneficiaries Assigned']) || 0), 0)
        const statusCounts: Record<string, number> = {}
        rows.forEach(r => {
          const status = r['Status'] || 'Unspecified'
          statusCounts[status] = (statusCounts[status] || 0) + 1
        })
        const showProgramBreakdown = !generatedReport.programType
        const programCounts: Record<string, number> = {}
        if (showProgramBreakdown) {
          rows.forEach(r => {
            const program = r['Program Type'] || 'Unspecified'
            programCounts[program] = (programCounts[program] || 0) + 1
          })
        }
        const byStatusLabel = `${unit.plural.toUpperCase()} BY STATUS`
        const byProgramLabel = `${unit.plural.toUpperCase()} BY PROGRAM TYPE`
        const aoa: any[][] = [
          [`${String(generatedReport.categoryName).toUpperCase()} ${unit.singular.toUpperCase()} LIST SUMMARY`], [],
          ['Report Period', generatedReport.periodDetails],
          ['Program Type', generatedReport.programType || livelihoodPrograms.join(', ')], [],
          [`Total ${unit.plural}`, totalProjects],
          ['Total Beneficiaries Assigned', totalBeneficiaries], [],
          [byStatusLabel], ['Status', 'Count'],
          ...Object.entries(statusCounts).map(([k, v]) => [k, v]),
          ...(showProgramBreakdown ? [[], [byProgramLabel], ['Program Type', 'Count'], ...Object.entries(programCounts).map(([k, v]) => [k, v])] : []),
        ]
        const ws = wb.addWorksheet('Summary')
        aoa.forEach(r => ws.addRow(r))
        ws.getColumn(1).width = 34; ws.getColumn(2).width = 18
        ws.getRow(1).font = { bold: true, size: 14 }
        const byStatusRow = aoa.findIndex(r => r[0] === byStatusLabel) + 1
        if (byStatusRow > 0) ws.getRow(byStatusRow).font = { bold: true }
        const byProgramRow = aoa.findIndex(r => r[0] === byProgramLabel) + 1
        if (byProgramRow > 0) ws.getRow(byProgramRow).font = { bold: true }
        applyPrint(ws)
      }

      // Skills Training Activity List summary sheet — same shape as GIP/SPES's
      // Batch List summary. "Training Batch" plays the role CDSP's Service Type /
      // GIP's Assigned Office / SPES's Employer do.
      if (generatedReport.category === 'skills-training' && generatedReport.skillsReportType === 'activities') {
        const rows = generatedReport.data as any[]
        const totalTrainings = rows.length
        const totalParticipants = rows.reduce((sum, r) => sum + (Number(r['Participants']) || 0), 0)
        const statusCounts: Record<string, number> = {}
        const batchCounts: Record<string, number> = {}
        rows.forEach(r => {
          const status = r['Status'] || 'Unspecified'
          statusCounts[status] = (statusCounts[status] || 0) + 1
          const batch = r['Training Batch'] || 'Unspecified'
          batchCounts[batch] = (batchCounts[batch] || 0) + 1
        })
        const aoa: any[][] = [
          [`${String(generatedReport.categoryName).toUpperCase()} TRAINING LIST SUMMARY`], [],
          ['Report Period', generatedReport.periodDetails], [],
          ['Total Trainings', totalTrainings],
          ['Total Participants', totalParticipants], [],
          ['TRAININGS BY STATUS'], ['Status', 'Trainings'],
          ...Object.entries(statusCounts).map(([k, v]) => [k, v]), [],
          ['TRAININGS BY TRAINING BATCH'], ['Training Batch', 'Trainings'],
          ...Object.entries(batchCounts).map(([k, v]) => [k, v]),
        ]
        const ws = wb.addWorksheet('Summary')
        aoa.forEach(r => ws.addRow(r))
        ws.getColumn(1).width = 34; ws.getColumn(2).width = 18
        ws.getRow(1).font = { bold: true, size: 14 }
        const byStatusRow = aoa.findIndex(r => r[0] === 'TRAININGS BY STATUS') + 1
        if (byStatusRow > 0) ws.getRow(byStatusRow).font = { bold: true }
        const byBatchRow = aoa.findIndex(r => r[0] === 'TRAININGS BY TRAINING BATCH') + 1
        if (byBatchRow > 0) ws.getRow(byBatchRow).font = { bold: true }
        applyPrint(ws)
      }

      const cols = generatedReport.columns.filter((c: string) => visibleColumns[c])
      addTable(wb.addWorksheet('Detailed Report'), cols, filteredData,
        isAgingReport ? (col, row) => col === 'Time Since Completion' ? AGING_BUCKET_COLORS[row._agingBucket] : undefined : undefined)

      // Aging Report only: alongside the combined Detailed Report above, split
      // out a "Placed" and "Not Yet Placed" sheet -- each keeps only the columns
      // that are actually meaningful for that group (a placed row never needs
      // Time Since Completion; an unplaced row never has a Job Title/Employer/
      // Date Hired yet), and "No." is renumbered fresh within each sheet rather
      // than carrying over gaps from the combined list.
      if (isAgingReport) {
        const buildAgingSubsheet = (sheetName: string, wantedCols: string[], filterFn: (row: any) => boolean, colored: boolean) => {
          const subsetCols = wantedCols.filter(c => visibleColumns[c])
          // Filters against the full (unfiltered-by-visibility) data, not
          // filteredData -- if the user had hidden the "Employment Status"
          // column via the Columns menu, filteredData wouldn't have it at all,
          // which would silently make both subsheets come up empty.
          const subsetRows = (generatedReport.data as any[])
            .filter(filterFn)
            .map((row: any, i: number) => ({ ...row, 'No.': i + 1 }))
          addTable(wb.addWorksheet(sheetName), ['No.', ...subsetCols], subsetRows,
            colored ? (col, row) => col === 'Time Since Completion' ? AGING_BUCKET_COLORS[row._agingBucket] : undefined : undefined)
        }
        // Each program names its "last completed X" column differently, and
        // only CDSP has a Sub-Service dimension / per-program completed-count
        // column (GIP has neither -- it's one-shot, so a count would always be 1).
        const isCdspAging = generatedReport.category === 'cdsp'
        const isGipAging = generatedReport.category === 'gip'
        const lastCompletedCol = isCdspAging ? 'Last Completed Activity' : isGipAging ? 'Last Completed Workplace/Office' : 'Last Completed Training'
        const extraCols = isCdspAging ? ['Sub-Service', 'Activities Completed'] : isGipAging ? [] : ['Trainings Completed']
        buildAgingSubsheet(
          'Placed',
          ['Participant Name', ...extraCols, lastCompletedCol, 'Completed Date', 'Job Title', 'Employer', 'Date Hired'],
          (row: any) => row['Employment Status'] === 'Placed',
          false,
        )
        buildAgingSubsheet(
          'Not Yet Placed',
          ['Participant Name', ...extraCols, lastCompletedCol, 'Completed Date', 'Time Since Completion'],
          (row: any) => row['Employment Status'] === 'Not Yet Placed',
          true,
        )
      }

      const buf = await wb.xlsx.writeBuffer()
      const blob = agingChartOptions
        ? await graftAgingCharts(buf, agingChartOptions)
        : new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${fileName}.xlsx`
      link.click()
      URL.revokeObjectURL(link.href)

    } else if (format === 'csv') {
      // CSV is a flat, single-table format — unlike Excel it has no sheets/tabs to
      // hold a separate summary, so it exports just the detailed data table.
      const csv = XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(filteredData))
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${fileName}.csv`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(link.href) }, 100)

    } else if (format === 'pdf') {
      // Wide tables (many visible columns) don't fit a Folio portrait page, so
      // switch to landscape whenever the columns need more room than portrait
      // can offer (usable width = page width minus 14mm margin on each side).
      const visibleColsForOrientation = generatedReport.columns.filter((c: string) => visibleColumns[c])
      const MIN_COL_WIDTH_MM = 22
      const orientation: 'portrait' | 'landscape' =
        visibleColsForOrientation.length * MIN_COL_WIDTH_MM > FOLIO_MM[0] - 28 ? 'landscape' : 'portrait'
      const format: [number, number] = orientation === 'landscape' ? [FOLIO_MM[1], FOLIO_MM[0]] : FOLIO_MM
      const doc = new jsPDF({ orientation, format })
      registerPdfFont(doc)
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const centerX = pageWidth / 2
      const usableWidth = pageWidth - 28 // 14mm margin on each side
      let y = 20
      // Title shows the spelled-out program name alongside its abbreviation for CDSP
      // (e.g. "Career Development and Services Program (CDSP)") — long titles get a
      // smaller font and wrap across lines instead of running off the page edge.
      const pdfTitle = reportDisplayTitle(generatedReport.category, generatedReport.categoryName)
      const titleFontSize = pdfTitle.length > 45 ? 14 : 18
      doc.setFontSize(titleFontSize); doc.setFont(PDF_FONT_FAMILY, 'bold')
      const titleLines = doc.splitTextToSize(pdfTitle, usableWidth)
      titleLines.forEach((line: string) => { doc.text(line, centerX, y, { align: 'center' }); y += titleFontSize * 0.5 })
      y += 4
      doc.setFontSize(11); doc.setFont(PDF_FONT_FAMILY, 'normal')
      doc.text(`Report Period: ${generatedReport.periodDetails}`, centerX, y, { align: 'center' }); y += 15

      if (generatedReport.category === 'general-peso' && generatedReport.analytics) {
        const a = generatedReport.analytics
        doc.setFontSize(10); doc.setFont(PDF_FONT_FAMILY, 'normal')
        doc.text(`Total Participants: ${a.total}`, 14, y)
        doc.text(`Male: ${a.male}`, 90, y)
        doc.text(`Female: ${a.female}`, 140, y); y += 10
        doc.setFontSize(14); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text('Program Participation Summary', 14, y); y += 6
        doc.addImage(await createBarChartImage(generatedReport.analytics.barChartData), 'PNG', 14, y, usableWidth, usableWidth * 0.5); y += usableWidth * 0.5 + 2
        doc.setFontSize(14); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text('Program Distribution', 14, y); y += 6
        doc.addImage(await createPieChartImage(generatedReport.analytics.pieChartData), 'PNG', 14, y, usableWidth, usableWidth * 0.5556); y += usableWidth * 0.5556 + 2
        doc.addPage(); y = 20
        doc.setFontSize(14); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text('Detailed Report', 14, y); y += 6

      } else if (generatedReport.category === 'employment-facilitation' && generatedReport.analytics) {
        const s = generatedReport.analytics.summary
        doc.setFontSize(12); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text('Labor Market Information Summary', 14, y); y += 6
        doc.setFontSize(10); doc.setFont(PDF_FONT_FAMILY, 'normal')
        doc.text(`Total Applicants: ${s.totalApplicants}`, 14, y)
        doc.text(`Total Vacancies: ${s.totalVacancies}`, 75, y)
        doc.text(`Total Referrals: ${s.totalReferrals}`, 136, y); y += 5
        doc.text(`Total Placements: ${s.totalPlacements}`, 14, y)
        doc.text(`Placement Rate: ${s.placementRate}%`, 75, y); y += 10
        doc.setFontSize(12); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text('Placements Per Month', 14, y); y += 6
        doc.addImage(await createHorizontalBarChartImage(generatedReport.analytics.placementsPerMonth, '', '#10B981'), 'PNG', 14, y, usableWidth, usableWidth * 0.4375); y += usableWidth * 0.4375 + 2
        doc.setFontSize(12); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text('Referral Status Distribution', 14, y); y += 6
        doc.addImage(await createPieChartImage(generatedReport.analytics.referralStatusDistribution), 'PNG', 14, y, usableWidth, usableWidth * 0.5625); y += usableWidth * 0.5625 + 2
        doc.addPage(); y = 20
        doc.setFontSize(12); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text('Top Job Vacancies', 14, y); y += 6
        doc.addImage(await createHorizontalBarChartImage(generatedReport.analytics.jobVacancyDistribution, '', '#3B82F6'), 'PNG', 14, y, usableWidth, usableWidth * 0.4375); y += usableWidth * 0.4375 + 2
        doc.setFontSize(12); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text('Top Employers by Vacancies', 14, y); y += 6
        doc.addImage(await createHorizontalBarChartImage(generatedReport.analytics.employerParticipation, '', '#0077BE'), 'PNG', 14, y, usableWidth, usableWidth * 0.4375); y += usableWidth * 0.4375 + 2
        doc.addPage(); y = 20
        doc.setFontSize(14); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text('Detailed Employment Facilitation Report', 14, y); y += 6

      } else if (isAgingReport && generatedReport.analytics) {
        const a = generatedReport.analytics
        doc.setFontSize(10); doc.setFont(PDF_FONT_FAMILY, 'normal')
        doc.text(`Total Beneficiaries: ${a.total}`, 14, y)
        doc.text(`Placed: ${a.placedCount}`, 90, y)
        doc.text(`Not Yet Placed: ${a.notPlacedCount}`, 140, y); y += 10
        doc.setFontSize(14); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text('Beneficiaries by Status', 14, y); y += 6
        doc.addImage(await createHorizontalBarChartImage(a.barChartData, '', '#0077BE'), 'PNG', 14, y, usableWidth, usableWidth * 0.4375); y += usableWidth * 0.4375 + 2
        if (a.pieChartData.length > 0) {
          doc.setFontSize(14); doc.setFont(PDF_FONT_FAMILY, 'bold')
          doc.text('Status Distribution', 14, y); y += 6
          doc.addImage(await createPieChartImage(a.pieChartData), 'PNG', 14, y, usableWidth, usableWidth * 0.5556); y += usableWidth * 0.5556 + 2
        }
        // CDSP Aging only, "All Programs" only -- matches the Excel Summary sheet's
        // own "BENEFICIARIES BY SUB-SERVICE" table.
        if (generatedReport.category === 'cdsp' && !generatedReport.programType && a.byGroupBySubService?.length > 0) {
          doc.setFontSize(12); doc.setFont(PDF_FONT_FAMILY, 'bold')
          doc.text('Beneficiaries by Sub-Service', 14, y); y += 6
          doc.setFontSize(10); doc.setFont(PDF_FONT_FAMILY, 'normal')
          a.byGroupBySubService.forEach((d: any) => { doc.text(`${d.group}: ${d.value}`, 14, y); y += 5 })
          y += 3
        }
        doc.addPage(); y = 20
        doc.setFontSize(14); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text('Detailed Report', 14, y); y += 6

      } else if (['cdsp', 'gip', 'spes', 'livelihood'].includes(generatedReport.category) && generatedReport.analytics) {
        // Matches the Summary sheet in the Excel export — General PESO and
        // Employment Facilitation already got a PDF summary section above; CDSP/
        // GIP/SPES/Livelihood previously jumped straight to the detailed table with nothing.
        const a = generatedReport.analytics
        const hasProgramTypeFilter = ['cdsp', 'livelihood'].includes(generatedReport.category)
        doc.setFontSize(12); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text(`${generatedReport.categoryName} Summary`, 14, y); y += 8
        doc.setFontSize(10); doc.setFont(PDF_FONT_FAMILY, 'normal')
        if (generatedReport.category === 'cdsp' && cdspProgramInfo) {
          doc.text(`Program: ${reportDisplayTitle('cdsp')}`, 14, y); y += 5
        }
        doc.text(`Report Period: ${generatedReport.periodDetails}`, 14, y); y += 5
        // Program Type filter only applies to CDSP/Livelihood; GIP/SPES have no such filter.
        if (hasProgramTypeFilter) {
          const progList = generatedReport.category === 'cdsp' ? cdspPrograms : livelihoodPrograms
          doc.text(`Program Type: ${generatedReport.programType || progList.join(', ')}`, 14, y); y += 5
        }
        y += 3
        doc.text(`Total Participants: ${a.total}`, 14, y)
        doc.text(`Male: ${a.male}`, 90, y)
        doc.text(`Female: ${a.female}`, 140, y); y += 10

        // Breakdown by program is only meaningful when viewing all programs — see
        // matching note on the on-screen summary and Excel/CSV exports.
        if (!hasProgramTypeFilter || !generatedReport.programType) {
          doc.setFontSize(12); doc.setFont(PDF_FONT_FAMILY, 'bold')
          doc.text(a.groupLabel, 14, y); y += 6
          doc.setFontSize(10); doc.setFont(PDF_FONT_FAMILY, 'normal')
          a.byGroup.forEach((d: any) => {
            if (y > pageHeight - 20) { doc.addPage(); y = 20 } // long lists (e.g. many Assigned Offices) paginate instead of running off the page
            doc.text(`${d.group}: ${d.value}`, 14, y); y += 5
          })
          y += 3
        }

        doc.addPage(); y = 20
        doc.setFontSize(14); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text('Detailed Report', 14, y); y += 6

      } else if (
        (generatedReport.category === 'cdsp' && generatedReport.cdspReportType === 'sessions') ||
        (generatedReport.category === 'gip' && generatedReport.gipReportType === 'batches') ||
        (generatedReport.category === 'spes' && generatedReport.spesReportType === 'batches') ||
        (generatedReport.category === 'livelihood' && generatedReport.livelihoodReportType === 'projects') ||
        (generatedReport.category === 'skills-training' && generatedReport.skillsReportType === 'activities')
      ) {
        // Matches the Summary sheet added to the Excel export for the Activity/
        // Batch/Project/Training List report types — these rows are per-activity/
        // per-batch/per-project/per-training, not per-participant, so there's no
        // Male/Female analytics object here; compute totals and breakdowns
        // directly from generatedReport.data instead.
        const rows = generatedReport.data as any[]
        const isCdsp = generatedReport.category === 'cdsp'
        const isGip = generatedReport.category === 'gip'
        const isLivelihoodProjects = generatedReport.category === 'livelihood' && generatedReport.livelihoodReportType === 'projects'
        const isSkillsActivities = generatedReport.category === 'skills-training' && generatedReport.skillsReportType === 'activities'
        // DILP/TUPAD/SLP call their record a "Project"; CLPEP calls its an
        // "Intervention" -- so the summary uses whichever term the selected
        // program actually uses, not a blanket "Project/Intervention" (that
        // combined term only genuinely applies to the "All Programs" view).
        const livelihoodUnit = isLivelihoodProjects ? livelihoodUnitLabel(generatedReport.programType) : null
        const unitSingular = isCdsp ? 'Activity' : livelihoodUnit ? livelihoodUnit.singular : isSkillsActivities ? 'Training' : 'Batch'
        const unitPlural = isCdsp ? 'Activities' : livelihoodUnit ? livelihoodUnit.plural : isSkillsActivities ? 'Trainings' : 'Batches'
        const secondaryCol = isCdsp ? 'Service Type' : isGip ? 'Assigned Office' : isLivelihoodProjects ? 'Program Type' : isSkillsActivities ? 'Training Batch' : 'Employer'
        const participantsCol = isLivelihoodProjects ? 'Beneficiaries Assigned' : isGip ? 'Interns' : 'Participants'
        // Livelihood's "by Program Type" breakdown only applies to the combined
        // "All Programs" view -- a specific program's column set has no "Program
        // Type" column at all (see getLivelihoodProjectColumns).
        const showSecondaryBreakdown = !isLivelihoodProjects || !generatedReport.programType
        const totalUnits = rows.length
        const totalParticipants = rows.reduce((sum, r) => sum + (Number(r[participantsCol]) || 0), 0)
        const statusCounts: Record<string, number> = {}
        const secondaryCounts: Record<string, number> = {}
        rows.forEach(r => {
          const status = r['Status'] || 'Unspecified'
          statusCounts[status] = (statusCounts[status] || 0) + 1
          if (showSecondaryBreakdown) {
            const secondary = r[secondaryCol] || 'Unspecified'
            secondaryCounts[secondary] = (secondaryCounts[secondary] || 0) + 1
          }
        })

        doc.setFontSize(12); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text(`${generatedReport.categoryName} ${unitSingular} List Summary`, 14, y); y += 8
        doc.setFontSize(10); doc.setFont(PDF_FONT_FAMILY, 'normal')
        if (isCdsp && cdspProgramInfo) {
          doc.text(`Program: ${reportDisplayTitle('cdsp')}`, 14, y); y += 5
        }
        doc.text(`Report Period: ${generatedReport.periodDetails}`, 14, y); y += 5
        if (isCdsp) {
          doc.text(`Program Type: ${generatedReport.programType || cdspPrograms.join(', ')}`, 14, y); y += 5
        } else if (isLivelihoodProjects) {
          doc.text(`Program Type: ${generatedReport.programType || livelihoodPrograms.join(', ')}`, 14, y); y += 5
        }
        y += 3
        doc.text(`Total ${unitPlural}: ${totalUnits}`, 14, y)
        doc.text(`Total ${isLivelihoodProjects ? 'Beneficiaries' : isGip ? 'Interns' : 'Participants'}: ${totalParticipants}`, 90, y); y += 10

        // Workplaces have no status of their own (see the Excel summary
        // above) -- skip this breakdown for GIP.
        if (!isGip) {
          doc.setFontSize(12); doc.setFont(PDF_FONT_FAMILY, 'bold')
          doc.text(`${unitPlural} by Status`, 14, y); y += 6
          doc.setFontSize(10); doc.setFont(PDF_FONT_FAMILY, 'normal')
          Object.entries(statusCounts).forEach(([k, v]) => {
            if (y > pageHeight - 20) { doc.addPage(); y = 20 }
            doc.text(`${k}: ${v}`, 14, y); y += 5
          })
          y += 3
        }

        if (showSecondaryBreakdown) {
          doc.setFontSize(12); doc.setFont(PDF_FONT_FAMILY, 'bold')
          doc.text(`${unitPlural} by ${secondaryCol}`, 14, y); y += 6
          doc.setFontSize(10); doc.setFont(PDF_FONT_FAMILY, 'normal')
          Object.entries(secondaryCounts).forEach(([k, v]) => {
            if (y > pageHeight - 20) { doc.addPage(); y = 20 }
            doc.text(`${k}: ${v}`, 14, y); y += 5
          })
          y += 3
        }

        doc.addPage(); y = 20
        doc.setFontSize(14); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text('Detailed Report', 14, y); y += 6
      }

      const visibleCols = generatedReport.columns.filter((col: string) => visibleColumns[col])
      // Shrink text as columns increase so a wide table (e.g. all optional CDSP/GIP
      // columns enabled) still fits the page width instead of spilling past the margin.
      const tableFontSize = visibleCols.length > 14 ? 6 : visibleCols.length > 10 ? 7 : 8
      const bodyRows = filteredData.map((row: any) => visibleCols.map((col: string) => typeof row[col] === 'number' ? row[col] : (row[col] || '-')))
      // Give each column a share of the usable page width proportional to its
      // actual rendered text width (header vs. longest value, measured via the
      // doc's own font metrics) — an equal split wastes space on short columns
      // like "No." while cramping long ones like "Participant Name", and a raw
      // character count still under- or over-estimates a column's real need. The
      // shares always sum to exactly usableWidth, so the table still can't overflow.
      const columnWidths = computeColumnWidths(doc, visibleCols, bodyRows, usableWidth, tableFontSize + 1, tableFontSize)
      const columnStyles = Object.fromEntries(visibleCols.map((_: string, i: number) => [i, { cellWidth: columnWidths[i] }]))
      const agingTimeColIdx = isAgingReport ? visibleCols.indexOf('Time Since Completion') : -1
      autoTable(doc, {
        startY: y,
        head: [visibleCols],
        body: bodyRows,
        theme: 'grid',
        headStyles: { fillColor: [0, 119, 190], textColor: 255, fontStyle: 'bold', fontSize: tableFontSize + 1, font: PDF_FONT_FAMILY },
        bodyStyles: { fontSize: tableFontSize, font: PDF_FONT_FAMILY },
        margin: { left: 14, right: 14 },
        tableWidth: usableWidth,
        columnStyles,
        styles: { overflow: 'linebreak', font: PDF_FONT_FAMILY },
        // Aging Report only: color the "Time Since Completion" cell by its bucket,
        // matching the on-screen table and Excel export.
        didParseCell: agingTimeColIdx < 0 ? undefined : (data) => {
          if (data.section !== 'body' || data.column.index !== agingTimeColIdx) return
          const bucket = filteredData[data.row.index]?._agingBucket
          const color = bucket && AGING_BUCKET_COLORS[bucket]
          if (color) {
            data.cell.styles.fillColor = hexToRgb(color)
            data.cell.styles.textColor = 255
            data.cell.styles.fontStyle = 'bold'
          }
        },
      })
      doc.save(`${fileName}.pdf`)
    }
    setIsExportMenuOpen(false)
  }

  // Downloads the participant roster for a single CDSP session (Activity List
  // row-level action) — mirrors PESO's own convention of context-before-data
  // with an activity-info header block above the table. Excel uses ExcelJS
  // (not the plain CSV/xlsx-utils path used elsewhere) specifically so the
  // Contact Number column can be forced to a text cell type — a plain CSV/SheetJS
  // roundtrip auto-detects long digit strings as numbers, which Excel then
  // displays in scientific notation (e.g. "9.88E+08") once reopened.
  const handleExportSessionRoster = async (activityId: number, format: 'excel' | 'pdf' | 'csv') => {
    const activity = cdspActivities.find(act => act.id === activityId)
    if (!activity) return
    const roster = cdspApplicants
      .filter(a => a.assignedActivityId === activityId)
      .map((a, i) => [
        i + 1,
        `${a.lastName}, ${a.firstName}${a.middleName ? ' ' + a.middleName : ''}`.trim(),
        a.sex || '-',
        a.age || '-',
        a.contactNumber || '-',
        a.highestEducation || '-',
        a.employmentStatus || '-',
      ])
    if (roster.length === 0) {
      setInfoModal({ isOpen: true, title: 'No Participants', message: 'This session has no participants assigned yet.' })
      return
    }
    const headerLabels = ['No.', 'Participant Name', 'Sex', 'Age', 'Contact Number', 'Highest Education', 'Employment Status']
    const infoLines: { label: string; value: string | number }[][] = [
      [{ label: 'Activity: ', value: activity.title || '-' }],
      [{ label: 'Service Type: ', value: activity.service || '-' }],
      [{ label: 'Date: ', value: activity.date || '-' }, { label: '     Venue: ', value: activity.location || '-' }],
      [{ label: 'Facilitator: ', value: activity.facilitator || '-' }, { label: '     Counselor: ', value: activity.counselor || '-' }],
      [{ label: 'Total Participants: ', value: roster.length }],
    ]
    const safeTitle = (activity.title || 'Activity').replace(/[^a-z0-9]+/gi, '_')

    if (format === 'pdf') {
      const doc = buildRosterPdf('CDSP PARTICIPANT LIST', infoLines, headerLabels, roster)
      doc.save(`CDSP_Roster_${safeTitle}_${activity.date || 'undated'}.pdf`)
      return
    }
    if (format === 'csv') {
      const csv = buildRosterCsv('CDSP PARTICIPANT LIST', infoLines, headerLabels, roster)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `CDSP_Roster_${safeTitle}_${activity.date || 'undated'}.csv`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(link.href) }, 100)
      return
    }

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Attendees')
    const THIN = { style: 'thin' as const, color: { argb: 'FFD9D9D9' } }
    const BORDERS = { top: THIN, left: THIN, bottom: THIN, right: THIN }
    // Last column letter of the data table — the title merges/centers across
    // exactly this width, so it stays centered even if columns are ever added
    // or removed instead of being pinned to a hardcoded letter.
    const lastCol = String.fromCharCode(64 + headerLabels.length) // 7 cols -> 'G'

    const titleRow = ws.addRow(['CDSP PARTICIPANT LIST'])
    titleRow.font = { bold: true, size: 14 }
    titleRow.alignment = { horizontal: 'center' }
    ws.mergeCells(`A${titleRow.number}:${lastCol}${titleRow.number}`)
    ws.addRow([])

    // Each info line is merged across the FULL table width (same span as the
    // title) and centered as one block — centering text inside a single narrow
    // column barely moves it, since the column itself is thin; merging first is
    // what actually positions the whole line toward the middle of the table.
    infoLines.forEach(parts => {
      const rowNum = ws.addRow([]).number
      ws.mergeCells(`A${rowNum}:${lastCol}${rowNum}`)
      const cell = ws.getCell(`A${rowNum}`)
      cell.value = {
        richText: parts.flatMap(p => [
          { font: { bold: true }, text: p.label },
          { text: String(p.value) },
        ]),
      }
      cell.alignment = { horizontal: 'center' }
    })
    ws.addRow([]) // spacer row before the table

    const header = ws.addRow(headerLabels)
    header.eachCell(cell => {
      cell.font = { bold: true }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = BORDERS
    })
    roster.forEach(r => {
      const row = ws.addRow(r)
      row.eachCell(cell => { cell.border = BORDERS; cell.alignment = { vertical: 'middle' } })
      row.getCell(5).numFmt = '@' // Contact Number stays text — no scientific notation
    })
    // The info block is fully merged per row now, so only the data table itself
    // drives column widths.
    headerLabels.forEach((label, i) => {
      let maxLen = label.length
      roster.forEach(r => { const v = String(r[i] ?? ''); if (v.length > maxLen) maxLen = v.length })
      ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 2, 10), 40)
    })

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `CDSP_Roster_${safeTitle}_${activity.date || 'undated'}.xlsx`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // Downloads the intern list for a single GIP workplace/office (Workplace
  // List row-level action) — same shape/technique as handleExportSessionRoster
  // (centered full-width info block, text-formatted contact numbers for
  // Excel), adapted to workplace/intern terminology: a workplace info block
  // (Assigned Office, Workplace/Office Address, Coordinator, Supervisor, Allowance)
  // instead of an activity info block (Venue, Facilitator, Counselor).
  const handleExportBatchInterns = async (workplaceId: number, format: 'excel' | 'pdf' | 'csv') => {
    const workplace = gipWorkplaces.find(w => w.id === workplaceId)
    if (!workplace) return
    const interns = gipApplicants
      .filter(a => a.assignedWorkplaceId === workplaceId)
      .map((a, i) => [
        i + 1,
        `${a.lastName}, ${a.firstName}${a.middleName ? ' ' + a.middleName : ''}`.trim(),
        a.sex || '-',
        a.age || '-',
        a.contactNumber || '-',
        a.schoolName || '-',
        a.course || '-',
        a.highestEducation || '-',
      ])
    if (interns.length === 0) {
      setInfoModal({ isOpen: true, title: 'No Interns', message: 'This workplace/office has no interns assigned yet.' })
      return
    }
    const headerLabels = ['No.', 'Participant Name', 'Sex', 'Age', 'Contact Number', 'School Name', 'Course', 'Highest Education']
    const infoLines: { label: string; value: string | number }[][] = [
      [{ label: 'Assigned Office: ', value: workplace.workplaceName || '-' }, { label: '     Workplace/Office Address: ', value: workplace.deploymentLocation || '-' }],
      [{ label: 'Supervisor: ', value: workplace.supervisor || '-' }],
      [{ label: 'Allowance: ', value: workplace.allowance || '-' }],
      [{ label: 'Total Interns: ', value: interns.length }],
    ]
    const safeName = (workplace.workplaceName || 'Workplace').replace(/[^a-z0-9]+/gi, '_')
    const exportDate = new Date().toISOString().split('T')[0]

    if (format === 'pdf') {
      const doc = buildRosterPdf('GIP INTERN LIST', infoLines, headerLabels, interns)
      doc.save(`GIP_Interns_${safeName}_${exportDate}.pdf`)
      return
    }
    if (format === 'csv') {
      const csv = buildRosterCsv('GIP INTERN LIST', infoLines, headerLabels, interns)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `GIP_Interns_${safeName}_${exportDate}.csv`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(link.href) }, 100)
      return
    }

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Interns')
    const THIN = { style: 'thin' as const, color: { argb: 'FFD9D9D9' } }
    const BORDERS = { top: THIN, left: THIN, bottom: THIN, right: THIN }
    const lastCol = String.fromCharCode(64 + headerLabels.length) // 8 cols -> 'H'

    const titleRow = ws.addRow(['GIP INTERN LIST'])
    titleRow.font = { bold: true, size: 14 }
    titleRow.alignment = { horizontal: 'center' }
    ws.mergeCells(`A${titleRow.number}:${lastCol}${titleRow.number}`)
    ws.addRow([])

    infoLines.forEach(parts => {
      const rowNum = ws.addRow([]).number
      ws.mergeCells(`A${rowNum}:${lastCol}${rowNum}`)
      const cell = ws.getCell(`A${rowNum}`)
      cell.value = {
        richText: parts.flatMap(p => [
          { font: { bold: true }, text: p.label },
          { text: String(p.value) },
        ]),
      }
      cell.alignment = { horizontal: 'center' }
    })
    ws.addRow([]) // spacer row before the table

    const header = ws.addRow(headerLabels)
    header.eachCell(cell => {
      cell.font = { bold: true }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = BORDERS
    })
    interns.forEach(r => {
      const row = ws.addRow(r)
      row.eachCell(cell => { cell.border = BORDERS; cell.alignment = { vertical: 'middle' } })
      row.getCell(5).numFmt = '@' // Contact Number stays text — no scientific notation
    })
    headerLabels.forEach((label, i) => {
      let maxLen = label.length
      interns.forEach(r => { const v = String(r[i] ?? ''); if (v.length > maxLen) maxLen = v.length })
      ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 2, 10), 40)
    })

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `GIP_Interns_${safeName}_${exportDate}.xlsx`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // Downloads the student list for a single SPES batch (Batch List row-level
  // action) — same shape/technique as handleExportBatchInterns, adapted to
  // SPES's own batch shape: Employer instead of Assigned Office, Coordinator
  // (a real SPES field, unlike GIP's), Total Slots/Funding Source instead
  // of Supervisor/Allowance (SPES has no per-batch allowance field).
  const handleExportBatchStudents = async (batchId: number, format: 'excel' | 'pdf' | 'csv') => {
    const batch = spesBatches.find(b => b.id === batchId)
    if (!batch) return
    const students = spesApplicants
      .filter(a => a.assignedBatchId === batchId)
      .map((a, i) => [
        i + 1,
        `${a.lastName}, ${a.firstName}${a.middleName ? ' ' + a.middleName : ''}`.trim(),
        a.sex || '-',
        a.age || '-',
        a.contactNumber || '-',
        a.schoolName || '-',
        a.gradeYearLevel || '-',
        a.course || '-',
      ])
    if (students.length === 0) {
      setInfoModal({ isOpen: true, title: 'No Students', message: 'This batch has no students assigned yet.' })
      return
    }
    const headerLabels = ['No.', 'Participant Name', 'Sex', 'Age', 'Contact Number', 'School Name', 'Grade/Year Level', 'Course']
    const infoLines: { label: string; value: string | number }[][] = [
      [{ label: 'Batch: ', value: batch.batchName || '-' }],
      [{ label: 'Employer: ', value: batch.employer || '-' }, { label: '     Deployment Location: ', value: batch.deploymentLocation || '-' }],
      [{ label: 'Start Date: ', value: batch.programStartDate || '-' }, { label: '     End Date: ', value: batch.programEndDate || '-' }],
      [{ label: 'Coordinator: ', value: batch.coordinator || '-' }],
      [{ label: 'Total Slots: ', value: batch.availableSlots || '-' }, { label: '     Funding Source: ', value: batch.fundingSource || '-' }],
      [{ label: 'Total Students: ', value: students.length }],
    ]
    const safeName = (batch.batchName || 'Batch').replace(/[^a-z0-9]+/gi, '_')

    if (format === 'pdf') {
      const doc = buildRosterPdf('SPES STUDENT LIST', infoLines, headerLabels, students)
      doc.save(`SPES_Students_${safeName}_${batch.programStartDate || 'undated'}.pdf`)
      return
    }
    if (format === 'csv') {
      const csv = buildRosterCsv('SPES STUDENT LIST', infoLines, headerLabels, students)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `SPES_Students_${safeName}_${batch.programStartDate || 'undated'}.csv`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(link.href) }, 100)
      return
    }

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Students')
    const THIN = { style: 'thin' as const, color: { argb: 'FFD9D9D9' } }
    const BORDERS = { top: THIN, left: THIN, bottom: THIN, right: THIN }
    const lastCol = String.fromCharCode(64 + headerLabels.length) // 8 cols -> 'H'

    const titleRow = ws.addRow(['SPES STUDENT LIST'])
    titleRow.font = { bold: true, size: 14 }
    titleRow.alignment = { horizontal: 'center' }
    ws.mergeCells(`A${titleRow.number}:${lastCol}${titleRow.number}`)
    ws.addRow([])

    infoLines.forEach(parts => {
      const rowNum = ws.addRow([]).number
      ws.mergeCells(`A${rowNum}:${lastCol}${rowNum}`)
      const cell = ws.getCell(`A${rowNum}`)
      cell.value = {
        richText: parts.flatMap(p => [
          { font: { bold: true }, text: p.label },
          { text: String(p.value) },
        ]),
      }
      cell.alignment = { horizontal: 'center' }
    })
    ws.addRow([]) // spacer row before the table

    const header = ws.addRow(headerLabels)
    header.eachCell(cell => {
      cell.font = { bold: true }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = BORDERS
    })
    students.forEach(r => {
      const row = ws.addRow(r)
      row.eachCell(cell => { cell.border = BORDERS; cell.alignment = { vertical: 'middle' } })
      row.getCell(5).numFmt = '@' // Contact Number stays text — no scientific notation
    })
    headerLabels.forEach((label, i) => {
      let maxLen = label.length
      students.forEach(r => { const v = String(r[i] ?? ''); if (v.length > maxLen) maxLen = v.length })
      ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 2, 10), 40)
    })

    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `SPES_Students_${safeName}_${batch.programStartDate || 'undated'}.xlsx`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // Shared ExcelJS roster workbook builder (title + centered info block + bordered
  // table, same shape as the CDSP/GIP/SPES roster exports above) -- factored out
  // for the two roster exports below instead of copy-pasting their ~40 lines of
  // ExcelJS boilerplate a 4th/5th time. `textColIndex` (1-based) forces one column
  // (e.g. Contact Number) to a text cell so long digit strings don't get displayed
  // in scientific notation once reopened in Excel.
  const buildRosterWorkbook = (
    sheetName: string,
    title: string,
    infoLines: { label: string; value: string | number }[][],
    headerLabels: string[],
    rows: (string | number)[][],
    textColIndex?: number,
  ): ExcelJS.Workbook => {
    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet(sheetName)
    const THIN = { style: 'thin' as const, color: { argb: 'FFD9D9D9' } }
    const BORDERS = { top: THIN, left: THIN, bottom: THIN, right: THIN }
    const lastCol = String.fromCharCode(64 + headerLabels.length)

    const titleRow = ws.addRow([title])
    titleRow.font = { bold: true, size: 14 }
    titleRow.alignment = { horizontal: 'center' }
    ws.mergeCells(`A${titleRow.number}:${lastCol}${titleRow.number}`)
    ws.addRow([])

    infoLines.forEach(parts => {
      const rowNum = ws.addRow([]).number
      ws.mergeCells(`A${rowNum}:${lastCol}${rowNum}`)
      const cell = ws.getCell(`A${rowNum}`)
      cell.value = {
        richText: parts.flatMap(p => [
          { font: { bold: true }, text: p.label },
          { text: String(p.value) },
        ]),
      }
      cell.alignment = { horizontal: 'center' }
    })
    ws.addRow([]) // spacer row before the table

    const header = ws.addRow(headerLabels)
    header.eachCell(cell => {
      cell.font = { bold: true }
      cell.alignment = { horizontal: 'center', vertical: 'middle' }
      cell.border = BORDERS
    })
    rows.forEach(r => {
      const row = ws.addRow(r)
      row.eachCell(cell => { cell.border = BORDERS; cell.alignment = { vertical: 'middle' } })
      if (textColIndex) row.getCell(textColIndex).numFmt = '@'
    })
    headerLabels.forEach((label, i) => {
      let maxLen = label.length
      rows.forEach(r => { const v = String(r[i] ?? ''); if (v.length > maxLen) maxLen = v.length })
      ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 2, 10), 40)
    })

    return wb
  }

  // Downloads the beneficiary list for a single Livelihood project/intervention
  // (Project/Intervention List row-level action) -- same shape/technique as the
  // CDSP/GIP/SPES roster exports, but needs BOTH the project's id and its program
  // (unlike those three, which each belong to a single context) since DILP/TUPAD/
  // SLP/CLPEP each have their own id sequence -- project id 1 could be a DILP
  // project, a TUPAD project, an SLP project, and a CLPEP intervention all at once.
  const handleExportProjectBeneficiaries = async (projectId: number, program: string, format: 'excel' | 'pdf' | 'csv') => {
    let projectTitle: string
    let unit = 'Project'
    let infoLines: { label: string; value: string | number }[][]
    let beneficiaries: any[]

    if (program === 'DILEEP (DILP)') {
      const project = dilpProjects.find(p => p.id === projectId)
      if (!project) return
      projectTitle = project.projectName || 'Project'
      beneficiaries = dilpApplicants.filter(a => a.assignedProjectId === projectId)
      infoLines = [
        [{ label: 'Project: ', value: project.projectName || '-' }],
        [{ label: 'Type of Project: ', value: project.typeOfProject || '-' }, { label: '     Program Component: ', value: project.programComponent || '-' }],
        [{ label: 'Assistance Amount: ', value: formatCurrency(project.assistanceAmount) }, { label: '     Release Date: ', value: project.dateReleased || '-' }],
        [{ label: 'Total Beneficiaries: ', value: beneficiaries.length }],
      ]
    } else if (program === 'DILEEP (TUPAD)') {
      const project = tupadProjects.find(p => p.id === projectId)
      if (!project) return
      projectTitle = project.title || 'Project'
      beneficiaries = tupadApplicants.filter(a => a.assignedProjectId === projectId)
      infoLines = [
        [{ label: 'Project: ', value: project.title || '-' }],
        [{ label: 'Date: ', value: project.date || '-' }, { label: '     Location: ', value: project.location || '-' }],
        [{ label: 'Assistance Amount: ', value: formatCurrency(project.assistanceAmount) }, { label: '     Release Date: ', value: project.dateReleased || '-' }],
        [{ label: 'Total Beneficiaries: ', value: beneficiaries.length }],
      ]
    } else if (program === 'SLP') {
      const project = slpProjects.find(p => p.id === projectId)
      if (!project) return
      projectTitle = project.projectName || 'Project'
      beneficiaries = slpApplicants.filter(a => a.assignedSlpProjectId === projectId)
      infoLines = [
        [{ label: 'Project: ', value: project.projectName || '-' }],
        [{ label: 'SLP Track: ', value: project.slpTrack || '-' }, { label: '     Date Started: ', value: project.dateStarted || '-' }],
        [{ label: 'Assistance Amount: ', value: formatCurrency(project.assistanceAmount) }, { label: '     Release Date: ', value: project.dateReleased || '-' }],
        [{ label: 'Total Beneficiaries: ', value: beneficiaries.length }],
      ]
    } else if (program === 'CLPEP') {
      const project = clpepInterventions.find(p => p.id === projectId)
      if (!project) return
      unit = 'Intervention'
      projectTitle = project.interventionName || 'Intervention'
      beneficiaries = clpepApplicants.filter(a => a.assignedInterventionId === projectId)
      infoLines = [
        [{ label: 'Intervention: ', value: project.interventionName || '-' }],
        [{ label: 'Category: ', value: (project.interventionCategory === 'Others' ? project.interventionCategoryOther : project.interventionCategory) || '-' }],
        [{ label: 'Date: ', value: project.date || '-' }, { label: '     Location: ', value: project.location || '-' }],
        [{ label: 'Total Beneficiaries: ', value: beneficiaries.length }],
      ]
    } else {
      return
    }

    if (beneficiaries.length === 0) {
      setInfoModal({ isOpen: true, title: 'No Beneficiaries', message: `This ${unit.toLowerCase()} has no beneficiaries assigned yet.` })
      return
    }

    const headerLabels = ['No.', 'Beneficiary Name', 'Sex', 'Age', 'Civil Status', 'Contact Number', 'Barangay']
    const roster = beneficiaries.map((a, i) => [
      i + 1,
      `${a.lastName}, ${a.firstName}${a.middleName ? ' ' + a.middleName : ''}`.trim(),
      a.sex || '-',
      a.age || '-',
      a.civilStatus || '-',
      a.contactNumber || '-',
      a.barangay || '-',
    ])
    const title = `LIVELIHOOD ${unit.toUpperCase()} BENEFICIARY LIST`
    const safeTitle = (projectTitle || unit).replace(/[^a-z0-9]+/gi, '_')

    if (format === 'pdf') {
      const doc = buildRosterPdf(title, infoLines, headerLabels, roster)
      doc.save(`Livelihood_${safeTitle}_Beneficiaries.pdf`)
      return
    }
    if (format === 'csv') {
      const csv = buildRosterCsv(title, infoLines, headerLabels, roster)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `Livelihood_${safeTitle}_Beneficiaries.csv`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(link.href) }, 100)
      return
    }

    const wb = buildRosterWorkbook('Beneficiaries', title, infoLines, headerLabels, roster, 6)
    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `Livelihood_${safeTitle}_Beneficiaries.xlsx`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  // Downloads the participant list for a single Skills Training activity
  // (Training List row-level action) -- same shape/technique as
  // handleExportSessionRoster, adapted to Skills Training's own fields (no
  // separate Highest Education/Employment Status the way CDSP's roster has).
  const handleExportTrainingParticipants = async (activityId: number, format: 'excel' | 'pdf' | 'csv') => {
    const activity = skillsActivities.find(act => act.id === activityId)
    if (!activity) return
    const participants = skillsProfiles
      .filter(p => p.assignedTrainingId === activityId)
      .map((p, i) => [
        i + 1,
        `${p.lastName}, ${p.firstName}${p.middleName ? ' ' + p.middleName : ''}`.trim(),
        p.sex || '-',
        p.age || '-',
        p.contactNumber || '-',
        p.civilStatus || '-',
      ])
    if (participants.length === 0) {
      setInfoModal({ isOpen: true, title: 'No Participants', message: 'This training has no participants assigned yet.' })
      return
    }
    const headerLabels = ['No.', 'Participant Name', 'Sex', 'Age', 'Contact Number', 'Civil Status']
    const infoLines: { label: string; value: string | number }[][] = [
      [{ label: 'Training: ', value: activity.title || '-' }],
      [{ label: 'Training Batch: ', value: activity.service || '-' }],
      [{ label: 'Date: ', value: activity.date || '-' }, { label: '     Venue: ', value: activity.location || '-' }],
      [{ label: 'Facilitator: ', value: activity.facilitator || '-' }],
      [{ label: 'Total Participants: ', value: participants.length }],
    ]
    const safeTitle = (activity.title || 'Training').replace(/[^a-z0-9]+/gi, '_')

    if (format === 'pdf') {
      const doc = buildRosterPdf('SKILLS TRAINING PARTICIPANT LIST', infoLines, headerLabels, participants)
      doc.save(`SkillsTraining_Roster_${safeTitle}_${activity.date || 'undated'}.pdf`)
      return
    }
    if (format === 'csv') {
      const csv = buildRosterCsv('SKILLS TRAINING PARTICIPANT LIST', infoLines, headerLabels, participants)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `SkillsTraining_Roster_${safeTitle}_${activity.date || 'undated'}.csv`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(link.href) }, 100)
      return
    }

    const wb = buildRosterWorkbook('Participants', 'SKILLS TRAINING PARTICIPANT LIST', infoLines, headerLabels, participants, 5)
    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `SkillsTraining_Roster_${safeTitle}_${activity.date || 'undated'}.xlsx`
    link.click()
    URL.revokeObjectURL(link.href)
  }

  const handleCategoryChange = (category: string) => {
    setReportCategory(category as ReportCategory)
    setProgramType('')
    setCdspReportType('participants')
    setGipReportType('participants')
    setSpesReportType('participants')
    setLivelihoodReportType('beneficiaries')
    setSkillsReportType('participants')
    setSelectedGeneralPrograms(REPORT_CATEGORIES.filter(c => c.id !== 'general-peso').map(c => c.id))
    setGeneratedReport(null)
  }

  return (
    <>
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
          <ArrowLeft size={24} className="text-gray-700" />
        </button>
        <span className="text-xl font-bold" style={{ color: '#111827' }}>Reports & Analytics</span>
      </div>

      {/* Configuration Card */}
      <div className="bg-white rounded-xl shadow-md p-6 mb-6">
        <h3 className="text-gray-800 m-0 mb-4 flex items-center gap-2">
          <FileText size={20} className="text-[#0077BE]" />
          Report Configuration
        </h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Report Category</label>
            <div className="relative">
              <select value={reportCategory} onChange={e => handleCategoryChange(e.target.value)}
                className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900 text-sm">
                <option value=""></option>
                {REPORT_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {reportCategory === 'general-peso' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Include Programs</label>
              <div className="relative">
                <button type="button" onClick={() => setIsProgramMenuOpen(!isProgramMenuOpen)}
                  className="w-full flex items-center justify-between pl-3 pr-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900 text-sm">
                  <span>
                    {selectedGeneralPrograms.length === REPORT_CATEGORIES.length - 1
                      ? 'All Programs'
                      : selectedGeneralPrograms.length === 0
                        ? 'None selected'
                        : `${selectedGeneralPrograms.length} Program${selectedGeneralPrograms.length === 1 ? '' : 's'} Selected`}
                  </span>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>
                {isProgramMenuOpen && <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsProgramMenuOpen(false)} />
                  <div className="absolute left-0 top-full mt-2 w-full max-h-72 overflow-y-auto bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-2">
                    <div className="flex justify-between px-4 py-1 mb-1 border-b border-gray-100">
                      <button type="button"
                        onClick={() => setSelectedGeneralPrograms(REPORT_CATEGORIES.filter(c => c.id !== 'general-peso').map(c => c.id))}
                        className="text-xs text-[#0077BE] hover:underline">Select All</button>
                      <button type="button" onClick={() => setSelectedGeneralPrograms([])}
                        className="text-xs text-[#0077BE] hover:underline">Clear All</button>
                    </div>
                    {REPORT_CATEGORIES.filter(c => c.id !== 'general-peso').map(cat => (
                      <label key={cat.id} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={selectedGeneralPrograms.includes(cat.id)}
                          onChange={() => setSelectedGeneralPrograms(prev =>
                            prev.includes(cat.id) ? prev.filter(p => p !== cat.id) : [...prev, cat.id])}
                          className="rounded border-gray-300" />
                        <span className="text-sm text-gray-700">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </>}
              </div>
            </div>
          )}

          {reportCategory === 'cdsp' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
              <div className="relative">
                <select value={cdspReportType} onChange={e => setCdspReportType(e.target.value as 'participants' | 'sessions' | 'aging')}
                  className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900 text-sm">
                  <option value="participants">Participant List</option>
                  <option value="sessions">Activity List</option>
                  <option value="aging">Aging Report</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>
          )}

          {reportCategory === 'gip' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
              <div className="relative">
                <select value={gipReportType} onChange={e => setGipReportType(e.target.value as 'participants' | 'batches' | 'aging')}
                  className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900 text-sm">
                  <option value="participants">Participant List</option>
                  <option value="batches">Workplace/Office List</option>
                  <option value="aging">Aging Report</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>
          )}

          {reportCategory === 'spes' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
              <div className="relative">
                <select value={spesReportType} onChange={e => setSpesReportType(e.target.value as 'participants' | 'batches')}
                  className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900 text-sm">
                  <option value="participants">Participant List</option>
                  <option value="batches">Batch List</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Livelihood: Program Type comes before Report Type here (unlike CDSP
              below) because which columns the Project/Intervention List can show
              depends on which single program is selected — DILP/TUPAD/SLP/CLPEP
              each store different fields, so the program has to be chosen first. */}
          {reportCategory === 'livelihood' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Program Type</label>
              <div className="relative">
                <select value={programType} onChange={e => setProgramType(e.target.value)}
                  className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900 text-sm">
                  <option value="">All Programs</option>
                  {livelihoodPrograms.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>
          )}

          {reportCategory === 'livelihood' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
              <div className="relative">
                <select value={livelihoodReportType} onChange={e => setLivelihoodReportType(e.target.value as 'beneficiaries' | 'projects')}
                  className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900 text-sm">
                  <option value="beneficiaries">Beneficiary List</option>
                  <option value="projects">{livelihoodUnitLabel(programType).plural} List</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>
          )}

          {reportCategory === 'skills-training' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Type</label>
              <div className="relative">
                <select value={skillsReportType} onChange={e => setSkillsReportType(e.target.value as 'participants' | 'activities' | 'aging')}
                  className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900 text-sm">
                  <option value="participants">Participant List</option>
                  <option value="activities">Training List</option>
                  <option value="aging">Aging Report</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>
          )}

          {reportCategory === 'cdsp' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Program Type</label>
              <div className="relative">
                <select value={programType} onChange={e => setProgramType(e.target.value)}
                  className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900 text-sm">
                  <option value="">All Programs</option>
                  {cdspPrograms.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Aging Report is a live snapshot ("how long since completion, as of
              today"), not a list of things that happened within a chosen date
              range -- so the period picker doesn't apply and would be misleading. */}
          {!(reportCategory === 'skills-training' && skillsReportType === 'aging')
            && !(reportCategory === 'cdsp' && cdspReportType === 'aging')
            && !(reportCategory === 'gip' && gipReportType === 'aging') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Report Period</label>
            <div className="grid grid-cols-4 gap-4">
              <div className="relative">
                <select value={reportPeriod} onChange={e => setReportPeriod(e.target.value as ReportPeriod)}
                  className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900 text-sm">
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                  <option value="custom">Custom Range</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
              {reportPeriod === 'monthly' && <>
                <div className="relative">
                  <select value={month} onChange={e => setMonth(e.target.value)}
                    className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900 text-sm">
                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={year} onChange={e => setYear(e.target.value)}
                    className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900 text-sm">
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </>}
              {reportPeriod === 'annual' && (
                <div className="relative">
                  <select value={year} onChange={e => setYear(e.target.value)}
                    className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900 text-sm">
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              )}
              {reportPeriod === 'custom' && <>
                <DatePicker value={fromDate} onChange={setFromDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900 text-sm" />
                <DatePicker value={toDate} onChange={setToDate}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900 text-sm" />
              </>}
            </div>
          </div>
          )}

          <div className="flex justify-end pt-2">
            <button onClick={handleGenerateReport}
              disabled={!reportCategory || pesoLoading || generalPesoLoading || skillsAgingLoading || cdspAgingLoading || gipAgingLoading || (reportCategory === 'general-peso' && selectedGeneralPrograms.length === 0)}
              className="px-5 py-2 text-sm bg-[#0077BE] text-white rounded-lg hover:bg-[#0066A3] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2">
              {(pesoLoading || generalPesoLoading || skillsAgingLoading || cdspAgingLoading || gipAgingLoading) ? <Loader2 size={16} className="animate-spin" /> : <BarChart2 size={16} />}
              {(pesoLoading || generalPesoLoading || skillsAgingLoading || cdspAgingLoading || gipAgingLoading) ? 'Generating…' : 'Generate Report'}
            </button>
          </div>
        </div>
      </div>

      {/* Employment Facilitation LMI Analytics */}
      {generatedReport?.category === 'employment-facilitation' && generatedReport.analytics && (<>
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-gray-800 m-0 mb-4 flex items-center gap-2">
            <BarChart2 size={20} className="text-[#0077BE]" />
            Labor Market Information Summary
          </h3>
          <div className="grid grid-cols-5 gap-4">
            {[
              { label: 'Total Applicants', value: generatedReport.analytics.summary.totalApplicants, cls: 'blue' },
              { label: 'Total Vacancies', value: generatedReport.analytics.summary.totalVacancies, cls: 'purple' },
              { label: 'Total Referrals', value: generatedReport.analytics.summary.totalReferrals, cls: 'orange' },
              { label: 'Total Placements', value: generatedReport.analytics.summary.totalPlacements, cls: 'green' },
              { label: 'Placement Rate', value: `${generatedReport.analytics.summary.placementRate}%`, cls: 'indigo' },
            ].map(({ label, value, cls }) => (
              <div key={label} className={`bg-${cls}-50 rounded-lg p-4 border border-${cls}-100`}>
                <p className={`text-sm text-${cls}-600 m-0 mb-1`}>{label}</p>
                <p className={`text-2xl font-bold text-${cls}-700 m-0`}>{typeof value === 'number' ? value.toLocaleString() : value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-gray-800 m-0 mb-4 flex items-center gap-2">
            <BarChart2 size={20} className="text-[#0077BE]" />
            Labor Market Analytics
          </h3>
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Placements Per Month</h4>
              <div className="space-y-3">
                {generatedReport.analytics.placementsPerMonth.map((item: any, i: number) => {
                  const max = Math.max(...generatedReport.analytics.placementsPerMonth.map((d: any) => d.value), 1)
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{item.month}</span>
                        <span className="font-medium text-gray-800">{item.value}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-[#10B981] h-2 rounded-full" style={{ width: `${(item.value / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Referral Status Distribution</h4>
              <div className="flex items-center justify-center mb-4">
                <div className="w-48 h-48">
                  <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    {generatedReport.analytics.referralStatusDistribution.reduce((acc: any[], item: any, i: number) => {
                      const prev = generatedReport.analytics.referralStatusDistribution.slice(0, i).reduce((s: number, x: any) => s + x.value, 0)
                      const s = (prev / 100) * 2 * Math.PI, e = ((prev + item.value) / 100) * 2 * Math.PI
                      acc.push(<path key={i} d={`M 50 50 L ${50 + 50 * Math.cos(s)} ${50 + 50 * Math.sin(s)} A 50 50 0 ${item.value > 50 ? 1 : 0} 1 ${50 + 50 * Math.cos(e)} ${50 + 50 * Math.sin(e)} Z`} fill={item.color} stroke="white" strokeWidth="0.5" />)
                      return acc
                    }, [])}
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                {generatedReport.analytics.referralStatusDistribution.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-700">{item.status}</span>
                    <span className="ml-auto font-medium text-gray-800">{item.value.toFixed(1)}% ({item.count})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[
              { title: 'Top Job Vacancies', data: generatedReport.analytics.jobVacancyDistribution, color: '#3B82F6', key: 'jobTitle' },
              { title: 'Top Employers by Vacancies', data: generatedReport.analytics.employerParticipation, color: '#0066A3', key: 'employer' },
            ].map(({ title, data, color, key }) => (
              <div key={title}>
                <h4 className="text-sm font-medium text-gray-700 mb-3">{title}</h4>
                <div className="space-y-3">
                  {data.map((item: any, i: number) => {
                    const max = Math.max(...data.map((d: any) => d.value), 1)
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-700">{item[key]}</span>
                          <span className="font-medium text-gray-800">{item.value}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div className="h-2 rounded-full" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: color }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </>)}

      {/* General PESO Analytics */}
      {generatedReport?.category === 'general-peso' && generatedReport.analytics && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-gray-800 m-0 mb-4 flex items-center gap-2">
            <BarChart2 size={20} className="text-[#0077BE]" />
            Report Analytics
          </h3>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Program / Service Participation</h4>
              <div className="space-y-3">
                {generatedReport.analytics.barChartData.map((item: any, i: number) => {
                  const max = Math.max(...generatedReport.analytics.barChartData.map((d: any) => d.value), 1)
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{item.program}</span>
                        <span className="font-medium text-gray-800">{item.value}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="bg-[#0077BE] h-2 rounded-full" style={{ width: `${(item.value / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Program Distribution</h4>
              <div className="flex items-center justify-center mb-4">
                <div className="w-48 h-48">
                  <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    {generatedReport.analytics.pieChartData.reduce((acc: any[], item: any, i: number) => {
                      const prev = generatedReport.analytics.pieChartData.slice(0, i).reduce((s: number, x: any) => s + x.value, 0)
                      const s = (prev / 100) * 2 * Math.PI, e = ((prev + item.value) / 100) * 2 * Math.PI
                      acc.push(<path key={i} d={`M 50 50 L ${50 + 50 * Math.cos(s)} ${50 + 50 * Math.sin(s)} A 50 50 0 ${item.value > 50 ? 1 : 0} 1 ${50 + 50 * Math.cos(e)} ${50 + 50 * Math.sin(e)} Z`} fill={item.color} stroke="white" strokeWidth="0.5" />)
                      return acc
                    }, [])}
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                {generatedReport.analytics.pieChartData.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-700">{item.program}</span>
                    <span className="ml-auto font-medium text-gray-800">{item.value.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aging Analytics (Skills Training / CDSP) — same two-panel bar+pie
          layout as General PESO's chart above, applied to the
          day-since-completion buckets. */}
      {isGeneratedReportAging && generatedReport.analytics && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-gray-800 m-0 mb-4 flex items-center gap-2">
            <BarChart2 size={20} className="text-[#0077BE]" />
            Aging Analytics
          </h3>
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500 m-0">Placed</p>
              <p className="text-2xl font-bold text-emerald-600 m-0 mt-1">{generatedReport.analytics.placedCount}</p>
            </div>
            <div className="rounded-lg border border-gray-200 p-4">
              <p className="text-sm text-gray-500 m-0">Not Yet Placed</p>
              <p className="text-2xl font-bold text-amber-600 m-0 mt-1">{generatedReport.analytics.notPlacedCount}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Beneficiaries by Status</h4>
              <div className="space-y-3">
                {generatedReport.analytics.barChartData.map((item: any, i: number) => {
                  const max = Math.max(...generatedReport.analytics.barChartData.map((d: any) => d.value), 1)
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{item.group}</span>
                        <span className="font-medium text-gray-800">{item.value}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="h-2 rounded-full" style={{ width: `${(item.value / max) * 100}%`, backgroundColor: '#0077BE' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-3">Status Distribution</h4>
              {generatedReport.analytics.pieChartData.length === 0 ? (
                <p className="text-sm text-gray-400">No beneficiaries to chart.</p>
              ) : (<>
              <div className="flex items-center justify-center mb-4">
                <div className="w-48 h-48">
                  <svg viewBox="0 0 100 100" className="transform -rotate-90">
                    {generatedReport.analytics.pieChartData.reduce((acc: any[], item: any, i: number) => {
                      const prev = generatedReport.analytics.pieChartData.slice(0, i).reduce((s: number, x: any) => s + x.value, 0)
                      const s = (prev / 100) * 2 * Math.PI, e = ((prev + item.value) / 100) * 2 * Math.PI
                      acc.push(<path key={i} d={`M 50 50 L ${50 + 50 * Math.cos(s)} ${50 + 50 * Math.sin(s)} A 50 50 0 ${item.value > 50 ? 1 : 0} 1 ${50 + 50 * Math.cos(e)} ${50 + 50 * Math.sin(e)} Z`} fill={item.color} stroke="white" strokeWidth="0.5" />)
                      return acc
                    }, [])}
                  </svg>
                </div>
              </div>
              <div className="space-y-2">
                {generatedReport.analytics.pieChartData.map((item: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="text-gray-700">{item.group}</span>
                    <span className="ml-auto font-medium text-gray-800">{item.value.toFixed(1)}%</span>
                  </div>
                ))}
              </div>
              </>)}
            </div>
          </div>
          {/* CDSP Aging only, "All Programs" only -- matches the Excel/PDF
              "Beneficiaries by Sub-Service" table. */}
          {generatedReport.category === 'cdsp' && !generatedReport.programType && generatedReport.analytics.byGroupBySubService?.length > 0 && (
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Beneficiaries by Sub-Service</h4>
              <div className="space-y-3">
                {generatedReport.analytics.byGroupBySubService.map((item: any, i: number) => {
                  const max = Math.max(...generatedReport.analytics.byGroupBySubService.map((d: any) => d.value), 1)
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{item.group}</span>
                        <span className="font-medium text-gray-800">{item.value}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div className="h-2 rounded-full bg-[#0077BE]" style={{ width: `${(item.value / max) * 100}%` }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Participant-program Summary (General PESO / CDSP / GIP / SPES / Livelihood / Skills Training / OFW) */}
      {generatedReport && ['general-peso', 'cdsp', 'gip', 'spes', 'livelihood', 'skills-training', 'ofw-services'].includes(generatedReport.category) && generatedReport.analytics && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-gray-800 m-0 mb-4 flex items-center gap-2">
            <BarChart2 size={20} className="text-[#0077BE]" />
            {generatedReport.categoryName}
            {isGeneratedReportAging ? ' Aging Report' : ''} Summary
          </h3>
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Total Participants', value: generatedReport.analytics.total },
              { label: 'Male', value: generatedReport.analytics.male },
              { label: 'Female', value: generatedReport.analytics.female },
            ].map(t => (
              <div key={t.label} className="rounded-lg border border-gray-200 p-4">
                <p className="text-sm text-gray-500 m-0">{t.label}</p>
                <p className="text-2xl font-bold text-gray-900 m-0 mt-1">{t.value}</p>
              </div>
            ))}
          </div>
          {/* Breakdown by program is only meaningful when viewing all programs — with a
              specific Program Type selected, every other program would show a
              misleading "0" (it wasn't queried, not actually empty) and the sole
              remaining bar just repeats the Total above. The Aging Report skips
              this breakdown entirely -- its own "Aging Analytics" card above
              already shows the identical bucket breakdown plus a pie chart, so
              repeating it here would just be the same bar list twice in a row. */}
          {(!['cdsp', 'livelihood'].includes(generatedReport.category) || !generatedReport.programType)
            && !isGeneratedReportAging && (<>
          <h4 className="text-sm font-medium text-gray-700 mb-3">{generatedReport.analytics.groupLabel}</h4>
          {generatedReport.analytics.byGroup.length === 0 ? (
            <p className="text-sm text-gray-400">No participants in the selected period.</p>
          ) : (
            <div className="space-y-3">
              {generatedReport.analytics.byGroup.map((item: any, i: number) => {
                const max = Math.max(...generatedReport.analytics.byGroup.map((d: any) => d.value), 1)
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{item.group}</span>
                      <span className="font-medium text-gray-800">{item.value}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-[#0077BE] h-2 rounded-full" style={{ width: `${(item.value / max) * 100}%` }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          </>)}
        </div>
      )}

      {/* Report Preview Table */}
      {generatedReport && (() => {
        // Pagination — mirrors the CDSP/GIP/SPES module list tables.
        const rows: any[] = generatedReport.data
        const totalRows = rows.length
        const totalPages = Math.max(1, Math.ceil(totalRows / previewPerPage))
        const safePage = Math.min(previewPage, totalPages)
        const paginated = rows.slice((safePage - 1) * previewPerPage, safePage * previewPerPage)
        const recordStart = totalRows === 0 ? 0 : (safePage - 1) * previewPerPage + 1
        const recordEnd = Math.min(safePage * previewPerPage, totalRows)
        // Row-level export action — CDSP's Activity List, GIP's Batch List, SPES's
        // Batch List, Livelihood's Project/Intervention List, and Skills Training's
        // Training List all get one, but the label/handler differ (attendees vs.
        // interns vs. students vs. beneficiaries vs. trainees).
        const isCdspSessions = generatedReport.category === 'cdsp' && generatedReport.cdspReportType === 'sessions'
        const isGipBatches = generatedReport.category === 'gip' && generatedReport.gipReportType === 'batches'
        const isSpesBatches = generatedReport.category === 'spes' && generatedReport.spesReportType === 'batches'
        const isLivelihoodProjects = generatedReport.category === 'livelihood' && generatedReport.livelihoodReportType === 'projects'
        const isSkillsActivities = generatedReport.category === 'skills-training' && generatedReport.skillsReportType === 'activities'
        const showRowAction = isCdspSessions || isGipBatches || isSpesBatches || isLivelihoodProjects || isSkillsActivities
        const rowExportLabel = isCdspSessions ? 'Export Attendees' : isGipBatches ? 'Export Interns' : isSpesBatches ? 'Export Students' : isLivelihoodProjects ? 'Export Beneficiaries' : 'Export Trainees'
        const runRowExport = (fmt: 'excel' | 'pdf' | 'csv') => {
          if (rowExportMenuId === null) return
          if (isCdspSessions) handleExportSessionRoster(rowExportMenuId, fmt)
          else if (isGipBatches) handleExportBatchInterns(rowExportMenuId, fmt)
          else if (isSpesBatches) handleExportBatchStudents(rowExportMenuId, fmt)
          else if (isLivelihoodProjects) { if (rowExportMenuProgram) handleExportProjectBeneficiaries(rowExportMenuId, rowExportMenuProgram, fmt) }
          else handleExportTrainingParticipants(rowExportMenuId, fmt)
          setRowExportMenuId(null)
          setRowExportMenuProgram(null)
        }
        return (
        <>
        <div className="bg-white rounded-xl shadow-md">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <div>
              <h3 className="text-gray-800 m-0">Report Preview</h3>
              <p className="text-sm text-gray-500 m-0 mt-1">
                {generatedReport.categoryName} – {generatedReport.periodDetails}
                {generatedReport.programType && ` – ${generatedReport.programType}`}
              </p>
            </div>
            <div className="flex gap-2">
              <div className="relative">
                <button onClick={() => setIsColumnMenuOpen(!isColumnMenuOpen)}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm">
                  <Columns size={16} />Columns<ChevronDown size={16} />
                </button>
                {isColumnMenuOpen && <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsColumnMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-64 max-h-80 overflow-y-auto bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-2">
                    {generatedReport.columns.map((col: string) => (
                      <label key={col} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 cursor-pointer">
                        <input type="checkbox" checked={visibleColumns[col]} onChange={() => toggleColumn(col)} className="rounded border-gray-300" />
                        <span className="text-sm text-gray-700">{col}</span>
                      </label>
                    ))}
                  </div>
                </>}
              </div>
              <div className="relative">
                <button onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-[#0077BE] text-white rounded-lg hover:bg-[#0066A3] text-sm">
                  <Download size={16} />Export<ChevronDown size={16} />
                </button>
                {isExportMenuOpen && <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsExportMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1">
                    <button onClick={() => handleExport('excel')} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">Excel (.xlsx)</button>
                    <button onClick={() => handleExport('csv')} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">CSV (.csv)</button>
                    <button onClick={async () => await handleExport('pdf')} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">PDF (.pdf)</button>
                  </div>
                </>}
              </div>
            </div>
          </div>
          <div className={`overflow-x-auto ${totalRows > 0 ? '' : 'rounded-b-xl'}`}>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {showRowAction && (
                    <th className="sticky left-0 z-10 bg-blue-50 px-6 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap border-r-2 border-blue-100" title="Not included in the exported report — for on-screen use only"></th>
                  )}
                  {generatedReport.columns.filter((col: string) => visibleColumns[col]).map((col: string) => (
                    <th key={col} className="px-6 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {totalRows > 0
                  ? paginated.map((row: any, i: number) => (
                    <tr key={recordStart + i} className="border-b border-gray-100 hover:bg-gray-50">
                      {showRowAction && (() => {
                        const rowId = (isCdspSessions || isSkillsActivities) ? row._activityId : isLivelihoodProjects ? row._projectId : row._batchId
                        const rowProgram = isLivelihoodProjects ? (generatedReport.programType || row['Program Type']) : null
                        return (
                          <td className="sticky left-0 z-10 bg-blue-50 px-6 py-3 text-sm whitespace-nowrap border-r-2 border-blue-100">
                            <button
                              onClick={e => {
                                const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect()
                                const dropdownW = 144 // w-36
                                const dropdownH = 124 // 3 options: Excel/CSV/PDF
                                const left = Math.min(rect.left, window.innerWidth - dropdownW - 8)
                                const spaceBelow = window.innerHeight - rect.bottom - 8
                                const top = spaceBelow >= dropdownH ? rect.bottom + 4 : rect.top - dropdownH - 4
                                setRowExportMenuPos({ top: Math.max(8, top), left: Math.max(8, left) })
                                setRowExportMenuProgram(rowProgram)
                                setRowExportMenuId(rowExportMenuId === rowId ? null : rowId)
                              }}
                              className="flex items-center gap-1.5 text-[#0077BE] hover:underline"
                            >
                              <Download size={14} />{rowExportLabel}<ChevronDown size={12} />
                            </button>
                          </td>
                        )
                      })()}
                      {generatedReport.columns.filter((col: string) => visibleColumns[col]).map((col: string) => {
                        // Aging Report only: color the "Time Since Completion" cell by
                        // its bucket (matches the chart's colors) so severity is visible
                        // without reading the value.
                        const isAgingCell = isGeneratedReportAging && col === 'Time Since Completion' && row._agingBucket
                        const agingColor = isAgingCell ? AGING_BUCKET_COLORS[row._agingBucket] : undefined
                        return (
                          <td key={col} className="px-6 py-3 text-sm whitespace-nowrap">
                            {agingColor ? (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{ backgroundColor: `${agingColor}22`, color: agingColor }}>
                                {row[col] || '-'}
                              </span>
                            ) : (
                              <span className="text-gray-800">{typeof row[col] === 'number' ? row[col] : (row[col] || '-')}</span>
                            )}
                          </td>
                        )
                      })}
                    </tr>
                  ))
                  : (
                    <tr>
                      <td
                        colSpan={generatedReport.columns.length + (showRowAction ? 1 : 0)}
                        className="px-6 py-16 text-center"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <BarChart2 size={40} className="text-gray-300" />
                          <p className="text-gray-700 font-medium m-0">No data available for this report.</p>
                          <p className="text-gray-500 text-sm m-0 max-w-md">
                            No {generatedReport.categoryName} records were found for {generatedReport.periodDetails}
                            {generatedReport.programType && ` (${generatedReport.programType})`}. Try a different Report
                            Period{generatedReport.programType ? ' or Program Type' : ''}, or confirm data has been added for this program.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )
                }
              </tbody>
            </table>
          </div>
          {totalRows > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 rounded-b-xl">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                Show
                <select
                  value={previewPerPage}
                  onChange={e => { setPreviewPerPage(Number(e.target.value)); setPreviewPage(1) }}
                  className="border border-gray-300 rounded-lg px-2 py-1 text-sm text-gray-700 focus:outline-none focus:border-brand-blue"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                per page
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <button onClick={() => setPreviewPage(p => Math.max(1, p - 1))} disabled={safePage === 1} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronLeft size={16} />
                </button>
                <span>{recordStart} to {recordEnd} of {totalRows} records</span>
                <button onClick={() => setPreviewPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages} className="p-1 rounded hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Row-level Export Attendees/Interns/Students dropdown — rendered
            fixed at the document level (not nested in the sticky column) so
            it isn't clipped by the table's overflow-x-auto or trapped inside
            the sticky cell's own stacking context, which would otherwise
            paint it underneath later rows' sticky cells. */}
        {rowExportMenuId !== null && rowExportMenuPos && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setRowExportMenuId(null); setRowExportMenuProgram(null) }} />
            <div
              style={{ position: 'fixed', top: rowExportMenuPos.top, left: rowExportMenuPos.left }}
              className="w-36 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1"
            >
              <button onClick={() => runRowExport('excel')} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Excel (.xlsx)</button>
              <button onClick={() => runRowExport('csv')} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">CSV (.csv)</button>
              <button onClick={() => runRowExport('pdf')} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">PDF (.pdf)</button>
            </div>
          </>
        )}
        </>
        )
      })()}

      {/* Empty State */}
      {!generatedReport && (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <div className="flex justify-center mb-4">
            <BarChart2 size={64} className="text-gray-300" />
          </div>
          {reportCategory === 'employment-facilitation' ? (
            <>
              <h3 className="text-gray-800 m-0 mb-2">No preview for this report.</h3>
              <p className="text-gray-500 m-0">
                Employment Facilitation reports download directly as an Excel file (PESO LMI Report) when you click "Generate Report" — no preview is shown.
              </p>
            </>
          ) : (
            <>
              <h3 className="text-gray-800 m-0 mb-2">No report generated yet.</h3>
              <p className="text-gray-500 m-0">
                Select a report category, configure the period, and click "Generate Report" to view the data.
              </p>
            </>
          )}
        </div>
      )}
    </div>
    <ConfirmModal
      isOpen={infoModal.isOpen} type="error" title={infoModal.title} message={infoModal.message}
      confirmText="OK" onConfirm={() => setInfoModal(prev => ({ ...prev, isOpen: false }))} onCancel={() => setInfoModal(prev => ({ ...prev, isOpen: false }))}
    />
    </>
  )
}
