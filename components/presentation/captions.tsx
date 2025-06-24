"use client"

interface CaptionsProps {
  text: string
}

export function Captions({ text }: CaptionsProps) {
  if (!text) return null

  return (
    <div className="absolute bottom-4 left-0 right-0 mx-auto w-4/5 p-2 bg-black/70 rounded text-white text-center z-40">
      <p className="text-lg font-medium">{text}</p>
    </div>
  )
}
