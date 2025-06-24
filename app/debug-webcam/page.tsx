"use client"

import { WebcamDebugger } from "@/components/debug/webcam-debugger"
import { SimpleVideoTest } from "@/components/debug/simple-video-test"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function DebugWebcamPage() {
  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">Webcam Black Screen Debugger</h1>
        <p className="text-gray-600">Comprehensive tool to diagnose and fix webcam black screen issues</p>
      </div>

      <Tabs defaultValue="debugger" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="debugger">Full Diagnostics</TabsTrigger>
          <TabsTrigger value="simple">Simple Test</TabsTrigger>
        </TabsList>

        <TabsContent value="debugger" className="space-y-6">
          <WebcamDebugger />
        </TabsContent>

        <TabsContent value="simple" className="space-y-6">
          <SimpleVideoTest />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
              <h3 className="font-semibold text-yellow-800 mb-2">If Simple Test Works:</h3>
              <ul className="text-sm text-yellow-700 space-y-1">
                <li>• The issue is in your React component or MediaPipe setup</li>
                <li>• Check for timing issues with useEffect</li>
                <li>• Verify video element refs are properly set</li>
                <li>• Look for CSS/styling conflicts</li>
              </ul>
            </div>

            <div className="p-4 bg-red-50 border border-red-200 rounded">
              <h3 className="font-semibold text-red-800 mb-2">If Simple Test Fails:</h3>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• Camera permissions may be blocked</li>
                <li>• Another application is using the camera</li>
                <li>• Hardware or driver issues</li>
                <li>• Browser doesn't support getUserMedia</li>
              </ul>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
