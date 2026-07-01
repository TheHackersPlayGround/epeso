// Bulk applicant import for Employment Facilitation.
//
// Two responsibilities:
//   1. Generate a styled .xlsx template (ExcelJS) that mirrors the Add Applicant
//      form section by section. Columns are grouped under a merged section-label
//      header row (row 1, e.g. "I. PERSONAL INFORMATION"); the individual field
//      headers sit in row 2. Enum fields render as in-cell dropdowns.
//   2. Parse a filled-in workbook, resolve the address triple to dataset IDs via
//      locationService (cascade: province -> city -> barangay), build a valid
//      ApplicantFormData per row, and POST it through createApplicant.
//
// Reading the workbook uses SheetJS (xlsx); styling/validation on write needs
// ExcelJS.

import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import {
  searchProvinces,
  searchCities,
  searchBarangaysByCity,
  searchAllCities,
  type LocationOption,
} from "../../services/locationService";
import { createApplicant } from "../../services/applicantService";
import type { ApplicantFormData } from "./AddApplicantSidebar";
import { createDefaultApplicantFormData } from "./applicantDefaults";

// ─── Enum option lists (must match the Add Applicant form / backend enums) ────

const SEX_OPTIONS = ["Male", "Female"];
const CIVIL_STATUS_OPTIONS = ["Single", "Married", "Widowed", "Separated"];
const YES_NO_OPTIONS = ["Yes", "No"];
const DISABILITY_TYPES = ["Visual", "Speech", "Hearing", "Physical", "Mental", "Other"];
const EMPLOYMENT_STATUS_OPTIONS = ["Employed", "Unemployed"];
const EMPLOYMENT_TYPE_OPTIONS = ["Wage Employed", "Self-employed"];
const SELF_EMPLOYMENT_OPTIONS = [
  "Fisherman/Fisherfolk", "Vendor/Retailer", "Home-based worker", "Transport",
  "Domestic Worker", "Freelancer", "Artisan/Craft Worker", "Others",
];
const UNEMPLOYMENT_REASON_OPTIONS = [
  "New Entrant/Fresh Graduate", "Finished Contract", "Resigned", "Retired",
  "Terminated/Laid-off", "Terminated due to Calamity", "Others",
];
const WORK_STATUS_OPTIONS = ["Permanent", "Contractual", "Part-time", "Probationary"];

// ─── Template definition (grouped by form section) ───────────────────────────

type TemplateColumn = {
  header: string; // base header (no "*"); required columns get a "*" appended on write
  width: number;
  example: string;
  required?: boolean;
  options?: string[]; // renders an in-cell dropdown (data validation)
};

type TemplateSection = {
  label: string;
  fillArgb: string;
  requiredArgb: string;
  optionalArgb: string;
  columns: TemplateColumn[];
};

// Section I — Personal Information. Mirrors the form's first section, including
// the address triple, disability, employment status/type, OFW and 4Ps blocks.
const SECTION_PERSONAL: TemplateSection = {
  label: "I. PERSONAL INFORMATION",
  fillArgb: "FF2980B9",
  requiredArgb: "FF5B9BD5",
  optionalArgb: "FF9DC3E6",
  columns: [
    { header: "Surname", width: 18, example: "Dela Cruz", required: true },
    { header: "First Name", width: 18, example: "Juan", required: true },
    { header: "Middle Name", width: 16, example: "Santos" },
    { header: "Suffix", width: 9, example: "Jr." },
    { header: "Date of Birth (YYYY-MM-DD)", width: 22, example: "1996-05-20", required: true },
    { header: "Sex", width: 10, example: "Male", required: true, options: SEX_OPTIONS },
    { header: "Religion", width: 16, example: "Roman Catholic" },
    { header: "Civil Status", width: 14, example: "Single", required: true, options: CIVIL_STATUS_OPTIONS },
    { header: "Height (cm)", width: 11, example: "165" },
    { header: "House No./Street", width: 18, example: "123 Rizal St." },
    { header: "Province", width: 22, example: "Misamis Occidental", required: true },
    { header: "Municipality/City", width: 20, example: "Tangub City", required: true },
    { header: "Barangay", width: 18, example: "Santo Niño", required: true },
    { header: "Has Disability?", width: 14, example: "No", options: YES_NO_OPTIONS },
    { header: "Disability Types", width: 26, example: "" }, // comma-separated, e.g. "Visual, Physical"
    { header: "Disability (Other) Detail", width: 22, example: "" },
    { header: "TIN", width: 16, example: "" },
    { header: "Contact Number", width: 16, example: "09171234567", required: true },
    { header: "Email", width: 22, example: "juan@example.com" },
    { header: "Employment Status", width: 16, example: "Unemployed", options: EMPLOYMENT_STATUS_OPTIONS },
    { header: "Employment Type", width: 16, example: "", options: EMPLOYMENT_TYPE_OPTIONS },
    { header: "Self-Employment Type", width: 20, example: "", options: SELF_EMPLOYMENT_OPTIONS },
    { header: "Self-Employment (Other)", width: 20, example: "" },
    { header: "Months Looking For Work", width: 20, example: "" },
    { header: "Unemployment Reason", width: 26, example: "", options: UNEMPLOYMENT_REASON_OPTIONS },
    { header: "Unemployment Reason (Other)", width: 24, example: "" },
    { header: "An OFW?", width: 11, example: "No", options: YES_NO_OPTIONS },
    { header: "OFW Country", width: 14, example: "" },
    { header: "A Former OFW?", width: 13, example: "No", options: YES_NO_OPTIONS },
    { header: "Former OFW Country", width: 18, example: "" },
    { header: "Former OFW Return Date (YYYY-MM-DD)", width: 30, example: "" },
    { header: "A 4Ps Beneficiary?", width: 16, example: "No", options: YES_NO_OPTIONS },
    { header: "Household ID No.", width: 16, example: "" },
  ],
};

// Section II — Job Preference. A repeating sub-table in the form (occupation +
// local city / overseas country, up to 3 rows by default) plus a single shared
// employment-type preference. Flattened here into fixed numbered columns so it
// stays one row per applicant. (The form's Local/Overseas checkboxes aren't
// persisted by the backend, so they're omitted — the location is conveyed by
// whether a Local City vs Overseas Country value is filled in.)
const JOB_PREF_ROWS = 3;
const JOB_PREF_TYPE_OPTIONS = ["Part-time", "Full-time"]; // the individual values
const EMPLOYMENT_TYPE_PREF_OPTIONS = ["Part-time", "Full-time", "Part-time, Full-time"]; // dropdown combos

const SECTION_JOBPREF: TemplateSection = {
  label: "II. JOB PREFERENCE",
  fillArgb: "FFF1C40F",
  requiredArgb: "FFF5D478",
  optionalArgb: "FFFDF1C1",
  columns: [
    { header: "Employment Type Preference", width: 24, example: "Full-time", options: EMPLOYMENT_TYPE_PREF_OPTIONS },
    ...Array.from({ length: JOB_PREF_ROWS }, (_, i): TemplateColumn[] => [
      { header: `Preferred Occupation ${i + 1}`, width: 20, example: i === 0 ? "Carpenter" : "" },
      { header: `Preferred Local City ${i + 1}`, width: 20, example: i === 0 ? "Tangub City" : "" },
      { header: `Preferred Overseas Country ${i + 1}`, width: 22, example: "" },
    ]).flat(),
  ],
};

// Section III — Language / Dialect Proficiency. A repeating table of
// language + Read/Write/Speak/Understand. Flattened into numbered columns
// (Language N + the four ability flags). Like Section II, the parser scans for
// every "Language N" column so users can add rows by duplicating the columns.
const LANGUAGE_ROWS = 3;
const DEFAULT_LANGUAGES = ["ENGLISH", "FILIPINO", "MANDARIN"];

const SECTION_LANGUAGE: TemplateSection = {
  label: "III. LANGUAGE / DIALECT PROFICIENCY",
  fillArgb: "FF2980B9",
  requiredArgb: "FF5B9BD5",
  optionalArgb: "FF9DC3E6",
  columns: Array.from({ length: LANGUAGE_ROWS }, (_, i): TemplateColumn[] => [
    { header: `Language ${i + 1}`, width: 16, example: DEFAULT_LANGUAGES[i] ?? "" },
    { header: `Language ${i + 1} - Read`, width: 13, example: i === 0 ? "Yes" : "", options: YES_NO_OPTIONS },
    { header: `Language ${i + 1} - Write`, width: 13, example: i === 0 ? "Yes" : "", options: YES_NO_OPTIONS },
    { header: `Language ${i + 1} - Speak`, width: 13, example: i === 0 ? "Yes" : "", options: YES_NO_OPTIONS },
    { header: `Language ${i + 1} - Understand`, width: 15, example: i === 0 ? "Yes" : "", options: YES_NO_OPTIONS },
  ]).flat(),
};

// Section IV — Educational Background. Three fixed levels (Elementary /
// Secondary / Tertiary) plus repeating Graduate Studies. Only fields the backend
// actually stores are included: the Non-K12/K-12 "type" and "Level Reached" are
// omitted because the backend doesn't persist them (Secondary keeps only its
// Senior High Strand).
const GRADUATE_STUDY_ROWS = 1;

const SECTION_EDUCATION: TemplateSection = {
  label: "IV. EDUCATIONAL BACKGROUND",
  fillArgb: "FFF1C40F",
  requiredArgb: "FFF5D478",
  optionalArgb: "FFFDF1C1",
  columns: [
    { header: "Currently In School?", width: 16, example: "No", options: YES_NO_OPTIONS },
    { header: "Elementary - Graduated?", width: 18, example: "Yes", options: YES_NO_OPTIONS },
    { header: "Elementary - Year Graduated", width: 20, example: "2008" },
    { header: "Elementary - Level Reached", width: 20, example: "" },
    { header: "Elementary - Year Last Attended", width: 22, example: "" },
    { header: "Secondary - Type", width: 14, example: "", options: ["Non-K12", "K-12"] },
    { header: "Secondary - Senior High Strand", width: 22, example: "" },
    { header: "Secondary - Graduated?", width: 18, example: "Yes", options: YES_NO_OPTIONS },
    { header: "Secondary - Year Graduated", width: 20, example: "2012" },
    { header: "Secondary - Level Reached", width: 20, example: "" },
    { header: "Secondary - Year Last Attended", width: 22, example: "" },
    { header: "Tertiary - Course/Degree", width: 28, example: "BS Information Technology" },
    { header: "Tertiary - Graduated?", width: 18, example: "Yes", options: YES_NO_OPTIONS },
    { header: "Tertiary - Year Graduated", width: 20, example: "2016" },
    { header: "Tertiary - Level Reached", width: 20, example: "" },
    { header: "Tertiary - Year Last Attended", width: 22, example: "" },
    ...Array.from({ length: GRADUATE_STUDY_ROWS }, (_, i): TemplateColumn[] => [
      { header: `Graduate Study ${i + 1} - Course`, width: 26, example: "" },
      { header: `Graduate Study ${i + 1} - Graduated?`, width: 22, example: "", options: YES_NO_OPTIONS },
      { header: `Graduate Study ${i + 1} - Year Graduated`, width: 24, example: "" },
      { header: `Graduate Study ${i + 1} - Level Reached`, width: 24, example: "" },
      { header: `Graduate Study ${i + 1} - Year Last Attended`, width: 26, example: "" },
    ]).flat(),
  ],
};

// Section V — Technical/Vocational and Other Training. A repeating table of
// course + hours + institution + skills acquired + certificate. Flattened into
// numbered columns; the parser scans for every "Training N - Course" column.
const TRAINING_ROWS = 1;

const SECTION_TRAINING: TemplateSection = {
  label: "V. TECHNICAL/VOCATIONAL AND OTHER TRAINING",
  fillArgb: "FF2980B9",
  requiredArgb: "FF5B9BD5",
  optionalArgb: "FF9DC3E6",
  columns: Array.from({ length: TRAINING_ROWS }, (_, i): TemplateColumn[] => [
    { header: `Training ${i + 1} - Course`, width: 26, example: i === 0 ? "Bread and Pastry Production NC II" : "" },
    { header: `Training ${i + 1} - Hours`, width: 14, example: i === 0 ? "120" : "" },
    { header: `Training ${i + 1} - Institution`, width: 26, example: i === 0 ? "TESDA Tangub" : "" },
    { header: `Training ${i + 1} - Skills Acquired`, width: 26, example: "" },
    { header: `Training ${i + 1} - Certificate Received`, width: 22, example: i === 0 ? "NC II" : "" },
  ]).flat(),
};

// Section VI — Eligibility / Professional License. Two repeating tables in one
// section: eligibility + date taken, and professional license + valid until.
// Each is flattened into numbered columns and scanned dynamically.
const ELIGIBILITY_ROWS = 3;
const LICENSE_ROWS = 3;

const SECTION_ELIGIBILITY: TemplateSection = {
  label: "VI. ELIGIBILITY / PROFESSIONAL LICENSE",
  fillArgb: "FFF1C40F",
  requiredArgb: "FFF5D478",
  optionalArgb: "FFFDF1C1",
  columns: [
    ...Array.from({ length: ELIGIBILITY_ROWS }, (_, i): TemplateColumn[] => [
      { header: `Eligibility ${i + 1} - Name`, width: 28, example: i === 0 ? "Career Service Professional" : "" },
      { header: `Eligibility ${i + 1} - Date Taken (YYYY-MM-DD)`, width: 28, example: "" },
    ]).flat(),
    ...Array.from({ length: LICENSE_ROWS }, (_, i): TemplateColumn[] => [
      { header: `Professional License ${i + 1} - Name`, width: 28, example: "" },
      { header: `Professional License ${i + 1} - Valid Until (YYYY-MM-DD)`, width: 30, example: "" },
    ]).flat(),
  ],
};

// Section VII — Work Experience. A repeating table of company + city + position
// + months + status. The company city resolves to a dataset ID (optional), and
// status is one of the backend's accepted values.
const WORK_EXPERIENCE_ROWS = 3;

const SECTION_WORKEXP: TemplateSection = {
  label: "VII. WORK EXPERIENCE",
  fillArgb: "FF2980B9",
  requiredArgb: "FF5B9BD5",
  optionalArgb: "FF9DC3E6",
  columns: Array.from({ length: WORK_EXPERIENCE_ROWS }, (_, i): TemplateColumn[] => [
    { header: `Work Experience ${i + 1} - Company Name`, width: 24, example: i === 0 ? "ABC Construction Inc." : "" },
    { header: `Work Experience ${i + 1} - Company City`, width: 28, example: i === 0 ? "Tangub City, Misamis Occidental" : "" },
    { header: `Work Experience ${i + 1} - Position`, width: 20, example: i === 0 ? "Carpenter" : "" },
    { header: `Work Experience ${i + 1} - Months`, width: 14, example: i === 0 ? "24" : "" },
    { header: `Work Experience ${i + 1} - Status`, width: 16, example: i === 0 ? "Contractual" : "", options: WORK_STATUS_OPTIONS },
  ]).flat(),
};

// Section VIII — Other Skills Acquired Without Certificate. In the form this is
// a grid of predefined skill checkboxes plus a free-text "Others" list. The
// backend stores every skill (predefined or custom) as a plain skill row, so the
// template uses a single comma-separated column; the parser splits each token
// and routes it to the predefined list vs. the custom "others" list so the form
// re-displays them correctly. The predefined names match the form's checkboxes.
const PREDEFINED_SKILLS = [
  "AUTO MECHANIC", "BEAUTICIAN", "CARPENTRY WORK", "COMPUTER LITERATE", "DOMESTIC CHORES",
  "DRIVER", "ELECTRICIAN", "EMBROIDERY", "GARDENING", "MASONRY", "PAINTER/ARTIST",
  "PAINTING JOBS", "PHOTOGRAPHY", "PLUMBING", "SEWING DRESSES", "STENOGRAPHY", "TAILORING",
];

const SECTION_OTHERSKILLS: TemplateSection = {
  label: "VIII. OTHER SKILLS ACQUIRED WITHOUT CERTIFICATE",
  fillArgb: "FFF1C40F",
  requiredArgb: "FFF5D478",
  optionalArgb: "FFFDF1C1",
  columns: [
    { header: "Other Skills (comma-separated)", width: 48, example: "CARPENTRY WORK, DRIVER, Welding" },
  ],
};

// Section IX — Referred Program. A single-select program enum plus an "Others"
// free-text. Stored on the EF profile (referred_program + other_referred_program).
const REFERRED_PROGRAM_OPTIONS = ["SPES", "GIP", "DILEEP", "TESDA Training", "TUPAD", "JobStart", "Others"];

const SECTION_REFERRED: TemplateSection = {
  label: "IX. REFERRED PROGRAM",
  fillArgb: "FF2980B9",
  requiredArgb: "FF5B9BD5",
  optionalArgb: "FF9DC3E6",
  columns: [
    { header: "Referred Program", width: 20, example: "", options: REFERRED_PROGRAM_OPTIONS },
    { header: "Referred Program (Other)", width: 24, example: "" },
  ],
};

// All sections, in order. (Sections X+ will be appended here as they're added.)
const TEMPLATE_SECTIONS: TemplateSection[] = [
  SECTION_PERSONAL,
  SECTION_JOBPREF,
  SECTION_LANGUAGE,
  SECTION_EDUCATION,
  SECTION_TRAINING,
  SECTION_ELIGIBILITY,
  SECTION_WORKEXP,
  SECTION_OTHERSKILLS,
  SECTION_REFERRED,
];

// Flat column list (widths / validation / examples / header lookup).
const TEMPLATE_COLUMNS: TemplateColumn[] = TEMPLATE_SECTIONS.flatMap((s) => s.columns);

// Rows (beyond the two header rows) that receive dropdown validation, so users
// have plenty of pre-formatted rows to fill in.
const TEMPLATE_VALIDATION_ROWS = 200;
const FIRST_DATA_ROW = 3; // row 1 = section labels, row 2 = field headers.

export async function downloadImportTemplate(): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Applicants");

  // Format every column as Text ("@") so Excel preserves leading zeros (e.g. the
  // "0" in a contact number) and doesn't auto-convert dates/long numbers. The
  // parser reads every cell as a string anyway, so text format is ideal.
  ws.columns = TEMPLATE_COLUMNS.map((c) => ({ width: c.width, style: { numFmt: "@" } }));

  const border = {
    top: { style: "thin" as const, color: { argb: "FFCBD5E1" } },
    left: { style: "thin" as const, color: { argb: "FFCBD5E1" } },
    bottom: { style: "thin" as const, color: { argb: "FFCBD5E1" } },
    right: { style: "thin" as const, color: { argb: "FFCBD5E1" } },
  };

  // Row 1: section-label band, one merged cell per section.
  let startCol = 1;
  for (const section of TEMPLATE_SECTIONS) {
    const endCol = startCol + section.columns.length - 1;
    for (let c = startCol; c <= endCol; c++) {
      const cell = ws.getCell(1, c);
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: section.fillArgb } };
      cell.font = { bold: true, color: { argb: "FF1A1A1A" }, size: 12 };
      cell.alignment = { vertical: "middle", horizontal: "center" };
      cell.border = border;
    }
    ws.getCell(1, startCol).value = section.label;
    if (endCol > startCol) ws.mergeCells(1, startCol, 1, endCol);
    startCol = endCol + 1;
  }
  ws.getRow(1).height = 26;

  // Row 2: field headers colored per section (blue shades / yellow shades), black text
  let colIdx2 = 0;
  for (const section of TEMPLATE_SECTIONS) {
    for (const col of section.columns) {
      const cell = ws.getCell(2, colIdx2 + 1);
      cell.value = col.required ? `${col.header} *` : col.header;
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: col.required ? section.requiredArgb : section.optionalArgb } };
      cell.font = { bold: true, color: { argb: "FF1A1A1A" }, size: 11 };
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
      cell.border = border;
      colIdx2++;
    }
  }
  ws.getRow(2).height = 32;

  // Row 3: one greyed, italic example row.
  const exampleRow = ws.addRow(TEMPLATE_COLUMNS.map((c) => c.example));
  exampleRow.eachCell((cell) => {
    cell.font = { italic: true, color: { argb: "FF94A3B8" } };
  });

  // Freeze both header rows, then apply dropdown validation to the enum columns.
  ws.views = [{ state: "frozen", ySplit: 2 }];
  const lastRow = FIRST_DATA_ROW + TEMPLATE_VALIDATION_ROWS - 1;
  TEMPLATE_COLUMNS.forEach((col, idx) => {
    if (!col.options) return;
    const letter = ws.getColumn(idx + 1).letter;
    const formulae = [`"${col.options.join(",")}"`];
    for (let r = FIRST_DATA_ROW; r <= lastRow; r++) {
      ws.getCell(`${letter}${r}`).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae,
        showErrorMessage: true,
        errorStyle: "error",
        errorTitle: "Invalid value",
        error: `Please choose one of: ${col.options.join(", ")}`,
      };
    }
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "applicants_import_template.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Parsing helpers ─────────────────────────────────────────────────────────

// Normalize a header or cell value for comparison: trim, collapse whitespace,
// strip the "*" required marker, lowercase.
function norm(v: unknown): string {
  return String(v ?? "").replace(/\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

function yesNo(v: string): "Yes" | "No" {
  const n = norm(v);
  return n === "yes" || n === "true" || n === "1" || n === "y" ? "Yes" : "No";
}

// Like yesNo, but a blank cell stays blank. Used for education "Graduated?"
// flags: the backend treats a non-empty `graduated` as "this level has data" and
// saves it, so leaving it blank avoids creating spurious empty education rows.
function yesNoOrBlank(v: string): "Yes" | "No" | "" {
  return v.trim() ? yesNo(v) : "";
}

// Return the canonical option matching `value` (case-insensitively), or "".
function pickEnum(value: string, options: string[]): string {
  const n = norm(value);
  return options.find((o) => norm(o) === n) ?? "";
}

// Coerce a cell into a YYYY-MM-DD string, or null if it isn't a parseable date.
function toIsoDate(v: string): string | null {
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// A single parsed row, keyed by normalized header.
type Row = Record<string, string>;

function get(row: Row, header: string): string {
  return (row[norm(header)] ?? "").trim();
}

// ─── Address resolution (cascade -> dataset IDs) ─────────────────────────────

type ResolveCaches = {
  province: Map<string, LocationOption | null>;
  city: Map<string, LocationOption | null>;
  barangay: Map<string, LocationOption | null>;
  workCity: Map<string, LocationOption | null>;
};

function makeCaches(): ResolveCaches {
  return { province: new Map(), city: new Map(), barangay: new Map(), workCity: new Map() };
}

// Resolve a work-experience company city via the flat all-cities search (names
// come back as "City, Province"). Tolerant: matches the full "City, Province"
// string, or — when unambiguous — just the city part. Returns null when not
// found or ambiguous; the company city is optional, so callers don't fail.
async function resolveWorkCity(name: string, caches: ResolveCaches): Promise<LocationOption | null> {
  const key = norm(name);
  if (caches.workCity.has(key)) return caches.workCity.get(key)!;
  const options = await searchAllCities(name);
  let match = options.find((o) => norm(o.name) === key) ?? null;
  if (!match) {
    const byCity = options.filter((o) => norm(o.name.split(",")[0]) === key);
    if (byCity.length === 1) match = byCity[0];
  }
  caches.workCity.set(key, match);
  return match;
}

function exactMatch(options: LocationOption[], name: string): LocationOption | null {
  const target = norm(name);
  return options.find((o) => norm(o.name) === target) ?? null;
}

async function resolveProvince(name: string, caches: ResolveCaches): Promise<LocationOption | null> {
  const key = norm(name);
  if (caches.province.has(key)) return caches.province.get(key)!;
  const match = exactMatch(await searchProvinces(name), name);
  caches.province.set(key, match);
  return match;
}

async function resolveCity(provinceId: number, name: string, caches: ResolveCaches): Promise<LocationOption | null> {
  const key = `${provinceId}::${norm(name)}`;
  if (caches.city.has(key)) return caches.city.get(key)!;
  const match = exactMatch(await searchCities(provinceId, name), name);
  caches.city.set(key, match);
  return match;
}

async function resolveBarangay(cityId: number, name: string, caches: ResolveCaches): Promise<LocationOption | null> {
  const key = `${cityId}::${norm(name)}`;
  if (caches.barangay.has(key)) return caches.barangay.get(key)!;
  const match = exactMatch(await searchBarangaysByCity(cityId, name), name);
  caches.barangay.set(key, match);
  return match;
}

type ResolvedAddress = { province: LocationOption; city: LocationOption; barangay: LocationOption };

async function resolveAddress(
  provinceName: string,
  cityName: string,
  barangayName: string,
  caches: ResolveCaches,
): Promise<ResolvedAddress> {
  if (!provinceName) throw new Error("Province is required.");
  if (!cityName) throw new Error("Municipality/City is required.");
  if (!barangayName) throw new Error("Barangay is required.");

  const province = await resolveProvince(provinceName, caches);
  if (!province) throw new Error(`Province "${provinceName}" was not found in the location dataset.`);

  const city = await resolveCity(province.id, cityName, caches);
  if (!city) throw new Error(`City/Municipality "${cityName}" was not found in ${province.name}.`);

  const barangay = await resolveBarangay(city.id, barangayName, caches);
  if (!barangay) throw new Error(`Barangay "${barangayName}" was not found in ${city.name}.`);

  return { province, city, barangay };
}

// ─── Row -> ApplicantFormData ────────────────────────────────────────────────

async function rowToFormData(row: Row, caches: ResolveCaches): Promise<ApplicantFormData> {
  const surname = get(row, "Surname");
  const firstName = get(row, "First Name");
  if (!surname) throw new Error("Surname is required.");
  if (!firstName) throw new Error("First Name is required.");

  const dobRaw = get(row, "Date of Birth (YYYY-MM-DD)");
  if (!dobRaw) throw new Error("Date of Birth is required.");
  const dateOfBirth = toIsoDate(dobRaw);
  if (!dateOfBirth) throw new Error(`Date of Birth "${dobRaw}" is not a valid date (use YYYY-MM-DD).`);

  const sex = get(row, "Sex");
  if (!SEX_OPTIONS.includes(sex)) throw new Error(`Sex must be one of: ${SEX_OPTIONS.join(", ")}.`);

  const civilStatus = get(row, "Civil Status");
  if (!CIVIL_STATUS_OPTIONS.includes(civilStatus)) {
    throw new Error(`Civil Status must be one of: ${CIVIL_STATUS_OPTIONS.join(", ")}.`);
  }

  const contactNumber = get(row, "Contact Number");
  if (!contactNumber) throw new Error("Contact Number is required.");

  const addr = await resolveAddress(
    get(row, "Province"),
    get(row, "Municipality/City"),
    get(row, "Barangay"),
    caches,
  );

  const fd = createDefaultApplicantFormData();

  // Names + identity.
  fd.surname = surname;
  fd.firstName = firstName;
  fd.middleName = get(row, "Middle Name");
  fd.suffix = get(row, "Suffix");
  fd.dateOfBirth = dateOfBirth;
  fd.sex = sex;
  fd.religion = get(row, "Religion");
  fd.civilStatus = civilStatus;
  fd.height = get(row, "Height (cm)");
  fd.tin = get(row, "TIN");
  fd.contactNumber = contactNumber;
  fd.email = get(row, "Email");

  // Address.
  fd.houseNo = get(row, "House No./Street");
  fd.province = addr.province.name;
  fd.provinceId = addr.province.id;
  fd.municipality = addr.city.name;
  fd.cityId = addr.city.id;
  fd.barangay = addr.barangay.name;
  fd.barangayId = addr.barangay.id;

  // Disability: a Yes/No flag plus a comma-separated type list (+ Other detail).
  if (norm(get(row, "Has Disability?")) === "yes") {
    const types = get(row, "Disability Types")
      .split(",")
      .map((t) => pickEnum(t, DISABILITY_TYPES))
      .filter(Boolean);
    fd.hasDisability = types;
    if (types.includes("Other")) fd.disabilityOther = get(row, "Disability (Other) Detail");
  }

  // Employment status / type (the backend re-validates these enums).
  fd.employmentStatus = pickEnum(get(row, "Employment Status"), EMPLOYMENT_STATUS_OPTIONS);
  fd.employmentType = pickEnum(get(row, "Employment Type"), EMPLOYMENT_TYPE_OPTIONS);
  fd.selfEmploymentType = pickEnum(get(row, "Self-Employment Type"), SELF_EMPLOYMENT_OPTIONS);
  fd.selfEmploymentOther = get(row, "Self-Employment (Other)");
  fd.monthsLookingForWork = get(row, "Months Looking For Work");
  fd.unemploymentReason = pickEnum(get(row, "Unemployment Reason"), UNEMPLOYMENT_REASON_OPTIONS);
  fd.unemploymentReasonOther = get(row, "Unemployment Reason (Other)");

  // OFW (two independent Yes/No questions, each with a country).
  fd.isOFW = yesNo(get(row, "An OFW?"));
  fd.ofwCountry = get(row, "OFW Country");
  fd.isFormerOFW = yesNo(get(row, "A Former OFW?"));
  fd.formerOFWCountry = get(row, "Former OFW Country");
  const returnDate = get(row, "Former OFW Return Date (YYYY-MM-DD)");
  if (returnDate) fd.formerOFWReturnDate = toIsoDate(returnDate) ?? returnDate;

  // 4Ps.
  fd.is4PsBeneficiary = yesNo(get(row, "A 4Ps Beneficiary?"));
  fd.householdIdNo = get(row, "Household ID No.");

  // ── Section II — Job Preference ──
  // Employment-type preference is a single shared value (comma list of
  // Part-time / Full-time) applied to all preference rows by the backend.
  fd.jobPrefEmploymentType = get(row, "Employment Type Preference")
    .split(",")
    .map((t) => pickEnum(t, JOB_PREF_TYPE_OPTIONS))
    .filter(Boolean);

  // Occupation/location triples -> jobPreferences. The template ships with 3
  // numbered triples, but we scan for *every* "Preferred Occupation N" column
  // so a user can add more rows by duplicating the columns (Preferred
  // Occupation 4 / Local City 4 / Overseas Country 4, …) — any N works. The
  // backend only stores rows that have an occupation, so we keep those.
  const prefIndices = new Set<number>();
  for (const key of Object.keys(row)) {
    const m = key.match(/^preferred occupation (\d+)$/); // keys are already normalized
    if (m) prefIndices.add(Number(m[1]));
  }
  const prefs: ApplicantFormData["jobPreferences"] = [];
  for (const i of [...prefIndices].sort((a, b) => a - b)) {
    const occupation = get(row, `Preferred Occupation ${i}`);
    if (!occupation) continue;
    prefs.push({
      occupation,
      localCity: get(row, `Preferred Local City ${i}`),
      overseasCountry: get(row, `Preferred Overseas Country ${i}`),
    });
  }
  fd.jobPreferences = prefs;

  // ── Section III — Language / Dialect Proficiency ──
  // Scan for every "Language N" column (so added rows work), keep ones that
  // name a language. The backend stores only languages with ≥1 ability ticked.
  const langIndices = new Set<number>();
  for (const key of Object.keys(row)) {
    const m = key.match(/^language (\d+)$/); // bare language-name column (not "… - Read")
    if (m) langIndices.add(Number(m[1]));
  }
  const languages: ApplicantFormData["languages"] = [];
  for (const i of [...langIndices].sort((a, b) => a - b)) {
    const language = get(row, `Language ${i}`);
    if (!language) continue;
    languages.push({
      language,
      read: yesNo(get(row, `Language ${i} - Read`)) === "Yes",
      write: yesNo(get(row, `Language ${i} - Write`)) === "Yes",
      speak: yesNo(get(row, `Language ${i} - Speak`)) === "Yes",
      understand: yesNo(get(row, `Language ${i} - Understand`)) === "Yes",
    });
  }
  fd.languages = languages;

  // ── Section IV — Educational Background ──
  fd.currentlyInSchool = yesNo(get(row, "Currently In School?"));

  fd.elementary = {
    ...fd.elementary,
    graduated: yesNoOrBlank(get(row, "Elementary - Graduated?")),
    yearGraduated: get(row, "Elementary - Year Graduated"),
    levelReached: get(row, "Elementary - Level Reached"),
    yearLastAttended: get(row, "Elementary - Year Last Attended"),
  };
  fd.secondary = {
    ...fd.secondary,
    type: pickEnum(get(row, "Secondary - Type"), ["Non-K12", "K-12"]),
    seniorHighStrand: get(row, "Secondary - Senior High Strand"),
    graduated: yesNoOrBlank(get(row, "Secondary - Graduated?")),
    yearGraduated: get(row, "Secondary - Year Graduated"),
    levelReached: get(row, "Secondary - Level Reached"),
    yearLastAttended: get(row, "Secondary - Year Last Attended"),
  };
  fd.tertiary = {
    ...fd.tertiary,
    course: get(row, "Tertiary - Course/Degree"),
    graduated: yesNoOrBlank(get(row, "Tertiary - Graduated?")),
    yearGraduated: get(row, "Tertiary - Year Graduated"),
    levelReached: get(row, "Tertiary - Level Reached"),
    yearLastAttended: get(row, "Tertiary - Year Last Attended"),
  };

  // Graduate studies — scan for every "Graduate Study N - Course" column.
  const gradIndices = new Set<number>();
  for (const key of Object.keys(row)) {
    const m = key.match(/^graduate study (\d+) - course$/);
    if (m) gradIndices.add(Number(m[1]));
  }
  const graduateStudies: ApplicantFormData["graduateStudies"] = [];
  for (const i of [...gradIndices].sort((a, b) => a - b)) {
    const course = get(row, `Graduate Study ${i} - Course`);
    const graduated = yesNoOrBlank(get(row, `Graduate Study ${i} - Graduated?`));
    const yearGraduated = get(row, `Graduate Study ${i} - Year Graduated`);
    const levelReached = get(row, `Graduate Study ${i} - Level Reached`);
    const yearLastAttended = get(row, `Graduate Study ${i} - Year Last Attended`);
    if (!course && !graduated && !yearGraduated && !levelReached && !yearLastAttended) continue;
    graduateStudies.push({
      schoolName: "", schoolCity: "", schoolProvince: "",
      course, graduated, yearGraduated, levelReached, yearLastAttended,
    });
  }
  fd.graduateStudies = graduateStudies;

  // ── Section V — Technical/Vocational and Other Training ──
  // Scan for every "Training N - Course" column. The backend stores a training
  // row only when it has a course, so we keep those.
  const trainingIndices = new Set<number>();
  for (const key of Object.keys(row)) {
    const m = key.match(/^training (\d+) - course$/);
    if (m) trainingIndices.add(Number(m[1]));
  }
  const trainings: ApplicantFormData["trainings"] = [];
  for (const i of [...trainingIndices].sort((a, b) => a - b)) {
    const course = get(row, `Training ${i} - Course`);
    if (!course) continue;
    trainings.push({
      course,
      hoursOfTraining: get(row, `Training ${i} - Hours`),
      institution: get(row, `Training ${i} - Institution`),
      skillsAcquired: get(row, `Training ${i} - Skills Acquired`),
      certificateReceived: get(row, `Training ${i} - Certificate Received`),
    });
  }
  fd.trainings = trainings;

  // ── Section VI — Eligibility / Professional License ──
  const eligIndices = new Set<number>();
  const licIndices = new Set<number>();
  for (const key of Object.keys(row)) {
    const e = key.match(/^eligibility (\d+) - name$/);
    if (e) eligIndices.add(Number(e[1]));
    const l = key.match(/^professional license (\d+) - name$/);
    if (l) licIndices.add(Number(l[1]));
  }

  const eligibilities: ApplicantFormData["eligibilities"] = [];
  for (const i of [...eligIndices].sort((a, b) => a - b)) {
    const eligibility = get(row, `Eligibility ${i} - Name`);
    if (!eligibility) continue;
    const dateTaken = get(row, `Eligibility ${i} - Date Taken (YYYY-MM-DD)`);
    eligibilities.push({ eligibility, dateTaken: dateTaken ? (toIsoDate(dateTaken) ?? dateTaken) : "" });
  }
  fd.eligibilities = eligibilities;

  const professionalLicenses: ApplicantFormData["professionalLicenses"] = [];
  for (const i of [...licIndices].sort((a, b) => a - b)) {
    const license = get(row, `Professional License ${i} - Name`);
    if (!license) continue;
    const validUntil = get(row, `Professional License ${i} - Valid Until (YYYY-MM-DD)`);
    professionalLicenses.push({ license, validUntil: validUntil ? (toIsoDate(validUntil) ?? validUntil) : "" });
  }
  fd.professionalLicenses = professionalLicenses;

  // ── Section VII — Work Experience ──
  // Scan for every "Work Experience N - Company Name" column. The backend stores
  // a row when it has a company name OR a position; the company city resolves to
  // a dataset ID (optional — an unresolved city just leaves the ID null).
  const weIndices = new Set<number>();
  for (const key of Object.keys(row)) {
    const m = key.match(/^work experience (\d+) - company name$/);
    if (m) weIndices.add(Number(m[1]));
  }
  const workExperiences: ApplicantFormData["workExperiences"] = [];
  for (const i of [...weIndices].sort((a, b) => a - b)) {
    const companyName = get(row, `Work Experience ${i} - Company Name`);
    const position = get(row, `Work Experience ${i} - Position`);
    if (!companyName && !position) continue;
    const cityName = get(row, `Work Experience ${i} - Company City`);
    const cityMatch = cityName ? await resolveWorkCity(cityName, caches) : null;
    workExperiences.push({
      companyName,
      companyCity: cityMatch ? cityMatch.name : cityName,
      companyCityId: cityMatch ? cityMatch.id : null,
      position,
      numberOfMonths: get(row, `Work Experience ${i} - Months`),
      status: pickEnum(get(row, `Work Experience ${i} - Status`), WORK_STATUS_OPTIONS),
    });
  }
  fd.workExperiences = workExperiences;

  // ── Section VIII — Other Skills Acquired Without Certificate ──
  // Split the comma list; route each token to a predefined skill (canonical
  // name) or the custom "others" list. The backend stores both as skill rows.
  const skillTokens = get(row, "Other Skills (comma-separated)")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const predefinedSkills: string[] = [];
  const customSkills: string[] = [];
  for (const token of skillTokens) {
    const match = PREDEFINED_SKILLS.find((p) => norm(p) === norm(token));
    if (match) predefinedSkills.push(match);
    else customSkills.push(token);
  }
  fd.otherSkills = predefinedSkills;
  fd.otherSkillsSpecify = customSkills.length ? customSkills : [""];

  // ── Section IX — Referred Program ──
  fd.referredProgram = pickEnum(get(row, "Referred Program"), REFERRED_PROGRAM_OPTIONS);
  fd.referredProgramOther = get(row, "Referred Program (Other)");

  return fd;
}

// ─── Public import entry point ───────────────────────────────────────────────

export type ImportRowError = { row: number; name: string; error: string };
export type ImportResult = { total: number; succeeded: number; failed: ImportRowError[] };

// Example-row values we skip so the sample doesn't get imported.
const EXAMPLE_SURNAME = "dela cruz";
const EXAMPLE_FIRST = "juan";

function isEmptyRow(row: Row): boolean {
  return Object.values(row).every((v) => String(v ?? "").trim() === "");
}

function isExampleRow(row: Row): boolean {
  return norm(get(row, "Surname")) === EXAMPLE_SURNAME && norm(get(row, "First Name")) === EXAMPLE_FIRST;
}

export async function importApplicants(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<ImportResult> {
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error("The file has no worksheets.");

  // range:1 -> treat the SECOND row (the field headers) as the header row, so
  // the merged section-label band in row 1 is ignored. raw:false -> formatted
  // strings (preserves leading zeros, formats dates).
  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
    range: 1,
  });

  // Re-key every row by normalized header and remember its spreadsheet row
  // number for error reporting (data starts at FIRST_DATA_ROW).
  const rows = rawRows.map((r, i) => {
    const data: Row = {};
    for (const [k, v] of Object.entries(r)) data[norm(k)] = String(v ?? "");
    return { sheetRow: i + FIRST_DATA_ROW, data };
  });

  const dataRows = rows.filter(({ data }) => !isEmptyRow(data) && !isExampleRow(data));
  const total = dataRows.length;
  const failed: ImportRowError[] = [];
  let succeeded = 0;
  const caches = makeCaches();

  for (let i = 0; i < dataRows.length; i++) {
    const { sheetRow, data } = dataRows[i];
    const name = [get(data, "First Name"), get(data, "Surname")].filter(Boolean).join(" ") || "(unnamed)";
    try {
      const fd = await rowToFormData(data, caches);
      await createApplicant(fd);
      succeeded++;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : typeof err === "string" ? err : "Unexpected error.";
      failed.push({ row: sheetRow, name, error: message });
    }
    onProgress?.(i + 1, total);
  }

  return { total, succeeded, failed };
}
