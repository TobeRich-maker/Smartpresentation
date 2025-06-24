"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface SpeechToTextOptions {
  enabled: boolean
}

export function useSpeechToText({ enabled = false }: SpeechToTextOptions) {
  const [transcript, setTranscript] = useState("")
  const [isListening, setIsListening] = useState(false)

  // Use refs to avoid recreating functions and to track state that doesn't need to trigger re-renders
  const recognitionRef = useRef<any>(null)
  const isListeningRef = useRef<boolean>(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Initialize speech recognition
  useEffect(() => {
    // Check if browser supports speech recognition
    const hasSpeechRecognition = "SpeechRecognition" in window || "webkitSpeechRecognition" in window

    if (!hasSpeechRecognition) {
      console.error("Speech recognition not supported in this browser")
      return
    }

    // Create speech recognition instance if it doesn't exist
    if (!recognitionRef.current) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognitionInstance = new SpeechRecognition()

      // Configure recognition
      recognitionInstance.continuous = true
      recognitionInstance.interimResults = true
      recognitionInstance.lang = "en-US"

      // Set up event handlers
      recognitionInstance.onstart = () => {
        setIsListening(true)
        isListeningRef.current = true
      }

      recognitionInstance.onend = () => {
        setIsListening(false)
        isListeningRef.current = false

        // Restart if still enabled and not manually stopped
        if (enabled && !recognitionInstance.stopped) {
          try {
            // Add a small delay to prevent rapid restart
            setTimeout(() => {
              if (enabled && !isListeningRef.current) {
                recognitionInstance.start()
              }
            }, 300)
          } catch (error) {
            console.error("Error restarting speech recognition:", error)
          }
        }
      }

      recognitionInstance.onresult = (event: any) => {
        let interimTranscript = ""
        let finalTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript

          if (event.results[i].isFinal) {
            finalTranscript += transcript
          } else {
            interimTranscript += transcript
          }
        }

        // Update transcript
        setTranscript(finalTranscript || interimTranscript)

        // Clear transcript after a delay if it's final
        if (finalTranscript) {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current)
          }

          timeoutRef.current = setTimeout(() => {
            setTranscript("")
            timeoutRef.current = null
          }, 5000)
        }
      }

      recognitionInstance.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error)
        setIsListening(false)
        isListeningRef.current = false
      }

      // Add a custom property to track if it was manually stopped
      recognitionInstance.stopped = false

      // Store recognition instance
      recognitionRef.current = recognitionInstance
    }

    // Start or stop recognition based on enabled prop
    if (enabled) {
      startListening()
    } else {
      stopListening()
    }

    // Clean up
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
      stopListening()
    }
  }, [enabled])

  // Start listening
  const startListening = useCallback(() => {
    if (!recognitionRef.current) return

    try {
      // Only start if not already listening
      if (!isListeningRef.current) {
        recognitionRef.current.stopped = false
        recognitionRef.current.start()
      }
    } catch (error) {
      console.error("Error starting speech recognition:", error)
    }
  }, [])

  // Stop listening
  const stopListening = useCallback(() => {
    if (!recognitionRef.current) return

    try {
      // Only stop if currently listening
      if (isListeningRef.current) {
        recognitionRef.current.stopped = true
        recognitionRef.current.stop()
      }
      setTranscript("")
    } catch (error) {
      console.error("Error stopping speech recognition:", error)
    }
  }, [])

  return {
    transcript,
    isListening,
    startListening,
    stopListening,
  }
}
