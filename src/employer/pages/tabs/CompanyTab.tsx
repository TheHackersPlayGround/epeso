// The company's details. The employer can ask the PESO to change the contact details; the PESO decides.
import { useState } from 'react'
import { Loader2 } from 'lucide-react'
import { getCompany, submitRequest, withdrawRequest, type Company } from '../../api'
import { Card, Dialog, Notice, Spinner, WaitingPill } from '../../components/ui'
import { WithdrawDialog } from '../../components/dialogs'
import { btnGhost, btnPrimary, errText, fmtDate, inputCls, labelCls, useData } from '../../lib'

const FIELDS: { key: string; label: string; from: (c: Company) => string | null }[] = [
  { key: 'contactPersonName', label: 'Contact person', from: c => c.contactPersonName },
  { key: 'contactPersonPosition', label: 'Position', from: c => c.contactPersonPosition },
  { key: 'contactNumber', label: 'Contact number', from: c => c.contactNumber },
  { key: 'emailAddress', label: 'Email', from: c => c.emailAddress },
  { key: 'buildingNo', label: 'Building no.', from: c => c.buildingNo },
  { key: 'street', label: 'Street', from: c => c.street },
]

function Item({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="text-sm text-gray-900 mt-1 break-words">{value || '—'}</p>
    </div>
  )
}

export default function CompanyTab({ tick, onChanged }: { tick: number; onChanged: () => void }) {
  const { data: c, error, loading, reload } = useData(getCompany, tick)
  const [editing, setEditing] = useState(false)
  const [withdraw, setWithdraw] = useState(false)
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; title: string; message: string } | null>(null)

  if (loading && !c) return <Card><Spinner /></Card>
  if (!c) return <Card className="p-6"><p role="alert" className="text-sm text-red-700">{error || 'Could not load your company details.'}</p></Card>

  return (
    <Card className="p-6">
      <div className="flex items-start justify-between gap-3 flex-wrap mb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{c.companyName}</h2>
          <p className="text-sm text-gray-500 mt-0.5">{[c.industry, c.businessType].filter(Boolean).join(' · ') || 'Company details'}</p>
        </div>
        {c.openRequest ? (
          <div className="flex items-center gap-2">
            <WaitingPill text="Changes waiting for the PESO" />
            <button type="button" onClick={() => setWithdraw(true)} className="px-3.5 py-1.5 rounded-lg text-xs font-medium border border-red-200 text-red-600 hover:bg-red-50">Withdraw request</button>
          </div>
        ) : (
          <button type="button" onClick={() => setEditing(true)} className={btnPrimary}>Request changes</button>
        )}
      </div>

      <div className="grid grid-cols-3 gap-5 max-lg:grid-cols-2 max-sm:grid-cols-1">
        <Item label="TIN number" value={c.tinNumber} />
        <Item label="Date registered" value={fmtDate(c.dateRegistered)} />
        <Item label="Status" value={c.status} />
        {FIELDS.map(f => <Item key={f.key} label={f.label} value={f.from(c)} />)}
        <div className="col-span-3 max-lg:col-span-2 max-sm:col-span-1"><Item label="Address" value={c.address} /></div>
      </div>

      {c.openRequest && (
        <div className="mt-6 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">Changes you asked for</p>
          <ul className="mt-1 space-y-0.5">
            {Object.entries(c.openRequest.changes).map(([k, v]) => <li key={k} className="text-sm text-amber-900">{FIELDS.find(f => f.key === k)?.label ?? k}: <span className="font-medium">{v || '—'}</span></li>)}
          </ul>
        </div>
      )}
      <p className="text-xs text-gray-400 mt-6">To change the company name, TIN or industry, please contact the PESO.</p>

      {editing && <EditDialog company={c} onClose={() => setEditing(false)} onSent={() => { setEditing(false); reload(); onChanged(); setNotice({ type: 'success', title: 'Request sent', message: 'The PESO will review your changes. You can follow it under My Requests.' }) }} />}
      {withdraw && c.openRequest && (
        <WithdrawDialog what="your company details" onClose={() => setWithdraw(false)}
          onConfirm={async () => { await withdrawRequest(c.openRequest!.id); setWithdraw(false); reload(); onChanged() }} />
      )}
      {notice && <Notice {...notice} onClose={() => setNotice(null)} />}
    </Card>
  )
}

function EditDialog({ company, onClose, onSent }: { company: Company; onClose: () => void; onSent: () => void }) {
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(FIELDS.map(f => [f.key, f.from(company) ?? ''])))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setBusy(true); setError('')
    try { await submitRequest({ type: 'company_info', payload: values }); onSent() } catch (e) { setError(errText(e)); setBusy(false) }
  }

  return (
    <Dialog
      title="Request changes to your details" onClose={onClose} busy={busy}
      footer={<>
        <button type="button" onClick={onClose} disabled={busy} className={btnGhost}>Cancel</button>
        <button type="button" onClick={() => void submit()} disabled={busy} className={btnPrimary}>{busy && <Loader2 size={15} className="animate-spin" />}Send to the PESO</button>
      </>}
    >
      {FIELDS.map(f => (
        <div key={f.key}>
          <label htmlFor={`f-${f.key}`} className={labelCls}>{f.label}</label>
          <input id={`f-${f.key}`} value={values[f.key]} maxLength={255} onChange={e => { setValues(v => ({ ...v, [f.key]: e.target.value })); setError('') }} className={inputCls} />
        </div>
      ))}
      <p className="text-xs text-gray-500">Only what you change is sent. The PESO checks it first, then it shows as approved or rejected.</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    </Dialog>
  )
}
