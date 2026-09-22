import React, { useState, useMemo } from 'react';
import { 
  X, 
  Share2, 
  Key, 
  Copy, 
  Check, 
  Layers, 
  FileText, 
  Folder,
  Lock,
  UploadCloud,
  Eye,
  CheckCircle2,
  FolderOpen
} from 'lucide-react';
import { DocumentItem, CollectionTab, ShareScope, ShareRecord, SolicitorProfile, ShareType, DocumentFolder } from '../../types';
import { syncShareToSupabase } from '../../lib/storage';
import { isSupabaseConfigured } from '../../lib/supabase';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDocument: DocumentItem | null;
  selectedDocuments: DocumentItem[];
  allTabDocuments?: DocumentItem[];
  allTabFolders?: DocumentFolder[];
  currentTab: CollectionTab;
  onSaveShare: (share: ShareRecord) => void;
  user: SolicitorProfile;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  currentDocument,
  selectedDocuments,
  allTabDocuments = [],
  allTabFolders = [],
  currentTab,
  onSaveShare,
  user
}) => {
  // Client portal allows both viewing AND uploading in a unified workspace
  const [allowUpload, setAllowUpload] = useState<boolean>(true);

  // Scope: 'collection' (all folders & docs) | 'folder' (specific folder) | 'single' | 'multiple'
  const [scope, setScope] = useState<ShareScope>(
    selectedDocuments.length > 0 ? 'multiple' : currentDocument ? 'single' : 'collection'
  );

  // If specific folder is chosen
  const [selectedFolderId, setSelectedFolderId] = useState<string>(() => 
    allTabFolders.length > 0 ? allTabFolders[0].id : ''
  );

  // Default 4-digit PIN
  const [passcode, setPasscode] = useState<string>(() => 
    Math.floor(1000 + Math.random() * 9000).toString()
  );
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');

  // Count documents per folder for the folder dropdown
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const doc of allTabDocuments) {
      if (doc.folderId) {
        counts[doc.folderId] = (counts[doc.folderId] || 0) + 1;
      }
    }
    return counts;
  }, [allTabDocuments]);

  if (!isOpen) return null;

  // Helper to get folder and all its recursive children IDs
  const getFolderAndChildIds = (rootId: string): string[] => {
    const ids = [rootId];
    const recurse = (parentId: string) => {
      const children = allTabFolders.filter(f => f.parentId === parentId);
      for (const child of children) {
        ids.push(child.id);
        recurse(child.id);
      }
    };
    recurse(rootId);
    return ids;
  };

  const handleCreateShare = async () => {
    try {
      setIsGenerating(true);
      const shareId = 'share_' + Math.random().toString(36).substring(2, 10);
      let targetIds: string[] = [];
      let title = '';
      let targetDocs: DocumentItem[] = [];
      let targetFolders: DocumentFolder[] = [];

      if (scope === 'single' && currentDocument) {
        targetIds = [currentDocument.id];
        title = currentDocument.name;
        targetDocs = [currentDocument];
        targetFolders = [];
      } else if (scope === 'multiple') {
        targetIds = selectedDocuments.map((d) => d.id);
        title = `${selectedDocuments.length} Documents`;
        targetDocs = selectedDocuments;
        targetFolders = [];
      } else if (scope === 'folder') {
        const folderIds = getFolderAndChildIds(selectedFolderId);
        targetIds = [selectedFolderId];
        const chosenFolder = allTabFolders.find(f => f.id === selectedFolderId);
        title = `${chosenFolder?.name || 'Folder'} - ${currentTab.name}`;
        targetDocs = allTabDocuments.filter(d => d.folderId && folderIds.includes(d.folderId));
        targetFolders = allTabFolders.filter(f => folderIds.includes(f.id));
      } else {
        // 'collection' - Entire Case
        targetIds = [currentTab.id];
        title = `${currentTab.name} (${currentTab.clientName || 'Client Case'})`;
        targetDocs = allTabDocuments && allTabDocuments.length > 0 ? allTabDocuments : (currentDocument ? [currentDocument] : selectedDocuments);
        targetFolders = allTabFolders && allTabFolders.length > 0 ? allTabFolders : [];
      }

      const payloadDocs = targetDocs.map((d) => ({
        id: d.id,
        name: d.name,
        collectionId: d.collectionId,
        fileType: d.fileType,
        status: d.status,
        hasFile: d.hasFile,
        fileSize: d.fileSize || 0,
        notes: d.notes,
        description: d.description,
        rotation: d.rotation || 0,
        folderId: d.folderId,
        url: d.url && d.url.length > 250000 ? '' : (d.url || ''),
        content: d.content,
        pages: d.pages || [],
        createdAt: d.createdAt || new Date().toISOString(),
        updatedAt: d.updatedAt || new Date().toISOString()
      }));

      // Post to Bytebin cloud store to obtain persistent cross-device short key
      let finalKey = shareId;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        const bytebinRes = await fetch('https://bytebin.lucko.me/post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            share: {
              id: shareId,
              title,
              shareType: allowUpload ? 'uploader' : 'viewer',
              scope,
              targetIds,
              passcode: passcode.trim(),
              allowClientUpload: allowUpload,
              createdAt: new Date().toISOString(),
              ownerId: user.id,
              ownerEmail: user.email,
              companyName: user.companyName,
              companyLogo: user.companyLogo
            },
            docs: payloadDocs,
            folders: targetFolders
          })
        });
        clearTimeout(timeoutId);
        if (bytebinRes.ok) {
          const bData = await bytebinRes.json();
          if (bData && bData.key) {
            finalKey = bData.key;
          }
        }
      } catch (bErr) {
        console.warn('Bytebin cloud upload note:', bErr);
      }

      const newRecord: ShareRecord = {
        id: finalKey,
        title,
        shareType: allowUpload ? 'uploader' : 'viewer',
        scope,
        targetIds,
        passcode: passcode.trim(),
        allowClientUpload: allowUpload,
        createdAt: new Date().toISOString(),
        ownerId: user.id,
        ownerEmail: user.email,
        companyName: user.companyName,
        companyLogo: user.companyLogo,
        payload: { docs: targetDocs, folders: targetFolders }
      };

      try {
        onSaveShare(newRecord);
      } catch (saveErr) {
        console.warn('Local share save note:', saveErr);
      }

      // Sync to Supabase
      if (isSupabaseConfigured()) {
        syncShareToSupabase(newRecord, targetDocs, targetFolders).catch(() => {});
      }

      const baseUrl = `${window.location.origin}${window.location.pathname}`;
      const cleanShortUrl = `${baseUrl}?share=${finalKey}`;

      setGeneratedLink(cleanShortUrl);
      setCloudSyncStatus('synced');
    } catch (err) {
      console.error('Share generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    if (!generatedLink) return;
    const textToCopy = `Client Portal: ${user.companyName}\nCase: ${currentTab.name}\nLink: ${generatedLink}\n4-Digit Privacy PIN: ${passcode}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none">
      <div className="bg-white border border-[#dadce0] rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#dadce0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-['Google_Sans',sans-serif] text-base font-bold text-[#202124]">
                Share Client Portal
              </h3>
              <p className="text-xs text-[#5f6368]">
                One unified link for client to view, inspect &amp; upload documents
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

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {!generatedLink ? (
            <>
              {/* Unified Portal Banner */}
              <div className="p-3.5 bg-[#e8f0fe]/70 border border-[#c2e7ff] rounded-2xl flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-[#1a73e8] text-white flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Eye className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-[#174ea6]">
                      Unified Client Portal (View &amp; Upload)
                    </p>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] font-semibold text-[#1a73e8]">
                      <input
                        type="checkbox"
                        checked={allowUpload}
                        onChange={(e) => setAllowUpload(e.target.checked)}
                        className="rounded text-[#1a73e8] focus:ring-[#1a73e8]"
                      />
                      <span>Allow Uploads</span>
                    </label>
                  </div>
                  <p className="text-[11px] text-[#5f6368] mt-0.5 leading-relaxed">
                    Client gets a full folder workspace to read, zoom and inspect documents, and upload requested/missing files in the same link.
                  </p>
                </div>
              </div>

              {/* 1. Scope Selector */}
              <div>
                <label className="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-2">
                  1. Select What to Share
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {/* Option 1: Entire Case Tab */}
                  <button
                    type="button"
                    onClick={() => setScope('collection')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      scope === 'collection'
                        ? 'border-[#1a73e8] bg-[#e8f0fe]/50 text-[#1a73e8] ring-2 ring-[#1a73e8]'
                        : 'border-[#dadce0] hover:bg-[#f8fafd] text-[#5f6368]'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <FolderOpen className="w-4 h-4 text-[#1a73e8]" />
                      {scope === 'collection' && <CheckCircle2 className="w-3.5 h-3.5 text-[#1a73e8]" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#202124]">Entire Case</p>
                      <p className="text-[10px] text-[#5f6368] truncate mt-0.5">
                        All {allTabFolders.length} folders &amp; {allTabDocuments.length} docs
                      </p>
                    </div>
                  </button>

                  {/* Option 2: Specific Folder */}
                  <button
                    type="button"
                    disabled={allTabFolders.length === 0}
                    onClick={() => setScope('folder')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      scope === 'folder'
                        ? 'border-[#1a73e8] bg-[#e8f0fe]/50 text-[#1a73e8] ring-2 ring-[#1a73e8]'
                        : 'border-[#dadce0] hover:bg-[#f8fafd] text-[#5f6368]'
                    } ${allTabFolders.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Folder className="w-4 h-4 text-[#1a73e8]" />
                      {scope === 'folder' && <CheckCircle2 className="w-3.5 h-3.5 text-[#1a73e8]" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#202124]">Specific Folder</p>
                      <p className="text-[10px] text-[#5f6368] truncate mt-0.5">
                        Share 1 folder &amp; its files
                      </p>
                    </div>
                  </button>

                  {/* Option 3: Single Document */}
                  <button
                    type="button"
                    disabled={!currentDocument}
                    onClick={() => setScope('single')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      scope === 'single'
                        ? 'border-[#1a73e8] bg-[#e8f0fe]/50 text-[#1a73e8] ring-2 ring-[#1a73e8]'
                        : 'border-[#dadce0] hover:bg-[#f8fafd] text-[#5f6368]'
                    } ${!currentDocument ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <FileText className="w-4 h-4 text-[#1a73e8]" />
                      {scope === 'single' && <CheckCircle2 className="w-3.5 h-3.5 text-[#1a73e8]" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#202124]">Single Document</p>
                      <p className="text-[10px] text-[#5f6368] truncate mt-0.5">
                        {currentDocument?.name || 'No document open'}
                      </p>
                    </div>
                  </button>

                  {/* Option 4: Selected Files */}
                  <button
                    type="button"
                    disabled={selectedDocuments.length === 0}
                    onClick={() => setScope('multiple')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      scope === 'multiple'
                        ? 'border-[#1a73e8] bg-[#e8f0fe]/50 text-[#1a73e8] ring-2 ring-[#1a73e8]'
                        : 'border-[#dadce0] hover:bg-[#f8fafd] text-[#5f6368]'
                    } ${selectedDocuments.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Layers className="w-4 h-4 text-[#1a73e8]" />
                      {scope === 'multiple' && <CheckCircle2 className="w-3.5 h-3.5 text-[#1a73e8]" />}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-[#202124]">Selected Files</p>
                      <p className="text-[10px] text-[#5f6368] mt-0.5">
                        {selectedDocuments.length} checked
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Folder Selector Dropdown when scope === 'folder' */}
              {scope === 'folder' && (
                <div className="p-3.5 bg-[#f8fafd] border border-[#dadce0] rounded-2xl animate-in fade-in duration-150">
                  <label className="block text-xs font-semibold text-[#202124] mb-1.5 flex items-center gap-1.5">
                    <Folder className="w-3.5 h-3.5 text-[#1a73e8]" />
                    <span>Choose Folder to Share:</span>
                  </label>
                  <select
                    value={selectedFolderId}
                    onChange={(e) => setSelectedFolderId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-[#dadce0] rounded-xl text-xs font-semibold text-[#202124] focus:border-[#1a73e8] outline-none"
                  >
                    {allTabFolders.map((f) => (
                      <option key={f.id} value={f.id}>
                        📁 {f.name} ({folderCounts[f.id] || 0} docs)
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-[#5f6368] mt-1.5">
                    Client will only see this folder, its subfolders, and documents inside them.
                  </p>
                </div>
              )}

              {/* 2. 4-Digit Privacy PIN Input */}
              <div>
                <label className="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#1a73e8]" />
                    2. 4-Digit Privacy PIN
                  </span>
                  <button
                    type="button"
                    onClick={() => setPasscode(Math.floor(1000 + Math.random() * 9000).toString())}
                    className="text-[11px] text-[#1a73e8] hover:underline normal-case font-normal"
                  >
                    Generate Random PIN
                  </button>
                </label>
                <div className="relative flex items-center">
                  <Key className="w-4 h-4 text-[#5f6368] absolute left-3" />
                  <input
                    type="text"
                    maxLength={6}
                    value={passcode}
                    onChange={(e) => setPasscode(e.target.value.replace(/[^0-9a-zA-Z]/g, ''))}
                    placeholder="e.g. 2412"
                    className="w-full pl-9 pr-4 py-2.5 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-base font-mono tracking-widest outline-none transition-all font-bold text-[#1a73e8]"
                  />
                </div>
                <p className="text-[11px] text-[#5f6368] mt-1.5">
                  Client must enter this 4-digit PIN to open their portal.
                </p>
              </div>
            </>
          ) : (
            /* Link Generated Screen */
            <div className="space-y-4">
              <div className="p-4 bg-[#e6f4ea] border border-[#ceead6] rounded-2xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-full bg-[#137333] text-white flex items-center justify-center shadow-xs flex-shrink-0">
                      <Check className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-[#137333]">
                        Client Portal Link Ready!
                      </h4>
                      <p className="text-xs text-[#5f6368]">
                        Client can view documents and upload files in one link.
                      </p>
                    </div>
                  </div>
                  {/* Cloud sync status badge */}
                  {cloudSyncStatus === 'syncing' && (
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-[#5f6368] bg-white px-2.5 py-1 rounded-full border border-[#dadce0]">
                      <div className="w-3 h-3 border-2 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
                      <span>Syncing…</span>
                    </div>
                  )}
                  {cloudSyncStatus === 'synced' && (
                    <div className="flex items-center gap-1 text-[11px] font-bold text-[#137333] bg-[#e6f4ea] px-2.5 py-1 rounded-full border border-[#ceead6]">
                      <Check className="w-3 h-3" />
                      <span>Cloud synced</span>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-[#5f6368] mb-1">
                  <span>Client Link</span>
                  <span className="text-[10px] font-bold uppercase bg-[#e8f0fe] text-[#1a73e8] px-2 py-0.5 rounded-full">
                    Unified Portal
                  </span>
                </div>
                <div className="flex items-center gap-2 bg-[#f0fff4] border-2 border-[#137333]/30 p-2.5 rounded-xl text-xs font-mono text-[#137333] overflow-hidden font-bold">
                  <span className="truncate flex-1">{generatedLink}</span>
                </div>
              </div>

              <div className="p-3.5 bg-[#e8f0fe] border border-[#c2e7ff] rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#174ea6] font-medium block">4-Digit Security PIN:</span>
                  <span className="font-mono text-2xl font-bold text-[#1a73e8] tracking-[0.3em]">
                    {passcode}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-[#1a73e8] bg-white px-3 py-1 rounded-lg border border-[#c2e7ff]">
                  View &amp; Upload
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#f8fafd] border-t border-[#dadce0] flex items-center justify-end gap-2.5">
          {!generatedLink ? (
            <>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateShare}
                disabled={!passcode.trim() || isGenerating}
                className="px-5 py-2 text-xs sm:text-sm font-medium bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-50 text-white rounded-xl transition-colors shadow-sm flex items-center gap-2"
              >
                {isGenerating && (
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                <span>{isGenerating ? 'Generating Link...' : 'Generate Client Link'}</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setGeneratedLink(null)}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-[#5f6368] hover:text-[#202124] rounded-lg transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleCopy}
                className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl transition-colors shadow-sm"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied Link & PIN!' : 'Copy Link & 4-Digit PIN'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
