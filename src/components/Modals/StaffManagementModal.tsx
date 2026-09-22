import React, { useState } from 'react';
import { 
  X, 
  Users, 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Copy, 
  Key, 
  Lock, 
  ShieldCheck, 
  CheckSquare, 
  Square,
  ExternalLink,
  Briefcase,
  AlertCircle
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
  const [editingMember, setEditingMember] = useState<StaffMember | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [role, setRole] = useState<StaffRole>('Solicitor');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('password123');
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

  const startCreate = () => {
    setEditingMember(null);
    setName('');
    setRole('Solicitor');
    setEmail('');
    setPhone('');
    setUsername('');
    setPassword('password123');
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
    setUsername(m.username || m.name.toLowerCase().replace(/[^a-z0-9]/g, ''));
    setPassword(m.password || 'password123');
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
    if (!name.trim()) return;

    const cleanUser = username.trim().toLowerCase() || name.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanPass = password.trim() || 'password123';

    const memberToSave: StaffMember = {
      id: editingMember ? editingMember.id : 'staff_' + Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      role,
      email: email.trim() || `${cleanUser}@lawfirm.co.uk`,
      phone: phone.trim() || '+44 20 7946 0000',
      username: cleanUser,
      password: cleanPass,
      avatarColor: editingMember?.avatarColor || ['#1a73e8', '#137333', '#9334e6', '#d93025', '#e37400'][Math.floor(Math.random() * 5)],
      assignedClientIds: assignAllCases ? [] : assignedClientIds,
      permissions: {
        canView,
        canUpload,
        canEdit,
        canDelete
      },
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
                Assign individual accounts, case permissions &amp; credentials for your firm
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
            <span className="text-xs font-semibold text-[#174ea6]">Staff Portal Link:</span>
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
              <span>{copiedLink ? 'Copied!' : 'Copy Staff Link'}</span>
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
                  {editingMember ? 'Edit Staff Member & Permissions' : 'New Staff Account'}
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
                    Login Username *
                  </label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                    placeholder="e.g. sarah"
                    className="w-full px-3 py-2 text-xs border border-[#dadce0] rounded-xl bg-white focus:outline-none focus:border-[#1a73e8] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">
                    Login Password *
                  </label>
                  <input
                    type="text"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="e.g. password123"
                    className="w-full px-3 py-2 text-xs border border-[#dadce0] rounded-xl bg-white focus:outline-none focus:border-[#1a73e8] font-mono font-bold text-[#1a73e8]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
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

              {/* Permissions Section */}
              <div className="p-3.5 bg-[#f8fafd] border border-[#dadce0] rounded-2xl space-y-2">
                <span className="text-xs font-bold text-[#202124] uppercase tracking-wider block">
                  Staff Permissions:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-[#dadce0] cursor-pointer text-xs font-medium text-[#202124]">
                    <input
                      type="checkbox"
                      checked={canView}
                      onChange={(e) => setCanView(e.target.checked)}
                      className="rounded text-[#1a73e8]"
                    />
                    <span>Can View</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-[#dadce0] cursor-pointer text-xs font-medium text-[#202124]">
                    <input
                      type="checkbox"
                      checked={canUpload}
                      onChange={(e) => setCanUpload(e.target.checked)}
                      className="rounded text-[#1a73e8]"
                    />
                    <span>Can Upload</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-[#dadce0] cursor-pointer text-xs font-medium text-[#202124]">
                    <input
                      type="checkbox"
                      checked={canEdit}
                      onChange={(e) => setCanEdit(e.target.checked)}
                      className="rounded text-[#1a73e8]"
                    />
                    <span>Can Edit</span>
                  </label>

                  <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-[#dadce0] cursor-pointer text-xs font-medium text-[#202124]">
                    <input
                      type="checkbox"
                      checked={canDelete}
                      onChange={(e) => setCanDelete(e.target.checked)}
                      className="rounded text-[#d93025]"
                    />
                    <span>Can Delete</span>
                  </label>
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
                      className="rounded text-[#1a73e8]"
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
                  <Check className="w-4 h-4" />
                  <span>{editingMember ? 'Save Changes' : 'Create Staff Account'}</span>
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
                  <span>Add Staff Member</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {staffList.map((member) => {
                  const assignedCount = !member.assignedClientIds || member.assignedClientIds.length === 0
                    ? clients.length
                    : member.assignedClientIds.length;

                  return (
                    <div
                      key={member.id}
                      className="p-3.5 bg-white border border-[#dadce0] hover:border-[#1a73e8]/50 rounded-2xl shadow-xs transition-all flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          style={{ backgroundColor: member.avatarColor || '#1a73e8' }}
                          className="w-10 h-10 rounded-full text-white font-bold text-sm flex items-center justify-center flex-shrink-0 shadow-xs"
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
                          </div>

                          <div className="flex items-center gap-3 text-xs text-[#5f6368] mt-0.5 flex-wrap font-mono">
                            <span>User: <strong className="text-[#202124]">{member.username || 'staff'}</strong></span>
                            <span>Pass: <strong className="text-[#1a73e8]">{member.password || 'password123'}</strong></span>
                            <span className="text-[11px] font-sans text-[#137333] font-medium">
                              • {assignedCount} {assignedCount === 1 ? 'case' : 'cases'} accessible
                            </span>
                          </div>

                          {/* Permissions tags */}
                          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                            {member.permissions?.canView !== false && (
                              <span className="text-[10px] font-medium bg-[#e6f4ea] text-[#137333] px-1.5 py-0.5 rounded">
                                View
                              </span>
                            )}
                            {member.permissions?.canUpload !== false && (
                              <span className="text-[10px] font-medium bg-[#e8f0fe] text-[#1a73e8] px-1.5 py-0.5 rounded">
                                Upload
                              </span>
                            )}
                            {member.permissions?.canEdit !== false && (
                              <span className="text-[10px] font-medium bg-[#fef7e0] text-[#b06000] px-1.5 py-0.5 rounded">
                                Edit
                              </span>
                            )}
                            {member.permissions?.canDelete && (
                              <span className="text-[10px] font-medium bg-[#fce8e6] text-[#c5221f] px-1.5 py-0.5 rounded">
                                Delete
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 flex-shrink-0">
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
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-[#f8fafd] border-t border-[#dadce0] flex items-center justify-between">
          <p className="text-[11px] text-[#5f6368]">
            Staff accounts sync automatically to Supabase so staff can sign in from any workstation.
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
