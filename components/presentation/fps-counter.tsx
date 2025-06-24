"use client"
import { Card } from "@/components/ui/card"

interface FpsCounterProps {
  fps: number
  isActive: boolean
}

export function FpsCounter({ fps, isActive }: FpsCounterProps) {
  // Determine color based on FPS performance
  const getFpsColor = (fps: number) => {
    if (fps >= 30) return "text-green-500"
    if (fps >= 15) return "text-yellow-500"
    return "text-red-500"
  }

  // Get performance label
  const getPerformanceLabel = (fps: number) => {
    if (fps >= 30) return "Good"
    if (fps >= 15) return "Fair"
    return "Poor"
  }

  if (!isActive) return null

  return (
    <Card className="absolute top-2 right-2 p-2 bg-black/70 text-white text-xs rounded shadow-md z-50 flex items-center space-x-2">
      <div className="flex flex-col">
        <div className="flex items-center">
          <span>FPS:</span>
          <span className={`ml-1 font-bold ${getFpsColor(fps)}`}>{Math.round(fps)}</span>
        </div>
        <span className={`text-xs ${getFpsColor(fps)}`}>{getPerformanceLabel(fps)}</span>
      </div>
    </Card>
  )
}
