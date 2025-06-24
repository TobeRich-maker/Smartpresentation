"use client"

import { SmartPresentationWithMediaPipe } from "@/components/presentation/smart-presentation-with-mediapipe"

export default function MediaPipeDemoPage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">Smart Presentation with MediaPipe</h1>
        <p className="text-gray-600 text-lg">Real-time hand gesture control using MediaPipe Hands</p>
      </div>

      <SmartPresentationWithMediaPipe />
    </div>
  )
}
