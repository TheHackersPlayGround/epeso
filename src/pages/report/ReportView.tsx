import { useState, useEffect } from 'react'
import { ArrowLeft, FileText, Download, ChevronDown, Columns, BarChart2, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import DatePicker from '../../components/DatePicker'
import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { registerPdfFont, PDF_FONT_FAMILY } from './fonts/registerPdfFont'
import ConfirmModal from '../shared/ConfirmModal'
import { fetchEfReport, fetchGeneralPesoReport, fetchSkillsAgingReport, type SkillsAgingRow, fetchCdspAgingReport, type CdspAgingRow, fetchGipAgingReport, type GipAgingRow } from '../../services/reportService'
import { monthsSince, relativeSince, agingBucket, AGING_BUCKET_ORDER, AGING_BUCKET_COLORS } from '../../utils/aging'
import { generatePesoMonthlyReport } from './pesoMonthlyReport'
import { generateGeneralPesoWorkbook } from './generalPesoReport'
import { generateWordReport, generateWordRoster } from './wordReport'
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
import { useEmployment } from '../../contexts/EmploymentContext'
import { useRefreshOnReturn } from '../../hooks/useRefreshOnReturn'

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

// Module scope so its first entry can seed reportCategory's default value.
// Order matches the dashboard's module menu.
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

// Renders the Reports module: filters, generated report preview, and exports.
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

  // Employment Facilitation's referrals/placements come from the same
  // app-level provider every category above uses.
  const { referrals: efReferrals, placements: efPlacements, refreshIfStale: refreshEmploymentIfStale } = useEmployment()
  // Reports are built from the shared lists, so re-sync them all (silently)
  // when the Reports page is opened.
  const refreshers = [
    useCDSP().refreshIfStale, useGIP().refreshIfStale, useSPES().refreshIfStale,
    useSkillsTraining().refreshIfStale, useOFW().refreshIfStale, useDILP().refreshIfStale,
    useTUPAD().refreshIfStale, useSLP().refreshIfStale, useCLPEP().refreshIfStale,
    refreshEmploymentIfStale,
  ]
  useRefreshOnReturn(() => { refreshers.forEach(r => { void r() }) })

  const [infoModal, setInfoModal] = useState<{ isOpen: boolean; title: string; message: string }>({ isOpen: false, title: '', message: '' })
  const [reportCategory, setReportCategory] = useState<ReportCategory | ''>('')
  const [programType, setProgramType] = useState('')
  const [cdspReportType, setCdspReportType] = useState<'participants' | 'sessions' | 'aging'>('participants')
  const [cdspAgingLoading, setCdspAgingLoading] = useState(false)
  const [gipAgingLoading, setGipAgingLoading] = useState(false)
  const [gipReportType, setGipReportType] = useState<'participants' | 'batches' | 'aging'>('participants')
  const [spesReportType, setSpesReportType] = useState<'participants' | 'batches'>('participants')
  const [livelihoodReportType, setLivelihoodReportType] = useState<'beneficiaries' | 'projects'>('beneficiaries')
  // Status filter for the project/session/batch/training lists (Livelihood projects, CDSP sessions,
  // SPES batches, Skills Training trainings): 'All' or one exact status.
  const [listStatusFilter, setListStatusFilter] = useState('All')
  const [skillsReportType, setSkillsReportType] = useState<'participants' | 'activities' | 'aging'>('participants')
  const [skillsAgingLoading, setSkillsAgingLoading] = useState(false)
  // General PESO Report: which programs to roll up, defaults to all; can be
  // narrowed via the "Include Programs" picker.
  const [selectedGeneralPrograms, setSelectedGeneralPrograms] = useState<string[]>(
    REPORT_CATEGORIES.filter(c => c.id !== 'general-peso').map(c => c.id),
  )
  const [isProgramMenuOpen, setIsProgramMenuOpen] = useState(false)
  const [generalPesoLoading, setGeneralPesoLoading] = useState(false)
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('monthly')
  // Local Date getters, not toISOString() (UTC, can read back a day off).
  const now = new Date()
  const currentYear = String(now.getFullYear())
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0')
  const todayIso = `${currentYear}-${currentMonth}-${String(now.getDate()).padStart(2, '0')}`
  const [month, setMonth] = useState(currentMonth)
  const [year, setYear] = useState(currentYear)
  const [fromDate, setFromDate] = useState(`${currentYear}-01-01`)
  const [toDate, setToDate] = useState(todayIso)
  const [generatedReport, setGeneratedReport] = useState<any>(null)
  // Skills Training/CDSP/GIP Aging Reports share the same downstream
  // handling (Excel/PDF/on-screen); CDSP adds a sub-service breakdown on top.
  // Computed once here so handleExport and the JSX gates below stay in sync.
  const isGeneratedReportAging = !!generatedReport && (
    (generatedReport.category === 'skills-training' && generatedReport.skillsReportType === 'aging')
    || (generatedReport.category === 'cdsp' && generatedReport.cdspReportType === 'aging')
    || (generatedReport.category === 'gip' && generatedReport.gipReportType === 'aging')
  )

  // Clear the generated report on any filter change so a stale snapshot
  // can't be mistaken for the new selection.
  useEffect(() => {
    setGeneratedReport(null)
  }, [reportCategory, programType, cdspReportType, gipReportType, spesReportType, livelihoodReportType, listStatusFilter, skillsReportType, selectedGeneralPrograms, reportPeriod, month, year, fromDate, toDate])

  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false)
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)
  // Which row's Export dropdown is open (by _activityId/_batchId), plus its
  // viewport position for a position:fixed menu so it isn't clipped by the
  // scrollable table or stuck under sticky cells.
  const [rowExportMenuId, setRowExportMenuId] = useState<number | null>(null)
  const [rowExportMenuPos, setRowExportMenuPos] = useState<{ top: number; left: number } | null>(null)
  // Livelihood-only: which sub-program rowExportMenuId belongs to, since
  // DILP/TUPAD/SLP/CLPEP each have their own id sequence.
  const [rowExportMenuProgram, setRowExportMenuProgram] = useState<string | null>(null)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({})
  // Preview pagination, same pattern as the module list tables.
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

  // Folio / long bond (8.5 x 13"), matches the Excel exports' paper size.
  const FOLIO_MM: [number, number] = [215.9, 330.2]

  // Renders one centered line of alternating bold-label/normal-value
  // segments, for the roster PDFs' info lines.
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

  // "#RRGGBB" -> [r, g, b] for autotable's fillColor/textColor options.
  const hexToRgb = (hex: string): [number, number, number] => {
    const n = parseInt(hex.replace('#', ''), 16)
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
  }

  // Forces every cell in the workbook to Times New Roman as a final pass,
  // keeping each cell's existing bold/color/size. Not used by the PESO/LMI
  // Monthly Report or General PESO Report, which patch a template directly.
  const EXCEL_FONT_NAME = 'Times New Roman'
  const applyExcelFont = (wb: ExcelJS.Workbook) => {
    wb.eachSheet(ws => {
      ws.eachRow({ includeEmpty: true }, row => {
        row.eachCell({ includeEmpty: true }, cell => {
          cell.font = { ...cell.font, name: EXCEL_FONT_NAME }
          // Rich-text cells carry their own per-run font, which overrides
          // the cell-level font set above, so patch those runs too.
          const v = cell.value as unknown
          if (v && typeof v === 'object' && Array.isArray((v as { richText?: unknown }).richText)) {
            const runs = (v as { richText: { font?: Partial<ExcelJS.Font>; text: string }[] }).richText
            cell.value = { richText: runs.map(run => ({ ...run, font: { ...run.font, name: EXCEL_FONT_NAME } })) }
          }
        })
      })
    })
  }

  // Splits usableWidth across columns by actual rendered text width
  // (header vs. longest value), not a raw character count, so narrow
  // columns like dates don't wrap unnecessarily.
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

  // Shared PDF builder for the per-activity/batch roster exports. Landscape,
  // same Folio paper as the main report.
  // cellFill is optional: only the Skills Training roster uses it, to color
  // the Attendance column by Present/Absent.
  const buildRosterPdf = (
    title: string,
    infoLines: { label: string; value: string | number }[][],
    headerLabels: string[],
    rows: (string | number)[][],
    cellFill?: (colIndex: number, row: (string | number)[]) => string | undefined,
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
      // Plain white header with bold black text and black borders throughout,
      // matching the main report export's table styling.
      headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 9, font: PDF_FONT_FAMILY },
      bodyStyles: { fontSize: 8, font: PDF_FONT_FAMILY, textColor: [0, 0, 0] },
      margin: { left: 14, right: 14 },
      tableWidth: usableWidth,
      columnStyles,
      styles: { overflow: 'linebreak', font: PDF_FONT_FAMILY, lineColor: [0, 0, 0], lineWidth: 0.1 },
      didParseCell: !cellFill ? undefined : (data) => {
        if (data.section !== 'body') return
        const color = cellFill(data.column.index, rows[data.row.index])
        if (color) {
          data.cell.styles.fillColor = hexToRgb(color)
          data.cell.styles.textColor = 255
          data.cell.styles.fontStyle = 'bold'
        }
      },
    })

    return doc
  }


  // Combined address column for CDSP/GIP/SPES lists. No Province/Region,
  // since one PESO office covers a single jurisdiction anyway.
  const formatAddress = (a: { streetPurok?: string; barangay?: string; cityMunicipality?: string; province?: string }): string => {
    const parts = [a.streetPurok, a.barangay, a.cityMunicipality, a.province].filter(Boolean)
    return parts.length > 0 ? parts.join(', ') : '-'
  }

  // Peso-formats a raw numeric-string field so currency columns render consistently.
  const formatCurrency = (value?: string | number | null): string =>
    value ? `₱${Number(value).toLocaleString()}` : '-'

  // Strips the time-of-day from a plain date or full timestamp string.
  const dateOnly = (value?: string | null): string =>
    value ? value.split('T')[0].split(' ')[0] : '-'

  // CDSP Activity List columns: one row per activity/session.
  const CDSP_SESSION_COLUMNS = ['Activity Title', 'Service Type', 'Date', 'Venue', 'Facilitator', 'Counselor', 'Duration', 'Participants', 'Status']
  // GIP Workplace/Office List columns: one row per deployment, not per intern.
  const GIP_WORKPLACE_COLUMNS = ['Assigned Office', 'Workplace/Office Address', 'Supervisor', 'Allowance', 'Interns']
  // SPES Batch List columns: one row per batch. "Total Slots" is capacity,
  // not remaining (see the Participants column for that).
  const SPES_BATCH_COLUMNS = ['Batch Name', 'Employer', 'Deployment Location', 'Start Date', 'End Date', 'Coordinator', 'Total Slots', 'Funding Source', 'Participants', 'Status']
  // Livelihood Project/Intervention List columns, one row per project/intervention.
  // Each program's own columns match what that program actually stores; the
  // combined "All Programs" view uses a shared column set across all four.
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
  // Skills Training Activity List columns: one row per training session.
  // Present/Absent only populate once a training is Completed.
  const SKILLS_TRAINING_ACTIVITY_COLUMNS = ['Training Title', 'Training Batch', 'Date', 'Venue', 'Facilitator', 'Participants', 'Present', 'Absent', 'Status']
  // Skills Training Aging Report columns: one row per beneficiary who has
  // completed at least one training. Not period-filtered; it's a live snapshot.
  const SKILLS_AGING_COLUMNS = ['No.', 'Participant Name', 'Trainings Completed', 'Last Completed Training', 'Completed Date',
    'Time Since Completion', 'Employment Status', 'Job Title', 'Employer', 'Date Hired']
  // CDSP Aging Report columns: same shape as Skills Training's, plus
  // Sub-Service since CDSP has three sharing one Aging pool.
  const CDSP_AGING_COLUMNS = ['No.', 'Participant Name', 'Sub-Service', 'Activities Completed', 'Last Completed Activity', 'Completed Date',
    'Time Since Completion', 'Employment Status', 'Job Title', 'Employer', 'Date Hired']
  // GIP Aging Report columns: same shape as Skills Training's, minus the
  // completed-count column since GIP is one-shot.
  const GIP_AGING_COLUMNS = ['No.', 'Participant Name', 'Last Completed Workplace/Office', 'Completed Date',
    'Time Since Completion', 'Employment Status', 'Job Title', 'Employer', 'Date Hired']
  // General PESO Report columns: one row per program, not per participant.
  // "Activities Conducted"/"Placements" show "-" where the concept doesn't apply.
  const GENERAL_PESO_COLUMNS = ['Program / Service', 'Participants', 'Male', 'Female', 'Activities Conducted', 'Placements']

  // Returns the project/intervention list columns for the selected program.
  const getLivelihoodProjectColumns = (): string[] => {
    if (programType === 'DILEEP (DILP)') return LIVELIHOOD_DILP_PROJECT_COLUMNS
    if (programType === 'DILEEP (TUPAD)') return LIVELIHOOD_TUPAD_PROJECT_COLUMNS
    if (programType === 'SLP') return LIVELIHOOD_SLP_PROJECT_COLUMNS
    if (programType === 'CLPEP') return LIVELIHOOD_CLPEP_PROJECT_COLUMNS
    return LIVELIHOOD_ALL_PROJECT_COLUMNS
  }

  // DILP/TUPAD/SLP call their record a "Project"; CLPEP calls it an
  // "Intervention". Use the right term for the selected program.
  const livelihoodUnitLabel = (pt: string): { singular: string; plural: string } => {
    if (pt === 'CLPEP') return { singular: 'Intervention', plural: 'Interventions' }
    if (pt === 'DILEEP (DILP)' || pt === 'DILEEP (TUPAD)' || pt === 'SLP') return { singular: 'Project', plural: 'Projects' }
    return { singular: 'Project/Intervention', plural: 'Projects/Interventions' }
  }

  // Possible statuses per list, pre-seeded at 0 so an empty status still
  // shows its own row. Each record type only lists statuses it can have;
  // "Cancelled" isn't seeded since no Maintenance screen can set it, but a
  // record that has it is still counted.
  const CDSP_SESSION_STATUSES = ['Planned', 'Ongoing', 'Completed']
  const SPES_BATCH_STATUSES = ['Planned', 'Ongoing', 'Completed']
  const SKILLS_ACTIVITY_STATUSES = ['Planned', 'Ongoing', 'Completed']
  // Each Livelihood program uses its own status set; "All Programs" uses the union.
  const LIVELIHOOD_PROJECT_STATUSES: Record<string, string[]> = {
    'DILEEP (DILP)': ['Planned', 'Ongoing', 'Completed'],
    'DILEEP (TUPAD)': ['Planned', 'Ongoing', 'Completed'],
    'SLP': ['Planned', 'Ongoing', 'Completed'],
    'CLPEP': ['Planned', 'Ongoing', 'Completed'],
  }
  const LIVELIHOOD_ALL_PROJECT_STATUSES = ['Planned', 'Ongoing', 'Completed']
  // Statuses offered by the report's Status filter, or null when the chosen report has no status filter.
  const getStatusFilterOptions = (): string[] | null => {
    let statuses: string[] | null = null
    if (reportCategory === 'livelihood' && livelihoodReportType === 'projects') statuses = getLivelihoodProjectStatuses(programType)
    else if (reportCategory === 'cdsp' && cdspReportType === 'sessions') statuses = CDSP_SESSION_STATUSES
    else if (reportCategory === 'spes' && spesReportType === 'batches') statuses = SPES_BATCH_STATUSES
    else if (reportCategory === 'skills-training' && skillsReportType === 'activities') statuses = SKILLS_ACTIVITY_STATUSES
    return statuses
  }

  // Returns the status options for a Livelihood program.
  const getLivelihoodProjectStatuses = (programType: string): string[] =>
    LIVELIHOOD_PROJECT_STATUSES[programType] ?? LIVELIHOOD_ALL_PROJECT_STATUSES

  // Returns the full column set for a report category.
  const getReportColumns = (category: ReportCategory): string[] => {
    if (category === 'cdsp' && cdspReportType === 'sessions') return CDSP_SESSION_COLUMNS
    if (category === 'gip' && gipReportType === 'batches') return GIP_WORKPLACE_COLUMNS
    if (category === 'spes' && spesReportType === 'batches') return SPES_BATCH_COLUMNS
    if (category === 'livelihood' && livelihoodReportType === 'projects') return getLivelihoodProjectColumns()
    if (category === 'skills-training' && skillsReportType === 'activities') return SKILLS_TRAINING_ACTIVITY_COLUMNS
    const map: Record<ReportCategory, string[]> = {
      'general-peso': GENERAL_PESO_COLUMNS,
      'employment-facilitation': ['Applicant Name', 'Employer', 'Job Title', 'Referral Status', 'Placement Status', 'Employment Type', 'Date Referred', 'Date Hired'],
      'ofw-services': ['No.', 'OFW Name', 'Sex', 'Civil Status', 'Contact Number', 'Email', 'Address', 'Barangay',
                        'Type of Request', 'Employment Status', 'Desired Position', 'Type of Skill', 'Agencies',
                        'Date Filed', 'Status'],
      'cdsp': ['No.', 'Participant Name', 'Sex', 'Age', 'Birthdate', 'Program Type', 'Highest Education',
               'Employment Status', 'School', 'Course / Program', 'Strand', 'Current Occupation', 'Civil Status',
               'Date Applied', 'Contact Number', 'Barangay', 'Address', 'Status', 'Remarks'],
      'livelihood': ['No.', 'Beneficiary Name', 'Sex', 'Age', 'Birthdate', 'Program Type', 'Civil Status',
                     'Date Applied', 'Contact Number', 'Barangay', 'Address', 'Assigned Project/Intervention',
                     'Assistance Amount', 'Release Date', 'Status', 'Remarks'],
      'gip': ['No.', 'Participant Name', 'Sex', 'Age', 'Birthdate', 'Highest Education', 'Assigned Office', 'Workplace/Office Address',
              'Date Assigned', 'Date Completed', 'Status', 'School Name', 'Course', 'Strand', 'Civil Status',
              'Contact Number', 'Barangay', 'Address', 'Supervisor', 'Allowance', 'Remarks'],
      'spes': ['No.', 'Participant Name', 'Sex', 'Age', 'Birthdate', 'School Name', 'Grade/Year Level', 'Employer', 'Deployment Location',
               'Start Date', 'End Date', 'Status', 'Batch', 'Course', 'School Type', 'Civil Status', 'Contact Number',
               'Barangay', 'Address', 'Annual Family Income', 'No. of Dependents', 'Remarks'],
      'skills-training': ['No.', 'Participant Name', 'Sex', 'Age', 'Birthdate', 'Civil Status', 'Classification', 'Desired Qualification',
                           'Purpose of Training', 'Assigned Training', 'Training Status', 'Date Applied', 'Contact Number',
                           'Barangay', 'Address', 'Status'],
    }
    return map[category] || []
  }

  // Columns shown by default; the rest are optional (user turns them on via the
  // Columns menu). Only CDSP/GIP distinguish default vs optional; others show all.
  // "Status" is never on by default anywhere; still toggleable via the Columns menu.
  const getDefaultColumns = (category: ReportCategory): string[] => {
    const withoutStatus = (cols: string[]) => cols.filter(c => c !== 'Status')
    // CDSP Activity List: all columns shown by default.
    if (category === 'cdsp' && cdspReportType === 'sessions') return withoutStatus(CDSP_SESSION_COLUMNS)
    // GIP Workplace/Office List: all columns shown by default.
    if (category === 'gip' && gipReportType === 'batches') return withoutStatus(GIP_WORKPLACE_COLUMNS)
    // CDSP: core fields on by default; date applied/occupation/civil status/remarks are optional.
    if (category === 'cdsp') return ['No.', 'Participant Name', 'Sex', 'Age', 'Birthdate', 'Program Type', 'Highest Education', 'Employment Status', 'Contact Number', 'Address']
    // GIP: identity, education, deployment office and period. Status is optional.
    if (category === 'gip') return ['No.', 'Participant Name', 'Sex', 'Age', 'Birthdate', 'Highest Education', 'Assigned Office', 'Workplace/Office Address', 'Date Assigned', 'Date Completed', 'Contact Number', 'Address']
    // SPES Batch List: all columns shown by default.
    if (category === 'spes' && spesReportType === 'batches') return withoutStatus(SPES_BATCH_COLUMNS)
    // SPES: identity, school/year level, employer and period. Status is optional.
    if (category === 'spes') return ['No.', 'Participant Name', 'Sex', 'Age', 'Birthdate', 'School Name', 'Grade/Year Level', 'Employer', 'Deployment Location', 'Start Date', 'End Date', 'Contact Number', 'Address']
    // Livelihood Project/Intervention List: all columns shown by default.
    if (category === 'livelihood' && livelihoodReportType === 'projects') return withoutStatus(getLivelihoodProjectColumns())
    // Livelihood: identity, program type, assistance details. Rest is optional.
    if (category === 'livelihood') return ['No.', 'Beneficiary Name', 'Sex', 'Age', 'Birthdate', 'Program Type', 'Contact Number', 'Address']
    // Skills Training Activity List: all columns shown by default.
    if (category === 'skills-training' && skillsReportType === 'activities') return withoutStatus(SKILLS_TRAINING_ACTIVITY_COLUMNS)
    // Skills Training: identity, assigned training, and period. Rest is optional.
    if (category === 'skills-training') return ['No.', 'Participant Name', 'Sex', 'Age', 'Birthdate', 'Assigned Training', 'Training Status', 'Contact Number', 'Address']
    // OFW: identity, request type, employment status, and period. Rest is optional.
    if (category === 'ofw-services') return ['No.', 'OFW Name', 'Sex', 'Type of Request', 'Employment Status', 'Date Filed', 'Contact Number', 'Address']
    return withoutStatus(getReportColumns(category))
  }

  // True when the report covers every status; only then is a "by Status" breakdown useful.
  const coversAllStatuses = (filter?: string): boolean => !filter || filter === 'All'

  // Does a list row's status pass the chosen Status filter?
  const matchesListStatus = (status: string): boolean => {
    return listStatusFilter === 'All' || status === listStatusFilter
  }

  // True when a date falls within the selected report period (monthly/annual/custom).
  const inSelectedPeriod = (dateStr: string): boolean => {
    if (!dateStr) return false
    const [yStr, mStr, dStr] = dateStr.split('-')
    const recYear = Number(yStr), recMonth = Number(mStr)
    if (!recYear || !recMonth || !dStr) return false
    if (reportPeriod === 'annual') return recYear === Number(year)
    if (reportPeriod === 'custom') return dateStr >= fromDate && dateStr <= toDate
    return recYear === Number(year) && recMonth === Number(month)
  }

  // First and last day (YYYY-MM-DD) of the chosen report period.
  const getPeriodRange = (): { start: string; end: string } => {
    if (reportPeriod === 'annual') return { start: `${year}-01-01`, end: `${year}-12-31` }
    if (reportPeriod === 'custom') return { start: fromDate, end: toDate }
    const mm = String(Number(month)).padStart(2, '0')
    const lastDay = String(new Date(Number(year), Number(month), 0).getDate()).padStart(2, '0')
    return { start: `${year}-${mm}-01`, end: `${year}-${mm}-${lastDay}` }
  }

  // Counts an intern from their assigned date until completed (or still ongoing).
  // No assignment date means not counted.
  const internAtWorkplaceInPeriod = (a: { assignmentHistory: { assignedDate: string; completedDate?: string | null }[] }): boolean => {
    const history = a.assignmentHistory[0]
    const assigned = (history?.assignedDate ?? '').slice(0, 10)
    if (!assigned) return false
    const completed = (history?.completedDate ?? '').slice(0, 10)
    const { start, end } = getPeriodRange()
    return assigned <= end && (!completed || completed >= start)
  }

  // Builds the detailed report rows for a category from the shared lists.
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
            .filter(act => inSelectedPeriod(act.date) && matchesListStatus(act.status))
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
              _activityId: act.id, // used only for the roster export, not rendered
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
              'Birthdate': a.birthdate || '-',
              'Civil Status': a.civilStatus || '-',
              'Highest Education': a.highestEducation || '-',
              'School': a.schoolName || '-',
              'Course / Program': a.course || '-',
              'Strand': a.strand || '-',
              'Employment Status': a.employmentStatus || '-',
              'Current Occupation': a.currentOccupation || '-',
              'Contact Number': a.contactNumber || '-',
              'Barangay': a.barangay || '-',
              'Address': formatAddress(a),
              'Remarks': a.remarks || '-',
            }
          })

      case 'gip':
        if (gipReportType === 'batches') {
          // Workplaces are a reusable directory with no period of their own.
          return gipWorkplaces
            .map(w => ({
              'Assigned Office': w.workplaceName || '-',
              'Workplace/Office Address': w.deploymentLocation || '-',
              'Supervisor': w.supervisor || '-',
              'Allowance': formatCurrency(w.allowance),
              // Interns at this workplace during the report period, excluding Withdrawn,
              // to match the "Export Interns" roster.
              'Interns': gipApplicants.filter(a => a.assignedWorkplaceId === w.id && a.status !== 'Withdrawn' && internAtWorkplaceInPeriod(a)).length,
              _batchId: w.id, // used only for the roster export, not rendered
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
              'Birthdate': a.birthdate || '-',
              'Highest Education': a.highestEducation || '-',
              'Assigned Office': workplace?.workplaceName || '-',
              'Workplace/Office Address': workplace?.deploymentLocation || '-',
              // These two are timestamps, not plain dates; keep only the date part.
              'Date Assigned': dateOnly(history?.assignedDate),
              'Date Completed': dateOnly(history?.completedDate),
              'Status': a.status,
              'School Name': a.schoolName || '-',
              'Course': a.course || '-',
              'Strand': a.strand || '-',
              'Civil Status': a.civilStatus || '-',
              'Contact Number': a.contactNumber || '-',
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
            .filter(b => inSelectedPeriod(b.programStartDate) && matchesListStatus(b.status))
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
              _batchId: b.id, // used only for the roster export, not rendered
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
              'Birthdate': a.birthdate || '-',
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
            .filter(act => inSelectedPeriod(act.date) && matchesListStatus(act.status))
            .map(act => ({
              'Training Title': act.title || '-',
              'Training Batch': act.batchName || '-',
              'Date': act.date || '-',
              'Venue': act.location || '-',
              'Facilitator': act.facilitator || '-',
              'Participants': act.assignedCount ?? act.participants ?? 0,
              // Only meaningful once Completed; show '-' instead of a misleading 0/0.
              'Present': act.status === 'Completed' ? act.presentCount : '-',
              'Absent': act.status === 'Completed' ? act.absentCount : '-',
              'Status': act.status,
              _activityId: act.id, // used only for the roster export, not rendered
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
            'Birthdate': p.birthdate || '-',
            'Civil Status': p.civilStatus || '-',
            'Classification': [...(p.classification ?? []), ...(p.classificationOther ?? []).filter(Boolean).map((v: string) => `Others: ${v}`)].join(', ') || '-',
            'Desired Qualification': [...(p.desiredQualification ?? []), ...(p.qualificationOther ?? []).filter(Boolean).map((v: string) => `Others: ${v}`)].join(', ') || '-',
            'Purpose of Training': [...(p.purposeOfTraining ?? []), ...(p.purposeOther ?? []).filter(Boolean).map((v: string) => `Others: ${v}`)].join(', ') || '-',
            'Assigned Training': p.assignedTrainingTitle || '-',
            'Training Status': p.assignedTrainingStatus || '-',
            'Date Applied': p.dateApplicationReceived || '-',
            'Contact Number': p.contactNumber || '-',
            'Barangay': p.barangay || '-',
            'Address': formatAddress(p),
            'Status': p.status,
          }))
      }

      case 'livelihood': {
        if (livelihoodReportType === 'projects') {
          // A specific Program Type shows that program's own real columns,
          // no generic naming or "-" filler. "All Programs" uses the combined shape.
          if (programType === 'DILEEP (DILP)') {
            return dilpProjects
              // Date Released is optional, so DILP projects are placed by the day they were entered
              .filter(p => inSelectedPeriod(p.createdDate) && matchesListStatus(p.status))
              .map((p, i) => ({
                'No.': i + 1,
                'Project ID': p.projectIdNumber || '-',
                'Project Name': p.projectName || '-',
                'Type of Project': p.typeOfProject || '-',
                'Program Component': p.programComponent || '-',
                'Way of Implementation': p.wayOfImplementation || '-',
                'Location': formatAddress({ streetPurok: p.streetPurok, barangay: p.barangay, cityMunicipality: p.cityMunicipality, province: p.province }),
                'Assistance Amount': formatCurrency(p.assistanceAmount),
                'Release Date': p.dateReleased || '-',
                'Beneficiaries Assigned': p.assignedCount ?? 0,
                'Status': p.status,
                _projectId: p.id, // used only for the export, not rendered
              }))
          }
          if (programType === 'DILEEP (TUPAD)') {
            return tupadProjects
              .filter(p => inSelectedPeriod(p.date) && matchesListStatus(p.status))
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
                _projectId: p.id, // used only for the export, not rendered
              }))
          }
          if (programType === 'SLP') {
            return slpProjects
              .filter(p => inSelectedPeriod(p.dateStarted) && matchesListStatus(p.status))
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
                _projectId: p.id, // used only for the export, not rendered
              }))
          }
          if (programType === 'CLPEP') {
            return clpepInterventions
              .filter(p => inSelectedPeriod(p.date) && matchesListStatus(p.status))
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
                _projectId: p.id, // used only for the export, not rendered
              }))
          }
          // All Programs: combined view. The four record types don't share a
          // common shape (CLPEP has no assistance amount/release date), so
          // fields a program doesn't store show "-".
          const rows: any[] = [
            ...dilpProjects.map(p => ({
              ...p, _program: 'DILEEP (DILP)', _name: p.projectName,
              _category: [p.typeOfProject, p.programComponent].filter(Boolean).join(' - '),
              _desc: '-', _date: p.createdDate,
              _location: formatAddress({ streetPurok: p.streetPurok, barangay: p.barangay, cityMunicipality: p.cityMunicipality, province: p.province }),
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
            // Reaching here means programType is '' (All Programs); the four
            // branches above already cover every specific program.
            // DILP has no start date, so it filters on the date entered instead.
            .filter(p => inSelectedPeriod(p._date) && matchesListStatus(p.status))
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
        // Combines the four Livelihood sub-programs into one row shape, joining
        // each applicant to their assigned project/intervention for assistance
        // amount and release date.
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
            'Birthdate': a.birthdate || '-',
            'Program Type': a._program,
            'Date Applied': a.dateApplied || '-',
            'Civil Status': a.civilStatus || '-',
            'Contact Number': a.contactNumber || '-',
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
          // Period filter on Date Filed, OFW's only date field.
          .filter(p => inSelectedPeriod(p.dateFiled))
          .map((p, i) => ({
            'No.': i + 1,
            'OFW Name': p.name,
            'Sex': p.sex || '-',
            'Civil Status': p.civilStatus || '-',
            'Contact Number': p.contactNumber || '-',
            'Email': p.email || '-',
            'Address': formatAddress({ streetPurok: p.address, barangay: p.barangay, cityMunicipality: p.municipality, province: p.province }),
            'Barangay': p.barangay || '-',
            'Type of Request': p.typeOfRequest.join(', '),
            'Employment Status': p.employmentStatus,
            'Desired Position': p.desiredPosition || '-',
            'Type of Skill': p.typeOfSkill || '-',
            'Agencies': p.agencies?.length ? p.agencies.join(', ') : '-',
            'Date Filed': p.dateFiled,
            'Status': p.status,
          }))

      // 'general-peso' and Employment Facilitation short-circuit to their own
      // live backend-call handlers before reaching generateData().
      default:
        return []
    }
  }

  // Participant-program summary: total, a breakdown by the given column, and
  // a male/female split. `groupLabel` is the breakdown heading.
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

  // PESO LMI/SPRS report, pulled live, exported as the official 4-sheet .xlsx.
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

  // General PESO Report: cross-program summary pulled live, scoped to the
  // selected programs. Gets an on-screen preview; only Excel export is
  // special-cased later to carry a real native chart.
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
      // Same shape as generateProgramAnalytics() so the Summary card/sheet/PDF
      // render this the same way, plus chart data for the cross-program chart.
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

  // Skills Training Aging Report, live from the backend, not period-scoped.
  // A placed beneficiary is grouped as "Placed" regardless of how long ago.
  const handleGenerateSkillsAgingReport = async () => {
    setSkillsAgingLoading(true)
    try {
      const rows = await fetchSkillsAgingReport()
      // Computed once per row, reused for the bucket tally and the cell color.
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
        _agingBucket: rowBucket(r), // used only to color the cell, not rendered
      }))
      const columns = SKILLS_AGING_COLUMNS
      const initialColumns: Record<string, boolean> = {}
      columns.forEach(col => { initialColumns[col] = true })
      setVisibleColumns(initialColumns)
      setPreviewPage(1)

      // Fixed bucket order (Placed last) instead of sorted by count, seeded
      // to 0 so an empty bucket still shows on the chart.
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
      // Per-bucket sex split, feeds the Excel export's stacked bar chart only.
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

  // CDSP Aging Report: same shape as Skills Training's, plus a sub-service
  // dimension. The "Program Type" dropdown doubles as the sub-service filter;
  // "All Programs" adds a by-sub-service breakdown table.
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
        _agingBucket: rowBucket(r), // used only to color the cell, not rendered
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
      // Only meaningful for "All Programs"; seeded with every sub-service at 0
      // so one with no completions still shows up.
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

  // GIP Aging Report: same shape as Skills Training's, minus the sub-service
  // dimension and completed-count column, since GIP is one-shot.
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

  // Generates the on-screen report for the selected category and filters.
  const handleGenerateReport = () => {
    if (!reportCategory) return
    // Employment Facilitation downloads the official PESO/LMI 4-sheet .xlsx
    // directly instead of using the generic on-screen view.
    if (reportCategory === 'employment-facilitation') { handleGeneratePesoReport(); return }
    // Aging Reports each need their own live backend join.
    if (reportCategory === 'skills-training' && skillsReportType === 'aging') { handleGenerateSkillsAgingReport(); return }
    if (reportCategory === 'cdsp' && cdspReportType === 'aging') { handleGenerateCdspAgingReport(); return }
    if (reportCategory === 'gip' && gipReportType === 'aging') { handleGenerateGipAgingReport(); return }
    // General PESO Report aggregates live across every selected program, but
    // still gets an on-screen preview, so it needs its own async fetch.
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
    // Analytics only apply to participant-level rows, not per-activity/batch/project rows.
    if (reportCategory === 'cdsp' && cdspReportType === 'participants') analytics = generateProgramAnalytics(data, 'Program Type', 'Participants by Program Type', cdspPrograms)
    else if (reportCategory === 'gip' && gipReportType === 'participants') analytics = generateProgramAnalytics(data, 'Assigned Office', 'Participants by Assigned Office')
    else if (reportCategory === 'spes' && spesReportType === 'participants') analytics = generateProgramAnalytics(data, 'Employer', 'Participants by Employer')
    else if (reportCategory === 'livelihood' && livelihoodReportType === 'beneficiaries') analytics = generateProgramAnalytics(data, 'Program Type', 'Beneficiaries by Program Type', livelihoodPrograms)
    else if (reportCategory === 'skills-training' && skillsReportType === 'participants') analytics = generateProgramAnalytics(data, 'Assigned Training', 'Participants by Assigned Training')
    // OFW has no separate activity/batch list, so this always applies.
    else if (reportCategory === 'ofw-services') analytics = generateProgramAnalytics(data, 'Employment Status', 'Participants by Employment Status')
    setGeneratedReport({
      category: reportCategory,
      categoryName: REPORT_CATEGORIES.find(c => c.id === reportCategory)?.name,
      programType,
      cdspReportType,
      gipReportType,
      spesReportType,
      livelihoodReportType,
      listStatusFilter,
      skillsReportType,
      period: reportPeriod,
      periodDetails: getPeriodDetails(),
      columns,
      data,
      analytics,
    })
  }

  // Parses "YYYY-MM-DD" into local-date parts to avoid a UTC-vs-local day shift.
  const formatLongDate = (dateStr: string) => {
    if (!dateStr) return ''
    const [y, m, d] = dateStr.split('-').map(Number)
    return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  // Returns the display text for the selected report period.
  const getPeriodDetails = () => {
    if (reportPeriod === 'monthly') return `${months.find(m => m.value === month)?.label} ${year}`
    if (reportPeriod === 'annual') return `Year ${year}`
    return `${formatLongDate(fromDate)} to ${formatLongDate(toDate)}`
  }

  // Toggles whether a column is visible.
  const toggleColumn = (column: string) => {
    setVisibleColumns(prev => ({ ...prev, [column]: !prev[column] }))
  }

  // Draws a vertical bar chart to a PNG data URL.
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

  // Draws a pie chart with legend to a PNG data URL.
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

  // Draws a horizontal bar chart to a PNG data URL.
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

  // Report titles show the spelled-out program name alongside its abbreviation.
  // CDSP's comes from the `services` table; GIP/SPES use the same wording as
  // their own module pages. The rest already use a full name, not an abbreviation.
  const FULL_PROGRAM_NAMES: Partial<Record<ReportCategory, string>> = {
    gip: 'Government Internship Program (GIP)',
    spes: 'Special Program for Employment of Students (SPES)',
  }
  // Returns the full display title for a report category.
  const reportDisplayTitle = (categoryId: string, shortName?: string): string => {
    if (categoryId === 'cdsp' && cdspProgramInfo) return `${cdspProgramInfo.name} (${cdspProgramInfo.code})`
    return FULL_PROGRAM_NAMES[categoryId as ReportCategory] ?? shortName ?? ''
  }

  // Exports the generated report to Excel, PDF, or Word.
  const handleExport = async (format: 'excel' | 'pdf' | 'word') => {
    if (!generatedReport) return
    const filteredData = generatedReport.data.map((row: any) => {
      const f: any = {}
      // _agingBucket is a hidden helper, never toggleable, so it always passes through.
      Object.keys(row).forEach(k => { if (visibleColumns[k] || k === '_agingBucket') f[k] = row[k] })
      return f
    })
    const isAgingReport = isGeneratedReportAging
    // Report-type suffix so the filename tells Participant List apart from
    // Activity/Batch List; otherwise same-named files would overwrite each other.
    const reportTypeSuffix =
      generatedReport.category === 'cdsp' ? (generatedReport.cdspReportType === 'sessions' ? 'Activity_List' : generatedReport.cdspReportType === 'aging' ? 'Aging_Report' : 'Participant_List') :
      generatedReport.category === 'gip'  ? (generatedReport.gipReportType === 'batches' ? 'Workplace_List' : generatedReport.gipReportType === 'aging' ? 'Aging_Report' : 'Participant_List') :
      generatedReport.category === 'spes' ? (generatedReport.spesReportType === 'batches' ? 'Batch_List' : 'Participant_List') :
      generatedReport.category === 'livelihood' ? (generatedReport.livelihoodReportType === 'projects' ? `${livelihoodUnitLabel(generatedReport.programType).plural.replace('/', '_')}_List` : 'Beneficiary_List') :
      generatedReport.category === 'skills-training' ? (generatedReport.skillsReportType === 'activities' ? 'Training_List' : generatedReport.skillsReportType === 'aging' ? 'Aging_Report' : 'Participant_List') :
      ''
    const fileName = [generatedReport.categoryName, reportTypeSuffix, generatedReport.periodDetails]
      .filter(Boolean).join('_').replace(/ /g, '_')

    // General PESO Report's Excel export uses a real native chart (built by
    // patching a template workbook), so it needs its own generator.
    if (format === 'excel' && generatedReport.category === 'general-peso') {
      await generateGeneralPesoWorkbook(generatedReport.generalPrograms, generatedReport.analytics, generatedReport.periodDetails, fileName)
      return
    }

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook()
      const THIN = { style: 'thin' as const, color: { argb: 'FFD9D9D9' } }
      const BORDERS = { top: THIN, left: THIN, bottom: THIN, right: THIN }
      // Set for Aging Reports once the Summary sheet's row positions are known,
      // then used after wb.xlsx.writeBuffer() to graft in real native charts.
      let agingChartOptions: AgingChartOptions | null = null

      // Print setup for a report meant to be printed/submitted: Folio ("long", 8.5×13"),
      // landscape, scaled to fit all columns across one page width, header row repeated.
      const applyPrint = (ws: ExcelJS.Worksheet, repeatHeader = false) => {
        ws.pageSetup = {
          paperSize: 14 as ExcelJS.PaperSize, // 14 = Folio / Long bond, a valid OOXML code not in exceljs's enum
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
      // cellFill is optional; only the Aging Report uses it to color the
      // "Time Since Completion" cell by bucket.
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
          // Wide enough for the bold header and the widest value; floor of 6
          // keeps short columns like "No." from getting padded too wide.
          ws.getColumn(i + 1).width = Math.min(Math.max(c.length + 4, dataMax + 2, 6), 60)
        })
        ws.views = [{ state: 'frozen', ySplit: 1 }]
        applyPrint(ws, true) // repeat the header row on each printed page
      }

      // Participant-program summary sheet, matches the on-screen Summary.
      if (generatedReport.analytics && ['cdsp', 'gip', 'spes', 'livelihood', 'skills-training', 'ofw-services'].includes(generatedReport.category)) {
        const a = generatedReport.analytics
        const groupHeaderLabel = a.groupLabel.toUpperCase()
        const groupColHeader = a.groupLabel.replace(/^Participants by /i, '').replace(/^Beneficiaries by /i, '')
        // Breakdown by program is only meaningful when viewing all programs.
        const hasProgramTypeFilter = ['cdsp', 'livelihood'].includes(generatedReport.category)
        // byGroup means "count by program type" normally, or aging buckets for
        // Aging Reports (always shown). General PESO Report skips it since its
        // Detailed Report is already one row per program.
        const showBreakdown = generatedReport.category !== 'general-peso' && (isAgingReport || !hasProgramTypeFilter || !generatedReport.programType)
        // Aging gets its own title suffix so it's not confused with the plain
        // Participant List summary sharing this same sheet.
        const isAgingSummary = isAgingReport
        const summaryTitle = `${String(generatedReport.categoryName).toUpperCase()}${isAgingSummary ? ' AGING REPORT' : ''} SUMMARY`
        const aoa: any[][] = [
          [summaryTitle], [],
          ...(generatedReport.category === 'cdsp' && cdspProgramInfo ? [['Program', reportDisplayTitle('cdsp')]] : []),
          // Excel has no separate masthead, so Report Period stays here (unlike Word/PDF).
          ['Report Period', generatedReport.periodDetails],
          // Program Type filter only applies to CDSP/Livelihood.
          ...(hasProgramTypeFilter ? [['Program Type', generatedReport.programType || (generatedReport.category === 'cdsp' ? cdspPrograms : livelihoodPrograms).join(', ')]] : []), [],
          ['Total Participants', a.total],
          ['Male', a.male],
          ['Female', a.female], [],
          ...(showBreakdown ? [[groupHeaderLabel], [groupColHeader, 'Participants'], ...a.byGroup.map((d: any) => [d.group, d.value])] : []),
        ]
        // Row positions of the table just pushed, captured now before later appends shift them.
        const groupTableCategoryStartRow = aoa.length - a.byGroup.length + 1
        const groupTableSeriesNameRow = groupTableCategoryStartRow - 1

        // Aging Report only: a second small table breaking each bucket down by
        // sex, feeding the Excel stacked bar chart below. Only exists for Aging
        // Report analytics, so this is computed inside the same guard.
        let sexTableCategoryStartRow = 0
        if (isAgingSummary) {
          aoa.push(
            [], ['BENEFICIARIES BY STATUS AND SEX'], ['Status', 'Male', 'Female'],
            ...a.byGroupBySex.map((d: any) => [d.group, d.male, d.female]),
          )
          // Same idea as groupTableCategoryStartRow, captured now before any later append shifts aoa.length.
          sexTableCategoryStartRow = aoa.length - a.byGroupBySex.length + 1
        }
        // CDSP Aging only: a plain text breakdown by sub-service, shown only
        // with "All Programs" selected. Just a supplementary count table, not
        // fed to a native chart.
        if (isAgingSummary && generatedReport.category === 'cdsp' && !generatedReport.programType && a.byGroupBySubService?.length > 0) {
          aoa.push(
            [], ['BENEFICIARIES BY SUB-SERVICE'], ['Sub-Service', 'Participants'],
            ...a.byGroupBySubService.map((d: any) => [d.group, d.value]),
          )
        }
        // Captured after every table has been pushed, so the native charts
        // positioned below never end up overlapping them.
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

        // Aging Report: real native Excel charts, grafted in after
        // wb.xlsx.writeBuffer() using the row positions captured above.
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
              // Distinct from AGING_BUCKET_COLORS.Placed, which already means
              // "Placed" in the pie chart next to this bar.
              maleColor: '#1D4ED8',
              femaleColor: '#EC4899',
            },
          }
        }
      }

      // CDSP Activity List summary sheet: totals plus a split by Status and
      // Service Type, since activities have no Sex breakdown.
      if (generatedReport.category === 'cdsp' && generatedReport.cdspReportType === 'sessions') {
        const rows = generatedReport.data as any[]
        const totalActivities = rows.length
        const totalParticipants = rows.reduce((sum, r) => sum + (Number(r['Participants']) || 0), 0)
        const statusCounts: Record<string, number> = {}
        CDSP_SESSION_STATUSES.forEach(s => { statusCounts[s] = 0 })
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
          ['Program Type', generatedReport.programType || cdspPrograms.join(', ')],
          ['Status', generatedReport.listStatusFilter], [],
          ['Total Activities', totalActivities],
          ['Total Participants', totalParticipants], [],
          ...(coversAllStatuses(generatedReport.listStatusFilter) ? [['ACTIVITIES BY STATUS'], ['Status', 'Activities'], ...Object.entries(statusCounts).map(([k, v]) => [k, v]), []] : []),
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

      // GIP Workplace/Office List summary sheet: same shape as CDSP's, grouped
      // by Assigned Office. No status breakdown; workplaces have no status.
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

      // SPES Batch List summary sheet: same shape again, grouped by Employer.
      if (generatedReport.category === 'spes' && generatedReport.spesReportType === 'batches') {
        const rows = generatedReport.data as any[]
        const totalBatches = rows.length
        const totalParticipants = rows.reduce((sum, r) => sum + (Number(r['Participants']) || 0), 0)
        const statusCounts: Record<string, number> = {}
        SPES_BATCH_STATUSES.forEach(s => { statusCounts[s] = 0 })
        const employerCounts: Record<string, number> = {}
        rows.forEach(r => {
          const status = r['Status'] || 'Unspecified'
          statusCounts[status] = (statusCounts[status] || 0) + 1
          const employer = r['Employer'] || 'Unspecified'
          employerCounts[employer] = (employerCounts[employer] || 0) + 1
        })
        const aoa: any[][] = [
          [`${String(generatedReport.categoryName).toUpperCase()} BATCH LIST SUMMARY`], [],
          ['Report Period', generatedReport.periodDetails],
          ['Status', generatedReport.listStatusFilter], [],
          ['Total Batches', totalBatches],
          ['Total Participants', totalParticipants], [],
          ...(coversAllStatuses(generatedReport.listStatusFilter) ? [['BATCHES BY STATUS'], ['Status', 'Batches'], ...Object.entries(statusCounts).map(([k, v]) => [k, v]), []] : []),
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

      // Livelihood Project/Intervention List summary sheet: same shape again.
      // The "by Program Type" breakdown only applies to "All Programs"; a
      // specific program has no Program Type column to break down.
      if (generatedReport.category === 'livelihood' && generatedReport.livelihoodReportType === 'projects') {
        const rows = generatedReport.data as any[]
        const unit = livelihoodUnitLabel(generatedReport.programType)
        const totalProjects = rows.length
        const totalBeneficiaries = rows.reduce((sum, r) => sum + (Number(r['Beneficiaries Assigned']) || 0), 0)
        const statusCounts: Record<string, number> = {}
        getLivelihoodProjectStatuses(generatedReport.programType).forEach(s => { statusCounts[s] = 0 })
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
          ['Program Type', generatedReport.programType || livelihoodPrograms.join(', ')],
          ['Status', generatedReport.listStatusFilter], [],
          [`Total ${unit.plural}`, totalProjects],
          ['Total Beneficiaries Assigned', totalBeneficiaries], [],
          ...(coversAllStatuses(generatedReport.listStatusFilter) ? [[byStatusLabel], ['Status', 'Count'], ...Object.entries(statusCounts).map(([k, v]) => [k, v])] : []),
          ...(showProgramBreakdown ? [...(coversAllStatuses(generatedReport.listStatusFilter) ? [[]] : []), [byProgramLabel], ['Program Type', 'Count'], ...Object.entries(programCounts).map(([k, v]) => [k, v])] : []),
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

      // Skills Training Activity List summary sheet: same shape again, grouped by Training Batch.
      if (generatedReport.category === 'skills-training' && generatedReport.skillsReportType === 'activities') {
        const rows = generatedReport.data as any[]
        const totalTrainings = rows.length
        const totalParticipants = rows.reduce((sum, r) => sum + (Number(r['Participants']) || 0), 0)
        const statusCounts: Record<string, number> = {}
        SKILLS_ACTIVITY_STATUSES.forEach(s => { statusCounts[s] = 0 })
        const batchCounts: Record<string, number> = {}
        rows.forEach(r => {
          const status = r['Status'] || 'Unspecified'
          statusCounts[status] = (statusCounts[status] || 0) + 1
          const batch = r['Training Batch'] || 'Unspecified'
          batchCounts[batch] = (batchCounts[batch] || 0) + 1
        })
        const aoa: any[][] = [
          [`${String(generatedReport.categoryName).toUpperCase()} TRAINING LIST SUMMARY`], [],
          ['Report Period', generatedReport.periodDetails],
          ['Status', generatedReport.listStatusFilter], [],
          ['Total Trainings', totalTrainings],
          ['Total Participants', totalParticipants], [],
          ...(coversAllStatuses(generatedReport.listStatusFilter) ? [['TRAININGS BY STATUS'], ['Status', 'Trainings'], ...Object.entries(statusCounts).map(([k, v]) => [k, v]), []] : []),
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

      // Aging Report only: split into "Placed" and "Not Yet Placed" sheets,
      // each keeping only its relevant columns, with "No." renumbered fresh.
      if (isAgingReport) {
        const buildAgingSubsheet = (sheetName: string, wantedCols: string[], filterFn: (row: any) => boolean, colored: boolean) => {
          const subsetCols = wantedCols.filter(c => visibleColumns[c])
          // Filters against the full data, not filteredData, since a hidden
          // "Employment Status" column would make both subsheets come up empty.
          const subsetRows = (generatedReport.data as any[])
            .filter(filterFn)
            .map((row: any, i: number) => ({ ...row, 'No.': i + 1 }))
          addTable(wb.addWorksheet(sheetName), ['No.', ...subsetCols], subsetRows,
            colored ? (col, row) => col === 'Time Since Completion' ? AGING_BUCKET_COLORS[row._agingBucket] : undefined : undefined)
        }
        // Each program names its "last completed X" column differently; GIP
        // has no completed-count column since it's one-shot.
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

      applyExcelFont(wb)
      const buf = await wb.xlsx.writeBuffer()
      const blob = agingChartOptions
        ? await graftAgingCharts(buf, agingChartOptions)
        : new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${fileName}.xlsx`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(link.href) }, 100)

    } else if (format === 'word') {
      const isCdspSessions = generatedReport.category === 'cdsp' && generatedReport.cdspReportType === 'sessions'
      const isGipBatches = generatedReport.category === 'gip' && generatedReport.gipReportType === 'batches'
      const isSpesBatches = generatedReport.category === 'spes' && generatedReport.spesReportType === 'batches'
      const isLivelihoodProjects = generatedReport.category === 'livelihood' && generatedReport.livelihoodReportType === 'projects'
      const isSkillsActivities = generatedReport.category === 'skills-training' && generatedReport.skillsReportType === 'activities'

      let summaryAoa: (string | number)[][] | undefined
      const chartImages: { dataUrl: string; aspect: number; label: string }[] = []

      // Same summary the Excel sheet builds, rebuilt here since Word renders
      // paragraphs/tables instead of worksheet rows, from the same `analytics`.
      if (generatedReport.analytics && ['cdsp', 'gip', 'spes', 'livelihood', 'skills-training', 'ofw-services', 'general-peso'].includes(generatedReport.category)) {
        const a = generatedReport.analytics
        const groupHeaderLabel = a.groupLabel.toUpperCase()
        const groupColHeader = a.groupLabel.replace(/^Participants by /i, '').replace(/^Beneficiaries by /i, '')
        const hasProgramTypeFilter = ['cdsp', 'livelihood'].includes(generatedReport.category)
        // General PESO Report skips this breakdown; its Detailed Report is
        // already one row per program.
        const showBreakdown = generatedReport.category !== 'general-peso' && (isAgingReport || !hasProgramTypeFilter || !generatedReport.programType)
        const isAgingSummary = isAgingReport
        const summaryTitle = `${String(generatedReport.categoryName).toUpperCase()}${isAgingSummary ? ' AGING REPORT' : ''} SUMMARY`
        const aoa: (string | number)[][] = [
          [summaryTitle], [],
          ...(generatedReport.category === 'cdsp' && cdspProgramInfo ? [['Program', reportDisplayTitle('cdsp')]] : []),
          // Report Period already shows in the masthead above, so it's left out here.
          ...(hasProgramTypeFilter ? [['Program Type', generatedReport.programType || (generatedReport.category === 'cdsp' ? cdspPrograms : livelihoodPrograms).join(', ')]] : []), [],
          ['Total Participants', a.total],
          ['Male', a.male],
          ['Female', a.female], [],
          ...(showBreakdown ? [[groupHeaderLabel], [groupColHeader, 'Participants'], ...a.byGroup.map((d: any) => [d.group, d.value])] : []),
        ]
        if (isAgingSummary) {
          aoa.push([], ['BENEFICIARIES BY STATUS AND SEX'], ['Status', 'Male', 'Female'], ...a.byGroupBySex.map((d: any) => [d.group, d.male, d.female]))
        }
        if (isAgingSummary && generatedReport.category === 'cdsp' && !generatedReport.programType && a.byGroupBySubService?.length > 0) {
          aoa.push([], ['BENEFICIARIES BY SUB-SERVICE'], ['Sub-Service', 'Participants'], ...a.byGroupBySubService.map((d: any) => [d.group, d.value]))
        }
        summaryAoa = aoa

        // Chart images mirror what the PDF export embeds for these same cases.
        if (generatedReport.category === 'general-peso') {
          chartImages.push({ dataUrl: await createBarChartImage(a.barChartData), aspect: 0.5, label: 'Program Participation Summary' })
          chartImages.push({ dataUrl: await createPieChartImage(a.pieChartData), aspect: 0.5556, label: 'Program Distribution' })
        } else if (isAgingSummary) {
          chartImages.push({ dataUrl: await createHorizontalBarChartImage(a.barChartData, '', '#0077BE'), aspect: 0.4375, label: 'Beneficiaries by Status' })
          if (a.pieChartData?.length > 0) chartImages.push({ dataUrl: await createPieChartImage(a.pieChartData), aspect: 0.5556, label: 'Status Distribution' })
        }
      }

      // Per-category list summaries, rebuilt fresh for Word for the same
      // reason as the participant summary above.
      if (isCdspSessions) {
        const rows = generatedReport.data as any[]
        const statusCounts: Record<string, number> = {}
        CDSP_SESSION_STATUSES.forEach(s => { statusCounts[s] = 0 })
        const serviceCounts: Record<string, number> = {}
        rows.forEach(r => {
          statusCounts[r['Status'] || 'Unspecified'] = (statusCounts[r['Status'] || 'Unspecified'] || 0) + 1
          serviceCounts[r['Service Type'] || 'Unspecified'] = (serviceCounts[r['Service Type'] || 'Unspecified'] || 0) + 1
        })
        summaryAoa = [
          [`${String(generatedReport.categoryName).toUpperCase()} ACTIVITY LIST SUMMARY`], [],
          ...(cdspProgramInfo ? [['Program', reportDisplayTitle('cdsp')]] : []),
          // Word's masthead already shows "Report Period: X" above this Summary.
          ['Program Type', generatedReport.programType || cdspPrograms.join(', ')],
          ['Status', generatedReport.listStatusFilter], [],
          ['Total Activities', rows.length],
          ['Total Participants', rows.reduce((s, r) => s + (Number(r['Participants']) || 0), 0)], [],
          ...(coversAllStatuses(generatedReport.listStatusFilter) ? [['ACTIVITIES BY STATUS'], ['Status', 'Activities'], ...Object.entries(statusCounts).map(([k, v]) => [k, v]), []] : []),
          ['ACTIVITIES BY SERVICE TYPE'], ['Service Type', 'Activities'], ...Object.entries(serviceCounts).map(([k, v]) => [k, v]),
        ]
      } else if (isGipBatches) {
        const rows = generatedReport.data as any[]
        const officeCounts: Record<string, number> = {}
        rows.forEach(r => { officeCounts[r['Assigned Office'] || 'Unspecified'] = (officeCounts[r['Assigned Office'] || 'Unspecified'] || 0) + 1 })
        summaryAoa = [
          [`${String(generatedReport.categoryName).toUpperCase()} WORKPLACE/OFFICE LIST SUMMARY`], [],
          ['Total Workplaces/Offices', rows.length],
          ['Total Interns', rows.reduce((s, r) => s + (Number(r['Interns']) || 0), 0)], [],
          ['WORKPLACES/OFFICES BY ASSIGNED OFFICE'], ['Assigned Office', 'Workplaces/Offices'], ...Object.entries(officeCounts).map(([k, v]) => [k, v]),
        ]
      } else if (isSpesBatches) {
        const rows = generatedReport.data as any[]
        const statusCounts: Record<string, number> = {}
        SPES_BATCH_STATUSES.forEach(s => { statusCounts[s] = 0 })
        const employerCounts: Record<string, number> = {}
        rows.forEach(r => {
          statusCounts[r['Status'] || 'Unspecified'] = (statusCounts[r['Status'] || 'Unspecified'] || 0) + 1
          employerCounts[r['Employer'] || 'Unspecified'] = (employerCounts[r['Employer'] || 'Unspecified'] || 0) + 1
        })
        summaryAoa = [
          [`${String(generatedReport.categoryName).toUpperCase()} BATCH LIST SUMMARY`], [],
          ['Status', generatedReport.listStatusFilter], [],
          ['Total Batches', rows.length],
          ['Total Participants', rows.reduce((s, r) => s + (Number(r['Participants']) || 0), 0)], [],
          ...(coversAllStatuses(generatedReport.listStatusFilter) ? [['BATCHES BY STATUS'], ['Status', 'Batches'], ...Object.entries(statusCounts).map(([k, v]) => [k, v]), []] : []),
          ['BATCHES BY EMPLOYER'], ['Employer', 'Batches'], ...Object.entries(employerCounts).map(([k, v]) => [k, v]),
        ]
      } else if (isLivelihoodProjects) {
        const rows = generatedReport.data as any[]
        const unit = livelihoodUnitLabel(generatedReport.programType)
        const statusCounts: Record<string, number> = {}
        getLivelihoodProjectStatuses(generatedReport.programType).forEach(s => { statusCounts[s] = 0 })
        rows.forEach(r => { statusCounts[r['Status'] || 'Unspecified'] = (statusCounts[r['Status'] || 'Unspecified'] || 0) + 1 })
        const showProgramBreakdown = !generatedReport.programType
        const programCounts: Record<string, number> = {}
        if (showProgramBreakdown) rows.forEach(r => { programCounts[r['Program Type'] || 'Unspecified'] = (programCounts[r['Program Type'] || 'Unspecified'] || 0) + 1 })
        summaryAoa = [
          [`${String(generatedReport.categoryName).toUpperCase()} ${unit.singular.toUpperCase()} LIST SUMMARY`], [],
          ['Program Type', generatedReport.programType || livelihoodPrograms.join(', ')],
          ['Status', generatedReport.listStatusFilter], [],
          [`Total ${unit.plural}`, rows.length],
          ['Total Beneficiaries Assigned', rows.reduce((s, r) => s + (Number(r['Beneficiaries Assigned']) || 0), 0)], [],
          ...(coversAllStatuses(generatedReport.listStatusFilter) ? [[`${unit.plural.toUpperCase()} BY STATUS`], ['Status', 'Count'], ...Object.entries(statusCounts).map(([k, v]) => [k, v])] : []),
          ...(showProgramBreakdown ? [...(coversAllStatuses(generatedReport.listStatusFilter) ? [[]] : []), [`${unit.plural.toUpperCase()} BY PROGRAM TYPE`], ['Program Type', 'Count'], ...Object.entries(programCounts).map(([k, v]) => [k, v])] : []),
        ]
      } else if (isSkillsActivities) {
        const rows = generatedReport.data as any[]
        const statusCounts: Record<string, number> = {}
        SKILLS_ACTIVITY_STATUSES.forEach(s => { statusCounts[s] = 0 })
        const batchCounts: Record<string, number> = {}
        rows.forEach(r => {
          statusCounts[r['Status'] || 'Unspecified'] = (statusCounts[r['Status'] || 'Unspecified'] || 0) + 1
          batchCounts[r['Training Batch'] || 'Unspecified'] = (batchCounts[r['Training Batch'] || 'Unspecified'] || 0) + 1
        })
        summaryAoa = [
          [`${String(generatedReport.categoryName).toUpperCase()} TRAINING LIST SUMMARY`], [],
          ['Status', generatedReport.listStatusFilter], [],
          ['Total Trainings', rows.length],
          ['Total Participants', rows.reduce((s, r) => s + (Number(r['Participants']) || 0), 0)], [],
          ...(coversAllStatuses(generatedReport.listStatusFilter) ? [['TRAININGS BY STATUS'], ['Status', 'Trainings'], ...Object.entries(statusCounts).map(([k, v]) => [k, v]), []] : []),
          ['TRAININGS BY TRAINING BATCH'], ['Training Batch', 'Trainings'], ...Object.entries(batchCounts).map(([k, v]) => [k, v]),
        ]
      }

      // Aging Report: same "Placed" / "Not Yet Placed" split as the Excel
      // export's own two subsheets, built from the same field-based filters.
      let extraTables: { title: string; columns: string[]; rows: Record<string, any>[]; cellFill?: (col: string, row: any) => string | undefined }[] | undefined
      // Colors the "Time Since Completion" cell by aging bucket, same as Excel/PDF.
      const agingCellFill = (col: string, row: any) => col === 'Time Since Completion' ? AGING_BUCKET_COLORS[row._agingBucket] : undefined
      if (isAgingReport) {
        const isCdspAging = generatedReport.category === 'cdsp'
        const isGipAging = generatedReport.category === 'gip'
        const lastCompletedCol = isCdspAging ? 'Last Completed Activity' : isGipAging ? 'Last Completed Workplace/Office' : 'Last Completed Training'
        const extraCols = isCdspAging ? ['Sub-Service', 'Activities Completed'] : isGipAging ? [] : ['Trainings Completed']
        const buildSubset = (wantedCols: string[], filterFn: (row: any) => boolean) => {
          const subsetCols = wantedCols.filter(c => visibleColumns[c])
          const subsetRows = (generatedReport.data as any[]).filter(filterFn).map((row: any, i: number) => ({ ...row, 'No.': i + 1 }))
          return { columns: ['No.', ...subsetCols], rows: subsetRows }
        }
        const placed = buildSubset(['Participant Name', ...extraCols, lastCompletedCol, 'Completed Date', 'Job Title', 'Employer', 'Date Hired'], (row: any) => row['Employment Status'] === 'Placed')
        const notPlaced = buildSubset(['Participant Name', ...extraCols, lastCompletedCol, 'Completed Date', 'Time Since Completion'], (row: any) => row['Employment Status'] === 'Not Yet Placed')
        extraTables = [
          { title: 'Placed', columns: placed.columns, rows: placed.rows },
          { title: 'Not Yet Placed', columns: notPlaced.columns, rows: notPlaced.rows, cellFill: agingCellFill },
        ]
      }

      const cols = generatedReport.columns.filter((c: string) => visibleColumns[c])
      const blob = await generateWordReport({
        title: reportDisplayTitle(generatedReport.category, generatedReport.categoryName) || generatedReport.categoryName,
        periodDetails: generatedReport.periodDetails,
        summaryAoa,
        chartImages: chartImages.length > 0 ? chartImages : undefined,
        detailed: { title: 'Detailed Report', columns: cols, rows: filteredData, cellFill: isAgingReport ? agingCellFill : undefined },
        extraTables,
      })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${fileName}.docx`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(link.href) }, 100)

    } else if (format === 'pdf') {
      // Switch to landscape when the visible columns need more room than a
      // Folio portrait page offers. General PESO Report is always landscape
      // regardless of column count, to match its Excel/Word exports and fit
      // its two side-by-side charts.
      const visibleColsForOrientation = generatedReport.columns.filter((c: string) => visibleColumns[c])
      const MIN_COL_WIDTH_MM = 22
      const orientation: 'portrait' | 'landscape' =
        generatedReport.category === 'general-peso' || visibleColsForOrientation.length * MIN_COL_WIDTH_MM > FOLIO_MM[0] - 28 ? 'landscape' : 'portrait'
      const format: [number, number] = orientation === 'landscape' ? [FOLIO_MM[1], FOLIO_MM[0]] : FOLIO_MM
      const doc = new jsPDF({ orientation, format })
      registerPdfFont(doc)
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      const centerX = pageWidth / 2
      const usableWidth = pageWidth - 28 // 14mm margin on each side
      let y = 20
      // Draws a plain bordered table for "label: value" or "category: count"
      // rows, matching the Word export's small tables. Returns the y position
      // just below the drawn table.
      const drawSummaryTable = (rows: (string | number)[][], startY: number, head?: (string | number)[]): number => {
        autoTable(doc, {
          startY,
          head: head ? [head] : undefined,
          body: rows,
          theme: 'grid',
          headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: 10, font: PDF_FONT_FAMILY },
          bodyStyles: { textColor: [0, 0, 0] },
          styles: { font: PDF_FONT_FAMILY, fontSize: 10, lineColor: [0, 0, 0], lineWidth: 0.1, cellPadding: 2 },
          margin: { left: 14, right: 14 },
          tableWidth: usableWidth,
        })
        return ((doc as any).lastAutoTable?.finalY ?? startY) + 6
      }
      // Long titles get a smaller font and wrap instead of running off the page.
      const pdfTitle = reportDisplayTitle(generatedReport.category, generatedReport.categoryName)
      const titleFontSize = pdfTitle.length > 45 ? 14 : 18
      doc.setFontSize(titleFontSize); doc.setFont(PDF_FONT_FAMILY, 'bold')
      const titleLines = doc.splitTextToSize(pdfTitle, usableWidth)
      titleLines.forEach((line: string) => { doc.text(line, centerX, y, { align: 'center' }); y += titleFontSize * 0.5 })
      y += 1
      doc.setFontSize(11); doc.setFont(PDF_FONT_FAMILY, 'normal')
      doc.text(`Report Period: ${generatedReport.periodDetails}`, centerX, y, { align: 'center' }); y += 15

      if (generatedReport.category === 'general-peso' && generatedReport.analytics) {
        const a = generatedReport.analytics
        y = drawSummaryTable([['Total Participants', a.total], ['Male', a.male], ['Female', a.female]], y)
        y += 10

        // Side by side at half width each, same as the Aging Report's charts
        // below, to fit the shorter landscape page.
        const chartGap = 8
        const halfWidth = (usableWidth - chartGap) / 2
        const chartsBlockHeight = 6 + halfWidth * 0.5556
        if (y + chartsBlockHeight > pageHeight - 20) { doc.addPage(); y = 20 }
        const pieX = 14 + halfWidth + chartGap
        const labelY = y
        doc.setFontSize(14); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text('Program Participation Summary', 14 + halfWidth / 2, labelY, { align: 'center' })
        doc.text('Program Distribution', pieX + halfWidth / 2, labelY, { align: 'center' })
        y += 6
        doc.addImage(await createBarChartImage(a.barChartData), 'PNG', 14, y, halfWidth, halfWidth * 0.5)
        doc.addImage(await createPieChartImage(a.pieChartData), 'PNG', pieX, y, halfWidth, halfWidth * 0.5556)
        y += halfWidth * 0.5556 + 12

        doc.addPage(); y = 20
        doc.setFontSize(14); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text('Detailed Report', 14, y); y += 6

      } else if (generatedReport.category === 'employment-facilitation' && generatedReport.analytics) {
        const s = generatedReport.analytics.summary
        doc.setFontSize(12); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text('Labor Market Information Summary', 14, y); y += 6
        y = drawSummaryTable([
          ['Total Applicants', s.totalApplicants], ['Total Vacancies', s.totalVacancies],
          ['Total Referrals', s.totalReferrals], ['Total Placements', s.totalPlacements],
          ['Placement Rate', `${s.placementRate}%`],
        ], y)
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
        // Matches the Excel/Word Summary exactly (same fields, same order) --
        // this branch used to build its own bare-bones summary (just a Total/
        // Placed/Not Yet Placed table) instead of reusing that shape, so it was
        // missing the Program/Report Period/Program Type info table and the
        // Status / Status-and-Sex breakdown tables Excel/Word both show.
        const a = generatedReport.analytics
        const hasProgramTypeFilter = generatedReport.category === 'cdsp'
        doc.setFontSize(12); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text(`${String(generatedReport.categoryName).toUpperCase()} AGING REPORT SUMMARY`, 14, y); y += 8

        // The masthead above already shows "Report Period: X" for every
        // category, so it's left out of this info table entirely.
        const infoRows: (string | number)[][] = []
        if (generatedReport.category === 'cdsp' && cdspProgramInfo) infoRows.push(['Program', reportDisplayTitle('cdsp')])
        if (hasProgramTypeFilter) infoRows.push(['Program Type', generatedReport.programType || cdspPrograms.join(', ')])
        if (infoRows.length > 0) y = drawSummaryTable(infoRows, y)
        y = drawSummaryTable([['Total Participants', a.total], ['Male', a.male], ['Female', a.female]], y)

        const groupColHeader = a.groupLabel.replace(/^Participants by /i, '').replace(/^Beneficiaries by /i, '')
        y += 4
        doc.setFontSize(12); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text(a.groupLabel.toUpperCase(), 14, y); y += 3
        y = drawSummaryTable(a.byGroup.map((d: any) => [d.group, d.value]), y, [groupColHeader, 'Participants'])

        y += 4
        doc.setFontSize(12); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text('BENEFICIARIES BY STATUS AND SEX', 14, y); y += 3
        y = drawSummaryTable(a.byGroupBySex.map((d: any) => [d.group, d.male, d.female]), y, ['Status', 'Male', 'Female'])

        // CDSP Aging only, "All Programs" only, matching the Excel/Word Summary.
        // Drawn before the page break so it stays on the summary page.
        if (generatedReport.category === 'cdsp' && !generatedReport.programType && a.byGroupBySubService?.length > 0) {
          y += 4
          doc.setFontSize(12); doc.setFont(PDF_FONT_FAMILY, 'bold')
          doc.text('BENEFICIARIES BY SUB-SERVICE', 14, y); y += 3
          y = drawSummaryTable(a.byGroupBySubService.map((d: any) => [d.group, d.value]), y, ['Sub-Service', 'Participants'])
        }

        // Side by side at half width each. Only breaks to a new page if the
        // summary above didn't leave enough room for both charts.
        const chartGap = 8
        const halfWidth = (usableWidth - chartGap) / 2
        const chartsBlockHeight = 6 + halfWidth * 0.5556
        if (y + chartsBlockHeight > pageHeight - 20) { doc.addPage(); y = 20 }
        const pieX = 14 + halfWidth + chartGap
        const labelY = y
        doc.setFontSize(14); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text('Beneficiaries by Status', 14 + halfWidth / 2, labelY, { align: 'center' })
        if (a.pieChartData.length > 0) doc.text('Status Distribution', pieX + halfWidth / 2, labelY, { align: 'center' })
        y += 6
        doc.addImage(await createHorizontalBarChartImage(a.barChartData, '', '#0077BE'), 'PNG', 14, y, halfWidth, halfWidth * 0.4375)
        if (a.pieChartData.length > 0) {
          doc.addImage(await createPieChartImage(a.pieChartData), 'PNG', pieX, y, halfWidth, halfWidth * 0.5556)
        }

        doc.addPage(); y = 20
        doc.setFontSize(14); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text('Detailed Report', 14, y); y += 6

      } else if (['cdsp', 'gip', 'spes', 'livelihood'].includes(generatedReport.category) && generatedReport.analytics) {
        // Matches the Summary sheet in the Excel export.
        const a = generatedReport.analytics
        const hasProgramTypeFilter = ['cdsp', 'livelihood'].includes(generatedReport.category)
        doc.setFontSize(12); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text(`${String(generatedReport.categoryName).toUpperCase()} SUMMARY`, 14, y); y += 8

        // The masthead above already shows "Report Period: X" for every
        // category, so it's left out of this info table entirely.
        const infoRows: (string | number)[][] = []
        if (generatedReport.category === 'cdsp' && cdspProgramInfo) infoRows.push(['Program', reportDisplayTitle('cdsp')])
        // Program Type filter only applies to CDSP/Livelihood; GIP/SPES have no such filter.
        if (hasProgramTypeFilter) {
          const progList = generatedReport.category === 'cdsp' ? cdspPrograms : livelihoodPrograms
          infoRows.push(['Program Type', generatedReport.programType || progList.join(', ')])
        }
        if (infoRows.length > 0) y = drawSummaryTable(infoRows, y)
        y = drawSummaryTable([['Total Participants', a.total], ['Male', a.male], ['Female', a.female]], y)

        // Breakdown by program is only meaningful when viewing all programs.
        if (!hasProgramTypeFilter || !generatedReport.programType) {
          y += 4
          doc.setFontSize(12); doc.setFont(PDF_FONT_FAMILY, 'bold')
          doc.text(a.groupLabel.toUpperCase(), 14, y); y += 3
          const groupColHeader = a.groupLabel.replace(/^Participants by /i, '').replace(/^Beneficiaries by /i, '')
          y = drawSummaryTable(a.byGroup.map((d: any) => [d.group, d.value]), y, [groupColHeader, 'Participants'])
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
        // Matches the Excel summary for Activity/Batch/Project/Training List
        // types. These rows are per-activity, not per-participant, so there's
        // no Male/Female analytics; totals are computed directly from the data.
        const rows = generatedReport.data as any[]
        const isCdsp = generatedReport.category === 'cdsp'
        const isGip = generatedReport.category === 'gip'
        const isLivelihoodProjects = generatedReport.category === 'livelihood' && generatedReport.livelihoodReportType === 'projects'
        const isSkillsActivities = generatedReport.category === 'skills-training' && generatedReport.skillsReportType === 'activities'
        // Uses whichever term ("Project" or "Intervention") the selected program uses.
        const livelihoodUnit = isLivelihoodProjects ? livelihoodUnitLabel(generatedReport.programType) : null
        const unitSingular = isCdsp ? 'Activity' : livelihoodUnit ? livelihoodUnit.singular : isSkillsActivities ? 'Training' : 'Batch'
        const unitPlural = isCdsp ? 'Activities' : livelihoodUnit ? livelihoodUnit.plural : isSkillsActivities ? 'Trainings' : 'Batches'
        const secondaryCol = isCdsp ? 'Service Type' : isGip ? 'Assigned Office' : isLivelihoodProjects ? 'Program Type' : isSkillsActivities ? 'Training Batch' : 'Employer'
        const participantsCol = isLivelihoodProjects ? 'Beneficiaries Assigned' : isGip ? 'Interns' : 'Participants'
        // Livelihood's "by Program Type" breakdown only applies to "All Programs".
        const showSecondaryBreakdown = !isLivelihoodProjects || !generatedReport.programType
        const totalUnits = rows.length
        const totalParticipants = rows.reduce((sum, r) => sum + (Number(r[participantsCol]) || 0), 0)
        const statusCounts: Record<string, number> = {}
        // GIP has no status breakdown, so its seed list stays empty.
        const statusList = isCdsp ? CDSP_SESSION_STATUSES
          : isLivelihoodProjects ? getLivelihoodProjectStatuses(generatedReport.programType)
          : isSkillsActivities ? SKILLS_ACTIVITY_STATUSES
          : isGip ? [] : SPES_BATCH_STATUSES
        statusList.forEach(s => { statusCounts[s] = 0 })
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
        doc.text(`${String(generatedReport.categoryName).toUpperCase()} ${unitSingular.toUpperCase()} LIST SUMMARY`, 14, y); y += 8

        // The masthead above already shows "Report Period: X" for every
        // category, so it's left out of this info table entirely.
        const infoRows: (string | number)[][] = []
        if (isCdsp && cdspProgramInfo) infoRows.push(['Program', reportDisplayTitle('cdsp')])
        if (isCdsp) infoRows.push(['Program Type', generatedReport.programType || cdspPrograms.join(', ')])
        else if (isLivelihoodProjects) infoRows.push(['Program Type', generatedReport.programType || livelihoodPrograms.join(', ')])
        if (!isGip) infoRows.push(['Status', generatedReport.listStatusFilter])
        if (infoRows.length > 0) y = drawSummaryTable(infoRows, y)

        const totalsLabel = isLivelihoodProjects ? 'Beneficiaries' : isGip ? 'Interns' : 'Participants'
        y = drawSummaryTable([[`Total ${unitPlural}`, totalUnits], [`Total ${totalsLabel}`, totalParticipants]], y)

        // Workplaces have no status of their own, so this is skipped for GIP.
        if (!isGip && coversAllStatuses(generatedReport.listStatusFilter)) {
          y += 4
          doc.setFontSize(12); doc.setFont(PDF_FONT_FAMILY, 'bold')
          doc.text(`${unitPlural.toUpperCase()} BY STATUS`, 14, y); y += 3
          y = drawSummaryTable(Object.entries(statusCounts), y, ['Status', unitPlural])
        }

        if (showSecondaryBreakdown) {
          y += 4
          doc.setFontSize(12); doc.setFont(PDF_FONT_FAMILY, 'bold')
          doc.text(`${unitPlural.toUpperCase()} BY ${secondaryCol.toUpperCase()}`, 14, y); y += 3
          y = drawSummaryTable(Object.entries(secondaryCounts), y, [secondaryCol, unitPlural])
        }

        doc.addPage(); y = 20
        doc.setFontSize(14); doc.setFont(PDF_FONT_FAMILY, 'bold')
        doc.text('Detailed Report', 14, y); y += 6
      }

      const visibleCols = generatedReport.columns.filter((col: string) => visibleColumns[col])
      // Shrink text as columns increase so a wide table still fits the page width.
      const tableFontSize = visibleCols.length > 14 ? 6 : visibleCols.length > 10 ? 7 : 8
      const bodyRows = filteredData.map((row: any) => visibleCols.map((col: string) => typeof row[col] === 'number' ? row[col] : (row[col] || '-')))
      // Give each column a share of the width proportional to its actual
      // rendered text, not an equal split or raw character count. Shares
      // always sum to usableWidth.
      const columnWidths = computeColumnWidths(doc, visibleCols, bodyRows, usableWidth, tableFontSize + 1, tableFontSize)
      const columnStyles = Object.fromEntries(visibleCols.map((_: string, i: number) => [i, { cellWidth: columnWidths[i] }]))
      const agingTimeColIdx = isAgingReport ? visibleCols.indexOf('Time Since Completion') : -1
      autoTable(doc, {
        startY: y,
        head: [visibleCols],
        body: bodyRows,
        theme: 'grid',
        // Plain white header with bold black text and black borders throughout,
        // matching the Word export's table styling.
        headStyles: { fillColor: [255, 255, 255], textColor: [0, 0, 0], fontStyle: 'bold', fontSize: tableFontSize + 1, font: PDF_FONT_FAMILY },
        bodyStyles: { fontSize: tableFontSize, font: PDF_FONT_FAMILY, textColor: [0, 0, 0] },
        margin: { left: 14, right: 14 },
        tableWidth: usableWidth,
        columnStyles,
        styles: { overflow: 'linebreak', font: PDF_FONT_FAMILY, lineColor: [0, 0, 0], lineWidth: 0.1 },
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

  // Downloads the participant roster for a single CDSP session, with an
  // activity-info header block above the table. Excel forces the Contact
  // Number column to text so long digit strings don't turn into scientific notation.
  const handleExportSessionRoster = async (activityId: number, format: 'excel' | 'pdf' | 'word') => {
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
    if (format === 'word') {
      const blob = await generateWordRoster('CDSP PARTICIPANT LIST', infoLines, headerLabels, roster)
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `CDSP_Roster_${safeTitle}_${activity.date || 'undated'}.docx`
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
    // Last column letter, so the title merges/centers across this width
    // instead of a hardcoded letter.
    const lastCol = String.fromCharCode(64 + headerLabels.length) // 7 cols -> 'G'

    const titleRow = ws.addRow(['CDSP PARTICIPANT LIST'])
    titleRow.font = { bold: true, size: 14 }
    titleRow.alignment = { horizontal: 'center' }
    ws.mergeCells(`A${titleRow.number}:${lastCol}${titleRow.number}`)
    ws.addRow([])

    // Each info line is merged across the full table width and centered as
    // one block; centering within a single narrow column wouldn't do much.
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
      row.getCell(5).numFmt = '@' // keep Contact Number as text
    })
    // The info block is fully merged per row now, so only the data table itself
    // drives column widths.
    headerLabels.forEach((label, i) => {
      let maxLen = label.length
      roster.forEach(r => { const v = String(r[i] ?? ''); if (v.length > maxLen) maxLen = v.length })
      ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 2, 10), 40)
    })

    applyExcelFont(wb)
    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `CDSP_Roster_${safeTitle}_${activity.date || 'undated'}.xlsx`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(link.href) }, 100)
  }

  // Downloads the intern list for a single GIP workplace/office, same shape
  // as handleExportSessionRoster, adapted to workplace/intern terms: a workplace info block
  // (Assigned Office, Workplace/Office Address, Coordinator, Supervisor, Allowance)
  // instead of an activity info block (Venue, Facilitator, Counselor).
  const handleExportBatchInterns = async (workplaceId: number, format: 'excel' | 'pdf' | 'word') => {
    const workplace = gipWorkplaces.find(w => w.id === workplaceId)
    if (!workplace) return
    const interns = gipApplicants
      // Withdrawn interns are left off the roster. Same rule as the Interns
      // count: only those at this workplace during the report period.
      .filter(a => a.assignedWorkplaceId === workplaceId && a.status !== 'Withdrawn' && internAtWorkplaceInPeriod(a))
      .map((a, i) => [
        i + 1,
        `${a.lastName}, ${a.firstName}${a.middleName ? ' ' + a.middleName : ''}`.trim(),
        a.sex || '-',
        a.age || '-',
        a.contactNumber || '-',
        a.schoolName || '-',
        a.course || '-',
        a.highestEducation || '-',
        dateOnly(a.assignmentHistory[0]?.assignedDate),
        dateOnly(a.assignmentHistory[0]?.completedDate),
      ])
    if (interns.length === 0) {
      setInfoModal({ isOpen: true, title: 'No Interns', message: 'This workplace/office has no interns in this report period.' })
      return
    }
    const headerLabels = ['No.', 'Participant Name', 'Sex', 'Age', 'Contact Number', 'School Name', 'Course', 'Highest Education', 'Date Assigned', 'Date Completed']
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
    if (format === 'word') {
      const blob = await generateWordRoster('GIP INTERN LIST', infoLines, headerLabels, interns)
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `GIP_Interns_${safeName}_${exportDate}.docx`
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
    const lastCol = String.fromCharCode(64 + headerLabels.length) // 10 cols -> 'J'

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
      row.getCell(5).numFmt = '@' // keep Contact Number as text
    })
    headerLabels.forEach((label, i) => {
      let maxLen = label.length
      interns.forEach(r => { const v = String(r[i] ?? ''); if (v.length > maxLen) maxLen = v.length })
      ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 2, 10), 40)
    })

    applyExcelFont(wb)
    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `GIP_Interns_${safeName}_${exportDate}.xlsx`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(link.href) }, 100)
  }

  // Downloads the student list for a single SPES batch, same shape as
  // handleExportBatchInterns, adapted to SPES's batch fields (Employer,
  // Coordinator, Total Slots/Funding Source instead of Supervisor/Allowance).
  const handleExportBatchStudents = async (batchId: number, format: 'excel' | 'pdf' | 'word') => {
    const batch = spesBatches.find(b => b.id === batchId)
    if (!batch) return
    const students = spesApplicants
      // Withdrawn students keep their batch link for history but are no longer
      // part of the batch, so they're left off the roster (matches the
      // Participants column and slot count).
      .filter(a => a.assignedBatchId === batchId && a.status !== 'Withdrawn')
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
    if (format === 'word') {
      const blob = await generateWordRoster('SPES STUDENT LIST', infoLines, headerLabels, students)
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `SPES_Students_${safeName}_${batch.programStartDate || 'undated'}.docx`
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
      row.getCell(5).numFmt = '@' // keep Contact Number as text
    })
    headerLabels.forEach((label, i) => {
      let maxLen = label.length
      students.forEach(r => { const v = String(r[i] ?? ''); if (v.length > maxLen) maxLen = v.length })
      ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 2, 10), 40)
    })

    applyExcelFont(wb)
    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `SPES_Students_${safeName}_${batch.programStartDate || 'undated'}.xlsx`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(link.href) }, 100)
  }

  // Shared ExcelJS roster workbook builder, factored out of the roster
  // exports above to avoid repeating their ExcelJS boilerplate. `textColIndex`
  // (1-based) forces one column to text so long digit strings don't turn into
  // scientific notation.
  const buildRosterWorkbook = (
    sheetName: string,
    title: string,
    infoLines: { label: string; value: string | number }[][],
    headerLabels: string[],
    rows: (string | number)[][],
    textColIndex?: number,
    // Only the Skills Training roster's Attendance column uses this.
    cellFill?: (colIndex: number, row: (string | number)[]) => string | undefined,
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
      row.eachCell((cell, colIdx) => {
        cell.border = BORDERS; cell.alignment = { vertical: 'middle' }
        const fillColor = cellFill?.(colIdx - 1, r)
        if (fillColor) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${fillColor.replace('#', '')}` } }
          cell.font = { color: { argb: 'FFFFFFFF' }, bold: true }
        }
      })
      if (textColIndex) row.getCell(textColIndex).numFmt = '@'
    })
    headerLabels.forEach((label, i) => {
      let maxLen = label.length
      rows.forEach(r => { const v = String(r[i] ?? ''); if (v.length > maxLen) maxLen = v.length })
      ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 2, 10), 40)
    })

    applyExcelFont(wb)
    return wb
  }

  // Downloads the beneficiary list for a single Livelihood project/intervention,
  // same shape as the CDSP/GIP/SPES roster exports, but needs both the project's
  // id and its program since DILP/TUPAD/SLP/CLPEP each have their own id sequence.
  const handleExportProjectBeneficiaries = async (projectId: number, program: string, format: 'excel' | 'pdf' | 'word') => {
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
        [{ label: 'Barangay: ', value: project.barangay || '-' }],
        [{ label: 'Type of Project: ', value: project.typeOfProject || '-' }, { label: '     Program Component: ', value: project.programComponent || '-' }],
        [{ label: 'Assistance Amount: ', value: formatCurrency(project.assistanceAmount) }, { label: '     Release Date: ', value: project.dateReleased || '-' }],
        [{ label: 'Total Beneficiaries: ', value: beneficiaries.length }],
      ]
    } else if (program === 'DILEEP (TUPAD)') {
      const project = tupadProjects.find(p => p.id === projectId)
      if (!project) return
      projectTitle = project.title || 'Project'
      beneficiaries = tupadApplicants.filter(a => a.assignedProjectId === projectId && a.status !== 'Withdrawn')
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
      beneficiaries = slpApplicants.filter(a => a.assignedSlpProjectId === projectId && a.status !== 'Withdrawn')
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
    if (format === 'word') {
      const blob = await generateWordRoster(title, infoLines, headerLabels, roster)
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `Livelihood_${safeTitle}_Beneficiaries.docx`
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
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(link.href) }, 100)
  }

  // Downloads the participant list for a single Skills Training activity,
  // same shape as handleExportSessionRoster, without CDSP's extra education/
  // employment fields.
  const handleExportTrainingParticipants = async (activityId: number, format: 'excel' | 'pdf' | 'word') => {
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
        // Only meaningful once Completed; attendance isn't taken yet for a Planned/Ongoing training.
        activity.status === 'Completed' ? (p.assignedTrainingStatus === 'Absent' ? 'Absent' : 'Present') : '-',
      ])
    if (participants.length === 0) {
      setInfoModal({ isOpen: true, title: 'No Participants', message: 'This training has no participants assigned yet.' })
      return
    }
    const headerLabels = ['No.', 'Participant Name', 'Sex', 'Age', 'Contact Number', 'Civil Status', 'Attendance']
    const infoLines: { label: string; value: string | number }[][] = [
      [{ label: 'Training: ', value: activity.title || '-' }],
      [{ label: 'Training Batch: ', value: activity.batchName || '-' }],
      [{ label: 'Date: ', value: activity.date || '-' }, { label: '     Venue: ', value: activity.location || '-' }],
      [{ label: 'Facilitator: ', value: activity.facilitator || '-' }],
      [{ label: 'Total Participants: ', value: participants.length }],
    ]
    const safeTitle = (activity.title || 'Training').replace(/[^a-z0-9]+/gi, '_')
    // Attendance is the last column: green for Present, red for Absent, no
    // fill for the "-" placeholder.
    const attendanceColIndex = headerLabels.length - 1
    const attendanceCellFill = (colIndex: number, row: (string | number)[]) =>
      colIndex === attendanceColIndex ? (row[attendanceColIndex] === 'Present' ? '#10B981' : row[attendanceColIndex] === 'Absent' ? '#EF4444' : undefined) : undefined

    if (format === 'pdf') {
      const doc = buildRosterPdf('SKILLS TRAINING PARTICIPANT LIST', infoLines, headerLabels, participants, attendanceCellFill)
      doc.save(`SkillsTraining_Roster_${safeTitle}_${activity.date || 'undated'}.pdf`)
      return
    }
    if (format === 'word') {
      const blob = await generateWordRoster('SKILLS TRAINING PARTICIPANT LIST', infoLines, headerLabels, participants, attendanceCellFill)
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `SkillsTraining_Roster_${safeTitle}_${activity.date || 'undated'}.docx`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(link.href) }, 100)
      return
    }
    const wb = buildRosterWorkbook('Participants', 'SKILLS TRAINING PARTICIPANT LIST', infoLines, headerLabels, participants, 5, attendanceCellFill)
    const buf = await wb.xlsx.writeBuffer()
    const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `SkillsTraining_Roster_${safeTitle}_${activity.date || 'undated'}.xlsx`
    link.style.display = 'none'
    document.body.appendChild(link)
    link.click()
    setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(link.href) }, 100)
  }

  // Switches the report category and resets its dependent filters.
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

          {/* Program Type comes before Report Type here since the Project/
              Intervention List's columns depend on which program is selected. */}
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

          {getStatusFilterOptions() && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <div className="relative">
                <select value={listStatusFilter} onChange={e => setListStatusFilter(e.target.value)}
                  className="appearance-none w-full pl-3 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900 text-sm">
                  <option value="All">All</option>
                  {getStatusFilterOptions()?.map(st => <option key={st} value={st}>{st}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>
          )}

          {/* Aging Report is a live snapshot, so the period picker doesn't apply. */}
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

      {/* Aging Analytics: same two-panel bar+pie layout as General PESO's chart above, applied to the
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
          {/* CDSP Aging only, "All Programs" only, matching the Excel/PDF table. */}
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
          {/* Breakdown by program only applies when viewing all programs; the
              Aging Report skips it since its own Aging Analytics card above
              already shows the same breakdown. */}
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
        // Pagination, same pattern as the module list tables.
        const rows: any[] = generatedReport.data
        const totalRows = rows.length
        const totalPages = Math.max(1, Math.ceil(totalRows / previewPerPage))
        const safePage = Math.min(previewPage, totalPages)
        const paginated = rows.slice((safePage - 1) * previewPerPage, safePage * previewPerPage)
        const recordStart = totalRows === 0 ? 0 : (safePage - 1) * previewPerPage + 1
        const recordEnd = Math.min(safePage * previewPerPage, totalRows)
        // Row-level export action for each list type; label/handler differ per category.
        const isCdspSessions = generatedReport.category === 'cdsp' && generatedReport.cdspReportType === 'sessions'
        const isGipBatches = generatedReport.category === 'gip' && generatedReport.gipReportType === 'batches'
        const isSpesBatches = generatedReport.category === 'spes' && generatedReport.spesReportType === 'batches'
        const isLivelihoodProjects = generatedReport.category === 'livelihood' && generatedReport.livelihoodReportType === 'projects'
        const isSkillsActivities = generatedReport.category === 'skills-training' && generatedReport.skillsReportType === 'activities'
        const showRowAction = isCdspSessions || isGipBatches || isSpesBatches || isLivelihoodProjects || isSkillsActivities
        const rowExportLabel = isCdspSessions ? 'Export Attendees' : isGipBatches ? 'Export Interns' : isSpesBatches ? 'Export Students' : isLivelihoodProjects ? 'Export Beneficiaries' : 'Export Trainees'
        const runRowExport = (fmt: 'excel' | 'pdf' | 'word') => {
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
                    <button onClick={async () => await handleExport('word')} className="w-full px-4 py-2.5 text-left text-sm text-gray-700 hover:bg-gray-50">Word (.docx)</button>
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
                                const dropdownH = 124 // 3 options: Excel/Word/PDF
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

        {/* Row-level export dropdown, rendered fixed at the document level so
            it isn't clipped by the table or stuck under sticky cells. */}
        {rowExportMenuId !== null && rowExportMenuPos && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setRowExportMenuId(null); setRowExportMenuProgram(null) }} />
            <div
              style={{ position: 'fixed', top: rowExportMenuPos.top, left: rowExportMenuPos.left }}
              className="w-36 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-1"
            >
              <button onClick={() => runRowExport('excel')} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Excel (.xlsx)</button>
              <button onClick={() => runRowExport('word')} className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50">Word (.docx)</button>
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
