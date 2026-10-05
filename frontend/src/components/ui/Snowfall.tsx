import React from "react";

interface SnowfallProps {
  count?: number;
  enabled?: boolean;
}

/**
 * Snowfall is disabled by default for production business operations.
 * If explicitly enabled, renders a lightweight decoration without heavy DOM overhead.
 */
export default function Snowfall({ count = 12, enabled = false }: SnowfallProps) {
  if (!enabled) return null;

  const safeCount = Math.min(count, 16);
  const flakes = Array.from({ length: safeCount }, (_, i) => ({
    id: i,
    x: (i * 100) / safeCount,
    size: (i % 3) + 2,
    duration: 15 + (i % 10),
    delay: (i * 1.5) % 10,
    opacity: 0.2 + (i % 3) * 0.1,
  }));

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden" aria-hidden="true">
      {flakes.map((flake) => (
        <div
          key={flake.id}
          className="absolute rounded-full bg-white/40 shadow-sm"
          style={{
            left: `${flake.x}%`,
            width: `${flake.size}px`,
            height: `${flake.size}px`,
            opacity: flake.opacity,
            animation: `snowfall ${flake.duration}s linear infinite`,
            animationDelay: `${flake.delay}s`,
          }}
        />
      ))}
    </div>
  );
}
