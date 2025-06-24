"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Camera,
  CameraOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
} from "lucide-react";

interface HandLandmark {
  x: number;
  y: number;
  z: number;
}

interface MediaPipeResults {
  multiHandLandmarks?: HandLandmark[][];
  multiHandedness?: any[];
}

interface RobustMediaPipeHandsProps {
  onResults?: (results: MediaPipeResults) => void;
  onCameraStatus?: (
    status: "active" | "inactive" | "error",
    message?: string
  ) => void;
  showDebugOverlay?: boolean;
  width?: number;
  height?: number;
}

export function RobustMediaPipeHands({
  onResults,
  onCameraStatus,
  showDebugOverlay = false,
  width = 640,
  height = 480,
}: RobustMediaPipeHandsProps) {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);
  const animationFrameRef = useRef<number | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State
  const [isInitialized, setIsInitialized] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<
    "idle" | "initializing" | "active" | "inactive" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [handCount, setHandCount] = useState(0);
  const [retryCount, setRetryCount] = useState(0);
  const [videoReady, setVideoReady] = useState(false);
  const [mediaPipeLoaded, setMediaPipeLoaded] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState("");
  const lastLandmarksRef = useRef<HandLandmark[] | null>(null);

  // FPS tracking
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() });

  // Check if MediaPipe is already available
  const checkMediaPipeAvailability = useCallback(() => {
    const isAvailable =
      !!(window as any).Hands &&
      !!(window as any).Camera &&
      !!(window as any).drawConnectors;
    console.log("MediaPipe availability check:", {
      Hands: !!(window as any).Hands,
      Camera: !!(window as any).Camera,
      drawConnectors: !!(window as any).drawConnectors,
      overall: isAvailable,
    });
    return isAvailable;
  }, []);
  const detectSwipeGesture = (currentLandmarks: HandLandmark[]) => {
    const lastLandmarks = lastLandmarksRef.current;
    if (!lastLandmarks) {
      lastLandmarksRef.current = currentLandmarks;
      return;
    }

    // Ambil posisi X dari landmark tengah tangan (misalnya landmark index 9)
    const prevX = lastLandmarks[9]?.x;
    const currX = currentLandmarks[9]?.x;

    if (prevX !== undefined && currX !== undefined) {
      const deltaX = currX - prevX;

      if (Math.abs(deltaX) > 0.1) {
        if (deltaX > 0) {
          console.log("➡️ Swipe kanan (Next Slide)");
          // Trigger next slide di sini
        } else {
          console.log("⬅️ Swipe kiri (Previous Slide)");
          // Trigger previous slide di sini
        }
        lastLandmarksRef.current = null; // Reset setelah swipe
      } else {
        lastLandmarksRef.current = currentLandmarks;
      }
    }
  };

  // Load individual script with better error handling
  const loadScript = useCallback(
    (src: string, timeout = 20000): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if script already exists
        const existingScript = document.querySelector(`script[src="${src}"]`);
        if (existingScript) {
          console.log(`✅ Script already exists: ${src}`);
          resolve();
          return;
        }

        console.log(`🔄 Loading script: ${src}`);
        const script = document.createElement("script");
        script.src = src;
        script.async = true;
        script.crossOrigin = "anonymous";

        // Set timeout for loading
        const timeoutId = setTimeout(() => {
          script.remove();
          reject(new Error(`Script loading timeout (${timeout}ms): ${src}`));
        }, timeout);

        script.onload = () => {
          clearTimeout(timeoutId);
          console.log(`✅ Script loaded successfully: ${src}`);
          resolve();
        };

        script.onerror = (error) => {
          clearTimeout(timeoutId);
          script.remove();
          console.error(`❌ Script loading failed: ${src}`, error);
          reject(new Error(`Failed to load script: ${src}`));
        };

        document.head.appendChild(script);
      });
    },
    []
  );

  // Load MediaPipe with improved error handling
  const loadMediaPipe = useCallback(async (): Promise<boolean> => {
    if (typeof window === "undefined") {
      console.error("Window is undefined - running on server side");
      return false;
    }

    try {
      // Check if already loaded
      if (checkMediaPipeAvailability()) {
        console.log("✅ MediaPipe already available");
        setMediaPipeLoaded(true);
        setLoadingProgress("MediaPipe already loaded");
        return true;
      }

      console.log("🔄 Starting MediaPipe loading process...");
      setLoadingProgress("Starting MediaPipe loading...");

      // Define scripts with fallback URLs
      const scriptConfigs = [
        {
          name: "Camera Utils",
          urls: [
            "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js",
            "https://unpkg.com/@mediapipe/camera_utils/camera_utils.js",
          ],
          check: () => !!(window as any).Camera,
        },
        {
          name: "Control Utils",
          urls: [
            "https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js",
            "https://unpkg.com/@mediapipe/control_utils/control_utils.js",
          ],
          check: () => !!(window as any).ControlPanel,
        },
        {
          name: "Drawing Utils",
          urls: [
            "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js",
            "https://unpkg.com/@mediapipe/drawing_utils/drawing_utils.js",
          ],
          check: () => !!(window as any).drawConnectors,
        },
        {
          name: "Hands",
          urls: [
            "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js",
            "https://unpkg.com/@mediapipe/hands/hands.js",
          ],
          check: () => !!(window as any).Hands,
        },
      ];

      // Load each script with fallback URLs
      for (let i = 0; i < scriptConfigs.length; i++) {
        const config = scriptConfigs[i];
        setLoadingProgress(
          `Loading ${config.name} (${i + 1}/${scriptConfigs.length})...`
        );

        let loaded = false;
        let lastError: Error | null = null;

        // Try each URL for this script
        for (const url of config.urls) {
          try {
            await loadScript(url, 15000);

            // Wait for the object to be available
            let attempts = 0;
            while (!config.check() && attempts < 30) {
              await new Promise((resolve) => setTimeout(resolve, 200));
              attempts++;
            }

            if (config.check()) {
              console.log(`✅ ${config.name} loaded and verified`);
              loaded = true;
              break;
            } else {
              console.warn(
                `⚠️ ${config.name} script loaded but object not available from ${url}`
              );
            }
          } catch (error: any) {
            console.warn(
              `⚠️ Failed to load ${config.name} from ${url}:`,
              error.message
            );
            lastError = error;
            continue;
          }
        }

        if (!loaded) {
          throw new Error(
            `Failed to load ${config.name} from all URLs. Last error: ${lastError?.message}`
          );
        }
      }

      // Final verification
      if (checkMediaPipeAvailability()) {
        console.log("✅ All MediaPipe components loaded successfully");
        setMediaPipeLoaded(true);
        setLoadingProgress("MediaPipe loaded successfully");
        setError(null);
        return true;
      } else {
        throw new Error(
          "MediaPipe components not available after loading all scripts"
        );
      }
    } catch (error: any) {
      console.error("❌ MediaPipe loading failed:", error);
      setError(`MediaPipe loading failed: ${error.message}`);
      setLoadingProgress(`Loading failed: ${error.message}`);
      setMediaPipeLoaded(false);
      return false;
    }
  }, [checkMediaPipeAvailability, loadScript]);

  // Draw hand landmarks
  const drawResults = useCallback(
    (results: MediaPipeResults) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (!canvas || !video) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size
      canvas.width = video.videoWidth || width;
      canvas.height = video.videoHeight || height;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw hand landmarks if drawing utils are available
      if (
        results.multiHandLandmarks &&
        (window as any).drawConnectors &&
        (window as any).drawLandmarks
      ) {
        try {
          const drawingUtils = window as any;

          for (const landmarks of results.multiHandLandmarks) {
            drawingUtils.drawConnectors(
              ctx,
              landmarks,
              drawingUtils.HAND_CONNECTIONS,
              {
                color: "#00FF00",
                lineWidth: 2,
              }
            );
            drawingUtils.drawLandmarks(ctx, landmarks, {
              color: "#FF0000",
              lineWidth: 1,
              radius: 3,
            });
          }
        } catch (error) {
          console.warn("Drawing error:", error);
        }
      }
    },
    [width, height]
  );

  // Handle MediaPipe results
  const handleResults = useCallback(
    (results: MediaPipeResults) => {
      try {
        // Update FPS
        const now = Date.now();
        fpsCounterRef.current.frames++;
        if (now - fpsCounterRef.current.lastTime >= 1000) {
          setFps(fpsCounterRef.current.frames);
          fpsCounterRef.current.frames = 0;
          fpsCounterRef.current.lastTime = now;
        }

        // Update hand count
        const handCount = results.multiHandLandmarks?.length || 0;
        setHandCount(handCount);

        // Draw results
        drawResults(results);

        // Call external callback
        if (
          results.multiHandLandmarks &&
          results.multiHandLandmarks.length > 0
        ) {
          detectSwipeGesture(results.multiHandLandmarks[0]);
        }
        if (onResults) {
          onResults(results);
        }
      } catch (error) {
        console.warn("Results handling error:", error);
      }
    },
    [onResults, drawResults]
  );

  // Initialize MediaPipe Hands
  const initializeHands = useCallback(async (): Promise<boolean> => {
    console.log("🔄 Attempting to initialize MediaPipe Hands...");

    if (!mediaPipeLoaded) {
      console.error("❌ MediaPipe not loaded - attempting to load now...");
      const loaded = await loadMediaPipe();
      if (!loaded) {
        setError("Failed to load MediaPipe libraries");
        return false;
      }
    }

    if (!(window as any).Hands) {
      console.error("❌ Hands constructor not available after loading");
      setError("MediaPipe Hands constructor not available");
      return false;
    }

    try {
      console.log("🔄 Creating Hands instance...");
      setLoadingProgress("Initializing hand detection...");

      const hands = new (window as any).Hands({
        locateFile: (file: string) => {
          const baseUrl = "https://cdn.jsdelivr.net/npm/@mediapipe/hands";
          console.log(`Loading MediaPipe file: ${baseUrl}/${file}`);
          return `${baseUrl}/${file}`;
        },
      });

      console.log("🔄 Setting Hands options...");
      hands.setOptions({
        maxNumHands: 2,
        modelComplexity: 1,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      console.log("🔄 Setting results callback...");
      hands.onResults(handleResults);

      handsRef.current = hands;
      console.log("✅ MediaPipe Hands initialized successfully");
      setLoadingProgress("Hand detection ready");
      return true;
    } catch (error: any) {
      console.error("❌ Failed to initialize Hands:", error);
      setError(`Hand detection initialization failed: ${error.message}`);
      setLoadingProgress(`Hands init failed: ${error.message}`);
      return false;
    }
  }, [mediaPipeLoaded, loadMediaPipe, handleResults]);

  // Initialize camera with fallback to getUserMedia
  const initializeCamera = useCallback(async (): Promise<boolean> => {
    console.log("🔄 Attempting to initialize camera...");

    if (!videoRef.current) {
      console.error("❌ Video element not available");
      setError("Video element not found");
      return false;
    }

    try {
      // Try MediaPipe Camera first if available
      if (mediaPipeLoaded && (window as any).Camera && handsRef.current) {
        console.log("🔄 Using MediaPipe Camera...");
        setLoadingProgress("Starting MediaPipe camera...");

        const camera = new (window as any).Camera(videoRef.current, {
          onFrame: async () => {
            if (
              handsRef.current &&
              videoRef.current &&
              videoRef.current.readyState >= 2
            ) {
              try {
                await handsRef.current.send({ image: videoRef.current });
              } catch (error) {
                console.warn("Frame processing error:", error);
              }
            }
          },
          width: width,
          height: height,
        });

        cameraRef.current = camera;
        await camera.start();
      } else {
        // Fallback to getUserMedia
        console.log("🔄 Using getUserMedia fallback...");
        setLoadingProgress("Starting camera with getUserMedia...");

        const constraints = [
          { video: { width: width, height: height, facingMode: "user" } },
          { video: { width: 640, height: 480, facingMode: "user" } },
          { video: { facingMode: "user" } },
          { video: true },
        ];

        let stream: MediaStream | null = null;

        for (const constraint of constraints) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraint);
            break;
          } catch (err) {
            console.warn("Constraint failed:", constraint, err);
            continue;
          }
        }

        if (!stream) {
          throw new Error("Could not access camera with any constraints");
        }

        streamRef.current = stream;
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // Wait for video to be ready
      console.log("🔄 Waiting for video to be ready...");
      setLoadingProgress("Waiting for video...");

      await new Promise<void>((resolve, reject) => {
        const video = videoRef.current!;
        const timeout = setTimeout(
          () => reject(new Error("Video ready timeout")),
          10000
        );

        const checkReady = () => {
          if (
            video.readyState >= 2 &&
            video.videoWidth > 0 &&
            video.videoHeight > 0
          ) {
            clearTimeout(timeout);
            setVideoReady(true);
            console.log(
              `✅ Video ready: ${video.videoWidth}x${video.videoHeight}`
            );
            resolve();
          } else {
            setTimeout(checkReady, 100);
          }
        };

        video.addEventListener("loadeddata", checkReady);
        video.addEventListener("canplay", checkReady);
        checkReady();
      });

      console.log("✅ Camera initialized successfully");
      setLoadingProgress("Camera ready");
      return true;
    } catch (error: any) {
      console.error("❌ Camera initialization failed:", error);
      setError(`Camera failed to start: ${error.message}`);
      setLoadingProgress(`Camera failed: ${error.message}`);
      return false;
    }
  }, [mediaPipeLoaded, width, height]);

  // Start the complete initialization process
  const startDetection = useCallback(async () => {
    if (typeof window === "undefined") return;
    if (cameraStatus === "initializing") return;

    console.log("🚀 Starting detection process...");
    setCameraStatus("initializing");
    setError(null);
    setRetryCount((prev) => prev + 1);

    try {
      const loaded = await loadMediaPipe();
      if (!loaded) {
        throw new Error(
          "Failed to load MediaPipe - switching to fallback mode"
        );
      }

      const handsInitialized = await initializeHands();
      if (!handsInitialized) {
        throw new Error("Failed to initialize hand detection");
      }

      const cameraInitialized = await initializeCamera();
      if (!cameraInitialized) {
        throw new Error("Failed to initialize camera");
      }

      setCameraStatus("active");
      setIsInitialized(true);
      setLoadingProgress("Detection active");
      onCameraStatus?.("active", "MediaPipe detection started successfully");
      console.log("✅ Detection started successfully");
    } catch (error: any) {
      console.error("❌ Failed to start detection:", error);
      setCameraStatus("error");
      setError(error.message);
      setLoadingProgress(`Error: ${error.message}`);
      onCameraStatus?.("error", error.message);

      // Retry
      if (retryCount < 2) {
        const delay = Math.min(2000 * Math.pow(2, retryCount), 8000);
        console.log(`Retrying in ${delay}ms... (attempt ${retryCount + 1}/2)`);
        retryTimeoutRef.current = setTimeout(() => {
          startDetection();
        }, delay);
      } else {
        console.log("Max retries reached - please try fallback mode");
        setError(
          "MediaPipe failed to load. Please try the Fallback tab for basic camera functionality."
        );
      }
    }
  }, [
    cameraStatus,
    retryCount,
    loadMediaPipe,
    initializeHands,
    initializeCamera,
    onCameraStatus,
  ]);

  // Stop detection and cleanup
  const stopDetection = useCallback(() => {
    console.log("🛑 Stopping detection...");

    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (cameraRef.current) {
      try {
        cameraRef.current.stop();
      } catch (error) {
        console.warn("Error stopping MediaPipe camera:", error);
      }
      cameraRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    setCameraStatus("idle");
    setIsInitialized(false);
    setVideoReady(false);
    setError(null);
    setFps(0);
    setHandCount(0);
    setRetryCount(0);
    setLoadingProgress("");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !isInitialized &&
      cameraStatus === "idle"
    ) {
      startDetection();
    }
  }, [isInitialized, cameraStatus, startDetection]);

  // Status icon
  const StatusIcon = () => {
    switch (cameraStatus) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "initializing":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Camera className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Control Panel */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <StatusIcon />
            MediaPipe Hands Detection
          </h3>
          <div className="flex gap-2">
            <Button
              onClick={startDetection}
              disabled={
                cameraStatus === "initializing" || cameraStatus === "active"
              }
              size="sm"
            >
              {cameraStatus === "initializing"
                ? "Starting..."
                : "Start Detection"}
            </Button>
            <Button
              onClick={stopDetection}
              disabled={cameraStatus === "idle"}
              variant="outline"
              size="sm"
            >
              Stop
            </Button>
          </div>
        </div>

        {/* Status Display */}
        <div className="flex items-center gap-4 mb-4">
          <Badge
            variant={
              cameraStatus === "active"
                ? "default"
                : cameraStatus === "error"
                ? "destructive"
                : "secondary"
            }
          >
            {cameraStatus.toUpperCase()}
          </Badge>
          <Badge variant="outline">FPS: {fps}</Badge>
          <Badge variant="outline">Hands: {handCount}</Badge>
          {retryCount > 0 && (
            <Badge variant="secondary">Retry: {retryCount}/2</Badge>
          )}
        </div>

        {/* Loading Progress */}
        {loadingProgress && cameraStatus === "initializing" && (
          <div className="mb-4">
            <p className="text-sm text-blue-600">{loadingProgress}</p>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
              {error.includes("MediaPipe failed") && (
                <div className="mt-2">
                  <p className="text-sm">
                    💡 Try switching to the "Fallback" tab for basic camera
                    functionality.
                  </p>
                </div>
              )}
            </AlertDescription>
          </Alert>
        )}
      </Card>

      {/* Video Display */}
      <Card className="p-4">
        <div
          className="relative bg-black rounded-lg overflow-hidden"
          style={{ aspectRatio: `${width}/${height}` }}
        >
          {/* Video Element */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            style={{ transform: "scaleX(-1)" }}
            playsInline
            muted
            autoPlay
          />

          {/* Canvas Overlay */}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ transform: "scaleX(-1)" }}
          />

          {/* Status Overlays */}
          {cameraStatus === "idle" && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
              <div className="text-center text-white">
                <Camera className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">MediaPipe Detection Ready</p>
                <p className="text-sm opacity-75">
                  Click "Start Detection" to begin
                </p>
              </div>
            </div>
          )}

          {cameraStatus === "initializing" && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-900/80">
              <div className="text-center text-white">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
                <p className="text-lg font-medium">Initializing MediaPipe...</p>
                <p className="text-sm opacity-75">{loadingProgress}</p>
                {retryCount > 0 && (
                  <p className="text-xs opacity-50 mt-2">
                    Retry attempt: {retryCount}/2
                  </p>
                )}
              </div>
            </div>
          )}

          {cameraStatus === "error" && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900/80">
              <div className="text-center text-white">
                <CameraOff className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg font-medium">MediaPipe Error</p>
                <p className="text-sm mb-4 max-w-xs">{error}</p>
                <div className="space-y-2">
                  <Button
                    onClick={startDetection}
                    size="sm"
                    variant="secondary"
                    disabled={retryCount >= 2}
                  >
                    {retryCount >= 2 ? "Max Retries Reached" : "Retry"}
                  </Button>
                  <p className="text-xs opacity-75">
                    Try the "Fallback" tab for basic camera
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Debug Overlay */}
          {showDebugOverlay && cameraStatus === "active" && (
            <div className="absolute top-2 left-2 bg-black/70 text-white p-2 rounded text-xs space-y-1">
              <div>Status: {cameraStatus}</div>
              <div>FPS: {fps}</div>
              <div>Hands: {handCount}</div>
              <div>Video Ready: {videoReady ? "✓" : "✗"}</div>
              <div>MediaPipe: {mediaPipeLoaded ? "✓" : "✗"}</div>
              <div>Initialized: {isInitialized ? "✓" : "✗"}</div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
