"use client"

import { CameraTroubleshooter } from "@/components/debug/camera-troubleshooter"
import { MinimalCameraTest } from "@/components/debug/minimal-camera-test"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Camera, Bug } from "lucide-react"

export default function CameraDebugPage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2 flex items-center justify-center gap-3">
          <Camera className="h-10 w-10" />
          Camera Debug Center
        </h1>
        <p className="text-gray-600 text-lg">Comprehensive tools to diagnose and fix camera display issues</p>
      </div>

      <Tabs defaultValue="minimal" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="minimal" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Minimal Test
          </TabsTrigger>
          <TabsTrigger value="comprehensive" className="flex items-center gap-2">
            <Bug className="h-4 w-4" />
            Full Diagnostics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="minimal" className="space-y-6">
          <MinimalCameraTest />
        </TabsContent>

        <TabsContent value="comprehensive" className="space-y-6">
          <CameraTroubleshooter />
        </TabsContent>
      </Tabs>
    </div>
  )
}
