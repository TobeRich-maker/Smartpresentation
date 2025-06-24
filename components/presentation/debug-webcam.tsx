"use client"

import { useRef, useEffect, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Camera, AlertCircle, CheckCircle, XCircle } from "lucide-react"

interface DebugWebcamProps {
  enabled: boolean
  onStreamReady?: (stream: MediaStream) => void
  onVideoReady?: (video: HTMLVideoElement) => void
}

export function DebugWebcam({ enabled, onStreamReady, onVideoReady }: DebugWebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [debugInfo, setDebugInfo] = useState({
    permissionStatus: "unknown" as "unknown" | "granted" | "denied" | "prompt",
    streamStatus: "inactive" as "inactive" | "requesting" | "active" | "error",
    videoStatus: "waiting" as "waiting" | "loading" | "playing" | "error",
    streamDetails: null as MediaStream | null,
    videoDetails: null as any,
    error: null as string | null,
  })

  // Check camera permissions
  const checkPermissions = async () => {
    try {
      const permission = await navigator.permissions.query({ name: "camera" as PermissionName })
      setDebugInfo((prev) => ({ ...prev, permissionStatus: permission.state }))

      permission.addEventListener("change", () => {
        setDebugInfo((prev) => ({ ...prev, permissionStatus: permission.state }))
      })
    } catch (error) {
      console.log("Permission API not supported, will check during stream request")
    }
  }

  // Start camera stream
  const startCamera = async () => {
    if (!enabled) return

    console.log("🎥 Starting camera...")
    setDebugInfo((prev) => ({
      ...prev,
      streamStatus: "requesting",
      error: null,
    }))

    try {
      // Request camera access with detailed constraints
      const constraints = {
        video: {
          width: { ideal: 640, min: 320, max: 1280 },
          height: { ideal: 480, min: 240, max: 720 },
          facingMode: "user",
          frameRate: { ideal: 30, min: 15, max: 60 },
        },
        audio: false,
      }

      console.log("📋 Requesting stream with constraints:", constraints)

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      console.log("✅ Stream obtained:", stream)
      console.log(
        "📊 Stream tracks:",
        stream.getTracks().map((track) => ({
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState,
          settings: track.getSettings?.(),
        })),
      )

      setDebugInfo((prev) => ({
        ...prev,
        streamStatus: "active",
        streamDetails: stream,
      }))

      // Notify parent component
      if (onStreamReady) {
        onStreamReady(stream)
      }

      // Apply stream to video element
      if (videoRef.current) {
        await applyStreamToVideo(stream)
      }
    } catch (error: any) {
      console.error("❌ Camera error:", error)
      setDebugInfo((prev) => ({
        ...prev,
        streamStatus: "error",
        error: `Camera access failed: ${error.name} - ${error.message}`,
      }))
    }
  }

  // Apply stream to video element
  const applyStreamToVideo = async (stream: MediaStream) => {
    const video = videoRef.current
    if (!video) {
      console.error("❌ Video element not available")
      return
    }

    console.log("📺 Applying stream to video element...")

    setDebugInfo((prev) => ({ ...prev, videoStatus: "loading" }))

    try {
      // Set up video element properties
      video.srcObject = stream
      video.autoplay = true
      video.playsInline = true
      video.muted = true

      // Wait for metadata to load
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Video metadata load timeout"))
        }, 10000)

        video.onloadedmetadata = () => {
          clearTimeout(timeout)
          console.log("📊 Video metadata loaded:", {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            duration: video.duration,
            readyState: video.readyState,
          })
          resolve(void 0)
        }

        video.onerror = (error) => {
          clearTimeout(timeout)
          reject(error)
        }
      })

      // Start playing
      await video.play()

      console.log("▶️ Video playing successfully")

      setDebugInfo((prev) => ({
        ...prev,
        videoStatus: "playing",
        videoDetails: {
          width: video.videoWidth,
          height: video.videoHeight,
          currentTime: video.currentTime,
          readyState: video.readyState,
        },
      }))

      // Notify parent component
      if (onVideoReady) {
        onVideoReady(video)
      }
    } catch (error: any) {
      console.error("❌ Video setup error:", error)
      setDebugInfo((prev) => ({
        ...prev,
        videoStatus: "error",
        error: `Video setup failed: ${error.message}`,
      }))
    }
  }

  // Stop camera
  const stopCamera = () => {
    console.log("🛑 Stopping camera...")

    if (debugInfo.streamDetails) {
      debugInfo.streamDetails.getTracks().forEach((track) => {
        console.log(`🔌 Stopping track: ${track.kind} - ${track.label}`)
        track.stop()
      })
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setDebugInfo({
      permissionStatus: debugInfo.permissionStatus,
      streamStatus: "inactive",
      videoStatus: "waiting",
      streamDetails: null,
      videoDetails: null,
      error: null,
    })
  }

  // Initialize permissions check
  useEffect(() => {
    checkPermissions()
  }, [])

  // Handle enabled state changes
  useEffect(() => {
    if (enabled) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [enabled])

  // Manual retry function
  const retryCamera = () => {
    stopCamera()
    setTimeout(() => {
      if (enabled) {
        startCamera()
      }
    }, 1000)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "active":
      case "playing":
      case "granted":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
      case "denied":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "requesting":
      case "loading":
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
    }
  }

  return (
    <div className="space-y-4">
      {/* Video Display */}
      <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }} // Mirror the video
          playsInline
          muted
          autoPlay
        />

        {/* Status overlay */}
        <div className="absolute top-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
          {debugInfo.videoStatus === "playing" ? "Live" : "No Signal"}
        </div>

        {/* Error overlay */}
        {debugInfo.error && (
          <div className="absolute inset-0 bg-red-900/20 flex items-center justify-center">
            <div className="bg-red-600 text-white p-4 rounded-lg max-w-sm text-center">
              <XCircle className="h-8 w-8 mx-auto mb-2" />
              <p className="font-medium mb-2">Camera Error</p>
              <p className="text-sm mb-3">{debugInfo.error}</p>
              <Button size="sm" variant="secondary" onClick={retryCamera}>
                Retry
              </Button>
            </div>
          </div>
        )}

        {/* Loading overlay */}
        {debugInfo.streamStatus === "requesting" && (
          <div className="absolute inset-0 bg-gray-900/50 flex items-center justify-center">
            <div className="text-white text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
              <p>Requesting camera access...</p>
            </div>
          </div>
        )}
      </div>

      {/* Debug Information Panel */}
      <Card className="p-4">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Camera Debug Information
        </h3>

        <div className="space-y-2 text-sm">
          <div className="flex items-center justify-between">
            <span>Permission Status:</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(debugInfo.permissionStatus)}
              <span className="capitalize">{debugInfo.permissionStatus}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span>Stream Status:</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(debugInfo.streamStatus)}
              <span className="capitalize">{debugInfo.streamStatus}</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span>Video Status:</span>
            <div className="flex items-center gap-2">
              {getStatusIcon(debugInfo.videoStatus)}
              <span className="capitalize">{debugInfo.videoStatus}</span>
            </div>
          </div>

          {debugInfo.streamDetails && (
            <div className="pt-2 border-t">
              <p className="font-medium mb-1">Stream Details:</p>
              <div className="pl-2 space-y-1 text-xs text-gray-600">
                <div>Tracks: {debugInfo.streamDetails.getTracks().length}</div>
                {debugInfo.streamDetails.getTracks().map((track, index) => (
                  <div key={index}>
                    {track.kind}: {track.label || "Unknown"} ({track.readyState})
                  </div>
                ))}
              </div>
            </div>
          )}

          {debugInfo.videoDetails && (
            <div className="pt-2 border-t">
              <p className="font-medium mb-1">Video Details:</p>
              <div className="pl-2 space-y-1 text-xs text-gray-600">
                <div>
                  Resolution: {debugInfo.videoDetails.width}x{debugInfo.videoDetails.height}
                </div>
                <div>Ready State: {debugInfo.videoDetails.readyState}</div>
                <div>Current Time: {debugInfo.videoDetails.currentTime.toFixed(2)}s</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-2 mt-4">
          <Button size="sm" onClick={retryCamera} disabled={debugInfo.streamStatus === "requesting"}>
            Retry Camera
          </Button>
          <Button size="sm" variant="outline" onClick={() => console.log("Debug Info:", debugInfo)}>
            Log Debug Info
          </Button>
        </div>
      </Card>
    </div>
  )
}
