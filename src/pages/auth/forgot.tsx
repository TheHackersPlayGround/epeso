import { useState } from 'react'
import { ArrowLeft, Eye, EyeOff, ShieldCheck, User } from 'lucide-react'
import logo1 from '../../assets/logo1.png'
import logo2 from '../../assets/logo2.png'
import bg from '../../assets/tangub.png'

interface ForgotProps {
  onBack: () => void
}

// Security questions (replace with per-user API lookup later)
const SECURITY_QUESTIONS = [
  "What is the name of your elementary school?",
  "What is your mother's maiden name?",
  "What was the name of your first pet?",
]

type Step = 'username' | 'question' | 'reset' | 'done'

const labelStyle: React.CSSProperties = {
  color: '#ffffff',
  fontSize: 'var(--text-sm)',
  textShadow: '0 1px 3px rgba(0,0,0,0.4)',
  fontWeight: 600,
  marginBottom: '0.25rem',
  display: 'block',
}

const inputClass =
  'w-full px-4 py-2.5 border border-[#d1d5db] bg-white text-[#111827] placeholder-gray-400 ' +
  'focus:outline-none focus:ring-2 focus:ring-[#0046AD]/40 focus:border-[#0046AD]'

const inputStyle: React.CSSProperties = {
  borderRadius: 'var(--radius-sm)',
  fontSize: 'var(--text-base)',
  transition: 'box-shadow var(--transition-base), border-color var(--transition-base)',
}

export default function Forgot({ onBack }: ForgotProps) {
  const [step, setStep] = useState<Step>('username')
  const [username, setUsername] = useState('')
  const [answers, setAnswers] = useState<string[]>(['', '', ''])
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [error, setError] = useState('')

  // Step 1 — advance to security questions
  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep('question')
  }

  // Step 2 — advance to reset
  const handleAnswerSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setStep('reset')
  }

  // Step 3 — complete reset
  const handleResetSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }
    // TODO: call API to update password
    setStep('done')
  }

  // Step indicator dots
  const steps: Step[] = ['username', 'question', 'reset']
  const currentIndex = steps.indexOf(step)

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Background overlay */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm pointer-events-none" />

      {/* Card */}
      <div
        className="relative w-full max-w-md mx-4 px-10 py-10 overflow-hidden backdrop-blur-md"
        style={{
          background: 'rgba(255, 255, 255, 0.25)',
          borderRadius: 'var(--radius-xl)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        {/* Logo row */}
        <div className="flex items-center justify-center gap-1 mb-4">
          <img src={logo1} alt="Logo 1" className="w-16 h-16 rounded-full object-contain shrink-0" />
          <img src={logo2} alt="Logo 2" className="w-16 h-16 rounded-full object-contain shrink-0" />
        </div>

        {/* Title */}
        <p
          className="text-center font-extrabold tracking-widest uppercase"
          style={{
            color: '#0077BE',
            fontSize: 'var(--text-lg)',
            margin: '0 0 0.5rem',
            lineHeight: '1',
          }}
        >
          Forgot Password
        </p>

        {/* Step indicator (hidden on done) */}
        {step !== 'done' && (
          <div className="flex justify-center gap-2 my-4">
            {steps.map((s, i) => (
              <div
                key={s}
                style={{
                  width: i === currentIndex ? '24px' : '8px',
                  height: '8px',
                  borderRadius: '9999px',
                  backgroundColor: i <= currentIndex ? '#0077BE' : 'rgba(255,255,255,0.4)',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        )}

        {/* Error banner */}
        {error && (
          <div
            className="mb-3 px-3 py-2 text-sm text-center font-medium"
            style={{
              backgroundColor: 'rgba(239,68,68,0.15)',
              border: '1px solid rgba(239,68,68,0.4)',
              borderRadius: 'var(--radius-sm)',
              color: '#fee2e2',
              textShadow: '0 1px 2px rgba(0,0,0,0.3)',
            }}
          >
            {error}
          </div>
        )}

        {/* ── STEP 1: Username ── */}
        {step === 'username' && (
          <>
            <p
              className="text-center mb-5"
              style={{
                color: '#ffffff',
                fontSize: 'var(--text-sm)',
                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}
            >
              Enter your username to retrieve your security question.
            </p>
            <form onSubmit={handleUsernameSubmit} className="flex flex-col gap-3">
              <div>
                <label style={labelStyle}>Username</label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter your username"
                    value={username}
                    onChange={(e) => { setUsername(e.target.value); setError('') }}
                    autoComplete="username"
                    required
                    className={inputClass + ' pl-10'}
                    style={inputStyle}
                  />
                  <User size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <SubmitButton label="Continue" />
            </form>
          </>
        )}

        {/* ── STEP 2: Security Questions ── */}
        {step === 'question' && (
          <>
            <p
              className="text-center mb-3"
              style={{
                color: '#ffffff',
                fontSize: 'var(--text-sm)',
                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}
            >
              Answer all security questions to proceed.
            </p>

            <form onSubmit={handleAnswerSubmit} className="flex flex-col gap-4">
              {SECURITY_QUESTIONS.map((q, i) => (
                <div key={i}>
                  {/* Question box */}
                  <div
                    className="mb-2 px-3 py-2 flex items-start gap-2"
                    style={{
                      background: 'rgba(0,119,190,0.18)',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid rgba(0,119,190,0.35)',
                    }}
                  >
                    <ShieldCheck size={15} className="mt-0.5 shrink-0" style={{ color: '#7dd3fc' }} />
                    <p style={{ color: '#e0f2fe', fontSize: 'var(--text-sm)', fontStyle: 'italic', textShadow: '0 1px 2px rgba(0,0,0,0.3)', margin: 0 }}>
                      {q}
                    </p>
                  </div>
                  {/* Answer input */}
                  <input
                    type="text"
                    placeholder={`Answer ${i + 1}`}
                    value={answers[i]}
                    onChange={(e) => {
                      const updated = [...answers]
                      updated[i] = e.target.value
                      setAnswers(updated)
                    }}
                    required
                    className={inputClass}
                    style={inputStyle}
                  />
                </div>
              ))}
              <SubmitButton label="Verify Answers" />
            </form>
          </>
        )}

        {/* ── STEP 3: Reset Password ── */}
        {step === 'reset' && (
          <>
            <p
              className="text-center mb-4"
              style={{
                color: '#ffffff',
                fontSize: 'var(--text-sm)',
                textShadow: '0 1px 3px rgba(0,0,0,0.4)',
              }}
            >
              Identity verified! Set your new password below.
            </p>
            <form onSubmit={handleResetSubmit} className="flex flex-col gap-3">
              {/* New password */}
              <div>
                <label style={labelStyle}>New Password</label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    placeholder="New password"
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setError('') }}
                    required
                    className={inputClass + ' pr-10'}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    style={{ background: 'none', border: 'none', padding: 0 }}
                    aria-label={showNew ? 'Hide password' : 'Show password'}
                  >
                    {showNew ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div>
                <label style={labelStyle}>Confirm Password</label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                    required
                    className={inputClass + ' pr-10'}
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
                    style={{ background: 'none', border: 'none', padding: 0 }}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              <SubmitButton label="Reset Password" />
            </form>
          </>
        )}

        {/* ── STEP 4: Done ── */}
        {step === 'done' && (
          <div className="flex flex-col items-center gap-3 py-4">
            <div
              className="flex items-center justify-center w-14 h-14 rounded-full"
              style={{ backgroundColor: 'rgba(0,119,190,0.2)' }}
            >
              <ShieldCheck size={28} style={{ color: '#7dd3fc' }} />
            </div>
            <p
              className="text-center font-semibold"
              style={{ color: '#ffffff', fontSize: 'var(--text-base)', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
            >
              Password Reset Successful!
            </p>
            <p
              className="text-center"
              style={{ color: '#e5e7eb', fontSize: 'var(--text-sm)', textShadow: '0 1px 3px rgba(0,0,0,0.4)' }}
            >
              Your password has been updated. You can now log in with your new password.
            </p>
          </div>
        )}

        {/* Back to login */}
        <button
          type="button"
          onClick={onBack}
          className="flex items-center justify-center gap-1.5 w-full mt-5 text-sm font-semibold hover:underline focus:outline-none"
          style={{ color: '#0077BE', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <ArrowLeft size={15} />
          Back to Login
        </button>
      </div>
    </div>
  )
}

// ── Shared submit button ──────────────────────────────────────────────────────
function SubmitButton({ label }: { label: string }) {
  return (
    <button
      type="submit"
      className="w-full mt-1 py-2.5 text-white font-bold tracking-widest uppercase hover:scale-[1.01] active:scale-[0.99]"
      style={{
        backgroundColor: '#0077BE',
        borderRadius: 'var(--radius-full)',
        fontSize: 'var(--text-md)',
        transition: 'background-color 0.2s',
      }}
      onMouseEnter={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#005f9e'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-xs)'
      }}
      onMouseLeave={(e) => {
        ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0077BE'
        ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
      }}
    >
      {label}
    </button>
  )
}
