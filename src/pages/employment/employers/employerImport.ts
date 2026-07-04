// Bulk employer import for Employment Facilitation.
//
// Two responsibilities:
//   1. Generate a styled .xlsx template (ExcelJS) grouped into four sections
//      (Company Information / Contact Person / Company Address / Registration).
//      Enum fields get in-cell dropdowns.
//   2. Parse a filled-in workbook, resolve Province→City→Barangay to dataset IDs
//      via locationService (with per-import caching), build a valid employer
//      payload per row, and POST it through createEmployer.

import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import {
  searchProvinces,
  searchCities,
  searchBarangaysByCity,
  type LocationOption,
} from "../../../services/locationService";
import { createEmployer } from "../../../services/employerService";

// ─── Shared result type ───────────────────────────────────────────────────────

export type ImportResult = {
  total: number;
  succeeded: number;
  failed: Array<{ row: number; name: string; error: string }>;
};

// ─── Enum option lists (must match the Add Employer form / backend enums) ─────

const INDUSTRY_OPTIONS = [
  "Manufacturing", "Information Technology", "Agriculture", "Retail",
  "Healthcare", "Education", "Construction", "Hospitality",
  "Transportation", "Financial Services", "Other",
];
const COMPANY_SIZE_OPTIONS = [
  "Small (1-50 employees)", "Medium (51-200 employees)", "Large (201+ employees)",
];
const BUSINESS_TYPE_OPTIONS = [
  "Corporation", "Partnership", "Sole Proprietorship", "Cooperative",
];
const STATUS_OPTIONS = ["Active", "Inactive"];

// ─── Template definition ──────────────────────────────────────────────────────

type Column = {
  header: string;
  width: number;
  example: string;
  required?: boolean;
  options?: string[];
};

type Section = {
  label: string;
  fillArgb: string;
  requiredArgb: string;
  optionalArgb: string;
  columns: Column[];
};

const SECTIONS: Section[] = [
  {
    label: "I. COMPANY INFORMATION",
    fillArgb: "FF2980B9",
    requiredArgb: "FF5B9BD5",
    optionalArgb: "FF9DC3E6",
    columns: [
      { header: "Company Name",        width: 28, example: "ABC Corporation",   required: true },
      { header: "Industry",            width: 22, example: "Manufacturing",     options: INDUSTRY_OPTIONS },
      { header: "Industry (if Other)", width: 20, example: "" },
      { header: "Company Size",        width: 26, example: "Small (1-50 employees)", options: COMPANY_SIZE_OPTIONS },
      { header: "Business Type",       width: 22, example: "Corporation",       options: BUSINESS_TYPE_OPTIONS },
      { header: "Years in Operation",  width: 18, example: "5" },
      { header: "TIN Number",          width: 18, example: "123-456-789-000",   required: true },
    ],
  },
  {
    label: "II. CONTACT PERSON",
    fillArgb: "FFF1C40F",
    requiredArgb: "FFF5D478",
    optionalArgb: "FFFDF1C1",
    columns: [
      { header: "Contact Person Name", width: 24, example: "Maria Santos",    required: true },
      { header: "Position",            width: 18, example: "HR Manager" },
      { header: "Contact Number",      width: 16, example: "09123456789",     required: true },
      { header: "Email",               width: 26, example: "hr@company.com" },
    ],
  },
  {
    label: "III. COMPANY ADDRESS",
    fillArgb: "FF2980B9",
    requiredArgb: "FF5B9BD5",
    optionalArgb: "FF9DC3E6",
    columns: [
      { header: "Building No.", width: 14, example: "123" },
      { header: "Street",      width: 22, example: "Rizal St.",          required: true },
      { header: "Province",    width: 24, example: "Misamis Occidental", required: true },
      { header: "City/Municipality", width: 22, example: "Tangub City", required: true },
      { header: "Barangay",    width: 20, example: "Santo Niño",         required: true },
      { header: "Region",      width: 16, example: "Region X" },
    ],
  },
  {
    label: "IV. REGISTRATION DETAILS",
    fillArgb: "FFF1C40F",
    requiredArgb: "FFF5D478",
    optionalArgb: "FFFDF1C1",
    columns: [
      { header: "Status",                         width: 12, example: "Active",     options: STATUS_OPTIONS },
      { header: "Date Registered (YYYY-MM-DD)",   width: 26, example: "2024-01-15" },
      { header: "Remarks",                        width: 30, example: "" },
    ],
  },
];

const ALL_COLUMNS: Column[] = SECTIONS.flatMap((s) => s.columns);
const FIRST_DATA_ROW = 3; // row 1 = section labels, row 2 = field headers
const VALIDATION_ROWS = 200;

// ─── Template generation ──────────────────────────────────────────────────────

export async function downloadImportTemplate(): Promise<void> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Employers");

  ws.columns = ALL_COLUMNS.map((c) => ({ width: c.width, style: { numFmt: "@" } }));

  const border = {
    top:    { style: "thin" as const, color: { argb: "FFCBD5E1" } },
    left:   { style: "thin" as const, color: { argb: "FFCBD5E1" } },
    bottom: { style: "thin" as const, color: { argb: "FFCBD5E1" } },
    right:  { style: "thin" as const, color: { argb: "FFCBD5E1" } },
  };

  // Row 1 — section label band
  let startCol = 1;
  for (const section of SECTIONS) {
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

  // Row 2 — field headers colored per section (blue shades / yellow shades), black text
  let colIdx2 = 0;
  for (const section of SECTIONS) {
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

  // Row 3 — example row (greyed italic)
  const exampleRow = ws.addRow(ALL_COLUMNS.map((c) => c.example));
  exampleRow.eachCell((cell) => {
    cell.font = { italic: true, color: { argb: "FF94A3B8" } };
  });

  // Freeze header rows
  ws.views = [{ state: "frozen", ySplit: 2 }];

  // Dropdown validations
  const lastRow = FIRST_DATA_ROW + VALIDATION_ROWS - 1;
  ALL_COLUMNS.forEach((col, idx) => {
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
  link.download = "employers_import_template.xlsx";
  link.click();
  URL.revokeObjectURL(url);
}

// ─── Parsing helpers ──────────────────────────────────────────────────────────

function norm(v: unknown): string {
  return String(v ?? "").replace(/\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

type Row = Record<string, string>;

function get(row: Row, header: string): string {
  return (row[norm(header)] ?? "").trim();
}

function toIsoDate(v: string): string | null {
  const s = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, "0");
  const dd   = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// ─── Address resolution with per-import caching ───────────────────────────────

type Caches = {
  province: Map<string, LocationOption | null>;
  city:     Map<string, LocationOption | null>;
  barangay: Map<string, LocationOption | null>;
};

function makeCaches(): Caches {
  return { province: new Map(), city: new Map(), barangay: new Map() };
}

function exactMatch(opts: LocationOption[], name: string): LocationOption | null {
  const target = norm(name);
  return opts.find((o) => norm(o.name) === target) ?? null;
}

async function resolveProvince(name: string, caches: Caches): Promise<LocationOption | null> {
  const key = norm(name);
  if (caches.province.has(key)) return caches.province.get(key)!;
  const match = exactMatch(await searchProvinces(name), name);
  caches.province.set(key, match);
  return match;
}

async function resolveCity(provinceId: number, name: string, caches: Caches): Promise<LocationOption | null> {
  const key = `${provinceId}::${norm(name)}`;
  if (caches.city.has(key)) return caches.city.get(key)!;
  const match = exactMatch(await searchCities(provinceId, name), name);
  caches.city.set(key, match);
  return match;
}

async function resolveBarangay(cityId: number, name: string, caches: Caches): Promise<LocationOption | null> {
  const key = `${cityId}::${norm(name)}`;
  if (caches.barangay.has(key)) return caches.barangay.get(key)!;
  const match = exactMatch(await searchBarangaysByCity(cityId, name), name);
  caches.barangay.set(key, match);
  return match;
}

// ─── Main import function ─────────────────────────────────────────────────────

export async function importEmployers(
  file: File,
  onProgress?: (done: number, total: number) => void,
): Promise<ImportResult> {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });

  // Find the header row: the row containing "Company Name" (with or without "*")
  let headerRowIdx = -1;
  for (let i = 0; i < Math.min(rawRows.length, 5); i++) {
    const row = rawRows[i] as unknown[];
    if (row.some((c) => norm(c as string).replace(/\*/g, "").trim() === "company name")) {
      headerRowIdx = i;
      break;
    }
  }
  if (headerRowIdx === -1) headerRowIdx = 1; // fallback: assume row 2

  const headerRow = (rawRows[headerRowIdx] as unknown[]).map((h) => norm(h as string));

  function parseRow(raw: unknown[]): Row {
    const out: Row = {};
    headerRow.forEach((h, i) => { out[h] = String(raw[i] ?? "").trim(); });
    return out;
  }

  // Data starts after the header row + 1 example row
  const dataRows = rawRows.slice(headerRowIdx + 2);
  const nonEmpty = dataRows.filter((r) => (r as unknown[]).some((c) => String(c ?? "").trim()));
  const total = nonEmpty.length;

  let succeeded = 0;
  const failed: ImportResult["failed"] = [];
  const caches = makeCaches();

  for (let i = 0; i < dataRows.length; i++) {
    const raw = dataRows[i] as unknown[];
    if (!raw.some((c) => String(c ?? "").trim())) continue;

    const rowNum = headerRowIdx + 3 + i; // 1-based spreadsheet row
    const row = parseRow(raw);

    const companyName = get(row, "Company Name");
    if (!companyName) {
      failed.push({ row: rowNum, name: "(unknown)", error: "Company Name is required." });
      onProgress?.(succeeded + failed.length, total);
      continue;
    }

    // Validate other required fields
    const tinNumber         = get(row, "TIN Number");
    const contactPersonName = get(row, "Contact Person Name");
    const contactNumber     = get(row, "Contact Number");
    const street            = get(row, "Street");
    const provinceName      = get(row, "Province");
    const cityName          = get(row, "City/Municipality");
    const barangayName      = get(row, "Barangay");

    const missing = [
      !tinNumber         && "TIN Number",
      !contactPersonName && "Contact Person Name",
      !contactNumber     && "Contact Number",
      !street            && "Street",
      !provinceName      && "Province",
      !cityName          && "City/Municipality",
      !barangayName      && "Barangay",
    ].filter(Boolean) as string[];

    if (missing.length) {
      failed.push({ row: rowNum, name: companyName, error: `Missing required fields: ${missing.join(", ")}.` });
      onProgress?.(succeeded + failed.length, total);
      continue;
    }

    // Resolve address IDs
    let provinceId: number | null = null;
    let cityId:     number | null = null;
    let barangayId: number | null = null;

    try {
      const province = await resolveProvince(provinceName, caches);
      if (!province) throw new Error(`Province "${provinceName}" was not found in the location dataset.`);
      provinceId = province.id;

      const city = await resolveCity(provinceId, cityName, caches);
      if (!city) throw new Error(`City/Municipality "${cityName}" was not found in ${province.name}.`);
      cityId = city.id;

      const barangay = await resolveBarangay(cityId, barangayName, caches);
      if (!barangay) throw new Error(`Barangay "${barangayName}" was not found in ${city.name}.`);
      barangayId = barangay.id;
    } catch (err) {
      failed.push({ row: rowNum, name: companyName, error: err instanceof Error ? err.message : "Address lookup failed." });
      onProgress?.(succeeded + failed.length, total);
      continue;
    }

    // Date registered — default to today if blank or invalid
    const dateRaw = get(row, "Date Registered (YYYY-MM-DD)");
    const dateRegistered = (dateRaw && toIsoDate(dateRaw)) ?? new Date().toISOString().split("T")[0];

    // Status — default Active if blank
    const statusRaw = get(row, "Status");
    const status = (STATUS_OPTIONS.includes(statusRaw) ? statusRaw : "Active") as "Active" | "Inactive";

    try {
      await createEmployer({
        companyName,
        industry:         get(row, "Industry"),
        industryOther:    get(row, "Industry (if Other)"),
        companySize:      get(row, "Company Size"),
        businessType:     get(row, "Business Type"),
        yearsInOperation: get(row, "Years in Operation"),
        tinNumber,
        contactPersonName,
        position:         get(row, "Position"),
        contactNumber,
        email:            get(row, "Email"),
        buildingNo:       get(row, "Building No."),
        street,
        barangay:   barangayName,
        barangayId,
        city:       cityName,
        cityId,
        province:   provinceName,
        provinceId,
        region:     get(row, "Region"),
        jobOpenings: [],
        status,
        dateRegistered,
        remarks: get(row, "Remarks"),
      });
      succeeded++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save employer.";
      failed.push({ row: rowNum, name: companyName, error: msg });
    }

    onProgress?.(succeeded + failed.length, total);
  }

  return { total, succeeded, failed };
}
