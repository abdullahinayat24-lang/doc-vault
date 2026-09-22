import React, { useState, useRef } from 'react';
import { 
  X, 
  User, 
  Database, 
  ShieldCheck, 
  Mail, 
  Building, 
  Phone, 
  Image as ImageIcon, 
  CheckCircle, 
  ExternalLink, 
  Key,
  Copy,
  Check,
  Plus,
  Trash2,
  Link,
  MapPin,
  Globe,
  Upload
} from 'lucide-react';
import { SolicitorProfile, InviteKeyRecord } from '../../types';
import { updateSupabaseCredentials } from '../../lib/supabase';
import { getInviteKeys, generateRandomInviteKey, deleteInviteKey, uploadFileOnline, ensureUserProfileInSupabase } from '../../lib/storage';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: SolicitorProfile;
  onSaveUser: (user: SolicitorProfile) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSaveUser
}) => {
  const [email, setEmail] = useState(currentUser.email);
  const [displayName, setDisplayName] = useState(currentUser.displayName || '');
  const [companyName, setCompanyName] = useState(currentUser.companyName || '');
  const [companyLogo, setCompanyLogo] = useState(currentUser.companyLogo || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [address, setAddress] = useState(currentUser.address || '');
  const [sraNumber, setSraNumber] = useState(currentUser.sraNumber || '');
  const [website, setWebsite] = useState(currentUser.website || '');
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [regKey, setRegKey] = useState(
    localStorage.getItem('docvault_registration_key') || 'LEGAL-VAULT-2026'
  );
  const [activeTab, setActiveTab] = useState<'profile' | 'supabase' | 'keys'>('profile');
  const [inviteKeys, setInviteKeys] = useState<InviteKeyRecord[]>(() => getInviteKeys());
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);
  
  // Supabase cloud credentials
  const [supabaseUrl, setSupabaseUrl] = useState(
    localStorage.getItem('docvault_supabase_url') || ''
  );
  const [supabaseKey, setSupabaseKey] = useState(
    localStorage.getItem('docvault_supabase_key') || ''
  );
  const [configSuccess, setConfigSuccess] = useState(false);

  const handleLogoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target?.result as string;
      setCompanyLogo(dataUrl);
      setIsUploadingLogo(false);
      try {
        const { url } = await uploadFileOnline(file, currentUser.id);
        if (url) setCompanyLogo(url);
      } catch (err) {
        console.warn('Logo upload note:', err);
      }
    };
    reader.readAsDataURL(file);
  };

  if (!isOpen) return null;

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser: SolicitorProfile = {
      ...currentUser,
      email: email.trim() || 'solicitor@example.com',
      displayName: displayName.trim() || 'Solicitor',
      companyName: companyName.trim() || 'Legal Chambers',
      companyLogo: companyLogo.trim() || undefined,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      sraNumber: sraNumber.trim() || undefined,
      website: website.trim() || undefined
    };
    onSaveUser(updatedUser);
    ensureUserProfileInSupabase(updatedUser).catch(() => {});
    onClose();
  };

  const handleSupabaseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (supabaseUrl && supabaseKey) {
      const ok = updateSupabaseCredentials(supabaseUrl, supabaseKey);
      if (ok) {
        setConfigSuccess(true);
        const updatedUser: SolicitorProfile = {
          ...currentUser,
          isDemoMode: false
        };
        onSaveUser(updatedUser);
        setTimeout(() => {
          setConfigSuccess(false);
          onClose();
        }, 1200);
      }
    }
  };

  const handleGenerateKey = (e: React.FormEvent) => {
    e.preventDefault();
    generateRandomInviteKey(newKeyLabel);
    setInviteKeys(getInviteKeys());
    setNewKeyLabel('');
  };

  const handleDeleteKey = (id: string) => {
    if (confirm('Revoke this one-time invite key?')) {
      deleteInviteKey(id);
      setInviteKeys(getInviteKeys());
    }
  };

  const handleCopyKey = (id: string, keyString: string) => {
    navigator.clipboard.writeText(keyString);
    setCopiedKeyId(id);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleCopyLink = (id: string, keyString: string) => {
    const link = `${window.location.origin}${window.location.pathname}?license=${keyString}`;
    navigator.clipboard.writeText(link);
    setCopiedLinkId(id);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none">
      <div className="bg-white border border-[#dadce0] rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#dadce0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Google_Sans',sans-serif] text-base font-semibold text-[#202124]">
                Solicitor Practice Settings
              </h3>
              <p className="text-xs text-[#5f6368]">
                Firm branding, cloud database sync &amp; staff invite keys
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

        {/* Tab switch */}
        <div className="flex border-b border-[#dadce0] px-6 text-xs font-medium text-[#5f6368]">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-[#1a73e8] text-[#1a73e8] font-semibold'
                : 'border-transparent hover:text-[#202124]'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Firm Profile</span>
          </button>
          {currentUser.role !== 'staff' && (
            <button
              onClick={() => setActiveTab('keys')}
              className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-2 ${
                activeTab === 'keys'
                  ? 'border-[#1a73e8] text-[#1a73e8] font-semibold'
                  : 'border-transparent hover:text-[#202124]'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>One-Time Keys ({inviteKeys.filter(k => !k.isUsed).length})</span>
            </button>
          )}
          <button
            onClick={() => setActiveTab('supabase')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'supabase'
                ? 'border-[#1a73e8] text-[#1a73e8] font-semibold'
                : 'border-transparent hover:text-[#202124]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Supabase Cloud</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 max-h-[75vh] overflow-y-auto">
          {activeTab === 'profile' ? (
            <form onSubmit={handleProfileSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Company / Solicitor Chambers Name
                </label>
                <div className="relative flex items-center">
                  <Building className="w-4 h-4 text-[#5f6368] absolute left-3" />
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Apex Legal & Solicitor Chambers"
                    required
                    className="w-full pl-9 pr-3 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              {/* Company Logo with Direct File Upload */}
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Company / Firm Logo
                </label>
                <div className="flex items-center gap-3">
                  {companyLogo ? (
                    <div className="relative group w-16 h-16 rounded-xl border border-[#dadce0] bg-white p-1 flex items-center justify-center overflow-hidden flex-shrink-0">
                      <img src={companyLogo} alt="Firm Logo" className="max-w-full max-h-full object-contain" />
                      <button
                        type="button"
                        onClick={() => setCompanyLogo('')}
                        className="absolute inset-0 bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl"
                        title="Remove logo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-xl border-2 border-dashed border-[#dadce0] bg-[#f8fafd] flex flex-col items-center justify-center text-[#5f6368] flex-shrink-0">
                      <ImageIcon className="w-5 h-5 text-[#80868b]" />
                      <span className="text-[9px] mt-0.5">No Logo</span>
                    </div>
                  )}

                  <div className="flex-1 space-y-1.5">
                    <input
                      ref={logoInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoSelect}
                      className="hidden"
                    />
                    <button
                      type="button"
                      disabled={isUploadingLogo}
                      onClick={() => logoInputRef.current?.click()}
                      className="px-3 py-1.5 bg-[#e8f0fe] hover:bg-[#d2e3fc] text-[#1a73e8] font-semibold text-xs rounded-xl transition-colors flex items-center gap-1.5 shadow-xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>{isUploadingLogo ? 'Processing...' : companyLogo ? 'Change Logo Image' : 'Upload Logo Image'}</span>
                    </button>
                    <input
                      type="url"
                      value={companyLogo}
                      onChange={(e) => setCompanyLogo(e.target.value)}
                      placeholder="Or paste image URL (e.g. https://...)"
                      className="w-full px-2.5 py-1 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-lg text-[11px] outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Chambers / Office Address (Used for Official Letterheads)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#5f6368] absolute left-3 top-2.5" />
                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    rows={2}
                    placeholder="e.g. 10 Chancery Lane, High Court District, London WC2A 1AA, United Kingdom"
                    className="w-full pl-9 pr-3 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none resize-none leading-relaxed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-[#202124] mb-1">
                    SRA / Bar / Reg. No.
                  </label>
                  <div className="relative flex items-center">
                    <ShieldCheck className="w-4 h-4 text-[#5f6368] absolute left-3" />
                    <input
                      type="text"
                      value={sraNumber}
                      onChange={(e) => setSraNumber(e.target.value)}
                      placeholder="e.g. SRA ID: 628192"
                      className="w-full pl-9 pr-3 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#202124] mb-1">
                    Firm Website (Optional)
                  </label>
                  <div className="relative flex items-center">
                    <Globe className="w-4 h-4 text-[#5f6368] absolute left-3" />
                    <input
                      type="text"
                      value={website}
                      onChange={(e) => setWebsite(e.target.value)}
                      placeholder="www.ranova.co.uk"
                      className="w-full pl-9 pr-3 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Principal Solicitor / Managing Partner Name
                </label>
                <div className="relative flex items-center">
                  <User className="w-4 h-4 text-[#5f6368] absolute left-3" />
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. David Sterling, Esq."
                    className="w-full pl-9 pr-3 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Firm Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="w-4 h-4 text-[#5f6368] absolute left-3" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Contact Phone Number
                </label>
                <div className="relative flex items-center">
                  <Phone className="w-4 h-4 text-[#5f6368] absolute left-3" />
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+44 20 7946 0912"
                    className="w-full pl-9 pr-3 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              {currentUser.role !== 'staff' && (
                <div className="p-3 bg-[#e8f0fe]/60 border border-[#1a73e8]/30 rounded-xl text-xs space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#1a73e8] flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5" />
                      <span>Firm Master Passcode</span>
                    </span>
                    <span className="text-[10px] text-[#5f6368]">Admin Only</span>
                  </div>
                  <input
                    type="text"
                    value={regKey}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRegKey(val);
                      localStorage.setItem('docvault_registration_key', val.trim());
                    }}
                    placeholder="e.g. LEGAL-VAULT-2026"
                    className="w-full px-2.5 py-1.5 bg-white border border-[#dadce0] focus:border-[#1a73e8] rounded-lg text-xs font-mono font-bold tracking-wider outline-none text-[#1a73e8]"
                  />
                  <p className="text-[10px] text-[#5f6368] leading-tight">
                    Keep this master passcode secret. It grants full administrative and key generation rights.
                  </p>
                </div>
              )}

              <div className="p-3 bg-[#f8fafd] border border-[#dadce0] rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#5f6368]">Account ID:</span>
                  <span className="font-mono text-[#202124]">{currentUser.id}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#5f6368]">Security:</span>
                  <span className="text-[#137333] font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Isolated Client Data
                  </span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-[#5f6368] hover:bg-[#f1f3f4] rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg shadow-sm"
                >
                  Save Profile
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSupabaseSubmit} className="space-y-3.5">
              <div className="bg-[#e8f0fe] p-3 rounded-xl text-xs text-[#174ea6] flex items-start gap-2">
                <Database className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <p>
                  Connect your live Supabase project to sync solicitor records and files to the cloud.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Supabase Project URL
                </label>
                <input
                  type="url"
                  value={supabaseUrl}
                  onChange={(e) => setSupabaseUrl(e.target.value)}
                  placeholder="https://xyzcompany.supabase.co"
                  className="w-full px-3 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs font-mono outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Supabase Anon API Key
                </label>
                <input
                  type="password"
                  value={supabaseKey}
                  onChange={(e) => setSupabaseKey(e.target.value)}
                  placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                  className="w-full px-3 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs font-mono outline-none"
                />
              </div>

              {configSuccess && (
                <div className="flex items-center gap-2 text-xs font-medium text-[#137333]">
                  <CheckCircle className="w-4 h-4" />
                  <span>Supabase credentials saved successfully!</span>
                </div>
              )}

              <div className="pt-2 flex items-center justify-between">
                <a
                  href="https://supabase.com"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-[#1a73e8] hover:underline flex items-center gap-1"
                >
                  <span>Supabase Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-medium text-[#5f6368] hover:bg-[#f1f3f4] rounded-lg"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-medium bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg shadow-sm"
                  >
                    Connect
                  </button>
                </div>
              </div>
            </form>
          )}

          {activeTab === 'keys' && currentUser.role !== 'staff' && (
            <div className="space-y-4">
              {/* Generator form */}
              <div className="p-4 bg-[#f8fafd] border border-[#dadce0] rounded-2xl">
                <h4 className="font-semibold text-xs text-[#202124] mb-1 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-[#1a73e8]" />
                  <span>Generate Single-Use Staff Invitation Key</span>
                </h4>
                <p className="text-[11px] text-[#5f6368] mb-3">
                  Each key can only be used once. As soon as someone registers, it is permanently marked as used with their email and cannot be reused or forwarded.
                </p>

                <form onSubmit={handleGenerateKey} className="flex flex-col sm:flex-row gap-2">
                  <input
                    type="text"
                    placeholder="Staff note (e.g. For Associate Sarah)..."
                    value={newKeyLabel}
                    onChange={(e) => setNewKeyLabel(e.target.value)}
                    className="flex-1 px-3 py-2 bg-white border border-[#dadce0] focus:border-[#1a73e8] rounded-xl text-xs outline-none"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 flex-shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Generate Key</span>
                  </button>
                </form>
              </div>

              {/* Master Admin Key Box */}
              <div className="p-3 bg-[#e8f0fe]/50 border border-[#1a73e8]/20 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase text-[#1a73e8] tracking-wider block">
                    Practice Master Passcode (Owner Only)
                  </span>
                  <span className="font-mono font-bold text-[#202124] text-xs">
                    {(import.meta as any).env?.VITE_REGISTRATION_KEY || localStorage.getItem('docvault_registration_key') || 'LEGAL-VAULT-2026'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const mk = (import.meta as any).env?.VITE_REGISTRATION_KEY || localStorage.getItem('docvault_registration_key') || 'LEGAL-VAULT-2026';
                    navigator.clipboard.writeText(mk);
                    setCopiedKeyId('master');
                    setTimeout(() => setCopiedKeyId(null), 2000);
                  }}
                  className="px-2.5 py-1 text-[11px] font-medium text-[#1a73e8] hover:bg-white rounded-lg border border-[#1a73e8]/30 transition-colors"
                >
                  {copiedKeyId === 'master' ? 'Copied!' : 'Copy Master'}
                </button>
              </div>

              {/* Keys list */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#5f6368] px-1">
                  <span>Active &amp; Consumed Invitation Keys</span>
                  <span>{inviteKeys.length} total</span>
                </div>

                {inviteKeys.length === 0 ? (
                  <div className="p-6 text-center border border-dashed border-[#dadce0] rounded-xl text-xs text-[#5f6368]">
                    No single-use keys generated yet. Click "+ Generate Key" above to create an invite code for your staff.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {inviteKeys.map((item) => (
                      <div
                        key={item.id}
                        className={`p-3 rounded-xl border transition-all text-xs flex items-center justify-between gap-3 ${
                          item.isUsed
                            ? 'bg-[#f1f3f4]/70 border-[#dadce0] opacity-80'
                            : 'bg-white border-[#dadce0] hover:border-[#1a73e8] shadow-xs'
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-xs text-[#202124] tracking-wide">
                              {item.key}
                            </span>
                            {item.isUsed ? (
                              <span className="text-[9px] font-bold uppercase bg-[#fce8e6] text-[#d93025] px-1.5 py-0.5 rounded-full border border-[#fad2cf]">
                                Used
                              </span>
                            ) : (
                              <span className="text-[9px] font-bold uppercase bg-[#e6f4ea] text-[#137333] px-1.5 py-0.5 rounded-full border border-[#ceead6]">
                                Ready (1-Time)
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-[#5f6368] mt-1 flex flex-wrap items-center gap-x-2">
                            {item.label && <span className="font-medium text-[#202124]">{item.label} •</span>}
                            {item.isUsed ? (
                              <span className="text-[#d93025]">
                                Consumed by: <strong>{item.usedByEmail}</strong>
                              </span>
                            ) : (
                              <span>Created {new Date(item.createdAt).toLocaleDateString()}</span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {!item.isUsed && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleCopyKey(item.id, item.key)}
                                className="px-2.5 py-1 text-[11px] font-bold text-[#1a73e8] bg-[#e8f0fe] hover:bg-[#d2e3fc] rounded-lg transition-colors flex items-center gap-1"
                                title="Copy Single-Use Key"
                              >
                                {copiedKeyId === item.id ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Key Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Key</span>
                                  </>
                                )}
                              </button>

                              <button
                                type="button"
                                onClick={() => handleCopyLink(item.id, item.key)}
                                className="px-2.5 py-1 text-[11px] font-bold text-[#137333] bg-[#e6f4ea] hover:bg-[#ceead6] rounded-lg transition-colors flex items-center gap-1"
                                title="Copy Direct Seller Activation Link"
                              >
                                {copiedLinkId === item.id ? (
                                  <>
                                    <Check className="w-3 h-3" />
                                    <span>Link Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Link className="w-3 h-3" />
                                    <span>Invite Link</span>
                                  </>
                                )}
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteKey(item.id)}
                            className="p-1.5 text-[#5f6368] hover:text-[#d93025] hover:bg-[#fce8e6] rounded-lg transition-colors"
                            title="Delete / Revoke Key"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 text-xs font-medium bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#202124] rounded-xl"
                >
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
