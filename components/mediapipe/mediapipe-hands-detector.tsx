"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Camera, CameraOff, AlertTriangle, CheckCircle, XCircle } from "lucide-react"

interface HandLandmark {
  x: number
  y: number
  z: number
}

interface MediaPipeResults {
  multiHandLandmarks?: HandLandmark[][]
  multiHandedness?: any[]
}

interface MediaPipeHandsDetectorProps {
  onResults?: (results: MediaPipeResults) => void
  onCameraStatus?: (status: "active" | "inactive" | "error", message?: string) => void
  showDebugOverlay?: boolean
  enableFallbackMode?: boolean
}

export function MediaPipeHandsDetector({
  onResults,
  onCameraStatus,
  showDebugOverlay = true,
  enableFallbackMode = true,
}: MediaPipeHandsDetectorProps) {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const handsRef = useRef<any>(null)
  const animationFrameRef = useRef<number | null>(null)
  const lastFrameTimeRef = useRef<number>(0)
  const frameCountRef = useRef<number>(0)

  // State
  const [cameraStatus, setCameraStatus] = useState<"idle" | "initializing" | "active" | "inactive" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [isMediaPipeLoaded, setIsMediaPipeLoaded] = useState(false)
  const [isMediaPipeInitialized, setIsMediaPipeInitialized] = useState(false)
  const [fps, setFps] = useState(0)
  const [lastDetectionTime, setLastDetectionTime] = useState<number>(0)
  const [videoMetrics, setVideoMetrics] = useState({
    width: 0,
    height: 0,
    brightness: 0,
    hasContent: false,
  })

  // Load MediaPipe scripts
  const loadMediaPipeScripts = useCallback(async () => {
    if (typeof window === "undefined") return false

    try {
      // Check if already loaded
      if ((window as any).Hands) {
        setIsMediaPipeLoaded(true)
        return true
      }

      console.log("📦 Loading MediaPipe scripts...")

      // Load required scripts in order
      await Promise.all([
        loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"),
        loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js"),
        loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"),
      ])

      await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js")

      // Wait for scripts to initialize
      await new Promise((resolve) => setTimeout(resolve, 500))

      if ((window as any).Hands) {
        console.log("✅ MediaPipe scripts loaded successfully")
        setIsMediaPipeLoaded(true)
        return true
      } else {
        throw new Error("MediaPipe Hands not available after loading")
      }
    } catch (error: any) {
      console.error("❌ Failed to load MediaPipe:", error)
      setError(`Failed to load MediaPipe: ${error.message}`)
      return false
    }
  }, [])

  // Helper function to load scripts
  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve()
        return
      }

      const script = document.createElement("script")
      script.src = src
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
      document.head.appendChild(script)
    })
  }

  // Initialize MediaPipe Hands
  const initializeMediaPipe = useCallback(async () => {
    if (!isMediaPipeLoaded || !(window as any).Hands) {
      console.error("❌ MediaPipe not loaded")
      return false
    }

    try {
      console.log("🤖 Initializing MediaPipe Hands...")

      const hands = new (window as any).Hands({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        },
      })

      // Configure MediaPipe Hands
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.7,
        minTrackingConfidence: 0.5,
      })

      // Set up results callback
      hands.onResults((results: MediaPipeResults) => {
        handleMediaPipeResults(results)
      })

      handsRef.current = hands
      setIsMediaPipeInitialized(true)
      console.log("✅ MediaPipe Hands initialized")
      return true
    } catch (error: any) {
      console.error("❌ Failed to initialize MediaPipe:", error)
      setError(`Failed to initialize MediaPipe: ${error.message}`)
      return false
    }
  }, [isMediaPipeLoaded])

  // Handle MediaPipe results
  const handleMediaPipeResults = useCallback(
    (results: MediaPipeResults) => {
      setLastDetectionTime(Date.now())

      // Update FPS
      frameCountRef.current++
      const now = performance.now()
      if (now - lastFrameTimeRef.current >= 1000) {
        setFps(frameCountRef.current)
        frameCountRef.current = 0
        lastFrameTimeRef.current = now
      }

      // Draw results on canvas
      if (canvasRef.current && videoRef.current) {
        drawResults(results)
      }

      // Call external callback
      if (onResults) {
        onResults(results)
      }
    },
    [onResults],
  )

  // Draw hand landmarks on canvas
  const drawResults = (results: MediaPipeResults) => {
    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size to match video
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Draw hand landmarks
    if (results.multiHandLandmarks) {
      for (const landmarks of results.multiHandLandmarks) {
        // Draw connections
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
    [7, 8], // Index
    [0, 9],
    [9, 10],
    [10, 11],
    [11, 12], // Middle
    [0, 13],
    [13, 14],
    [14, 15],
    [15, 16], // Ring
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

  // Initialize camera
  const initializeCamera = useCallback(async () => {
    setCameraStatus("initializing")
    setError(null)

    try {
      console.log("📷 Initializing camera...")

      // Check browser support
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera not supported in this browser")
      }

      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640, min: 320, max: 1280 },
          height: { ideal: 480, min: 240, max: 720 },
          facingMode: "user",
          frameRate: { ideal: 30, min: 15 },
        },
        audio: false,
      })

      streamRef.current = stream

      // Get video element
      const video = videoRef.current
      if (!video) {
        throw new Error("Video element not found")
      }

      // Configure video
      video.srcObject = stream
      video.autoplay = true
      video.playsInline = true
      video.muted = true

      // Wait for video to be ready
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Video load timeout")), 10000)

        video.onloadedmetadata = () => {
          clearTimeout(timeout)
          console.log(`📺 Video ready: ${video.videoWidth}x${video.videoHeight}`)
          resolve()
        }

        video.onerror = () => {
          clearTimeout(timeout)
          reject(new Error("Video load error"))
        }
      })

      // Start video playback
      await video.play()

      // Verify video is actually showing content
      await new Promise((resolve) => setTimeout(resolve, 1000))
      const hasContent = await checkVideoContent(video)

      if (!hasContent) {
        setCameraStatus("inactive")
        setError("Camera is not showing content (black screen)")
        onCameraStatus?.("inactive", "Camera appears to be black or inactive")
        return
      }

      setCameraStatus("active")
      onCameraStatus?.("active")
      console.log("✅ Camera initialized successfully")

      // Start processing frames
      startFrameProcessing()
    } catch (error: any) {
      console.error("❌ Camera initialization failed:", error)
      setCameraStatus("error")
      setError(error.message)
      onCameraStatus?.("error", error.message)
    }
  }, [onCameraStatus])

  // Check if video has actual content (not black screen)
  const checkVideoContent = async (video: HTMLVideoElement): Promise<boolean> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        resolve(false)
        return
      }

      canvas.width = video.videoWidth || 320
      canvas.height = video.videoHeight || 240

      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        let totalBrightness = 0
        let nonBlackPixels = 0

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const brightness = (r + g + b) / 3

          totalBrightness += brightness
          if (brightness > 10) nonBlackPixels++
        }

        const avgBrightness = totalBrightness / (data.length / 4)
        const nonBlackPercentage = (nonBlackPixels / (data.length / 4)) * 100

        setVideoMetrics({
          width: canvas.width,
          height: canvas.height,
          brightness: Math.round(avgBrightness),
          hasContent: avgBrightness > 15 && nonBlackPercentage > 10,
        })

        resolve(avgBrightness > 15 && nonBlackPercentage > 10)
      } catch (error) {
        console.error("Error checking video content:", error)
        resolve(false)
      }
    })
  }

  // Start processing video frames with MediaPipe
  const startFrameProcessing = useCallback(() => {
    if (!handsRef.current || !videoRef.current) return

    const processFrame = async () => {
      const video = videoRef.current
      const hands = handsRef.current

      if (video && hands && video.readyState === 4 && !video.paused) {
        try {
          await hands.send({ image: video })
        } catch (error) {
          console.error("Error processing frame:", error)
        }
      }

      animationFrameRef.current = requestAnimationFrame(processFrame)
    }

    processFrame()
  }, [])

  // Stop camera and cleanup
  const stopCamera = useCallback(() => {
    console.log("🛑 Stopping camera...")

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
    setError(null)
    setFps(0)
    setLastDetectionTime(0)
  }, [])

  // Start the complete initialization process
  const startDetection = useCallback(async () => {
    console.log("🚀 Starting MediaPipe Hands detection...")

    // Step 1: Load MediaPipe
    if (!isMediaPipeLoaded) {
      const loaded = await loadMediaPipeScripts()
      if (!loaded) return
    }

    // Step 2: Initialize MediaPipe
    if (!isMediaPipeInitialized) {
      const initialized = await initializeMediaPipe()
      if (!initialized) return
    }

    // Step 3: Initialize Camera
    await initializeCamera()
  }, [isMediaPipeLoaded, isMediaPipeInitialized, loadMediaPipeScripts, initializeMediaPipe, initializeCamera])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
    }
  }, [stopCamera])

  // Monitor camera status
  useEffect(() => {
    if (cameraStatus === "active" && videoRef.current) {
      const interval = setInterval(async () => {
        const video = videoRef.current
        if (video) {
          const hasContent = await checkVideoContent(video)
          if (!hasContent && cameraStatus === "active") {
            setCameraStatus("inactive")
            setError("Camera feed lost or showing black screen")
            onCameraStatus?.("inactive", "Camera feed lost")
          }
        }
      }, 5000)

      return () => clearInterval(interval)
    }
  }, [cameraStatus, onCameraStatus])

  // Status icon component
  const StatusIcon = () => {
    switch (cameraStatus) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
      case "inactive":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "initializing":
        return <div className="h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
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
            MediaPipe Hands Detector
          </h3>
          <div className="flex gap-2">
            <Button
              onClick={startDetection}
              disabled={cameraStatus === "initializing" || cameraStatus === "active"}
              size="sm"
            >
              {cameraStatus === "initializing" ? "Starting..." : "Start Detection"}
            </Button>
            <Button onClick={stopCamera} disabled={cameraStatus === "idle"} variant="outline" size="sm">
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
          <span className="text-sm text-gray-600">FPS: {fps}</span>
          <span className="text-sm text-gray-600">
            Last Detection: {lastDetectionTime ? `${Date.now() - lastDetectionTime}ms ago` : "Never"}
          </span>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading States */}
        {!isMediaPipeLoaded && (
          <Alert>
            <AlertDescription>Loading MediaPipe scripts...</AlertDescription>
          </Alert>
        )}

        {isMediaPipeLoaded && !isMediaPipeInitialized && (
          <Alert>
            <AlertDescription>Initializing MediaPipe Hands...</AlertDescription>
          </Alert>
        )}
      </Card>

      {/* Video Display */}
      <Card className="p-4">
        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          {/* Video Element */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
            playsInline
            muted
            autoPlay
          />

          {/* Canvas Overlay for Landmarks */}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ transform: "scaleX(-1)" }}
          />

          {/* Status Overlays */}
          {cameraStatus === "idle" && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
              <div className="text-center text-white">
                <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Camera Not Started</p>
                <p className="text-sm opacity-75">Click "Start Detection" to begin</p>
              </div>
            </div>
          )}

          {cameraStatus === "initializing" && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50">
              <div className="text-center text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-4"></div>
                <p className="text-lg font-medium">Initializing Camera...</p>
                <p className="text-sm opacity-75">Please allow camera access</p>
              </div>
            </div>
          )}

          {(cameraStatus === "error" || cameraStatus === "inactive") && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900/20">
              <div className="text-center text-white bg-red-600/80 p-6 rounded-lg">
                <CameraOff className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg font-medium">Camera Issue</p>
                <p className="text-sm mb-4">{error}</p>
                {enableFallbackMode && (
                  <Button onClick={startDetection} size="sm" variant="secondary">
                    Retry Camera
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Debug Overlay */}
          {showDebugOverlay && cameraStatus === "active" && (
            <div className="absolute top-2 left-2 bg-black/70 text-white p-2 rounded text-xs">
              <div>Status: {cameraStatus}</div>
              <div>FPS: {fps}</div>
              <div>
                Video: {videoMetrics.width}×{videoMetrics.height}
              </div>
              <div>Brightness: {videoMetrics.brightness}</div>
              <div>Content: {videoMetrics.hasContent ? "✓" : "✗"}</div>
              <div>MediaPipe: {isMediaPipeInitialized ? "✓" : "✗"}</div>
            </div>
          )}
        </div>
      </Card>

      {/* Instructions */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h4 className="font-semibold text-blue-800 mb-2">Instructions:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Ensure your camera is not being used by other applications</li>
          <li>• Allow camera permissions when prompted</li>
          <li>• Make sure you have good lighting for better hand detection</li>
          <li>• Keep your hands visible in the camera frame</li>
          <li>• If you see a black screen, try refreshing the page</li>
        </ul>
      </Card>
    </div>
  )
}
