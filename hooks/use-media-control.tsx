"use client"

import { useState, useCallback } from "react"

export function useMediaControl() {
  const [isPlaying, setIsPlaying] = useState(false)

  const togglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev)
  }, [])

  const handleMediaControl = useCallback((action: "play" | "pause") => {
    if (action === "play") {
      setIsPlaying(true)
    } else if (action === "pause") {
      setIsPlaying(false)
    }
  }, [])

  return {
    isPlaying,
    togglePlayPause,
    handleMediaControl,
  }
}
