import React, { useState, useRef } from 'react';
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
  XCircle
} from 'lucide-react';
import { ShareRecord, DocumentItem, CollectionTab, DocumentStatus } from '../types';
import { DocumentViewer } from './Viewer/DocumentViewer';
import { exportSingleDocument, exportMultipleDocuments, exportAsPdf, exportAsJpg } from '../lib/storage';

interface SharedViewerProps {
  shareRecord: ShareRecord | null;
  documents: DocumentItem[];
  tabs: CollectionTab[];
  onUploadClientFile?: (docId: string, file: File) => void;
  onUpdateStatus?: (docId: string, status: DocumentStatus) => void;
  onBackToApp?: () => void;
}

export const SharedViewer: React.FC<SharedViewerProps> = ({
  shareRecord,
  documents,
  tabs,
  onUploadClientFile,
  onUpdateStatus,
  onBackToApp
}) => {
  const [enteredCode, setEnteredCode] = useState<string>('');
  const [isUnlocked, setIsUnlocked] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);
  const clientUploadRef = useRef<HTMLInputElement>(null);
  const [targetUploadSlotId, setTargetUploadSlotId] = useState<string | null>(null);

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

  // Filter allowed documents
  const allowedDocuments: DocumentItem[] = React.useMemo(() => {
    if (shareRecord.scope === 'collection') {
      const targetTabId = shareRecord.targetIds[0];
      return documents.filter((d) => d.collectionId === targetTabId);
    } else {
      return documents.filter((d) => shareRecord.targetIds.includes(d.id));
    }
  }, [shareRecord, documents]);

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (enteredCode.trim().toLowerCase() === shareRecord.passcode.trim().toLowerCase()) {
      setIsUnlocked(true);
      setError(null);
      const firstWithFile = allowedDocuments.find(d => d.hasFile) || allowedDocuments[0] || null;
      setActiveDoc(firstWithFile);
    } else {
      setError('Invalid 4-digit PIN. Please check with your solicitor.');
    }
  };

  const handleClientFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0] && targetUploadSlotId && onUploadClientFile) {
      onUploadClientFile(targetUploadSlotId, e.target.files[0]);
      setTargetUploadSlotId(null);
      if (clientUploadRef.current) {
        clientUploadRef.current.value = '';
      }
    }
  };

  // 4-digit PIN Gate
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

          <p className="text-xs font-semibold text-[#1a73e8] uppercase tracking-wider">
            {shareRecord.companyName || 'Solicitor Client Portal'}
          </p>

          <h2 className="font-['Google_Sans',sans-serif] text-xl font-bold text-[#202124] mt-1">
            {shareRecord.title}
          </h2>
          <p className="text-xs text-[#5f6368] mt-1 mb-6">
            Enter the <strong>4-digit Privacy PIN</strong> provided by your solicitor to access your documents.
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
              <span>Unlock Client Portal</span>
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
                <span>Return to Main Workspace</span>
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Unlocked Portal View
  return (
    <div className="h-screen flex flex-col bg-white overflow-hidden select-none">
      <input
        ref={clientUploadRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg,.webp,.epub,.txt"
        onChange={handleClientFileUpload}
        className="hidden"
      />

      {/* Header with Solicitor Branding */}
      <header className="h-16 bg-white border-b border-[#dadce0] px-4 sm:px-6 flex items-center justify-between gap-4 z-30">
        <div className="flex items-center gap-3">
          {shareRecord.companyLogo ? (
            <img src={shareRecord.companyLogo} alt="" className="w-9 h-9 rounded-xl object-cover border" />
          ) : (
            <div className="w-9 h-9 rounded-xl bg-[#1a73e8] text-white flex items-center justify-center font-bold text-sm">
              <Building className="w-5 h-5" />
            </div>
          )}
          <div>
            <div className="flex items-center gap-2">
              <span className="font-['Google_Sans',sans-serif] font-bold text-sm text-[#202124]">
                {shareRecord.companyName || 'Solicitor Client Portal'}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#fef7e0] text-[#b06000] border border-[#fce8b2]">
                Viewer Only
              </span>
            </div>
            <p className="text-[11px] text-[#5f6368] truncate max-w-xs">
              {shareRecord.title} • {allowedDocuments.length} document{allowedDocuments.length === 1 ? '' : 's'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {allowedDocuments.filter(d => d.hasFile).length > 1 && (
            <button
              onClick={() => exportMultipleDocuments(allowedDocuments, `${shareRecord.title}.zip`)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download All (ZIP)</span>
            </button>
          )}

          {onBackToApp && (
            <button
              onClick={onBackToApp}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-lg transition-colors border border-[#dadce0]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Main Workspace</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left document selector with RED / GREEN status indicators */}
        <aside className="w-80 bg-white border-r border-[#dadce0] flex flex-col h-[calc(100vh-4rem)] overflow-y-auto divide-y divide-[#f1f3f4]">
          <div className="p-3 bg-[#f8fafd] border-b border-[#dadce0] text-xs font-semibold text-[#5f6368] uppercase tracking-wider flex items-center justify-between">
            <span>Documents Checklist</span>
            <span className="text-[10px] font-normal text-[#5f6368]">
              {allowedDocuments.filter(d => d.status === 'approved').length} of {allowedDocuments.length} Approved
            </span>
          </div>

          {allowedDocuments.map((doc) => {
            const isActive = activeDoc?.id === doc.id;
            
            // Color logic:
            // - No document / disapprove document > RED
            // - Approved document > GREEN
            // - Doing nothing / pending > WHITE normal color
            let cardStyle = 'bg-white hover:bg-[#f8fafd]';
            let badge = null;

            if (doc.status === 'missing' || doc.status === 'disapproved') {
              cardStyle = 'bg-[#fce8e6]/80 border-l-4 border-l-[#ea4335] text-[#d93025]';
              badge = (
                <span className="text-[9px] font-bold uppercase bg-[#d93025] text-white px-1.5 py-0.2 rounded">
                  {doc.status === 'missing' ? 'Action: Missing' : 'Disapproved'}
                </span>
              );
            } else if (doc.status === 'approved') {
              cardStyle = 'bg-[#e6f4ea]/80 border-l-4 border-l-[#34a853] text-[#137333]';
              badge = (
                <span className="text-[9px] font-bold uppercase bg-[#137333] text-white px-1.5 py-0.2 rounded">
                  Approved
                </span>
              );
            } else {
              cardStyle = isActive ? 'bg-[#e8f0fe] border-l-4 border-l-[#1a73e8]' : 'bg-white hover:bg-[#f8fafd] border-l-4 border-l-transparent';
              badge = (
                <span className="text-[9px] font-medium bg-[#f1f3f4] text-[#5f6368] px-1.5 py-0.2 rounded">
                  Uploaded
                </span>
              );
            }

            return (
              <div
                key={doc.id}
                onClick={() => {
                  if (doc.hasFile) {
                    setActiveDoc(doc);
                  }
                }}
                className={`p-3 text-left transition-all cursor-pointer ${cardStyle}`}
              >
                <div className="flex items-start justify-between gap-1">
                  <p className="text-xs font-semibold truncate leading-tight text-[#202124]">
                    {doc.name}
                  </p>
                  {badge}
                </div>

                {/* If missing: Client can upload directly */}
                {!doc.hasFile && (
                  <div className="mt-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTargetUploadSlotId(doc.id);
                        clientUploadRef.current?.click();
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#d93025] hover:bg-[#b31412] text-white text-[11px] font-semibold rounded-md shadow-xs transition-colors"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload Missing File</span>
                    </button>
                  </div>
                )}

                {doc.notes && (
                  <p className="text-[10px] text-[#d93025] mt-1 italic truncate">
                    {doc.notes}
                  </p>
                )}
              </div>
            );
          })}
        </aside>

        {/* Main Viewer Area */}
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
    </div>
  );
};
