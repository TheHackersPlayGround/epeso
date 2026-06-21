import { ArrowLeft, User } from 'lucide-react'
import logoImage from '../../assets/logo3.png'
import cityLogo from '../../assets/logo22.png'

interface AboutViewProps {
  onBack: () => void
}

const topOfficer = { position: 'PESO Manager / OIC', role: 'Head of Office', name: 'Name Here' }
const adminAssistant = { position: 'Administrative Assistant', role: 'Office Support', name: 'Name Here' }

const divisions = [
  {
    title: 'Administrative &',
    subtitle: 'Finance Unit',
    staff: [
      { position: 'Administrative Aide', name: 'Name Here' },
      { position: 'Records Officer', name: 'Name Here' },
    ],
  },
  {
    title: 'Employment',
    subtitle: 'Services Unit',
    staff: [
      { position: 'Job Placement Officer', name: 'Name Here' },
      { position: 'Employment Specialist', name: 'Name Here' },
      { position: 'Labor Market Analyst', name: 'Name Here' },
    ],
  },
  {
    title: 'Special Programs &',
    subtitle: 'OFW Services Unit',
    staff: [
      { position: 'SPES Coordinator', name: 'Name Here' },
      { position: 'GIP Coordinator', name: 'Name Here' },
      { position: 'OFW Desk Officer', name: 'Name Here' },
      { position: 'CDSP Coordinator', name: 'Name Here' },
    ],
  },
]

function Avatar({ size }: { size: 'lg' | 'md' | 'sm' }) {
  const dim = size === 'lg' ? 'w-16 h-16' : size === 'md' ? 'w-12 h-12' : 'w-10 h-10'
  const icon = size === 'lg' ? 28 : size === 'md' ? 22 : 16
  return (
    <div className={`${dim} rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0`}>
      <User size={icon} className="text-gray-400" />
    </div>
  )
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

          <div className="max-w-4xl mx-auto border-t border-gray-200 mb-12" />

          {/* Organizational Structure */}
          <section className="max-w-4xl mx-auto mb-16">
            <div className="text-center mb-10">
              <p className="text-3xl font-bold uppercase tracking-widest mb-3" style={{ color: '#111827' }}>Organizational Structure</p>
              <div className="w-12 h-0.5 bg-[#0077BE] rounded-full mx-auto mb-3" />
              <p className="text-xs text-gray-400 italic">Sample structure — to be updated with the actual organizational chart</p>
            </div>

            {/* Org Tree */}
            <div className="flex flex-col items-center">

              {/* Level 1 — Manager */}
              <div className="bg-[#0077BE] text-white rounded-2xl px-10 py-5 text-center shadow-md flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-white/20 ring-2 ring-white/60 flex items-center justify-center">
                  <User size={28} className="text-white/80" />
                </div>
                <div>
                  <p className="text-sm m-0">{topOfficer.position}</p>
                  <p className="text-sm text-white/90 m-0 mt-0.5">{topOfficer.name}</p>
                  <p className="text-xs text-white/60 m-0 mt-0.5">{topOfficer.role}</p>
                </div>
              </div>

              <div className="w-px h-7 bg-gray-300" />

              {/* Level 2 — Admin Assistant */}
              <div className="bg-white border border-gray-200 rounded-2xl px-8 py-4 text-center shadow-sm flex flex-col items-center gap-2">
                <Avatar size="md" />
                <div>
                  <p className="text-sm text-gray-800 m-0">{adminAssistant.position}</p>
                  <p className="text-sm text-gray-700 m-0 mt-0.5">{adminAssistant.name}</p>
                  <p className="text-xs text-gray-400 m-0 mt-0.5">{adminAssistant.role}</p>
                </div>
              </div>

              <div className="w-px h-7 bg-gray-300" />

              {/* Level 3 — Divisions */}
              <div className="relative w-full">
                <div
                  className="absolute top-0 bg-gray-300"
                  style={{ left: '16.67%', right: '16.67%', height: '1px' }}
                />
                <div className="grid grid-cols-3 gap-6">
                  {divisions.map((div) => (
                    <div key={div.title} className="flex flex-col items-center">
                      <div className="w-px h-7 bg-gray-300" />

                      {/* Division label */}
                      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 text-center w-full mb-0">
                        <p className="text-xs text-[#0077BE] m-0 uppercase tracking-wide">{div.title}</p>
                        <p className="text-xs text-[#0077BE] m-0">{div.subtitle}</p>
                      </div>

                      <div className="w-px h-5 bg-gray-300" />

                      {/* Staff cards */}
                      <div className="flex flex-col gap-2.5 w-full">
                        {div.staff.map((member) => (
                          <div
                            key={member.position}
                            className="bg-white border border-gray-100 rounded-xl px-3 py-3 text-center shadow-sm flex flex-col items-center gap-2"
                          >
                            <Avatar size="sm" />
                            <div>
                              <p className="text-xs text-gray-500 m-0">{member.position}</p>
                              <p className="text-xs text-gray-700 m-0 mt-0.5">{member.name}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </section>

        </div>
      </div>
    </div>
  )
}
