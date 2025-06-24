"use client"

import { useRef, useEffect, useState } from "react"
import { useMediaPipeHands } from "@/hooks/use-mediapipe-hands"
import { useGestureDetection, type GestureType } from "@/hooks/use-gesture-detection"

interface MediaPipeWebcamProps {
  enabled: boolean
  onGestureDetected?: (gesture: GestureType, confidence: number) => void
  showLandmarks?: boolean
  showDebugInfo?: boolean
}

export function MediaPipeWebcam({
  enabled,
  onGestureDetected,
  showLandmarks = true,
  showDebugInfo = false,
}: MediaPipeWebcamProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const [landmarks, setLandmarks] = useState<any[][]>([])
  const [fps, setFps] = useState(0)

  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() })

  // Initialize gesture detection
  const { currentGesture, gestureConfidence, debugInfo, processLandmarks } = useGestureDetection({
    enabled,
    onGestureDetected,
    debounceMs: 800,
    confidenceThreshold: 0.7,
    smoothingFrames: 3,
  })

  // Handle MediaPipe results
  const handleResults = (results: any) => {
    // Update FPS counter
    const now = Date.now()
    fpsCounterRef.current.frames++
    if (now - fpsCounterRef.current.lastTime > 1000) {
      setFps(fpsCounterRef.current.frames)
      fpsCounterRef.current.frames = 0
      fpsCounterRef.current.lastTime = now
    }

    // Store landmarks for visualization
    if (results.landmarks) {
      setLandmarks(results.landmarks)

      // Process landmarks for gesture detection
      processLandmarks(results.landmarks)
    } else {
      setLandmarks([])
    }

    // Draw results on canvas
    if (showLandmarks) {
      drawResults(results)
    }
  }

  // Initialize MediaPipe
  const { isLoaded, isInitialized, isProcessing, error, startCamera, stopCamera } = useMediaPipeHands({
    enabled,
    onResults: handleResults,
    onError: (err) => console.error("MediaPipe error:", err),
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.5,
    maxNumHands: 1,
    videoRef,
  })

  // Start/stop camera based on enabled state
  useEffect(() => {
    if (enabled && isInitialized) {
      startCamera()
    } else {
      stopCamera()
    }
  }, [enabled, isInitialized, startCamera, stopCamera])

  // Draw hand landmarks and connections on canvas
  const drawResults = (results: any) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    if (results.landmarks) {
      for (const landmarks of results.landmarks) {
        // Draw hand connections
        drawConnectors(ctx, landmarks, HAND_CONNECTIONS, { color: "#00FF00", lineWidth: 2 })

        // Draw landmarks
        drawLandmarks(ctx, landmarks, { color: "#FF0000", radius: 3 })
      }
    }
  }

  // Hand connections for drawing
  const HAND_CONNECTIONS = [
    [0, 1],
    [1, 2],
    [2, 3],
    [3, 4], // Thumb
    [0, 5],
    [5, 6],
    [6, 7],
    [7, 8], // Index finger
    [0, 9],
    [9, 10],
    [10, 11],
    [11, 12], // Middle finger
    [0, 13],
    [13, 14],
    [14, 15],
    [15, 16], // Ring finger
    [0, 17],
    [17, 18],
    [18, 19],
    [19, 20], // Pinky
    [5, 9],
    [9, 13],
    [13, 17], // Palm
  ]

  // Draw connections between landmarks
  const drawConnectors = (ctx: CanvasRenderingContext2D, landmarks: any[], connections: number[][], style: any) => {
    ctx.strokeStyle = style.color
    ctx.lineWidth = style.lineWidth

    for (const [start, end] of connections) {
      const startPoint = landmarks[start]
      const endPoint = landmarks[end]

      if (startPoint && endPoint) {
        ctx.beginPath()
        ctx.moveTo(startPoint.x * ctx.canvas.width, startPoint.y * ctx.canvas.height)
        ctx.lineTo(endPoint.x * ctx.canvas.width, endPoint.y * ctx.canvas.height)
        ctx.stroke()
      }
    }
  }

  // Draw individual landmarks
  const drawLandmarks = (ctx: CanvasRenderingContext2D, landmarks: any[], style: any) => {
    ctx.fillStyle = style.color

    for (const landmark of landmarks) {
      ctx.beginPath()
      ctx.arc(landmark.x * ctx.canvas.width, landmark.y * ctx.canvas.height, style.radius, 0, 2 * Math.PI)
      ctx.fill()
    }
  }

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
        <p className="text-red-600 dark:text-red-400 font-medium mb-2">MediaPipe Error</p>
        <p className="text-red-500 dark:text-red-300 text-sm text-center">{error}</p>
      </div>
    )
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading MediaPipe...</p>
        </div>
      </div>
    )
  }

  if (!isInitialized) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="text-center">
          <div className="animate-pulse rounded-full h-8 w-8 bg-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Initializing...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {/* Video element for camera feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }} // Mirror the video
      />

      {/* Canvas for drawing landmarks */}
      <canvas
        ref={canvasRef}
        width={640}
        height={480}
        className="absolute top-0 left-0 w-full h-full object-cover pointer-events-none"
        style={{ transform: "scaleX(-1)" }} // Mirror the canvas
      />

      {/* Status indicators */}
      <div className="absolute top-2 left-2 space-y-1">
        {/* Detection status */}
        <div className={`px-2 py-1 rounded text-xs text-white ${isProcessing ? "bg-green-600/70" : "bg-gray-600/70"}`}>
          {isProcessing ? "Processing" : "Waiting"}
        </div>

        {/* FPS Counter */}
        <div className="bg-black/70 text-white px-2 py-1 rounded text-xs">FPS: {fps}</div>

        {/* Hands detected */}
        <div className="bg-green-600/70 text-white px-2 py-1 rounded text-xs">Hands: {landmarks.length}</div>

        {/* MediaPipe status */}
        <div
          className={`px-2 py-1 rounded text-xs text-white ${isInitialized ? "bg-blue-600/70" : "bg-orange-600/70"}`}
        >
          {!isLoaded ? "Loading..." : !isInitialized ? "Initializing..." : "Ready"}
        </div>
      </div>

      {/* Current gesture indicator */}
      {currentGesture && (
        <div className="absolute top-2 right-2 bg-purple-600/70 text-white px-3 py-2 rounded text-sm font-medium">
          {currentGesture.replace("_", " ")} ({Math.round(gestureConfidence * 100)}%)
        </div>
      )}

      {/* Debug info */}
      {showDebugInfo && (
        <div className="absolute bottom-2 left-2 bg-black/70 text-white p-2 rounded text-xs font-mono max-w-xs">
          <div>Status: {isLoaded ? "Loaded" : "Loading"}</div>
          <div>Initialized: {isInitialized ? "Yes" : "No"}</div>
          <div>Processing: {isProcessing ? "Yes" : "No"}</div>
          <div>Landmarks: {debugInfo.handLandmarks || 0}</div>
          <div>Detected: {debugInfo.detectedGestures?.join(", ") || "none"}</div>
          <div>Best: {debugInfo.bestGesture || "none"}</div>
          <div>History: {debugInfo.historyLength || 0}</div>
          <div>Error: {error || "None"}</div>
        </div>
      )}

      {/* Loading overlay */}
      {!isInitialized && (
        <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p>{!isLoaded ? "Loading MediaPipe..." : "Initializing..."}</p>
          </div>
        </div>
      )}
    </div>
  )
}
