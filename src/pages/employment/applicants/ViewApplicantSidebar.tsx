import { useState } from 'react';
import { X, Eye, FileText } from 'lucide-react';
import type { Applicant } from '../../../contexts/EmploymentContext';

type Section =
  | 'personalInfo' | 'jobPreference' | 'language' | 'education'
  | 'training' | 'eligibility' | 'workExperience' | 'otherSkills'
  | 'referredProgram' | 'documents';

const SECTIONS: { id: Section; label: string }[] = [
  { id: 'personalInfo',    label: 'I. PERSONAL INFORMATION' },
  { id: 'jobPreference',   label: 'II. JOB PREFERENCE' },
  { id: 'language',        label: 'III. LANGUAGE / DIALECT PROFICIENCY' },
  { id: 'education',       label: 'IV. EDUCATIONAL BACKGROUND' },
  { id: 'training',        label: 'V. TECHNICAL/VOCATIONAL AND OTHER TRAINING' },
  { id: 'eligibility',     label: 'VI. ELIGIBILITY/PROFESSIONAL LICENSE' },
  { id: 'workExperience',  label: 'VII. WORK EXPERIENCE' },
  { id: 'otherSkills',     label: 'VIII. OTHER SKILLS ACQUIRED WITHOUT CERTIFICATE' },
  { id: 'referredProgram', label: 'IX. REFERRED PROGRAM' },
  { id: 'documents',       label: 'X. DOCUMENTS / ATTACHMENTS' },
];

const OTHER_SKILLS_LIST = [
  'AUTO MECHANIC', 'BEAUTICIAN', 'CARPENTRY WORK', 'COMPUTER LITERATE', 'DOMESTIC CHORES',
  'DRIVER', 'ELECTRICIAN', 'EMBROIDERY', 'GARDENING', 'MASONRY', 'PAINTER/ARTIST', 'PAINTING JOBS',
  'PHOTOGRAPHY', 'PLUMBING', 'SEWING DRESSES', 'STENOGRAPHY', 'TAILORING',
];

// ── Read-only field styling (grey, no focus ring) so View is clearly not editable ──
const INP = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm outline-none text-gray-900 placeholder:text-gray-500 bg-gray-50 cursor-default';
const INP_SM = 'text-black w-full px-2 py-1 border border-gray-300 rounded-lg outline-none text-sm bg-gray-50 cursor-default';
const LBL  = 'block text-gray-700 mb-2 text-xs font-semibold uppercase';
const LBL2 = 'block text-gray-600 mb-1 text-xs uppercase';

// ── Read-only text input — identical CSS as Add form, just readOnly ────────────
function TF({ label, value, lbl = LBL, cls = INP, className = '' }:
  { label?: string; value?: string | null; lbl?: string; cls?: string; className?: string }) {
  return (
    <div className={className}>
      {label && <label className={lbl}>{label}</label>}
      <input type="text" readOnly value={value ?? ''} className={cls} />
    </div>
  );
}

// ── Read-only radio — `className="mr-1"` matches Add form ────────────────────
function RR({ label, checked }: { label: string; checked: boolean }) {
  return (
    <label className="flex items-center text-sm cursor-default select-none">
      <input type="radio" readOnly checked={checked} className="mr-1 pointer-events-none" />
      <span>{label}</span>
    </label>
  );
}



// ── Section blue header ───────────────────────────────────────────────────────
function SH({ children }: { children: React.ReactNode }) {
  return <div className="bg-brand-blue text-white px-4 py-3 font-bold uppercase text-sm">{children}</div>;
}

// ── Main component ────────────────────────────────────────────────────────────
type PreviewDoc = { documentType: string; customName?: string; fileName: string; url?: string };

export default function ViewApplicantSidebar({ applicant, onClose }: { applicant: Applicant; onClose: () => void }) {
  const [activeSection, setActiveSection] = useState<Section>('personalInfo');
  const [previewDocument, setPreviewDocument] = useState<PreviewDoc | null>(null);

  const fd = (applicant.fullFormData ?? {}) as Record<string, unknown>;
  const s   = (k: string) => (fd[k] as string) ?? '';
  const sa  = (k: string): string[] => Array.isArray(fd[k]) ? (fd[k] as string[]) : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sar = (k: string): any[] => Array.isArray(fd[k]) ? (fd[k] as any[]) : [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const so  = (k: string): Record<string, any> => (fd[k] as Record<string, any>) ?? {};

  function renderSection() {
    switch (activeSection) {

      // ── I. Personal Information ──────────────────────────────────────────────
      case 'personalInfo': {
        const disability = sa('hasDisability');
        const hasDisabilityStatus = disability.length > 0 ? 'Yes' : 'No';

        return (
          <div className="space-y-6">
            <SH>I. PERSONAL INFORMATION</SH>

            {/* Name row — grid grid-cols-4 gap-4 */}
            <div className="grid grid-cols-4 gap-4">
              <TF label="Surname"     value={s('surname')} />
              <TF label="First Name"  value={s('firstName')} />
              <TF label="Middle Name" value={s('middleName')} />
              <TF label="Suffix"      value={s('suffix')} />
            </div>

            {/* DOB / Sex / Religion / Civil / Height — grid grid-cols-5 gap-4 */}
            <div className="grid grid-cols-5 gap-4">
              <TF label="Date of Birth" value={s('dateOfBirth')} />
              <TF label="Sex"           value={s('sex')} />
              <TF label="Religion"      value={s('religion')} />
              <TF label="Civil Status"  value={s('civilStatus')} />
              <TF label="Height"        value={s('height')} />
            </div>

            {/* Present Address */}
            <div>
              <label className={LBL}>Present Address</label>
              <div className="grid grid-cols-4 gap-4">
                <TF label="House No./Street"  value={s('houseNo')}      lbl={LBL2} />
                <TF label="Barangay"          value={s('barangay')}     lbl={LBL2} />
                <TF label="Municipality/City" value={s('municipality')} lbl={LBL2} />
                <TF label="Province"          value={s('province')}     lbl={LBL2} />
              </div>
            </div>

            {/* Disability + TIN/Contact/Email — grid grid-cols-2 gap-8 */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className={LBL}>Has Disability?</label>
                {/* w-32 select matching Add form's select exactly */}
                <select
                  disabled
                  value={hasDisabilityStatus}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-lg outline-none text-sm mb-3 bg-white"
                >
                  <option>Yes</option>
                  <option>No</option>
                </select>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                  {['Visual', 'Speech', 'Hearing', 'Physical', 'Other', 'Mental'].map(d => (
                    <label key={d} className={`flex items-center text-sm cursor-default select-none ${hasDisabilityStatus === 'No' ? 'opacity-50' : ''}`}>
                      <input type="checkbox" readOnly checked={disability.includes(d)} className="mr-2 pointer-events-none" />
                      <span>{d}</span>
                    </label>
                  ))}
                  {disability.includes('Other') && (
                    <div className="col-span-2">
                      <input type="text" readOnly value={s('disabilityOther')}
                        className="w-full px-3 py-1 border border-gray-300 rounded text-xs italic text-gray-900" />
                    </div>
                  )}
                </div>
              </div>

              {/* Right column: TIN + Contact + Email stacked — space-y-3 */}
              <div className="space-y-3">
                <TF label="TIN"            value={s('tin')} />
                <TF label="Contact Number" value={s('contactNumber')} />
                <TF label="Email"          value={s('email')} />
              </div>
            </div>

            {/* Employment Status / Type — read-only mirror of the Add/Edit form */}
            <div>
              <label className={LBL}>Employment Status / Type</label>
              <div className="grid grid-cols-2 gap-8">
                {/* Employed */}
                <div>
                  <div className="mb-3 text-sm font-semibold">
                    <RR label="Employed" checked={s('employmentStatus') === 'Employed'} />
                  </div>
                  <div className={`ml-6 space-y-2 ${s('employmentStatus') !== 'Employed' ? 'opacity-50' : ''}`}>
                    <RR label="Wage Employed" checked={s('employmentType') === 'Wage Employed'} />
                    <RR label="Self-employed (please specify)" checked={s('employmentType') === 'Self-employed'} />
                    <input
                      type="text"
                      readOnly
                      value={s('selfEmploymentType') === 'Others' ? (s('selfEmploymentOther') || 'Others') : s('selfEmploymentType')}
                      className={`${INP} ${s('employmentType') !== 'Self-employed' ? 'bg-gray-100 opacity-50' : ''}`}
                    />
                  </div>
                </div>

                {/* Unemployed */}
                <div>
                  <div className="mb-3 text-sm font-semibold">
                    <RR label="Unemployed" checked={s('employmentStatus') === 'Unemployed'} />
                  </div>
                  <div className={`ml-6 space-y-3 ${s('employmentStatus') !== 'Unemployed' ? 'opacity-50' : ''}`}>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">How long looking for work? (months)</label>
                      <input type="text" readOnly value={s('monthsLookingForWork')} className={INP} />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Reason</label>
                      <input
                        type="text"
                        readOnly
                        value={s('unemploymentReason') === 'Others' ? (s('unemploymentReasonOther') || 'Others') : s('unemploymentReason')}
                        className={INP}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* OFW / Former OFW — grid grid-cols-2 gap-4 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <label className="block text-gray-700 text-xs font-semibold uppercase">An OFW?</label>
                  <RR label="Yes" checked={s('isOFW') === 'Yes'} />
                  <RR label="No"  checked={s('isOFW') === 'No'} />
                </div>
                <div className={`text-xs text-gray-600 mb-1 ${s('isOFW') !== 'Yes' ? 'opacity-50' : ''}`}>Specify the country</div>
                <input type="text" readOnly value={s('ofwCountry')}
                  className={`text-black w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default outline-none text-sm ${s('isOFW') !== 'Yes' ? 'bg-gray-100 opacity-50' : ''}`} />
              </div>
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <label className="block text-gray-700 text-xs font-semibold uppercase">A former OFW?</label>
                  <RR label="Yes" checked={s('isFormerOFW') === 'Yes'} />
                  <RR label="No"  checked={s('isFormerOFW') === 'No'} />
                </div>
                <div className={`text-xs text-gray-600 mb-1 ${s('isFormerOFW') !== 'Yes' ? 'opacity-50' : ''}`}>Latest country of deployment</div>
                <input type="text" readOnly value={s('formerOFWCountry')}
                  className={`text-black w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 cursor-default outline-none text-gray-900 ${s('isFormerOFW') !== 'Yes' ? 'bg-gray-100 opacity-50' : ''}`} />
              </div>
            </div>

            {/* 4Ps / Return Date — grid grid-cols-2 gap-4 */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="flex items-center gap-4 mb-2">
                  <label className="block text-gray-700 text-xs font-semibold uppercase">A 4Ps beneficiary?</label>
                  <RR label="Yes" checked={s('is4PsBeneficiary') === 'Yes'} />
                  <RR label="No"  checked={s('is4PsBeneficiary') === 'No'} />
                </div>
                <div className={`text-xs text-gray-600 mb-1 ${s('is4PsBeneficiary') !== 'Yes' ? 'opacity-50' : ''}`}>Household ID No.</div>
                <input type="text" readOnly value={s('householdIdNo')}
                  className={`text-black w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default outline-none text-sm ${s('is4PsBeneficiary') !== 'Yes' ? 'bg-gray-100 opacity-50' : ''}`} />
              </div>
              <div>
                <label className={`block text-gray-700 mb-2 text-xs font-semibold ${s('isFormerOFW') !== 'Yes' ? 'opacity-50' : ''}`}>
                  Month and year of return to Philippines
                </label>
                <input type="text" readOnly value={s('formerOFWReturnDate')}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 cursor-default outline-none text-gray-900 ${s('isFormerOFW') !== 'Yes' ? 'bg-gray-100 opacity-50' : ''}`} />
              </div>
            </div>
          </div>
        );
      }

      // ── II. Job Preference ───────────────────────────────────────────────────
      case 'jobPreference': {
        const empType = sa('jobPrefEmploymentType');
        const workLoc = sa('jobPrefWorkLocation');
        const prefs: Array<{ occupation: string; localCity: string; overseasCountry: string }> = sar('jobPreferences');
        const rows = prefs.length > 0 ? prefs : [
          { occupation: '', localCity: '', overseasCountry: '' },
          { occupation: '', localCity: '', overseasCountry: '' },
          { occupation: '', localCity: '', overseasCountry: '' },
        ];
        return (
          <div className="space-y-4">
            <SH>II. JOB PREFERENCE</SH>
            {/* Outer div — border border-gray-300 overflow-hidden (no rounded, matching Add form) */}
            <div className="border border-gray-300 overflow-hidden">
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border border-gray-300 bg-gray-50 px-4 py-3 text-center font-bold uppercase text-xs text-gray-900" style={{ width: '38%' }}>
                      Preferred Occupation
                    </th>
                    <th className="border border-gray-300 bg-gray-50 px-4 py-3 text-center font-bold uppercase text-xs text-gray-900" colSpan={2}>
                      Preferred Work Location
                    </th>
                  </tr>
                  <tr>
                    {/* Employment type — checkboxes (not radios) with gap-6, matching Add form */}
                    <td className="border border-gray-300 px-4 py-3">
                      <div className="flex items-center gap-6">
                        {['Part-time', 'Full-time'].map(t => (
                          <label key={t} className="flex items-center gap-2 cursor-default text-sm select-none text-gray-900">
                            <input type="checkbox" readOnly checked={empType[0] === t} className="pointer-events-none" />
                            {t}
                          </label>
                        ))}
                      </div>
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <label className="flex items-center gap-2 cursor-default text-sm select-none text-gray-900">
                        <input type="checkbox" readOnly checked={workLoc[0] === 'Local'} className="pointer-events-none" />
                        Local (specify cities/municipalities)
                      </label>
                    </td>
                    <td className="border border-gray-300 px-4 py-3">
                      <label className="flex items-center gap-2 cursor-default text-sm select-none text-gray-900">
                        <input type="checkbox" readOnly checked={workLoc[0] === 'Overseas'} className="pointer-events-none" />
                        Overseas, (specify countries):
                      </label>
                    </td>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, idx) => (
                    <tr key={idx}>
                      {(['occupation', 'localCity', 'overseasCountry'] as const).map(field => (
                        <td key={field} className="border border-gray-300 px-4 py-2">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-900 text-xs flex-shrink-0">{idx + 1}.</span>
                            <input type="text" readOnly value={row[field]}
                              className="flex-1 border-0 border-b border-gray-300 outline-none text-sm text-gray-900 py-1 bg-transparent" />
                          </div>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      }

      // ── III. Language / Dialect Proficiency ──────────────────────────────────
      case 'language': {
        const langs: Array<{ language: string; read: boolean; write: boolean; speak: boolean; understand: boolean }> = sar('languages');
        const display = langs.length > 0 ? langs : [
          { language: 'ENGLISH',  read: false, write: false, speak: false, understand: false },
          { language: 'FILIPINO', read: false, write: false, speak: false, understand: false },
          { language: 'MANDARIN', read: false, write: false, speak: false, understand: false },
        ];
        return (
          <div className="space-y-6">
            <SH>III. LANGUAGE / DIALECT PROFICIENCY (check if applicable)</SH>
            <div className="border border-gray-300 rounded overflow-hidden">
              {/* Header — bg-brand-blue text-white with border-r border-white (matching Add form) */}
              <div className="grid grid-cols-5 bg-brand-blue text-white">
                <div className="px-4 py-3 border-r border-white font-bold uppercase text-xs">Language/Dialect</div>
                <div className="px-4 py-3 border-r border-white font-bold uppercase text-xs text-center">Read</div>
                <div className="px-4 py-3 border-r border-white font-bold uppercase text-xs text-center">Write</div>
                <div className="px-4 py-3 border-r border-white font-bold uppercase text-xs text-center">Speak</div>
                <div className="px-4 py-3 font-bold uppercase text-xs text-center">Understand</div>
              </div>
              {display.map((l, idx) => (
                <div key={idx} className="grid grid-cols-5 border-t border-gray-300">
                  {/* Language name cell — px-2 py-2; first 3 named rows show as <span> */}
                  <div className="px-2 py-2 border-r border-gray-300 flex items-center">
                    {l.language && idx < 3 ? (
                      <span className="font-medium text-sm px-2">{l.language}</span>
                    ) : (
                      <input type="text" readOnly value={l.language}
                        className="w-full px-2 py-1 border border-gray-300 rounded-lg outline-none text-sm text-gray-900" />
                    )}
                  </div>
                  {/* Checkbox cells — px-4 py-3 flex justify-center (matching Add form) */}
                  {([l.read, l.write, l.speak, l.understand] as boolean[]).map((v, ci) => (
                    <div key={ci} className={`px-4 py-3 flex justify-center ${ci < 3 ? 'border-r border-gray-300' : ''}`}>
                      <input type="checkbox" readOnly checked={!!v} className="pointer-events-none" />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        );
      }

      // ── IV. Educational Background ───────────────────────────────────────────
      case 'education': {
        const el  = so('elementary');
        const sec = so('secondary');
        const ter = so('tertiary');
        const grad: Array<Record<string, string>> = sar('graduateStudies');

        return (
          <div className="space-y-6">
            <SH>IV. EDUCATIONAL BACKGROUND</SH>

            <div className="flex items-center gap-4 mb-4">
              <label className="block text-gray-700 text-xs font-semibold uppercase">Currently in school?</label>
              <RR label="Yes" checked={s('currentlyInSchool') === 'Yes'} />
              <RR label="No"  checked={s('currentlyInSchool') === 'No'} />
            </div>

            {/* Elementary — title → School Name → Graduated? → 3-col grid (matching Add form) */}
            <div className="border border-gray-300 rounded p-4 space-y-3">
              <div className="font-bold text-sm uppercase">Elementary</div>
              <div className="flex items-center gap-4">
                <label className="block text-gray-700 text-xs">Graduated?</label>
                <RR label="Yes" checked={el.graduated === 'Yes'} />
                <RR label="No"  checked={el.graduated === 'No'} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <TF label="Year Graduated" value={el.yearGraduated} lbl={LBL2} />
                <div>
                  <label className={LBL2}>Level Reached</label>
                  <input type="text" readOnly value={el.levelReached ?? ''}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default outline-none text-sm ${el.graduated !== 'No' ? 'bg-gray-100' : ''}`} />
                </div>
                <div>
                  <label className={LBL2}>Year Last Attended</label>
                  <input type="text" readOnly value={el.yearLastAttended ?? ''}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default outline-none text-sm ${el.graduated !== 'No' ? 'bg-gray-100' : ''}`} />
                </div>
              </div>
            </div>

            {/* Secondary — title → type radios → K-12 strand → Graduated? → 3-col grid */}
            <div className="border border-gray-300 rounded p-4 space-y-3">
              <div className="font-bold text-sm uppercase">Secondary</div>
              <div className="flex items-center gap-4 flex-wrap">
                <RR label="Non-K12"            checked={sec.type === 'Non-K12'} />
                <RR label="K-12 (Senior High)" checked={sec.type === 'K-12'} />
              </div>
              {sec.type === 'K-12' && (
                <div>
                  <label className={LBL2}>Senior High Strand / Track</label>
                  <input type="text" readOnly value={sec.seniorHighStrand ?? ''} className={INP} />
                </div>
              )}
              <div className="flex items-center gap-4">
                <label className="block text-gray-700 text-xs">Graduated?</label>
                <RR label="Yes" checked={sec.graduated === 'Yes'} />
                <RR label="No"  checked={sec.graduated === 'No'} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <TF label="Year Graduated" value={sec.yearGraduated} lbl={LBL2} />
                <div>
                  <label className={LBL2}>Level Reached</label>
                  <input type="text" readOnly value={sec.levelReached ?? ''}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default outline-none text-sm ${sec.graduated !== 'No' ? 'bg-gray-100' : ''}`} />
                </div>
                <div>
                  <label className={LBL2}>Year Last Attended</label>
                  <input type="text" readOnly value={sec.yearLastAttended ?? ''}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default outline-none text-sm ${sec.graduated !== 'No' ? 'bg-gray-100' : ''}`} />
                </div>
              </div>
            </div>

            {/* Tertiary — title → Course → Graduated? → 3-col grid */}
            <div className="border border-gray-300 rounded p-4 space-y-3">
              <div className="font-bold text-sm uppercase">Tertiary</div>
              <div>
                <label className={LBL2}>Course / Degree</label>
                <input type="text" readOnly value={ter.course ?? ''} className={INP} />
              </div>
              <div className="flex items-center gap-4">
                <label className="block text-gray-700 text-xs">Graduated?</label>
                <RR label="Yes" checked={ter.graduated === 'Yes'} />
                <RR label="No"  checked={ter.graduated === 'No'} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <TF label="Year Graduated" value={ter.yearGraduated} lbl={LBL2} />
                <div>
                  <label className={LBL2}>Level Reached</label>
                  <input type="text" readOnly value={ter.levelReached ?? ''}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default outline-none text-sm ${ter.graduated !== 'No' ? 'bg-gray-100' : ''}`} />
                </div>
                <div>
                  <label className={LBL2}>Year Last Attended</label>
                  <input type="text" readOnly value={ter.yearLastAttended ?? ''}
                    className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default outline-none text-sm ${ter.graduated !== 'No' ? 'bg-gray-100' : ''}`} />
                </div>
              </div>
            </div>

            {/* Graduate Studies */}
            {grad.map((g, gsIdx) => (
              <div key={gsIdx} className="border border-gray-300 rounded p-4 space-y-3">
                <div className="font-bold text-sm uppercase">Graduate Studies/Post-Graduate #{gsIdx + 1}</div>
                <div>
                  <label className={LBL2}>Course / Degree</label>
                  <input type="text" readOnly value={g.course ?? ''} className={INP} />
                </div>
                <div className="flex items-center gap-4">
                  <label className="block text-gray-700 text-xs">Graduated?</label>
                  <RR label="Yes" checked={g.graduated === 'Yes'} />
                  <RR label="No"  checked={g.graduated === 'No'} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <TF label="Year Graduated" value={g.yearGraduated} lbl={LBL2} />
                  <div>
                    <label className={LBL2}>Level Reached</label>
                    <input type="text" readOnly value={g.levelReached ?? ''}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default outline-none text-sm ${g.graduated !== 'No' ? 'bg-gray-100' : ''}`} />
                  </div>
                  <div>
                    <label className={LBL2}>Year Last Attended</label>
                    <input type="text" readOnly value={g.yearLastAttended ?? ''}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default outline-none text-sm ${g.graduated !== 'No' ? 'bg-gray-100' : ''}`} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      }

      // ── V. Technical/Vocational and Other Training ───────────────────────────
      case 'training': {
        const trainings: Array<{ course: string; hoursOfTraining: string; institution: string; skillsAcquired: string; certificateReceived: string }> = sar('trainings');
        const rows = trainings.length > 0 ? trainings : [{ course:'', hoursOfTraining:'', institution:'', skillsAcquired:'', certificateReceived:'' }];
        return (
          <div className="space-y-6">
            <SH>V. TECHNICAL/VOCATIONAL AND OTHER TRAINING</SH>
            <div className="border border-gray-300 rounded overflow-hidden">
              <div className="grid grid-cols-5 bg-gray-200 text-black">
                <div className="px-3 py-2 border-r border-gray-300 font-bold uppercase text-xs">Training/Vocational Course</div>
                <div className="px-3 py-2 border-r border-gray-300 font-bold uppercase text-xs">Hours of Training</div>
                <div className="px-3 py-2 border-r border-gray-300 font-bold uppercase text-xs">Training Institution</div>
                <div className="px-3 py-2 border-r border-gray-300 font-bold uppercase text-xs">Skills Acquired</div>
                <div className="px-3 py-2 font-bold uppercase text-xs">Certificate Received</div>
              </div>
              {rows.map((t, idx) => (
                <div key={idx} className="grid grid-cols-5 border-t border-gray-300">
                  <div className="p-2 border-r border-gray-300"><input type="text" readOnly value={t.course}              className={INP_SM} /></div>
                  <div className="p-2 border-r border-gray-300"><input type="text" readOnly value={t.hoursOfTraining}     className={INP_SM} /></div>
                  <div className="p-2 border-r border-gray-300"><input type="text" readOnly value={t.institution}         className={INP_SM} /></div>
                  <div className="p-2 border-r border-gray-300"><input type="text" readOnly value={t.skillsAcquired}      className={INP_SM} /></div>
                  <div className="p-2">                          <input type="text" readOnly value={t.certificateReceived} className={INP_SM} /></div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // ── VI. Eligibility / Professional License ───────────────────────────────
      case 'eligibility': {
        const eligibilities: Array<{ eligibility: string; dateTaken: string }> = sar('eligibilities');
        const licenses:      Array<{ license: string; validUntil: string }>    = sar('professionalLicenses');
        const elRows  = eligibilities.length > 0 ? eligibilities : [{ eligibility: '', dateTaken: '' }];
        const licRows = licenses.length > 0      ? licenses      : [{ license: '', validUntil: '' }];
        return (
          <div className="space-y-6">
            <SH>VI. ELIGIBILITY/PROFESSIONAL LICENSE</SH>

            <div className="border border-gray-300 rounded p-4">
              <div className="grid grid-cols-2 gap-4 mb-3 bg-gray-200 p-3 rounded">
                <div className="text-black font-bold uppercase text-xs">Eligibility (Civil Service)</div>
                <div className="text-black font-bold uppercase text-xs">Date Taken</div>
              </div>
              {elRows.map((e, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-4 mb-2">
                  <input type="text" readOnly value={e.eligibility}
                    className="text-black px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default outline-none text-sm" />
                  <input type="text" readOnly value={e.dateTaken}
                    className="text-black px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default outline-none text-sm" />
                </div>
              ))}
            </div>

            <div className="border border-gray-300 rounded p-4">
              <div className="grid grid-cols-2 gap-4 mb-3 bg-gray-200 p-3 rounded">
                <div className="text-black font-bold uppercase text-xs">Professional License (PRC)</div>
                <div className="text-black font-bold uppercase text-xs">Valid Until</div>
              </div>
              {licRows.map((l, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-4 mb-2">
                  <input type="text" readOnly value={l.license}
                    className="text-black px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default outline-none text-sm" />
                  <input type="text" readOnly value={l.validUntil}
                    className="text-black px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default outline-none text-sm" />
                </div>
              ))}
            </div>
          </div>
        );
      }

      // ── VII. Work Experience ─────────────────────────────────────────────────
      case 'workExperience': {
        const exps: Array<{ companyName: string; companyCity: string; position: string; numberOfMonths: string; status: string }> = sar('workExperiences');
        const rows = exps.length > 0 ? exps : [{ companyName:'', companyCity:'', position:'', numberOfMonths:'', status:'' }];
        return (
          <div className="space-y-6">
            <SH>VII. WORK EXPERIENCE (within last 10 years only)</SH>
            <div className="border border-gray-300 rounded p-4">
              <div className="text-black grid grid-cols-5 gap-4 mb-3 bg-gray-200 p-3 rounded">
                <div className="font-bold uppercase text-xs">Company Name</div>
                <div className="font-bold uppercase text-xs">Address (City/Municipality)</div>
                <div className="font-bold uppercase text-xs">Position</div>
                <div className="font-bold uppercase text-xs">No. of Months</div>
                <div className="font-bold uppercase text-xs">Status</div>
              </div>
              {rows.map((exp, idx) => (
                <div key={idx} className="grid grid-cols-5 gap-4 mb-2">
                  <input type="text" readOnly value={exp.companyName}
                    className="text-black px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default outline-none text-sm" />
                  <input type="text" readOnly value={exp.companyCity}
                    className="text-black px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default outline-none text-sm" />
                  <input type="text" readOnly value={exp.position}
                    className="text-black px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default outline-none text-sm" />
                  <input type="text" readOnly value={exp.numberOfMonths}
                    className="text-black px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default outline-none text-sm" />
                  <input type="text" readOnly value={exp.status}
                    className="text-black px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 cursor-default outline-none text-sm" />
                </div>
              ))}
            </div>
          </div>
        );
      }

      // ── VIII. Other Skills Acquired Without Certificate ──────────────────────
      case 'otherSkills': {
        const skills = sa('otherSkills');
        const specify: string[] = Array.isArray(fd['otherSkillsSpecify'])
          ? (fd['otherSkillsSpecify'] as string[])
          : fd['otherSkillsSpecify'] ? [fd['otherSkillsSpecify'] as string] : [''];
        return (
          <div className="space-y-6">
            <SH>VIII. OTHER SKILLS ACQUIRED WITHOUT CERTIFICATE</SH>
            <div className="grid grid-cols-2 gap-x-8 gap-y-3">
              {OTHER_SKILLS_LIST.map(skill => (
                <label key={skill} className="flex items-center text-sm cursor-default select-none">
                  <input type="checkbox" readOnly checked={skills.includes(skill)} className="mr-2 pointer-events-none" />
                  <span>{skill}</span>
                </label>
              ))}
              <div className="col-span-2 space-y-2">
                <div className="flex items-center gap-2">
                  <label className="flex items-center text-sm flex-shrink-0 cursor-default select-none">
                    <input type="checkbox" readOnly checked={skills.includes('OTHERS')} className="mr-2 pointer-events-none" />
                    <span>OTHERS:</span>
                  </label>
                  <input type="text" readOnly value={specify[0] ?? ''}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 cursor-default outline-none text-gray-900" />
                </div>
                {specify.slice(1).map((v, i) => (
                  <div key={i + 1} className="flex items-center gap-2 pl-[calc(1rem+0.5rem+6ch)]">
                    <input type="text" readOnly value={v}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 cursor-default outline-none text-gray-900" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      }

      // ── IX. Referred Program ─────────────────────────────────────────────────
      case 'referredProgram': {
        const program = s('referredProgram');
        return (
          <div className="space-y-6">
            <SH>IX. REFERRED PROGRAM</SH>
            <div className="space-y-4">
              {(['SPES', 'GIP', 'DILEEP', 'TESDA Training', 'TUPAD', 'JobStart', 'Others'] as const).map(prog => (
                <label key={prog} className="flex items-center text-sm cursor-default select-none">
                  <input type="checkbox" readOnly checked={program === prog} className="mr-2 pointer-events-none" />
                  <span className="font-semibold">{prog === 'Others' ? 'Others, specify:' : prog}</span>
                </label>
              ))}
              {program === 'Others' && (
                <div className="ml-6">
                  <p className="text-sm text-gray-700">{s('referredProgramOther') || '—'}</p>
                </div>
              )}
            </div>
          </div>
        );
      }

      // ── X. Documents / Attachments ───────────────────────────────────────────
      case 'documents': {
        const docs: Array<{ id: string; documentType: string; customName?: string; fileName: string; fileSize: string; url?: string }> = sar('savedDocuments');
        return (
          <div className="space-y-6">
            <SH>X. DOCUMENTS / ATTACHMENTS</SH>
            <div className="px-4 space-y-4">
              {docs.length === 0 ? (
                <p className="text-sm text-gray-400 italic text-center py-8">No documents attached</p>
              ) : (
                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700">Uploaded Documents</h4>
                  <div className="space-y-2">
                    {docs.map((doc) => (
                      <div key={doc.id}
                        className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow">
                        <div
                          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                          onClick={() => setPreviewDocument(doc)}
                        >
                          <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                            <FileText size={20} className="text-brand-blue" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="inline-block px-2 py-0.5 bg-brand-blue text-white text-xs rounded font-medium">
                                {doc.customName || doc.documentType}
                              </span>
                            </div>
                            <p className="text-sm text-gray-800 truncate">{doc.fileName}</p>
                            <p className="text-xs text-gray-500">{doc.fileSize}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setPreviewDocument(doc)}
                          className="flex-shrink-0 p-2 text-brand-blue hover:bg-blue-50 rounded-lg transition-colors"
                          title="Preview document"
                        >
                          <Eye size={18} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      default:
        return null;
    }
  }

  const currentIdx = SECTIONS.findIndex(sec => sec.id === activeSection);

  return (
    <>
    <div className="bg-white rounded-xl shadow-md flex">

      {/* Left navigation — w-72, pt-[88px], matching AddApplicantSidebar exactly */}
      <div className="w-72 bg-[#F8F9FA] border-r border-gray-200 pt-[88px] px-6 pb-6 overflow-y-auto flex-shrink-0">
        <nav className="space-y-2">
          {SECTIONS.map(sec => (
            <button
              key={sec.id}
              type="button"
              onClick={() => setActiveSection(sec.id)}
              className={`w-full text-left px-4 py-3 rounded-lg transition-colors text-xs ${
                activeSection === sec.id
                  ? 'bg-brand-blue text-white font-semibold'
                  : 'text-gray-700 hover:bg-gray-200'
              }`}
            >
              {sec.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Right content area */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 24 24" className="w-5 h-5 fill-brand-blue">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
            <h3 className="text-gray-800 m-0 text-base font-medium">View Applicant Details</h3>
          </div>
          <button type="button" onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Section content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">
          {renderSection()}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-8 py-4 flex justify-end gap-3">
          <button type="button" onClick={onClose}
            className="px-6 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
            Back to Applicants List
          </button>
          {currentIdx < SECTIONS.length - 1 && (
            <button type="button" onClick={() => setActiveSection(SECTIONS[currentIdx + 1].id)}
              className="px-6 py-2 bg-brand-blue text-white rounded-lg hover:bg-[#01a0ff] transition-colors">
              Next
            </button>
          )}
        </div>
      </div>
    </div>

    {/* Document Preview Modal — matches the Edit form's preview */}
    {previewDocument && (
      <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-[9999] p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">
                {previewDocument.customName || previewDocument.documentType}
              </h3>
              <p className="text-sm text-gray-500">{previewDocument.fileName}</p>
            </div>
            <button
              onClick={() => setPreviewDocument(null)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Preview Content */}
          <div className="flex-1 overflow-auto p-4 bg-gray-50">
            {previewDocument.url ? (
              /(\.png|\.jpe?g|\.gif|\.webp)$/i.test(previewDocument.fileName ?? '') ? (
                <div className="flex items-center justify-center h-full">
                  <img src={previewDocument.url} alt={previewDocument.fileName} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
                </div>
              ) : /\.pdf$/i.test(previewDocument.fileName ?? '') ? (
                <iframe src={previewDocument.url} className="w-full h-full min-h-[600px] rounded-lg shadow-lg" title="PDF Preview" />
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <FileText size={64} className="mb-4 text-gray-400" />
                  <p className="text-lg font-medium mb-2">Preview not available</p>
                  <a href={previewDocument.url} target="_blank" rel="noreferrer" className="text-sm text-brand-blue underline">Open / download file</a>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <FileText size={64} className="mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">File not available for preview</p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-gray-200 flex justify-end">
            <button
              onClick={() => setPreviewDocument(null)}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
