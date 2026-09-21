import React, { useState } from 'react';
import { X, User, Database, ShieldCheck, Mail, Building, Phone, Image as ImageIcon, CheckCircle, ExternalLink, Key } from 'lucide-react';
import { SolicitorProfile } from '../../types';
import { updateSupabaseCredentials } from '../../lib/supabase';

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
  const [regKey, setRegKey] = useState(
    localStorage.getItem('docvault_registration_key') || 'LEGAL-VAULT-2026'
  );
  const [activeTab, setActiveTab] = useState<'profile' | 'supabase'>('profile');
  
  // Supabase cloud credentials
  const [supabaseUrl, setSupabaseUrl] = useState(
    localStorage.getItem('docvault_supabase_url') || ''
  );
  const [supabaseKey, setSupabaseKey] = useState(
    localStorage.getItem('docvault_supabase_key') || ''
  );
  const [configSuccess, setConfigSuccess] = useState(false);

  if (!isOpen) return null;

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedUser: SolicitorProfile = {
      ...currentUser,
      email: email.trim() || 'solicitor@example.com',
      displayName: displayName.trim() || 'Solicitor',
      companyName: companyName.trim() || 'Legal Chambers',
      companyLogo: companyLogo.trim() || undefined,
      phone: phone.trim() || undefined
    };
    onSaveUser(updatedUser);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none">
      <div className="bg-white border border-[#dadce0] rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#dadce0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
              <Building className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-['Google_Sans',sans-serif] text-base font-semibold text-[#202124]">
                Solicitor Profile &amp; Branding
              </h3>
              <p className="text-xs text-[#5f6368]">
                Company logo &amp; details shown on client portals
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
            <span>Firm Profile &amp; Logo</span>
          </button>
          <button
            onClick={() => setActiveTab('supabase')}
            className={`py-3 px-3 border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'supabase'
                ? 'border-[#1a73e8] text-[#1a73e8] font-semibold'
                : 'border-transparent hover:text-[#202124]'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Supabase Cloud Sync</span>
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

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Company Logo URL
                </label>
                <div className="relative flex items-center">
                  <ImageIcon className="w-4 h-4 text-[#5f6368] absolute left-3" />
                  <input
                    type="url"
                    value={companyLogo}
                    onChange={(e) => setCompanyLogo(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full pl-9 pr-3 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none"
                  />
                </div>
                {companyLogo && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={companyLogo} alt="Logo preview" className="w-8 h-8 rounded border object-cover" />
                    <span className="text-[11px] text-[#5f6368]">Logo Preview</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Solicitor Name
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g. David Sterling, Esq."
                  className="w-full px-3 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">
                  Email Address
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
                  Contact Phone (Optional)
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

              <div className="p-3 bg-[#e8f0fe]/60 border border-[#1a73e8]/30 rounded-xl text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-[#1a73e8] flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    <span>Firm Registration / Invitation Key</span>
                  </span>
                  <span className="text-[10px] text-[#5f6368]">Admin Secret</span>
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
                  Anyone creating a new account must enter this key. Keep it confidential to prevent spam.
                </p>
              </div>

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
        </div>
      </div>
    </div>
  );
};
