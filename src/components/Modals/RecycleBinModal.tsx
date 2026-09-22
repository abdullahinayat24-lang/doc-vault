import React, { useState } from 'react';
import { 
  Trash2, 
  RotateCcw, 
  X, 
  AlertTriangle, 
  FileText, 
  Calendar, 
  HardDrive, 
  Check, 
  Search,
  ShieldAlert
} from 'lucide-react';
import { DocumentItem, ClientRecord, CollectionTab } from '../../types';

interface RecycleBinModalProps {
  isOpen: boolean;
  onClose: () => void;
  deletedDocuments: DocumentItem[];
  clients: ClientRecord[];
  tabs: CollectionTab[];
  onRestoreDocument: (docId: string) => void;
  onPermanentlyDeleteDocument: (docId: string) => void;
  onEmptyRecycleBin: () => void;
}

export const RecycleBinModal: React.FC<RecycleBinModalProps> = ({
  isOpen,
  onClose,
  deletedDocuments,
  clients,
  tabs,
  onRestoreDocument,
  onPermanentlyDeleteDocument,
  onEmptyRecycleBin
}) => {
  const [search, setSearch] = useState<string>('');
  const [confirmEmpty, setConfirmEmpty] = useState<boolean>(false);

  if (!isOpen) return null;

  const getClientName = (clientId?: string) => {
    if (!clientId) return 'General Client';
    return clients.find((c) => c.id === clientId)?.name || 'Client';
  };

  const getTabName = (tabId?: string) => {
    if (!tabId) return 'Main Case File';
    return tabs.find((t) => t.id === tabId)?.name || 'General';
  };

  const filteredDocs = deletedDocuments.filter((d) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      d.name.toLowerCase().includes(q) ||
      d.fileType.toLowerCase().includes(q) ||
      getClientName(d.clientId).toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/50 backdrop-blur-xs select-none">
      <div className="bg-white border border-[#dadce0] rounded-3xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#dadce0] flex items-center justify-between bg-gradient-to-r from-[#fef7e0]/60 to-white flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#fef7e0] text-[#b06000] border border-[#f9ab00]/30 flex items-center justify-center shadow-xs">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-['Google_Sans',sans-serif] text-base font-bold text-[#202124]">
                  Legal Document Recycle Bin
                </h2>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#fef7e0] text-[#b06000] border border-[#f9ab00]/40">
                  {deletedDocuments.length} items
                </span>
              </div>
              <p className="text-xs text-[#5f6368] mt-0.5">
                Soft-deleted files are held safely here before permanent purging.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Search */}
        <div className="px-6 py-2.5 bg-[#f8fafd] border-b border-[#dadce0] flex items-center justify-between gap-3 flex-shrink-0 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-[#5f6368] absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search deleted files or clients..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-[#dadce0] focus:border-[#1a73e8] rounded-xl text-xs outline-none"
            />
          </div>

          {deletedDocuments.length > 0 && (
            <div className="flex items-center gap-2">
              {confirmEmpty ? (
                <div className="flex items-center gap-1.5 bg-[#fce8e6] px-3 py-1 rounded-xl border border-[#d93025]/30">
                  <span className="text-[11px] font-bold text-[#c5221f]">Permanently delete all?</span>
                  <button
                    onClick={() => {
                      onEmptyRecycleBin();
                      setConfirmEmpty(false);
                    }}
                    className="px-2 py-0.5 bg-[#d93025] hover:bg-[#b3261e] text-white rounded-lg text-[10px] font-bold transition-colors"
                  >
                    Confirm Empty
                  </button>
                  <button
                    onClick={() => setConfirmEmpty(false)}
                    className="px-1.5 py-0.5 text-xs text-[#5f6368] hover:text-[#202124]"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmEmpty(true)}
                  className="px-3 py-1.5 text-xs font-semibold text-[#c5221f] hover:bg-[#fce8e6] rounded-xl transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Empty Recycle Bin</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* List of Soft-deleted items */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-2.5">
          {filteredDocs.length === 0 ? (
            <div className="py-16 text-center text-[#5f6368]">
              <HardDrive className="w-12 h-12 text-[#dadce0] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#202124]">Recycle Bin is empty</p>
              <p className="text-xs text-[#5f6368] mt-1">
                No soft-deleted documents found. Any document deleted from a case will appear here.
              </p>
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const clientName = getClientName(doc.clientId);
              const tabName = getTabName(doc.collectionId);
              const delDate = doc.deletedAt 
                ? new Date(doc.deletedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                : 'Recently';

              return (
                <div
                  key={doc.id}
                  className="p-3 bg-white border border-[#dadce0] hover:border-[#b06000]/50 rounded-2xl flex items-center justify-between gap-3 shadow-2xs transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 rounded-xl bg-[#fef7e0] text-[#b06000] flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-[#202124] truncate" title={doc.name}>
                        {doc.name}
                      </h4>
                      <div className="flex items-center gap-2 text-[11px] text-[#5f6368] mt-0.5 flex-wrap">
                        <span className="font-semibold text-[#1a73e8]">{clientName}</span>
                        <span>•</span>
                        <span>{tabName}</span>
                        <span>•</span>
                        <span className="text-[#80868b]">{doc.fileSize ? `${(doc.fileSize / 1024).toFixed(1)} KB` : 'Document'}</span>
                        <span>•</span>
                        <span className="text-[#b06000] font-medium">Deleted: {delDate}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => onRestoreDocument(doc.id)}
                      className="px-3 py-1.5 bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shadow-2xs"
                      title="Restore document back to original case file and folder"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>

                    <button
                      onClick={() => {
                        if (confirm(`Permanently destroy "${doc.name}"? This cannot be undone.`)) {
                          onPermanentlyDeleteDocument(doc.id);
                        }
                      }}
                      className="p-1.5 text-[#5f6368] hover:text-[#d93025] hover:bg-[#fce8e6] rounded-xl transition-colors"
                      title="Permanently erase file"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-[#f8fafd] border-t border-[#dadce0] flex items-center justify-between text-xs text-[#5f6368] flex-shrink-0">
          <div className="flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-[#b06000]" />
            <span>Restoring a document puts it back into its exact client tab and folder.</span>
          </div>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-[#f1f3f4] text-[#202124] border border-[#dadce0] rounded-xl font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
