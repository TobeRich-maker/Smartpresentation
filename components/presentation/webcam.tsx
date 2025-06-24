"use client"

import { useRef, useEffect } from "react"

// Define hand connections manually since the import is causing issues
const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4], // Thumb
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8], // Index finger
  [0, 9],
  [9, 10],
  [10, 11],
  [11, 12], // Middle finger
  [0, 13],
  [13, 14],
  [14, 15],
  [15, 16], // Ring finger
  [0, 17],
  [17, 18],
  [18, 19],
  [19, 20], // Pinky
  [5, 9],
  [9, 13],
  [13, 17], // Palm connections
  [5, 17], // Additional palm connection
]

interface WebcamProps {
  showLandmarks?: boolean
  handLandmarks?: any[]
  onVideoRef?: (videoElement: HTMLVideoElement) => void
}

export function Webcam({ showLandmarks = false, handLandmarks = [], onVideoRef }: WebcamProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Initialize webcam
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    // Set crossOrigin to anonymous to avoid tainting the canvas
    video.crossOrigin = "anonymous"

    async function setupCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: 640,
            height: 480,
            facingMode: "user",
          },
        })

        video.srcObject = stream

        // Wait for video to be ready
        video.onloadedmetadata = () => {
          video.play().catch((err) => console.error("Error playing video:", err))
          // Pass the video element to parent component if needed
          if (onVideoRef && video) {
            onVideoRef(video)
          }
        }
      } catch (error) {
        console.error("Error accessing webcam:", error)
      }
    }

    setupCamera()

    return () => {
      // Clean up video stream when component unmounts
      const stream = video.srcObject as MediaStream
      if (stream) {
        const tracks = stream.getTracks()
        tracks.forEach((track) => track.stop())
      }
    }
  }, [onVideoRef])

  // Draw hand landmarks on canvas
  useEffect(() => {
    if (!showLandmarks || !handLandmarks || handLandmarks.length === 0) return

    const canvas = canvasRef.current
    const video = videoRef.current
    if (!canvas || !video) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480

    // Draw landmarks
    handLandmarks.forEach((landmarks) => {
      if (!landmarks || landmarks.length === 0) return

      // With our simplified detection, we might just have a center point
      if (landmarks.length === 1) {
        const centerPoint = landmarks[0]
        if (centerPoint) {
          const x = centerPoint.x * canvas.width
          const y = centerPoint.y * canvas.height

          // Draw a circle to represent the hand
          ctx.beginPath()
          ctx.arc(x, y, 30, 0, 2 * Math.PI)
          ctx.strokeStyle = "rgba(0, 255, 0, 0.8)"
          ctx.lineWidth = 2
          ctx.stroke()

          // Draw center point
          ctx.beginPath()
          ctx.arc(x, y, 5, 0, 2 * Math.PI)
          ctx.fillStyle = "rgba(255, 0, 0, 0.8)"
          ctx.fill()
        }
        return
      }

      // If we have full hand landmarks (from MediaPipe)
      if (landmarks.length >= 21) {
        try {
          // Draw connections between landmarks
          const HAND_CONNECTIONS = [
            [0, 1],
            [1, 2],
            [2, 3],
            [3, 4], // Thumb
            [0, 5],
            [5, 6],
            [6, 7],
            [7, 8], // Index finger
            [0, 9],
            [9, 10],
            [10, 11],
            [11, 12], // Middle finger
            [0, 13],
            [13, 14],
            [14, 15],
            [15, 16], // Ring finger
            [0, 17],
            [17, 18],
            [18, 19],
            [19, 20], // Pinky
            [5, 9],
            [9, 13],
            [13, 17], // Palm connections
            [5, 17], // Additional palm connection
          ]

          HAND_CONNECTIONS.forEach(([i, j]) => {
            const from = landmarks[i]
            const to = landmarks[j]

            if (from && to) {
              ctx.beginPath()
              ctx.moveTo(from.x * canvas.width, from.y * canvas.height)
              ctx.lineTo(to.x * canvas.width, to.y * canvas.height)
              ctx.strokeStyle = "rgba(0, 255, 0, 0.8)"
              ctx.lineWidth = 2
              ctx.stroke()
            }
          })

          // Draw landmarks
          landmarks.forEach((point) => {
            if (point) {
              const x = point.x * canvas.width
              const y = point.y * canvas.height

              ctx.beginPath()
              ctx.arc(x, y, 3, 0, 2 * Math.PI)
              ctx.fillStyle = "rgba(255, 0, 0, 0.8)"
              ctx.fill()
            }
          })
        } catch (err) {
          console.error("Error drawing hand landmarks:", err)
        }
      }
    })
  }, [handLandmarks, showLandmarks])

  return (
    <div className="relative w-full h-full">
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
      {showLandmarks && <canvas ref={canvasRef} className="absolute top-0 left-0 w-full h-full" />}
    </div>
  )
}
