import React, { useState } from 'react';
import { 
  X, 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Copy, 
  Lock, 
  ShieldCheck, 
  CheckSquare, 
  Square,
  ExternalLink,
  Mail,
  Clock,
  Activity,
  Link2,
  Eye,
  EyeOff
} from 'lucide-react';
import { StaffMember, StaffRole, ClientRecord } from '../../types';

interface StaffManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: StaffMember[];
  clients: ClientRecord[];
  onSaveStaffMember: (member: StaffMember) => void;
  onDeleteStaffMember: (id: string) => void;
  onOpenStaffPortal?: () => void;
}

// Helper: relative time from ISO string
function relativeTime(isoStr: string | undefined): string {
  if (!isoStr) return 'Never logged in';
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return new Date(isoStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function getStatusInfo(member: StaffMember): { label: string; color: string; bg: string; dot: string } {
  if (!member.lastLoginAt && !member.inviteUsed && member.inviteToken) {
    return { label: 'Invite Sent', color: '#b06000', bg: '#fef7e0', dot: '#f9ab00' };
  }
  if (!member.lastLoginAt) {
    return { label: 'Never Logged In', color: '#5f6368', bg: '#f1f3f4', dot: '#9aa0a6' };
  }
  const daysSince = (Date.now() - new Date(member.lastLoginAt).getTime()) / 86400000;
  if (daysSince < 7) return { label: 'Active', color: '#137333', bg: '#e6f4ea', dot: '#34a853' };
  return { label: 'Inactive', color: '#d93025', bg: '#fce8e6', dot: '#ea4335' };
}

export const StaffManagementModal: React.FC<StaffManagementModalProps> = ({
  isOpen,
  onClose,
  staffList,
  clients,
  onSaveStaffMember,
  onDeleteStaffMember,
  onOpenStaffPortal
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('Solicitor');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [useInvite, setUseInvite] = useState(true); // invite link vs set password now
  const [assignedClientIds, setAssignedClientIds] = useState<string[]>([]);
  const [assignAllCases, setAssignAllCases] = useState(true);
  const [canView, setCanView] = useState(true);
  const [canUpload, setCanUpload] = useState(true);
  const [canEdit, setCanEdit] = useState(true);
  const [canDelete, setCanDelete] = useState(false);

  if (!isOpen) return null;

  const staffPortalUrl = `${window.location.origin}${window.location.pathname}?portal=staff`;

  const handleCopyStaffLink = () => {
    navigator.clipboard.writeText(staffPortalUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyInviteLink = (member: StaffMember) => {
    if (!member.inviteToken) return;
    const inviteUrl = `${window.location.origin}${window.location.pathname}?staffInvite=${member.inviteToken}`;
    const text = `Hi ${member.name},\n\nYou've been invited to access the DocVault staff portal for our firm.\n\nClick this link to set up your account:\n${inviteUrl}\n\nYour login email: ${member.email}\n\nIf you have any issues, please contact the firm.`;
    navigator.clipboard.writeText(text);
    setCopiedInviteId(member.id);
    setTimeout(() => setCopiedInviteId(null), 2500);
  };

  const startCreate = () => {
    setEditingMember(null);
    setName('');
    setRole('Solicitor');
    setEmail('');
    setPhone('');
    setUsername('');
    setPassword('');
    setUseInvite(true);
    setAssignedClientIds([]);
    setAssignAllCases(true);
    setCanView(true);
    setCanUpload(true);
    setCanEdit(true);
    setCanDelete(false);
    setIsCreatingNew(true);
  };

  const startEdit = (m: StaffMember) => {
    setEditingMember(m);
    setName(m.name);
    setRole(m.role);
    setEmail(m.email);
    setPhone(m.phone || '');
    setUsername(m.username || m.email.split('@')[0]);
    setPassword(m.password || '');
    setUseInvite(!m.inviteUsed && !!m.inviteToken);
    setAssignedClientIds(m.assignedClientIds || []);
    setAssignAllCases(!m.assignedClientIds || m.assignedClientIds.length === 0);
    setCanView(m.permissions?.canView ?? true);
    setCanUpload(m.permissions?.canUpload ?? true);
    setCanEdit(m.permissions?.canEdit ?? true);
    setCanDelete(m.permissions?.canDelete ?? false);
    setIsCreatingNew(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const cleanUser = username.trim() || email.split('@')[0];
    // Generate invite token if using invite flow and creating new
    const inviteToken = (!editingMember && useInvite)
      ? 'inv_' + Math.random().toString(36).substring(2, 18)
      : (editingMember?.inviteToken);

    const memberToSave: StaffMember = {
      id: editingMember ? editingMember.id : 'staff_' + Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      role,
      email: email.trim(),
      phone: phone.trim() || '+44 20 7946 0000',
      username: cleanUser,
      password: useInvite ? (editingMember?.password || undefined) : (password.trim() || undefined),
      avatarColor: editingMember?.avatarColor || ['#1a73e8', '#137333', '#9334e6', '#d93025', '#e37400'][Math.floor(Math.random() * 5)],
      assignedClientIds: assignAllCases ? [] : assignedClientIds,
      permissions: { canView, canUpload, canEdit, canDelete },
      inviteToken: useInvite ? inviteToken : undefined,
      inviteUsed: editingMember?.inviteUsed,
      lastLoginAt: editingMember?.lastLoginAt,
      createdAt: editingMember?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onSaveStaffMember(memberToSave);
    setIsCreatingNew(false);
    setEditingMember(null);
  };

  const toggleClientAssignment = (cId: string) => {
    setAssignedClientIds((prev) =>
      prev.includes(cId) ? prev.filter((id) => id !== cId) : [...prev, cId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none">
      <div className="bg-white border border-[#dadce0] rounded-3xl shadow-2xl max-w-2xl w-full max-h-[88vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#dadce0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-['Google_Sans',sans-serif] text-base font-bold text-[#202124]">
                Staff &amp; Case Worker Management
              </h3>
              <p className="text-xs text-[#5f6368]">
                Invite staff by email — they set their own password and access assigned cases
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

        {/* Staff Portal Link Banner */}
        <div className="px-6 py-3 bg-[#e8f0fe]/60 border-b border-[#dadce0] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#1a73e8]" />
            <span className="text-xs font-semibold text-[#174ea6]">Staff Login URL:</span>
            <code className="text-[11px] font-mono bg-white px-2 py-0.5 rounded border border-[#c2e7ff] text-[#1a73e8]">
              {staffPortalUrl}
            </code>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyStaffLink}
              className="flex items-center gap-1 px-3 py-1 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-lg text-xs font-semibold transition-colors shadow-xs"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Copied!' : 'Copy Login URL'}</span>
            </button>
            {onOpenStaffPortal && (
              <button
                onClick={onOpenStaffPortal}
                className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#f1f3f4] text-[#5f6368] border border-[#dadce0] rounded-lg text-xs font-medium transition-colors"
                title="Preview Staff Portal Login"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Test Login</span>
              </button>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {isCreatingNew ? (
            /* Create / Edit Form */
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#dadce0]">
                <h4 className="text-xs font-bold text-[#202124] uppercase tracking-wider">
                  {editingMember ? 'Edit Staff Member & Permissions' : 'Invite New Staff Member'}
                </h4>
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="text-xs text-[#5f6368] hover:text-[#202124]"
                >
                  Cancel
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">
                    Staff Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (!editingMember && !username) {
                        setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''));
                      }
                    }}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full px-3 py-2 text-xs border border-[#dadce0] rounded-xl bg-white focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">
                    Role in Firm
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as StaffRole)}
                    className="w-full px-3 py-2 text-xs border border-[#dadce0] rounded-xl bg-white focus:outline-none focus:border-[#1a73e8]"
                  >
                    <option value="Partner">Partner / Chambers Head</option>
                    <option value="Senior Solicitor">Senior Solicitor</option>
                    <option value="Solicitor">Solicitor</option>
                    <option value="Paralegal">Paralegal</option>
                    <option value="Case Worker">Case Worker</option>
                    <option value="Legal Secretary">Legal Secretary</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">
                    Email Address * (used to log in)
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sarah@lawfirm.co.uk"
                    className="w-full px-3 py-2 text-xs border border-[#dadce0] rounded-xl bg-white focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+44 20 7946 0912"
                    className="w-full px-3 py-2 text-xs border border-[#dadce0] rounded-xl bg-white focus:outline-none focus:border-[#1a73e8]"
                  />
                </div>
              </div>

              {/* Password setup method */}
              <div className="p-3.5 bg-[#f8fafd] border border-[#dadce0] rounded-2xl space-y-3">
                <span className="text-xs font-bold text-[#202124] uppercase tracking-wider block">
                  Password Setup Method:
                </span>
                <div className="flex flex-col gap-2">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={useInvite}
                      onChange={() => setUseInvite(true)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-semibold text-[#202124]">📧 Send Invite Link (Recommended)</p>
                      <p className="text-[11px] text-[#5f6368]">Generate an invite link. Staff clicks it and sets their own password. Secure &amp; professional.</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="radio"
                      checked={!useInvite}
                      onChange={() => setUseInvite(false)}
                      className="mt-0.5"
                    />
                    <div>
                      <p className="text-xs font-semibold text-[#202124]">🔑 Set Password Now</p>
                      <p className="text-[11px] text-[#5f6368]">Manually set a temporary password and share it with the staff member.</p>
                    </div>
                  </label>
                </div>

                {!useInvite && (
                  <div className="relative mt-1">
                    <Lock className="w-4 h-4 text-[#5f6368] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Set temporary password"
                      className="w-full pl-9 pr-10 py-2 text-xs border border-[#dadce0] rounded-xl bg-white focus:outline-none focus:border-[#1a73e8] font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368]"
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Permissions Section */}
              <div className="p-3.5 bg-[#f8fafd] border border-[#dadce0] rounded-2xl space-y-2">
                <span className="text-xs font-bold text-[#202124] uppercase tracking-wider block">
                  Staff Permissions:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: 'Can View', checked: canView, onChange: setCanView, color: '#137333' },
                    { label: 'Can Upload', checked: canUpload, onChange: setCanUpload, color: '#1a73e8' },
                    { label: 'Can Edit', checked: canEdit, onChange: setCanEdit, color: '#b06000' },
                    { label: 'Can Delete', checked: canDelete, onChange: setCanDelete, color: '#d93025' },
                  ].map(({ label, checked, onChange, color }) => (
                    <label key={label} className="flex items-center gap-2 p-2 bg-white rounded-xl border border-[#dadce0] cursor-pointer text-xs font-medium text-[#202124]">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => onChange(e.target.checked)}
                        className="rounded"
                        style={{ accentColor: color }}
                      />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Assigned Cases Section */}
              <div className="p-3.5 bg-[#f8fafd] border border-[#dadce0] rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#202124] uppercase tracking-wider">
                    Assigned Client Cases:
                  </span>
                  <label className="flex items-center gap-1.5 cursor-pointer text-xs font-semibold text-[#1a73e8]">
                    <input
                      type="checkbox"
                      checked={assignAllCases}
                      onChange={(e) => setAssignAllCases(e.target.checked)}
                      className="rounded"
                      style={{ accentColor: '#1a73e8' }}
                    />
                    <span>All Firm Cases ({clients.length})</span>
                  </label>
                </div>

                {!assignAllCases && (
                  <div className="max-h-36 overflow-y-auto space-y-1.5 pt-1 border-t border-[#dadce0]">
                    {clients.map((c) => {
                      const isAssigned = assignedClientIds.includes(c.id);
                      return (
                        <div
                          key={c.id}
                          onClick={() => toggleClientAssignment(c.id)}
                          className={`flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs cursor-pointer transition-colors ${
                            isAssigned
                              ? 'bg-[#e8f0fe] border-[#c2e7ff] text-[#174ea6] font-semibold'
                              : 'bg-white border-[#dadce0] text-[#5f6368] hover:bg-[#f8fafd]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            {isAssigned ? (
                              <CheckSquare className="w-3.5 h-3.5 text-[#1a73e8]" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-[#dadce0]" />
                            )}
                            <span>{c.name}</span>
                          </div>
                          <span className="text-[10px] text-[#70757a]">{c.cameFor || 'Case'}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingNew(false)}
                  className="px-4 py-2 text-xs font-medium text-[#5f6368] hover:bg-[#f1f3f4] rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-bold rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
                >
                  {useInvite && !editingMember ? (
                    <>
                      <Mail className="w-4 h-4" />
                      <span>Create &amp; Generate Invite Link</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>{editingMember ? 'Save Changes' : 'Create Staff Account'}</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Staff List View */
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#5f6368] uppercase tracking-wider">
                  Firm Staff Directory ({staffList.length})
                </span>
                <button
                  onClick={startCreate}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl text-xs font-semibold transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Invite Staff Member</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {staffList.map((member) => {
                  const assignedCount = !member.assignedClientIds || member.assignedClientIds.length === 0
                    ? clients.length
                    : member.assignedClientIds.length;
                  const status = getStatusInfo(member);
                  const hasInvite = !!member.inviteToken && !member.inviteUsed;

                  return (
                    <div
                      key={member.id}
                      className="p-3.5 bg-white border border-[#dadce0] hover:border-[#1a73e8]/50 rounded-2xl shadow-xs transition-all"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            style={{ backgroundColor: member.avatarColor || '#1a73e8' }}
                            className="w-10 h-10 rounded-full text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5"
                          >
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-bold text-[#202124] truncate">
                                {member.name}
                              </span>
                              <span className="text-[10px] font-semibold bg-[#e8f0fe] text-[#1a73e8] px-2 py-0.5 rounded-full">
                                {member.role}
                              </span>
                              {/* Status badge */}
                              <span
                                className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                                style={{ backgroundColor: status.bg, color: status.color }}
                              >
                                <span
                                  className="w-1.5 h-1.5 rounded-full inline-block"
                                  style={{ backgroundColor: status.dot }}
                                />
                                {status.label}
                              </span>
                            </div>

                            <div className="text-[11px] text-[#5f6368] mt-0.5 flex items-center gap-1">
                              <Mail className="w-3 h-3" />
                              <span>{member.email}</span>
                            </div>

                            <div className="flex items-center gap-3 text-[11px] text-[#5f6368] mt-1 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Activity className="w-3 h-3" />
                                {relativeTime(member.lastLoginAt)}
                              </span>
                              <span className="flex items-center gap-1 text-[#137333] font-medium">
                                <span>• {assignedCount} {assignedCount === 1 ? 'case' : 'cases'}</span>
                              </span>
                            </div>

                            {/* Permissions tags */}
                            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                              {member.permissions?.canView !== false && (
                                <span className="text-[10px] font-medium bg-[#e6f4ea] text-[#137333] px-1.5 py-0.5 rounded">View</span>
                              )}
                              {member.permissions?.canUpload !== false && (
                                <span className="text-[10px] font-medium bg-[#e8f0fe] text-[#1a73e8] px-1.5 py-0.5 rounded">Upload</span>
                              )}
                              {member.permissions?.canEdit !== false && (
                                <span className="text-[10px] font-medium bg-[#fef7e0] text-[#b06000] px-1.5 py-0.5 rounded">Edit</span>
                              )}
                              {member.permissions?.canDelete && (
                                <span className="text-[10px] font-medium bg-[#fce8e6] text-[#c5221f] px-1.5 py-0.5 rounded">Delete</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {/* Invite link button */}
                          {hasInvite && (
                            <button
                              onClick={() => handleCopyInviteLink(member)}
                              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors border ${
                                copiedInviteId === member.id
                                  ? 'bg-[#e6f4ea] text-[#137333] border-[#ceead6]'
                                  : 'bg-[#fef7e0] text-[#b06000] border-[#f9ab00]/30 hover:bg-[#f9ab00]/20'
                              }`}
                              title="Copy invite link to send to staff member"
                            >
                              {copiedInviteId === member.id ? (
                                <Check className="w-3.5 h-3.5" />
                              ) : (
                                <Link2 className="w-3.5 h-3.5" />
                              )}
                              <span>{copiedInviteId === member.id ? 'Copied!' : 'Copy Invite'}</span>
                            </button>
                          )}
                          <button
                            onClick={() => startEdit(member)}
                            className="p-1.5 text-[#5f6368] hover:text-[#1a73e8] hover:bg-[#e8f0fe] rounded-lg transition-colors"
                            title="Edit Staff Member"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Remove ${member.name} from firm staff?`)) {
                                onDeleteStaffMember(member.id);
                              }
                            }}
                            className="p-1.5 text-[#5f6368] hover:text-[#d93025] hover:bg-[#fce8e6] rounded-lg transition-colors"
                            title="Delete Staff Member"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#f8fafd] border-t border-[#dadce0] flex items-center justify-between">
          <p className="text-[11px] text-[#5f6368]">
            Staff accounts sync to Supabase — accessible from any device. Invite links expire once used.
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-[#202124] hover:bg-[#e8f0fe] rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
