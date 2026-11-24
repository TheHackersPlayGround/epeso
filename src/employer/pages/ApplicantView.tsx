// An applicant's profile for the employer: one resume-style page (name, contact, attached documents, work experience, education,
// training, eligibility / license, languages, other skills). It shows only what an employer needs to decide on an interview; the
// server never sends the rest (birth date, religion, civil status, height, TIN, disability, 4Ps, OFW details, job preference, the
// PESO-internal sections). It can be printed or saved as a PDF.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { ArrowLeft, Download, Eye, FileText, Loader2, Printer, X } from 'lucide-react'
import { documentUrl, getApplicant, type ApplicantContext, type ApplicantRecord, type SharedDocument } from '../api'
import { Badge } from '../components/ui'
import { btnBack, btnPrimary, errText, fmtDate } from '../lib'

type Row = Record<string, string>

// The data comes from a loosely typed JSON object, so read it defensively.
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '')
const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])
const obj = (v: unknown): Row => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Row) : {})

// One card of the page. Cards do not split across printed pages.
function Section({ title, children, hideOnPrint = false }: { title: string; children: ReactNode; hideOnPrint?: boolean }) {
  return (
    <section className={`bg-white rounded-xl shadow-md p-5 mb-4 max-sm:p-4 print:shadow-none print:border print:border-gray-300 print:break-inside-avoid ${hideOnPrint ? 'print:hidden' : ''}`}>
      <h2 className="m-0 mb-3 text-xs font-semibold uppercase tracking-wider text-brand-blue flex items-center gap-2">
        {title}<span className="flex-1 h-px bg-gray-200" />
      </h2>
      {children}
    </section>
  )
}

// A table in the portal's blue-header style (light header with a line when printed, so it needs no background ink).
function Table({ head, centered = [], children }: { head: string[]; centered?: number[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm text-left">
        <thead>
          <tr className="bg-brand-blue">
            {head.map((h, i) => (
              <th key={h} className={`px-3 py-2 font-semibold whitespace-nowrap text-white first:rounded-tl-lg last:rounded-tr-lg print:text-gray-900 print:bg-gray-100 print:border-b print:border-gray-400 ${centered.includes(i) ? 'text-center' : 'text-left'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}
const TD = 'px-3 py-2 border-b border-gray-100 align-top text-gray-700'

// A check mark for "yes"; the words are there for screen readers.
function Mark({ on, label }: { on: boolean; label: string }) {
  return (
    <td className="px-3 py-2 border-b border-gray-100 text-center">
      {on ? <><span aria-hidden="true" className="text-green-600 font-bold">✓</span><span className="sr-only">{label}: yes</span></> : <span className="sr-only">{label}: no</span>}
    </td>
  )
}

function Fact({ label, value }: { label: string; value: string }) {
  if (!value) return null
  return (
    <div className="min-w-0">
      <p className="m-0 text-[11px] uppercase tracking-wide text-gray-500">{label}</p>
      <p className="m-0 text-sm font-medium text-gray-800 break-words">{value}</p>
    </div>
  )
}

// One entry of the resume-style sections: a bold line with a left bar, and a small line beneath (left out when empty).
function Entry({ title, detail }: { title: string; detail?: string }) {
  return (
    <div className="border-l-4 border-brand-blue pl-3 mb-3 last:mb-0 print:break-inside-avoid">
      <p className="m-0 text-base font-semibold text-gray-800 break-words">{title}</p>
      {detail && <p className="m-0 text-sm text-gray-600 break-words">{detail}</p>}
    </div>
  )
}

// The graduation part of one school level. Only what the PESO staff actually recorded is shown: the staff form starts every
// "Graduated?" answer at No, so a bare "No" can just mean "not filled in" and is never shown as "Undergraduate" on its own.
//   a graduation year          -> the year
//   marked graduated, no year  -> "Graduated"
//   a level reached / the year last attended was typed -> "Undergraduate, reached 3rd year, last attended 2020"
//   nothing recorded           -> empty (nothing is printed)
function educationResult(o: Row): string {
  if (str(o.yearGraduated)) return str(o.yearGraduated)
  if (o.graduated === 'Yes') return 'Graduated'
  const bits = [str(o.levelReached) && `reached ${str(o.levelReached)}`, str(o.yearLastAttended) && `last attended ${str(o.yearLastAttended)}`].filter(Boolean)
  return bits.length ? `Undergraduate, ${bits.join(', ')}` : ''
}

// The education entries, most advanced level first (like a resume). A level the applicant left empty is skipped.
function educationEntries(d: Record<string, unknown>) {
  const entries: { title: string; detail: string }[] = []
  const add = (level: string, o: Row, course = '') => {
    const school = str(o.schoolName)
    if (!school && !course) return
    entries.push({ title: school || level, detail: [school ? level : '', course, educationResult(o)].filter(Boolean).join(' · ') })
  }
  const sec = obj(d.secondary)
  add('Elementary', obj(d.elementary))
  add('Secondary', sec, sec.type === 'K-12' && str(sec.seniorHighStrand) ? `Senior High: ${str(sec.seniorHighStrand)}` : '')
  add('Tertiary', obj(d.tertiary), str(obj(d.tertiary).course))
  list<Row>(d.graduateStudies).forEach((g, i) => add(`Graduate studies${i ? ` #${i + 1}` : ''}`, g, str(g.course)))
  return entries.reverse()
}

// "120 hours · Certificate: NC II · Skills: forklift operation", leaving out whatever was not filled in.
function trainingDetail(t: Row): string {
  const hours = str(t.hoursOfTraining)
  const cert = str(t.certificateReceived)
  const certText = !cert || /^(no|n\/a|none)$/i.test(cert) ? '' : /^yes$/i.test(cert) ? 'Certificate received' : `Certificate: ${cert}`
  const skills = str(t.skillsAcquired)
  return [hours && `${hours} hour${hours === '1' ? '' : 's'}`, certText, skills && `Skills: ${skills.toLowerCase()}`].filter(Boolean).join(' · ')
}

function ApplicantDetails({ rec, context, backLabel, onClose }: { rec: ApplicantRecord; context?: ApplicantContext; backLabel: string; onClose: () => void }) {
  const [previewDoc, setPreviewDoc] = useState<SharedDocument | null>(null)
  const d = rec.data
  const documents = rec.documents ?? []

  const name = str(d.surname) && str(d.firstName)
    ? `${str(d.surname)}, ${str(d.firstName)}${str(d.middleInitial) ? ` ${str(d.middleInitial)}` : ''}${str(d.suffix) ? ` ${str(d.suffix)}` : ''}`
    : rec.name
  const about = [str(d.sex), typeof d.age === 'number' && d.age > 0 ? `${d.age} years old` : ''].filter(Boolean).join(' · ')
  const address = [str(d.houseNo), str(d.barangay) && `Brgy. ${str(d.barangay)}`, str(d.municipality), str(d.province)].filter(Boolean).join(', ')

  const work = list<Row>(d.workExperiences).filter(w => str(w.position) || str(w.companyName))
  const education = educationEntries(d)
  const training = list<Row>(d.trainings).filter(t => str(t.course))
  const credentials = [
    ...list<Row>(d.eligibilities).filter(e => str(e.eligibility)).map(e => ({ name: str(e.eligibility), kind: 'Eligibility', when: str(e.dateTaken) ? `Taken ${fmtDate(str(e.dateTaken))}` : '' })),
    ...list<Row>(d.professionalLicenses).filter(l => str(l.license)).map(l => ({ name: str(l.license), kind: 'License', when: str(l.validUntil) ? `Valid until ${fmtDate(str(l.validUntil))}` : '' })),
  ]
  const languages = list<{ language: string; read: boolean; write: boolean; speak: boolean; understand: boolean }>(d.languages).filter(l => str(l.language))
  const specify = Array.isArray(d.otherSkillsSpecify) ? (d.otherSkillsSpecify as unknown[]) : d.otherSkillsSpecify ? [d.otherSkillsSpecify] : []
  const skills = [...list<string>(d.otherSkills).filter(s => s !== 'OTHERS'), ...specify.map(str)].filter(Boolean)

  const fmtSize = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
  // The browser names a saved PDF after the page title, so use the applicant's name for a moment.
  function printProfile() {
    const previous = document.title
    document.title = `${name} - applicant profile`
    window.print()
    document.title = previous
  }

  return (
    <>
      {previewDoc && <DocumentPreview doc={previewDoc} onClose={() => setPreviewDoc(null)} />}
      <div className="max-w-5xl">
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap print:hidden">
          <button type="button" onClick={onClose} className={btnBack}><ArrowLeft size={16} />{backLabel}</button>
          <button type="button" onClick={printProfile} className={btnPrimary}><Printer size={16} />Print profile</button>
        </div>

        {/* Who this is */}
        <section className="bg-white rounded-xl shadow-md p-5 mb-4 max-sm:p-4 print:shadow-none print:border print:border-gray-300 print:break-inside-avoid">
          <h1 className="m-0 text-xl font-bold text-gray-800 leading-tight break-words">{name}</h1>
          {about && <p className="m-0 mt-1 text-sm font-medium text-gray-700">{about}</p>}
          {context && (
            <p className="m-0 mt-1 text-sm text-gray-500 flex items-center gap-2 flex-wrap">
              <span>
                {context.hiredAs
                  ? <>Hired as <b className="text-gray-700">{context.hiredAs}</b> · now <b className="text-gray-700">{context.jobTitle}</b></>
                  : <>{context.verb} for <b className="text-gray-700">{context.jobTitle ?? 'a job opening'}</b></>}
                {context.date ? ` · ${fmtDate(context.date)}` : ''}
              </span>
              <Badge value={context.status} />
            </p>
          )}
          <div className="flex flex-wrap gap-x-10 gap-y-3 mt-4">
            <Fact label="Contact number" value={str(d.contactNumber)} />
            <Fact label="Email" value={str(d.email)} />
            <Fact label="Address" value={address} />
          </div>
        </section>

        {/* The documents the PESO chose to send for this application (not part of the printed profile) */}
        <Section title="Attached documents" hideOnPrint>
          {documents.length === 0 ? (
            <p className="m-0 text-sm text-gray-400 italic">The PESO has not sent any documents for this application.</p>
          ) : (
            <ul className="m-0 p-0 list-none space-y-2">
              {documents.map(doc => (
                <li key={doc.id} className="flex items-center justify-between gap-3 p-3 border border-gray-200 rounded-lg max-sm:flex-col max-sm:items-stretch">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center"><FileText size={20} className="text-brand-blue" /></div>
                    <div className="min-w-0">
                      <span className="inline-block px-2 py-0.5 bg-brand-blue text-white text-xs rounded font-medium print:bg-transparent print:text-gray-800 print:px-0">{doc.label}</span>
                      <p className="m-0 text-sm text-gray-800 truncate mt-1">{doc.fileName}</p>
                      <p className="m-0 text-xs text-gray-500">{fmtSize(doc.fileSize)}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 print:hidden">
                    {(doc.previewable || /\.docx$/i.test(doc.fileName)) && (
                      <button type="button" onClick={() => setPreviewDoc(doc)} className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-xs font-medium inline-flex items-center gap-1.5"><Eye size={14} />View</button>
                    )}
                    <a href={documentUrl(doc.id, true)} className="px-3 py-1.5 bg-brand-blue text-white rounded-lg hover:bg-brand-blue-dark text-xs font-medium inline-flex items-center gap-1.5"><Download size={14} />Download</a>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        {work.length > 0 && (
          <Section title="Work experience">
            {work.map((w, i) => {
              const months = str(w.numberOfMonths)
              return <Entry key={i} title={[str(w.position), str(w.companyName)].filter(Boolean).join(' — ')} detail={[str(w.companyCity), months && `${months} month${months === '1' ? '' : 's'}`, str(w.status)].filter(Boolean).join(' · ')} />
            })}
          </Section>
        )}

        {education.length > 0 && (
          <Section title="Educational background">
            {education.map((e, i) => <Entry key={i} title={e.title} detail={e.detail} />)}
          </Section>
        )}

        {training.length > 0 && (
          <Section title="Technical / vocational training">
            {training.map((t, i) => <Entry key={i} title={[str(t.course), str(t.institution)].filter(Boolean).join(' — ')} detail={trainingDetail(t)} />)}
          </Section>
        )}

        {/* Eligibility / license and Languages sit side by side when both exist */}
        <div className={credentials.length > 0 && languages.length > 0 ? 'grid grid-cols-2 gap-x-4 max-lg:grid-cols-1 print:grid-cols-2' : ''}>
        {credentials.length > 0 && (
          <Section title="Eligibility / professional license">
            {credentials.map((c, i) => <Entry key={i} title={c.name} detail={[c.kind, c.when].filter(Boolean).join(' · ')} />)}
          </Section>
        )}

        {languages.length > 0 && (
          <Section title="Languages">
            <Table head={['Language', 'Read', 'Write', 'Speak', 'Understand']} centered={[1, 2, 3, 4]}>
              {languages.map((l, i) => (
                <tr key={i}><td className={TD}>{l.language}</td><Mark on={!!l.read} label="Read" /><Mark on={!!l.write} label="Write" /><Mark on={!!l.speak} label="Speak" /><Mark on={!!l.understand} label="Understand" /></tr>
              ))}
            </Table>
          </Section>
        )}
        </div>

        {skills.length > 0 && (
          <Section title="Other skills">
            <div className="flex flex-wrap gap-2">
              {skills.map((s, i) => <span key={i} className="px-3 py-1 rounded-full bg-blue-50 text-blue-800 text-xs capitalize print:bg-transparent print:border print:border-gray-300">{s.toLowerCase()}</span>)}
            </div>
          </Section>
        )}

        <p className="text-xs text-gray-500 text-center mt-2 mb-0">Confidential: this information is shared with you for hiring purposes only. Opening an applicant or downloading a document is recorded.</p>
      </div>
    </>
  )
}

// Opens a shared document inside the page, styled like the staff Documents preview: PDFs and images in a dark viewer, Word (.docx) as a page.
// The file is fetched through the portal (checked and logged as a view); nothing opens in another tab.
function DocumentPreview({ doc, onClose }: { doc: SharedDocument; onClose: () => void }) {
  const isWord = /\.docx$/i.test(doc.fileName);
  const isPdf = /\.pdf$/i.test(doc.fileName);
  const ref = useRef<HTMLDivElement>(null);
  const [blobUrl, setBlobUrl] = useState('');
  const [state, setState] = useState<'loading' | 'ok' | 'failed'>('loading');
  useEffect(() => {
    let alive = true;
    let url = '';
    (async () => {
      try {
        const res = await fetch(documentUrl(doc.id, false, isWord), { credentials: 'include' });
        if (!res.ok) throw new Error('fetch');
        const blob = await res.blob();
        if (!alive) return;
        if (isWord) {
          const { renderAsync } = await import('docx-preview');
          if (!alive || !ref.current) return;
          ref.current.innerHTML = '';
          await renderAsync(blob, ref.current, undefined, { inWrapper: true, breakPages: true, ignoreFonts: false, experimental: true, trimXmlDeclaration: true });
        } else {
          url = URL.createObjectURL(blob);
          setBlobUrl(url);
        }
        if (alive) setState('ok');
      } catch {
        if (alive) setState('failed');
      }
    })();
    return () => { alive = false; if (url) URL.revokeObjectURL(url); };
  }, [doc.id, isWord]);

  const status = state === 'loading'
    ? <p className="text-sm text-gray-400 text-center py-8 m-0 flex items-center justify-center gap-2"><Loader2 size={16} className="animate-spin" />Loading…</p>
    : state === 'failed'
      ? <p className="text-sm text-red-500 text-center py-8 m-0">Unable to preview this document. Please download it to view.</p>
      : null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9000] p-4 print:hidden" role="dialog" aria-label={doc.fileName}>
      <style>{`.docx-view .docx-wrapper { background: transparent; padding: 0; align-items: flex-start; } .docx-view .docx-wrapper > section.docx { box-shadow: 0 2px 8px rgba(0,0,0,.4); margin: 0 auto 20px; }`}</style>
      <div className={`relative w-full flex flex-col ${isPdf || isWord ? 'max-w-[95vw] h-[95vh]' : 'max-w-4xl max-h-[90vh]'}`}>
        <div className="flex items-center justify-between bg-white rounded-t-xl px-6 py-4 flex-shrink-0">
          <p className="text-gray-800 font-semibold text-base truncate pr-4 m-0">{doc.fileName}</p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a href={documentUrl(doc.id, true)} className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 text-sm"><Download size={16} />Download</a>
            <button type="button" onClick={onClose} aria-label="Close" className="p-2 hover:bg-gray-100 rounded-lg"><X size={20} className="text-gray-600" /></button>
          </div>
        </div>
        <div className={`flex-1 overflow-auto bg-gray-900 rounded-b-xl p-4 ${isWord ? '' : 'flex items-center justify-center'}`}>
          {status && <div className="text-white">{status}</div>}
          {isWord && <div ref={ref} className="docx-view" />}
          {state === 'ok' && blobUrl && (isPdf
            ? <embed src={blobUrl} type="application/pdf" className="w-full h-full rounded bg-white" />
            : <img src={blobUrl} alt={doc.fileName} className="max-w-full max-h-[70vh] object-contain rounded shadow-lg" />)}
        </div>
      </div>
    </div>
  );
}

// Loads one applicant (the server only answers for people referred to / hired by your company) and shows the profile.
export default function ApplicantView({ id, context, backLabel = 'Back', onClose }: { id: number; context?: ApplicantContext; backLabel?: string; onClose: () => void }) {
  const [rec, setRec] = useState<ApplicantRecord | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    getApplicant(id)
      .then(r => { if (alive) setRec(r) })
      .catch(e => { if (alive) setError(errText(e, 'Could not open this applicant.')) })
    return () => { alive = false }
  }, [id])

  if (error) {
    return (
      <div className="bg-white rounded-xl shadow-md p-8 text-center">
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button type="button" onClick={onClose} className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Back</button>
      </div>
    )
  }
  if (!rec) return <div className="bg-white rounded-xl shadow-md py-20 flex items-center justify-center gap-2 text-sm text-gray-400"><Loader2 size={18} className="animate-spin" />Loading…</div>
  return <ApplicantDetails rec={rec} context={context} backLabel={backLabel} onClose={onClose} />
}
