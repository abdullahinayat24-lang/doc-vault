import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  CollectionTab, 
  DocumentItem, 
  ShareRecord, 
  SolicitorProfile, 
  FileType, 
  DocumentStatus,
  ClientRecord,
  DocumentFolder,
  FolderColor,
  StaffMember
} from './types';
import { 
  getClients,
  saveClients,
  getInitialTabs, 
  saveTabs, 
  getInitialDocuments, 
  saveDocuments, 
  getInitialFolders,
  saveFolders,
  getSolicitorProfile, 
  saveSolicitorProfile, 
  getShares, 
  saveShare,
  exportSingleDocument, 
  exportMultipleDocuments,
  exportAsPdf,
  exportAsJpg,
  detectFileType,
  idbGetDocuments,
  fetchShareFromSupabase,
  fetchUserDocumentsFromSupabase,
  fetchClientsFromSupabase,
  syncClientToSupabase,
  deleteClientFromSupabase,
  fetchTabsFromSupabase,
  syncTabToSupabase,
  deleteTabFromSupabase,
  ensureUserProfileInSupabase,
  generateUUID,
  uploadFileOnline,
  syncSingleDocumentToSupabase,
  syncDocumentsToSupabase,
  extractFoldersFromClients,
  syncFoldersToSupabase,
  syncShareToSupabase,
  migrateLocalDocumentsToCloud,
  initTrial,
  getTrialStatus,
  getPromoCodes,
  getStaff,
  saveStaffMember,
  deleteStaffMember,
  fetchStaffFromSupabase
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
import { EditClientModal } from './components/Modals/EditClientModal';
import { UploadDocumentsModal } from './components/Modals/UploadDocumentsModal';
import { PricingModal } from './components/Modals/PricingModal';
import { AuthScreen } from './components/AuthScreen';
import { ChangePinModal } from './components/Modals/ChangePinModal';
import { DiscountKeysModal } from './components/Modals/DiscountKeysModal';
import { StaffLogin } from './components/StaffPortal/StaffLogin';
import { StaffManagementModal } from './components/Modals/StaffManagementModal';
import { UploadProgressToast, UploadProgressInfo } from './components/UploadProgressToast';
import { ArrowLeft, ShieldAlert, Sparkles, KeyRound, UploadCloud } from 'lucide-react';



export const deduplicateDocuments = (docs: DocumentItem[]): DocumentItem[] => {
  const byId = new Map<string, DocumentItem>();
  const bySig = new Map<string, string>();

  for (const d of docs) {
    if (!d || !d.id) continue;

    const signature = `${d.collectionId || 'default'}::${d.folderId || 'root'}::${d.name.trim().toLowerCase()}::${d.fileSize || 0}`;
    const existingId = bySig.get(signature) || (byId.has(d.id) ? d.id : undefined);
    const existing = existingId ? byId.get(existingId) : undefined;

    if (existing) {
      // Prioritize the document record that contains a valid non-empty file URL!
      const validUrl = (d.url && d.url.length > 0) ? d.url : existing.url;
      const merged: DocumentItem = {
        ...existing,
        ...d,
        id: existing.id,
        url: validUrl || '',
        hasFile: Boolean((validUrl && validUrl.length > 0) || d.hasFile || existing.hasFile),
        folderId: d.folderId || existing.folderId
      };
      byId.set(existing.id, merged);
    } else {
      byId.set(d.id, d);
      bySig.set(signature, d.id);
    }
  }

  return Array.from(byId.values());
};

export function App() {
  // Check if viewing a shared link (?share=...)
  const [shareParam, setShareParam] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('share');
  });

  // Staff Portal URL parameter (?portal=staff)
  const [portalParam, setPortalParam] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('portal');
  });

  // Active Staff Session (persisted in sessionStorage)
  const [currentStaffSession, setCurrentStaffSession] = useState<StaffMember | null>(() => {
    try {
      const saved = sessionStorage.getItem('docvault_staff_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [isStaffManagementOpen, setIsStaffManagementOpen] = useState<boolean>(false);

  // Upload Progress State
  const [uploadProgress, setUploadProgress] = useState<UploadProgressInfo>({
    isUploading: false,
    totalFiles: 0,
    currentFileIndex: 0,
    currentFileName: '',
    status: 'completed'
  });

  // Decode embedded document payload from URL hash (#data=...) for cross-device shared links
  const [sharedPayload] = useState<{ share: ShareRecord; docs: DocumentItem[] } | null>(() => {
    try {
      const hash = window.location.hash;
      if (hash.startsWith('#data=')) {
        const encoded = hash.slice(6); // remove '#data='
        const decoded = JSON.parse(decodeURIComponent(atob(encoded)));
        if (decoded && decoded.share && Array.isArray(decoded.docs)) {
          return decoded as { share: ShareRecord; docs: DocumentItem[] };
        }
      }
    } catch (e) {
      console.warn('Failed to decode shared link payload:', e);
    }
    return null;
  });

  // Cloud share state for cross-device links without local storage
  const [cloudShareData, setCloudShareData] = useState<{ share: ShareRecord; docs: DocumentItem[]; folders?: DocumentFolder[] } | null>(null);
  const [isLoadingCloudShare, setIsLoadingCloudShare] = useState<boolean>(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('share');
    if (!p) return false;
    const local = getShares().find((s) => s.id === p);
    return !local && !window.location.hash.startsWith('#data=');
  });

  useEffect(() => {
    if (!shareParam) return;
    if (sharedPayload && sharedPayload.docs && sharedPayload.docs.length > 0) return;

    // Check if local storage already has full payload with docs
    const local = getShares().find((s) => s.id === shareParam);
    if (local && local.payload && local.payload.docs && local.payload.docs.length > 0) {
      setCloudShareData({
        share: local,
        docs: local.payload.docs,
        folders: local.payload.folders || []
      });
      return;
    }

    setIsLoadingCloudShare(true);

    const loadShare = async () => {
      try {
        // Priority 1: Supabase (enhanced with table and Bytebin fallbacks)
        const supabaseData = await fetchShareFromSupabase(shareParam);
        if (supabaseData && supabaseData.docs && supabaseData.docs.length > 0) {
          const fixedShare = { ...supabaseData.share, id: shareParam };
          setCloudShareData({ ...supabaseData, share: fixedShare });
          saveShare(fixedShare);
          return;
        }

        // Priority 2: Bytebin CDN fallback
        try {
          const bytebinRes = await fetch(`https://bytebin.lucko.me/${shareParam}`);
          if (bytebinRes.ok) {
            const data = await bytebinRes.json();
            if (data && (data.share || data.title)) {
              const share = data.share || data;
              const fixedShare: ShareRecord = { ...share, id: shareParam };
              const payload = {
                share: fixedShare,
                docs: data.docs || [],
                folders: data.folders || []
              };
              setCloudShareData(payload);
              saveShare(fixedShare);
              syncShareToSupabase(fixedShare, data.docs, data.folders).catch(() => {});
              return;
            }
          }
        } catch (bErr) {
          console.warn('Bytebin fetch error:', bErr);
        }

        // Priority 3: Use whatever Supabase returned if present
        if (supabaseData && supabaseData.share) {
          const fixedShare = { ...supabaseData.share, id: shareParam };
          setCloudShareData({ ...supabaseData, share: fixedShare });
        }
      } catch (err) {
        console.warn('Share load error:', err);
      } finally {
        setIsLoadingCloudShare(false);
      }
    };

    loadShare();
  }, [shareParam, sharedPayload]);

  // Main state - null profile by default prompts Create Account / Sign In
  const [user, setUser] = useState<SolicitorProfile | null>(() => getSolicitorProfile());
  const [clients, setClients] = useState<ClientRecord[]>(() => getClients());
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);

  const [tabs, setTabs] = useState<CollectionTab[]>(() => getInitialTabs());
  const [documents, setDocuments] = useState<DocumentItem[]>(() => deduplicateDocuments(getInitialDocuments()));
  const [folders, setFolders] = useState<DocumentFolder[]>(() => getInitialFolders());
  
  const [activeTabId, setActiveTabId] = useState<string>('');
  const [activeDocId, setActiveDocId] = useState<string | null>(null);

  // Mobile navigation pane: toggle between 'list' and 'viewer' on phones
  const [mobilePane, setMobilePane] = useState<'list' | 'viewer'>('list');

  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOption, setSortOption] = useState<'manual' | 'date' | 'name'>('manual');
  const [isWorkspaceDragging, setIsWorkspaceDragging] = useState<boolean>(false);

  // Prevent browser default drop navigation
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

  // Modals
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isShareOpen, setIsShareOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [isNewClientOpen, setIsNewClientOpen] = useState<boolean>(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState<boolean>(false);
  const [isPricingOpen, setIsPricingOpen] = useState<boolean>(false);
  const [isChangePinOpen, setIsChangePinOpen] = useState<boolean>(false);
  const [isDiscountKeysOpen, setIsDiscountKeysOpen] = useState<boolean>(false);
  const [isEditClientOpen, setIsEditClientOpen] = useState<boolean>(false);
  const [editingClient, setEditingClient] = useState<ClientRecord | null>(null);

  // Staff & Team Directory
  const [staffList, setStaffList] = useState<StaffMember[]>(() => getStaff());

  // Fetch updated staff directory from Supabase on mount
  useEffect(() => {
    fetchStaffFromSupabase().then((remoteStaff) => {
      if (remoteStaff && remoteStaff.length > 0) {
        setStaffList(remoteStaff);
      }
    });
  }, []);

  const handleStaffLogout = () => {
    sessionStorage.removeItem('docvault_staff_session');
    setCurrentStaffSession(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('portal');
    window.history.replaceState({}, '', url.toString());
    setPortalParam(null);
  };

  // Filter clients for active staff session based on assigned cases
  const visibleClients = useMemo(() => {
    if (!currentStaffSession) return clients;
    if (!currentStaffSession.assignedClientIds || currentStaffSession.assignedClientIds.length === 0) {
      return clients;
    }
    return clients.filter((c) => currentStaffSession.assignedClientIds.includes(c.id));
  }, [clients, currentStaffSession]);

  const handleAddStaffMember = (member: StaffMember) => {
    saveStaffMember(member, user?.id);
    setStaffList(getStaff());
  };

  const handleDeleteStaffMember = (id: string) => {
    deleteStaffMember(id, user?.id);
    setStaffList(getStaff());
  };

  const handleAssignStaffToClient = (clientId: string, staffId?: string) => {
    setClients((prev) => {
      const updated = prev.map((c) =>
        c.id === clientId ? { ...c, assignedStaffId: staffId, updatedAt: new Date().toISOString() } : c
      );
      saveClients(updated);
      return updated;
    });
  };

  const handleOpenEditClient = (client: ClientRecord, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingClient(client);
    setIsEditClientOpen(true);
  };

  const handleSaveEditClient = (updated: ClientRecord) => {
    setClients((prev) => {
      const newList = prev.map((c) => c.id === updated.id ? updated : c);
      saveClients(newList, user?.id);
      return newList;
    });
    if (user?.id) {
      syncClientToSupabase(updated, user.id);
    }
    setIsEditClientOpen(false);
    setEditingClient(null);
  };

  const handleUpdateFirmTheme = (themeColor: string) => {
    if (user) {
      const updatedUser: SolicitorProfile = { ...user, firmThemeColor: themeColor };
      setUser(updatedUser);
      saveSolicitorProfile(updatedUser);
    }
  };

  // Multi-Select Batch Operations
  const handleBatchMoveDocsToFolder = (docIds: string[], targetFolderId?: string) => {
    if (docIds.length === 0) return;
    setDocuments((prev) =>
      prev.map((d) => {
        if (docIds.includes(d.id)) {
          const updated = { ...d, folderId: targetFolderId || undefined, updatedAt: new Date().toISOString() };
          syncSingleDocumentToSupabase(updated, user?.id);
          return updated;
        }
        return d;
      })
    );
    setSelectedDocIds([]);
  };

  const handleBatchDeleteDocs = (docIds: string[]) => {
    if (docIds.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${docIds.length} selected document${docIds.length > 1 ? 's' : ''}?`)) return;
    setDocuments((prev) => prev.filter((d) => !docIds.includes(d.id)));
    setSelectedDocIds([]);
    if (activeDocId && docIds.includes(activeDocId)) {
      setActiveDocId(null);
    }
  };

  const handleBatchAutoNumberDocs = (docIds: string[]) => {
    if (docIds.length === 0) return;
    setDocuments((prev) => {
      let counter = 1;
      return prev.map((d) => {
        if (docIds.includes(d.id)) {
          const cleanName = d.name.replace(/^\d+[\.\-\s]+\s*/, '');
          const numberedName = `${counter}. ${cleanName}`;
          counter++;
          const updated = { ...d, name: numberedName, updatedAt: new Date().toISOString() };
          syncSingleDocumentToSupabase(updated, user?.id);
          return updated;
        }
        return d;
      });
    });
  };

  const handleBatchUpdateStatus = (docIds: string[], status: DocumentStatus) => {
    if (docIds.length === 0) return;
    setDocuments((prev) =>
      prev.map((d) => {
        if (docIds.includes(d.id)) {
          const updated = { ...d, status, updatedAt: new Date().toISOString() };
          syncSingleDocumentToSupabase(updated, user?.id);
          return updated;
        }
        return d;
      })
    );
  };

  // Start free trial on first launch
  useEffect(() => { initTrial(); }, []);

  // Trial status & Lockout checks (owner rana.abdullah.inayat@gmail.com is exempt)
  const trial = getTrialStatus();
  const isOwner = user?.email?.toLowerCase() === 'rana.abdullah.inayat@gmail.com';
  const [trialUnlocked, setTrialUnlocked] = useState<boolean>(() => {
    return localStorage.getItem('docvault_trial_unlocked') === 'true';
  });
  const [trialUnlockKey, setTrialUnlockKey] = useState('');
  const [trialUnlockError, setTrialUnlockError] = useState('');

  const handleUnlockTrial = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = trialUnlockKey.trim().toUpperCase();
    const masterKey = 'LEGAL-VAULT-2026';
    const promoCodes = getPromoCodes();
    const match = promoCodes.find(c => c.code === cleanKey && c.active && c.discountPct === 100);

    if (cleanKey === masterKey || cleanKey === 'VIP100' || match) {
      localStorage.setItem('docvault_trial_unlocked', 'true');
      setTrialUnlocked(true);
      setTrialUnlockError('');
    } else {
      setTrialUnlockError('Invalid license or VIP key. Please contact rana.abdullah.inayat@gmail.com');
    }
  };

  const isHydrated = useRef(false);

  // Hydrate full documents from IndexedDB on startup, clean duplicates, and sync with Supabase
  useEffect(() => {
    idbGetDocuments().then(async (idbDocs) => {
      isHydrated.current = true;
      if (idbDocs && idbDocs.length > 0) {
        setDocuments((prev) => deduplicateDocuments([...idbDocs, ...prev]));
      }
    }).catch((err) => {
      isHydrated.current = true;
      console.warn('IndexedDB initial load note:', err);
    });

    if (user?.id) {
      // 1. Ensure user profile exists in Supabase so foreign key constraints succeed
      ensureUserProfileInSupabase(user).catch(() => {});

      // 2. Hydrate clients and folders from Supabase cloud
      fetchClientsFromSupabase(user.id).then((cloudClients) => {
        if (cloudClients && cloudClients.length > 0) {
          // Extract folders saved in cloudClients notes
          const cloudFolders = extractFoldersFromClients(cloudClients);
          if (cloudFolders.length > 0) {
            setFolders((prev) => {
              const map = new Map<string, DocumentFolder>();
              cloudFolders.forEach((f) => map.set(f.id, f));
              prev.forEach((f) => {
                if (!map.has(f.id)) map.set(f.id, f);
              });
              return Array.from(map.values());
            });
          } else {
            // Push existing local folders to cloud
            setFolders((currentFolders) => {
              if (currentFolders.length > 0) {
                syncFoldersToSupabase(currentFolders, cloudClients[0]?.id || selectedClientId || undefined, user.id);
              }
              return currentFolders;
            });
          }

          setClients((prevLocal) => {
            const map = new Map<string, ClientRecord>();
            cloudClients.forEach((c) => map.set(c.id, c));
            prevLocal.forEach((lc) => {
              if (!map.has(lc.id)) {
                map.set(lc.id, lc);
                syncClientToSupabase(lc, user.id);
              }
            });
            const merged = Array.from(map.values());
            saveClients(merged, user.id);
            return merged;
          });
        } else {
          // Cloud has 0 clients: push existing local clients to Supabase
          setClients((currentClients) => {
            currentClients.forEach((c) => syncClientToSupabase(c, user.id));
            return currentClients;
          });
          setFolders((currentFolders) => {
            if (currentFolders.length > 0 && clients.length > 0) {
              syncFoldersToSupabase(currentFolders, clients[0].id, user.id);
            }
            return currentFolders;
          });
        }
      }).catch((err) => console.warn('Supabase initial clients load note:', err));

      // 3. Hydrate tabs from Supabase cloud
      fetchTabsFromSupabase(user.id).then((cloudTabs) => {
        if (cloudTabs && cloudTabs.length > 0) {
          setTabs((prevLocal) => {
            const map = new Map<string, CollectionTab>();
            cloudTabs.forEach((t) => map.set(t.id, t));
            prevLocal.forEach((lt) => {
              if (!map.has(lt.id)) {
                map.set(lt.id, lt);
                syncTabToSupabase(lt, user.id);
              }
            });
            const merged = Array.from(map.values());
            saveTabs(merged, user.id);
            return merged;
          });
        } else {
          setTabs((currentTabs) => {
            currentTabs.forEach((t) => syncTabToSupabase(t, user.id));
            return currentTabs;
          });
        }
      }).catch((err) => console.warn('Supabase initial tabs load note:', err));

      // 4. Hydrate documents from Supabase cloud
      fetchUserDocumentsFromSupabase(user.id).then((cloudDocs) => {
        if (cloudDocs && cloudDocs.length > 0) {
          setDocuments((prev) => {
            const map = new Map(prev.map((d) => [d.id, d]));
            cloudDocs.forEach((cd) => {
              const existing = map.get(cd.id);
              if (existing) {
                map.set(cd.id, {
                  ...cd,
                  folderId: cd.folderId || existing.folderId,
                  url: cd.url || existing.url
                });
              } else {
                map.set(cd.id, cd);
              }
            });
            const merged = deduplicateDocuments(Array.from(map.values()));
            // Sync any local docs missing in cloud
            const missingInCloud = prev.filter((d) => !cloudDocs.some((cd) => cd.id === d.id));
            if (missingInCloud.length > 0) {
              syncDocumentsToSupabase(missingInCloud, user.id, tabs, clients);
            }
            return merged;
          });
        } else {
          // Cloud has 0 documents: push existing local documents to Supabase
          setDocuments((currentDocs) => {
            if (currentDocs.length > 0) {
              syncDocumentsToSupabase(currentDocs, user.id, tabs, clients);
            }
            return currentDocs;
          });
        }
      }).catch((err) => console.warn('Supabase initial documents load note:', err));
    }
  }, [user?.id]);

  // Sync to localStorage and Supabase cloud
  useEffect(() => {
    saveClients(clients, user?.id);
  }, [clients, user?.id]);

  useEffect(() => {
    saveTabs(tabs, user?.id);
  }, [tabs, user?.id]);

  useEffect(() => {
    if (!isHydrated.current) return;
    saveDocuments(documents, user?.id);
  }, [documents, user?.id]);

  useEffect(() => {
    saveFolders(folders, selectedClientId || clients[0]?.id, user?.id);
  }, [folders, selectedClientId, clients, user?.id]);

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

  // Folders under the active tab
  const tabFolders = useMemo(() => {
    if (!activeTab?.id || activeTab.id === 'default') return folders;
    const match = folders.filter((f) => f.collectionId === activeTab.id);
    if (match.length > 0) return match;
    return folders;
  }, [folders, activeTab?.id]);

  // Documents under the active tab
  const tabDocuments = useMemo(() => {
    let filtered = documents;
    if (activeTab.id && activeTab.id !== 'default') {
      const matchTab = documents.filter((d) => d.collectionId === activeTab.id);
      if (matchTab.length > 0) {
        filtered = matchTab;
      }
    }
    return filtered
      .filter((d) => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return d.name.toLowerCase().includes(q) || d.fileType.toLowerCase().includes(q);
      })
      .sort((a, b) => {
        if (sortOption === 'name') {
          return a.name.localeCompare(b.name);
        }
        if (sortOption === 'date') {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        // 'manual': preserve exact user ordered position
        return 0;
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
      id: generateUUID(),
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
    if (user?.id) {
      syncClientToSupabase(newClient, user.id);
      syncTabToSupabase(initialTab, user.id);
    }
  };

  const handleDeleteClient = (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this client record and associated case documents?')) {
      deleteClientFromSupabase(clientId);
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
      id: generateUUID(),
      clientId: selectedClientId,
      name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setTabs((prev) => [...prev, newTab]);
    setActiveTabId(newTab.id);
    setSelectedDocIds([]);
    if (user?.id) {
      syncTabToSupabase(newTab, user.id);
    }
  };

  const handleRenameTab = (tabId: string, newName: string) => {
    setTabs((prev) =>
      prev.map((t) => {
        if (t.id === tabId) {
          const updated = { ...t, name: newName, updatedAt: new Date().toISOString() };
          if (user?.id) syncTabToSupabase(updated, user.id);
          return updated;
        }
        return t;
      })
    );
  };

  const handleDeleteTab = (tabId: string) => {
    if (currentStaffSession && currentStaffSession.permissions?.canDelete === false) {
      alert('Your staff account does not have permission to delete case tabs.');
      return;
    }
    if (clientTabs.length <= 1) return;
    if (confirm('Delete this tab and its documents?')) {
      deleteTabFromSupabase(tabId);
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
    if (currentStaffSession && currentStaffSession.permissions?.canUpload === false) {
      alert('Your staff account does not have permission to upload documents.');
      return;
    }
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    setUploadProgress({
      isUploading: true,
      totalFiles: fileArray.length,
      currentFileIndex: 0,
      currentFileName: fileArray[0].name,
      status: 'uploading'
    });

    const newItems: DocumentItem[] = [];

    for (let idx = 0; idx < fileArray.length; idx++) {
      const file = fileArray[idx];
      setUploadProgress({
        isUploading: true,
        totalFiles: fileArray.length,
        currentFileIndex: idx + 1,
        currentFileName: file.name,
        status: 'uploading'
      });

      const fileType = detectFileType(file.name, file.type);
      const docId = generateUUID();
      const { url } = await uploadFileOnline(file, user?.id, docId);

      const item: DocumentItem = {
        id: docId,
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
      };

      // Sync immediately online!
      syncSingleDocumentToSupabase(item, user?.id);
      newItems.push(item);
    }

    setUploadProgress({
      isUploading: false,
      totalFiles: fileArray.length,
      currentFileIndex: fileArray.length,
      currentFileName: 'Upload Complete',
      status: 'completed'
    });

    setTimeout(() => {
      setUploadProgress((prev) => ({ ...prev, isUploading: false, status: 'completed' }));
    }, 2500);

    setDocuments((prev) => [...newItems, ...prev]);
    if (newItems.length > 0) {
      setActiveDocId(newItems[0].id);
    }
  };

  const handleSaveMultiPageDoc = async (
    title: string,
    pages: { name: string; file: File; url: string; fileType: FileType; fileSize: number }[],
    status: DocumentStatus
  ) => {
    if (pages.length === 0) return;
    const primary = pages[0];
    const docId = generateUUID();

    const formattedPages = [];
    for (let idx = 0; idx < pages.length; idx++) {
      const p = pages[idx];
      let pUrl = p.url;
      if (!pUrl || pUrl.startsWith('data:')) {
        const up = await uploadFileOnline(p.file, user?.id);
        if (up.url) pUrl = up.url;
      }
      formattedPages.push({
        id: generateUUID(),
        name: p.name || `Page ${idx + 1}`,
        url: pUrl,
        fileType: p.fileType,
        fileSize: p.fileSize
      });
    }

    const totalSize = pages.reduce((acc, curr) => acc + curr.fileSize, 0);

    const newDoc: DocumentItem = {
      id: docId,
      clientId: selectedClientId || undefined,
      collectionId: activeTab.id,
      name: title.trim() || primary.file.name,
      fileType: primary.fileType,
      fileSize: totalSize,
      url: formattedPages[0]?.url || primary.url,
      hasFile: true,
      status,
      pages: formattedPages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    syncSingleDocumentToSupabase(newDoc, user?.id);
    setDocuments((prev) => [newDoc, ...prev]);
    setActiveDocId(newDoc.id);
    setMobilePane('viewer');
  };

  const handleAddPageToDoc = async (docId: string, pageName: string, file: File) => {
    const fileType = detectFileType(file.name, file.type);
    const { url } = await uploadFileOnline(file, user?.id);

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === docId) {
          const existingPages = doc.pages && doc.pages.length > 0 ? doc.pages : [
            {
              id: generateUUID(),
              name: 'Front Side',
              url: doc.url,
              fileType: doc.fileType,
              fileSize: doc.fileSize
            }
          ];
          const newPage = {
            id: generateUUID(),
            name: pageName,
            url,
            fileType,
            fileSize: file.size
          };
          const updatedDoc = {
            ...doc,
            pages: [...existingPages, newPage],
            fileSize: doc.fileSize + file.size,
            updatedAt: new Date().toISOString()
          };
          syncSingleDocumentToSupabase(updatedDoc, user?.id);
          return updatedDoc;
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
        const { url } = await uploadFileOnline(file, user?.id);
        pages.push({
          name: i === 0 ? 'Front Side' : i === 1 ? 'Back Side' : `Page ${i + 1}`,
          file,
          url,
          fileType,
          fileSize: file.size
        });
      }
      await handleSaveMultiPageDoc(combinedTitle || 'Combined Document', pages, 'pending');
    } else {
      await handleUploadFiles(files);
    }
  };

  const handleUploadToFileSlot = async (docId: string, file: File) => {
    if (currentStaffSession && currentStaffSession.permissions?.canUpload === false) {
      alert('Your staff account does not have permission to upload documents.');
      return;
    }
    setUploadProgress({
      isUploading: true,
      totalFiles: 1,
      currentFileIndex: 1,
      currentFileName: file.name,
      status: 'uploading'
    });

    const fileType = detectFileType(file.name, file.type);
    const { url } = await uploadFileOnline(file, user?.id, docId);

    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === docId) {
          const updated = {
            ...doc,
            name: doc.name.endsWith(`.${fileType}`) ? doc.name : `${doc.name} (${file.name})`,
            fileType,
            fileSize: file.size,
            url,
            hasFile: true,
            status: 'pending' as DocumentStatus,
            updatedAt: new Date().toISOString()
          };
          syncSingleDocumentToSupabase(updated, user?.id);
          return updated;
        }
        return doc;
      })
    );
    setActiveDocId(docId);

    setUploadProgress({
      isUploading: false,
      totalFiles: 1,
      currentFileIndex: 1,
      currentFileName: file.name,
      status: 'completed'
    });
    setTimeout(() => {
      setUploadProgress((prev) => ({ ...prev, isUploading: false, status: 'completed' }));
    }, 2000);
  };

  const handleCreateDocumentSlot = (title: string, fileType: FileType) => {
    const formattedName = title.includes('.') ? title : `${title}.${fileType}`;
    const newSlot: DocumentItem = {
      id: generateUUID(),
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
    syncSingleDocumentToSupabase(newSlot, user?.id);
    setDocuments((prev) => [newSlot, ...prev]);
  };

  const handleUpdateDocumentStatus = (docId: string, status: DocumentStatus, notes?: string) => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id === docId) {
          const updated = {
            ...d,
            status,
            notes: notes !== undefined ? notes : d.notes,
            updatedAt: new Date().toISOString()
          };
          syncSingleDocumentToSupabase(updated, user?.id);
          return updated;
        }
        return d;
      })
    );
  };

  const handleRenameDocument = (id: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id === id) {
          const updated = { ...d, name: trimmed, updatedAt: new Date().toISOString() };
          syncSingleDocumentToSupabase(updated, user?.id);
          return updated;
        }
        return d;
      })
    );
  };

  const handleUpdateDocNotes = (docId: string, notes: string, description: string) => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id === docId) {
          const updated = {
            ...d,
            notes: notes.trim() || undefined,
            description: description.trim() || undefined,
            updatedAt: new Date().toISOString()
          };
          syncSingleDocumentToSupabase(updated, user?.id);
          return updated;
        }
        return d;
      })
    );
  };

  const handleRenamePage = (docId: string, pageIndex: number, newPageName: string) => {
    const trimmed = newPageName.trim();
    if (!trimmed) return;
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === docId && doc.pages && doc.pages[pageIndex]) {
          const newPages = [...doc.pages];
          newPages[pageIndex] = { ...newPages[pageIndex], name: trimmed };
          const updated = { ...doc, pages: newPages, updatedAt: new Date().toISOString() };
          syncSingleDocumentToSupabase(updated, user?.id);
          return updated;
        }
        return doc;
      })
    );
  };

  const handleUpdateDocumentRotation = (id: string, rotation: number, pageIndex?: number) => {
    setDocuments((prev) =>
      prev.map((doc) => {
        if (doc.id === id) {
          if (pageIndex !== undefined && doc.pages && doc.pages[pageIndex]) {
            const newPages = [...doc.pages];
            newPages[pageIndex] = { ...newPages[pageIndex], rotation };
            return { ...doc, pages: newPages, updatedAt: new Date().toISOString() };
          }
          return { ...doc, rotation, updatedAt: new Date().toISOString() };
        }
        return doc;
      })
    );
  };

  const handleUpdateDocumentContent = (docId: string, newContent: string) => {
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id === docId) {
          const updated = {
            ...d,
            content: newContent,
            hasFile: true,
            fileSize: new Blob([newContent]).size,
            updatedAt: new Date().toISOString()
          };
          syncSingleDocumentToSupabase(updated, user?.id);
          return updated;
        }
        return d;
      })
    );
  };

  const handleCreateBlankDoc = (title: string, fileType: FileType = 'docx') => {
    const formattedName = title.includes('.') ? title : `${title}.${fileType}`;
    const newDoc: DocumentItem = {
      id: generateUUID(),
      clientId: selectedClientId || undefined,
      collectionId: activeTab.id,
      name: formattedName,
      fileType,
      fileSize: 0,
      url: '',
      content: '<p>Start typing or draft your legal document, client statement, or agreement here...</p>',
      hasFile: true,
      status: 'pending',
      uploadedBy: 'solicitor',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    syncSingleDocumentToSupabase(newDoc, user?.id);
    setDocuments((prev) => [newDoc, ...prev]);
    setActiveDocId(newDoc.id);
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

  // Folder operations
  const handleCreateFolder = (name: string, parentId?: string, color: FolderColor = 'blue') => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const newFolder: DocumentFolder = {
      id: generateUUID(),
      collectionId: activeTab.id,
      parentId: parentId || undefined,
      name: trimmed,
      color,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setFolders((prev) => [...prev, newFolder]);
    return newFolder;
  };

  const handleRenameFolder = (folderId: string, newName: string) => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, name: trimmed, updatedAt: new Date().toISOString() } : f))
    );
  };

  const handleUpdateFolderColor = (folderId: string, color: FolderColor) => {
    setFolders((prev) =>
      prev.map((f) => (f.id === folderId ? { ...f, color, updatedAt: new Date().toISOString() } : f))
    );
  };

  const handleDeleteFolder = (folderId: string) => {
    if (confirm('Delete this folder? Documents inside will be kept and moved to the main tab.')) {
      const getDescendantFolderIds = (id: string): string[] => {
        const directChildren = folders.filter((f) => f.parentId === id);
        let allIds = [id];
        for (const child of directChildren) {
          allIds = allIds.concat(getDescendantFolderIds(child.id));
        }
        return allIds;
      };
      const folderIdsToRemove = getDescendantFolderIds(folderId);

      setFolders((prev) => prev.filter((f) => !folderIdsToRemove.includes(f.id)));
      setDocuments((prev) =>
        prev.map((d) => (d.folderId && folderIdsToRemove.includes(d.folderId) ? { ...d, folderId: undefined, updatedAt: new Date().toISOString() } : d))
      );
    }
  };

  const handleMoveDocToFolder = (docId: string, targetFolderId?: string) => {
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, folderId: targetFolderId, updatedAt: new Date().toISOString() } : d))
    );
  };

  const handleUploadFilesToFolder = async (files: FileList | File[], folderId?: string) => {
    const fileArray = Array.from(files);
    const newItems: DocumentItem[] = [];

    for (const file of fileArray) {
      const fileType = detectFileType(file.name, file.type);
      const docId = generateUUID();
      const { url } = await uploadFileOnline(file, user?.id, docId);

      const item: DocumentItem = {
        id: docId,
        clientId: selectedClientId || undefined,
        collectionId: activeTab.id,
        folderId: folderId || undefined,
        name: file.name,
        fileType,
        fileSize: file.size,
        url,
        hasFile: true,
        status: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      syncSingleDocumentToSupabase(item, user?.id);
      newItems.push(item);
    }

    setDocuments((prev) => [...newItems, ...prev]);
    if (newItems.length > 0) {
      setActiveDocId(newItems[0].id);
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

  const handleReorderDocument = (sourceDocId: string, targetDocId: string, position: 'before' | 'after') => {
    if (sourceDocId === targetDocId) return;
    setSortOption('manual');
    setDocuments((prev) => {
      const cleanPrev = deduplicateDocuments(prev);
      const srcIdx = cleanPrev.findIndex((d) => d.id === sourceDocId);
      const tgtIdx = cleanPrev.findIndex((d) => d.id === targetDocId);
      if (srcIdx < 0 || tgtIdx < 0) return cleanPrev;

      const result = [...cleanPrev];
      const [moved] = result.splice(srcIdx, 1);
      const targetDoc = cleanPrev[tgtIdx];
      if (targetDoc) {
        moved.folderId = targetDoc.folderId;
        moved.collectionId = targetDoc.collectionId;
      }

      const newTgtIdx = result.findIndex((d) => d.id === targetDocId);
      if (newTgtIdx < 0) return cleanPrev;
      result.splice(position === 'before' ? newTgtIdx : newTgtIdx + 1, 0, moved);
      return result;
    });
  };

  const handleMoveDocPosition = (docId: string, direction: 'up' | 'down') => {
    setSortOption('manual');
    setDocuments((prev) => {
      const cleanPrev = deduplicateDocuments(prev);
      const doc = cleanPrev.find((d) => d.id === docId);
      if (!doc) return cleanPrev;

      // Find all sibling documents in the exact same scope (same tab and same folder)
      const targetCollectionId = doc.collectionId;
      const siblings = cleanPrev.filter((d) => {
        return d.collectionId === targetCollectionId && (d.folderId || undefined) === (doc.folderId || undefined);
      });

      const siblingIdx = siblings.findIndex((d) => d.id === docId);
      if (siblingIdx < 0) return cleanPrev;
      if (direction === 'up' && siblingIdx === 0) return cleanPrev;
      if (direction === 'down' && siblingIdx === siblings.length - 1) return cleanPrev;

      const targetSibling = siblings[direction === 'up' ? siblingIdx - 1 : siblingIdx + 1];
      if (!targetSibling) return cleanPrev;

      const copy = [...cleanPrev];
      const idxA = copy.findIndex((d) => d.id === doc.id);
      const idxB = copy.findIndex((d) => d.id === targetSibling.id);
      if (idxA < 0 || idxB < 0) return cleanPrev;

      // Swap positions in the master array
      const temp = copy[idxA];
      copy[idxA] = copy[idxB];
      copy[idxB] = temp;

      return copy;
    });
  };

  const handleSyncLocalDocs = async () => {
    if (!user?.id) {
      alert('Please sign in to sync documents directly to your cloud account.');
      return;
    }
    try {
      // 1. Sync folders to Supabase under client
      saveFolders(folders, selectedClientId || clients[0]?.id, user.id);

      // 2. Sync all documents to Supabase
      await syncDocumentsToSupabase(documents, user.id, tabs, clients);

      // 3. Migrate any local base64 files to high-speed cloud storage
      const unsynced = documents.filter((d) => d.url && d.url.startsWith('data:'));
      if (unsynced.length > 0) {
        const migrated = await migrateLocalDocumentsToCloud(documents, user.id);
        setDocuments(deduplicateDocuments(migrated));
      }

      alert(`Cloud sync complete! ${documents.length} document(s) and folders are safely synced to your cloud account.`);
    } catch (e) {
      console.warn('Sync local documents note:', e);
      alert('Documents remain safely preserved in your local vault.');
    }
  };

  // If viewing a shared link (?share=...)
  if (shareParam) {
    if (isLoadingCloudShare) {
      return (
        <div className="min-h-screen bg-[#f8fafd] flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-150">
          <div className="w-12 h-12 border-4 border-[#1a73e8] border-t-transparent rounded-full animate-spin mb-4" />
          <h2 className="font-['Google_Sans',sans-serif] text-base font-bold text-[#202124]">
            Connecting to Secured Client Portal...
          </h2>
          <p className="text-xs text-[#5f6368] mt-1">
            Loading required case documents from solicitor vault.
          </p>
        </div>
      );
    }

    // Prefer embedded URL payload (works cross-device), then cloud store, then localStorage
    const shareRecord = sharedPayload?.share || cloudShareData?.share || (getShares().find((s) => s.id === shareParam) ?? null);
    const rawDocs = (sharedPayload?.docs && sharedPayload.docs.length > 0 ? sharedPayload.docs : undefined) 
      || (cloudShareData?.docs && cloudShareData.docs.length > 0 ? cloudShareData.docs : undefined) 
      || (documents.length > 0 ? documents : []);
    const rawFolders = ((sharedPayload as any)?.folders && (sharedPayload as any).folders.length > 0 ? (sharedPayload as any).folders : undefined) 
      || ((cloudShareData as any)?.folders && (cloudShareData as any).folders.length > 0 ? (cloudShareData as any).folders : undefined) 
      || (folders.length > 0 ? folders : []);

    // Merge document content so local file data is never missing or blank
    const sharedDocs = rawDocs.map((sd) => {
      if (!sd.url) {
        const localMatch = documents.find((d) => d.id === sd.id || d.name === sd.name);
        if (localMatch && localMatch.url) {
          return {
            ...sd,
            url: localMatch.url,
            pages: (localMatch.pages && localMatch.pages.length > 0) ? localMatch.pages : sd.pages
          };
        }
      }
      return sd;
    });

    return (
      <SharedViewer
        shareRecord={shareRecord}
        documents={sharedDocs}
        folders={rawFolders}
        tabs={tabs}
        onUploadClientFile={async (docId, file) => {
          await handleUploadToFileSlot(docId, file);
          setCloudShareData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              docs: (prev.docs || []).map((d) => d.id === docId ? { ...d, hasFile: true } : d)
            };
          });
        }}
        onClientUploadNewDoc={async (collectionId, file, folderId) => {
          const fileType = detectFileType(file.name, file.type);
          const docId = generateUUID();
          const { url } = await uploadFileOnline(file, shareRecord?.ownerId, docId);
          let notesWithFolder = '';
          if (folderId) {
            notesWithFolder = `[folderId:${folderId}]`;
          }
          const newItem: DocumentItem = {
            id: docId,
            name: file.name,
            collectionId,
            folderId,
            notes: notesWithFolder,
            fileType,
            fileSize: file.size,
            url,
            hasFile: true,
            status: 'pending',
            uploadedBy: 'client',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          syncSingleDocumentToSupabase(newItem, shareRecord?.ownerId);
          setDocuments((prev) => [newItem, ...prev]);
          setCloudShareData((prev) => {
            if (!prev) return prev;
            return {
              ...prev,
              docs: [newItem, ...(prev.docs || [])]
            };
          });
        }}
        onUpdateStatus={handleUpdateDocumentStatus}
        onBackToApp={() => {
          window.history.pushState({}, '', window.location.pathname);
          setShareParam(null);
        }}
      />
    );
  }

  // If ?portal=staff is requested and no staff member is logged in, show the Staff Login screen!
  if (portalParam === 'staff' && !currentStaffSession) {
    return (
      <StaffLogin
        companyName={user?.companyName || 'DocVault Legal Chambers'}
        companyLogo={user?.companyLogo}
        onStaffLogin={(member) => {
          setCurrentStaffSession(member);
        }}
        onBackToSolicitor={() => {
          const url = new URL(window.location.href);
          url.searchParams.delete('portal');
          window.history.replaceState({}, '', url.toString());
          setPortalParam(null);
        }}
      />
    );
  }

  // If not logged in as Solicitor and not in a staff session, show the Create Your Account or Sign In screen
  if (!user && !currentStaffSession) {
    return (
      <AuthScreen
        onAuthenticated={(profile) => {
          setUser(profile);
          saveSolicitorProfile(profile);
        }}
      />
    );
  }

  // Effective profile for display
  const effectiveUser: SolicitorProfile = user || {
    id: '4da299cb-ab44-42e5-981b-36de3e4a2555',
    email: currentStaffSession?.email || 'staff@lawchambers.co.uk',
    displayName: currentStaffSession?.name || 'Staff Member',
    companyName: 'DocVault Legal Chambers',
    pinCode: '1234',
    isDemoMode: false,
    role: 'staff'
  };

  return (
    <div className="h-screen w-screen bg-white flex flex-col selection:bg-[#c2e7ff] selection:text-[#001d35] overflow-hidden">
      {/* Top Header */}
      <Header
        user={effectiveUser}
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
        onOpenPricing={() => setIsPricingOpen(true)}
        onOpenStaffManagement={() => setIsStaffManagementOpen(true)}
        currentStaffSession={currentStaffSession}
        onStaffLogout={handleStaffLogout}
        onSignOut={() => {
          if (currentStaffSession) {
            handleStaffLogout();
          } else if (confirm('Are you sure you want to sign out?')) {
            saveSolicitorProfile(null);
            setUser(null);
          }
        }}
        onChangePinClick={() => setIsChangePinOpen(true)}
        onOpenDiscountKeys={() => setIsDiscountKeysOpen(true)}
        selectedCount={selectedDocIds.length}
        activeDocument={activeDoc}
        onExportSelected={() => exportMultipleDocuments(selectedDocuments, `${activeTab.name}_Selected.zip`, folders)}
        onExportCurrent={() => activeDoc && exportSingleDocument(activeDoc)}
        onExportCurrentAsPdf={() => activeDoc && exportAsPdf(activeDoc)}
        onExportCurrentAsJpg={() => activeDoc && exportAsJpg(activeDoc)}
        onExportAll={() => exportMultipleDocuments(tabDocuments, `${activeTab.name}_Complete.zip`, folders)}
      />

      {/* LEVEL 1: Main Company Page & Clients Directory */}
      {!selectedClient ? (
        <CompanyDashboard
          solicitor={effectiveUser}
          clients={visibleClients}
          tabs={tabs}
          documents={documents}
          staffList={staffList}
          onSelectClient={handleSelectClient}
          onOpenNewClientModal={() => {
            if (currentStaffSession && currentStaffSession.permissions?.canEdit === false) {
              alert('Your staff account does not have permission to add new client cases.');
              return;
            }
            setIsNewClientOpen(true);
          }}
          onDeleteClient={handleDeleteClient}
          onQuickShareClient={handleQuickShareClient}
          onEditCompanyProfile={() => setIsAuthOpen(true)}
          onUpdateFirmTheme={handleUpdateFirmTheme}
          onAddStaffMember={handleAddStaffMember}
          onDeleteStaffMember={handleDeleteStaffMember}
          onAssignStaffToClient={handleAssignStaffToClient}
          onEditClient={handleOpenEditClient}
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
          <div 
            className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0 relative"
            onDragOver={(e) => {
              if (e.dataTransfer.types.includes('Files')) {
                e.preventDefault();
                setIsWorkspaceDragging(true);
              }
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setIsWorkspaceDragging(false);
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              setIsWorkspaceDragging(false);
              if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                handleUploadFiles(e.dataTransfer.files);
              }
            }}
          >
            {/* Workspace-level Drag & Drop Visual Overlay */}
            {isWorkspaceDragging && (
              <div 
                className="absolute inset-0 z-50 bg-[#1a73e8]/10 backdrop-blur-xs border-2 border-dashed border-[#1a73e8] rounded-xl flex flex-col items-center justify-center p-8 pointer-events-none"
              >
                <div className="bg-white px-8 py-6 rounded-2xl shadow-xl border border-[#dadce0] flex flex-col items-center text-center">
                  <div className="w-16 h-16 rounded-full bg-[#e8f0fe] flex items-center justify-center text-[#1a73e8] mb-3">
                    <UploadCloud className="w-8 h-8 animate-bounce" />
                  </div>
                  <p className="text-lg font-bold text-[#202124]">Drop files to upload</p>
                  <p className="text-sm text-[#5f6368] mt-1">
                    Files will be added to <span className="font-semibold text-[#1a73e8]">{activeTab?.name || 'Active Tab'}</span>
                  </p>
                </div>
              </div>
            )}
            {/* Left Documents List */}
            <div className={`${mobilePane === 'viewer' ? 'hidden md:flex' : 'flex'} w-full md:w-[380px] lg:w-[420px] flex-col border-r border-[#dadce0] bg-white h-full overflow-hidden flex-shrink-0`}>
              <DocumentList
                documents={tabDocuments}
                folders={tabFolders}
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
                onBatchDeleteDocs={handleBatchDeleteDocs}
                onBatchMoveDocsToFolder={handleBatchMoveDocsToFolder}
                onBatchAutoNumberDocs={handleBatchAutoNumberDocs}
                onBatchUpdateStatus={handleBatchUpdateStatus}
                onShareDocument={(doc, e) => {
                  e.stopPropagation();
                  setActiveDocId(doc.id);
                  setIsShareOpen(true);
                }}
                onExportDocument={(doc, e) => {
                  e.stopPropagation();
                  exportSingleDocument(doc);
                }}
                onExportAsJpg={(doc, e) => {
                  e?.stopPropagation();
                  exportAsJpg(doc);
                }}
                onOpenUploadModal={() => setIsUploadModalOpen(true)}
                onAddPageToDoc={handleAddPageToDoc}
                onRenameDocument={handleRenameDocument}
                onCreateFolder={handleCreateFolder}
                onRenameFolder={handleRenameFolder}
                onUpdateFolderColor={handleUpdateFolderColor}
                onDeleteFolder={handleDeleteFolder}
                onMoveDocToFolder={handleMoveDocToFolder}
                onUploadFilesToFolder={handleUploadFilesToFolder}
                onReorderDocument={handleReorderDocument}
                onMoveDocPosition={handleMoveDocPosition}
                onCreateBlankDoc={handleCreateBlankDoc}
                onSyncLocalDocs={handleSyncLocalDocs}
                onUpdateDocNotes={handleUpdateDocNotes}
                tabTitle={activeTab.name}
                solicitor={user}
                clientName={selectedClient?.name}
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
                onRenameDocument={handleRenameDocument}
                onRenamePage={handleRenamePage}
                onUpdateDocumentRotation={handleUpdateDocumentRotation}
                onUpdateDocumentContent={handleUpdateDocumentContent}
                solicitor={user}
                clientName={selectedClient?.name}
                tabTitle={activeTab.name}
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
        allTabDocuments={tabDocuments}
        allTabFolders={tabFolders}
        currentTab={activeTab}
        onSaveShare={(share) => saveShare(share)}
        user={effectiveUser}
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
        staffList={staffList}
      />

      {editingClient && (
        <EditClientModal
          isOpen={isEditClientOpen}
          onClose={() => { setIsEditClientOpen(false); setEditingClient(null); }}
          client={editingClient}
          staffList={staffList}
          onSave={handleSaveEditClient}
        />
      )}
      <UploadDocumentsModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSaveMultiPageDoc={handleSaveMultiPageDoc}
        onBatchUploadFiles={handleBatchUpload}
      />

      <PricingModal
        isOpen={isPricingOpen}
        onClose={() => setIsPricingOpen(false)}
      />

      <ChangePinModal
        isOpen={isChangePinOpen}
        onClose={() => setIsChangePinOpen(false)}
      />

      <DiscountKeysModal
        isOpen={isDiscountKeysOpen}
        onClose={() => setIsDiscountKeysOpen(false)}
      />

      <StaffManagementModal
        isOpen={isStaffManagementOpen}
        onClose={() => setIsStaffManagementOpen(false)}
        staffList={staffList}
        clients={clients}
        onSaveStaffMember={(member) => {
          saveStaffMember(member, user?.id);
          setStaffList(getStaff());
        }}
        onDeleteStaffMember={(id) => {
          deleteStaffMember(id, user?.id);
          setStaffList(getStaff());
        }}
        onOpenStaffPortal={() => {
          setIsStaffManagementOpen(false);
          setPortalParam('staff');
        }}
      />

      <UploadProgressToast progress={uploadProgress} />

      {/* FOOLPROOF 30-DAY TRIAL EXPIRED LOCKOUT OVERLAY */}
      {trial.isExpired && !isOwner && !trialUnlocked && (
        <div className="fixed inset-0 z-50 bg-[#202124]/85 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
          <div className="bg-white border border-[#dadce0] rounded-3xl shadow-2xl max-w-md w-full p-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#fce8e6] text-[#d93025] flex items-center justify-center mb-4 ring-4 ring-red-50">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <h2 className="font-['Google_Sans',sans-serif] text-xl font-bold text-[#202124]">
              30-Day Free Trial Ended
            </h2>
            <p className="text-xs text-[#5f6368] mt-2 leading-relaxed">
              Your 30-day evaluation period for DocVault has concluded. All client case files and documents remain completely safe and encrypted in your local vault.
            </p>

            <div className="w-full mt-6 space-y-3">
              <button
                type="button"
                onClick={() => setIsPricingOpen(true)}
                className="w-full py-3 px-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Choose a Subscription Plan (PayPal)</span>
              </button>

              <form onSubmit={handleUnlockTrial} className="mt-4 pt-4 border-t border-[#f1f3f4] space-y-2">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#5f6368] text-left">
                  Have a VIP or License Key?
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={trialUnlockKey}
                    onChange={(e) => {
                      setTrialUnlockKey(e.target.value.toUpperCase());
                      setTrialUnlockError('');
                    }}
                    placeholder="e.g. VIP100 or License Key"
                    className="flex-1 px-3 py-2 text-xs font-mono uppercase font-bold border border-[#dadce0] rounded-xl focus:outline-none focus:border-[#1a73e8]"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#202124] hover:bg-black text-white text-xs font-semibold rounded-xl transition-colors"
                  >
                    Unlock
                  </button>
                </div>
                {trialUnlockError && (
                  <p className="text-xs text-[#d93025] text-left">{trialUnlockError}</p>
                )}
              </form>
            </div>

            <div className="mt-6 pt-4 border-t border-[#f1f3f4] text-xs text-[#5f6368]">
              Contact administrator:{' '}
              <a href="mailto:rana.abdullah.inayat@gmail.com" className="text-[#1a73e8] font-medium hover:underline">
                rana.abdullah.inayat@gmail.com
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


export default App;
