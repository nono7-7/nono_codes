'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { motion } from 'framer-motion';
import { cropAndCompress, type PixelCrop } from '@/lib/avatar';

interface Area {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ImageCropModal({
  imageSrc,
  onSave,
  onCancel,
  isDark,
}: {
  imageSrc: string;
  onSave: (dataUrl: string) => void;
  onCancel: () => void;
  isDark: boolean;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels) return;
    setSaving(true);
    try {
      const dataUrl = await cropAndCompress(imageSrc, croppedAreaPixels as PixelCrop);
      onSave(dataUrl);
    } catch {
      onSave(imageSrc);
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      {/* Crop area — capped so buttons stay visible */}
      <div className="relative" style={{ height: '55vh' }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* Controls panel — guaranteed visible */}
      <div
        className={`flex-1 flex flex-col justify-end ${isDark ? 'bg-dark-bg' : 'bg-white'}`}
      >
        {/* Zoom */}
        <div className="px-6 pt-5 pb-3">
          <p className={`text-xs text-center mb-3 ${isDark ? 'text-white/60' : 'text-zinc-500'}`}>
            Drag to reposition · Pinch to zoom
          </p>
          <input
            type="range"
            min={1}
            max={3}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full accent-accent h-2"
          />
        </div>

        {/* Buttons */}
        <div className="flex gap-3 px-6 pt-3 pb-10">
          <button
            onClick={onCancel}
            className={`flex-1 py-4 rounded-xl text-base font-bold font-[family-name:var(--font-outfit)] border-2 ${
              isDark
                ? 'bg-dark-card border-dark-border text-white'
                : 'bg-white border-zinc-300 text-zinc-800'
            }`}
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-4 rounded-xl bg-accent text-dark-bg text-base font-bold font-[family-name:var(--font-outfit)] active:scale-[0.98] transition-transform disabled:opacity-60 border-2 border-accent"
          >
            {saving ? 'Saving...' : 'Use Photo'}
          </button>
        </div>
      </div>
    </motion.div>
  );
}
