import React, { useState, useEffect, useRef } from 'react';
import { 
  Bold, 
  Italic, 
  Underline, 
  Strikethrough, 
  AlignLeft, 
  AlignCenter, 
  AlignRight, 
  AlignJustify, 
  List, 
  ListOrdered, 
  Heading1, 
  Heading2, 
  Heading3, 
  Save, 
  Download, 
  Printer, 
  Maximize2, 
  Minimize2, 
  Check, 
  Clock, 
  FileText, 
  Undo, 
  Redo, 
  Highlighter,
  Copy
} from 'lucide-react';
import mammoth from 'mammoth';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { DocumentItem } from '../../types';

interface DocxEditorProps {
  document: DocumentItem;
  onSaveContent?: (docId: string, newHtmlContent: string) => void;
  isReadOnly?: boolean;
}

export const DocxEditor: React.FC<DocxEditorProps> = ({
  document: docItem,
  onSaveContent,
  isReadOnly = false
}) => {
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isSaved, setIsSaved] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [wordCount, setWordCount] = useState<number>(0);
  const [charCount, setCharCount] = useState<number>(0);
  const [copied, setCopied] = useState<boolean>(false);

  const editorRef = useRef<HTMLDivElement>(null);
  const saveTimeoutRef = useRef<any>(null);

  // Load document content
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setIsSaved(true);

    const loadDoc = async () => {
      // 1. If document already has saved html/text content, load instantly!
      if (docItem.content) {
        if (isMounted) {
          setHtmlContent(docItem.content);
          setLoading(false);
        }
        return;
      }

      // 2. If it's a docx file with a base64 or remote URL, parse with mammoth
      if (docItem.fileType === 'docx' || docItem.name.endsWith('.docx')) {
        try {
          let arrayBuffer: ArrayBuffer;
          if (docItem.url.startsWith('data:')) {
            const base64 = docItem.url.split(',')[1];
            const binaryString = atob(base64);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            arrayBuffer = bytes.buffer;
          } else {
            const response = await fetch(docItem.url);
            arrayBuffer = await response.arrayBuffer();
          }

          const result = await mammoth.convertToHtml({ arrayBuffer });
          if (isMounted) {
            setHtmlContent(result.value || '<p>Start typing legal notes here...</p>');
            setLoading(false);
          }
          return;
        } catch (err) {
          console.warn('Docx conversion note, falling back to text:', err);
        }
      }

      // 3. If it's text, markdown, or raw data
      if (docItem.url) {
        try {
          if (docItem.url.startsWith('data:')) {
            const base64 = docItem.url.split(',')[1];
            const decoded = decodeURIComponent(escape(atob(base64)));
            if (isMounted) {
              setHtmlContent(formatTextToHtml(decoded));
              setLoading(false);
            }
          } else {
            const res = await fetch(docItem.url);
            const text = await res.text();
            if (isMounted) {
              setHtmlContent(formatTextToHtml(text));
              setLoading(false);
            }
          }
          return;
        } catch (e) {
          console.warn('Text load error:', e);
        }
      }

      // 4. Default fallback: blank new document
      if (isMounted) {
        setHtmlContent('<p>Start typing or draft your legal document here...</p>');
        setLoading(false);
      }
    };

    loadDoc();
    return () => {
      isMounted = false;
    };
  }, [docItem.id, docItem.url]);

  // Compute word and character count
  useEffect(() => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    setWordCount(words);
    setCharCount(text.length);
  }, [htmlContent]);

  const formatTextToHtml = (raw: string): string => {
    return raw
      .split('\n\n')
      .map((p) => `<p>${p.replace(/\n/g, '<br />')}</p>`)
      .join('');
  };

  // Formatting commands via execCommand for rock-solid cross-browser rich text
  const executeCommand = (command: string, value: string = '') => {
    if (isReadOnly) return;
    editorRef.current?.focus();
    window.document.execCommand(command, false, value);
    handleContentChange();
  };

  const handleContentChange = () => {
    if (!editorRef.current) return;
    const newHtml = editorRef.current.innerHTML;
    setHtmlContent(newHtml);
    setIsSaved(false);

    // Auto-save debounce (1.5 seconds after user stops typing)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      if (onSaveContent) {
        onSaveContent(docItem.id, newHtml);
        setIsSaved(true);
      }
    }, 1500);
  };

  const handleManualSave = () => {
    if (!editorRef.current || !onSaveContent) return;
    const currentHtml = editorRef.current.innerHTML;
    onSaveContent(docItem.id, currentHtml);
    setIsSaved(true);
  };

  const handleCopyText = () => {
    if (!editorRef.current) return;
    navigator.clipboard.writeText(editorRef.current.innerText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    if (!editorRef.current) return;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${docItem.name}</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 40px; color: #202124; line-height: 1.6; }
              h1 { font-size: 24px; border-bottom: 1px solid #dadce0; padding-bottom: 8px; }
              h2 { font-size: 20px; }
              h3 { font-size: 16px; }
              p { margin-bottom: 12px; }
            </style>
          </head>
          <body>
            <h2>${docItem.name}</h2>
            <div>${editorRef.current.innerHTML}</div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  };

  const handleExportPdf = () => {
    if (!editorRef.current) return;
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const text = editorRef.current.innerText || '';
    const splitText = pdf.splitTextToSize(text, 180);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text(docItem.name, 15, 20);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(splitText, 15, 30);
    pdf.save(`${docItem.name.replace(/\.[^/.]+$/, '')}.pdf`);
  };

  const handleDownloadDoc = () => {
    if (!editorRef.current) return;
    const text = editorRef.current.innerText || '';
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    saveAs(blob, `${docItem.name.replace(/\.[^/.]+$/, '')}.txt`);
  };

  return (
    <div className={`flex flex-col bg-[#f8fafd] h-full w-full ${isFullscreen ? 'fixed inset-0 z-50 p-6 bg-white' : 'p-3 sm:p-4'}`}>
      {/* Top Document Header & Formatting Bar */}
      <div className="bg-white border border-[#dadce0] rounded-2xl shadow-xs p-2.5 mb-3 flex flex-wrap items-center justify-between gap-2 select-none">
        {/* Left Toolbar: Text Styles */}
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            onClick={() => executeCommand('bold')}
            className="p-1.5 hover:bg-[#f1f3f4] text-[#202124] rounded-lg transition-colors"
            title="Bold (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('italic')}
            className="p-1.5 hover:bg-[#f1f3f4] text-[#202124] rounded-lg transition-colors"
            title="Italic (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('underline')}
            className="p-1.5 hover:bg-[#f1f3f4] text-[#202124] rounded-lg transition-colors"
            title="Underline (Ctrl+U)"
          >
            <Underline className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('strikeThrough')}
            className="p-1.5 hover:bg-[#f1f3f4] text-[#202124] rounded-lg transition-colors"
            title="Strikethrough"
          >
            <Strikethrough className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-[#dadce0] mx-1" />

          {/* Headings */}
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', '<h1>')}
            className="p-1.5 hover:bg-[#f1f3f4] text-[#202124] rounded-lg transition-colors font-bold text-xs"
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', '<h2>')}
            className="p-1.5 hover:bg-[#f1f3f4] text-[#202124] rounded-lg transition-colors font-bold text-xs"
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', '<h3>')}
            className="p-1.5 hover:bg-[#f1f3f4] text-[#202124] rounded-lg transition-colors font-bold text-xs"
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('formatBlock', '<p>')}
            className="px-2 py-1 hover:bg-[#f1f3f4] text-[#5f6368] rounded-lg transition-colors text-xs font-medium"
            title="Paragraph"
          >
            ¶ Normal
          </button>

          <div className="w-[1px] h-5 bg-[#dadce0] mx-1" />

          {/* Alignment */}
          <button
            type="button"
            onClick={() => executeCommand('justifyLeft')}
            className="p-1.5 hover:bg-[#f1f3f4] text-[#202124] rounded-lg transition-colors"
            title="Align Left"
          >
            <AlignLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyCenter')}
            className="p-1.5 hover:bg-[#f1f3f4] text-[#202124] rounded-lg transition-colors"
            title="Align Center"
          >
            <AlignCenter className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyRight')}
            className="p-1.5 hover:bg-[#f1f3f4] text-[#202124] rounded-lg transition-colors"
            title="Align Right"
          >
            <AlignRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('justifyFull')}
            className="p-1.5 hover:bg-[#f1f3f4] text-[#202124] rounded-lg transition-colors"
            title="Justify"
          >
            <AlignJustify className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-[#dadce0] mx-1" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => executeCommand('insertUnorderedList')}
            className="p-1.5 hover:bg-[#f1f3f4] text-[#202124] rounded-lg transition-colors"
            title="Bullet List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('insertOrderedList')}
            className="p-1.5 hover:bg-[#f1f3f4] text-[#202124] rounded-lg transition-colors"
            title="Numbered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <div className="w-[1px] h-5 bg-[#dadce0] mx-1" />

          {/* Undo / Redo */}
          <button
            type="button"
            onClick={() => executeCommand('undo')}
            className="p-1.5 hover:bg-[#f1f3f4] text-[#5f6368] rounded-lg transition-colors"
            title="Undo"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => executeCommand('redo')}
            className="p-1.5 hover:bg-[#f1f3f4] text-[#5f6368] rounded-lg transition-colors"
            title="Redo"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right Actions: Save, Print, Export */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-[#5f6368] mr-2">
            {isSaved ? (
              <span className="flex items-center gap-1 text-[#137333]">
                <Check className="w-3.5 h-3.5" />
                <span>Saved</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 text-[#e37400]">
                <Clock className="w-3.5 h-3.5 animate-spin" />
                <span>Unsaved changes...</span>
              </span>
            )}
          </div>

          {!isReadOnly && (
            <button
              type="button"
              onClick={handleManualSave}
              className="px-3 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors"
              title="Save Changes Now"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyText}
            className="p-1.5 bg-white border border-[#dadce0] hover:bg-[#f1f3f4] text-[#202124] rounded-xl transition-colors"
            title="Copy Text"
          >
            {copied ? <Check className="w-4 h-4 text-[#137333]" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="p-1.5 bg-white border border-[#dadce0] hover:bg-[#f1f3f4] text-[#202124] rounded-xl transition-colors"
            title="Print Document"
          >
            <Printer className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            className="p-1.5 bg-white border border-[#dadce0] hover:bg-[#f1f3f4] text-[#202124] rounded-xl transition-colors"
            title="Export as PDF"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 bg-white border border-[#dadce0] hover:bg-[#f1f3f4] text-[#202124] rounded-xl transition-colors"
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Main Document Paper Canvas */}
      <div className="flex-1 overflow-y-auto min-h-0 flex flex-col items-center">
        <div className="w-full max-w-4xl bg-white border border-[#dadce0] rounded-2xl shadow-sm min-h-[650px] p-8 sm:p-14 text-[#202124] my-2 transition-all">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 text-[#5f6368]">
              <div className="w-8 h-8 border-3 border-[#1a73e8] border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-xs font-semibold">Opening document...</p>
            </div>
          ) : (
            <div
              ref={editorRef}
              contentEditable={!isReadOnly}
              suppressContentEditableWarning
              onInput={handleContentChange}
              dangerouslySetInnerHTML={{ __html: htmlContent }}
              className="outline-none min-h-[500px] leading-relaxed text-sm sm:text-base font-sans prose prose-blue max-w-none focus:ring-0 selection:bg-[#c2e7ff] [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-[#202124] [&_h1]:mb-4 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-[#202124] [&_h2]:mb-3 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-[#202124] [&_h3]:mb-2 [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3 [&_table]:border-collapse [&_table]:w-full [&_table]:mb-4 [&_th]:border [&_th]:border-[#dadce0] [&_th]:p-2 [&_th]:bg-[#f8fafd] [&_td]:border [&_td]:border-[#dadce0] [&_td]:p-2"
            />
          )}
        </div>
      </div>

      {/* Bottom Status Bar: Word Count & Document Type */}
      <div className="mt-2 px-3 py-1.5 bg-white border border-[#dadce0] rounded-xl flex items-center justify-between text-[11px] text-[#5f6368] shadow-xs select-none">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 font-medium text-[#202124]">
            <FileText className="w-3.5 h-3.5 text-[#1a73e8]" />
            <span>{docItem.name}</span>
          </span>
          <span>•</span>
          <span>{wordCount} words</span>
          <span>•</span>
          <span>{charCount} characters</span>
          <span>•</span>
          <span>~{Math.max(1, Math.ceil(wordCount / 200))} min read</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="uppercase text-[10px] font-bold tracking-wider px-1.5 py-0.5 bg-[#e8f0fe] text-[#1a73e8] rounded">
            {docItem.fileType || 'DOC'}
          </span>
          {isReadOnly && (
            <span className="text-[10px] font-medium text-[#5f6368] bg-[#f1f3f4] px-1.5 py-0.5 rounded">
              Read-Only
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
