"use client"

import { useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Play, Square, RotateCcw } from "lucide-react"

export function MinimalVideoTest() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [status, setStatus] = useState<"idle" | "starting" | "active" | "error">("idle")
  const [error, setError] = useState<string | null>(null)
  const [logs, setLogs] = useState<string[]>([])
  const [videoInfo, setVideoInfo] = useState<any>({})

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs((prev) => [`[${timestamp}] ${message}`, ...prev.slice(0, 19)]) // Keep last 20 logs
    console.log(message)
  }

  const startMinimalTest = async () => {
    setStatus("starting")
    setError(null)
    setLogs([])
    setVideoInfo({})

    addLog("🎬 Starting minimal video test...")

    try {
      // Step 1: Check browser support
      addLog("🔍 Checking browser support...")
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("getUserMedia not supported")
      }
      addLog("✅ Browser supports getUserMedia")

      // Step 2: Get video element
      addLog("📺 Getting video element...")
      const video = videoRef.current
      if (!video) {
        throw new Error("Video element not found")
      }
      addLog("✅ Video element found")

      // Step 3: Request camera
      addLog("📷 Requesting camera access...")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      })
      addLog(`✅ Camera stream obtained (ID: ${stream.id})`)

      // Step 4: Configure video element
      addLog("⚙️ Configuring video element...")
      video.srcObject = stream
      video.autoplay = true
      video.playsInline = true
      video.muted = true
      addLog("✅ Video configured")

      // Step 5: Wait for metadata
      addLog("⏳ Waiting for video metadata...")
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error("Metadata load timeout"))
        }, 10000)

        video.onloadedmetadata = () => {
          clearTimeout(timeout)
          addLog(`📊 Metadata loaded: ${video.videoWidth}x${video.videoHeight}`)

          setVideoInfo({
            width: video.videoWidth,
            height: video.videoHeight,
            readyState: video.readyState,
            currentTime: video.currentTime,
            duration: video.duration,
          })

          resolve()
        }

        video.onerror = (e) => {
          clearTimeout(timeout)
          reject(new Error("Video error occurred"))
        }
      })

      // Step 6: Start playback
      addLog("▶️ Starting video playback...")
      await video.play()
      addLog("✅ Video is playing")

      // Step 7: Verify playback
      await new Promise((resolve) => setTimeout(resolve, 1000))

      if (video.paused) {
        addLog("⚠️ Warning: Video is paused")
      } else {
        addLog("✅ Video is actively playing")
      }

      if (video.videoWidth === 0 || video.videoHeight === 0) {
        addLog("❌ Warning: Video dimensions are 0x0")
      } else {
        addLog(`✅ Video dimensions: ${video.videoWidth}x${video.videoHeight}`)
      }

      setStatus("active")
      addLog("🎉 Minimal test completed successfully!")
    } catch (err: any) {
      addLog(`❌ Test failed: ${err.message}`)
      setError(err.message)
      setStatus("error")
    }
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

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="text-2xl font-bold mb-4">Minimal Video Test</h2>

        <Alert className="mb-4">
          <AlertDescription>
            This is a bare-bones test to isolate camera display issues from React/MediaPipe complexity. If this test
            fails, the problem is with basic camera access. If it succeeds, the issue is in your main application.
          </AlertDescription>
        </Alert>

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
                <div>Ready State: {videoInfo.readyState}</div>
                <div>Current Time: {videoInfo.currentTime?.toFixed(2)}s</div>
                <div>Duration: {videoInfo.duration || "Unknown"}</div>
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
                <div key={index} className="mb-1">
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
          </ul>
        </div>
      </Card>
    </div>
  )
}
