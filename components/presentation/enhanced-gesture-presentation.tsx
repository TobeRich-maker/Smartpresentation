"use client"

import { useState, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ChevronLeft, ChevronRight, Play, Pause, Zap } from "lucide-react"
import { MediaPipeHandsLandmarks } from "@/components/mediapipe/mediapipe-hands-landmarks"
import { useToast } from "@/hooks/use-toast"

const SAMPLE_SLIDES = [
  {
    id: 1,
    title: "Welcome to Smart Presentation",
    content: "MediaPipe Hands landmark detection:",
    bullets: [
      "🤖 Real MediaPipe Hands integration",
      "👋 Live hand landmark tracking",
      "🔴 Red dots show hand landmarks",
      "🟢 Green lines show hand connections",
      "📊 Real-time gesture analysis",
    ],
  },
  {
    id: 2,
    title: "Hand Landmark Detection",
    content: "Advanced computer vision features:",
    bullets: [
      "21 landmarks per hand detected",
      "Up to 2 hands tracked simultaneously",
      "Real-time finger position tracking",
      "Hand orientation detection",
    ],
  },
  {
    id: 3,
    title: "MediaPipe Technology",
    content: "Powered by Google's MediaPipe:",
    bullets: [
      "Machine learning hand detection",
      "Cross-platform compatibility",
      "High-performance processing",
      "Accurate landmark positioning",
    ],
  },
  {
    id: 4,
    title: "Gesture Recognition",
    content: "From landmarks to gestures:",
    bullets: [
      "Finger position analysis",
      "Hand shape recognition",
      "Motion pattern detection",
      "Custom gesture training",
    ],
  },
  {
    id: 5,
    title: "Live Demo Active",
    content: "Hand landmarks now visible!",
    bullets: [
      "✅ MediaPipe Hands loaded",
      "🔴 Red dots = Hand landmarks",
      "🟢 Green lines = Hand structure",
      "👋 Move your hands to test",
    ],
  },
]

export function EnhancedGesturePresentation() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [cameraEnabled, setCameraEnabled] = useState(false)
  const [handsDetected, setHandsDetected] = useState(0)
  const [landmarksCount, setLandmarksCount] = useState(0)
  const [detectionFps, setDetectionFps] = useState(0)

  const { toast } = useToast()

  // Handle MediaPipe results
  const handleMediaPipeResults = useCallback((results: any) => {
    if (!results) return

    // Update detection stats
    setHandsDetected(results.handsCount || 0)
    setLandmarksCount(results.multiHandLandmarks?.reduce((total: number, hand: any[]) => total + hand.length, 0) || 0)
    setDetectionFps(results.fps || 0)

    // Simple gesture detection based on landmarks
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
      // Here you could implement gesture recognition based on landmark positions
      // For example, detect thumbs up, peace sign, etc.

      // Example: Detect if hand is open (all fingers extended)
      const hand = results.multiHandLandmarks[0]
      if (hand && hand.length >= 21) {
        // Simple gesture detection logic could go here
        // This is just a placeholder for actual gesture recognition
      }
    }
  }, [])

  // Handle camera status
  const handleCameraStatus = useCallback(
    (status: "active" | "inactive" | "error", message?: string) => {
      setCameraEnabled(status === "active")

      if (status === "active") {
        toast({
          title: "🤖 MediaPipe Hands Active",
          description: "Hand landmark detection is now running",
          duration: 3000,
        })
      } else if (status === "error") {
        toast({
          title: "❌ Detection Error",
          description: message || "MediaPipe Hands failed to start",
          variant: "destructive",
          duration: 5000,
        })
      }
    },
    [toast],
  )

  // Manual navigation
  const nextSlide = () => {
    if (currentSlide < SAMPLE_SLIDES.length - 1) {
      setCurrentSlide((prev) => prev + 1)
    }
  }

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide((prev) => prev - 1)
    }
  }

  const togglePlay = () => {
    setIsPlaying((prev) => !prev)
  }

  const currentSlideData = SAMPLE_SLIDES[currentSlide]

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Presentation Area */}
          <div className="lg:col-span-2 space-y-4">
            {/* Presentation Header */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-bold text-gray-900">MediaPipe Hands Demo</h1>
                <div className="flex items-center gap-2">
                  <Badge variant={cameraEnabled ? "default" : "secondary"}>
                    {cameraEnabled ? `🤖 MediaPipe Active (${detectionFps} FPS)` : "🤖 MediaPipe Inactive"}
                  </Badge>
                  <Badge variant={isPlaying ? "default" : "secondary"}>{isPlaying ? "▶️ Playing" : "⏸️ Paused"}</Badge>
                </div>
              </div>

              {/* Slide Content */}
              <div className="bg-white rounded-lg p-8 min-h-[400px] shadow-inner">
                <h2 className="text-3xl font-bold text-gray-900 mb-6">{currentSlideData.title}</h2>
                <p className="text-lg text-gray-700 mb-6">{currentSlideData.content}</p>
                <ul className="space-y-3">
                  {currentSlideData.bullets.map((bullet, index) => (
                    <li key={index} className="text-gray-600 flex items-center gap-2">
                      <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Navigation Controls */}
              <div className="flex items-center justify-between mt-6">
                <Button onClick={prevSlide} disabled={currentSlide === 0} variant="outline">
                  <ChevronLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>

                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">
                    Slide {currentSlide + 1} of {SAMPLE_SLIDES.length}
                  </span>
                  <Button onClick={togglePlay} variant="outline" size="sm">
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                </div>

                <Button onClick={nextSlide} disabled={currentSlide === SAMPLE_SLIDES.length - 1}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </Card>

            {/* Detection Status */}
            {cameraEnabled && (
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Badge variant="outline">Detection FPS: {detectionFps}</Badge>
                    <Badge variant="outline">Hands Detected: {handsDetected}</Badge>
                    <Badge variant="outline">Total Landmarks: {landmarksCount}</Badge>
                  </div>
                  <div className="text-sm text-gray-500">
                    {handsDetected > 0 ? "👋 Hands visible with landmarks" : "🤚 Show hands to camera"}
                  </div>
                </div>
              </Card>
            )}
          </div>

          {/* MediaPipe Control Panel */}
          <div className="space-y-4">
            <Card className="p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Zap className="h-5 w-5" />
                MediaPipe Hands
              </h3>

              <Tabs defaultValue="mediapipe" className="w-full">
                <TabsList className="grid w-full grid-cols-1">
                  <TabsTrigger value="mediapipe">Hand Landmarks</TabsTrigger>
                </TabsList>

                <TabsContent value="mediapipe" className="space-y-4">
                  <MediaPipeHandsLandmarks
                    onResults={handleMediaPipeResults}
                    onCameraStatus={handleCameraStatus}
                    showDebugOverlay={true}
                    width={320}
                    height={240}
                  />
                </TabsContent>
              </Tabs>
            </Card>

            {/* Landmark Guide */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3">🔴 Landmark Guide</h4>
              <div className="text-sm space-y-2 text-gray-600">
                <p>
                  <strong>Red dots:</strong> 21 hand landmarks
                </p>
                <p>
                  <strong>Green lines:</strong> Hand structure connections
                </p>
                <p>
                  <strong>Wrist:</strong> Landmark 0 (base point)
                </p>
                <p>
                  <strong>Fingertips:</strong> Landmarks 4, 8, 12, 16, 20
                </p>
                <p>
                  <strong>Palm:</strong> Center landmarks 0, 5, 9, 13, 17
                </p>
              </div>
            </Card>

            {/* Instructions */}
            <Card className="p-4">
              <h4 className="font-semibold mb-3">📋 Instructions</h4>
              <div className="text-sm space-y-2 text-gray-600">
                <p>1. Click "Start Detection" to load MediaPipe</p>
                <p>2. Allow camera permissions</p>
                <p>3. Show your hands to the camera</p>
                <p>4. See red dots appear on your hand landmarks</p>
                <p>5. Green lines connect the landmarks</p>
                <p>6. Try different hand poses and gestures</p>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
