"use client"

import { useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle, Camera, Eye, Monitor } from "lucide-react"

interface DiagnosticResult {
  step: string
  status: "success" | "error" | "warning" | "info"
  message: string
  details?: any
  fix?: string
}

export function CameraTroubleshooter() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<DiagnosticResult[]>([])
  const [currentStep, setCurrentStep] = useState("")
  const [videoMetrics, setVideoMetrics] = useState<any>({})

  const addResult = (
    step: string,
    status: DiagnosticResult["status"],
    message: string,
    details?: any,
    fix?: string,
  ) => {
    const result: DiagnosticResult = { step, status, message, details, fix }
    setResults((prev) => [...prev, result])
    console.log(`[${status.toUpperCase()}] ${step}: ${message}`, details)
  }

  const runComprehensiveDiagnostics = async () => {
    setIsRunning(true)
    setResults([])
    setVideoMetrics({})
    setCurrentStep("Starting diagnostics...")

    try {
      // Step 1: Browser Support Check
      setCurrentStep("Checking browser support...")
      await delay(300)

      const browserCheck = {
        getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        mediaDevices: !!navigator.mediaDevices,
        webRTC: !!(window.RTCPeerConnection || window.webkitRTCPeerConnection),
        isSecureContext: window.isSecureContext,
        protocol: window.location.protocol,
        hostname: window.location.hostname,
      }

      if (!browserCheck.getUserMedia) {
        addResult(
          "Browser Support",
          "error",
          "getUserMedia not supported",
          browserCheck,
          "Use a modern browser (Chrome 53+, Firefox 36+, Safari 11+)",
        )
        return
      }

      if (!browserCheck.isSecureContext && browserCheck.hostname !== "localhost") {
        addResult(
          "Security Context",
          "error",
          "Camera requires HTTPS or localhost",
          browserCheck,
          "Serve your app over HTTPS or use localhost for development",
        )
        return
      }

      addResult("Browser Support", "success", "All required APIs are supported", browserCheck)

      // Step 2: Video Element Validation
      setCurrentStep("Validating video element...")
      await delay(200)

      const video = videoRef.current
      if (!video) {
        addResult(
          "Video Element",
          "error",
          "Video element not found",
          null,
          "Ensure the video element is properly rendered in the DOM",
        )
        return
      }

      const videoElementInfo = {
        exists: true,
        isConnected: video.isConnected,
        parentNode: !!video.parentNode,
        tagName: video.tagName,
        readyState: video.readyState,
        networkState: video.networkState,
        dimensions: {
          clientWidth: video.clientWidth,
          clientHeight: video.clientHeight,
          offsetWidth: video.offsetWidth,
          offsetHeight: video.offsetHeight,
        },
      }

      if (!video.isConnected) {
        addResult(
          "Video Element",
          "error",
          "Video element not connected to DOM",
          videoElementInfo,
          "Ensure video element is properly mounted",
        )
        return
      }

      addResult("Video Element", "success", "Video element is properly mounted", videoElementInfo)

      // Step 3: CSS and Layout Check
      setCurrentStep("Checking CSS and layout...")
      await delay(200)

      const computedStyle = window.getComputedStyle(video)
      const layoutInfo = {
        display: computedStyle.display,
        visibility: computedStyle.visibility,
        opacity: computedStyle.opacity,
        width: computedStyle.width,
        height: computedStyle.height,
        position: computedStyle.position,
        zIndex: computedStyle.zIndex,
        transform: computedStyle.transform,
        overflow: computedStyle.overflow,
      }

      const layoutIssues = []
      if (computedStyle.display === "none") layoutIssues.push("display: none")
      if (computedStyle.visibility === "hidden") layoutIssues.push("visibility: hidden")
      if (computedStyle.opacity === "0") layoutIssues.push("opacity: 0")
      if (computedStyle.width === "0px") layoutIssues.push("width: 0")
      if (computedStyle.height === "0px") layoutIssues.push("height: 0")

      if (layoutIssues.length > 0) {
        addResult(
          "CSS Layout",
          "error",
          `Layout issues: ${layoutIssues.join(", ")}`,
          layoutInfo,
          "Fix CSS properties that hide the video element",
        )
        return
      }

      addResult("CSS Layout", "success", "No layout issues detected", layoutInfo)

      // Step 4: Camera Permissions
      setCurrentStep("Checking camera permissions...")
      await delay(200)

      let permissionState = "unknown"
      try {
        if (navigator.permissions) {
          const permission = await navigator.permissions.query({ name: "camera" as PermissionName })
          permissionState = permission.state
        }
      } catch (e) {
        console.log("Permissions API not available")
      }

      addResult("Permissions", "info", `Camera permission: ${permissionState}`, { permissionState })

      // Step 5: MediaStream Creation
      setCurrentStep("Creating camera stream...")

      let stream: MediaStream
      try {
        const constraints = {
          video: {
            width: { ideal: 640, min: 320, max: 1920 },
            height: { ideal: 480, min: 240, max: 1080 },
            facingMode: "user",
            frameRate: { ideal: 30, min: 15 },
          },
          audio: false,
        }

        stream = await navigator.mediaDevices.getUserMedia(constraints)
        streamRef.current = stream

        const streamInfo = {
          id: stream.id,
          active: stream.active,
          tracks: stream.getTracks().map((track) => ({
            kind: track.kind,
            label: track.label,
            enabled: track.enabled,
            readyState: track.readyState,
            settings: track.getSettings?.() || {},
          })),
        }

        addResult("Stream Creation", "success", `Stream created with ${stream.getTracks().length} tracks`, streamInfo)

        if (!stream.active) {
          addResult(
            "Stream Status",
            "warning",
            "Stream is not active",
            streamInfo,
            "Check if another application is using the camera",
          )
        }
      } catch (error: any) {
        const errorInfo = {
          name: error.name,
          message: error.message,
          constraint: error.constraint,
        }

        let fix = "Check camera permissions and ensure no other app is using the camera"
        if (error.name === "NotAllowedError") {
          fix = "Camera permission denied. Allow camera access in browser settings"
        } else if (error.name === "NotFoundError") {
          fix = "No camera found. Connect a camera and try again"
        } else if (error.name === "NotReadableError") {
          fix = "Camera is already in use by another application"
        }

        addResult("Stream Creation", "error", `Failed to create stream: ${error.message}`, errorInfo, fix)
        return
      }

      // Step 6: Stream Assignment
      setCurrentStep("Assigning stream to video...")
      await delay(200)

      try {
        // Configure video element BEFORE assigning stream
        video.autoplay = true
        video.playsInline = true
        video.muted = true
        video.controls = false
        video.crossOrigin = "anonymous"

        // Assign stream
        video.srcObject = stream

        const assignmentInfo = {
          srcObjectAssigned: !!video.srcObject,
          autoplay: video.autoplay,
          playsInline: video.playsInline,
          muted: video.muted,
          controls: video.controls,
          crossOrigin: video.crossOrigin,
        }

        addResult("Stream Assignment", "success", "Stream assigned to video element", assignmentInfo)
      } catch (error: any) {
        addResult(
          "Stream Assignment",
          "error",
          `Failed to assign stream: ${error.message}`,
          { error },
          "Try using video.src with URL.createObjectURL(stream) as fallback",
        )
        return
      }

      // Step 7: Video Metadata Loading
      setCurrentStep("Waiting for video metadata...")

      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Metadata load timeout"))
        }, 10000)

        const onLoadedMetadata = () => {
          clearTimeout(timeout)
          video.removeEventListener("loadedmetadata", onLoadedMetadata)
          video.removeEventListener("error", onError)

          const metadataInfo = {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            duration: video.duration,
            readyState: video.readyState,
            networkState: video.networkState,
          }

          setVideoMetrics(metadataInfo)

          if (video.videoWidth === 0 || video.videoHeight === 0) {
            addResult(
              "Video Metadata",
              "error",
              "Video dimensions are 0x0",
              metadataInfo,
              "Stream may not be providing video data",
            )
            reject(new Error("Invalid video dimensions"))
          } else {
            addResult(
              "Video Metadata",
              "success",
              `Video metadata loaded: ${video.videoWidth}x${video.videoHeight}`,
              metadataInfo,
            )
            resolve()
          }
        }

        const onError = (event: any) => {
          clearTimeout(timeout)
          video.removeEventListener("loadedmetadata", onLoadedMetadata)
          video.removeEventListener("error", onError)
          reject(new Error("Video metadata load error"))
        }

        if (video.readyState >= 1) {
          onLoadedMetadata()
        } else {
          video.addEventListener("loadedmetadata", onLoadedMetadata)
          video.addEventListener("error", onError)
        }
      })

      // Step 8: Video Playback
      setCurrentStep("Starting video playback...")
      await delay(200)

      try {
        await video.play()

        // Wait for playback to stabilize
        await delay(1000)

        const playbackInfo = {
          paused: video.paused,
          currentTime: video.currentTime,
          playbackRate: video.playbackRate,
          readyState: video.readyState,
          ended: video.ended,
        }

        if (video.paused) {
          addResult(
            "Video Playback",
            "error",
            "Video is paused after play() call",
            playbackInfo,
            "Check browser autoplay policies or ensure user interaction",
          )
        } else {
          addResult("Video Playback", "success", "Video is playing successfully", playbackInfo)
        }
      } catch (error: any) {
        addResult(
          "Video Playback",
          "error",
          `Video.play() failed: ${error.message}`,
          { error },
          "Browser may require user interaction for autoplay",
        )
      }

      // Step 9: Visual Content Verification
      setCurrentStep("Verifying visual content...")
      await delay(500)

      const visualCheck = await analyzeVideoContent(video)

      if (visualCheck.hasContent) {
        addResult("Visual Content", "success", "Video is displaying visual content", visualCheck)
      } else {
        addResult(
          "Visual Content",
          "error",
          "Video appears to be black or empty",
          visualCheck,
          "Check if camera is covered or another app is using it",
        )
      }

      // Step 10: Canvas Capture Test
      setCurrentStep("Testing canvas capture...")
      await delay(200)

      const canvasTest = await testCanvasCapture(video)
      if (canvasTest.success) {
        addResult("Canvas Capture", "success", "Canvas can capture video frames", canvasTest)
      } else {
        addResult(
          "Canvas Capture",
          "error",
          "Canvas capture failed",
          canvasTest,
          "Check CORS settings and video element state",
        )
      }

      // Step 11: MediaPipe Compatibility Check
      setCurrentStep("Checking MediaPipe compatibility...")
      await delay(200)

      const mediaPipeCheck = {
        canDrawToCanvas: !!canvasRef.current?.getContext("2d"),
        videoReadyForProcessing: video.readyState >= 2 && !video.paused,
        streamActive: stream.active,
        videoHasContent: visualCheck.hasContent,
      }

      if (mediaPipeCheck.videoReadyForProcessing && mediaPipeCheck.videoHasContent) {
        addResult("MediaPipe Ready", "success", "Video is ready for MediaPipe processing", mediaPipeCheck)
      } else {
        addResult(
          "MediaPipe Ready",
          "warning",
          "Video may not be ready for MediaPipe",
          mediaPipeCheck,
          "Ensure video is playing and displaying content before initializing MediaPipe",
        )
      }
    } catch (error: any) {
      addResult("Diagnostics", "error", `Diagnostics failed: ${error.message}`, { error })
    } finally {
      setIsRunning(false)
      setCurrentStep("")
    }
  }

  const analyzeVideoContent = async (video: HTMLVideoElement): Promise<any> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        resolve({ hasContent: false, error: "Cannot create canvas context" })
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
        let colorVariation = 0

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const brightness = (r + g + b) / 3

          totalBrightness += brightness
          if (brightness > 10) nonBlackPixels++

          const variation = Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r)
          colorVariation += variation
        }

        const totalPixels = data.length / 4
        const avgBrightness = totalBrightness / totalPixels
        const nonBlackPercentage = (nonBlackPixels / totalPixels) * 100

        const hasContent = avgBrightness > 15 && nonBlackPercentage > 10

        resolve({
          hasContent,
          avgBrightness: Math.round(avgBrightness),
          nonBlackPercentage: Math.round(nonBlackPercentage * 100) / 100,
          colorVariation: Math.round(colorVariation / totalPixels),
          totalPixels,
          canvasSize: { width: canvas.width, height: canvas.height },
        })
      } catch (error: any) {
        resolve({ hasContent: false, error: error.message })
      }
    })
  }

  const testCanvasCapture = async (video: HTMLVideoElement): Promise<any> => {
    const canvas = canvasRef.current
    if (!canvas) return { success: false, error: "Canvas element not found" }

    const ctx = canvas.getContext("2d")
    if (!ctx) return { success: false, error: "Cannot get canvas context" }

    try {
      canvas.width = video.videoWidth || 320
      canvas.height = video.videoHeight || 240

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      return {
        success: true,
        canvasSize: { width: canvas.width, height: canvas.height },
        dataURL: canvas.toDataURL("image/png").substring(0, 100) + "...",
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setResults([])
    setVideoMetrics({})
  }

  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  const StatusIcon = ({ status }: { status: DiagnosticResult["status"] }) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Monitor className="h-4 w-4 text-blue-500" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Camera className="h-6 w-6" />
            Camera Troubleshooter
          </h2>
          <div className="flex gap-2">
            <Button onClick={runComprehensiveDiagnostics} disabled={isRunning} size="lg">
              {isRunning ? "Running Diagnostics..." : "Run Full Diagnostics"}
            </Button>
            <Button onClick={cleanup} variant="outline" size="lg">
              Cleanup
            </Button>
          </div>
        </div>

        {currentStep && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Current Step:</strong> {currentStep}
            </AlertDescription>
          </Alert>
        )}
      </Card>

      {/* Video Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Live Camera Feed
          </h3>
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border-2 border-gray-300">
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
              onError={(e) => console.error("📺 Video error:", e)}
            />

            {/* Status overlay */}
            <div className="absolute top-2 left-2 space-y-1">
              {streamRef.current && <Badge className="bg-green-600">Stream Active</Badge>}
              {videoRef.current && !videoRef.current.paused && <Badge className="bg-blue-600">Playing</Badge>}
            </div>

            {isRunning && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>Running diagnostics...</p>
                </div>
              </div>
            )}
          </div>

          {Object.keys(videoMetrics).length > 0 && (
            <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
              <h4 className="font-medium mb-2">Video Metrics:</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  Size: {videoMetrics.videoWidth}×{videoMetrics.videoHeight}
                </div>
                <div>Ready State: {videoMetrics.readyState}</div>
                <div>Network State: {videoMetrics.networkState}</div>
                <div>Duration: {videoMetrics.duration || "Live"}</div>
              </div>
            </div>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-3">Canvas Capture Test</h3>
          <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden border-2 border-gray-300">
            <canvas ref={canvasRef} className="w-full h-full object-cover" style={{ transform: "scaleX(-1)" }} />
          </div>
          <p className="text-xs text-gray-600 mt-2">
            This canvas should mirror the video if everything is working correctly.
          </p>
        </Card>
      </div>

      {/* Diagnostic Results */}
      {results.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Diagnostic Results</h3>
          <div className="space-y-3">
            {results.map((result, index) => (
              <div
                key={index}
                className={`flex items-start gap-3 p-4 rounded-lg border ${
                  result.status === "error"
                    ? "border-red-300 bg-red-50"
                    : result.status === "warning"
                      ? "border-yellow-300 bg-yellow-50"
                      : result.status === "success"
                        ? "border-green-300 bg-green-50"
                        : "border-blue-300 bg-blue-50"
                }`}
              >
                <div className="flex-shrink-0 mt-0.5">
                  <StatusIcon status={result.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium">{result.step}</h4>
                    <Badge
                      variant={
                        result.status === "success"
                          ? "default"
                          : result.status === "error"
                            ? "destructive"
                            : result.status === "warning"
                              ? "secondary"
                              : "outline"
                      }
                    >
                      {result.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{result.message}</p>

                  {result.fix && (
                    <div className="p-2 bg-blue-100 border border-blue-200 rounded text-sm text-blue-800 mb-2">
                      <strong>💡 Fix:</strong> {result.fix}
                    </div>
                  )}

                  {result.details && (
                    <details className="mt-2">
                      <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800">
                        Show Technical Details
                      </summary>
                      <pre className="text-xs bg-white p-3 rounded mt-2 overflow-auto max-h-32 border">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
