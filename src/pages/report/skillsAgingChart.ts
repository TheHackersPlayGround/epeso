// Grafts native bar+pie charts (not static images) into an ExcelJS workbook by
// splicing retargeted chart XML from general_peso_template.xlsx at the OOXML level.
import JSZip from 'jszip'
import {
  retargetChartRef, setStrCache, setNumCache, setPieColors, setPieShowPercent, setChartTitle, makeStackedBySexBarChart, addLegend,
} from './xlsxChartPatch'

const templateUrl = new URL('./general_peso_template.xlsx', import.meta.url).href

const TEMPLATE_PARTS = {
  chart1: 'xl/charts/chart1.xml',
  chart2: 'xl/charts/chart2.xml',
  chart1Rels: 'xl/charts/_rels/chart1.xml.rels',
  chartStyle: 'xl/charts/style1.xml',
  chartColors: 'xl/charts/colors1.xml',
  drawing: 'xl/drawings/drawing1.xml',
  drawingRels: 'xl/drawings/_rels/drawing1.xml.rels',
} as const

// The template's own cell references, what every retarget starts from.
const TEMPLATE_SERIES_REF = 'ChartData!$B$1'
const TEMPLATE_CAT_REF = 'ChartData!$A$2:$A$8'
const TEMPLATE_VAL_REF = 'ChartData!$B$2:$B$8'

// Replaces the Nth anchor block's position with cell-aligned coordinates.
function setAnchorPosition(drawingXml: string, anchorIndex: number, from: { col: number; row: number }, to: { col: number; row: number }): string {
  const marker = '<xdr:twoCellAnchor>'
  const parts = drawingXml.split(marker)
  const target = parts[anchorIndex + 1] // parts[0] is everything before the first anchor
  if (target === undefined) throw new Error(`skillsAgingChart: drawing has no anchor at index ${anchorIndex}`)
  const replaced = target.replace(
    /<xdr:from>.*?<\/xdr:from><xdr:to>.*?<\/xdr:to>/s,
    () => `<xdr:from><xdr:col>${from.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${from.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>`
      + `<xdr:to><xdr:col>${to.col}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${to.row}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>`,
  )
  parts[anchorIndex + 1] = replaced
  return parts.join(marker)
}

// Resolves a sheet name to its worksheet file path.
async function findSheetPath(mainZip: JSZip, sheetName: string): Promise<string> {
  const workbookXml = await mainZip.file('xl/workbook.xml')!.async('string')
  const sheetTag = (workbookXml.match(/<sheet\b[^>]*\/>/g) || []).find(t => t.includes(`name="${sheetName}"`))
  if (!sheetTag) throw new Error(`skillsAgingChart: sheet "${sheetName}" not found in workbook.xml`)
  const relId = sheetTag.match(/r:id="([^"]+)"/)?.[1]
  if (!relId) throw new Error(`skillsAgingChart: sheet "${sheetName}" has no r:id`)

  const relsXml = await mainZip.file('xl/_rels/workbook.xml.rels')!.async('string')
  const relTag = (relsXml.match(/<Relationship\b[^>]*\/>/g) || []).find(t => t.includes(`Id="${relId}"`))
  const target = relTag?.match(/Target="([^"]+)"/)?.[1]
  if (!target) throw new Error(`skillsAgingChart: relationship ${relId} not found for sheet "${sheetName}"`)
  return `xl/${target}` // Target is relative to xl/
}

export type AgingChartOptions = {
  sheetName: string // the worksheet both source tables live on
  // 1-indexed row where all text content on the sheet ends, so the charts
  // are positioned below every appended table, not just the pie/sex tables.
  contentEndRow: number
  categories: string[] // bucket labels in order
  // The "BENEFICIARIES BY STATUS" table, feeds the pie chart.
  pie: {
    seriesNameRow: number // 1-indexed row holding the column-B header cell
    categoryStartRow: number // 1-indexed row where the first bucket row begins
    values: number[] // total per bucket, matching `categories`
    colorMap: Record<string, string> // bucket name -> hex color
  }
  // The "BENEFICIARIES BY STATUS AND SEX" table, feeds the stacked bar chart.
  sexBar: {
    categoryStartRow: number // 1-indexed row where the first bucket row begins (col A = bucket, B = male, C = female)
    maleValues: number[]
    femaleValues: number[]
    maleColor: string
    femaleColor: string
  }
}

// Grafts two native Excel charts into an ExcelJS-built workbook buffer and
// returns the resulting Blob.
export async function graftAgingCharts(mainBuffer: ArrayBuffer, opts: AgingChartOptions): Promise<Blob> {
  const { sheetName, categories } = opts
  const lastCategoryRow = opts.pie.categoryStartRow + categories.length - 1
  const pieSeriesRef = `${sheetName}!$B$${opts.pie.seriesNameRow}`
  const pieCatRef = `${sheetName}!$A$${opts.pie.categoryStartRow}:$A$${lastCategoryRow}`
  const pieValRef = `${sheetName}!$B$${opts.pie.categoryStartRow}:$B$${lastCategoryRow}`

  const sexLastRow = opts.sexBar.categoryStartRow + categories.length - 1
  const sexCatRef = `${sheetName}!$A$${opts.sexBar.categoryStartRow}:$A$${sexLastRow}`
  const maleValRef = `${sheetName}!$B$${opts.sexBar.categoryStartRow}:$B$${sexLastRow}`
  const femaleValRef = `${sheetName}!$C$${opts.sexBar.categoryStartRow}:$C$${sexLastRow}`

  const [templateBuf, mainZip] = await Promise.all([
    fetch(templateUrl).then(r => r.arrayBuffer()),
    JSZip.loadAsync(mainBuffer),
  ])
  const templateZip = await JSZip.loadAsync(templateBuf)

  if (mainZip.file(TEMPLATE_PARTS.drawing)) {
    throw new Error('skillsAgingChart: workbook already has a drawing at the expected path, refusing to overwrite it')
  }

  const readTemplatePart = (path: string) => templateZip.file(path)!.async('string')

  // ── Bar: stacked by sex, pointed at the sex-breakdown table ──
  let bar = makeStackedBySexBarChart(await readTemplatePart(TEMPLATE_PARTS.chart1), {
    catRef: sexCatRef,
    categories,
    maleValRef,
    femaleValRef,
    maleValues: opts.sexBar.maleValues,
    femaleValues: opts.sexBar.femaleValues,
    maleColor: opts.sexBar.maleColor,
    femaleColor: opts.sexBar.femaleColor,
  })
  bar = setChartTitle(bar, 'Breakdown per Aging Status')
  // Template's bar chart was single-series with no legend -- now that it has
  // two series (Male/Female), a legend is needed to tell them apart.
  bar = addLegend(bar)

  // ── Pie: single-series, pointed at the total-per-bucket table ──
  let pie = retargetChartRef(await readTemplatePart(TEMPLATE_PARTS.chart2), TEMPLATE_SERIES_REF, pieSeriesRef)
  pie = retargetChartRef(pie, TEMPLATE_CAT_REF, pieCatRef)
  pie = retargetChartRef(pie, TEMPLATE_VAL_REF, pieValRef)
  pie = setStrCache(pie, categories)
  pie = setNumCache(pie, opts.pie.values)
  pie = setPieColors(pie, categories, opts.pie.colorMap)
  pie = setPieShowPercent(pie, opts.pie.values)
  pie = setChartTitle(pie, 'Status Distribution')

  // ── Reposition the two charts: stacked full-width below the tables, not
  // side-by-side in the template's own narrower two-column layout ──
  let drawing = await readTemplatePart(TEMPLATE_PARTS.drawing)
  const barFromRow = opts.contentEndRow + 1 // 0-indexed row two below the sheet's actual last text row
  const barToRow = barFromRow + 15
  const pieFromRow = barToRow + 2
  const pieToRow = pieFromRow + 15
  drawing = setAnchorPosition(drawing, 0, { col: 0, row: barFromRow }, { col: 9, row: barToRow })
  drawing = setAnchorPosition(drawing, 1, { col: 0, row: pieFromRow }, { col: 9, row: pieToRow })

  // ── Copy the (patched) chart parts and their supporting files as-is ──
  mainZip.file(TEMPLATE_PARTS.chart1, bar)
  mainZip.file(TEMPLATE_PARTS.chart2, pie)
  mainZip.file(TEMPLATE_PARTS.chartStyle, await readTemplatePart(TEMPLATE_PARTS.chartStyle))
  mainZip.file(TEMPLATE_PARTS.chartColors, await readTemplatePart(TEMPLATE_PARTS.chartColors))
  mainZip.file(TEMPLATE_PARTS.chart1Rels, await readTemplatePart(TEMPLATE_PARTS.chart1Rels))
  mainZip.file(TEMPLATE_PARTS.drawing, drawing)
  mainZip.file(TEMPLATE_PARTS.drawingRels, await readTemplatePart(TEMPLATE_PARTS.drawingRels))

  // ── Wire the drawing onto the target worksheet ──
  const sheetPath = await findSheetPath(mainZip, sheetName)
  let sheetXml = await mainZip.file(sheetPath)!.async('string')
  if (sheetXml.includes('<drawing ')) throw new Error(`skillsAgingChart: sheet "${sheetName}" already has a <drawing> element`)
  sheetXml = sheetXml.replace('</worksheet>', '<drawing r:id="rId1"/></worksheet>')
  mainZip.file(sheetPath, sheetXml)

  const sheetFileName = sheetPath.split('/').pop()
  const sheetRelsPath = `xl/worksheets/_rels/${sheetFileName}.rels`
  // A plain data-only worksheet built by ExcelJS has no rels file of its own yet.
  mainZip.file(
    sheetRelsPath,
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>'
    + '</Relationships>',
  )

  // ── Declare the new parts in [Content_Types].xml ──
  let contentTypes = await mainZip.file('[Content_Types].xml')!.async('string')
  const overrides =
    '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'
    + '<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>'
    + '<Override PartName="/xl/charts/style1.xml" ContentType="application/vnd.ms-office.chartstyle+xml"/>'
    + '<Override PartName="/xl/charts/colors1.xml" ContentType="application/vnd.ms-office.chartcolorstyle+xml"/>'
    + '<Override PartName="/xl/charts/chart2.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>'
  contentTypes = contentTypes.replace('</Types>', `${overrides}</Types>`)
  mainZip.file('[Content_Types].xml', contentTypes)

  return mainZip.generateAsync({ type: 'blob', compression: 'DEFLATE' })
}
