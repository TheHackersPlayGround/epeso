import { useState } from 'react'
import { ArrowLeft, FileText, Download, ChevronDown, Columns, BarChart2, ChevronLeft, ChevronRight } from 'lucide-react'
import DatePicker from '../../components/DatePicker'
import * as XLSX from 'xlsx'
import ExcelJS from 'exceljs'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Swal from 'sweetalert2'
import { fetchEfReport } from '../../services/reportService'
import { generatePesoMonthlyReport } from './pesoMonthlyReport'
import { useCDSP } from '../../contexts/CDSPContext'
import { useGIP } from '../../contexts/GIPContext'
import { useSPES } from '../../contexts/SPESContext'
import { useSkillsTraining } from '../../contexts/SkillsTrainingContext'
import { useProgramActivities } from '../../contexts/ProgramActivitiesContext'
import { useOFW } from '../../contexts/OFWContext'
import { SEED as EF_APPLICANT_SEED, VACANCY_SEED, REFERRAL_SEED, PLACEMENT_SEED } from '../../contexts/EmploymentContext'

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
// real default category selected from the start.
const REPORT_CATEGORIES: { id: ReportCategory; name: string }[] = [
  { id: 'general-peso', name: 'General PESO Report' },
  { id: 'employment-facilitation', name: 'Employment Facilitation' },
  { id: 'ofw-services', name: 'OFW Services' },
  { id: 'cdsp', name: 'CDSP' },
  { id: 'livelihood', name: 'Livelihood' },
  { id: 'gip', name: 'GIP' },
  { id: 'spes', name: 'SPES' },
  { id: 'skills-training', name: 'Skills Training' },
]

export default function ReportView({ onBack }: ReportViewProps) {
  const { applicants: cdspApplicants, activities: cdspActivities, services: cdspServices, programInfo: cdspProgramInfo } = useCDSP()
  const { applicants: gipApplicants, gipBatches } = useGIP()
  const { applicants: spesApplicants, spesBatches } = useSPES()
  const { profiles: skillsProfiles } = useSkillsTraining()
  const { activities } = useProgramActivities()
  const { profiles: ofwProfiles } = useOFW()

  const [reportCategory, setReportCategory] = useState<ReportCategory | ''>('')
  const [programType, setProgramType] = useState('')
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('monthly')
  const [month, setMonth] = useState('05')
  const [year, setYear] = useState('2026')
  const [fromDate, setFromDate] = useState('2026-01-01')
  const [toDate, setToDate] = useState('2026-05-14')
  const [generatedReport, setGeneratedReport] = useState<any>(null)
  const [isColumnMenuOpen, setIsColumnMenuOpen] = useState(false)
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>({})
  // Preview pagination — same pattern as the CDSP/GIP/SPES module list tables.
  const [previewPage, setPreviewPage] = useState(1)
  const [previewPerPage, setPreviewPerPage] = useState(10)

  const readLS = (key: string, fallback: any[] = []): any[] => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return fallback
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : fallback
    } catch { return fallback }
  }

  const efApplicants = () => readLS('ef_applicants', EF_APPLICANT_SEED)
  const efVacancies  = () => readLS('ef_vacancies',  VACANCY_SEED)
  const efReferrals  = () => readLS('ef_referrals',  REFERRAL_SEED)
  const efPlacements = () => readLS('ef_placements', PLACEMENT_SEED)

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

  const years = ['2024', '2025', '2026', '2027']
  const showProgramType = reportCategory === 'cdsp' || reportCategory === 'livelihood'

  const getReportColumns = (category: ReportCategory): string[] => {
    const map: Record<ReportCategory, string[]> = {
      'general-peso': ['Program / Service', 'Activities Conducted', 'Participants', 'Beneficiaries', 'Placements', 'Status'],
      'employment-facilitation': ['Applicant Name', 'Employer', 'Job Title', 'Referral Status', 'Placement Status', 'Employment Type', 'Date Referred', 'Date Hired'],
      'ofw-services': ['OFW Name', 'Type of Request', 'Employment Status', 'Date Filed', 'Status'],
      'cdsp': ['No.', 'Participant Name', 'Sex', 'Age', 'Program Type', 'Date Conducted', 'Highest Education',
               'Employment Status', 'Facilitator', 'Course / Program', 'Strand', 'Current Occupation', 'Civil Status',
               'Contact Number', 'Barangay', 'Status', 'Remarks'],
      'livelihood': ['Beneficiary Name', 'Program Type', 'Assistance Amount', 'Release Date', 'Status'],
      'gip': ['No.', 'Participant Name', 'Sex', 'Age', 'Highest Education', 'Assigned Office',
              'Start Date', 'End Date', 'Status', 'Batch', 'School Name', 'Course', 'Strand', 'Civil Status',
              'Contact Number', 'Barangay', 'Coordinator', 'Supervisor', 'Allowance', 'Remarks'],
      'spes': ['No.', 'Participant Name', 'Sex', 'Age', 'School Name', 'Grade/Year Level', 'Assigned Office',
               'Start Date', 'End Date', 'Status', 'Course', 'School Type', 'Civil Status', 'Contact Number',
               'Barangay', 'Annual Family Income', 'No. of Dependents', 'Remarks'],
      'skills-training': ['Participant Name', 'Training Title', 'Trainer', 'Duration', 'Completion Status'],
    }
    return map[category] || []
  }

  // Columns shown by default; the rest are optional (user turns them on via the
  // Columns menu). Only CDSP distinguishes default vs optional; others show all.
  const getDefaultColumns = (category: ReportCategory): string[] => {
    // CDSP: the fields that matter for a career-development report are on by default;
    // the rest (contact, address, occupation, civil status, status, remarks) are optional.
    if (category === 'cdsp') return ['No.', 'Participant Name', 'Sex', 'Age', 'Program Type', 'Date Conducted', 'Highest Education', 'Employment Status', 'Facilitator']
    // GIP: interns deployed to government offices — identity, education, deployment office and period.
    // (Status is optional, matching CDSP.)
    if (category === 'gip') return ['No.', 'Participant Name', 'Sex', 'Age', 'Highest Education', 'Assigned Office', 'Start Date', 'End Date']
    // SPES: working students — identity, school/year level, deployment office and period.
    // (Status is optional, matching CDSP.)
    if (category === 'spes') return ['No.', 'Participant Name', 'Sex', 'Age', 'School Name', 'Grade/Year Level', 'Assigned Office', 'Start Date', 'End Date']
    return getReportColumns(category)
  }

  // True when a date falls within the selected report period (monthly/annual/custom).
  const inSelectedPeriod = (dateStr: string): boolean => {
    if (!dateStr) return false
    const d = new Date(dateStr)
    if (isNaN(d.getTime())) return false
    if (reportPeriod === 'annual') return d.getFullYear() === Number(year)
    if (reportPeriod === 'custom') return d >= new Date(fromDate) && d <= new Date(toDate)
    return d.getFullYear() === Number(year) && d.getMonth() + 1 === Number(month)
  }

  const generateData = (category: ReportCategory): any[] => {
    switch (category) {
      case 'employment-facilitation': {
        const referrals = efReferrals()
        const placements = efPlacements()
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
        return cdspApplicants
          // Program Type filter (from the dropdown; '' = All Programs)
          .filter(a => !programType || a.serviceAvailed === programType)
          // Period filter on the date the application was received
          .filter(a => inSelectedPeriod(a.dateApplicationReceived))
          .map((a, i) => {
            const activity = cdspActivities.find(act => act.id === a.assignedActivityId)
            return {
              'No.': i + 1,
              'Participant Name': `${a.lastName}, ${a.firstName}${a.middleName ? ' ' + a.middleName : ''}`.trim(),
              'Sex': a.sex || '-',
              'Program Type': a.serviceAvailed || '-',
              'Date Conducted': a.dateApplicationReceived || '-',
              'Facilitator': activity?.facilitator || '-',
              'Status': a.status,
              'Age': a.age || '-',
              'Civil Status': a.civilStatus || '-',
              'Highest Education': a.highestEducation || '-',
              'Course / Program': a.course || a.courseProgram || '-',
              'Strand': a.strand || '-',
              'Employment Status': a.employmentStatus || '-',
              'Current Occupation': a.currentOccupation || '-',
              'Contact Number': a.contactNumber || '-',
              'Barangay': a.barangay || '-',
              'Remarks': a.remarks || '-',
            }
          })

      case 'gip':
        return gipApplicants
          // Period filter on the date the application was received
          .filter(a => inSelectedPeriod(a.dateApplicationReceived))
          .map((a, i) => {
            const batch = gipBatches.find(b => b.id === a.assignedBatchId)
            return {
              'No.': i + 1,
              'Participant Name': `${a.lastName}, ${a.firstName}${a.middleName ? ' ' + a.middleName : ''}`.trim(),
              'Sex': a.sex || '-',
              'Age': a.age || '-',
              'Highest Education': a.highestEducation || '-',
              'Assigned Office': batch?.assignedOffice || '-',
              'Start Date': batch?.startDate || '-',
              'End Date': batch?.endDate || '-',
              'Status': a.status,
              'Batch': batch?.batchName || '-',
              'School Name': a.schoolName || '-',
              'Course': a.course || '-',
              'Strand': a.strand || '-',
              'Civil Status': a.civilStatus || '-',
              'Contact Number': a.contactNumber || '-',
              'Barangay': a.barangay || '-',
              'Coordinator': batch?.coordinator || '-',
              'Supervisor': batch?.supervisor || '-',
              'Allowance': batch?.allowance || '-',
              'Remarks': a.remarks || '-',
            }
          })

      case 'spes':
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
              'Assigned Office': batch?.employer || '-',
              'Start Date': batch?.programStartDate || '-',
              'End Date': batch?.programEndDate || '-',
              'Status': a.status,
              'Course': a.course || '-',
              'School Type': a.schoolType || '-',
              'Civil Status': a.civilStatus || '-',
              'Contact Number': a.contactNumber || '-',
              'Barangay': a.barangay || '-',
              'Annual Family Income': a.annualFamilyIncome || '-',
              'No. of Dependents': a.numberOfDependents ?? '-',
              'Remarks': a.remarks || '-',
            }
          })

      case 'skills-training':
        return skillsProfiles.map(p => {
          const activity = activities.find(a => a.id === p.assignedTrainingId)
          return {
            'Participant Name': `${p.firstName} ${p.lastName}`,
            'Training Title': activity?.title || p.desiredQualification[0] || '-',
            'Trainer': activity?.facilitator || '-',
            'Duration': p.trainingBatchNo || '-',
            'Completion Status': p.status,
          }
        })

      case 'livelihood': {
        const all = [...readLS('lp_dileep_v4'), ...readLS('lp_slp_v5'), ...readLS('lp_clpep_v6')]
        return all.map((b: any) => ({
          'Beneficiary Name': b.name || `${b.firstName || ''} ${b.lastName || ''}`.trim() || '-',
          'Program Type': b.service || '-',
          'Assistance Amount': b.assistanceAmount ? `₱${Number(b.assistanceAmount).toLocaleString()}` : '-',
          'Release Date': b.dateReleased || '-',
          'Status': b.status || '-',
        }))
      }

      case 'ofw-services':
        return ofwProfiles.map(p => ({
          'OFW Name': p.name,
          'Type of Request': p.typeOfRequest.join(', '),
          'Employment Status': p.employmentStatus,
          'Date Filed': p.dateFiled,
          'Status': p.status,
        }))

      case 'general-peso': {
        const lhAll = [...readLS('lp_dileep_v4'), ...readLS('lp_slp_v5'), ...readLS('lp_clpep_v6')]
        const CDSP_SERVICES = ['Career Coaching', 'Pre-Employment Coaching', 'Labor Employment for Graduating Students']
        return [
          { 'Program / Service': 'Employment Facilitation', 'Activities Conducted': efVacancies().length, 'Participants': efApplicants().length, 'Beneficiaries': efApplicants().length, 'Placements': efPlacements().length, 'Status': 'Active' },
          { 'Program / Service': 'CDSP', 'Activities Conducted': activities.filter(a => a.program === 'CDSP' || CDSP_SERVICES.includes(a.service)).length, 'Participants': cdspApplicants.length, 'Beneficiaries': cdspApplicants.length, 'Placements': 0, 'Status': 'Active' },
          { 'Program / Service': 'GIP', 'Activities Conducted': gipBatches.length, 'Participants': gipApplicants.length, 'Beneficiaries': gipApplicants.length, 'Placements': gipApplicants.length, 'Status': 'Active' },
          { 'Program / Service': 'SPES', 'Activities Conducted': spesBatches.length, 'Participants': spesApplicants.length, 'Beneficiaries': spesApplicants.length, 'Placements': spesApplicants.length, 'Status': 'Active' },
          { 'Program / Service': 'Skills Training', 'Activities Conducted': activities.filter(a => a.program === 'Skills Training').length, 'Participants': skillsProfiles.length, 'Beneficiaries': skillsProfiles.length, 'Placements': 0, 'Status': 'Active' },
          { 'Program / Service': 'Livelihood', 'Activities Conducted': readLS('lp_slp_projects_v2').length + readLS('lp_clpep_interventions_v1').length, 'Participants': lhAll.length, 'Beneficiaries': lhAll.length, 'Placements': 0, 'Status': 'Active' },
          { 'Program / Service': 'OFW Services', 'Activities Conducted': ofwProfiles.length, 'Participants': ofwProfiles.length, 'Beneficiaries': ofwProfiles.length, 'Placements': 0, 'Status': 'Active' },
        ]
      }

      default:
        return []
    }
  }

  const generateAnalytics = () => {
    const efCount = efApplicants().length
    const lhAll = [...readLS('lp_dileep_v4'), ...readLS('lp_slp_v5'), ...readLS('lp_clpep_v6')]
    const counts = {
      'Employment Facilitation': efCount,
      'Skills Training': skillsProfiles.length,
      'SPES': spesApplicants.length,
      'CDSP': cdspApplicants.length,
      'Livelihood': lhAll.length,
      'GIP': gipApplicants.length,
      'OFW Services': ofwProfiles.length,
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1
    const colors: Record<string, string> = {
      'Employment Facilitation': '#3B82F6', 'Skills Training': '#F59E0B', 'SPES': '#F97316',
      'CDSP': '#EC4899', 'Livelihood': '#8B5CF6', 'GIP': '#06B6D4', 'OFW Services': '#10B981',
    }
    const barChartData = Object.entries(counts)
      .map(([program, value]) => ({ program, value }))
      .sort((a, b) => b.value - a.value)
    const pieChartData = Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([program, value]) => ({ program, value: parseFloat(((value / total) * 100).toFixed(1)), color: colors[program] }))
    return { barChartData, pieChartData }
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
      if (!fromDate || !toDate) { Swal.fire('Error', 'Please select a From and To date.', 'error'); return }
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
      Swal.fire('Error', msg, 'error')
    } finally {
      setPesoLoading(false)
    }
  }

  const handleGenerateReport = () => {
    if (!reportCategory) return
    // Employment Facilitation generates the official PESO/LMI report (live data,
    // downloaded as the 4-sheet .xlsx) rather than the generic on-screen view.
    if (reportCategory === 'employment-facilitation') { handleGeneratePesoReport(); return }
    const columns = getReportColumns(reportCategory)
    const data = generateData(reportCategory)
    // Default columns are visible; optional ones start hidden (toggle via Columns menu).
    const defaults = getDefaultColumns(reportCategory)
    const initialColumns: Record<string, boolean> = {}
    columns.forEach(col => { initialColumns[col] = defaults.includes(col) })
    setVisibleColumns(initialColumns)
    setPreviewPage(1) // start a freshly generated report on the first page
    let analytics = null
    if (reportCategory === 'general-peso') analytics = generateAnalytics()
    else if (reportCategory === 'cdsp') analytics = generateProgramAnalytics(data, 'Program Type', 'Participants by Program Type', cdspPrograms)
    else if (reportCategory === 'gip') analytics = generateProgramAnalytics(data, 'Assigned Office', 'Participants by Assigned Office')
    else if (reportCategory === 'spes') analytics = generateProgramAnalytics(data, 'Assigned Office', 'Participants by Assigned Office')
    // Employment Facilitation is handled earlier (downloads the PESO Excel) and
    // never reaches here, so it has no on-screen analytics branch.
    setGeneratedReport({
      category: reportCategory,
      categoryName: REPORT_CATEGORIES.find(c => c.id === reportCategory)?.name,
      programType,
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

  const createPieChartImage = (data: any[]): Promise<string> => new Promise(resolve => {
    const canvas = document.createElement('canvas')
    canvas.width = 800; canvas.height = 450
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 800, 450)
    let angle = -Math.PI / 2
    data.forEach(item => {
      const slice = (item.value / 100) * 2 * Math.PI
      ctx.beginPath(); ctx.moveTo(250, 225)
      ctx.arc(250, 225, 150, angle, angle + slice)
      ctx.closePath(); ctx.fillStyle = item.color; ctx.fill()
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke()
      angle += slice
    })
    let legendY = 100
    data.forEach(item => {
      ctx.fillStyle = item.color; ctx.fillRect(450, legendY - 10, 15, 15)
      ctx.fillStyle = '#374151'; ctx.font = '12px Arial'; ctx.textAlign = 'left'
      ctx.fillText(`${item.program || item.status} - ${item.value.toFixed(1)}%`, 475, legendY + 2)
      legendY += 30
    })
    resolve(canvas.toDataURL('image/png'))
  })

  const createHorizontalBarChartImage = (data: any[], _title: string, color: string): Promise<string> => new Promise(resolve => {
    const canvas = document.createElement('canvas')
    canvas.width = 800; canvas.height = 350
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, 800, 350)
    const padding = 60, chartWidth = 800 - padding * 2, barHeight = 35, barSpacing = 15
    const maxValue = Math.max(...data.map(d => d.value), 1)
    data.forEach((item, i) => {
      const bw = (item.value / maxValue) * (chartWidth - 200)
      const y = padding + i * (barHeight + barSpacing)
      ctx.fillStyle = color; ctx.fillRect(padding + 200, y, bw, barHeight)
      ctx.fillStyle = '#374151'; ctx.font = '12px Arial'; ctx.textAlign = 'right'
      ctx.fillText(item.month || item.jobTitle || item.employer, padding + 190, y + barHeight / 2 + 5)
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
      Object.keys(row).forEach(k => { if (visibleColumns[k]) f[k] = row[k] })
      return f
    })
    const fileName = `${generatedReport.categoryName}_${generatedReport.periodDetails}`.replace(/ /g, '_')

    if (format === 'excel') {
      const wb = new ExcelJS.Workbook()
      const THIN = { style: 'thin' as const, color: { argb: 'FFD9D9D9' } }
      const BORDERS = { top: THIN, left: THIN, bottom: THIN, right: THIN }

      // Print setup for a report meant to be printed/submitted: Folio ("long", 8.5×13"),
      // landscape, scaled to fit all columns across one page width, header row repeated.
      const applyPrint = (ws: ExcelJS.Worksheet, repeatHeader = false) => {
        ws.pageSetup = {
          paperSize: 14, // 14 = Folio / Long bond (8.5 × 13")
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
      const addTable = (ws: ExcelJS.Worksheet, cols: string[], rows: any[]) => {
        const header = ws.addRow(cols.map(c => c.toUpperCase()))
        header.height = 20
        header.eachCell(cell => {
          cell.font = { bold: true, size: 11 }
          // No wrapText → headers always stay on ONE line.
          cell.alignment = { horizontal: 'center', vertical: 'middle' }
          cell.border = BORDERS
        })
        rows.forEach(row => {
          const r = ws.addRow(cols.map(c => row[c] ?? ''))
          r.eachCell(cell => { cell.border = BORDERS; cell.alignment = { vertical: 'middle' } })
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

      // Optional analytics summary sheet (General PESO report).
      if (generatedReport.analytics && generatedReport.category === 'general-peso') {
        const aoa: any[][] = [
          ['PESO COMPREHENSIVE REPORT'], [],
          ['Report Period', generatedReport.periodDetails], [],
          ['PROGRAM PARTICIPATION SUMMARY'], ['Program', 'Participants'],
          ...generatedReport.analytics.barChartData.map((d: any) => [d.program, d.value]), [],
          ['PROGRAM DISTRIBUTION'], ['Program', 'Percentage'],
          ...generatedReport.analytics.pieChartData.map((d: any) => [d.program, `${d.value.toFixed(1)}%`]),
        ]
        const ws = wb.addWorksheet('Analytics Summary')
        aoa.forEach(r => ws.addRow(r))
        ws.getColumn(1).width = 34; ws.getColumn(2).width = 18
        ws.getRow(1).font = { bold: true, size: 14 }
        applyPrint(ws)
      }

      // Participant-program summary sheet (CDSP / GIP / SPES) — matches the on-screen Summary.
      if (generatedReport.analytics && ['cdsp', 'gip', 'spes'].includes(generatedReport.category)) {
        const a = generatedReport.analytics
        const groupHeaderLabel = a.groupLabel.toUpperCase()
        const groupColHeader = a.groupLabel.replace(/^Participants by /i, '')
        // Breakdown by program is only meaningful when viewing all programs — see
        // matching note on the on-screen summary.
        const showBreakdown = generatedReport.category !== 'cdsp' || !generatedReport.programType
        const aoa: any[][] = [
          [`${String(generatedReport.categoryName).toUpperCase()} SUMMARY`], [],
          ...(generatedReport.category === 'cdsp' && cdspProgramInfo ? [['Program', reportDisplayTitle('cdsp')]] : []),
          ['Report Period', generatedReport.periodDetails],
          // Program Type filter only applies to CDSP; GIP/SPES have no such filter.
          ...(generatedReport.category === 'cdsp' ? [['Program Type', generatedReport.programType || cdspPrograms.join(', ')]] : []), [],
          ['Total Participants', a.total],
          ['Male', a.male],
          ['Female', a.female], [],
          ...(showBreakdown ? [[groupHeaderLabel], [groupColHeader, 'Participants'], ...a.byGroup.map((d: any) => [d.group, d.value])] : []),
        ]
        const ws = wb.addWorksheet('Summary')
        aoa.forEach(r => ws.addRow(r))
        ws.getColumn(1).width = 34; ws.getColumn(2).width = 18
        ws.getRow(1).font = { bold: true, size: 14 }
        const groupHeaderRow = aoa.findIndex(r => r[0] === groupHeaderLabel) + 1
        if (groupHeaderRow > 0) ws.getRow(groupHeaderRow).font = { bold: true }
        applyPrint(ws)
      }

      const cols = generatedReport.columns.filter((c: string) => visibleColumns[c])
      addTable(wb.addWorksheet('Detailed Report'), cols, filteredData)

      const buf = await wb.xlsx.writeBuffer()
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
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
      // Wide tables (many visible columns) don't fit an A4 portrait page, so switch
      // to landscape whenever the columns need more room than portrait can offer.
      const visibleColsForOrientation = generatedReport.columns.filter((c: string) => visibleColumns[c])
      const MIN_COL_WIDTH_MM = 22
      const orientation: 'portrait' | 'landscape' =
        visibleColsForOrientation.length * MIN_COL_WIDTH_MM > 182 ? 'landscape' : 'portrait'
      const doc = new jsPDF({ orientation })
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
      doc.setFontSize(titleFontSize); doc.setFont('helvetica', 'bold')
      const titleLines = doc.splitTextToSize(pdfTitle, usableWidth)
      titleLines.forEach((line: string) => { doc.text(line, centerX, y, { align: 'center' }); y += titleFontSize * 0.5 })
      y += 4
      doc.setFontSize(11); doc.setFont('helvetica', 'normal')
      doc.text(`Report Period: ${generatedReport.periodDetails}`, centerX, y, { align: 'center' }); y += 15

      if (generatedReport.category === 'general-peso' && generatedReport.analytics) {
        doc.setFontSize(14); doc.setFont('helvetica', 'bold')
        doc.text('Program Participation Summary', 14, y); y += 6
        doc.addImage(await createBarChartImage(generatedReport.analytics.barChartData), 'PNG', 14, y, usableWidth, usableWidth * 0.5); y += usableWidth * 0.5 + 2
        doc.setFontSize(14); doc.setFont('helvetica', 'bold')
        doc.text('Program Distribution', 14, y); y += 6
        doc.addImage(await createPieChartImage(generatedReport.analytics.pieChartData), 'PNG', 14, y, usableWidth, usableWidth * 0.5556); y += usableWidth * 0.5556 + 2
        doc.addPage(); y = 20
        doc.setFontSize(14); doc.setFont('helvetica', 'bold')
        doc.text('Detailed Report', 14, y); y += 6

      } else if (generatedReport.category === 'employment-facilitation' && generatedReport.analytics) {
        const s = generatedReport.analytics.summary
        doc.setFontSize(12); doc.setFont('helvetica', 'bold')
        doc.text('Labor Market Information Summary', 14, y); y += 6
        doc.setFontSize(10); doc.setFont('helvetica', 'normal')
        doc.text(`Total Applicants: ${s.totalApplicants}`, 14, y)
        doc.text(`Total Vacancies: ${s.totalVacancies}`, 75, y)
        doc.text(`Total Referrals: ${s.totalReferrals}`, 136, y); y += 5
        doc.text(`Total Placements: ${s.totalPlacements}`, 14, y)
        doc.text(`Placement Rate: ${s.placementRate}%`, 75, y); y += 10
        doc.setFontSize(12); doc.setFont('helvetica', 'bold')
        doc.text('Placements Per Month', 14, y); y += 6
        doc.addImage(await createHorizontalBarChartImage(generatedReport.analytics.placementsPerMonth, '', '#10B981'), 'PNG', 14, y, usableWidth, usableWidth * 0.4375); y += usableWidth * 0.4375 + 2
        doc.setFontSize(12); doc.setFont('helvetica', 'bold')
        doc.text('Referral Status Distribution', 14, y); y += 6
        doc.addImage(await createPieChartImage(generatedReport.analytics.referralStatusDistribution), 'PNG', 14, y, usableWidth, usableWidth * 0.5625); y += usableWidth * 0.5625 + 2
        doc.addPage(); y = 20
        doc.setFontSize(12); doc.setFont('helvetica', 'bold')
        doc.text('Top Job Vacancies', 14, y); y += 6
        doc.addImage(await createHorizontalBarChartImage(generatedReport.analytics.jobVacancyDistribution, '', '#3B82F6'), 'PNG', 14, y, usableWidth, usableWidth * 0.4375); y += usableWidth * 0.4375 + 2
        doc.setFontSize(12); doc.setFont('helvetica', 'bold')
        doc.text('Top Employers by Vacancies', 14, y); y += 6
        doc.addImage(await createHorizontalBarChartImage(generatedReport.analytics.employerParticipation, '', '#0077BE'), 'PNG', 14, y, usableWidth, usableWidth * 0.4375); y += usableWidth * 0.4375 + 2
        doc.addPage(); y = 20
        doc.setFontSize(14); doc.setFont('helvetica', 'bold')
        doc.text('Detailed Employment Facilitation Report', 14, y); y += 6

      } else if (['cdsp', 'gip', 'spes'].includes(generatedReport.category) && generatedReport.analytics) {
        // Matches the Summary sheet in the Excel export — General PESO and
        // Employment Facilitation already got a PDF summary section above; CDSP/
        // GIP/SPES previously jumped straight to the detailed table with nothing.
        const a = generatedReport.analytics
        doc.setFontSize(12); doc.setFont('helvetica', 'bold')
        doc.text(`${generatedReport.categoryName} Summary`, 14, y); y += 8
        doc.setFontSize(10); doc.setFont('helvetica', 'normal')
        if (generatedReport.category === 'cdsp' && cdspProgramInfo) {
          doc.text(`Program: ${reportDisplayTitle('cdsp')}`, 14, y); y += 5
        }
        doc.text(`Report Period: ${generatedReport.periodDetails}`, 14, y); y += 5
        // Program Type filter only applies to CDSP; GIP/SPES have no such filter.
        if (generatedReport.category === 'cdsp') {
          doc.text(`Program Type: ${generatedReport.programType || cdspPrograms.join(', ')}`, 14, y); y += 5
        }
        y += 3
        doc.text(`Total Participants: ${a.total}`, 14, y)
        doc.text(`Male: ${a.male}`, 90, y)
        doc.text(`Female: ${a.female}`, 140, y); y += 10

        // Breakdown by program is only meaningful when viewing all programs — see
        // matching note on the on-screen summary and Excel/CSV exports.
        if (generatedReport.category !== 'cdsp' || !generatedReport.programType) {
          doc.setFontSize(12); doc.setFont('helvetica', 'bold')
          doc.text(a.groupLabel, 14, y); y += 6
          doc.setFontSize(10); doc.setFont('helvetica', 'normal')
          a.byGroup.forEach((d: any) => {
            if (y > pageHeight - 20) { doc.addPage(); y = 20 } // long lists (e.g. many Assigned Offices) paginate instead of running off the page
            doc.text(`${d.group}: ${d.value}`, 14, y); y += 5
          })
          y += 3
        }

        doc.addPage(); y = 20
        doc.setFontSize(14); doc.setFont('helvetica', 'bold')
        doc.text('Detailed Report', 14, y); y += 6
      }

      const visibleCols = generatedReport.columns.filter((col: string) => visibleColumns[col])
      // Shrink text as columns increase so a wide table (e.g. all optional CDSP/GIP
      // columns enabled) still fits the page width instead of spilling past the margin.
      const tableFontSize = visibleCols.length > 14 ? 6 : visibleCols.length > 10 ? 7 : 8
      // Give each column a share of the usable page width proportional to how much
      // text it actually holds (header vs. longest value seen, same idea as the
      // Excel column auto-width below) — an equal split wastes space on short
      // columns like "No." while cramping long ones like "Participant Name". The
      // shares always sum to exactly usableWidth, so the table still can't overflow.
      const colWeights = visibleCols.map((col: string) => {
        const dataLen = filteredData.reduce((max: number, row: any) => Math.max(max, String(row[col] ?? '').length), 0)
        return Math.max(col.length, Math.min(dataLen, 30), 4)
      })
      const totalWeight = colWeights.reduce((a: number, b: number) => a + b, 0)
      const columnStyles = Object.fromEntries(visibleCols.map((_, i) => [i, { cellWidth: (colWeights[i] / totalWeight) * usableWidth }]))
      autoTable(doc, {
        startY: y,
        head: [visibleCols],
        body: filteredData.map((row: any) => visibleCols.map((col: string) => row[col] || '-')),
        theme: 'grid',
        headStyles: { fillColor: [0, 119, 190], textColor: 255, fontStyle: 'bold', fontSize: tableFontSize + 1 },
        bodyStyles: { fontSize: tableFontSize },
        margin: { left: 14, right: 14 },
        tableWidth: usableWidth,
        columnStyles,
        styles: { overflow: 'linebreak' },
      })
      doc.save(`${fileName}.pdf`)
    }
    setIsExportMenuOpen(false)
  }

  const handleCategoryChange = (category: string) => {
    setReportCategory(category as ReportCategory)
    setProgramType('')
    setGeneratedReport(null)
  }

  return (
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
                className="appearance-none w-full pl-4 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900">
                <option value=""></option>
                {REPORT_CATEGORIES.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
            </div>
          </div>

          {showProgramType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Program Type</label>
              <div className="relative">
                <select value={programType} onChange={e => setProgramType(e.target.value)}
                  className="appearance-none w-full pl-4 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900">
                  <option value="">All Programs</option>
                  {reportCategory === 'cdsp' && cdspPrograms.map(p => <option key={p} value={p}>{p}</option>)}
                  {reportCategory === 'livelihood' && livelihoodPrograms.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Report Period</label>
            <div className="grid grid-cols-4 gap-4">
              <div className="relative">
                <select value={reportPeriod} onChange={e => setReportPeriod(e.target.value as ReportPeriod)}
                  className="appearance-none w-full pl-4 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900">
                  <option value="monthly">Monthly</option>
                  <option value="annual">Annual</option>
                  <option value="custom">Custom Range</option>
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
              </div>
              {reportPeriod === 'monthly' && <>
                <div className="relative">
                  <select value={month} onChange={e => setMonth(e.target.value)}
                    className="appearance-none w-full pl-4 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900">
                    {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
                <div className="relative">
                  <select value={year} onChange={e => setYear(e.target.value)}
                    className="appearance-none w-full pl-4 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900">
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              </>}
              {reportPeriod === 'annual' && (
                <div className="relative">
                  <select value={year} onChange={e => setYear(e.target.value)}
                    className="appearance-none w-full pl-4 pr-8 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900">
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                  <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                </div>
              )}
              {reportPeriod === 'custom' && <>
                <DatePicker value={fromDate} onChange={setFromDate}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900" />
                <DatePicker value={toDate} onChange={setToDate}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900" />
              </>}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={handleGenerateReport} disabled={!reportCategory || pesoLoading}
              className="px-6 py-2.5 bg-[#0077BE] text-white rounded-lg hover:bg-[#0066A3] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2">
              <BarChart2 size={18} />
              {pesoLoading ? 'Generating…' : 'Generate Report'}
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

      {/* Participant-program Summary (CDSP / GIP / SPES) */}
      {generatedReport && ['cdsp', 'gip', 'spes'].includes(generatedReport.category) && generatedReport.analytics && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <h3 className="text-gray-800 m-0 mb-4 flex items-center gap-2">
            <BarChart2 size={20} className="text-[#0077BE]" />
            {generatedReport.categoryName} Summary
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
              remaining bar just repeats the Total above. */}
          {(generatedReport.category !== 'cdsp' || !generatedReport.programType) && (<>
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
        return (
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
                  {generatedReport.columns.filter((col: string) => visibleColumns[col]).map((col: string) => (
                    <th key={col} className="px-6 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {totalRows > 0
                  ? paginated.map((row: any, i: number) => (
                    <tr key={recordStart + i} className="border-b border-gray-100 hover:bg-gray-50">
                      {generatedReport.columns.filter((col: string) => visibleColumns[col]).map((col: string) => (
                        <td key={col} className="px-6 py-3 text-sm text-gray-800 whitespace-nowrap">{row[col] || '-'}</td>
                      ))}
                    </tr>
                  ))
                  : (
                    <tr>
                      <td colSpan={generatedReport.columns.length} className="px-6 py-12 text-center text-gray-500">
                        No records found for the selected category.
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
  )
}
