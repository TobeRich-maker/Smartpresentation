import { Suspense } from "react";
import Link from "next/link";
import PresentationViewer from "@/components/presentation/presentation-viewer";
import { PresentationSkeleton } from "@/components/presentation/presentation-skeleton";
import { Button } from "@/components/ui/button";
import { Bug, Camera, Presentation, Zap } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      <div className="flex-1 container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Smart Presentation App</h1>
          <div className="flex gap-2">
            <Link href="/enhanced-presentation">
              <Button variant="default" className="flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Enhanced MediaPipe
              </Button>
            </Link>
            <Link href="/debug-camera-display">
              <Button variant="outline" className="flex items-center gap-2">
                <Camera className="h-4 w-4" />
                Debug Camera
              </Button>
            </Link>
            <Link href="/debug">
              <Button variant="outline" className="flex items-center gap-2">
                <Bug className="h-4 w-4" />
                Debug Tools
              </Button>
            </Link>
          </div>
        </div>

        <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
          <div className="flex items-center gap-2 mb-2">
            <Presentation className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              Try the Enhanced MediaPipe Version
            </h2>
          </div>
          <p className="text-blue-700 dark:text-blue-300 mb-3">
            Experience improved camera handling, robust MediaPipe integration,
            and better gesture detection.
          </p>
          <Link href="/enhanced-presentation">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Zap className="h-4 w-4 mr-2" />
              Launch Enhanced Version
            </Button>
          </Link>
        </div>

        <Suspense fallback={<PresentationSkeleton />}>
          <PresentationViewer />
        </Suspense>
      </div>
    </main>
  );
}
