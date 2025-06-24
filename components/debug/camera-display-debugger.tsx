"use client"

import { useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CheckCircle, XCircle, AlertTriangle, Camera, Eye, EyeOff } from "lucide-react"

interface DiagnosticStep {
  id: string
  name: string
  status: "pending" | "success" | "warning" | "error"
  message: string
  details?: any
  fix?: string
}

export function CameraDisplayDebugger() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [steps, setSteps] = useState<DiagnosticStep[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [currentStep, setCurrentStep] = useState(0)
  const [videoVisible, setVideoVisible] = useState(false)
  const [streamInfo, setStreamInfo] = useState<any>({})
  const [videoMetrics, setVideoMetrics] = useState<any>({})

  // Initialize diagnostic steps
  const initSteps = () => {
    const diagnosticSteps: DiagnosticStep[] = [
      {
        id: "browser-check",
        name: "Browser Compatibility",
        status: "pending",
        message: "Checking browser support for getUserMedia...",
      },
      {
        id: "permissions",
        name: "Camera Permissions",
        status: "pending",
        message: "Verifying camera permissions...",
      },
      {
        id: "stream-creation",
        name: "MediaStream Creation",
        status: "pending",
        message: "Creating camera stream...",
      },
      {
        id: "video-element",
        name: "Video Element Validation",
        status: "pending",
        message: "Checking video element properties...",
      },
      {
        id: "stream-assignment",
        name: "Stream Assignment",
        status: "pending",
        message: "Assigning stream to video element...",
      },
      {
        id: "video-attributes",
        name: "Video Attributes",
        status: "pending",
        message: "Configuring video element attributes...",
      },
      {
        id: "css-layout",
        name: "CSS & Layout Check",
        status: "pending",
        message: "Checking CSS and layout issues...",
      },
      {
        id: "video-playback",
        name: "Video Playback",
        status: "pending",
        message: "Starting video playback...",
      },
      {
        id: "visual-verification",
        name: "Visual Content Verification",
        status: "pending",
        message: "Verifying video is displaying content...",
      },
      {
        id: "canvas-capture",
        name: "Canvas Capture Test",
        status: "pending",
        message: "Testing video frame capture...",
      },
    ]
    setSteps(diagnosticSteps)
    setCurrentStep(0)
  }

  // Update step status
  const updateStep = (id: string, status: DiagnosticStep["status"], message: string, details?: any, fix?: string) => {
    setSteps((prev) => prev.map((step) => (step.id === id ? { ...step, status, message, details, fix } : step)))
  }

  // Run comprehensive diagnostics
  const runDiagnostics = async () => {
    setIsRunning(true)
    setVideoVisible(false)
    initSteps()

    try {
      // Step 1: Browser Compatibility Check
      console.log("🔍 Step 1: Browser compatibility check")
      setCurrentStep(0)
      await delay(300)

      const browserSupport = {
        getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        mediaDevices: !!navigator.mediaDevices,
        videoElement: !!document.createElement("video"),
        canvas: !!document.createElement("canvas").getContext,
        webRTC: !!(window.RTCPeerConnection || window.webkitRTCPeerConnection),
        https: location.protocol === "https:" || location.hostname === "localhost",
      }

      if (!browserSupport.getUserMedia) {
        updateStep(
          "browser-check",
          "error",
          "getUserMedia not supported",
          browserSupport,
          "Use a modern browser (Chrome 53+, Firefox 36+, Safari 11+)",
        )
        return
      }

      if (!browserSupport.https) {
        updateStep(
          "browser-check",
          "warning",
          "Not using HTTPS - camera may be blocked",
          browserSupport,
          "Use HTTPS or localhost for camera access",
        )
      } else {
        updateStep("browser-check", "success", "Browser supports all required features", browserSupport)
      }

      // Step 2: Permissions Check
      console.log("🔍 Step 2: Permissions check")
      setCurrentStep(1)
      await delay(300)

      let permissionState = "unknown"
      try {
        if (navigator.permissions) {
          const permission = await navigator.permissions.query({ name: "camera" as PermissionName })
          permissionState = permission.state
        }
      } catch (e) {
        console.log("Permissions API not available")
      }

      updateStep("permissions", "success", `Permission state: ${permissionState}`, { permissionState })

      // Step 3: Stream Creation
      console.log("🔍 Step 3: Creating media stream")
      setCurrentStep(2)

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

        const streamDetails = {
          id: stream.id,
          active: stream.active,
          tracks: stream.getTracks().map((track) => ({
            kind: track.kind,
            label: track.label,
            enabled: track.enabled,
            readyState: track.readyState,
            settings: track.getSettings?.(),
          })),
        }

        setStreamInfo(streamDetails)
        updateStep(
          "stream-creation",
          "success",
          `Stream created with ${stream.getTracks().length} tracks`,
          streamDetails,
        )
      } catch (error: any) {
        updateStep(
          "stream-creation",
          "error",
          `Failed to create stream: ${error.message}`,
          { error: error.name, message: error.message },
          "Check camera permissions and ensure no other app is using the camera",
        )
        return
      }

      // Step 4: Video Element Validation
      console.log("🔍 Step 4: Video element validation")
      setCurrentStep(3)
      await delay(300)

      const video = videoRef.current
      if (!video) {
        updateStep(
          "video-element",
          "error",
          "Video element not found",
          null,
          "Ensure video element is properly rendered",
        )
        return
      }

      const videoElementInfo = {
        exists: !!video,
        tagName: video.tagName,
        readyState: video.readyState,
        networkState: video.networkState,
        currentSrc: video.currentSrc,
        src: video.src,
        srcObject: !!video.srcObject,
        dimensions: {
          width: video.width,
          height: video.height,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          clientWidth: video.clientWidth,
          clientHeight: video.clientHeight,
          offsetWidth: video.offsetWidth,
          offsetHeight: video.offsetHeight,
        },
        computed: window.getComputedStyle(video),
      }

      updateStep("video-element", "success", "Video element found and accessible", videoElementInfo)

      // Step 5: Stream Assignment
      console.log("🔍 Step 5: Assigning stream to video")
      setCurrentStep(4)
      await delay(300)

      try {
        video.srcObject = stream
        console.log("✅ Stream assigned to video.srcObject")

        // Wait a moment for assignment to take effect
        await delay(500)

        if (!video.srcObject) {
          throw new Error("srcObject assignment failed")
        }

        updateStep("stream-assignment", "success", "Stream successfully assigned to video element")
      } catch (error: any) {
        updateStep(
          "stream-assignment",
          "error",
          `Stream assignment failed: ${error.message}`,
          { error },
          "Try using video.src with URL.createObjectURL(stream) as fallback",
        )
        return
      }

      // Step 6: Video Attributes Configuration
      console.log("🔍 Step 6: Configuring video attributes")
      setCurrentStep(5)
      await delay(300)

      // Configure essential video attributes
      video.autoplay = true
      video.playsInline = true
      video.muted = true
      video.controls = false
      video.crossOrigin = "anonymous"

      const attributeCheck = {
        autoplay: video.autoplay,
        playsInline: video.playsInline,
        muted: video.muted,
        controls: video.controls,
        crossOrigin: video.crossOrigin,
        loop: video.loop,
        preload: video.preload,
      }

      updateStep("video-attributes", "success", "Video attributes configured correctly", attributeCheck)

      // Step 7: CSS & Layout Check
      console.log("🔍 Step 7: CSS and layout check")
      setCurrentStep(6)
      await delay(300)

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
        clipPath: computedStyle.clipPath,
        mask: computedStyle.mask,
      }

      const layoutIssues = []
      if (computedStyle.display === "none") layoutIssues.push("display: none")
      if (computedStyle.visibility === "hidden") layoutIssues.push("visibility: hidden")
      if (computedStyle.opacity === "0") layoutIssues.push("opacity: 0")
      if (computedStyle.width === "0px") layoutIssues.push("width: 0")
      if (computedStyle.height === "0px") layoutIssues.push("height: 0")

      if (layoutIssues.length > 0) {
        updateStep(
          "css-layout",
          "error",
          `Layout issues found: ${layoutIssues.join(", ")}`,
          layoutInfo,
          "Fix CSS properties that hide the video element",
        )
        return
      }

      updateStep("css-layout", "success", "No layout issues detected", layoutInfo)

      // Step 8: Video Playback
      console.log("🔍 Step 8: Starting video playback")
      setCurrentStep(7)

      try {
        // Wait for metadata to load
        await new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error("Metadata load timeout")), 10000)

          const onLoadedMetadata = () => {
            console.log("📊 Video metadata loaded")
            video.removeEventListener("loadedmetadata", onLoadedMetadata)
            clearTimeout(timeout)
            resolve()
          }

          if (video.readyState >= 1) {
            clearTimeout(timeout)
            resolve()
          } else {
            video.addEventListener("loadedmetadata", onLoadedMetadata)
          }
        })

        // Start playback
        await video.play()
        console.log("▶️ Video.play() succeeded")

        // Wait for playback to stabilize
        await delay(1000)

        const playbackInfo = {
          paused: video.paused,
          currentTime: video.currentTime,
          duration: video.duration,
          readyState: video.readyState,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
          playbackRate: video.playbackRate,
        }

        setVideoMetrics(playbackInfo)

        if (video.paused) {
          updateStep(
            "video-playback",
            "error",
            "Video is paused after play() call",
            playbackInfo,
            "Check autoplay policies or try user interaction",
          )
        } else {
          updateStep("video-playback", "success", "Video is playing successfully", playbackInfo)
        }
      } catch (error: any) {
        updateStep(
          "video-playback",
          "error",
          `Playback failed: ${error.message}`,
          { error },
          "Check autoplay policies or ensure user interaction",
        )
        return
      }

      // Step 9: Visual Content Verification
      console.log("🔍 Step 9: Visual content verification")
      setCurrentStep(8)
      await delay(500)

      const visualCheck = await verifyVisualContent(video)

      if (visualCheck.hasContent) {
        updateStep("visual-verification", "success", "Video is displaying visual content", visualCheck)
        setVideoVisible(true)
      } else {
        updateStep(
          "visual-verification",
          "error",
          "Video appears to be black or empty",
          visualCheck,
          "Check if another app is using the camera or if camera is covered",
        )
      }

      // Step 10: Canvas Capture Test
      console.log("🔍 Step 10: Canvas capture test")
      setCurrentStep(9)
      await delay(300)

      const canvasTest = await testCanvasCapture(video)

      if (canvasTest.success) {
        updateStep("canvas-capture", "success", "Canvas can capture video frames", canvasTest)
      } else {
        updateStep("canvas-capture", "error", "Canvas capture failed", canvasTest, "Check CORS settings")
      }

      console.log("✅ Diagnostics complete!")
    } catch (error: any) {
      console.error("❌ Diagnostics failed:", error)
      updateStep("browser-check", "error", `Diagnostics failed: ${error.message}`, { error })
    } finally {
      setIsRunning(false)
    }
  }

  // Verify visual content in video
  const verifyVisualContent = async (video: HTMLVideoElement): Promise<any> => {
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

          if (brightness > 5) {
            nonBlackPixels++
          }

          // Check for color variation
          const variation = Math.abs(r - g) + Math.abs(g - b) + Math.abs(b - r)
          colorVariation += variation
        }

        const totalPixels = data.length / 4
        const avgBrightness = totalBrightness / totalPixels
        const nonBlackPercentage = (nonBlackPixels / totalPixels) * 100
        const avgColorVariation = colorVariation / totalPixels

        const hasContent = avgBrightness > 10 && nonBlackPercentage > 5

        resolve({
          hasContent,
          avgBrightness,
          nonBlackPercentage,
          avgColorVariation,
          totalPixels,
          canvasSize: { width: canvas.width, height: canvas.height },
          samplePixels: {
            topLeft: [data[0], data[1], data[2]],
            center: [
              data[Math.floor(data.length / 2)],
              data[Math.floor(data.length / 2) + 1],
              data[Math.floor(data.length / 2) + 2],
            ],
            bottomRight: [data[data.length - 4], data[data.length - 3], data[data.length - 2]],
          },
        })
      } catch (error: any) {
        resolve({ hasContent: false, error: error.message })
      }
    })
  }

  // Test canvas capture
  const testCanvasCapture = async (video: HTMLVideoElement): Promise<any> => {
    const canvas = canvasRef.current
    if (!canvas) return { success: false, error: "Canvas element not found" }

    const ctx = canvas.getContext("2d")
    if (!ctx) return { success: false, error: "Cannot get canvas context" }

    try {
      canvas.width = video.videoWidth || 320
      canvas.height = video.videoHeight || 240

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Try to export as data URL
      const dataURL = canvas.toDataURL("image/png")

      return {
        success: true,
        canvasSize: { width: canvas.width, height: canvas.height },
        dataURLLength: dataURL.length,
        hasData: dataURL.length > 1000, // Basic check for actual image data
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Cleanup function
  const cleanup = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setSteps([])
    setStreamInfo({})
    setVideoMetrics({})
    setVideoVisible(false)
  }

  // Helper function for delays
  const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  // Status icon component
  const StatusIcon = ({ status }: { status: DiagnosticStep["status"] }) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <div className="h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Camera className="h-6 w-6" />
            Camera Display Debugger
          </h2>
          <div className="flex gap-2">
            <Button onClick={runDiagnostics} disabled={isRunning} size="lg">
              {isRunning ? "Running Diagnostics..." : "Start Diagnostics"}
            </Button>
            <Button onClick={cleanup} variant="outline" size="lg">
              Cleanup
            </Button>
          </div>
        </div>

        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This tool will systematically check why your camera isn't displaying any image. It will test each step of
            the video setup process and identify exactly where the problem occurs.
          </AlertDescription>
        </Alert>
      </Card>

      {/* Video Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold">Live Camera Feed</h3>
            <div className="flex items-center gap-2">
              {videoVisible ? (
                <Badge className="bg-green-600">
                  <Eye className="h-3 w-3 mr-1" />
                  Visible
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <EyeOff className="h-3 w-3 mr-1" />
                  Not Visible
                </Badge>
              )}
            </div>
          </div>

          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border-2 border-gray-300">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
              onLoadedMetadata={() => console.log("📺 Metadata loaded")}
              onCanPlay={() => console.log("📺 Can play")}
              onPlaying={() => console.log("📺 Playing")}
              onError={(e) => console.error("📺 Video error:", e)}
            />

            {/* Status overlay */}
            <div className="absolute top-2 left-2 space-y-1">
              {streamRef.current && <Badge className="bg-blue-600">Stream Active</Badge>}
              {videoRef.current && !videoRef.current.paused && <Badge className="bg-green-600">Playing</Badge>}
            </div>

            {/* Progress indicator */}
            {isRunning && (
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto mb-2"></div>
                  <p>
                    Step {currentStep + 1} of {steps.length}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Video metrics */}
          {Object.keys(videoMetrics).length > 0 && (
            <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
              <h4 className="font-medium mb-2">Video Metrics:</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  Size: {videoMetrics.videoWidth}×{videoMetrics.videoHeight}
                </div>
                <div>Ready State: {videoMetrics.readyState}</div>
                <div>Current Time: {videoMetrics.currentTime?.toFixed(2)}s</div>
                <div>Paused: {videoMetrics.paused ? "Yes" : "No"}</div>
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
            This canvas should mirror the video content if everything is working correctly.
          </p>
        </Card>
      </div>

      {/* Diagnostic Steps */}
      {steps.length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Diagnostic Results</h3>
          <div className="space-y-4">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-start gap-4 p-4 rounded-lg border ${
                  index === currentStep && isRunning
                    ? "border-blue-300 bg-blue-50"
                    : step.status === "error"
                      ? "border-red-300 bg-red-50"
                      : step.status === "warning"
                        ? "border-yellow-300 bg-yellow-50"
                        : step.status === "success"
                          ? "border-green-300 bg-green-50"
                          : "border-gray-300 bg-gray-50"
                }`}
              >
                <div className="flex-shrink-0 mt-1">
                  <StatusIcon status={step.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium">
                      {index + 1}. {step.name}
                    </h4>
                    <Badge
                      variant={
                        step.status === "success"
                          ? "default"
                          : step.status === "error"
                            ? "destructive"
                            : step.status === "warning"
                              ? "secondary"
                              : "outline"
                      }
                    >
                      {step.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{step.message}</p>

                  {step.fix && (
                    <div className="p-2 bg-blue-100 border border-blue-200 rounded text-sm text-blue-800">
                      <strong>Fix:</strong> {step.fix}
                    </div>
                  )}

                  {step.details && (
                    <details className="mt-2">
                      <summary className="text-sm text-blue-600 cursor-pointer hover:text-blue-800">
                        Show Technical Details
                      </summary>
                      <pre className="text-xs bg-white p-3 rounded mt-2 overflow-auto max-h-40 border">
                        {JSON.stringify(step.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Stream Information */}
      {Object.keys(streamInfo).length > 0 && (
        <Card className="p-6">
          <h3 className="text-xl font-semibold mb-4">Stream Information</h3>
          <div className="space-y-3">
            <div>
              <strong>Stream ID:</strong> {streamInfo.id}
            </div>
            <div>
              <strong>Active:</strong> {streamInfo.active ? "Yes" : "No"}
            </div>
            <div>
              <strong>Video Tracks:</strong>
              <div className="ml-4 mt-2 space-y-2">
                {streamInfo.tracks?.map((track: any, index: number) => (
                  <div key={index} className="p-3 bg-gray-50 rounded">
                    <div>
                      <strong>Kind:</strong> {track.kind}
                    </div>
                    <div>
                      <strong>Label:</strong> {track.label || "Unknown Device"}
                    </div>
                    <div>
                      <strong>Enabled:</strong> {track.enabled ? "Yes" : "No"}
                    </div>
                    <div>
                      <strong>Ready State:</strong> {track.readyState}
                    </div>
                    {track.settings && (
                      <details className="mt-2">
                        <summary className="text-sm text-blue-600 cursor-pointer">Track Settings</summary>
                        <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto">
                          {JSON.stringify(track.settings, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  )
}
