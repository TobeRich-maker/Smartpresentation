"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Check, X, ThumbsUp, Hand, Fingerprint, PointerIcon } from "lucide-react"

interface CalibrationModalProps {
  isOpen: boolean
  onClose: () => void
  onCalibrationComplete: (calibrationData: CalibrationData) => void
  handLandmarks: any[] | null
}

export interface CalibrationData {
  thumbUp: {
    samples: any[]
    thumbExtension: number
    thumbTipY: number
    wristY: number
  }
  pinkyUp: {
    samples: any[]
    pinkyExtension: number
    pinkyTipY: number
    wristY: number
  }
  openPalm: {
    samples: any[]
    fingerExtensions: number[]
  }
  closedFist: {
    samples: any[]
    fingerCurls: number[]
  }
  pointing: {
    samples: any[]
    indexExtension: number
  }
}

const EMPTY_CALIBRATION_DATA: CalibrationData = {
  thumbUp: { samples: [], thumbExtension: 0, thumbTipY: 0, wristY: 0 },
  pinkyUp: { samples: [], pinkyExtension: 0, pinkyTipY: 0, wristY: 0 },
  openPalm: { samples: [], fingerExtensions: [0, 0, 0, 0] },
  closedFist: { samples: [], fingerCurls: [0, 0, 0, 0] },
  pointing: { samples: [], indexExtension: 0 },
}

const CALIBRATION_STEPS = [
  {
    id: "intro",
    title: "Hand Calibration",
    description:
      "This process will calibrate the gesture recognition for your specific hand. Please follow the instructions for each pose.",
    icon: <Hand className="h-12 w-12 text-primary" />,
  },
  {
    id: "thumbUp",
    title: "Thumb Up",
    description: "Hold your thumb up (like a thumbs-up) and keep other fingers down.",
    icon: <ThumbsUp className="h-12 w-12 text-primary" />,
    gesture: "thumbUp",
  },
  {
    id: "pinkyUp",
    title: "Pinky Up",
    description: "Extend only your pinky finger upward while keeping other fingers down.",
    icon: <Hand className="h-12 w-12 text-primary" />,
    gesture: "pinkyUp",
  },
  {
    id: "openPalm",
    title: "Open Palm",
    description: "Extend all your fingers like you're giving a high five.",
    icon: <Hand className="h-12 w-12 text-primary" />,
    gesture: "openPalm",
  },
  {
    id: "closedFist",
    title: "Closed Fist",
    description: "Make a fist by curling all your fingers.",
    icon: <Fingerprint className="h-12 w-12 text-primary" />,
    gesture: "closedFist",
  },
  {
    id: "pointing",
    title: "Pointing",
    description: "Extend only your index finger while keeping other fingers down.",
    icon: <PointerIcon className="h-12 w-12 text-primary" />,
    gesture: "pointing",
  },
  {
    id: "complete",
    title: "Calibration Complete",
    description: "Your hand gestures have been calibrated successfully!",
    icon: <Check className="h-12 w-12 text-green-500" />,
  },
]

export function CalibrationModal({ isOpen, onClose, onCalibrationComplete, handLandmarks }: CalibrationModalProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [calibrationData, setCalibrationData] = useState<CalibrationData>(EMPTY_CALIBRATION_DATA)
  const [samplesCollected, setSamplesCollected] = useState(0)
  const [isCollecting, setIsCollecting] = useState(false)
  const [calibrationProgress, setCalibrationProgress] = useState(0)
  const [detectionStatus, setDetectionStatus] = useState<"waiting" | "detecting" | "success" | "error">("waiting")

  const samplesNeeded = 10
  const collectionIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const currentGesture = CALIBRATION_STEPS[currentStep]?.gesture

  // Calculate overall progress
  useEffect(() => {
    const totalSteps = CALIBRATION_STEPS.length - 2 // Exclude intro and complete steps
    const completedSteps = currentStep > 0 ? currentStep - 1 : 0
    const stepProgress =
      currentStep > 0 && currentStep < CALIBRATION_STEPS.length - 1 ? samplesCollected / samplesNeeded : 0

    const progress = ((completedSteps + stepProgress) / totalSteps) * 100
    setCalibrationProgress(progress)
  }, [currentStep, samplesCollected])

  // Handle landmark data for calibration
  useEffect(() => {
    if (!isCollecting || !handLandmarks || handLandmarks.length === 0 || !currentGesture) return

    // Process the landmarks for the current gesture
    const landmarks = handLandmarks[0]
    if (!landmarks || landmarks.length < 21) return

    // Add sample to calibration data
    setCalibrationData((prevData) => {
      const updatedData = { ...prevData }

      if (currentGesture === "thumbUp") {
        const wrist = landmarks[0]
        const thumbTip = landmarks[4]
        const thumbExtension = wrist.y - thumbTip.y

        updatedData.thumbUp.samples.push(landmarks)
        updatedData.thumbUp.thumbExtension =
          (updatedData.thumbUp.thumbExtension * updatedData.thumbUp.samples.length + thumbExtension) /
          (updatedData.thumbUp.samples.length + 1)
        updatedData.thumbUp.thumbTipY =
          (updatedData.thumbUp.thumbTipY * updatedData.thumbUp.samples.length + thumbTip.y) /
          (updatedData.thumbUp.samples.length + 1)
        updatedData.thumbUp.wristY =
          (updatedData.thumbUp.wristY * updatedData.thumbUp.samples.length + wrist.y) /
          (updatedData.thumbUp.samples.length + 1)
      } else if (currentGesture === "pinkyUp") {
        const wrist = landmarks[0]
        const pinkyTip = landmarks[20]
        const pinkyExtension = wrist.y - pinkyTip.y

        updatedData.pinkyUp.samples.push(landmarks)
        updatedData.pinkyUp.pinkyExtension =
          (updatedData.pinkyUp.pinkyExtension * updatedData.pinkyUp.samples.length + pinkyExtension) /
          (updatedData.pinkyUp.samples.length + 1)
        updatedData.pinkyUp.pinkyTipY =
          (updatedData.pinkyUp.pinkyTipY * updatedData.pinkyUp.samples.length + pinkyTip.y) /
          (updatedData.pinkyUp.samples.length + 1)
        updatedData.pinkyUp.wristY =
          (updatedData.pinkyUp.wristY * updatedData.pinkyUp.samples.length + wrist.y) /
          (updatedData.pinkyUp.samples.length + 1)
      } else if (currentGesture === "openPalm") {
        const wrist = landmarks[0]
        const indexTip = landmarks[8]
        const middleTip = landmarks[12]
        const ringTip = landmarks[16]
        const pinkyTip = landmarks[20]

        const fingerExtensions = [
          wrist.y - indexTip.y,
          wrist.y - middleTip.y,
          wrist.y - ringTip.y,
          wrist.y - pinkyTip.y,
        ]

        updatedData.openPalm.samples.push(landmarks)

        // Update average finger extensions
        if (updatedData.openPalm.fingerExtensions.length === 0) {
          updatedData.openPalm.fingerExtensions = fingerExtensions
        } else {
          updatedData.openPalm.fingerExtensions = updatedData.openPalm.fingerExtensions.map(
            (ext, i) =>
              (ext * updatedData.openPalm.samples.length + fingerExtensions[i]) /
              (updatedData.openPalm.samples.length + 1),
          )
        }
      } else if (currentGesture === "closedFist") {
        const indexPip = landmarks[6]
        const indexTip = landmarks[8]
        const middlePip = landmarks[10]
        const middleTip = landmarks[12]
        const ringPip = landmarks[14]
        const ringTip = landmarks[16]
        const pinkyPip = landmarks[18]
        const pinkyTip = landmarks[20]

        const fingerCurls = [
          indexTip.y - indexPip.y,
          middleTip.y - middlePip.y,
          ringTip.y - ringPip.y,
          pinkyTip.y - pinkyPip.y,
        ]

        updatedData.closedFist.samples.push(landmarks)

        // Update average finger curls
        if (updatedData.closedFist.fingerCurls.length === 0) {
          updatedData.closedFist.fingerCurls = fingerCurls
        } else {
          updatedData.closedFist.fingerCurls = updatedData.closedFist.fingerCurls.map(
            (curl, i) =>
              (curl * updatedData.closedFist.samples.length + fingerCurls[i]) /
              (updatedData.closedFist.samples.length + 1),
          )
        }
      } else if (currentGesture === "pointing") {
        const wrist = landmarks[0]
        const indexTip = landmarks[8]
        const indexExtension = wrist.y - indexTip.y

        updatedData.pointing.samples.push(landmarks)
        updatedData.pointing.indexExtension =
          (updatedData.pointing.indexExtension * updatedData.pointing.samples.length + indexExtension) /
          (updatedData.pointing.samples.length + 1)
      }

      return updatedData
    })

    // Increment sample count
    setSamplesCollected((prev) => {
      const newCount = prev + 1

      // If we've collected enough samples, stop collecting
      if (newCount >= samplesNeeded) {
        stopCollecting()
        setDetectionStatus("success")
      }

      return newCount
    })
  }, [handLandmarks, isCollecting, currentGesture])

  // Start collecting samples
  const startCollecting = () => {
    setIsCollecting(true)
    setSamplesCollected(0)
    setDetectionStatus("detecting")

    // Set a timeout to stop collecting if we don't get enough samples
    collectionIntervalRef.current = setTimeout(() => {
      if (samplesCollected < samplesNeeded) {
        stopCollecting()
        setDetectionStatus("error")
      }
    }, 10000) // 10 seconds timeout
  }

  // Stop collecting samples
  const stopCollecting = () => {
    setIsCollecting(false)

    if (collectionIntervalRef.current) {
      clearTimeout(collectionIntervalRef.current)
      collectionIntervalRef.current = null
    }
  }

  // Go to next step
  const nextStep = () => {
    if (currentStep < CALIBRATION_STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
      setDetectionStatus("waiting")
      setSamplesCollected(0)
      stopCollecting()
    } else {
      // Calibration complete
      onCalibrationComplete(calibrationData)
      onClose()
    }
  }

  // Go to previous step
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      setDetectionStatus("waiting")
      setSamplesCollected(0)
      stopCollecting()
    } else {
      onClose()
    }
  }

  // Reset current step
  const resetStep = () => {
    setDetectionStatus("waiting")
    setSamplesCollected(0)
    stopCollecting()

    // Reset the data for the current gesture
    if (currentGesture) {
      setCalibrationData((prevData) => {
        const updatedData = { ...prevData }
        updatedData[currentGesture] = EMPTY_CALIBRATION_DATA[currentGesture]
        return updatedData
      })
    }
  }

  // Cancel calibration
  const cancelCalibration = () => {
    stopCollecting()
    onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{CALIBRATION_STEPS[currentStep].title}</DialogTitle>
          <DialogDescription>{CALIBRATION_STEPS[currentStep].description}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center py-4">
          <div className="mb-6">{CALIBRATION_STEPS[currentStep].icon}</div>

          {currentStep > 0 && currentStep < CALIBRATION_STEPS.length - 1 && (
            <div className="w-full space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  {samplesCollected} of {samplesNeeded} samples
                </span>
                <span className="text-sm font-medium">
                  {detectionStatus === "waiting" && "Ready to calibrate"}
                  {detectionStatus === "detecting" && "Collecting samples..."}
                  {detectionStatus === "success" && "Calibration successful!"}
                  {detectionStatus === "error" && "Calibration failed. Try again."}
                </span>
              </div>

              <Progress value={(samplesCollected / samplesNeeded) * 100} className="h-2" />

              <div className="flex justify-center">
                {detectionStatus === "waiting" && <Button onClick={startCollecting}>Start Calibration</Button>}

                {detectionStatus === "detecting" && (
                  <Button variant="outline" onClick={stopCollecting}>
                    Cancel Collection
                  </Button>
                )}

                {detectionStatus === "success" && (
                  <div className="flex items-center justify-center space-x-2">
                    <Check className="h-5 w-5 text-green-500" />
                    <span className="text-green-500 font-medium">Gesture Calibrated</span>
                  </div>
                )}

                {detectionStatus === "error" && (
                  <div className="flex items-center justify-center space-x-2">
                    <X className="h-5 w-5 text-red-500" />
                    <span className="text-red-500 font-medium">Failed to detect gesture</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="mt-4">
          <Progress value={calibrationProgress} className="h-1 mb-4" />

          <div className="flex justify-between">
            {currentStep === 0 ? (
              <Button variant="outline" onClick={cancelCalibration}>
                Cancel
              </Button>
            ) : (
              <Button variant="outline" onClick={prevStep}>
                Back
              </Button>
            )}

            <div className="space-x-2">
              {currentStep > 0 && currentStep < CALIBRATION_STEPS.length - 1 && (
                <Button variant="outline" onClick={resetStep}>
                  Reset
                </Button>
              )}

              <Button
                onClick={nextStep}
                disabled={
                  currentStep > 0 && currentStep < CALIBRATION_STEPS.length - 1 && detectionStatus !== "success"
                }
              >
                {currentStep === CALIBRATION_STEPS.length - 1 ? "Finish" : "Next"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
