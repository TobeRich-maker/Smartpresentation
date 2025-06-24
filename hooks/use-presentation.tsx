"use client"

import { useState, useEffect } from "react"

interface Slide {
  id: string
  type: "image" | "video" | "text"
  content: string
  title?: string
}

interface Presentation {
  id: string
  title: string
  slides: Slide[]
}

export function usePresentation() {
  const [presentation, setPresentation] = useState<Presentation | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPresentation() {
      try {
        // In a real app, this would fetch from your Laravel API
        // For demo purposes, we'll use a mock presentation

        // Simulate API delay
        await new Promise((resolve) => setTimeout(resolve, 1000))

        const mockPresentation: Presentation = {
          id: "1",
          title: "Sample Presentation",
          slides: [
            {
              id: "1",
              type: "text",
              title: "Welcome to Smart Presentation",
              content:
                "<p>Use hand gestures to control your presentation:</p><ul><li>Swipe left/right to navigate slides</li><li>Point with your index finger for laser pointer</li><li>Open palm to play videos</li><li>Closed fist to pause videos</li></ul>",
            },
            {
              id: "2",
              type: "image",
              title: "Gesture Controls",
              content: "/placeholder.svg?height=720&width=1280",
            },
            {
              id: "3",
              type: "video",
              title: "Demo Video",
              content: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
            },
            {
              id: "4",
              type: "text",
              title: "Key Features",
              content:
                "<ul><li>Real-time hand tracking with MediaPipe</li><li>Virtual laser pointer</li><li>Media controls with gestures</li><li>Accessibility features</li><li>Integration with Laravel backend</li></ul>",
            },
            {
              id: "5",
              type: "image",
              title: "Thank You!",
              content: "/placeholder.svg?height=720&width=1280",
            },
          ],
        }

        setPresentation(mockPresentation)
        setError(null)
      } catch (err) {
        console.error("Error fetching presentation:", err)
        setError("Failed to load presentation")
      } finally {
        setLoading(false)
      }
    }

    fetchPresentation()
  }, [])

  return {
    presentation,
    loading,
    error,
  }
}
