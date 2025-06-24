"use client"

import { useState, useCallback } from "react"
import { MediaPipeHandsDetector } from "@/components/mediapipe/mediapipe-hands-detector"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"

interface HandLandmark {
  x: number
  y: number
  z: number
}

interface MediaPipeResults {
  multiHandLandmarks?: HandLandmark[][]
  multiHandedness?: any[]
}

export function SmartPresentationWithMediaPipe() {
  const [currentSlide, setCurrentSlide] = useState(0)
  const [cameraStatus, setCameraStatus] = useState<"active" | "inactive" | "error">("inactive")
  const [lastGesture, setLastGesture] = useState<string | null>(null)
  const [handCount, setHandCount] = useState(0)
  const { toast } = useToast()

  const slides = [
    { id: 1, title: "Welcome", content: "Welcome to Smart Presentation with MediaPipe!" },
    { id: 2, title: "Gesture Control", content: "Use hand gestures to navigate slides" },
    { id: 3, title: "Features", content: "Real-time hand tracking and gesture recognition" },
    { id: 4, title: "Thank You", content: "Thanks for watching!" },
  ]

  // Handle MediaPipe results
  const handleMediaPipeResults = useCallback(
    (results: MediaPipeResults) => {
      if (results.multiHandLandmarks) {
        setHandCount(results.multiHandLandmarks.length)

        // Simple gesture detection based on hand landmarks
        for (const landmarks of results.multiHandLandmarks) {
          const gesture = detectGesture(landmarks)
          if (gesture && gesture !== lastGesture) {
            setLastGesture(gesture)
            handleGesture(gesture)
          }
        }
      } else {
        setHandCount(0)
      }
    },
    [lastGesture],
  )

  // Simple gesture detection
  const detectGesture = (landmarks: HandLandmark[]): string | null => {
    if (!landmarks || landmarks.length < 21) return null

    // Get key landmarks
    const wrist = landmarks[0]
    const thumbTip = landmarks[4]
    const indexTip = landmarks[8]
    const middleTip = landmarks[12]
    const ringTip = landmarks[16]
    const pinkyTip = landmarks[20]

    // Simple thumbs up detection
    if (thumbTip.y < wrist.y - 0.1 && indexTip.y > wrist.y && middleTip.y > wrist.y) {
      return "thumbs_up"
    }

    // Simple pointing detection (index finger extended)
    if (indexTip.y < wrist.y - 0.05 && middleTip.y > wrist.y && ringTip.y > wrist.y && pinkyTip.y > wrist.y) {
      return "pointing"
    }

    // Open palm detection (all fingers extended)
    if (
      thumbTip.y < wrist.y &&
      indexTip.y < wrist.y &&
      middleTip.y < wrist.y &&
      ringTip.y < wrist.y &&
      pinkyTip.y < wrist.y
    ) {
      return "open_palm"
    }

    return null
  }

  // Handle detected gestures
  const handleGesture = (gesture: string) => {
    switch (gesture) {
      case "thumbs_up":
        nextSlide()
        toast({ title: "Thumbs Up!", description: "Moving to next slide" })
        break
      case "pointing":
        toast({ title: "Pointing Detected", description: "Laser pointer activated" })
        break
      case "open_palm":
        previousSlide()
        toast({ title: "Open Palm", description: "Moving to previous slide" })
        break
    }

    // Clear gesture after a delay
    setTimeout(() => setLastGesture(null), 1000)
  }

  // Navigation functions
  const nextSlide = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1)
    }
  }

  const previousSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide(currentSlide - 1)
    }
  }

  // Handle camera status changes
  const handleCameraStatus = useCallback(
    (status: "active" | "inactive" | "error", message?: string) => {
      setCameraStatus(status)
      if (message) {
        toast({
          title: `Camera ${status}`,
          description: message,
          variant: status === "error" ? "destructive" : "default",
        })
      }
    },
    [toast],
  )

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Presentation Area */}
      <div className="lg:col-span-2 space-y-4">
        {/* Slide Display */}
        <Card className="p-8 aspect-video flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-800 mb-4">{slides[currentSlide].title}</h1>
            <p className="text-xl text-gray-600">{slides[currentSlide].content}</p>
          </div>
        </Card>

        {/* Slide Navigation */}
        <div className="flex items-center justify-between">
          <Button onClick={previousSlide} disabled={currentSlide === 0} variant="outline">
            Previous
          </Button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">
              Slide {currentSlide + 1} of {slides.length}
            </span>
            <div className="flex gap-1">
              {slides.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${index === currentSlide ? "bg-blue-500" : "bg-gray-300"}`}
                />
              ))}
            </div>
          </div>

          <Button onClick={nextSlide} disabled={currentSlide === slides.length - 1} variant="outline">
            Next
          </Button>
        </div>

        {/* Gesture Status */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Badge variant={cameraStatus === "active" ? "default" : "destructive"}>Camera: {cameraStatus}</Badge>
              <Badge variant="outline">Hands Detected: {handCount}</Badge>
              {lastGesture && <Badge variant="secondary">Last Gesture: {lastGesture}</Badge>}
            </div>
          </div>
        </Card>
      </div>

      {/* MediaPipe Camera Panel */}
      <div className="lg:col-span-1">
        <MediaPipeHandsDetector
          onResults={handleMediaPipeResults}
          onCameraStatus={handleCameraStatus}
          showDebugOverlay={true}
          enableFallbackMode={true}
        />
      </div>
    </div>
  )
}
