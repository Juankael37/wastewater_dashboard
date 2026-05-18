import { motion } from 'framer-motion'

/**
 * Animated wastewater treatment pipeline visualization for the hero section.
 * Shows flowing water through a stylized treatment process with bubbles and flow lines.
 */
const HeroWaterAnimation = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
      {/* Central radial glow */}
      <div className="absolute w-[600px] h-[600px] sm:w-[800px] sm:h-[800px]">
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute inset-0 rounded-full bg-gradient-to-br from-teal-500/20 via-cyan-500/10 to-transparent blur-[80px]"
        />
      </div>

      {/* Water pipe SVG */}
      <svg
        viewBox="0 0 800 400"
        className="absolute w-[90vw] max-w-3xl h-auto opacity-[0.08] sm:opacity-[0.12]"
        fill="none"
      >
        {/* Main pipeline path */}
        <motion.path
          d="M50,200 C150,200 200,100 300,100 C400,100 350,300 450,300 C550,300 500,200 600,200 C700,200 750,150 800,150"
          stroke="url(#pipeGrad)"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 3, ease: 'easeInOut' }}
        />

        {/* Flowing water dots along the path */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <motion.circle
            key={`dot-${i}`}
            r="6"
            fill={i % 2 === 0 ? '#14b8a6' : '#06b6d4'}
            opacity="0.6"
            initial={{ offsetDistance: '0%' }}
            animate={{ offsetDistance: '100%' }}
            transition={{
              duration: 4,
              delay: i * 0.7,
              repeat: Infinity,
              ease: 'linear',
            }}
            style={{
              offsetPath:
                "path('M50,200 C150,200 200,100 300,100 C400,100 350,300 450,300 C550,300 500,200 600,200 C700,200 750,150 800,150')",
            }}
          />
        ))}

        {/* Treatment nodes */}
        {[
          { cx: 150, cy: 200 },
          { cx: 300, cy: 100 },
          { cx: 450, cy: 300 },
          { cx: 600, cy: 200 },
          { cx: 750, cy: 150 },
        ].map((node, i) => (
          <g key={`node-${i}`}>
            <motion.circle
              cx={node.cx}
              cy={node.cy}
              r="16"
              fill="none"
              stroke="#14b8a6"
              strokeWidth="2"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.5 }}
              transition={{ delay: 0.5 + i * 0.3, duration: 0.6 }}
            />
            <motion.circle
              cx={node.cx}
              cy={node.cy}
              r="6"
              fill="#14b8a6"
              initial={{ scale: 0 }}
              animate={{ scale: [1, 1.4, 1] }}
              transition={{
                delay: 0.8 + i * 0.3,
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              opacity="0.4"
            />
          </g>
        ))}

        {/* Rising bubbles */}
        {[
          { x: 200, delay: 0 },
          { x: 350, delay: 1.5 },
          { x: 500, delay: 0.8 },
          { x: 650, delay: 2.2 },
          { x: 250, delay: 3.0 },
          { x: 550, delay: 1.2 },
        ].map((b, i) => (
          <motion.circle
            key={`bubble-${i}`}
            cx={b.x}
            r={3 + Math.random() * 4}
            fill="#14b8a6"
            opacity="0.3"
            initial={{ cy: 380, opacity: 0 }}
            animate={{ cy: -20, opacity: [0, 0.4, 0] }}
            transition={{
              duration: 4 + Math.random() * 3,
              delay: b.delay,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        ))}

        <defs>
          <linearGradient id="pipeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#14b8a6" />
            <stop offset="50%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>

      {/* Floating data indicators */}
      {[
        { label: 'pH 7.2', x: '20%', y: '30%', delay: 0 },
        { label: 'BOD 45', x: '70%', y: '25%', delay: 1.5 },
        { label: 'TSS 82', x: '15%', y: '65%', delay: 3 },
        { label: 'COD 88', x: '75%', y: '70%', delay: 2 },
      ].map((indicator, i) => (
        <motion.div
          key={`indicator-${i}`}
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{
            opacity: [0, 0.6, 0],
            scale: [0.8, 1, 0.8],
            y: [0, -20, 0],
          }}
          transition={{
            duration: 5,
            delay: indicator.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className="absolute hidden sm:block"
          style={{ left: indicator.x, top: indicator.y }}
        >
          <div className="px-3 py-1.5 rounded-lg bg-slate-800/60 backdrop-blur border border-teal-500/20">
            <span className="text-xs font-mono text-teal-400">{indicator.label}</span>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

export default HeroWaterAnimation
