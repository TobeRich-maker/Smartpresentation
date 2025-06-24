"use client"

import { useState } from "react"
import { DebugWebcam } from "@/components/presentation/debug-webcam"
import { SimpleGestureWebcam } from "@/components/presentation/simple-gesture-webcam"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, Bug, TestTube } from "lucide-react"

export default function DebugPage() {
  const [debugWebcamEnabled, setDebugWebcamEnabled] = useState(false)
  const [gestureWebcamEnabled, setGestureWebcamEnabled] = useState(false)
  const [showDebugInfo, setShowDebugInfo] = useState(true)

  const handleGestureDetected = (gesture: any, confidence?: number) => {
    console.log(`🎯 Debug page received gesture: ${gesture} (${confidence})`)
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Camera Debug Page</h1>
        <p className="text-gray-600">Diagnose and fix webcam issues</p>
      </div>

      <Tabs defaultValue="debug" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="debug" className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            Debug Webcam
          </TabsTrigger>
          <TabsTrigger value="gesture" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Gesture Webcam
          </TabsTrigger>
          <TabsTrigger value="info" className="flex items-center gap-2">
            <TestTube className="h-4 w-4" />
            System Info
          </TabsTrigger>
        </TabsList>

        <TabsContent value="debug" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Debug Webcam Component</h2>
              <Button
                onClick={() => setDebugWebcamEnabled(!debugWebcamEnabled)}
                variant={debugWebcamEnabled ? "destructive" : "default"}
              >
                {debugWebcamEnabled ? "Stop Camera" : "Start Camera"}
              </Button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              This component provides detailed debugging information about camera initialization and video stream.
            </p>
            <DebugWebcam
              enabled={debugWebcamEnabled}
              onStreamReady={(stream) => console.log("Stream ready:", stream)}
              onVideoReady={(video) => console.log("Video ready:", video)}
            />
          </Card>
        </TabsContent>

        <TabsContent value="gesture" className="space-y-4">
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Gesture Webcam Component</h2>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => setShowDebugInfo(!showDebugInfo)}>
                  {showDebugInfo ? "Hide Debug" : "Show Debug"}
                </Button>
                <Button
                  onClick={() => setGestureWebcamEnabled(!gestureWebcamEnabled)}
                  variant={gestureWebcamEnabled ? "destructive" : "default"}
                >
                  {gestureWebcamEnabled ? "Stop Camera" : "Start Camera"}
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              This is your actual gesture webcam component used in the presentation app.
            </p>
            <div className="aspect-video max-w-2xl mx-auto">
              <SimpleGestureWebcam
                enabled={gestureWebcamEnabled}
                onGestureDetected={handleGestureDetected}
                showLandmarks={true}
                showDebugInfo={showDebugInfo}
              />
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="info" className="space-y-4">
          <SystemInfoCard />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function SystemInfoCard() {
  const [systemInfo, setSystemInfo] = useState<any>(null)

  const gatherSystemInfo = async () => {
    const info: any = {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      mediaDevices: !!navigator.mediaDevices,
      getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
      permissions: !!navigator.permissions,
    }

    // Check available media devices
    if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices()
        info.devices = devices.map((device) => ({
          kind: device.kind,
          label: device.label || "Unknown",
          deviceId: device.deviceId ? "Present" : "Missing",
        }))
        info.videoInputs = devices.filter((d) => d.kind === "videoinput").length
        info.audioInputs = devices.filter((d) => d.kind === "audioinput").length
      } catch (error) {
        info.devicesError = error.message
      }
    }

    // Check supported constraints
    if (navigator.mediaDevices && navigator.mediaDevices.getSupportedConstraints) {
      info.supportedConstraints = navigator.mediaDevices.getSupportedConstraints()
    }

    // Check permissions
    if (navigator.permissions) {
      try {
        const cameraPermission = await navigator.permissions.query({ name: "camera" as PermissionName })
        info.cameraPermission = cameraPermission.state
      } catch (error) {
        info.permissionError = error.message
      }
    }

    setSystemInfo(info)
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">System Information</h2>
        <Button onClick={gatherSystemInfo}>Gather Info</Button>
      </div>

      {systemInfo ? (
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Browser Info</h3>
            <div className="text-sm space-y-1 bg-gray-50 p-3 rounded">
              <div>
                <strong>User Agent:</strong> {systemInfo.userAgent}
              </div>
              <div>
                <strong>Platform:</strong> {systemInfo.platform}
              </div>
              <div>
                <strong>Language:</strong> {systemInfo.language}
              </div>
              <div>
                <strong>Online:</strong> {systemInfo.onLine ? "Yes" : "No"}
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Media API Support</h3>
            <div className="text-sm space-y-1 bg-gray-50 p-3 rounded">
              <div>
                <strong>MediaDevices API:</strong> {systemInfo.mediaDevices ? "✅ Supported" : "❌ Not supported"}
              </div>
              <div>
                <strong>getUserMedia:</strong> {systemInfo.getUserMedia ? "✅ Supported" : "❌ Not supported"}
              </div>
              <div>
                <strong>Permissions API:</strong> {systemInfo.permissions ? "✅ Supported" : "❌ Not supported"}
              </div>
            </div>
          </div>

          {systemInfo.devices && (
            <div>
              <h3 className="font-medium mb-2">Available Devices</h3>
              <div className="text-sm space-y-1 bg-gray-50 p-3 rounded">
                <div>
                  <strong>Video Inputs:</strong> {systemInfo.videoInputs}
                </div>
                <div>
                  <strong>Audio Inputs:</strong> {systemInfo.audioInputs}
                </div>
                <div className="mt-2">
                  {systemInfo.devices.map((device: any, index: number) => (
                    <div key={index}>
                      {device.kind}: {device.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {systemInfo.cameraPermission && (
            <div>
              <h3 className="font-medium mb-2">Permissions</h3>
              <div className="text-sm space-y-1 bg-gray-50 p-3 rounded">
                <div>
                  <strong>Camera Permission:</strong> {systemInfo.cameraPermission}
                </div>
              </div>
            </div>
          )}

          {systemInfo.supportedConstraints && (
            <div>
              <h3 className="font-medium mb-2">Supported Constraints</h3>
              <div className="text-sm bg-gray-50 p-3 rounded">
                <div className="grid grid-cols-3 gap-2">
                  {Object.entries(systemInfo.supportedConstraints).map(([key, supported]) => (
                    <div key={key} className={supported ? "text-green-600" : "text-red-600"}>
                      {key}: {supported ? "✅" : "❌"}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="text-gray-500">Click "Gather Info" to collect system information</p>
      )}
    </Card>
  )
}
