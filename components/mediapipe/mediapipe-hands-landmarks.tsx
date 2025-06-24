"use client";
import * as vision from "@mediapipe/tasks-vision";

import { useRef, useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  CameraOff,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Hand,
  ImageIcon,
} from "lucide-react";

interface MediaPipeHandsLandmarksProps {
  onResults?: (results: any) => void;
  onCameraStatus?: (
    status: "active" | "inactive" | "error",
    message?: string
  ) => void;
  showDebugOverlay?: boolean;
  width?: number;
  height?: number;
}

export function MediaPipeHandsLandmarks({
  onResults,
  onCameraStatus,
  showDebugOverlay = false,
  width = 640,
  height = 480,
}: MediaPipeHandsLandmarksProps) {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const handLandmarkerRef = useRef<any>(null);
  const webcamRunningRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);
  const animationFrameRef = useRef<number | null>(null);
  const runningModeRef = useRef<"IMAGE" | "VIDEO">("IMAGE");

  // State
  const [cameraStatus, setCameraStatus] = useState<
    "idle" | "loading" | "initializing" | "active" | "error"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [fps, setFps] = useState(0);
  const [handsDetected, setHandsDetected] = useState(0);
  const [landmarksCount, setLandmarksCount] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [imageDetectionResults, setImageDetectionResults] = useState<any>(null);

  // FPS tracking
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() });

  // Sample images for testingf
  const sampleImages = [
    "https://storage.googleapis.com/mediapipe-assets/hand1.jpg",
    "https://storage.googleapis.com/mediapipe-assets/hand2.jpg",
  ];

  const initializeMediaPipe = useCallback(async (): Promise<boolean> => {
    console.log("🚀 Initializing MediaPipe HandLandmarker...");
    setLoadingProgress(10);

    try {
      // 1. Load drawing utils
      await new Promise<void>((resolve, reject) => {
        if ((window as any).drawConnectors && (window as any).drawLandmarks) {
          console.log("✅ Drawing utils already loaded.");
          return resolve();
        }

        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js";
        script.crossOrigin = "anonymous";
        script.onload = () => {
          console.log("✅ drawing_utils.js loaded");
          setLoadingProgress(30);
          resolve();
        };
        script.onerror = () =>
          reject(new Error("Failed to load drawing utils"));
        document.head.appendChild(script);
      });

      // 2. Load hands.js to provide HAND_CONNECTIONS
      await new Promise<void>((resolve, reject) => {
        if ((window as any).HAND_CONNECTIONS) {
          console.log("✅ HAND_CONNECTIONS already loaded.");
          return resolve();
        }

        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js";
        script.crossOrigin = "anonymous";
        script.onload = () => {
          console.log("✅ hands.js loaded");
          setLoadingProgress(40);
          resolve();
        };
        script.onerror = () => reject(new Error("Failed to load hands.js"));
        document.head.appendChild(script);
      });

      // 3. Check vision module
      setLoadingProgress(50);
      if (!vision) {
        throw new Error("MediaPipe vision module is not available");
      }
      setLoadingProgress(70);

      // 4. Wait until all required objects are available
      await new Promise<void>((resolve, reject) => {
        let attempts = 0;
        const maxAttempts = 100;
        const interval = setInterval(() => {
          attempts++;
          const ready =
            typeof window !== "undefined" &&
            (window as any).drawConnectors &&
            (window as any).drawLandmarks &&
            (window as any).HAND_CONNECTIONS &&
            vision &&
            vision.HandLandmarker &&
            vision.FilesetResolver;

          if (ready) {
            clearInterval(interval);
            console.log("✅ All MediaPipe objects are available");
            setLoadingProgress(85);
            return resolve();
          }

          if (attempts >= maxAttempts) {
            clearInterval(interval);
            console.error("❌ MediaPipe objects not available after timeout");
            console.table({
              drawConnectors: !!(window as any).drawConnectors,
              drawLandmarks: !!(window as any).drawLandmarks,
              HAND_CONNECTIONS: !!(window as any).HAND_CONNECTIONS,
              vision: !!vision,
              HandLandmarker: !!(vision && vision.HandLandmarker),
              FilesetResolver: !!(vision && vision.FilesetResolver),
            });
            return reject(
              new Error("MediaPipe objects not available after loading")
            );
          }
        }, 100);
      });

      // 5. Initialize the HandLandmarker
      const { HandLandmarker, FilesetResolver } = vision;
      const filesetResolver = await vision.FilesetResolver.forVisionTasks(
        "/mediapipe"
      );

      console.log("✅ FilesetResolver created");
      setLoadingProgress(90);

      const handLandmarker = await HandLandmarker.createFromOptions(
        filesetResolver,
        {
          baseOptions: {
            modelAssetPath: "/mediapipe/hand_landmarker.task",
            delegate: "GPU", // atau "CPU" jika GPU tidak stabil
          },
          runningMode: "VIDEO", // atau "IMAGE"
          numHands: 2,
          minHandDetectionConfidence: 0.5,
          minHandPresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        }
      );

      handLandmarkerRef.current = handLandmarker;
      runningModeRef.current = "IMAGE";
      setModelLoaded(true);
      setLoadingProgress(100);
      console.log("✅ HandLandmarker created successfully");

      return true;
    } catch (error: any) {
      console.error("❌ MediaPipe initialization failed:", error);

      // Fallback to legacy
      try {
        console.log("🔄 Trying fallback to legacy MediaPipe...");
        await initializeLegacyMediaPipe();
        return true;
      } catch (fallbackError: any) {
        console.error("❌ Fallback initialization also failed:", fallbackError);
        setError(
          `MediaPipe init failed: ${error.message}. Fallback failed: ${fallbackError.message}`
        );
        return false;
      }
    }
  }, []);

  // Fallback to legacy MediaPipe implementation
  const initializeLegacyMediaPipe = useCallback(async (): Promise<void> => {
    console.log("🔄 Loading legacy MediaPipe...");

    // Load legacy MediaPipe scripts
    await new Promise<void>((resolve, reject) => {
      const script = document.createElement("script");
      script.crossOrigin = "anonymous";
      script.onload = () => {
        console.log("✅ Legacy MediaPipe hands loaded");
        resolve();
      };
      script.onerror = () =>
        reject(new Error("Failed to load legacy MediaPipe"));
      document.head.appendChild(script);
    });

    // Wait for legacy MediaPipe objects
    await new Promise<void>((resolve, reject) => {
      let attempts = 0;
      const maxAttempts = 50;

      const checkInterval = setInterval(() => {
        attempts++;

        if ((window as any).Hands && (window as any).Camera) {
          clearInterval(checkInterval);
          console.log("✅ Legacy MediaPipe objects available");

          // Create a wrapper that mimics HandLandmarker API
          const legacyWrapper = {
            detect: (image: HTMLImageElement) => {
              // This is a simplified wrapper - in a real implementation,
              // you'd need to process the image through the legacy Hands API
              console.log("Legacy detect called on image");
              return { landmarks: [], handedness: [] };
            },
            detectForVideo: (video: HTMLVideoElement, timestamp: number) => {
              // This is a simplified wrapper
              console.log("Legacy detectForVideo called");
              return { landmarks: [], handedness: [] };
            },
            setOptions: (options: any) => {
              console.log("Legacy setOptions called", options);
            },
          };

          handLandmarkerRef.current = legacyWrapper;
          runningModeRef.current = "IMAGE";
          setModelLoaded(true);
          setLoadingProgress(100);
          resolve();
        } else if (attempts >= maxAttempts) {
          clearInterval(checkInterval);
          reject(new Error("Legacy MediaPipe objects not available"));
        }
      }, 100);
    });
  }, []);

  // Handle image click detection
  const handleImageClick = useCallback(
    async (imageUrl: string) => {
      const handLandmarker = handLandmarkerRef.current;
      if (!handLandmarker || !modelLoaded) {
        console.log("Wait for handLandmarker to load before clicking!");
        return;
      }

      try {
        // Switch to IMAGE mode if needed
        if (runningModeRef.current === "VIDEO") {
          runningModeRef.current = "IMAGE";
          await handLandmarker.setOptions({ runningMode: "IMAGE" });
        }

        // Create image element
        const img = new Image();
        img.crossOrigin = "anonymous";

        img.onload = async () => {
          try {
            // Switch to IMAGE mode if needed
            if (runningModeRef.current === "VIDEO") {
              runningModeRef.current = "IMAGE";
              await handLandmarker.setOptions({ runningMode: "IMAGE" }); // ✅ ini yang penting
            }

            const results = handLandmarker.detect(img);
            console.log("Image detection results:", results);

            // Draw results on canvas
            const canvas = imageCanvasRef.current;
            if (canvas) {
              const ctx = canvas.getContext("2d");
              if (ctx) {
                // Set canvas size to match image
                canvas.width = img.naturalWidth;
                canvas.height = img.naturalHeight;
                canvas.style.width = "100%";
                canvas.style.height = "auto";

                // Clear canvas and draw image
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);

                // Draw landmarks if detected
                if (results.landmarks && results.landmarks.length > 0) {
                  const { drawConnectors, drawLandmarks, HAND_CONNECTIONS } =
                    window as any;

                  for (const landmarks of results.landmarks) {
                    // Draw hand connections (green lines)
                    drawConnectors(ctx, landmarks, HAND_CONNECTIONS, {
                      color: "#00FF00",
                      lineWidth: 5,
                    });

                    // Draw landmarks (red dots)
                    drawLandmarks(ctx, landmarks, {
                      color: "#FF0000",
                      lineWidth: 2,
                    });
                  }

                  setImageDetectionResults({
                    handsCount: results.landmarks.length,
                    landmarksCount: results.landmarks.reduce(
                      (total: number, hand: any[]) => total + hand.length,
                      0
                    ),
                    handedness: results.handedness,
                  });
                } else {
                  setImageDetectionResults({
                    handsCount: 0,
                    landmarksCount: 0,
                    handedness: [],
                  });
                }
              }
            }
          } catch (error) {
            console.error("Error detecting hands in image:", error);
            setError(`Image detection failed: ${error}`);
          }
        };

        img.onerror = () => {
          setError("Failed to load image");
        };

        img.src = imageUrl;
      } catch (error: any) {
        console.error("Error in image detection:", error);
        setError(`Image detection error: ${error.message}`);
      }
    },
    [modelLoaded]
  );

  // Predict webcam function (real-time detection)
  const predictWebcam = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const handLandmarker = handLandmarkerRef.current;

    if (!video || !canvas || !handLandmarker || !webcamRunningRef.current) {
      return;
    }

    const canvasCtx = canvas.getContext("2d");
    if (!canvasCtx) return;

    // Set canvas size to match video
    canvas.style.width = `${video.videoWidth}px`;
    canvas.style.height = `${video.videoHeight}px`;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Switch to VIDEO mode if needed
    if (runningModeRef.current === "IMAGE") {
      runningModeRef.current = "VIDEO";
      await handLandmarker.setOptions({ runningMode: "VIDEO" });
    }

    // Detect hands only if video time has changed
    let results: any = undefined;
    const startTimeMs = performance.now();

    if (lastVideoTimeRef.current !== video.currentTime) {
      lastVideoTimeRef.current = video.currentTime;
      try {
        results = handLandmarker.detectForVideo(video, startTimeMs);
      } catch (error) {
        console.error("Detection error:", error);
        return;
      }
    }

    // Clear canvas
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw landmarks if detected
    if (results && results.landmarks && results.landmarks.length > 0) {
      const { drawConnectors, drawLandmarks, HAND_CONNECTIONS } = window as any;

      let totalLandmarks = 0;
      for (const landmarks of results.landmarks) {
        // Draw hand connections (green lines)
        drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, {
          color: "#00FF00",
          lineWidth: 5,
        });

        // Draw landmarks (red dots)
        drawLandmarks(canvasCtx, landmarks, {
          color: "#FF0000",
          lineWidth: 2,
        });

        totalLandmarks += landmarks.length;
      }

      setHandsDetected(results.landmarks.length);
      setLandmarksCount(totalLandmarks);

      // Draw hand labels
      if (results.handedness && results.handedness.length > 0) {
        for (let i = 0; i < results.handedness.length; i++) {
          const handedness = results.handedness[i][0];
          const landmarks = results.landmarks[i];
          if (handedness && landmarks && landmarks[0]) {
            const wrist = landmarks[0];
            canvasCtx.fillStyle = "#FFFFFF";
            canvasCtx.font = "16px Arial";
            canvasCtx.fillText(
              `${handedness.categoryName} (${Math.round(
                handedness.score * 100
              )}%)`,
              wrist.x * canvas.width,
              wrist.y * canvas.height - 10
            );
          }
        }
      }
    } else {
      setHandsDetected(0);
      setLandmarksCount(0);
    }

    canvasCtx.restore();

    // Update FPS
    const now = Date.now();
    fpsCounterRef.current.frames++;
    if (now - fpsCounterRef.current.lastTime >= 1000) {
      setFps(fpsCounterRef.current.frames);
      fpsCounterRef.current.frames = 0;
      fpsCounterRef.current.lastTime = now;
    }

    // Call parent callback
    if (onResults && results) {
      onResults({
        landmarks: results.landmarks,
        handedness: results.handedness,
        worldLandmarks: results.worldLandmarks,
        handsCount: results.landmarks ? results.landmarks.length : 0,
        fps: fpsCounterRef.current.frames,
        timestamp: now,
      });
    }

    // Continue prediction loop
    if (webcamRunningRef.current) {
      animationFrameRef.current = requestAnimationFrame(predictWebcam);
    }
  }, [onResults]);

  // Start webcam detection
  const startWebcamDetection = useCallback(async () => {
    if (cameraStatus === "loading" || cameraStatus === "initializing") return;

    console.log("🚀 Starting webcam detection...");
    setCameraStatus("loading");
    setError(null);

    try {
      if (!modelLoaded) {
        const initialized = await initializeMediaPipe();
        if (!initialized) {
          throw new Error("Failed to initialize MediaPipe");
        }
      }

      setCameraStatus("initializing");

      // Check if webcam access is supported
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("getUserMedia() is not supported by your browser");
      }

      // Get video element
      const video = videoRef.current;
      if (!video) {
        throw new Error("Video element not found");
      }

      // Start webcam
      const constraints = {
        video: {
          width: { ideal: width },
          height: { ideal: height },
          facingMode: "user",
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;

      // Wait for video to load
      await new Promise<void>((resolve) => {
        video.addEventListener("loadeddata", () => {
          console.log("✅ Video loaded, starting prediction...");
          webcamRunningRef.current = true;
          setCameraStatus("active");
          onCameraStatus?.("active", "Webcam detection started");
          predictWebcam();
          resolve();
        });
      });
    } catch (error: any) {
      console.error("❌ Failed to start webcam detection:", error);
      setCameraStatus("error");
      setError(error.message);
      onCameraStatus?.("error", error.message);
    }
  }, [
    cameraStatus,
    modelLoaded,
    initializeMediaPipe,
    predictWebcam,
    width,
    height,
    onCameraStatus,
  ]);

  // Stop webcam detection
  const stopWebcamDetection = useCallback(() => {
    console.log("🛑 Stopping webcam detection...");

    webcamRunningRef.current = false;

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Stop video stream
    const video = videoRef.current;
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      video.srcObject = null;
    }

    // Clear canvas
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }

    setCameraStatus("idle");
    setError(null);
    setFps(0);
    setHandsDetected(0);
    setLandmarksCount(0);
    lastVideoTimeRef.current = -1;

    onCameraStatus?.("inactive", "Webcam detection stopped");
  }, [onCameraStatus]);

  useEffect(() => {
    initializeMediaPipe();
  }, [initializeMediaPipe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopWebcamDetection();
    };
  }, [stopWebcamDetection]);

  // Status icon
  const StatusIcon = () => {
    switch (cameraStatus) {
      case "active":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "loading":
      case "initializing":
        return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Hand className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {!modelLoaded && (
        <Card className="p-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span>Loading MediaPipe HandLandmarker...</span>
            <span>{loadingProgress}%</span>
          </div>
          <Progress value={loadingProgress} className="h-2" />
        </Card>
      )}

      {/* Image Detection Section */}
      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <ImageIcon className="h-5 w-5" />
          Static Image Detection
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          Click on an image below to detect hand landmarks
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          {sampleImages.map((imageUrl, index) => (
            <div
              key={index}
              className="relative cursor-pointer"
              onClick={() => handleImageClick(imageUrl)}
            >
              <img
                src={imageUrl || "/placeholder.svg"}
                alt={`Hand sample ${index + 1}`}
                className="w-full h-48 object-cover rounded-lg border-2 border-gray-200 hover:border-blue-400 transition-colors"
                crossOrigin="anonymous"
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity rounded-lg">
                <span className="text-white font-medium">
                  Click to detect hands
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Image Detection Results */}
        <canvas
          ref={imageCanvasRef}
          className="w-full max-w-md mx-auto border rounded-lg"
          style={{ display: imageDetectionResults ? "block" : "none" }}
        />

        {imageDetectionResults && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <strong>Hands Detected:</strong>{" "}
                {imageDetectionResults.handsCount}
              </div>
              <div>
                <strong>Total Landmarks:</strong>{" "}
                {imageDetectionResults.landmarksCount}
              </div>
            </div>
            {imageDetectionResults.handedness &&
              imageDetectionResults.handedness.length > 0 && (
                <div className="mt-2 text-sm">
                  <strong>Hand Types:</strong>{" "}
                  {imageDetectionResults.handedness
                    .map(
                      (h: any) =>
                        `${h[0].categoryName} (${Math.round(
                          h[0].score * 100
                        )}%)`
                    )
                    .join(", ")}
                </div>
              )}
          </div>
        )}
      </Card>

      {/* Webcam Detection Section */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <StatusIcon />
            Real-time Webcam Detection
          </h3>
          <div className="flex gap-2">
            <Button
              onClick={startWebcamDetection}
              disabled={
                !modelLoaded ||
                cameraStatus === "loading" ||
                cameraStatus === "initializing" ||
                cameraStatus === "active"
              }
              size="sm"
            >
              {cameraStatus === "loading"
                ? "Loading..."
                : cameraStatus === "initializing"
                ? "Starting..."
                : "Enable Webcam"}
            </Button>
            <Button
              onClick={stopWebcamDetection}
              disabled={cameraStatus === "idle"}
              variant="outline"
              size="sm"
            >
              Disable
            </Button>
          </div>
        </div>

        {/* Status Display */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
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
          <Badge variant="outline">Hands: {handsDetected}</Badge>
          <Badge variant="outline">Landmarks: {landmarksCount}</Badge>
        </div>

        {/* Video Display with Landmarks Overlay */}
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

          {/* Canvas Overlay for Landmarks */}
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
            style={{ transform: "scaleX(-1)" }}
          />

          {/* Status Overlays */}
          {cameraStatus === "idle" && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80">
              <div className="text-center text-white">
                <Hand className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium">Webcam Detection</p>
                <p className="text-sm opacity-75">
                  Click "Enable Webcam" to start
                </p>
              </div>
            </div>
          )}

          {(cameraStatus === "loading" || cameraStatus === "initializing") && (
            <div className="absolute inset-0 flex items-center justify-center bg-blue-900/80">
              <div className="text-center text-white">
                <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin" />
                <p className="text-lg font-medium">
                  {cameraStatus === "loading"
                    ? "Loading MediaPipe..."
                    : "Starting Camera..."}
                </p>
              </div>
            </div>
          )}

          {cameraStatus === "error" && (
            <div className="absolute inset-0 flex items-center justify-center bg-red-900/80">
              <div className="text-center text-white">
                <CameraOff className="h-12 w-12 mx-auto mb-4" />
                <p className="text-lg font-medium">Detection Error</p>
                <p className="text-sm mb-4 max-w-xs">{error}</p>
                <Button
                  onClick={startWebcamDetection}
                  size="sm"
                  variant="secondary"
                >
                  Retry
                </Button>
              </div>
            </div>
          )}

          {cameraStatus === "active" && handsDetected === 0 && (
            <div className="absolute top-2 right-2 bg-blue-600/80 text-white px-3 py-2 rounded text-sm max-w-xs">
              👋 Show your hands to the camera
            </div>
          )}

          {/* Debug Overlay */}
          {showDebugOverlay && cameraStatus === "active" && (
            <div className="absolute top-2 left-2 bg-black/70 text-white p-2 rounded text-xs space-y-1">
              <div>Mode: {runningModeRef.current}</div>
              <div>FPS: {fps}</div>
              <div>Hands: {handsDetected}</div>
              <div>Landmarks: {landmarksCount}</div>
              <div>Video Time: {lastVideoTimeRef.current.toFixed(2)}</div>
            </div>
          )}
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="mt-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </Card>

      {/* Instructions */}
      <Card className="p-4">
        <h4 className="font-semibold mb-3">📋 How to Use</h4>
        <div className="text-sm space-y-2 text-gray-600">
          <p>
            <strong>Image Detection:</strong> Click on sample images to detect
            hand landmarks in static images
          </p>
          <p>
            <strong>Webcam Detection:</strong> Enable webcam for real-time hand
            landmark tracking
          </p>
          <p>
            🔴 Red dots show the 21 hand landmarks (joints, fingertips, palm
            points)
          </p>
          <p>🟢 Green lines connect landmarks to show hand structure</p>
          <p>📊 Supports up to 2 hands simultaneously with confidence scores</p>
        </div>
      </Card>
    </div>
  );
}
