import { motion } from "framer-motion";
import { useMemo } from "react";

interface Bubble {
  id: number;
  size: number;
  x: number;
  y: number;
  delay: number;
  duration: number;
  opacity: number;
}

export function FloatingBubbles({ count = 8, className = "" }: { count?: number; className?: string }) {
  const bubbles = useMemo<Bubble[]>(() =>
    Array.from({ length: count }, (_, i) => ({
      id: i,
      size: 20 + Math.random() * 80,
      x: Math.random() * 100,
      y: Math.random() * 100,
      delay: Math.random() * 4,
      duration: 6 + Math.random() * 8,
      opacity: 0.08 + Math.random() * 0.15,
    })),
  [count]);

  return (
    <div className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}>
      {bubbles.map((b) => (
        <motion.div
          key={b.id}
          className="absolute rounded-full"
          style={{
            width: b.size,
            height: b.size,
            left: `${b.x}%`,
            top: `${b.y}%`,
            background: `radial-gradient(circle at 30% 30%, oklch(0.72 0.25 ${330 + Math.random() * 30} / ${b.opacity + 0.3}), oklch(0.52 0.30 ${295 + Math.random() * 40} / ${b.opacity + 0.15}))`,
            filter: "blur(1px)",
          }}
          animate={{
            y: [0, -(15 + Math.random() * 25), 0],
            x: [0, (Math.random() - 0.5) * 20, 0],
            scale: [1, 1.05 + Math.random() * 0.1, 1],
            opacity: [b.opacity, b.opacity * 1.5, b.opacity],
          }}
          transition={{
            duration: b.duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay: b.delay,
          }}
        />
      ))}
    </div>
  );
}

export function MorphBlob({ className = "", color = "from-pink-300 to-purple-400", size = "w-64 h-64" }: { className?: string; color?: string; size?: string }) {
  return (
    <div
      className={`absolute bg-gradient-to-br ${color} opacity-20 blur-3xl ${size} ${className}`}
      style={{ animation: "morph 12s ease-in-out infinite, float 8s ease-in-out infinite" }}
    />
  );
}

export function GridPattern({ className = "" }: { className?: string }) {
  return (
    <div className={`absolute inset-0 pointer-events-none ${className}`}>
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `linear-gradient(oklch(0.5 0.1 340 / 0.3) 1px, transparent 1px), linear-gradient(90deg, oklch(0.5 0.1 340 / 0.3) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}

export function GlowOrb({ className = "", color = "oklch(0.68 0.22 340 / 0.15)", size = 300 }: { className?: string; color?: string; size?: number }) {
  return (
    <motion.div
      className={`absolute rounded-full pointer-events-none ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${color}, transparent 70%)`,
        filter: "blur(40px)",
      }}
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}
