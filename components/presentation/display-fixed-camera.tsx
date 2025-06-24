"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { useGestureDetection, type GestureType } from "@/hooks/use-gesture-detection"

interface DisplayFixedCameraProps {
  enabled: boolean
  onGestureDetected?: (gesture: GestureType, confidence?: number) => void
  showDebugInfo?: boolean
}

export function DisplayFixedCamera({ enabled, onGestureDetected, showDebugInfo = false }: DisplayFixedCameraProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const [status, setStatus] = useState<"idle" | "requesting" | "active" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [isVisible, setIsVisible] = useState(false)
  const [debugData, setDebugData] = useState<any>({})

  // Use gesture detection hook
  const { currentGesture, gestureConfidence, fps, isDetecting } = useGestureDetection({
    enabled,
    onGestureDetected,
    debounceMs: 800,
  })

  // Enhanced camera initialization with display verification
  const initializeCamera = useCallback(async () => {
    if (!enabled) return

    console.log("🎥 Initializing camera with display verification...")
    setStatus("requesting")
    setError(null)
    setIsVisible(false)

    try {
      // Step 1: Verify video element exists and is properly mounted
      const video = videoRef.current
      if (!video) {
        throw new Error("Video element not found")
      }

      console.log("📺 Video element verification:", {
        exists: !!video,
        parentNode: !!video.parentNode,
        isConnected: video.isConnected,
        clientWidth: video.clientWidth,
        clientHeight: video.clientHeight,
      })

      // Step 2: Check container and layout
      const container = containerRef.current
      if (container) {
        const containerStyle = window.getComputedStyle(container)
        console.log("📦 Container style check:", {
          display: containerStyle.display,
          width: containerStyle.width,
          height: containerStyle.height,
          visibility: containerStyle.visibility,
        })
      }

      // Step 3: Request camera with comprehensive constraints
      console.log("📷 Requesting camera access...")
      let stream: MediaStream

      try {
        // Try with ideal constraints first
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 640, min: 320, max: 1920 },
            height: { ideal: 480, min: 240, max: 1080 },
            facingMode: "user",
            frameRate: { ideal: 30, min: 15, max: 60 },
          },
          audio: false,
        })
      } catch (constraintError) {
        console.warn("⚠️ Ideal constraints failed, trying basic constraints...")
        // Fallback to basic constraints
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        })
      }

      streamRef.current = stream
      console.log("✅ Stream created:", {
        id: stream.id,
        active: stream.active,
        tracks: stream.getTracks().length,
      })

      // Step 4: Configure video element with all necessary attributes
      console.log("⚙️ Configuring video element...")

      // Set attributes BEFORE assigning stream
      video.autoplay = true
      video.playsInline = true
      video.muted = true
      video.controls = false
      video.crossOrigin = "anonymous"

      // Ensure video element has proper styling
      video.style.width = "100%"
      video.style.height = "100%"
      video.style.objectFit = "cover"
      video.style.backgroundColor = "black"

      // Step 5: Assign stream to video
      video.srcObject = stream
      console.log("✅ Stream assigned to video")

      // Step 6: Wait for video to be ready with comprehensive event handling
      console.log("⏳ Waiting for video to be ready...")

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Video setup timeout"))
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
          reject(new Error("Video error occurred"))
        }

        video.addEventListener("loadedmetadata", onLoadedMetadata)
        video.addEventListener("canplay", onCanPlay)
        video.addEventListener("error", onError)

        // Force load if needed
        if (video.readyState === 0) {
          video.load()
        }
      })

      // Step 7: Start playback
      console.log("▶️ Starting video playback...")
      try {
        await video.play()
        console.log("✅ Video.play() succeeded")
      } catch (playError: any) {
        console.warn("⚠️ Video.play() failed:", playError.message)
        // Continue anyway - some browsers have autoplay restrictions
      }

      // Step 8: Verify video is displaying content
      console.log("🔍 Verifying video display...")
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const displayCheck = await verifyVideoDisplay(video)

      setDebugData({
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        readyState: video.readyState,
        paused: video.paused,
        currentTime: video.currentTime,
        streamActive: stream.active,
        displayCheck,
      })

      if (displayCheck.hasVisibleContent) {
        setIsVisible(true)
        setStatus("active")
        console.log("✅ Camera is displaying content!")
      } else {
        setStatus("error")
        setError("Camera is not displaying visible content")
        console.warn("⚠️ Camera appears to be black or empty")
      }
    } catch (err: any) {
      console.error("❌ Camera initialization failed:", err)
      setError(err.message)
      setStatus("error")

      // Cleanup on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }
  }, [enabled])

  // Verify video is actually displaying content
  const verifyVideoDisplay = async (video: HTMLVideoElement): Promise<any> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        resolve({ hasVisibleContent: false, error: "Cannot create canvas context" })
        return
      }

      canvas.width = video.videoWidth || 320
      canvas.height = video.videoHeight || 240

      try {
        // Draw video frame to canvas
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Analyze pixel data
        let totalBrightness = 0
        let nonBlackPixels = 0
        let colorVariation = 0

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const brightness = (r + g + b) / 3

          totalBrightness += brightness

          if (brightness > 10) {
            nonBlackPixels++
          }

          // Check color variation
          const variation = Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r)
          colorVariation += variation
        }

        const totalPixels = data.length / 4
        const avgBrightness = totalBrightness / totalPixels
        const nonBlackPercentage = (nonBlackPixels / totalPixels) * 100

        // Determine if video has visible content
        const hasVisibleContent = avgBrightness > 15 && nonBlackPercentage > 10

        resolve({
          hasVisibleContent,
          avgBrightness,
          nonBlackPercentage,
          totalPixels,
          canvasSize: { width: canvas.width, height: canvas.height },
        })
      } catch (error: any) {
        resolve({ hasVisibleContent: false, error: error.message })
      }
    })
  }

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log("🧹 Cleaning up camera...")

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setStatus("idle")
    setError(null)
    setIsVisible(false)
    setDebugData({})
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

  // Retry function
  const retryCamera = () => {
    console.log("🔄 Retrying camera...")
    cleanup()
    setTimeout(() => {
      if (enabled) {
        initializeCamera()
      }
    }, 1000)
  }

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full rounded overflow-hidden bg-black"
      style={{ minHeight: "200px", minWidth: "200px" }}
    >
      {/* Video element with explicit styling to ensure visibility */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{
          transform: "scaleX(-1)",
          backgroundColor: "black",
          display: "block",
          width: "100%",
          height: "100%",
          minWidth: "100%",
          minHeight: "100%",
          maxWidth: "100%",
          maxHeight: "100%",
          objectFit: "cover",
          zIndex: 1,
        }}
        onLoadStart={() => console.log("📺 Video load started")}
        onLoadedMetadata={() => console.log("📺 Video metadata loaded")}
        onCanPlay={() => console.log("📺 Video can play")}
        onPlaying={() => console.log("📺 Video is playing")}
        onError={(e) => console.error("📺 Video error:", e)}
      />

      {/* Status overlays */}
      {!enabled && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100/90 z-10">
          <p className="text-gray-500">Camera disabled</p>
        </div>
      )}

      {enabled && status === "requesting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 z-10">
          <div className="text-center text-white">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
            <p>Starting camera...</p>
          </div>
        </div>
      )}

      {enabled && status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/20 p-4 z-10">
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
          <div className="absolute top-2 left-2 space-y-1 z-20">
            <div className="px-2 py-1 rounded text-xs text-white bg-green-600/70">
              {isVisible ? "Camera Active" : "Camera On (No Image)"}
            </div>
            <div className="bg-black/70 text-white px-2 py-1 rounded text-xs">FPS: {Math.round(fps)}</div>
            {isDetecting && <div className="px-2 py-1 rounded text-xs text-white bg-blue-600/70">Detecting</div>}
          </div>

          {currentGesture && (
            <div className="absolute top-2 right-2 bg-purple-600/70 text-white px-3 py-2 rounded text-sm font-medium z-20">
              {currentGesture.replace("_", " ")}
            </div>
          )}

          {showDebugInfo && (
            <div className="absolute bottom-2 left-2 bg-black/70 text-white p-2 rounded text-xs font-mono max-w-xs z-20">
              <div>Status: {status}</div>
              <div>Visible: {isVisible ? "Yes" : "No"}</div>
              <div>
                Video: {debugData.videoWidth}×{debugData.videoHeight}
              </div>
              <div>Ready: {debugData.readyState}</div>
              <div>Playing: {!debugData.paused ? "Yes" : "No"}</div>
              <div>Stream: {debugData.streamActive ? "Active" : "Inactive"}</div>
              <div>FPS: {Math.round(fps)}</div>
              <div>Gesture: {currentGesture || "None"}</div>
              {debugData.displayCheck && (
                <>
                  <div>Brightness: {debugData.displayCheck.avgBrightness?.toFixed(1)}</div>
                  <div>Non-black: {debugData.displayCheck.nonBlackPercentage?.toFixed(1)}%</div>
                </>
              )}
            </div>
          )}

          <div className="absolute bottom-2 right-2 bg-blue-600/70 text-white p-2 rounded text-xs z-20">
            <div>← → O C P T</div>
          </div>
        </>
      )}
    </div>
  )
}
