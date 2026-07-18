import React, { useEffect, useState } from 'react';
import { X, ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react';

interface ImageLightboxProps {
  images: string[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export default function ImageLightbox({ images, index, onClose, onIndexChange }: ImageLightboxProps) {
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    setZoomed(false);
  }, [index]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight' && images.length > 1) onIndexChange((index + 1) % images.length);
      if (e.key === 'ArrowLeft' && images.length > 1) onIndexChange((index - 1 + images.length) % images.length);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [index, images.length, onClose, onIndexChange]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#0B0A09]/95 backdrop-blur-md flex items-center justify-center"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        aria-label="Close"
        className="absolute top-6 right-6 z-10 p-3 text-[#E8E3DB] hover:text-[#D4AF37] transition-colors"
      >
        <X className="h-6 w-6" />
      </button>

      <button
        onClick={(e) => {
          e.stopPropagation();
          setZoomed((z) => !z);
        }}
        aria-label={zoomed ? 'Zoom out' : 'Zoom in'}
        className="absolute top-6 right-20 z-10 p-3 text-[#E8E3DB] hover:text-[#D4AF37] transition-colors"
      >
        {zoomed ? <ZoomOut className="h-6 w-6" /> : <ZoomIn className="h-6 w-6" />}
      </button>

      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index - 1 + images.length) % images.length);
          }}
          aria-label="Previous image"
          className="absolute left-4 md:left-8 z-10 p-3 text-[#E8E3DB] hover:text-[#D4AF37] transition-colors"
        >
          <ChevronLeft className="h-8 w-8" />
        </button>
      )}

      <div
        className={`relative max-h-[90vh] max-w-[92vw] overflow-auto ${zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
        onClick={(e) => {
          e.stopPropagation();
          setZoomed((z) => !z);
        }}
      >
        <img
          src={images[index]}
          alt={`View ${index + 1} of ${images.length}`}
          className={`transition-transform duration-300 ease-out ${
            zoomed ? 'scale-[1.8] max-w-none' : 'max-h-[90vh] max-w-[92vw] object-contain'
          }`}
        />
      </div>

      {images.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onIndexChange((index + 1) % images.length);
          }}
          aria-label="Next image"
          className="absolute right-4 md:right-8 z-10 p-3 text-[#E8E3DB] hover:text-[#D4AF37] transition-colors"
        >
          <ChevronRight className="h-8 w-8" />
        </button>
      )}

      {images.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] tracking-[0.2em] text-[#8C8477] uppercase">
          {index + 1} / {images.length}
        </div>
      )}
    </div>
  );
}
