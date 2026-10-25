// Generates the General PESO Report's Excel export by patching a template
// workbook with two native Excel charts authored directly in Excel.
//
// Patches the .xlsx zip directly with JSZip, since ExcelJS has no API for
// native chart objects (only static images). Same technique as pesoMonthlyReport.ts.
import JSZip from 'jszip'
import { GENERAL_PESO_PROGRAM_COLORS } from './generalPesoColors'
import { setChartTitle } from './xlsxChartPatch'
import type { GeneralPesoProgramRow } from '../../services/reportService'

const templateUrl = new URL('./general_peso_template.xlsx', import.meta.url).href

const SHEET_CHARTDATA = 'xl/worksheets/sheet1.xml'
const SHEET_REPORT = 'xl/worksheets/sheet2.xml'
const SHEET_DETAILS = 'xl/worksheets/sheet3.xml'
const CHART_BAR = 'xl/charts/chart1.xml'
const CHART_PIE = 'xl/charts/chart2.xml'
const MAX_PROGRAMS = 7 // the template pre-allocates rows 2..8 (matches the 7 selectable programs)

// Escapes a value for safe use inside XML text.
const xmlEsc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Replaces one cell's value in a worksheet XML, preserving its style.
// Same approach as pesoMonthlyReport.ts's setCell.
function setCell(xml: string, ref: string, value: string | number, isNumber: boolean): string {
  const re = new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>.*?</c>)`, 's')
  if (!re.test(xml)) throw new Error(`General PESO template: cell ${ref} not found`)
  const inner = isNumber
    ? `><v>${value}</v></c>`
    : ` t="inlineStr"><is><t xml:space="preserve">${xmlEsc(value)}</t></is></c>`
  return xml.replace(re, (_m, attrs: string) => `<c r="${ref}"${attrs.replace(/\s*t="[^"]*"/, '')}${inner}`)
}

// Shrinks the chart's category/value cell range to exactly N rows instead of
// the template's fixed 7 slots.
function setChartRange(chartXml: string, lastRow: number): string {
  return chartXml.replace(/(ChartData!\$([A-Z])\$2:\$\2\$)\d+/g, `$1${lastRow}`)
}

// Rebuilds the cached label/value blocks to match the shrunk range, so the
// chart doesn't show stale data until a manual recalculation.
function setStrCache(chartXml: string, values: string[]): string {
  return chartXml.replace(/(<c:cat><c:strRef><c:f>[^<]*<\/c:f><c:strCache>).*?(<\/c:strCache>)/s, (_m, pre: string, post: string) => {
    const pts = values.map((v, i) => `<c:pt idx="${i}"><c:v>${xmlEsc(v)}</c:v></c:pt>`).join('')
    return `${pre}<c:ptCount val="${values.length}"/>${pts}${post}`
  })
}

// Rebuilds the cached value block to match a shrunk range.
function setNumCache(chartXml: string, values: number[]): string {
  return chartXml.replace(/(<c:val><c:numRef><c:f>[^<]*<\/c:f><c:numCache>)(.*?)(<\/c:numCache>)/s, (_m, pre: string, body: string, post: string) => {
    const fmt = (body.match(/<c:formatCode>.*?<\/c:formatCode>/) || ['<c:formatCode>General</c:formatCode>'])[0]
    const pts = values.map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join('')
    return `${pre}${fmt}<c:ptCount val="${values.length}"/>${pts}${post}`
  })
}

// The pie's default per-slice theme colors vary by position, not program
// identity. Replace them with explicit hex colors keyed by program name, so
// the same program always gets the same color.
function setPieColors(chartXml: string, programs: string[]): string {
  const dPts = programs
    .map((name, i) => {
      const color = (GENERAL_PESO_PROGRAM_COLORS[name] || '#94A3B8').replace('#', '')
      return `<c:dPt><c:idx val="${i}"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></c:spPr></c:dPt>`
    })
    .join('')
  return chartXml.replace(/(<\/c:tx>).*?(<c:cat>)/s, `$1${dPts}$2`)
}

// Forces the bar chart's fill to the app's brand blue instead of the theme default.
function setBarColor(chartXml: string): string {
  return chartXml.replace('<a:solidFill><a:schemeClr val="accent1"/></a:solidFill>', '<a:solidFill><a:srgbClr val="0077BE"/></a:solidFill>')
}

// Flips on the existing showPercent flag so each slice shows its share, and
// inserts a numFmt so Excel prints one decimal place to match the on-screen report.
function setPieShowPercent(chartXml: string): string {
  return chartXml
    .replace('<c:dLbls>', '<c:dLbls><c:numFmt formatCode="0.0%" sourceLinked="0"/>')
    .replace('<c:showPercent val="0"/>', '<c:showPercent val="1"/>')
}

// Builds and downloads the General PESO Report's Excel workbook with native charts.
export async function generateGeneralPesoWorkbook(
  programs: GeneralPesoProgramRow[],
  analytics: { total: number; male: number; female: number },
  periodDetails: string,
  fileName: string,
) {
  const n = programs.length
  const lastRow = 1 + n
  const names = programs.map(p => p.program)
  const counts = programs.map(p => p.participants)

  const buf = await (await fetch(templateUrl)).arrayBuffer()
  const zip = await JSZip.loadAsync(buf)

  // ── ChartData: write the selected programs into rows 2..(1+n), blank the rest ──
  let chartData = await zip.file(SHEET_CHARTDATA)!.async('string')
  for (let i = 0; i < MAX_PROGRAMS; i++) {
    const row = 2 + i
    if (i < n) {
      chartData = setCell(chartData, `A${row}`, programs[i].program, false)
      chartData = setCell(chartData, `B${row}`, programs[i].participants, true)
    } else {
      chartData = setCell(chartData, `A${row}`, '', false)
      chartData = setCell(chartData, `B${row}`, 0, true)
    }
  }
  zip.file(SHEET_CHARTDATA, chartData)

  // ── Charts: shrink the range AND rebuild the cached values to match ──
  // Titles match the Word export's chart captions instead of the template's
  // auto-generated series name.
  let bar = await zip.file(CHART_BAR)!.async('string')
  bar = setChartRange(bar, lastRow)
  bar = setStrCache(bar, names)
  bar = setNumCache(bar, counts)
  bar = setBarColor(bar)
  bar = setChartTitle(bar, 'Program Participation Summary')
  zip.file(CHART_BAR, bar)

  let pie = await zip.file(CHART_PIE)!.async('string')
  pie = setChartRange(pie, lastRow)
  pie = setStrCache(pie, names)
  pie = setNumCache(pie, counts)
  pie = setPieColors(pie, names)
  pie = setPieShowPercent(pie)
  pie = setChartTitle(pie, 'Program Distribution')
  zip.file(CHART_PIE, pie)

  // ── Report sheet: period + headline stats ──
  let report = await zip.file(SHEET_REPORT)!.async('string')
  // Turn gridlines back on to match every other sheet/report in this app.
  report = report.replace('showGridLines="0"', 'showGridLines="1"')
  report = setCell(report, 'B3', periodDetails, false)
  report = setCell(report, 'B5', analytics.total, true)
  report = setCell(report, 'B6', analytics.male, true)
  report = setCell(report, 'B7', analytics.female, true)
  zip.file(SHEET_REPORT, report)

  // ── Program Details: the same per-program table as the on-screen preview ──
  let details = await zip.file(SHEET_DETAILS)!.async('string')
  const cols = ['A', 'B', 'C', 'D', 'E', 'F'] as const
  for (let i = 0; i < MAX_PROGRAMS; i++) {
    const row = 2 + i
    if (i < n) {
      const p = programs[i]
      details = setCell(details, `A${row}`, p.program, false)
      details = setCell(details, `B${row}`, p.participants, true)
      details = setCell(details, `C${row}`, p.male, true)
      details = setCell(details, `D${row}`, p.female, true)
      details = p.activities === null ? setCell(details, `E${row}`, '-', false) : setCell(details, `E${row}`, p.activities, true)
      details = p.placements === null ? setCell(details, `F${row}`, '-', false) : setCell(details, `F${row}`, p.placements, true)
    } else {
      cols.forEach(c => { details = setCell(details, `${c}${row}`, '', false) })
    }
  }
  zip.file(SHEET_DETAILS, details)

  const out = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  const url = URL.createObjectURL(out)
  const link = document.createElement('a')
  link.href = url
  link.download = `${fileName}.xlsx`
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  setTimeout(() => { document.body.removeChild(link); URL.revokeObjectURL(url) }, 100)
}
