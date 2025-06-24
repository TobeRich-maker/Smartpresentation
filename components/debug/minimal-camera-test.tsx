"use client"

import { useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Play, Square, RotateCcw, Camera } from "lucide-react"

export function MinimalCameraTest() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<"idle" | "starting" | "active" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [videoInfo, setVideoInfo] = useState<any>({})

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = `[${timestamp}] ${message}`
    setLogs((prev) => [logEntry, ...prev.slice(0, 19)])
    console.log(logEntry)
  }

  const runPreflightChecks = async () => {
    addLog("🔍 Running preflight checks...")

    // Check 1: Basic API availability
    const apiCheck = {
      navigator: typeof navigator !== "undefined",
      mediaDevices: !!navigator.mediaDevices,
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      enumerateDevices: !!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices),
      secureContext: window.isSecureContext,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
    }

    addLog(`🌐 Browser APIs: ${JSON.stringify(apiCheck, null, 2)}`)

    // Check 2: Security context
    if (!apiCheck.secureContext && apiCheck.hostname !== "localhost") {
      addLog("🚨 SECURITY ISSUE: Camera requires HTTPS or localhost")
      addLog("   Current URL is not secure - this will block camera access")
      return false
    }

    // Check 3: Permissions API (if available)
    if (navigator.permissions) {
      try {
        const cameraPermission = await navigator.permissions.query({ name: "camera" as PermissionName })
        addLog(`🔐 Camera permission state: ${cameraPermission.state}`)

        if (cameraPermission.state === "denied") {
          addLog("🚨 PERMISSION DENIED: Camera access is blocked")
          addLog("   Go to browser settings and allow camera access for this site")
          return false
        }
      } catch (permError) {
        addLog(`⚠️ Could not check permissions: ${permError.message}`)
      }
    }

    // Check 4: Available media devices
    if (apiCheck.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        const cameras = devices.filter((d) => d.kind === "videoinput")
        addLog(`📱 Available cameras: ${cameras.length}`)

        if (cameras.length === 0) {
          addLog("🚨 NO CAMERAS FOUND: No video input devices detected")
          addLog("   Check if camera is connected and not being used by another app")
          return false
        }

        cameras.forEach((camera, i) => {
          addLog(`   Camera ${i + 1}: ${camera.label || "Unknown"} (${camera.deviceId.substring(0, 8)}...)`)
        })
      } catch (deviceError) {
        addLog(`❌ Device enumeration failed: ${deviceError.message}`)
      }
    }

    addLog("✅ Preflight checks completed")
    return true
  }

  const startMinimalTest = async () => {
    setStatus("starting")
    setError(null)
    setLogs([])
    setVideoInfo({})

    addLog("🎬 Starting minimal camera test...")

    // Run preflight checks first
    const preflightPassed = await runPreflightChecks()
    if (!preflightPassed) {
      setError("Preflight checks failed - see logs for details")
      setStatus("error")
      return
    }

    try {
      // Step 1: Browser support check
      addLog("🔍 Checking browser support...")
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia not supported in this browser")
      }
      addLog("✅ Browser supports getUserMedia")

      // Step 2: Security context check
      if (!window.isSecureContext && window.location.hostname !== "localhost") {
        addLog("⚠️ Warning: Not in secure context (HTTPS required for camera)")
      }

      // Step 3: Get video element
      addLog("📺 Getting video element...")
      const video = videoRef.current
      if (!video) {
        throw new Error("Video element not found")
      }
      addLog("✅ Video element found")

      // Step 4: Request camera with detailed error handling
      addLog("📷 Requesting camera access...")
      try {
        // First, check available devices
        try {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const videoDevices = devices.filter((device) => device.kind === "videoinput")
          addLog(`📱 Found ${videoDevices.length} video input devices`)
          videoDevices.forEach((device, index) => {
            addLog(
              `   Device ${index + 1}: ${device.label || "Unknown Camera"} (${device.deviceId.substring(0, 8)}...)`,
            )
          })

          if (videoDevices.length === 0) {
            throw new Error("No camera devices found")
          }
        } catch (deviceError) {
          addLog(`⚠️ Could not enumerate devices: ${deviceError.message}`)
        }

        // Try different constraint strategies
        let stream: MediaStream | null = null
        const constraintStrategies = [
          {
            name: "Ideal constraints",
            constraints: {
              video: {
                facingMode: "user",
                width: { ideal: 640 },
                height: { ideal: 480 },
              },
              audio: false,
            },
          },
          {
            name: "Basic constraints",
            constraints: {
              video: { facingMode: "user" },
              audio: false,
            },
          },
          {
            name: "Minimal constraints",
            constraints: {
              video: true,
              audio: false,
            },
          },
        ]

        for (const strategy of constraintStrategies) {
          try {
            addLog(`🔄 Trying ${strategy.name}...`)
            stream = await navigator.mediaDevices.getUserMedia(strategy.constraints)
            addLog(`✅ Success with ${strategy.name}`)
            break
          } catch (strategyError: any) {
            addLog(`❌ ${strategy.name} failed: ${strategyError.name} - ${strategyError.message}`)

            // Log specific error details
            if (strategyError.constraint) {
              addLog(`   Constraint that failed: ${strategyError.constraint}`)
            }
          }
        }

        if (!stream) {
          throw new Error("All constraint strategies failed")
        }

        addLog(`✅ Camera stream obtained (ID: ${stream.id.substring(0, 8)}...)`)
        addLog(`📊 Stream active: ${stream.active}`)
      } catch (err: any) {
        addLog(`❌ Test failed: ${err.message}`)
        setError(err.message)
        setStatus("error")
        return
      }

      // Step 5: Log stream details
      // const stream = await navigator.mediaDevices.getUserMedia({
      //   video: {
      //     facingMode: "user",
      //     width: { ideal: 640 },
      //     height: { ideal: 480 },
      //   },
      //   audio: false,
      // })
      // addLog(`✅ Camera stream obtained (ID: ${stream.id.substring(0, 8)}...)`)

      // Step 5: Log stream details
      if (stream) {
        const tracks = stream.getTracks()
        tracks.forEach((track) => {
          addLog(`📊 Track: ${track.kind} - ${track.label || "Unknown"} (${track.readyState})`)
          const settings = track.getSettings?.()
          if (settings) {
            addLog(`   Settings: ${settings.width}x${settings.height} @ ${settings.frameRate}fps`)
          }
        })
      }

      // Step 6: Configure video element
      addLog("⚙️ Configuring video element...")
      const videoElement = videoRef.current
      if (!videoElement) {
        throw new Error("Video element not found")
      }
      videoElement.srcObject = stream
      videoElement.autoplay = true
      videoElement.playsInline = true
      videoElement.muted = true
      videoElement.controls = false
      addLog("✅ Video configured with stream")

      // Step 7: Wait for metadata with timeout
      addLog("⏳ Waiting for video metadata...")
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Metadata load timeout (10s)"))
        }, 10000)

        const onLoadedMetadata = () => {
          clearTimeout(timeout)
          videoElement.removeEventListener("loadedmetadata", onLoadedMetadata)
          videoElement.removeEventListener("error", onError)

          addLog(`📊 Metadata loaded: ${videoElement.videoWidth}x${videoElement.videoHeight}`)
          addLog(`📊 Ready state: ${videoElement.readyState} (${getReadyStateText(videoElement.readyState)})`)

          setVideoInfo({
            width: videoElement.videoWidth,
            height: videoElement.videoHeight,
            readyState: videoElement.readyState,
            readyStateText: getReadyStateText(videoElement.readyState),
            currentTime: videoElement.currentTime,
            duration: videoElement.duration,
            paused: videoElement.paused,
          })

          resolve()
        }

        const onError = (e: any) => {
          clearTimeout(timeout)
          videoElement.removeEventListener("loadedmetadata", onLoadedMetadata)
          videoElement.removeEventListener("error", onError)
          reject(new Error(`Video error: ${e.message || "Unknown error"}`))
        }

        if (videoElement.readyState >= 1) {
          onLoadedMetadata()
        } else {
          videoElement.addEventListener("loadedmetadata", onLoadedMetadata)
          videoElement.addEventListener("error", onError)
        }
      })

      // Step 8: Start playback
      addLog("▶️ Starting video playback...")
      try {
        await videoElement.play()
        addLog("✅ Video.play() succeeded")
      } catch (playError: any) {
        addLog(`⚠️ Video.play() failed: ${playError.message}`)
        if (playError.name === "NotAllowedError") {
          addLog("   This is often due to browser autoplay policies")
        }
      }

      // Step 9: Verify playback after delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      const finalCheck = {
        paused: videoElement.paused,
        currentTime: videoElement.currentTime,
        videoWidth: videoElement.videoWidth,
        videoHeight: videoElement.videoHeight,
        readyState: videoElement.readyState,
      }

      addLog(
        `🔍 Final check: ${videoElement.paused ? "PAUSED" : "PLAYING"} | Time: ${videoElement.currentTime.toFixed(2)}s`,
      )

      if (videoElement.paused) {
        addLog("⚠️ Warning: Video is paused (may be due to autoplay restrictions)")
      } else {
        addLog("✅ Video is actively playing")
      }

      if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
        addLog("❌ Warning: Video dimensions are 0x0 - no video data")
      } else {
        addLog(`✅ Video dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}`)
      }

      // Step 10: Test visual content
      addLog("🎨 Testing visual content...")
      const hasContent = await testVisualContent(videoElement)
      if (hasContent) {
        addLog("✅ Video appears to have visual content")
      } else {
        addLog("⚠️ Video appears to be black or empty")
      }

      setStatus("active")
      addLog("🎉 Minimal test completed!")
    } catch (err: any) {
      addLog(`❌ Test failed: ${err.message}`)
      setError(err.message)
      setStatus("error")
    }
  }

  const testVisualContent = async (video: HTMLVideoElement): Promise<boolean> => {
    try {
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) return false

      canvas.width = video.videoWidth || 320
      canvas.height = video.videoHeight || 240

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      let totalBrightness = 0
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        totalBrightness += (r + g + b) / 3
      }

      const avgBrightness = totalBrightness / (data.length / 4)
      addLog(`🎨 Average brightness: ${Math.round(avgBrightness)}/255`)

      return avgBrightness > 10 // Consider content if average brightness > 10
    } catch (error) {
      addLog(`❌ Visual content test failed: ${error}`)
      return false
    }
  }

  const getReadyStateText = (state: number): string => {
    const states = ["HAVE_NOTHING", "HAVE_METADATA", "HAVE_CURRENT_DATA", "HAVE_FUTURE_DATA", "HAVE_ENOUGH_DATA"]
    return states[state] || "UNKNOWN"
  }

  const stopTest = () => {
    addLog("🛑 Stopping test...")

    const video = videoRef.current
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream
      stream.getTracks().forEach((track) => {
        track.stop()
        addLog(`🔌 Stopped ${track.kind} track`)
      })
      video.srcObject = null
    }

    setStatus("idle")
    setVideoInfo({})
    addLog("✅ Test stopped and cleaned up")
  }

  const resetTest = () => {
    stopTest()
    setLogs([])
    setError(null)
  }

  const QuickDiagnostic = () => {
    const [diagnosticResult, setDiagnosticResult] = useState<string>("")

    const runQuickDiagnostic = async () => {
      let result = "🔍 QUICK DIAGNOSTIC RESULTS:\n\n"

      // Check 1: Browser
      result += `Browser: ${navigator.userAgent}\n`
      result += `Protocol: ${window.location.protocol}\n`
      result += `Hostname: ${window.location.hostname}\n`
      result += `Secure Context: ${window.isSecureContext}\n\n`

      // Check 2: APIs
      result += `getUserMedia: ${!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)}\n`
      result += `enumerateDevices: ${!!(navigator.mediaDevices && navigator.mediaDevices.enumerateDevices)}\n\n`

      // Check 3: Permissions
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: "camera" as PermissionName })
          result += `Camera Permission: ${permission.state}\n`
        } catch (e) {
          result += `Camera Permission: Could not check\n`
        }
      } else {
        result += `Camera Permission: Permissions API not available\n`
      }

      // Check 4: Devices
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const cameras = devices.filter((d) => d.kind === "videoinput")
          result += `\nCameras Found: ${cameras.length}\n`
          cameras.forEach((cam, i) => {
            result += `  ${i + 1}. ${cam.label || "Unknown Camera"}\n`
          })
        } catch (e) {
          result += `\nCameras Found: Error checking devices\n`
        }
      }

      // Check 5: Common issues
      result += `\n🚨 COMMON ISSUES TO CHECK:\n`
      if (!window.isSecureContext && window.location.hostname !== "localhost") {
        result += `❌ NOT SECURE: Use HTTPS or localhost\n`
      }
      if (navigator.userAgent.includes("Chrome") && window.location.protocol === "http:") {
        result += `❌ CHROME HTTP: Chrome blocks camera on HTTP (except localhost)\n`
      }

      setDiagnosticResult(result)
    }

    return (
      <div className="mb-4">
        <Button onClick={runQuickDiagnostic} variant="outline" size="sm">
          🔍 Quick Diagnostic
        </Button>
        {diagnosticResult && (
          <pre className="mt-2 p-3 bg-gray-100 rounded text-xs overflow-auto max-h-40 whitespace-pre-wrap">
            {diagnosticResult}
          </pre>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <Camera className="h-6 w-6" />
          Minimal Camera Test
        </h2>

        <Alert className="mb-4">
          <AlertDescription>
            This is a bare-bones test to isolate camera issues from React/MediaPipe complexity. If this test fails, the
            problem is with basic camera access.
          </AlertDescription>
        </Alert>

        <QuickDiagnostic />

        <div className="flex gap-2 mb-4">
          <Button
            onClick={startMinimalTest}
            disabled={status === "starting" || status === "active"}
            className="flex items-center gap-2"
          >
            <Play className="h-4 w-4" />
            Start Test
          </Button>

          <Button
            onClick={stopTest}
            disabled={status !== "active"}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Square className="h-4 w-4" />
            Stop Test
          </Button>

          <Button onClick={resetTest} variant="outline" className="flex items-center gap-2">
            <RotateCcw className="h-4 w-4" />
            Reset
          </Button>
        </div>

        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Video Display */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-3">Video Output</h3>

          <div className="relative aspect-video bg-black rounded-lg overflow-hidden border-2 border-gray-300">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              style={{ transform: "scaleX(-1)" }}
              playsInline
              muted
              autoPlay
            />

            {/* Status indicator */}
            <div className="absolute top-2 left-2">
              {status === "active" && (
                <div className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium">LIVE</div>
              )}
              {status === "starting" && (
                <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium">STARTING...</div>
              )}
              {status === "error" && (
                <div className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium">ERROR</div>
              )}
            </div>
          </div>

          {/* Video Info */}
          {Object.keys(videoInfo).length > 0 && (
            <div className="mt-3 p-3 bg-gray-50 rounded text-sm">
              <h4 className="font-medium mb-2">Video Information:</h4>
              <div className="space-y-1">
                <div>
                  Dimensions: {videoInfo.width}×{videoInfo.height}
                </div>
                <div>
                  Ready State: {videoInfo.readyState} ({videoInfo.readyStateText})
                </div>
                <div>Current Time: {videoInfo.currentTime?.toFixed(2)}s</div>
                <div>Paused: {videoInfo.paused ? "Yes" : "No"}</div>
                <div>Duration: {videoInfo.duration || "Live Stream"}</div>
              </div>
            </div>
          )}
        </Card>

        {/* Logs */}
        <Card className="p-4">
          <h3 className="text-lg font-semibold mb-3">Test Logs</h3>

          <div className="bg-black text-green-400 p-3 rounded font-mono text-xs h-80 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Click "Start Test" to begin.</div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className="mb-1 leading-relaxed">
                  {log}
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Troubleshooting Guide */}
      <Card className="p-6">
        <h3 className="text-xl font-semibold mb-4">Troubleshooting Guide</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-green-700 mb-2">✅ If Minimal Test Works:</h4>
            <ul className="text-sm space-y-1 text-green-600">
              <li>• Camera hardware is working</li>
              <li>• Browser permissions are correct</li>
              <li>• Basic video display is functional</li>
              <li>• Issue is in your React/MediaPipe code</li>
              <li>• Check component lifecycle and refs</li>
              <li>• Look for CSS/styling conflicts</li>
              <li>• Verify MediaPipe initialization timing</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-red-700 mb-2">❌ If Minimal Test Fails:</h4>
            <ul className="text-sm space-y-1 text-red-600">
              <li>• Camera permissions denied</li>
              <li>• Another app is using the camera</li>
              <li>• Camera hardware issues</li>
              <li>• Browser doesn't support getUserMedia</li>
              <li>• Not using HTTPS (except localhost)</li>
              <li>• Browser security settings blocking camera</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded">
          <h4 className="font-semibold text-blue-800 mb-2">Common Fixes:</h4>
          <ul className="text-sm space-y-1 text-blue-700">
            <li>
              • <strong>Black screen:</strong> Check if another app is using the camera
            </li>
            <li>
              • <strong>Permission denied:</strong> Allow camera access in browser settings
            </li>
            <li>
              • <strong>Not secure context:</strong> Use HTTPS or localhost
            </li>
            <li>
              • <strong>Video not playing:</strong> Ensure autoplay, muted, and playsInline are set
            </li>
            <li>
              • <strong>Zero dimensions:</strong> Wait for loadedmetadata event
            </li>
            <li>
              • <strong>Mobile issues:</strong> Ensure playsInline=true for iOS
            </li>
            <li>
              • <strong>MediaPipe issues:</strong> Initialize MediaPipe only after video is playing
            </li>
          </ul>
        </div>
      </Card>
    </div>
  )
}
