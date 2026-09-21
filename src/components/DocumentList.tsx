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
  CreditCard,
  Edit2,
  Check,
  X,
  Folder,
  FolderPlus,
  FolderInput,
  Hash,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  Palette,
  GripVertical,
  CornerDownRight,
  Cloud,
  Loader2,
  Printer
} from 'lucide-react';
import { DocumentItem, FileType, DocumentStatus, DocumentFolder, FolderColor, SolicitorProfile } from '../types';
import { printDocument, printMultipleDocuments } from '../lib/printUtils';

export const FOLDER_COLORS: { id: FolderColor; name: string; bg: string; text: string; border: string; hoverBg: string }[] = [
  { id: 'blue', name: 'Blue', bg: '#e8f0fe', text: '#1a73e8', border: '#1a73e8', hoverBg: '#d2e3fc' },
  { id: 'green', name: 'Green', bg: '#e6f4ea', text: '#137333', border: '#137333', hoverBg: '#ceead6' },
  { id: 'amber', name: 'Amber', bg: '#fef7e0', text: '#b06000', border: '#e37400', hoverBg: '#feefc3' },
  { id: 'red', name: 'Red', bg: '#fce8e6', text: '#d93025', border: '#d93025', hoverBg: '#fad2cf' },
  { id: 'purple', name: 'Purple', bg: '#f3e8fd', text: '#9334e6', border: '#9334e6', hoverBg: '#e9d2fd' },
  { id: 'teal', name: 'Teal', bg: '#e0f2f1', text: '#00796b', border: '#00796b', hoverBg: '#b2dfdb' },
  { id: 'slate', name: 'Slate', bg: '#f1f3f4', text: '#5f6368', border: '#5f6368', hoverBg: '#e8eaed' },
];

export const getFolderColorStyle = (color?: FolderColor) => {
  const found = FOLDER_COLORS.find(c => c.id === color);
  return found || FOLDER_COLORS[0];
};

interface DocumentListProps {
  documents: DocumentItem[];
  folders?: DocumentFolder[];
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
  onExportAsJpg?: (doc: DocumentItem, e?: React.MouseEvent) => void;
  onOpenUploadModal?: () => void;
  onAddPageToDoc?: (docId: string, pageName: string, file: File) => void;
  onRenameDocument?: (id: string, newName: string) => void;
  onCreateFolder?: (name: string, parentId?: string, color?: FolderColor) => void;
  onRenameFolder?: (folderId: string, newName: string) => void;
  onUpdateFolderColor?: (folderId: string, color: FolderColor) => void;
  onDeleteFolder?: (folderId: string) => void;
  onMoveDocToFolder?: (docId: string, targetFolderId?: string) => void;
  onUploadFilesToFolder?: (files: FileList | File[], folderId?: string) => void;
  onReorderDocument?: (sourceDocId: string, targetDocId: string, position: 'before' | 'after') => void;
  onMoveDocPosition?: (docId: string, direction: 'up' | 'down') => void;
  onCreateBlankDoc?: (title: string, fileType: FileType) => void;
  onSyncLocalDocs?: () => void;
  onBatchDeleteDocs?: (docIds: string[]) => void;
  onBatchMoveDocsToFolder?: (docIds: string[], targetFolderId?: string) => void;
  onBatchAutoNumberDocs?: (docIds: string[]) => void;
  onBatchUpdateStatus?: (docIds: string[], status: DocumentStatus) => void;
  onUpdateDocNotes?: (docId: string, notes: string, description: string) => void;
  solicitor?: SolicitorProfile | null;
  clientName?: string;
  onPrintDocument?: (doc: DocumentItem) => void;
  onPrintMultipleDocuments?: (docs: DocumentItem[]) => void;
  tabTitle: string;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  folders = [],
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
  onExportAsJpg,
  onOpenUploadModal,
  onAddPageToDoc,
  onRenameDocument,
  onCreateFolder,
  onRenameFolder,
  onUpdateFolderColor,
  onDeleteFolder,
  onMoveDocToFolder,
  onUploadFilesToFolder,
  onReorderDocument,
  onMoveDocPosition,
  onCreateBlankDoc,
  onSyncLocalDocs,
  onBatchDeleteDocs,
  onBatchMoveDocsToFolder,
  onBatchAutoNumberDocs,
  onBatchUpdateStatus,
  onUpdateDocNotes,
  solicitor,
  clientName,
  onPrintDocument,
  onPrintMultipleDocuments,
  tabTitle
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const slotFileInputRef = useRef<HTMLInputElement>(null);
  const folderUploadInputRef = useRef<HTMLInputElement>(null);

  const [targetSlotId, setTargetSlotId] = useState<string | null>(null);
  const [targetFolderUploadId, setTargetFolderUploadId] = useState<string | null>(null);

  // Printing state
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [printStatus, setPrintStatus] = useState<string>('');

  const handlePrintSingle = async (doc: DocumentItem) => {
    if (isPrinting) return;
    try {
      setIsPrinting(true);
      if (onPrintDocument) {
        onPrintDocument(doc);
      } else {
        await printDocument(doc, {
          solicitor,
          clientName,
          tabTitle,
          onProgress: (msg) => setPrintStatus(msg)
        });
      }
    } catch (e) {
      console.warn('Print error:', e);
    } finally {
      setIsPrinting(false);
      setPrintStatus('');
    }
  };

  const handlePrintBatch = async (docIds: string[]) => {
    if (isPrinting) return;
    const targetDocs = documents.filter(d => docIds.includes(d.id));
    try {
      setIsPrinting(true);
      if (onPrintMultipleDocuments) {
        onPrintMultipleDocuments(targetDocs);
      } else {
        await printMultipleDocuments(targetDocs, {
          solicitor,
          clientName,
          tabTitle,
          onProgress: (msg) => setPrintStatus(msg)
        });
      }
    } catch (e) {
      console.warn('Batch print error:', e);
    } finally {
      setIsPrinting(false);
      setPrintStatus('');
    }
  };

  const handlePrintAll = async () => {
    if (isPrinting) return;
    const docsToPrint = filteredDocuments.filter(d => d.hasFile || d.content);
    if (docsToPrint.length === 0) {
      alert('No documents with uploaded files found to print.');
      return;
    }
    try {
      setIsPrinting(true);
      if (onPrintMultipleDocuments) {
        onPrintMultipleDocuments(docsToPrint);
      } else {
        await printMultipleDocuments(docsToPrint, {
          solicitor,
          clientName,
          tabTitle,
          onProgress: (msg) => setPrintStatus(msg)
        });
      }
    } catch (e) {
      console.warn('Print all error:', e);
    } finally {
      setIsPrinting(false);
      setPrintStatus('');
    }
  };

  // Folder and view filtering
  const [folderFilter, setFolderFilter] = useState<'all' | 'in_folders' | 'without_folders'>('all');
  const [showBatchMoveDropdown, setShowBatchMoveDropdown] = useState(false);

  // Reordering documents drag state
  const [reorderTargetId, setReorderTargetId] = useState<string | null>(null);
  const [reorderPosition, setReorderPosition] = useState<'before' | 'after'>('after');

  // Document inline rename state
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingDocName, setEditingDocName] = useState<string>('');

  // Inline doc notes editing state
  const [editingNotesDocId, setEditingNotesDocId] = useState<string | null>(null);
  const [editingNotes, setEditingNotes] = useState('');
  const [editingInstruction, setEditingInstruction] = useState('');

  // Folder states
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [folderModalParentId, setFolderModalParentId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState<FolderColor>('blue');
  const [colorPickerFolderId, setColorPickerFolderId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dismissSyncBanner, setDismissSyncBanner] = useState(false);
  const [isSyncingLocal, setIsSyncingLocal] = useState(false);

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
          <div className="w-8 h-8 rounded-lg bg-[#fce8e6] text-[#d93025] flex items-center justify-center flex-shrink-0" title="PDF Document">
            <FileText className="w-4 h-4" />
          </div>
        );
      case 'doc':
      case 'docx':
      case 'txt':
      case 'rtf':
      case 'md':
        return (
          <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] text-[#1a73e8] border border-[#1a73e8]/30 flex items-center justify-center flex-shrink-0" title="Editable Document / Note">
            <FileText className="w-4 h-4" />
          </div>
        );
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'webp':
      case 'gif':
        return (
          <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center flex-shrink-0" title="Image File">
            <ImageIcon className="w-4 h-4" />
          </div>
        );
      case 'csv':
      case 'xlsx':
      case 'pptx':
        return (
          <div className="w-8 h-8 rounded-lg bg-[#e6f4ea] text-[#137333] border border-[#137333]/20 flex items-center justify-center flex-shrink-0" title="Data Sheet / Presentation">
            <File className="w-4 h-4" />
          </div>
        );
      case 'epub':
        return (
          <div className="w-8 h-8 rounded-lg bg-[#f3e8fd] text-[#9334e6] flex items-center justify-center flex-shrink-0" title="E-Book">
            <BookOpen className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-lg bg-[#f1f3f4] text-[#5f6368] flex items-center justify-center flex-shrink-0" title="File">
            <File className="w-4 h-4" />
          </div>
        );
    }
  };

  React.useEffect(() => {
    const handleGlobalDragReset = () => {
      setIsDragging(false);
      setDragOverFolderId(null);
      setReorderTargetId(null);
    };
    window.addEventListener('dragend', handleGlobalDragReset);
    window.addEventListener('drop', handleGlobalDragReset);
    return () => {
      window.removeEventListener('dragend', handleGlobalDragReset);
      window.removeEventListener('drop', handleGlobalDragReset);
    };
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    // Only show the upload overlay for external files from the OS/Desktop.
    const isExternalFile = e.dataTransfer.types.includes('Files');
    if (isExternalFile) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only hide if the pointer actually left the aside (not just moved between child elements)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    // Only handle OS-level file drops here (not internal doc card drags)
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

  const handleFolderUploadChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0 && targetFolderUploadId && onUploadFilesToFolder) {
      onUploadFilesToFolder(e.target.files, targetFolderUploadId);
      setTargetFolderUploadId(null);
      if (folderUploadInputRef.current) {
        folderUploadInputRef.current.value = '';
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

  // Folder helper functions
  const handleCreateFolderSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim() && onCreateFolder) {
      onCreateFolder(newFolderName.trim(), folderModalParentId || undefined, newFolderColor);
      setNewFolderName('');
      setShowCreateFolderModal(false);
      setFolderModalParentId(null);
    }
  };

  const handleStartRenameFolder = (folder: DocumentFolder, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingFolderId(folder.id);
    setEditingFolderName(folder.name);
  };

  const handleSaveRenameFolder = (folderId: string) => {
    if (editingFolderName.trim() && onRenameFolder) {
      onRenameFolder(folderId, editingFolderName.trim());
    }
    setEditingFolderId(null);
  };

  const toggleFolderCollapse = (folderId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setCollapsedFolders(prev => ({
      ...prev,
      [folderId]: !prev[folderId]
    }));
  };

  // Document rename handlers
  const handleStartEditing = (doc: DocumentItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingDocId(doc.id);
    setEditingDocName(doc.name);
  };

  const handleSaveDocName = (docId: string) => {
    if (editingDocName.trim() && onRenameDocument) {
      onRenameDocument(docId, editingDocName.trim());
    }
    setEditingDocId(null);
  };

  // Filter documents based on status
  const filteredDocuments = documents.filter((d) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'missing_or_disapproved') return d.status === 'missing' || d.status === 'disapproved';
    if (statusFilter === 'approved') return d.status === 'approved';
    if (statusFilter === 'pending') return d.status === 'pending';
    return true;
  });

  const getFolderDocCount = (folderId: string): number => {
    const directDocs = filteredDocuments.filter(d => d.folderId === folderId).length;
    const childFolders = folders.filter(f => f.parentId === folderId);
    const childDocs = childFolders.reduce((sum, f) => sum + getFolderDocCount(f.id), 0);
    return directDocs + childDocs;
  };

  const allSelected = filteredDocuments.length > 0 && selectedDocIds.length === filteredDocuments.length;

  // Root elements filtered by folderFilter
  const rootFolders = folderFilter === 'without_folders' ? [] : folders.filter(f => !f.parentId);
  const rootDocuments = folderFilter === 'in_folders'
    ? []
    : filteredDocuments.filter(d => !d.folderId || !folders.some(f => f.id === d.folderId));

  // Render individual document item card
  const renderDocumentCard = (doc: DocumentItem, depth = 0) => {
    const isActive = doc.id === activeDocumentId;
    const isSelected = selectedDocIds.includes(doc.id);

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
      statusStyle = isActive 
        ? 'bg-[#e8f0fe]/70 border-[#1a73e8]' 
        : 'bg-white border-[#dadce0] hover:bg-[#f8fafd]';
      statusBadge = (
        <span className="text-[10px] font-medium text-[#5f6368] bg-[#f1f3f4] px-1.5 py-0.2 rounded">
          Uploaded (Normal)
        </span>
      );
    }

    const isReorderTarget = reorderTargetId === doc.id;

    return (
      <div
        key={doc.id}
        draggable={true}
        onDragStart={(e) => {
          (window as any)._draggedDocId = doc.id;
          e.dataTransfer.setData('text/plain', doc.id);
          e.dataTransfer.setData('text/doc-id', doc.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const rect = e.currentTarget.getBoundingClientRect();
          const pos = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
          if (reorderTargetId !== doc.id || reorderPosition !== pos) {
            setReorderTargetId(doc.id);
            setReorderPosition(pos);
          }
        }}
        onDragLeave={(e) => {
          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
          if (reorderTargetId === doc.id) {
            setReorderTargetId(null);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setIsDragging(false);
          const sourceDocId = e.dataTransfer.getData('text/doc-id') || e.dataTransfer.getData('text/plain') || (window as any)._draggedDocId;
          if (sourceDocId && sourceDocId !== doc.id && onReorderDocument) {
            onReorderDocument(sourceDocId, doc.id, reorderPosition);
          }
          setReorderTargetId(null);
        }}
        onClick={() => {
          if (doc.hasFile) {
            onSelectDocument(doc);
          }
        }}
        style={{ paddingLeft: depth > 0 ? `${depth * 14 + 10}px` : undefined }}
        className={`group flex items-start gap-2.5 p-3 text-left transition-all border-l-4 relative cursor-pointer ${statusStyle} ${
          isActive ? 'ring-1 ring-inset ring-[#1a73e8]' : ''
        } ${depth > 0 ? 'border-b border-[#f1f3f4]' : ''}`}
      >
        {/* Reorder visual indicator line */}
        {isReorderTarget && reorderPosition === 'before' && (
          <div className="absolute -top-1 left-0 right-0 h-1.5 bg-[#1a73e8] z-30 rounded-full shadow-md pointer-events-none" />
        )}
        {isReorderTarget && reorderPosition === 'after' && (
          <div className="absolute -bottom-1 left-0 right-0 h-1.5 bg-[#1a73e8] z-30 rounded-full shadow-md pointer-events-none" />
        )}
        {/* Grip handle and 1-Click Move Up / Down controls */}
        <div 
          className="mt-0.5 flex flex-col items-center text-[#dadce0] group-hover:text-[#5f6368] transition-colors flex-shrink-0 select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {onMoveDocPosition && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveDocPosition(doc.id, 'up');
              }}
              className="p-0.5 hover:text-[#1a73e8] hover:bg-black/5 rounded transition-colors opacity-30 group-hover:opacity-100"
              title="Move document up"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
          )}
          <div 
            className="cursor-grab active:cursor-grabbing p-0.5"
            title="Drag to reorder or move into folder"
          >
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          {onMoveDocPosition && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onMoveDocPosition(doc.id, 'down');
              }}
              className="p-0.5 hover:text-[#1a73e8] hover:bg-black/5 rounded transition-colors opacity-30 group-hover:opacity-100"
              title="Move document down"
            >
              <ChevronDown className="w-3 h-3" />
            </button>
          )}
        </div>

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
          {editingDocId === doc.id ? (
            <div 
              className="flex items-center gap-2 w-full my-1 z-20" 
              onClick={(e) => e.stopPropagation()}
            >
              <input
                type="text"
                value={editingDocName}
                onChange={(e) => setEditingDocName(e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveDocName(doc.id);
                  if (e.key === 'Escape') setEditingDocId(null);
                }}
                autoFocus
                className="flex-1 min-w-[160px] sm:min-w-[220px] text-xs sm:text-sm font-semibold px-2.5 py-1.5 bg-white border-2 border-[#1a73e8] rounded-lg shadow-sm outline-none text-[#202124] ring-2 ring-[#1a73e8]/20"
              />
              <button
                type="button"
                onClick={() => handleSaveDocName(doc.id)}
                className="px-2.5 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs flex-shrink-0"
                title="Save Name (Enter)"
              >
                <Check className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Save</span>
              </button>
              <button
                type="button"
                onClick={() => setEditingDocId(null)}
                className="p-1.5 hover:bg-black/5 text-[#5f6368] rounded-lg transition-colors flex-shrink-0"
                title="Cancel (Esc)"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 group/name">
              <p 
                className="text-xs sm:text-sm font-semibold leading-tight flex-1 text-[#202124] break-words"
                title={`${doc.name} (Double-click to rename)`}
                onDoubleClick={(e) => {
                  if (onRenameDocument) handleStartEditing(doc, e);
                }}
              >
                {doc.name}
              </p>
              {onRenameDocument && (
                <button
                  type="button"
                  onClick={(e) => handleStartEditing(doc, e)}
                  className="p-0.5 text-[#5f6368] hover:text-[#1a73e8] hover:bg-black/5 rounded opacity-0 group-hover/name:opacity-100 transition-opacity"
                  title="Rename document"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
              )}
            </div>
          )}

          {/* Status label badge */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {statusBadge}
            {doc.url && (doc.url.startsWith('http://') || doc.url.startsWith('https://')) && (
              <span className="text-[10px] font-medium bg-[#e6f4ea] text-[#137333] px-1.5 py-0.2 rounded border border-[#137333]/20 flex items-center gap-0.5" title="Uploaded & hosted online in cloud">
                <Cloud className="w-2.5 h-2.5" />
                Online
              </span>
            )}
            {doc.pages && doc.pages.length > 1 && (
              <span className="text-[10px] font-bold bg-[#e8f0fe] text-[#1a73e8] px-1.5 py-0.2 rounded border border-[#1a73e8]/20 flex items-center gap-0.5">
                <CreditCard className="w-2.5 h-2.5" />
                {doc.pages.length} Sides
              </span>
            )}
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

          {/* Inline Notes & Client Instructions Editor */}
          {editingNotesDocId === doc.id ? (
            <div className="mt-2 space-y-2" onClick={(e) => e.stopPropagation()}>
              <div>
                <label className="text-[10px] font-bold text-[#b06000] flex items-center gap-1 mb-0.5">
                  🔒 Internal Note (Firm Only)
                </label>
                <textarea
                  rows={2}
                  value={editingNotes}
                  onChange={(e) => setEditingNotes(e.target.value)}
                  placeholder="Internal notes visible only to your firm..."
                  className="w-full px-2 py-1.5 bg-[#fef7e0] border border-[#fce8b2] rounded-lg text-[11px] outline-none resize-none focus:border-[#b06000]"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-[#1a73e8] flex items-center gap-1 mb-0.5">
                  📢 Client Instructions (Shown in Portal)
                </label>
                <textarea
                  rows={2}
                  value={editingInstruction}
                  onChange={(e) => setEditingInstruction(e.target.value)}
                  placeholder="Instruction shown to client e.g. 'Please resubmit a clearer scan'..."
                  className="w-full px-2 py-1.5 bg-[#e8f0fe] border border-[#c2e7ff] rounded-lg text-[11px] outline-none resize-none focus:border-[#1a73e8]"
                />
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (onUpdateDocNotes) onUpdateDocNotes(doc.id, editingNotes, editingInstruction);
                    setEditingNotesDocId(null);
                  }}
                  className="px-2.5 py-1 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Save Notes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingNotesDocId(null)}
                  className="px-2 py-1 text-[#5f6368] hover:bg-[#f1f3f4] text-[11px] rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-1 space-y-0.5">
              {doc.notes && (
                <p
                  className="text-[10px] text-[#b06000] font-medium italic truncate cursor-pointer hover:underline"
                  title={`Internal Note: ${doc.notes} — Click to edit`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onUpdateDocNotes) {
                      setEditingNotesDocId(doc.id);
                      setEditingNotes(doc.notes || '');
                      setEditingInstruction(doc.description || '');
                    }
                  }}
                >
                  🔒 {doc.notes}
                </p>
              )}
              {doc.description && (
                <p
                  className="text-[10px] text-[#1a73e8] font-medium italic truncate cursor-pointer hover:underline"
                  title={`Client Instruction: ${doc.description} — Click to edit`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onUpdateDocNotes) {
                      setEditingNotesDocId(doc.id);
                      setEditingNotes(doc.notes || '');
                      setEditingInstruction(doc.description || '');
                    }
                  }}
                >
                  📢 {doc.description}
                </p>
              )}
              {onUpdateDocNotes && !doc.notes && !doc.description && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingNotesDocId(doc.id);
                    setEditingNotes('');
                    setEditingInstruction('');
                  }}
                  className="text-[10px] text-[#5f6368] hover:text-[#1a73e8] flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  + Add note
                </button>
              )}
            </div>
          )}
        </div>

        {/* Approve / Disapprove & Quick Action Buttons (hidden while editing name) */}
        {editingDocId !== doc.id && (
          <div 
            className="flex flex-col items-end gap-1 opacity-80 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Status toggles */}
            <div className="flex items-center gap-1">
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
              {onRenameDocument && (
                <button
                  onClick={(e) => handleStartEditing(doc, e)}
                  className="p-1 text-[#5f6368] hover:text-[#1a73e8] hover:bg-black/5 rounded transition-colors"
                  title="Rename Document"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}
              {doc.hasFile && (
                <>
                  <button
                    onClick={(e) => onExportDocument(doc, e)}
                    className="p-1 text-[#5f6368] hover:text-[#1a73e8] hover:bg-black/5 rounded transition-colors"
                    title="Download Original File"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  {onExportAsJpg && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onExportAsJpg(doc, e);
                      }}
                      className="p-1 text-[#5f6368] hover:text-[#1a73e8] hover:bg-black/5 rounded transition-colors"
                      title="Convert &amp; Export as JPG"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={(e) => onShareDocument(doc, e)}
                    className="p-1 text-[#5f6368] hover:text-[#1a73e8] hover:bg-black/5 rounded transition-colors"
                    title="Share Document"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrintSingle(doc);
                    }}
                    className="p-1 text-[#5f6368] hover:text-[#1a73e8] hover:bg-black/5 rounded transition-colors"
                    title="Print Document (ID card smart sizing on single A4 page)"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
              {/* If inside folder, offer quick move to root */}
              {doc.folderId && onMoveDocToFolder && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMoveDocToFolder(doc.id, undefined);
                  }}
                  className="p-1 text-[#5f6368] hover:text-[#1a73e8] hover:bg-black/5 rounded transition-colors"
                  title="Move out of folder to Root"
                >
                  <CornerDownRight className="w-3.5 h-3.5" />
                </button>
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
        )}
      </div>
    );
  };

  // Render hierarchical folder item and its contents
  const renderFolderTree = (folder: DocumentFolder, depth = 0) => {
    const isCollapsed = !!collapsedFolders[folder.id];
    const isDragOver = dragOverFolderId === folder.id;
    const colorStyle = getFolderColorStyle(folder.color);
    const fileCount = getFolderDocCount(folder.id);
    const childFolders = folders.filter(f => f.parentId === folder.id);
    const childDocs = filteredDocuments.filter(d => d.folderId === folder.id);

    return (
      <div key={folder.id} className="flex flex-col">
        {/* Folder Header Bar */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOverFolderId(folder.id);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOverFolderId(null);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsDragging(false);
            setDragOverFolderId(null);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onUploadFilesToFolder) {
              onUploadFilesToFolder(e.dataTransfer.files, folder.id);
              return;
            }
            const movedDocId = e.dataTransfer.getData('text/doc-id');
            if (movedDocId && onMoveDocToFolder) {
              onMoveDocToFolder(movedDocId, folder.id);
            }
          }}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className={`group flex items-center justify-between gap-1.5 py-2 px-3 border-b border-[#f1f3f4] cursor-pointer transition-all select-none ${
            isDragOver 
              ? 'bg-[#e8f0fe] ring-2 ring-inset ring-[#1a73e8]' 
              : 'hover:bg-[#f8fafd] bg-white'
          }`}
          onClick={(e) => toggleFolderCollapse(folder.id, e)}
        >
          {/* Left: Chevron + Folder Icon + Folder Name */}
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {/* Collapse toggle */}
            <button
              onClick={(e) => toggleFolderCollapse(folder.id, e)}
              className="p-0.5 text-[#5f6368] hover:text-[#202124] rounded hover:bg-black/5 transition-colors flex-shrink-0"
              title={isCollapsed ? "Maximize / Expand folder" : "Minimize / Collapse folder"}
            >
              {isCollapsed ? (
                <ChevronRight className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Folder Icon with Assigned Color */}
            <div 
              className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 transition-colors shadow-2xs"
              style={{ backgroundColor: colorStyle.bg, color: colorStyle.text }}
            >
              <Folder className="w-3.5 h-3.5 fill-current" />
            </div>

            {/* Folder Name */}
            {editingFolderId === folder.id ? (
              <div className="flex items-center gap-1 flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                <input
                  type="text"
                  value={editingFolderName}
                  onChange={(e) => setEditingFolderName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSaveRenameFolder(folder.id);
                    if (e.key === 'Escape') setEditingFolderId(null);
                  }}
                  autoFocus
                  className="text-xs font-semibold px-1.5 py-0.5 bg-white border border-[#1a73e8] rounded shadow-xs outline-none text-[#202124] w-full"
                />
                <button
                  onClick={() => handleSaveRenameFolder(folder.id)}
                  className="p-1 bg-[#1a73e8] text-white rounded hover:bg-[#1557b0] flex-shrink-0"
                  title="Save Name (Enter)"
                >
                  <Check className="w-3 h-3" />
                </button>
                <button
                  onClick={() => setEditingFolderId(null)}
                  className="p-1 text-[#5f6368] hover:bg-black/5 rounded flex-shrink-0"
                  title="Cancel (Esc)"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <span 
                className="font-semibold text-xs text-[#202124] flex-1 leading-snug break-words"
                title={`${folder.name} (Double-click to rename)`}
                onDoubleClick={(e) => handleStartRenameFolder(folder, e)}
              >
                {folder.name}
              </span>
            )}
          </div>

          {/* Right: File Count Badge & Actions */}
          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            {/* File count pill */}
            <span 
              className="text-[10px] font-bold px-1.5 py-0.2 rounded-full"
              style={{ backgroundColor: colorStyle.bg, color: colorStyle.text }}
            >
              {fileCount} {fileCount === 1 ? 'file' : 'files'}
            </span>

            {/* Folder Actions on Hover */}
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Upload files into folder */}
              {onUploadFilesToFolder && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTargetFolderUploadId(folder.id);
                    folderUploadInputRef.current?.click();
                  }}
                  className="p-1 text-[#5f6368] hover:text-[#1a73e8] hover:bg-black/5 rounded transition-colors"
                  title="Upload multiple files directly into this folder"
                >
                  <Upload className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Add subfolder */}
              {onCreateFolder && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFolderModalParentId(folder.id);
                    setNewFolderName('');
                    setNewFolderColor(folder.color || 'blue');
                    setShowCreateFolderModal(true);
                  }}
                  className="p-1 text-[#5f6368] hover:text-[#1a73e8] hover:bg-black/5 rounded transition-colors"
                  title="Add nested subfolder"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Color picker dropdown */}
              {onUpdateFolderColor && (
                <div className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setColorPickerFolderId(colorPickerFolderId === folder.id ? null : folder.id);
                    }}
                    className="p-1 text-[#5f6368] hover:text-[#1a73e8] hover:bg-black/5 rounded transition-colors"
                    title="Change folder color"
                  >
                    <Palette className="w-3.5 h-3.5" />
                  </button>
                  {colorPickerFolderId === folder.id && (
                    <div 
                      className="absolute right-0 top-full mt-1 bg-white border border-[#dadce0] rounded-xl shadow-xl p-2 z-40 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-100"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {FOLDER_COLORS.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => {
                            onUpdateFolderColor(folder.id, c.id);
                            setColorPickerFolderId(null);
                          }}
                          className={`w-5 h-5 rounded-full transition-transform hover:scale-115 flex items-center justify-center ${
                            (folder.color || 'blue') === c.id ? 'ring-2 ring-offset-1 ring-[#202124]' : ''
                          }`}
                          style={{ backgroundColor: c.text }}
                          title={c.name}
                        >
                          {(folder.color || 'blue') === c.id && <Check className="w-3 h-3 text-white" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Rename folder button */}
              {onRenameFolder && (
                <button
                  onClick={(e) => handleStartRenameFolder(folder, e)}
                  className="p-1 text-[#5f6368] hover:text-[#1a73e8] hover:bg-black/5 rounded transition-colors"
                  title="Rename folder"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Delete folder */}
              {onDeleteFolder && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFolder(folder.id);
                  }}
                  className="p-1 text-[#5f6368] hover:text-[#d93025] hover:bg-black/5 rounded transition-colors"
                  title="Delete folder (files will be kept in main tab)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Folder Children (Subfolders & Documents) */}
        {!isCollapsed && (
          <div className="flex flex-col border-l border-[#dadce0]/50 ml-3">
            {/* Child subfolders */}
            {childFolders.map((subfolder) => renderFolderTree(subfolder, depth + 1))}

            {/* Documents inside this folder */}
            {childDocs.map((doc) => renderDocumentCard(doc, depth + 1))}

            {/* Empty folder placeholder */}
            {childFolders.length === 0 && childDocs.length === 0 && (
              <div 
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverFolderId(folder.id);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsDragging(false);
                  setDragOverFolderId(null);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onUploadFilesToFolder) {
                    onUploadFilesToFolder(e.dataTransfer.files, folder.id);
                    return;
                  }
                  const movedDocId = e.dataTransfer.getData('text/doc-id');
                  if (movedDocId && onMoveDocToFolder) {
                    onMoveDocToFolder(movedDocId, folder.id);
                  }
                }}
                className={`py-2 px-3 text-[11px] text-[#5f6368] italic flex items-center justify-between border-b border-[#f1f3f4] transition-colors ${
                  isDragOver ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'bg-[#fcfdfe]'
                }`}
                style={{ paddingLeft: `${depth * 14 + 14}px` }}
              >
                <span>Empty folder • Drag documents here</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setTargetFolderUploadId(folder.id);
                    folderUploadInputRef.current?.click();
                  }}
                  className="text-[#1a73e8] font-semibold underline hover:text-[#1557b0]"
                >
                  + Upload
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside 
      className={`w-full h-full bg-white flex flex-col min-h-0 overflow-hidden flex-shrink-0 transition-colors relative select-none ${
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
        onChange={handleFileInputChange}
        className="hidden"
      />
      <input
        ref={slotFileInputRef}
        type="file"
        onChange={handleSlotFileInputChange}
        className="hidden"
      />
      <input
        ref={folderUploadInputRef}
        type="file"
        multiple
        onChange={handleFolderUploadChange}
        className="hidden"
      />

      {/* Top Upload, New Folder, Blank Doc & Required Slot Buttons */}
      <div className="p-3 sm:p-4 border-b border-[#dadce0] space-y-2.5">
        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap">
          {/* Upload Button */}
          <button
            onClick={() => {
              if (onOpenUploadModal) {
                onOpenUploadModal();
              } else {
                fileInputRef.current?.click();
              }
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-full font-medium text-xs sm:text-sm shadow hover:shadow-md transition-all"
            title="Upload documents (supports PDF, DOCX, JPG, and any other file type)"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Upload</span>
          </button>

          {/* New Blank Editable Doc / Legal Note Button */}
          {onCreateBlankDoc && (
            <button
              onClick={() => {
                const docName = prompt('Enter document / legal note title:', 'Legal Statement / Note');
                if (docName && docName.trim()) {
                  onCreateBlankDoc(docName.trim(), 'docx');
                }
              }}
              className="flex items-center justify-center gap-1 py-2.5 px-2.5 bg-white hover:bg-[#e8f0fe] text-[#1a73e8] border border-[#1a73e8]/40 rounded-full font-medium text-xs shadow-xs transition-colors"
              title="Create a new blank editable document / legal note"
            >
              <FileText className="w-4 h-4" />
              <span>+ Doc</span>
            </button>
          )}

          {/* New Folder Button */}
          {onCreateFolder && (
            <button
              onClick={() => {
                setFolderModalParentId(null);
                setNewFolderName('');
                setNewFolderColor('blue');
                setShowCreateFolderModal(true);
              }}
              className="flex items-center justify-center gap-1 py-2.5 px-2.5 bg-white hover:bg-[#e8f0fe] text-[#1a73e8] border border-[#1a73e8]/40 rounded-full font-medium text-xs shadow-xs transition-colors"
              title="Create a new folder to organize bills, identity documents, etc."
            >
              <FolderPlus className="w-4 h-4" />
              <span>+ Folder</span>
            </button>
          )}

          {/* Create Document Requirement Slot (RED if not uploaded) */}
          <button
            onClick={() => setShowCreateSlotModal(true)}
            className="flex items-center justify-center gap-1 py-2.5 px-2.5 bg-white hover:bg-[#fce8e6]/40 text-[#d93025] border border-[#ea4335]/40 rounded-full font-medium text-xs shadow-xs transition-colors"
            title="Add required document slot (Marks RED until uploaded)"
          >
            <FilePlus2 className="w-4 h-4" />
            <span>+ Slot</span>
          </button>
        </div>

        {/* Local Documents Cloud Sync Banner */}
        {!dismissSyncBanner && onSyncLocalDocs && documents.some(d => d.url && d.url.startsWith('data:')) && (
          <div className="bg-[#fef7e0] border border-[#f9ab00]/40 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs animate-in fade-in">
            <div className="flex items-center gap-1.5 text-[#b06000]">
              <Cloud className="w-4 h-4 text-[#e37400] flex-shrink-0" />
              <span>
                <strong>{documents.filter(d => d.url && d.url.startsWith('data:')).length}</strong> document(s) in local vault.
              </span>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                disabled={isSyncingLocal}
                onClick={async () => {
                  try {
                    setIsSyncingLocal(true);
                    await onSyncLocalDocs();
                  } finally {
                    setIsSyncingLocal(false);
                  }
                }}
                className="px-2.5 py-1 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium rounded-lg text-[11px] shadow-xs transition-colors flex items-center gap-1 disabled:opacity-50"
              >
                {isSyncingLocal ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <span>Sync to Cloud</span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setDismissSyncBanner(true)}
                className="p-1 text-[#5f6368] hover:text-[#202124] rounded-md transition-colors"
                title="Dismiss"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

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
            <span>Red ({documents.filter(d => d.status === 'missing' || d.status === 'disapproved').length})</span>
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
            <span>Green ({documents.filter(d => d.status === 'approved').length})</span>
          </button>

          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-2 py-1 rounded-md font-medium transition-colors ${
              statusFilter === 'pending'
                ? 'bg-white border border-[#202124] text-[#202124]'
                : 'bg-[#f8fafd] text-[#5f6368] border border-[#dadce0] hover:bg-white'
            }`}
          >
            Normal ({documents.filter(d => d.status === 'pending').length})
          </button>
        </div>

        {/* Folder View Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pt-1 text-[11px] border-t border-[#dadce0]/60 mt-1.5">
          <span className="text-[10px] font-bold text-[#5f6368] uppercase tracking-wider mr-1">View:</span>
          <button
            type="button"
            onClick={() => setFolderFilter('all')}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
              folderFilter === 'all'
                ? 'bg-[#1a73e8] text-white shadow-xs font-semibold'
                : 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed]'
            }`}
          >
            All Docs
          </button>
          <button
            type="button"
            onClick={() => setFolderFilter('in_folders')}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors flex items-center gap-1 ${
              folderFilter === 'in_folders'
                ? 'bg-[#1a73e8] text-white shadow-xs font-semibold'
                : 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed]'
            }`}
          >
            <Folder className="w-3 h-3 text-amber-500" />
            <span>In Folders</span>
          </button>
          <button
            type="button"
            onClick={() => setFolderFilter('without_folders')}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors flex items-center gap-1 ${
              folderFilter === 'without_folders'
                ? 'bg-[#1a73e8] text-white shadow-xs font-semibold'
                : 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed]'
            }`}
          >
            <File className="w-3 h-3 text-blue-500" />
            <span>Without Folders (Root)</span>
          </button>
        </div>

        {/* Printing Progress Banner */}
        {isPrinting && (
          <div className="bg-[#e8f0fe] border border-[#1a73e8]/30 rounded-xl p-2.5 flex items-center gap-2 text-xs text-[#1a73e8] animate-in fade-in">
            <Loader2 className="w-4 h-4 animate-spin flex-shrink-0" />
            <span className="font-semibold">{printStatus || 'Preparing print layout (smart ID card scaling)...'}</span>
          </div>
        )}

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
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrintAll}
              disabled={isPrinting}
              className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-[#1a73e8] bg-[#e8f0fe] hover:bg-[#d2e3fc] border border-[#1a73e8]/30 rounded-lg transition-colors shadow-xs"
              title="Print all documents in this tab (Smart ID card scaling on single A4 page)"
            >
              {isPrinting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Printer className="w-3 h-3" />
              )}
              <span>Print All</span>
            </button>
            <span className="text-[11px] text-[#5f6368] truncate max-w-[120px]">
              {tabTitle}
            </span>
          </div>
        </div>

        {/* Multi-Select Floating Batch Action Toolbar */}
        {selectedDocIds.length > 0 && (
          <div className="bg-[#1e293b] text-white p-2.5 rounded-2xl shadow-xl border border-slate-700 flex flex-col gap-2 animate-in slide-in-from-top-2 duration-150 z-30 mt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold flex items-center gap-1.5 text-blue-300">
                <CheckSquare className="w-3.5 h-3.5 text-blue-400" />
                <span>{selectedDocIds.length} Document{selectedDocIds.length > 1 ? 's' : ''} Selected</span>
              </span>
              <button
                type="button"
                onClick={onToggleSelectAll}
                className="text-[11px] text-slate-400 hover:text-white transition-colors"
              >
                Clear Selection
              </button>
            </div>

            {/* Batch Action Buttons */}
            <div className="flex items-center gap-1.5 flex-wrap text-xs">
              {/* Batch Print Selected */}
              <button
                type="button"
                onClick={() => handlePrintBatch(selectedDocIds)}
                disabled={isPrinting}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-600 transition-colors shadow-xs"
                title="Print all selected documents (Smart A4 & ID Card sizing)"
              >
                {isPrinting ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-400" />
                ) : (
                  <Printer className="w-3.5 h-3.5 text-blue-400" />
                )}
                <span>Print Selected ({selectedDocIds.length})</span>
              </button>

              {/* Move to Folder Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowBatchMoveDropdown(prev => !prev)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-600 transition-colors shadow-xs"
                  title="Move selected documents to a folder"
                >
                  <FolderInput className="w-3.5 h-3.5 text-amber-400" />
                  <span>Move to Folder...</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>

                {showBatchMoveDropdown && (
                  <div className="absolute left-0 top-full mt-1 w-52 bg-white text-slate-800 rounded-xl shadow-2xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase text-slate-400 border-b border-slate-100">
                      Destination Folder
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (onBatchMoveDocsToFolder) {
                          onBatchMoveDocsToFolder(selectedDocIds, undefined);
                        }
                        setShowBatchMoveDropdown(false);
                      }}
                      className="w-full px-3 py-2 text-left text-xs font-semibold hover:bg-blue-50 text-[#1a73e8] flex items-center gap-2 transition-colors"
                    >
                      <CornerDownRight className="w-3.5 h-3.5" />
                      <span>Root Level (Remove from Folder)</span>
                    </button>
                    {folders.map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          if (onBatchMoveDocsToFolder) {
                            onBatchMoveDocsToFolder(selectedDocIds, f.id);
                          }
                          setShowBatchMoveDropdown(false);
                        }}
                        className="w-full px-3 py-1.5 text-left text-xs hover:bg-slate-100 flex items-center gap-2 text-slate-700 transition-colors"
                      >
                        <Folder className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 1-Click Sequential Auto-Numbering (1., 2., 3...) */}
              {onBatchAutoNumberDocs && (
                <button
                  type="button"
                  onClick={() => onBatchAutoNumberDocs(selectedDocIds)}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-600 transition-colors shadow-xs"
                  title="Auto-number selected documents sequentially (1. Passport, 2. Bank Statement, etc.)"
                >
                  <Hash className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Auto-Number (1,2,3..)</span>
                </button>
              )}

              {/* Approve All */}
              {onBatchUpdateStatus && (
                <button
                  type="button"
                  onClick={() => onBatchUpdateStatus(selectedDocIds, 'approved')}
                  className="p-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 rounded-lg text-xs border border-emerald-800 transition-colors"
                  title="Approve All Selected (Turn Green)"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Disapprove All */}
              {onBatchUpdateStatus && (
                <button
                  type="button"
                  onClick={() => onBatchUpdateStatus(selectedDocIds, 'disapproved')}
                  className="p-1 bg-red-950/80 hover:bg-red-900 text-red-300 rounded-lg text-xs border border-red-800 transition-colors"
                  title="Disapprove All Selected (Turn Red)"
                >
                  <XCircle className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Delete All */}
              {onBatchDeleteDocs && (
                <button
                  type="button"
                  onClick={() => onBatchDeleteDocs(selectedDocIds)}
                  className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 text-red-300 rounded-lg text-xs font-semibold flex items-center gap-1 border border-red-800 transition-colors shadow-xs ml-auto"
                  title="Delete Selected Documents"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Drag & Drop Overlay */}
      {isDragging && (
        <div 
          onClick={() => setIsDragging(false)}
          className="absolute inset-0 bg-[#e8f0fe]/95 flex flex-col items-center justify-center p-6 text-center z-30 backdrop-blur-xs cursor-pointer select-none animate-in fade-in duration-100"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsDragging(false);
            }}
            className="absolute top-4 right-4 p-2 text-[#5f6368] hover:text-[#202124] hover:bg-black/5 rounded-full transition-colors"
            title="Close overlay"
          >
            <X className="w-5 h-5" />
          </button>
          <UploadCloud className="w-12 h-12 text-[#1a73e8] animate-bounce mb-2" />
          <p className="font-semibold text-sm text-[#1a73e8]">Drop documents here</p>
          <p className="text-xs text-[#5f6368] mt-1">PDF, JPG, PNG, DOCX, and all file formats</p>
          <span className="text-[11px] text-[#1a73e8] mt-3 underline font-medium">Click anywhere to close</span>
        </div>
      )}

      {/* Create Folder Modal */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white border border-[#dadce0] rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-150">
            <h3 className="font-bold text-sm text-[#202124] mb-1 flex items-center gap-2">
              <FolderPlus className="w-4 h-4 text-[#1a73e8]" />
              <span>{folderModalParentId ? 'Create New Subfolder' : 'Create New Folder'}</span>
            </h3>
            <p className="text-xs text-[#5f6368] mb-4">
              {folderModalParentId 
                ? `Creating a nested subfolder inside "${folders.find(f => f.id === folderModalParentId)?.name}".`
                : 'Organize case documents (e.g. Bills, Identity, Bank Statements).'}
            </p>

            <form onSubmit={handleCreateFolderSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-[#202124] mb-1">
                  Folder Name
                </label>
                <input
                  type="text"
                  placeholder={folderModalParentId ? "e.g. Electricity Bills, Gas Bills..." : "e.g. Bills, Identity, Payslips..."}
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-3 py-2 border border-[#dadce0] rounded-lg text-xs outline-none focus:border-[#1a73e8]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#202124] mb-1">
                  Folder Color Tag
                </label>
                <div className="flex items-center gap-2 pt-1 flex-wrap">
                  {FOLDER_COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewFolderColor(c.id)}
                      className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${
                        newFolderColor === c.id ? 'scale-115 shadow-xs border-[#202124]' : 'border-transparent hover:scale-105'
                      }`}
                      style={{ backgroundColor: c.text }}
                      title={c.name}
                    >
                      {newFolderColor === c.id && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateFolderModal(false)}
                  className="px-3 py-1.5 text-xs text-[#5f6368] hover:bg-[#f1f3f4] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg shadow-sm"
                >
                  Create Folder
                </button>
              </div>
            </form>
          </div>
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
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-[#f1f3f4]">
        {filteredDocuments.length === 0 && rootFolders.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-[#5f6368]">
            <div className="w-12 h-12 rounded-full bg-[#f1f3f4] flex items-center justify-center mb-3">
              <FileCheck className="w-6 h-6 text-[#bdc1c6]" />
            </div>
            <p className="text-sm font-medium text-[#202124]">No documents or folders found</p>
            <p className="text-xs text-[#5f6368] mt-1 max-w-[200px]">
              {statusFilter !== 'all' 
                ? 'No documents match this filter.' 
                : 'Upload PDF, JPG, PNG, or create a folder to organize bills and certificates.'}
            </p>
          </div>
        ) : (
          <>
            {/* Render Folders Tree */}
            {rootFolders.map((folder) => renderFolderTree(folder, 0))}

            {/* Root / General Documents */}
            {rootFolders.length > 0 && rootDocuments.length > 0 && (
              <div 
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverFolderId('root');
                }}
                onDragLeave={() => setDragOverFolderId(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  setDragOverFolderId(null);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    onUploadFiles(e.dataTransfer.files);
                    return;
                  }
                  const movedDocId = e.dataTransfer.getData('text/doc-id');
                  if (movedDocId && onMoveDocToFolder) {
                    onMoveDocToFolder(movedDocId, undefined);
                  }
                }}
                className={`px-3 py-1.5 border-y border-[#dadce0] text-[11px] font-bold text-[#5f6368] flex items-center justify-between transition-colors ${
                  dragOverFolderId === 'root' ? 'bg-[#e8f0fe] border-[#1a73e8] text-[#1a73e8]' : 'bg-[#f8fafd]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#5f6368]" />
                  <span>General Documents ({rootDocuments.length})</span>
                </span>
                {dragOverFolderId === 'root' && (
                  <span className="text-[10px] text-[#1a73e8] font-medium">Drop here to move out of folder</span>
                )}
              </div>
            )}

            {/* Render root documents */}
            {rootDocuments.map((doc) => renderDocumentCard(doc, 0))}
          </>
        )}
      </div>
    </aside>
  );
};
