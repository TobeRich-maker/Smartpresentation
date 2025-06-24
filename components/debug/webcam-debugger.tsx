"use client"

import { useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertCircle, Camera } from "lucide-react"

interface DebugStep {
  id: string
  name: string
  status: "pending" | "success" | "error" | "warning"
  message: string
  details?: any
}

export function WebcamDebugger() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [debugSteps, setDebugSteps] = useState<DebugStep[]>([])
  const [isDebugging, setIsDebugging] = useState(false)
  const [videoStats, setVideoStats] = useState<any>({})
  const [streamStats, setStreamStats] = useState<any>({})

  // Initialize debug steps
  const initializeDebugSteps = () => {
    const steps: DebugStep[] = [
      {
        id: "browser-support",
        name: "Browser Support Check",
        status: "pending",
        message: "Checking browser capabilities...",
      },
      { id: "permissions", name: "Camera Permissions", status: "pending", message: "Requesting camera access..." },
      { id: "stream-creation", name: "Stream Creation", status: "pending", message: "Creating media stream..." },
      { id: "video-element", name: "Video Element Setup", status: "pending", message: "Setting up video element..." },
      {
        id: "stream-assignment",
        name: "Stream Assignment",
        status: "pending",
        message: "Assigning stream to video...",
      },
      { id: "video-properties", name: "Video Properties", status: "pending", message: "Checking video properties..." },
      { id: "video-playback", name: "Video Playback", status: "pending", message: "Starting video playback..." },
      { id: "video-rendering", name: "Video Rendering", status: "pending", message: "Verifying video is rendering..." },
      { id: "canvas-test", name: "Canvas Capture Test", status: "pending", message: "Testing canvas capture..." },
    ]
    setDebugSteps(steps)
  }

  // Update debug step
  const updateDebugStep = (id: string, status: DebugStep["status"], message: string, details?: any) => {
    setDebugSteps((prev) => prev.map((step) => (step.id === id ? { ...step, status, message, details } : step)))
  }

  // Comprehensive debugging function
  const runDiagnostics = async () => {
    setIsDebugging(true)
    initializeDebugSteps()

    try {
      // Step 1: Browser Support Check
      console.log("🔍 Step 1: Checking browser support...")
      await new Promise((resolve) => setTimeout(resolve, 500))

      const browserSupport = {
        getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
        mediaDevices: !!navigator.mediaDevices,
        webRTC: !!(window.RTCPeerConnection || window.webkitRTCPeerConnection),
        canvas: !!document.createElement("canvas").getContext,
        videoElement: !!document.createElement("video"),
      }

      if (!browserSupport.getUserMedia) {
        updateDebugStep("browser-support", "error", "getUserMedia not supported", browserSupport)
        return
      }

      updateDebugStep("browser-support", "success", "Browser supports all required APIs", browserSupport)

      // Step 2: Check Permissions
      console.log("🔍 Step 2: Checking permissions...")
      let permissionStatus = "unknown"

      try {
        if (navigator.permissions) {
          const permission = await navigator.permissions.query({ name: "camera" as PermissionName })
          permissionStatus = permission.state
        }
      } catch (e) {
        console.log("Permission API not available")
      }

      updateDebugStep("permissions", "success", `Permission status: ${permissionStatus}`, { permissionStatus })

      // Step 3: Create Stream
      console.log("🔍 Step 3: Creating media stream...")

      const constraints = {
        video: {
          width: { ideal: 640, min: 320, max: 1920 },
          height: { ideal: 480, min: 240, max: 1080 },
          facingMode: "user",
          frameRate: { ideal: 30, min: 10, max: 60 },
        },
        audio: false,
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
        streamRef.current = stream
      } catch (error: any) {
        updateDebugStep("stream-creation", "error", `Failed to create stream: ${error.message}`, { error, constraints })
        return
      }

      const streamInfo = {
        id: stream.id,
        active: stream.active,
        tracks: stream.getTracks().map((track) => ({
          kind: track.kind,
          label: track.label,
          enabled: track.enabled,
          readyState: track.readyState,
          settings: track.getSettings?.() || {},
          constraints: track.getConstraints?.() || {},
          capabilities: track.getCapabilities?.() || {},
        })),
      }

      setStreamStats(streamInfo)
      updateDebugStep(
        "stream-creation",
        "success",
        `Stream created with ${stream.getTracks().length} tracks`,
        streamInfo,
      )

      // Step 4: Video Element Setup
      console.log("🔍 Step 4: Setting up video element...")
      await new Promise((resolve) => setTimeout(resolve, 200))

      const video = videoRef.current
      if (!video) {
        updateDebugStep("video-element", "error", "Video element not found in DOM", null)
        return
      }

      const videoElementInfo = {
        tagName: video.tagName,
        readyState: video.readyState,
        networkState: video.networkState,
        currentTime: video.currentTime,
        duration: video.duration,
        paused: video.paused,
        muted: video.muted,
        autoplay: video.autoplay,
        playsInline: video.playsInline,
        controls: video.controls,
        width: video.width,
        height: video.height,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        clientWidth: video.clientWidth,
        clientHeight: video.clientHeight,
        offsetWidth: video.offsetWidth,
        offsetHeight: video.offsetHeight,
        style: {
          width: video.style.width,
          height: video.style.height,
          display: video.style.display,
          visibility: video.style.visibility,
          opacity: video.style.opacity,
          transform: video.style.transform,
        },
      }

      updateDebugStep("video-element", "success", "Video element found and accessible", videoElementInfo)

      // Step 5: Stream Assignment
      console.log("🔍 Step 5: Assigning stream to video...")

      try {
        video.srcObject = stream
        console.log("✅ Stream assigned to video.srcObject")
      } catch (error: any) {
        updateDebugStep("stream-assignment", "error", `Failed to assign stream: ${error.message}`, { error })
        return
      }

      updateDebugStep("stream-assignment", "success", "Stream successfully assigned to video element", null)

      // Step 6: Video Properties Check
      console.log("🔍 Step 6: Checking video properties...")
      await new Promise((resolve) => setTimeout(resolve, 500))

      const updatedVideoInfo = {
        readyState: video.readyState,
        readyStateText: getReadyStateText(video.readyState),
        networkState: video.networkState,
        networkStateText: getNetworkStateText(video.networkState),
        currentTime: video.currentTime,
        duration: video.duration,
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        srcObject: !!video.srcObject,
        hasStream: !!(video.srcObject as MediaStream)?.active,
      }

      setVideoStats(updatedVideoInfo)

      if (video.readyState < 2) {
        updateDebugStep("video-properties", "warning", "Video metadata not yet loaded", updatedVideoInfo)
      } else {
        updateDebugStep("video-properties", "success", "Video properties look good", updatedVideoInfo)
      }

      // Step 7: Video Playback
      console.log("🔍 Step 7: Starting video playback...")

      try {
        await video.play()
        console.log("✅ Video.play() succeeded")

        // Wait a bit for playback to stabilize
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const playbackInfo = {
          paused: video.paused,
          currentTime: video.currentTime,
          readyState: video.readyState,
          videoWidth: video.videoWidth,
          videoHeight: video.videoHeight,
        }

        if (video.paused) {
          updateDebugStep("video-playback", "error", "Video is paused after play() call", playbackInfo)
        } else {
          updateDebugStep("video-playback", "success", "Video is playing", playbackInfo)
        }
      } catch (error: any) {
        updateDebugStep("video-playback", "error", `Video.play() failed: ${error.message}`, { error })
        return
      }

      // Step 8: Video Rendering Check
      console.log("🔍 Step 8: Checking video rendering...")

      const renderingCheck = await checkVideoRendering(video)

      if (renderingCheck.isRendering) {
        updateDebugStep("video-rendering", "success", "Video is rendering content", renderingCheck)
      } else {
        updateDebugStep("video-rendering", "error", "Video appears to be black/empty", renderingCheck)
      }

      // Step 9: Canvas Capture Test
      console.log("🔍 Step 9: Testing canvas capture...")

      const canvasTest = await testCanvasCapture(video)

      if (canvasTest.success) {
        updateDebugStep("canvas-test", "success", "Canvas can capture video frames", canvasTest)
      } else {
        updateDebugStep("canvas-test", "error", "Canvas capture failed", canvasTest)
      }
    } catch (error: any) {
      console.error("❌ Diagnostic error:", error)
      updateDebugStep("browser-support", "error", `Diagnostic failed: ${error.message}`, { error })
    } finally {
      setIsDebugging(false)
    }
  }

  // Check if video is actually rendering content
  const checkVideoRendering = async (video: HTMLVideoElement): Promise<any> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        resolve({ isRendering: false, error: "Cannot create canvas context" })
        return
      }

      canvas.width = video.videoWidth || 320
      canvas.height = video.videoHeight || 240

      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const data = imageData.data

        // Check if image has any non-black pixels
        let hasContent = false
        let totalBrightness = 0

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const brightness = (r + g + b) / 3

          totalBrightness += brightness

          if (brightness > 10) {
            // Allow for some noise
            hasContent = true
          }
        }

        const avgBrightness = totalBrightness / (data.length / 4)

        resolve({
          isRendering: hasContent,
          avgBrightness,
          canvasSize: { width: canvas.width, height: canvas.height },
          videoSize: { width: video.videoWidth, height: video.videoHeight },
          samplePixels: {
            topLeft: [data[0], data[1], data[2]],
            center: [
              data[Math.floor(data.length / 2)],
              data[Math.floor(data.length / 2) + 1],
              data[Math.floor(data.length / 2) + 2],
            ],
          },
        })
      } catch (error) {
        resolve({ isRendering: false, error: error.message })
      }
    })
  }

  // Test canvas capture functionality
  const testCanvasCapture = async (video: HTMLVideoElement): Promise<any> => {
    const canvas = canvasRef.current
    if (!canvas) return { success: false, error: "Canvas element not found" }

    const ctx = canvas.getContext("2d")
    if (!ctx) return { success: false, error: "Cannot get canvas context" }

    try {
      canvas.width = video.videoWidth || 320
      canvas.height = video.videoHeight || 240

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      // Try to get image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

      return {
        success: true,
        canvasSize: { width: canvas.width, height: canvas.height },
        imageDataLength: imageData.data.length,
      }
    } catch (error: any) {
      return { success: false, error: error.message }
    }
  }

  // Helper functions
  const getReadyStateText = (state: number): string => {
    const states = ["HAVE_NOTHING", "HAVE_METADATA", "HAVE_CURRENT_DATA", "HAVE_FUTURE_DATA", "HAVE_ENOUGH_DATA"]
    return states[state] || "UNKNOWN"
  }

  const getNetworkStateText = (state: number): string => {
    const states = ["NETWORK_EMPTY", "NETWORK_IDLE", "NETWORK_LOADING", "NETWORK_NO_SOURCE"]
    return states[state] || "UNKNOWN"
  }

  // Stop debugging and cleanup
  const stopDebugging = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setDebugSteps([])
    setVideoStats({})
    setStreamStats({})
  }

  // Status icon component
  const StatusIcon = ({ status }: { status: DebugStep["status"] }) => {
    switch (status) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertCircle className="h-4 w-4 text-yellow-500" />
      default:
        return <div className="h-4 w-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Control Panel */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Webcam Debugger
          </h2>
          <div className="flex gap-2">
            <Button onClick={runDiagnostics} disabled={isDebugging}>
              {isDebugging ? "Running Diagnostics..." : "Run Full Diagnostics"}
            </Button>
            <Button onClick={stopDebugging} variant="outline">
              Stop & Cleanup
            </Button>
          </div>
        </div>

        <p className="text-sm text-gray-600 mb-4">
          This tool will systematically check each step of webcam initialization to identify why you're seeing a black
          screen.
        </p>
      </Card>

      {/* Video Display */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-3">Live Video Feed</h3>
          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border-2 border-gray-300">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
              onLoadedMetadata={() => console.log("📺 Video metadata loaded")}
              onLoadedData={() => console.log("📺 Video data loaded")}
              onCanPlay={() => console.log("📺 Video can play")}
              onPlaying={() => console.log("📺 Video is playing")}
              onTimeUpdate={() => console.log("📺 Video time update")}
              onError={(e) => console.error("📺 Video error:", e)}
            />

            {/* Overlay indicators */}
            <div className="absolute top-2 left-2 space-y-1">
              {streamRef.current && (
                <Badge variant="secondary" className="bg-green-600 text-white">
                  Stream Active
                </Badge>
              )}
              {videoRef.current && !videoRef.current.paused && (
                <Badge variant="secondary" className="bg-blue-600 text-white">
                  Playing
                </Badge>
              )}
            </div>
          </div>

          {/* Video Stats */}
          {Object.keys(videoStats).length > 0 && (
            <div className="mt-3 p-3 bg-gray-50 rounded text-xs">
              <h4 className="font-medium mb-2">Video Element Stats:</h4>
              <div className="grid grid-cols-2 gap-2">
                <div>Ready State: {videoStats.readyStateText}</div>
                <div>Network State: {videoStats.networkStateText}</div>
                <div>
                  Video Size: {videoStats.videoWidth}x{videoStats.videoHeight}
                </div>
                <div>Current Time: {videoStats.currentTime?.toFixed(2)}s</div>
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
            This canvas should show the same content as the video if everything is working correctly.
          </p>
        </Card>
      </div>

      {/* Diagnostic Steps */}
      {debugSteps.length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-4">Diagnostic Steps</h3>
          <div className="space-y-3">
            {debugSteps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                <div className="flex-shrink-0 mt-0.5">
                  <StatusIcon status={step.status} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {index + 1}. {step.name}
                    </span>
                    <Badge
                      variant={
                        step.status === "success" ? "default" : step.status === "error" ? "destructive" : "secondary"
                      }
                      className="text-xs"
                    >
                      {step.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{step.message}</p>

                  {step.details && (
                    <details className="mt-2">
                      <summary className="text-xs text-blue-600 cursor-pointer">Show Details</summary>
                      <pre className="text-xs bg-white p-2 rounded mt-1 overflow-auto max-h-32">
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
      {Object.keys(streamStats).length > 0 && (
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-3">Stream Information</h3>
          <div className="space-y-3">
            <div>
              <strong>Stream ID:</strong> {streamStats.id}
            </div>
            <div>
              <strong>Active:</strong> {streamStats.active ? "Yes" : "No"}
            </div>
            <div>
              <strong>Tracks:</strong>
              <div className="ml-4 mt-2 space-y-2">
                {streamStats.tracks?.map((track: any, index: number) => (
                  <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                    <div>
                      <strong>Kind:</strong> {track.kind}
                    </div>
                    <div>
                      <strong>Label:</strong> {track.label || "Unknown"}
                    </div>
                    <div>
                      <strong>Enabled:</strong> {track.enabled ? "Yes" : "No"}
                    </div>
                    <div>
                      <strong>Ready State:</strong> {track.readyState}
                    </div>
                    {track.settings && Object.keys(track.settings).length > 0 && (
                      <details className="mt-1">
                        <summary className="text-xs text-blue-600 cursor-pointer">Settings</summary>
                        <pre className="text-xs bg-white p-1 rounded mt-1">
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

      {/* Quick Fixes */}
      <Card className="p-4 bg-blue-50 border-blue-200">
        <h3 className="text-lg font-semibold mb-3 text-blue-800">Common Fixes</h3>
        <div className="space-y-2 text-sm text-blue-700">
          <div>
            • <strong>Black screen but camera light on:</strong> Check if another app is using the camera
          </div>
          <div>
            • <strong>Video element shows but no content:</strong> Verify video.play() was called and succeeded
          </div>
          <div>
            • <strong>Canvas overlay blocking video:</strong> Check z-index and positioning of overlays
          </div>
          <div>
            • <strong>Video dimensions are 0x0:</strong> Wait for 'loadedmetadata' event before accessing dimensions
          </div>
          <div>
            • <strong>CORS issues:</strong> Set video.crossOrigin = "anonymous" if loading from different domain
          </div>
          <div>
            • <strong>Mobile issues:</strong> Ensure playsInline=true and user interaction triggered play()
          </div>
        </div>
      </Card>
    </div>
  )
}
