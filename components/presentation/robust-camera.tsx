"use client"

import { useRef, useEffect, useState } from "react"
import { useGestureDetection, type GestureType } from "@/hooks/use-gesture-detection"

interface RobustCameraProps {
  enabled: boolean
  onGestureDetected?: (gesture: GestureType, confidence?: number) => void
  showDebugInfo?: boolean
}

export function RobustCamera({ enabled, onGestureDetected, showDebugInfo = false }: RobustCameraProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [status, setStatus] = useState<"idle" | "requesting" | "active" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [videoReady, setVideoReady] = useState(false)

  // Use gesture detection hook
  const { currentGesture, gestureConfidence, fps, isDetecting } = useGestureDetection({
    enabled,
    onGestureDetected,
    debounceMs: 800,
  })

  // Create video element programmatically to ensure it stays mounted
  useEffect(() => {
    if (!containerRef.current) return

    // Create video element
    const video = document.createElement("video")
    video.autoplay = true
    video.playsInline = true
    video.muted = true
    video.style.width = "100%"
    video.style.height = "100%"
    video.style.objectFit = "cover"
    video.style.transform = "scaleX(-1)"
    video.style.backgroundColor = "black"

    // Add event listeners
    video.addEventListener("loadedmetadata", () => {
      console.log("📺 Video metadata loaded")
      setVideoReady(true)
    })

    video.addEventListener("canplay", () => {
      console.log("📺 Video can play")
    })

    video.addEventListener("playing", () => {
      console.log("📺 Video is playing")
    })

    video.addEventListener("error", (e) => {
      console.error("📺 Video error:", e)
      setError("Video playback error")
      setStatus("error")
    })

    // Append to container
    containerRef.current.appendChild(video)
    videoRef.current = video

    console.log("📺 Video element created and mounted")

    return () => {
      // Cleanup
      if (video.parentNode) {
        video.parentNode.removeChild(video)
      }
      videoRef.current = null
      setVideoReady(false)
    }
  }, [])

  // Camera initialization
  const initCamera = async () => {
    if (!enabled || !videoRef.current) {
      console.log("❌ Cannot init camera - enabled:", enabled, "video:", !!videoRef.current)
      return
    }

    console.log("🎥 Initializing camera...")
    setStatus("requesting")
    setError(null)

    try {
      // Request camera
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
        audio: false,
      })

      console.log("✅ Camera stream obtained")

      // Verify video element still exists
      if (!videoRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        throw new Error("Video element was removed")
      }

      // Set stream
      streamRef.current = stream
      videoRef.current.srcObject = stream

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const video = videoRef.current!
        const timeout = setTimeout(() => reject(new Error("Video timeout")), 10000)

        const onCanPlay = () => {
          clearTimeout(timeout)
          video.removeEventListener("canplay", onCanPlay)
          resolve()
        }

        video.addEventListener("canplay", onCanPlay)
      })

      setStatus("active")
      console.log("✅ Camera active")
    } catch (err: any) {
      console.error("❌ Camera init failed:", err)
      setError(err.message || "Camera failed")
      setStatus("error")

      // Cleanup on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }

  // Stop camera
  const stopCamera = () => {
    console.log("🛑 Stopping camera")

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setStatus("idle")
    setError(null)
  }

  // Handle enabled changes
  useEffect(() => {
    if (enabled && videoReady) {
      initCamera()
    } else if (!enabled) {
      stopCamera()
    }

    return stopCamera
  }, [enabled, videoReady])

  return (
    <div className="relative w-full h-full rounded overflow-hidden bg-black">
      {/* Video container */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Status overlays */}
      {!enabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/90">
          <p className="text-gray-500">Camera disabled</p>
        </div>
      )}

      {enabled && status === "requesting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/90">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Starting camera...</p>
          </div>
        </div>
      )}

      {enabled && status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50/90 p-4">
          <p className="text-red-600 font-medium mb-2">Camera Error</p>
          <p className="text-red-500 text-sm text-center mb-3">{error}</p>
          <button onClick={initCamera} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
            Retry
          </button>
        </div>
      )}

      {/* Active camera indicators */}
      {enabled && status === "active" && (
        <>
          <div className="absolute top-2 left-2 space-y-1">
            <div className="px-2 py-1 rounded text-xs text-white bg-green-600/70">Active</div>
            <div className="bg-black/70 text-white px-2 py-1 rounded text-xs">FPS: {Math.round(fps)}</div>
          </div>

          {currentGesture && (
            <div className="absolute top-2 right-2 bg-purple-600/70 text-white px-3 py-2 rounded text-sm font-medium">
              {currentGesture.replace("_", " ")}
            </div>
          )}

          {showDebugInfo && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white p-2 rounded text-xs font-mono">
              <div>Status: {status}</div>
              <div>Video: {videoRef.current ? "✅" : "❌"}</div>
              <div>Stream: {streamRef.current ? "✅" : "❌"}</div>
              <div>Ready: {videoReady ? "✅" : "❌"}</div>
              <div>FPS: {Math.round(fps)}</div>
              <div>Gesture: {currentGesture || "None"}</div>
            </div>
          )}

          <div className="absolute bottom-2 right-2 bg-blue-600/70 text-white p-2 rounded text-xs">
            <div>← → O C P T</div>
          </div>
        </>
      )}
    </div>
  )
}
