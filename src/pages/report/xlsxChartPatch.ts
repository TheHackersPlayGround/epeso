// Low-level OOXML chart-XML patching helpers, shared by every report that
// embeds a REAL native Excel chart (not a static picture) into its export --
// currently generalPesoReport.ts and skillsAgingChart.ts. Extracted so the
// intricate, easy-to-get-wrong regex work is written and gets fixed in ONE
// place, not duplicated per report.
//
// Every function here edits chart XML that real Microsoft Excel originally
// authored (see the template files' own comments) -- hand-authoring this XML
// from scratch has already been tried once (via openpyxl for an earlier
// version of this feature) and Excel's file-open validator rejected the
// result. So these functions only ever *edit* proven-valid XML in place
// (swap a cell range, rebuild a cache, recolor a fill) -- never generate a
// chart structure from nothing.

export const xmlEsc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Replace one cell's value in a worksheet XML, PRESERVING its style (s attr).
export function setCell(xml: string, ref: string, value: string | number, isNumber: boolean): string {
  const re = new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>.*?</c>)`, 's')
  if (!re.test(xml)) throw new Error(`Template: cell ${ref} not found`)
  const inner = isNumber
    ? `><v>${value}</v></c>`
    : ` t="inlineStr"><is><t xml:space="preserve">${xmlEsc(value)}</t></is></c>`
  return xml.replace(re, (_m, attrs: string) => `<c r="${ref}"${attrs.replace(/\s*t="[^"]*"/, '')}${inner}`)
}

// Replaces every occurrence of `fromRef` with `toRef` inside a chart's <c:f>
// cell references (category ref, value ref, series-name ref) -- e.g.
// retargeting "ChartData!$A$2:$A$8" to "Summary!$A$11:$A$15" after the chart
// is repointed at a different sheet/range than the one it was authored against.
export function retargetChartRef(chartXml: string, fromRef: string, toRef: string): string {
  return chartXml.split(fromRef).join(toRef)
}

// Rebuilds a <c:cat><c:strRef>'s <c:strCache> (category labels) to match
// exactly N points -- real Excel bakes these caches in (unlike a
// library-generated chart with no cache at all), so they must be kept in sync
// with the retargeted <c:f> range or the chart shows stale/mismatched
// category labels until a manual recalculation in Excel.
export function setStrCache(chartXml: string, values: string[]): string {
  return chartXml.replace(/(<c:cat><c:strRef><c:f>[^<]*<\/c:f><c:strCache>).*?(<\/c:strCache>)/s, (_m, pre: string, post: string) => {
    const pts = values.map((v, i) => `<c:pt idx="${i}"><c:v>${xmlEsc(v)}</c:v></c:pt>`).join('')
    return `${pre}<c:ptCount val="${values.length}"/>${pts}${post}`
  })
}

// Same idea as setStrCache, for the <c:val><c:numRef>'s <c:numCache>.
export function setNumCache(chartXml: string, values: number[]): string {
  return chartXml.replace(/(<c:val><c:numRef><c:f>[^<]*<\/c:f><c:numCache>)(.*?)(<\/c:numCache>)/s, (_m, pre: string, body: string, post: string) => {
    const fmt = (body.match(/<c:formatCode>.*?<\/c:formatCode>/) || ['<c:formatCode>General</c:formatCode>'])[0]
    const pts = values.map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join('')
    return `${pre}${fmt}<c:ptCount val="${values.length}"/>${pts}${post}`
  })
}

// A plain pie chart's series carries one <c:dPt> per category (Excel's own
// default "vary colors by point"), using THEME colors that vary by slice
// POSITION, not identity -- so the same category wouldn't reliably get the
// same color across different selections/runs. Replaces the whole <c:dPt>
// list (whatever it currently contains) with one explicit-hex <c:dPt> per
// category, keyed by name via colorMap (falling back to fallbackColor for any
// unrecognized name).
export function setPieColors(chartXml: string, categories: string[], colorMap: Record<string, string>, fallbackColor = '#94A3B8'): string {
  const dPts = categories
    .map((name, i) => {
      const color = (colorMap[name] || fallbackColor).replace('#', '')
      return `<c:dPt><c:idx val="${i}"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></c:spPr></c:dPt>`
    })
    .join('')
  return chartXml.replace(/(<\/c:tx>).*?(<c:cat>)/s, `$1${dPts}$2`)
}

// The bar chart's single series fill defaults to the theme's accent1 -- force
// it to an explicit hex color (the app's brand blue, by default).
export function setBarColor(chartXml: string, color = '0077BE'): string {
  return chartXml.replace(/<a:solidFill><a:schemeClr val="accent1"\/><\/a:solidFill>/, `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>`)
}

// The pie chart's <c:dLbls> block (written by real Excel, all show* flags off
// by default) already has a <c:showPercent val="0"/> -- flip it on so each
// slice shows its share of the total, rather than authoring new label XML by
// hand. A <c:numFmt> is also inserted (schema requires it, if present, before
// the show* flags) so Excel prints one decimal place (31.6%) instead of its
// default whole-number rounding.
export function setPieShowPercent(chartXml: string): string {
  return chartXml
    .replace('<c:dLbls>', '<c:dLbls><c:numFmt formatCode="0.0%" sourceLinked="0"/>')
    .replace('<c:showPercent val="0"/>', '<c:showPercent val="1"/>')
}

// A plain bottom legend -- the exact XML the template's pie chart already
// carries (real Excel-authored, proven valid), copied verbatim rather than
// authored from scratch. The template's bar chart has none (a single series
// doesn't need one to identify itself), but once it's converted to a
// multi-series stacked bar, a legend is what tells the reader which color
// means "Male" vs. "Female" -- inserted as CT_Chart's `legend` element,
// which comes right after `plotArea` in the schema. Each series' own name
// (set via <c:tx> in makeStackedBySexBarChart) is what the legend displays,
// so no separate label text needs to be passed in here.
export function addLegend(chartXml: string): string {
  const legend = '<c:legend><c:legendPos val="b"/><c:overlay val="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln>'
    + '<a:effectLst/></c:spPr><c:txPr><a:bodyPr rot="0" spcFirstLastPara="1" vertOverflow="ellipsis" vert="horz" wrap="square" anchor="ctr" anchorCtr="1"/>'
    + '<a:lstStyle/><a:p><a:pPr><a:defRPr sz="900" b="0" i="0" u="none" strike="noStrike" kern="1200" baseline="0">'
    + '<a:solidFill><a:schemeClr val="tx1"><a:lumMod val="65000"/><a:lumOff val="35000"/></a:schemeClr></a:solidFill>'
    + '<a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:pPr><a:endParaRPr lang="en-US"/></a:p></c:txPr></c:legend>'
  return chartXml.replace('</c:plotArea>', () => `</c:plotArea>${legend}`)
}

// Converts the template's single-series clustered bar chart into a stacked
// bar chart with one series per sex, sharing the same category (bucket)
// axis -- built by cloning the template's own single <c:ser> block (already
// proven-valid XML) and swapping each clone's identity/color/data pointer,
// rather than authoring a series structure from scratch. Every replacement
// below uses a FUNCTION replacer (not a plain string) even where a capture
// group isn't needed -- the cell references being inserted (e.g.
// "Summary!$A$11:$A$15") contain literal "$" characters, and a plain-string
// replacement arg treats "$1" etc. as special substitution tokens, which a
// cell reference like "...$11..." can accidentally spell out.
export function makeStackedBySexBarChart(
  chartXml: string,
  opts: {
    catRef: string
    categories: string[]
    maleValRef: string
    femaleValRef: string
    maleValues: number[]
    femaleValues: number[]
    maleColor: string
    femaleColor: string
  },
): string {
  const serMatch = chartXml.match(/<c:ser>.*?<\/c:ser>/s)
  if (!serMatch) throw new Error('makeStackedBySexBarChart: no <c:ser> found in chart XML')
  const template = serMatch[0]

  const catBlock = (() => {
    const pts = opts.categories.map((v, i) => `<c:pt idx="${i}"><c:v>${xmlEsc(v)}</c:v></c:pt>`).join('')
    return `<c:cat><c:strRef><c:f>${opts.catRef}</c:f><c:strCache><c:ptCount val="${opts.categories.length}"/>${pts}</c:strCache></c:strRef></c:cat>`
  })()

  const buildSeries = (idx: number, name: string, valRef: string, values: number[], color: string): string => {
    let s = template
    s = s.replace(/<c:idx val="\d+"\/>/, () => `<c:idx val="${idx}"/>`)
    s = s.replace(/<c:order val="\d+"\/>/, () => `<c:order val="${idx}"/>`)
    // Literal series name -- not tied to any cell, so no header cell/cache is required for it.
    s = s.replace(/<c:tx>.*?<\/c:tx>/s, () => `<c:tx><c:v>${xmlEsc(name)}</c:v></c:tx>`)
    s = s.replace(/<a:solidFill><a:srgbClr val="[0-9A-Fa-f]{6}"\/><\/a:solidFill>/, () => `<a:solidFill><a:srgbClr val="${color.replace('#', '')}"/></a:solidFill>`)
    s = s.replace(/<c:cat>.*?<\/c:cat>/s, () => catBlock)
    s = s.replace(/<c:val>.*?<\/c:val>/s, () => {
      const pts = values.map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join('')
      return `<c:val><c:numRef><c:f>${valRef}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${values.length}"/>${pts}</c:numCache></c:numRef></c:val>`
    })
    // Drop the template series' extLst (a change-tracking GUID) -- it's
    // optional, and reusing the same GUID across two new series would be
    // worse than simply omitting it.
    s = s.replace(/<c:extLst>.*?<\/c:extLst>/s, () => '')
    return s
  }

  const maleSeries = buildSeries(0, 'Male', opts.maleValRef, opts.maleValues, opts.maleColor)
  const femaleSeries = buildSeries(1, 'Female', opts.femaleValRef, opts.femaleValues, opts.femaleColor)

  let out = chartXml.replace(/<c:ser>.*?<\/c:ser>/s, () => `${maleSeries}${femaleSeries}`)
  out = out.replace('<c:grouping val="clustered"/>', () => '<c:grouping val="stacked"/>')
  out = out.replace(/<c:overlap val="-?\d+"\/>/, () => '<c:overlap val="100"/>')
  return out
}

// The template's <c:title> has no explicit text -- Excel auto-derives the
// displayed title from the single series' name (its column-B header cell,
// e.g. "Participants"), which is accurate but generic. Giving it real text
// here overrides that auto-title with something that actually says what the
// chart shows. <c:tx> must be CT_Title's first child (schema order:
// tx?, layout?, overlay?, ...), so it's inserted right after <c:title>.
export function setChartTitle(chartXml: string, title: string): string {
  const rich = `<c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${xmlEsc(title)}</a:t></a:r></a:p></c:rich></c:tx>`
  return chartXml.replace('<c:title>', `<c:title>${rich}`)
}
