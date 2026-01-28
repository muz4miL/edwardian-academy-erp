/**
 * ImageCapture Component - Dual-Mode Identity System
 *
 * Unified component for capturing profile photos via:
 * - Webcam: Live preview and snapshot
 * - File Upload: Drag-and-drop or click to upload
 *
 * Features:
 * - Image compression (max 800px width) to prevent DB bloat
 * - Base64 output for MongoDB storage
 * - Premium Edwardian Gold themed styling
 */

import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Camera, Upload, RefreshCw, X, User, CheckCircle2 } from "lucide-react";

interface ImageCaptureProps {
  value?: string;
  onChange: (image: string | null) => void;
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
}

// Size configurations
const sizeConfig = {
  sm: { container: "w-24 h-24", icon: "h-8 w-8", button: "text-xs" },
  md: { container: "w-32 h-32", icon: "h-10 w-10", button: "text-sm" },
  lg: { container: "w-40 h-40", icon: "h-12 w-12", button: "text-sm" },
};

/**
 * Compress and resize image to max width of 800px
 * Returns Base64 data URL
 */
const compressImage = (file: File | Blob, maxWidth = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let { width, height } = img;

        // Calculate new dimensions
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get canvas context"));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG with 80% quality
        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.8);
        resolve(compressedBase64);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
};

export function ImageCapture({
  value,
  onChange,
  size = "md",
  className,
  disabled = false,
}: ImageCaptureProps) {
  const [mode, setMode] = useState<"idle" | "webcam" | "upload">("idle");
  const [isProcessing, setIsProcessing] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const config = sizeConfig[size];

  // Handle webcam capture
  const captureFromWebcam = useCallback(async () => {
    if (!webcamRef.current) return;

    setIsProcessing(true);
    try {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        // Convert to blob for compression
        const response = await fetch(imageSrc);
        const blob = await response.blob();
        const compressed = await compressImage(blob);
        onChange(compressed);
        setMode("idle");
      }
    } catch (error) {
      console.error("Failed to capture image:", error);
    } finally {
      setIsProcessing(false);
    }
  }, [onChange]);

  // Handle file upload
  const handleFileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        alert("Please select an image file");
        return;
      }

      setIsProcessing(true);
      try {
        const compressed = await compressImage(file);
        onChange(compressed);
        setMode("idle");
      } catch (error) {
        console.error("Failed to process image:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [onChange],
  );

  // Handle drag and drop
  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith("image/")) return;

      setIsProcessing(true);
      try {
        const compressed = await compressImage(file);
        onChange(compressed);
        setMode("idle");
      } catch (error) {
        console.error("Failed to process image:", error);
      } finally {
        setIsProcessing(false);
      }
    },
    [onChange],
  );

  // Clear image
  const clearImage = useCallback(() => {
    onChange(null);
    setMode("idle");
  }, [onChange]);

  // Render preview if image exists
  if (value && mode === "idle") {
    return (
      <div className={cn("flex flex-col items-center gap-2", className)}>
        <div className={cn("relative group", config.container)}>
          <img
            src={value}
            alt="Profile"
            className="w-full h-full object-cover rounded-full border-2 border-amber-500/50 shadow-lg"
          />
          {!disabled && (
            <div className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              <button
                onClick={() => setMode("webcam")}
                className="p-2 bg-white/20 rounded-full hover:bg-white/30 transition-colors"
                title="Retake with webcam"
              >
                <Camera className="h-4 w-4 text-white" />
              </button>
              <button
                onClick={clearImage}
                className="p-2 bg-red-500/50 rounded-full hover:bg-red-500/70 transition-colors"
                title="Remove photo"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>
          )}
          <div className="absolute -bottom-1 -right-1 h-6 w-6 bg-emerald-500 rounded-full flex items-center justify-center border-2 border-white">
            <CheckCircle2 className="h-4 w-4 text-white" />
          </div>
        </div>
      </div>
    );
  }

  // Render webcam mode
  if (mode === "webcam") {
    return (
      <div className={cn("flex flex-col items-center gap-3", className)}>
        <div className="relative rounded-full overflow-hidden border-2 border-amber-500/30 shadow-lg">
          <Webcam
            ref={webcamRef}
            audio={false}
            screenshotFormat="image/jpeg"
            videoConstraints={{
              width: 300,
              height: 300,
              facingMode: "user",
            }}
            className="w-48 h-48 object-cover"
          />
          {isProcessing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <RefreshCw className="h-8 w-8 text-white animate-spin" />
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={captureFromWebcam}
            disabled={isProcessing}
            className="bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700"
          >
            <Camera className="h-4 w-4 mr-1" />
            Capture
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setMode("idle")}
            disabled={isProcessing}
          >
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Render idle/upload mode
  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* Avatar placeholder */}
      <div
        className={cn(
          "rounded-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 flex items-center justify-center border-2 border-dashed border-gray-300 dark:border-gray-600",
          config.container,
        )}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {isProcessing ? (
          <RefreshCw
            className={cn("text-gray-400 animate-spin", config.icon)}
          />
        ) : (
          <User className={cn("text-gray-400", config.icon)} />
        )}
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setMode("webcam")}
          disabled={disabled || isProcessing}
          className={cn(
            "border-amber-500/50 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950",
            config.button,
          )}
        >
          <Camera className="h-4 w-4 mr-1" />
          Webcam
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isProcessing}
          className={config.button}
        >
          <Upload className="h-4 w-4 mr-1" />
          Upload
        </Button>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        title="Upload image file"
        aria-label="Upload image file"
      />
    </div>
  );
}

export default ImageCapture;
