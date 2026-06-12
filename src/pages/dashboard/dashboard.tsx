import { useState, useEffect, useCallback } from 'react'
import {
  Briefcase,
  Users,
  Sprout,
  Wrench,
  Plane,
  Settings,
  Shield,
  FileText,
  Building2,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
} from 'lucide-react'
import h1 from '../../assets/h1.png'
import h2 from '../../assets/h2.jpg'
import h3 from '../../assets/h3.jpg'
import h4 from '../../assets/h4-1.jpg'

interface DashboardProps {
  onModuleClick: (module: string) => void
}

const bannerSlides = [
  {
    image: h1,
    title: 'Public Employment Service Office',
    description: 'Delivering quality employment facilitation and labor market services to the community',
  },
  {
    image: h2,
    title: 'Building Professional Partnerships',
    description: 'Collaborating with employers and stakeholders to create sustainable employment opportunities',
  },
  {
    image: h3,
    title: 'Career Guidance & Counseling',
    description: 'Helping individuals discover their potential and achieve their career goals',
  },
  {
    image: h4,
    title: 'Workforce Development',
    description: 'Providing skills training and livelihood programs for community empowerment',
  },
]

const pesoPrograms = [
  { id: 'employment', name: 'Employment Facilitation', icon: Briefcase,     color: '#F47C2C' },
  { id: 'cdsp',       name: 'CDSP',                   icon: Users,          color: '#3B82F6' },
  { id: 'gip',        name: 'GIP',                    icon: Building2,      color: '#0EA5E9' },
  { id: 'spes',       name: 'SPES',                   icon: BookOpen,       color: '#EC4899' },
  { id: 'livelihood', name: 'Livelihood',              icon: Sprout,         color: '#10B981' },
  { id: 'skills',     name: 'Skills Training',         icon: Wrench, color: '#8B5CF6' },
  { id: 'ofw',        name: 'OFW',                    icon: Plane,          color: '#F59E0B' },
]

const quickAccess = [
  { id: 'documents',   name: 'Documents',   icon: FolderOpen, color: '#F59E0B' },
  { id: 'maintenance', name: 'Maintenance', icon: Settings,   color: '#6366F1' },
  { id: 'security',    name: 'Security',    icon: Shield,     color: '#EF4444' },
  { id: 'report',      name: 'Report',      icon: FileText,   color: '#06B6D4' },
]

export default function Dashboard({ onModuleClick }: DashboardProps) {
  const [current, setCurrent] = useState(0)

  const next = useCallback(() => setCurrent((c) => (c + 1) % bannerSlides.length), [])
  const prev = () => setCurrent((c) => (c - 1 + bannerSlides.length) % bannerSlides.length)

  useEffect(() => {
    const id = setInterval(next, 5000)
    return () => clearInterval(id)
  }, [next])

  return (
    <div className='bg-brand-bg'>
    <div className="max-w-6xl mx-auto px-6 py-8 bg-brand-bg">

      {/* Hero Carousel */}
      <div
        className="relative mb-8 rounded-2xl overflow-hidden"
        style={{ boxShadow: 'var(--shadow-md)' }}
      >
        {/* Slides track */}
        <div className="h-80 overflow-hidden">
          <div
            className="flex h-full transition-transform duration-500 ease-in-out"
            style={{ transform: `translateX(-${current * 100}%)` }}
          >
            {bannerSlides.map((slide, i) => (
              <div key={i} className="relative h-full w-full shrink-0">
                <img src={slide.image} alt={slide.title} className="w-full h-full object-cover" />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/40 to-transparent pt-16 pb-8 px-12">
                  <p className="text-white font-bold mb-1 drop-shadow-lg" style={{ fontSize: 'var(--text-xl)' }}>
                    {slide.title}
                  </p>
                  <p className="text-white/90 drop-shadow-md max-w-3xl" style={{ fontSize: 'var(--text-sm)' }}>
                    {slide.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Prev arrow */}
        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white rounded-full p-3 transition-all"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <ChevronLeft size={24} className="text-gray-800" />
        </button>

        {/* Next arrow */}
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 bg-white/80 hover:bg-white rounded-full p-3 transition-all"
          style={{ boxShadow: 'var(--shadow-sm)' }}
        >
          <ChevronRight size={24} className="text-gray-800" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-5 right-10 z-20 flex gap-2">
          {bannerSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`rounded-full transition-all duration-300 ${
                i === current ? 'w-3 h-3 bg-white' : 'w-2.5 h-2.5 bg-white/50 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      </div>

      {/* PESO Programs & Services */}
      <div className="mb-12">
        <p className="text-gray-800 font-bold mb-5 text-left" style={{ fontSize: 'var(--text-xl)' }}>
          PESO Programs &amp; Services
        </p>
        <div className="grid mt-5 grid-cols-4 gap-5">
          {pesoPrograms.map((module) => {
            const Icon = module.icon
            return (
              <button
                key={module.id}
                onClick={() => onModuleClick(module.id)}
                className="bg-white rounded-2xl py-6 px-5 flex flex-col items-center gap-3 group hover:-translate-y-0.5 transition-all duration-300 border-2 border-transparent"
                style={{ boxShadow: 'var(--shadow-sm)' }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = '#0077BE' }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'transparent' }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: `${module.color}20` }}
                >
                  <Icon size={30} style={{ color: module.color }} strokeWidth={1.75} />
                </div>
                <span className="text-gray-700 text-center font-semibold" style={{ fontSize: 'var(--text-sm)' }}>
                  {module.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Quick Access */}
      <div>
        <p className="text-gray-800 font-bold mb-5 text-left" style={{ fontSize: 'var(--text-xl)' }}>
          Quick Access
        </p>
        <div className="grid mt-5 grid-cols-4 gap-5">
          {quickAccess.map((module) => {
            const Icon = module.icon
            return (
              <button
                key={module.id}
                onClick={() => onModuleClick(module.id)}
                className="bg-white rounded-2xl py-6 px-5 flex flex-col items-center gap-3 group hover:-translate-y-0.5 transition-all duration-300 border-2 border-transparent"
                style={{ boxShadow: 'var(--shadow-sm)' }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-md)'; e.currentTarget.style.borderColor = '#0077BE' }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = 'var(--shadow-sm)'; e.currentTarget.style.borderColor = 'transparent' }}
              >
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundColor: `${module.color}20` }}
                >
                  <Icon size={30} style={{ color: module.color }} strokeWidth={1.75} />
                </div>
                <span className="text-gray-700 text-center font-semibold" style={{ fontSize: 'var(--text-sm)' }}>
                  {module.name}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
    </div>
  )
}
