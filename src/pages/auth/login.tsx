import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import logo1 from '../../assets/logo1.png'
import logo2 from '../../assets/logo2.png'
import bg from '../../assets/bg.png'

interface LoginProps {
  onLogin: () => void
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [showPassword, setShowPassword] = useState<boolean>(false)

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>): void => {
    e.preventDefault()
    onLogin()
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
      <div className="absolute inset-0 bg-white/30 backdrop-blur-sm pointer-events-none" />

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
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          {/* Username */}
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            className="w-full px-4 py-2.5 border border-[#d1d5db] bg-white text-[#111827] placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-[#0046AD]/40 focus:border-[#0046AD]"
            style={{
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--text-base)',
              transition: 'box-shadow var(--transition-base), border-color var(--transition-base)',
            }}
          />

          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="w-full px-4 py-2.5 pr-10 border border-[#d1d5db] bg-white text-[#111827] placeholder-gray-400
                focus:outline-none focus:ring-2 focus:ring-[#0046AD]/40 focus:border-[#0046AD]"
              style={{
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--text-base)',
                transition: 'box-shadow var(--transition-base), border-color var(--transition-base)',
              }}
            />
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
