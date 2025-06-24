"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { useGestureDetection, type GestureType } from "@/hooks/use-gesture-detection"

interface SimpleCameraProps {
  enabled: boolean
  onGestureDetected?: (gesture: GestureType, confidence?: number) => void
  showDebugInfo?: boolean
}

export function SimpleCamera({ enabled, onGestureDetected, showDebugInfo = false }: SimpleCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const isInitializingRef = useRef(false)

  const [cameraState, setCameraState] = useState<{
    status: "idle" | "starting" | "active" | "error"
    error: string | null
  }>({
    status: "idle",
    error: null,
  })

  // Use gesture detection hook
  const { currentGesture, gestureConfidence, fps, isDetecting } = useGestureDetection({
    enabled,
    onGestureDetected,
    debounceMs: 800,
  })

  // Start camera function with better error handling
  const startCamera = useCallback(async () => {
    // Prevent multiple simultaneous initialization attempts
    if (isInitializingRef.current) {
      console.log("🔄 Camera initialization already in progress")
      return
    }

    console.log("🎥 Starting camera...")
    isInitializingRef.current = true

    setCameraState({
      status: "starting",
      error: null,
    })

    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported in this browser")
      }

      // Request camera
      console.log("📋 Requesting camera access...")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640, min: 320 },
          height: { ideal: 480, min: 240 },
        },
        audio: false,
      })

      console.log("✅ Got camera stream:", stream)
      streamRef.current = stream

      // Wait for video element to be available with polling
      let attempts = 0
      const maxAttempts = 50 // 5 seconds with 100ms intervals

      while (!videoRef.current && attempts < maxAttempts) {
        console.log(`⏳ Waiting for video element... attempt ${attempts + 1}/${maxAttempts}`)
        await new Promise((resolve) => setTimeout(resolve, 100))
        attempts++
      }

      if (!videoRef.current) {
        throw new Error("Video element not available after waiting")
      }

      console.log("📺 Video element found, setting up stream...")

      // Set up video element
      const video = videoRef.current
      video.srcObject = stream
      video.muted = true
      video.playsInline = true
      video.autoplay = true

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Video setup timeout"))
        }, 10000)

        const cleanup = () => {
          clearTimeout(timeout)
          video.removeEventListener("loadedmetadata", onLoadedMetadata)
          video.removeEventListener("canplay", onCanPlay)
          video.removeEventListener("error", onError)
        }

        const onLoadedMetadata = () => {
          console.log("📺 Video metadata loaded")
        }

        const onCanPlay = () => {
          console.log("📺 Video can play")
          cleanup()
          resolve()
        }

        const onError = (event: any) => {
          console.error("📺 Video error:", event)
          cleanup()
          reject(new Error("Video setup failed"))
        }

        video.addEventListener("loadedmetadata", onLoadedMetadata)
        video.addEventListener("canplay", onCanPlay)
        video.addEventListener("error", onError)

        // Try to play the video
        video.play().catch((playError) => {
          console.error("📺 Video play error:", playError)
          // Don't reject here, some browsers require user interaction
        })
      })

      setCameraState({
        status: "active",
        error: null,
      })

      console.log("✅ Camera started successfully")
    } catch (error: any) {
      console.error("❌ Camera start failed:", error)

      // Clean up stream on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      setCameraState({
        status: "error",
        error: error.message || "Failed to start camera",
      })
    } finally {
      isInitializingRef.current = false
    }
  }, [])

  // Stop camera function
  const stopCamera = useCallback(() => {
    console.log("🛑 Stopping camera...")
    isInitializingRef.current = false

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        console.log(`🔌 Stopping ${track.kind} track`)
        track.stop()
      })
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setCameraState({
      status: "idle",
      error: null,
    })
  }, [])

  // Handle enabled changes
  useEffect(() => {
    if (enabled) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
    }
  }, [enabled, startCamera, stopCamera])

  // Retry function
  const retryCamera = () => {
    console.log("🔄 Retrying camera...")
    stopCamera()
    setTimeout(() => {
      if (enabled) {
        startCamera()
      }
    }, 1000)
  }

  // Always render the video element to prevent it from being unmounted
  return (
    <div className="relative w-full h-full rounded overflow-hidden bg-black">
      {/* Video element - always rendered to prevent unmounting */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: "scaleX(-1)" }}
        onLoadedMetadata={() => console.log("📺 Video metadata loaded")}
        onCanPlay={() => console.log("📺 Video can play")}
        onPlaying={() => console.log("📺 Video is playing")}
        onError={(e) => console.error("📺 Video element error:", e)}
      />

      {/* Overlay content based on state */}
      {!enabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/90 dark:bg-gray-800/90">
          <p className="text-gray-500">Camera disabled</p>
        </div>
      )}

      {enabled && cameraState.status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50/90 dark:bg-red-900/20 p-4">
          <p className="text-red-600 font-medium mb-2">Camera Error</p>
          <p className="text-red-500 text-sm text-center mb-3">{cameraState.error}</p>
          <button onClick={retryCamera} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
            Retry
          </button>
          {showDebugInfo && (
            <div className="mt-3 text-xs text-red-400 bg-red-100/80 dark:bg-red-900/30 p-2 rounded">
              <div>Video Ref: {videoRef.current ? "✅" : "❌"}</div>
              <div>Stream: {streamRef.current ? "✅" : "❌"}</div>
              <div>Initializing: {isInitializingRef.current ? "Yes" : "No"}</div>
            </div>
          )}
        </div>
      )}

      {enabled && cameraState.status === "starting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/90 dark:bg-gray-800/90">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Starting camera...</p>
            {showDebugInfo && (
              <div className="mt-2 text-xs text-gray-500">
                <div>Video Ref: {videoRef.current ? "✅" : "❌"}</div>
                <div>Initializing: {isInitializingRef.current ? "Yes" : "No"}</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status indicators - only show when camera is active */}
      {enabled && cameraState.status === "active" && (
        <>
          <div className="absolute top-2 left-2 space-y-1">
            <div className="px-2 py-1 rounded text-xs text-white bg-green-600/70">Camera Active</div>
            <div className="bg-black/70 text-white px-2 py-1 rounded text-xs">FPS: {Math.round(fps)}</div>
            {isDetecting && <div className="px-2 py-1 rounded text-xs text-white bg-blue-600/70">Detecting</div>}
          </div>

          {/* Gesture indicator */}
          {currentGesture && (
            <div className="absolute top-2 right-2 bg-purple-600/70 text-white px-3 py-2 rounded text-sm font-medium animate-pulse">
              {currentGesture.replace("_", " ")}
            </div>
          )}

          {/* Debug info */}
          {showDebugInfo && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white p-2 rounded text-xs font-mono">
              <div>Status: {cameraState.status}</div>
              <div>Video Ref: {videoRef.current ? "✅" : "❌"}</div>
              <div>Stream: {streamRef.current ? "✅" : "❌"}</div>
              <div>Initializing: {isInitializingRef.current ? "Yes" : "No"}</div>
              <div>FPS: {Math.round(fps)}</div>
              <div>Gesture: {currentGesture || "None"}</div>
              <div>Detecting: {isDetecting ? "Yes" : "No"}</div>
            </div>
          )}

          {/* Instructions */}
          <div className="absolute bottom-2 right-2 bg-blue-600/70 text-white p-2 rounded text-xs">
            <div>Use keyboard: ← → O C P T</div>
          </div>
        </>
      )}
    </div>
  )
}
