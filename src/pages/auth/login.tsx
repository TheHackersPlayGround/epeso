import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import logo1 from '../../assets/logo1.png'
import logo2 from '../../assets/logo22.png'
import bg from '../../assets/tangub.png'
import Forgot from './forgot'

interface LoginProps {
  onLogin: () => void
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [showPassword, setShowPassword] = useState<boolean>(false)
  const [showForgot, setShowForgot] = useState<boolean>(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    onLogin()
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
      {/* Background overlay */}
      <div className="absolute inset-0 bg-white/10 backdrop-blur-sm pointer-events-none" />

      {/* Login card */}
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
          className="text-center font-extrabold tracking-widest mb-6 uppercase"
          style={{
            color: '#0077BE',
            fontSize: 'var(--text-lg)',
            margin: '0 0 1.5rem',
            lineHeight: '1',
          }}
        >
          User Login
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {/* Username — floating label */}
          <div className="relative">
            <input
              id="login-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              placeholder=" "
              className="peer w-full px-4 pt-5 pb-2 border border-[#d1d5db] bg-white text-[#111827]
                focus:outline-none focus:ring-2 focus:ring-[#0046AD]/40 focus:border-[#0046AD]"
              style={{
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-base)',
                transition: 'box-shadow var(--transition-base), border-color var(--transition-base)',
              }}
            />
            <label
              htmlFor="login-username"
              className="absolute left-4 top-3.5 text-gray-400 pointer-events-none origin-left
                peer-focus:-translate-y-2.5 peer-focus:scale-75 peer-focus:text-[#0046AD]
                peer-[:not(:placeholder-shown)]:-translate-y-2.5 peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:text-[#0046AD]"
              style={{
                fontSize: '0.875rem',
                transition: 'transform 0.2s ease, font-size 0.2s ease, color 0.2s ease',
              }}
            >
              Username
            </label>
          </div>

          {/* Password — floating label */}
          <div className="relative">
            <input
              id="login-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder=" "
              className="peer w-full px-4 pt-5 pb-2 pr-10 border border-[#d1d5db] bg-white text-[#111827]
                focus:outline-none focus:ring-2 focus:ring-[#0046AD]/40 focus:border-[#0046AD]"
              style={{
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-base)',
                transition: 'box-shadow var(--transition-base), border-color var(--transition-base)',
              }}
            />
            <label
              htmlFor="login-password"
              className="absolute left-4 top-3.5 text-gray-400 pointer-events-none origin-left
                peer-focus:-translate-y-2.5 peer-focus:scale-75 peer-focus:text-[#0046AD]
                peer-[:not(:placeholder-shown)]:-translate-y-2.5 peer-[:not(:placeholder-shown)]:scale-75 peer-[:not(:placeholder-shown)]:text-[#0046AD]"
              style={{
                fontSize: '0.875rem',
                transition: 'transform 0.2s ease, font-size 0.2s ease, color 0.2s ease',
              }}
            >
              Password
            </label>
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              style={{ background: 'none', border: 'none', padding: 0 }}
            >
              {showPassword ? <EyeOff size={22} /> : <Eye size={22} />}
            </button>
          </div>

          {/* Forgot password link */}
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => setShowForgot(true)}
              className="text-sm font-semibold hover:underline focus:outline-none"
              style={{ color: '#0077BE', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Forgot Password?
            </button>
          </div>

          {/* LOG IN button */}
          <button
            type="submit"
            className="w-full mt-2 py-2.5 text-white font-bold tracking-widest uppercase
              hover:scale-[1.01] active:scale-[0.99]"
            style={{
              backgroundColor: '#0077BE',
              borderRadius: 'var(--radius-full)',
              fontSize: 'var(--text-md)',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#005f9e'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'var(--shadow-xs)'
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#0077BE'
              ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
            }}
          >
            Log In
          </button>
        </form>
      </div>
    </div>
  )
}
