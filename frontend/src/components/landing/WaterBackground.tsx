import { motion } from 'framer-motion'

/**
 * Full-screen animated water background with multiple layered waves.
 * Uses CSS gradients and Framer Motion for smooth organic movement.
 */
const WaterBackground = () => {
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950" />

      {/* Animated gradient orbs */}
      <motion.div
        animate={{
          x: [0, 100, -50, 0],
          y: [0, -80, 40, 0],
          scale: [1, 1.2, 0.9, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        className="absolute -top-1/4 -left-1/4 w-[80vw] h-[80vw] rounded-full
                   bg-gradient-to-br from-teal-900/30 to-transparent blur-[120px]"
      />
      <motion.div
        animate={{
          x: [0, -80, 60, 0],
          y: [0, 60, -40, 0],
          scale: [1, 0.8, 1.1, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: 'linear' }}
        className="absolute -bottom-1/4 -right-1/4 w-[70vw] h-[70vw] rounded-full
                   bg-gradient-to-tl from-cyan-900/20 to-transparent blur-[120px]"
      />
      <motion.div
        animate={{
          x: [0, 50, -30, 0],
          y: [0, -50, 30, 0],
        }}
        transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
        className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[60vw] h-[60vw] rounded-full
                   bg-gradient-to-br from-blue-900/15 to-transparent blur-[100px]"
      />

      {/* Animated wave layers using SVG */}
      <div className="absolute bottom-0 left-0 right-0 h-64 opacity-[0.06]">
        <motion.svg
          viewBox="0 0 1440 320"
          className="absolute bottom-0 w-full"
          animate={{ x: [0, -200, 0] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
          preserveAspectRatio="none"
        >
          <path
            fill="url(#wave1)"
            d="M0,224L48,213.3C96,203,192,181,288,181.3C384,181,480,203,576,224C672,245,768,267,864,261.3C960,256,1056,224,1152,208C1248,192,1344,192,1392,192L1440,192L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
          <defs>
            <linearGradient id="wave1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#14b8a6" />
              <stop offset="50%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
        </motion.svg>

        <motion.svg
          viewBox="0 0 1440 320"
          className="absolute bottom-0 w-full"
          animate={{ x: [0, 150, 0] }}
          transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }}
          preserveAspectRatio="none"
        >
          <path
            fill="url(#wave2)"
            fillOpacity="0.5"
            d="M0,160L48,176C96,192,192,224,288,218.7C384,213,480,171,576,170.7C672,171,768,213,864,218.7C960,224,1056,192,1152,176C1248,160,1344,160,1392,160L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
          />
          <defs>
            <linearGradient id="wave2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#14b8a6" />
            </linearGradient>
          </defs>
        </motion.svg>
      </div>

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />
    </div>
  )
}

export default WaterBackground
