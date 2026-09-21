import { DocumentItem, SolicitorProfile } from '../types';
import { convertPdfToJpgBlobs, getRotatedCanvas } from './storage';

export interface PrintOptions {
  solicitor?: SolicitorProfile | null;
  clientName?: string;
  tabTitle?: string;
  onProgress?: (message: string) => void;
}

export const isIdCard = (doc: DocumentItem): boolean => {
  if (!doc) return false;
  
  // 1. Explicit 2 pages / sides
  if (doc.pages && doc.pages.length === 2) {
    const p1 = (doc.pages[0].name || '').toLowerCase();
    const p2 = (doc.pages[1].name || '').toLowerCase();
    if ((p1.includes('front') || p1.includes('face') || p1.includes('side 1')) ||
        (p2.includes('back') || p2.includes('rear') || p2.includes('side 2'))) {
      return true;
    }
    // Any 2-sided document in legal practice is almost always an ID or 2-sided certificate
    return true;
  }

  // 2. Keyword check in doc name
  const name = (doc.name || '').toLowerCase();
  const idKeywords = [
    'brp', 'irp', 'id card', 'id-card', 'id_card', 'identity card',
    'driving licence', 'driving license', 'drivers license', 'drivers licence',
    'residence permit', 'residency permit', 'national id', 'citizen card',
    'passport card', 'visa card', 'health card', 'student card',
    'front and back', 'front & back', '2 sides', 'two sides', 'both sides'
  ];
  return idKeywords.some(k => name.includes(k));
};

interface PreparedPage {
  label?: string;
  dataUrl: string;
}

interface PreparedDoc {
  id: string;
  name: string;
  fileType: string;
  isIdCard: boolean;
  notes?: string;
  description?: string;
  pages: PreparedPage[];
  textContent?: string;
}

const blobToDataUrl = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const loadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
};

const rotateImageToDataUrl = async (url: string, rotation: number): Promise<string> => {
  try {
    const img = await loadImage(url);
    if (!rotation || rotation % 360 === 0) {
      return url;
    }
    const canvas = getRotatedCanvas(img, rotation);
    return canvas.toDataURL('image/jpeg', 0.95);
  } catch {
    return url;
  }
};

export const prepareDocumentForPrint = async (
  doc: DocumentItem,
  onProgress?: (msg: string) => void
): Promise<PreparedDoc> => {
  const isId = isIdCard(doc);
  const preparedPages: PreparedPage[] = [];

  // Check if doc has multiple pages/sides
  if (doc.pages && doc.pages.length > 0) {
    for (let i = 0; i < doc.pages.length; i++) {
      const p = doc.pages[i];
      onProgress?.(`Processing ${doc.name} (${p.name || `Page ${i + 1}`})...`);
      
      const rot = p.rotation !== undefined ? p.rotation : (doc.rotation || 0);

      if (p.fileType === 'pdf' || (p.url && p.url.toLowerCase().includes('.pdf'))) {
        try {
          const pdfJpgs = await convertPdfToJpgBlobs(p.url, rot);
          for (const item of pdfJpgs) {
            const dataUrl = await blobToDataUrl(item.blob);
            preparedPages.push({
              label: p.name || `Side ${i + 1}`,
              dataUrl
            });
          }
        } catch (e) {
          console.warn('PDF page conversion for print error:', e);
        }
      } else if (p.url) {
        const rotatedUrl = await rotateImageToDataUrl(p.url, rot);
        preparedPages.push({
          label: p.name || `Side ${i + 1}`,
          dataUrl: rotatedUrl
        });
      }
    }
  } else if (doc.fileType === 'pdf' || (doc.url && doc.url.toLowerCase().includes('.pdf'))) {
    // Single PDF file
    onProgress?.(`Converting PDF: ${doc.name}...`);
    try {
      const pdfJpgs = await convertPdfToJpgBlobs(doc.url, doc.rotation || 0);
      for (const item of pdfJpgs) {
        const dataUrl = await blobToDataUrl(item.blob);
        preparedPages.push({
          label: pdfJpgs.length > 1 ? `Page ${item.pageNumber}` : undefined,
          dataUrl
        });
      }
    } catch (e) {
      console.warn('PDF conversion for print error:', e);
    }
  } else if (doc.url) {
    // Single image file
    onProgress?.(`Loading ${doc.name}...`);
    const rotatedUrl = await rotateImageToDataUrl(doc.url, doc.rotation || 0);
    preparedPages.push({
      label: isId ? 'Front Side' : undefined,
      dataUrl: rotatedUrl
    });
  }

  return {
    id: doc.id,
    name: doc.name,
    fileType: doc.fileType,
    isIdCard: isId,
    notes: doc.notes,
    description: doc.description,
    pages: preparedPages,
    textContent: doc.content
  };
};

export const generatePrintHtml = (
  preparedDocs: PreparedDoc[],
  options?: PrintOptions
): string => {
  const firmName = options?.solicitor?.companyName || 'DocVault Legal Chambers';
  const clientName = options?.clientName || options?.tabTitle || 'Client Case';
  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  let pagesHtml = '';

  for (let docIdx = 0; docIdx < preparedDocs.length; docIdx++) {
    const doc = preparedDocs[docIdx];
    const isLastDoc = docIdx === preparedDocs.length - 1;

    // ── CASE 1: ID Card (BRP, Driving License, 2 Sides) ──
    // Sized properly to standard card dimensions, both sides on ONE single page!
    if (doc.isIdCard && doc.pages.length > 0) {
      const isTwoSided = doc.pages.length >= 2;
      const frontPage = doc.pages[0];
      const backPage = isTwoSided ? doc.pages[1] : null;

      pagesHtml += `
        <div class="print-page id-card-page ${!isLastDoc ? 'page-break' : ''}">
          <div class="print-header">
            <div>
              <div class="firm-title">${firmName}</div>
              <div class="case-title">${clientName} — Certified Identity Document</div>
            </div>
            <div class="print-date">
              <div>Date: ${currentDate}</div>
              <div class="badge-official">ID Document Standard Size</div>
            </div>
          </div>

          <div class="doc-title-bar">
            <h2 class="doc-title">${doc.name}</h2>
            ${doc.description ? `<div class="doc-instruction">📢 ${doc.description}</div>` : ''}
          </div>

          <div class="id-card-layout">
            <div class="id-card-block">
              <div class="card-side-label">${frontPage.label || 'Front Side'}</div>
              <div class="id-card-frame">
                <img src="${frontPage.dataUrl}" alt="ID Front Side" class="id-card-image" />
              </div>
            </div>

            ${backPage ? `
              <div class="id-card-block">
                <div class="card-side-label">${backPage.label || 'Back Side'}</div>
                <div class="id-card-frame">
                  <img src="${backPage.dataUrl}" alt="ID Back Side" class="id-card-image" />
                </div>
              </div>
            ` : ''}
          </div>

          <div class="id-footer-note">
            <span>Verified true likeness copy of original identification card • Printed via DocVault Secure Legal Portal</span>
          </div>
        </div>
      `;
      continue;
    }

    // ── CASE 2: Text / Note Document ──
    if (doc.textContent) {
      pagesHtml += `
        <div class="print-page standard-page ${!isLastDoc ? 'page-break' : ''}">
          <div class="print-header">
            <div>
              <div class="firm-title">${firmName}</div>
              <div class="case-title">${clientName}</div>
            </div>
            <div class="print-date">Date: ${currentDate}</div>
          </div>

          <div class="doc-title-bar">
            <h2 class="doc-title">${doc.name}</h2>
          </div>

          <div class="text-document-body">
            ${doc.textContent}
          </div>
        </div>
      `;
      continue;
    }

    // ── CASE 3: Standard Full-Page Documents (Letters, Bank Statements, PDFs, Photos) ──
    if (doc.pages.length > 0) {
      for (let pIdx = 0; pIdx < doc.pages.length; pIdx++) {
        const p = doc.pages[pIdx];
        const isLastPageOfAll = isLastDoc && pIdx === doc.pages.length - 1;

        pagesHtml += `
          <div class="print-page standard-page ${!isLastPageOfAll ? 'page-break' : ''}">
            <div class="print-header">
              <div>
                <div class="firm-title">${firmName}</div>
                <div class="case-title">${clientName}</div>
              </div>
              <div class="print-date">
                <div>Date: ${currentDate}</div>
                ${doc.pages.length > 1 ? `<div>Page ${pIdx + 1} of ${doc.pages.length}</div>` : ''}
              </div>
            </div>

            <div class="doc-title-bar">
              <h2 class="doc-title">${doc.name} ${p.label ? `— ${p.label}` : ''}</h2>
              ${doc.description ? `<div class="doc-instruction">📢 ${doc.description}</div>` : ''}
            </div>

            <div class="standard-image-container">
              <img src="${p.dataUrl}" alt="${doc.name}" class="standard-doc-image" />
            </div>
          </div>
        `;
      }
    }
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Print - ${clientName}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 12mm 15mm 12mm 15mm;
        }
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
          margin: 0;
          padding: 0;
          color: #202124;
          background: #ffffff;
        }
        .page-break {
          page-break-after: always;
          break-after: page;
        }
        .print-page {
          display: flex;
          flex-direction: column;
          min-height: calc(297mm - 24mm);
          position: relative;
        }
        .print-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #1a73e8;
          padding-bottom: 8px;
          margin-bottom: 12px;
        }
        .firm-title {
          font-size: 15px;
          font-weight: 800;
          color: #1a73e8;
          letter-spacing: -0.2px;
        }
        .case-title {
          font-size: 12px;
          color: #3c4043;
          font-weight: 600;
          margin-top: 2px;
        }
        .print-date {
          font-size: 11px;
          color: #5f6368;
          text-align: right;
        }
        .badge-official {
          display: inline-block;
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
          background: #e8f0fe;
          color: #1a73e8;
          padding: 1px 6px;
          border-radius: 4px;
          margin-top: 3px;
          border: 1px solid #c2e7ff;
        }
        .doc-title-bar {
          margin-bottom: 12px;
        }
        .doc-title {
          font-size: 14px;
          font-weight: 700;
          color: #202124;
          margin: 0;
        }
        .doc-instruction {
          font-size: 11px;
          color: #1a73e8;
          background: #f0f7ff;
          border-left: 3px solid #1a73e8;
          padding: 4px 8px;
          margin-top: 4px;
          border-radius: 0 4px 4px 0;
        }

        /* ── ID CARD SMART SIZING STYLES (CRITICAL) ── */
        .id-card-layout {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 22px;
          margin: 20px 0;
          flex: 1;
        }
        .id-card-block {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
        }
        .card-side-label {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          color: #1a73e8;
          background: #e8f0fe;
          padding: 2px 10px;
          border-radius: 12px;
          border: 1px solid #d2e3fc;
        }
        /* Proportional ID Card Frame (approx 95mm x 60mm on A4) */
        .id-card-frame {
          width: 95mm;
          height: 60mm;
          border: 1.5px solid #dadce0;
          border-radius: 8px;
          overflow: hidden;
          background: #f8fafd;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.06);
        }
        .id-card-image {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          display: block;
        }
        .id-footer-note {
          text-align: center;
          font-size: 10px;
          color: #5f6368;
          border-top: 1px dashed #dadce0;
          padding-top: 8px;
          margin-top: auto;
        }

        /* ── STANDARD DOCUMENT SIZING STYLES ── */
        .standard-image-container {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto;
          width: 100%;
          max-height: 235mm;
        }
        .standard-doc-image {
          max-width: 100%;
          max-height: 230mm;
          object-fit: contain;
          display: block;
        }
        .text-document-body {
          font-size: 13px;
          line-height: 1.7;
          color: #202124;
          white-space: pre-wrap;
          padding: 10px 0;
        }
      </style>
    </head>
    <body>
      ${pagesHtml}
    </body>
    </html>
  `;
};

export const printHtmlContent = async (html: string): Promise<void> => {
  return new Promise((resolve) => {
    // Create an invisible iframe
    const iframe = document.createElement('iframe');
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    iframe.style.visibility = 'hidden';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      resolve();
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    // Wait for all images inside iframe to complete loading
    const checkImages = () => {
      const images = Array.from(doc.querySelectorAll('img'));
      const promises = images.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((res) => {
          img.onload = res;
          img.onerror = res;
        });
      });
      return Promise.all(promises);
    };

    setTimeout(async () => {
      await checkImages();

      // Small delay for browser rendering engine
      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Iframe print error fallback:', e);
          // Popup window fallback
          const printWin = window.open('', '_blank');
          if (printWin) {
            printWin.document.write(html);
            printWin.document.close();
            printWin.focus();
            printWin.print();
          }
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
            resolve();
          }, 1500);
        }
      }, 300);
    }, 150);
  });
};

export const printDocument = async (
  doc: DocumentItem,
  options?: PrintOptions
): Promise<void> => {
  if (!doc.hasFile && !doc.content && !doc.url) {
    alert('This document has no file uploaded yet.');
    return;
  }
  options?.onProgress?.(`Preparing ${doc.name} for print...`);
  const prepared = await prepareDocumentForPrint(doc, options?.onProgress);
  const html = generatePrintHtml([prepared], options);
  await printHtmlContent(html);
};

export const printMultipleDocuments = async (
  docs: DocumentItem[],
  options?: PrintOptions
): Promise<void> => {
  const printableDocs = docs.filter(d => d.hasFile || d.content || d.url);
  if (printableDocs.length === 0) {
    alert('None of the selected documents have files uploaded to print.');
    return;
  }

  options?.onProgress?.(`Preparing ${printableDocs.length} documents for printing...`);
  const preparedDocs: PreparedDoc[] = [];

  for (let i = 0; i < printableDocs.length; i++) {
    const doc = printableDocs[i];
    options?.onProgress?.(`Processing (${i + 1}/${printableDocs.length}): ${doc.name}...`);
    const prepared = await prepareDocumentForPrint(doc, options?.onProgress);
    preparedDocs.push(prepared);
  }

  options?.onProgress?.('Generating print layout...');
  const html = generatePrintHtml(preparedDocs, options);
  await printHtmlContent(html);
};
