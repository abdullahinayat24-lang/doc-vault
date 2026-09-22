import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  X, 
  UserPlus, 
  FileText, 
  Download, 
  ShieldCheck, 
  Trash2, 
  Lock, 
  Users, 
  Briefcase, 
  Sparkles, 
  ArrowRight, 
  Check, 
  Clock,
  Printer,
  ChevronRight,
  Command
} from 'lucide-react';
import { ClientRecord, DocumentItem, CollectionTab, SolicitorProfile } from '../types';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  clients: ClientRecord[];
  documents: DocumentItem[];
  tabs: CollectionTab[];
  solicitor: SolicitorProfile;
  onSelectClient: (client: ClientRecord) => void;
  onOpenNewClient: () => void;
  onOpenLetterhead: () => void;
  onOpenRecycleBin: () => void;
  onOpenAuditLog: () => void;
  onDownloadBackup: () => void;
  onLockSession: () => void;
  onOpenPricing?: () => void;
}

interface PaletteAction {
  id: string;
  category: 'action' | 'client' | 'document';
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  badge?: string;
  run: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  isOpen,
  onClose,
  clients,
  documents,
  tabs,
  solicitor,
  onSelectClient,
  onOpenNewClient,
  onOpenLetterhead,
  onOpenRecycleBin,
  onOpenAuditLog,
  onDownloadBackup,
  onLockSession,
  onOpenPricing
}) => {
  const [query, setQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Build searchable items
  const items: PaletteAction[] = [];

  // 1. Quick Actions
  const baseActions: PaletteAction[] = [
    {
      id: 'act-new-client',
      category: 'action',
      title: 'Add New Client & Case Matter',
      subtitle: 'Create a new client file with contact details and fee structure',
      icon: <UserPlus className="w-4 h-4 text-[#1a73e8]" />,
      badge: 'Shortcut',
      run: () => {
        onClose();
        onOpenNewClient();
      }
    },
    {
      id: 'act-letterhead',
      category: 'action',
      title: 'Official Letterhead Studio',
      subtitle: 'Draft formal legal representation letters, checklists and notices',
      icon: <FileText className="w-4 h-4 text-[#1a73e8]" />,
      badge: 'Studio',
      run: () => {
        onClose();
        onOpenLetterhead();
      }
    },
    {
      id: 'act-backup',
      category: 'action',
      title: 'Export Compliance Backup (.JSON)',
      subtitle: 'Download complete offline archive of all cases, docs, notes & audit logs',
      icon: <Download className="w-4 h-4 text-[#137333]" />,
      badge: 'Backup',
      run: () => {
        onClose();
        onDownloadBackup();
      }
    },
    {
      id: 'act-audit',
      category: 'action',
      title: 'Compliance & Security Audit Trail',
      subtitle: 'Review immutable timestamped log of document operations and logins',
      icon: <ShieldCheck className="w-4 h-4 text-[#7627bb]" />,
      badge: 'SRA Audit',
      run: () => {
        onClose();
        onOpenAuditLog();
      }
    },
    {
      id: 'act-recycle',
      category: 'action',
      title: 'Legal Document Recycle Bin',
      subtitle: 'View and restore soft-deleted files or permanently purge them',
      icon: <Trash2 className="w-4 h-4 text-[#b06000]" />,
      badge: 'Trash',
      run: () => {
        onClose();
        onOpenRecycleBin();
      }
    },
    {
      id: 'act-lock',
      category: 'action',
      title: 'Lock Solicitor Workspace',
      subtitle: 'Secure screen immediately behind 4-digit privacy PIN',
      icon: <Lock className="w-4 h-4 text-[#5f6368]" />,
      badge: 'PIN Lock',
      run: () => {
        onClose();
        onLockSession();
      }
    }
  ];

  if (onOpenPricing) {
    baseActions.push({
      id: 'act-pricing',
      category: 'action',
      title: 'Solicitor Plans & Subscription Pricing',
      subtitle: 'Upgrade practice capacity or manage active subscription tier',
      icon: <Sparkles className="w-4 h-4 text-[#1a73e8]" />,
      badge: 'Plans',
      run: () => {
        onClose();
        onOpenPricing();
      }
    });
  }

  // 2. Client files
  const clientActions: PaletteAction[] = clients.map((c) => ({
    id: `client-${c.id}`,
    category: 'client',
    title: c.name,
    subtitle: `${c.cameFor || 'Case Matter'} • Tel: ${c.phone || 'N/A'} • Last visit: ${new Date(c.lastVisitDate).toLocaleDateString()}`,
    icon: <Briefcase className="w-4 h-4 text-[#1a73e8]" />,
    badge: c.priority.toUpperCase(),
    run: () => {
      onClose();
      onSelectClient(c);
    }
  }));

  // 3. Document items
  const docActions: PaletteAction[] = documents
    .filter((d) => !d.isDeleted && d.hasFile)
    .slice(0, 30)
    .map((d) => {
      const client = clients.find((c) => c.id === d.clientId);
      return {
        id: `doc-${d.id}`,
        category: 'document',
        title: d.name,
        subtitle: `Client: ${client?.name || 'General'} • Type: ${d.fileType.toUpperCase()} • Size: ${d.fileSize ? `${(d.fileSize / 1024).toFixed(1)} KB` : ''}`,
        icon: <FileText className="w-4 h-4 text-[#5f6368]" />,
        badge: d.status.toUpperCase(),
        run: () => {
          onClose();
          if (client) {
            onSelectClient(client);
          }
        }
      };
    });

  // Filter based on query
  const q = query.toLowerCase().trim();
  const filtered = [...baseActions, ...clientActions, ...docActions].filter((item) => {
    if (!q) return true;
    return (
      item.title.toLowerCase().includes(q) ||
      (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
      (item.badge && item.badge.toLowerCase().includes(q))
    );
  });

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1 < filtered.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filtered.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        filtered[selectedIndex].run();
      }
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-3 sm:p-4 bg-black/50 backdrop-blur-xs select-none"
      onClick={onClose}
    >
      <div 
        className="bg-white border border-[#dadce0] rounded-3xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="px-5 py-3.5 border-b border-[#dadce0] flex items-center gap-3 bg-white flex-shrink-0">
          <Search className="w-5 h-5 text-[#1a73e8] flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command, client name, case, or document title..."
            className="flex-1 bg-transparent text-sm sm:text-base font-medium text-[#202124] outline-none placeholder-[#5f6368]"
          />
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-[10px] font-mono font-semibold bg-[#f1f3f4] text-[#5f6368] px-2 py-0.5 rounded border border-[#dadce0]">
              ESC
            </span>
            <button
              onClick={onClose}
              className="p-1 text-[#5f6368] hover:text-[#202124] rounded-lg hover:bg-[#f1f3f4]"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Results List */}
        <div className="max-h-[60vh] overflow-y-auto p-2 sm:p-3 divide-y divide-[#f1f3f4]">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-[#5f6368]">
              <Search className="w-8 h-8 text-[#dadce0] mx-auto mb-2" />
              <p className="text-xs font-semibold text-[#202124]">No matching results found</p>
              <p className="text-[11px] text-[#5f6368] mt-0.5">Try searching for a client name, visa category, or action.</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((item, index) => {
                const isSelected = index === selectedIndex;
                return (
                  <div
                    key={item.id}
                    onClick={() => item.run()}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`px-3 py-2.5 rounded-2xl flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'hover:bg-[#f8fafd] text-[#202124]'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isSelected ? 'bg-white shadow-xs text-[#1a73e8]' : 'bg-[#f1f3f4] text-[#5f6368]'
                      }`}>
                        {item.icon}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold truncate ${isSelected ? 'text-[#1a73e8]' : 'text-[#202124]'}`}>
                            {item.title}
                          </span>
                          {item.badge && (
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-white/80 border border-[#dadce0] text-[#5f6368] flex-shrink-0">
                              {item.badge}
                            </span>
                          )}
                        </div>
                        {item.subtitle && (
                          <p className="text-[11px] text-[#5f6368] truncate mt-0.5">
                            {item.subtitle}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0">
                      {isSelected && (
                        <span className="text-[10px] font-bold text-[#1a73e8] flex items-center gap-0.5">
                          <span>Open</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-5 py-2.5 bg-[#f8fafd] border-t border-[#dadce0] flex items-center justify-between text-[11px] text-[#5f6368] flex-shrink-0">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="font-mono bg-white border border-[#dadce0] px-1 rounded shadow-2xs">↑</span>
              <span className="font-mono bg-white border border-[#dadce0] px-1 rounded shadow-2xs">↓</span>
              <span>to navigate</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="font-mono bg-white border border-[#dadce0] px-1.5 rounded shadow-2xs">↵</span>
              <span>to select</span>
            </span>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-[#80868b]">
            <Command className="w-3 h-3" />
            <span>DocVault Quick Navigator</span>
          </div>
        </div>
      </div>
    </div>
  );
};
