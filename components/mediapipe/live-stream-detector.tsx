"use client";

import { useRef, useEffect, useState, useCallback } from "react";

interface LiveStreamDetectorProps {
  onResults?: (results: any) => void;
  onCameraStatus?: (
    status: "active" | "inactive" | "error",
    message?: string
  ) => void;
  width?: number;
  height?: number;
}

export function LiveStreamDetector({
  onResults,
  onCameraStatus,
  width = 640,
  height = 480,
}: LiveStreamDetectorProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastXRef = useRef<number | null>(null);
  const gestureCooldownRef = useRef<number>(0);

  const detectSwipeGesture = (
    ctx: CanvasRenderingContext2D
  ): "next" | "prev" | "none" => {
    const frame = ctx.getImageData(
      0,
      0,
      canvasRef.current!.width,
      canvasRef.current!.height
    );
    let handXSum = 0;
    let count = 0;
    for (let i = 0; i < frame.data.length; i += 4 * 40) {
      const r = frame.data[i];
      const g = frame.data[i + 1];
      const b = frame.data[i + 2];
      const brightness = (r + g + b) / 3;
      if (brightness > 100) {
        const x = (i / 4) % frame.width;
        handXSum += x;
        count++;
      }
    }
    if (count < 10) return "none";

    const avgX = handXSum / count;
    const lastX = lastXRef.current;
    lastXRef.current = avgX;

    if (gestureCooldownRef.current > 0) {
      gestureCooldownRef.current--;
      return "none";
    }

    if (lastX !== null) {
      const delta = avgX - lastX;
      if (Math.abs(delta) > 50) {
        gestureCooldownRef.current = 20;
        return delta > 0 ? "next" : "prev";
      }
    }

    return "none";
  };

  const processFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState < 2) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (
      canvas.width !== video.videoWidth ||
      canvas.height !== video.videoHeight
    ) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const gesture = detectSwipeGesture(ctx);
    if (gesture !== "none") {
      console.log("🧠 Gesture detected:", gesture);
      onResults?.({ gesture });
    }

    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [onResults]);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        videoRef.current.onloadeddata = () => {
          videoRef.current?.play();
          processFrame();
        };
        onCameraStatus?.("active");
      }
    } catch (error: any) {
      onCameraStatus?.("error", error.message);
    }
  }, [processFrame, onCameraStatus]);

  useEffect(() => {
    startCamera();
    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
      streamRef.current?.getTracks().forEach((track) => track.stop());
    };
  }, [startCamera]);

  return (
    <div>
      <video
        ref={videoRef}
        style={{ display: "none" }}
        playsInline
        muted
        autoPlay
      />
      <canvas ref={canvasRef} style={{ display: "none" }} />
    </div>
  );
}
LiveStreamDetector.displayName = "LiveStreamDetector";
export default LiveStreamDetector;
// export { LiveStreamDetector };
