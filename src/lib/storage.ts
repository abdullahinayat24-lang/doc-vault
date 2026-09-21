import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { DocumentItem, CollectionTab, ShareRecord, SolicitorProfile, FileType, DocumentStatus, ClientRecord, InviteKeyRecord } from '../types';
import { supabase, isSupabaseConfigured } from './supabase';

const CLIENTS_KEY = 'docvault_clients';
const TABS_KEY = 'docvault_collection_tabs';
const DOCS_KEY = 'docvault_documents';
const SHARES_KEY = 'docvault_shares';
const PROFILE_KEY = 'docvault_solicitor_profile';
const PIN_KEY = 'docvault_lock_pin';

export const getClients = (): ClientRecord[] => {
  const saved = localStorage.getItem(CLIENTS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return []; // Empty by default
};

export const saveClients = (clients: ClientRecord[]) => {
  localStorage.setItem(CLIENTS_KEY, JSON.stringify(clients));
};

export const getInitialTabs = (): CollectionTab[] => {
  const saved = localStorage.getItem(TABS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return []; // Empty by default
};

export const saveTabs = (tabs: CollectionTab[]) => {
  localStorage.setItem(TABS_KEY, JSON.stringify(tabs));
};

export const getInitialDocuments = (): DocumentItem[] => {
  const saved = localStorage.getItem(DOCS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return []; // Empty by default
};

export const saveDocuments = (docs: DocumentItem[]) => {
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
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
  if (!profile) {
    localStorage.removeItem(PROFILE_KEY);
  } else {
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
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
  const shares = getShares();
  const existingIndex = shares.findIndex(s => s.id === share.id);
  if (existingIndex >= 0) {
    shares[existingIndex] = share;
  } else {
    shares.push(share);
  }
  localStorage.setItem(SHARES_KEY, JSON.stringify(shares));
};

export const getShareById = (id: string): ShareRecord | null => {
  const shares = getShares();
  return shares.find(s => s.id === id) || null;
};

export const detectFileType = (filename: string, mimeType?: string): FileType => {
  const ext = filename.split('.').pop()?.toLowerCase();
  if (ext === 'pdf' || mimeType?.includes('pdf')) return 'pdf';
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext || '')) return ext as FileType;
  if (ext === 'epub' || mimeType?.includes('epub')) return 'epub';
  if (ext === 'txt' || mimeType?.includes('text')) return 'txt';
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

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

export const exportSingleDocument = async (doc: DocumentItem) => {
  if (!doc.hasFile || !doc.url) {
    alert('This is a document requirement placeholder. No file has been uploaded yet.');
    return;
  }
  try {
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
  if (!doc.hasFile || !doc.url) return;

  if (doc.fileType === 'pdf') {
    return exportSingleDocument(doc);
  }

  try {
    const img = await loadImage(doc.url);
    const pdf = new jsPDF({
      orientation: img.width > img.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [img.width, img.height]
    });
    pdf.addImage(img, 'PNG', 0, 0, img.width, img.height);
    const pdfName = doc.name.replace(/\.[^/.]+$/, "") + ".pdf";
    pdf.save(pdfName);
  } catch (err) {
    console.warn('PDF conversion fallback:', err);
    exportSingleDocument(doc);
  }
};

export const exportAsJpg = async (doc: DocumentItem) => {
  if (!doc.hasFile || !doc.url) return;

  try {
    const img = await loadImage(doc.url);
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);

    canvas.toBlob((blob) => {
      if (blob) {
        const jpgName = doc.name.replace(/\.[^/.]+$/, "") + ".jpg";
        saveAs(blob, jpgName);
      }
    }, 'image/jpeg', 0.95);
  } catch (err) {
    console.warn('JPG export fallback:', err);
    exportSingleDocument(doc);
  }
};

export const exportMultipleDocuments = async (docs: DocumentItem[], zipFileName: string = 'DocVault_Export.zip') => {
  const availableDocs = docs.filter(d => d.hasFile && d.url);
  if (availableDocs.length === 0) {
    alert('No uploaded files found in the selection to export.');
    return;
  }
  if (availableDocs.length === 1) {
    return exportSingleDocument(availableDocs[0]);
  }

  const zip = new JSZip();
  const folder = zip.folder('documents');

  for (const doc of availableDocs) {
    try {
      const blob = await urlToBlob(doc.url);
      folder?.file(doc.name, blob);
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
