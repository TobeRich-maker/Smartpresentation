"use client"

import { useRef, useEffect, useState } from "react"
import { useGestureDetection, type GestureType } from "@/hooks/use-gesture-detection"

interface FallbackWebcamProps {
  enabled: boolean
  onGestureDetected?: (gesture: GestureType, confidence?: number) => void
  showDebugInfo?: boolean
}

export function FallbackWebcam({ enabled, onGestureDetected, showDebugInfo = false }: FallbackWebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [status, setStatus] = useState<"idle" | "requesting" | "active" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [videoElementMounted, setVideoElementMounted] = useState(false)

  // Use gesture detection hook
  const { currentGesture, gestureConfidence, fps, isDetecting } = useGestureDetection({
    enabled,
    onGestureDetected,
    debounceMs: 800,
  })

  // Track when video element is mounted
  useEffect(() => {
    if (videoRef.current) {
      console.log("📺 Video element mounted successfully")
      setVideoElementMounted(true)
    } else {
      console.log("📺 Video element not yet mounted")
      setVideoElementMounted(false)
    }
  }, [])

  // Initialize camera
  const initCamera = async () => {
    console.log("🎥 Attempting to initialize camera...")
    console.log("📺 Video element available:", !!videoRef.current)
    console.log("🔧 Enabled:", enabled)

    if (!enabled) {
      console.log("❌ Camera disabled, aborting initialization")
      return
    }

    if (!videoRef.current) {
      console.log("❌ Video element not available, aborting initialization")
      setError("Video element not ready")
      setStatus("error")
      return
    }

    setStatus("requesting")
    setError(null)

    try {
      console.log("🎥 Requesting camera access...")

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported in this browser")
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })

      console.log("✅ Camera stream obtained:", stream)

      // Double-check video element is still available
      if (!videoRef.current) {
        throw new Error("Video element became unavailable during setup")
      }

      streamRef.current = stream
      videoRef.current.srcObject = stream

      console.log("📺 Stream assigned to video element")

      // Wait for video to start playing
      await new Promise<void>((resolve, reject) => {
        const video = videoRef.current

        if (!video) {
          reject(new Error("Video element lost during setup"))
          return
        }

        const timeout = setTimeout(() => {
          reject(new Error("Video load timeout"))
        }, 10000)

        const onCanPlay = () => {
          console.log("📺 Video can play")
          clearTimeout(timeout)
          video.removeEventListener("canplay", onCanPlay)
          video.removeEventListener("error", onError)
          resolve()
        }

        const onError = (event: any) => {
          console.error("📺 Video error:", event)
          clearTimeout(timeout)
          video.removeEventListener("canplay", onCanPlay)
          video.removeEventListener("error", onError)
          reject(new Error("Video failed to load"))
        }

        video.addEventListener("canplay", onCanPlay)
        video.addEventListener("error", onError)

        video.play().catch((playError) => {
          console.error("📺 Video play error:", playError)
          clearTimeout(timeout)
          video.removeEventListener("canplay", onCanPlay)
          video.removeEventListener("error", onError)
          reject(playError)
        })
      })

      setStatus("active")
      console.log("✅ Camera initialized successfully")
    } catch (err: any) {
      console.error("❌ Camera initialization failed:", err)
      setError(err.message || "Camera access failed")
      setStatus("error")

      // Clean up on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }

  // Cleanup camera
  const cleanupCamera = () => {
    console.log("🧹 Cleaning up camera...")

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        console.log(`🔌 Stopping track: ${track.kind}`)
        track.stop()
      })
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setStatus("idle")
    setError(null)
  }

  // Handle enabled state changes - only when video element is ready
  useEffect(() => {
    if (enabled && videoElementMounted) {
      console.log("🎯 Both enabled and video element ready - initializing camera")
      initCamera()
    } else if (!enabled) {
      console.log("🚫 Camera disabled - cleaning up")
      cleanupCamera()
    } else {
      console.log("⏳ Waiting for video element to be mounted...")
    }

    return cleanupCamera
  }, [enabled, videoElementMounted])

  // Retry function
  const retryCamera = () => {
    console.log("🔄 Retrying camera initialization...")
    cleanupCamera()

    // Wait a bit then retry
    setTimeout(() => {
      if (enabled && videoRef.current) {
        initCamera()
      }
    }, 1000)
  }

  if (!enabled) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <p className="text-gray-500">Camera disabled</p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-red-50 dark:bg-red-900/20 p-4">
        <p className="text-red-600 dark:text-red-400 font-medium mb-2">Camera Error</p>
        <p className="text-red-500 dark:text-red-300 text-sm text-center mb-3">{error}</p>
        <button onClick={retryCamera} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
          Retry Camera
        </button>
        {showDebugInfo && (
          <div className="mt-3 text-xs text-red-400 bg-red-100 dark:bg-red-900/30 p-2 rounded">
            <div>Video Element: {videoRef.current ? "Available" : "Not Available"}</div>
            <div>Video Mounted: {videoElementMounted ? "Yes" : "No"}</div>
            <div>Status: {status}</div>
            <div>Error: {error}</div>
          </div>
        )}
      </div>
    )
  }

  if (status === "requesting") {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Starting camera...</p>
          {showDebugInfo && (
            <div className="mt-2 text-xs text-gray-500">
              <div>Video Element: {videoRef.current ? "Available" : "Not Available"}</div>
              <div>Video Mounted: {videoElementMounted ? "Yes" : "No"}</div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover bg-black"
        style={{ transform: "scaleX(-1)" }}
        onLoadedMetadata={() => console.log("📺 Video metadata loaded")}
        onCanPlay={() => console.log("📺 Video can play")}
        onPlaying={() => console.log("📺 Video is playing")}
        onError={(e) => {
          console.error("📺 Video element error:", e)
          setError("Video playback error")
          setStatus("error")
        }}
      />

      {/* Status indicators */}
      <div className="absolute top-2 left-2 space-y-1">
        <div
          className={`px-2 py-1 rounded text-xs text-white ${status === "active" ? "bg-green-600/70" : "bg-gray-600/70"}`}
        >
          {status === "active" ? "Active" : "Inactive"}
        </div>
        <div className="bg-black/70 text-white px-2 py-1 rounded text-xs">FPS: {Math.round(fps)}</div>
        {showDebugInfo && (
          <div className="bg-blue-600/70 text-white px-2 py-1 rounded text-xs">
            Video: {videoElementMounted ? "Ready" : "Loading"}
          </div>
        )}
      </div>

      {/* Current gesture */}
      {currentGesture && (
        <div className="absolute top-2 right-2 bg-purple-600/70 text-white px-3 py-2 rounded text-sm font-medium">
          {currentGesture.replace("_", " ")}
        </div>
      )}

      {/* Debug info */}
      {showDebugInfo && (
        <div className="absolute bottom-2 left-2 bg-black/70 text-white p-2 rounded text-xs font-mono">
          <div>Status: {status}</div>
          <div>Video Element: {videoRef.current ? "Available" : "Not Available"}</div>
          <div>Video Mounted: {videoElementMounted ? "Yes" : "No"}</div>
          <div>FPS: {Math.round(fps)}</div>
          <div>Gesture: {currentGesture || "None"}</div>
          <div>Stream: {streamRef.current ? "Active" : "None"}</div>
        </div>
      )}

      {/* Instructions */}
      <div className="absolute bottom-2 right-2 bg-blue-600/70 text-white p-2 rounded text-xs">
        <div>← → = Navigate | O = Play | C = Pause</div>
      </div>
    </div>
  )
}
