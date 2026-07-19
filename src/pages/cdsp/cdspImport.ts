// Bulk applicant import for CDSP.
//
// Two responsibilities:
//   1. Generate a styled .xlsx template (ExcelJS) that mirrors the CDSP Profile
//      form section by section, matching the look of the Employment Facilitation
//      import template: a merged, colored section-label header row (row 1) above
//      the individual field headers (row 2), with enum fields rendered as
//      in-cell dropdowns.
//   2. Parse a filled-in workbook, resolve the address triple to dataset IDs via
//      locationService (cascade: province -> city -> barangay, optional for
//      CDSP), and POST each row through cdspService.createProfile.
//
// Reading the workbook uses SheetJS (xlsx); styling/validation on write needs
// ExcelJS — same split as the EF applicant importer.

import ExcelJS from 'exceljs'
import * as XLSX from 'xlsx'
import {
  searchProvinces,
  searchCities,
  searchBarangaysByCity,
  type LocationOption,
} from '../../services/locationService'
import { createProfile } from '../../services/cdspService'
import {
  CLASSIFICATION_OPTIONS,
  CIVIL_STATUS_OPTIONS,
  EDUCATION_OPTIONS,
  EMPLOYMENT_STATUS_OPTIONS,
  SEX_OPTIONS,
} from './CDSPProfileForm'

// ─── Template definition (grouped by form section) ───────────────────────────

type TemplateColumn = {
  header: string // base header (no "*"); required columns get a "*" appended on write
  width: number
  example: string
  required?: boolean
  options?: string[] // renders an in-cell dropdown (data validation)
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
    { header: 'Sex', width: 10, example: 'Male', required: true, options: SEX_OPTIONS },
    { header: 'Birthdate (MM/DD/YYYY)', width: 20, example: '05/20/1996', required: true },
    { header: 'Civil Status', width: 14, example: 'Single', required: true, options: CIVIL_STATUS_OPTIONS },
    { header: 'Contact Number', width: 16, example: '09171234567' },
    { header: 'Email', width: 22, example: 'juan@example.com' },
  ],
}

const SECTION_ADDRESS: TemplateSection = {
  label: 'II. ADDRESS',
  fillArgb: 'FFF1C40F',
  requiredArgb: 'FFF5D478',
  optionalArgb: 'FFFDF1C1',
  columns: [
    { header: 'Province', width: 22, example: 'Misamis Occidental', required: true },
    { header: 'City / Municipality', width: 20, example: 'Tangub City', required: true },
    { header: 'Barangay', width: 18, example: 'Santo Niño', required: true },
    { header: 'Street / Purok #', width: 18, example: 'Purok 3' },
  ],
}

const SECTION_CLASSIFICATION: TemplateSection = {
  label: 'III. CLASSIFICATION',
  fillArgb: 'FF2980B9',
  requiredArgb: 'FF5B9BD5',
  optionalArgb: 'FF9DC3E6',
  columns: [
    { header: 'Classification (comma-separated)', width: 40, example: 'Fresh Graduate' },
    { header: 'Classification, if Other', width: 24, example: '' },
  ],
}

const SECTION_EDUCATION: TemplateSection = {
  label: 'IV. EDUCATIONAL BACKGROUND',
  fillArgb: 'FFF1C40F',
  requiredArgb: 'FFF5D478',
  optionalArgb: 'FFFDF1C1',
  columns: [
    { header: 'Highest Educational Attainment', width: 28, example: 'College Graduate', required: true, options: EDUCATION_OPTIONS },
    { header: 'School / University', width: 24, example: '' },
    { header: 'Year Level', width: 16, example: '' },
    { header: 'Strand', width: 18, example: '' },
    { header: 'Course / Program', width: 22, example: 'BS Information Technology' },
    { header: 'Year Graduated', width: 16, example: '2024' },
  ],
}

const SECTION_EMPLOYMENT: TemplateSection = {
  label: 'V. EMPLOYMENT STATUS',
  fillArgb: 'FF2980B9',
  requiredArgb: 'FF5B9BD5',
  optionalArgb: 'FF9DC3E6',
  columns: [
    { header: 'Employment Status', width: 16, example: 'Unemployed', required: true, options: EMPLOYMENT_STATUS_OPTIONS },
    { header: 'Current Occupation', width: 20, example: '' },
  ],
}

// Section VI — CDSP Service Availed. The service list is fetched live (services
// can be added at runtime via "Add New Service"), so the dropdown options are
// injected by the caller rather than hardcoded here.
function makeServiceSection(services: string[]): TemplateSection {
  return {
    label: 'VI. CDSP SERVICE AVAILED',
    fillArgb: 'FFF1C40F',
    requiredArgb: 'FFF5D478',
    optionalArgb: 'FFFDF1C1',
    columns: [
      { header: 'Service Availed', width: 26, example: services[0] ?? '', required: true, options: services },
    ],
  }
}

const SECTION_OFFICE: TemplateSection = {
  label: 'VII. FOR PESO OFFICE ONLY',
  fillArgb: 'FF64748B',
  requiredArgb: 'FF94A3B8',
  optionalArgb: 'FFCBD5E1',
  columns: [
    { header: 'Date Applied (MM/DD/YYYY)', width: 20, example: '' },
    { header: 'Received By', width: 20, example: '' },
    { header: 'Remarks', width: 24, example: '' },
  ],
}

function buildSections(services: string[]): TemplateSection[] {
  return [
    SECTION_PERSONAL,
    SECTION_ADDRESS,
    SECTION_CLASSIFICATION,
    SECTION_EDUCATION,
    SECTION_EMPLOYMENT,
    makeServiceSection(services),
    SECTION_OFFICE,
  ]
}

// Rows (beyond the two header rows) that receive dropdown validation, so users
// have plenty of pre-formatted rows to fill in.
const TEMPLATE_VALIDATION_ROWS = 200
const FIRST_DATA_ROW = 3 // row 1 = section labels, row 2 = field headers.

// Excel silently caps a data-validation error message at ~225 characters (and
// truncating/exceeding it is exactly what triggers the "we found a problem
// with some content" repair prompt on open). Long option lists (e.g. Highest
// Educational Attainment) blow past that when fully enumerated, so fall back
// to a generic message rather than risk corrupting the workbook.
const MAX_VALIDATION_ERROR_LEN = 200
function validationErrorMessage(options: string[]): string {
  const enumerated = `Please choose one of: ${options.join(', ')}`
  return enumerated.length <= MAX_VALIDATION_ERROR_LEN ? enumerated : 'Please choose a value from the dropdown list.'
}

export async function downloadImportTemplate(services: string[]): Promise<void> {
  const sections = buildSections(services)
  const columns = sections.flatMap((s) => s.columns)

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet('Applicants')

  // Format every column as Text ("@") so Excel preserves leading zeros (e.g. the
  // "0" in a contact number) and doesn't auto-convert dates/long numbers. The
  // parser reads every cell as a string anyway, so text format is ideal.
  ws.columns = columns.map((c) => ({ width: c.width, style: { numFmt: '@' } }))

  const border = {
    top: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin' as const, color: { argb: 'FFCBD5E1' } },
  }

  // Row 1: section-label band, one merged cell per section.
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

  // Row 2: field headers colored per section (blue/yellow/gray shades), black text.
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

  // Row 3: one greyed, italic example row.
  const exampleRow = ws.addRow(columns.map((c) => c.example))
  exampleRow.eachCell((cell) => {
    cell.font = { italic: true, color: { argb: 'FF94A3B8' } }
  })

  // Freeze both header rows, then apply dropdown validation to the enum columns.
  // Longer option lists (e.g. Highest Educational Attainment) can exceed Excel's
  // ~255-character limit on an inline list formula ("a,b,c"), which corrupts the
  // workbook (Excel prompts to "repair" it on open). To avoid that entirely, every
  // dropdown's values are written to a hidden helper sheet and referenced by cell
  // range instead of as a literal string.
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
  link.download = 'CDSP_Applicants_Template.xlsx'
  link.click()
  URL.revokeObjectURL(url)
}

// ─── Parsing helpers ─────────────────────────────────────────────────────────

// Normalize a header or cell value for comparison: trim, collapse whitespace,
// strip the "*" required marker, lowercase.
function norm(v: unknown): string {
  return String(v ?? '').replace(/\*/g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

// Return the canonical option matching `value` (case-insensitively), or "".
function pickEnum(value: string, options: string[]): string {
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

// Which Educational Background sub-fields apply to a given Highest Educational
// Attainment — mirrors CDSPProfileForm.tsx's showYearLevel/showStrand/showCourse/
// showYearGraduated exactly (that form clears the other fields on selection
// change, so a filled-in field that doesn't apply to the chosen level is a sign
// of stale/mismatched data, not something to silently keep or drop).
function educationFieldFlags(edu: string) {
  const isSHS = edu === 'Senior High School Level' || edu === 'Senior High School Graduate'
  const isLevel = edu.endsWith('Level')
  const showYearLevel = isLevel && edu !== 'Doctoral Level' && edu !== "Master's Level"
  const showStrand = isSHS
  const showCourse = ['College Level', 'College Graduate', "Master's Level", "Master's Graduate", 'Doctoral Level', 'Doctoral Graduate'].includes(edu)
  const showYearGraduated = edu.toLowerCase().includes('graduate') || edu === 'Vocational / Technical'
  return { showYearLevel, showStrand, showCourse, showYearGraduated }
}

// A single parsed row, keyed by normalized header.
type Row = Record<string, string>

function get(row: Row, header: string): string {
  return (row[norm(header)] ?? '').trim()
}

// ─── Address resolution (optional for CDSP: only resolved if any part is given) ─

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

// The address triple is required: beneficiaries.barangay_id is NOT NULL in the
// database, so an unresolved or missing address can't be silently skipped —
// it would otherwise surface as a raw SQL "not-null violation" at save time.
async function resolveAddress(
  provinceName: string,
  cityName: string,
  barangayName: string,
  caches: ResolveCaches,
): Promise<{ barangayId: number }> {
  const missing: string[] = []
  if (!provinceName) missing.push('Province')
  if (!cityName) missing.push('City / Municipality')
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

async function rowToPayload(row: Row, services: string[], caches: ResolveCaches): Promise<Record<string, unknown>> {
  const lastName = get(row, 'Last Name')
  const firstName = get(row, 'First Name')
  if (!lastName) throw new Error('Last Name is required.')
  if (!firstName) throw new Error('First Name is required.')

  const sex = pickEnum(get(row, 'Sex'), SEX_OPTIONS)
  if (!sex) throw new Error(`Sex is required and must be one of: ${SEX_OPTIONS.join(', ')}.`)

  const birthdateRaw = get(row, 'Birthdate (MM/DD/YYYY)')
  if (!birthdateRaw) throw new Error('Birthdate is required.')
  const birthdate = toIsoDate(birthdateRaw)
  if (!birthdate) throw new Error(`Birthdate "${birthdateRaw}" is not a valid date — use MM/DD/YYYY format (e.g. 05/20/1996).`)

  const civilStatusRaw = get(row, 'Civil Status')
  const civilStatus = pickEnum(civilStatusRaw, CIVIL_STATUS_OPTIONS)
  if (!civilStatus) throw new Error(`Civil Status is required and must be one of: ${CIVIL_STATUS_OPTIONS.join(', ')}.`)

  const highestEducation = pickEnum(get(row, 'Highest Educational Attainment'), EDUCATION_OPTIONS)
  if (!highestEducation) throw new Error('Highest Educational Attainment is required.')

  const yearLevel = get(row, 'Year Level')
  const strand = get(row, 'Strand')
  const course = get(row, 'Course / Program')
  const yearGraduated = get(row, 'Year Graduated')
  const eduFlags = educationFieldFlags(highestEducation)
  if (yearLevel && !eduFlags.showYearLevel) {
    throw new Error(`Year Level doesn't apply to "${highestEducation}" — remove it, or change Highest Educational Attainment to an Elementary/High School/Senior High School/College Level.`)
  }
  if (strand && !eduFlags.showStrand) {
    throw new Error(`Strand only applies to Senior High School (Level or Graduate) — it doesn't apply to "${highestEducation}". Remove it or fix Highest Educational Attainment.`)
  }
  if (course && !eduFlags.showCourse) {
    throw new Error(`Course / Program only applies to College, Master's, or Doctoral entries — it doesn't apply to "${highestEducation}". Remove it or fix Highest Educational Attainment.`)
  }
  if (yearGraduated && !eduFlags.showYearGraduated) {
    throw new Error(`Year Graduated only applies to a "Graduate" attainment (or Vocational / Technical) — it doesn't apply to "${highestEducation}". Remove it or fix Highest Educational Attainment.`)
  }

  const employmentStatus = pickEnum(get(row, 'Employment Status'), EMPLOYMENT_STATUS_OPTIONS)
  if (!employmentStatus) throw new Error('Employment Status is required.')

  const serviceAvailed = pickEnum(get(row, 'Service Availed'), services)
  if (!serviceAvailed) throw new Error(`Service Availed must be one of: ${services.join(', ')}.`)

  const address = await resolveAddress(
    get(row, 'Province'),
    get(row, 'City / Municipality'),
    get(row, 'Barangay'),
    caches,
  )

  const classification = get(row, 'Classification (comma-separated)')
    .split(',')
    .map((c) => pickEnum(c, CLASSIFICATION_OPTIONS))
    .filter(Boolean)

  return {
    firstName,
    lastName,
    middleName: get(row, 'Middle Name'),
    sex,
    birthdate,
    civilStatus,
    contactNumber: get(row, 'Contact Number'),
    email: get(row, 'Email'),
    streetPurok: get(row, 'Street / Purok #'),
    barangayId: address.barangayId,
    classification,
    classificationOther: get(row, 'Classification, if Other'),
    highestEducation,
    schoolName: get(row, 'School / University'),
    course,
    strand,
    yearLevel,
    yearGraduated,
    employmentStatus,
    currentOccupation: get(row, 'Current Occupation'),
    serviceAvailed,
    dateApplicationReceived: toIsoDate(get(row, 'Date Applied (MM/DD/YYYY)')),
    receivedBy: get(row, 'Received By'),
    remarks: get(row, 'Remarks'),
  }
}

// ─── Public import entry point ───────────────────────────────────────────────

export type ImportRowError = { row: number; name: string; error: string }
export type ImportResult = { total: number; succeeded: number; failed: ImportRowError[] }

// Example-row values we skip so the sample doesn't get imported.
const EXAMPLE_SURNAME = 'dela cruz'
const EXAMPLE_FIRST = 'juan'

function isEmptyRow(row: Row): boolean {
  return Object.values(row).every((v) => String(v ?? '').trim() === '')
}

function isExampleRow(row: Row): boolean {
  return norm(get(row, 'Last Name')) === EXAMPLE_SURNAME && norm(get(row, 'First Name')) === EXAMPLE_FIRST
}

export async function importCdspApplicants(
  file: File,
  services: string[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportResult> {
  const buf = await file.arrayBuffer()
  const wb = XLSX.read(buf, { type: 'array' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) throw new Error('The file has no worksheets.')

  // range:1 -> treat the SECOND row (the field headers) as the header row, so
  // the merged section-label band in row 1 is ignored. raw:false -> formatted
  // strings (preserves leading zeros, formats dates).
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
      const payload = await rowToPayload(data, services, caches)
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
