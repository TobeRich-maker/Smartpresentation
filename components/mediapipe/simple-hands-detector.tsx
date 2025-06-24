"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Camera, CameraOff, AlertTriangle, CheckCircle, XCircle, RefreshCw } from "lucide-react"

interface SimpleHandsDetectorProps {
  onResults?: (results: any) => void
  onCameraStatus?: (status: "active" | "inactive" | "error", message?: string) => void
  showDebugOverlay?: boolean
  width?: number
  height?: number
}

export function SimpleHandsDetector({
  onResults,
  onCameraStatus,
  showDebugOverlay = false,
  width = 640,
  height = 480,
}: SimpleHandsDetectorProps) {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  // State
  const [cameraStatus, setCameraStatus] = useState<"idle" | "initializing" | "active" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [fps, setFps] = useState(0)
  const [videoReady, setVideoReady] = useState(false)
  const [detectionMode, setDetectionMode] = useState<"simple" | "gesture">("simple")

  // FPS tracking
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() })

  // Simple gesture detection using basic computer vision
  const detectSimpleGestures = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState < 2) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Draw video frame
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    // Simple motion detection or color-based detection could go here
    // For now, we'll just show the video feed and simulate detection

    // Update FPS
    const now = Date.now()
    fpsCounterRef.current.frames++
    if (now - fpsCounterRef.current.lastTime >= 1000) {
      setFps(fpsCounterRef.current.frames)
      fpsCounterRef.current.frames = 0
      fpsCounterRef.current.lastTime = now
    }

    // Continue processing
    if (cameraStatus === "active") {
      animationFrameRef.current = requestAnimationFrame(detectSimpleGestures)
    }
  }, [cameraStatus])

  // Initialize camera with getUserMedia
  const initializeCamera = useCallback(async (): Promise<boolean> => {
    console.log("🔄 Initializing camera with getUserMedia...")

    if (!videoRef.current) {
      console.error("❌ Video element not available")
      setError("Video element not found")
      return false
    }

    try {
      // Try different camera constraints
      const constraints = [
        {
          video: {
            width: { ideal: width },
            height: { ideal: height },
            facingMode: "user",
            frameRate: { ideal: 30 },
          },
        },
        {
          video: {
            width: { ideal: 640 },
            height: { ideal: 480 },
            facingMode: "user",
          },
        },
        { video: { facingMode: "user" } },
        { video: true },
      ]

      let stream: MediaStream | null = null

      for (const constraint of constraints) {
        try {
          console.log("🔄 Trying constraint:", constraint)
          stream = await navigator.mediaDevices.getUserMedia(constraint)
          console.log("✅ Camera stream obtained with constraint:", constraint)
          break
        } catch (err: any) {
          console.warn("⚠️ Constraint failed:", constraint, err.message)
          continue
        }
      }

      if (!stream) {
        throw new Error("Could not access camera with any constraints")
      }

      streamRef.current = stream
      videoRef.current.srcObject = stream

      // Wait for video to load
      await new Promise<void>((resolve, reject) => {
        const video = videoRef.current!
        const timeout = setTimeout(() => reject(new Error("Video load timeout")), 10000)

        const handleLoadedData = () => {
          clearTimeout(timeout)
          video.removeEventListener("loadeddata", handleLoadedData)
          video.removeEventListener("error", handleError)
          resolve()
        }

        const handleError = (e: any) => {
          clearTimeout(timeout)
          video.removeEventListener("loadeddata", handleLoadedData)
          video.removeEventListener("error", handleError)
          reject(new Error(`Video load error: ${e.message || "Unknown error"}`))
        }

        video.addEventListener("loadeddata", handleLoadedData)
        video.addEventListener("error", handleError)

        video.play().catch(reject)
      })

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const video = videoRef.current!
        const timeout = setTimeout(() => reject(new Error("Video ready timeout")), 5000)

        const checkReady = () => {
          if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
            clearTimeout(timeout)
            setVideoReady(true)
            console.log(`✅ Video ready: ${video.videoWidth}x${video.videoHeight}`)
            resolve()
          } else {
            setTimeout(checkReady, 100)
          }
        }

        checkReady()
      })

      console.log("✅ Camera initialized successfully")
      return true
    } catch (error: any) {
      console.error("❌ Camera initialization failed:", error)
      setError(`Camera failed to start: ${error.message}`)
      return false
    }
  }, [width, height])

  // Start detection
  const startDetection = useCallback(async () => {
    if (cameraStatus === "initializing") return

    console.log("🚀 Starting simple hands detection...")
    setCameraStatus("initializing")
    setError(null)

    try {
      const cameraInitialized = await initializeCamera()
      if (!cameraInitialized) {
        throw new Error("Failed to initialize camera")
      }

      setCameraStatus("active")
      onCameraStatus?.("active", "Camera started successfully")

      // Start simple detection loop
      detectSimpleGestures()

      console.log("✅ Detection started successfully")
    } catch (error: any) {
      console.error("❌ Failed to start detection:", error)
      setCameraStatus("error")
      setError(error.message)
      onCameraStatus?.("error", error.message)
    }
  }, [cameraStatus, initializeCamera, onCameraStatus, detectSimpleGestures])

  // Stop detection
  const stopDetection = useCallback(() => {
    console.log("🛑 Stopping detection...")

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraStatus("idle")
    setVideoReady(false)
    setError(null)
    setFps(0)
  }, [])

  // Manual gesture triggers for testing
  const triggerGesture = useCallback(
    (gesture: string) => {
      console.log(`🤚 Manual gesture triggered: ${gesture}`)
      if (onResults) {
        onResults({ gesture, manual: true, timestamp: Date.now() })
      }
    },
    [onResults],
  )

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetection()
    }
  }, [stopDetection])

  // Status icon
  const StatusIcon = () => {
    switch (cameraStatus) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "initializing":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
      default:
        return <Camera className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <StatusIcon />
            Simple Hands Detection
          </h3>
          <div className="flex gap-2">
            <Button
              onClick={startDetection}
              disabled={cameraStatus === "initializing" || cameraStatus === "active"}
              size="sm"
            >
              {cameraStatus === "initializing" ? "Starting..." : "Start Camera"}
            </Button>
            <Button onClick={stopDetection} disabled={cameraStatus === "idle"} variant="outline" size="sm">
              Stop
            </Button>
          </div>
        </div>

        {/* Status Display */}
        <div className="flex items-center gap-4 mb-4">
          <Badge
            variant={cameraStatus === "active" ? "default" : cameraStatus === "error" ? "destructive" : "secondary"}
          >
            {cameraStatus.toUpperCase()}
          </Badge>
          <Badge variant="outline">FPS: {fps}</Badge>
          <Badge variant="outline">Mode: {detectionMode}</Badge>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Manual Gesture Controls */}
        {cameraStatus === "active" && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium">Manual Gesture Testing:</h4>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => triggerGesture("next")}>
                👍 Next Slide
              </Button>
              <Button size="sm" variant="outline" onClick={() => triggerGesture("previous")}>
                ✋ Previous Slide
              </Button>
              <Button size="sm" variant="outline" onClick={() => triggerGesture("point")}>
                👉 Laser Pointer
              </Button>
              <Button size="sm" variant="outline" onClick={() => triggerGesture("pause")}>
                ✊ Pause
              </Button>
              <Button size="sm" variant="outline" onClick={() => triggerGesture("play")}>
                🖐️ Play
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Video Display */}
      <Card className="p-4">
        <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: `${width}/${height}` }}>
          {/* Video Element */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
            playsInline
            muted
            autoPlay
          />

          {/* Canvas Overlay */}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ transform: "scaleX(-1)" }}
          />

          {/* Status Overlays */}
          {cameraStatus === "idle" && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
              <div className="text-center text-white">
                <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Simple Camera Detection</p>
                <p className="text-sm opacity-75">Click "Start Camera" to begin</p>
                <p className="text-xs opacity-50 mt-2">No external libraries required</p>
              </div>
            </div>
          )}

          {cameraStatus === "initializing" && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-900/80">
              <div className="text-center text-white">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
                <p className="text-lg font-medium">Starting Camera...</p>
                <p className="text-sm opacity-75">Requesting camera access</p>
              </div>
            </div>
          )}

          {cameraStatus === "error" && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900/80">
              <div className="text-center text-white">
                <CameraOff className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg font-medium">Camera Error</p>
                <p className="text-sm mb-4 max-w-xs">{error}</p>
                <Button onClick={startDetection} size="sm" variant="secondary">
                  Retry
                </Button>
              </div>
            </div>
          )}

          {cameraStatus === "active" && (
            <div className="absolute bottom-2 left-2 bg-green-600/80 text-white px-2 py-1 rounded text-xs">
              ✅ Camera Active - Use manual controls above
            </div>
          )}

          {/* Debug Overlay */}
          {showDebugOverlay && cameraStatus === "active" && (
            <div className="absolute top-2 left-2 bg-black/70 text-white p-2 rounded text-xs space-y-1">
              <div>Status: {cameraStatus}</div>
              <div>FPS: {fps}</div>
              <div>Video Ready: {videoReady ? "✓" : "✗"}</div>
              <div>Mode: {detectionMode}</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
