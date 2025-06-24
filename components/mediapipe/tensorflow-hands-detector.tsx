"use client";

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
} from "lucide-react";

interface TensorFlowHandsDetectorProps {
  onResults?: (results: any) => void;
  onCameraStatus?: (
    status: "active" | "inactive" | "error",
    message?: string
  ) => void;
  showDebugOverlay?: boolean;
  width?: number;
  height?: number;
}

interface HandPrediction {
  handInViewConfidence: number;
  landmarks: Array<[number, number, number]>;
  boundingBox: {
    topLeft: [number, number];
    bottomRight: [number, number];
  };
}

export function TensorFlowHandsDetector({
  onResults,
  onCameraStatus,
  showDebugOverlay = false,
  width = 640,
  height = 480,
}: TensorFlowHandsDetectorProps) {
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<any>(null);
  const webcamRunningRef = useRef(false);
  const animationFrameRef = useRef<number | null>(null);

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

  // FPS tracking
  const fpsCounterRef = useRef({ frames: 0, lastTime: Date.now() });

  // Hand landmark connections (similar to MediaPipe)
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
  ];

  // Load TensorFlow.js and HandPose model
  const loadTensorFlowModel = useCallback(async (): Promise<boolean> => {
    console.log("🚀 Loading TensorFlow.js HandPose model...");
    setLoadingProgress(10);

    try {
      // Load TensorFlow.js
      console.log("📦 Loading TensorFlow.js...");
      await new Promise<void>((resolve, reject) => {
        if ((window as any).tf) {
          resolve();
          return;
        }

        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.10.0/dist/tf.min.js";
        script.onload = () => {
          console.log("✅ TensorFlow.js loaded");
          setLoadingProgress(40);
          resolve();
        };
        script.onerror = () =>
          reject(new Error("Failed to load TensorFlow.js"));
        document.head.appendChild(script);
      });

      // Load HandPose model
      console.log("📦 Loading HandPose model...");
      await new Promise<void>((resolve, reject) => {
        if ((window as any).handpose) {
          resolve();
          return;
        }

        const script = document.createElement("script");
        script.src =
          "https://cdn.jsdelivr.net/npm/@tensorflow-models/handpose@0.0.7/dist/handpose.min.js";
        script.onload = () => {
          console.log("✅ HandPose model loaded");
          setLoadingProgress(70);
          resolve();
        };
        script.onerror = () =>
          reject(new Error("Failed to load HandPose model"));
        document.head.appendChild(script);
      });

      // Initialize the model
      console.log("🤖 Initializing HandPose model...");
      const handpose = (window as any).handpose;
      const model = await handpose.load();
      modelRef.current = model;
      setModelLoaded(true);
      setLoadingProgress(100);

      console.log("✅ HandPose model initialized successfully");
      return true;
    } catch (error: any) {
      console.error("❌ Failed to load TensorFlow model:", error);
      setError(`TensorFlow initialization failed: ${error.message}`);
      return false;
    }
  }, []);

  // Draw hand landmarks and connections
  const drawHands = useCallback(
    (predictions: HandPrediction[]) => {
      const canvas = canvasRef.current;
      const video = videoRef.current;

      if (!canvas || !video) return;

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (predictions.length > 0) {
        let totalLandmarks = 0;

        predictions.forEach((prediction, handIndex) => {
          const landmarks = prediction.landmarks;
          totalLandmarks += landmarks.length;

          // Draw hand connections (green lines)
          ctx.strokeStyle = "#00FF00";
          ctx.lineWidth = 2;
          ctx.beginPath();

          HAND_CONNECTIONS.forEach(([start, end]) => {
            if (landmarks[start] && landmarks[end]) {
              const startPoint = landmarks[start];
              const endPoint = landmarks[end];

              ctx.moveTo(startPoint[0], startPoint[1]);
              ctx.lineTo(endPoint[0], endPoint[1]);
            }
          });
          ctx.stroke();

          // Draw landmarks (red dots)
          ctx.fillStyle = "#FF0000";
          landmarks.forEach((landmark, i) => {
            const [x, y] = landmark;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();

            // Draw landmark numbers in debug mode
            if (showDebugOverlay) {
              ctx.fillStyle = "#FFFFFF";
              ctx.font = "10px Arial";
              ctx.fillText(i.toString(), x + 5, y - 5);
              ctx.fillStyle = "#FF0000";
            }
          });

          // Draw hand label
          if (landmarks[0]) {
            const wrist = landmarks[0];
            ctx.fillStyle = "#FFFFFF";
            ctx.font = "16px Arial";
            ctx.fillText(
              `Hand ${handIndex + 1} (${Math.round(
                prediction.handInViewConfidence * 100
              )}%)`,
              wrist[0],
              wrist[1] - 10
            );
          }

          // Draw bounding box in debug mode
          if (showDebugOverlay && prediction.boundingBox) {
            const { topLeft, bottomRight } = prediction.boundingBox;
            ctx.strokeStyle = "#FFFF00";
            ctx.lineWidth = 2;
            ctx.strokeRect(
              topLeft[0],
              topLeft[1],
              bottomRight[0] - topLeft[0],
              bottomRight[1] - topLeft[1]
            );
          }
        });

        setHandsDetected(predictions.length);
        setLandmarksCount(totalLandmarks);
      } else {
        setHandsDetected(0);
        setLandmarksCount(0);
      }
    },
    [showDebugOverlay]
  );

  // Prediction loop
  const detectHands = useCallback(async () => {
    const video = videoRef.current;
    const model = modelRef.current;

    if (!video || !model || !webcamRunningRef.current) {
      return;
    }

    try {
      // Make predictions
      const predictions = await model.estimateHands(video);

      // Draw results
      drawHands(predictions);

      // Update FPS
      const now = Date.now();
      fpsCounterRef.current.frames++;
      if (now - fpsCounterRef.current.lastTime >= 1000) {
        setFps(fpsCounterRef.current.frames);
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.lastTime = now;
      }

      // Call parent callback
      if (onResults) {
        onResults({
          predictions,
          handsCount: predictions.length,
          fps: fpsCounterRef.current.frames,
          timestamp: now,
        });
      }
    } catch (error) {
      console.error("Detection error:", error);
    }

    // Continue detection loop
    if (webcamRunningRef.current) {
      animationFrameRef.current = requestAnimationFrame(detectHands);
    }
  }, [drawHands, onResults]);

  // Start detection
  const startDetection = useCallback(async () => {
    if (cameraStatus === "loading" || cameraStatus === "initializing") return;

    console.log("🚀 Starting TensorFlow HandPose detection...");
    setCameraStatus("loading");
    setError(null);
    setLoadingProgress(0);

    try {
      // Load TensorFlow model
      const modelLoaded = await loadTensorFlowModel();
      if (!modelLoaded) {
        throw new Error("Failed to load TensorFlow model");
      }

      setCameraStatus("initializing");

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
          console.log("✅ Video loaded, starting detection...");
          webcamRunningRef.current = true;
          setCameraStatus("active");
          onCameraStatus?.("active", "TensorFlow HandPose detection started");

          // Start detection loop
          detectHands();
          resolve();
        });
      });
    } catch (error: any) {
      console.error("❌ Failed to start detection:", error);
      setCameraStatus("error");
      setError(error.message);
      onCameraStatus?.("error", error.message);
    }
  }, [
    cameraStatus,
    loadTensorFlowModel,
    detectHands,
    width,
    height,
    onCameraStatus,
  ]);

  // Stop detection
  const stopDetection = useCallback(() => {
    console.log("🛑 Stopping TensorFlow HandPose detection...");

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
    setLoadingProgress(0);

    onCameraStatus?.("inactive", "Detection stopped");
  }, [onCameraStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

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
    <div className="space-y-4">
      {/* Control Panel */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <StatusIcon />
            TensorFlow HandPose Detection
          </h3>
          <div className="flex gap-2">
            <Button
              onClick={startDetection}
              disabled={
                cameraStatus === "loading" ||
                cameraStatus === "initializing" ||
                cameraStatus === "active"
              }
              size="sm"
            >
              {cameraStatus === "loading"
                ? "Loading Model..."
                : cameraStatus === "initializing"
                ? "Starting Camera..."
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

        {/* Loading Progress */}
        {(cameraStatus === "loading" || cameraStatus === "initializing") && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span>
                {cameraStatus === "loading"
                  ? "Loading TensorFlow model..."
                  : "Initializing camera..."}
              </span>
              <span>{loadingProgress}%</span>
            </div>
            <Progress value={loadingProgress} className="h-2" />
          </div>
        )}

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

        {/* Model Status */}
        <div className="flex items-center justify-between text-sm mb-4">
          <span>TensorFlow Model:</span>
          <span className={modelLoaded ? "text-green-600" : "text-gray-500"}>
            {modelLoaded ? "✅ Loaded" : "⏳ Not loaded"}
          </span>
        </div>

        {/* Detection Status */}
        {cameraStatus === "active" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Hand Detection:</span>
              <span
                className={
                  handsDetected > 0 ? "text-green-600" : "text-gray-500"
                }
              >
                {handsDetected > 0
                  ? `${handsDetected} hand(s) detected`
                  : "No hands detected"}
              </span>
            </div>
            {handsDetected > 0 && (
              <div className="text-sm text-green-600">
                ✋ Tracking {landmarksCount} landmarks across {handsDetected}{" "}
                hand(s)
              </div>
            )}
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {error}
              <div className="mt-2 text-xs text-gray-600">
                <p>💡 Try these solutions:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Check your internet connection</li>
                  <li>Try a different browser (Chrome/Edge work best)</li>
                  <li>Disable ad blockers temporarily</li>
                  <li>Ensure you're using HTTPS</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}
      </Card>

      {/* Video Display with Landmarks Overlay */}
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
                <p className="text-lg font-medium">
                  TensorFlow HandPose Detection
                </p>
                <p className="text-sm opacity-75">
                  Click "Start Detection" to begin
                </p>
                <p className="text-xs opacity-50 mt-2">
                  Real hand landmark tracking
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
                    ? "Loading TensorFlow..."
                    : "Starting Camera..."}
                </p>
                <p className="text-sm opacity-75">
                  {loadingProgress}% complete
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
                <Button onClick={startDetection} size="sm" variant="secondary">
                  Retry
                </Button>
              </div>
            </div>
          )}

          {cameraStatus === "active" && (
            <div className="absolute bottom-2 left-2 bg-green-600/80 text-white px-2 py-1 rounded text-xs">
              🤖 TensorFlow Active - {handsDetected} hands detected
            </div>
          )}

          {/* Instructions Overlay */}
          {cameraStatus === "active" && handsDetected === 0 && (
            <div className="absolute top-2 right-2 bg-blue-600/80 text-white px-3 py-2 rounded text-sm max-w-xs">
              👋 Show your hands to the camera to see landmarks
            </div>
          )}

          {/* Debug Overlay */}
          {showDebugOverlay && cameraStatus === "active" && (
            <div className="absolute top-2 left-2 bg-black/70 text-white p-2 rounded text-xs space-y-1">
              <div>Status: {cameraStatus}</div>
              <div>FPS: {fps}</div>
              <div>Hands: {handsDetected}</div>
              <div>Landmarks: {landmarksCount}</div>
              <div>Model: {modelLoaded ? "✓" : "✗"}</div>
              <div>Running: {webcamRunningRef.current ? "Yes" : "No"}</div>
            </div>
          )}
        </div>
      </Card>

      {/* Instructions */}
      <Card className="p-4">
        <h4 className="font-semibold mb-3">📋 How to Use</h4>
        <div className="text-sm space-y-2 text-gray-600">
          <p>1. Click "Start Detection" to load TensorFlow HandPose model</p>
          <p>2. Allow camera permissions when prompted</p>
          <p>3. Show your hands to the camera</p>
          <p>
            4. Watch the red dots (landmarks) and green lines (connections)
            appear on your hands
          </p>
          <p>5. Move your hands to see real-time tracking</p>
          <p>6. Each hand shows 21 landmarks with confidence scores</p>
        </div>
      </Card>
    </div>
  );
}
