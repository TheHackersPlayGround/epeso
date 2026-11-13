// Shows the applicant-facing form of one program on the kiosk. Each program's own form is reused in its
// `kiosk` mode (no staff-only section, documents, drafts or duplicate check). A few programs need a list
// of choices first (CDSP services, Skills Training qualifications); those are fetched from the kiosk's
// public endpoints, never from the staff API.

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import AddApplicantSidebar from '../pages/employment/applicants/AddApplicantSidebar'
import CDSPProfileForm from '../pages/cdsp/CDSPProfileForm'
import GIPProfileForm, { emptyForm as gipEmptyForm } from '../pages/gip/GIPProfileForm'
import SPESProfileForm, { emptyForm as spesEmptyForm } from '../pages/spes/SPESProfileForm'
import SkillsTrainingProfileForm from '../pages/skills-training/SkillsTrainingProfileForm'
import DILPProfileForm, { EMPTY_DILP_RECORD } from '../pages/livelihood/DILPProfileForm'
import TUPADProfileForm, { EMPTY_TUPAD_RECORD } from '../pages/livelihood/TUPADProfileForm'
import SLPProfileForm, { EMPTY_SLP_RECORD } from '../pages/livelihood/SLPProfileForm'
import CLPEPProfileForm, { EMPTY_CLPEP_RECORD } from '../pages/livelihood/CLPEPProfileForm'
import AddOFWRequestForm from '../pages/ofw/AddOFWRequestForm'
import { getCdspServices, getSkillsOptions, type KioskLookup } from './kioskService'

interface KioskFormProps {
  program: string
  /** Called with the finished form. Employment Facilitation awaits it (its own review pop-up shows the result). */
  onSubmit: (data: object) => void | Promise<void>
  onClose: () => void
}

function LoadingCard({ failed }: { failed: boolean }) {
  return (
    <div className="bg-white rounded-2xl shadow-md p-8 max-w-3xl mx-auto flex flex-col items-center text-center">
      {failed ? (
        <p className="text-gray-600 text-base m-0">This form could not be loaded. Please ask the PESO staff for help.</p>
      ) : (
        <>
          <Loader2 size={32} className="animate-spin text-brand-blue" />
          <p className="text-gray-500 mt-3 mb-0 text-base">Loading the form…</p>
        </>
      )}
    </div>
  )
}

// CDSP: needs the list of CDSP services first.
function CdspKioskForm({ onSubmit, onClose }: Omit<KioskFormProps, 'program'>) {
  const [services, setServices] = useState<string[] | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    getCdspServices().then(s => { if (!cancelled) setServices(s) }, () => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [])
  if (!services) return <LoadingCard failed={failed} />
  return <CDSPProfileForm kiosk mode="add" serviceNames={services} onSave={onSubmit} onClose={onClose} />
}

// Skills Training: needs the qualification and purpose lists first.
function SkillsKioskForm({ onSubmit, onClose }: Omit<KioskFormProps, 'program'>) {
  const [options, setOptions] = useState<{ qualifications: KioskLookup[]; purposes: KioskLookup[] } | null>(null)
  const [failed, setFailed] = useState(false)
  useEffect(() => {
    let cancelled = false
    getSkillsOptions().then(o => { if (!cancelled) setOptions(o) }, () => { if (!cancelled) setFailed(true) })
    return () => { cancelled = true }
  }, [])
  if (!options) return <LoadingCard failed={failed} />
  return (
    <SkillsTrainingProfileForm
      kiosk mode="add" qualifications={options.qualifications} purposes={options.purposes}
      onSave={onSubmit} onClose={onClose}
    />
  )
}

export default function KioskForm({ program, onSubmit, onClose }: KioskFormProps) {
  switch (program) {
    case 'ef':
      return <AddApplicantSidebar kiosk onSave={onSubmit} onClose={onClose} />
    case 'cdsp':
      return <CdspKioskForm onSubmit={onSubmit} onClose={onClose} />
    case 'gip':
      return <GIPProfileForm kiosk mode="add" initial={gipEmptyForm} onSave={onSubmit} onClose={onClose} />
    case 'spes':
      return <SPESProfileForm kiosk mode="add" initial={spesEmptyForm} onSave={onSubmit} onClose={onClose} />
    case 'skills':
      return <SkillsKioskForm onSubmit={onSubmit} onClose={onClose} />
    case 'dilp':
      return <DILPProfileForm kiosk mode="add" initial={EMPTY_DILP_RECORD} onSave={onSubmit} onClose={onClose} />
    case 'tupad':
      return <TUPADProfileForm kiosk mode="add" initial={EMPTY_TUPAD_RECORD} onSave={onSubmit} onClose={onClose} />
    case 'slp':
      return <SLPProfileForm kiosk mode="add" initial={EMPTY_SLP_RECORD} onSave={onSubmit} onClose={onClose} />
    case 'clpep':
      return <CLPEPProfileForm kiosk mode="add" initial={EMPTY_CLPEP_RECORD} onSave={onSubmit} onClose={onClose} />
    case 'ofw':
      return <AddOFWRequestForm kiosk onSave={onSubmit} onClose={onClose} />
    default:
      return <LoadingCard failed />
  }
}
