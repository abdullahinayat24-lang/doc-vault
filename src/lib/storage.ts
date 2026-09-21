import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { DocumentItem, CollectionTab, ShareRecord, SolicitorProfile, FileType, DocumentStatus } from '../types';
import { initialTabs, initialDocuments, initialSolicitorProfile } from './sampleDocs';
import { supabase, isSupabaseConfigured } from './supabase';

const TABS_KEY = 'docvault_collection_tabs';
const DOCS_KEY = 'docvault_documents';
const SHARES_KEY = 'docvault_shares';
const PROFILE_KEY = 'docvault_solicitor_profile';
const PIN_KEY = 'docvault_lock_pin';

export const getInitialTabs = (): CollectionTab[] => {
  const saved = localStorage.getItem(TABS_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return initialTabs;
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
  return initialDocuments;
};

export const saveDocuments = (docs: DocumentItem[]) => {
  localStorage.setItem(DOCS_KEY, JSON.stringify(docs));
};

export const getSolicitorProfile = (): SolicitorProfile => {
  const saved = localStorage.getItem(PROFILE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      // ignore
    }
  }
  return initialSolicitorProfile;
};

export const saveSolicitorProfile = (profile: SolicitorProfile) => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
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

// Convert image/url to Image element
const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};

// Export original format
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

// Convert and export as PDF
export const exportAsPdf = async (doc: DocumentItem) => {
  if (!doc.hasFile || !doc.url) return;

  if (doc.fileType === 'pdf') {
    return exportSingleDocument(doc);
  }

  try {
    // If it's an image, convert to PDF page using jsPDF
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

// Convert and export as JPG/JPEG
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

// Export multiple documents as a ZIP
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
