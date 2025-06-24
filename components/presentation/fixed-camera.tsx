"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { useGestureDetection, type GestureType } from "@/hooks/use-gesture-detection"

interface FixedCameraProps {
  enabled: boolean
  onGestureDetected?: (gesture: GestureType, confidence?: number) => void
  showDebugInfo?: boolean
}

export function FixedCamera({ enabled, onGestureDetected, showDebugInfo = false }: FixedCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mountedRef = useRef(true)

  const [status, setStatus] = useState<"idle" | "requesting" | "active" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [debugInfo, setDebugInfo] = useState<any>({})

  // Use gesture detection hook
  const { currentGesture, gestureConfidence, fps, isDetecting } = useGestureDetection({
    enabled,
    onGestureDetected,
    debounceMs: 800,
  })

  // Enhanced camera initialization with comprehensive error handling
  const initializeCamera = useCallback(async () => {
    if (!enabled || !mountedRef.current) {
      console.log("❌ Camera init skipped - enabled:", enabled, "mounted:", mountedRef.current)
      return
    }

    console.log("🎥 Initializing camera with enhanced error handling...")
    setStatus("requesting")
    setError(null)

    try {
      // Step 1: Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia not supported in this browser")
      }

      // Step 2: Check if video element is available
      const video = videoRef.current
      if (!video) {
        throw new Error("Video element not available")
      }

      console.log("📺 Video element found:", {
        tagName: video.tagName,
        clientWidth: video.clientWidth,
        clientHeight: video.clientHeight,
        style: video.style.cssText,
      })

      // Step 3: Request camera with fallback constraints
      let stream: MediaStream
      const primaryConstraints = {
        video: {
          facingMode: "user",
          width: { ideal: 640, min: 320, max: 1280 },
          height: { ideal: 480, min: 240, max: 720 },
          frameRate: { ideal: 30, min: 15, max: 60 },
        },
        audio: false,
      }

      try {
        console.log("📋 Trying primary constraints:", primaryConstraints)
        stream = await navigator.mediaDevices.getUserMedia(primaryConstraints)
      } catch (primaryError) {
        console.warn("⚠️ Primary constraints failed, trying fallback...")

        // Fallback to basic constraints
        const fallbackConstraints = {
          video: { facingMode: "user" },
          audio: false,
        }

        stream = await navigator.mediaDevices.getUserMedia(fallbackConstraints)
      }

      console.log("✅ Camera stream obtained:", {
        id: stream.id,
        active: stream.active,
        tracks: stream.getTracks().length,
      })

      // Step 4: Verify stream is still valid and component is mounted
      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop())
        return
      }

      streamRef.current = stream

      // Step 5: Configure video element with comprehensive setup
      console.log("📺 Configuring video element...")

      // Set critical properties BEFORE assigning stream
      video.muted = true
      video.playsInline = true
      video.autoplay = true
      video.controls = false

      // Set crossOrigin to avoid CORS issues
      video.crossOrigin = "anonymous"

      // Step 6: Assign stream to video
      video.srcObject = stream
      console.log("✅ Stream assigned to video.srcObject")

      // Step 7: Wait for video to be ready with comprehensive event handling
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          cleanup()
          reject(new Error("Video setup timeout after 15 seconds"))
        }, 15000)

        let metadataLoaded = false
        let canPlay = false

        const cleanup = () => {
          clearTimeout(timeout)
          video.removeEventListener("loadedmetadata", onLoadedMetadata)
          video.removeEventListener("canplay", onCanPlay)
          video.removeEventListener("error", onError)
        }

        const checkReady = () => {
          if (metadataLoaded && canPlay) {
            cleanup()
            resolve()
          }
        }

        const onLoadedMetadata = () => {
          console.log("📊 Video metadata loaded:", {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            duration: video.duration,
            readyState: video.readyState,
          })

          metadataLoaded = true
          checkReady()
        }

        const onCanPlay = () => {
          console.log("▶️ Video can play")
          canPlay = true
          checkReady()
        }

        const onError = (event: any) => {
          console.error("❌ Video error:", event)
          cleanup()
          reject(new Error(`Video error: ${event.message || "Unknown video error"}`))
        }

        video.addEventListener("loadedmetadata", onLoadedMetadata)
        video.addEventListener("canplay", onCanPlay)
        video.addEventListener("error", onError)

        // Force load if not already loading
        if (video.readyState === 0) {
          video.load()
        }
      })

      // Step 8: Start playback
      console.log("▶️ Starting video playback...")

      try {
        await video.play()
        console.log("✅ Video.play() succeeded")
      } catch (playError: any) {
        console.warn("⚠️ Video.play() failed:", playError.message)

        // Some browsers require user interaction - this is often OK for autoplay
        if (playError.name !== "NotAllowedError") {
          throw playError
        }
      }

      // Step 9: Verify video is actually playing and rendering
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const finalCheck = {
        paused: video.paused,
        currentTime: video.currentTime,
        readyState: video.readyState,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        srcObject: !!video.srcObject,
        streamActive: stream.active,
      }

      console.log("🔍 Final video check:", finalCheck)

      setDebugInfo(finalCheck)

      if (finalCheck.videoWidth === 0 || finalCheck.videoHeight === 0) {
        throw new Error("Video dimensions are 0x0 - stream may not be providing video data")
      }

      if (!finalCheck.streamActive) {
        throw new Error("Stream is not active")
      }

      setStatus("active")
      console.log("✅ Camera initialization complete!")
    } catch (err: any) {
      console.error("❌ Camera initialization failed:", err)

      // Cleanup on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }

      setError(err.message || "Camera initialization failed")
      setStatus("error")
    }
  }, [enabled])

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log("🧹 Cleaning up camera...")

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

    setStatus("idle")
    setError(null)
    setDebugInfo({})
  }, [])

  // Handle enabled state changes
  useEffect(() => {
    if (enabled) {
      initializeCamera()
    } else {
      cleanup()
    }

    return cleanup
  }, [enabled, initializeCamera, cleanup])

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true

    return () => {
      mountedRef.current = false
      cleanup()
    }
  }, [cleanup])

  // Retry function
  const retryCamera = () => {
    console.log("🔄 Retrying camera...")
    cleanup()
    setTimeout(() => {
      if (enabled && mountedRef.current) {
        initializeCamera()
      }
    }, 1000)
  }

  return (
    <div className="relative w-full h-full rounded overflow-hidden bg-black">
      {/* Video element - always rendered with explicit styling */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{
          transform: "scaleX(-1)",
          backgroundColor: "black",
          minWidth: "100%",
          minHeight: "100%",
        }}
        onLoadStart={() => console.log("📺 Video load started")}
        onLoadedData={() => console.log("📺 Video data loaded")}
        onCanPlay={() => console.log("📺 Video can play")}
        onPlaying={() => console.log("📺 Video is playing")}
        onTimeUpdate={() => console.log("📺 Video time update")}
        onError={(e) => console.error("📺 Video element error:", e)}
      />

      {/* Status overlays */}
      {!enabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/90">
          <p className="text-gray-500">Camera disabled</p>
        </div>
      )}

      {enabled && status === "requesting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p>Starting camera...</p>
          </div>
        </div>
      )}

      {enabled && status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/20 p-4">
          <p className="text-red-400 font-medium mb-2">Camera Error</p>
          <p className="text-red-300 text-sm text-center mb-3">{error}</p>
          <button onClick={retryCamera} className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
            Retry Camera
          </button>
        </div>
      )}

      {/* Active camera indicators */}
      {enabled && status === "active" && (
        <>
          <div className="absolute top-2 left-2 space-y-1">
            <div className="px-2 py-1 rounded text-xs text-white bg-green-600/70">Camera Active</div>
            <div className="bg-black/70 text-white px-2 py-1 rounded text-xs">FPS: {Math.round(fps)}</div>
            {isDetecting && <div className="px-2 py-1 rounded text-xs text-white bg-blue-600/70">Detecting</div>}
          </div>

          {currentGesture && (
            <div className="absolute top-2 right-2 bg-purple-600/70 text-white px-3 py-2 rounded text-sm font-medium">
              {currentGesture.replace("_", " ")}
            </div>
          )}

          {showDebugInfo && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white p-2 rounded text-xs font-mono max-w-xs">
              <div>Status: {status}</div>
              <div>
                Video: {debugInfo.videoWidth}x{debugInfo.videoHeight}
              </div>
              <div>Ready State: {debugInfo.readyState}</div>
              <div>Playing: {!debugInfo.paused ? "Yes" : "No"}</div>
              <div>Stream: {debugInfo.streamActive ? "Active" : "Inactive"}</div>
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
