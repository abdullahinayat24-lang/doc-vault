import { jsPDF } from 'jspdf';
import { ClientRecord, CollectionTab, DocumentFolder, DocumentItem, SolicitorProfile } from '../types';

export interface BundleIndexItem {
  index: number;
  name: string;
  category: string;
  date: string;
  status: string;
  pageRange: string;
}

export const generateBundleIndexList = (
  docs: DocumentItem[],
  folders: DocumentFolder[] = []
): BundleIndexItem[] => {
  const folderMap = new Map<string, string>();
  folders.forEach((f) => folderMap.set(f.id, f.name));

  let currentPage = 1;
  return docs
    .filter((d) => !d.isDeleted && d.hasFile)
    .map((doc, idx) => {
      const category = doc.folderId && folderMap.has(doc.folderId) ? folderMap.get(doc.folderId)! : 'General Matter Documents';
      const pageCount = doc.pages && doc.pages.length > 0 ? doc.pages.length : 1;
      const startPage = currentPage;
      const endPage = currentPage + pageCount - 1;
      const pageRange = startPage === endPage ? `Page ${startPage}` : `Pages ${startPage}–${endPage}`;
      currentPage = endPage + 1;

      const dateStr = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
      const statusStr = doc.status === 'approved' ? 'Verified Original' : doc.status === 'pending' ? 'Pending Verification' : 'Client Copy';

      return {
        index: idx + 1,
        name: doc.name,
        category,
        date: dateStr,
        status: statusStr,
        pageRange
      };
    });
};

export const exportBundleIndexPdf = (
  client: ClientRecord | null,
  tab: CollectionTab,
  docs: DocumentItem[],
  folders: DocumentFolder[] = [],
  solicitor: SolicitorProfile
) => {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const firmName = solicitor.companyName || 'DocVault Legal Chambers';
  const solicitorName = solicitor.displayName || 'Principal Solicitor';
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const indexItems = generateBundleIndexList(docs, folders);

  // Header Banner
  doc.setFont('times', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(26, 115, 232);
  doc.text(firmName.toUpperCase(), 20, 22);

  doc.setFontSize(9);
  doc.setFont('times', 'normal');
  doc.setTextColor(95, 99, 104);
  doc.text(`Principal Solicitor: ${solicitorName} • Tel: ${solicitor.phone || ''} • Email: ${solicitor.email || ''}`, 20, 28);
  doc.text(solicitor.address ? `${solicitor.address}${solicitor.sraNumber ? ` • SRA Reg: ${solicitor.sraNumber}` : ''}` : '', 20, 33);

  // Dividing Rule
  doc.setDrawColor(26, 115, 232);
  doc.setLineWidth(0.6);
  doc.line(20, 36, 190, 36);

  // Title
  doc.setFont('times', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(32, 33, 36);
  doc.text('OFFICIAL INDEX OF DOCUMENTARY EVIDENCE & COURT BUNDLE', 20, 46);

  // Metadata Box
  doc.setFontSize(9);
  doc.setFont('times', 'normal');
  doc.text(`Client Name: ${client?.name || 'Firm Matter'}`, 20, 54);
  doc.text(`Application / Matter: ${client?.cameFor || tab.name}`, 20, 59);
  doc.text(`Bundle Section: ${tab.name}`, 120, 54);
  doc.text(`Date of Compilation: ${dateStr}`, 120, 59);

  doc.setDrawColor(218, 220, 224);
  doc.setLineWidth(0.3);
  doc.line(20, 63, 190, 63);

  // Table Headers
  let y = 71;
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.setFillColor(240, 243, 248);
  doc.rect(20, y - 5, 170, 7, 'F');
  doc.setTextColor(32, 33, 36);
  doc.text('No.', 22, y);
  doc.text('Document Description', 32, y);
  doc.text('Category / Section', 105, y);
  doc.text('Status', 145, y);
  doc.text('Bundle Ref', 170, y);

  y += 7;

  // Table Rows
  doc.setFont('times', 'normal');
  doc.setFontSize(8.5);

  indexItems.forEach((item) => {
    if (y > 270) {
      doc.addPage();
      y = 25;
      // Repeat header on new page
      doc.setFont('times', 'bold');
      doc.setFillColor(240, 243, 248);
      doc.rect(20, y - 5, 170, 7, 'F');
      doc.text('No.', 22, y);
      doc.text('Document Description', 32, y);
      doc.text('Category / Section', 105, y);
      doc.text('Status', 145, y);
      doc.text('Bundle Ref', 170, y);
      y += 7;
      doc.setFont('times', 'normal');
    }

    doc.setTextColor(32, 33, 36);
    doc.text(String(item.index), 22, y);
    const splitName = doc.splitTextToSize(item.name, 70);
    doc.text(splitName, 32, y);
    doc.text(doc.splitTextToSize(item.category, 38), 105, y);
    doc.text(item.status, 145, y);
    doc.text(item.pageRange, 170, y);

    const rowHeight = Math.max(splitName.length * 4.5, 6);
    y += rowHeight;

    doc.setDrawColor(241, 243, 244);
    doc.setLineWidth(0.2);
    doc.line(20, y - 1, 190, y - 1);
  });

  // Footer Certificate
  if (y > 250) {
    doc.addPage();
    y = 30;
  } else {
    y += 10;
  }

  doc.setFont('times', 'italic');
  doc.setFontSize(8);
  doc.setTextColor(95, 99, 104);
  doc.text(
    `We hereby certify that all documents itemised above constitute the official documentary evidence bundle for ${client?.name || 'the above matter'} compiled under our instructions.`,
    20,
    y
  );

  y += 12;
  doc.setDrawColor(120, 120, 120);
  doc.line(20, y + 8, 80, y + 8);
  doc.setFont('times', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(32, 33, 36);
  doc.text(`Principal Solicitor: ${solicitorName}`, 20, y + 13);
  doc.setFont('times', 'normal');
  doc.text(firmName, 20, y + 17);

  const cleanFilename = `Bundle_Index_${(client?.name || 'Case').replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(cleanFilename);
};

export const printBundleIndex = (
  client: ClientRecord | null,
  tab: CollectionTab,
  docs: DocumentItem[],
  folders: DocumentFolder[] = [],
  solicitor: SolicitorProfile
) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  const firmName = solicitor.companyName || 'DocVault Legal Chambers';
  const solicitorName = solicitor.displayName || 'Principal Solicitor';
  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const indexItems = generateBundleIndexList(docs, folders);

  const tableRows = indexItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 6px 8px; border-bottom: 1px solid #dadce0; text-align: center;">${item.index}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #dadce0; font-weight: 600;">${item.name}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #dadce0; color: #5f6368;">${item.category}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #dadce0; color: #137333; font-weight: 500;">${item.status}</td>
        <td style="padding: 6px 8px; border-bottom: 1px solid #dadce0; font-family: monospace; font-weight: bold; text-align: right;">${item.pageRange}</td>
      </tr>
    `
    )
    .join('');

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Official Bundle Index - ${client?.name || 'Case Matter'}</title>
      <style>
        @page { size: A4 portrait; margin: 20mm; }
        body { font-family: 'Times New Roman', serif; color: #111; margin: 0; padding: 0; font-size: 10pt; line-height: 1.4; }
        .header { border-bottom: 2px solid #1a73e8; padding-bottom: 10px; margin-bottom: 16px; }
        .firm-name { font-size: 18pt; font-weight: bold; color: #1a73e8; }
        .firm-meta { font-size: 9pt; color: #555; }
        .title { font-size: 13pt; font-weight: bold; margin-bottom: 12px; text-transform: uppercase; }
        .meta-grid { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 9.5pt; border-bottom: 1px solid #dadce0; padding-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 9pt; }
        th { background: #f0f3f8; padding: 7px 8px; text-align: left; font-weight: bold; border-bottom: 2px solid #dadce0; }
        .cert { margin-top: 30px; font-style: italic; font-size: 8.5pt; color: #444; }
        .signature-line { margin-top: 30px; border-bottom: 1.5px dashed #444; width: 240px; padding-bottom: 4px; }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="firm-name">${firmName}</div>
        <div class="firm-meta">Principal Solicitor: ${solicitorName} • Tel: ${solicitor.phone || ''} • Email: ${solicitor.email || ''}</div>
        <div class="firm-meta">${solicitor.address || ''}${solicitor.sraNumber ? ` • SRA Reg: ${solicitor.sraNumber}` : ''}</div>
      </div>
      <div class="title">Official Index of Documentary Evidence &amp; Court Bundle</div>
      <div class="meta-grid">
        <div>
          <p><strong>Client Name:</strong> ${client?.name || 'Firm Matter'}</p>
          <p><strong>Case Matter:</strong> ${client?.cameFor || tab.name}</p>
        </div>
        <div style="text-align: right;">
          <p><strong>Section / Bundle:</strong> ${tab.name}</p>
          <p><strong>Date:</strong> ${dateStr}</p>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 35px; text-align: center;">No.</th>
            <th>Document Description</th>
            <th style="width: 140px;">Category</th>
            <th style="width: 130px;">Status</th>
            <th style="width: 100px; text-align: right;">Bundle Ref</th>
          </tr>
        </thead>
        <tbody>
          ${tableRows}
        </tbody>
      </table>
      <div class="cert">
        We hereby certify that all documents itemised above constitute the official documentary evidence bundle compiled under our professional legal instructions.
      </div>
      <div class="signature-line">
        (Signed &amp; Sealed by Principal Solicitor)
      </div>
      <p style="margin-top: 8px; font-weight: bold;">${solicitorName}<br/><span style="font-weight: normal; color: #555;">${firmName}</span></p>
    </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
  }, 400);
};
