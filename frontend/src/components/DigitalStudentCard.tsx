import { useEffect, useRef, useState } from 'react'
import { User, Shield } from 'lucide-react'

export default function DigitalStudentCard() {
  const cardRef = useRef<HTMLDivElement>(null)
  const [isRotating, setIsRotating] = useState(false)

  useEffect(() => {
    const card = cardRef.current
    if (!card) return

    const handleMouseMove = (e: MouseEvent) => {
      const rect = card.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top

      const centerX = rect.width / 2
      const centerY = rect.height / 2

      const rotateX = ((y - centerY) / centerY) * -5
      const rotateY = ((x - centerX) / centerX) * 5

      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`
    }

    const handleMouseLeave = () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg)'
    }

    card.addEventListener('mousemove', handleMouseMove)
    card.addEventListener('mouseleave', handleMouseLeave)

    return () => {
      card.removeEventListener('mousemove', handleMouseMove)
      card.removeEventListener('mouseleave', handleMouseLeave)
    }
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div
        ref={cardRef}
        className="group relative w-full max-w-[420px] cursor-pointer transition-transform duration-200 ease-out"
      >
        {/* Card Container */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 p-6 shadow-2xl">
          {/* Holographic Effect Overlay */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-white/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
          <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/20 via-purple-500/20 to-pink-500/20 animate-shine pointer-events-none"></div>

          {/* Animated Border */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 opacity-50 blur-sm animate-border-glow"></div>

          {/* Inner Border */}
          <div className="absolute inset-[1px] rounded-2xl bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800"></div>

          {/* Card Content */}
          <div className="relative z-10 flex flex-col gap-5">
            {/* Header with Logo and Status */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg">
                  <Shield className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-cyan-400 uppercase tracking-wider">
                    Academy
                  </h3>
                  <p className="text-xs text-slate-400">Management System</p>
                </div>
              </div>

              {/* Active Status Badge */}
              <div className="relative inline-flex">
                <div className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-20"></div>
                <div className="relative inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-green-500/20 to-emerald-500/20 px-3 py-1.5 border border-green-500/30">
                  <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></div>
                  <span className="text-xs font-semibold text-green-400">Active</span>
                </div>
              </div>
            </div>

            {/* Student Information */}
            <div className="flex gap-4">
              {/* Student Photo */}
              <div className="relative flex-shrink-0">
                <div className="relative h-24 w-24 overflow-hidden rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 border-2 border-slate-600 shadow-lg">
                  <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-700/50 to-slate-800/50">
                    <User className="h-12 w-12 text-slate-400" />
                  </div>
                  {/* Shimmer Effect on Photo */}
                  <div className="absolute inset-0 bg-gradient-to-br from-white/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </div>
                {/* Photo Border Glow */}
                <div className="absolute -inset-0.5 rounded-xl bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500 opacity-30 blur-sm"></div>
              </div>

              {/* Student Details */}
              <div className="flex flex-col justify-center gap-2 flex-1">
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    Student Name
                  </p>
                  <h2 className="text-lg font-bold text-white tracking-tight">
                    John Anderson
                  </h2>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    Student ID
                  </p>
                  <p className="text-base font-mono font-semibold text-cyan-400">
                    STU-001
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
                    Class
                  </p>
                  <p className="text-xs font-semibold text-slate-300">
                    Computer Science - Year 3
                  </p>
                </div>
              </div>
            </div>

            {/* QR Code Section */}
            <div className="mt-2 flex items-center justify-between rounded-xl bg-gradient-to-r from-slate-800/50 to-slate-700/50 p-3 border border-slate-700/50 backdrop-blur-sm">
              <div>
                <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wider mb-1">
                  Scan for Verification
                </p>
                <p className="text-xs text-slate-500">
                  QR Code for student identification
                </p>
              </div>
              {/* QR Code Placeholder */}
              <div className="relative flex h-14 w-14 items-center justify-center rounded-lg bg-white p-1.5 shadow-lg">
                <div className="h-full w-full rounded border-2 border-dashed border-slate-300">
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="grid grid-cols-3 gap-0.5">
                      {[...Array(9)].map((_, i) => (
                        <div
                          key={i}
                          className={`h-2 w-2 rounded-sm ${
                            [0, 2, 4, 6, 8].includes(i) ? 'bg-slate-800' : 'bg-slate-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                {/* QR Code Glow */}
                <div className="absolute -inset-0.5 rounded-lg bg-gradient-to-br from-cyan-500 via-purple-500 to-pink-500 opacity-20 blur-sm"></div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                Valid until Dec 2025
              </p>
              <div className="flex items-center gap-2">
                <div className="h-6 w-10 rounded bg-gradient-to-br from-yellow-500/20 to-orange-500/20 border border-yellow-500/30 flex items-center justify-center">
                  <div className="h-4 w-4 rounded-full border-2 border-yellow-400/50 flex items-center justify-center">
                    <div className="h-1.5 w-1.5 rounded-full bg-yellow-400/60"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
