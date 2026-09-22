import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import * as pdfjsLib from 'pdfjs-dist';
import mammoth from 'mammoth';
import { DocumentItem, CollectionTab, ShareRecord, SolicitorProfile, FileType, DocumentStatus, ClientRecord, InviteKeyRecord, DocumentFolder, StaffMember } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';
import { idbSaveDocuments, idbGetDocuments } from './idbStorage';

// Configure PDF.js worker for storage operations
if (typeof window !== 'undefined' && 'Worker' in window && !pdfjsLib.GlobalWorkerOptions?.workerSrc) {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
}

export { idbGetDocuments, idbSaveDocuments };

const CLIENTS_KEY = 'docvault_clients';
const TABS_KEY = 'docvault_collection_tabs';
const DOCS_KEY = 'docvault_documents';
const FOLDERS_KEY = 'docvault_document_folders';
const SHARES_KEY = 'docvault_shares';
const PROFILE_KEY = 'docvault_solicitor_profile';
const PIN_KEY = 'docvault_lock_pin';

export const generateUUID = (): string => {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    try {
      return crypto.randomUUID();
    } catch {}
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export const isUUID = (str?: string): boolean => {
  return Boolean(str && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str));
};

export const toDeterministicUUID = (str?: string): string => {
  if (!str) return generateUUID();
  if (isUUID(str)) return str;
  let hash1 = 0xdeadbeef;
  let hash2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    hash1 = Math.imul(hash1 ^ ch, 2654435761);
    hash2 = Math.imul(hash2 ^ ch, 1597334677);
  }
  hash1 = (hash1 ^ (hash1 >>> 16)) >>> 0;
  hash2 = (hash2 ^ (hash2 >>> 16)) >>> 0;
  const p1 = hash1.toString(16).padStart(8, '0');
  const p2 = hash2.toString(16).padStart(8, '0');
  return `${p1.slice(0, 8)}-${p2.slice(0, 4)}-4000-8000-${p1}${p2.slice(4, 8)}`.toLowerCase();
};

export const ensureUserProfileInSupabase = async (user: SolicitorProfile) => {
  if (!supabase || !user?.id || !isUUID(user.id)) return;
  try {
    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      email: user.email || '',
      display_name: user.displayName || user.email?.split('@')[0] || 'Solicitor',
      company_name: user.companyName || 'My Legal Practice',
      phone: user.phone || null,
      pin_code: user.pinCode || '1234'
    }, { onConflict: 'id' });
    if (error) {
      console.warn('ensureUserProfile note:', error.message);
    }
  } catch (err) {
    console.warn('ensureUserProfile exception:', err);
  }
};

export const getClients = (): ClientRecord[] => {
  const saved = localStorage.getItem(CLIENTS_KEY);
  if (saved) {
    try {
      const parsed: ClientRecord[] = JSON.parse(saved);
      return parsed.map((c) => ({
        ...c,
        id: toDeterministicUUID(c.id)
      }));
    } catch {
      // ignore
    }
  }
  return []; // Empty by default
};

export const syncClientToSupabase = async (client: ClientRecord, solicitorId?: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const authUser = (await supabase.auth.getUser())?.data?.user;
    const resolvedSolicitorId = solicitorId || authUser?.id;

    const safeClientId = toDeterministicUUID(client.id);

    const payload: any = {
      id: safeClientId,
      name: client.name || 'Unnamed Client',
      phone: client.phone || '0000000000',
      email: client.email || '',
      came_for: client.cameFor || 'General Case',
      priority: client.priority || 'normal',
      total_asking_amount: client.totalAskingAmount || 0,
      total_doc_cost: client.totalDocCost || 0,
      amount_paid: client.amountPaid || 0,
      visit_count: client.visitCount || 1,
      first_visit_date: client.firstVisitDate || new Date().toISOString(),
      last_visit_date: client.lastVisitDate || new Date().toISOString(),
      notes: client.notes || ''
    };

    if (isUUID(resolvedSolicitorId)) {
      payload.solicitor_id = resolvedSolicitorId;
    }

    const { error } = await supabase.from('clients').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase client sync note:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase client sync exception:', err);
    return false;
  }
};

export const deleteClientFromSupabase = async (clientId: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const safeId = toDeterministicUUID(clientId);
    const { error } = await supabase.from('clients').delete().eq('id', safeId);
    if (error) {
      console.warn('deleteClientFromSupabase note:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('deleteClientFromSupabase exception:', err);
    return false;
  }
};

export const syncClientsToSupabase = async (clients: ClientRecord[], solicitorId?: string) => {
  if (!supabase) return;
  for (const c of clients) {
    await syncClientToSupabase(c, solicitorId).catch(() => {});
  }
};

export const fetchClientsFromSupabase = async (solicitorId?: string): Promise<ClientRecord[] | null> => {
  if (!supabase) return null;
  try {
    const authUser = (await supabase.auth.getUser())?.data?.user;
    const resolvedId = solicitorId || authUser?.id;

    let query = supabase.from('clients').select('*');
    if (isUUID(resolvedId)) {
      query = query.eq('solicitor_id', resolvedId);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) return null;

    return data.map((c: any): ClientRecord => ({
      id: c.id,
      name: c.name,
      phone: c.phone || '',
      email: c.email || '',
      cameFor: c.came_for || 'General Case',
      priority: c.priority || 'normal',
      totalDocCost: parseFloat(c.total_doc_cost || '0'),
      totalAskingAmount: parseFloat(c.total_asking_amount || '0'),
      amountPaid: parseFloat(c.amount_paid || '0'),
      firstVisitDate: c.first_visit_date || new Date().toISOString(),
      lastVisitDate: c.last_visit_date || new Date().toISOString(),
      visitCount: c.visit_count || 1,
      notes: c.notes || undefined,
      createdAt: c.created_at || new Date().toISOString(),
      updatedAt: c.updated_at || new Date().toISOString()
    }));
  } catch (err) {
    console.warn('Failed to fetch clients from Supabase:', err);
    return null;
  }
};

export const syncTabToSupabase = async (tab: CollectionTab, solicitorId?: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const authUser = (await supabase.auth.getUser())?.data?.user;
    const resolvedSolicitorId = solicitorId || authUser?.id;

    const safeTabId = toDeterministicUUID(tab.id);
    const safeClientId = tab.clientId ? toDeterministicUUID(tab.clientId) : undefined;

    const payload: any = {
      id: safeTabId,
      name: tab.name || 'Case Application',
      case_number: tab.caseNumber || null,
      icon: tab.icon || 'briefcase',
      is_default: tab.isDefault || false
    };

    if (isUUID(resolvedSolicitorId)) {
      payload.solicitor_id = resolvedSolicitorId;
    }
    if (safeClientId && isUUID(safeClientId)) {
      payload.client_id = safeClientId;
    }

    const { error } = await supabase.from('collections').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase tab sync note:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase tab sync exception:', err);
    return false;
  }
};

export const deleteTabFromSupabase = async (tabId: string): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const safeId = toDeterministicUUID(tabId);
    const { error } = await supabase.from('collections').delete().eq('id', safeId);
    if (error) {
      console.warn('deleteTabFromSupabase note:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('deleteTabFromSupabase exception:', err);
    return false;
  }
};

export const syncTabsToSupabase = async (tabs: CollectionTab[], solicitorId?: string) => {
  if (!supabase) return;
  for (const t of tabs) {
    await syncTabToSupabase(t, solicitorId).catch(() => {});
  }
};

export const fetchTabsFromSupabase = async (solicitorId?: string): Promise<CollectionTab[] | null> => {
  if (!supabase) return null;
  try {
    const authUser = (await supabase.auth.getUser())?.data?.user;
    const resolvedId = solicitorId || authUser?.id;

    let query = supabase.from('collections').select('*');
    if (isUUID(resolvedId)) {
      query = query.eq('solicitor_id', resolvedId);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) return null;

    return data.map((t: any): CollectionTab => ({
      id: t.id,
      clientId: t.client_id || '',
      name: t.name,
      caseNumber: t.case_number || undefined,
      icon: t.icon || 'briefcase',
      isDefault: t.is_default || false,
      createdAt: t.created_at || new Date().toISOString(),
      updatedAt: t.updated_at || new Date().toISOString()
    }));
  } catch (err) {
    console.warn('Failed to fetch tabs from Supabase:', err);
    return null;
  }
};

export const saveClients = (clients: ClientRecord[], solicitorId?: string) => {
  try {
    localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
  } catch (err) {
    console.warn('saveClients quota error:', err);
  }
  syncClientsToSupabase(clients, solicitorId).catch(() => {});
};

export const getInitialTabs = (): CollectionTab[] => {
  const saved = localStorage.getItem(TABS_KEY);
  if (saved) {
    try {
      const parsed: CollectionTab[] = JSON.parse(saved);
      return parsed.map((t) => ({
        ...t,
        id: toDeterministicUUID(t.id),
        clientId: t.clientId ? toDeterministicUUID(t.clientId) : ''
      }));
    } catch {
      // ignore
    }
  }
  return []; // Empty by default
};

export const saveTabs = (tabs: CollectionTab[], solicitorId?: string) => {
  try {
    localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
  } catch (err) {
    console.warn('saveTabs quota error:', err);
  }
  syncTabsToSupabase(tabs, solicitorId).catch(() => {});
};

export const getInitialFolders = (): DocumentFolder[] => {
  const saved = localStorage.getItem(FOLDERS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return []; // Empty by default
};

export const saveFolders = (folders: DocumentFolder[], clientId?: string, solicitorId?: string) => {
  try {
    localStorage.setItem(FOLDERS_KEY, JSON.stringify(folders));
  } catch (err) {
    console.warn('saveFolders quota error:', err);
  }
  syncFoldersToSupabase(folders, clientId, solicitorId).catch(() => {});
};

export const getInitialDocuments = (): DocumentItem[] => {
  const saved = localStorage.getItem(DOCS_KEY);
  if (saved) {
    try {
      const parsed: DocumentItem[] = JSON.parse(saved);
      return parsed.map((d) => ({
        ...d,
        id: toDeterministicUUID(d.id),
        clientId: d.clientId ? toDeterministicUUID(d.clientId) : undefined
      }));
    } catch {
      // ignore
    }
  }
  return []; // Empty by default
};

/**
 * Uploads a file directly online:
 * 1. Attempts Supabase Storage bucket 'documents'
 * 2. Fallback to instant worldwide cloud binary hosting (bytebin)
 * 3. Fallback to local Data URL
 */
export const uploadFileOnline = async (
  file: File,
  userId?: string,
  docId?: string
): Promise<{ url: string; online: boolean }> => {
  const safeId = docId || generateUUID();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

  // Strategy 1: Supabase Storage bucket 'documents'
  if (supabase) {
    try {
      const storagePath = userId ? `${userId}/${safeId}_${safeName}` : `public/${safeId}_${safeName}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('documents')
        .upload(storagePath, file, { cacheControl: '3600', upsert: true });

      if (!uploadErr && uploadData) {
        const { data: pub } = supabase.storage.from('documents').getPublicUrl(storagePath);
        if (pub?.publicUrl) {
          return { url: pub.publicUrl, online: true };
        }
      }
    } catch (e) {
      console.warn('Supabase storage attempt note:', e);
    }
  }

  // Strategy 2: High-capacity cloud storage (Litterbox, up to 1GB with CORS)
  try {
    const fd = new FormData();
    fd.append('reqtype', 'fileupload');
    fd.append('time', '72h');
    fd.append('fileToUpload', file, safeName);

    const res = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
      method: 'POST',
      body: fd
    });
    if (res.ok) {
      const onlineUrl = (await res.text()).trim();
      if (onlineUrl && onlineUrl.startsWith('http')) {
        return { url: onlineUrl, online: true };
      }
    }
  } catch (e) {
    console.warn('Litterbox upload note:', e);
  }

  // Strategy 3: Fast reliable online cloud binary store (Bytebin for files < 10MB)
  if (file.size < 10 * 1024 * 1024) {
    try {
      const res = await fetch('https://bytebin.lucko.me/post', {
        method: 'POST',
        headers: {
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      });
      if (res.ok) {
        const json = await res.json();
        if (json && json.key) {
          const onlineUrl = `https://bytebin.lucko.me/${json.key}`;
          return { url: onlineUrl, online: true };
        }
      }
    } catch (e) {
      console.warn('Bytebin online upload fallback note:', e);
    }
  }

  // Strategy 4: Local Data URL fallback (stored safely in browser IndexedDB)
  return new Promise<{ url: string; online: boolean }>((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve({ url: (e.target?.result as string) || '', online: false });
    reader.onerror = () => resolve({ url: '', online: false });
    reader.readAsDataURL(file);
  });
};

export const saveDocuments = (docs: DocumentItem[], solicitorId?: string) => {
  // Always persist full documents with unlimited quota to native IndexedDB
  idbSaveDocuments(docs).catch((e) => console.warn('IndexedDB save note:', e));

  // Sync to Supabase cloud database
  syncDocumentsToSupabase(docs, solicitorId).catch((e) => console.warn('Supabase sync note:', e));

  // Also write to localStorage safely without throwing QuotaExceededError
  try {
    localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
  } catch (err) {
    console.warn('localStorage quota reached. Storing full files in IndexedDB, saving lightweight metadata to localStorage:', err);
    try {
      const lightweightDocs = docs.map((d) => ({
        ...d,
        url: d.url && d.url.length > 200000 ? '' : d.url
      }));
      localStorage.setItem(DOCS_KEY, JSON.stringify(lightweightDocs));
    } catch {}
  }
};

export const extractFoldersFromClients = (clients: ClientRecord[]): DocumentFolder[] => {
  const foldersMap = new Map<string, DocumentFolder>();
  for (const c of clients) {
    if (c.notes) {
      const match = c.notes.match(/\[FOLDERS_META:([\s\S]*?)\]/);
      if (match) {
        try {
          const parsed = JSON.parse(match[1]);
          if (Array.isArray(parsed)) {
            parsed.forEach((f: DocumentFolder) => foldersMap.set(f.id, f));
          }
        } catch (e) {
          console.warn('Folder parse error:', e);
        }
      }
    }
  }
  return Array.from(foldersMap.values());
};

export const syncFoldersToSupabase = async (
  folders: DocumentFolder[],
  clientId?: string,
  solicitorId?: string
) => {
  if (!supabase || !folders || folders.length === 0) return;
  try {
    const authUser = (await supabase.auth.getUser())?.data?.user;
    const resolvedSolicitorId = solicitorId || authUser?.id;

    if (clientId) {
      const safeClientId = toDeterministicUUID(clientId);
      const { data: clientData } = await supabase
        .from('clients')
        .select('notes')
        .eq('id', safeClientId)
        .maybeSingle();

      let currentNotes = clientData?.notes || '';
      currentNotes = currentNotes.replace(/\[FOLDERS_META:[\s\S]*?\]/, '').trim();
      const meta = `[FOLDERS_META:${JSON.stringify(folders)}]`;
      const updatedNotes = currentNotes ? `${currentNotes} ${meta}` : meta;

      await supabase
        .from('clients')
        .update({ notes: updatedNotes })
        .eq('id', safeClientId);
    }
  } catch (err) {
    console.warn('Supabase folder sync note:', err);
  }
};

export const syncSingleDocumentToSupabase = async (
  doc: DocumentItem, 
  solicitorId?: string,
  fallbackClientId?: string
): Promise<boolean> => {
  if (!supabase) return false;
  try {
    const authUser = (await supabase.auth.getUser())?.data?.user;
    const resolvedSolicitorId = solicitorId || authUser?.id;

    const docId = toDeterministicUUID(doc.id);
    const safeUrl = doc.url && doc.url.startsWith('data:') && doc.url.length > 300000 ? '' : doc.url;

    let notesWithFolder = doc.notes || '';
    if (doc.folderId && !notesWithFolder.includes(`[folderId:`)) {
      notesWithFolder = `[folderId:${doc.folderId}] ${notesWithFolder}`.trim();
    }

    const resolvedClientId = toDeterministicUUID(doc.clientId || fallbackClientId);
    const resolvedCollectionId = toDeterministicUUID(doc.collectionId);

    const payload: any = {
      id: docId,
      name: doc.name,
      file_type: doc.fileType || 'pdf',
      file_size: doc.fileSize || 0,
      url: safeUrl || '',
      has_file: doc.hasFile !== false,
      status: doc.status || 'pending',
      notes: notesWithFolder,
      client_id: resolvedClientId,
      collection_id: resolvedCollectionId
    };

    if (isUUID(resolvedSolicitorId)) {
      payload.solicitor_id = resolvedSolicitorId;
    }

    const { error } = await supabase.from('documents').upsert(payload, { onConflict: 'id' });
    if (error) {
      console.warn('Supabase single document upsert note:', error.message);
      return false;
    }
    return true;
  } catch (err) {
    console.warn('Supabase single document sync note:', err);
    return false;
  }
};

export const syncDocumentsToSupabase = async (
  docs: DocumentItem[], 
  solicitorId?: string,
  tabs?: CollectionTab[],
  clients?: ClientRecord[]
) => {
  if (!supabase || docs.length === 0) return;
  try {
    const authUser = (await supabase.auth.getUser())?.data?.user;
    const resolvedSolicitorId = solicitorId || authUser?.id;

    const defaultClientId = clients && clients.length > 0 ? toDeterministicUUID(clients[0].id) : undefined;
    const defaultCollectionId = tabs && tabs.length > 0 ? toDeterministicUUID(tabs[0].id) : undefined;

    // Process in batches of 50
    for (let i = 0; i < docs.length; i += 50) {
      const chunk = docs.slice(i, i + 50);
      const batchPayloads: any[] = [];

      for (const doc of chunk) {
        const docId = toDeterministicUUID(doc.id);
        const safeUrl = doc.url && doc.url.startsWith('data:') && doc.url.length > 300000 ? '' : doc.url;

        let notesWithFolder = doc.notes || '';
        if (doc.folderId && !notesWithFolder.includes(`[folderId:`)) {
          notesWithFolder = `[folderId:${doc.folderId}] ${notesWithFolder}`.trim();
        }

        const tabMatch = tabs?.find((t) => t.id === doc.collectionId);
        const resolvedClientId = toDeterministicUUID(doc.clientId || tabMatch?.clientId || defaultClientId);
        const resolvedCollectionId = toDeterministicUUID(doc.collectionId || defaultCollectionId);

        const payload: any = {
          id: docId,
          name: doc.name,
          file_type: doc.fileType || 'pdf',
          file_size: doc.fileSize || 0,
          url: safeUrl || '',
          has_file: doc.hasFile !== false,
          status: doc.status || 'pending',
          notes: notesWithFolder,
          client_id: resolvedClientId,
          collection_id: resolvedCollectionId
        };
        if (isUUID(resolvedSolicitorId)) {
          payload.solicitor_id = resolvedSolicitorId;
        }
        batchPayloads.push(payload);
      }

      const { error } = await supabase.from('documents').upsert(batchPayloads, { onConflict: 'id' });
      if (error) {
        console.warn('Supabase batch document upsert note:', error.message);
      }
    }
  } catch (err) {
    console.warn('Supabase document sync note:', err);
  }
};

export const fetchUserDocumentsFromSupabase = async (userId?: string): Promise<DocumentItem[] | null> => {
  if (!supabase) return null;
  try {
    const authUser = (await supabase.auth.getUser())?.data?.user;
    const resolvedId = userId || authUser?.id;

    let query = supabase.from('documents').select('*');
    if (isUUID(resolvedId)) {
      query = query.eq('solicitor_id', resolvedId);
    }

    const { data, error } = await query;
    if (error || !data || data.length === 0) return null;

    return data.map((d: any): DocumentItem => {
      let folderId: string | undefined = d.folder_id || undefined;
      let cleanNotes = d.notes || '';
      const match = cleanNotes.match(/\[folderId:([^\]]+)\]/);
      if (match) {
        folderId = match[1];
        cleanNotes = cleanNotes.replace(/\[folderId:[^\]]+\]\s*/, '').trim();
      }

      return {
        id: d.id,
        name: d.name,
        fileType: d.file_type || 'pdf',
        fileSize: d.file_size || 0,
        url: d.url || '',
        content: d.content || undefined,
        hasFile: d.has_file !== false,
        status: d.status || 'pending',
        notes: cleanNotes,
        collectionId: d.collection_id || 'default',
        folderId,
        clientId: d.client_id || undefined,
        createdAt: d.created_at || new Date().toISOString(),
        updatedAt: d.updated_at || new Date().toISOString()
      };
    });
  } catch (err) {
    console.warn('Failed to fetch user documents from Supabase:', err);
    return null;
  }
};

export const dataUrlToFile = (dataUrl: string, filename: string): File | null => {
  try {
    if (!dataUrl || !dataUrl.includes(',')) return null;
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  } catch (e) {
    console.warn('dataUrlToFile parse note:', e);
    return null;
  }
};

/**
 * Automatically migrates existing local browser-only documents into the online cloud:
 * 1. Uploads base64 files directly to online cloud storage
 * 2. Assigns standard UUIDs to records
 * 3. Syncs each document to Supabase under the logged-in user
 */
export const migrateLocalDocumentsToCloud = async (
  docs: DocumentItem[],
  userId: string,
  onProgress?: (current: number, total: number) => void
): Promise<DocumentItem[]> => {
  const updatedDocs: DocumentItem[] = [];
  let count = 0;

  for (const doc of docs) {
    const docCopy: DocumentItem = { ...doc };

    // Preserve the original doc.id so local state and cloud state match perfectly

    // If doc has local base64, upload it to cloud storage
    if (docCopy.url && docCopy.url.startsWith('data:')) {
      const file = dataUrlToFile(docCopy.url, docCopy.name);
      if (file) {
        try {
          const { url, online } = await uploadFileOnline(file, userId, docCopy.id);
          if (online && url) {
            docCopy.url = url;
          }
        } catch (e) {
          console.warn('Migrate doc online upload note:', e);
        }
      }
    }

    // If doc has pages with local base64, upload each page
    if (docCopy.pages && docCopy.pages.length > 0) {
      const newPages = [];
      for (const page of docCopy.pages) {
        const pCopy = { ...page };
        if (pCopy.url && pCopy.url.startsWith('data:')) {
          const pFile = dataUrlToFile(pCopy.url, pCopy.name || `${docCopy.name}_page`);
          if (pFile) {
            try {
              const { url, online } = await uploadFileOnline(pFile, userId, pCopy.id);
              if (online && url) {
                pCopy.url = url;
              }
            } catch (e) {
              console.warn('Migrate page online upload note:', e);
            }
          }
        }
        newPages.push(pCopy);
      }
      docCopy.pages = newPages;
    }

    // Sync to Supabase cloud
    await syncSingleDocumentToSupabase(docCopy, userId);
    updatedDocs.push(docCopy);
    count++;
    if (onProgress) onProgress(count, docs.length);
  }

  // Update native IndexedDB cache with clean online URLs
  idbSaveDocuments(updatedDocs).catch(() => {});
  return updatedDocs;
};

export const syncShareToSupabase = async (
  share: ShareRecord, 
  docs?: DocumentItem[], 
  folders?: DocumentFolder[]
) => {
  if (!supabase) return;
  try {
    const payloadData = share.payload || (docs ? { docs, folders: folders || [] } : undefined);
    const targetIds = Array.isArray(share.targetIds) && share.targetIds.length > 0
      ? share.targetIds
      : ['all'];

    let safeScope = share.scope || 'collection';
    if (!['collection', 'single', 'multiple'].includes(safeScope)) {
      safeScope = 'collection';
    }

    const upsertObj: any = {
      id: share.id,
      title: share.title || 'Shared Documents',
      share_type: share.shareType || 'viewer',
      scope: safeScope,
      target_ids: targetIds,
      passcode: share.passcode || '1234',
      allow_client_upload: share.allowClientUpload ?? true,
      created_at: share.createdAt || new Date().toISOString()
    };
    if (share.ownerId && isUUID(share.ownerId)) {
      upsertObj.solicitor_id = share.ownerId;
    }

    if (payloadData) {
      const { error } = await supabase.from('shared_links').upsert({ ...upsertObj, payload: payloadData });
      if (!error) return;
      if (error.message?.includes('payload')) {
        await supabase.from('shared_links').upsert(upsertObj);
      }
    } else {
      await supabase.from('shared_links').upsert(upsertObj);
    }
  } catch (err) {
    console.warn('Supabase share sync note:', err);
  }
};

export const fetchShareFromSupabase = async (
  shareId: string
): Promise<{ share: ShareRecord; docs: DocumentItem[]; folders: DocumentFolder[] } | null> => {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('shared_links').select('*').eq('id', shareId).maybeSingle();
    if (error || !data) return null;

    const payloadShare = data.payload?.share || {};
    const share: ShareRecord = {
      id: data.id,
      title: data.title || payloadShare.title || 'Shared Documents',
      shareType: data.share_type || payloadShare.shareType || 'viewer',
      scope: data.scope || payloadShare.scope || 'collection',
      targetIds: data.target_ids || payloadShare.targetIds || [],
      passcode: data.passcode || payloadShare.passcode || '1234',
      allowClientUpload: data.allow_client_upload ?? payloadShare.allowClientUpload ?? true,
      createdAt: data.created_at || payloadShare.createdAt || new Date().toISOString(),
      ownerId: data.solicitor_id || payloadShare.ownerId || '',
      ownerEmail: payloadShare.ownerEmail || '',
      companyName: payloadShare.companyName || 'DocVault Chambers',
      companyLogo: payloadShare.companyLogo,
      payload: data.payload
    };

    let docs: DocumentItem[] = data.payload?.docs || [];
    let folders: DocumentFolder[] = data.payload?.folders || [];

    // Fallback 1: Query Supabase documents table directly if payload has no docs
    if (docs.length === 0 && data.target_ids && data.target_ids.length > 0) {
      try {
        let docQuery = supabase.from('documents').select('*');
        if (data.scope === 'collection') {
          docQuery = docQuery.in('collection_id', data.target_ids);
        } else {
          docQuery = docQuery.in('id', data.target_ids);
        }
        const { data: dbDocs } = await docQuery;
        if (dbDocs && dbDocs.length > 0) {
          docs = dbDocs.map((d: any): DocumentItem => {
            let folderId: string | undefined = d.folder_id || undefined;
            let cleanNotes = d.notes || '';
            const match = cleanNotes.match(/\[folderId:([^\]]+)\]/);
            if (match) {
              folderId = match[1];
              cleanNotes = cleanNotes.replace(/\[folderId:[^\]]+\]\s*/, '').trim();
            }
            return {
              id: d.id,
              name: d.name,
              fileType: d.file_type || 'pdf',
              fileSize: d.file_size || 0,
              url: d.url || '',
              hasFile: d.has_file !== false,
              status: d.status || 'pending',
              notes: cleanNotes,
              collectionId: d.collection_id || 'default',
              folderId,
              clientId: d.client_id || undefined,
              createdAt: d.created_at || new Date().toISOString(),
              updatedAt: d.updated_at || new Date().toISOString()
            };
          });
        }
      } catch (docErr) {
        console.warn('Direct Supabase document fetch note:', docErr);
      }
    }

    // Fallback 2: Query Supabase clients table directly to extract folders if missing
    if (folders.length === 0) {
      try {
        const clientId = data.client_id || docs[0]?.clientId;
        let clientQuery = supabase.from('clients').select('notes');
        if (clientId) {
          clientQuery = clientQuery.eq('id', clientId);
        } else if (data.solicitor_id) {
          clientQuery = clientQuery.eq('solicitor_id', data.solicitor_id);
        }
        const { data: clientData } = await clientQuery;
        if (clientData && clientData.length > 0) {
          folders = extractFoldersFromClients(clientData as any);
        }
      } catch (folderErr) {
        console.warn('Direct Supabase folder fetch note:', folderErr);
      }
    }

    // Fallback 3: Query Bytebin CDN if docs are still empty
    if (docs.length === 0) {
      try {
        const bRes = await fetch(`https://bytebin.lucko.me/${shareId}`);
        if (bRes.ok) {
          const bData = await bRes.json();
          if (bData && bData.docs && bData.docs.length > 0) {
            docs = bData.docs;
            if (folders.length === 0 && bData.folders) {
              folders = bData.folders;
            }
          }
        }
      } catch {}
    }

    // Cache back into Supabase payload if it was missing
    if (docs.length > 0 && !data.payload) {
      try {
        await supabase
          .from('shared_links')
          .update({ payload: { share, docs, folders } })
          .eq('id', shareId);
      } catch {}
    }

    return { share, docs, folders };
  } catch (err) {
    console.warn('Failed to fetch share from Supabase:', err);
    return null;
  }
};

export const getSolicitorProfile = (): SolicitorProfile | null => {
  const saved = localStorage.getItem(PROFILE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return null; // Null by default -> Triggers Create Account / Sign In screen
};

export const saveSolicitorProfile = (profile: SolicitorProfile | null) => {
  try {
    if (!profile) {
      localStorage.removeItem(PROFILE_KEY);
    } else {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    }
  } catch (err) {
    console.warn('saveSolicitorProfile error:', err);
  }
};

export const clearSession = () => {
  localStorage.removeItem(PROFILE_KEY);
};

export const getLockPin = (): string => {
  return localStorage.getItem(PIN_KEY) || '1234';
};

export const setLockPin = (pin: string) => {
  localStorage.setItem(PIN_KEY, pin);
};

// ─── PIN Brute-Force Lockout ────────────────────────────────────────────────
const PIN_ATTEMPTS_KEY   = 'docvault_pin_attempts';
const PIN_LOCKOUT_KEY    = 'docvault_pin_lockout_until';
const MAX_PIN_ATTEMPTS   = 5;
const LOCKOUT_MINUTES    = 30;

export interface PinAttemptStatus {
  isLockedOut: boolean;
  lockoutMinutesLeft: number;
  attemptsLeft: number;
}

export const getPinAttemptStatus = (): PinAttemptStatus => {
  const lockoutUntil = parseInt(localStorage.getItem(PIN_LOCKOUT_KEY) || '0', 10);
  const now = Date.now();
  if (lockoutUntil && now < lockoutUntil) {
    return {
      isLockedOut: true,
      lockoutMinutesLeft: Math.ceil((lockoutUntil - now) / 60000),
      attemptsLeft: 0,
    };
  }
  // Clear expired lockout
  if (lockoutUntil && now >= lockoutUntil) {
    localStorage.removeItem(PIN_LOCKOUT_KEY);
    localStorage.removeItem(PIN_ATTEMPTS_KEY);
  }
  const attempts = parseInt(localStorage.getItem(PIN_ATTEMPTS_KEY) || '0', 10);
  return {
    isLockedOut: false,
    lockoutMinutesLeft: 0,
    attemptsLeft: Math.max(0, MAX_PIN_ATTEMPTS - attempts),
  };
};

export const recordFailedPinAttempt = (): PinAttemptStatus => {
  const attempts = parseInt(localStorage.getItem(PIN_ATTEMPTS_KEY) || '0', 10) + 1;
  localStorage.setItem(PIN_ATTEMPTS_KEY, String(attempts));
  if (attempts >= MAX_PIN_ATTEMPTS) {
    const lockUntil = Date.now() + LOCKOUT_MINUTES * 60 * 1000;
    localStorage.setItem(PIN_LOCKOUT_KEY, String(lockUntil));
    return { isLockedOut: true, lockoutMinutesLeft: LOCKOUT_MINUTES, attemptsLeft: 0 };
  }
  return { isLockedOut: false, lockoutMinutesLeft: 0, attemptsLeft: MAX_PIN_ATTEMPTS - attempts };
};

export const clearPinAttempts = () => {
  localStorage.removeItem(PIN_ATTEMPTS_KEY);
  localStorage.removeItem(PIN_LOCKOUT_KEY);
};

// ─── Trial System ────────────────────────────────────────────────────────────
const TRIAL_KEY       = 'docvault_trial_start';
const TRIAL_HASH_KEY  = 'docvault_trial_hash';
const TRIAL_DAYS      = 30;

const simpleHash = (str: string): string => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h = (Math.imul(31, h) + ch) | 0;
  }
  return Math.abs(h).toString(36);
};

export const initTrial = () => {
  if (localStorage.getItem(TRIAL_KEY)) return; // Already started
  const start = Date.now().toString();
  const hash  = simpleHash(start + 'docvault-secret');
  localStorage.setItem(TRIAL_KEY, start);
  localStorage.setItem(TRIAL_HASH_KEY, hash);
};

export interface TrialStatus {
  isActive: boolean;
  isExpired: boolean;
  daysLeft: number;
  startDate: Date | null;
  tampered: boolean;
}

export const getTrialStatus = (): TrialStatus => {
  const raw  = localStorage.getItem(TRIAL_KEY);
  const hash = localStorage.getItem(TRIAL_HASH_KEY);

  if (!raw) {
    return { isActive: false, isExpired: false, daysLeft: 0, startDate: null, tampered: false };
  }

  // Tamper check
  const expectedHash = simpleHash(raw + 'docvault-secret');
  if (hash !== expectedHash) {
    return { isActive: false, isExpired: true, daysLeft: 0, startDate: null, tampered: true };
  }

  const start     = parseInt(raw, 10);
  const now       = Date.now();
  const elapsed   = now - start;
  const daysUsed  = Math.floor(elapsed / (1000 * 60 * 60 * 24));
  const daysLeft  = Math.max(0, TRIAL_DAYS - daysUsed);
  const isExpired = daysLeft === 0;

  return {
    isActive:  !isExpired,
    isExpired,
    daysLeft,
    startDate: new Date(start),
    tampered: false,
  };
};

// ─── Promo Codes (admin-managed) ─────────────────────────────────────────────
const PROMO_KEY = 'docvault_promo_codes';

export interface PromoCode {
  id: string;
  code: string;
  label: string;
  discountPct: number;
  active: boolean;
  createdAt: string;
  expiresAt?: string;
}

const DEFAULT_PROMO_CODES: PromoCode[] = [
  { id: 'promo_vip100', code: 'VIP100', label: '100% VIP Complimentary License', discountPct: 100, active: true, createdAt: new Date().toISOString() },
  { id: 'promo_legal50', code: 'LEGAL50', label: '50% Law Firm Launch Discount', discountPct: 50, active: true, createdAt: new Date().toISOString() },
  { id: 'promo_sol20', code: 'SOLICITOR20', label: '20% Chambers Partner Discount', discountPct: 20, active: true, createdAt: new Date().toISOString() },
];

export const getPromoCodes = (): PromoCode[] => {
  try {
    const saved = localStorage.getItem(PROMO_KEY);
    if (!saved) {
      localStorage.setItem(PROMO_KEY, JSON.stringify(DEFAULT_PROMO_CODES));
      return DEFAULT_PROMO_CODES;
    }
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      localStorage.setItem(PROMO_KEY, JSON.stringify(DEFAULT_PROMO_CODES));
      return DEFAULT_PROMO_CODES;
    }
    return parsed;
  } catch {
    return DEFAULT_PROMO_CODES;
  }
};

export const savePromoCode = (promo: PromoCode) => {
  const codes = getPromoCodes();
  const idx = codes.findIndex(c => c.id === promo.id);
  if (idx >= 0) codes[idx] = promo; else codes.push(promo);
  localStorage.setItem(PROMO_KEY, JSON.stringify(codes));
};

export const deletePromoCode = (id: string) => {
  const codes = getPromoCodes().filter(c => c.id !== id);
  localStorage.setItem(PROMO_KEY, JSON.stringify(codes));
};

// ─── Firm Staff Directory ───────────────────────────────────────────────────
const STAFF_KEY = 'docvault_firm_staff';

const DEFAULT_STAFF: StaffMember[] = [
  {
    id: 'staff_1',
    name: 'Sarah Jenkins',
    email: 'sarah.jenkins@lawchambers.co.uk',
    role: 'Partner',
    phone: '+44 20 7946 0912',
    avatarColor: '#1a73e8',
    createdAt: new Date().toISOString()
  },
  {
    id: 'staff_2',
    name: 'David O\'Connor',
    email: 'david.oc@lawchambers.co.uk',
    role: 'Senior Solicitor',
    phone: '+44 20 7946 0915',
    avatarColor: '#137333',
    createdAt: new Date().toISOString()
  },
  {
    id: 'staff_3',
    name: 'Amina Patel',
    email: 'amina.patel@lawchambers.co.uk',
    role: 'Paralegal',
    phone: '+44 20 7946 0920',
    avatarColor: '#9334e6',
    createdAt: new Date().toISOString()
  }
];

export const getStaff = (): StaffMember[] => {
  try {
    const saved = localStorage.getItem(STAFF_KEY);
    if (!saved) {
      localStorage.setItem(STAFF_KEY, JSON.stringify(DEFAULT_STAFF));
      return DEFAULT_STAFF;
    }
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_STAFF;
  } catch {
    return DEFAULT_STAFF;
  }
};

export const saveStaffMember = (member: StaffMember) => {
  const staff = getStaff();
  const idx = staff.findIndex(s => s.id === member.id);
  if (idx >= 0) {
    staff[idx] = member;
  } else {
    staff.push(member);
  }
  localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
};

export const deleteStaffMember = (id: string) => {
  const staff = getStaff().filter(s => s.id !== id);
  localStorage.setItem(STAFF_KEY, JSON.stringify(staff));
};


export const getShares = (): ShareRecord[] => {
  const saved = localStorage.getItem(SHARES_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return [];
};

export const saveShare = (share: ShareRecord) => {
  try {
    const shares = getShares();
    const cleanShare = { ...share };
    // Strip giant base64 payloads before saving to localStorage to prevent QuotaExceededError
    if (cleanShare.payload && cleanShare.payload.docs) {
      cleanShare.payload = {
        ...cleanShare.payload,
        docs: cleanShare.payload.docs.map((d: any) => ({
          ...d,
          url: d.url && d.url.length > 100000 ? '' : d.url
        }))
      };
    }
    const existingIndex = shares.findIndex(s => s.id === cleanShare.id);
    if (existingIndex >= 0) {
      shares[existingIndex] = cleanShare;
    } else {
      shares.push(cleanShare);
    }
    localStorage.setItem(SHARES_KEY, JSON.stringify(shares));
  } catch (err) {
    console.warn('saveShare localStorage quota note:', err);
  }
  syncShareToSupabase(share).catch(() => {});
};

export const getShareById = (id: string): ShareRecord | null => {
  const shares = getShares();
  return shares.find(s => s.id === id) || null;
};

export const detectFileType = (filename: string, mimeType?: string): FileType => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf' || mimeType?.includes('pdf')) return 'pdf';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg', 'bmp', 'ico'].includes(ext || '')) {
    if (ext === 'png') return 'png';
    if (ext === 'jpg' || ext === 'jpeg') return 'jpg';
    if (ext === 'webp') return 'webp';
    if (ext === 'gif') return 'gif';
    return 'png';
  }
  if (ext === 'docx') return 'docx';
  if (ext === 'doc') return 'doc';
  if (ext === 'rtf') return 'rtf';
  if (ext === 'epub' || mimeType?.includes('epub')) return 'epub';
  if (ext === 'txt' || mimeType?.includes('text/plain')) return 'txt';
  if (ext === 'md' || mimeType?.includes('markdown')) return 'md';
  if (ext === 'csv' || mimeType?.includes('csv')) return 'csv';
  if (ext === 'xlsx' || ext === 'xls') return 'xlsx';
  if (ext === 'pptx' || ext === 'ppt') return 'pptx';
  return 'other';
};

export const urlToBlob = async (url: string): Promise<Blob> => {
  if (url.startsWith('data:')) {
    const arr = url.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
  const response = await fetch(url);
  return await response.blob();
};

export const parseUrlToUint8Array = async (url: string): Promise<Uint8Array> => {
  if (url.startsWith('data:')) {
    const base64 = url.split(',')[1] || url;
    const binaryStr = atob(base64);
    const len = binaryStr.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }
    return bytes;
  }
  const response = await fetch(url);
  const ab = await response.arrayBuffer();
  return new Uint8Array(ab);
};

export const convertTextOrHtmlToJpgBlob = async (
  content: string,
  title: string = 'Document'
): Promise<Blob | null> => {
  try {
    const width = 1240;
    const padding = 70;
    const contentWidth = width - padding * 2;

    // Extract human-readable text from HTML or markdown
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    const rawText = tempDiv.innerText || tempDiv.textContent || content;
    const paragraphs = rawText.split(/\r?\n/);

    const testCanvas = document.createElement('canvas');
    const testCtx = testCanvas.getContext('2d');
    if (!testCtx) return null;

    const fontTitle = 'bold 26px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    const fontBody = '18px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';
    const lineHeight = 28;

    testCtx.font = fontBody;
    const lines: string[] = [];

    for (const para of paragraphs) {
      if (!para.trim()) {
        lines.push('');
        continue;
      }
      const words = para.split(' ');
      let cur = '';
      for (let i = 0; i < words.length; i++) {
        const test = cur ? `${cur} ${words[i]}` : words[i];
        if (testCtx.measureText(test).width > contentWidth && i > 0) {
          lines.push(cur);
          cur = words[i];
        } else {
          cur = test;
        }
      }
      if (cur) lines.push(cur);
    }

    const headerHeight = 140;
    const totalHeight = Math.max(1754, headerHeight + (lines.length + 3) * lineHeight + padding * 2);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Pure white canvas background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, totalHeight);

    // Brand accent line on top
    ctx.fillStyle = '#1a73e8';
    ctx.fillRect(0, 0, width, 6);

    // Document Title
    ctx.font = fontTitle;
    ctx.fillStyle = '#202124';
    ctx.fillText(title, padding, 65);

    // Divider line
    ctx.strokeStyle = '#e8eaed';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(padding, 90);
    ctx.lineTo(width - padding, 90);
    ctx.stroke();

    // Body text
    ctx.font = fontBody;
    ctx.fillStyle = '#3c4043';
    let y = 135;

    for (const line of lines) {
      if (line) {
        ctx.fillText(line, padding, y);
      }
      y += lineHeight;
    }

    // Footer
    ctx.font = '13px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.fillStyle = '#9aa0a6';
    ctx.fillText('Exported from DocVault', padding, totalHeight - 35);

    return await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.95);
    });
  } catch (err) {
    console.warn('convertTextOrHtmlToJpgBlob error:', err);
    return null;
  }
};

export const convertPdfToJpgBlobs = async (
  pdfSource: string | Uint8Array,
  userRotation: number = 0
): Promise<{ pageNumber: number; blob: Blob }[]> => {
  if (typeof window !== 'undefined' && 'Worker' in window && !pdfjsLib.GlobalWorkerOptions?.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
  }

  let sourceParam: any;
  if (typeof pdfSource === 'string') {
    const bytes = await parseUrlToUint8Array(pdfSource);
    sourceParam = { data: bytes };
  } else {
    sourceParam = { data: pdfSource };
  }

  const loadingTask = pdfjsLib.getDocument(sourceParam);
  const pdf = await loadingTask.promise;
  const results: { pageNumber: number; blob: Blob }[] = [];

  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const totalRotation = ((page.rotate || 0) + (userRotation || 0)) % 360;
    const viewport = page.getViewport({ scale: 2.0, rotation: totalRotation });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;

    // Fill pure white background (crucial: transparent canvas turns black when saved as image/jpeg)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({
      canvasContext: ctx,
      viewport: viewport
    }).promise;

    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.95));
    if (blob) {
      results.push({ pageNumber: pageNum, blob });
    }
  }

  return results;
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

export const getRotatedCanvas = (img: HTMLImageElement, rotation: number = 0): HTMLCanvasElement => {
  const canvas = document.createElement('canvas');
  const rot = ((rotation % 360) + 360) % 360;
  if (rot === 90 || rot === 270) {
    canvas.width = img.height;
    canvas.height = img.width;
  } else {
    canvas.width = img.width;
    canvas.height = img.height;
  }
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rot * Math.PI) / 180);
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
  }
  return canvas;
};

export const exportSingleDocument = async (doc: DocumentItem) => {
  if (!doc.hasFile && !doc.content) {
    alert('This is a document requirement placeholder. No file has been uploaded yet.');
    return;
  }
  try {
    if (doc.content && (!doc.url || doc.fileType === 'txt' || doc.fileType === 'md' || doc.fileType === 'doc' || doc.fileType === 'docx')) {
      const mime = doc.fileType === 'md' ? 'text/markdown' : (doc.fileType === 'doc' || doc.fileType === 'docx') ? 'text/html' : 'text/plain';
      const blob = new Blob([doc.content], { type: `${mime};charset=utf-8` });
      saveAs(blob, doc.name.includes('.') ? doc.name : `${doc.name}.${doc.fileType}`);
      return;
    }
    if (doc.rotation && doc.rotation % 360 !== 0 && ['png', 'jpg', 'jpeg', 'webp'].includes(doc.fileType)) {
      const img = await loadImage(doc.url);
      const canvas = getRotatedCanvas(img, doc.rotation);
      const mime = doc.fileType === 'png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, doc.name);
        } else {
          urlToBlob(doc.url).then((b) => saveAs(b, doc.name));
        }
      }, mime, 0.95);
      return;
    }
    const blob = await urlToBlob(doc.url);
    saveAs(blob, doc.name);
  } catch (err) {
    console.error('Failed to export document:', err);
    const a = document.createElement('a');
    a.href = doc.url;
    a.download = doc.name;
    a.click();
  }
};

export const exportAsPdf = async (doc: DocumentItem) => {
  if (!doc.hasFile && !doc.content && !doc.url) {
    alert('This is a document requirement placeholder. No file has been uploaded yet.');
    return;
  }

  const cleanDocName = (doc.name || 'Document').replace(/[\\/:*?"<>|]/g, '_').replace(/\.[^/.]+$/, '');

  // 1. If it is already a PDF file, downloading it as PDF is already 100% correct!
  if (doc.fileType === 'pdf' && doc.url) {
    return exportSingleDocument(doc);
  }

  // 2. If multi-side/page document (e.g. Front & Back photos)
  if (doc.pages && doc.pages.length > 1) {
    try {
      let pdf: jsPDF | null = null;
      for (let i = 0; i < doc.pages.length; i++) {
        const page = doc.pages[i];
        if (page.fileType === 'pdf') {
          const pdfJpgs = await convertPdfToJpgBlobs(page.url, page.rotation || 0);
          for (const item of pdfJpgs) {
            const pageImgUrl = URL.createObjectURL(item.blob);
            const img = await loadImage(pageImgUrl);
            URL.revokeObjectURL(pageImgUrl);
            const orientation = img.width > img.height ? 'landscape' : 'portrait';
            if (!pdf) {
              pdf = new jsPDF({ orientation, unit: 'px', format: [img.width, img.height] });
              pdf.addImage(img, 'JPEG', 0, 0, img.width, img.height);
            } else {
              pdf.addPage([img.width, img.height], orientation);
              pdf.addImage(img, 'JPEG', 0, 0, img.width, img.height);
            }
          }
          continue;
        }

        const img = await loadImage(page.url);
        const rot = page.rotation !== undefined ? page.rotation : (doc.rotation || 0);
        const canvas = getRotatedCanvas(img, rot);
        const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait';
        const imgData = canvas.toDataURL('image/jpeg', 0.95);
        if (!pdf) {
          pdf = new jsPDF({
            orientation,
            unit: 'px',
            format: [canvas.width, canvas.height]
          });
          pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
        } else {
          pdf.addPage([canvas.width, canvas.height], orientation);
          pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
        }
      }
      if (pdf) {
        pdf.save(`${cleanDocName}.pdf`);
        return;
      }
    } catch (err) {
      console.warn('Multi-page PDF conversion fallback:', err);
    }
  }

  // 3. Word DOCX or Text / Note to PDF: convert to formatted canvas then save with jsPDF
  const isDocxOrText = doc.fileType === 'docx' || doc.fileType === 'doc' || ['txt', 'md', 'rtf'].includes(doc.fileType) || doc.content;
  if (isDocxOrText) {
    try {
      let textOrHtml = doc.content || '';
      if (!textOrHtml && doc.url) {
        if (doc.fileType === 'docx' || doc.name.endsWith('.docx')) {
          const bytes = await parseUrlToUint8Array(doc.url);
          const mammothResult = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer as ArrayBuffer });
          textOrHtml = mammothResult.value;
        } else {
          const bytes = await parseUrlToUint8Array(doc.url);
          textOrHtml = new TextDecoder().decode(bytes);
        }
      }
      if (textOrHtml) {
        const jpgBlob = await convertTextOrHtmlToJpgBlob(textOrHtml, doc.name);
        if (jpgBlob) {
          const pageImgUrl = URL.createObjectURL(jpgBlob);
          const img = await loadImage(pageImgUrl);
          URL.revokeObjectURL(pageImgUrl);
          const orientation = img.width > img.height ? 'landscape' : 'portrait';
          const pdf = new jsPDF({
            orientation,
            unit: 'px',
            format: [img.width, img.height]
          });
          pdf.addImage(img, 'JPEG', 0, 0, img.width, img.height);
          pdf.save(`${cleanDocName}.pdf`);
          return;
        }
      }
    } catch (docPdfErr) {
      console.warn('DOCX/Text to PDF conversion note:', docPdfErr);
    }
  }

  // 4. Standard Image to PDF
  if (doc.url) {
    try {
      const img = await loadImage(doc.url);
      const rot = doc.rotation || 0;
      const canvas = getRotatedCanvas(img, rot);
      const orientation = canvas.width > canvas.height ? 'landscape' : 'portrait';
      const pdf = new jsPDF({
        orientation,
        unit: 'px',
        format: [canvas.width, canvas.height]
      });
      const imgData = canvas.toDataURL('image/jpeg', 0.95);
      pdf.addImage(imgData, 'JPEG', 0, 0, canvas.width, canvas.height);
      pdf.save(`${cleanDocName}.pdf`);
      return;
    } catch (err) {
      console.warn('Image to PDF conversion fallback:', err);
    }
  }

  exportSingleDocument(doc);
};

export const exportAsJpg = async (doc: DocumentItem, targetPageIndex?: number) => {
  if (!doc.hasFile && !doc.content && !doc.url) {
    alert('This is a document requirement placeholder. No file has been uploaded yet.');
    return;
  }

  const cleanDocName = (doc.name || 'Document').replace(/[\\/:*?"<>|]/g, '_').replace(/\.[^/.]+$/, '');

  // 1. Multi-side / multi-page container (e.g. Front & Back photos or attached pages)
  if (doc.pages && doc.pages.length > 1) {
    // If user requested a specific page (0-indexed)
    if (typeof targetPageIndex === 'number' && doc.pages[targetPageIndex]) {
      const page = doc.pages[targetPageIndex];
      const pageCleanName = (page.name || `Side_${targetPageIndex + 1}`).replace(/[\\/:*?"<>|]/g, '_');
      const rot = page.rotation !== undefined ? page.rotation : (doc.rotation || 0);

      try {
        if (page.fileType === 'pdf' || (page.url && page.url.toLowerCase().includes('.pdf'))) {
          const pdfJpgs = await convertPdfToJpgBlobs(page.url, rot);
          if (pdfJpgs.length > 0) {
            saveAs(pdfJpgs[0].blob, `${cleanDocName}_${pageCleanName}.jpg`);
            return;
          }
        } else {
          const img = await loadImage(page.url);
          const canvas = getRotatedCanvas(img, rot);
          const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.95));
          if (blob) {
            saveAs(blob, `${cleanDocName}_${pageCleanName}.jpg`);
            return;
          }
        }
      } catch (err) {
        console.warn(`Could not export specific page ${targetPageIndex} to JPG:`, err);
      }
    }

    // Export ALL pages/sides as real JPGs inside a ZIP archive
    const zip = new JSZip();
    const folder = zip.folder(cleanDocName) || zip;
    let convertedCount = 0;

    for (let i = 0; i < doc.pages.length; i++) {
      const page = doc.pages[i];
      const pageCleanName = (page.name || `Side_${i + 1}`).replace(/[\\/:*?"<>|]/g, '_');
      const rot = page.rotation !== undefined ? page.rotation : (doc.rotation || 0);

      try {
        if (page.fileType === 'pdf' || (page.url && page.url.toLowerCase().includes('.pdf'))) {
          const pdfJpgs = await convertPdfToJpgBlobs(page.url, rot);
          pdfJpgs.forEach((item) => {
            const fileName = pdfJpgs.length > 1
              ? `${pageCleanName}_Page_${item.pageNumber}.jpg`
              : `${pageCleanName}.jpg`;
            folder.file(fileName, item.blob);
            convertedCount++;
          });
        } else {
          const img = await loadImage(page.url);
          const canvas = getRotatedCanvas(img, rot);
          const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.95));
          if (blob) {
            folder.file(`${pageCleanName}.jpg`, blob);
            convertedCount++;
          }
        }
      } catch (err) {
        console.warn(`Could not convert page ${i} to JPG:`, err);
      }
    }

    if (convertedCount > 0) {
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `${cleanDocName}_JPGs.zip`);
      return;
    }
  }

  // 2. PDF Document: Convert PDF pages into genuine high-res JPG images
  const isPdf = doc.fileType === 'pdf' || (doc.url && (doc.url.toLowerCase().includes('.pdf') || doc.url.startsWith('data:application/pdf')));
  if (isPdf && doc.url) {
    try {
      const rot = doc.rotation || 0;
      const pdfJpgs = await convertPdfToJpgBlobs(doc.url, rot);
      if (pdfJpgs.length === 1) {
        // Single page PDF: save directly as .jpg
        saveAs(pdfJpgs[0].blob, `${cleanDocName}.jpg`);
        return;
      } else if (pdfJpgs.length > 1) {
        if (typeof targetPageIndex === 'number' && pdfJpgs[targetPageIndex]) {
          saveAs(pdfJpgs[targetPageIndex].blob, `${cleanDocName}_Page_${targetPageIndex + 1}.jpg`);
          return;
        }
        // Multi-page PDF: package all converted high-res JPG pages into a zip
        const zip = new JSZip();
        const folder = zip.folder(cleanDocName) || zip;
        pdfJpgs.forEach((item) => {
          folder.file(`${cleanDocName}_Page_${item.pageNumber}.jpg`, item.blob);
        });
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        saveAs(zipBlob, `${cleanDocName}_JPG_Pages.zip`);
        return;
      }
    } catch (pdfErr) {
      console.error('PDF to JPG conversion error:', pdfErr);
    }
  }

  // 3. Word DOCX / DOC Document: convert content into high-res A4 JPG
  const isDocx = doc.fileType === 'docx' || doc.fileType === 'doc' || (doc.name && /\.(docx|doc)$/i.test(doc.name));
  if (isDocx) {
    try {
      let textOrHtml = doc.content || '';
      if (!textOrHtml && doc.url) {
        try {
          const bytes = await parseUrlToUint8Array(doc.url);
          const mammothResult = await mammoth.convertToHtml({ arrayBuffer: bytes.buffer as ArrayBuffer });
          textOrHtml = mammothResult.value;
        } catch (mErr) {
          console.warn('Mammoth parse error in JPG export:', mErr);
        }
      }
      if (textOrHtml) {
        const jpgBlob = await convertTextOrHtmlToJpgBlob(textOrHtml, doc.name);
        if (jpgBlob) {
          saveAs(jpgBlob, `${cleanDocName}.jpg`);
          return;
        }
      }
    } catch (docErr) {
      console.error('DOCX to JPG conversion error:', docErr);
    }
  }

  // 4. Text / Markdown / Plain Notes: render formatted A4 JPG
  if (['txt', 'md', 'rtf', 'html'].includes(doc.fileType) || doc.content) {
    try {
      let content = doc.content || '';
      if (!content && doc.url) {
        const bytes = await parseUrlToUint8Array(doc.url);
        content = new TextDecoder().decode(bytes);
      }
      const jpgBlob = await convertTextOrHtmlToJpgBlob(content, doc.name);
      if (jpgBlob) {
        saveAs(jpgBlob, `${cleanDocName}.jpg`);
        return;
      }
    } catch (textErr) {
      console.error('Text to JPG conversion error:', textErr);
    }
  }

  // 5. Standard Image: PNG, WEBP, GIF, SVG, JPG
  if (doc.url) {
    try {
      const img = await loadImage(doc.url);
      const rot = doc.rotation || 0;
      const canvas = getRotatedCanvas(img, rot);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.95));
      if (blob) {
        saveAs(blob, `${cleanDocName}.jpg`);
        return;
      }
    } catch (imgErr) {
      console.error('Image to JPG conversion error:', imgErr);
    }
  }

  alert(`Could not convert "${doc.name}" to JPG format. Please ensure the file is an accessible PDF, Word document, or image.`);
};

export const exportMultipleDocuments = async (
  docs: DocumentItem[], 
  zipFileName: string = 'DocVault_Export.zip',
  folders: DocumentFolder[] = []
) => {
  const availableDocs = docs.filter(d => d.hasFile && (d.url || (d.pages && d.pages.length > 0)));
  if (availableDocs.length === 0) {
    alert('No uploaded files found in the selection to export.');
    return;
  }
  if (availableDocs.length === 1 && (!availableDocs[0].pages || availableDocs[0].pages.length <= 1) && !availableDocs[0].folderId) {
    return exportSingleDocument(availableDocs[0]);
  }

  const zip = new JSZip();
  const rootFolderName = zipFileName.replace(/\.zip$/i, '') || 'Case_Documents';
  const rootZipFolder = zip.folder(rootFolderName) || zip;

  // Helper to resolve folder path chain
  const getFolderPath = (folderId?: string): string[] => {
    if (!folderId) return [];
    const path: string[] = [];
    let currentId: string | undefined = folderId;
    while (currentId) {
      const f = folders.find(item => item.id === currentId);
      if (!f) break;
      const cleanName = f.name.replace(/[\\/:*?"<>|]/g, '_');
      path.unshift(cleanName);
      currentId = f.parentId;
    }
    return path;
  };

  // Helper to obtain or create nested zip folder
  const resolveZipFolder = (folderId?: string) => {
    const pathSegments = getFolderPath(folderId);
    let target = rootZipFolder;
    for (const segment of pathSegments) {
      target = target.folder(segment) || target;
    }
    return target;
  };

  for (const doc of availableDocs) {
    try {
      const targetFolder = resolveZipFolder(doc.folderId);
      if (doc.pages && doc.pages.length > 1) {
        // Multi-side document: Create a dedicated subfolder with the saved document name!
        const cleanDocFolderName = doc.name.replace(/[\\/:*?"<>|]/g, '_').replace(/\.[^/.]+$/, '');
        const docSubFolder = targetFolder.folder(cleanDocFolderName);

        for (let i = 0; i < doc.pages.length; i++) {
          const page = doc.pages[i];
          const rot = page.rotation !== undefined ? page.rotation : (doc.rotation || 0);
          const cleanPageName = (page.name || `Page_${i + 1}`).replace(/[\\/:*?"<>|]/g, '_');
          const ext = page.fileType || 'jpg';
          const filename = cleanPageName.endsWith(`.${ext}`) ? cleanPageName : `${cleanPageName}.${ext}`;

          if (rot && rot % 360 !== 0 && ['png', 'jpg', 'jpeg', 'webp'].includes(page.fileType)) {
            try {
              const img = await loadImage(page.url);
              const canvas = getRotatedCanvas(img, rot);
              const mime = page.fileType === 'png' ? 'image/png' : 'image/jpeg';
              const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, mime, 0.95));
              if (blob) {
                docSubFolder?.file(filename, blob);
                continue;
              }
            } catch {}
          }
          const pageBlob = await urlToBlob(page.url);
          docSubFolder?.file(filename, pageBlob);
        }
      } else {
        // Single file document
        const cleanName = doc.name.replace(/[\\/:*?"<>|]/g, '_');
        if (doc.rotation && doc.rotation % 360 !== 0 && ['png', 'jpg', 'jpeg', 'webp'].includes(doc.fileType)) {
          try {
            const img = await loadImage(doc.url);
            const canvas = getRotatedCanvas(img, doc.rotation);
            const mime = doc.fileType === 'png' ? 'image/png' : 'image/jpeg';
            const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, mime, 0.95));
            if (blob) {
              targetFolder.file(cleanName, blob);
              continue;
            }
          } catch {}
        }
        const blob = await urlToBlob(doc.url);
        targetFolder.file(cleanName, blob);
      }
    } catch (err) {
      console.warn(`Could not add ${doc.name} to zip:`, err);
    }
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, zipFileName);
};

// ============================================================================
// SINGLE-USE INVITATION KEYS SYSTEM (Prevents Sharing & Spam Accounts)
// ============================================================================
const INVITE_KEYS_KEY = 'docvault_invite_keys';
const KEY_SALT = 'DOCVAULT-UK-LEGAL-2026';
const KEY_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export const computeKeyChecksum = (prefix: string): string => {
  let hash = 5381;
  const combined = prefix + '-' + KEY_SALT;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash) + combined.charCodeAt(i);
    hash = hash & hash;
  }
  let res = '';
  let positiveHash = Math.abs(hash);
  for (let i = 0; i < 4; i++) {
    res += KEY_CHARS.charAt(positiveHash % KEY_CHARS.length);
    positiveHash = Math.floor(positiveHash / KEY_CHARS.length) + (i * 13) + 7;
  }
  return res;
};

export const getInviteKeys = (): InviteKeyRecord[] => {
  const saved = localStorage.getItem(INVITE_KEYS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return [];
};

export const saveInviteKeys = (keys: InviteKeyRecord[]) => {
  localStorage.setItem(INVITE_KEYS_KEY, JSON.stringify(keys));
};

export const generateRandomInviteKey = (label?: string): InviteKeyRecord => {
  const segment = (len: number) => {
    let s = '';
    for (let i = 0; i < len; i++) {
      s += KEY_CHARS.charAt(Math.floor(Math.random() * KEY_CHARS.length));
    }
    return s;
  };
  const seg1 = segment(4);
  const seg2 = segment(4);
  const chk = computeKeyChecksum(`${seg1}-${seg2}`);
  const key = `DV-${seg1}-${seg2}-${chk}`;
  const record: InviteKeyRecord = {
    id: 'key_' + Math.random().toString(36).substring(2, 9),
    key,
    createdAt: new Date().toISOString(),
    isUsed: false,
    label: label?.trim() || undefined
  };

  const keys = getInviteKeys();
  keys.unshift(record);
  saveInviteKeys(keys);
  return record;
};

export const deleteInviteKey = (id: string) => {
  const keys = getInviteKeys().filter((k) => k.id !== id);
  saveInviteKeys(keys);
};

export const validateAndConsumeInviteKey = (
  inputKey: string,
  userEmail: string
): { valid: boolean; reason?: string; role?: 'admin' | 'staff' } => {
  const cleanInput = inputKey.trim().toUpperCase();

  // 1. Check Master Admin Key (Firm Owner) -> Grants 'admin' rights (can manage firm and generate keys)
  const masterKey = (
    (import.meta as any).env?.VITE_REGISTRATION_KEY ||
    localStorage.getItem('docvault_registration_key') ||
    'LEGAL-VAULT-2026'
  ).trim().toUpperCase();

  if (cleanInput === masterKey) {
    return { valid: true, role: 'admin' };
  }

  // 2. Check local consumed cache (prevents reuse on this browser)
  const consumedKeyRecord = localStorage.getItem(`docvault_consumed_${cleanInput}`);
  if (consumedKeyRecord) {
    try {
      const parsed = JSON.parse(consumedKeyRecord);
      return {
        valid: false,
        reason: `This one-time key was already used by ${parsed.email || 'another user'} on ${new Date(
          parsed.at || ''
        ).toLocaleDateString()}. It cannot be shared or reused.`
      };
    } catch {
      return { valid: false, reason: 'This one-time license key has already been consumed.' };
    }
  }

  // 3. Check locally stored keys (if seller or shared machine)
  const keys = getInviteKeys();
  const matchedIndex = keys.findIndex((k) => k.key.toUpperCase() === cleanInput);

  if (matchedIndex >= 0) {
    const record = keys[matchedIndex];
    if (record.isUsed) {
      return {
        valid: false,
        reason: `This one-time key was already used by ${record.usedByEmail || 'another user'} on ${new Date(
          record.usedAt || ''
        ).toLocaleDateString()}. It cannot be shared or reused.`
      };
    }
    // Single-use: Consume the key so it cannot ever be reused or shared!
    record.isUsed = true;
    record.usedByEmail = userEmail;
    record.usedAt = new Date().toISOString();
    keys[matchedIndex] = record;
    saveInviteKeys(keys);
    localStorage.setItem(`docvault_consumed_${cleanInput}`, JSON.stringify({ email: userEmail, at: record.usedAt }));
    return { valid: true, role: 'staff' };
  }

  // 4. Verify cryptographic checksum for keys generated on seller device & redeemed on buyer device
  const parts = cleanInput.split('-');
  if (parts.length === 4 && parts[0] === 'DV' && parts[1].length === 4 && parts[2].length === 4 && parts[3].length === 4) {
    const expectedChk = computeKeyChecksum(`${parts[1]}-${parts[2]}`);
    if (parts[3] === expectedChk) {
      // Key is mathematically authentic and authorized by DocVault!
      // Consume it so this device cannot reuse it
      localStorage.setItem(`docvault_consumed_${cleanInput}`, JSON.stringify({ email: userEmail, at: new Date().toISOString() }));
      return { valid: true, role: 'staff' };
    }
  }

  return {
    valid: false,
    reason: 'Invalid Registration Key. Please check the code with your software provider.'
  };
};
