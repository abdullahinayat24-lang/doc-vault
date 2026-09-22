import React, { useState, useRef, useEffect } from 'react';
import { 
  X, 
  Save, 
  Download, 
  Printer, 
  FileText, 
  Building, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar, 
  Copy, 
  Check, 
  Type, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify,
  Bold, 
  Italic, 
  Underline, 
  List, 
  ListOrdered, 
  Sparkles,
  ChevronDown,
  FolderPlus,
  Users
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { SolicitorProfile, ClientRecord, CollectionTab, DocumentFolder, DocumentItem } from '../../types';
import { generateUUID } from '../../lib/storage';

interface LetterheadModalProps {
  isOpen: boolean;
  onClose: () => void;
  solicitor: SolicitorProfile;
  client?: ClientRecord | null;
  currentTab?: CollectionTab;
  folders?: DocumentFolder[];
  clients?: ClientRecord[];
  onSaveDocumentToClient: (doc: DocumentItem, targetFolderId?: string) => void;
  onCopyLetterToOtherClient?: (targetClientId: string, doc: DocumentItem) => void;
  initialDocument?: DocumentItem | null;
}

type FontChoice = 'Times New Roman' | 'Georgia' | 'Garamond' | 'Arial' | 'Segoe UI';
type HeaderLayout = 'centered' | 'split' | 'modern';

const LETTERHEAD_TEMPLATES = [
  {
    id: 'blank',
    name: '📄 Blank Official Letterhead',
    subject: 'RE: LEGAL MATTER REFERENCE',
    recipient: 'To Whom It May Concern,\nRelevant Department,\nUnited Kingdom',
    body: `<p>Dear Sir / Madam,</p>
<p>We act on behalf of the above-named client in connection with their legal matters.</p>
<p>[Enter your letter content here...]</p>
<p>Should you require any further documentation or information, please do not hesitate to contact our office.</p>`
  },
  {
    id: 'representation',
    name: '🏛️ Letter of Representation (Home Office / UKVI)',
    subject: 'RE: FORMAL NOTICE OF ACTING & REPRESENTATION',
    recipient: 'UK Visas and Immigration\nHome Office\nDirect Entry & Casework Directorate',
    body: `<p>Dear Sir / Madam,</p>
<p><strong>RE: FORMAL NOTIFICATION OF LEGAL REPRESENTATION</strong></p>
<p>We are instructed by the above-named Applicant to act as their legal representatives in respect of their pending immigration application.</p>
<p>Please find enclosed all relevant identity documents, biometric records, and supporting bundles. We confirm that all enclosed copies are true and authentic copies of original documents examined at our practice.</p>
<p>Kindly direct all future correspondence, notifications, and decisions directly to our chambers at the contact details stated above.</p>`
  },
  {
    id: 'doc_request',
    name: '📋 Client Document Request & Checklist',
    subject: 'URGENT: OUTSTANDING DOCUMENTS REQUIRED FOR SUBMISSION',
    recipient: 'Attention of Client',
    body: `<p>Dear Client,</p>
<p>Thank you for instructing our firm. To enable us to finalize and submit your case, please provide the following outstanding documents at your earliest convenience:</p>
<ul>
  <li>Valid Current Passport (All stamped pages)</li>
  <li>Proof of Address (Utility bill or bank statement dated within the last 3 months)</li>
  <li>Biometric Residence Permit (Front & Back)</li>
  <li>Proof of Relationship / Birth Certificate (if applicable)</li>
</ul>
<p>You can upload these directly via your secure DocVault Client Portal link or drop originals into our chambers.</p>`
  },
  {
    id: 'status_update',
    name: '✉️ Case Status & Progress Update',
    subject: 'CASE STATUS UPDATE & NEXT STEPS',
    recipient: 'Attention of Client',
    body: `<p>Dear Client,</p>
<p>We write to provide you with an update regarding your ongoing matter with our firm.</p>
<p>We confirm that all relevant evidence and representations have been compiled into your official bundle. We are currently awaiting response from the decision-making authority.</p>
<p>We will notify you immediately once a formal response or decision has been received.</p>`
  }
];

export const LetterheadModal: React.FC<LetterheadModalProps> = ({
  isOpen,
  onClose,
  solicitor,
  client,
  currentTab,
  folders = [],
  clients = [],
  onSaveDocumentToClient,
  onCopyLetterToOtherClient,
  initialDocument
}) => {
  // Styling state
  const [fontFamily, setFontFamily] = useState<FontChoice>('Times New Roman');
  const [fontSize, setFontSize] = useState<number>(11);
  const [headerLayout, setHeaderLayout] = useState<HeaderLayout>('split');
  const [lineSpacing, setLineSpacing] = useState<number>(1.5);

  // Content state
  const [selectedFolderId, setSelectedFolderId] = useState<string>(() => folders[0]?.id || '');
  const [letterTitle, setLetterTitle] = useState<string>(initialDocument?.name || 'Letter of Representation');
  const [ourRef, setOurRef] = useState<string>(() => `DV/${client?.name ? client.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'LEG'}/${new Date().getFullYear()}`);
  const [yourRef, setYourRef] = useState<string>('');
  const [letterDate, setLetterDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [recipient, setRecipient] = useState<string>(
    'UK Visas and Immigration\nHome Office Directorate\nUnited Kingdom'
  );
  const [subject, setSubject] = useState<string>(() => `RE: ${client?.name?.toUpperCase() || 'CLIENT MATTER'} — ${currentTab?.name?.toUpperCase() || 'CASE FILE'}`);
  const [bodyHtml, setBodyHtml] = useState<string>(() => initialDocument?.content || LETTERHEAD_TEMPLATES[1].body);

  const [copyToClientId, setCopyToClientId] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editorRef.current && bodyHtml) {
      if (editorRef.current.innerHTML !== bodyHtml) {
        editorRef.current.innerHTML = bodyHtml;
      }
    }
  }, [bodyHtml]);

  if (!isOpen) return null;

  const firmName = solicitor.companyName || 'DocVault Legal Chambers';
  const solicitorName = solicitor.displayName || 'Rana Abdullah';
  const firmEmail = solicitor.email || 'solicitor@lawchambers.co.uk';
  const firmPhone = solicitor.phone || '+44 20 7946 0988';
  const firmAddress = solicitor.address || 'Chambers, 12 Fleet Street, London EC4Y 1AA';

  const handleApplyTemplate = (tmplId: string) => {
    const found = LETTERHEAD_TEMPLATES.find(t => t.id === tmplId);
    if (!found) return;
    setSubject(found.subject);
    setRecipient(found.recipient);
    setBodyHtml(found.body);
    if (editorRef.current) {
      editorRef.current.innerHTML = found.body;
    }
  };

  const exec = (command: string, value: string | undefined = undefined) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
      setBodyHtml(editorRef.current.innerHTML);
    }
  };

  const handleSaveToClient = () => {
    setIsSaving(true);
    const content = editorRef.current?.innerHTML || bodyHtml;
    const docItem: DocumentItem = {
      id: initialDocument?.id || generateUUID(),
      clientId: client?.id,
      collectionId: currentTab?.id || 'default',
      folderId: selectedFolderId || undefined,
      name: letterTitle.trim().endsWith('.doc') || letterTitle.trim().endsWith('.pdf') ? letterTitle.trim() : `${letterTitle.trim()}`,
      fileType: 'doc',
      fileSize: new Blob([content]).size,
      url: '',
      content: content,
      hasFile: true,
      status: 'approved',
      notes: `Official Firm Letterhead • Ref: ${ourRef} • Date: ${letterDate}`,
      createdAt: initialDocument?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveDocumentToClient(docItem, selectedFolderId || undefined);
    setIsSaving(false);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleCopyToOtherClient = () => {
    if (!copyToClientId || !onCopyLetterToOtherClient) return;
    const content = editorRef.current?.innerHTML || bodyHtml;
    const docItem: DocumentItem = {
      id: generateUUID(),
      clientId: copyToClientId,
      collectionId: 'default',
      name: letterTitle,
      fileType: 'doc',
      fileSize: new Blob([content]).size,
      url: '',
      content: content,
      hasFile: true,
      status: 'approved',
      notes: `Letterhead copied from ${client?.name || 'practice matter'}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    onCopyLetterToOtherClient(copyToClientId, docItem);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleExportPdf = () => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const content = editorRef.current?.innerText || '';
    
    // Header
    doc.setFont(fontFamily === 'Times New Roman' ? 'times' : 'helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(26, 115, 232);
    doc.text(firmName, 20, 22);

    doc.setFontSize(9);
    doc.setFont(fontFamily === 'Times New Roman' ? 'times' : 'helvetica', 'normal');
    doc.setTextColor(95, 99, 104);
    doc.text(`Principal: ${solicitorName} • Tel: ${firmPhone} • Email: ${firmEmail}`, 20, 28);
    doc.text(firmAddress, 20, 33);

    // Rule
    doc.setDrawColor(26, 115, 232);
    doc.setLineWidth(0.6);
    doc.line(20, 36, 190, 36);

    // Metadata
    doc.setFontSize(9);
    doc.setTextColor(32, 33, 36);
    doc.text(`Date: ${letterDate}`, 20, 44);
    doc.text(`Our Ref: ${ourRef}`, 20, 49);
    if (yourRef) doc.text(`Your Ref: ${yourRef}`, 20, 54);

    // Recipient
    let y = yourRef ? 62 : 57;
    const recLines = doc.splitTextToSize(recipient, 80);
    doc.text(recLines, 20, y);
    y += recLines.length * 5 + 6;

    // Subject
    doc.setFont(fontFamily === 'Times New Roman' ? 'times' : 'helvetica', 'bold');
    doc.setFontSize(11);
    doc.text(subject, 20, y);
    y += 8;

    // Body
    doc.setFont(fontFamily === 'Times New Roman' ? 'times' : 'helvetica', 'normal');
    doc.setFontSize(fontSize);
    const bodyLines = doc.splitTextToSize(content, 170);
    doc.text(bodyLines, 20, y);

    const cleanFilename = letterTitle.replace(/[^a-zA-Z0-9_-]/g, '_');
    doc.save(`${cleanFilename}.pdf`);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    const content = editorRef.current?.innerHTML || bodyHtml;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>${letterTitle}</title>
        <style>
          @page { size: A4 portrait; margin: 20mm; }
          body { 
            font-family: '${fontFamily}', serif; 
            font-size: ${fontSize}pt; 
            line-height: ${lineSpacing}; 
            color: #111; 
            margin: 0; 
            padding: 0; 
          }
          .header { border-bottom: 2px solid #1a73e8; padding-bottom: 12px; margin-bottom: 16px; }
          .firm-name { font-size: 20pt; font-weight: bold; color: #1a73e8; margin-bottom: 4px; }
          .firm-meta { font-size: 9pt; color: #555; }
          .refs { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 10pt; }
          .recipient { margin-bottom: 16px; font-size: 10pt; white-space: pre-line; }
          .subject { font-weight: bold; font-size: 12pt; text-decoration: underline; margin-bottom: 18px; }
          .body { font-size: ${fontSize}pt; }
          .signature { margin-top: 40px; font-size: 10pt; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="firm-name">${firmName}</div>
          <div class="firm-meta">Principal Solicitor: ${solicitorName} • Tel: ${firmPhone} • Email: ${firmEmail}</div>
          <div class="firm-meta">${firmAddress}</div>
        </div>
        <div class="refs">
          <div><strong>Our Ref:</strong> ${ourRef} ${yourRef ? `&bull; <strong>Your Ref:</strong> ${yourRef}` : ''}</div>
          <div><strong>Date:</strong> ${letterDate}</div>
        </div>
        <div class="recipient">${recipient}</div>
        <div class="subject">${subject}</div>
        <div class="body">${content}</div>
        <div class="signature">
          <p>Yours faithfully,</p>
          <br/><br/>
          <p><strong>${solicitorName}</strong><br/>${firmName}</p>
        </div>
      </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-xs select-none">
      <div className="bg-[#f0f3f8] border border-[#dadce0] rounded-3xl shadow-2xl max-w-6xl w-full h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header Bar */}
        <div className="px-6 py-3 bg-white border-b border-[#dadce0] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shadow-xs">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={letterTitle}
                  onChange={(e) => setLetterTitle(e.target.value)}
                  className="font-['Google_Sans',sans-serif] text-base font-bold text-[#202124] bg-transparent border-b border-transparent hover:border-[#dadce0] focus:border-[#1a73e8] outline-none px-1"
                />
                <span className="text-xs font-semibold bg-[#e8f0fe] text-[#1a73e8] px-2.5 py-0.5 rounded-full">
                  Official Letterhead Studio
                </span>
              </div>
              <p className="text-xs text-[#5f6368] mt-0.5">
                Client: <strong className="text-[#202124]">{client?.name || 'Firm Matter'}</strong> • Tab: {currentTab?.name || 'General'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#f1f3f4] text-[#202124] border border-[#dadce0] rounded-xl text-xs font-semibold transition-colors shadow-xs"
              title="Print official letterhead directly"
            >
              <Printer className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span>Print</span>
            </button>

            <button
              onClick={handleExportPdf}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#f1f3f4] text-[#202124] border border-[#dadce0] rounded-xl text-xs font-semibold transition-colors shadow-xs"
              title="Export pristine PDF on firm letterhead"
            >
              <Download className="w-3.5 h-3.5 text-[#d93025]" />
              <span>Export PDF</span>
            </button>

            <button
              onClick={handleSaveToClient}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              <span>{savedSuccess ? 'Saved to Client!' : 'Save to Client File'}</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-full transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Toolbar: Templates, Styling, Destination Folder, Copy to Other Client */}
        <div className="px-6 py-2.5 bg-white/80 backdrop-blur-xs border-b border-[#dadce0] flex flex-wrap items-center justify-between gap-3 text-xs flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Template Selector */}
            <div className="flex items-center gap-1.5 bg-[#f8fafd] border border-[#dadce0] rounded-xl px-2.5 py-1">
              <Sparkles className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span className="font-semibold text-[#5f6368]">Template:</span>
              <select
                onChange={(e) => handleApplyTemplate(e.target.value)}
                defaultValue="representation"
                className="bg-transparent font-medium text-[#202124] outline-none text-xs cursor-pointer"
              >
                {LETTERHEAD_TEMPLATES.map((tmpl) => (
                  <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
                ))}
              </select>
            </div>

            {/* Destination Folder Selector */}
            {folders.length > 0 && (
              <div className="flex items-center gap-1.5 bg-[#f8fafd] border border-[#dadce0] rounded-xl px-2.5 py-1">
                <FolderPlus className="w-3.5 h-3.5 text-[#1a73e8]" />
                <span className="font-semibold text-[#5f6368]">Save into Folder:</span>
                <select
                  value={selectedFolderId}
                  onChange={(e) => setSelectedFolderId(e.target.value)}
                  className="bg-transparent font-medium text-[#202124] outline-none text-xs cursor-pointer"
                >
                  <option value="">📁 Root (Main Tab)</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>📁 {f.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Font Family */}
            <div className="flex items-center gap-1 bg-[#f8fafd] border border-[#dadce0] rounded-xl px-2.5 py-1">
              <Type className="w-3.5 h-3.5 text-[#5f6368]" />
              <select
                value={fontFamily}
                onChange={(e) => setFontFamily(e.target.value as FontChoice)}
                className="bg-transparent font-medium text-[#202124] outline-none text-xs cursor-pointer"
              >
                <option value="Times New Roman">Times New Roman</option>
                <option value="Georgia">Georgia (Chambers)</option>
                <option value="Garamond">Garamond</option>
                <option value="Arial">Arial (Modern)</option>
                <option value="Segoe UI">Segoe UI</option>
              </select>
            </div>

            {/* Font Size */}
            <div className="flex items-center gap-1 bg-[#f8fafd] border border-[#dadce0] rounded-xl px-2 py-1">
              <span className="text-[11px] font-semibold text-[#5f6368]">Size:</span>
              <select
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
                className="bg-transparent font-semibold text-[#202124] outline-none text-xs cursor-pointer"
              >
                <option value="10">10pt</option>
                <option value="11">11pt</option>
                <option value="12">12pt</option>
                <option value="13">13pt</option>
                <option value="14">14pt</option>
              </select>
            </div>

            {/* Header Layout */}
            <div className="flex items-center gap-1 bg-[#f8fafd] border border-[#dadce0] rounded-xl p-0.5">
              <button
                type="button"
                onClick={() => setHeaderLayout('split')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors ${headerLayout === 'split' ? 'bg-white shadow-xs text-[#1a73e8]' : 'text-[#5f6368]'}`}
                title="Split header (Logo/Chambers Left, Address Right)"
              >
                Modern Split
              </button>
              <button
                type="button"
                onClick={() => setHeaderLayout('centered')}
                className={`px-2 py-0.5 rounded-lg text-[11px] font-semibold transition-colors ${headerLayout === 'centered' ? 'bg-white shadow-xs text-[#1a73e8]' : 'text-[#5f6368]'}`}
                title="Traditional Centered Header"
              >
                Classic Centered
              </button>
            </div>
          </div>

          {/* Copy to Another Client feature */}
          {clients.length > 1 && onCopyLetterToOtherClient && (
            <div className="flex items-center gap-1.5 bg-[#fef7e0] border border-[#f9ab00]/30 rounded-xl px-2.5 py-1">
              <Users className="w-3.5 h-3.5 text-[#b06000]" />
              <span className="font-semibold text-[#7d5700]">Copy to Client:</span>
              <select
                value={copyToClientId}
                onChange={(e) => setCopyToClientId(e.target.value)}
                className="bg-transparent text-[#7d5700] font-medium outline-none text-xs cursor-pointer"
              >
                <option value="">Select client...</option>
                {clients.filter(c => c.id !== client?.id).map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.cameFor})</option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleCopyToOtherClient}
                disabled={!copyToClientId}
                className="px-2 py-0.5 bg-[#b06000] text-white rounded-md text-[10px] font-bold hover:bg-[#8d4d00] transition-colors disabled:opacity-40"
              >
                {isCopied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          )}
        </div>

        {/* Text Formatting Bar */}
        <div className="px-6 py-2 bg-white border-b border-[#dadce0] flex items-center gap-1 text-xs flex-wrap flex-shrink-0">
          <button onClick={() => exec('bold')} className="p-1.5 hover:bg-[#f1f3f4] rounded text-[#5f6368] hover:text-[#202124]" title="Bold (Ctrl+B)">
            <Bold className="w-4 h-4" />
          </button>
          <button onClick={() => exec('italic')} className="p-1.5 hover:bg-[#f1f3f4] rounded text-[#5f6368] hover:text-[#202124]" title="Italic (Ctrl+I)">
            <Italic className="w-4 h-4" />
          </button>
          <button onClick={() => exec('underline')} className="p-1.5 hover:bg-[#f1f3f4] rounded text-[#5f6368] hover:text-[#202124]" title="Underline (Ctrl+U)">
            <Underline className="w-4 h-4" />
          </button>

          <span className="w-[1px] h-4 bg-[#dadce0] mx-1" />

          <button onClick={() => exec('justifyLeft')} className="p-1.5 hover:bg-[#f1f3f4] rounded text-[#5f6368] hover:text-[#202124]" title="Align Left">
            <AlignLeft className="w-4 h-4" />
          </button>
          <button onClick={() => exec('justifyCenter')} className="p-1.5 hover:bg-[#f1f3f4] rounded text-[#5f6368] hover:text-[#202124]" title="Align Center">
            <AlignCenter className="w-4 h-4" />
          </button>
          <button onClick={() => exec('justifyRight')} className="p-1.5 hover:bg-[#f1f3f4] rounded text-[#5f6368] hover:text-[#202124]" title="Align Right">
            <AlignRight className="w-4 h-4" />
          </button>
          <button onClick={() => exec('justifyFull')} className="p-1.5 hover:bg-[#f1f3f4] rounded text-[#5f6368] hover:text-[#202124]" title="Justify">
            <AlignJustify className="w-4 h-4" />
          </button>

          <span className="w-[1px] h-4 bg-[#dadce0] mx-1" />

          <button onClick={() => exec('insertUnorderedList')} className="p-1.5 hover:bg-[#f1f3f4] rounded text-[#5f6368] hover:text-[#202124]" title="Bullet List">
            <List className="w-4 h-4" />
          </button>
          <button onClick={() => exec('insertOrderedList')} className="p-1.5 hover:bg-[#f1f3f4] rounded text-[#5f6368] hover:text-[#202124]" title="Numbered List">
            <ListOrdered className="w-4 h-4" />
          </button>

          <span className="w-[1px] h-4 bg-[#dadce0] mx-1" />

          <button onClick={() => exec('formatBlock', '<h3>')} className="px-2 py-1 hover:bg-[#f1f3f4] rounded text-[11px] font-bold text-[#5f6368] hover:text-[#202124]" title="Heading">
            H3 Heading
          </button>
          <button onClick={() => exec('formatBlock', '<p>')} className="px-2 py-1 hover:bg-[#f1f3f4] rounded text-[11px] font-medium text-[#5f6368] hover:text-[#202124]" title="Paragraph">
            Paragraph
          </button>
        </div>

        {/* Live A4 Sheet Preview Canvas */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex justify-center bg-[#f0f3f8]">
          <div 
            className="bg-white shadow-2xl border border-[#dadce0] w-full max-w-[210mm] min-h-[297mm] p-10 sm:p-14 flex flex-col justify-between"
            style={{ 
              fontFamily: fontFamily, 
              fontSize: `${fontSize}pt`,
              lineHeight: lineSpacing
            }}
          >
            <div>
              {/* Official Header */}
              {headerLayout === 'split' ? (
                <div className="border-b-2 border-[#1a73e8] pb-4 mb-6 flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {solicitor.companyLogo ? (
                      <img src={solicitor.companyLogo} alt="Logo" className="w-14 h-14 object-contain rounded-xl border border-[#dadce0]" />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl bg-[#1a73e8] text-white flex items-center justify-center font-bold text-xl shadow-xs">
                        {firmName.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h1 className="font-bold text-2xl tracking-tight text-[#1a73e8] font-['Google_Sans',sans-serif]">
                        {firmName}
                      </h1>
                      <p className="text-xs text-[#5f6368] font-semibold mt-0.5">
                        Principal Solicitor: {solicitorName}
                      </p>
                      <p className="text-[10px] text-[#70757a] mt-0.5">
                        Authorised &amp; Regulated Solicitors &bull; High Court Practice
                      </p>
                    </div>
                  </div>

                  <div className="text-right text-[11px] text-[#5f6368] space-y-0.5 leading-tight">
                    <p className="flex items-center justify-end gap-1.5">
                      <span>{firmPhone}</span>
                      <Phone className="w-3 h-3 text-[#1a73e8]" />
                    </p>
                    <p className="flex items-center justify-end gap-1.5">
                      <span>{firmEmail}</span>
                      <Mail className="w-3 h-3 text-[#1a73e8]" />
                    </p>
                    <p className="flex items-center justify-end gap-1.5">
                      <span>{firmAddress}</span>
                      <MapPin className="w-3 h-3 text-[#1a73e8]" />
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border-b-2 border-[#1a73e8] pb-5 mb-6 text-center">
                  <h1 className="font-bold text-2xl tracking-tight text-[#1a73e8] font-['Google_Sans',sans-serif] uppercase mb-1">
                    {firmName}
                  </h1>
                  <p className="text-xs text-[#202124] font-semibold">
                    Principal Solicitor: {solicitorName} &bull; Practice Chambers
                  </p>
                  <p className="text-[11px] text-[#5f6368] mt-0.5">
                    {firmAddress} &bull; Tel: {firmPhone} &bull; Email: {firmEmail}
                  </p>
                </div>
              )}

              {/* Reference & Date Line */}
              <div className="flex flex-wrap items-center justify-between text-xs text-[#5f6368] mb-6 pb-2 border-b border-dashed border-[#dadce0] gap-2">
                <div className="flex items-center gap-4 flex-wrap">
                  <div>
                    <span className="font-bold text-[#202124]">Our Ref: </span>
                    <input
                      type="text"
                      value={ourRef}
                      onChange={(e) => setOurRef(e.target.value)}
                      className="bg-transparent border-b border-gray-300 focus:border-[#1a73e8] outline-none font-mono text-xs px-1 text-[#202124]"
                    />
                  </div>
                  <div>
                    <span className="font-bold text-[#202124]">Your Ref: </span>
                    <input
                      type="text"
                      placeholder="e.g. HO/1234567"
                      value={yourRef}
                      onChange={(e) => setYourRef(e.target.value)}
                      className="bg-transparent border-b border-gray-300 focus:border-[#1a73e8] outline-none font-mono text-xs px-1 text-[#202124]"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#1a73e8]" />
                  <span className="font-bold text-[#202124]">Date: </span>
                  <input
                    type="date"
                    value={letterDate}
                    onChange={(e) => setLetterDate(e.target.value)}
                    className="bg-transparent border-b border-gray-300 focus:border-[#1a73e8] outline-none text-xs text-[#202124]"
                  />
                </div>
              </div>

              {/* Addressee / Recipient */}
              <div className="mb-6">
                <textarea
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="Enter recipient address or organisation..."
                  rows={3}
                  className="w-full text-xs font-semibold text-[#202124] bg-transparent border border-dashed border-transparent hover:border-[#dadce0] focus:border-[#1a73e8] rounded-lg p-1.5 outline-none resize-none leading-relaxed"
                />
              </div>

              {/* Subject Line */}
              <div className="mb-6">
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full font-bold text-sm text-[#111] uppercase tracking-wide bg-transparent border-b border-transparent hover:border-[#dadce0] focus:border-[#1a73e8] outline-none py-1 underline"
                />
              </div>

              {/* Letter Editable Body */}
              <div
                ref={editorRef}
                contentEditable={true}
                onInput={() => {
                  if (editorRef.current) {
                    setBodyHtml(editorRef.current.innerHTML);
                  }
                }}
                className="outline-none min-h-[300px] text-[#202124] leading-relaxed space-y-3 cursor-text"
              />
            </div>

            {/* Signature Block */}
            <div className="mt-12 pt-6 border-t border-[#f1f3f4] text-xs text-[#202124] leading-relaxed">
              <p>Yours faithfully,</p>
              <div className="my-6">
                <span className="font-['Brush_Script_MT',cursive] text-2xl text-[#1a73e8]">
                  {solicitorName}
                </span>
              </div>
              <p className="font-bold text-[#202124]">{solicitorName}</p>
              <p className="text-[#5f6368]">{firmName}</p>
              <p className="text-[10px] text-[#70757a] mt-3 border-t border-[#dadce0] pt-2">
                This official legal letter has been generated securely and sealed electronically via DocVault Legal Chambers System.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
