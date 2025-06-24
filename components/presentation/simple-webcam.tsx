"use client"

import { useRef, useEffect, useState } from "react"
import { useSimpleGestureDetection, type GestureType } from "@/hooks/use-simple-gesture-detection"

interface SimpleWebcamProps {
  enabled: boolean
  onGestureDetected?: (gesture: GestureType) => void
  showDebugInfo?: boolean
}

export function SimpleWebcam({ enabled, onGestureDetected, showDebugInfo = false }: SimpleWebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Use simple gesture detection
  const { currentGesture, isDetecting, fps, testMode, setTestMode } = useSimpleGestureDetection({
    enabled,
    onGestureDetected,
    debounceMs: 800,
  })

  // Start camera when enabled
  useEffect(() => {
    if (!enabled) return

    const startCamera = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
            facingMode: "user",
          },
        })

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }

        setIsLoading(false)
      } catch (err: any) {
        console.error("Camera error:", err)
        setError(`Camera access failed: ${err.message}`)
        setIsLoading(false)
      }
    }

    startCamera()

    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream
        stream.getTracks().forEach((track) => track.stop())
      }
    }
  }, [enabled])

  if (!enabled) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <p className="text-gray-500">Camera disabled</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/20 p-4">
        <p className="text-red-600 dark:text-red-400 font-medium mb-2">Camera Error</p>
        <p className="text-red-500 dark:text-red-300 text-sm text-center">{error}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Starting camera...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }} // Mirror the video
      />

      {/* Status indicators */}
      <div className="absolute top-2 left-2 space-y-1">
        {/* Detection status */}
        <div className={`px-2 py-1 rounded text-xs text-white ${isDetecting ? "bg-green-600/70" : "bg-gray-600/70"}`}>
          {isDetecting ? "Detecting" : "Stopped"}
        </div>

        {/* FPS Counter */}
        <div className="bg-black/70 text-white px-2 py-1 rounded text-xs">FPS: {fps}</div>

        {/* Test mode indicator */}
        {testMode && <div className="bg-blue-600/70 text-white px-2 py-1 rounded text-xs">Test Mode</div>}
      </div>

      {/* Current gesture indicator */}
      {currentGesture && (
        <div className="absolute top-2 right-2 bg-purple-600/70 text-white px-3 py-2 rounded text-sm font-medium">
          {currentGesture.replace("_", " ")}
        </div>
      )}

      {/* Debug info */}
      {showDebugInfo && (
        <div className="absolute bottom-2 left-2 bg-black/70 text-white p-2 rounded text-xs font-mono">
          <div>Status: {isDetecting ? "Active" : "Inactive"}</div>
          <div>Test Mode: {testMode ? "On" : "Off"}</div>
          <div>Current: {currentGesture || "None"}</div>
        </div>
      )}

      {/* Test mode instructions */}
      {testMode && (
        <div className="absolute bottom-2 right-2 bg-blue-600/70 text-white p-2 rounded text-xs max-w-xs">
          <div className="font-medium mb-1">Test Mode - Use Keys:</div>
          <div>← → = Swipe Left/Right</div>
          <div>O = Open Palm</div>
          <div>C = Closed Fist</div>
          <div>P = Pointing</div>
          <div>T = Thumbs Up</div>
        </div>
      )}
    </div>
  )
}
