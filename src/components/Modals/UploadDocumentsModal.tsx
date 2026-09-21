import React, { useState, useRef } from 'react';
import { 
  X, 
  Upload, 
  CreditCard, 
  Files, 
  Image as ImageIcon, 
  FileText, 
  CheckCircle2, 
  Plus, 
  Trash2, 
  Sparkles,
  ArrowRight,
  Loader2,
  Cloud
} from 'lucide-react';
import { DocumentStatus, FileType, DocumentPage } from '../../types';
import { detectFileType } from '../../lib/storage';

interface UploadDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMultiPageDoc: (
    title: string,
    pages: { name: string; file: File; url: string; fileType: FileType; fileSize: number }[],
    status: DocumentStatus
  ) => void | Promise<void>;
  onBatchUploadFiles: (files: File[], combineIntoOne: boolean, combinedTitle?: string) => void | Promise<void>;
}

export const UploadDocumentsModal: React.FC<UploadDocumentsModalProps> = ({
  isOpen,
  onClose,
  onSaveMultiPageDoc,
  onBatchUploadFiles
}) => {
  const [activeTab, setActiveTab] = useState<'card' | 'batch'>('batch');

  // Tab 1: Multi-Side / 2-Sided Document state
  const [cardTitle, setCardTitle] = useState('2-Sided Document');
  const [cardStatus, setCardStatus] = useState<DocumentStatus>('pending');
  const [side1Label, setSide1Label] = useState('Side 1: Front');
  const [side2Label, setSide2Label] = useState('Side 2: Back');
  const [frontFile, setFrontFile] = useState<{ file: File; url: string; fileType: FileType } | null>(null);
  const [backFile, setBackFile] = useState<{ file: File; url: string; fileType: FileType } | null>(null);
  const [extraPages, setExtraPages] = useState<{ id: string; name: string; file: File; url: string; fileType: FileType }[]>([]);

  // Tab 2: Batch upload state
  const [batchFiles, setBatchFiles] = useState<File[]>([]);
  const [combineBatch, setCombineBatch] = useState(false);
  const [combinedBatchTitle, setCombinedBatchTitle] = useState('Case Document Bundle');
  const [isUploading, setIsUploading] = useState(false);

  const frontInputRef = useRef<HTMLInputElement>(null);
  const backInputRef = useRef<HTMLInputElement>(null);
  const extraInputRef = useRef<HTMLInputElement>(null);
  const batchInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const presets = [
    '2-Sided ID / IRP Card',
    'Driving License (Front & Back)',
    'Contract / Agreement',
    'Passport & Visa Page',
    'Deed / Title Certificate',
    'Bank Statement (Front/Back)'
  ];

  const readFileToDataUrl = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string);
      reader.readAsDataURL(file);
    });
  };

  const handleFrontSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = await readFileToDataUrl(file);
      const fileType = detectFileType(file.name, file.type);
      setFrontFile({ file, url, fileType });
    }
  };

  const handleBackSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = await readFileToDataUrl(file);
      const fileType = detectFileType(file.name, file.type);
      setBackFile({ file, url, fileType });
    }
  };

  const handleExtraSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = await readFileToDataUrl(file);
      const fileType = detectFileType(file.name, file.type);
      setExtraPages((prev) => [
        ...prev,
        {
          id: 'p_' + Math.random().toString(36).substring(2, 9),
          name: `Page ${prev.length + 3}`,
          file,
          url,
          fileType
        }
      ]);
      if (extraInputRef.current) extraInputRef.current.value = '';
    }
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontFile && !backFile) {
      alert('Please upload at least the Front side or Back side of the document.');
      return;
    }

    const pages: { name: string; file: File; url: string; fileType: FileType; fileSize: number }[] = [];

    if (frontFile) {
      pages.push({
        name: side1Label.trim() || 'Side 1: Front',
        file: frontFile.file,
        url: frontFile.url,
        fileType: frontFile.fileType,
        fileSize: frontFile.file.size
      });
    }

    if (backFile) {
      pages.push({
        name: side2Label.trim() || 'Side 2: Back',
        file: backFile.file,
        url: backFile.url,
        fileType: backFile.fileType,
        fileSize: backFile.file.size
      });
    }

    extraPages.forEach((ep) => {
      pages.push({
        name: ep.name,
        file: ep.file,
        url: ep.url,
        fileType: ep.fileType,
        fileSize: ep.file.size
      });
    });

    setIsUploading(true);
    try {
      await onSaveMultiPageDoc(cardTitle.trim() || '2-Sided Document', pages, cardStatus);
      onClose();
    } finally {
      setIsUploading(false);
    }
  };

  const handleBatchFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setBatchFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const handleRemoveBatchFile = (index: number) => {
    setBatchFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (batchFiles.length === 0) {
      alert('Please select files to upload.');
      return;
    }
    setIsUploading(true);
    try {
      await onBatchUploadFiles(batchFiles, combineBatch, combinedBatchTitle.trim());
      setBatchFiles([]);
      onClose();
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-[#dadce0] w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#dadce0] flex items-center justify-between bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Google_Sans',sans-serif] text-base font-semibold text-[#202124]">
                Upload Documents
              </h2>
              <p className="text-xs text-[#5f6368]">
                Add 2-sided ID cards (Front & Back) or batch upload multiple files
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-[#dadce0] bg-[#f8fafd] px-5 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('batch')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs sm:text-sm font-medium border-b-2 transition-all ${
              activeTab === 'batch'
                ? 'border-[#1a73e8] text-[#1a73e8] font-semibold'
                : 'border-transparent text-[#5f6368] hover:text-[#202124]'
            }`}
          >
            <Files className="w-4 h-4" />
            <span>Upload PDF / Multiple Files</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('card')}
            className={`flex items-center gap-2 pb-2.5 px-3 text-xs sm:text-sm font-medium border-b-2 transition-all ${
              activeTab === 'card'
                ? 'border-[#1a73e8] text-[#1a73e8] font-semibold'
                : 'border-transparent text-[#5f6368] hover:text-[#202124]'
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>Multi-Side / 2-Sided (Front & Back)</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto flex-1">
          {activeTab === 'card' ? (
            <form onSubmit={handleSaveCard} className="space-y-4">
              {/* Preset Chips */}
              <div>
                <label className="block text-xs font-semibold text-[#3c4043] mb-1.5">
                  Quick Document Presets:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {presets.map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setCardTitle(p)}
                      className={`px-2.5 py-1 rounded-full text-xs transition-colors ${
                        cardTitle === p
                          ? 'bg-[#1a73e8] text-white font-medium shadow-xs'
                          : 'bg-[#f1f3f4] text-[#5f6368] hover:bg-[#e8eaed] hover:text-[#202124]'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Document Name */}
              <div>
                <label className="block text-xs font-semibold text-[#3c4043] mb-1">
                  Document Name:
                </label>
                <input
                  type="text"
                  required
                  value={cardTitle}
                  onChange={(e) => setCardTitle(e.target.value)}
                  placeholder="e.g. IRP Card, Driving License, National ID"
                  className="w-full px-3 py-2 text-xs sm:text-sm border border-[#dadce0] rounded-xl focus:ring-2 focus:ring-[#1a73e8] focus:border-transparent outline-none"
                />
              </div>

              {/* 2-Sided Upload Boxes: Front & Back */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                {/* Front Side */}
                <div className="border border-[#dadce0] rounded-xl p-3.5 bg-[#f8fafd] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#1a73e8] flex items-center gap-1.5 uppercase tracking-wide">
                        <CreditCard className="w-3.5 h-3.5" />
                        Side 1: Front
                      </span>
                      {frontFile && (
                        <span className="text-[11px] font-semibold text-[#137333] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      )}
                    </div>

                    <input
                      ref={frontInputRef}
                      type="file"
                      onChange={handleFrontSelect}
                      className="hidden"
                    />

                    {frontFile ? (
                      <div className="relative rounded-lg overflow-hidden border border-[#dadce0] bg-white group aspect-[16/10] flex items-center justify-center">
                        {['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(frontFile.fileType) ? (
                          <img
                            src={frontFile.url}
                            alt="Front preview"
                            className="w-full h-full object-cover"
                          />
                        ) : frontFile.fileType === 'pdf' ? (
                          <div className="p-4 text-center">
                            <FileText className="w-8 h-8 text-[#d93025] mx-auto mb-1" />
                            <p className="text-xs font-medium truncate max-w-[180px]">
                              {frontFile.file.name}
                            </p>
                            <span className="text-[9px] uppercase font-bold text-[#d93025] bg-[#fce8e6] px-1.5 py-0.5 rounded">PDF</span>
                          </div>
                        ) : (
                          <div className="p-4 text-center">
                            <FileText className="w-8 h-8 text-[#1a73e8] mx-auto mb-1" />
                            <p className="text-xs font-medium truncate max-w-[180px]">
                              {frontFile.file.name}
                            </p>
                            <span className="text-[9px] uppercase font-bold text-[#1a73e8] bg-[#e8f0fe] px-1.5 py-0.5 rounded">{frontFile.fileType}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => frontInputRef.current?.click()}
                            className="px-2.5 py-1 bg-white text-[#202124] rounded-lg text-xs font-medium shadow"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={() => setFrontFile(null)}
                            className="p-1 bg-[#d93025] text-white rounded-lg hover:bg-[#b3261e] shadow"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => frontInputRef.current?.click()}
                        className="w-full aspect-[16/10] border-2 border-dashed border-[#1a73e8]/40 hover:border-[#1a73e8] rounded-lg flex flex-col items-center justify-center p-3 text-center bg-white hover:bg-[#e8f0fe]/20 transition-all cursor-pointer"
                      >
                        <ImageIcon className="w-7 h-7 text-[#1a73e8] mb-1.5" />
                        <span className="text-xs font-semibold text-[#1a73e8]">
                          Upload Front Side
                        </span>
                        <span className="text-[10px] text-[#5f6368] mt-0.5">
                          PDF, DOCX, JPG, PNG, etc.
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Back Side */}
                <div className="border border-[#dadce0] rounded-xl p-3.5 bg-[#f8fafd] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-[#1a73e8] flex items-center gap-1.5 uppercase tracking-wide">
                        <CreditCard className="w-3.5 h-3.5" />
                        Side 2: Back
                      </span>
                      {backFile && (
                        <span className="text-[11px] font-semibold text-[#137333] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Ready
                        </span>
                      )}
                    </div>

                    <input
                      ref={backInputRef}
                      type="file"
                      onChange={handleBackSelect}
                      className="hidden"
                    />

                    {backFile ? (
                      <div className="relative rounded-lg overflow-hidden border border-[#dadce0] bg-white group aspect-[16/10] flex items-center justify-center">
                        {['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(backFile.fileType) ? (
                          <img
                            src={backFile.url}
                            alt="Back preview"
                            className="w-full h-full object-cover"
                          />
                        ) : backFile.fileType === 'pdf' ? (
                          <div className="p-4 text-center">
                            <FileText className="w-8 h-8 text-[#d93025] mx-auto mb-1" />
                            <p className="text-xs font-medium truncate max-w-[180px]">
                              {backFile.file.name}
                            </p>
                            <span className="text-[9px] uppercase font-bold text-[#d93025] bg-[#fce8e6] px-1.5 py-0.5 rounded">PDF</span>
                          </div>
                        ) : (
                          <div className="p-4 text-center">
                            <FileText className="w-8 h-8 text-[#1a73e8] mx-auto mb-1" />
                            <p className="text-xs font-medium truncate max-w-[180px]">
                              {backFile.file.name}
                            </p>
                            <span className="text-[9px] uppercase font-bold text-[#1a73e8] bg-[#e8f0fe] px-1.5 py-0.5 rounded">{backFile.fileType}</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={() => backInputRef.current?.click()}
                            className="px-2.5 py-1 bg-white text-[#202124] rounded-lg text-xs font-medium shadow"
                          >
                            Change
                          </button>
                          <button
                            type="button"
                            onClick={() => setBackFile(null)}
                            className="p-1 bg-[#d93025] text-white rounded-lg hover:bg-[#b3261e] shadow"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => backInputRef.current?.click()}
                        className="w-full aspect-[16/10] border-2 border-dashed border-[#1a73e8]/40 hover:border-[#1a73e8] rounded-lg flex flex-col items-center justify-center p-3 text-center bg-white hover:bg-[#e8f0fe]/20 transition-all cursor-pointer"
                      >
                        <ImageIcon className="w-7 h-7 text-[#1a73e8] mb-1.5" />
                        <span className="text-xs font-semibold text-[#1a73e8]">
                          Upload Back Side
                        </span>
                        <span className="text-[10px] text-[#5f6368] mt-0.5">
                          PDF, DOCX, JPG, PNG, etc.
                        </span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Extra Pages (if 3 or 4 pages like legal contracts or passport pages) */}
              {extraPages.length > 0 && (
                <div className="space-y-2 pt-1">
                  <span className="text-xs font-semibold text-[#3c4043]">
                    Additional Pages ({extraPages.length}):
                  </span>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {extraPages.map((ep, idx) => (
                      <div
                        key={ep.id}
                        className="p-2 border border-[#dadce0] rounded-lg bg-white flex items-center justify-between text-xs"
                      >
                        <span className="font-medium text-[#202124] truncate max-w-[120px]">
                          {ep.name} ({ep.file.name})
                        </span>
                        <button
                          type="button"
                          onClick={() => setExtraPages((prev) => prev.filter((_, i) => i !== idx))}
                          className="text-[#d93025] hover:text-[#b3261e] p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <input
                ref={extraInputRef}
                type="file"
                onChange={handleExtraSelect}
                className="hidden"
              />

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => extraInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 text-xs text-[#1a73e8] hover:text-[#1557b0] font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Add Extra Page / Attachment</span>
                </button>

                {/* Status selector */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#5f6368]">Initial Status:</span>
                  <select
                    value={cardStatus}
                    onChange={(e) => setCardStatus(e.target.value as DocumentStatus)}
                    className="border border-[#dadce0] rounded-lg px-2 py-1 bg-white text-xs outline-none"
                  >
                    <option value="pending">Pending (White)</option>
                    <option value="approved">Approved (Green)</option>
                    <option value="missing">Missing Requirement (Red)</option>
                  </select>
                </div>
              </div>

              {/* Submit */}
              <div className="pt-3 border-t border-[#dadce0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-[#5f6368] hover:bg-[#f1f3f4] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 text-xs sm:text-sm font-medium bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-50 text-white rounded-xl shadow transition-all flex items-center gap-1.5"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading online...</span>
                    </>
                  ) : (
                    <>
                      <span>Save as 1 Combined Document</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSaveBatch} className="space-y-4">
              <input
                ref={batchInputRef}
                type="file"
                multiple
                onChange={handleBatchFileSelect}
                className="hidden"
              />

              {/* Drop area */}
              <div
                onClick={() => batchInputRef.current?.click()}
                className="border-2 border-dashed border-[#1a73e8]/50 hover:border-[#1a73e8] bg-[#e8f0fe]/20 hover:bg-[#e8f0fe]/40 rounded-xl p-8 text-center cursor-pointer transition-colors"
              >
                <Upload className="w-10 h-10 text-[#1a73e8] mx-auto mb-2 opacity-80" />
                <p className="text-sm font-semibold text-[#202124]">
                  Click to select multiple files from your computer
                </p>
                <p className="text-xs text-[#5f6368] mt-1">
                  Supports PDFs, Word docs (DOCX, DOC), photos (JPG, PNG), spreadsheets, and any other file type
                </p>
              </div>

              {/* Selected file list */}
              {batchFiles.length > 0 && (
                <div className="border border-[#dadce0] rounded-xl p-3 bg-white space-y-2 max-h-48 overflow-y-auto">
                  <div className="flex items-center justify-between text-xs font-semibold text-[#3c4043] pb-1 border-b border-[#dadce0]">
                    <span>Selected Files ({batchFiles.length}):</span>
                    <button
                      type="button"
                      onClick={() => setBatchFiles([])}
                      className="text-[#d93025] hover:underline"
                    >
                      Clear all
                    </button>
                  </div>
                  {batchFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-[#f8fafd]"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <FileText className="w-3.5 h-3.5 text-[#1a73e8] flex-shrink-0" />
                        <span className="truncate font-medium text-[#202124]">{file.name}</span>
                        <span className="text-[10px] text-[#5f6368]">
                          ({Math.round(file.size / 1024)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveBatchFile(idx)}
                        className="text-[#5f6368] hover:text-[#d93025] p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Mode: Individual vs Merged into 1 document */}
              <div className="border border-[#dadce0] rounded-xl p-3.5 bg-[#f8fafd] space-y-2.5">
                <span className="text-xs font-bold text-[#3c4043] block uppercase tracking-wide">
                  How should these files be added?
                </span>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="batchMode"
                    checked={!combineBatch}
                    onChange={() => setCombineBatch(false)}
                    className="mt-0.5 text-[#1a73e8] focus:ring-[#1a73e8]"
                  />
                  <div>
                    <span className="text-xs font-semibold text-[#202124] block">
                      Add as separate individual documents
                    </span>
                    <span className="text-[11px] text-[#5f6368]">
                      Each file appears as its own separate row in the case bundle
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="radio"
                    name="batchMode"
                    checked={combineBatch}
                    onChange={() => setCombineBatch(true)}
                    className="mt-0.5 text-[#1a73e8] focus:ring-[#1a73e8]"
                  />
                  <div>
                    <span className="text-xs font-semibold text-[#202124] block">
                      Combine all files into 1 single multi-page document
                    </span>
                    <span className="text-[11px] text-[#5f6368]">
                      Files are grouped together as consecutive pages of one document entry
                    </span>
                  </div>
                </label>

                {combineBatch && (
                  <div className="pt-2 pl-6">
                    <label className="block text-xs font-medium text-[#3c4043] mb-1">
                      Combined Document Title:
                    </label>
                    <input
                      type="text"
                      required
                      value={combinedBatchTitle}
                      onChange={(e) => setCombinedBatchTitle(e.target.value)}
                      placeholder="e.g. Evidence Packet, Identity Documents"
                      className="w-full px-3 py-1.5 text-xs border border-[#dadce0] rounded-lg outline-none focus:ring-2 focus:ring-[#1a73e8]"
                    />
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="pt-3 border-t border-[#dadce0] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-[#5f6368] hover:bg-[#f1f3f4] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={batchFiles.length === 0 || isUploading}
                  className="px-5 py-2 text-xs sm:text-sm font-medium bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-50 text-white rounded-xl shadow transition-all flex items-center gap-1.5"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Uploading to cloud...</span>
                    </>
                  ) : (
                    <>
                      <Cloud className="w-3.5 h-3.5" />
                      <span>Upload {batchFiles.length} File{batchFiles.length === 1 ? '' : 's'} Online</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
