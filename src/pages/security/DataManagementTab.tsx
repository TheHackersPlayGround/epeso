import { useState } from 'react'
import { Database, Download, RefreshCw, X } from 'lucide-react'
import * as XLSX from 'xlsx'
import { useCDSP } from '../../contexts/CDSPContext'
import { useGIP } from '../../contexts/GIPContext'
import { useSPES } from '../../contexts/SPESContext'
import { useSkillsTraining } from '../../contexts/SkillsTrainingContext'
import { mockUsers } from './SystemUsersTab'
import ConfirmModal from '../shared/ConfirmModal'

export default function DataManagementTab() {
  const { applicants: cdspApplicants } = useCDSP()
  const { applicants: gipApplicants }  = useGIP()
  const { applicants: spesApplicants } = useSPES()
  const { profiles: skillsProfiles }   = useSkillsTraining()

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean; type: 'confirm' | 'success' | 'error'
    title: string; message: string; confirmText?: string; cancelText?: string; onConfirm: () => void
  }>({ isOpen: false, type: 'confirm', title: '', message: '', onConfirm: () => {} })

  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [exportFormat,    setExportFormat]    = useState<'csv' | 'excel'>('excel')
  const [exportSelected,  setExportSelected]  = useState<string[]>([])

  const exportModules = [
    { id: 'applicants', label: 'Applicants',     description: 'Employment facilitation applicant records' },
    { id: 'employers',  label: 'Employers',       description: 'Registered employer profiles' },
    { id: 'vacancies',  label: 'Vacancies',       description: 'Job vacancy listings' },
    { id: 'referrals',  label: 'Referrals',       description: 'Applicant referral records' },
    { id: 'placements', label: 'Placements',      description: 'Employment placement records' },
    { id: 'cdsp',       label: 'CDSP',            description: 'Community development program records' },
    { id: 'gip',        label: 'GIP',             description: 'Government internship program records' },
    { id: 'spes',       label: 'SPES',            description: 'Special program for employment of students' },
    { id: 'livelihood', label: 'Livelihood',       description: 'Livelihood program records' },
    { id: 'skills',     label: 'Skills Training', description: 'Skills training program records' },
    { id: 'ofw',        label: 'OFW Services',    description: 'Overseas Filipino worker records' },
    { id: 'users',      label: 'System Users',    description: 'User accounts and roles' },
  ]

  const toggleExportModule = (id: string) =>
    setExportSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])

  const buildModuleSheets = (): Record<string, { label: string; headers: string[]; rows: (string | number)[][] }> => {
    const readLS = (key: string) => { try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] } }
    const efApplicants = readLS('ef_applicants_v4')
    const efEmployers  = readLS('ef_employers')
    const efVacancies  = readLS('ef_vacancies')
    const efReferrals  = readLS('ef_referrals')
    const efPlacements = readLS('ef_placements')

    return {
      applicants: {
        label: 'Applicants',
        headers: ['ID', 'Name', 'Gender', 'Age', 'Education', 'Skills', 'Employment Status', 'Contact Number', 'Email', 'Address', 'Civil Status'],
        rows: efApplicants.map((a: any) => [a.id, a.name, a.gender, a.age, a.education, a.skills, a.employmentStatus, a.contactNumber, a.email, a.address, a.civilStatus ?? '']),
      },
      employers: {
        label: 'Employers',
        headers: ['ID', 'Company Name', 'Industry', 'Contact Person', 'Contact Number', 'Email', 'Company Size', 'Status', 'Date Registered'],
        rows: efEmployers.map((e: any) => [e.id, e.companyName, e.industry, e.contactPerson, e.contactNumber, e.email, e.companySize, e.status, e.dateRegistered]),
      },
      vacancies: {
        label: 'Vacancies',
        headers: ['ID', 'Job Title', 'Employer', 'Industry', 'Vacancies Count', 'Job Type', 'Status', 'Salary', 'Description', 'Requirements'],
        rows: efVacancies.map((v: any) => [v.id, v.jobTitle, v.employer, v.industry, v.vacanciesCount, v.jobType, v.status, v.salary, v.description, v.requirements]),
      },
      referrals: {
        label: 'Referrals',
        headers: ['ID', 'Applicant Name', 'Job Title', 'Employer', 'Date Referred', 'Status'],
        rows: efReferrals.map((r: any) => [r.id, r.applicantName, r.jobTitle, r.employer, r.dateReferred, r.status]),
      },
      placements: {
        label: 'Placements',
        headers: ['ID', 'Applicant Name', 'Job Title', 'Employer', 'Date Hired', 'Employment Type', 'Status', 'Source'],
        rows: efPlacements.map((p: any) => [p.id, p.applicantName, p.jobTitle, p.employer, p.dateHired, p.employmentType, p.status, p.source]),
      },
      cdsp: {
        label: 'CDSP',
        headers: ['Name', 'Sex', 'Birthdate', 'Age', 'Contact Number', 'Email', 'City/Municipality', 'Service Availed', 'Status'],
        rows: cdspApplicants.map((a: any) => [`${a.lastName}, ${a.firstName} ${a.middleName ?? ''}`.trim(), a.sex, a.birthdate, a.age, a.contactNumber, a.email ?? '', a.cityMunicipality, a.serviceAvailed, a.status]),
      },
      gip: {
        label: 'GIP',
        headers: ['Name', 'Sex', 'Birthdate', 'Age', 'Contact Number', 'Assigned Office', 'Position', 'Start Date', 'End Date', 'Status'],
        rows: gipApplicants.map((a: any) => [`${a.lastName}, ${a.firstName} ${a.middleName ?? ''}`.trim(), a.sex, a.birthdate, a.age, a.contactNumber, a.assignedOffice ?? '', a.position ?? '', a.startDate ?? '', a.endDate ?? '', a.status]),
      },
      spes: {
        label: 'SPES',
        headers: ['Name', 'Sex', 'Birthdate', 'Age', 'Contact Number', 'School', 'Employer', 'Position', 'Work Start Date', 'Status'],
        rows: spesApplicants.map((a: any) => [`${a.lastName}, ${a.firstName} ${a.middleName ?? ''}`.trim(), a.sex, a.birthdate, a.age, a.contactNumber, a.schoolName ?? '', a.employer ?? '', a.position ?? '', a.workStartDate ?? '', a.status]),
      },
      livelihood: {
        label: 'Livelihood',
        headers: ['Name', 'Sex', 'Birthdate', 'Age', 'Contact Number', 'City/Municipality', 'Service', 'Status', 'Date Applied'],
        rows: [],
      },
      skills: {
        label: 'Skills Training',
        headers: ['Name', 'Sex', 'Birthdate', 'Age', 'Contact Number', 'Address', 'Desired Qualification', 'Training Batch No', 'Status'],
        rows: skillsProfiles.map((p: any) => [`${p.lastName}, ${p.firstName} ${p.middleName ?? ''}`.trim(), p.sex, p.birthdate, p.age, p.contactNumber, p.address ?? '', (p.desiredQualification ?? []).join(', '), p.trainingBatchNo ?? '', p.status]),
      },
      ofw: {
        label: 'OFW Services',
        headers: ['Reference No', 'Name', 'Contact Number', 'Email', 'Municipality', 'Employment Status', 'Type of Request', 'Status', 'Date Filed'],
        rows: [],
      },
      users: {
        label: 'System Users',
        headers: ['ID', 'Username', 'Email', 'Role', 'Status', 'Last Login'],
        rows: mockUsers.map(u => [u.id, u.username, u.email, u.role, u.status, u.lastLogin]),
      },
    }
  }

  const handleExportConfirm = () => {
    if (exportSelected.length === 0) return
    const date   = new Date().toISOString().split('T')[0]
    const sheets = buildModuleSheets()

    if (exportFormat === 'excel') {
      const wb = XLSX.utils.book_new()
      exportSelected.forEach(id => {
        const { label, headers, rows } = sheets[id]
        const ws = XLSX.utils.aoa_to_sheet([headers, ...rows])
        ws['!cols'] = headers.map((h, i) => ({ wch: Math.max(h.length, ...rows.map(r => String(r[i] ?? '').length), 10) }))
        XLSX.utils.book_append_sheet(wb, ws, label.substring(0, 31))
      })
      XLSX.writeFile(wb, `PESO_Export_${date}.xlsx`)
    } else {
      const csvParts = exportSelected.map(id => {
        const { label, headers, rows } = sheets[id]
        const escape = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`
        return `${label}\n${[[...headers].map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n')}`
      })
      const blob = new Blob([csvParts.join('\n\n')], { type: 'text/csv;charset=utf-8;' })
      const url  = URL.createObjectURL(blob)
      const a    = document.createElement('a')
      a.href = url; a.download = `PESO_Export_${date}.csv`
      document.body.appendChild(a); a.click()
      document.body.removeChild(a); URL.revokeObjectURL(url)
    }

    setExportModalOpen(false)
    setExportSelected([])
  }

  const handleBackupDatabase = () => {
    setConfirmModal({
      isOpen: true, type: 'confirm', title: 'Backup Database',
      message: 'This will create a secure backup of the entire system database. Do you want to proceed?',
      confirmText: 'Yes, Backup Now', cancelText: 'Cancel',
      onConfirm: () => setConfirmModal({ isOpen: true, type: 'success', title: 'Backup Successful', message: 'Database backup created successfully!\n\nBackup file: PESO_DB_Backup_2026-06-20.sql', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) }),
    })
  }

  const handleClearCache = () => {
    setConfirmModal({
      isOpen: true, type: 'confirm', title: 'Clear Cache',
      message: 'This will clear all cached data which may temporarily affect system performance.\n\nAre you sure you want to proceed?',
      confirmText: 'Yes, Clear Cache', cancelText: 'Cancel',
      onConfirm: () => setConfirmModal({ isOpen: true, type: 'success', title: 'Cache Cleared', message: 'System cache has been cleared successfully!\n\nThe system will now rebuild the cache as needed.', onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })) }),
    })
  }

  return (
    <>
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-md p-6">
          <div className="mb-6">
            <h3 className="text-gray-800 m-0 mb-1">Data Management</h3>
            <p className="text-gray-600 text-sm">Manage system data, backups, and performance</p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex flex-col h-full">
                <div className="w-14 h-14 bg-gradient-to-br from-[#0077BE] to-[#006699] rounded-xl flex items-center justify-center mb-4 shadow-md">
                  <Database size={28} className="text-white" />
                </div>
                <h4 className="text-gray-800 mb-2">Backup Database</h4>
                <p className="text-gray-600 text-sm mb-4 flex-grow">Create a secure backup of the system database</p>
                <button onClick={handleBackupDatabase} className="w-full px-4 py-2.5 bg-[#0077BE] text-white rounded-lg hover:bg-[#006699] transition-colors font-medium shadow-sm hover:shadow-md">
                  Backup Now
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex flex-col h-full">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center mb-4 shadow-md">
                  <Download size={28} className="text-white" />
                </div>
                <h4 className="text-gray-800 mb-2">Export Data</h4>
                <p className="text-gray-600 text-sm mb-4 flex-grow">Export system data as CSV or Excel</p>
                <button onClick={() => { setExportSelected([]); setExportFormat('excel'); setExportModalOpen(true) }} className="w-full px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium shadow-sm hover:shadow-md">
                  Export Data
                </button>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-white border border-red-100 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
              <div className="flex flex-col h-full">
                <div className="w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl flex items-center justify-center mb-4 shadow-md">
                  <RefreshCw size={28} className="text-white" />
                </div>
                <h4 className="text-gray-800 mb-2">Clear Cache</h4>
                <p className="text-gray-600 text-sm mb-4 flex-grow">Clear cached data to improve performance</p>
                <button onClick={handleClearCache} className="w-full px-4 py-2.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium shadow-sm hover:shadow-md">
                  Clear Cache
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {exportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Download size={20} className="text-blue-600" />
                </div>
                <div>
                  <h3 className="text-gray-800 font-semibold m-0">Export Data</h3>
                  <p className="text-gray-500 text-xs mt-0.5 m-0">Select the modules and format to export</p>
                </div>
              </div>
              <button onClick={() => setExportModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-3">Export Format</p>
                <div className="flex gap-3">
                  {(['excel', 'csv'] as const).map(fmt => (
                    <button key={fmt} onClick={() => setExportFormat(fmt)} className={`flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors ${exportFormat === fmt ? 'bg-blue-500 border-blue-500 text-white' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}>
                      {fmt === 'excel' ? 'Excel (.xlsx)' : 'CSV (.csv)'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm font-semibold text-gray-700 m-0">Select Modules</p>
                  <div className="flex gap-3 text-xs">
                    <button onClick={() => setExportSelected(exportModules.map(m => m.id))} className="text-blue-500 hover:underline">Select all</button>
                    <button onClick={() => setExportSelected([])} className="text-gray-400 hover:underline">Clear</button>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {exportModules.map(mod => {
                    const checked = exportSelected.includes(mod.id)
                    return (
                      <button key={mod.id} onClick={() => toggleExportModule(mod.id)} className={`flex items-start gap-3 p-3 rounded-lg border text-left transition-colors ${checked ? 'bg-blue-50 border-blue-300' : 'border-gray-200 hover:bg-gray-50'}`}>
                        <div className={`w-4 h-4 mt-0.5 rounded border-2 flex-shrink-0 flex items-center justify-center transition-colors ${checked ? 'bg-blue-500 border-blue-500' : 'border-gray-300'}`}>
                          {checked && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                        </div>
                        <div>
                          <p className={`text-sm font-medium m-0 ${checked ? 'text-blue-700' : 'text-gray-700'}`}>{mod.label}</p>
                          <p className="text-xs text-gray-400 mt-0.5 m-0">{mod.description}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-500 m-0">{exportSelected.length === 0 ? 'No modules selected' : `${exportSelected.length} module${exportSelected.length > 1 ? 's' : ''} selected`}</p>
              <div className="flex gap-3">
                <button onClick={() => setExportModalOpen(false)} className="px-5 py-2 border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition-colors text-sm">Cancel</button>
                <button onClick={handleExportConfirm} disabled={exportSelected.length === 0} className="px-5 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed">Export</button>
              </div>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.isOpen} type={confirmModal.type} title={confirmModal.title}
        message={confirmModal.message} confirmText={confirmModal.confirmText} cancelText={confirmModal.cancelText}
        onConfirm={confirmModal.onConfirm} onCancel={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
      />
    </>
  )
}
