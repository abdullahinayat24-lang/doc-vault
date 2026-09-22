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
  FileDown,
  CreditCard,
  Columns,
  Layers,
  Plus,
  Edit2,
  Check,
  X,
  FileText,
  ChevronDown,
  Image as ImageIcon,
  Printer,
  Clock
} from 'lucide-react';
import { DocumentItem, DocumentStatus, SolicitorProfile } from '../../types';
import { printDocument } from '../../lib/printUtils';
import { ImageViewer } from './ImageViewer';
import { PdfViewer } from './PdfViewer';
import { EpubViewer } from './EpubViewer';
import { TextViewer } from './TextViewer';
import { DocxEditor } from './DocxEditor';

interface DocumentViewerProps {
  document: DocumentItem | null;
  onExport: (doc: DocumentItem) => void;
  onExportAsPdf?: (doc: DocumentItem) => void;
  onExportAsJpg?: (doc: DocumentItem) => void;
  onShare: (doc: DocumentItem) => void;
  onUpdateStatus?: (id: string, status: DocumentStatus, notes?: string) => void;
  onAddPageToDoc?: (docId: string, pageName: string, file: File) => void;
  onRenameDocument?: (id: string, newName: string) => void;
  onRenamePage?: (docId: string, pageIndex: number, newPageName: string) => void;
  onUpdateDocumentRotation?: (id: string, rotation: number, pageIndex?: number) => void;
  onUpdateDocumentContent?: (docId: string, newContent: string) => void;
  solicitor?: SolicitorProfile | null;
  clientName?: string;
  tabTitle?: string;
  onPrintDocument?: (doc: DocumentItem) => void;
  isReadOnly?: boolean;
}

export const DocumentViewer: React.FC<DocumentViewerProps> = ({
  document,
  onExport,
  onExportAsPdf,
  onExportAsJpg,
  onShare,
  onUpdateStatus,
  onAddPageToDoc,
  onRenameDocument,
  onRenamePage,
  onUpdateDocumentRotation,
  onUpdateDocumentContent,
  solicitor,
  clientName,
  tabTitle,
  onPrintDocument,
  isReadOnly = false
}) => {
  const [zoom, setZoom] = useState<number>(1.0);
  const [rotation, setRotation] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [panOffset, setPanOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showPanPad, setShowPanPad] = useState<boolean>(false);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [viewLayout, setViewLayout] = useState<'single' | 'side-by-side' | 'scroll'>('single');
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>('');
  const [showExportMenu, setShowExportMenu] = useState<boolean>(false);
  const [showVersionHistory, setShowVersionHistory] = useState<boolean>(false);
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const addPageInputRef = useRef<HTMLInputElement>(null);

  const handlePrint = async (doc: DocumentItem) => {
    if (isPrinting) return;
    try {
      setIsPrinting(true);
      if (onPrintDocument) {
        onPrintDocument(doc);
      } else {
        await printDocument(doc, {
          solicitor,
          clientName,
          tabTitle
        });
      }
    } catch (err) {
      console.warn('Print error:', err);
    } finally {
      setIsPrinting(false);
    }
  };

  // Keyboard shortcut Ctrl+P / Cmd+P
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        if (document && (document.hasFile || document.content)) {
          e.preventDefault();
          handlePrint(document);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [document, solicitor, clientName, tabTitle]);

  // Sync controls when document or active page changes
  useEffect(() => {
    setZoom(1.0);
    const initialRot = (document?.pages && document.pages[activePageIndex]?.rotation !== undefined)
      ? (document.pages[activePageIndex].rotation || 0)
      : (document?.rotation || 0);
    setRotation(initialRot);
    setCurrentPage(1);
    setTotalPages(1);
    setPanOffset({ x: 0, y: 0 });
    setIsEditingName(false);
    setNameInput(document?.name || '');
  }, [document?.id, activePageIndex]);

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
    if (onUpdateDocumentRotation && document) {
      if (document.pages && document.pages.length > 0) {
        onUpdateDocumentRotation(document.id, 0, activePageIndex);
      } else {
        onUpdateDocumentRotation(document.id, 0);
      }
    }
  };

  // Rotation handler (persists rotation permanently)
  const handleRotate = () => {
    const nextRot = (rotation + 90) % 360;
    setRotation(nextRot);
    if (onUpdateDocumentRotation && document) {
      if (document.pages && document.pages.length > 0) {
        onUpdateDocumentRotation(document.id, nextRot, activePageIndex);
      } else {
        onUpdateDocumentRotation(document.id, nextRot);
      }
    }
  };

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
      className="flex-1 flex flex-col h-full w-full min-h-0 bg-[#f8fafd] overflow-hidden relative"
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
        {isEditingName ? (
          <div className="flex items-center gap-1.5 flex-1 min-w-0 max-w-sm sm:max-w-md">
            <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f1f3f4] text-[#5f6368] flex-shrink-0">
              {document.fileType}
            </span>
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (nameInput.trim() && onRenameDocument) {
                    onRenameDocument(document.id, nameInput.trim());
                  }
                  setIsEditingName(false);
                }
                if (e.key === 'Escape') {
                  setIsEditingName(false);
                }
              }}
              autoFocus
              className="text-xs sm:text-sm font-semibold px-2 py-1 bg-white border border-[#1a73e8] rounded-md shadow-xs outline-none text-[#202124] flex-1 min-w-0"
            />
            <button
              onClick={() => {
                if (nameInput.trim() && onRenameDocument) {
                  onRenameDocument(document.id, nameInput.trim());
                }
                setIsEditingName(false);
              }}
              className="p-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-md transition-colors flex-shrink-0"
              title="Save Name (Enter)"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setIsEditingName(false)}
              className="p-1.5 hover:bg-[#f1f3f4] text-[#5f6368] rounded-md transition-colors flex-shrink-0"
              title="Cancel (Esc)"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0 max-w-[280px] sm:max-w-md group/title">
            <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#f1f3f4] text-[#5f6368] flex-shrink-0">
              {document.fileType}
            </span>
            <span 
              className="font-medium text-sm text-[#202124] truncate" 
              title={`${document.name} (Double-click to rename)`}
              onDoubleClick={() => {
                if (onRenameDocument && !isReadOnly) {
                  setNameInput(document.name);
                  setIsEditingName(true);
                }
              }}
            >
              {document.name}
            </span>
            {onRenameDocument && !isReadOnly && (
              <button
                onClick={() => {
                  setNameInput(document.name);
                  setIsEditingName(true);
                }}
                className="p-1 text-[#5f6368] hover:text-[#1a73e8] hover:bg-[#f1f3f4] rounded-md transition-colors opacity-70 group-hover/title:opacity-100 flex-shrink-0"
                title="Rename Document"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Version History Pill & Popover */}
            {document.versions && document.versions.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowVersionHistory(!showVersionHistory)}
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#e8f0fe] text-[#1a73e8] border border-[#d2e3fc] hover:bg-[#d2e3fc] flex items-center gap-1 transition-colors flex-shrink-0"
                  title="View version history of this document"
                >
                  <Clock className="w-3 h-3" />
                  <span>v{(document.versions.length) + 1}</span>
                </button>

                {showVersionHistory && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowVersionHistory(false)} />
                    <div className="absolute left-0 top-full mt-2 w-72 bg-white border border-[#dadce0] rounded-2xl shadow-xl p-3 z-50 animate-in fade-in zoom-in-95 duration-100 text-xs">
                      <div className="flex items-center justify-between pb-2 border-b border-[#dadce0] mb-2">
                        <span className="font-bold text-[#202124]">Legal Version History</span>
                        <span className="text-[10px] font-semibold text-[#1a73e8]">
                          {document.versions.length + 1} versions
                        </span>
                      </div>
                      <div className="space-y-1.5 max-h-56 overflow-y-auto">
                        <div className="p-2 rounded-xl bg-[#e8f0fe]/60 border border-[#d2e3fc]">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[#1a73e8]">v{document.versions.length + 1} (Current Active)</span>
                            <span className="text-[10px] text-[#5f6368]">{document.fileSize ? `${(document.fileSize / 1024).toFixed(1)} KB` : ''}</span>
                          </div>
                          <p className="text-[11px] text-[#5f6368] mt-0.5">
                            Uploaded by <strong className="capitalize">{document.uploadedBy || 'solicitor'}</strong> on {new Date(document.updatedAt || document.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        {[...document.versions].reverse().map((v) => (
                          <div key={v.versionNumber} className="p-2 rounded-xl border border-[#dadce0] bg-[#f8fafd] hover:bg-white transition-colors flex items-center justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 font-bold text-[#202124]">
                                <span>v{v.versionNumber}</span>
                                <span className="text-[10px] font-normal text-[#5f6368]">({(v.fileSize / 1024).toFixed(1)} KB)</span>
                              </div>
                              <p className="text-[10px] text-[#5f6368]">
                                {new Date(v.uploadedAt).toLocaleDateString()} by <span className="capitalize font-medium">{v.uploadedBy || 'solicitor'}</span>
                              </p>
                            </div>
                            {v.url && (
                              <a
                                href={v.url}
                                download={`${document.name.replace(/\.[^/.]+$/, '')}_v${v.versionNumber}.${v.fileType || 'pdf'}`}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1 text-[#1a73e8] hover:bg-[#e8f0fe] rounded-lg transition-colors"
                                title={`Download archived v${v.versionNumber}`}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

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

          {/* Add Page / Back Side Button */}
          {document.hasFile && onAddPageToDoc && (
            <>
              <input
                ref={addPageInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.pdf"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    const file = e.target.files[0];
                    const defaultPageName = (!document.pages || document.pages.length <= 1) 
                      ? 'Back Side' 
                      : `Page ${(document.pages?.length || 0) + 1}`;
                    const name = prompt('Label for this side / page:', defaultPageName);
                    if (name !== null) {
                      onAddPageToDoc(document.id, name.trim() || defaultPageName, file);
                    }
                    if (addPageInputRef.current) addPageInputRef.current.value = '';
                  }
                }}
                className="hidden"
              />
              <button
                onClick={() => addPageInputRef.current?.click()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold text-[#1a73e8] bg-[#e8f0fe] hover:bg-[#d2e3fc] border border-[#1a73e8]/30 rounded-lg transition-colors shadow-xs"
                title="Attach Back Side or additional page to this document"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">+ Add {(!document.pages || document.pages.length <= 1) ? 'Back Side' : 'Page'}</span>
              </button>
            </>
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

          {(document.hasFile || document.content) && (
            <button
              onClick={() => handlePrint(document)}
              disabled={isPrinting}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#1a73e8] bg-white hover:bg-[#e8f0fe] border border-[#dadce0] hover:border-[#1a73e8]/40 rounded-lg transition-colors shadow-xs"
              title="Print document (Smart ID Card sizing on single A4 page) (Ctrl+P)"
            >
              {isPrinting ? (
                <div className="w-3.5 h-3.5 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Printer className="w-3.5 h-3.5 text-[#1a73e8]" />
              )}
              <span className="hidden sm:inline">{isPrinting ? 'Printing...' : 'Print'}</span>
            </button>
          )}

          {document.hasFile && (
            <div className="relative">
              <div className="flex items-center">
                <button
                  onClick={() => onExport(document)}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#202124] bg-white hover:bg-[#f1f3f4] border border-[#dadce0] rounded-l-lg transition-colors shadow-xs"
                  title="Download original file"
                >
                  <Download className="w-3.5 h-3.5 text-[#1a73e8]" />
                  <span className="hidden sm:inline">Download</span>
                </button>
                <button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="p-1.5 bg-white hover:bg-[#f1f3f4] border-y border-r border-[#dadce0] rounded-r-lg transition-colors text-[#5f6368] hover:text-[#202124]"
                  title="Export options (JPG, PDF, Print, Original)"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>

              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 top-full mt-1.5 w-60 bg-white border border-[#dadce0] rounded-xl shadow-xl py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                    <button
                      onClick={() => {
                        handlePrint(document);
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#f8fafd] text-[#1a73e8] flex items-center gap-2.5 transition-colors font-semibold"
                    >
                      <Printer className="w-4 h-4 text-[#1a73e8]" />
                      <span>Print Document (Ctrl+P)</span>
                    </button>
                    <button
                      onClick={() => {
                        onExport(document);
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-3.5 py-2 hover:bg-[#f8fafd] text-[#202124] flex items-center gap-2.5 transition-colors"
                    >
                      <Download className="w-4 h-4 text-[#5f6368]" />
                      <span>Download Original ({document.fileType.toUpperCase()})</span>
                    </button>
                    {onExportAsJpg && (
                      <button
                        onClick={() => {
                          onExportAsJpg(document);
                          setShowExportMenu(false);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-[#f8fafd] text-[#1a73e8] flex items-center gap-2.5 transition-colors font-medium"
                      >
                        <ImageIcon className="w-4 h-4 text-[#1a73e8]" />
                        <span>Convert &amp; Export as JPG</span>
                      </button>
                    )}
                    {onExportAsPdf && (
                      <button
                        onClick={() => {
                          onExportAsPdf(document);
                          setShowExportMenu(false);
                        }}
                        className="w-full text-left px-3.5 py-2 hover:bg-[#f8fafd] text-[#202124] flex items-center gap-2.5 transition-colors"
                      >
                        <FileText className="w-4 h-4 text-[#d93025]" />
                        <span>Convert &amp; Export as PDF</span>
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
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

      {/* Multi-Page / 2-Sided Switcher Bar */}
      {document.pages && document.pages.length > 1 && (
        <div className="bg-white border-b border-[#dadce0] px-4 py-2 flex items-center justify-between gap-2 overflow-x-auto shadow-xs z-10 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#5f6368] uppercase tracking-wider flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-[#1a73e8]" />
              Sides / Pages ({document.pages.length}):
            </span>
            <div className="flex items-center gap-1.5">
              {document.pages.map((p, idx) => (
                <div key={p.id || idx} className="relative group/page flex items-center">
                  <button
                    onClick={() => {
                      setActivePageIndex(idx);
                      setViewLayout('single');
                    }}
                    className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all ${
                      viewLayout === 'single' && activePageIndex === idx
                        ? 'bg-[#1a73e8] text-white shadow-xs font-semibold'
                        : 'bg-[#f1f3f4] text-[#3c4043] hover:bg-[#e8eaed]'
                    }`}
                  >
                    <span>{p.name}</span>
                  </button>
                  {onRenamePage && !isReadOnly && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newSideName = prompt('Rename this side / page:', p.name);
                        if (newSideName !== null && newSideName.trim()) {
                          onRenamePage(document.id, idx, newSideName.trim());
                        }
                      }}
                      className="ml-0.5 p-1 text-[#5f6368] hover:text-[#1a73e8] hover:bg-[#f1f3f4] rounded-full opacity-0 group-hover/page:opacity-100 transition-opacity"
                      title={`Rename "${p.name}"`}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-[#f1f3f4] p-1 rounded-xl border border-[#dadce0] text-xs">
            {/* Single page */}
            <button
              onClick={() => setViewLayout('single')}
              className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                viewLayout === 'single'
                  ? 'bg-white text-[#1a73e8] shadow-xs font-semibold'
                  : 'text-[#5f6368] hover:text-[#202124]'
              }`}
              title="Single page view"
            >
              Single
            </button>

            {/* Side-by-Side */}
            <button
              onClick={() => setViewLayout('side-by-side')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                viewLayout === 'side-by-side'
                  ? 'bg-white text-[#1a73e8] shadow-xs font-semibold'
                  : 'text-[#5f6368] hover:text-[#202124]'
              }`}
              title="View both sides side-by-side"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>

            {/* Continuous Scroll View */}
            <button
              onClick={() => setViewLayout('scroll')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg font-medium transition-colors ${
                viewLayout === 'scroll'
                  ? 'bg-white text-[#1a73e8] shadow-xs font-semibold'
                  : 'text-[#5f6368] hover:text-[#202124]'
              }`}
              title="Continuous vertical scroll view through all pages/sides"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Scroll View</span>
            </button>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <div className="flex-1 w-full h-full min-h-0 relative overflow-hidden flex items-center justify-center">
        {/* Continuous Scroll View Layout */}
        {viewLayout === 'scroll' && document.pages && document.pages.length > 0 ? (
          <div className="flex-1 w-full h-full min-h-0 p-4 overflow-y-auto overscroll-contain space-y-6 flex flex-col items-center">
            {document.pages.map((page, idx) => {
              const pageRotation = page.rotation !== undefined ? page.rotation : (document.rotation || 0);
              return (
                <div
                  key={page.id || idx}
                  className="bg-white border border-[#dadce0] rounded-2xl flex flex-col overflow-hidden shadow-md max-w-3xl w-full"
                >
                  <div className="bg-[#f8fafd] border-b border-[#dadce0] px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1a73e8] uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      {page.name || `Page ${idx + 1}`}
                    </span>
                    <div className="flex items-center gap-2">
                      {onUpdateDocumentRotation && !isReadOnly && (
                        <button
                          onClick={() => {
                            const nextRot = (pageRotation + 90) % 360;
                            onUpdateDocumentRotation(document.id, nextRot, idx);
                          }}
                          className="flex items-center gap-1 text-[11px] font-semibold text-[#5f6368] hover:text-[#1a73e8] bg-white px-2 py-1 rounded-md border border-[#dadce0] hover:bg-[#f1f3f4] transition-colors shadow-2xs"
                          title="Rotate this page/side 90°"
                        >
                          <RotateCw className="w-3 h-3" />
                          <span>Rotate</span>
                        </button>
                      )}
                      <span className="text-[10px] uppercase font-semibold text-[#5f6368] bg-[#f1f3f4] px-2 py-0.5 rounded">
                        Page {idx + 1} of {document.pages?.length} • {page.fileType}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 bg-[#fdfdfe] flex items-center justify-center overflow-auto">
                    {page.fileType === 'pdf' ? (
                      <div className="w-full h-[650px]">
                        <PdfViewer
                          url={page.url}
                          name={page.name}
                          zoom={1.0}
                          rotation={pageRotation}
                          currentPage={1}
                          onTotalPagesChange={() => {}}
                          panOffset={{ x: 0, y: 0 }}
                          onPanChange={() => {}}
                        />
                      </div>
                    ) : (
                      <img
                        src={page.url}
                        alt={page.name}
                        style={{
                          transform: `rotate(${pageRotation}deg)`,
                          transition: 'transform 0.2s ease-out'
                        }}
                        className="max-w-full max-h-[750px] object-contain rounded-lg shadow-xs"
                      />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : viewLayout === 'side-by-side' && document.pages && document.pages.length >= 2 ? (
          <div className="flex-1 w-full h-full min-h-0 p-4 overflow-y-auto overscroll-contain">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 h-full min-h-[450px]">
              {document.pages.slice(0, 2).map((page, idx) => (
                <div
                  key={page.id || idx}
                  className="bg-white border border-[#dadce0] rounded-2xl flex flex-col overflow-hidden shadow-xs h-full"
                >
                  <div className="bg-[#f8fafd] border-b border-[#dadce0] px-4 py-2.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#1a73e8] uppercase tracking-wider flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5" />
                      {page.name}
                    </span>
                    <span className="text-[10px] uppercase font-semibold text-[#5f6368] bg-[#f1f3f4] px-2 py-0.5 rounded">
                      {page.fileType}
                    </span>
                  </div>
                  <div className="flex-1 p-3 bg-[#f8fafd] flex items-center justify-center overflow-hidden">
                    {page.fileType === 'pdf' ? (
                      <div className="w-full h-full min-h-[400px]">
                        <PdfViewer
                          url={page.url}
                          name={page.name}
                          zoom={0.85}
                          rotation={page.rotation || 0}
                          currentPage={1}
                          onTotalPagesChange={() => {}}
                          panOffset={{ x: 0, y: 0 }}
                          onPanChange={() => {}}
                        />
                      </div>
                    ) : (
                      <img
                        src={page.url}
                        alt={page.name}
                        style={{
                          transform: `rotate(${page.rotation || 0}deg)`,
                          transition: 'transform 0.2s ease-out'
                        }}
                        className="max-w-full max-h-full object-contain rounded-lg shadow-xs"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : !document.hasFile ? (
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
        ) : (() => {
          const hasPages = Boolean(document.pages && document.pages.length > 0);
          const activePage = hasPages
            ? (document.pages![activePageIndex] || document.pages![0])
            : { name: document.name, url: document.url, fileType: document.fileType };

          return activePage.fileType === 'pdf' ? (
            <PdfViewer
              url={activePage.url}
              name={`${document.name} - ${activePage.name}`}
              zoom={zoom}
              rotation={rotation}
              currentPage={currentPage}
              onTotalPagesChange={setTotalPages}
              panOffset={panOffset}
              onPanChange={setPanOffset}
            />
          ) : ['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(activePage.fileType) ? (
            <ImageViewer
              url={activePage.url}
              name={`${document.name} - ${activePage.name}`}
              zoom={zoom}
              rotation={rotation}
              panOffset={panOffset}
              onPanChange={setPanOffset}
            />
          ) : activePage.fileType === 'epub' ? (
            <EpubViewer
              url={activePage.url}
              name={`${document.name} - ${activePage.name}`}
              zoom={zoom}
            />
          ) : ['docx', 'doc', 'txt', 'rtf', 'md'].includes(activePage.fileType) || Boolean(document.content) ? (
            <DocxEditor
              document={document}
              onSaveContent={onUpdateDocumentContent}
              isReadOnly={isReadOnly}
            />
          ) : (
            <div className="p-8 text-center bg-white border border-[#dadce0] rounded-3xl shadow-md max-w-md animate-in fade-in duration-150">
              <div className="w-16 h-16 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center mx-auto mb-4 ring-4 ring-blue-50">
                <FileText className="w-8 h-8" />
              </div>
              <p className="font-bold text-base text-[#202124] mb-1 truncate" title={document.name}>
                {document.name}
              </p>
              <div className="flex items-center justify-center gap-2 mb-4 text-xs text-[#5f6368]">
                <span className="uppercase font-semibold px-2 py-0.5 bg-[#f1f3f4] rounded text-[10px]">
                  {document.fileType}
                </span>
                {document.fileSize > 0 && (
                  <span>{Math.round(document.fileSize / 1024)} KB</span>
                )}
              </div>
              <p className="text-xs text-[#5f6368] mb-6 leading-relaxed">
                This document is safely stored in your vault. You can download or export it to open with your desktop application.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onExport(document)}
                  className="px-5 py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold rounded-xl shadow-xs transition-all flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Document</span>
                </button>
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
};
