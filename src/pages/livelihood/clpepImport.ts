// Bulk applicant import for CLPEP.
//
// Two responsibilities:
//   1. Generate a styled .xlsx template (ExcelJS) that mirrors the CLPEP Profile
//      form section by section, matching the look of the GIP/CDSP/SLP importers.
//   2. Parse a filled-in workbook, resolve the address triple to dataset IDs via
//      locationService (province -> city -> barangay, required since
//      beneficiaries.barangay_id is NOT NULL), and POST each row through
//      clpepService.createProfile.

import ExcelJS from 'exceljs'
import * as XLSX from 'xlsx'
import {
  searchProvinces,
  searchCities,
  searchBarangaysByCity,
  type LocationOption,
} from '../../services/locationService'
import { createProfile } from '../../services/clpepService'
import {
  CHILD_LABOR_STATUS_OPTIONS,
  SCHOOL_STATUS_OPTIONS,
  RELATIONSHIP_OPTIONS,
} from './CLPEPProfileForm'

const SEX_OPTIONS = ['Male', 'Female']
const YES_NO_OPTIONS = ['Yes', 'No']

// ─── Template definition (grouped by form section) ───────────────────────────

type TemplateColumn = {
  header: string
  width: number
  example: string
  required?: boolean
  options?: string[]
}

type TemplateSection = {
  label: string
  fillArgb: string
  requiredArgb: string
  optionalArgb: string
  columns: TemplateColumn[]
}

const SECTION_PERSONAL: TemplateSection = {
  label: 'I. PERSONAL INFORMATION',
  fillArgb: 'FF2980B9',
  requiredArgb: 'FF5B9BD5',
  optionalArgb: 'FF9DC3E6',
  columns: [
    { header: 'Last Name', width: 18, example: 'Dela Cruz', required: true },
    { header: 'First Name', width: 18, example: 'Juan', required: true },
    { header: 'Middle Name', width: 16, example: 'Santos' },
    { header: 'Extension Name', width: 14, example: '' },
    { header: 'Sex', width: 10, example: 'Male', required: true, options: SEX_OPTIONS },
    { header: 'Birthdate (MM/DD/YYYY)', width: 20, example: '03/12/2012', required: true },
  ],
}

const SECTION_ADDRESS: TemplateSection = {
  label: 'II. ADDRESS INFORMATION',
  fillArgb: 'FFF1C40F',
  requiredArgb: 'FFF5D478',
  optionalArgb: 'FFFDF1C1',
  columns: [
    { header: 'Province', width: 22, example: 'Misamis Occidental', required: true },
    { header: 'Municipality/City', width: 20, example: 'Tangub City', required: true },
    { header: 'Barangay', width: 18, example: 'Poblacion', required: true },
    { header: 'Street / Purok / Zone', width: 18, example: 'Purok 1' },
  ],
}

const SECTION_CHILD_LABOR: TemplateSection = {
  label: 'III. CHILD LABOR INFORMATION',
  fillArgb: 'FF2980B9',
  requiredArgb: 'FF5B9BD5',
  optionalArgb: 'FF9DC3E6',
  columns: [
    { header: 'Child Labor Status', width: 20, example: 'Child Laborer', options: [...CHILD_LABOR_STATUS_OPTIONS] },
    { header: 'Nature of Work', width: 20, example: 'Street Vending' },
    { header: 'Currently Working?', width: 16, example: 'Yes', options: YES_NO_OPTIONS },
    { header: 'Hours Worked Per Week', width: 20, example: '15' },
    { header: 'School Status', width: 18, example: 'Currently Enrolled', options: [...SCHOOL_STATUS_OPTIONS] },
    { header: 'School Name', width: 24, example: 'Tangub City Central School' },
    { header: 'Grade / Year Level', width: 18, example: 'Grade 7' },
  ],
}

const SECTION_GUARDIAN: TemplateSection = {
  label: 'IV. PARENT / GUARDIAN',
  fillArgb: 'FFF1C40F',
  requiredArgb: 'FFF5D478',
  optionalArgb: 'FFFDF1C1',
  columns: [
    { header: 'Parent / Guardian Name', width: 22, example: 'Nora Dela Cruz' },
    { header: 'Relationship', width: 16, example: 'Mother', options: [...RELATIONSHIP_OPTIONS] },
    { header: 'Guardian Contact Number', width: 20, example: '09171234567' },
  ],
}

const SECTION_OFFICE: TemplateSection = {
  label: 'V. PESO OFFICE ONLY',
  fillArgb: 'FF64748B',
  requiredArgb: 'FF94A3B8',
  optionalArgb: 'FFCBD5E1',
  columns: [
    { header: 'Date Applied (MM/DD/YYYY)', width: 20, example: '' },
    { header: 'Remarks', width: 24, example: '' },
    { header: 'Received By', width: 20, example: '' },
  ],
}

function buildSections(): TemplateSection[] {
  return [SECTION_PERSONAL, SECTION_ADDRESS, SECTION_CHILD_LABOR, SECTION_GUARDIAN, SECTION_OFFICE]
}

const TEMPLATE_VALIDATION_ROWS = 200
const FIRST_DATA_ROW = 3 // row 1 = section labels, row 2 = field headers.

const MAX_VALIDATION_ERROR_LEN = 200
function validationErrorMessage(options: string[]): string {
  const enumerated = `Please choose one of: ${options.join(', ')}`
  return enumerated.length <= MAX_VALIDATION_ERROR_LEN ? enumerated : 'Please choose a value from the dropdown list.'
}

export async function downloadImportTemplate(): Promise<void> {
  const sections = buildSections()
  const columns = sections.flatMap((s) => s.columns)

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Applicants')

  ws.columns = columns.map((c) => ({ width: c.width, style: { numFmt: '@' } }))

  const border = {
    top: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
  }

  let startCol = 1
  for (const section of sections) {
    const endCol = startCol + section.columns.length - 1
    for (let c = startCol; c <= endCol; c++) {
      const cell = ws.getCell(1, c)
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: section.fillArgb } }
      cell.font = { bold: true, color: { argb: 'FF1A1A1A' }, size: 12 }
      cell.alignment = { vertical: 'middle', horizontal: 'center' }
      cell.border = border
    }
    ws.getCell(1, startCol).value = section.label
    if (endCol > startCol) ws.mergeCells(1, startCol, 1, endCol)
    startCol = endCol + 1
  }
  ws.getRow(1).height = 26

  let colIdx2 = 0
  for (const section of sections) {
    for (const col of section.columns) {
      const cell = ws.getCell(2, colIdx2 + 1)
      cell.value = col.required ? `${col.header} *` : col.header
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: col.required ? section.requiredArgb : section.optionalArgb } }
      cell.font = { bold: true, color: { argb: 'FF1A1A1A' }, size: 11 }
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }
      cell.border = border
      colIdx2++
    }
  }
  ws.getRow(2).height = 32

  const exampleRow = ws.addRow(columns.map((c) => c.example))
  exampleRow.eachCell((cell) => {
    cell.font = { italic: true, color: { argb: 'FF94A3B8' } }
  })

  ws.views = [{ state: 'frozen', ySplit: 2 }]
  const lastRow = FIRST_DATA_ROW + TEMPLATE_VALIDATION_ROWS - 1
  const optionColumns = columns.filter((c) => c.options && c.options.length > 0)
  const listSheet = optionColumns.length > 0 ? wb.addWorksheet('Lists', { state: 'veryHidden' }) : null

  columns.forEach((col, idx) => {
    if (!col.options || col.options.length === 0 || !listSheet) return
    const letter = ws.getColumn(idx + 1).letter

    const listColIdx = optionColumns.indexOf(col) + 1
    const listColLetter = listSheet.getColumn(listColIdx).letter
    col.options.forEach((opt, i) => {
      listSheet.getCell(i + 1, listColIdx).value = opt
    })
    const formulae = [`'Lists'!$${listColLetter}$1:$${listColLetter}$${col.options.length}`]

    for (let r = FIRST_DATA_ROW; r <= lastRow; r++) {
      ws.getCell(`${letter}${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae,
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid value',
        error: validationErrorMessage(col.options),
      }
    }
  })

  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'CLPEP_Applicants_Template.xlsx'
  link.click()
  URL.revokeObjectURL(url)
}

// ─── Parsing helpers ─────────────────────────────────────────────────────────

function norm(v: unknown): string {
  return String(v ?? '').replace(/\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

function pickEnum(value: string, options: readonly string[]): string {
  const n = norm(value)
  return options.find((o) => norm(o) === n) ?? ''
}

// Template columns ask for MM/DD/YYYY; ISO (YYYY-MM-DD) is still accepted for
// backward compatibility. Validates the date is real (e.g. rejects 13/45/2005)
// rather than letting the Date constructor silently roll it over.
function toIsoDate(v: string): string {
  const s = v.trim()
  if (!s) return ''
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (mdy) {
    const [, mm, dd, yyyy] = mdy
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd))
    if (d.getFullYear() === Number(yyyy) && d.getMonth() === Number(mm) - 1 && d.getDate() === Number(dd)) {
      return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
    }
    return ''
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

// Rejects non-numeric text (e.g. "N/A") rather than silently passing it
// through to a numeric column, which would 500 at the database instead of
// failing this row with a clear message.
function toNumericStringOrThrow(v: string, label: string): string {
  const s = v.trim()
  if (!s) return ''
  if (!/^\d+(\.\d+)?$/.test(s)) throw new Error(`${label} must be a number — got "${v}".`)
  return s
}

type Row = Record<string, string>

function get(row: Row, header: string): string {
  return (row[norm(header)] ?? '').trim()
}

// ─── Address resolution (required: beneficiaries.barangay_id is NOT NULL) ────

type ResolveCaches = {
  province: Map<string, LocationOption | null>
  city: Map<string, LocationOption | null>
  barangay: Map<string, LocationOption | null>
}

function makeCaches(): ResolveCaches {
  return { province: new Map(), city: new Map(), barangay: new Map() }
}

function exactMatch(options: LocationOption[], name: string): LocationOption | null {
  const target = norm(name)
  return options.find((o) => norm(o.name) === target) ?? null
}

async function resolveProvince(name: string, caches: ResolveCaches): Promise<LocationOption | null> {
  const key = norm(name)
  if (caches.province.has(key)) return caches.province.get(key)!
  const match = exactMatch(await searchProvinces(name), name)
  caches.province.set(key, match)
  return match
}

async function resolveCity(provinceId: number, name: string, caches: ResolveCaches): Promise<LocationOption | null> {
  const key = `${provinceId}::${norm(name)}`
  if (caches.city.has(key)) return caches.city.get(key)!
  const match = exactMatch(await searchCities(provinceId, name), name)
  caches.city.set(key, match)
  return match
}

async function resolveBarangay(cityId: number, name: string, caches: ResolveCaches): Promise<LocationOption | null> {
  const key = `${cityId}::${norm(name)}`
  if (caches.barangay.has(key)) return caches.barangay.get(key)!
  const match = exactMatch(await searchBarangaysByCity(cityId, name), name)
  caches.barangay.set(key, match)
  return match
}

async function resolveAddress(
  provinceName: string,
  cityName: string,
  barangayName: string,
  caches: ResolveCaches,
): Promise<{ barangayId: number }> {
  const missing: string[] = []
  if (!provinceName) missing.push('Province')
  if (!cityName) missing.push('Municipality/City')
  if (!barangayName) missing.push('Barangay')
  if (missing.length) throw new Error(`Address is incomplete — missing: ${missing.join(', ')}.`)

  const province = await resolveProvince(provinceName, caches)
  if (!province) throw new Error(`Province "${provinceName}" was not found in the location dataset.`)

  const city = await resolveCity(province.id, cityName, caches)
  if (!city) throw new Error(`City/Municipality "${cityName}" was not found in ${province.name}.`)

  const barangay = await resolveBarangay(city.id, barangayName, caches)
  if (!barangay) throw new Error(`Barangay "${barangayName}" was not found in ${city.name}.`)

  return { barangayId: barangay.id }
}

// ─── Row -> create-profile payload ───────────────────────────────────────────

async function rowToPayload(row: Row, caches: ResolveCaches): Promise<Record<string, unknown>> {
  const lastName = get(row, 'Last Name')
  const firstName = get(row, 'First Name')
  if (!lastName) throw new Error('Last Name is required.')
  if (!firstName) throw new Error('First Name is required.')

  const sex = pickEnum(get(row, 'Sex'), SEX_OPTIONS)
  if (!sex) throw new Error(`Sex is required and must be one of: ${SEX_OPTIONS.join(', ')}.`)

  const birthdateRaw = get(row, 'Birthdate (MM/DD/YYYY)')
  if (!birthdateRaw) throw new Error('Birthdate is required.')
  const birthdate = toIsoDate(birthdateRaw)
  if (!birthdate) throw new Error(`Birthdate "${birthdateRaw}" is not a valid date — use MM/DD/YYYY format (e.g. 03/12/2012).`)

  const address = await resolveAddress(
    get(row, 'Province'),
    get(row, 'Municipality/City'),
    get(row, 'Barangay'),
    caches,
  )

  const childLaborStatusRaw = get(row, 'Child Labor Status')
  const childLaborStatus = childLaborStatusRaw ? pickEnum(childLaborStatusRaw, CHILD_LABOR_STATUS_OPTIONS) : ''
  if (childLaborStatusRaw && !childLaborStatus) {
    throw new Error(`Child Labor Status "${childLaborStatusRaw}" is not valid — must be one of: ${CHILD_LABOR_STATUS_OPTIONS.join(', ')}.`)
  }

  const currentlyWorkingRaw = get(row, 'Currently Working?')
  const currentlyWorking = currentlyWorkingRaw ? pickEnum(currentlyWorkingRaw, YES_NO_OPTIONS) : ''
  if (currentlyWorkingRaw && !currentlyWorking) {
    throw new Error(`Currently Working? "${currentlyWorkingRaw}" is not valid — must be one of: ${YES_NO_OPTIONS.join(', ')}.`)
  }

  const schoolStatusRaw = get(row, 'School Status')
  const schoolStatus = schoolStatusRaw ? pickEnum(schoolStatusRaw, SCHOOL_STATUS_OPTIONS) : ''
  if (schoolStatusRaw && !schoolStatus) {
    throw new Error(`School Status "${schoolStatusRaw}" is not valid — must be one of: ${SCHOOL_STATUS_OPTIONS.join(', ')}.`)
  }

  const relationshipRaw = get(row, 'Relationship')
  const guardianRelationship = relationshipRaw ? pickEnum(relationshipRaw, RELATIONSHIP_OPTIONS) : ''
  if (relationshipRaw && !guardianRelationship) {
    throw new Error(`Relationship "${relationshipRaw}" is not valid — must be one of: ${RELATIONSHIP_OPTIONS.join(', ')}.`)
  }

  return {
    firstName,
    lastName,
    middleName: get(row, 'Middle Name'),
    nameExtension: get(row, 'Extension Name'),
    sex,
    birthdate,
    streetPurok: get(row, 'Street / Purok / Zone'),
    barangayId: address.barangayId,
    childLaborStatus,
    natureOfWork: get(row, 'Nature of Work'),
    currentlyWorking: currentlyWorking ? currentlyWorking === 'Yes' : undefined,
    hoursWorkedPerWeek: toNumericStringOrThrow(get(row, 'Hours Worked Per Week'), 'Hours Worked Per Week'),
    schoolStatus,
    schoolName: get(row, 'School Name'),
    gradeYearLevel: get(row, 'Grade / Year Level'),
    guardianName: get(row, 'Parent / Guardian Name'),
    guardianRelationship,
    guardianContactNumber: get(row, 'Guardian Contact Number'),
    dateApplied: toIsoDate(get(row, 'Date Applied (MM/DD/YYYY)')),
    remarks: get(row, 'Remarks'),
    receivedBy: get(row, 'Received By'),
  }
}

// ─── Public import entry point ───────────────────────────────────────────────

export type ImportRowError = { row: number; name: string; error: string }
export type ImportResult = { total: number; succeeded: number; failed: ImportRowError[] }

const EXAMPLE_SURNAME = 'dela cruz'
const EXAMPLE_FIRST = 'juan'

function isEmptyRow(row: Row): boolean {
  return Object.values(row).every((v) => String(v ?? '').trim() === '')
}

function isExampleRow(row: Row): boolean {
  return norm(get(row, 'Last Name')) === EXAMPLE_SURNAME && norm(get(row, 'First Name')) === EXAMPLE_FIRST
}

export async function importClpepApplicants(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<ImportResult> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) throw new Error('The file has no worksheets.')

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: '',
    raw: false,
    range: 1,
  })

  const rows = rawRows.map((r, i) => {
    const data: Row = {}
    for (const [k, v] of Object.entries(r)) data[norm(k)] = String(v ?? '')
    return { sheetRow: i + FIRST_DATA_ROW, data }
  })

  const dataRows = rows.filter(({ data }) => !isEmptyRow(data) && !isExampleRow(data))
  const total = dataRows.length
  const failed: ImportRowError[] = []
  let succeeded = 0
  const caches = makeCaches()

  for (let i = 0; i < dataRows.length; i++) {
    const { sheetRow, data } = dataRows[i]
    const name = [get(data, 'First Name'), get(data, 'Last Name')].filter(Boolean).join(' ') || '(unnamed)'
    try {
      const payload = await rowToPayload(data, caches)
      await createProfile(payload)
      succeeded++
    } catch (err) {
      const message =
        err instanceof Error ? err.message : typeof err === 'string' ? err : 'Unexpected error.'
      failed.push({ row: sheetRow, name, error: message })
    }
    onProgress?.(i + 1, total)
  }

  return { total, succeeded, failed }
}
