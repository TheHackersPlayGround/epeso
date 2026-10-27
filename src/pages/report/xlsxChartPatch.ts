// Low-level OOXML chart-XML helpers shared by every native-chart export (swap a
// range, rebuild a cache, recolor a fill) -- edits existing chart XML, never builds one from scratch.

// Escapes a value for safe use inside XML text.
export const xmlEsc = (s: unknown): string =>
  String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Replaces one cell's value in a worksheet XML, preserving its style.
export function setCell(xml: string, ref: string, value: string | number, isNumber: boolean): string {
  const re = new RegExp(`<c r="${ref}"([^>]*?)(?:/>|>.*?</c>)`, 's')
  if (!re.test(xml)) throw new Error(`Template: cell ${ref} not found`)
  const inner = isNumber
    ? `><v>${value}</v></c>`
    : ` t="inlineStr"><is><t xml:space="preserve">${xmlEsc(value)}</t></is></c>`
  return xml.replace(re, (_m, attrs: string) => `<c r="${ref}"${attrs.replace(/\s*t="[^"]*"/, '')}${inner}`)
}

// Replaces every occurrence of `fromRef` with `toRef` in a chart's cell references.
export function retargetChartRef(chartXml: string, fromRef: string, toRef: string): string {
  return chartXml.split(fromRef).join(toRef)
}

// Rebuilds the category-label cache to match N points.
export function setStrCache(chartXml: string, values: string[]): string {
  return chartXml.replace(/(<c:cat><c:strRef><c:f>[^<]*<\/c:f><c:strCache>).*?(<\/c:strCache>)/s, (_m, pre: string, post: string) => {
    const pts = values.map((v, i) => `<c:pt idx="${i}"><c:v>${xmlEsc(v)}</c:v></c:pt>`).join('')
    return `${pre}<c:ptCount val="${values.length}"/>${pts}${post}`
  })
}

// Rebuilds the value cache to match N points.
export function setNumCache(chartXml: string, values: number[]): string {
  return chartXml.replace(/(<c:val><c:numRef><c:f>[^<]*<\/c:f><c:numCache>)(.*?)(<\/c:numCache>)/s, (_m, pre: string, body: string, post: string) => {
    const fmt = (body.match(/<c:formatCode>.*?<\/c:formatCode>/) || ['<c:formatCode>General</c:formatCode>'])[0]
    const pts = values.map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join('')
    return `${pre}${fmt}<c:ptCount val="${values.length}"/>${pts}${post}`
  })
}

// Replaces the pie's per-slice colors with explicit hex colors keyed by category name.
export function setPieColors(chartXml: string, categories: string[], colorMap: Record<string, string>, fallbackColor = '#94A3B8'): string {
  const dPts = categories
    .map((name, i) => {
      const color = (colorMap[name] || fallbackColor).replace('#', '')
      return `<c:dPt><c:idx val="${i}"/><c:bubble3D val="0"/><c:spPr><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></c:spPr></c:dPt>`
    })
    .join('')
  return chartXml.replace(/(<\/c:tx>).*?(<c:cat>)/s, `$1${dPts}$2`)
}

// Sets the bar chart's fill to an explicit hex color.
export function setBarColor(chartXml: string, color = '0077BE'): string {
  return chartXml.replace(/<a:solidFill><a:schemeClr val="accent1"\/><\/a:solidFill>/, `<a:solidFill><a:srgbClr val="${color}"/></a:solidFill>`)
}

// Shows each pie slice's percentage, suppressing labels for zero-value slices.
export function setPieShowPercent(chartXml: string, values?: number[]): string {
  const deletedLabels = (values ?? [])
    .map((v, i) => (v === 0 ? `<c:dLbl><c:idx val="${i}"/><c:delete val="1"/></c:dLbl>` : ''))
    .join('')
  return chartXml
    .replace('<c:dLbls>', () => `<c:dLbls>${deletedLabels}<c:numFmt formatCode="0.0%" sourceLinked="0"/>`)
    .replace('<c:showPercent val="0"/>', '<c:showPercent val="1"/>')
}

// Adds a plain bottom legend to the chart.
export function addLegend(chartXml: string): string {
  const legend = '<c:legend><c:legendPos val="b"/><c:overlay val="0"/><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln>'
    + '<a:effectLst/></c:spPr><c:txPr><a:bodyPr rot="0" spcFirstLastPara="1" vertOverflow="ellipsis" vert="horz" wrap="square" anchor="ctr" anchorCtr="1"/>'
    + '<a:lstStyle/><a:p><a:pPr><a:defRPr sz="900" b="0" i="0" u="none" strike="noStrike" kern="1200" baseline="0">'
    + '<a:solidFill><a:schemeClr val="tx1"><a:lumMod val="65000"/><a:lumOff val="35000"/></a:schemeClr></a:solidFill>'
    + '<a:latin typeface="+mn-lt"/><a:ea typeface="+mn-ea"/><a:cs typeface="+mn-cs"/></a:defRPr></a:pPr><a:endParaRPr lang="en-US"/></a:p></c:txPr></c:legend>'
  return chartXml.replace('</c:plotArea>', () => `</c:plotArea>${legend}`)
}

// Converts a single-series bar chart into a stacked bar chart split by sex.
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
    // Literal series name, not tied to any cell.
    s = s.replace(/<c:tx>.*?<\/c:tx>/s, () => `<c:tx><c:v>${xmlEsc(name)}</c:v></c:tx>`)
    s = s.replace(/<a:solidFill><a:srgbClr val="[0-9A-Fa-f]{6}"\/><\/a:solidFill>/, () => `<a:solidFill><a:srgbClr val="${color.replace('#', '')}"/></a:solidFill>`)
    s = s.replace(/<c:cat>.*?<\/c:cat>/s, () => catBlock)
    s = s.replace(/<c:val>.*?<\/c:val>/s, () => {
      const pts = values.map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`).join('')
      return `<c:val><c:numRef><c:f>${valRef}</c:f><c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${values.length}"/>${pts}</c:numCache></c:numRef></c:val>`
    })
    // Drop the template's extLst GUID rather than reuse it across two new series.
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

// Sets a chart's title text.
export function setChartTitle(chartXml: string, title: string): string {
  const rich = `<c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${xmlEsc(title)}</a:t></a:r></a:p></c:rich></c:tx>`
  return chartXml.replace('<c:title>', `<c:title>${rich}`)
}
