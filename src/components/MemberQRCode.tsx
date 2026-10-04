import React, { useState, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { QrCode, Maximize2, X, Copy, Check, Download, Sparkles, Phone, User, Award } from 'lucide-react';
import { BBWashLogo } from './BBWashLogo';
import { UserData } from '../App';

interface MemberQRCodeProps {
  user: UserData;
}

export const MemberQRCode: React.FC<MemberQRCodeProps> = ({ user }) => {
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  const formattedPhone = user.phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');

  const handleCopy = () => {
    navigator.clipboard.writeText(user.phone);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    // Generate downloadable image of the member card
    const svgElement = qrRef.current?.querySelector('svg');
    if (!svgElement) return;

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    img.onload = () => {
      canvas.width = 400;
      canvas.height = 540;

      // Draw background
      ctx.fillStyle = '#18181B';
      ctx.roundRect(0, 0, 400, 540, 24);
      ctx.fill();

      // Top banner
      const gradient = ctx.createLinearGradient(0, 0, 400, 0);
      gradient.addColorStop(0, '#F59E0B');
      gradient.addColorStop(1, '#EA580C');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.roundRect(0, 0, 400, 90, [24, 24, 0, 0]);
      ctx.fill();

      // Header text
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 22px Kanit, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('BB WASH & DRY', 200, 42);
      ctx.font = '14px Kanit, sans-serif';
      ctx.fillText('บัตรสมาชิกสะสมแต้ม 24 ชม.', 200, 68);

      // White QR box
      ctx.fillStyle = '#FFFFFF';
      ctx.roundRect(50, 115, 300, 300, 20);
      ctx.fill();

      // Draw QR Code
      ctx.drawImage(img, 70, 135, 260, 260);

      // Member details
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 18px Kanit, sans-serif';
      ctx.fillText(user.name, 200, 445);

      ctx.fillStyle = '#FBBF24';
      ctx.font = '16px monospace';
      ctx.fillText(formattedPhone, 200, 475);

      ctx.fillStyle = '#A1A1AA';
      ctx.font = '13px Kanit, sans-serif';
      ctx.fillText(`คะแนนสะสม: ${user.points || 0} แต้ม`, 200, 505);

      const a = document.createElement('a');
      a.download = `BBWash-Member-${user.phone}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      URL.revokeObjectURL(blobURL);
    };

    img.src = blobURL;
  };

  return (
    <>
      {/* 🌟 Compact & Attractive Dashboard Card */}
      <div className="bg-gradient-to-b from-zinc-900 via-zinc-900 to-black border border-yellow-500/30 rounded-3xl p-5 shadow-xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl pointer-events-none"></div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-yellow-500/20 text-yellow-400 rounded-xl">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight flex items-center gap-1.5">
                QR Code สมาชิก
                <span className="text-[10px] bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded-full font-medium">
                  สำหรับร้านสแกน
                </span>
              </h3>
              <p className="text-zinc-400 text-xs">ยื่นให้ทางร้านสแกนเพื่อสะสมหรือแลกคะแนน</p>
            </div>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="p-2 bg-zinc-800/80 hover:bg-zinc-700 text-yellow-400 rounded-xl transition-colors cursor-pointer"
            title="ขยายเต็มจอ"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>

        {/* QR Code Container */}
        <div className="flex flex-col sm:flex-row items-center gap-4 bg-zinc-950/80 border border-zinc-800/80 p-4 rounded-2xl">
          <div
            onClick={() => setShowModal(true)}
            className="relative p-3 bg-white rounded-2xl shadow-md cursor-pointer transition-transform hover:scale-105 active:scale-95 group/qr flex-shrink-0"
            title="แตะเพื่อขยายใหญ่"
          >
            <QRCodeSVG
              value={user.phone}
              size={120}
              level="H"
              marginSize={1}
              fgColor="#000000"
              bgColor="#FFFFFF"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/qr:opacity-100 flex items-center justify-center rounded-2xl transition-opacity">
              <Maximize2 className="w-6 h-6 text-white drop-shadow" />
            </div>
          </div>

          <div className="flex-1 text-center sm:text-left">
            <div className="inline-flex items-center gap-1.5 bg-yellow-500/10 text-yellow-400 text-xs font-semibold px-2.5 py-1 rounded-full mb-1.5">
              <Award className="w-3.5 h-3.5" />
              <span>{user.points || 0} คะแนนสะสม</span>
            </div>

            <div className="text-sm font-bold text-white mb-0.5">{user.name}</div>
            
            <div className="flex items-center justify-center sm:justify-start gap-2 text-zinc-300 font-mono text-sm mb-3">
              <Phone className="w-3.5 h-3.5 text-zinc-500" />
              <span>{formattedPhone}</span>
              <button
                onClick={handleCopy}
                className="text-zinc-500 hover:text-yellow-400 transition-colors cursor-pointer p-0.5"
                title="คัดลอกเบอร์โทร"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black text-xs font-bold rounded-xl shadow-md transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-1.5"
            >
              <Maximize2 className="w-3.5 h-3.5" />
              แตะเพื่อเปิดบัตรเต็มจอ
            </button>
          </div>
        </div>
      </div>

      {/* 🌟 Modal: Full-Screen Member QR Card for Store Scanning */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-sm bg-zinc-900 border-2 border-yellow-500/60 rounded-3xl p-6 shadow-2xl shadow-yellow-500/20 animate-in zoom-in-95 duration-200 text-center">
            
            {/* Close Button */}
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-2 bg-zinc-800 text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Shop Header Badge */}
            <div className="flex flex-col items-center mb-4">
              <div className="p-1 bg-white rounded-full border border-yellow-400 shadow-md mb-2">
                <BBWashLogo className="w-14 h-14" />
              </div>
              <h3 className="text-xl font-black text-white tracking-wide uppercase">BB WASH & DRY</h3>
              <p className="text-xs text-yellow-400 font-medium">บัตรสมาชิกดิจิทัล (Digital Card)</p>
            </div>

            {/* High Contrast White QR Card for Camera Scanning */}
            <div
              ref={qrRef}
              className="bg-white p-5 rounded-3xl shadow-xl mx-auto w-fit border-4 border-yellow-400/50 mb-4"
            >
              <QRCodeSVG
                value={user.phone}
                size={220}
                level="H"
                marginSize={2}
                fgColor="#000000"
                bgColor="#FFFFFF"
              />
            </div>

            {/* Member Details */}
            <div className="space-y-1 mb-5">
              <div className="text-lg font-bold text-white flex items-center justify-center gap-2">
                <User className="w-4 h-4 text-yellow-400" />
                {user.name}
              </div>
              <div className="text-zinc-400 text-sm font-mono tracking-wider flex items-center justify-center gap-2">
                <span>{formattedPhone}</span>
                <button
                  onClick={handleCopy}
                  className="p-1 text-zinc-500 hover:text-yellow-400 transition-colors cursor-pointer"
                  title="คัดลอกเบอร์โทร"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
              <div className="inline-block bg-yellow-500/10 text-yellow-400 text-xs font-bold px-3 py-1 rounded-full mt-1">
                ⭐ {user.points || 0} / 10 คะแนนสะสม
              </div>
            </div>

            {/* Scanning Guidance */}
            <p className="text-zinc-400 text-xs mb-5 bg-black/40 p-2.5 rounded-xl border border-zinc-800">
              💡 แสดงหน้าจอนี้ให้กล้องหรือเครื่องสแกนของร้านสแกนเพื่อค้นหาข้อมูลสมาชิกอัตโนมัติ
            </p>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleDownload}
                className="flex-1 py-3 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4 text-yellow-400" />
                บันทึกภาพบัตร
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-3 px-3 bg-gradient-to-r from-yellow-400 to-orange-500 hover:from-yellow-300 hover:to-orange-400 text-black text-xs font-bold rounded-xl shadow-md transition-transform active:scale-95 cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
