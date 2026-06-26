import { useEffect, useState } from 'react'
import { ShieldCheck, LogOut, ArrowLeft, CheckCircle, KeyRound } from 'lucide-react'
import AuthShell, { AuthInput, AuthSelect, AuthButton, AuthError, AuthLink } from './AuthShell'
import { getSecurityQuestions, setupSecurityAnswers, type SecurityQuestion } from '../../services/userService'

interface SecuritySetupProps {
  onDone: () => void   // called after questions are saved
  onLogout: () => void // escape hatch (cancel = log out, since setup is required)
}

type Stage = 'edit' | 'review' | 'done'

const optStyle: React.CSSProperties = { color: '#111827' }

const SUBHEADINGS: Record<Stage, string> = {
  edit: 'Set these up to recover your password later',
  review: 'Review your questions and answers before saving',
  done: "You're all set",
}

export default function SecuritySetup({ onDone, onLogout }: SecuritySetupProps) {
  const [stage, setStage]     = useState<Stage>('edit')
  const [questions, setQuestions] = useState<SecurityQuestion[]>([])
  const [picked, setPicked]   = useState<(number | '')[]>(['', '', ''])
  const [answers, setAnswers] = useState<string[]>(['', '', ''])
  const [error, setError]     = useState('')
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    getSecurityQuestions()
      .then(setQuestions)
      .catch(err => setError(err instanceof Error ? err.message : 'Could not load questions.'))
  }, [])

  const optionsFor = (i: number) => questions.filter(q => !picked.some((p, j) => j !== i && p === q.id))
  const setPick = (i: number, val: number | '') => setPicked(prev => prev.map((p, j) => (j === i ? val : p)))
  const setAns  = (i: number, val: string)        => setAnswers(prev => prev.map((a, j) => (j === i ? val : a)))
  const questionText = (id: number | '') => questions.find(q => q.id === id)?.text ?? ''

  // Step 1 — validate, then go to the review screen
  const handleReview = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (picked.some(p => p === '')) { setError('Please choose all 3 questions.'); return }
    if (new Set(picked).size !== 3) { setError('Please choose 3 different questions.'); return }
    if (answers.some(a => a.trim() === '')) { setError('Please answer all 3 questions.'); return }
    setStage('review')
  }

  // Step 2 — confirm + save
  const handleConfirm = async () => {
    setError('')
    setSaving(true)
    try {
      await setupSecurityAnswers(picked as number[], answers)
      try {
        const u = JSON.parse(localStorage.getItem('peso_current_user') || '{}')
        u.securityQuestionsSet = true
        localStorage.setItem('peso_current_user', JSON.stringify(u))
      } catch { /* ignore */ }
      setStage('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save. Please try again.')
      setStage('edit') // let them fix and retry
    } finally {
      setSaving(false)
    }
  }

  return (
    <AuthShell heading="Security Questions" subheading={SUBHEADINGS[stage]} brand={false} subheadingColor="#f5c518">
      <div className="flex flex-col gap-4">
        {error && <AuthError>{error}</AuthError>}

        {/* ── EDIT ── */}
        {stage === 'edit' && (
          <form onSubmit={handleReview} className="flex flex-col gap-4">
            {[0, 1, 2].map(i => (
              <div key={i} className="flex flex-col gap-2">
                <AuthSelect label={`Question ${i + 1}`} value={picked[i]} onChange={v => setPick(i, v ? Number(v) : '')}>
                  <option value="" style={optStyle}>Select a question…</option>
                  {optionsFor(i).map(q => <option key={q.id} value={q.id} style={optStyle}>{q.text}</option>)}
                </AuthSelect>
                <AuthInput id={`setup-answer-${i}`} label={`Answer ${i + 1}`} value={answers[i]} onChange={v => setAns(i, v)} autoComplete="off" />
              </div>
            ))}
            <AuthButton>Review Answers</AuthButton>
            <div className="mt-1"><AuthLink onClick={onLogout}><LogOut size={15} /> Cancel and log out</AuthLink></div>
            <div className="flex items-center justify-center gap-1.5 text-xs" style={{ color: 'rgba(255,255,255,0.65)' }}>
              <ShieldCheck size={13} /> Required before you can continue
            </div>
          </form>
        )}

        {/* ── REVIEW ── */}
        {stage === 'review' && (
          <div className="flex flex-col gap-4">
            {/* Why this matters */}
            <div className="flex items-start gap-2.5 px-4 py-3"
              style={{ background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.45)', borderRadius: '8px' }}>
              <KeyRound size={18} className="mt-0.5 shrink-0" style={{ color: '#f5c518' }} />
              <p style={{ color: '#f5c518', fontSize: '0.8rem', lineHeight: 1.5, margin: 0 }}>
                These answers are used to <strong>recover your password</strong> if you forget it, so make sure you will
                remember them <strong>exactly</strong> (answers are <strong>not case-sensitive</strong>). If you forget
                both your password and these answers, only another administrator can reset your account.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="px-4 py-3"
                  style={{ background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px' }}>
                  <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.78rem', fontStyle: 'italic', margin: 0 }}>{questionText(picked[i])}</p>
                  <p style={{ color: '#ffffff', fontSize: '0.95rem', fontWeight: 600, margin: '0.2rem 0 0', wordBreak: 'break-word' }}>{answers[i]}</p>
                </div>
              ))}
            </div>

            <AuthButton type="button" disabled={saving} onClick={handleConfirm}>{saving ? 'Saving…' : 'Confirm & Save'}</AuthButton>
            <div className="mt-1"><AuthLink onClick={() => { setError(''); setStage('edit') }}><ArrowLeft size={15} /> Go back to edit</AuthLink></div>
          </div>
        )}

        {/* ── DONE ── */}
        {stage === 'done' && (
          <div className="flex flex-col items-center gap-3 py-3">
            <div className="flex items-center justify-center w-14 h-14 rounded-full" style={{ backgroundColor: 'rgba(0,101,165,0.25)' }}>
              <CheckCircle size={28} style={{ color: '#7ec8f0' }} />
            </div>
            <p className="text-center font-semibold" style={{ color: '#ffffff', fontSize: '0.95rem' }}>Security questions saved!</p>
            <p className="text-center" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem' }}>
              You can now use these to recover your password if you ever forget it.
            </p>
            <div className="w-full mt-2"><AuthButton type="button" onClick={onDone}>Continue</AuthButton></div>
          </div>
        )}
      </div>
    </AuthShell>
  )
}
