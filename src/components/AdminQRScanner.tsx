import React, { useState, useEffect, useRef } from 'react';
import jsQR from 'jsqr';
import { Camera, X, RefreshCw, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';

interface AdminQRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onScanSuccess: (scannedPhone: string) => void;
}

export const AdminQRScanner: React.FC<AdminQRScannerProps> = ({
  isOpen,
  onClose,
  onScanSuccess
}) => {
  const [cameraActive, setCameraActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [scannedResult, setScannedResult] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Start Camera
  const startCamera = async () => {
    setErrorMsg('');
    setScannedResult(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('เบราว์เซอร์นี้ไม่รองรับการเปิดกล้อง');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraActive(true);
        scanFrame();
      }
    } catch (err: any) {
      console.warn('Camera access error:', err);
      setErrorMsg('ไม่สามารถเข้าถึงกล้องได้ กรุณาอนุญาตการใช้กล้อง หรือเลือกอัปโหลดรูปภาพ QR แทน');
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Continuous frame scanning
  const scanFrame = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height, {
        inversionAttempts: 'dontInvert'
      });

      if (code && code.data) {
        // Clean phone number from scanned text
        const cleaned = code.data.trim().replace(/[^\d]/g, '');
        if (cleaned.length >= 9) {
          handleSuccess(cleaned);
          return;
        }
      }
    }

    animationFrameRef.current = requestAnimationFrame(scanFrame);
  };

  const handleSuccess = (phone: string) => {
    stopCamera();
    setScannedResult(phone);
    if ('vibrate' in navigator) {
      navigator.vibrate(200);
    }
    setTimeout(() => {
      onScanSuccess(phone);
      onClose();
    }, 600);
  };

  // Handle uploaded image file
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        if (code && code.data) {
          const cleaned = code.data.trim().replace(/[^\d]/g, '');
          if (cleaned.length >= 9) {
            handleSuccess(cleaned);
            return;
          }
        }
        setErrorMsg('ไม่พบ QR Code สมาชิกในภาพที่เลือก กรุณาลองใหม่');
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-zinc-900 border border-yellow-500/40 rounded-3xl p-5 shadow-2xl animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-yellow-500/20 text-yellow-400 rounded-xl">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">สแกน QR Code สมาชิก</h3>
              <p className="text-zinc-400 text-xs">ส่องกล้องไปที่ QR Code ของลูกค้า</p>
            </div>
          </div>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="p-2 text-zinc-400 hover:text-white bg-zinc-800 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewfinder Area */}
        <div className="relative aspect-square w-full bg-black rounded-2xl overflow-hidden border-2 border-zinc-700 flex items-center justify-center mb-4">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${cameraActive ? 'block' : 'hidden'}`}
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanning frame overlay */}
          {cameraActive && !scannedResult && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-52 h-52 border-2 border-yellow-400 rounded-2xl relative shadow-[0_0_20px_rgba(250,204,21,0.3)]">
                {/* Corner accents */}
                <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-yellow-400 rounded-tl-lg"></div>
                <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-yellow-400 rounded-tr-lg"></div>
                <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-yellow-400 rounded-bl-lg"></div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-yellow-400 rounded-br-lg"></div>
                
                {/* Scanning line animation */}
                <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-yellow-400 to-transparent absolute top-1/2 -translate-y-1/2 animate-pulse"></div>
              </div>
            </div>
          )}

          {/* Success state */}
          {scannedResult && (
            <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center p-4">
              <CheckCircle2 className="w-14 h-14 text-green-400 mb-2 animate-bounce" />
              <p className="text-white font-bold text-base">สแกนสำเร็จ!</p>
              <p className="text-yellow-400 font-mono text-lg font-bold">{scannedResult}</p>
            </div>
          )}

          {/* Inactive / Error State */}
          {!cameraActive && !scannedResult && (
            <div className="text-center p-6 space-y-3">
              <Camera className="w-12 h-12 text-zinc-600 mx-auto" />
              <p className="text-zinc-400 text-xs">
                {errorMsg || 'กำลังเชื่อมต่อกล้อง...'}
              </p>
              <button
                onClick={startCamera}
                className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black text-xs font-bold rounded-xl transition-colors cursor-pointer inline-flex items-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" /> ลองเปิดกล้องใหม่
              </button>
            </div>
          )}
        </div>

        {errorMsg && (
          <div className="flex items-center gap-2 p-2.5 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs mb-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="leading-tight">{errorMsg}</span>
          </div>
        )}

        {/* Fallback Action Buttons */}
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Upload className="w-3.5 h-3.5 text-yellow-400" />
            เลือกรูปภาพ QR
          </button>
          <button
            onClick={() => {
              stopCamera();
              onClose();
            }}
            className="flex-1 py-2.5 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            ยกเลิก
          </button>
        </div>
      </div>
    </div>
  );
};
