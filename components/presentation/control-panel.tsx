"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/hooks/use-toast"

interface ControlPanelProps {
  presentation: {
    id: string
    title: string
    slides: any[]
  }
  currentSlideIndex: number
  setCurrentSlideIndex: (index: number) => void
}

export function ControlPanel({ presentation, currentSlideIndex, setCurrentSlideIndex }: ControlPanelProps) {
  const [isImporting, setIsImporting] = useState(false)
  const [importUrl, setImportUrl] = useState("")
  const { toast } = useToast()

  const handleImport = async () => {
    if (!importUrl) return

    setIsImporting(true)

    try {
      // Simulate API call to import presentation
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: "Import successful",
        description: "Your presentation has been imported",
      })

      setImportUrl("")
    } catch (error) {
      toast({
        title: "Import failed",
        description: "There was an error importing your presentation",
        variant: "destructive",
      })
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Card className="p-4">
      <h2 className="text-xl font-semibold mb-4">Control Panel</h2>

      <div className="space-y-4">
        <div>
          <h3 className="font-medium mb-2">Slide Navigator</h3>
          <div className="grid grid-cols-4 gap-2">
            {presentation.slides.map((_, index) => (
              <Button
                key={index}
                variant={index === currentSlideIndex ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentSlideIndex(index)}
                aria-label={`Go to slide ${index + 1}`}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </div>

        <div className="pt-2 border-t">
          <h3 className="font-medium mb-2">Import Presentation</h3>
          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="import-url">Google Slides or PowerPoint URL</Label>
              <Input
                id="import-url"
                placeholder="https://docs.google.com/presentation/..."
                value={importUrl}
                onChange={(e) => setImportUrl(e.target.value)}
              />
            </div>
            <Button onClick={handleImport} disabled={!importUrl || isImporting} className="w-full">
              {isImporting ? "Importing..." : "Import"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
