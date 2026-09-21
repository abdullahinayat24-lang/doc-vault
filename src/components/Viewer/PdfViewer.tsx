import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ExternalLink, Layers, Sparkles } from 'lucide-react';

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
  name,
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
  const [viewMode, setViewMode] = useState<'canvas' | 'native'>('canvas');

  // Helper to convert base64 data URI to Uint8Array
  const dataUriToUint8Array = (dataUri: string): Uint8Array => {
    const base64 = dataUri.split(',')[1] || dataUri;
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  };

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    const loadPdf = async () => {
      try {
        let source: any = url;
        if (url.startsWith('data:application/pdf') || url.startsWith('data:;base64,')) {
          source = { data: dataUriToUint8Array(url) };
        }

        const loadingTask = pdfjsLib.getDocument(source);
        const doc = await loadingTask.promise;
        if (!isCancelled) {
          setPdfDoc(doc);
          onTotalPagesChange(doc.numPages);
          setLoading(false);
        }
      } catch (err: any) {
        console.warn('PDF.js canvas parse note:', err);
        if (!isCancelled) {
          // Switch to native embedded view if canvas parse has issues
          setViewMode('native');
          setError(err.message || 'Switched to native PDF view');
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
    if (!pdfDoc || !canvasRef.current || viewMode === 'native') return;

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
  }, [pdfDoc, currentPage, zoom, rotation, viewMode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewMode === 'native') return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || viewMode === 'native') return;
    onPanChange({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-[#f8fafd]">
      {/* PDF View Mode Switcher Badge */}
      <div className="absolute top-3 right-4 z-20 flex items-center gap-1.5 bg-white/95 backdrop-blur-xs border border-[#dadce0] rounded-xl p-1 shadow-sm text-xs select-none">
        <button
          onClick={() => setViewMode('canvas')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
            viewMode === 'canvas'
              ? 'bg-[#1a73e8] text-white shadow-xs font-semibold'
              : 'text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4]'
          }`}
          title="Single page interactive canvas with zoom, pan, and rotate controls"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Single Page</span>
        </button>

        <button
          onClick={() => setViewMode('native')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1 ${
            viewMode === 'native'
              ? 'bg-[#1a73e8] text-white shadow-xs font-semibold'
              : 'text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4]'
          }`}
          title="Continuous vertical scroll view through all pages with mouse wheel"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Continuous Scroll View</span>
        </button>
      </div>

      {/* Main Container */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        className={`w-full flex-1 flex items-center justify-center overflow-auto p-4 relative ${
          viewMode === 'canvas' && isDragging ? 'cursor-grabbing' : viewMode === 'canvas' ? 'cursor-grab' : ''
        }`}
      >
        {loading && (
          <div className="flex flex-col items-center gap-2 text-[#5f6368]">
            <div className="w-8 h-8 border-3 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Rendering PDF document...</p>
          </div>
        )}

        {viewMode === 'native' ? (
          <div className="w-full h-full flex flex-col items-center justify-center p-2">
            <iframe
              src={url}
              title={name}
              className="w-full h-full rounded-2xl shadow-md border border-[#dadce0] bg-white"
            />
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
    </div>
  );
};
