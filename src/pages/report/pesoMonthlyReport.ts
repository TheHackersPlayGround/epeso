// Generates the PESO LMI/SPRS report by substituting live data into a real
// template workbook (a cleaned copy of the official DOLE file). Because the
// template keeps the exact layout, styles, logo, and the 5 native Excel charts,
// the output IS the official report with fresh numbers — the charts stay live.
//
// We manipulate the .xlsx zip directly (JSZip) rather than round-tripping through
// a workbook library, which would drop the chart parts.
import JSZip from 'jszip'
import type { EfMonthlyReport } from '../../services/reportService'

// Vite bundles the template and gives us a URL to fetch at runtime.
const templateUrl = new URL('./peso_template.xlsx', import.meta.url).href

const SUMMARY = 'xl/worksheets/sheet1.xml'
const SHEET_REGISTERED = 'xl/worksheets/sheet2.xml'
const SHEET_REFERRED = 'xl/worksheets/sheet3.xml'
const SHEET_PLACED = 'xl/worksheets/sheet4.xml'

const xmlEsc = (s: unknown) =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const pct = (n: number) => `${(n * 100).toFixed(2)}%`

// Replace one cell's value in a worksheet XML, PRESERVING its style (s attr).
function setCell(xml: string, ref: string, value: string | number, isNumber: boolean): string {
  const re = new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>.*?</c>)`, 's')
  if (!re.test(xml)) throw new Error(`PESO template: cell ${ref} not found`)
  const inner = isNumber
    ? `><v>${value}</v></c>`
    : ` t="inlineStr"><is><t xml:space="preserve">${xmlEsc(value)}</t></is></c>`
  return xml.replace(re, (_m, attrs: string) => `<c r="${ref}"${attrs.replace(/\s*t="[^"]*"/, '')}${inner}`)
}

// Update the cached values of the FIRST data series (<c:val>) in a chart — so the
// chart renders the right numbers even before Excel recalculates from the cells.
function setChartValues(chartXml: string, values: number[]): string {
  return chartXml.replace(/(<c:val>.*?<c:numCache>)(.*?)(<\/c:numCache>)/s, (_m, pre: string, body: string, post: string) => {
    const fmt = (body.match(/<c:formatCode>.*?<\/c:formatCode>/) || [''])[0]
    const pts = values.map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join('')
    return `${pre}${fmt}<c:ptCount val="${values.length}"/>${pts}${post}`
  })
}

// Doughnut slices carry HARD-CACHED percentage labels (<c:dLbl>…<a:t>48%</a:t>),
// not auto-computed ones — so we must recompute and overwrite each slice's label
// text to match the new values, or the labels show the template's stale numbers.
function setDoughnutLabels(chartXml: string, values: number[]): string {
  const total = values.reduce((a, b) => a + b, 0)
  return chartXml.replace(/<c:dLbl>(.*?)<\/c:dLbl>/gs, (block, inner: string) => {
    const m = inner.match(/<c:idx val="(\d+)"/)
    if (!m) return block
    const i = Number(m[1])
    if (i >= values.length) return block
    const p = total > 0 ? Math.round((values[i] / total) * 100) : 0
    return `<c:dLbl>${inner.replace(/(<a:t>)[^<]*(<\/a:t>)/, `$1${p}%$2`)}</c:dLbl>`
  })
}

// Build one <c> cell (number or inline string) with a given style index.
function cell(ref: string, style: number, value: string | number | null, isNumber: boolean): string {
  if (value === null || value === '') return `<c r="${ref}" s="${style}"/>`
  return isNumber
    ? `<c r="${ref}" s="${style}"><v>${value}</v></c>`
    : `<c r="${ref}" s="${style}" t="inlineStr"><is><t xml:space="preserve">${xmlEsc(value)}</t></is></c>`
}

// Append data rows (starting at row 10) to a list sheet and fix its dimension.
function appendListRows(xml: string, rowsXml: string, lastRow: number): string {
  return xml
    .replace(/<dimension ref="[^"]*"\/>/, `<dimension ref="A1:W${Math.max(lastRow, 9)}"/>`)
    .replace('</sheetData>', `${rowsXml}</sheetData>`)
}

export async function generatePesoMonthlyReport(data: EfMonthlyReport, periodLabel: string, periodPhrase: string) {
  const s = data.summary
  const c = data.comparison
  const buf = await (await fetch(templateUrl)).arrayBuffer()
  const zip = await JSZip.loadAsync(buf)

  // ── Summary sheet (LMI ANALYSIS) ──
  let s1 = await zip.file(SUMMARY)!.async('string')
  s1 = setCell(s1, 'L4', periodLabel, false)
  s1 = setCell(s1, 'O27', periodLabel, false)
  // A. General Analysis
  s1 = setCell(s1, 'H9', s.vacanciesSolicited, true)
  s1 = setCell(s1, 'H10', s.applicantsRegistered, true)
  s1 = setCell(s1, 'H11', s.applicantsReferred, true)
  s1 = setCell(s1, 'H12', s.applicantsPlaced, true)
  s1 = setCell(s1, 'H13', s.placementRate, true) // fraction; cell carries a % format
  // Sample PESO wording: majority sex + its share; local share of vacancies; and
  // the "for the month of …" phrasing (lower-cased periodPhrase for mid-sentence).
  const localPct = (s.local + s.overseas) > 0 ? ((s.local / (s.local + s.overseas)) * 100).toFixed(2) : '0.00'
  const majority = (m: number, f: number) => {
    const t = m + f
    const sex = m >= f ? 'male' : 'female'
    const p = t > 0 ? Math.round((Math.max(m, f) / t) * 100) : 0
    return `${sex} (${p}%)`
  }
  const midPhrase = periodPhrase
    .replace(/^For the Month of/, 'for the month of')
    .replace(/^For the Year/, 'for the year')
    .replace(/^For the period/, 'for the period')

  s1 = setCell(s1, 'B15',
    `Of the ${s.vacanciesSolicited} job vacancies solicited, ${s.applicantsRegistered} applicants registered ` +
    `for the said vacancies. And of the ${s.applicantsReferred} applicants referred for employment, ${s.applicantsPlaced} ` +
    `were placed. The placement rate is ${pct(s.placementRate)}.`, false)
  // B. Detailed Analysis — the cells the doughnut/bar charts read
  s1 = setCell(s1, 'B25', s.local, true)
  s1 = setCell(s1, 'D25', s.overseas, true)
  s1 = setCell(s1, 'F25', s.registeredBySex.male, true)
  s1 = setCell(s1, 'H25', s.registeredBySex.female, true)
  s1 = setCell(s1, 'K25', s.referredBySex.male, true)
  s1 = setCell(s1, 'M25', s.referredBySex.female, true)
  s1 = setCell(s1, 'P25', s.placedBySex.male, true)
  s1 = setCell(s1, 'R25', s.placedBySex.female, true)
  s1 = setCell(s1, 'B38',
    `The above data shows that majority of the job vacancies solicited ${midPhrase} is local at ${localPct}%. ` +
    `As to sex disaggregation, majority of the applicants registered were ${majority(s.registeredBySex.male, s.registeredBySex.female)}, ` +
    `majority of the applicants referred were ${majority(s.referredBySex.male, s.referredBySex.female)}, ` +
    `and majority of the applicants placed were ${majority(s.placedBySex.male, s.placedBySex.female)}.`, false)
  // C. Comparative performance (current vs previous year)
  s1 = setCell(s1, 'G44', c.currentYear, true)
  s1 = setCell(s1, 'H44', c.previousYear, true)
  s1 = setCell(s1, 'G45', c.current.vacancies, true);   s1 = setCell(s1, 'H45', c.previous.vacancies, true)
  s1 = setCell(s1, 'G46', c.current.registered, true);  s1 = setCell(s1, 'H46', c.previous.registered, true)
  s1 = setCell(s1, 'G47', c.current.referred, true);    s1 = setCell(s1, 'H47', c.previous.referred, true)
  s1 = setCell(s1, 'G48', c.current.placed, true);      s1 = setCell(s1, 'H48', c.previous.placed, true)
  s1 = setCell(s1, 'G49', c.current.placementRate, true); s1 = setCell(s1, 'H49', c.previous.placementRate, true)
  s1 = setCell(s1, 'J44',
    `Based on the comparative data, the placement rate for ${periodLabel} is ${pct(c.current.placementRate)}, ` +
    `compared to ${pct(c.previous.placementRate)} for the same period in ${c.previousYear}.`, false)
  // The LMI summary sheet has no print setup in the PESO template — give it one so
  // the analysis + charts print as one clean landscape page. (The list sheets keep
  // the PESO's own page sizes.) Only add if not already present, to stay idempotent.
  if (!s1.includes('<pageSetup')) {
    if (!s1.includes('<sheetPr')) {
      s1 = s1.replace(/(<worksheet[^>]*>)/, '$1<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>')
    }
    s1 = s1.replace(/(<pageMargins[^>]*\/>)/,
      '$1<pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="1"/>')
  }
  zip.file(SUMMARY, s1)

  // ── Charts: refresh cached series values ──
  const chartVals: Record<string, number[]> = {
    'xl/charts/chart1.xml': [s.vacanciesSolicited, s.applicantsRegistered, s.applicantsReferred, s.applicantsPlaced],
    'xl/charts/chart5.xml': [s.local, s.overseas],
    'xl/charts/chart4.xml': [s.registeredBySex.male, s.registeredBySex.female],
    'xl/charts/chart3.xml': [s.referredBySex.male, s.referredBySex.female],
    'xl/charts/chart2.xml': [s.placedBySex.male, s.placedBySex.female],
  }
  const doughnuts = new Set(['xl/charts/chart5.xml', 'xl/charts/chart4.xml', 'xl/charts/chart3.xml', 'xl/charts/chart2.xml'])
  for (const [path, vals] of Object.entries(chartVals)) {
    const f = zip.file(path)
    if (!f) continue
    let xml = setChartValues(await f.async('string'), vals)
    if (doughnuts.has(path)) xml = setDoughnutLabels(xml, vals) // recompute cached % labels
    zip.file(path, xml)
  }

  // The bar chart's title ("LMI Graphical Presentation for …") is a text box on
  // the drawing with the period baked in as static text — swap it for the real one.
  const drawing = zip.file('xl/drawings/drawing1.xml')
  if (drawing) {
    let d = await drawing.async('string')
    const titleMarker = '<a:t>LMI Graphical Presentation for'
    const titleStart = d.indexOf(titleMarker)
    if (titleStart !== -1) {
      // The box is a FIXED width (spAutoFit only grows height, not width), sized
      // for the original short placeholder ("JUNE 2026"). A custom-range label can
      // run much longer and get clipped, so shrink the font to fit instead —
      // scoped to just this shape's <xdr:txBody> so it can't touch other shapes'
      // font sizes elsewhere in the drawing.
      const bodyStart = d.lastIndexOf('<xdr:txBody>', titleStart)
      const bodyEnd = d.indexOf('</xdr:txBody>', titleStart) + '</xdr:txBody>'.length
      let body = d.slice(bodyStart, bodyEnd)
      const fullTitle = `LMI Graphical Presentation for  ${periodLabel}`
      const CHARS_AT_11PT = 40 // ≈ box width (267pt) / avg bold-Century-Gothic char width at 11pt
      const fitFontSz = Math.min(1100, Math.max(600, Math.round(1100 * CHARS_AT_11PT / fullTitle.length)))
      body = body.replace(/sz="1100"/g, `sz="${fitFontSz}"`)
      body = body.replace(/<a:t>[^<]*JUNE 2026[^<]*<\/a:t>/, `<a:t> ${xmlEsc(periodLabel)}</a:t>`)
      d = d.slice(0, bodyStart) + body + d.slice(bodyEnd)
    }
    zip.file('xl/drawings/drawing1.xml', d)
  }

  // The list sheets carry their own "For the …" line (cell A7) — the template has
  // these stale/inconsistent, so overwrite each with the period-appropriate phrase.
  const periodText = periodPhrase
  const writeList = async (path: string, rowsXml: string, count: number) => {
    let xml = await zip.file(path)!.async('string')
    xml = setCell(xml, 'A7', periodText, false)
    xml = appendListRows(xml, rowsXml, 9 + count)
    zip.file(path, xml)
  }

  // ── Monitoring Form No. 2 — Applicants Registered (10 cols) ──
  {
    const rows = data.registered.map((a, i) => {
      const r = 10 + i
      return `<row r="${r}" spans="1:23">` +
        cell(`A${r}`, 70, i + 1, true) +
        cell(`B${r}`, 64, a.name, false) +
        cell(`C${r}`, 64, a.occupation, false) +
        cell(`D${r}`, 65, a.sex, false) +
        cell(`E${r}`, 64, a.birthdate, false) +
        cell(`F${r}`, 70, a.age, true) +
        cell(`G${r}`, 64, a.civilStatus, false) +
        cell(`H${r}`, 64, a.educationalAttainment, false) +
        cell(`I${r}`, 70, a.yearsWorkExperience, false) +
        cell(`J${r}`, 64, a.employmentStatus, false) +
        `</row>`
    }).join('')
    await writeList(SHEET_REGISTERED, rows, data.registered.length)
  }

  // ── Monitoring Form No. 3 — Applicants Referred (3 cols) ──
  {
    const rows = data.referred.map((a, i) => {
      const r = 10 + i
      return `<row r="${r}" spans="1:26">` +
        cell(`A${r}`, 69, i + 1, true) +
        cell(`B${r}`, 64, a.name, false) +
        cell(`C${r}`, 64, a.occupation, false) +
        `</row>`
    }).join('')
    await writeList(SHEET_REFERRED, rows, data.referred.length)
  }

  // ── Monitoring Form No. 4 — Applicants Placed (4 cols) ──
  {
    const rows = data.placed.map((a, i) => {
      const r = 10 + i
      return `<row r="${r}" spans="1:26">` +
        cell(`A${r}`, 36, i + 1, true) +
        cell(`B${r}`, 86, a.name, false) +
        cell(`C${r}`, 86, a.placedAs, false) +
        cell(`D${r}`, 86, a.sex, false) +
        `</row>`
    }).join('')
    await writeList(SHEET_PLACED, rows, data.placed.length)
  }

  const out = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
  const url = URL.createObjectURL(out)
  const link = document.createElement('a')
  link.href = url
  link.download = `PESO LMI Report - ${periodLabel}.xlsx`
  link.click()
  URL.revokeObjectURL(url)
}
