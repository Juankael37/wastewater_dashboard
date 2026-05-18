import { motion } from 'framer-motion'
import { useMemo } from 'react'

/**
 * Floating particle system that simulates water molecules / data flowing.
 * Particles have randomized positions, sizes, and animation timings.
 */
const FlowingParticles = () => {
  const particles = useMemo(() => {
    return Array.from({ length: 30 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 2 + Math.random() * 4,
      duration: 8 + Math.random() * 12,
      delay: Math.random() * 5,
      opacity: 0.1 + Math.random() * 0.3,
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
            y: [0, -80 - Math.random() * 120, 0],
            x: [0, (Math.random() - 0.5) * 60, 0],
            opacity: [p.opacity * 0.3, p.opacity, p.opacity * 0.3],
            scale: [1, 1.5, 1],
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
        { x: '10%', y: '40%', size: 120, color: 'teal' },
        { x: '80%', y: '60%', size: 100, color: 'cyan' },
        { x: '50%', y: '20%', size: 80, color: 'blue' },
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
                : orb.color === 'cyan'
                ? 'radial-gradient(circle, rgba(6, 182, 212, 0.06) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(59, 130, 246, 0.05) 0%, transparent 70%)',
          }}
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 6 + i * 2,
            repeat: Infinity,
            ease: 'easeInOut',
            delay: i * 1.5,
          }}
        />
      ))}
    </div>
  )
}

export default FlowingParticles
