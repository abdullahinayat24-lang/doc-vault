import React, { useState, useEffect, useMemo } from 'react';
import { 
  CollectionTab, 
  DocumentItem, 
  ShareRecord, 
  SolicitorProfile, 
  FileType, 
  DocumentStatus,
  ClientRecord 
} from './types';
import { 
  getClients,
  saveClients,
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
import { CompanyDashboard } from './components/CompanyDashboard';
import { NewClientModal } from './components/Modals/NewClientModal';
import { UploadDocumentsModal } from './components/Modals/UploadDocumentsModal';
import { AuthScreen } from './components/AuthScreen';
import { ArrowLeft } from 'lucide-react';

export function App() {
  // Check if viewing a shared link (?share=...)
  const [shareParam, setShareParam] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('share');
  });

  // Main state - null profile by default prompts Create Account / Sign In
  const [user, setUser] = useState<SolicitorProfile | null>(() => getSolicitorProfile());
  const [clients, setClients] = useState<ClientRecord[]>(() => getClients());
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [tabs, setTabs] = useState<CollectionTab[]>(() => getInitialTabs());
  const [documents, setDocuments] = useState<DocumentItem[]>(() => getInitialDocuments());
  
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  // Mobile navigation pane: toggle between 'list' and 'viewer' on phones
  const [mobilePane, setMobilePane] = useState<'list' | 'viewer'>('list');

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<'date' | 'name'>('date');

  // Modals
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isNewClientOpen, setIsNewClientOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);

  // Sync to localStorage
  useEffect(() => {
    saveClients(clients);
  }, [clients]);

  useEffect(() => {
    saveTabs(tabs);
  }, [tabs]);

  useEffect(() => {
    saveDocuments(documents);
  }, [documents]);

  useEffect(() => {
    saveSolicitorProfile(user);
  }, [user]);

  // Handle URL change
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setShareParam(params.get('share'));
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Selected client object
  const selectedClient = useMemo(() => {
    if (!selectedClientId) return null;
    return clients.find((c) => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  // Filter tabs for the selected client
  const clientTabs = useMemo(() => {
    if (!selectedClientId) return tabs;
    const filtered = tabs.filter((t) => t.clientId === selectedClientId);
    if (filtered.length === 0) return tabs;
    return filtered;
  }, [tabs, selectedClientId]);

  // Sorted tabs
  const sortedTabs = useMemo(() => {
    return [...clientTabs].sort((a, b) => {
      if (sortOption === 'name') {
        return a.name.localeCompare(b.name);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [clientTabs, sortOption]);

  // Current active collection tab
  const activeTab = useMemo(() => {
    return sortedTabs.find((t) => t.id === activeTabId) || sortedTabs[0] || {
      id: 'default',
      clientId: selectedClientId || 'default',
      name: 'All Documents',
      createdAt: new Date().toISOString()
    };
  }, [sortedTabs, activeTabId, selectedClientId]);

  // Documents under the active tab
  const tabDocuments = useMemo(() => {
    return documents
      .filter((d) => d.collectionId === activeTab.id)
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
  }, [documents, activeTab.id, searchQuery, sortOption]);

  // Active document
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
    clientTabs.forEach((tab) => {
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
  }, [clientTabs, documents]);

  // Handle client selection (opens Level 2 document workspace)
  const handleSelectClient = (client: ClientRecord) => {
    setSelectedClientId(client.id);
    setMobilePane('list');
    const clientFirstTab = tabs.find((t) => t.clientId === client.id);
    if (clientFirstTab) {
      setActiveTabId(clientFirstTab.id);
      const firstDoc = documents.find((d) => d.collectionId === clientFirstTab.id);
      setActiveDocId(firstDoc ? firstDoc.id : null);
    } else {
      setActiveTabId('');
      setActiveDocId(null);
    }
  };

  // Add new client
  const handleAddClient = (newClient: ClientRecord) => {
    setClients((prev) => [newClient, ...prev]);
    // Also create their first initial case tab
    const initialTab: CollectionTab = {
      id: 'tab_' + Math.random().toString(36).substring(2, 9),
      clientId: newClient.id,
      name: newClient.cameFor || 'Case Application',
      caseNumber: `${newClient.name.substring(0, 2).toUpperCase()}-2026`,
      icon: 'briefcase',
      isDefault: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setTabs((prev) => [...prev, initialTab]);
    handleSelectClient(newClient);
  };

  const handleDeleteClient = (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this client record and associated case documents?')) {
      setClients((prev) => prev.filter((c) => c.id !== clientId));
      setTabs((prev) => prev.filter((t) => t.clientId !== clientId));
      setDocuments((prev) => prev.filter((d) => d.clientId !== clientId));
      if (selectedClientId === clientId) {
        setSelectedClientId(null);
      }
    }
  };

  const handleQuickShareClient = (client: ClientRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    handleSelectClient(client);
    setIsShareOpen(true);
  };

  // Tab operations
  const handleCreateTab = (name: string) => {
    if (!selectedClientId) return;
    const newTab: CollectionTab = {
      id: 'tab_' + Math.random().toString(36).substring(2, 9),
      clientId: selectedClientId,
      name,
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
    if (clientTabs.length <= 1) return;
    if (confirm('Delete this tab and its documents?')) {
      setTabs((prev) => prev.filter((t) => t.id !== tabId));
      setDocuments((prev) => prev.filter((d) => d.collectionId !== tabId));
      const remaining = clientTabs.filter((t) => t.id !== tabId);
      if (remaining.length > 0) {
        setActiveTabId(remaining[0].id);
      }
    }
  };

  // Document uploads
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
        clientId: selectedClientId || undefined,
        collectionId: activeTab.id,
        name: file.name,
        fileType,
        fileSize: file.size,
        url,
        hasFile: true,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }

    setDocuments((prev) => [...newItems, ...prev]);
    if (newItems.length > 0) {
      setActiveDocId(newItems[0].id);
    }
  };

  const handleSaveMultiPageDoc = (
    title: string,
    pages: { name: string; file: File; url: string; fileType: FileType; fileSize: number }[],
    status: DocumentStatus
  ) => {
    if (pages.length === 0) return;
    const primary = pages[0];
    const formattedPages = pages.map((p, idx) => ({
      id: 'page_' + Math.random().toString(36).substring(2, 9),
      name: p.name || `Page ${idx + 1}`,
      url: p.url,
      fileType: p.fileType,
      fileSize: p.fileSize
    }));

    const totalSize = pages.reduce((acc, curr) => acc + curr.fileSize, 0);

    const newDoc: DocumentItem = {
      id: 'doc_' + Math.random().toString(36).substring(2, 9),
      clientId: selectedClientId || undefined,
      collectionId: activeTab.id,
      name: title.trim() || primary.file.name,
      fileType: primary.fileType,
      fileSize: totalSize,
      url: primary.url,
      hasFile: true,
      status,
      pages: formattedPages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setDocuments((prev) => [newDoc, ...prev]);
    setActiveDocId(newDoc.id);
    setMobilePane('viewer');
  };

  const handleAddPageToDoc = async (docId: string, pageName: string, file: File) => {
    const fileType = detectFileType(file.name, file.type);
    const url = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === docId) {
          const existingPages = doc.pages && doc.pages.length > 0 ? doc.pages : [
            {
              id: 'page_orig_' + Math.random().toString(36).substring(2, 9),
              name: 'Front Side',
              url: doc.url,
              fileType: doc.fileType,
              fileSize: doc.fileSize
            }
          ];
          const newPage = {
            id: 'page_' + Math.random().toString(36).substring(2, 9),
            name: pageName,
            url,
            fileType,
            fileSize: file.size
          };
          return {
            ...doc,
            pages: [...existingPages, newPage],
            fileSize: doc.fileSize + file.size,
            updatedAt: new Date().toISOString()
          };
        }
        return doc;
      })
    );
  };

  const handleBatchUpload = async (files: File[], combineIntoOne: boolean, combinedTitle?: string) => {
    if (files.length === 0) return;

    if (combineIntoOne) {
      const pages: { name: string; file: File; url: string; fileType: FileType; fileSize: number }[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileType = detectFileType(file.name, file.type);
        const url = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
        });
        pages.push({
          name: i === 0 ? 'Front Side' : i === 1 ? 'Back Side' : `Page ${i + 1}`,
          file,
          url,
          fileType,
          fileSize: file.size
        });
      }
      handleSaveMultiPageDoc(combinedTitle || 'Combined Document', pages, 'pending');
    } else {
      handleUploadFiles(files);
    }
  };

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
            status: 'pending',
            updatedAt: new Date().toISOString()
          };
        }
        return doc;
      })
    );
    setActiveDocId(docId);
  };

  const handleCreateDocumentSlot = (title: string, fileType: FileType) => {
    const formattedName = title.includes('.') ? title : `${title}.${fileType}`;
    const newSlot: DocumentItem = {
      id: 'doc_req_' + Math.random().toString(36).substring(2, 9),
      clientId: selectedClientId || undefined,
      collectionId: activeTab.id,
      name: formattedName,
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

  // If viewing a shared link (?share=...)
  if (shareParam) {
    const shares = getShares();
    const shareRecord = shares.find((s) => s.id === shareParam) || null;

    return (
      <SharedViewer
        shareRecord={shareRecord}
        documents={documents}
        tabs={tabs}
        onUploadClientFile={handleUploadToFileSlot}
        onClientUploadNewDoc={async (collectionId, file) => {
          const fileType = detectFileType(file.name, file.type);
          const url = await new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target?.result as string);
            reader.readAsDataURL(file);
          });
          const newItem: DocumentItem = {
            id: 'doc_client_' + Math.random().toString(36).substring(2, 9),
            name: file.name,
            collectionId,
            fileType,
            fileSize: file.size,
            url,
            hasFile: true,
            status: 'pending',
            uploadedBy: 'client',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          setDocuments((prev) => [newItem, ...prev]);
        }}
        onUpdateStatus={handleUpdateDocumentStatus}
        onBackToApp={() => {
          window.history.pushState({}, '', window.location.pathname);
          setShareParam(null);
        }}
      />
    );
  }

  // If not logged in, show the Create Your Account or Sign In screen
  if (!user) {
    return (
      <AuthScreen
        onAuthenticated={(profile) => {
          setUser(profile);
          saveSolicitorProfile(profile);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col selection:bg-[#c2e7ff] selection:text-[#001d35]">
      {/* Top Header */}
      <Header
        user={user}
        selectedClient={selectedClient}
        onBackToClients={() => {
          setSelectedClientId(null);
          setMobilePane('list');
        }}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onLockSession={() => setIsLocked(true)}
        onOpenShare={() => setIsShareOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onSignOut={() => {
          if (confirm('Are you sure you want to sign out?')) {
            saveSolicitorProfile(null);
            setUser(null);
          }
        }}
        selectedCount={selectedDocIds.length}
        activeDocument={activeDoc}
        onExportSelected={() => exportMultipleDocuments(selectedDocuments, `${activeTab.name}_Selected.zip`)}
        onExportCurrent={() => activeDoc && exportSingleDocument(activeDoc)}
        onExportCurrentAsPdf={() => activeDoc && exportAsPdf(activeDoc)}
        onExportCurrentAsJpg={() => activeDoc && exportAsJpg(activeDoc)}
        onExportAll={() => exportMultipleDocuments(tabDocuments, `${activeTab.name}_Complete.zip`)}
      />

      {/* LEVEL 1: Main Company Page & Clients Directory */}
      {!selectedClient ? (
        <CompanyDashboard
          solicitor={user}
          clients={clients}
          tabs={tabs}
          documents={documents}
          onSelectClient={handleSelectClient}
          onOpenNewClientModal={() => setIsNewClientOpen(true)}
          onDeleteClient={handleDeleteClient}
          onQuickShareClient={handleQuickShareClient}
          onEditCompanyProfile={() => setIsAuthOpen(true)}
        />
      ) : (
        /* LEVEL 2: Client's Case Tabs & Document Vault */
        <>
          {/* Collection Tabs Bar */}
          <CollectionTabs
            tabs={sortedTabs}
            activeTabId={activeTab.id}
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

          {/* Document Workspace */}
          <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 relative">
            {/* Left Documents List */}
            <div className={`${mobilePane === 'viewer' ? 'hidden md:flex' : 'flex'} w-full md:w-80 lg:w-96 flex-col border-r border-[#dadce0] bg-white h-full overflow-hidden`}>
              <DocumentList
                documents={tabDocuments}
                activeDocumentId={activeDocId}
                onSelectDocument={(doc) => {
                  setActiveDocId(doc.id);
                  setMobilePane('viewer');
                }}
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
                onOpenUploadModal={() => setIsUploadModalOpen(true)}
                onAddPageToDoc={handleAddPageToDoc}
                tabTitle={activeTab.name}
              />
            </div>

            {/* Master Document Viewer */}
            <div className={`${mobilePane === 'list' ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-[#f8fafd] h-full overflow-hidden min-h-0`}>
              {/* Mobile Back Button to return to Document List */}
              <div className="md:hidden bg-white border-b border-[#dadce0] px-3 py-2 flex items-center justify-between z-30 shadow-xs flex-shrink-0">
                <button
                  onClick={() => setMobilePane('list')}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] rounded-xl text-xs font-bold transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Case Files</span>
                </button>
                <span className="text-xs font-semibold text-[#5f6368] truncate max-w-[170px]">
                  {activeDoc?.name || 'Document'}
                </span>
              </div>

              <DocumentViewer
                document={activeDoc}
                onExport={exportSingleDocument}
                onExportAsPdf={exportAsPdf}
                onExportAsJpg={exportAsJpg}
                onShare={() => setIsShareOpen(true)}
                onUpdateStatus={handleUpdateDocumentStatus}
                onAddPageToDoc={handleAddPageToDoc}
                isReadOnly={false}
              />
            </div>
          </div>
        </>
      )}

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

      <NewClientModal
        isOpen={isNewClientOpen}
        onClose={() => setIsNewClientOpen(false)}
        onAddClient={handleAddClient}
      />

      <UploadDocumentsModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSaveMultiPageDoc={handleSaveMultiPageDoc}
        onBatchUploadFiles={handleBatchUpload}
      />
    </div>
  );
}

export default App;
