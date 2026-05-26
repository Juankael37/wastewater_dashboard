import { motion } from 'framer-motion'
import { useMemo } from 'react'

const FlowingParticles = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 3,
      duration: 10 + Math.random() * 10,
      delay: Math.random() * 8,
      opacity: 0.1 + Math.random() * 0.2,
      yDelta: -50 - Math.random() * 60,
      xDelta: (Math.random() - 0.5) * 40,
    }))
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            background: `radial-gradient(circle, rgba(20, 184, 166, ${p.opacity}) 0%, transparent 70%)`,
          }}
          animate={{
            y: [0, p.yDelta, 0],
            x: [0, p.xDelta, 0],
            opacity: [p.opacity * 0.3, p.opacity, p.opacity * 0.3],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      ))}

      {/* Larger glowing orbs */}
      {[
        { x: '10%', y: '40%', size: 100, color: 'teal' },
        { x: '80%', y: '60%', size: 80, color: 'cyan' },
      ].map((orb, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full"
          style={{
            left: orb.x,
            top: orb.y,
            width: orb.size,
            height: orb.size,
            background:
              orb.color === 'teal'
                ? 'radial-gradient(circle, rgba(20, 184, 166, 0.08) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(6, 182, 212, 0.06) 0%, transparent 70%)',
          }}
          animate={{
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 8 + i * 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 2,
          }}
        />
      ))}
    </div>
  )
}

export default FlowingParticles
