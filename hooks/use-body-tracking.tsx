"use client"

import { useState, useEffect, useRef } from "react"

interface BodyTrackingOptions {
  enabled: boolean
}

export function useBodyTracking({ enabled = true }: BodyTrackingOptions) {
  const [isPresenterVisible, setIsPresenterVisible] = useState(true)
  const [presenterPosition, setPresenterPosition] = useState({ x: 0.5, y: 0.5 })

  // Use refs to track visibility
  const visibilityTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Simplified implementation that doesn't rely on MediaPipe Pose
  // This uses a basic approach to detect if a person is in frame
  useEffect(() => {
    if (!enabled) {
      setIsPresenterVisible(false)
      return () => {}
    }

    let videoElement: HTMLVideoElement | null = null
    let canvasElement: HTMLCanvasElement | null = null
    let canvasContext: CanvasRenderingContext2D | null = null

    // Create a canvas for processing
    const setupCanvas = () => {
      videoElement = document.querySelector("video")
      if (!videoElement) return false

      // Create canvas if it doesn't exist
      canvasElement = document.createElement("canvas")
      canvasElement.width = 320 // Lower resolution for performance
      canvasElement.height = 240
      canvasElement.style.display = "none"
      document.body.appendChild(canvasElement)

      canvasContext = canvasElement.getContext("2d")
      return true
    }

    // Simple motion detection by comparing pixel differences
    const checkForPresence = () => {
      if (!videoElement || !canvasElement || !canvasContext) return

      try {
        // Draw current video frame to canvas
        canvasContext.drawImage(videoElement, 0, 0, canvasElement.width, canvasElement.height)

        // Get image data to analyze
        const imageData = canvasContext.getImageData(0, 0, canvasElement.width, canvasElement.height)
        const data = imageData.data

        // Simple heuristic: check if there's enough variation in the center of the frame
        // This is a very basic approach but doesn't require MediaPipe
        let centerVariation = 0
        const centerX = Math.floor(canvasElement.width / 2)
        const centerY = Math.floor(canvasElement.height / 2)
        const sampleSize = 20

        // Sample pixels around the center
        for (let y = centerY - sampleSize; y < centerY + sampleSize; y += 4) {
          for (let x = centerX - sampleSize; x < centerX + sampleSize; x += 4) {
            if (x < 0 || y < 0 || x >= canvasElement.width || y >= canvasElement.height) continue

            const idx = (y * canvasElement.width + x) * 4
            const r = data[idx]
            const g = data[idx + 1]
            const b = data[idx + 2]

            // Calculate variation from gray (simple approach)
            const avg = (r + g + b) / 3
            centerVariation += Math.abs(r - avg) + Math.abs(g - avg) + Math.abs(b - avg)
          }
        }

        // If there's enough variation, consider a presenter visible
        const isVisible = centerVariation > 5000

        // Update presenter visibility with debounce
        if (isVisible) {
          setIsPresenterVisible(true)
          setPresenterPosition({ x: 0.5, y: 0.5 }) // Default center position

          // Clear any pending timeout
          if (visibilityTimeoutRef.current) {
            clearTimeout(visibilityTimeoutRef.current)
            visibilityTimeoutRef.current = null
          }
        } else if (!visibilityTimeoutRef.current) {
          // Set a timeout to mark presenter as not visible after 2 seconds
          visibilityTimeoutRef.current = setTimeout(() => {
            setIsPresenterVisible(false)
            visibilityTimeoutRef.current = null
          }, 2000)
        }
      } catch (error) {
        console.error("Error in presence detection:", error)
      }
    }

    // Set up and start detection
    if (setupCanvas()) {
      const intervalId = setInterval(checkForPresence, 500)

      return () => {
        clearInterval(intervalId)
        if (visibilityTimeoutRef.current) {
          clearTimeout(visibilityTimeoutRef.current)
        }
        if (canvasElement) {
          document.body.removeChild(canvasElement)
        }
      }
    }

    return () => {}
  }, [enabled])

  return {
    isPresenterVisible,
    presenterPosition,
  }
}
