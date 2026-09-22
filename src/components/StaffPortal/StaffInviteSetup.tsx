import React, { useState, useEffect } from 'react';
import { Lock, CheckCircle2, AlertCircle, Eye, EyeOff, ArrowRight, Briefcase } from 'lucide-react';
import { StaffMember } from '../../types';
import { validateStaffInviteToken, consumeStaffInvite } from '../../lib/storage';

interface StaffInviteSetupProps {
  token: string;
  onSetupComplete: () => void; // redirect to staff portal after setup
}

export const StaffInviteSetup: React.FC<StaffInviteSetupProps> = ({ token, onSetupComplete }) => {
  const [staffMember, setStaffMember] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [invalid, setInvalid] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    validateStaffInviteToken(token).then((member) => {
      if (member) {
        setStaffMember(member);
      } else {
        setInvalid(true);
      }
      setLoading(false);
    });
  }, [token]);

  const handleSetPassword = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError(null);
    setIsSaving(true);
    const ok = await consumeStaffInvite(token, password);
    setIsSaving(false);
    if (ok) {
      setDone(true);
      setTimeout(() => onSetupComplete(), 2500);
    } else {
      setError('Something went wrong. This invite may have already been used.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f8fafd] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[#1a73e8] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (invalid) {
    return (
      <div className="min-h-screen bg-[#f8fafd] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#fce8e6] text-[#d93025] flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="font-['Google_Sans',sans-serif] text-xl font-bold text-[#202124]">
          Invalid or Used Invite
        </h2>
        <p className="text-sm text-[#5f6368] mt-1 max-w-sm">
          This invite link is invalid, has already been used, or has expired. Please ask your firm to send a new invite.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-[#f8fafd] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#e6f4ea] text-[#137333] flex items-center justify-center mb-4">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="font-['Google_Sans',sans-serif] text-xl font-bold text-[#202124]">
          Password Set! Redirecting…
        </h2>
        <p className="text-sm text-[#5f6368] mt-1">
          You can now log in with your email and password.
        </p>
      </div>
    );
  }

  const initials = staffMember!.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f8fafd] to-[#e8f0fe] flex flex-col items-center justify-center p-4">
      <div className="bg-white border border-[#dadce0] rounded-3xl shadow-xl max-w-sm w-full p-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center mx-auto mb-3">
            <Briefcase className="w-8 h-8" />
          </div>
          <h1 className="font-['Google_Sans',sans-serif] text-xl font-bold text-[#202124]">
            Welcome to DocVault
          </h1>
          <p className="text-sm text-[#5f6368] mt-1">
            You've been invited to join the firm's staff portal
          </p>
        </div>

        {/* Staff info */}
        <div className="p-4 bg-[#f8fafd] border border-[#dadce0] rounded-2xl flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl text-white flex items-center justify-center text-sm font-bold flex-shrink-0"
            style={{ backgroundColor: staffMember!.avatarColor || '#1a73e8' }}
          >
            {initials}
          </div>
          <div>
            <p className="font-semibold text-sm text-[#202124]">{staffMember!.name}</p>
            <p className="text-xs text-[#5f6368]">{staffMember!.role} • {staffMember!.email}</p>
          </div>
        </div>

        {/* Password setup form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1.5">
              Set Your Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#5f6368] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full pl-9 pr-10 py-2.5 bg-[#f8fafd] border border-[#dadce0] focus:border-[#1a73e8] focus:bg-white rounded-xl text-sm outline-none transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368] hover:text-[#202124]"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#202124] uppercase tracking-wider mb-1.5">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#5f6368] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
                className="w-full pl-9 pr-4 py-2.5 bg-[#f8fafd] border border-[#dadce0] focus:border-[#1a73e8] focus:bg-white rounded-xl text-sm outline-none transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleSetPassword()}
              />
            </div>
          </div>

          {error && (
            <p className="text-xs text-[#d93025] font-semibold flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {error}
            </p>
          )}

          <button
            onClick={handleSetPassword}
            disabled={isSaving || !password || !confirmPassword}
            className="w-full py-3 bg-[#1a73e8] hover:bg-[#1557b0] disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <span>Activate My Account</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>

        <p className="text-center text-[11px] text-[#5f6368]">
          After setting your password, you'll be redirected to the staff login page.
        </p>
      </div>
    </div>
  );
};
