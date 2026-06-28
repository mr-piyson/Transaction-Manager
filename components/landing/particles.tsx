'use client';

import { useEffect, useState } from 'react';

const orbs = [
  { color: '--color-info', size: 500, x: '10%', y: '10%', duration: 25 },
  { color: '--color-primary', size: 400, x: '70%', y: '20%', duration: 30 },
  { color: '--color-success', size: 350, x: '80%', y: '60%', duration: 20 },
  { color: '--color-warning', size: 450, x: '20%', y: '70%', duration: 28 },
  { color: '--color-info', size: 300, x: '50%', y: '40%', duration: 22 },
];

export default function Particles() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return null;

  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      {orbs.map((orb, i) => (
        <div
          key={i}
          className="absolute animate-pulse rounded-full blur-3xl"
          style={{
            width: orb.size,
            height: orb.size,
            left: orb.x,
            top: orb.y,
            background: `var(${orb.color})`,
            opacity: 0.08,
            animation: `float-${i} ${orb.duration}s ease-in-out infinite alternate`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
      <style>{`
        ${orbs
          .map(
            (_, i) => `
          @keyframes float-${i} {
            0% { transform: translate(-50%, -50%) translate(0, 0) scale(1); }
            33% { transform: translate(-50%, -50%) translate(60px, -40px) scale(1.1); }
            66% { transform: translate(-50%, -50%) translate(-30px, 50px) scale(0.9); }
            100% { transform: translate(-50%, -50%) translate(40px, 20px) scale(1.05); }
          }
        `
          )
          .join('')}
      `}</style>
    </div>
  );
}
