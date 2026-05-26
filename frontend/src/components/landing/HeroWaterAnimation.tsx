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
        {[0, 1, 2].map((i) => (
          <motion.circle
            key={`dot-${i}`}
            r="5"
            fill="#14b8a6"
            opacity="0.5"
            initial={{ offsetDistance: '0%' }}
            animate={{ offsetDistance: '100%' }}
            transition={{
              duration: 5,
              delay: i * 1.2,
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
          <motion.circle
            key={`node-${i}`}
            cx={node.cx}
            cy={node.cy}
            r="14"
            fill="none"
            stroke="#14b8a6"
            strokeWidth="2"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.6, 0.4] }}
            transition={{
              delay: 0.5 + i * 0.3,
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}

        {/* Rising bubbles */}
        {[
          { x: 200, delay: 0, r: 4, dur: 5 },
          { x: 400, delay: 1.5, r: 3, dur: 6 },
          { x: 600, delay: 0.8, r: 5, dur: 4.5 },
        ].map((b, i) => (
          <motion.circle
            key={`bubble-${i}`}
            cx={b.x}
            r={b.r}
            fill="#14b8a6"
            opacity="0.3"
            initial={{ cy: 380, opacity: 0 }}
            animate={{ cy: -20, opacity: [0, 0.4, 0] }}
            transition={{
              duration: b.dur,
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


    </div>
  )
}

export default HeroWaterAnimation
