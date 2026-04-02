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
      // fallback: save original without crop
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
      className="fixed inset-0 z-50 flex flex-col"
    >
      {/* Backdrop + crop area */}
      <div className={`flex-1 relative ${isDark ? 'bg-black' : 'bg-zinc-900'}`}>
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

      {/* Zoom slider */}
      <div className={`px-6 pt-4 pb-2 ${isDark ? 'bg-dark-bg' : 'bg-white'}`}>
        <p className="text-xs text-muted text-center mb-2">Pinch or drag to adjust</p>
        <input
          type="range"
          min={1}
          max={3}
          step={0.01}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-accent"
        />
      </div>

      {/* Buttons */}
      <div className={`flex gap-3 px-6 pb-8 pt-2 ${isDark ? 'bg-dark-bg' : 'bg-white'}`}>
        <button
          onClick={onCancel}
          className={`flex-1 py-3 rounded-lg text-sm font-semibold font-[family-name:var(--font-outfit)] ${
            isDark ? 'bg-dark-card text-muted' : 'bg-light-border text-zinc-600'
          }`}
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 py-3 rounded-lg bg-accent text-dark-bg text-sm font-semibold font-[family-name:var(--font-outfit)] active:scale-[0.98] transition-transform disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Use Photo'}
        </button>
      </div>
    </motion.div>
  );
}
