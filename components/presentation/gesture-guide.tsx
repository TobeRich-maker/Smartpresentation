"use client"

import { Card } from "@/components/ui/card"

export function GestureGuide() {
  const gestures = [
    { name: "Swipe Left", action: "Previous slide", icon: "👈", key: "←" },
    { name: "Swipe Right", action: "Next slide", icon: "👉", key: "→" },
    { name: "Open Palm", action: "Play video", icon: "✋", key: "O" },
    { name: "Closed Fist", action: "Pause video", icon: "✊", key: "C" },
    { name: "Pointing", action: "Laser pointer", icon: "☝️", key: "P" },
    { name: "Thumbs Up", action: "Approval", icon: "👍", key: "T" },
  ]

  return (
    <Card className="p-4">
      <h2 className="text-xl font-semibold mb-4">Gesture Controls</h2>
      <div className="space-y-2">
        {gestures.map((gesture, index) => (
          <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
            <div className="flex items-center gap-2">
              <span className="text-xl" aria-hidden="true">
                {gesture.icon}
              </span>
              <div>
                <p className="font-medium text-sm">{gesture.name}</p>
                <p className="text-xs text-gray-500">{gesture.action}</p>
              </div>
            </div>
            <kbd className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-xs font-mono">{gesture.key}</kbd>
          </div>
        ))}
      </div>

      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <p className="text-xs text-blue-800 dark:text-blue-200">
          <strong>Keyboard Simulation:</strong> Use the keyboard shortcuts shown above to test gesture controls. The
          camera shows your video feed, and gestures are simulated via keyboard input for reliable testing.
        </p>
      </div>
    </Card>
  )
}
