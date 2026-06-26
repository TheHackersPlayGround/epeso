import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import logo1 from '../../assets/logo1.png'
import logo2 from '../../assets/logo22.png'
import bg from '../../assets/tangub.png'
import Forgot from './forgot'
import { login as apiLogin } from '../../services/userService'

interface LoginProps {
  onLogin: () => void
}

const Y = 'rgba(245,197,24,0.75)'  // yellow
const W = 'rgba(255,255,255,0.55)' // white

const CityskylineSVG = () => (
  <svg viewBox="0 0 600 120" xmlns="http://www.w3.org/2000/svg" className="w-full" style={{ display: 'block' }}>
    <rect x="0"   y="60"  width="30" height="60"  fill={W} />
    <rect x="20"  y="40"  width="25" height="80"  fill={Y} />
    <rect x="35"  y="70"  width="20" height="50"  fill={W} />
    <rect x="50"  y="30"  width="18" height="90"  fill={Y} />
    <rect x="62"  y="50"  width="22" height="70"  fill={W} />
    <rect x="80"  y="20"  width="30" height="100" fill={Y} />
    <rect x="84"  y="10"  width="8"  height="15"  fill={Y} />
    <rect x="108" y="55"  width="25" height="65"  fill={W} />
    <rect x="130" y="35"  width="20" height="85"  fill={Y} />
    <rect x="148" y="45"  width="28" height="75"  fill={W} />
    <rect x="173" y="25"  width="22" height="95"  fill={Y} />
    <rect x="177" y="15"  width="6"  height="14"  fill={Y} />
    <rect x="208" y="40"  width="26" height="80"  fill={W} />
    <rect x="250" y="15"  width="35" height="105" fill={Y} />
    <rect x="260" y="5"   width="10" height="14"  fill={Y} />
    <rect x="303" y="30"  width="20" height="90"  fill={W} />
    <rect x="320" y="50"  width="28" height="70"  fill={Y} />
    <rect x="346" y="20"  width="25" height="100" fill={W} />
    <rect x="350" y="10"  width="8"  height="14"  fill={W} />
    <rect x="385" y="38"  width="30" height="82"  fill={Y} />
    <rect x="432" y="28"  width="20" height="92"  fill={W} />
    <rect x="474" y="18"  width="32" height="102" fill={Y} />
    <rect x="480" y="8"   width="8"  height="14"  fill={Y} />
    <rect x="522" y="35"  width="22" height="85"  fill={W} />
    <rect x="565" y="25"  width="20" height="95"  fill={Y} />
    <rect x="0"   y="118" width="600" height="2"  fill="rgba(245,197,24,0.5)" />
  </svg>
)

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [showForgot, setShowForgot] = useState<boolean>(false)
  const [error, setError] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const user = await apiLogin(username.trim(), password)
      try { localStorage.setItem('peso_current_user', JSON.stringify(user)) } catch { /* quota */ }
      onLogin()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (showForgot) {
    return <Forgot onBack={() => setShowForgot(false)} />
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundImage: `url(${bg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Dark overlay on bg */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'rgba(5,15,40,0.55)' }} />

      {/* Main card */}
      <div
        className="relative flex w-full overflow-hidden"
        style={{
          maxWidth: '860px',
          minHeight: '520px',
          borderRadius: '18px',
          boxShadow: '0 24px 64px rgba(231, 226, 226, 0.65)',
          margin: '1rem',
        }}
      >
        {/* ── LEFT PANEL ── navy, content centered */}
        <div
          className="relative flex flex-col items-center justify-center overflow-hidden"
          style={{
            width: '45%',
            background: 'rgba(0,101,165,0.88)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            padding: '2.5rem 2rem 0',
          }}
        >
          {/* Diagonal gold accent */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '-40px', right: '-30px',
              width: '90px', height: '340px',
              background: 'rgba(212, 158, 23, 0.67)',
              transform: 'rotate(18deg)',
              borderRadius: '6px',
            }}
          />
          {/* Diagonal green accent */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: '-60px', right: '20px',
              width: '32px', height: '320px',
              background: 'rgba(0,101,165,0.35)',
              transform: 'rotate(18deg)',
              borderRadius: '4px',
            }}
          />

          {/* Centered content */}
          <div className="relative z-10 flex flex-col items-center text-center">
            {/* Logos */}
            <div className="flex items-center gap-4 mb-5">
              <img
                src={logo1}
                alt="PESO Logo"
                style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'contain', background: 'white', padding: '5px' }}
              />
              <img
                src={logo2}
                alt="Tangub City Seal"
                style={{ width: '100px', height: '100px', borderRadius: '50%', objectFit: 'contain', background: 'white', padding: '1px' }}
              />
            </div>

            {/* Gold divider centered */}
            <div style={{ width: '48px', height: '3px', background: '#f5c518', borderRadius: '2px', marginBottom: '1.1rem' }} />

            <p
              style={{
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '1.45rem',
                lineHeight: '1.3',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              Electronic <br />Public Employment<br />Service Office
            </p>
          </div>

          {/* City skyline pinned to bottom */}
          <div className="absolute bottom-0 left-0 right-0 z-10">
            <CityskylineSVG />
          </div>
        </div>

        {/* ── RIGHT PANEL ── transparent blur */}
        <div
          className="flex flex-col justify-center"
          style={{
            width: '55%',
            background: 'rgba(255, 254, 254, 0.11)',
            backdropFilter: 'blur(18px)',
            WebkitBackdropFilter: 'blur(18px)',
            padding: '3rem 2.8rem',
            position: 'relative',
            overflow: 'hidden',
            borderLeft: '1px solid rgba(226, 255, 4, 0.72)',
          }}
        >
          {/* Corner accents */}
          <div className="absolute pointer-events-none" style={{ top: '-40px', right: '-40px', width: '130px', height: '130px', background: '#0065A5', transform: 'rotate(45deg)', opacity: 0.15 }} />
          <div className="absolute pointer-events-none" style={{ bottom: '-30px', left: '-30px', width: '100px', height: '100px', background: '#d4a017', transform: 'rotate(45deg)', opacity: 0.12 }} />

          {/* Header */}
          <div className="mb-6 relative z-10">
            <p style={{ color: '#ffffff', fontWeight: 800, fontSize: '1.5rem', letterSpacing: '0.03em', textTransform: 'uppercase', marginBottom: '0.2rem' }}>
              Welcome Back
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '28px', height: '3px', background: '#0065A5', borderRadius: '2px' }} />
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', fontWeight: 500 }}>
                Sign in to your E-PESO Account
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 relative z-10">
            {/* Error message */}
            {error && (
              <div
                role="alert"
                style={{
                  background: 'rgba(220,38,38,0.18)',
                  border: '1px solid rgba(248,113,113,0.6)',
                  borderRadius: '8px',
                  padding: '0.6rem 0.9rem',
                  color: '#ffe4e4',
                  fontSize: '0.82rem',
                }}
              >
                {error}
              </div>
            )}
            {/* Username */}
            <div className="relative">
              <input
                id="login-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder=" "
                className="peer w-full px-4 pt-5 pb-2 focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1.5px solid rgba(255,255,255,0.35)',
                  borderRadius: '8px',
                  fontSize: '0.92rem',
                  color: '#ffffff',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#0065A5'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,101,165,0.28)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
              <label
                htmlFor="login-username"
                className="absolute left-4 top-3.5 pointer-events-none origin-left
                  peer-focus:-translate-y-2.5 peer-focus:scale-75 peer-focus:text-[#7ec8f0]
                  peer-[:not(:placeholder-shown)]:-translate-y-2.5 peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:text-[#7ec8f0]"
                style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', transition: 'transform 0.2s ease, color 0.2s ease' }}
              >
                Username
              </label>
            </div>

            {/* Password */}
            <div className="relative">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder=" "
                className="peer w-full px-4 pt-5 pb-2 pr-10 focus:outline-none"
                style={{
                  background: 'rgba(255,255,255,0.15)',
                  border: '1.5px solid rgba(255,255,255,0.35)',
                  borderRadius: '8px',
                  fontSize: '0.92rem',
                  color: '#ffffff',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = '#0065A5'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,101,165,0.28)'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'rgba(255,255,255,0.35)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
              <label
                htmlFor="login-password"
                className="absolute left-4 top-3.5 pointer-events-none origin-left
                  peer-focus:-translate-y-2.5 peer-focus:scale-75 peer-focus:text-[#7ec8f0]
                  peer-[:not(:placeholder-shown)]:-translate-y-2.5 peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:text-[#7ec8f0]"
                style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.6)', transition: 'transform 0.2s ease, color 0.2s ease' }}
              >
                Password
              </label>
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3 top-1/2 -translate-y-1/2 focus:outline-none"
                style={{ background: 'none', border: 'none', padding: 0, color: 'rgba(255,255,255,0.6)', cursor: 'pointer' }}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {/* Forgot password */}
            <div className="flex justify-end" style={{ marginTop: '-6px' }}>
              <button
                type="button"
                onClick={() => setShowForgot(true)}
                className="text-sm font-semibold hover:underline focus:outline-none"
                style={{ color: 'rgba(255,255,255,0.75)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                Forgot Password?
              </button>
            </div>

            {/* Log In button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-white font-bold tracking-widest uppercase"
              style={{
                background: 'linear-gradient(90deg, #0065A5 0%, #0077bf 100%)',
                borderRadius: '8px',
                fontSize: '0.88rem',
                letterSpacing: '0.12em',
                border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'opacity 0.2s, transform 0.15s, box-shadow 0.2s',
                boxShadow: '0 4px 14px rgba(0,101,165,0.4)',
              }}
              onMouseEnter={(e) => {
                if (loading) return
                e.currentTarget.style.opacity = '0.9'
                e.currentTarget.style.transform = 'translateY(-1px)'
                e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,101,165,0.55)'
              }}
              onMouseLeave={(e) => {
                if (loading) return
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,101,165,0.4)'
              }}
            >
              {loading ? 'Signing in…' : 'Log In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
