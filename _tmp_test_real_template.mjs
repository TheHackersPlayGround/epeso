import ExcelJS from "exceljs";
import fs from "node:fs";

// Verbatim copies of the real option arrays from CDSPProfileForm.tsx.
const CLASSIFICATION_OPTIONS = [
  'Student', 'Fresh Graduate', 'Employed', 'Underemployed', 'Unemployed',
  'Out of School Youth', 'Person with Disability', 'Solo Parent',
  'Women', 'Senior Citizen', 'Returning OFW', 'Other', 'Indigenous People',
];
const EDUCATION_OPTIONS = [
  'Elementary Level', 'Elementary Graduate', 'High School Level', 'High School Graduate',
  'Senior High School Level', 'Senior High School Graduate', 'Vocational / Technical',
  'College Level', 'College Graduate', "Master's Level", "Master's Graduate", 'Doctoral Level', 'Doctoral Graduate',
];
const EMPLOYMENT_STATUS_OPTIONS = ['Employed', 'Underemployed', 'Unemployed', 'Self-Employed'];
const CIVIL_STATUS_OPTIONS = ['Single', 'Married', 'Widowed', 'Separated', 'Divorced'];
const SEX_OPTIONS = ['Male', 'Female'];

// ─── Verbatim copy of cdspImport.ts's template definition + build logic ──────

const SECTION_PERSONAL = {
  label: 'I. PERSONAL INFORMATION',
  fillArgb: 'FF2980B9',
  requiredArgb: 'FF5B9BD5',
  optionalArgb: 'FF9DC3E6',
  columns: [
    { header: 'Last Name', width: 18, example: 'Dela Cruz', required: true },
    { header: 'First Name', width: 18, example: 'Juan', required: true },
    { header: 'Middle Name', width: 16, example: 'Santos' },
    { header: 'Sex', width: 10, example: 'Male', required: true, options: SEX_OPTIONS },
    { header: 'Birthdate (YYYY-MM-DD)', width: 20, example: '1996-05-20' },
    { header: 'Civil Status', width: 14, example: 'Single', options: CIVIL_STATUS_OPTIONS },
    { header: 'Contact Number', width: 16, example: '09171234567' },
    { header: 'Email', width: 22, example: 'juan@example.com' },
  ],
};

const SECTION_ADDRESS = {
  label: 'II. ADDRESS',
  fillArgb: 'FFF1C40F',
  requiredArgb: 'FFF5D478',
  optionalArgb: 'FFFDF1C1',
  columns: [
    { header: 'Province', width: 22, example: 'Misamis Occidental' },
    { header: 'Municipality/City', width: 20, example: 'Tangub City' },
    { header: 'Barangay', width: 18, example: 'Santo Niño' },
    { header: 'Street / Purok #', width: 18, example: 'Purok 3' },
  ],
};

const SECTION_CLASSIFICATION = {
  label: 'III. CLASSIFICATION',
  fillArgb: 'FF2980B9',
  requiredArgb: 'FF5B9BD5',
  optionalArgb: 'FF9DC3E6',
  columns: [
    { header: 'Classification (comma-separated)', width: 40, example: 'Fresh Graduate' },
  ],
};

const SECTION_EDUCATION = {
  label: 'IV. EDUCATIONAL BACKGROUND',
  fillArgb: 'FFF1C40F',
  requiredArgb: 'FFF5D478',
  optionalArgb: 'FFFDF1C1',
  columns: [
    { header: 'Highest Educational Attainment', width: 28, example: 'College Graduate', required: true, options: EDUCATION_OPTIONS },
    { header: 'Year Level', width: 16, example: '' },
    { header: 'Strand', width: 18, example: '' },
    { header: 'Course / Program', width: 22, example: 'BS Information Technology' },
    { header: 'Year Graduated', width: 16, example: '2024' },
  ],
};

const SECTION_EMPLOYMENT = {
  label: 'V. EMPLOYMENT STATUS',
  fillArgb: 'FF2980B9',
  requiredArgb: 'FF5B9BD5',
  optionalArgb: 'FF9DC3E6',
  columns: [
    { header: 'Employment Status', width: 16, example: 'Unemployed', required: true, options: EMPLOYMENT_STATUS_OPTIONS },
    { header: 'Current Occupation', width: 20, example: '' },
  ],
};

function makeServiceSection(services) {
  return {
    label: 'VI. CDSP SERVICE AVAILED',
    fillArgb: 'FFF1C40F',
    requiredArgb: 'FFF5D478',
    optionalArgb: 'FFFDF1C1',
    columns: [
      { header: 'Service Availed', width: 26, example: services[0] ?? '', required: true, options: services },
    ],
  };
}

const SECTION_OFFICE = {
  label: 'VII. FOR PESO OFFICE ONLY',
  fillArgb: 'FF64748B',
  requiredArgb: 'FF94A3B8',
  optionalArgb: 'FFCBD5E1',
  columns: [
    { header: 'Date Applied (YYYY-MM-DD)', width: 20, example: '' },
    { header: 'Received By', width: 20, example: '' },
    { header: 'Remarks', width: 24, example: '' },
  ],
};

function buildSections(services) {
  return [
    SECTION_PERSONAL,
    SECTION_ADDRESS,
    SECTION_CLASSIFICATION,
    SECTION_EDUCATION,
    SECTION_EMPLOYMENT,
    makeServiceSection(services),
    SECTION_OFFICE,
  ];
}

const TEMPLATE_VALIDATION_ROWS = 200;
const FIRST_DATA_ROW = 3;

const MAX_VALIDATION_ERROR_LEN = 200;
function validationErrorMessage(options) {
  const enumerated = `Please choose one of: ${options.join(', ')}`;
  return enumerated.length <= MAX_VALIDATION_ERROR_LEN ? enumerated : 'Please choose a value from the dropdown list.';
}

async function downloadImportTemplate(services) {
  const sections = buildSections(services);
  const columns = sections.flatMap((s) => s.columns);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Applicants');

  ws.columns = columns.map((c) => ({ width: c.width, style: { numFmt: '@' } }));

  const border = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  let startCol = 1;
  for (const section of sections) {
    const endCol = startCol + section.columns.length - 1;
    for (let c = startCol; c <= endCol; c++) {
      const cell = ws.getCell(1, c);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: section.fillArgb } };
      cell.font = { bold: true, color: { argb: 'FF1A1A1A' }, size: 12 };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = border;
    }
    ws.getCell(1, startCol).value = section.label;
    if (endCol > startCol) ws.mergeCells(1, startCol, 1, endCol);
    startCol = endCol + 1;
  }
  ws.getRow(1).height = 26;

  let colIdx2 = 0;
  for (const section of sections) {
    for (const col of section.columns) {
      const cell = ws.getCell(2, colIdx2 + 1);
      cell.value = col.required ? `${col.header} *` : col.header;
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: col.required ? section.requiredArgb : section.optionalArgb } };
      cell.font = { bold: true, color: { argb: 'FF1A1A1A' }, size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      cell.border = border;
      colIdx2++;
    }
  }
  ws.getRow(2).height = 32;

  const exampleRow = ws.addRow(columns.map((c) => c.example));
  exampleRow.eachCell((cell) => {
    cell.font = { italic: true, color: { argb: 'FF94A3B8' } };
  });

  ws.views = [{ state: 'frozen', ySplit: 2 }];
  const lastRow = FIRST_DATA_ROW + TEMPLATE_VALIDATION_ROWS - 1;
  const optionColumns = columns.filter((c) => c.options && c.options.length > 0);
  const listSheet = optionColumns.length > 0 ? wb.addWorksheet('Lists', { state: 'veryHidden' }) : null;

  columns.forEach((col, idx) => {
    if (!col.options || col.options.length === 0 || !listSheet) return;
    const letter = ws.getColumn(idx + 1).letter;

    const listColIdx = optionColumns.indexOf(col) + 1;
    const listColLetter = listSheet.getColumn(listColIdx).letter;
    col.options.forEach((opt, i) => {
      listSheet.getCell(i + 1, listColIdx).value = opt;
    });
    const formulae = [`'Lists'!$${listColLetter}$1:$${listColLetter}$${col.options.length}`];

    for (let r = FIRST_DATA_ROW; r <= lastRow; r++) {
      ws.getCell(`${letter}${r}`).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae,
        showErrorMessage: true,
        errorStyle: 'error',
        errorTitle: 'Invalid value',
        error: validationErrorMessage(col.options),
      };
    }
  });

  return wb;
}

const services = ["Career Coaching", "Pre-Employment Coaching", "Labor Employment for Graduating Students"];
const wb = await downloadImportTemplate(services);
const outPath = "C:/Users/ADMINI~1/AppData/Local/Temp/claude/c--Users-Administrator-epeso/f59061e4-f557-463b-8530-f9aeded96409/scratchpad/real_template_output.xlsx";
await wb.xlsx.writeFile(outPath);
console.log("Wrote", outPath);

// Round-trip sanity check.
const wb2 = new ExcelJS.Workbook();
await wb2.xlsx.readFile(outPath);
console.log("Sheets:", wb2.worksheets.map(s => `${s.name} (${s.state})`));
const ws2 = wb2.getWorksheet("Applicants");
console.log("Column count:", ws2.columnCount, "Row count:", ws2.rowCount);
console.log("A3 (Last Name) dv:", JSON.stringify(ws2.getCell("A3").dataValidation));

// Find the "Highest Educational Attainment" column index (1-based).
let eduColIdx = -1;
ws2.getRow(2).eachCell((cell, colNumber) => {
  if (String(cell.value).startsWith("Highest Educational Attainment")) eduColIdx = colNumber;
});
console.log("Education column index:", eduColIdx);
const eduCell = ws2.getRow(3).getCell(eduColIdx);
console.log("Education col row3 dataValidation:", JSON.stringify(eduCell.dataValidation));
