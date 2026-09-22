import React, { useState } from 'react';
import { 
  Users, 
  Lock, 
  User, 
  ArrowRight, 
  ShieldCheck, 
  Briefcase, 
  Eye, 
  EyeOff, 
  ArrowLeft,
  AlertCircle
} from 'lucide-react';
import { StaffMember } from '../../types';
import { getStaff, fetchStaffFromSupabase } from '../../lib/storage';

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
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // First try fetching latest staff from Supabase in case changed on another device
      const remoteStaff = await fetchStaffFromSupabase();
      const staffList = remoteStaff && remoteStaff.length > 0 ? remoteStaff : getStaff();

      const cleanUser = username.trim().toLowerCase();
      const cleanPass = password.trim();

      const match = staffList.find(
        (s) =>
          (s.username && s.username.toLowerCase() === cleanUser) ||
          s.email.toLowerCase() === cleanUser ||
          s.name.toLowerCase() === cleanUser
      );

      if (!match) {
        setError('Staff username not recognized. Please contact your senior solicitor.');
        setIsLoading(false);
        return;
      }

      if (match.password && match.password !== cleanPass) {
        setError('Incorrect password for this staff member.');
        setIsLoading(false);
        return;
      }

      // Success
      sessionStorage.setItem('docvault_staff_session', JSON.stringify(match));
      onStaffLogin(match);
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
              Sign in with your assigned firm username and password to access your cases
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
              Staff Username or Email
            </label>
            <div className="relative flex items-center">
              <User className="w-4 h-4 text-[#5f6368] absolute left-3" />
              <input
                type="text"
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. sarah, david, amina"
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
            disabled={isLoading || !username.trim() || !password.trim()}
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
