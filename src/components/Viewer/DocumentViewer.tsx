import React, { useState, useRef, useEffect } from 'react';
import { 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Maximize2, 
  Minimize2, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  Move,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Share2,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileDown
} from 'lucide-react';
import { DocumentItem, DocumentStatus } from '../../types';
import { ImageViewer } from './ImageViewer';
import { PdfViewer } from './PdfViewer';
import { EpubViewer } from './EpubViewer';
import { TextViewer } from './TextViewer';

interface DocumentViewerProps {
  document: DocumentItem | null;
  onExport: (doc: DocumentItem) => void;
  onExportAsPdf?: (doc: DocumentItem) => void;
  onExportAsJpg?: (doc: DocumentItem) => void;
  onShare: (doc: DocumentItem) => void;
  onUpdateStatus?: (id: string, status: DocumentStatus, notes?: string) => void;
  isReadOnly?: boolean;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  onExport,
  onExportAsPdf,
  onExportAsJpg,
  onShare,
  onUpdateStatus,
  isReadOnly = false
}) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showPanPad, setShowPanPad] = useState<boolean>(false);
  const viewerContainerRef = useRef<HTMLDivElement>(null);

  // Reset controls when document changes
  useEffect(() => {
    setZoom(1.0);
    setRotation(0);
    setCurrentPage(1);
    setTotalPages(1);
    setPanOffset({ x: 0, y: 0 });
  }, [document?.id]);

  if (!document) {
    return (
      <div className="flex-1 bg-[#f8fafd] flex flex-col items-center justify-center p-8 text-[#5f6368] select-none">
        <div className="w-16 h-16 rounded-2xl bg-white border border-[#dadce0] shadow-sm flex items-center justify-center mb-4 text-[#1a73e8]">
          <Move className="w-8 h-8 opacity-40" />
        </div>
        <h3 className="font-['Google_Sans',sans-serif] text-lg font-medium text-[#202124]">No document selected</h3>
        <p className="text-sm text-[#5f6368] mt-1 max-w-sm text-center">
          Choose a document from the left list or upload a new PDF, image, or EPUB to view.
        </p>
      </div>
    );
  }

  // Zoom handlers
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 0.25, 4.0));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 0.25, 0.25));
  const handleResetZoom = () => {
    setZoom(1.0);
    setPanOffset({ x: 0, y: 0 });
    setRotation(0);
  };

  // Rotation handler
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  // Pan nudges
  const panStep = 50;
  const handlePan = (dx: number, dy: number) => {
    setPanOffset((prev) => ({ x: prev.x + dx, y: prev.y + dy }));
  };

  // Fullscreen toggle
  const toggleFullscreen = () => {
    if (!viewerContainerRef.current) return;
    if (!documentModeFullscreen()) {
      viewerContainerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      window.document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const documentModeFullscreen = () => {
    return !!window.document.fullscreenElement;
  };

  return (
    <div
      ref={viewerContainerRef}
      className="flex-1 flex flex-col h-[calc(100vh-7.5rem)] bg-[#f8fafd] overflow-hidden relative"
    >
      {/* Top Document Status Alert Banner */}
      {document.status === 'approved' ? (
        <div className="bg-[#e6f4ea] border-b border-[#ceead6] px-4 py-2 flex items-center justify-between text-xs text-[#137333] font-medium select-none z-20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#137333]" />
            <span>Approved Document • Verified by Solicitor</span>
          </div>
          {onUpdateStatus && !isReadOnly && (
            <button
              onClick={() => onUpdateStatus(document.id, 'pending')}
              className="text-[11px] underline text-[#137333] hover:text-[#0d652d]"
            >
              Reset to Normal
            </button>
          )}
        </div>
      ) : document.status === 'disapproved' ? (
        <div className="bg-[#fce8e6] border-b border-[#fad2cf] px-4 py-2 flex items-center justify-between text-xs text-[#d93025] font-medium select-none z-20">
          <div className="flex items-center gap-2">
            <XCircle className="w-4 h-4 text-[#d93025]" />
            <span>
              Disapproved: {document.notes || 'Please re-upload a compliant copy'}
            </span>
          </div>
          {onUpdateStatus && (
            <button
              onClick={() => onUpdateStatus(document.id, 'approved')}
              className="text-[11px] bg-[#d93025] text-white px-2 py-0.5 rounded hover:bg-[#b31412]"
            >
              Mark Approved
            </button>
          )}
        </div>
      ) : document.status === 'missing' ? (
        <div className="bg-[#fce8e6] border-b border-[#fad2cf] px-4 py-2 flex items-center justify-between text-xs text-[#d93025] font-medium select-none z-20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#d93025]" />
            <span>Missing Document Requirement • File has not been uploaded yet</span>
          </div>
        </div>
      ) : null}

      {/* Viewer Toolbar */}
      <div className="h-14 bg-white border-b border-[#dadce0] px-4 flex items-center justify-between gap-2 shadow-xs z-20 select-none">
        {/* Document Title & Status Pill */}
        <div className="flex items-center gap-2 min-w-0 max-w-[280px] sm:max-w-md">
          <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f1f3f4] text-[#5f6368]">
            {document.fileType}
          </span>
          <span className="font-medium text-sm text-[#202124] truncate" title={document.name}>
            {document.name}
          </span>
        </div>

        {/* Center Viewer Controls (Zoom, Pan, Rotate, Pages) */}
        <div className="flex items-center gap-1 sm:gap-2">
          {/* Zoom controls */}
          <div className="flex items-center bg-[#f1f3f4] rounded-lg p-0.5 border border-[#dadce0]">
            <button
              onClick={handleZoomOut}
              className="p-1.5 text-[#5f6368] hover:text-[#202124] hover:bg-white rounded transition-colors"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleResetZoom}
              className="px-2 text-xs font-medium text-[#202124] hover:bg-white rounded py-1 transition-colors min-w-[50px] text-center"
              title="Reset Zoom (100%)"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button
              onClick={handleZoomIn}
              className="p-1.5 text-[#5f6368] hover:text-[#202124] hover:bg-white rounded transition-colors"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Pan / Move Controls Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowPanPad(!showPanPad)}
              className={`p-1.5 rounded-lg border border-[#dadce0] transition-colors ${
                showPanPad || panOffset.x !== 0 || panOffset.y !== 0
                  ? 'bg-[#e8f0fe] text-[#1a73e8] border-[#1a73e8]'
                  : 'bg-white text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#202124]'
              }`}
              title="Pan / Move Viewer Left, Right, Up, Down"
            >
              <Move className="w-4 h-4" />
            </button>

            {showPanPad && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowPanPad(false)} />
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 bg-white border border-[#dadce0] rounded-xl shadow-xl p-3 z-50 flex flex-col items-center gap-1 w-36 animate-in fade-in zoom-in-95 duration-100">
                  <div className="text-[10px] uppercase font-semibold text-[#5f6368] mb-1">Pan Controls</div>
                  <button
                    onClick={() => handlePan(0, panStep)}
                    className="p-1.5 hover:bg-[#f1f3f4] rounded-lg text-[#202124]"
                    title="Pan Up"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePan(panStep, 0)}
                      className="p-1.5 hover:bg-[#f1f3f4] rounded-lg text-[#202124]"
                      title="Pan Left"
                    >
                      <ArrowLeft className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPanOffset({ x: 0, y: 0 })}
                      className="p-1 text-[11px] font-medium text-[#1a73e8] hover:bg-[#e8f0fe] rounded"
                      title="Center / Reset Offset"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handlePan(-panStep, 0)}
                      className="p-1.5 hover:bg-[#f1f3f4] rounded-lg text-[#202124]"
                      title="Pan Right"
                    >
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => handlePan(0, -panStep)}
                    className="p-1.5 hover:bg-[#f1f3f4] rounded-lg text-[#202124]"
                    title="Pan Down"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Rotate button */}
          <button
            onClick={handleRotate}
            className="p-1.5 bg-white border border-[#dadce0] rounded-lg text-[#5f6368] hover:bg-[#f1f3f4] hover:text-[#202124] transition-colors"
            title="Rotate 90° Clockwise"
          >
            <RotateCw className="w-4 h-4" />
          </button>

          {/* PDF Page Navigation */}
          {document.fileType === 'pdf' && totalPages > 1 && (
            <div className="flex items-center bg-[#f1f3f4] rounded-lg px-2 py-1 border border-[#dadce0] text-xs">
              <button
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                className="p-0.5 text-[#5f6368] hover:text-[#202124] disabled:opacity-30"
                title="Previous page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="mx-1 text-[#202124] font-medium">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                className="p-0.5 text-[#5f6368] hover:text-[#202124] disabled:opacity-30"
                title="Next page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Right Actions (Approval, Share, Export, Fullscreen) */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Direct Approval / Disapproval Buttons */}
          {onUpdateStatus && (
            <div className="flex items-center gap-1 bg-[#f1f3f4] p-0.5 rounded-lg border border-[#dadce0]">
              <button
                onClick={() => onUpdateStatus(document.id, 'approved')}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                  document.status === 'approved'
                    ? 'bg-[#137333] text-white'
                    : 'text-[#137333] hover:bg-[#e6f4ea]'
                }`}
                title="Approve document (Turns Green)"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Approve</span>
              </button>
              <button
                onClick={() => {
                  const reason = prompt('Reason for disapproval:', document.notes || '');
                  onUpdateStatus(document.id, 'disapproved', reason || undefined);
                }}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold transition-colors ${
                  document.status === 'disapproved'
                    ? 'bg-[#d93025] text-white'
                    : 'text-[#d93025] hover:bg-[#fce8e6]'
                }`}
                title="Disapprove document (Turns Red)"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Disapprove</span>
              </button>
            </div>
          )}

          {!isReadOnly && (
            <button
              onClick={() => onShare(document)}
              className="p-1.5 text-[#5f6368] hover:text-[#1a73e8] hover:bg-[#f1f3f4] rounded-lg border border-[#dadce0] transition-colors"
              title="Share this document with client"
            >
              <Share2 className="w-4 h-4" />
            </button>
          )}

          {document.hasFile && (
            <button
              onClick={() => onExport(document)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#202124] bg-white hover:bg-[#f1f3f4] border border-[#dadce0] rounded-lg transition-colors shadow-xs"
              title="Download original file"
            >
              <Download className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span className="hidden sm:inline">Download</span>
            </button>
          )}

          <button
            onClick={toggleFullscreen}
            className="p-1.5 text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-lg border border-[#dadce0] transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main View Area */}
      <div className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center">
        {!document.hasFile ? (
          <div className="p-8 text-center bg-white border border-[#ea4335] rounded-3xl shadow-md max-w-md animate-in fade-in duration-200">
            <div className="w-16 h-16 rounded-2xl bg-[#fce8e6] text-[#d93025] flex items-center justify-center mx-auto mb-4 ring-4 ring-red-50">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h3 className="font-['Google_Sans',sans-serif] text-base font-bold text-[#d93025]">
              Document Missing (Requirement Pending)
            </h3>
            <p className="text-xs text-[#5f6368] mt-2 mb-4">
              {document.notes || 'This document requirement has been created by the solicitor, but no file has been uploaded yet.'}
            </p>
            <div className="p-3 bg-[#f8fafd] border border-[#dadce0] rounded-xl text-xs text-[#202124] mb-4 text-left">
              <p><strong>Requirement:</strong> {document.name}</p>
              <p><strong>Status:</strong> Marked in RED (Action Required)</p>
            </div>
          </div>
        ) : document.fileType === 'pdf' ? (
          <PdfViewer
            url={document.url}
            name={document.name}
            zoom={zoom}
            rotation={rotation}
            currentPage={currentPage}
            onTotalPagesChange={setTotalPages}
            panOffset={panOffset}
            onPanChange={setPanOffset}
          />
        ) : ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(document.fileType) ? (
          <ImageViewer
            url={document.url}
            name={document.name}
            zoom={zoom}
            rotation={rotation}
            panOffset={panOffset}
            onPanChange={setPanOffset}
          />
        ) : document.fileType === 'epub' ? (
          <EpubViewer
            url={document.url}
            name={document.name}
            zoom={zoom}
          />
        ) : document.fileType === 'txt' ? (
          <TextViewer
            url={document.url}
            name={document.name}
            zoom={zoom}
          />
        ) : (
          <div className="p-8 text-center bg-white border border-[#dadce0] rounded-2xl shadow-sm max-w-sm">
            <p className="font-medium text-sm text-[#202124] mb-2">{document.name}</p>
            <button
              onClick={() => onExport(document)}
              className="px-4 py-2 bg-[#1a73e8] text-white text-xs font-medium rounded-lg shadow-sm"
            >
              Download File
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
