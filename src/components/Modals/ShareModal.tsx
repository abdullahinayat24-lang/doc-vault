import React, { useState } from 'react';
import { 
  X, 
  Share2, 
  Key, 
  Copy, 
  Check, 
  ShieldAlert, 
  Layers, 
  FileText, 
  Folder,
  Lock,
  UploadCloud
} from 'lucide-react';
import { DocumentItem, CollectionTab, ShareScope, ShareRecord, SolicitorProfile } from '../../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentDocument: DocumentItem | null;
  selectedDocuments: DocumentItem[];
  currentTab: CollectionTab;
  onSaveShare: (share: ShareRecord) => void;
  user: SolicitorProfile;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  currentDocument,
  selectedDocuments,
  currentTab,
  onSaveShare,
  user
}) => {
  const [scope, setScope] = useState<ShareScope>(
    selectedDocuments.length > 0 ? 'multiple' : currentDocument ? 'single' : 'collection'
  );
  // Default to a 4-digit PIN as requested by user
  const [passcode, setPasscode] = useState<string>(() => 
    Math.floor(1000 + Math.random() * 9000).toString()
  );
  const [allowClientUpload, setAllowClientUpload] = useState<boolean>(true);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCreateShare = () => {
    const shareId = 'share_' + Math.random().toString(36).substring(2, 10);
    let targetIds: string[] = [];
    let title = '';

    if (scope === 'single' && currentDocument) {
      targetIds = [currentDocument.id];
      title = currentDocument.name;
    } else if (scope === 'multiple') {
      targetIds = selectedDocuments.map((d) => d.id);
      title = `${selectedDocuments.length} Documents`;
    } else {
      targetIds = [currentTab.id];
      title = `${currentTab.name} (${currentTab.clientName || 'Client Documents'})`;
    }

    const newRecord: ShareRecord = {
      id: shareId,
      title,
      scope,
      targetIds,
      passcode: passcode.trim(),
      allowClientUpload,
      createdAt: new Date().toISOString(),
      ownerId: user.id,
      ownerEmail: user.email,
      companyName: user.companyName,
      companyLogo: user.companyLogo
    };

    onSaveShare(newRecord);

    const shareUrl = `${window.location.origin}${window.location.pathname}?share=${shareId}`;
    setGeneratedLink(shareUrl);
  };

  const handleCopy = () => {
    if (!generatedLink) return;
    const textToCopy = `Client Document Portal:\nLink: ${generatedLink}\n4-Digit Privacy PIN: ${passcode}`;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none">
      <div className="bg-white border border-[#dadce0] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#dadce0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Google_Sans',sans-serif] text-base font-semibold text-[#202124]">
                Share with Client
              </h3>
              <p className="text-xs text-[#5f6368]">
                Protected Viewer-Only Link with 4-Digit Privacy Lock
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
        <div className="p-6 space-y-5">
          {!generatedLink ? (
            <>
              {/* Scope Selector */}
              <div>
                <label className="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-2">
                  Select What to Share
                </label>
                <div className="grid grid-cols-3 gap-2.5">
                  <button
                    type="button"
                    disabled={!currentDocument}
                    onClick={() => setScope('single')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      scope === 'single'
                        ? 'border-[#1a73e8] bg-[#e8f0fe]/50 text-[#1a73e8] ring-1 ring-[#1a73e8]'
                        : 'border-[#dadce0] hover:bg-[#f8fafd] text-[#5f6368]'
                    } ${!currentDocument ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <FileText className="w-5 h-5 mb-2" />
                    <div>
                      <p className="text-xs font-semibold text-[#202124]">This Document</p>
                      <p className="text-[10px] text-[#5f6368] truncate mt-0.5">
                        {currentDocument?.name || 'None open'}
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    disabled={selectedDocuments.length === 0}
                    onClick={() => setScope('multiple')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      scope === 'multiple'
                        ? 'border-[#1a73e8] bg-[#e8f0fe]/50 text-[#1a73e8] ring-1 ring-[#1a73e8]'
                        : 'border-[#dadce0] hover:bg-[#f8fafd] text-[#5f6368]'
                    } ${selectedDocuments.length === 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                  >
                    <Layers className="w-5 h-5 mb-2" />
                    <div>
                      <p className="text-xs font-semibold text-[#202124]">Selected Files</p>
                      <p className="text-[10px] text-[#5f6368] mt-0.5">
                        {selectedDocuments.length} files chosen
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setScope('collection')}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      scope === 'collection'
                        ? 'border-[#1a73e8] bg-[#e8f0fe]/50 text-[#1a73e8] ring-1 ring-[#1a73e8]'
                        : 'border-[#dadce0] hover:bg-[#f8fafd] text-[#5f6368]'
                    }`}
                  >
                    <Folder className="w-5 h-5 mb-2" />
                    <div>
                      <p className="text-xs font-semibold text-[#202124]">Entire Client Tab</p>
                      <p className="text-[10px] text-[#5f6368] truncate mt-0.5">
                        {currentTab.name}
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* 4-Digit Privacy PIN Input */}
              <div>
                <label className="block text-xs font-semibold text-[#202124] uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-[#1a73e8]" />
                    4-Digit Privacy Lock PIN
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
                    placeholder="e.g. 4829"
                    className="w-full pl-9 pr-4 py-2.5 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-base font-mono tracking-widest outline-none transition-all font-bold text-[#1a73e8]"
                  />
                </div>
                <p className="text-[11px] text-[#5f6368] mt-1.5">
                  Client must enter this 4-digit PIN to view their documents.
                </p>
              </div>

              {/* Allow client to upload missing docs */}
              <div className="flex items-center gap-3 p-3 bg-[#f8fafd] border border-[#dadce0] rounded-xl">
                <input
                  type="checkbox"
                  id="allowUpload"
                  checked={allowClientUpload}
                  onChange={(e) => setAllowClientUpload(e.target.checked)}
                  className="w-4 h-4 text-[#1a73e8] rounded cursor-pointer"
                />
                <label htmlFor="allowUpload" className="text-xs text-[#202124] cursor-pointer flex-1">
                  <strong>Allow client to upload missing documents:</strong> Client can upload files into the red "Missing" slots directly from this link.
                </label>
              </div>
            </>
          ) : (
            /* Link Generated Screen */
            <div className="space-y-4">
              <div className="p-4 bg-[#e6f4ea] border border-[#ceead6] rounded-xl text-center">
                <div className="w-10 h-10 rounded-full bg-[#137333] text-white flex items-center justify-center mx-auto mb-2 shadow-xs">
                  <Check className="w-5 h-5" />
                </div>
                <h4 className="font-semibold text-sm text-[#137333]">Client Portal Link Ready!</h4>
                <p className="text-xs text-[#5f6368] mt-0.5">
                  Protected with your 4-digit privacy PIN.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#5f6368] mb-1">
                  Client Share Link
                </label>
                <div className="flex items-center gap-2 bg-[#f8fafd] border border-[#dadce0] p-2 rounded-xl text-xs font-mono text-[#202124] overflow-hidden">
                  <span className="truncate flex-1">{generatedLink}</span>
                </div>
              </div>

              <div className="p-3.5 bg-[#e8f0fe] border border-[#c2e7ff] rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-xs text-[#174ea6] font-medium block">4-Digit Security PIN:</span>
                  <span className="font-mono text-xl font-bold text-[#1a73e8] tracking-widest">
                    {passcode}
                  </span>
                </div>
                <span className="text-[11px] font-semibold text-[#1a73e8] bg-white px-2.5 py-1 rounded-md border border-[#c2e7ff]">
                  Viewer Access
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
                disabled={!passcode.trim()}
                className="px-5 py-2 text-xs sm:text-sm font-medium bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-50 text-white rounded-lg transition-colors shadow-sm"
              >
                Create Client Link
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
                className="flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg transition-colors shadow-sm"
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
