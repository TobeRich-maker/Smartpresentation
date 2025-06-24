"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { useGestureDetection, type GestureType } from "@/hooks/use-gesture-detection"

interface SimpleGestureWebcamProps {
  enabled: boolean
  onGestureDetected?: (gesture: GestureType, confidence?: number) => void
  showLandmarks?: boolean
  showDebugInfo?: boolean
}

export function SimpleGestureWebcam({
  enabled,
  onGestureDetected,
  showLandmarks = true,
  showDebugInfo = false,
}: SimpleGestureWebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [cameraActive, setCameraActive] = useState(false)
  const [streamInfo, setStreamInfo] = useState<any>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [videoElementReady, setVideoElementReady] = useState(false)

  // Use gesture detection hook with proper callback forwarding
  const { currentGesture, gestureConfidence, fps, isDetecting, debugInfo } = useGestureDetection({
    enabled,
    onGestureDetected: (gesture, confidence) => {
      console.log(`📡 SimpleGestureWebcam forwarding gesture: ${gesture}`)
      if (onGestureDetected) {
        onGestureDetected(gesture, confidence)
      }
    },
    debounceMs: 800,
    confidenceThreshold: 0.7,
    smoothingFrames: 3,
  })

  // Track when video element is ready
  useEffect(() => {
    if (videoRef.current) {
      console.log("📺 Video element is now available")
      setVideoElementReady(true)
    } else {
      console.log("📺 Video element not yet available")
      setVideoElementReady(false)
    }
  }, [videoRef.current])

  // Wait for video element to be available
  const waitForVideoElement = useCallback(async (maxWaitTime = 5000): Promise<HTMLVideoElement> => {
    const startTime = Date.now()

    return new Promise((resolve, reject) => {
      const checkVideoElement = () => {
        if (videoRef.current) {
          console.log("✅ Video element found after waiting")
          resolve(videoRef.current)
          return
        }

        if (Date.now() - startTime > maxWaitTime) {
          reject(new Error("Timeout waiting for video element"))
          return
        }

        // Check again in 100ms
        setTimeout(checkVideoElement, 100)
      }

      checkVideoElement()
    })
  }, [])

  // Camera setup function with proper error handling
  const setupCamera = useCallback(async () => {
    console.log("📷 Setting up camera...")

    try {
      // Wait for video element to be available
      console.log("⏳ Waiting for video element...")
      const video = await waitForVideoElement()
      console.log("✅ Video element is ready:", video)

      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia is not supported in this browser")
      }

      // Request camera with specific constraints
      const constraints = {
        video: {
          width: { ideal: 640, min: 320, max: 1280 },
          height: { ideal: 480, min: 240, max: 720 },
          facingMode: "user",
          frameRate: { ideal: 30, min: 10, max: 60 },
        },
        audio: false,
      }

      console.log("📋 Requesting camera with constraints:", constraints)

      const stream = await navigator.mediaDevices.getUserMedia(constraints)

      console.log("✅ Camera stream obtained:", stream)
      console.log(
        "📊 Stream tracks:",
        stream.getTracks().map((track) => ({
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState,
        })),
      )

      // Store stream info for debugging
      setStreamInfo({
        tracks: stream.getTracks().length,
        videoTracks: stream.getVideoTracks().length,
        audioTracks: stream.getAudioTracks().length,
        active: stream.active,
      })

      // Configure video element
      video.srcObject = stream
      video.autoplay = true
      video.playsInline = true
      video.muted = true

      // Wait for video to be ready with proper promise handling
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Video load timeout"))
        }, 10000)

        const onLoadedMetadata = () => {
          clearTimeout(timeout)
          console.log("📺 Video metadata loaded:", {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
          })

          // Remove event listeners
          video.removeEventListener("loadedmetadata", onLoadedMetadata)
          video.removeEventListener("error", onError)

          resolve()
        }

        const onError = (error: any) => {
          clearTimeout(timeout)

          // Remove event listeners
          video.removeEventListener("loadedmetadata", onLoadedMetadata)
          video.removeEventListener("error", onError)

          reject(new Error(`Video error: ${error.message || "Unknown error"}`))
        }

        video.addEventListener("loadedmetadata", onLoadedMetadata)
        video.addEventListener("error", onError)
      })

      // Start playing
      await video.play()

      console.log("▶️ Video playing successfully")
      return stream
    } catch (error) {
      console.error("❌ Setup camera error:", error)
      throw error
    }
  }, [waitForVideoElement])

  // Start camera function
  const startCamera = useCallback(async () => {
    if (!enabled) {
      console.log("📷 Camera disabled, skipping setup")
      return
    }

    console.log("📷 Starting camera...")
    setIsLoading(true)
    setError(null)

    try {
      const stream = await setupCamera()
      setCameraActive(true)
      setIsLoading(false)
      setRetryCount(0) // Reset retry count on success
    } catch (err: any) {
      console.error("❌ Camera error:", err)
      let errorMessage = "Camera access failed"

      if (err.message === "Timeout waiting for video element") {
        errorMessage = "Video element not ready. Please refresh the page."
      } else if (err.name === "NotAllowedError") {
        errorMessage = "Camera permission denied. Please allow camera access and refresh the page."
      } else if (err.name === "NotFoundError") {
        errorMessage = "No camera found. Please connect a camera and try again."
      } else if (err.name === "NotReadableError") {
        errorMessage = "Camera is already in use by another application."
      } else if (err.name === "OverconstrainedError") {
        errorMessage = "Camera doesn't support the requested settings."
      } else if (err.message) {
        errorMessage = err.message
      }

      setError(errorMessage)
      setIsLoading(false)
      setCameraActive(false)
    }
  }, [enabled, setupCamera])

  // Stop camera function
  const stopCamera = useCallback(() => {
    console.log("🧹 Stopping camera...")
    const video = videoRef.current
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream
      stream.getTracks().forEach((track) => {
        console.log(`🔌 Stopping track: ${track.kind}`)
        track.stop()
      })
      video.srcObject = null
    }
    setCameraActive(false)
    setStreamInfo(null)
  }, [])

  // Only start camera when both enabled and video element is ready
  useEffect(() => {
    if (enabled && videoElementReady) {
      console.log("🎯 Both enabled and video element ready - starting camera")
      startCamera()
    } else if (!enabled) {
      console.log("🚫 Camera disabled - stopping camera")
      stopCamera()
    } else {
      console.log("⏳ Waiting for video element to be ready...")
    }

    return () => {
      stopCamera()
    }
  }, [enabled, videoElementReady, startCamera, stopCamera])

  // Retry camera function
  const retryCamera = useCallback(() => {
    console.log("🔄 Retrying camera...")
    setError(null)
    setCameraActive(false)
    setRetryCount((prev) => prev + 1)

    // Stop current camera first
    stopCamera()

    // Wait a bit then restart
    setTimeout(() => {
      if (enabled && videoElementReady) {
        startCamera()
      }
    }, 1000)
  }, [enabled, videoElementReady, startCamera, stopCamera])

  // Auto-retry on certain errors (but limit retries)
  useEffect(() => {
    if (error && retryCount < 3 && enabled) {
      const shouldAutoRetry =
        error.includes("Video element not ready") ||
        error.includes("Video load timeout") ||
        error.includes("Timeout waiting for video element")

      if (shouldAutoRetry) {
        console.log(`🔄 Auto-retrying camera (attempt ${retryCount + 1}/3)`)
        setTimeout(retryCamera, 2000)
      }
    }
  }, [error, retryCount, enabled, retryCamera])

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
        <p className="text-red-500 dark:text-red-300 text-sm text-center mb-3">{error}</p>
        <div className="flex gap-2">
          <button onClick={retryCamera} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
            Retry Camera
          </button>
          {retryCount > 0 && <span className="text-xs text-red-400 self-center">Attempt {retryCount}/3</span>}
        </div>
        {showDebugInfo && (
          <div className="mt-3 text-xs text-red-400 bg-red-100 dark:bg-red-900/30 p-2 rounded">
            <div>Video Element Ready: {videoElementReady ? "Yes" : "No"}</div>
            <div>Retry Count: {retryCount}</div>
            <div>Error: {error}</div>
          </div>
        )}
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100 dark:bg-gray-800">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600 dark:text-gray-400">Starting camera...</p>
          {retryCount > 0 && <p className="text-xs text-gray-500 mt-1">Retry attempt {retryCount}</p>}
          {showDebugInfo && (
            <div className="mt-2 text-xs text-gray-500">
              <div>Video Element Ready: {videoElementReady ? "Yes" : "No"}</div>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      {/* Video element with explicit styling and error handling */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover bg-black"
        style={{
          transform: "scaleX(-1)", // Mirror the video
          minHeight: "200px", // Ensure minimum height
          minWidth: "200px", // Ensure minimum width
        }}
        onError={(e) => {
          console.error("Video element error:", e)
          setError("Video playback error")
        }}
        onLoadStart={() => console.log("📺 Video load started")}
        onLoadedData={() => console.log("📺 Video data loaded")}
        onCanPlay={() => console.log("📺 Video can play")}
        onPlaying={() => console.log("📺 Video is playing")}
        onWaiting={() => console.log("📺 Video waiting for data")}
        onStalled={() => console.log("📺 Video stalled")}
      />

      {/* Status indicators */}
      <div className="absolute top-2 left-2 space-y-1">
        {/* Detection status */}
        <div className={`px-2 py-1 rounded text-xs text-white ${isDetecting ? "bg-green-600/70" : "bg-gray-600/70"}`}>
          {isDetecting ? "Detecting" : "Stopped"}
        </div>

        {/* FPS Counter */}
        <div className="bg-black/70 text-white px-2 py-1 rounded text-xs">FPS: {Math.round(fps)}</div>

        {/* Camera status */}
        <div className={`px-2 py-1 rounded text-xs text-white ${cameraActive ? "bg-green-600/70" : "bg-red-600/70"}`}>
          {cameraActive ? "Camera Active" : "Camera Inactive"}
        </div>

        {/* Video element status */}
        <div
          className={`px-2 py-1 rounded text-xs text-white ${videoElementReady ? "bg-blue-600/70" : "bg-yellow-600/70"}`}
        >
          {videoElementReady ? "Video Ready" : "Video Loading"}
        </div>
      </div>

      {/* Current gesture indicator */}
      {currentGesture && (
        <div className="absolute top-2 right-2 bg-purple-600/70 text-white px-3 py-2 rounded text-sm font-medium animate-pulse">
          {currentGesture.replace("_", " ")} ({Math.round(gestureConfidence * 100)}%)
        </div>
      )}

      {/* Enhanced debug info */}
      {showDebugInfo && (
        <div className="absolute bottom-2 left-2 bg-black/70 text-white p-2 rounded text-xs font-mono max-w-xs">
          <div>Camera: {cameraActive ? "Active" : "Inactive"}</div>
          <div>Video Element: {videoElementReady ? "Ready" : "Not Ready"}</div>
          <div>Detecting: {isDetecting ? "Yes" : "No"}</div>
          <div>FPS: {Math.round(fps)}</div>
          <div>Current: {currentGesture || "None"}</div>
          <div>Confidence: {Math.round(gestureConfidence * 100)}%</div>
          <div>Retries: {retryCount}</div>
          {streamInfo && (
            <>
              <div>Tracks: {streamInfo.tracks}</div>
              <div>Video Tracks: {streamInfo.videoTracks}</div>
              <div>Stream Active: {streamInfo.active ? "Yes" : "No"}</div>
            </>
          )}
          <div>
            Last Gesture:{" "}
            {debugInfo.lastGestureTime ? new Date(debugInfo.lastGestureTime).toLocaleTimeString() : "Never"}
          </div>
          <div>Debounce: {debugInfo.debounceMs}ms</div>
        </div>
      )}

      {/* Keyboard instructions overlay */}
      <div className="absolute bottom-2 right-2 bg-blue-600/70 text-white p-2 rounded text-xs max-w-xs">
        <div className="font-medium mb-1">Test Controls:</div>
        <div>← → = Navigate slides</div>
        <div>O = Play, C = Pause</div>
        <div>P = Point, T = Thumbs up</div>
      </div>
    </div>
  )
}
