import { useRef, useEffect, useState } from 'react'
import { motion, useInView } from 'framer-motion'
import type { LucideIcon } from 'lucide-react'

interface StatsCounterProps {
  end: number
  suffix?: string
  label: string
  icon: LucideIcon
}

/**
 * Animated counter card that counts up when scrolled into view.
 * Inspired by 21st.dev stats patterns with glassmorphism card design.
 */
const StatsCounter = ({ end, suffix = '', label, icon: Icon }: StatsCounterProps) => {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-50px' })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isInView) return
    
    const duration = 2000
    const steps = 60
    const stepTime = duration / steps
    const increment = end / steps
    let current = 0
    let step = 0

    const timer = setInterval(() => {
      step++
      // Ease-out curve
      const progress = step / steps
      const easedProgress = 1 - Math.pow(1 - progress, 3)
      current = easedProgress * end
      setCount(Math.min(current, end))

      if (step >= steps) {
        setCount(end)
        clearInterval(timer)
      }
    }, stepTime)

    return () => clearInterval(timer)
  }, [isInView, end])

  const displayValue = end % 1 !== 0
    ? count.toFixed(1)
    : Math.round(count).toString()

  return (
    <motion.div
      ref={ref}
      variants={{
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
      }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className="group relative cursor-pointer"
    >
      <div className="relative bg-slate-800/50 backdrop-blur-xl border border-slate-700/50
                      rounded-2xl p-6 sm:p-8 text-center hover:border-teal-500/30
                      transition-all duration-500">
        {/* Glow on hover */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-teal-500/5 to-cyan-500/5
                        opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        <div className="relative z-10">
          <div className="w-12 h-12 rounded-xl bg-teal-500/10 flex items-center justify-center
                          mx-auto mb-4 group-hover:bg-teal-500/20 transition-colors duration-300">
            <Icon className="w-6 h-6 text-teal-400" />
          </div>
          <div className="text-3xl sm:text-4xl font-bold text-white mb-1 font-mono tracking-tight">
            {displayValue}
            <span className="text-teal-400">{suffix}</span>
          </div>
          <div className="text-sm text-slate-400 font-medium">{label}</div>
        </div>
      </div>
    </motion.div>
  )
}

export default StatsCounter
