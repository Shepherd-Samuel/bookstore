import { useState, useRef, useCallback } from "react";
import { Camera, RotateCcw, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CameraCaptureProps {
  open: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export default function CameraCapture({ open, onClose, onCapture }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [captured, setCaptured] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("user");

  const startCamera = useCallback(async (facing: "user" | "environment") => {
    try {
      if (stream) stream.getTracks().forEach(t => t.stop());
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 640 }, height: { ideal: 640 } },
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play();
      }
      setCaptured(null);
    } catch {
      // Camera not available
    }
  }, [stream]);

  const stopCamera = useCallback(() => {
    if (stream) stream.getTracks().forEach(t => t.stop());
    setStream(null);
    setCaptured(null);
  }, [stream]);

  const handleOpen = () => {
    startCamera(facingMode);
  };

  const handleClose = () => {
    stopCamera();
    onClose();
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    setCaptured(canvas.toDataURL("image/jpeg", 0.85));
  };

  const retake = () => {
    setCaptured(null);
    startCamera(facingMode);
  };

  const confirm = () => {
    if (!captured) return;
    fetch(captured)
      .then(r => r.blob())
      .then(blob => {
        const file = new File([blob], `camera-${Date.now()}.jpg`, { type: "image/jpeg" });
        onCapture(file);
        handleClose();
      });
  };

  const flipCamera = () => {
    const next = facingMode === "user" ? "environment" : "user";
    setFacingMode(next);
    startCamera(next);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); else handleOpen(); }}>
      <DialogContent className="max-w-sm p-4">
        <DialogHeader>
          <DialogTitle className="text-sm font-bold flex items-center gap-2">
            <Camera className="w-4 h-4" /> Take Photo
          </DialogTitle>
        </DialogHeader>
        <div className="relative aspect-square rounded-xl overflow-hidden bg-black">
          {!captured ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
              style={{ transform: facingMode === "user" ? "scaleX(-1)" : "none" }}
            />
          ) : (
            <img src={captured} alt="Captured" className="w-full h-full object-cover" />
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />
        <div className="flex items-center justify-center gap-3 mt-2">
          {!captured ? (
            <>
              <Button size="sm" variant="outline" onClick={flipCamera} className="gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Flip
              </Button>
              <Button size="sm" onClick={takePhoto} className="gap-1.5 px-6">
                <Camera className="w-3.5 h-3.5" /> Capture
              </Button>
              <Button size="sm" variant="ghost" onClick={handleClose}>
                <X className="w-4 h-4" />
              </Button>
            </>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={retake} className="gap-1.5">
                <RotateCcw className="w-3.5 h-3.5" /> Retake
              </Button>
              <Button size="sm" onClick={confirm} className="gap-1.5 px-6">
                <Check className="w-3.5 h-3.5" /> Use Photo
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
