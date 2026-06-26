// Shared visual shell for the auth screens (Login look & feel).
// Background image + dark overlay + two-panel card (navy left, blurred form right),
// plus themed Input / Select / Button / Error / Link primitives so every auth
// screen stays consistent with the Login page.

import type { ReactNode } from 'react'
import logo1 from '../../assets/logo1.png'
import logo2 from '../../assets/logo22.png'
import bg from '../../assets/tangub.png'

const Y = 'rgba(245,197,24,0.75)'  // yellow
const W = 'rgba(255,255,255,0.55)' // white

const CityskylineSVG = () => (
  <svg viewBox="0 0 600 120" xmlns="http://www.w3.org/2000/svg" className="w-full" style={{ display: 'block' }}>
    <rect x="0" y="60" width="30" height="60" fill={W} />
    <rect x="20" y="40" width="25" height="80" fill={Y} />
    <rect x="35" y="70" width="20" height="50" fill={W} />
    <rect x="50" y="30" width="18" height="90" fill={Y} />
    <rect x="62" y="50" width="22" height="70" fill={W} />
    <rect x="80" y="20" width="30" height="100" fill={Y} />
    <rect x="84" y="10" width="8" height="15" fill={Y} />
    <rect x="108" y="55" width="25" height="65" fill={W} />
    <rect x="130" y="35" width="20" height="85" fill={Y} />
    <rect x="148" y="45" width="28" height="75" fill={W} />
    <rect x="173" y="25" width="22" height="95" fill={Y} />
    <rect x="177" y="15" width="6" height="14" fill={Y} />
    <rect x="208" y="40" width="26" height="80" fill={W} />
    <rect x="250" y="15" width="35" height="105" fill={Y} />
    <rect x="260" y="5" width="10" height="14" fill={Y} />
    <rect x="303" y="30" width="20" height="90" fill={W} />
    <rect x="320" y="50" width="28" height="70" fill={Y} />
    <rect x="346" y="20" width="25" height="100" fill={W} />
    <rect x="350" y="10" width="8" height="14" fill={W} />
    <rect x="385" y="38" width="30" height="82" fill={Y} />
    <rect x="432" y="28" width="20" height="92" fill={W} />
    <rect x="474" y="18" width="32" height="102" fill={Y} />
    <rect x="480" y="8" width="8" height="14" fill={Y} />
    <rect x="522" y="35" width="22" height="85" fill={W} />
    <rect x="565" y="25" width="20" height="95" fill={Y} />
    <rect x="0" y="118" width="600" height="2" fill="rgba(245,197,24,0.5)" />
  </svg>
)

interface AuthShellProps {
  heading: string
  subheading?: ReactNode
  children: ReactNode
  brand?: boolean              // show the navy logo/skyline panel (Login only). Default true.
  subheadingColor?: string     // override the subheading text color
}

export default function AuthShell({ heading, subheading, children, brand = true, subheadingColor = 'rgba(255,255,255,0.7)' }: AuthShellProps) {
  // The blurred form panel (header + content), shared by both layouts.
  const formPanel = (
    <>
      <div className="absolute pointer-events-none" style={{ top: '-40px', right: '-40px', width: '130px', height: '130px', background: '#0065A5', transform: 'rotate(45deg)', opacity: 0.15 }} />
      <div className="absolute pointer-events-none" style={{ bottom: '-30px', left: '-30px', width: '100px', height: '100px', background: '#d4a017', transform: 'rotate(45deg)', opacity: 0.12 }} />

      <div className="mb-6 relative z-10">
        <p style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>{heading}</p>
        {subheading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '28px', height: '3px', background: '#0065A5', borderRadius: '2px' }} />
            <p style={{ color: subheadingColor, fontSize: '0.82rem', fontWeight: 500 }}>{subheading}</p>
          </div>
        )}
      </div>

      <div className="relative z-10">{children}</div>
    </>
  )

  return (
    <div
      className="fixed inset-0 overflow-y-auto"
      style={{ backgroundImage: `url(${bg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      {/* Dark overlay on bg (same as Login). Fixed so it stays put while the card scrolls. */}
      <div className="fixed inset-0 pointer-events-none" style={{ background: 'rgba(5,15,40,0.55)' }} />

      {/* Scrollable centering wrapper: centers when it fits, scrolls when taller than the viewport */}
      <div className="relative min-h-full flex items-center justify-center py-8 px-4">
      {brand ? (
        /* ── Two-panel card (Login): navy brand panel + blurred form panel ── */
        <div
          className="relative flex w-full overflow-hidden"
          style={{ maxWidth: '860px', minHeight: '520px', borderRadius: '18px', boxShadow: '0 24px 64px rgba(231,226,226,0.65)', margin: '1rem' }}
        >
          <div
            className="relative flex flex-col items-center justify-center overflow-hidden"
            style={{ width: '45%', background: 'rgba(0,101,165,0.88)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', padding: '2.5rem 2rem 0' }}
          >
            <div className="absolute pointer-events-none" style={{ top: '-40px', right: '-30px', width: '90px', height: '340px', background: 'rgba(212,158,23,0.67)', transform: 'rotate(18deg)', borderRadius: '6px' }} />
            <div className="absolute pointer-events-none" style={{ top: '-60px', right: '20px', width: '32px', height: '320px', background: 'rgba(0,101,165,0.35)', transform: 'rotate(18deg)', borderRadius: '4px' }} />

            <div className="relative z-10 flex flex-col items-center text-center">
              <div className="flex items-center gap-4 mb-5">
                <img src={logo1} alt="PESO Logo" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'contain', background: 'white', padding: '5px' }} />
                <img src={logo2} alt="Tangub City Seal" style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'contain', background: 'white', padding: '1px' }} />
              </div>
              <div style={{ width: '48px', height: '3px', background: '#f5c518', borderRadius: '2px', marginBottom: '1.1rem' }} />
              <p style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.45rem', lineHeight: '1.3', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                Electronic <br />Public Employment<br />Service Office
              </p>
            </div>

            <div className="absolute bottom-0 left-0 right-0 z-10"><CityskylineSVG /></div>
          </div>

          <div
            className="flex flex-col justify-center"
            style={{ width: '55%', background: 'rgba(255,254,254,0.11)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', padding: '3rem 2.8rem', position: 'relative', overflow: 'hidden', borderLeft: '1px solid rgba(226,255,4,0.72)' }}
          >
            {formPanel}
          </div>
        </div>
      ) : (
        /* ── Single blurred form panel (Forgot / Setup) ── */
        <div
          className="relative flex flex-col justify-center w-full overflow-hidden"
          style={{ maxWidth: '860px', minHeight: '520px', margin: '1rem', background: 'rgba(255,254,254,0.11)', backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)', padding: '3rem 3.5rem', borderRadius: '18px', boxShadow: '0 24px 64px rgba(231,226,226,0.65)' }}
        >
          {formPanel}
        </div>
      )}
      </div>
    </div>
  )
}

// ── Themed primitives (match Login) ───────────────────────────────────────

const fieldStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.15)',
  border: '1.5px solid rgba(255,255,255,0.35)',
  borderRadius: '8px',
  fontSize: '0.92rem',
  color: '#ffffff',
  transition: 'border-color 0.2s, box-shadow 0.2s',
}
const onFieldFocus = (e: React.FocusEvent<HTMLElement>) => {
  e.currentTarget.style.borderColor = '#0065A5'
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,101,165,0.28)'
}
const onFieldBlur = (e: React.FocusEvent<HTMLElement>) => {
  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'
  e.currentTarget.style.boxShadow = 'none'
}

// Floating-label input, identical styling to the Login fields.
export function AuthInput({ id, label, value, onChange, type = 'text', autoComplete, rightSlot }: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
  type?: string
  autoComplete?: string
  rightSlot?: ReactNode
}) {
  return (
    <div className="relative">
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        autoComplete={autoComplete}
        placeholder=" "
        className={`peer w-full px-4 pt-5 pb-2 focus:outline-none ${rightSlot ? 'pr-10' : ''}`}
        style={fieldStyle}
        onFocus={onFieldFocus}
        onBlur={onFieldBlur}
      />
      <label
        htmlFor={id}
        className="absolute left-4 top-3.5 pointer-events-none origin-left
          peer-focus:-translate-y-2.5 peer-focus:scale-75 peer-focus:text-[#7ec8f0]
          peer-[:not(:placeholder-shown)]:-translate-y-2.5 peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:text-[#7ec8f0]"
        style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', transition: 'transform 0.2s ease, color 0.2s ease' }}
      >
        {label}
      </label>
      {rightSlot}
    </div>
  )
}

// Themed select (label above, same field styling).
export function AuthSelect({ label, value, onChange, children }: {
  label: string
  value: string | number
  onChange: (v: string) => void
  children: ReactNode
}) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.78rem', color: 'rgba(255,255,255,0.7)', fontWeight: 600, marginBottom: '0.3rem' }}>{label}</label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full px-3 py-2.5 focus:outline-none"
        style={fieldStyle}
        onFocus={onFieldFocus}
        onBlur={onFieldBlur}
      >
        {children}
      </select>
    </div>
  )
}

// Gradient submit button, identical to the Login button.
export function AuthButton({ children, disabled, type = 'submit', onClick }: {
  children: ReactNode
  disabled?: boolean
  type?: 'submit' | 'button'
  onClick?: () => void
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className="w-full py-3 text-white font-bold tracking-widest uppercase"
      style={{
        background: 'linear-gradient(90deg, #0065A5 0%, #0077bf 100%)',
        borderRadius: '8px', fontSize: '0.88rem', letterSpacing: '0.12em', border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1,
        transition: 'opacity 0.2s, transform 0.15s, box-shadow 0.2s', boxShadow: '0 4px 14px rgba(0,101,165,0.4)',
      }}
      onMouseEnter={e => { if (disabled) return; e.currentTarget.style.opacity = '0.9'; e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,101,165,0.55)' }}
      onMouseLeave={e => { if (disabled) return; e.currentTarget.style.opacity = '1'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,101,165,0.4)' }}
    >
      {children}
    </button>
  )
}

export function AuthError({ children }: { children: ReactNode }) {
  return (
    <div role="alert" style={{ background: 'rgba(220,38,38,0.18)', border: '1px solid rgba(248,113,113,0.6)', borderRadius: '8px', padding: '0.6rem 0.9rem', color: '#ffe4e4', fontSize: '0.82rem' }}>
      {children}
    </div>
  )
}

export function AuthLink({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center justify-center gap-1.5 w-full text-sm font-semibold hover:underline focus:outline-none"
      style={{ color: 'rgba(255,255,255,0.8)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
    >
      {children}
    </button>
  )
}
