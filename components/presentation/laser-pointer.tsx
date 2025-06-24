"use client"

interface LaserPointerProps {
  position: { x: number; y: number }
}

export function LaserPointer({ position }: LaserPointerProps) {
  // Calculate position as percentage of container
  const pointerStyle = {
    left: `${position.x * 100}%`,
    top: `${position.y * 100}%`,
  }

  return (
    <div
      className="absolute w-6 h-6 pointer-events-none transform -translate-x-1/2 -translate-y-1/2 z-50"
      style={pointerStyle}
      aria-hidden="true"
    >
      {/* Laser dot with glow effect */}
      <div className="w-4 h-4 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50">
        <div className="w-full h-full rounded-full bg-red-600 opacity-75 animate-ping" />
      </div>
    </div>
  )
}
