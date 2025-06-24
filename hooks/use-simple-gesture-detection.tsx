"use client"

import { useState, useRef, useCallback, useEffect } from "react"

export type GestureType = "SWIPE_LEFT" | "SWIPE_RIGHT" | "OPEN_PALM" | "CLOSED_FIST" | "POINTING" | "THUMB_UP" | null

interface SimpleGestureDetectionOptions {
  enabled: boolean
  onGestureDetected?: (gesture: GestureType) => void
  debounceMs?: number
}

export function useSimpleGestureDetection({
  enabled = false,
  onGestureDetected,
  debounceMs = 1000,
}: SimpleGestureDetectionOptions) {
  const [currentGesture, setCurrentGesture] = useState<GestureType>(null)
  const [isDetecting, setIsDetecting] = useState(false)
  const [fps, setFps] = useState(0)
  const [handLandmarks, setHandLandmarks] = useState<any[]>([])

  // Refs for tracking state without causing re-renders
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const lastGestureTimeRef = useRef<number>(0)
  const gestureTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const animationFrameRef = useRef<number | null>(null)
  const onGestureDetectedRef = useRef(onGestureDetected)
  const frameTimesRef = useRef<number[]>([])
  const handPositionHistoryRef = useRef<Array<{ x: number; y: number }>>([])

  // Update callback ref
  useEffect(() => {
    onGestureDetectedRef.current = onGestureDetected
  }, [onGestureDetected])

  // Simulate gesture detection with keyboard for testing
  const [testMode, setTestMode] = useState(true)

  // Handle keyboard simulation for testing
  useEffect(() => {
    if (!enabled || !testMode) return

    const handleKeyDown = (e: KeyboardEvent) => {
      const now = Date.now()
      if (now - lastGestureTimeRef.current < debounceMs) return

      let gesture: GestureType = null

      switch (e.key.toLowerCase()) {
        case "arrowleft":
          gesture = "SWIPE_LEFT"
          break
        case "arrowright":
          gesture = "SWIPE_RIGHT"
          break
        case "o":
          gesture = "OPEN_PALM"
          break
        case "c":
          gesture = "CLOSED_FIST"
          break
        case "p":
          gesture = "POINTING"
          break
        case "t":
          gesture = "THUMB_UP"
          break
        default:
          return
      }

      if (gesture) {
        processGesture(gesture)
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [enabled, testMode, debounceMs])

  // Process detected gesture
  const processGesture = useCallback(
    (gesture: GestureType) => {
      const now = Date.now()

      // Debounce gestures
      if (now - lastGestureTimeRef.current < debounceMs) return

      lastGestureTimeRef.current = now
      setCurrentGesture(gesture)

      // Call the callback
      if (onGestureDetectedRef.current) {
        onGestureDetectedRef.current(gesture)
      }

      // Clear gesture after delay
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current)
      }

      gestureTimeoutRef.current = setTimeout(() => {
        setCurrentGesture(null)
      }, 1500)
    },
    [debounceMs],
  )

  // Start webcam (simplified version)
  const startCamera = useCallback(async () => {
    if (!enabled) return

    try {
      setIsDetecting(true)

      // Create video element if it doesn't exist
      if (!videoRef.current) {
        const video = document.createElement("video")
        video.style.display = "none"
        document.body.appendChild(video)
        videoRef.current = video
      }

      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: "user",
        },
      })

      videoRef.current.srcObject = stream
      await videoRef.current.play()

      console.log("Camera started successfully")

      // Start FPS counter
      startFPSCounter()
    } catch (error) {
      console.error("Failed to start camera:", error)
      setIsDetecting(false)
    }
  }, [enabled])

  // Stop camera
  const stopCamera = useCallback(() => {
    setIsDetecting(false)

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = null
    }

    frameTimesRef.current = []
    setFps(0)
  }, [])

  // FPS counter
  const startFPSCounter = useCallback(() => {
    const updateFPS = () => {
      const now = performance.now()
      frameTimesRef.current.push(now)

      // Keep only last 60 frames
      if (frameTimesRef.current.length > 60) {
        frameTimesRef.current.shift()
      }

      // Calculate FPS
      if (frameTimesRef.current.length > 1) {
        const timeSpan = frameTimesRef.current[frameTimesRef.current.length - 1] - frameTimesRef.current[0]
        const fps = Math.round(((frameTimesRef.current.length - 1) * 1000) / timeSpan)
        setFps(fps)
      }

      if (isDetecting) {
        animationFrameRef.current = requestAnimationFrame(updateFPS)
      }
    }

    updateFPS()
  }, [isDetecting])

  // Start/stop detection based on enabled state
  useEffect(() => {
    if (enabled) {
      startCamera()
    } else {
      stopCamera()
    }

    return () => {
      stopCamera()
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current)
      }
    }
  }, [enabled, startCamera, stopCamera])

  // Get video element for external use
  const getVideoElement = useCallback(() => {
    return videoRef.current
  }, [])

  return {
    currentGesture,
    isDetecting,
    fps,
    handLandmarks,
    testMode,
    setTestMode,
    getVideoElement,
    processGesture,
  }
}
