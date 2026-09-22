import React, { useState } from 'react';
import { 
  FileText, 
  Lock, 
  Share2, 
  Download, 
  Search, 
  X, 
  User, 
  LogOut, 
  ChevronDown, 
  CheckSquare, 
  Archive,
  Database,
  ShieldCheck,
  FileType as FileTypeIcon,
  Image as ImageIcon,
  ArrowLeft,
  Users,
  Sparkles,
  KeyRound,
  Clock,
  Tag,
  Edit2,
  Printer,
  Building,
  Layers
} from 'lucide-react';
import { SolicitorProfile, DocumentItem, ClientRecord, StaffMember } from '../types';
import { getTrialStatus } from '../lib/storage';
import { FIRM_THEMES } from './CompanyDashboard';


interface HeaderProps {
  user: SolicitorProfile;
  selectedClient: ClientRecord | null;
  onBackToClients: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onLockSession: () => void;
  onOpenShare: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
  onOpenPricing?: () => void;
  onChangePinClick?: () => void;
  onOpenDiscountKeys?: () => void;
  onOpenStaffManagement?: () => void;
  currentStaffSession?: StaffMember | null;
  onStaffLogout?: () => void;
  selectedCount: number;
  activeDocument: DocumentItem | null;
  onExportSelected: () => void;
  onExportCurrent: () => void;
  onExportCurrentAsPdf: () => void;
  onExportCurrentAsJpg: () => void;
  onExportAll: () => void;
  onExportMergedPdf?: (docsToMerge?: DocumentItem[]) => void;
  onExportAsJpgZip?: (docsToExport?: DocumentItem[]) => void;
  onPrintAll?: () => void;
  onOpenLetterhead?: () => void;
  onEditClient?: () => void;
}



export const Header: React.FC<HeaderProps> = ({
  user,
  selectedClient,
  onBackToClients,
  searchQuery,
  onSearchChange,
  onLockSession,
  onOpenShare,
  onOpenAuth,
  onSignOut,
  onOpenPricing,
  onChangePinClick,
  onOpenDiscountKeys,
  onOpenStaffManagement,
  currentStaffSession,
  onStaffLogout,
  selectedCount,
  activeDocument,
  onExportSelected,
  onExportCurrent,
  onExportCurrentAsPdf,
  onExportCurrentAsJpg,
  onExportAll,
  onExportMergedPdf,
  onExportAsJpgZip,
  onPrintAll,
  onOpenLetterhead,
  onEditClient
}) => {
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const trial = getTrialStatus();
  const isOwnerOrAdmin = user.email?.toLowerCase() === 'rana.abdullah.inayat@gmail.com' || user.role === 'admin';

  const activeTheme = FIRM_THEMES.find(
    (t) =>
      t.hex.toLowerCase() === (user.firmThemeColor || '').toLowerCase() ||
      t.id === user.firmThemeColor
  ) || FIRM_THEMES[0];

  return (
    <header 
      className="h-16 bg-white border-b border-[#dadce0] px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 sticky top-0 z-30 select-none"
      style={{ borderTop: `3px solid ${activeTheme.hex}` }}
    >
      {/* Brand & Breadcrumbs */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
        {selectedClient ? (
          <div className="flex items-center gap-2">
            <button
              onClick={onBackToClients}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#202124] rounded-xl text-xs font-bold transition-colors shadow-xs"
              title="Return to Main Company Page & All Clients"
            >
              <ArrowLeft className="w-4 h-4 text-[#1a73e8]" />
              <span>All Clients</span>
            </button>
            <span className="text-[#dadce0]">/</span>
            <div>
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="font-['Google_Sans',sans-serif] text-sm sm:text-base font-bold text-[#202124] truncate max-w-[180px] sm:max-w-[220px]">
                  {selectedClient.name}
                </span>
                <span 
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: activeTheme.lightBg, color: activeTheme.hex }}
                >
                  {selectedClient.cameFor}
                </span>
                {onEditClient && (
                  <button
                    onClick={onEditClient}
                    className="p-1 text-[#5f6368] hover:text-[#1a73e8] hover:bg-[#e8f0fe] rounded-lg transition-colors"
                    title="Edit client name, purpose (e.g. Visa type), phone, fees &amp; notes"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[#5f6368] truncate max-w-[200px]">
                {selectedClient.phone} • {selectedClient.visitCount} visits
              </p>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            {user.companyLogo ? (
              <img
                src={user.companyLogo}
                alt={user.companyName}
                className="w-10 h-10 rounded-xl object-cover border border-[#dadce0] shadow-xs"
              />
            ) : (
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#1a73e8] to-[#1557b0] flex items-center justify-center text-white shadow-sm ring-2 ring-blue-50">
                <FileText className="w-6 h-6" />
              </div>
            )}
            <div className="leading-tight">
              <div className="flex items-center gap-1.5">
                <span className="font-['Google_Sans',sans-serif] text-base sm:text-lg font-bold text-[#202124] tracking-tight truncate max-w-[180px] sm:max-w-[240px]">
                  {user.companyName}
                </span>
              </div>
              <p className="text-[11px] text-[#5f6368] truncate max-w-[220px]">
                {user.displayName} • Solicitor Practice
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Gmail-styled Search Bar */}
      <div className="flex-1 max-w-xl mx-2 hidden md:block">
        <div className="relative flex items-center bg-[#f1f3f4] hover:bg-[#e8eaed] focus-within:bg-white focus-within:ring-2 focus-within:ring-[#1a73e8] focus-within:shadow-md transition-all rounded-full h-11 px-4 text-[#202124]">
          <Search className="w-5 h-5 text-[#5f6368] mr-3 flex-shrink-0" />
          <input
            type="text"
            placeholder={selectedClient ? `Search documents in ${selectedClient.name}'s cases...` : "Search clients, cases, or documents..."}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-transparent text-sm text-[#202124] placeholder-[#5f6368] outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="p-1 text-[#5f6368] hover:text-[#202124] hover:bg-black/5 rounded-full transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Action Buttons: Export, Share, Lock, Account */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* + Letterhead Studio Button */}
        {selectedClient && onOpenLetterhead && (
          <button
            onClick={onOpenLetterhead}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] rounded-lg border border-[#1a73e8]/30 transition-colors shadow-xs"
            title="Open Firm Letterhead Studio &amp; Document Generator"
          >
            <Building className="w-4 h-4 text-[#1a73e8]" />
            <span className="hidden sm:inline">+ Letterhead</span>
          </button>
        )}

        {selectedClient && (
          <div className="relative">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#3c4043] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-lg border border-[#dadce0] transition-colors shadow-sm"
              title="Export documents in various formats"
            >
              <Download className="w-4 h-4 text-[#1a73e8]" />
              <span className="hidden sm:inline">Export</span>
              {selectedCount > 0 && (
                <span className="ml-1 bg-[#1a73e8] text-white text-[11px] font-bold px-1.5 py-0.2 rounded-full">
                  {selectedCount}
                </span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-[#5f6368]" />
            </button>

            {showExportMenu && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowExportMenu(false)}
                />
                <div className="absolute right-0 mt-2 w-72 bg-white border border-[#dadce0] rounded-xl shadow-xl py-2 z-50 text-sm animate-in fade-in zoom-in-95 duration-100 divide-y divide-[#f1f3f4]">
                  {/* Selected Documents Section */}
                  {selectedCount > 0 && (
                    <div className="py-1">
                      <div className="px-3 py-1 text-[11px] font-bold text-[#1a73e8] uppercase tracking-wider">
                        Selected Files ({selectedCount})
                      </div>
                      <button
                        onClick={() => {
                          onExportMergedPdf && onExportMergedPdf();
                          setShowExportMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#f8fafd] text-[#1a73e8] flex items-center gap-2.5 transition-colors font-semibold"
                      >
                        <Layers className="w-4 h-4 text-[#1a73e8]" />
                        <span>Merge Selected ({selectedCount}) to Single PDF</span>
                      </button>
                      <button
                        onClick={() => {
                          onExportSelected();
                          setShowExportMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#f8fafd] text-[#202124] flex items-center gap-2.5 transition-colors"
                      >
                        <CheckSquare className="w-4 h-4 text-[#5f6368]" />
                        <span>Export Selected ({selectedCount}) as ZIP</span>
                      </button>
                      {onExportAsJpgZip && (
                        <button
                          onClick={() => {
                            onExportAsJpgZip();
                            setShowExportMenu(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-[#f8fafd] text-[#202124] flex items-center gap-2.5 transition-colors"
                        >
                          <ImageIcon className="w-4 h-4 text-[#5f6368]" />
                          <span>Export Selected as JPGs (ZIP)</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Active Document Section */}
                  {activeDocument && activeDocument.hasFile && (
                    <div className="py-1">
                      <div className="px-3 py-1 text-[11px] font-bold text-[#5f6368] uppercase tracking-wider truncate">
                        Active: {activeDocument.name}
                      </div>
                      <button
                        onClick={() => {
                          onExportCurrent();
                          setShowExportMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#f8fafd] text-[#202124] flex items-center gap-2.5 transition-colors"
                      >
                        <Download className="w-4 h-4 text-[#5f6368]" />
                        <span>Download Original ({activeDocument.fileType.toUpperCase()})</span>
                      </button>
                      <button
                        onClick={() => {
                          onExportCurrentAsPdf();
                          setShowExportMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#f8fafd] text-[#202124] flex items-center gap-2.5 transition-colors"
                      >
                        <FileTypeIcon className="w-4 h-4 text-[#d93025]" />
                        <span>Convert &amp; Export as PDF</span>
                      </button>
                      <button
                        onClick={() => {
                          onExportCurrentAsJpg();
                          setShowExportMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#f8fafd] text-[#202124] flex items-center gap-2.5 transition-colors"
                      >
                        <ImageIcon className="w-4 h-4 text-[#1a73e8]" />
                        <span>Convert &amp; Export as JPG</span>
                      </button>
                    </div>
                  )}

                  {/* Entire Tab / Case Section */}
                  <div className="py-1">
                    <div className="px-3 py-1 text-[11px] font-bold text-[#5f6368] uppercase tracking-wider">
                      Entire Tab / Case Vault
                    </div>
                    {onExportMergedPdf && (
                      <button
                        onClick={() => {
                          onExportMergedPdf();
                          setShowExportMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#f8fafd] text-[#1a73e8] flex items-center gap-2.5 transition-colors font-medium"
                      >
                        <FileText className="w-4 h-4 text-[#1a73e8]" />
                        <span>Merge Entire Tab into 1 PDF</span>
                      </button>
                    )}
                    <button
                      onClick={() => {
                        onExportAll();
                        setShowExportMenu(false);
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-[#f8fafd] text-[#202124] flex items-center gap-2.5 transition-colors"
                    >
                      <Archive className="w-4 h-4 text-[#5f6368]" />
                      <span>Export Entire Tab (ZIP)</span>
                    </button>
                    {onExportAsJpgZip && (
                      <button
                        onClick={() => {
                          onExportAsJpgZip();
                          setShowExportMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#f8fafd] text-[#202124] flex items-center gap-2.5 transition-colors"
                      >
                        <ImageIcon className="w-4 h-4 text-[#5f6368]" />
                        <span>Export Entire Tab as JPGs (ZIP)</span>
                      </button>
                    )}
                    {onPrintAll && (
                      <button
                        onClick={() => {
                          onPrintAll();
                          setShowExportMenu(false);
                        }}
                        className="w-full text-left px-4 py-2 hover:bg-[#f8fafd] text-[#137333] flex items-center gap-2.5 transition-colors font-medium"
                      >
                        <Printer className="w-4 h-4 text-[#137333]" />
                        <span>Print All Documents</span>
                      </button>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Share Button */}
        {/* Share Button */}
        {selectedClient && !currentStaffSession && (
          <button
            onClick={onOpenShare}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg transition-colors shadow-sm"
            title="Share Document Portal with client (4-digit PIN)"
          >
            <Share2 className="w-4 h-4" />
            <span className="hidden sm:inline">Share</span>
          </button>
        )}

        {/* Staff Management Button for Solicitor */}
        {!currentStaffSession && onOpenStaffManagement && (
          <button
            onClick={onOpenStaffManagement}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#1a73e8] bg-[#e8f0fe] hover:bg-[#d2e3fc] rounded-lg border border-[#1a73e8]/30 transition-colors shadow-xs"
            title="Manage Staff Accounts, Passwords & Permissions"
          >
            <Users className="w-4 h-4" />
            <span className="hidden md:inline">Staff Team</span>
          </button>
        )}

        {/* Staff Session Indicator Badge */}
        {currentStaffSession && (
          <div className="flex items-center gap-2 bg-[#e8f0fe] border border-[#c2e7ff] px-3 py-1.5 rounded-xl text-xs">
            <div
              style={{ backgroundColor: currentStaffSession.avatarColor || '#1a73e8' }}
              className="w-6 h-6 rounded-full text-white flex items-center justify-center font-bold text-xs shadow-xs"
            >
              {currentStaffSession.name.charAt(0).toUpperCase()}
            </div>
            <div className="text-left">
              <div className="font-bold text-[#174ea6] leading-tight">
                {currentStaffSession.name}
              </div>
              <div className="text-[10px] text-[#1a73e8] leading-none">
                {currentStaffSession.role} • Staff
              </div>
            </div>
            {onStaffLogout && (
              <button
                onClick={onStaffLogout}
                className="ml-2 px-2 py-0.5 bg-white hover:bg-[#fce8e6] text-[#d93025] rounded-md font-semibold text-[11px] border border-[#fad2cf] transition-colors"
                title="Log out of Staff Session"
              >
                Log Out
              </button>
            )}
          </div>
        )}

        {/* Subscription Plans & Pricing Button */}
        {!currentStaffSession && onOpenPricing && (
          <button
            onClick={onOpenPricing}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-semibold text-[#1a73e8] bg-[#e8f0fe] hover:bg-[#d2e3fc] rounded-lg border border-[#1a73e8]/30 transition-colors shadow-xs"
            title="View Solicitor Subscription Plans & Pricing"
          >
            <Sparkles className="w-4 h-4 text-[#1a73e8]" />
            <span className="hidden md:inline">Plans</span>
          </button>
        )}

        {/* Trial badge */}
        {!currentStaffSession && trial.isActive && (
          <button
            onClick={onOpenPricing}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-[#1a73e8] bg-[#e8f0fe] border border-[#1a73e8]/30 rounded-full hover:bg-[#d2e3fc] transition-colors"
            title="Free Trial Active"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Trial — {trial.daysLeft}d left</span>
          </button>
        )}

        {/* Lock Screen / Privacy Button */}
        {!currentStaffSession && (
          <button
            onClick={onLockSession}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-[#3c4043] hover:text-[#d93025] hover:bg-[#fce8e6]/60 rounded-lg border border-[#dadce0] transition-colors shadow-sm group"
            title="Lock Screen with 4-digit PIN"
          >
            <Lock className="w-4 h-4 text-[#5f6368] group-hover:text-[#d93025] transition-colors" />
            <span className="hidden md:inline">Lock</span>
          </button>
        )}

        {/* Solicitor Profile & ID */}
        {!currentStaffSession && (
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 pl-2 pr-2 sm:pr-3 py-1.5 rounded-full hover:bg-[#f1f3f4] border border-transparent hover:border-[#dadce0] transition-all"
            title="Solicitor Account Details"
          >
            <div className="w-8 h-8 rounded-full bg-[#1a73e8] text-white font-medium flex items-center justify-center text-sm shadow-sm">
              {user.displayName ? user.displayName.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-[#202124] leading-tight flex items-center gap-1">
                <span>{user.displayName.split(' ')[0]}</span>
                {user.isDemoMode ? (
                  <span className="text-[10px] bg-[#fef7e0] text-[#b06000] px-1 py-0.2 rounded font-medium">Demo</span>
                ) : (
                  <span className="text-[10px] bg-[#e6f4ea] text-[#137333] px-1 py-0.2 rounded font-medium">Cloud</span>
                )}
              </div>
              <div className="text-[10px] text-[#5f6368] font-mono leading-none">
                ID: {user.id.substring(0, 8)}...
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#5f6368]" />
          </button>

          {showUserMenu && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setShowUserMenu(false)}
              />
              <div className="absolute right-0 mt-2 w-76 bg-white border border-[#dadce0] rounded-2xl shadow-xl p-4 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="flex items-center gap-3 pb-3 border-b border-[#f1f3f4]">
                  {user.companyLogo ? (
                    <img src={user.companyLogo} alt="" className="w-12 h-12 rounded-xl object-cover border" />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-[#1a73e8] text-white font-semibold flex items-center justify-center text-lg shadow-sm">
                      {user.displayName.charAt(0)}
                    </div>
                  )}
                  <div className="overflow-hidden">
                    <p className="font-semibold text-sm text-[#202124] truncate">{user.companyName}</p>
                    <p className="text-xs text-[#5f6368] truncate">{user.displayName}</p>
                    <p className="text-[11px] text-[#1a73e8] truncate mt-0.5">{user.email}</p>
                  </div>
                </div>

                <div className="py-2.5 space-y-1.5 text-xs text-[#5f6368]">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <ShieldCheck className="w-3.5 h-3.5 text-[#137333]" />
                      Solicitor ID:
                    </span>
                    <span className="font-mono text-[#202124] font-medium">{user.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Database className="w-3.5 h-3.5 text-[#1a73e8]" />
                      Storage Provider:
                    </span>
                    <span className="font-medium text-[#202124]">
                      {user.isDemoMode ? 'Local Isolated' : 'Supabase Cloud'}
                    </span>
                  </div>
                </div>

                <div className="pt-2 border-t border-[#f1f3f4] space-y-1.5">
                  {onOpenPricing && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenPricing();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#1a73e8] hover:bg-[#e8f0fe] flex items-center gap-2 transition-colors font-medium"
                    >
                      <Sparkles className="w-4 h-4 text-[#1a73e8]" />
                      <span>Subscription Plans &amp; Pricing</span>
                    </button>
                  )}
                  {onChangePinClick && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onChangePinClick();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#202124] hover:bg-[#f1f3f4] flex items-center gap-2 transition-colors"
                    >
                      <KeyRound className="w-4 h-4 text-[#5f6368]" />
                      <span>Change Lock PIN</span>
                    </button>
                  )}
                  {onOpenDiscountKeys && isOwnerOrAdmin && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenDiscountKeys();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#202124] hover:bg-[#f1f3f4] flex items-center gap-2 transition-colors"
                    >
                      <Tag className="w-4 h-4 text-[#5f6368]" />
                      <span>Special Discount Keys</span>
                    </button>
                  )}
                  {onOpenStaffManagement && (
                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        onOpenStaffManagement();
                      }}
                      className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#202124] hover:bg-[#f1f3f4] flex items-center gap-2 transition-colors"
                    >
                      <Users className="w-4 h-4 text-[#1a73e8]" />
                      <span>Staff Team &amp; Passwords</span>
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onOpenAuth();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#202124] hover:bg-[#f1f3f4] flex items-center gap-2 transition-colors"
                  >
                    <User className="w-4 h-4 text-[#5f6368]" />
                    <span>Edit Company Logo &amp; Details</span>
                  </button>
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      onSignOut();
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-[#d93025] hover:bg-[#fce8e6]/60 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-[#d93025]" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
        )}
      </div>
    </header>
  );
};
