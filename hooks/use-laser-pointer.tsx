"use client"

import { useState, useEffect } from "react"

interface LaserPointerOptions {
  handLandmarks: any[]
  fingerState?: {
    thumb: boolean
    index: boolean
    middle: boolean
    ring: boolean
    pinky: boolean
    positions: {
      thumb?: { x: number; y: number }
      index?: { x: number; y: number }
      middle?: { x: number; y: number }
      ring?: { x: number; y: number }
      pinky?: { x: number; y: number }
    }
  }
  enabled: boolean
}

export function useLaserPointer({ handLandmarks, fingerState, enabled = true }: LaserPointerOptions) {
  const [pointerPosition, setPointerPosition] = useState({ x: 0.5, y: 0.5 })
  const [isPointerActive, setIsPointerActive] = useState(false)

  useEffect(() => {
    if (!enabled) {
      setIsPointerActive(false)
      return
    }

    // First check if we have MediaPipe hand landmarks (full 21 landmarks)
    if (handLandmarks && handLandmarks.length > 0 && handLandmarks[0].length >= 21) {
      // Use the index finger tip (landmark 8) for the laser pointer
      const landmarks = handLandmarks[0]
      const indexFingerTip = landmarks[8]

      if (indexFingerTip) {
        setIsPointerActive(true)

        // Use the index finger tip position
        setPointerPosition({
          // Flip X coordinate for mirroring if needed
          x: 1 - indexFingerTip.x, // Mirror horizontally
          y: indexFingerTip.y,
        })
      } else {
        setIsPointerActive(false)
      }
      return
    }

    // Fallback to our simplified finger state
    if (fingerState && fingerState.index && fingerState.positions.index) {
      setIsPointerActive(true)

      // Use index finger position for the laser pointer
      const indexPosition = fingerState.positions.index

      // Flip X coordinate for mirroring if needed
      setPointerPosition({
        x: indexPosition.x,
        y: indexPosition.y,
      })
    } else {
      setIsPointerActive(false)
    }
  }, [handLandmarks, fingerState, enabled])

  return {
    pointerPosition,
    isPointerActive,
  }
}
