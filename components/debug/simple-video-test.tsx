"use client"

import { useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Square } from "lucide-react"

export function SimpleVideoTest() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [videoInfo, setVideoInfo] = useState<any>({})

  const startVideo = async () => {
    setError(null)

    try {
      console.log("🎥 Starting simple video test...")

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      })

      console.log("✅ Stream created:", stream)

      const video = videoRef.current
      if (!video) {
        throw new Error("Video element not found")
      }

      console.log("📺 Setting up video element...")

      // Set video properties
      video.srcObject = stream
      video.muted = true
      video.playsInline = true
      video.autoplay = true

      console.log("▶️ Starting video playback...")

      // Wait for metadata and play
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Video load timeout")), 10000)

        video.onloadedmetadata = () => {
          console.log("📊 Video metadata loaded:", {
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            duration: video.duration,
            readyState: video.readyState,
          })

          setVideoInfo({
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
            currentTime: video.currentTime,
            paused: video.paused,
          })

          clearTimeout(timeout)
          resolve()
        }

        video.onerror = (e) => {
          clearTimeout(timeout)
          reject(new Error("Video error occurred"))
        }
      })

      await video.play()
      console.log("✅ Video playing successfully")

      setIsActive(true)

      // Update video info periodically
      const interval = setInterval(() => {
        if (video && !video.paused) {
          setVideoInfo({
            videoWidth: video.videoWidth,
            videoHeight: video.videoHeight,
            readyState: video.readyState,
            currentTime: video.currentTime,
            paused: video.paused,
          })
        }
      }, 1000)

      // Cleanup function
      return () => {
        clearInterval(interval)
        stream.getTracks().forEach((track) => track.stop())
      }
    } catch (err: any) {
      console.error("❌ Video test failed:", err)
      setError(err.message)
      setIsActive(false)
    }
  }

  const stopVideo = () => {
    const video = videoRef.current
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      video.srcObject = null
    }
    setIsActive(false)
    setVideoInfo({})
  }

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Simple Video Test</h3>
      <p className="text-sm text-gray-600 mb-4">
        This is a minimal video test to isolate webcam issues from React/MediaPipe complexity.
      </p>

      <div className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={startVideo} disabled={isActive} className="flex items-center gap-2">
            <Play className="h-4 w-4" />
            Start Video
          </Button>
          <Button onClick={stopVideo} disabled={!isActive} variant="outline" className="flex items-center gap-2">
            <Square className="h-4 w-4" />
            Stop Video
          </Button>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
            <strong>Error:</strong> {error}
          </div>
        )}

        <div className="relative aspect-video bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
            playsInline
            muted
            autoPlay
          />

          {isActive && (
            <div className="absolute top-2 left-2 bg-green-600 text-white px-2 py-1 rounded text-xs">Live</div>
          )}
        </div>

        {Object.keys(videoInfo).length > 0 && (
          <div className="p-3 bg-gray-50 rounded text-sm">
            <h4 className="font-medium mb-2">Video Information:</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                Dimensions: {videoInfo.videoWidth}x{videoInfo.videoHeight}
              </div>
              <div>Ready State: {videoInfo.readyState}</div>
              <div>Current Time: {videoInfo.currentTime?.toFixed(2)}s</div>
              <div>Paused: {videoInfo.paused ? "Yes" : "No"}</div>
            </div>
          </div>
        )}
      </div>
    </Card>
  )
}
