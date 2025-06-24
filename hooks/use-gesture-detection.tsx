"use client"

import { useState, useRef, useCallback, useEffect } from "react"

export type GestureType = "SWIPE_LEFT" | "SWIPE_RIGHT" | "OPEN_PALM" | "CLOSED_FIST" | "POINTING" | "THUMB_UP" | null

interface GestureDetectionOptions {
  enabled: boolean
  onGestureDetected?: (gesture: GestureType, confidence?: number) => void
  debounceMs?: number
  confidenceThreshold?: number
  smoothingFrames?: number
}

export function useGestureDetection({
  enabled = false,
  onGestureDetected,
  debounceMs = 800, // Reduced from 1000ms for better responsiveness
  confidenceThreshold = 0.7,
  smoothingFrames = 3,
}: GestureDetectionOptions) {
  const [currentGesture, setCurrentGesture] = useState<GestureType>(null)
  const [gestureConfidence, setGestureConfidence] = useState(0)
  const [debugInfo, setDebugInfo] = useState<any>({})
  const [handLandmarks, setHandLandmarks] = useState<any[]>([])
  const [fps, setFps] = useState(0)
  const [isDetecting, setIsDetecting] = useState(false)

  const lastGestureTimeRef = useRef<number>(0)
  const lastGestureTypeRef = useRef<GestureType>(null)
  const gestureTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const onGestureDetectedRef = useRef(onGestureDetected)
  const frameTimesRef = useRef<number[]>([])

  // Update callback ref
  useEffect(() => {
    onGestureDetectedRef.current = onGestureDetected
  }, [onGestureDetected])

  // Process gesture with enhanced debouncing
  const processGesture = useCallback(
    (gesture: GestureType, confidence = 0.9) => {
      const now = Date.now()

      console.log(`🔍 Processing gesture: ${gesture} (confidence: ${confidence})`)
      console.log(`⏱️ Time since last gesture: ${now - lastGestureTimeRef.current}ms`)
      console.log(`🔄 Last gesture was: ${lastGestureTypeRef.current}`)

      // Enhanced debouncing: prevent same gesture from firing too quickly
      if (now - lastGestureTimeRef.current < debounceMs) {
        console.log(`🚫 Gesture debounced (too soon: ${now - lastGestureTimeRef.current}ms < ${debounceMs}ms)`)
        return
      }

      // Additional check: prevent rapid-fire of the same gesture
      if (gesture === lastGestureTypeRef.current && now - lastGestureTimeRef.current < debounceMs * 1.5) {
        console.log(`🚫 Same gesture debounced (${gesture})`)
        return
      }

      console.log(`✅ Gesture accepted: ${gesture}`)

      lastGestureTimeRef.current = now
      lastGestureTypeRef.current = gesture
      setCurrentGesture(gesture)
      setGestureConfidence(confidence)

      // Call the callback
      if (onGestureDetectedRef.current) {
        console.log(`📞 Calling gesture callback for: ${gesture}`)
        onGestureDetectedRef.current(gesture, confidence)
      } else {
        console.log(`❌ No gesture callback available`)
      }

      // Clear gesture after delay
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current)
      }

      gestureTimeoutRef.current = setTimeout(() => {
        console.log(`🧹 Clearing gesture: ${gesture}`)
        setCurrentGesture(null)
        setGestureConfidence(0)
      }, 1500)
    },
    [debounceMs],
  )

  // Handle keyboard simulation with logging
  useEffect(() => {
    if (!enabled) {
      console.log("🚫 Gesture detection disabled")
      return
    }

    console.log("✅ Gesture detection enabled - setting up keyboard listeners")

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent default behavior for arrow keys to avoid page scrolling
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault()
      }

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
        console.log(`⌨️ Keyboard gesture triggered: ${gesture}`)
        processGesture(gesture, 1.0) // Keyboard gestures have 100% confidence
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => {
      console.log("🧹 Cleaning up keyboard listeners")
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [enabled, processGesture])

  // Enhanced FPS counter simulation
  useEffect(() => {
    if (!enabled) {
      setFps(0)
      setIsDetecting(false)
      return
    }

    setIsDetecting(true)
    console.log("🎯 Starting FPS counter")

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
        setFps(Math.min(fps, 30)) // Cap at 30 FPS
      }
    }

    const intervalId = setInterval(updateFPS, 100)

    return () => {
      console.log("🧹 Cleaning up FPS counter")
      clearInterval(intervalId)
      frameTimesRef.current = []
    }
  }, [enabled])

  // Process landmarks (simplified)
  const processLandmarks = useCallback(
    (landmarks: any[][]) => {
      if (!enabled || !landmarks || landmarks.length === 0) {
        setHandLandmarks([])
        return
      }

      setHandLandmarks(landmarks)

      // Update debug info
      setDebugInfo({
        handLandmarks: landmarks.length,
        detectedGestures: [],
        bestGesture: currentGesture,
        historyLength: 0,
        lastGestureTime: lastGestureTimeRef.current,
        debounceMs,
      })
    },
    [enabled, currentGesture, debounceMs],
  )

  // Cleanup
  useEffect(() => {
    return () => {
      if (gestureTimeoutRef.current) {
        clearTimeout(gestureTimeoutRef.current)
      }
    }
  }, [])

  return {
    currentGesture,
    gestureConfidence,
    debugInfo,
    processLandmarks,
    handLandmarks,
    fps,
    isDetecting,
    processGesture,
  }
}
