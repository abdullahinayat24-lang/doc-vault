import React, { useState, useRef, useMemo, useEffect } from 'react';
import { 
  Lock, 
  Key, 
  FileText, 
  Eye, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  Download,
  Upload,
  Building,
  Check,
  UploadCloud,
  Plus,
  RefreshCw,
  Folder,
  ChevronDown,
  ChevronRight,
  Search,
  Image as ImageIcon,
  BookOpen,
  File,
  LayoutGrid,
  Columns
} from 'lucide-react';
import { ShareRecord, DocumentItem, CollectionTab, DocumentStatus, FileType, DocumentFolder } from '../types';
import { DocumentViewer } from './Viewer/DocumentViewer';
import { exportSingleDocument, exportMultipleDocuments, exportAsPdf, exportAsJpg, detectFileType } from '../lib/storage';
import { getFolderColorStyle } from './DocumentList';

interface SharedViewerProps {
  shareRecord: ShareRecord | null;
  documents: DocumentItem[];
  folders?: DocumentFolder[];
  tabs: CollectionTab[];
  onUploadClientFile?: (docId: string, file: File) => void;
  onClientUploadNewDoc?: (collectionId: string, file: File, folderId?: string) => void;
  onUpdateStatus?: (docId: string, status: DocumentStatus) => void;
  onBackToApp?: () => void;
}

export const SharedViewer: React.FC<SharedViewerProps> = ({
  shareRecord,
  documents,
  folders = [],
  tabs,
  onUploadClientFile,
  onClientUploadNewDoc,
  onUpdateStatus,
  onBackToApp
}) => {
  const [enteredCode, setEnteredCode] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const [viewLayout, setViewLayout] = useState<'workspace' | 'checklist'>('workspace');
  const [mobilePane, setMobilePane] = useState<'list' | 'viewer'>('list');

  const slotUploadRef = useRef<HTMLInputElement>(null);
  const additionalUploadRef = useRef<HTMLInputElement>(null);
  const folderUploadRef = useRef<HTMLInputElement>(null);

  const [targetSlotId, setTargetSlotId] = useState<string | null>(null);
  const [targetFolderUploadId, setTargetFolderUploadId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isGlobalDragging, setIsGlobalDragging] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [portalBg, setPortalBg] = useState<'default' | 'warm' | 'slate'>('default');

  // Window drag events to prevent browser navigation when dropping files
  useEffect(() => {
    const handleWindowDragOver = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
      }
    };
    const handleWindowDrop = (e: DragEvent) => {
      if (e.dataTransfer?.types?.includes('Files')) {
        e.preventDefault();
      }
    };
    window.addEventListener('dragover', handleWindowDragOver);
    window.addEventListener('drop', handleWindowDrop);
    return () => {
      window.removeEventListener('dragover', handleWindowDragOver);
      window.removeEventListener('drop', handleWindowDrop);
    };
  }, []);

  if (!shareRecord) {
    return (
      <div className="min-h-screen bg-[#f8fafd] flex flex-col items-center justify-center p-6 text-center select-none">
        <div className="w-16 h-16 rounded-2xl bg-white border border-[#dadce0] shadow-sm flex items-center justify-center mb-4 text-[#d93025]">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="font-['Google_Sans',sans-serif] text-xl font-bold text-[#202124]">
          Shared Link Not Found
        </h2>
        <p className="text-sm text-[#5f6368] mt-1 max-w-sm">
          This document link may have expired or was removed by the solicitor.
        </p>
        {onBackToApp && (
          <button
            onClick={onBackToApp}
            className="mt-6 inline-flex items-center gap-2 px-4 py-2 bg-[#1a73e8] text-white rounded-lg text-sm font-medium hover:bg-[#1557b0] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go to DocVault Home</span>
          </button>
        )}
      </div>
    );
  }

  // Filter allowed documents with safe fallback
  const allowedDocuments: DocumentItem[] = useMemo(() => {
    let filtered: DocumentItem[] = [];
    if (shareRecord.scope === 'collection') {
      const targetTabId = shareRecord.targetIds[0];
      filtered = documents.filter((d) => d.collectionId === targetTabId);
    } else {
      filtered = documents.filter((d) => shareRecord.targetIds.includes(d.id));
    }
    return filtered.length > 0 ? filtered : documents;
  }, [shareRecord, documents]);

  const toggleFolderCollapse = (folderId: string) => {
    setCollapsedFolders((prev) => ({ ...prev, [folderId]: !prev[folderId] }));
  };

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return allowedDocuments;
    const q = searchQuery.toLowerCase();
    return allowedDocuments.filter(
      (d) =>
        d.name.toLowerCase().includes(q) ||
        d.fileType.toLowerCase().includes(q) ||
        (d.notes && d.notes.toLowerCase().includes(q))
    );
  }, [allowedDocuments, searchQuery]);

  const relevantFolders = useMemo(() => {
    if (!folders || folders.length === 0) return [];
    if (shareRecord && shareRecord.scope === 'collection') {
      const tabId = shareRecord.targetIds[0];
      const match = folders.filter((f) => f.collectionId === tabId || !f.collectionId);
      if (match.length > 0) return match;
      return folders;
    }
    const activeFolderIds = new Set(allowedDocuments.map((d) => d.folderId).filter(Boolean));
    const match = folders.filter((f) => activeFolderIds.has(f.id));
    if (match.length > 0) return match;
    return folders;
  }, [folders, shareRecord, allowedDocuments]);

  // Root folders (top level without parent)
  const rootFolders = useMemo(() => {
    return relevantFolders.filter((f) => !f.parentId);
  }, [relevantFolders]);

  const getDocIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf': return <FileText className="w-3.5 h-3.5 text-[#d93025]" />;
      case 'doc': case 'docx': case 'txt': case 'rtf': case 'md': return <FileText className="w-3.5 h-3.5 text-[#1a73e8]" />;
      case 'png': case 'jpg': case 'jpeg': case 'webp': case 'gif': return <ImageIcon className="w-3.5 h-3.5 text-[#1a73e8]" />;
      case 'csv': case 'xlsx': case 'pptx': return <File className="w-3.5 h-3.5 text-[#137333]" />;
      case 'epub': return <BookOpen className="w-3.5 h-3.5 text-[#9334e6]" />;
      default: return <File className="w-3.5 h-3.5 text-[#5f6368]" />;
    }
  };

  const handleSelectDoc = (doc: DocumentItem) => {
    setActiveDoc(doc);
    setMobilePane('viewer');
  };

  const renderDocCard = (doc: DocumentItem, indent = 0) => {
    const isActive = activeDoc?.id === doc.id;
    let cardStyle = '';
    let badge = null;
    const isMissing = doc.status === 'missing' || doc.status === 'disapproved' || !doc.hasFile;

    if (isMissing) {
      cardStyle = isActive 
        ? 'bg-[#fce8e6] border-l-4 border-l-[#ea4335]' 
        : 'bg-[#fce8e6]/40 hover:bg-[#fce8e6]/70 border-l-4 border-l-[#ea4335]/70';
      badge = <span className="text-[9px] font-bold uppercase bg-[#d93025] text-white px-1.5 py-0.5 rounded">Missing</span>;
    } else if (doc.status === 'approved') {
      cardStyle = isActive
        ? 'bg-[#e6f4ea] border-l-4 border-l-[#34a853]'
        : 'bg-white hover:bg-[#f8fafd] border-l-4 border-l-[#34a853]';
      badge = <span className="text-[9px] font-bold uppercase bg-[#137333] text-white px-1.5 py-0.5 rounded">Approved</span>;
    } else {
      cardStyle = isActive
        ? 'bg-[#e8f0fe] border-l-4 border-l-[#1a73e8]'
        : 'bg-white hover:bg-[#f8fafd] border-l-4 border-l-transparent';
      badge = <span className="text-[9px] font-medium bg-[#f1f3f4] text-[#5f6368] px-1.5 py-0.5 rounded">Ready</span>;
    }

    return (
      <div
        key={doc.id}
        onClick={() => handleSelectDoc(doc)}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onUploadClientFile) {
            onUploadClientFile(doc.id, e.dataTransfer.files[0]);
          }
        }}
        style={{ paddingLeft: `${indent * 14 + 12}px` }}
        className={`py-2.5 pr-3 text-left transition-all cursor-pointer border-b border-[#f1f3f4] ${cardStyle}`}
      >
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            {getDocIcon(doc.fileType)}
            <p className="text-xs font-semibold truncate leading-tight text-[#202124]" title={doc.name}>
              {doc.name}
            </p>
          </div>
          {badge}
        </div>

        {isMissing && (
          <div className="mt-1.5 flex items-center justify-between">
            <span className="text-[10px] text-[#d93025] font-medium italic">Action required</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setTargetSlotId(doc.id);
                slotUploadRef.current?.click();
              }}
              className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#d93025] hover:bg-[#b31412] text-white text-[10px] font-bold rounded shadow-2xs transition-colors"
            >
              <Upload className="w-2.5 h-2.5" />
              <span>Upload File</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderFolderBranch = (folder: DocumentFolder, depth: number = 0) => {
    const isCollapsed = !!collapsedFolders[folder.id];
    const colorStyle = getFolderColorStyle(folder.color);
    const childFolders = relevantFolders.filter((f) => f.parentId === folder.id);
    const folderDocs = filteredDocuments.filter((d) => d.folderId === folder.id);
    const childDocsCount = childFolders.reduce((sum, cf) => sum + filteredDocuments.filter((d) => d.folderId === cf.id).length, 0);
    const totalInFolder = folderDocs.length + childDocsCount;

    return (
      <div key={folder.id} className="border-b border-[#f1f3f4]">
        {/* Folder Header */}
        <div
          onClick={() => toggleFolderCollapse(folder.id)}
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
            setDragOverFolderId(null);
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onClientUploadNewDoc) {
              const targetCollectionId = shareRecord.scope === 'collection' ? shareRecord.targetIds[0] : (allowedDocuments[0]?.collectionId || 'default');
              onClientUploadNewDoc(targetCollectionId, e.dataTransfer.files[0], folder.id);
            }
          }}
          style={{ paddingLeft: `${depth * 14 + 10}px` }}
          className={`flex items-center justify-between gap-1.5 py-2 px-3 hover:bg-[#f8fafd] cursor-pointer transition-colors select-none ${
            dragOverFolderId === folder.id ? 'bg-[#e8f0fe] ring-2 ring-inset ring-[#1a73e8]' : 'bg-white'
          }`}
        >
          <div className="flex items-center gap-1.5 flex-1 min-w-0">
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5 text-[#5f6368] flex-shrink-0" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-[#5f6368] flex-shrink-0" />
            )}
            <div
              className="w-5 h-5 rounded flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: colorStyle.bg, color: colorStyle.text }}
            >
              <Folder className="w-3 h-3 fill-current" />
            </div>
            <span className="text-xs font-bold text-[#202124] truncate">{folder.name}</span>
          </div>

          <div className="flex items-center gap-1">
            <span className="text-[10px] font-semibold text-[#5f6368] bg-[#f1f3f4] px-1.5 py-0.5 rounded-full flex-shrink-0">
              {totalInFolder}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setTargetFolderUploadId(folder.id);
                folderUploadRef.current?.click();
              }}
              className="p-1 text-[#1a73e8] hover:bg-[#e8f0fe] rounded transition-colors"
              title={`Upload document into ${folder.name}`}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Folder Content: Subfolders + Documents */}
        {!isCollapsed && (
          <div>
            {childFolders.map((subfolder) => renderFolderBranch(subfolder, depth + 1))}
            {folderDocs.map((doc) => renderDocCard(doc, depth + 1))}
            {childFolders.length === 0 && folderDocs.length === 0 && (
              <div 
                style={{ paddingLeft: `${depth * 14 + 28}px` }}
                className="py-2 pr-3 text-[11px] text-[#5f6368] italic flex items-center justify-between"
              >
                <span>Empty folder</span>
                <button
                  onClick={() => {
                    setTargetFolderUploadId(folder.id);
                    folderUploadRef.current?.click();
                  }}
                  className="text-[#1a73e8] hover:underline font-semibold text-[10px]"
                >
                  + Upload File
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const handleSlotFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && targetSlotId && onUploadClientFile) {
      onUploadClientFile(targetSlotId, e.target.files[0]);
      setTargetSlotId(null);
      if (slotUploadRef.current) {
        slotUploadRef.current.value = '';
      }
    }
  };

  const handleAdditionalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onClientUploadNewDoc) {
      const targetCollectionId = shareRecord.scope === 'collection' ? shareRecord.targetIds[0] : (allowedDocuments[0]?.collectionId || 'default');
      onClientUploadNewDoc(targetCollectionId, e.target.files[0], targetFolderUploadId || undefined);
      setTargetFolderUploadId(null);
      if (additionalUploadRef.current) {
        additionalUploadRef.current.value = '';
      }
    }
  };

  const handleFolderFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && onClientUploadNewDoc) {
      const targetCollectionId = shareRecord.scope === 'collection' ? shareRecord.targetIds[0] : (allowedDocuments[0]?.collectionId || 'default');
      onClientUploadNewDoc(targetCollectionId, e.target.files[0], targetFolderUploadId || undefined);
      setTargetFolderUploadId(null);
      if (folderUploadRef.current) {
        folderUploadRef.current.value = '';
      }
    }
  };

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredCode.trim().toLowerCase() === shareRecord.passcode.trim().toLowerCase()) {
      setIsUnlocked(true);
      setError(null);
      setViewLayout('workspace');
      const firstWithFile = allowedDocuments.find((d) => d.hasFile) || allowedDocuments[0] || null;
      setActiveDoc(firstWithFile);
    } else {
      setError('Invalid 4-digit PIN. Please check with your solicitor.');
    }
  };

  // 4-Digit Privacy PIN Lock Screen
  if (!isUnlocked) {
    return (
      <div className="min-h-screen bg-[#f8fafd] flex flex-col items-center justify-center p-4 select-none">
        <div className="bg-white border border-[#dadce0] rounded-3xl shadow-xl max-w-md w-full p-8 text-center animate-in fade-in zoom-in-95 duration-150">
          {shareRecord.companyLogo ? (
            <img 
              src={shareRecord.companyLogo} 
              alt={shareRecord.companyName} 
              className="w-16 h-16 rounded-2xl mx-auto mb-3 object-cover border border-[#dadce0] shadow-sm"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center mx-auto mb-3 ring-4 ring-blue-50">
              <Lock className="w-8 h-8" />
            </div>
          )}

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#e8f0fe] text-[#1a73e8] text-xs font-bold mb-2">
            <Building className="w-3.5 h-3.5" />
            <span>Secure Client Portal</span>
          </div>

          <h2 className="font-['Google_Sans',sans-serif] text-xl font-bold text-[#202124]">
            {shareRecord.title}
          </h2>
          <p className="text-xs text-[#5f6368] mt-1 mb-6">
            Enter the <strong>4-digit Privacy PIN</strong> provided by your solicitor to access your documents and upload files.
          </p>

          <form onSubmit={handleUnlock} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-[#202124] mb-1.5">
                4-Digit Privacy PIN
              </label>
              <div className="relative flex items-center">
                <Key className="w-4 h-4 text-[#5f6368] absolute left-3.5" />
                <input
                  type="password"
                  maxLength={6}
                  value={enteredCode}
                  onChange={(e) => setEnteredCode(e.target.value)}
                  placeholder="••••"
                  autoFocus
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-lg font-mono tracking-widest outline-none text-center font-bold text-[#1a73e8]"
                />
              </div>
            </div>

            {error && (
              <p className="text-xs font-medium text-[#d93025] flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                <span>{error}</span>
              </p>
            )}

            <button
              type="submit"
              className="w-full py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl font-medium text-sm transition-all shadow-sm flex items-center justify-center gap-2"
            >
              <span>Unlock Portal</span>
              <Check className="w-4 h-4" />
            </button>
          </form>

          {onBackToApp && (
            <div className="mt-6 pt-4 border-t border-[#f1f3f4]">
              <button
                onClick={onBackToApp}
                className="text-xs text-[#5f6368] hover:text-[#202124] flex items-center justify-center gap-1.5 mx-auto transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Return to Workspace</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  const missingDocs = allowedDocuments.filter((d) => d.status === 'missing' || d.status === 'disapproved' || !d.hasFile);
  const approvedDocsCount = allowedDocuments.filter((d) => d.status === 'approved').length;
  const totalDocsCount = allowedDocuments.length;
  const uploadedCount = allowedDocuments.filter((d) => d.hasFile).length;
  const progressPercent = totalDocsCount > 0 ? Math.round((uploadedCount / totalDocsCount) * 100) : 100;

  return (
    <div 
      className="h-screen flex flex-col bg-white overflow-hidden select-none relative"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('Files')) {
          e.preventDefault();
          setIsGlobalDragging(true);
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsGlobalDragging(false);
        }
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsGlobalDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onClientUploadNewDoc) {
          const targetCollectionId = shareRecord.scope === 'collection' ? shareRecord.targetIds[0] : (allowedDocuments[0]?.collectionId || 'default');
          onClientUploadNewDoc(targetCollectionId, e.dataTransfer.files[0]);
        }
      }}
    >
      {/* Hidden file inputs */}
      <input
        ref={slotUploadRef}
        type="file"
        onChange={handleSlotFileChange}
        className="hidden"
      />
      <input
        ref={additionalUploadRef}
        type="file"
        onChange={handleAdditionalFileChange}
        className="hidden"
      />
      <input
        ref={folderUploadRef}
        type="file"
        onChange={handleFolderFileChange}
        className="hidden"
      />

      {/* Global Drag & Drop Overlay */}
      {isGlobalDragging && (
        <div className="absolute inset-0 z-50 bg-[#1a73e8]/10 backdrop-blur-xs border-2 border-dashed border-[#1a73e8] flex flex-col items-center justify-center p-8 pointer-events-none">
          <div className="bg-white px-8 py-6 rounded-2xl shadow-xl border border-[#dadce0] flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-[#e8f0fe] flex items-center justify-center text-[#1a73e8] mb-3">
              <UploadCloud className="w-8 h-8 animate-bounce" />
            </div>
            <p className="text-lg font-bold text-[#202124]">Drop files to upload</p>
            <p className="text-sm text-[#5f6368] mt-1">
              Files will be securely added directly to <span className="font-semibold text-[#1a73e8]">{shareRecord.title}</span>
            </p>
          </div>
        </div>
      )}

      {/* Unified Portal Header */}
      <header className="bg-white border-b border-[#dadce0] px-3 sm:px-6 py-2.5 flex items-center justify-between gap-2 z-30 flex-shrink-0">
        {/* Left: Firm logo, Name, Case Title */}
        <div className="flex items-center gap-3 min-w-0">
          {shareRecord.companyLogo ? (
            <img src={shareRecord.companyLogo} alt="" className="w-8 h-8 rounded-xl object-cover border shadow-xs flex-shrink-0" />
          ) : (
            <div className="w-8 h-8 rounded-xl bg-[#1a73e8] text-white flex items-center justify-center font-bold text-sm flex-shrink-0">
              <Building className="w-4 h-4" />
            </div>
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-['Google_Sans',sans-serif] font-bold text-sm sm:text-base text-[#202124] truncate max-w-[170px] sm:max-w-none">
                {shareRecord.companyName || 'DocVault Chambers'}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#e8f0fe] text-[#1a73e8] border border-[#c2e7ff] flex-shrink-0">
                Client Portal
              </span>
            </div>
            <p className="text-[11px] text-[#5f6368] truncate max-w-[220px] sm:max-w-xs">
              {shareRecord.title} • {totalDocsCount} documents ({uploadedCount} ready)
            </p>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Quick upload button */}
          <button
            onClick={() => additionalUploadRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg text-xs font-bold transition-all shadow-xs"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Upload Document</span>
          </button>

          {/* View layout toggle: Workspace (default) vs Checklist Grid */}
          <div className="hidden sm:flex items-center bg-[#f1f3f4] p-0.5 rounded-lg border border-[#dadce0] text-xs font-medium">
            <button
              onClick={() => setViewLayout('workspace')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition-colors ${
                viewLayout === 'workspace' ? 'bg-white text-[#1a73e8] font-bold shadow-xs' : 'text-[#5f6368]'
              }`}
              title="Folder Tree & Document Viewer"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Workspace</span>
            </button>
            <button
              onClick={() => setViewLayout('checklist')}
              className={`px-2.5 py-1 rounded flex items-center gap-1 transition-colors ${
                viewLayout === 'checklist' ? 'bg-white text-[#1a73e8] font-bold shadow-xs' : 'text-[#5f6368]'
              }`}
              title="Checklist Card View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Checklist</span>
            </button>
          </div>

          {/* Download all as zip */}
          {allowedDocuments.filter((d) => d.hasFile).length > 1 && (
            <button
              onClick={() => exportMultipleDocuments(allowedDocuments, `${shareRecord.title}.zip`, folders)}
              className="hidden md:flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-lg transition-colors border border-[#dadce0]"
              title="Download all documents as a ZIP"
            >
              <Download className="w-3.5 h-3.5" />
              <span>ZIP</span>
            </button>
          )}

          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-lg transition-colors border border-[#dadce0]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Main Workspace</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Content: Workspace Mode (Default) */}
      {viewLayout === 'workspace' ? (
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 relative">
          {/* Left Sidebar: Repository Tree & Documents */}
          <aside className={`${mobilePane === 'viewer' ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 bg-white border-r border-[#dadce0] flex-col h-full overflow-hidden flex-shrink-0`}>
            {/* Action Bar & Search */}
            <div className="p-3 bg-[#f8fafd] border-b border-[#dadce0] flex flex-col gap-2.5">
              <button
                onClick={() => additionalUploadRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl text-xs font-bold transition-all shadow-xs"
              >
                <Plus className="w-4 h-4" />
                <span>Upload New Document</span>
              </button>

              <div className="relative flex items-center">
                <Search className="w-3.5 h-3.5 text-[#5f6368] absolute left-2.5 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter documents..."
                  className="w-full pl-8 pr-2.5 py-1.5 text-xs border border-[#dadce0] rounded-lg bg-white focus:outline-none focus:border-[#1a73e8] transition-colors"
                />
              </div>

              {/* Progress Tracker Pill */}
              <div className="flex items-center justify-between text-[11px] px-1 text-[#5f6368]">
                <span>Case Files ({filteredDocuments.length})</span>
                {missingDocs.length > 0 ? (
                  <span className="text-[#d93025] font-bold bg-[#fce8e6] px-2 py-0.5 rounded-full">
                    {missingDocs.length} Missing
                  </span>
                ) : (
                  <span className="text-[#137333] font-bold bg-[#e6f4ea] px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    <span>Complete</span>
                  </span>
                )}
              </div>
            </div>

            {/* Folder Tree & Document List */}
            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain divide-y divide-[#f1f3f4]">
              {relevantFolders.length > 0 ? (
                <>
                  {rootFolders.map((folder) => renderFolderBranch(folder, 0))}

                  {/* General / Root Documents */}
                  {(() => {
                    const rootDocs = filteredDocuments.filter(
                      (d) => !d.folderId || !relevantFolders.some((f) => f.id === d.folderId)
                    );
                    if (rootDocs.length === 0) return null;
                    return (
                      <div>
                        <div className="px-3 py-1.5 bg-[#f8fafd] border-b border-[#dadce0] text-[10px] font-bold uppercase tracking-wider text-[#5f6368] flex items-center justify-between">
                          <span>General Case Files ({rootDocs.length})</span>
                        </div>
                        {rootDocs.map((doc) => renderDocCard(doc, 0))}
                      </div>
                    );
                  })()}
                </>
              ) : (
                filteredDocuments.map((doc) => renderDocCard(doc, 0))
              )}

              {filteredDocuments.length === 0 && (
                <div className="p-8 text-center text-[#5f6368] flex flex-col items-center justify-center">
                  <FileText className="w-8 h-8 text-[#dadce0] mb-2" />
                  <p className="text-xs font-semibold">No documents found</p>
                  <button
                    onClick={() => additionalUploadRef.current?.click()}
                    className="mt-3 text-xs text-[#1a73e8] font-bold hover:underline"
                  >
                    + Upload First Document
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* Right Panel: Document Viewer & Dedicated Upload Area */}
          <div className={`${mobilePane === 'list' ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#f8fafd] h-full overflow-hidden min-h-0`}>
            {activeDoc ? (
              <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Viewer Top Action Bar */}
                <div className="bg-white border-b border-[#dadce0] px-4 py-2 flex items-center justify-between gap-2 z-20 flex-shrink-0 shadow-2xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => setMobilePane('list')}
                      className="md:hidden flex items-center gap-1 px-2.5 py-1 bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] rounded-lg text-xs font-bold transition-colors"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>Case Files</span>
                    </button>
                    {getDocIcon(activeDoc.fileType)}
                    <span className="text-xs sm:text-sm font-bold text-[#202124] truncate max-w-[220px] sm:max-w-md">
                      {activeDoc.name}
                    </span>
                    {activeDoc.hasFile ? (
                      <span className="hidden sm:inline-block text-[10px] uppercase font-bold text-[#137333] bg-[#e6f4ea] px-2 py-0.5 rounded-full">
                        Uploaded
                      </span>
                    ) : (
                      <span className="text-[10px] uppercase font-bold text-[#d93025] bg-[#fce8e6] px-2 py-0.5 rounded-full">
                        Missing File
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => {
                        setTargetSlotId(activeDoc.id);
                        slotUploadRef.current?.click();
                      }}
                      className="flex items-center gap-1 px-3 py-1 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg text-xs font-medium transition-colors shadow-2xs"
                      title="Upload a new file version for this slot"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span className="hidden sm:inline">{activeDoc.hasFile ? 'Replace File' : 'Upload File'}</span>
                    </button>

                    {activeDoc.hasFile && (
                      <button
                        onClick={() => exportSingleDocument(activeDoc)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0] rounded-lg text-xs font-medium transition-colors"
                        title="Download document"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Main View Area */}
                {activeDoc.hasFile ? (
                  <div className="flex-1 h-full overflow-hidden">
                    <DocumentViewer
                      document={activeDoc}
                      onExport={(doc) => exportSingleDocument(doc)}
                      onExportAsPdf={(doc) => exportAsPdf(doc)}
                      onExportAsJpg={(doc) => exportAsJpg(doc)}
                      onShare={() => {}}
                      onUpdateStatus={onUpdateStatus}
                      isReadOnly={true}
                    />
                  </div>
                ) : (
                  /* Missing Document Upload Zone */
                  <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
                    <div 
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onUploadClientFile) {
                          onUploadClientFile(activeDoc.id, e.dataTransfer.files[0]);
                        }
                      }}
                      className="max-w-md w-full bg-white border-2 border-dashed border-[#ea4335] rounded-3xl p-8 flex flex-col items-center shadow-md animate-in fade-in zoom-in-95 duration-150"
                    >
                      <div className="w-16 h-16 rounded-2xl bg-[#fce8e6] text-[#d93025] flex items-center justify-center mb-4 ring-8 ring-red-50">
                        <UploadCloud className="w-8 h-8 animate-pulse" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-[#d93025] text-white px-2.5 py-0.5 rounded-full mb-2">
                        Required Document Slot
                      </span>
                      <h3 className="text-base font-bold text-[#202124] mb-1">
                        {activeDoc.name}
                      </h3>
                      <p className="text-xs text-[#5f6368] mb-6 max-w-xs">
                        Your solicitor requires this document for your case. Drag & drop your file here, or click to upload.
                      </p>
                      <button
                        onClick={() => {
                          setTargetSlotId(activeDoc.id);
                          slotUploadRef.current?.click();
                        }}
                        className="px-6 py-2.5 bg-[#d93025] hover:bg-[#b31412] text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        <span>Select File to Upload</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Empty state overview dashboard */
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center mb-4 ring-8 ring-blue-50 shadow-xs">
                  <Building className="w-8 h-8" />
                </div>
                <h3 className="text-lg font-bold text-[#202124]">
                  {shareRecord.title}
                </h3>
                <p className="text-xs text-[#5f6368] mt-1 mb-6">
                  Select any case document from the left folder repository to review, or upload documents directly into your case.
                </p>

                {/* Missing documents call to action */}
                {missingDocs.length > 0 && (
                  <div className="w-full bg-[#fce8e6]/60 border border-[#ea4335]/30 rounded-2xl p-4 mb-6 text-left">
                    <div className="flex items-center gap-2 mb-2 text-[#d93025]">
                      <AlertCircle className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase">
                        {missingDocs.length} Action(s) Required
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {missingDocs.slice(0, 4).map((md) => (
                        <div key={md.id} className="flex items-center justify-between text-xs bg-white py-1.5 px-2.5 rounded-lg border border-[#ea4335]/20">
                          <span className="truncate max-w-[200px] font-semibold text-[#202124]">{md.name}</span>
                          <button
                            onClick={() => {
                              setTargetSlotId(md.id);
                              slotUploadRef.current?.click();
                            }}
                            className="text-[10px] font-bold text-white bg-[#d93025] px-2 py-0.5 rounded"
                          >
                            Upload
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={() => additionalUploadRef.current?.click()}
                  className="px-5 py-2.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  <span>Upload Additional Document</span>
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Checklist Grid Mode */
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-[#f8fafd]">
          <div className="max-w-3xl mx-auto space-y-6">
            <div className="bg-white border border-[#dadce0] rounded-3xl p-6 shadow-xs">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-['Google_Sans',sans-serif] text-lg font-bold text-[#202124]">
                    Document Submission Checklist
                  </h3>
                  <p className="text-xs text-[#5f6368] mt-1">
                    Upload required documents below for your solicitor to review.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-[#1a73e8]">{progressPercent}% Completed</span>
                  <div className="w-28 h-2 bg-[#e8eaed] rounded-full mt-1.5 overflow-hidden">
                    <div 
                      className="h-full bg-[#1a73e8] transition-all duration-300 rounded-full"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Checklist of Document Slots */}
            <div className="space-y-3">
              {allowedDocuments.map((doc) => {
                const isMissing = doc.status === 'missing' || doc.status === 'disapproved' || !doc.hasFile;
                return (
                  <div
                    key={doc.id}
                    className={`bg-white border rounded-2xl p-4 transition-all ${
                      isMissing ? 'border-[#ea4335] bg-[#fce8e6]/10' : 'border-[#dadce0]'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-[#f1f3f4] flex items-center justify-center flex-shrink-0">
                          {getDocIcon(doc.fileType)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-[#202124] truncate">{doc.name}</p>
                          <p className="text-xs text-[#5f6368]">
                            {isMissing ? 'Pending Upload' : `${(doc.fileSize / 1024).toFixed(0)} KB • Ready`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          onClick={() => {
                            setTargetSlotId(doc.id);
                            slotUploadRef.current?.click();
                          }}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                            isMissing ? 'bg-[#d93025] text-white hover:bg-[#b31412]' : 'bg-[#f1f3f4] text-[#202124] hover:bg-[#e8eaed]'
                          }`}
                        >
                          {isMissing ? 'Upload File' : 'Replace File'}
                        </button>
                        {doc.hasFile && (
                          <button
                            onClick={() => {
                              setActiveDoc(doc);
                              setViewLayout('workspace');
                              setMobilePane('viewer');
                            }}
                            className="px-3 py-1.5 bg-[#1a73e8] text-white rounded-lg text-xs font-bold hover:bg-[#1557b0] transition-colors"
                          >
                            View
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
