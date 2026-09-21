// Native IndexedDB storage engine for DocVault
// Stores large document files, PDFs, and high-res images without the 5MB browser localStorage limit.

import { DocumentItem } from '../types';

const DB_NAME = 'DocVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'documents';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not supported in this environment'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const idbSaveDocuments = async (docs: DocumentItem[]): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const getAllReq = store.getAll();
    getAllReq.onsuccess = () => {
      const existingDocs: DocumentItem[] = getAllReq.result || [];
      const existingMap = new Map(existingDocs.map((d) => [d.id, d]));

      store.clear();
      for (const doc of docs) {
        const existing = existingMap.get(doc.id);
        const validUrl = doc.url && doc.url.length > 0 ? doc.url : existing?.url;
        store.put({
          ...doc,
          url: validUrl || '',
          hasFile: Boolean((validUrl && validUrl.length > 0) || doc.hasFile)
        });
      }
    };

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('idbSaveDocuments error:', err);
  }
};

export const idbGetDocuments = async (): Promise<DocumentItem[]> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch (err) {
    console.warn('idbGetDocuments error:', err);
    return [];
  }
};
