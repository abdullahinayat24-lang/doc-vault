import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

interface PdfViewerProps {
  url: string;
  name: string;
  zoom: number;
  rotation: number;
  currentPage: number;
  onTotalPagesChange: (total: number) => void;
  panOffset: { x: number; y: number };
  onPanChange: (offset: { x: number; y: number }) => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  url,
  zoom,
  rotation,
  currentPage,
  onTotalPagesChange,
  panOffset,
  onPanChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument(url);
        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
          onTotalPagesChange(doc.numPages);
          setLoading(false);
        }
      } catch (err: any) {
        console.warn('PDF.js canvas load failed, falling back to embedded frame:', err);
        if (!isCancelled) {
          setError(err.message || 'Failed to render PDF');
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [url]);

  // Render current page onto canvas
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let renderTask: any = null;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: zoom * 1.5, rotation });
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };

        renderTask = page.render(renderContext);
        await renderTask.promise;
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.error('Error rendering page:', err);
        }
      }
    };

    renderPage();

    return () => {
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, currentPage, zoom, rotation]);

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

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      className={`w-full h-full flex items-center justify-center overflow-auto p-4 relative ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      }`}
    >
      {loading && (
        <div className="flex flex-col items-center gap-2 text-[#5f6368]">
          <div className="w-8 h-8 border-3 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs">Loading PDF document...</p>
        </div>
      )}

      {error ? (
        // Fallback embedded object if canvas load fails
        <div className="w-full h-full flex flex-col items-center justify-center">
          <object
            data={url}
            type="application/pdf"
            className="w-full h-[80vh] rounded-lg shadow border border-[#dadce0]"
          >
            <div className="text-center p-6 bg-white rounded-xl shadow border border-[#dadce0]">
              <p className="text-sm font-medium text-[#202124]">PDF Preview Available</p>
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-block px-4 py-2 bg-[#1a73e8] text-white text-xs font-medium rounded-lg"
              >
                Open in Native Viewer
              </a>
            </div>
          </object>
        </div>
      ) : (
        <div
          style={{
            transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
            transition: isDragging ? 'none' : 'transform 0.1s ease-out'
          }}
          className="flex justify-center"
        >
          <canvas
            ref={canvasRef}
            className="shadow-2xl rounded-sm bg-white border border-[#dadce0] max-w-none"
            style={{
              maxHeight: zoom <= 1 ? '82vh' : 'none'
            }}
          />
        </div>
      )}
    </div>
  );
};
