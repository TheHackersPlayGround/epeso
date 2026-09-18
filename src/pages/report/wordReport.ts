// Builds the Reports module's Word (.docx) export -- the main report export
// menu's third format alongside Excel/PDF. Purely mechanical (docx assembly):
// ReportView.tsx does all the report-specific work of deciding what content
// goes in, this file just knows how to lay out a title, a summary section
// (built from the same plain array-of-rows shape the Excel Summary sheets
// already use), optional chart images, and one or more data tables.
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, BorderStyle, ImageRun, PageOrientation,
  VerticalAlign, convertMillimetersToTwip, TableBorders, ShadingType,
} from 'docx'

// Folio / Long bond (8.5 x 13") -- same paper size the Excel export sets via
// ExcelJS's pageSetup.paperSize: 14 and the PDF export sets via jsPDF's
// FOLIO_MM constant, so all three formats print on the same paper. Given as
// portrait width/height -- docx swaps them itself for LANDSCAPE orientation.
const FOLIO_WIDTH_TWIP = convertMillimetersToTwip(215.9)
const FOLIO_HEIGHT_TWIP = convertMillimetersToTwip(330.2)

// Times New Roman set explicitly everywhere below (rather than left unset,
// which silently falls back to whatever the OOXML/Word default happens to
// be) so the choice is deliberate and doesn't drift if that fallback ever
// changes. It renders the peso sign (₱) correctly on its own, so no per-
// character font override is needed here (unlike the PDF export, which
// draws its own glyphs and needed a Unicode-safe font).
const BASE_FONT = 'Times New Roman'

const BORDER_BLACK = '000000'

const THIN_BORDER = { style: BorderStyle.SINGLE, size: 2, color: BORDER_BLACK }
const CELL_BORDERS = { top: THIN_BORDER, bottom: THIN_BORDER, left: THIN_BORDER, right: THIN_BORDER }
const CELL_MARGINS = { top: 60, bottom: 60, left: 100, right: 100 }

// A row like "CDSP SUMMARY" / "BENEFICIARIES BY STATUS" is always written in
// ALL CAPS by the callers that build these aoa rows (see ReportView.tsx) --
// used here to tell a section heading apart from an ordinary single-cell row
// without needing a separate list of which rows are headings.
const isAllCapsHeading = (s: string): boolean => /[A-Z]/.test(s) && s === s.toUpperCase()

// Every TextRun in this file goes through this instead of being constructed
// directly, so BASE_FONT stays the single place that sets the document's font.
const runsForText = (text: string, opts: { bold?: boolean; color?: string; size?: number; font?: string } = {}): TextRun[] =>
  [new TextRun({ ...opts, text, font: opts.font ?? BASE_FONT })]

// `fill` (a "#RRGGBB" or "RRGGBB" hex string) is set only for the Aging
// Report's "Time Since Completion" cell, colored by its aging bucket -- same
// highlight the Excel and PDF exports already use for that same column, in
// white bold text so it stays readable against the colored background.
const textCell = (value: string | number, widthPct: number, fill?: string): TableCell =>
  new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    margins: CELL_MARGINS,
    borders: CELL_BORDERS,
    verticalAlign: VerticalAlign.CENTER,
    shading: fill ? { type: ShadingType.SOLID, color: fill.replace('#', ''), fill: fill.replace('#', '') } : undefined,
    children: [new Paragraph({ children: runsForText(String(value), { size: 18, bold: !!fill, color: fill ? 'FFFFFF' : undefined }) })],
  })

// Converts the same plain array-of-rows shape the Excel Summary sheets build
// (see the "Participant-program summary sheet" etc. blocks in ReportView.tsx)
// into Word content: a blank row becomes spacing, a single-cell ALL-CAPS row
// becomes a bold section heading, and any run of same-width multi-cell rows
// becomes one small table -- so a summary's key/value pairs and its little
// breakdown tables all fall out of the same conversion without the caller
// needing to say which rows are which.
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

// "No." is just a 1-3 digit row index -- giving it the same share as every
// other column (e.g. "Participant Name") leaves it mostly empty while
// squeezing the columns that actually need the room, forcing their text to
// wrap. It gets a small fixed share instead; everything else splits the rest.
const NARROW_COLUMN_PCT = 5
const NARROW_COLUMNS = new Set(['No.'])

function computeColumnWidthPcts(columns: string[]): number[] {
  const narrowCount = columns.filter(c => NARROW_COLUMNS.has(c)).length
  const wideCount = columns.length - narrowCount
  const widePct = wideCount > 0 ? (100 - narrowCount * NARROW_COLUMN_PCT) / wideCount : 0
  return columns.map(c => NARROW_COLUMNS.has(c) ? NARROW_COLUMN_PCT : widePct)
}

// The main Detailed Report / Placed / Not Yet Placed data tables -- a bold
// plain-white header row with black text and black borders throughout.
// cellFill is optional -- only the Aging Report uses it, to highlight the
// "Time Since Completion" cell with its bucket color (matches the Excel and
// PDF exports' own highlighting for that same column). Returns a hex color,
// or undefined for no fill, same shape as the Excel export's own cellFill.
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
  // aspect = height/width, kept explicit rather than guessed since the bar
  // chart canvas (800x400/800x350) and pie chart canvas (800x450) are drawn at
  // different fixed proportions in ReportView.tsx. label is what each chart
  // shows (e.g. "Beneficiaries by Status") -- drawn above its image the same
  // way the PDF export captions its own charts, so the two aren't just
  // pictures with no indication of what they represent.
  chartImages?: { dataUrl: string; aspect: number; label: string }[]
  detailed: WordDataTable
  extraTables?: WordDataTable[]
}

// One TableCell per chart: its label (bold, centered) above the image (also
// centered). Built as a borderless layout table (see buildChartsRow) rather
// than stacking each chart in its own full-width paragraph -- side by side,
// both charts comfortably fit the same page instead of the second one
// spilling onto a page of its own.
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

// Lays out up to two charts side by side in one borderless row (a third or
// later chart would start a new row) -- every category this module actually
// produces charts for (General PESO Report, Aging Reports) only ever has one
// or two, so a single row covers every real case.
function buildChartsTable(charts: { dataUrl: string; aspect: number; label: string }[]): Table {
  const rows: TableRow[] = []
  for (let i = 0; i < charts.length; i += 2) {
    const pair = charts.slice(i, i + 2)
    rows.push(new TableRow({ children: pair.map(c => buildChartCell(c, 100 / pair.length)) }))
  }
  // TableBorders.NONE at the table level, not just on each cell -- otherwise
  // this layout table can still pick up Word's default "Table Grid" borders,
  // which is what made it look like a continuation of the bordered summary
  // table directly above it instead of a separate, borderless chart row.
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: TableBorders.NONE, rows })
}

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
    // A spacer paragraph before the charts table -- two tables placed back to
    // back with nothing between them can otherwise read as one continuous
    // table, especially once the borders above are visible and this one isn't.
    // No forced page break here -- side by side and shrunk to CHART_WIDTH_PX,
    // both charts are compact enough to flow naturally into whatever room is
    // left after the summary tables above, rather than being shoved onto a
    // fresh page even when the previous one still had plenty of space.
    children.push(new Paragraph({ spacing: { before: 200, after: 200 }, text: '' }))
    children.push(buildChartsTable(input.chartImages))
  }

  children.push(new Paragraph({
    // Keeps this heading on the same page as the table right after it --
    // without this, Word can leave the heading orphaned at the bottom of one
    // page (there was just enough room for the text) while the table itself
    // starts alone on the next.
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

// Shared by generateWordReport and generateWordRoster below -- same Folio
// landscape page every Word export in this module uses.
function packDocument(children: (Paragraph | Table)[]): Promise<Blob> {
  const doc = new Document({
    sections: [{
      properties: { page: { size: { orientation: PageOrientation.LANDSCAPE, width: FOLIO_WIDTH_TWIP, height: FOLIO_HEIGHT_TWIP } } },
      children,
    }],
  })
  return Packer.toBlob(doc)
}

// Word counterpart to buildRosterPdf (the per-activity/batch/project roster
// exports: Export Attendees/Interns/Students/Beneficiaries/Trainees) -- same
// shape as that PDF: a centered bold title, centered "Label: value" info
// lines, then a plain data table. infoLines/headerLabels/rows are the exact
// same arrays ReportView.tsx already builds for the PDF/CSV versions of these
// same rosters, just laid out as Word content instead of PDF drawing calls.
export async function generateWordRoster(
  title: string,
  infoLines: { label: string; value: string | number }[][],
  headerLabels: string[],
  rows: (string | number)[][],
  // Only the Skills Training roster's Attendance column uses this (green/red
  // by Present/Absent) -- same 0-based-index shape as buildRosterPdf's, since
  // these rosters are plain arrays rather than objects keyed by column name.
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
