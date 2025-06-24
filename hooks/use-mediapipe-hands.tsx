"use client"

import { useRef, useEffect, useState, useCallback } from "react"

// MediaPipe types
interface MediaPipeResults {
  landmarks: any[][]
  handedness: any[]
  multiHandLandmarks?: any[][]
  multiHandedness?: any[]
}

interface MediaPipeHooksOptions {
  enabled: boolean
  onResults?: (results: MediaPipeResults) => void
  onError?: (error: string) => void
  modelComplexity?: 0 | 1
  minDetectionConfidence?: number
  minTrackingConfidence?: number
  maxNumHands?: number
}

export function useMediaPipeHands({
  enabled = false,
  onResults,
  onError,
  modelComplexity = 1,
  minDetectionConfidence = 0.5,
  minTrackingConfidence = 0.5,
  maxNumHands = 2,
}: MediaPipeHooksOptions) {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const handsRef = useRef<any>(null)
  const cameraRef = useRef<any>(null)
  const onResultsRef = useRef(onResults)
  const onErrorRef = useRef(onError)
  const animationFrameRef = useRef<number | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  // Update refs when callbacks change
  useEffect(() => {
    onResultsRef.current = onResults
  }, [onResults])

  useEffect(() => {
    onErrorRef.current = onError
  }, [onError])

  // Load MediaPipe scripts
  useEffect(() => {
    if (!enabled) return

    let cleanup = false

    const loadMediaPipe = async () => {
      try {
        // Check if MediaPipe is already loaded
        if (typeof window !== "undefined" && (window as any).Hands) {
          console.log("MediaPipe already loaded")
          setIsLoaded(true)
          return
        }

        console.log("Loading MediaPipe scripts...")

        // Load MediaPipe scripts in the correct order
        await Promise.all([
          loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"),
          loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js"),
          loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js"),
        ])

        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js")

        // Wait a bit for scripts to initialize
        await new Promise((resolve) => setTimeout(resolve, 500))

        if (!cleanup) {
          console.log("MediaPipe scripts loaded successfully")
          setIsLoaded(true)
        }
      } catch (err: any) {
        console.error("Failed to load MediaPipe:", err)
        const errorMsg = `Failed to load MediaPipe: ${err.message}`
        setError(errorMsg)
        onErrorRef.current?.(errorMsg)
      }
    }

    loadMediaPipe()

    return () => {
      cleanup = true
    }
  }, [enabled])

  // Initialize MediaPipe Hands
  useEffect(() => {
    if (!isLoaded || !enabled || isInitialized) return

    let cleanup = false

    const initializeHands = async () => {
      try {
        console.log("Initializing MediaPipe Hands...")

        // Check if Hands constructor is available
        if (typeof window === "undefined" || !(window as any).Hands) {
          throw new Error("MediaPipe Hands not available")
        }

        // Create Hands instance
        const hands = new (window as any).Hands({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
          },
        })

        // Configure Hands
        hands.setOptions({
          modelComplexity,
          minDetectionConfidence,
          minTrackingConfidence,
          maxNumHands,
        })

        // Set up results callback
        hands.onResults((results: MediaPipeResults) => {
          if (!cleanup) {
            onResultsRef.current?.(results)
          }
        })

        handsRef.current = hands

        if (!cleanup) {
          console.log("MediaPipe Hands initialized successfully")
          setIsInitialized(true)
        }
      } catch (err: any) {
        console.error("Failed to initialize MediaPipe Hands:", err)
        const errorMsg = `Failed to initialize MediaPipe Hands: ${err.message}`
        setError(errorMsg)
        onErrorRef.current?.(errorMsg)
      }
    }

    initializeHands()

    return () => {
      cleanup = true
    }
  }, [isLoaded, enabled, isInitialized, modelComplexity, minDetectionConfidence, minTrackingConfidence, maxNumHands])

  // Start camera and processing
  const startCamera = useCallback(async () => {
    if (!isInitialized || !handsRef.current) {
      console.warn("MediaPipe not initialized yet")
      return
    }

    try {
      console.log("Starting camera...")

      // Get user media first
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: 640,
          height: 480,
          facingMode: "user",
        },
      })

      streamRef.current = stream

      // Create video element if it doesn't exist
      if (!videoRef.current) {
        const video = document.createElement("video")
        video.style.position = "absolute"
        video.style.top = "0"
        video.style.left = "0"
        video.style.width = "100%"
        video.style.height = "100%"
        video.style.objectFit = "cover"
        video.style.transform = "scaleX(-1)"
        video.autoPlay = true
        video.playsInline = true
        video.muted = true
        document.body.appendChild(video)
        videoRef.current = video
      }

      // Set video source and wait for it to load
      videoRef.current.srcObject = stream
      await new Promise((resolve) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = resolve
        }
      })

      await videoRef.current.play()

      // Start processing frames
      const processFrame = async () => {
        if (handsRef.current && videoRef.current && videoRef.current.readyState === 4) {
          try {
            await handsRef.current.send({ image: videoRef.current })
          } catch (err) {
            console.error("Error processing frame:", err)
          }
        }

        if (streamRef.current) {
          requestAnimationFrame(processFrame)
        }
      }

      // Start the processing loop
      processFrame()

      console.log("Camera started successfully")
    } catch (err: any) {
      console.error("Failed to start camera:", err)
      const errorMsg = `Failed to start camera: ${err.message}`
      setError(errorMsg)
      onErrorRef.current?.(errorMsg)
    }
  }, [isInitialized])

  // Stop camera
  const stopCamera = useCallback(() => {
    console.log("Stopping camera...")

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
      if (document.body.contains(videoRef.current)) {
        document.body.removeChild(videoRef.current)
      }
      videoRef.current = null
    }

    setIsProcessing(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera()
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [stopCamera])

  // Helper function to load scripts
  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if script is already loaded
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve()
        return
      }

      const script = document.createElement("script")
      script.src = src
      script.async = true
      script.onload = () => resolve()
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`))
      document.head.appendChild(script)
    })
  }

  return {
    isLoaded,
    isInitialized,
    isProcessing,
    error,
    videoElement: videoRef.current,
    canvasElement: canvasRef.current,
    startCamera,
    stopCamera,
  }
}
