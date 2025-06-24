"use client"

import { useRef, useEffect } from "react"
import Image from "next/image"

interface SlideProps {
  slide: {
    id: string
    type: "image" | "video" | "text"
    content: string
    title?: string
  }
  isPlaying: boolean
  onPlay: () => void
  onPause: () => void
}

export function Slide({ slide, isPlaying, onPlay, onPause }: SlideProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  // Sync video playback state with isPlaying prop
  useEffect(() => {
    if (slide.type !== "video" || !videoRef.current) return

    if (isPlaying) {
      videoRef.current.play().catch((err) => console.error("Error playing video:", err))
    } else {
      videoRef.current.pause()
    }
  }, [isPlaying, slide.type])

  // Render different slide types
  switch (slide.type) {
    case "image":
      return (
        <div className="w-full h-full flex items-center justify-center bg-white">
          <Image
            src={slide.content || "/placeholder.svg"}
            alt={slide.title || "Slide image"}
            fill
            className="object-contain"
          />
          {slide.title && (
            <div className="absolute bottom-4 left-0 right-0 text-center bg-black/50 py-2 text-white">
              <h3 className="text-xl font-semibold">{slide.title}</h3>
            </div>
          )}
        </div>
      )

    case "video":
      return (
        <div className="w-full h-full flex items-center justify-center bg-black">
          <video
            ref={videoRef}
            src={slide.content}
            className="w-full h-full object-contain"
            onPlay={onPlay}
            onPause={onPause}
            controls={false}
          />
          {slide.title && (
            <div className="absolute bottom-4 left-0 right-0 text-center bg-black/50 py-2 text-white">
              <h3 className="text-xl font-semibold">{slide.title}</h3>
            </div>
          )}
        </div>
      )

    case "text":
      return (
        <div className="w-full h-full flex flex-col items-center justify-center p-8 bg-white text-black">
          {slide.title && <h2 className="text-3xl font-bold mb-6">{slide.title}</h2>}
          <div className="prose lg:prose-xl" dangerouslySetInnerHTML={{ __html: slide.content }} />
        </div>
      )

    default:
      return (
        <div className="w-full h-full flex items-center justify-center bg-gray-100">
          <p className="text-gray-500">Unsupported slide type</p>
        </div>
      )
  }
}
