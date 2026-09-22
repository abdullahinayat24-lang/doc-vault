import React, { useState } from 'react';
import { 
  Users, 
  Lock, 
  Mail, 
  ArrowRight, 
  Briefcase, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { StaffMember } from '../../types';
import { getStaff, fetchStaffFromSupabase, updateStaffLastLogin, getDemoStaff } from '../../lib/storage';

interface StaffLoginProps {
  onStaffLogin: (staffMember: StaffMember) => void;
  onBackToSolicitor?: () => void;
  companyName?: string;
  companyLogo?: string;
}

export const StaffLogin: React.FC<StaffLoginProps> = ({
  onStaffLogin,
  onBackToSolicitor,
  companyName = 'DocVault Legal Chambers',
  companyLogo
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Fetch Supabase / local staff, plus demo staff directory
      const remoteStaff = await fetchStaffFromSupabase();
      const realStaff = remoteStaff && remoteStaff.length > 0 ? remoteStaff : getStaff();
      const demoStaff = getDemoStaff();
      const staffList = [...realStaff, ...demoStaff];

      const cleanEmail = email.trim().toLowerCase();
      const cleanPass = password.trim();

      // Match by email (primary) or username / name as fallback for legacy accounts
      const match = staffList.find(
        (s) =>
          s.email.toLowerCase() === cleanEmail ||
          (s.username && s.username.toLowerCase() === cleanEmail) ||
          s.name.toLowerCase() === cleanEmail
      );

      if (!match) {
        setError('Email address not found. Please contact your senior solicitor.');
        setIsLoading(false);
        return;
      }

      // If invite is pending (not yet used), don't allow login yet
      if (match.inviteToken && !match.inviteUsed) {
        setError('Account not yet activated. Please check your invite email and set a password first.');
        setIsLoading(false);
        return;
      }

      if (match.password && match.password !== cleanPass) {
        setError('Incorrect password. Please try again or contact your firm admin.');
        setIsLoading(false);
        return;
      }

      // Record last login timestamp
      updateStaffLastLogin(match.id);

      // Success — update session with current timestamp
      const sessionMember = { ...match, lastLoginAt: new Date().toISOString() };
      sessionStorage.setItem('docvault_staff_session', JSON.stringify(sessionMember));
      onStaffLogin(sessionMember);
    } catch (err) {
      console.warn('Staff login note:', err);
      setError('An error occurred during authentication. Please retry.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafd] via-[#edf2fc] to-[#e4ecf7] flex flex-col justify-center items-center p-4 select-none">
      <div className="max-w-md w-full bg-white rounded-3xl border border-[#dadce0] shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Top Branding Banner */}
        <div className="bg-gradient-to-r from-[#1a73e8] to-[#1557b0] p-6 text-white text-center relative">
          {onBackToSolicitor && (
            <button
              onClick={onBackToSolicitor}
              className="absolute left-4 top-4 text-white/80 hover:text-white flex items-center gap-1 text-xs font-medium bg-white/10 hover:bg-white/20 px-2.5 py-1 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Solicitor Login</span>
            </button>
          )}

          <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-xs border border-white/20 flex items-center justify-center mx-auto mb-3 text-white shadow-inner">
            {companyLogo ? (
              <img src={companyLogo} alt="Logo" className="w-9 h-9 object-contain" />
            ) : (
              <Briefcase className="w-7 h-7" />
            )}
          </div>

          <h1 className="font-['Google_Sans',sans-serif] text-xl font-bold tracking-tight">
            {companyName}
          </h1>
          <p className="text-xs text-white/80 mt-0.5 flex items-center justify-center gap-1.5 font-medium">
            <Users className="w-3.5 h-3.5" />
            <span>Staff &amp; Case Worker Portal</span>
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="text-center mb-2">
            <h2 className="text-sm font-bold text-[#202124]">Staff Member Sign In</h2>
            <p className="text-xs text-[#5f6368]">
              Sign in with your work email and password to access your assigned cases
            </p>
          </div>

          {error && (
            <div className="p-3 bg-[#fce8e6] border border-[#fad2cf] rounded-xl flex items-start gap-2 text-xs text-[#c5221f]">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span className="leading-snug">{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1.5">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="w-4 h-4 text-[#5f6368] absolute left-3" />
              <input
                type="email"
                required
                autoFocus
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. sarah@lawfirm.co.uk"
                className="w-full pl-9 pr-4 py-2.5 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-sm text-[#202124] outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1.5">
              Staff Password
            </label>
            <div className="relative flex items-center">
              <Lock className="w-4 h-4 text-[#5f6368] absolute left-3" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full pl-9 pr-10 py-2.5 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-sm text-[#202124] outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-[#5f6368] hover:text-[#202124] transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading || !email.trim() || !password.trim()}
            className="w-full py-2.5 px-4 bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-50 text-white font-bold text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 mt-2"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Sign In to Staff Portal</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Quick Demo Staff autofill for video demo / testing */}
          <div className="pt-2 border-t border-[#f1f3f4]">
            <p className="text-[11px] font-bold text-[#5f6368] mb-1.5 flex items-center justify-between">
              <span>Demo Staff Accounts (Click to test):</span>
              <span className="text-[10px] text-[#1a73e8] font-normal">Password: staff</span>
            </p>
            <div className="grid grid-cols-3 gap-1.5 text-left">
              <button
                type="button"
                onClick={() => {
                  setEmail('sarah.jenkins@apexlaw.co.uk');
                  setPassword('staff');
                }}
                className="p-1.5 rounded-lg border border-[#e8eaed] hover:border-[#1a73e8] bg-[#f8fafd] text-[11px] leading-tight text-[#202124] transition-colors"
              >
                <div className="font-semibold truncate">Sarah J.</div>
                <div className="text-[10px] text-[#5f6368] truncate">Paralegal</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('mohammed.f@apexlaw.co.uk');
                  setPassword('staff');
                }}
                className="p-1.5 rounded-lg border border-[#e8eaed] hover:border-[#1a73e8] bg-[#f8fafd] text-[11px] leading-tight text-[#202124] transition-colors"
              >
                <div className="font-semibold truncate">Mohammed F.</div>
                <div className="text-[10px] text-[#5f6368] truncate">Solicitor</div>
              </button>
              <button
                type="button"
                onClick={() => {
                  setEmail('emma.watson@apexlaw.co.uk');
                  setPassword('staff');
                }}
                className="p-1.5 rounded-lg border border-[#e8eaed] hover:border-[#1a73e8] bg-[#f8fafd] text-[11px] leading-tight text-[#202124] transition-colors"
              >
                <div className="font-semibold truncate">Emma W.</div>
                <div className="text-[10px] text-[#5f6368] truncate">Legal Sec.</div>
              </button>
            </div>
          </div>

          <div className="pt-2 text-center border-t border-[#f1f3f4]">
            <p className="text-[11px] text-[#70757a]">
              All client documents &amp; case edits are synchronized in real-time with the main firm database.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
