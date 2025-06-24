"use client";

import { useState, useCallback, useEffect } from "react";
import { useMediaControl } from "@/hooks/use-media-control";
import { useSpeechToText } from "@/hooks/use-speech-to-text";
import { useAuth } from "@/hooks/use-auth";
import { usePresentation } from "@/hooks/use-presentation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RobustCamera } from "@/components/presentation/robust-camera";
import { Captions } from "@/components/presentation/captions";
import { Slide } from "@/components/presentation/slide";
import { ControlPanel } from "@/components/presentation/control-panel";
import { GestureGuide } from "@/components/presentation/gesture-guide";
import { useToast } from "@/hooks/use-toast";
import type { GestureType } from "@/hooks/use-gesture-detection";
import { LiveStreamDetector } from "@/components/mediapipe/live-stream-detector";

import {
  Camera,
  CameraOff,
  Mic,
  MicOff,
  Bug,
  TestTube,
  Play,
  Pause,
} from "lucide-react";

export default function PresentationViewer() {
  const [webcamEnabled, setWebcamEnabled] = useState(false);
  const [captionsEnabled, setCaptionsEnabled] = useState(false);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [showDebugInfo, setShowDebugInfo] = useState(false);
  const [gestureLog, setGestureLog] = useState<
    Array<{ gesture: GestureType; timestamp: number; slideIndex?: number }>
  >([]);

  const { toast } = useToast();
  const { user } = useAuth();
  const { presentation, loading, error } = usePresentation();

  // Media control based on gestures
  const { isPlaying, togglePlayPause, handleMediaControl } = useMediaControl();

  // Speech-to-text for captions
  const { transcript, isListening, startListening, stopListening } =
    useSpeechToText({
      enabled: captionsEnabled,
    });

  // Debug: Log slide changes
  useEffect(() => {
    console.log(`🎯 Slide changed to index: ${currentSlideIndex}`);
  }, [currentSlideIndex]);

  // Handle gesture detection with proper debugging
  const handleGestureDetected = useCallback(
    (gesture: GestureType, confidence?: number) => {
      if (!presentation || !gesture) {
        console.log("❌ Gesture ignored: no presentation or gesture is null");
        return;
      }

      console.log(
        `🎯 Gesture detected: ${gesture} (confidence: ${confidence || "N/A"})`
      );
      console.log(
        `📊 Current slide: ${currentSlideIndex}, Total slides: ${presentation.slides.length}`
      );

      // Add to gesture log for debugging
      setGestureLog((prev) => [
        ...prev.slice(-9), // Keep last 10 entries
        { gesture, timestamp: Date.now(), slideIndex: currentSlideIndex },
      ]);

      // Handle different gestures with detailed logging
      switch (gesture) {
        case "SWIPE_LEFT":
          console.log(
            `⬅️ Processing SWIPE_LEFT - Current: ${currentSlideIndex}`
          );
          if (currentSlideIndex > 0) {
            const newIndex = currentSlideIndex - 1;
            console.log(`✅ Moving to slide ${newIndex}`);
            setCurrentSlideIndex(newIndex);
            toast({
              title: "Previous slide",
              description: `Slide ${newIndex + 1} of ${
                presentation.slides.length
              }`,
              duration: 1000,
            });
          } else {
            console.log(
              `🚫 Cannot go to previous slide - already at first slide`
            );
            toast({
              title: "Already at first slide",
              description: "Cannot go back further",
              duration: 1000,
            });
          }
          break;

        case "SWIPE_RIGHT":
          console.log(
            `➡️ Processing SWIPE_RIGHT - Current: ${currentSlideIndex}`
          );
          if (currentSlideIndex < presentation.slides.length - 1) {
            const newIndex = currentSlideIndex + 1;
            console.log(`✅ Moving to slide ${newIndex}`);
            setCurrentSlideIndex(newIndex);
            toast({
              title: "Next slide",
              description: `Slide ${newIndex + 1} of ${
                presentation.slides.length
              }`,
              duration: 1000,
            });
          } else {
            console.log(`🚫 Cannot go to next slide - already at last slide`);
            toast({
              title: "Already at last slide",
              description: "Cannot go forward further",
              duration: 1000,
            });
          }
          break;

        case "OPEN_PALM":
          console.log(`✋ Processing OPEN_PALM - Playing media`);
          handleMediaControl("play");
          toast({
            title: "Playing",
            description: "Video/media started",
            duration: 1000,
          });
          break;

        case "CLOSED_FIST":
          console.log(`✊ Processing CLOSED_FIST - Pausing media`);
          handleMediaControl("pause");
          toast({
            title: "Paused",
            description: "Video/media paused",
            duration: 1000,
          });
          break;

        case "THUMB_UP":
          console.log(`👍 Processing THUMB_UP`);
          toast({
            title: "Thumbs up!",
            description: "Gesture recognized",
            duration: 1000,
          });
          break;

        case "POINTING":
          console.log(`👉 Processing POINTING`);
          toast({
            title: "Pointing detected",
            description: "Laser pointer activated",
            duration: 1000,
          });
          break;

        default:
          console.log(`❓ Unknown gesture: ${gesture}`);
          break;
      }
    },
    [presentation, currentSlideIndex, handleMediaControl, toast]
  );

  // Keyboard fallback for debugging comparison
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!presentation) return;

      switch (e.key) {
        case "ArrowLeft":
          console.log("🎹 Keyboard: Arrow Left pressed");
          handleGestureDetected("SWIPE_LEFT", 1.0);
          break;
        case "ArrowRight":
          console.log("🎹 Keyboard: Arrow Right pressed");
          handleGestureDetected("SWIPE_RIGHT", 1.0);
          break;
        case "o":
        case "O":
          console.log("🎹 Keyboard: O pressed");
          handleGestureDetected("OPEN_PALM", 1.0);
          break;
        case "c":
        case "C":
          console.log("🎹 Keyboard: C pressed");
          handleGestureDetected("CLOSED_FIST", 1.0);
          break;
        case "p":
        case "P":
          console.log("🎹 Keyboard: P pressed");
          handleGestureDetected("POINTING", 1.0);
          break;
        case "t":
        case "T":
          console.log("🎹 Keyboard: T pressed");
          handleGestureDetected("THUMB_UP", 1.0);
          break;
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleGestureDetected, presentation]);

  // Toggle webcam
  const toggleWebcam = () => {
    console.log(`📷 Toggling webcam: ${!webcamEnabled}`);
    setWebcamEnabled((prev) => !prev);
  };

  // Toggle captions
  const toggleCaptions = () => {
    if (captionsEnabled) {
      stopListening();
      setCaptionsEnabled(false);
    } else {
      setCaptionsEnabled(true);
      startListening();
    }
  };

  // Toggle debug info
  const toggleDebugInfo = () => {
    setShowDebugInfo((prev) => !prev);
  };

  // Clear gesture log
  const clearGestureLog = () => {
    setGestureLog([]);
  };

  // Manual slide navigation for comparison
  const goToPreviousSlide = () => {
    console.log("🔄 Manual previous slide button clicked");
    if (presentation && currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };

  const goToNextSlide = () => {
    console.log("🔄 Manual next slide button clicked");
    if (presentation && currentSlideIndex < presentation.slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };

  if (loading) return <div>Loading presentation...</div>;
  if (error) return <div>Error loading presentation: {error}</div>;
  if (!presentation) return <div>No presentation found</div>;

  return (
    <div className="flex flex-col lg:flex-row gap-4">
      <div className="lg:w-3/4 relative">
        {/* Slide display area */}
        <Card className="w-full aspect-video relative overflow-hidden">
          {presentation.slides && presentation.slides.length > 0 && (
            <Slide
              slide={presentation.slides[currentSlideIndex]}
              isPlaying={isPlaying}
              onPlay={() => handleMediaControl("play")}
              onPause={() => handleMediaControl("pause")}
            />
          )}

          {/* Captions overlay */}
          {captionsEnabled && <Captions text={transcript} />}

          {/* Debug overlay showing current slide */}
          {showDebugInfo && (
            <div className="absolute top-4 left-4 bg-black/70 text-white p-2 rounded text-sm">
              <div>Current Slide: {currentSlideIndex + 1}</div>
              <div>Total Slides: {presentation.slides.length}</div>
              <div>Slide ID: {presentation.slides[currentSlideIndex]?.id}</div>
              <div>Media Playing: {isPlaying ? "Yes" : "No"}</div>
            </div>
          )}
        </Card>

        {/* Enhanced slide navigation controls */}
        <div className="flex justify-between items-center mt-4">
          <Button
            onClick={goToPreviousSlide}
            disabled={currentSlideIndex === 0}
            aria-label="Previous slide"
            className="flex items-center gap-2"
          >
            ⬅️ Previous
          </Button>

          <div className="flex items-center gap-4">
            <span className="text-lg font-medium">
              Slide {currentSlideIndex + 1} of {presentation.slides.length}
            </span>

            {/* Media controls */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleMediaControl(isPlaying ? "pause" : "play")}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <Button
            onClick={goToNextSlide}
            disabled={currentSlideIndex === presentation.slides.length - 1}
            aria-label="Next slide"
            className="flex items-center gap-2"
          >
            Next ➡️
          </Button>
        </div>
      </div>

      <div className="lg:w-1/4 space-y-4">
        {/* Webcam and controls */}
        <Card className="p-4">
          <h2 className="text-xl font-semibold mb-4">Gesture Control</h2>

          {/* Camera view */}
          <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded-md overflow-hidden mb-4">
            <LiveStreamDetector
              onResults={({ gesture }) => {
                if (gesture === "next")
                  handleGestureDetected("SWIPE_RIGHT", 1.0);
                else if (gesture === "prev")
                  handleGestureDetected("SWIPE_LEFT", 1.0);
              }}
              onCameraStatus={(status, message) => {
                console.log(`Camera status: ${status}`, message);
              }}
              showDebugOverlay={showDebugInfo}
            />
          </div>

          {/* Control buttons */}
          <div className="space-y-2">
            <Button
              onClick={toggleWebcam}
              className="w-full"
              variant={webcamEnabled ? "destructive" : "default"}
            >
              {webcamEnabled ? (
                <>
                  <CameraOff className="w-4 h-4 mr-2" />
                  Disable Camera
                </>
              ) : (
                <>
                  <Camera className="w-4 h-4 mr-2" />
                  Enable Camera
                </>
              )}
            </Button>

            <Button
              onClick={toggleCaptions}
              className="w-full"
              variant={captionsEnabled ? "destructive" : "outline"}
            >
              {captionsEnabled ? (
                <>
                  <MicOff className="w-4 h-4 mr-2" />
                  Disable Captions
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 mr-2" />
                  Enable Captions
                </>
              )}
            </Button>

            <Button
              onClick={toggleDebugInfo}
              className="w-full"
              variant={showDebugInfo ? "default" : "outline"}
            >
              <Bug className="w-4 h-4 mr-2" />
              {showDebugInfo ? "Hide Debug" : "Show Debug"}
            </Button>
          </div>
        </Card>

        {/* Enhanced test mode notice */}
        <Card className="p-4 bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
          <div className="flex items-center mb-2">
            <TestTube className="w-5 h-5 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200">
              Keyboard Testing
            </h3>
          </div>
          <p className="text-blue-700 dark:text-blue-300 text-sm mb-3">
            Use keyboard shortcuts to test gesture functionality:
          </p>
          <div className="space-y-1 text-sm text-blue-600 dark:text-blue-400">
            <div>
              <kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">
                ←
              </kbd>{" "}
              = Previous slide
            </div>
            <div>
              <kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">
                →
              </kbd>{" "}
              = Next slide
            </div>
            <div>
              <kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">
                O
              </kbd>{" "}
              = Play media
            </div>
            <div>
              <kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">
                C
              </kbd>{" "}
              = Pause media
            </div>
            <div>
              <kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">
                P
              </kbd>{" "}
              = Pointing
            </div>
            <div>
              <kbd className="px-1 py-0.5 bg-blue-200 dark:bg-blue-800 rounded text-xs">
                T
              </kbd>{" "}
              = Thumbs Up
            </div>
          </div>
        </Card>

        {/* Enhanced gesture log for debugging */}
        {showDebugInfo && (
          <Card className="p-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-lg font-semibold">Gesture Debug Log</h3>
              <Button onClick={clearGestureLog} size="sm" variant="outline">
                Clear
              </Button>
            </div>
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {gestureLog.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No gestures detected yet
                </p>
              ) : (
                gestureLog.map((entry, index) => (
                  <div
                    key={index}
                    className="text-xs bg-gray-100 dark:bg-gray-800 p-2 rounded"
                  >
                    <div className="font-medium flex justify-between">
                      <span>{entry.gesture?.replace("_", " ")}</span>
                      <span className="text-gray-500">#{index + 1}</span>
                    </div>
                    <div className="text-gray-500 flex justify-between">
                      <span>
                        {new Date(entry.timestamp).toLocaleTimeString()}
                      </span>
                      {entry.slideIndex !== undefined && (
                        <span>Slide: {entry.slideIndex + 1}</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        )}

        {/* Gesture guide */}
        <GestureGuide />

        {/* Control panel */}
        <ControlPanel
          presentation={presentation}
          currentSlideIndex={currentSlideIndex}
          setCurrentSlideIndex={setCurrentSlideIndex}
        />
      </div>
    </div>
  );
}
