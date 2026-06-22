import { useState } from 'react'
import { ArrowLeft, FileText, Download, ChevronDown, Columns, BarChart2 } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
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

export default function ReportView({ onBack }: ReportViewProps) {
  const { applicants: cdspApplicants } = useCDSP()
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

  const reportCategories = [
    { id: 'general-peso', name: 'General PESO Report' },
    { id: 'employment-facilitation', name: 'Employment Facilitation' },
    { id: 'ofw-services', name: 'OFW Services' },
    { id: 'cdsp', name: 'CDSP' },
    { id: 'livelihood', name: 'Livelihood' },
    { id: 'gip', name: 'GIP' },
    { id: 'spes', name: 'SPES' },
    { id: 'skills-training', name: 'Skills Training' },
  ]

  const cdspPrograms = ['Career Coaching', 'Pre-Employment Coaching', 'Labor Employment for Graduating Students']
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
      'cdsp': ['Participant Name', 'Program Type', 'Date Conducted', 'Facilitator', 'Status'],
      'livelihood': ['Beneficiary Name', 'Program Type', 'Assistance Amount', 'Release Date', 'Status'],
      'gip': ['Participant Name', 'Assigned Office', 'Start Date', 'End Date', 'Status'],
      'spes': ['Participant Name', 'Assigned Office', 'Start Date', 'End Date', 'Status'],
      'skills-training': ['Participant Name', 'Training Title', 'Trainer', 'Duration', 'Completion Status'],
    }
    return map[category] || []
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
        return cdspApplicants.map(a => ({
          'Participant Name': `${a.firstName} ${a.lastName}`,
          'Program Type': a.serviceAvailed || '-',
          'Date Conducted': a.dateApplicationReceived || '-',
          'Facilitator': a.counselorName || '-',
          'Status': a.status,
        }))

      case 'gip':
        return gipApplicants.map(a => {
          const batch = gipBatches.find(b => b.id === a.assignedBatchId)
          return {
            'Participant Name': `${a.firstName} ${a.lastName}`,
            'Assigned Office': batch?.assignedOffice || '-',
            'Start Date': batch?.startDate || '-',
            'End Date': batch?.endDate || '-',
            'Status': a.status,
          }
        })

      case 'spes':
        return spesApplicants.map(a => {
          const batch = spesBatches.find(b => b.id === a.assignedBatchId)
          return {
            'Participant Name': `${a.firstName} ${a.lastName}`,
            'Assigned Office': batch?.employer || '-',
            'Start Date': batch?.programStartDate || '-',
            'End Date': batch?.programEndDate || '-',
            'Status': a.status,
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

  const generateEmploymentFacilitationAnalytics = () => {
    const applicants = efApplicants()
    const vacancies = efVacancies()
    const referrals = efReferrals()
    const placements = efPlacements()
    const totalReferrals = referrals.length + placements.length
    const placementRate = totalReferrals > 0 ? parseFloat(((placements.length / totalReferrals) * 100).toFixed(1)) : 0

    const monthMap: Record<string, number> = {}
    placements.forEach((p: any) => {
      if (p.dateHired) {
        const m = new Date(p.dateHired).toLocaleString('default', { month: 'short' })
        monthMap[m] = (monthMap[m] || 0) + 1
      }
    })
    const placementsPerMonth = Object.entries(monthMap).length > 0
      ? Object.entries(monthMap).map(([month, value]) => ({ month, value }))
      : [{ month: 'No data', value: 0 }]

    const statusCounts = { Pending: 0, Interviewed: 0, 'Not Hired': 0, Hired: placements.length }
    referrals.forEach((r: any) => { const s = r.status as keyof typeof statusCounts; if (s in statusCounts) statusCounts[s]++ })
    const totalCount = Object.values(statusCounts).reduce((a, b) => a + b, 0) || 1
    const toP = (n: number) => parseFloat(((n / totalCount) * 100).toFixed(1))
    const referralStatusDistribution = [
      { status: 'Hired', value: toP(statusCounts.Hired), count: statusCounts.Hired, color: '#10B981' },
      { status: 'Interviewed', value: toP(statusCounts.Interviewed), count: statusCounts.Interviewed, color: '#F59E0B' },
      { status: 'Pending', value: toP(statusCounts.Pending), count: statusCounts.Pending, color: '#3B82F6' },
      { status: 'Not Hired', value: toP(statusCounts['Not Hired']), count: statusCounts['Not Hired'], color: '#EF4444' },
    ].filter(item => item.count > 0)

    const jobMap: Record<string, number> = {}
    vacancies.forEach((v: any) => { jobMap[v.jobTitle] = (jobMap[v.jobTitle] || 0) + (Number(v.vacanciesCount) || 1) })
    const jobVacancyDistribution = Object.entries(jobMap).map(([jobTitle, value]) => ({ jobTitle, value })).sort((a, b) => b.value - a.value).slice(0, 5)

    const empMap: Record<string, number> = {}
    vacancies.forEach((v: any) => { empMap[v.employer] = (empMap[v.employer] || 0) + (Number(v.vacanciesCount) || 1) })
    const employerParticipation = Object.entries(empMap).map(([employer, value]) => ({ employer, value })).sort((a, b) => b.value - a.value).slice(0, 5)

    return {
      summary: { totalApplicants: applicants.length, totalVacancies: vacancies.length, totalReferrals, totalPlacements: placements.length, placementRate },
      placementsPerMonth,
      referralStatusDistribution,
      jobVacancyDistribution,
      employerParticipation,
    }
  }

  const handleGenerateReport = () => {
    if (!reportCategory) return
    const columns = getReportColumns(reportCategory)
    const data = generateData(reportCategory)
    const initialColumns: Record<string, boolean> = {}
    columns.forEach(col => { initialColumns[col] = true })
    setVisibleColumns(initialColumns)
    let analytics = null
    if (reportCategory === 'general-peso') analytics = generateAnalytics()
    else if (reportCategory === 'employment-facilitation') analytics = generateEmploymentFacilitationAnalytics()
    setGeneratedReport({
      category: reportCategory,
      categoryName: reportCategories.find(c => c.id === reportCategory)?.name,
      programType,
      period: reportPeriod,
      periodDetails: getPeriodDetails(),
      columns,
      data,
      analytics,
    })
  }

  const getPeriodDetails = () => {
    if (reportPeriod === 'monthly') return `${months.find(m => m.value === month)?.label} ${year}`
    if (reportPeriod === 'annual') return `Year ${year}`
    return `${fromDate} to ${toDate}`
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

  const handleExport = async (format: 'excel' | 'csv' | 'pdf') => {
    if (!generatedReport) return
    const filteredData = generatedReport.data.map((row: any) => {
      const f: any = {}
      Object.keys(row).forEach(k => { if (visibleColumns[k]) f[k] = row[k] })
      return f
    })
    const fileName = `${generatedReport.categoryName}_${generatedReport.periodDetails}`.replace(/ /g, '_')

    if (format === 'excel') {
      const wb = XLSX.utils.book_new()
      if (generatedReport.analytics && generatedReport.category === 'general-peso') {
        const rows: any[][] = [
          ['PESO COMPREHENSIVE REPORT'], [],
          ['Report Period', generatedReport.periodDetails],
          ['Generated On', new Date().toLocaleDateString()], [],
          ['PROGRAM PARTICIPATION SUMMARY'], ['Program', 'Participants'],
          ...generatedReport.analytics.barChartData.map((d: any) => [d.program, d.value]), [],
          ['PROGRAM DISTRIBUTION'], ['Program', 'Percentage'],
          ...generatedReport.analytics.pieChartData.map((d: any) => [d.program, `${d.value.toFixed(1)}%`]),
        ]
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Analytics Summary')
      } else if (generatedReport.analytics && generatedReport.category === 'employment-facilitation') {
        const s = generatedReport.analytics.summary
        const rows: any[][] = [
          ['LABOR MARKET INFORMATION REPORT'], [],
          ['Report Period', generatedReport.periodDetails],
          ['Generated On', new Date().toLocaleDateString()], [],
          ['LABOR MARKET SUMMARY'],
          ['Total Applicants', s.totalApplicants], ['Total Vacancies', s.totalVacancies],
          ['Total Referrals', s.totalReferrals], ['Total Placements', s.totalPlacements],
          ['Placement Rate', `${s.placementRate}%`], [],
          ['PLACEMENTS PER MONTH'], ['Month', 'Placements'],
          ...generatedReport.analytics.placementsPerMonth.map((d: any) => [d.month, d.value]), [],
          ['REFERRAL STATUS'], ['Status', 'Count', 'Percentage'],
          ...generatedReport.analytics.referralStatusDistribution.map((d: any) => [d.status, d.count, `${d.value.toFixed(1)}%`]), [],
          ['TOP JOB VACANCIES'], ['Job Title', 'Count'],
          ...generatedReport.analytics.jobVacancyDistribution.map((d: any) => [d.jobTitle, d.value]), [],
          ['TOP EMPLOYERS'], ['Employer', 'Vacancies'],
          ...generatedReport.analytics.employerParticipation.map((d: any) => [d.employer, d.value]),
        ]
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(rows), 'Analytics Summary')
      }
      XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(filteredData), 'Detailed Report')
      XLSX.writeFile(wb, `${fileName}.xlsx`)

    } else if (format === 'csv') {
      let csv = ''
      if (generatedReport.category === 'general-peso' && generatedReport.analytics) {
        csv += `PESO COMPREHENSIVE REPORT\n\nReport Period,${generatedReport.periodDetails}\nGenerated On,${new Date().toLocaleDateString()}\n\n`
        csv += 'PROGRAM PARTICIPATION SUMMARY\nProgram,Participants,Bar\n'
        const maxB = Math.max(...generatedReport.analytics.barChartData.map((d: any) => d.value), 1)
        generatedReport.analytics.barChartData.forEach((i: any) => { csv += `${i.program},${i.value},${'█'.repeat(Math.round((i.value / maxB) * 50))}\n` })
        csv += '\nPROGRAM DISTRIBUTION\nProgram,Percentage\n'
        generatedReport.analytics.pieChartData.forEach((i: any) => { csv += `${i.program},${i.value.toFixed(1)}%\n` })
        csv += '\nDETAILED REPORT\n'
      } else if (generatedReport.category === 'employment-facilitation' && generatedReport.analytics) {
        const s = generatedReport.analytics.summary
        csv += `LABOR MARKET INFORMATION REPORT\n\nReport Period,${generatedReport.periodDetails}\nGenerated On,${new Date().toLocaleDateString()}\n\n`
        csv += `LABOR MARKET SUMMARY\nTotal Applicants,${s.totalApplicants}\nTotal Vacancies,${s.totalVacancies}\nTotal Referrals,${s.totalReferrals}\nTotal Placements,${s.totalPlacements}\nPlacement Rate,${s.placementRate}%\n\n`
        csv += 'PLACEMENTS PER MONTH\nMonth,Placements\n'
        generatedReport.analytics.placementsPerMonth.forEach((i: any) => { csv += `${i.month},${i.value}\n` })
        csv += '\nREFERRAL STATUS\nStatus,Count,Percentage\n'
        generatedReport.analytics.referralStatusDistribution.forEach((i: any) => { csv += `${i.status},${i.count},${i.value.toFixed(1)}%\n` })
        csv += '\nDETAILED EMPLOYMENT FACILITATION REPORT\n'
      }
      csv += XLSX.utils.sheet_to_csv(XLSX.utils.json_to_sheet(filteredData))
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${fileName}.csv`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(link.href) }, 100)

    } else if (format === 'pdf') {
      const doc = new jsPDF()
      let y = 20
      doc.setFontSize(18); doc.setFont('helvetica', 'bold')
      doc.text(generatedReport.categoryName, 105, y, { align: 'center' }); y += 10
      doc.setFontSize(11); doc.setFont('helvetica', 'normal')
      doc.text(`Report Period: ${generatedReport.periodDetails}`, 105, y, { align: 'center' }); y += 5
      doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 105, y, { align: 'center' }); y += 15

      if (generatedReport.category === 'general-peso' && generatedReport.analytics) {
        doc.setFontSize(14); doc.setFont('helvetica', 'bold')
        doc.text('Program Participation Summary', 14, y); y += 6
        doc.addImage(await createBarChartImage(generatedReport.analytics.barChartData), 'PNG', 14, y, 180, 90); y += 92
        doc.setFontSize(14); doc.setFont('helvetica', 'bold')
        doc.text('Program Distribution', 14, y); y += 6
        doc.addImage(await createPieChartImage(generatedReport.analytics.pieChartData), 'PNG', 14, y, 180, 100); y += 102
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
        doc.addImage(await createHorizontalBarChartImage(generatedReport.analytics.placementsPerMonth, '', '#10B981'), 'PNG', 14, y, 180, 78.75); y += 80
        doc.setFontSize(12); doc.setFont('helvetica', 'bold')
        doc.text('Referral Status Distribution', 14, y); y += 6
        doc.addImage(await createPieChartImage(generatedReport.analytics.referralStatusDistribution), 'PNG', 14, y, 180, 101.25); y += 103
        doc.addPage(); y = 20
        doc.setFontSize(12); doc.setFont('helvetica', 'bold')
        doc.text('Top Job Vacancies', 14, y); y += 6
        doc.addImage(await createHorizontalBarChartImage(generatedReport.analytics.jobVacancyDistribution, '', '#3B82F6'), 'PNG', 14, y, 180, 78.75); y += 80
        doc.setFontSize(12); doc.setFont('helvetica', 'bold')
        doc.text('Top Employers by Vacancies', 14, y); y += 6
        doc.addImage(await createHorizontalBarChartImage(generatedReport.analytics.employerParticipation, '', '#0077BE'), 'PNG', 14, y, 180, 78.75); y += 80
        doc.addPage(); y = 20
        doc.setFontSize(14); doc.setFont('helvetica', 'bold')
        doc.text('Detailed Employment Facilitation Report', 14, y); y += 6
      }

      const visibleCols = generatedReport.columns.filter((col: string) => visibleColumns[col])
      autoTable(doc, {
        startY: y,
        head: [visibleCols],
        body: filteredData.map((row: any) => visibleCols.map((col: string) => row[col] || '-')),
        theme: 'grid',
        headStyles: { fillColor: [0, 119, 190], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
        styles: { overflow: 'linebreak', cellWidth: 'wrap' },
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
            <label className="block text-sm font-medium text-gray-700 mb-2">1. Report Category</label>
            <select value={reportCategory} onChange={e => handleCategoryChange(e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900">
              <option value="">Select Report Category</option>
              {reportCategories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
            </select>
          </div>

          {showProgramType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">2. Program Type</label>
              <select value={programType} onChange={e => setProgramType(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900">
                <option value="">All Programs</option>
                {reportCategory === 'cdsp' && cdspPrograms.map(p => <option key={p} value={p}>{p}</option>)}
                {reportCategory === 'livelihood' && livelihoodPrograms.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{showProgramType ? '3' : '2'}. Report Period</label>
            <div className="grid grid-cols-4 gap-4">
              <select value={reportPeriod} onChange={e => setReportPeriod(e.target.value as ReportPeriod)}
                className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900">
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
                <option value="custom">Custom Range</option>
              </select>
              {reportPeriod === 'monthly' && <>
                <select value={month} onChange={e => setMonth(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900">
                  {months.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <select value={year} onChange={e => setYear(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </>}
              {reportPeriod === 'annual' && (
                <select value={year} onChange={e => setYear(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900">
                  {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              )}
              {reportPeriod === 'custom' && <>
                <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900" />
                <input type="date" value={toDate} onChange={e => setToDate(e.target.value)}
                  className="px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#0077BE] focus:border-transparent text-gray-900" />
              </>}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button onClick={handleGenerateReport} disabled={!reportCategory}
              className="px-6 py-2.5 bg-[#0077BE] text-white rounded-lg hover:bg-[#0066A3] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2">
              <BarChart2 size={18} />
              Generate Report
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

      {/* Report Preview Table */}
      {generatedReport && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
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
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 z-50 py-2">
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
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {generatedReport.columns.filter((col: string) => visibleColumns[col]).map((col: string) => (
                    <th key={col} className="px-6 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {generatedReport.data.length > 0
                  ? generatedReport.data.map((row: any, i: number) => (
                    <tr key={i} className="border-b border-gray-100 hover:bg-gray-50">
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
        </div>
      )}

      {/* Empty State */}
      {!generatedReport && (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <div className="flex justify-center mb-4">
            <BarChart2 size={64} className="text-gray-300" />
          </div>
          <h3 className="text-gray-800 m-0 mb-2">No report generated yet.</h3>
          <p className="text-gray-500 m-0">
            Select a report category, configure the period, and click "Generate Report" to view the data.
          </p>
        </div>
      )}
    </div>
  )
}
