import { useMemo } from 'react'

interface Bubble {
  id: number
  left: number
  size: number
  duration: number
  delay: number
  opacity: number
}

const WaterBubbles = () => {
  const bubbles = useMemo<Bubble[]>(() =>
    Array.from({ length: 35 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 8 + 2,
      duration: Math.random() * 12 + 10,
      delay: Math.random() * 10,
      opacity: Math.random() * 0.3 + 0.1,
    })), []
  )

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {bubbles.map((bubble) => (
        <div
          key={bubble.id}
          className="absolute rounded-full"
          style={{
            left: `${bubble.left}%`,
            bottom: '-10px',
            width: `${bubble.size}px`,
            height: `${bubble.size}px`,
            background: `radial-gradient(circle at 30% 30%, rgba(45, 212, 191, ${bubble.opacity + 0.3}), rgba(6, 182, 212, ${bubble.opacity * 0.3}))`,
            border: `1px solid rgba(45, 212, 191, ${bubble.opacity * 0.5})`,
            boxShadow: `0 0 ${bubble.size * 2}px rgba(45, 212, 191, ${bubble.opacity * 0.3})`,
            animation: `bubbleFloat ${bubble.duration}s ${bubble.delay}s infinite linear`,
          }}
        />
      ))}
      <style>{`
        @keyframes bubbleFloat {
          0% {
            transform: translateY(0);
            opacity: 0;
          }
          10% {
            opacity: 1;
          }
          90% {
            opacity: 0.6;
          }
          100% {
            transform: translateY(-110vh);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  )
}

export default WaterBubbles
