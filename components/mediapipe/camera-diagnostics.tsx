"use client"

import { useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, XCircle, AlertTriangle } from "lucide-react"

interface DiagnosticResult {
  test: string
  status: "pass" | "fail" | "warning"
  message: string
  details?: any
}

export function CameraDiagnostics() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<DiagnosticResult[]>([])

  const addResult = (test: string, status: DiagnosticResult["status"], message: string, details?: any) => {
    setResults((prev) => [...prev, { test, status, message, details }])
  }

  const runDiagnostics = async () => {
    setIsRunning(true)
    setResults([])

    try {
      // Test 1: Browser Support
      addResult(
        "Browser Support",
        navigator.mediaDevices && navigator.mediaDevices.getUserMedia ? "pass" : "fail",
        navigator.mediaDevices && navigator.mediaDevices.getUserMedia
          ? "getUserMedia is supported"
          : "getUserMedia is not supported",
      )

      // Test 2: Secure Context
      addResult(
        "Secure Context",
        window.isSecureContext || window.location.hostname === "localhost" ? "pass" : "fail",
        window.isSecureContext || window.location.hostname === "localhost"
          ? "Running in secure context"
          : "Requires HTTPS or localhost",
      )

      // Test 3: Camera Permissions
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: "camera" as PermissionName })
          addResult(
            "Camera Permissions",
            permission.state === "granted" ? "pass" : permission.state === "denied" ? "fail" : "warning",
            `Permission state: ${permission.state}`,
            { state: permission.state },
          )
        } catch (e) {
          addResult("Camera Permissions", "warning", "Could not check permissions", { error: e })
        }
      }

      // Test 4: Available Devices
      if (navigator.mediaDevices.enumerateDevices) {
        try {
          const devices = await navigator.mediaDevices.enumerateDevices()
          const cameras = devices.filter((d) => d.kind === "videoinput")
          addResult("Available Cameras", cameras.length > 0 ? "pass" : "fail", `Found ${cameras.length} camera(s)`, {
            cameras: cameras.map((c) => ({ label: c.label, deviceId: c.deviceId })),
          })
        } catch (e) {
          addResult("Available Cameras", "fail", "Could not enumerate devices", { error: e })
        }
      }

      // Test 5: Camera Access
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "user" },
          audio: false,
        })

        addResult("Camera Access", "pass", "Successfully accessed camera", {
          streamId: stream.id,
          tracks: stream.getTracks().length,
        })

        // Test 6: Video Element
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          video.autoplay = true
          video.playsInline = true
          video.muted = true

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => reject(new Error("Video load timeout")), 5000)

            video.onloadedmetadata = () => {
              clearTimeout(timeout)
              addResult("Video Element", "pass", `Video loaded: ${video.videoWidth}x${video.videoHeight}`, {
                width: video.videoWidth,
                height: video.videoHeight,
                readyState: video.readyState,
              })
              resolve()
            }

            video.onerror = () => {
              clearTimeout(timeout)
              reject(new Error("Video load error"))
            }
          })

          // Test 7: Video Content
          await new Promise((resolve) => setTimeout(resolve, 1000))
          const hasContent = await checkVideoContent(video)
          addResult(
            "Video Content",
            hasContent ? "pass" : "fail",
            hasContent ? "Video showing content" : "Video appears black/empty",
          )

          // Cleanup
          stream.getTracks().forEach((track) => track.stop())
          video.srcObject = null
        } else {
          addResult("Video Element", "fail", "Video element not found")
        }
      } catch (e: any) {
        addResult("Camera Access", "fail", `Camera access failed: ${e.message}`, { error: e })
      }
    } catch (error) {
      addResult("Diagnostics", "fail", `Diagnostics failed: ${error}`)
    } finally {
      setIsRunning(false)
    }
  }

  const checkVideoContent = async (video: HTMLVideoElement): Promise<boolean> => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    if (!ctx) return false

    canvas.width = video.videoWidth || 320
    canvas.height = video.videoHeight || 240

    try {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

      let totalBrightness = 0
      for (let i = 0; i < data.length; i += 4) {
        totalBrightness += (data[i] + data[i + 1] + data[i + 2]) / 3
      }

      const avgBrightness = totalBrightness / (data.length / 4)
      return avgBrightness > 10
    } catch (error) {
      return false
    }
  }

  const StatusIcon = ({ status }: { status: DiagnosticResult["status"] }) => {
    switch (status) {
      case "pass":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "fail":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
  }

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Camera Diagnostics</h3>
          <Button onClick={runDiagnostics} disabled={isRunning}>
            {isRunning ? "Running..." : "Run Diagnostics"}
          </Button>
        </div>

        <div className="aspect-video bg-black rounded-lg mb-4">
          <video ref={videoRef} className="w-full h-full object-cover rounded-lg" playsInline muted autoPlay />
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            {results.map((result, index) => (
              <div key={index} className="flex items-center gap-3 p-2 rounded border">
                <StatusIcon status={result.status} />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{result.test}</span>
                    <Badge
                      variant={
                        result.status === "pass" ? "default" : result.status === "fail" ? "destructive" : "secondary"
                      }
                    >
                      {result.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{result.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
