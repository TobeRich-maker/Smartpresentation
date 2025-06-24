"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Camera, CameraOff, AlertTriangle, CheckCircle, XCircle, RefreshCw } from "lucide-react"

interface SimpleMediaPipeFallbackProps {
  onGesture?: (gesture: string) => void
  showDebugOverlay?: boolean
  width?: number
  height?: number
}

export function SimpleMediaPipeFallback({
  onGesture,
  showDebugOverlay = false,
  width = 640,
  height = 480,
}: SimpleMediaPipeFallbackProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [cameraStatus, setCameraStatus] = useState<"idle" | "starting" | "active" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [fps, setFps] = useState(0)

  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() })

  // Simple camera initialization without MediaPipe
  const startCamera = useCallback(async () => {
    if (cameraStatus === "starting") return

    setCameraStatus("starting")
    setError(null)

    try {
      console.log("🔄 Starting simple camera...")

      // Get user media with multiple fallback constraints
      const constraints = [
        { video: { width: width, height: height, facingMode: "user" } },
        { video: { width: 640, height: 480, facingMode: "user" } },
        { video: { facingMode: "user" } },
        { video: true },
      ]

      let stream: MediaStream | null = null

      for (const constraint of constraints) {
        try {
          console.log("Trying constraint:", constraint)
          stream = await navigator.mediaDevices.getUserMedia(constraint)
          break
        } catch (err) {
          console.warn("Constraint failed:", constraint, err)
          continue
        }
      }

      if (!stream) {
        throw new Error("Could not access camera with any constraints")
      }

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream

        // Wait for video to load
        await new Promise<void>((resolve, reject) => {
          const video = videoRef.current!
          const timeout = setTimeout(() => reject(new Error("Video load timeout")), 5000)

          const onLoadedData = () => {
            clearTimeout(timeout)
            video.removeEventListener("loadeddata", onLoadedData)
            video.removeEventListener("error", onError)
            resolve()
          }

          const onError = (e: Event) => {
            clearTimeout(timeout)
            video.removeEventListener("loadeddata", onLoadedData)
            video.removeEventListener("error", onError)
            reject(new Error("Video load error"))
          }

          video.addEventListener("loadeddata", onLoadedData)
          video.addEventListener("error", onError)

          if (video.readyState >= 2) {
            onLoadedData()
          }
        })

        // Start playing
        await videoRef.current.play()

        console.log("✅ Camera started successfully")
        setCameraStatus("active")

        // Start simple frame processing for FPS counter
        startFrameProcessing()
      }
    } catch (error: any) {
      console.error("❌ Camera start failed:", error)
      setCameraStatus("error")
      setError(error.message)

      // Cleanup on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [cameraStatus, width, height])

  // Simple frame processing for FPS counter
  const startFrameProcessing = useCallback(() => {
    const processFrame = () => {
      if (cameraStatus !== "active" || !videoRef.current) return

      // Update FPS counter
      const now = Date.now()
      fpsCounterRef.current.frames++
      if (now - fpsCounterRef.current.lastTime >= 1000) {
        setFps(fpsCounterRef.current.frames)
        fpsCounterRef.current.frames = 0
        fpsCounterRef.current.lastTime = now
      }

      // Continue processing
      requestAnimationFrame(processFrame)
    }

    processFrame()
  }, [cameraStatus])

  // Stop camera
  const stopCamera = useCallback(() => {
    console.log("🛑 Stopping camera...")

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraStatus("idle")
    setError(null)
    setFps(0)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  // Test gesture buttons
  const testGesture = (gesture: string) => {
    console.log(`Testing gesture: ${gesture}`)
    onGesture?.(gesture)
  }

  const StatusIcon = () => {
    switch (cameraStatus) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "starting":
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
            Simple Camera (MediaPipe Fallback)
          </h3>
          <div className="flex gap-2">
            <Button onClick={startCamera} disabled={cameraStatus === "starting" || cameraStatus === "active"} size="sm">
              {cameraStatus === "starting" ? "Starting..." : "Start Camera"}
            </Button>
            <Button onClick={stopCamera} disabled={cameraStatus === "idle"} variant="outline" size="sm">
              Stop
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <Badge
            variant={cameraStatus === "active" ? "default" : cameraStatus === "error" ? "destructive" : "secondary"}
          >
            {cameraStatus.toUpperCase()}
          </Badge>
          <Badge variant="outline">FPS: {fps}</Badge>
        </div>

        {error && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Test Gesture Buttons */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Test Gestures (since MediaPipe failed):</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={() => testGesture("thumbs_up")}>
              👍 Next Slide
            </Button>
            <Button size="sm" variant="outline" onClick={() => testGesture("open_palm")}>
              ✋ Previous Slide
            </Button>
            <Button size="sm" variant="outline" onClick={() => testGesture("pointing")}>
              👉 Laser Pointer
            </Button>
            <Button size="sm" variant="outline" onClick={() => testGesture("closed_fist")}>
              ✊ Pause
            </Button>
            <Button size="sm" variant="outline" onClick={() => testGesture("peace")}>
              ✌️ Reset
            </Button>
          </div>
        </div>
      </Card>

      {/* Video Display */}
      <Card className="p-4">
        <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: `${width}/${height}` }}>
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
            playsInline
            muted
            autoPlay
          />

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
                <p className="text-lg font-medium">Camera Not Started</p>
                <p className="text-sm opacity-75">This is a fallback when MediaPipe fails</p>
              </div>
            </div>
          )}

          {cameraStatus === "starting" && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-900/80">
              <div className="text-center text-white">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
                <p className="text-lg font-medium">Starting Camera...</p>
                <p className="text-sm opacity-75">Simple camera without MediaPipe</p>
              </div>
            </div>
          )}

          {cameraStatus === "error" && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900/80">
              <div className="text-center text-white">
                <CameraOff className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg font-medium">Camera Error</p>
                <p className="text-sm mb-4">{error}</p>
                <Button onClick={startCamera} size="sm" variant="secondary">
                  Retry
                </Button>
              </div>
            </div>
          )}

          {/* Debug Overlay */}
          {showDebugOverlay && cameraStatus === "active" && (
            <div className="absolute top-2 left-2 bg-black/70 text-white p-2 rounded text-xs space-y-1">
              <div>Mode: Simple Camera</div>
              <div>Status: {cameraStatus}</div>
              <div>FPS: {fps}</div>
              <div>MediaPipe: Failed</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  )
}
