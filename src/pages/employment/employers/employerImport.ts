// Bulk employer import: generates the .xlsx template (four sections, ExcelJS)
// and parses a filled-in workbook into employer payloads via createEmployer.

import ExcelJS from "exceljs";
import * as XLSX from "xlsx";
import {
  searchProvinces,
  searchCities,
  searchBarangaysByCity,
  type LocationOption,
} from "../../../services/locationService";
import { importEmployersBulk } from "../../../services/employerService";
import type { Employer } from "../../../contexts/EmploymentContext";
import { isValidContactNumber, CONTACT_NUMBER_MESSAGE } from '../../../utils/contactNumber';

// ─── Shared result type ───────────────────────────────────────────────────────

export type ImportResult = {
  total: number;
  succeeded: number;
  failed: Array<{ row: number; name: string; error: string }>;
};

// ─── Enum option lists (must match the Add Employer form / backend enums) ─────

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
      { header: "Industry",            width: 22, example: "Manufacturing" },  // dropdown options are filled in when the template is built
      { header: "Industry (if Other)", width: 20, example: "" },
      { header: "Business Type",       width: 22, example: "Corporation",       options: BUSINESS_TYPE_OPTIONS },
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
      { header: "Date Registered (MM/DD/YYYY)",   width: 26, example: "01/15/2024" },
      { header: "Remarks",                        width: 30, example: "" },
    ],
  },
];

const ALL_COLUMNS: Column[] = SECTIONS.flatMap((s) => s.columns);
const FIRST_DATA_ROW = 3; // row 1 = section labels, row 2 = field headers
const VALIDATION_ROWS = 200;

// ─── Template generation ──────────────────────────────────────────────────────

// standardIndustries: the backend's industry list, offered plus "Other".
// Custom industries aren't listed since Excel's dropdown is capped at ~255 characters.
export async function downloadImportTemplate(standardIndustries: string[]): Promise<void> {
  const sections: Section[] = SECTIONS.map((section) => ({
    ...section,
    columns: section.columns.map((c) =>
      c.header === "Industry" ? { ...c, options: [...standardIndustries, "Other"] } : c),
  }));
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Employers");

  ws.columns = ALL_COLUMNS.map((c) => ({ width: c.width, style: { numFmt: "@" } }));

  const border = {
    top:    { style: "thin" as const, color: { argb: "FFCBD5E1" } },
    left:   { style: "thin" as const, color: { argb: "FFCBD5E1" } },
    bottom: { style: "thin" as const, color: { argb: "FFCBD5E1" } },
    right:  { style: "thin" as const, color: { argb: "FFCBD5E1" } },
  };

  // Row 1: section label band
  let startCol = 1;
  for (const section of sections) {
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

  // Row 2: field headers colored per section, black text
  let colIdx2 = 0;
  for (const section of sections) {
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

  // Row 3: example row, greyed italic
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

// Normalizes a header or cell value for comparison.
function norm(v: unknown): string {
  return String(v ?? "").replace(/\*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

type Row = Record<string, string>;

// Reads one column's value from a parsed row.
function get(row: Row, header: string): string {
  return (row[norm(header)] ?? "").trim();
}

// Parses a date string into ISO (YYYY-MM-DD) format.
function toIsoDate(v: string): string | null {
  const s = v.trim();
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, mm, dd, yyyy] = mdy;
    const d = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
    if (d.getFullYear() === Number(yyyy) && d.getMonth() === Number(mm) - 1 && d.getDate() === Number(dd)) {
      return `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
    }
    return null;
  }
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

// Creates empty address-lookup caches.
function makeCaches(): Caches {
  return { province: new Map(), city: new Map(), barangay: new Map() };
}

// Finds an option whose name matches exactly (case-insensitive).
function exactMatch(opts: LocationOption[], name: string): LocationOption | null {
  const target = norm(name);
  return opts.find((o) => norm(o.name) === target) ?? null;
}

// Resolves a province name to its dataset record.
async function resolveProvince(name: string, caches: Caches): Promise<LocationOption | null> {
  const key = norm(name);
  if (caches.province.has(key)) return caches.province.get(key)!;
  const match = exactMatch(await searchProvinces(name), name);
  caches.province.set(key, match);
  return match;
}

// Resolves a city/municipality name within a province to its dataset record.
async function resolveCity(provinceId: number, name: string, caches: Caches): Promise<LocationOption | null> {
  const key = `${provinceId}::${norm(name)}`;
  if (caches.city.has(key)) return caches.city.get(key)!;
  const match = exactMatch(await searchCities(provinceId, name), name);
  caches.city.set(key, match);
  return match;
}

// Resolves a barangay name within a city to its dataset record.
async function resolveBarangay(cityId: number, name: string, caches: Caches): Promise<LocationOption | null> {
  const key = `${cityId}::${norm(name)}`;
  if (caches.barangay.has(key)) return caches.barangay.get(key)!;
  const match = exactMatch(await searchBarangaysByCity(cityId, name), name);
  caches.barangay.set(key, match);
  return match;
}

// ─── Main import function ─────────────────────────────────────────────────────

// Parses an uploaded workbook and imports its rows as employers.
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

  // Converts one raw spreadsheet row into a header-keyed row.
  function parseRow(raw: unknown[]): Row {
    const out: Row = {};
    headerRow.forEach((h, i) => { out[h] = String(raw[i] ?? "").trim(); });
    return out;
  }

  // Data starts after the header row + 1 example row
  const dataRows = rawRows.slice(headerRowIdx + 2);
  const nonEmpty = dataRows.filter((r) => (r as unknown[]).some((c) => String(c ?? "").trim()));
  const total = nonEmpty.length;

  const failed: ImportResult["failed"] = [];
  const meta: { rowNum: number; name: string }[] = [];
  const payloads: Omit<Employer, "id">[] = [];
  const caches = makeCaches();
  let processed = 0;

  // Resolves every row first (address lookups etc.) without writing anything;
  // if any row fails, nothing is sent to the backend.
  for (let i = 0; i < dataRows.length; i++) {
    const raw = dataRows[i] as unknown[];
    if (!raw.some((c) => String(c ?? "").trim())) continue;

    const rowNum = headerRowIdx + 3 + i; // 1-based spreadsheet row
    const row = parseRow(raw);
    processed++;

    const companyName = get(row, "Company Name");
    const errors: string[] = [];
    if (!companyName) errors.push("Company Name is required.");

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
    if (missing.length) errors.push(`Missing required fields: ${missing.join(", ")}.`);
    if (contactNumber && !isValidContactNumber(contactNumber)) {
      errors.push(CONTACT_NUMBER_MESSAGE);
    }

    // Resolve address IDs (only attempted when all three names are present).
    let provinceId: number | null = null;
    let cityId:     number | null = null;
    let barangayId: number | null = null;

    if (provinceName && cityName && barangayName) {
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
        errors.push(err instanceof Error ? err.message : "Address lookup failed.");
      }
    }

    if (errors.length > 0) {
      failed.push({ row: rowNum, name: companyName || "(unknown)", error: errors.join(" ") });
      onProgress?.(processed, total);
      continue;
    }

    // Date registered: default to today if blank or invalid
    const dateRaw = get(row, "Date Registered (MM/DD/YYYY)");
    const dateRegistered = (dateRaw && toIsoDate(dateRaw)) ?? new Date().toISOString().split("T")[0];

    // Status: default Active if blank
    const statusRaw = get(row, "Status");
    const status = (STATUS_OPTIONS.includes(statusRaw) ? statusRaw : "Active") as "Active" | "Inactive";

    meta.push({ rowNum, name: companyName });
    payloads.push({
      companyName,
      industry:         get(row, "Industry"),
      industryOther:    get(row, "Industry (if Other)"),
      businessType:     get(row, "Business Type"),
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
      status,
      dateRegistered,
      remarks: get(row, "Remarks"),
    });

    onProgress?.(processed, total);
  }

  if (failed.length > 0) {
    return { total, succeeded: 0, failed };
  }
  if (payloads.length === 0) {
    return { total, succeeded: 0, failed: [] };
  }

  // Hand the resolved batch to the backend in one DB transaction.
  try {
    await importEmployersBulk(payloads);
    return { total, succeeded: total, failed: [] };
  } catch (err) {
    const detail = (err as { detail?: unknown }).detail;

    if (detail && typeof detail === "object" && Array.isArray((detail as { errors?: unknown }).errors)) {
      const errs = (detail as { errors: { row: number; error: string }[] }).errors;
      return {
        total,
        succeeded: 0,
        failed: errs.map(({ row, error }) => ({
          row: meta[row]?.rowNum ?? row,
          name: meta[row]?.name ?? "(unknown)",
          error,
        })),
      };
    }

    if (detail && typeof detail === "object" && typeof (detail as { failedIndex?: unknown }).failedIndex === "number") {
      const { failedIndex, reason } = detail as { failedIndex: number; reason?: string };
      const m = meta[failedIndex];
      return {
        total,
        succeeded: 0,
        failed: [{
          row: m?.rowNum ?? failedIndex,
          name: m?.name ?? "(unknown)",
          error: reason ?? (err instanceof Error ? err.message : "Import failed."),
        }],
      };
    }

    const message = err instanceof Error ? err.message : "Import failed. No records were saved.";
    return {
      total,
      succeeded: 0,
      failed: [{ row: meta[0]?.rowNum ?? headerRowIdx + 3, name: "(entire file)", error: message }],
    };
  }
}
