import { ArrowLeft } from 'lucide-react'
import logoImage from '../../assets/logo3.png'
import cityLogo from '../../assets/logo22.png'

interface AboutViewProps {
  onBack: () => void
}

export default function AboutView({ onBack }: AboutViewProps) {
  return (
    <div className="bg-gray-50 flex flex-col" style={{ minHeight: 'calc(100vh - 72px)' }}>
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center flex-shrink-0">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-[#0077BE] transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="py-12 px-8">

          {/* Header — logos side by side */}
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto mb-12">
            <div className="flex items-center justify-center gap-6 mb-4">
              <img src={logoImage} alt="PESO Logo" className="w-36 h-36 object-contain" />
              <div className="w-px h-28 bg-gray-200" />
              <img src={cityLogo} alt="City of Tangub Seal" className="w-36 h-36 object-contain" />
            </div>
            <p className="text-gray-800 text-sm mb-0.5">PESO Tangub City</p>
            <p className="text-gray-400 text-xs">Public Employment Service Office</p>
          </div>

          {/* Mission */}
          <section className="max-w-2xl mx-auto text-center mb-12">
            <p className="text-3xl font-bold uppercase tracking-widest mb-3" style={{ color: '#111827' }}>Mission</p>
            <div className="w-12 h-0.5 bg-[#0077BE] rounded-full mx-auto mb-6" />
            <p className="text-gray-600 text-base leading-8">
              As a non-fee charging facilitation agency, it aims to strengthen the overall labor exchange system to address skills, employment and other related concerns.
            </p>
          </section>

          <div className="max-w-2xl mx-auto border-t border-gray-200 mb-12" />

          {/* Vision */}
          <section className="max-w-2xl mx-auto text-center mb-12">
            <p className="text-3xl font-bold uppercase tracking-widest mb-3" style={{ color: '#111827' }}>Vision</p>
            <div className="w-12 h-0.5 bg-[#0077BE] rounded-full mx-auto mb-6" />
            <p className="text-gray-600 text-base leading-8">
              The PESO is a service oriented, multi-service facility, to ensure responsive and efficient delivery of employment services leading to higher labor market outcomes.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
