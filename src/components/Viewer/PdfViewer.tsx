import React, { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ExternalLink, Layers, Sparkles, ArrowLeft } from 'lucide-react';

// Configure PDF.js worker
if (typeof window !== 'undefined' && 'Worker' in window) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

interface PdfPageCanvasProps {
  pdfDoc: any;
  pageNum: number;
  zoom: number;
  rotation: number;
}

const PdfPageCanvas: React.FC<PdfPageCanvasProps> = ({ pdfDoc, pageNum, zoom, rotation }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rendering, setRendering] = useState(true);
  const [dimensions, setDimensions] = useState<{ width: number; height: number } | null>(null);

  useEffect(() => {
    let renderTask: any = null;
    let isCancelled = false;

    const render = async () => {
      try {
        setRendering(true);
        const page = await pdfDoc.getPage(pageNum);
        if (isCancelled) return;

        // Base scale 1.4 gives high-DPI crispness on retina and modern screens
        const viewport = page.getViewport({ scale: zoom * 1.4, rotation });
        const canvas = canvasRef.current;
        if (!canvas || isCancelled) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        setDimensions({ width: viewport.width, height: viewport.height });

        renderTask = page.render({
          canvasContext: context,
          viewport: viewport
        });

        await renderTask.promise;
        if (!isCancelled) {
          setRendering(false);
        }
      } catch (err: any) {
        if (err?.name !== 'RenderingCancelledException') {
          console.warn(`Error rendering PDF page ${pageNum}:`, err);
        }
      }
    };

    render();

    return () => {
      isCancelled = true;
      if (renderTask) {
        renderTask.cancel();
      }
    };
  }, [pdfDoc, pageNum, zoom, rotation]);

  return (
    <div className="flex flex-col items-center mb-6 last:mb-2 w-full">
      <div className="text-[11px] font-semibold text-[#5f6368] mb-1.5 bg-white/90 backdrop-blur-xs px-2.5 py-0.5 rounded-full border border-[#dadce0] shadow-xs">
        Page {pageNum} of {pdfDoc.numPages}
      </div>
      <div
        className="relative shadow-xl rounded-md bg-white border border-[#dadce0] overflow-hidden flex items-center justify-center transition-all duration-150"
        style={{
          minWidth: dimensions ? `${Math.min(dimensions.width, 300)}px` : '300px',
          minHeight: dimensions ? `${Math.min(dimensions.height, 400)}px` : '400px'
        }}
      >
        {rendering && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-xs z-10 text-[#5f6368] text-xs">
            <div className="w-6 h-6 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin mb-1.5" />
            <span>Loading Page {pageNum}...</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="block max-w-full h-auto"
        />
      </div>
    </div>
  );
};

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
  const singleCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [viewMode, setViewMode] = useState<'continuous' | 'single' | 'native'>('continuous');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  // Helper to convert base64 data URI to Uint8Array safely for files of any size
  const dataUriToUint8Array = (dataUri: string): Uint8Array => {
    try {
      const base64 = dataUri.includes(',') ? dataUri.split(',')[1] : dataUri;
      const cleanBase64 = base64.replace(/[\s\r\n]+/g, '');
      const binaryStr = atob(cleanBase64);
      const len = binaryStr.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryStr.charCodeAt(i);
      }
      return bytes;
    } catch (err) {
      console.warn('PDF data URI decode note:', err);
      return new Uint8Array(0);
    }
  };

  // Prepare a proper application/pdf Blob URL (Required by Chromium/Safari to prevent blank white iframe or connection refused)
  useEffect(() => {
    let active = true;
    let createdUrl: string | null = null;

    const prepareBlob = async () => {
      try {
        if (!url || !url.trim()) {
          if (active) setBlobUrl(null);
          return;
        }
        if (url.startsWith('data:')) {
          const bytes = dataUriToUint8Array(url);
          if (bytes.length > 0) {
            const blob = new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
            createdUrl = URL.createObjectURL(blob);
            if (active) setBlobUrl(createdUrl);
          } else {
            if (active) setBlobUrl(url);
          }
        } else if (url.startsWith('http')) {
          // Fetch remote bytes and convert to same-origin Blob URL to eliminate 'refused to connect' CSP/iframe errors
          try {
            const res = await fetch(url);
            if (res.ok) {
              const buf = await res.arrayBuffer();
              if (active) {
                const blob = new Blob([buf], { type: 'application/pdf' });
                createdUrl = URL.createObjectURL(blob);
                setBlobUrl(createdUrl);
                return;
              }
            }
          } catch (e) {
            console.warn('Could not pre-convert remote PDF to blob URL:', e);
          }
          if (active) setBlobUrl(url);
        } else {
          if (active) setBlobUrl(url);
        }
      } catch (e) {
        console.warn('Could not create PDF blob URL:', e);
        if (active) setBlobUrl(url);
      }
    };

    prepareBlob();

    return () => {
      active = false;
      if (createdUrl) {
        URL.revokeObjectURL(createdUrl);
      }
    };
  }, [url]);

  // Load PDF Document via PDF.js with instant fallback to native viewer
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);

    const loadPdf = async () => {
      try {
        if (!url || !url.trim()) {
          setLoading(false);
          return;
        }

        let source: any = url;
        if (url.startsWith('data:')) {
          const bytes = dataUriToUint8Array(url);
          if (bytes.length > 0) {
            source = { data: bytes };
          }
        } else if (url.startsWith('http')) {
          // Pre-fetch binary with 15s timeout for fast parsing without prematurely dropping large files
          try {
            const fetchCtrl = new AbortController();
            const tid = setTimeout(() => fetchCtrl.abort(), 15000);
            const res = await fetch(url, { signal: fetchCtrl.signal });
            clearTimeout(tid);
            if (res.ok) {
              const buf = await res.arrayBuffer();
              source = { data: new Uint8Array(buf) };
            }
          } catch (e) {
            console.warn('PDF fast fetch note (will let pdfjs try url):', e);
            source = url;
          }
        }

        const loadingTask = pdfjsLib.getDocument(source);
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('PDF.js render timeout')), 20000)
        );
        const doc: any = await Promise.race([loadingTask.promise, timeoutPromise]);

        if (!isCancelled) {
          setPdfDoc(doc);
          onTotalPagesChange(doc.numPages);
          setLoading(false);
        }
      } catch (err: any) {
        console.warn('PDF.js canvas parse note, switching to native viewer:', err);
        if (!isCancelled) {
          setViewMode('native');
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [url]);

  // Render single page onto canvas (when in 'single' mode)
  useEffect(() => {
    if (!pdfDoc || !singleCanvasRef.current || viewMode !== 'single') return;

    let renderTask: any = null;

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        const viewport = page.getViewport({ scale: zoom * 1.5, rotation });
        const canvas = singleCanvasRef.current;
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
    if (viewMode !== 'single') return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({
      x: e.clientX - panOffset.x,
      y: e.clientY - panOffset.y
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || viewMode !== 'single') return;
    onPanChange({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const openInNewTab = () => {
    const targetUrl = blobUrl || url;
    if (targetUrl) {
      window.open(targetUrl, '_blank');
    }
  };

  return (
    <div className="w-full h-full flex flex-col relative overflow-hidden bg-[#f0f3f8]">
      {/* PDF View Mode Switcher Badge */}
      <div className="absolute top-3 right-4 z-20 flex items-center gap-1 bg-white/95 backdrop-blur-xs border border-[#dadce0] rounded-xl p-1 shadow-sm text-xs select-none">
        <button
          onClick={() => setViewMode('continuous')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
            viewMode === 'continuous'
              ? 'bg-[#1a73e8] text-white shadow-xs font-semibold'
              : 'text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4]'
          }`}
          title="Scroll vertically through all PDF pages with mouse wheel"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Continuous Scroll</span>
        </button>

        <button
          onClick={() => setViewMode('single')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
            viewMode === 'single'
              ? 'bg-[#1a73e8] text-white shadow-xs font-semibold'
              : 'text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4]'
          }`}
          title="Single page interactive canvas with zoom and pan"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Single Page</span>
        </button>

        <button
          onClick={() => setViewMode('native')}
          className={`px-2.5 py-1 rounded-lg font-medium transition-colors flex items-center gap-1.5 ${
            viewMode === 'native'
              ? 'bg-[#1a73e8] text-white shadow-xs font-semibold'
              : 'text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4]'
          }`}
          title="Open inside browser's native viewer"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Native Browser</span>
        </button>
      </div>

      {/* Main Container */}
      {loading && (
        <div className="w-full flex-1 flex flex-col items-center justify-center gap-2 text-[#5f6368]">
          <div className="w-8 h-8 border-3 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium">Rendering PDF document...</p>
          <button
            onClick={() => {
              setViewMode('native');
              setLoading(false);
            }}
            className="mt-2 text-xs text-[#1a73e8] hover:underline font-semibold flex items-center gap-1 bg-[#e8f0fe] px-3 py-1.5 rounded-lg transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Switch to Instant Native View</span>
          </button>
        </div>
      )}

      {/* Mode 1: True Continuous Scroll View (PDF.js Canvas) */}
      {!loading && viewMode === 'continuous' && (
        <div
          ref={containerRef}
          className="w-full flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 flex flex-col items-center"
        >
          {pdfDoc &&
            Array.from({ length: pdfDoc.numPages }, (_, i) => i + 1).map((pageNum) => (
              <PdfPageCanvas
                key={`${url}_page_${pageNum}`}
                pdfDoc={pdfDoc}
                pageNum={pageNum}
                zoom={zoom}
                rotation={rotation}
              />
            ))}
        </div>
      )}

      {/* Mode 2: Single Page Interactive Canvas */}
      {!loading && viewMode === 'single' && (
        <div
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`w-full flex-1 flex items-center justify-center overflow-auto p-4 relative ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          <div
            style={{
              transform: `translate(${panOffset.x}px, ${panOffset.y}px)`,
              transition: isDragging ? 'none' : 'transform 0.1s ease-out'
            }}
            className="flex justify-center"
          >
            <canvas
              ref={singleCanvasRef}
              className="shadow-2xl rounded-sm bg-white border border-[#dadce0] max-w-none"
              style={{
                maxHeight: zoom <= 1 ? '82vh' : 'none'
              }}
            />
          </div>
        </div>
      )}

      {/* Mode 3: Native Browser Mode with Blob URL & Direct Open Tab Option */}
      {!loading && viewMode === 'native' && (
        <div className="w-full flex-1 flex flex-col relative bg-[#525659]">
          {/* Top Info Bar */}
          <div className="bg-[#323639] text-white px-4 py-2 flex items-center justify-between text-xs z-10 select-none border-b border-[#202124]">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#34a853]" />
              <span className="font-medium text-gray-200">Native Browser PDF Viewer</span>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openInNewTab}
                className="flex items-center gap-1.5 px-3 py-1 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg font-medium transition-colors shadow-xs"
                title="Open this PDF full screen in a new browser tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Open in New Tab</span>
              </button>
              <button
                onClick={() => setViewMode('continuous')}
                className="flex items-center gap-1 px-2.5 py-1 bg-white/10 hover:bg-white/20 text-gray-200 rounded-lg transition-colors"
                title="Return to Continuous Scroll View"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Continuous Scroll</span>
              </button>
            </div>
          </div>

          {/* Embedded Native Viewer Container */}
          <div className="flex-1 w-full relative bg-[#525659]">
            {blobUrl ? (
              <object
                data={`${blobUrl}#toolbar=1&navpanes=1`}
                type="application/pdf"
                className="absolute inset-0 w-full h-full"
              >
                {/* Iframe fallback */}
                <iframe
                  src={`${blobUrl}#toolbar=1`}
                  title={name}
                  className="absolute inset-0 w-full h-full border-0"
                />
              </object>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-white gap-2">
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <p className="text-xs">Preparing PDF stream...</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
