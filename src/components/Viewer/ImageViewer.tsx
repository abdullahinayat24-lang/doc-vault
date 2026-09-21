import React, { useRef, useState, useEffect } from 'react';

interface ImageViewerProps {
  url: string;
  name: string;
  zoom: number;
  rotation: number;
  panOffset: { x: number; y: number };
  onPanChange: (offset: { x: number; y: number }) => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({
  url,
  name,
  zoom,
  rotation,
  panOffset,
  onPanChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    onPanChange({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    const handleGlobalMouseUp = () => setIsDragging(false);
    window.addEventListener('mouseup', handleGlobalMouseUp);
    return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`w-full h-full flex items-center justify-center overflow-hidden relative select-none ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      <div
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom}) rotate(${rotation}deg)`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.15s ease-out'
        }}
        className="max-w-none flex items-center justify-center"
      >
        <img
          src={url}
          alt={name}
          draggable={false}
          className="max-w-[85vw] max-h-[80vh] object-contain shadow-2xl rounded-lg bg-white border border-[#dadce0]"
        />
      </div>
    </div>
  );
};
