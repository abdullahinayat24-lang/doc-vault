import React, { useState } from 'react';
import { 
  Home, 
  Briefcase, 
  Folder, 
  Plus, 
  MoreVertical, 
  Trash2, 
  Edit2, 
  Share2,
  Check,
  X,
  ArrowUpDown,
  Calendar,
  AlertTriangle
} from 'lucide-react';
import { CollectionTab } from '../types';

interface CollectionTabsProps {
  tabs: CollectionTab[];
  activeTabId: string;
  onSelectTab: (tabId: string) => void;
  onCreateTab: (name: string, clientName?: string) => void;
  onRenameTab: (tabId: string, newName: string) => void;
  onDeleteTab: (tabId: string) => void;
  onShareTab: (tabId: string) => void;
  documentCounts: Record<string, { total: number; missing: number; approved: number }>;
  sortOption: 'name' | 'date' | 'manual';
  onToggleSort: () => void;
  themeHex?: string;
  themeBg?: string;
}

export const CollectionTabs: React.FC<CollectionTabsProps> = ({
  tabs,
  activeTabId,
  onSelectTab,
  onCreateTab,
  onRenameTab,
  onDeleteTab,
  onShareTab,
  documentCounts,
  sortOption,
  onToggleSort,
  themeHex,
  themeBg
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [newTabName, setNewTabName] = useState('');
  const [newClientName, setNewClientName] = useState('');
  const [editingTabId, setEditingTabId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [activeMenuTabId, setActiveMenuTabId] = useState<string | null>(null);

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newTabName.trim()) {
      onCreateTab(newTabName.trim(), newClientName.trim() || undefined);
      setNewTabName('');
      setNewClientName('');
      setIsCreating(false);
    }
  };

  const handleRenameSubmit = (tabId: string) => {
    if (editingName.trim()) {
      onRenameTab(tabId, editingName.trim());
      setEditingTabId(null);
    }
  };

  const getTabIcon = (tab: CollectionTab) => {
    if (tab.name.toLowerCase().includes('home')) {
      return <Home className="w-4 h-4" />;
    }
    if (tab.name.toLowerCase().includes('work') || tab.name.toLowerCase().includes('app')) {
      return <Briefcase className="w-4 h-4" />;
    }
    return <Folder className="w-4 h-4" />;
  };

  return (
    <div className="bg-white border-b border-[#dadce0] px-4 sm:px-6 flex items-center justify-between overflow-x-auto no-scrollbar select-none z-20">
      <div className="flex items-center space-x-1 sm:space-x-2 py-1 min-w-max">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const stats = documentCounts[tab.id] || { total: 0, missing: 0, approved: 0 };

          if (editingTabId === tab.id) {
            return (
              <div key={tab.id} className="flex items-center gap-1 bg-[#f1f3f4] px-3 py-1.5 rounded-t-lg border-b-2 border-[#1a73e8]">
                <input
                  type="text"
                  value={editingName}
                  onChange={(e) => setEditingName(e.target.value)}
                  className="text-xs sm:text-sm font-medium bg-white px-2 py-1 rounded border border-[#dadce0] outline-none"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameSubmit(tab.id);
                    if (e.key === 'Escape') setEditingTabId(null);
                  }}
                />
                <button
                  onClick={() => handleRenameSubmit(tab.id)}
                  className="p-1 hover:bg-white rounded text-[#137333]"
                  title="Save"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setEditingTabId(null)}
                  className="p-1 hover:bg-white rounded text-[#5f6368]"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          }

          return (
            <div
              key={tab.id}
              className={`group relative flex items-center gap-2 px-3 sm:px-4 py-2.5 rounded-t-lg text-xs sm:text-sm transition-all cursor-pointer border-b-2 ${
                isActive
                  ? 'border-[#1a73e8] text-[#1a73e8] font-medium bg-[#f8fafd]'
                  : 'border-transparent text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4]'
              }`}
              style={isActive && themeHex ? { borderBottomColor: themeHex, color: themeHex, backgroundColor: themeBg || '#f8fafd' } : undefined}
              onClick={() => onSelectTab(tab.id)}
            >
              <span 
                className={isActive ? 'text-[#1a73e8]' : 'text-[#5f6368] group-hover:text-[#202124]'}
                style={isActive && themeHex ? { color: themeHex } : undefined}
              >
                {getTabIcon(tab)}
              </span>

              <div className="text-left max-w-[160px] sm:max-w-[200px]">
                <span className="truncate block leading-tight font-medium">
                  {tab.name}
                </span>
                {tab.clientName && (
                  <span className="text-[10px] text-[#5f6368] font-normal truncate block">
                    {tab.clientName}
                  </span>
                )}
              </div>

              {/* Status badges */}
              <div className="flex items-center gap-1">
                {stats.missing > 0 && (
                  <span
                    className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-[#fce8e6] text-[#d93025]"
                    title={`${stats.missing} Missing or Disapproved documents`}
                  >
                    {stats.missing}
                  </span>
                )}
                {stats.approved > 0 && (
                  <span
                    className="text-[10px] px-1.5 py-0.2 rounded-full font-bold bg-[#e6f4ea] text-[#137333]"
                    title={`${stats.approved} Approved documents`}
                  >
                    {stats.approved}
                  </span>
                )}
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-medium ${
                    isActive ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'bg-[#f1f3f4] text-[#5f6368]'
                  }`}
                  style={isActive && themeHex ? { color: themeHex, backgroundColor: themeBg ? `${themeBg}` : '#e8f0fe' } : undefined}
                  title="Total documents"
                >
                  {stats.total}
                </span>
              </div>

              {/* Tab menu button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveMenuTabId(activeMenuTabId === tab.id ? null : tab.id);
                }}
                className={`p-1 rounded hover:bg-black/10 transition-opacity ${
                  isActive ? 'opacity-70 hover:opacity-100' : 'opacity-0 group-hover:opacity-70 hover:opacity-100'
                }`}
                title="Tab options"
              >
                <MoreVertical className="w-3.5 h-3.5" />
              </button>

              {/* Tab Menu Dropdown */}
              {activeMenuTabId === tab.id && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveMenuTabId(null);
                    }}
                  />
                  <div
                    className="absolute right-0 top-full mt-1 w-48 bg-white border border-[#dadce0] rounded-xl shadow-lg py-1.5 z-50 text-xs animate-in fade-in zoom-in-95 duration-100"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        setActiveMenuTabId(null);
                        onShareTab(tab.id);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-[#f8fafd] text-[#202124] flex items-center gap-2"
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#1a73e8]" />
                      Share Tab (4-Digit PIN)
                    </button>
                    <button
                      onClick={() => {
                        setActiveMenuTabId(null);
                        setEditingTabId(tab.id);
                        setEditingName(tab.name);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-[#f8fafd] text-[#202124] flex items-center gap-2"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-[#5f6368]" />
                      Rename Tab
                    </button>
                    {tabs.length > 1 && (
                      <button
                        onClick={() => {
                          setActiveMenuTabId(null);
                          onDeleteTab(tab.id);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-[#fce8e6] text-[#d93025] flex items-center gap-2 border-t border-[#f1f3f4]"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-[#d93025]" />
                        Delete Tab
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          );
        })}

        {/* Create Tab Button or inline form */}
        {isCreating ? (
          <form onSubmit={handleCreateSubmit} className="flex items-center gap-1.5 bg-[#f1f3f4] p-1.5 rounded-t-lg">
            <input
              type="text"
              placeholder="e.g. Application 2026..."
              value={newTabName}
              onChange={(e) => setNewTabName(e.target.value)}
              className="text-xs bg-white px-2 py-1 rounded border border-[#dadce0] outline-none w-36"
              autoFocus
            />
            <input
              type="text"
              placeholder="Client Name (opt)..."
              value={newClientName}
              onChange={(e) => setNewClientName(e.target.value)}
              className="text-xs bg-white px-2 py-1 rounded border border-[#dadce0] outline-none w-28 hidden sm:block"
            />
            <button
              type="submit"
              className="p-1 hover:bg-white rounded text-[#1a73e8]"
              title="Add Collection"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="p-1 hover:bg-white rounded text-[#5f6368]"
              title="Cancel"
            >
              <X className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <button
            onClick={() => setIsCreating(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#5f6368] hover:text-[#1a73e8] hover:bg-[#f1f3f4] rounded-lg transition-colors border border-dashed border-[#dadce0]"
            title="Create new client tab or collection"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Client Tab</span>
          </button>
        )}
      </div>

      {/* Tab Sort Button */}
      <div className="flex items-center gap-2 pl-3 border-l border-[#dadce0] flex-shrink-0">
        <button
          onClick={onToggleSort}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-lg transition-colors border border-[#dadce0]"
          title={`Currently sorted by: ${sortOption === 'manual' ? 'Custom Reorder' : sortOption === 'date' ? 'Date' : 'Name'}. Click to toggle.`}
        >
          <ArrowUpDown className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Sort: {sortOption === 'manual' ? 'Custom' : sortOption === 'date' ? 'Date' : 'Name'}</span>
        </button>
      </div>
    </div>
  );
};
