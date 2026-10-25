// Builds the Reports module's Word (.docx) export. Purely mechanical docx
// assembly: ReportView.tsx decides what content goes in, this file lays out
// a title, a summary section, optional chart images, and data tables.
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ImageRun, PageOrientation,
  VerticalAlign, convertMillimetersToTwip, TableBorders, ShadingType,
} from 'docx'

// Folio / Long bond (8.5 x 13"), same paper size as the Excel/PDF exports.
// Given as portrait width/height; docx swaps them for landscape orientation.
const FOLIO_WIDTH_TWIP = convertMillimetersToTwip(215.9)
const FOLIO_HEIGHT_TWIP = convertMillimetersToTwip(330.2)

// Times New Roman set explicitly everywhere below instead of left to the
// Word default. Renders the peso sign correctly on its own, unlike the PDF
// export which needed a Unicode-safe font.
const BASE_FONT = 'Times New Roman'

const BORDER_BLACK = '000000'

const THIN_BORDER = { style: BorderStyle.SINGLE, size: 2, color: BORDER_BLACK }
const CELL_BORDERS = { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER }
const CELL_MARGINS = { top: 60, bottom: 60, left: 100, right: 100 }

// Section headings are always written in ALL CAPS by the callers that build
// these aoa rows, so this is enough to tell a heading apart from a plain row.
const isAllCapsHeading = (s: string): boolean => /[A-Z]/.test(s) && s === s.toUpperCase()

// Every TextRun in this file goes through this instead of being constructed
// directly, so BASE_FONT stays the single place that sets the document's font.
const runsForText = (text: string, opts: { bold?: boolean; color?: string; size?: number; font?: string } = {}): TextRun[] =>
  [new TextRun({ ...opts, text, font: opts.font ?? BASE_FONT })]

// `fill` is set only for the Aging Report's "Time Since Completion" cell,
// colored by its aging bucket, in white bold text for readability.
const textCell = (value: string | number, widthPct: number, fill?: string): TableCell =>
  new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    margins: CELL_MARGINS,
    borders: CELL_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    shading: fill ? { type: ShadingType.SOLID, color: fill.replace('#', ''), fill: fill.replace('#', '') } : undefined,
    children: [new Paragraph({ children: runsForText(String(value), { size: 18, bold: !!fill, color: fill ? 'FFFFFF' : undefined }) })],
  })

// Converts the same array-of-rows shape the Excel Summary sheets build into
// Word content: a blank row becomes spacing, a single-cell ALL-CAPS row
// becomes a heading, and a run of same-width rows becomes a small table.
function aoaToElements(aoa: (string | number)[][]): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = []
  let pendingRows: TableRow[] = []
  let pendingCols = 0
  const flush = () => {
    if (pendingRows.length === 0) return
    elements.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: pendingRows }))
    pendingRows = []
    pendingCols = 0
  }
  aoa.forEach(row => {
    if (row.length === 0) {
      flush()
      elements.push(new Paragraph({ text: '' }))
      return
    }
    if (row.length === 1) {
      flush()
      const text = String(row[0])
      elements.push(new Paragraph({
        children: runsForText(text, { bold: isAllCapsHeading(text) }),
        spacing: { before: 200, after: 100 },
      }))
      return
    }
    if (pendingCols && row.length !== pendingCols) flush()
    pendingCols = row.length
    pendingRows.push(new TableRow({ children: row.map(cell => textCell(cell, 100 / row.length)) }))
  })
  flush()
  return elements
}

// "No." is a 1-3 digit index; giving it a small fixed share instead of an
// equal share leaves more room for columns that actually need it.
const NARROW_COLUMN_PCT = 5
const NARROW_COLUMNS = new Set(['No.'])

// Computes each column's width as a percentage of the table.
function computeColumnWidthPcts(columns: string[]): number[] {
  const narrowCount = columns.filter(c => NARROW_COLUMNS.has(c)).length
  const wideCount = columns.length - narrowCount
  const widePct = wideCount > 0 ? (100 - narrowCount * NARROW_COLUMN_PCT) / wideCount : 0
  return columns.map(c => NARROW_COLUMNS.has(c) ? NARROW_COLUMN_PCT : widePct)
}

// The main data tables: a bold plain-white header row, black text and
// borders. cellFill is optional; only the Aging Report uses it, matching
// the Excel/PDF highlight on "Time Since Completion".
function buildDataTable(columns: string[], rows: Record<string, any>[], cellFill?: (col: string, row: any) => string | undefined): Table {
  const widths = computeColumnWidthPcts(columns)
  const header = new TableRow({
    tableHeader: true,
    children: columns.map((col, i) => new TableCell({
      width: { size: widths[i], type: WidthType.PERCENTAGE },
      margins: CELL_MARGINS,
      borders: CELL_BORDERS,
      verticalAlign: VerticalAlign.CENTER,
      children: [new Paragraph({
        alignment: AlignmentType.CENTER,
        children: runsForText(col, { bold: true, size: 16 }),
      })],
    })),
  })
  const dataRows = rows.map(row => new TableRow({
    children: columns.map((col, i) => {
      const v = row[col]
      return textCell(typeof v === 'number' ? v : (v || '-'), widths[i], cellFill?.(col, row))
    }),
  }))
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [header, ...dataRows] })
}

export type WordDataTable = {
  title: string
  columns: string[]
  rows: Record<string, any>[]
  cellFill?: (col: string, row: any) => string | undefined
}

export interface WordReportInput {
  title: string
  periodDetails: string
  summaryAoa?: (string | number)[][]
  // aspect = height/width, kept explicit since the bar/pie chart canvases use
  // different fixed proportions. label is the caption drawn above the image.
  chartImages?: { dataUrl: string; aspect: number; label: string }[]
  detailed: WordDataTable
  extraTables?: WordDataTable[]
}

// One TableCell per chart: label above image, both centered. Side by side
// in a borderless layout table so both charts fit on one page.
const CHART_WIDTH_PX = 480
function buildChartCell(chart: { dataUrl: string; aspect: number; label: string }, widthPct: number): TableCell {
  const base64 = chart.dataUrl.split(',')[1]
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders: { top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE }, left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE } },
    children: [
      new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 80 }, children: runsForText(chart.label, { bold: true, color: '000000', size: 22 }) }),
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [new ImageRun({ type: 'png', data: base64, transformation: { width: CHART_WIDTH_PX, height: Math.round(CHART_WIDTH_PX * chart.aspect) } })],
      }),
    ],
  })
}

// Lays out up to two charts side by side per row; every category this module
// handles only ever produces one or two charts.
function buildChartsTable(charts: { dataUrl: string; aspect: number; label: string }[]): Table {
  const rows: TableRow[] = []
  for (let i = 0; i < charts.length; i += 2) {
    const pair = charts.slice(i, i + 2)
    rows.push(new TableRow({ children: pair.map(c => buildChartCell(c, 100 / pair.length)) }))
  }
  // TableBorders.NONE at the table level, not just on each cell, otherwise
  // Word's default grid borders make this look like a continuation of the
  // summary table above.
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: TableBorders.NONE, rows })
}

// Builds the Word (.docx) export for a full report.
export async function generateWordReport(input: WordReportInput): Promise<Blob> {
  const children: (Paragraph | Table)[] = []

  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: runsForText(input.title, { bold: true, color: '000000', size: 32 }),
  }))
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
    children: runsForText(`Report Period: ${input.periodDetails}`),
  }))

  if (input.summaryAoa) children.push(...aoaToElements(input.summaryAoa))

  if (input.chartImages && input.chartImages.length > 0) {
    // Spacer so two tables back to back don't read as one continuous table.
    // No forced page break; the charts are small enough to flow naturally.
    children.push(new Paragraph({ spacing: { before: 200, after: 200 }, text: '' }))
    children.push(buildChartsTable(input.chartImages))
  }

  children.push(new Paragraph({
    // Keeps this heading on the same page as the table right after it.
    keepNext: true,
    spacing: { before: 200, after: 100 },
    children: runsForText(input.detailed.title, { bold: true, color: '000000', size: 26 }),
  }))
  children.push(buildDataTable(input.detailed.columns, input.detailed.rows, input.detailed.cellFill))

  for (const table of input.extraTables ?? []) {
    children.push(new Paragraph({
      keepNext: true,
      spacing: { before: 300, after: 100 },
      children: runsForText(table.title, { bold: true, color: '000000', size: 26 }),
    }))
    children.push(buildDataTable(table.columns, table.rows, table.cellFill))
  }

  return packDocument(children)
}

// Shared by generateWordReport and generateWordRoster: same Folio landscape page.
function packDocument(children: (Paragraph | Table)[]): Promise<Blob> {
  const doc = new Document({
    sections: [{
      properties: { page: { size: { orientation: PageOrientation.LANDSCAPE, width: FOLIO_WIDTH_TWIP, height: FOLIO_HEIGHT_TWIP } } },
      children,
    }],
  })
  return Packer.toBlob(doc)
}

// Word counterpart to buildRosterPdf: centered title, centered info lines,
// then a plain data table, from the same arrays the PDF version uses.
export async function generateWordRoster(
  title: string,
  infoLines: { label: string; value: string | number }[][],
  headerLabels: string[],
  rows: (string | number)[][],
  // Only the Skills Training roster's Attendance column uses this.
  cellFill?: (colIndex: number, row: (string | number)[]) => string | undefined,
): Promise<Blob> {
  const children: (Paragraph | Table)[] = []
  children.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    children: runsForText(title, { bold: true, color: '000000', size: 32 }),
  }))
  infoLines.forEach(parts => {
    children.push(new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 60 },
      children: parts.flatMap(p => [...runsForText(p.label, { bold: true }), ...runsForText(String(p.value))]),
    }))
  })
  children.push(new Paragraph({ spacing: { before: 200 }, text: '' }))
  const keyedRows = rows.map(row => Object.fromEntries(headerLabels.map((h, i) => [h, row[i]])))
  const keyedCellFill = cellFill
    ? (col: string, row: any) => cellFill(headerLabels.indexOf(col), headerLabels.map(h => row[h]))
    : undefined
  children.push(buildDataTable(headerLabels, keyedRows, keyedCellFill))
  return packDocument(children)
}
