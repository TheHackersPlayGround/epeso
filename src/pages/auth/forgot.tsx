import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, ShieldCheck } from 'lucide-react'
import AuthShell, { AuthInput, AuthButton, AuthError, AuthLink } from './AuthShell'
import { getForgotQuestions, verifyForgotAnswers, resetPasswordWithAnswers, type ForgotQuestion } from '../../services/userService'

interface ForgotProps {
  onBack: () => void
}

type Step = 'username' | 'question' | 'reset' | 'done'

const SUBHEADINGS: Record<Step, string> = {
  username: 'Enter your username to retrieve your security questions',
  question: 'Answer your security questions to continue',
  reset: 'Identity verified — set your new password',
  done: 'All set',
}

export default function Forgot({ onBack }: ForgotProps) {
  const [step, setStep] = useState<Step>('username')
  const [username, setUsername] = useState('')
  const [questions, setQuestions] = useState<ForgotQuestion[]>([])
  const [answers, setAnswers] = useState<string[]>(['', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const setAnswer = (i: number, v: string) => setAnswers(prev => prev.map((a, j) => (j === i ? v : a)))

  // Step 1 — look up this admin's security questions by username
  const handleUsernameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const qs = await getForgotQuestions(username.trim())
      setQuestions(qs)
      setAnswers(['', '', ''])
      setStep('question')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not find security questions.')
    } finally {
      setLoading(false)
    }
  }

  // Step 2 — verify the answers with the backend before moving to the password screen
  const handleAnswerSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (answers.some(a => a.trim() === '')) { setError('Please answer all questions.'); return }
    setLoading(true)
    try {
      await verifyForgotAnswers(username.trim(), answers)
      setStep('reset')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'One or more answers are incorrect.')
    } finally {
      setLoading(false)
    }
  }

  // Step 3 — verify answers + set the new password (one backend call)
  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) { setError('Passwords do not match.'); return }
    if (newPassword.length < 8) { setError('Password must be at least 8 characters.'); return }
    setLoading(true)
    try {
      await resetPasswordWithAnswers(username.trim(), answers, newPassword)
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.')
      setStep('question') // wrong answers → send back to re-answer
    } finally {
      setLoading(false)
    }
  }

  const steps: Step[] = ['username', 'question', 'reset']
  const currentIndex = steps.indexOf(step)

  return (
    <AuthShell heading="Forgot Password" subheading={SUBHEADINGS[step]} brand={false}>
      <div className="flex flex-col gap-4">
        {/* Step indicator (hidden on done) */}
        {step !== 'done' && (
          <div className="flex gap-2">
            {steps.map((s, i) => (
              <div key={s} style={{
                width: i === currentIndex ? '24px' : '8px', height: '8px', borderRadius: '9999px',
                backgroundColor: i <= currentIndex ? '#0065A5' : 'rgba(255,255,255,0.35)', transition: 'all 0.3s ease',
              }} />
            ))}
          </div>
        )}

        {error && <AuthError>{error}</AuthError>}

        {/* ── STEP 1: Username ── */}
        {step === 'username' && (
          <form onSubmit={handleUsernameSubmit} className="flex flex-col gap-4">
            <AuthInput id="forgot-username" label="Username" value={username} onChange={setUsername} autoComplete="username" />
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.6)', margin: 0, lineHeight: 1.5 }}>
              This is for administrator accounts. If you're a staff member, please ask an administrator to reset your password.
            </p>
            <AuthButton disabled={loading}>{loading ? 'Checking…' : 'Continue'}</AuthButton>
          </form>
        )}

        {/* ── STEP 2: Security Questions ── */}
        {step === 'question' && (
          <form onSubmit={handleAnswerSubmit} className="flex flex-col gap-4">
            {questions.map((q, i) => (
              <div key={q.position}>
                <div className="mb-2 px-3 py-2 flex items-start gap-2"
                  style={{ background: 'rgba(0,101,165,0.18)', borderRadius: '8px', border: '1px solid rgba(0,101,165,0.4)' }}>
                  <ShieldCheck size={15} className="mt-0.5 shrink-0" style={{ color: '#7ec8f0' }} />
                  <p style={{ color: '#e0f2fe', fontSize: '0.82rem', fontStyle: 'italic', margin: 0 }}>{q.text}</p>
                </div>
                <AuthInput id={`forgot-answer-${i}`} label={`Answer ${i + 1}`} value={answers[i]} onChange={v => setAnswer(i, v)} />
              </div>
            ))}
            <AuthButton disabled={loading}>{loading ? 'Verifying…' : 'Verify Answers'}</AuthButton>
          </form>
        )}

        {/* ── STEP 3: Reset Password ── */}
        {step === 'reset' && (
          <form onSubmit={handleResetSubmit} className="flex flex-col gap-4">
            <AuthInput
              id="forgot-new" label="New Password" type={showNew ? 'text' : 'password'} value={newPassword} onChange={setNewPassword}
              rightSlot={
                <button type="button" onClick={() => setShowNew(v => !v)} aria-label={showNew ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none"
                  style={{ background: 'none', border: 'none', padding: 0, color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                  {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              }
            />
            <AuthInput
              id="forgot-confirm" label="Confirm Password" type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={setConfirmPassword}
              rightSlot={
                <button type="button" onClick={() => setShowConfirm(v => !v)} aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none"
                  style={{ background: 'none', border: 'none', padding: 0, color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}>
                  {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              }
            />
            <AuthButton disabled={loading}>{loading ? 'Resetting…' : 'Reset Password'}</AuthButton>
          </form>
        )}

        {/* ── STEP 4: Done ── */}
        {step === 'done' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-full" style={{ backgroundColor: 'rgba(0,101,165,0.25)' }}>
              <ShieldCheck size={28} style={{ color: '#7ec8f0' }} />
            </div>
            <p className="text-center font-semibold" style={{ color: '#ffffff', fontSize: '0.95rem' }}>Password Reset Successful!</p>
            <p className="text-center" style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem' }}>
              Your password has been updated. You can now log in with your new password.
            </p>
          </div>
        )}

        <div className="mt-1">
          <AuthLink onClick={onBack}><ArrowLeft size={15} /> Back to Login</AuthLink>
        </div>
      </div>
    </AuthShell>
  )
}
