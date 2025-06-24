"use client"

import { CameraDisplayDebugger } from "@/components/debug/camera-display-debugger"
import { MinimalVideoTest } from "@/components/debug/minimal-video-test"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DebugCameraDisplayPage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-2">Camera Display Debugger</h1>
        <p className="text-gray-600 text-lg">
          Comprehensive tool to diagnose why your camera isn't displaying any image
        </p>
      </div>

      <Tabs defaultValue="minimal" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="minimal">Minimal Test</TabsTrigger>
          <TabsTrigger value="comprehensive">Comprehensive Diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="minimal" className="space-y-6">
          <MinimalVideoTest />
        </TabsContent>

        <TabsContent value="comprehensive" className="space-y-6">
          <CameraDisplayDebugger />
        </TabsContent>
      </Tabs>
    </div>
  )
}
