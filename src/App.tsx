import React, { useState, useEffect, useMemo } from 'react';
import { 
  CollectionTab, 
  DocumentItem, 
  ShareRecord, 
  SolicitorProfile, 
  FileType, 
  DocumentStatus 
} from './types';
import { 
  getInitialTabs, 
  saveTabs, 
  getInitialDocuments, 
  saveDocuments, 
  getSolicitorProfile, 
  saveSolicitorProfile, 
  getShares, 
  saveShare,
  exportSingleDocument, 
  exportMultipleDocuments,
  exportAsPdf,
  exportAsJpg,
  detectFileType
} from './lib/storage';
import { Header } from './components/Header';
import { CollectionTabs } from './components/CollectionTabs';
import { DocumentList } from './components/DocumentList';
import { DocumentViewer } from './components/Viewer/DocumentViewer';
import { ShareModal } from './components/Modals/ShareModal';
import { LockScreenModal } from './components/Modals/LockScreenModal';
import { AuthModal } from './components/Modals/AuthModal';
import { SharedViewer } from './components/SharedViewer';

export function App() {
  // Check if viewing a shared link (?share=...)
  const [shareParam, setShareParam] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('share');
  });

  // Main application state
  const [user, setUser] = useState<SolicitorProfile>(() => getSolicitorProfile());
  const [tabs, setTabs] = useState<CollectionTab[]>(() => getInitialTabs());
  const [documents, setDocuments] = useState<DocumentItem[]>(() => getInitialDocuments());
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const initial = getInitialTabs();
    return initial[0]?.id || 'tab-app-2024';
  });
  const [activeDocId, setActiveDocId] = useState<string | null>(() => {
    const initialDocs = getInitialDocuments();
    return initialDocs[0]?.id || null;
  });

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<'date' | 'name'>('date');

  // Modal states
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);

  // Sync state to storage
  useEffect(() => {
    saveTabs(tabs);
  }, [tabs]);

  useEffect(() => {
    saveDocuments(documents);
  }, [documents]);

  useEffect(() => {
    saveSolicitorProfile(user);
  }, [user]);

  // Handle URL change / back button
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setShareParam(params.get('share'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sorted tabs
  const sortedTabs = useMemo(() => {
    return [...tabs].sort((a, b) => {
      if (sortOption === 'name') {
        return a.name.localeCompare(b.name);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [tabs, sortOption]);

  // Current active collection tab
  const activeTab = useMemo(() => {
    return tabs.find((t) => t.id === activeTabId) || tabs[0] || {
      id: 'default',
      name: 'All Documents',
      createdAt: new Date().toISOString()
    };
  }, [tabs, activeTabId]);

  // Documents under the active tab, filtered by search query
  const tabDocuments = useMemo(() => {
    return documents
      .filter((d) => d.collectionId === activeTabId)
      .filter((d) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return d.name.toLowerCase().includes(q) || d.fileType.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sortOption === 'name') {
          return a.name.localeCompare(b.name);
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [documents, activeTabId, searchQuery, sortOption]);

  // Currently active document
  const activeDoc = useMemo(() => {
    if (!activeDocId) return tabDocuments.find(d => d.hasFile) || tabDocuments[0] || null;
    return documents.find((d) => d.id === activeDocId) || null;
  }, [documents, activeDocId, tabDocuments]);

  // Selected document objects
  const selectedDocuments = useMemo(() => {
    return documents.filter((d) => selectedDocIds.includes(d.id));
  }, [documents, selectedDocIds]);

  // Document status counts per tab
  const documentCounts = useMemo(() => {
    const counts: Record<string, { total: number; missing: number; approved: number }> = {};
    tabs.forEach((tab) => {
      const tabDocs = documents.filter((d) => d.collectionId === tab.id);
      const missing = tabDocs.filter((d) => d.status === 'missing' || d.status === 'disapproved').length;
      const approved = tabDocs.filter((d) => d.status === 'approved').length;
      counts[tab.id] = {
        total: tabDocs.length,
        missing,
        approved
      };
    });
    return counts;
  }, [tabs, documents]);

  // Handlers for collections
  const handleCreateTab = (name: string, clientName?: string) => {
    const newTab: CollectionTab = {
      id: 'tab_' + Math.random().toString(36).substring(2, 9),
      name,
      clientName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setSelectedDocIds([]);
  };

  const handleRenameTab = (tabId: string, newName: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, name: newName, updatedAt: new Date().toISOString() } : t))
    );
  };

  const handleDeleteTab = (tabId: string) => {
    if (tabs.length <= 1) return;
    if (confirm('Are you sure you want to delete this tab and all its documents?')) {
      setTabs((prev) => prev.filter((t) => t.id !== tabId));
      setDocuments((prev) => prev.filter((d) => d.collectionId !== tabId));
      if (activeTabId === tabId) {
        const remaining = tabs.filter((t) => t.id !== tabId);
        setActiveTabId(remaining[0].id);
      }
    }
  };

  // Upload multiple new files
  const handleUploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const newItems: DocumentItem[] = [];

    for (const file of fileArray) {
      const fileType = detectFileType(file.name, file.type);
      const url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });

      newItems.push({
        id: 'doc_' + Math.random().toString(36).substring(2, 9),
        name: file.name,
        collectionId: activeTabId,
        fileType,
        fileSize: file.size,
        url,
        hasFile: true,
        status: 'pending', // White / Normal by default
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    setDocuments((prev) => [...newItems, ...prev]);
    if (newItems.length > 0) {
      setActiveDocId(newItems[0].id);
    }
  };

  // Upload file into an existing missing document requirement slot
  const handleUploadToFileSlot = async (docId: string, file: File) => {
    const fileType = detectFileType(file.name, file.type);
    const url = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === docId) {
          return {
            ...doc,
            name: doc.name.endsWith(`.${fileType}`) ? doc.name : `${doc.name} (${file.name})`,
            fileType,
            fileSize: file.size,
            url,
            hasFile: true,
            status: 'pending', // Changes from Missing (Red) to Uploaded (Normal White)
            updatedAt: new Date().toISOString()
          };
        }
        return doc;
      })
    );
    setActiveDocId(docId);
  };

  // Create document requirement slot (Marked RED until uploaded)
  const handleCreateDocumentSlot = (title: string, fileType: FileType) => {
    const formattedName = title.includes('.') ? title : `${title}.${fileType}`;
    const newSlot: DocumentItem = {
      id: 'doc_req_' + Math.random().toString(36).substring(2, 9),
      name: formattedName,
      collectionId: activeTabId,
      fileType,
      fileSize: 0,
      url: '',
      hasFile: false,
      status: 'missing', // RED
      notes: 'Required document slot created by solicitor. Action required.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setDocuments((prev) => [newSlot, ...prev]);
  };

  // Update status: Approved (Green) or Disapproved (Red) or Pending (White)
  const handleUpdateDocumentStatus = (docId: string, status: DocumentStatus, notes?: string) => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id === docId) {
          return {
            ...d,
            status,
            notes: notes !== undefined ? notes : d.notes,
            updatedAt: new Date().toISOString()
          };
        }
        return d;
      })
    );
  };

  // Delete document
  const handleDeleteDocument = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this document item?')) {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      setSelectedDocIds((prev) => prev.filter((dId) => dId !== id));
      if (activeDocId === id) {
        setActiveDocId(null);
      }
    }
  };

  // Select all toggle
  const handleToggleSelectAll = () => {
    if (selectedDocIds.length === tabDocuments.length) {
      setSelectedDocIds([]);
    } else {
      setSelectedDocIds(tabDocuments.map((d) => d.id));
    }
  };

  const handleToggleSelectDoc = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedDocIds((prev) =>
      prev.includes(id) ? prev.filter((dId) => dId !== id) : [...prev, id]
    );
  };

  // Exports
  const handleExportSelected = () => {
    exportMultipleDocuments(selectedDocuments, `${activeTab.name}_Selected.zip`);
  };

  const handleExportCurrent = () => {
    if (activeDoc) {
      exportSingleDocument(activeDoc);
    }
  };

  const handleExportCurrentAsPdf = () => {
    if (activeDoc) {
      exportAsPdf(activeDoc);
    }
  };

  const handleExportCurrentAsJpg = () => {
    if (activeDoc) {
      exportAsJpg(activeDoc);
    }
  };

  const handleExportAllInTab = () => {
    exportMultipleDocuments(tabDocuments, `${activeTab.name}_Complete.zip`);
  };

  // If a shared link is opened (?share=...)
  if (shareParam) {
    const shares = getShares();
    const shareRecord = shares.find((s) => s.id === shareParam) || null;

    return (
      <SharedViewer
        shareRecord={shareRecord}
        documents={documents}
        tabs={tabs}
        onUploadClientFile={handleUploadToFileSlot}
        onUpdateStatus={handleUpdateDocumentStatus}
        onBackToApp={() => {
          window.history.pushState({}, '', window.location.pathname);
          setShareParam(null);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col selection:bg-[#c2e7ff] selection:text-[#001d35]">
      {/* Google-styled Top Header */}
      <Header
        user={user}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLockSession={() => setIsLocked(true)}
        onOpenShare={() => setIsShareOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={() => {
          if (confirm('Sign out and lock workspace?')) {
            setIsLocked(true);
          }
        }}
        selectedCount={selectedDocIds.length}
        activeDocument={activeDoc}
        onExportSelected={handleExportSelected}
        onExportCurrent={handleExportCurrent}
        onExportCurrentAsPdf={handleExportCurrentAsPdf}
        onExportCurrentAsJpg={handleExportCurrentAsJpg}
        onExportAll={handleExportAllInTab}
      />

      {/* Collection Tabs Bar */}
      <CollectionTabs
        tabs={sortedTabs}
        activeTabId={activeTabId}
        onSelectTab={(id) => {
          setActiveTabId(id);
          setSelectedDocIds([]);
        }}
        onCreateTab={handleCreateTab}
        onRenameTab={handleRenameTab}
        onDeleteTab={handleDeleteTab}
        onShareTab={(tabId) => {
          setActiveTabId(tabId);
          setIsShareOpen(true);
        }}
        documentCounts={documentCounts}
        sortOption={sortOption}
        onToggleSort={() => setSortOption((prev) => (prev === 'date' ? 'name' : 'date'))}
      />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Documents List Sidebar */}
        <DocumentList
          documents={tabDocuments}
          activeDocumentId={activeDocId}
          onSelectDocument={(doc) => setActiveDocId(doc.id)}
          selectedDocIds={selectedDocIds}
          onToggleSelectDoc={handleToggleSelectDoc}
          onToggleSelectAll={handleToggleSelectAll}
          onUploadFiles={handleUploadFiles}
          onUploadToFileSlot={handleUploadToFileSlot}
          onCreateDocumentSlot={handleCreateDocumentSlot}
          onUpdateDocumentStatus={handleUpdateDocumentStatus}
          onDeleteDocument={handleDeleteDocument}
          onShareDocument={(doc, e) => {
            e.stopPropagation();
            setActiveDocId(doc.id);
            setIsShareOpen(true);
          }}
          onExportDocument={(doc, e) => {
            e.stopPropagation();
            exportSingleDocument(doc);
          }}
          tabTitle={activeTab.name}
        />

        {/* Master Document Viewer */}
        <DocumentViewer
          document={activeDoc}
          onExport={exportSingleDocument}
          onExportAsPdf={exportAsPdf}
          onExportAsJpg={exportAsJpg}
          onShare={() => setIsShareOpen(true)}
          onUpdateStatus={handleUpdateDocumentStatus}
          isReadOnly={false}
        />
      </div>

      {/* Modals */}
      <ShareModal
        isOpen={isShareOpen}
        onClose={() => setIsShareOpen(false)}
        currentDocument={activeDoc}
        selectedDocuments={selectedDocuments}
        currentTab={activeTab}
        onSaveShare={(share) => saveShare(share)}
        user={user}
      />

      <LockScreenModal
        isLocked={isLocked}
        onUnlock={() => setIsLocked(false)}
        userEmail={user.email}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        currentUser={user}
        onSaveUser={setUser}
      />
    </div>
  );
}

export default App;
