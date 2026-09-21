import React, { useRef, useState } from 'react';
import { 
  FileText, 
  Image as ImageIcon, 
  BookOpen, 
  File, 
  Plus, 
  Trash2, 
  Download, 
  Share2, 
  CheckSquare, 
  Square, 
  UploadCloud,
  FileCheck,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FilePlus2,
  Upload,
  Filter
} from 'lucide-react';
import { DocumentItem, FileType, DocumentStatus } from '../types';

interface DocumentListProps {
  documents: DocumentItem[];
  activeDocumentId: string | null;
  onSelectDocument: (doc: DocumentItem) => void;
  selectedDocIds: string[];
  onToggleSelectDoc: (id: string, e: React.MouseEvent) => void;
  onToggleSelectAll: () => void;
  onUploadFiles: (files: FileList | File[]) => void;
  onUploadToFileSlot: (docId: string, file: File) => void;
  onCreateDocumentSlot: (title: string, fileType: FileType) => void;
  onUpdateDocumentStatus: (id: string, status: DocumentStatus, notes?: string) => void;
  onDeleteDocument: (id: string, e: React.MouseEvent) => void;
  onShareDocument: (doc: DocumentItem, e: React.MouseEvent) => void;
  onExportDocument: (doc: DocumentItem, e: React.MouseEvent) => void;
  tabTitle: string;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  activeDocumentId,
  onSelectDocument,
  selectedDocIds,
  onToggleSelectDoc,
  onToggleSelectAll,
  onUploadFiles,
  onUploadToFileSlot,
  onCreateDocumentSlot,
  onUpdateDocumentStatus,
  onDeleteDocument,
  onShareDocument,
  onExportDocument,
  tabTitle
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slotFileInputRef = useRef<HTMLInputElement>(null);
  const [targetSlotId, setTargetSlotId] = useState<string | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [showCreateSlotModal, setShowCreateSlotModal] = useState(false);
  const [newSlotTitle, setNewSlotTitle] = useState('');
  const [newSlotType, setNewSlotType] = useState<FileType>('pdf');
  const [statusFilter, setStatusFilter] = useState<'all' | 'missing_or_disapproved' | 'approved' | 'pending'>('all');

  const formatFileSize = (bytes: number): string => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileBadge = (doc: DocumentItem) => {
    if (!doc.hasFile) {
      return (
        <div className="w-8 h-8 rounded-lg bg-[#fce8e6] text-[#d93025] border border-[#ea4335]/30 flex items-center justify-center flex-shrink-0 animate-pulse">
          <AlertCircle className="w-4 h-4" />
        </div>
      );
    }
    switch (doc.fileType) {
      case 'pdf':
        return (
          <div className="w-8 h-8 rounded-lg bg-[#fce8e6] text-[#d93025] flex items-center justify-center flex-shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
      case 'png':
      case 'jpg':
      case 'jpeg':
        return (
          <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center flex-shrink-0">
            <ImageIcon className="w-4 h-4" />
          </div>
        );
      case 'epub':
        return (
          <div className="w-8 h-8 rounded-lg bg-[#f3e8fd] text-[#9334e6] flex items-center justify-center flex-shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-[#f1f3f4] text-[#5f6368] flex items-center justify-center flex-shrink-0">
            <File className="w-4 h-4" />
          </div>
        );
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onUploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      onUploadFiles(e.target.files);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSlotFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && targetSlotId) {
      onUploadToFileSlot(targetSlotId, e.target.files[0]);
      setTargetSlotId(null);
      if (slotFileInputRef.current) {
        slotFileInputRef.current.value = '';
      }
    }
  };

  const handleCreateSlotSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newSlotTitle.trim()) {
      onCreateDocumentSlot(newSlotTitle.trim(), newSlotType);
      setNewSlotTitle('');
      setShowCreateSlotModal(false);
    }
  };

  // Filter documents based on status
  const filteredDocuments = documents.filter((d) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'missing_or_disapproved') return d.status === 'missing' || d.status === 'disapproved';
    if (statusFilter === 'approved') return d.status === 'approved';
    if (statusFilter === 'pending') return d.status === 'pending';
    return true;
  });

  const allSelected = filteredDocuments.length > 0 && selectedDocIds.length === filteredDocuments.length;

  return (
    <aside 
      className={`w-84 lg:w-96 bg-white border-r border-[#dadce0] flex flex-col h-[calc(100vh-7.5rem)] flex-shrink-0 transition-colors relative select-none ${
        isDragging ? 'bg-[#e8f0fe]/40 ring-2 ring-[#1a73e8] ring-inset' : ''
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.webp,.epub,.txt"
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        ref={slotFileInputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.epub,.txt"
        onChange={handleSlotFileInputChange}
        className="hidden"
      />

      {/* Top Upload & Create Document Slot Buttons */}
      <div className="p-3 sm:p-4 border-b border-[#dadce0] space-y-2.5">
        <div className="flex items-center gap-2">
          {/* Upload Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-3 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full font-medium text-xs sm:text-sm shadow hover:shadow-md transition-all"
            title="Upload completed file"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Upload Document</span>
          </button>

          {/* Create Document Requirement Slot (RED if not uploaded) */}
          <button
            onClick={() => setShowCreateSlotModal(true)}
            className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-white hover:bg-[#fce8e6]/40 text-[#d93025] border border-[#ea4335]/40 rounded-full font-medium text-xs shadow-xs transition-colors"
            title="Add required document slot (Marks RED until uploaded)"
          >
            <FilePlus2 className="w-4 h-4" />
            <span className="hidden sm:inline">+ Required Slot</span>
          </button>
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 text-[11px]">
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-2 py-1 rounded-md font-medium transition-colors ${
              statusFilter === 'all'
                ? 'bg-[#202124] text-white'
                : 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed]'
            }`}
          >
            All ({documents.length})
          </button>

          <button
            onClick={() => setStatusFilter('missing_or_disapproved')}
            className={`px-2 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors ${
              statusFilter === 'missing_or_disapproved'
                ? 'bg-[#d93025] text-white'
                : 'bg-[#fce8e6] text-[#d93025] hover:bg-[#fad2cf]'
            }`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-current" />
            <span>Red: Missing ({documents.filter(d => d.status === 'missing' || d.status === 'disapproved').length})</span>
          </button>

          <button
            onClick={() => setStatusFilter('approved')}
            className={`px-2 py-1 rounded-md font-semibold flex items-center gap-1 transition-colors ${
              statusFilter === 'approved'
                ? 'bg-[#137333] text-white'
                : 'bg-[#e6f4ea] text-[#137333] hover:bg-[#ceead6]'
            }`}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-current" />
            <span>Green: Approved ({documents.filter(d => d.status === 'approved').length})</span>
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-2 py-1 rounded-md font-medium transition-colors ${
              statusFilter === 'pending'
                ? 'bg-white border border-[#202124] text-[#202124]'
                : 'bg-[#f8fafd] text-[#5f6368] border border-[#dadce0] hover:bg-white'
            }`}
          >
            White: Normal ({documents.filter(d => d.status === 'pending').length})
          </button>
        </div>

        {/* Selection Bar */}
        <div className="flex items-center justify-between text-xs text-[#5f6368] pt-1 px-1">
          <div 
            onClick={onToggleSelectAll} 
            className="flex items-center gap-2 cursor-pointer hover:text-[#202124]"
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-[#1a73e8]" />
            ) : (
              <Square className="w-4 h-4 text-[#5f6368]" />
            )}
            <span>
              {selectedDocIds.length > 0 
                ? `${selectedDocIds.length} of ${filteredDocuments.length} selected` 
                : `Select all (${filteredDocuments.length})`}
            </span>
          </div>
          <span className="text-[11px] text-[#5f6368] truncate max-w-[120px]">
            {tabTitle}
          </span>
        </div>
      </div>

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div className="absolute inset-0 bg-[#e8f0fe]/90 flex flex-col items-center justify-center p-6 text-center z-20 backdrop-blur-xs pointer-events-none">
          <UploadCloud className="w-12 h-12 text-[#1a73e8] animate-bounce mb-2" />
          <p className="font-semibold text-sm text-[#1a73e8]">Drop documents here</p>
          <p className="text-xs text-[#5f6368] mt-1">PDF, JPG, PNG, EPUB</p>
        </div>
      )}

      {/* Create Slot Modal */}
      {showCreateSlotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#dadce0] rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-sm text-[#202124] mb-1 flex items-center gap-2">
              <FilePlus2 className="w-4 h-4 text-[#d93025]" />
              <span>Add Document Requirement</span>
            </h3>
            <p className="text-xs text-[#5f6368] mb-4">
              Creates a missing slot marked in <strong>RED</strong> until the client or solicitor uploads the required file.
            </p>

            <form onSubmit={handleCreateSlotSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#202124] mb-1">
                  Document Name / Requirement
                </label>
                <input
                  type="text"
                  placeholder="e.g. Police Clearance Certificate, Marriage Cert..."
                  value={newSlotTitle}
                  onChange={(e) => setNewSlotTitle(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-3 py-2 border border-[#dadce0] rounded-lg text-xs outline-none focus:border-[#1a73e8]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#202124] mb-1">
                  Expected File Type
                </label>
                <select
                  value={newSlotType}
                  onChange={(e) => setNewSlotType(e.target.value as FileType)}
                  className="w-full px-3 py-2 border border-[#dadce0] rounded-lg text-xs outline-none bg-white"
                >
                  <option value="pdf">PDF Document (.pdf)</option>
                  <option value="png">PNG Image (.png)</option>
                  <option value="jpg">JPEG Photo (.jpg)</option>
                  <option value="epub">EPUB Book (.epub)</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateSlotModal(false)}
                  className="px-3 py-1.5 text-xs text-[#5f6368] hover:bg-[#f1f3f4] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium bg-[#d93025] hover:bg-[#b31412] text-white rounded-lg shadow-sm"
                >
                  Create (Mark Red)
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Document Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-[#f1f3f4]">
        {filteredDocuments.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-[#5f6368]">
            <div className="w-12 h-12 rounded-full bg-[#f1f3f4] flex items-center justify-center mb-3">
              <FileCheck className="w-6 h-6 text-[#bdc1c6]" />
            </div>
            <p className="text-sm font-medium text-[#202124]">No documents found</p>
            <p className="text-xs text-[#5f6368] mt-1 max-w-[200px]">
              {statusFilter !== 'all' 
                ? 'No documents match this filter.' 
                : 'Upload PDF, JPG, PNG, or create a document requirement slot.'}
            </p>
          </div>
        ) : (
          filteredDocuments.map((doc) => {
            const isActive = doc.id === activeDocumentId;
            const isSelected = selectedDocIds.includes(doc.id);

            // User-specified color logic:
            // - No document / disapprove document > RED
            // - Approved document > GREEN
            // - Doing nothing / pending > WHITE color of the tab normal color
            let statusStyle = 'bg-white border-[#dadce0] hover:bg-[#f8fafd]';
            let statusBadge = null;

            if (doc.status === 'missing') {
              statusStyle = 'bg-[#fce8e6]/85 border-[#ea4335] text-[#d93025] hover:bg-[#fad2cf]';
              statusBadge = (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#d93025] text-white px-1.5 py-0.2 rounded">
                  Missing (Red)
                </span>
              );
            } else if (doc.status === 'disapproved') {
              statusStyle = 'bg-[#fce8e6]/85 border-[#ea4335] text-[#d93025] hover:bg-[#fad2cf]';
              statusBadge = (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#d93025] text-white px-1.5 py-0.2 rounded">
                  Disapproved (Red)
                </span>
              );
            } else if (doc.status === 'approved') {
              statusStyle = 'bg-[#e6f4ea]/85 border-[#34a853] text-[#137333] hover:bg-[#ceead6]';
              statusBadge = (
                <span className="text-[10px] font-bold uppercase tracking-wider bg-[#137333] text-white px-1.5 py-0.2 rounded">
                  Approved (Green)
                </span>
              );
            } else {
              // Doing nothing / pending -> WHITE normal color
              statusStyle = isActive 
                ? 'bg-[#e8f0fe]/70 border-[#1a73e8]' 
                : 'bg-white border-[#dadce0] hover:bg-[#f8fafd]';
              statusBadge = (
                <span className="text-[10px] font-medium text-[#5f6368] bg-[#f1f3f4] px-1.5 py-0.2 rounded">
                  Uploaded (Normal)
                </span>
              );
            }

            return (
              <div
                key={doc.id}
                onClick={() => {
                  if (doc.hasFile) {
                    onSelectDocument(doc);
                  }
                }}
                className={`group flex items-start gap-2.5 p-3 text-left transition-all border-l-4 relative cursor-pointer ${statusStyle} ${
                  isActive ? 'ring-1 ring-inset ring-[#1a73e8]' : ''
                }`}
              >
                {/* Select Checkbox */}
                <div
                  onClick={(e) => onToggleSelectDoc(doc.id, e)}
                  className="mt-1 p-0.5 hover:bg-black/5 rounded cursor-pointer transition-colors"
                >
                  {isSelected ? (
                    <CheckSquare className="w-4 h-4 text-[#1a73e8]" />
                  ) : (
                    <Square className="w-4 h-4 text-[#bdc1c6] group-hover:text-[#5f6368]" />
                  )}
                </div>

                {/* File Badge */}
                {getFileBadge(doc)}

                {/* Document Information */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p 
                      className="text-xs sm:text-sm font-semibold truncate leading-tight flex-1 text-[#202124]"
                      title={doc.name}
                    >
                      {doc.name}
                    </p>
                  </div>

                  {/* Status label badge */}
                  <div className="flex items-center gap-1.5 mt-1">
                    {statusBadge}
                    {doc.hasFile && (
                      <span className="text-[11px] text-[#5f6368]">
                        • {formatFileSize(doc.fileSize)}
                      </span>
                    )}
                  </div>

                  {/* If missing: Show 1-click Upload File Button */}
                  {!doc.hasFile && (
                    <div className="mt-2 flex items-center gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTargetSlotId(doc.id);
                          slotFileInputRef.current?.click();
                        }}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#d93025] hover:bg-[#b31412] text-white text-[11px] font-semibold rounded-md shadow-xs transition-colors"
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload File Now</span>
                      </button>
                      <span className="text-[10px] text-[#d93025] italic">Action required</span>
                    </div>
                  )}

                  {doc.notes && (
                    <p className="text-[10px] text-[#d93025] mt-1 font-medium italic truncate" title={doc.notes}>
                      {doc.notes}
                    </p>
                  )}
                </div>

                {/* Approve / Disapprove & Quick Action Buttons */}
                <div 
                  className="flex flex-col items-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Status toggles */}
                  <div className="flex items-center gap-1">
                    {/* Approve button (turns GREEN) */}
                    <button
                      onClick={() => onUpdateDocumentStatus(doc.id, 'approved')}
                      className={`p-1 rounded transition-colors ${
                        doc.status === 'approved' 
                          ? 'bg-[#137333] text-white shadow-xs' 
                          : 'text-[#5f6368] hover:text-[#137333] hover:bg-[#e6f4ea]'
                      }`}
                      title="Approve document (Turns Green)"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                    </button>

                    {/* Disapprove button (turns RED) */}
                    <button
                      onClick={() => {
                        const reason = prompt('Reason for disapproval (optional):', doc.notes || '');
                        onUpdateDocumentStatus(doc.id, 'disapproved', reason || undefined);
                      }}
                      className={`p-1 rounded transition-colors ${
                        doc.status === 'disapproved' || doc.status === 'missing'
                          ? 'bg-[#d93025] text-white shadow-xs' 
                          : 'text-[#5f6368] hover:text-[#d93025] hover:bg-[#fce8e6]'
                      }`}
                      title="Disapprove document (Turns Red)"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Action buttons on hover */}
                  <div className="flex items-center gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {doc.hasFile && (
                      <>
                        <button
                          onClick={(e) => onExportDocument(doc, e)}
                          className="p-1 text-[#5f6368] hover:text-[#1a73e8] hover:bg-black/5 rounded transition-colors"
                          title="Export / Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => onShareDocument(doc, e)}
                          className="p-1 text-[#5f6368] hover:text-[#1a73e8] hover:bg-black/5 rounded transition-colors"
                          title="Share Document"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                    <button
                      onClick={(e) => onDeleteDocument(doc.id, e)}
                      className="p-1 text-[#5f6368] hover:text-[#d93025] hover:bg-black/5 rounded transition-colors"
                      title="Delete Slot"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
