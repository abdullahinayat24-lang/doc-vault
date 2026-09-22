import React, { useState } from 'react';
import { 
  Building, 
  Mail, 
  Lock, 
  User, 
  Database, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Key
} from 'lucide-react';
import { SolicitorProfile } from '../types';
import { supabase, isSupabaseConfigured, updateSupabaseCredentials } from '../lib/supabase';
import { 
  validateAndConsumeInviteKey, 
  getClients, 
  saveClients, 
  saveTabs, 
  saveDocuments, 
  saveFolders, 
  saveSolicitorProfile 
} from '../lib/storage';
import { 
  demoSolicitorProfile,
  initialSolicitorProfile, 
  initialClients, 
  initialTabs, 
  initialDocuments, 
  initialFolders 
} from '../lib/sampleDocs';
import { PricingModal } from './Modals/PricingModal';

interface AuthScreenProps {
  onAuthenticated: (profile: SolicitorProfile) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthenticated }) => {
  const [registrationKey, setRegistrationKey] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('license') || params.get('invite') || params.get('key') || '';
  });

  const [mode, setMode] = useState<'signin' | 'signup'>(() => {
    const params = new URLSearchParams(window.location.search);
    const hasInvite = Boolean(params.get('license') || params.get('invite') || params.get('key'));
    return hasInvite ? 'signup' : 'signin';
  });

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [phone, setPhone] = useState('');

  // Supabase cloud config
  const [showCloudConfig, setShowCloudConfig] = useState(false);
  const [supabaseUrl, setSupabaseUrl] = useState(
    localStorage.getItem('docvault_supabase_url') || 'https://eccdphuupctvdayyenhl.supabase.co'
  );
  const [supabaseKey, setSupabaseKey] = useState(
    localStorage.getItem('docvault_supabase_key') || 'sb_publishable_8JlfIOAaxD_ePc0yoG7qYA_wC5QkNWq'
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPricingModal, setShowPricingModal] = useState(false);

  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);

  const handleResendConfirmation = async () => {
    if (!email.trim() || !supabase) return;
    setResending(true);
    setResendMessage(null);
    try {
      const { error: resendErr } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim()
      });
      if (resendErr) throw resendErr;
      setResendMessage('Verification email resent successfully! Please check your inbox and spam folder.');
    } catch (err: any) {
      setResendMessage(err.message || 'Failed to resend. Please confirm the user in your Supabase dashboard.');
    } finally {
      setResending(false);
    }
  };

  const isEmailNotConfirmed = Boolean(error && error.toLowerCase().includes('email not confirmed'));

  const handleLaunchDemo = () => {
    saveSolicitorProfile(demoSolicitorProfile);
    onAuthenticated(demoSolicitorProfile);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check if user is signing into Demo Account
    if (mode === 'signin' && (email.trim().toLowerCase() === 'demo@docvault.law' || email.trim().toLowerCase() === 'demo')) {
      handleLaunchDemo();
      return;
    }

    setLoading(true);
    setError(null);
    setResendMessage(null);

    let userRole: 'admin' | 'staff' = 'admin';

    // Firm Registration Key enforcement for sign up (supports Master Key & One-Time Keys)
    if (mode === 'signup') {
      const check = validateAndConsumeInviteKey(registrationKey, email.trim());
      if (!check.valid) {
        setError(check.reason || 'Invalid Firm Registration Key. Registration is restricted.');
        setLoading(false);
        return;
      }
      userRole = check.role || 'staff';
    }

    // If user entered Supabase credentials, clean and save them
    const sanitizedUrl = supabaseUrl.trim().replace('eccdphuupctvdayyenh1', 'eccdphuupctvdayyenhl');
    if (sanitizedUrl && supabaseKey.trim()) {
      updateSupabaseCredentials(sanitizedUrl, supabaseKey.trim());
    }

    try {
      // If live Supabase client exists, attempt auth
      if (isSupabaseConfigured() && supabase) {
        if (mode === 'signup') {
          const { data, error: signUpErr } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
              data: {
                company_name: companyName.trim() || 'My Legal Practice',
                display_name: displayName.trim() || email.split('@')[0],
                phone: phone.trim(),
                role: userRole
              }
            }
          });
          if (signUpErr) throw signUpErr;

          const userProfile: SolicitorProfile = {
            id: data.user?.id || 'solicitor_' + Math.random().toString(36).substring(2, 9),
            email: data.user?.email || email.trim(),
            displayName: displayName.trim() || email.split('@')[0],
            companyName: companyName.trim() || 'My Legal Practice',
            phone: phone.trim(),
            pinCode: '1234',
            isDemoMode: false,
            role: userRole
          };
          onAuthenticated(userProfile);
        } else {
          const { data, error: signInErr } = await supabase.auth.signInWithPassword({
            email: email.trim(),
            password
          });
          if (signInErr) throw signInErr;

          const userProfile: SolicitorProfile = {
            id: data.user?.id || 'solicitor_' + Math.random().toString(36).substring(2, 9),
            email: data.user?.email || email.trim(),
            displayName: data.user?.user_metadata?.display_name || email.split('@')[0],
            companyName: data.user?.user_metadata?.company_name || 'My Legal Practice',
            phone: data.user?.user_metadata?.phone || '',
            pinCode: '1234',
            isDemoMode: false,
            role: data.user?.user_metadata?.role || 'admin'
          };
          onAuthenticated(userProfile);
        }
      } else {
        // Local isolated workspace account
        const accountsKey = 'docvault_registered_accounts';
        const getSavedAccounts = (): Record<string, SolicitorProfile & { password?: string }> => {
          try {
            return JSON.parse(localStorage.getItem(accountsKey) || '{}');
          } catch {
            return {};
          }
        };

        const savedAccounts = getSavedAccounts();
        const emailKey = email.trim().toLowerCase();

        if (mode === 'signin') {
          const existing = savedAccounts[emailKey];
          if (existing) {
            if (existing.password && existing.password !== password) {
              throw new Error('Incorrect password. Please try again.');
            }
            onAuthenticated(existing);
          } else {
            throw new Error('No account found with this email. Please switch to "Create Your Account" and enter your Firm Registration Key to register.');
          }
        } else {
          // Signup mode
          const userProfile: SolicitorProfile = {
            id: 'user_' + Math.random().toString(36).substring(2, 10),
            email: email.trim(),
            displayName: displayName.trim() || email.split('@')[0],
            companyName: companyName.trim() || 'My Legal Practice',
            phone: phone.trim() || '',
            pinCode: '1234',
            isDemoMode: !isSupabaseConfigured(),
            role: userRole
          };
          savedAccounts[emailKey] = { ...userProfile, password };
          localStorage.setItem(accountsKey, JSON.stringify(savedAccounts));
          onAuthenticated(userProfile);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafd] flex flex-col items-center justify-center p-4 selection:bg-[#c2e7ff] selection:text-[#001d35] select-none">
      <div className="w-full max-w-md bg-white border border-[#dadce0] rounded-3xl shadow-xl p-8 animate-in fade-in zoom-in-95 duration-200">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1a73e8] to-[#1557b0] text-white flex items-center justify-center mx-auto mb-3 shadow-md ring-4 ring-blue-50">
            <Building className="w-7 h-7" />
          </div>
          <h1 className="font-['Google_Sans',sans-serif] text-2xl font-bold text-[#202124]">
            Doc<span className="text-[#1a73e8]">Vault</span>
          </h1>
          <p className="text-xs text-[#5f6368] mt-1">
            Professional Solicitor &amp; Document Management Portal
          </p>
        </div>

        {/* Tab switcher: Sign In vs Create Account */}
        <div className="flex bg-[#f1f3f4] p-1 rounded-2xl mb-5 text-xs font-bold text-[#5f6368]">
          <button
            type="button"
            onClick={() => {
              setMode('signin');
              setError(null);
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all ${
              mode === 'signin'
                ? 'bg-white text-[#1a73e8] shadow-xs font-bold'
                : 'hover:text-[#202124]'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('signup');
              setError(null);
            }}
            className={`flex-1 py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              mode === 'signup'
                ? 'bg-white text-[#1a73e8] shadow-xs font-bold'
                : 'hover:text-[#202124]'
            }`}
          >
            <span>Create Account</span>
            {registrationKey ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="License link active" />
            ) : (
              <span className="text-[10px] text-[#70757a] font-normal">(With Key)</span>
            )}
          </button>
        </div>

        {/* Demo Solicitor Chambers Quick Access (shown on Sign In tab) */}
        {mode === 'signin' && (
          <div className="mb-5 p-4 rounded-2xl bg-gradient-to-br from-[#f8fafd] via-[#e8f0fe]/70 to-[#f8fafd] border border-[#c2e7ff] shadow-xs">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#1a73e8] text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
                <Sparkles className="w-5 h-5 text-amber-300" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-['Google_Sans',sans-serif] text-xs font-bold text-[#202124]">
                    Evaluating DocVault?
                  </h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                    Free Instant Tour
                  </span>
                </div>
                <p className="text-[11px] text-[#5f6368] mt-1 leading-relaxed">
                  Test the software immediately with pre-loaded client cases, Child Visa folders, documents, court bundle indexer, and solicitor tools. No card or password needed.
                </p>
                <button
                  type="button"
                  onClick={handleLaunchDemo}
                  className="mt-3 w-full py-2.5 px-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 group"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 group-hover:rotate-12 transition-transform" />
                  <span>Launch Interactive Demo Chambers</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {mode === 'signin' && (
          <div className="relative flex items-center justify-center my-4">
            <div className="border-t border-[#dadce0] w-full" />
            <span className="bg-white px-3 text-[10px] font-bold text-[#70757a] uppercase tracking-wider whitespace-nowrap">
              or sign in with password
            </span>
            <div className="border-t border-[#dadce0] w-full" />
          </div>
        )}

        {/* License Invitation Notice (shown on Create Account tab) */}
        {mode === 'signup' && (
          registrationKey ? (
            <div className="mb-4 p-3.5 bg-[#e6f4ea] border border-[#ceead6] rounded-2xl flex items-center gap-2.5 text-xs text-[#137333]">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-[#137333]" />
              <div className="flex-1 min-w-0">
                <span className="font-bold">License Key Detected:</span> <span className="font-mono">{registrationKey}</span>
                <p className="text-[11px] text-[#137333]/90 mt-0.5">Please set up your firm name and solicitor credentials below to activate your workspace.</p>
              </div>
            </div>
          ) : (
            <div className="mb-4 p-3.5 bg-[#fef7e0] border border-[#f9ab00]/40 rounded-2xl text-xs text-[#b06000] space-y-2">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Firm License Key Required for New Accounts</span>
                  <p className="text-[11px] text-[#5f6368] mt-0.5 leading-relaxed">
                    DocVault account registration is reserved for licensed solicitor practices. If you've subscribed, enter your key below or open your invite link. To evaluate the software for free, test the Demo Account.
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#f9ab00]/20">
                <button
                  type="button"
                  onClick={handleLaunchDemo}
                  className="px-2.5 py-1 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold text-[11px] rounded-lg transition-colors inline-flex items-center gap-1 shadow-xs"
                >
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>Try Demo Account Free</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowPricingModal(true)}
                  className="px-2.5 py-1 bg-white hover:bg-[#f1f3f4] text-[#202124] border border-[#dadce0] font-semibold text-[11px] rounded-lg transition-colors inline-flex items-center gap-1"
                >
                  <span>View Plans &amp; Pricing</span>
                </button>
              </div>
            </div>
          )
        )}

        {error && (
          <div className={`mb-4 p-3.5 rounded-xl text-xs flex flex-col gap-2 ${
            isEmailNotConfirmed 
              ? 'bg-[#fef7e0] border border-[#f9ab00]/50 text-[#b06000]' 
              : 'bg-[#fce8e6] border border-[#fad2cf] text-[#d93025]'
          }`}>
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 font-medium">{error}</div>
            </div>

            {isEmailNotConfirmed && (
              <div className="mt-1 pt-2 border-t border-[#f9ab00]/30 space-y-2 text-[11px] text-[#5f6368]">
                <p>
                  Supabase requires your email to be verified before signing in.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resending}
                    className="px-3 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white font-medium rounded-lg text-xs transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <span>{resending ? 'Sending...' : 'Resend Verification Email'}</span>
                  </button>
                </div>
                {resendMessage && (
                  <p className="font-semibold text-[#137333] mt-1">{resendMessage}</p>
                )}
                <div className="bg-white/80 p-2.5 rounded-lg border border-[#f9ab00]/30 text-[10px] leading-relaxed">
                  <strong>Quick 1-Click Fix in Supabase Dashboard:</strong>
                  <br />
                  1. In your Supabase Dashboard, go to <strong>Authentication &rarr; Users</strong>.
                  <br />
                  2. Click the <strong>...</strong> next to your user &rarr; select <strong>Confirm email</strong>.
                  <br />
                  3. <em>(Recommended)</em> Under <strong>Authentication &rarr; Providers &rarr; Email</strong>, disable <strong>"Confirm email"</strong> to allow instant logins.
                </div>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {mode === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1">
                  Company / Firm Name *
                </label>
                <div className="relative flex items-center">
                  <Building className="w-4 h-4 text-[#5f6368] absolute left-3" />
                  <input
                    type="text"
                    placeholder="e.g. Apex Legal & Solicitor Chambers"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className="w-full pl-9 pr-3 py-2.5 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Your Name *
                  </label>
                  <div className="relative flex items-center">
                    <User className="w-4 h-4 text-[#5f6368] absolute left-3" />
                    <input
                      type="text"
                      placeholder="e.g. David Sterling"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2.5 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#202124] mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    placeholder="+44 20 7946..."
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#202124] mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#1a73e8]" />
                    <span>Firm Registration Key *</span>
                  </span>
                  <span className="text-[10px] text-[#1a73e8] font-semibold bg-[#e8f0fe] px-1.5 py-0.5 rounded">
                    Restricted
                  </span>
                </label>
                <div className="relative flex items-center">
                  <Key className="w-4 h-4 text-[#5f6368] absolute left-3" />
                  <input
                    type="text"
                    placeholder="e.g. DV-XXXX-XXXX-XXXX or LEGAL-VAULT-2026"
                    value={registrationKey}
                    onChange={(e) => setRegistrationKey(e.target.value.toUpperCase())}
                    required
                    className="w-full pl-9 pr-3 py-2.5 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs font-mono uppercase tracking-wider outline-none"
                  />
                </div>
                <p className="text-[11px] text-[#5f6368] mt-1">
                  Only authorized solicitors with this key can register. Prevents spam or unauthorized accounts.
                </p>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1">
              Email Address *
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-[#5f6368] absolute left-3" />
              <input
                type="email"
                placeholder="solicitor@yourfirm.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-9 pr-3 py-2.5 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1">
              Password *
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-[#5f6368] absolute left-3" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-9 pr-3 py-2.5 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none"
              />
            </div>
            {mode === 'signin' && (
              <div className="flex items-center justify-between text-[11px] text-[#5f6368] pt-1.5 px-0.5">
                <span>Try sample login:</span>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('demo@docvault.law');
                    setPassword('demo123');
                  }}
                  className="text-[#1a73e8] hover:underline font-semibold"
                >
                  Autofill demo@docvault.law / demo123
                </button>
              </div>
            )}
          </div>

          {/* Collapsible Supabase Cloud Settings */}
          <div className="pt-2">
            <button
              type="button"
              onClick={() => setShowCloudConfig(!showCloudConfig)}
              className="w-full flex items-center justify-between text-xs text-[#5f6368] hover:text-[#1a73e8] py-1 transition-colors"
            >
              <span className="flex items-center gap-1.5 font-medium">
                <Database className="w-3.5 h-3.5 text-[#1a73e8]" />
                <span>Supabase Cloud Sync (Optional)</span>
              </span>
              {showCloudConfig ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showCloudConfig && (
              <div className="mt-2 p-3.5 bg-[#f8fafd] border border-[#dadce0] rounded-2xl space-y-2.5 animate-in fade-in duration-100">
                <p className="text-[11px] text-[#5f6368] leading-tight">
                  Enter your Supabase credentials to sync documents directly to your cloud PostgreSQL database and storage buckets.
                </p>

                <div>
                  <label className="block text-[10px] font-bold text-[#202124] uppercase mb-0.5">
                    Project URL
                  </label>
                  <input
                    type="url"
                    placeholder="https://xyzabcdef.supabase.co"
                    value={supabaseUrl}
                    onChange={(e) => setSupabaseUrl(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#dadce0] rounded-lg text-xs font-mono outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#202124] uppercase mb-0.5">
                    Anon / Public Key
                  </label>
                  <input
                    type="password"
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                    value={supabaseKey}
                    onChange={(e) => setSupabaseKey(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-white border border-[#dadce0] rounded-lg text-xs font-mono outline-none"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-50 text-white font-bold text-xs sm:text-sm rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 mt-4"
          >
            <span>{loading ? 'Connecting...' : mode === 'signup' ? 'Create Account & Open Workspace' : 'Sign In to Workspace'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#f1f3f4] text-center space-y-3">
          <div>
            <button
              type="button"
              onClick={() => setShowPricingModal(true)}
              className="text-xs font-semibold text-[#1a73e8] hover:text-[#1557b0] hover:underline inline-flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>View Solicitor Chamber Plans &amp; Pricing</span>
            </button>
          </div>

          <p className="text-[11px] text-[#5f6368] flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#137333]" />
            <span>Secure Cloud Architecture • Isolated Client Data</span>
          </p>
        </div>

        <PricingModal
          isOpen={showPricingModal}
          onClose={() => setShowPricingModal(false)}
        />
      </div>
    </div>
  );
};
