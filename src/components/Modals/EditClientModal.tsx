import React, { useState } from 'react';
import {
  X,
  UserCheck,
  Phone,
  Mail,
  FileText,
  PoundSterling,
  AlertCircle,
  Users,
  Calendar,
  Clock,
  CheckCircle2,
  Plus,
  StickyNote,
  TrendingUp
} from 'lucide-react';
import { ClientRecord, ClientPriority, StaffMember } from '../../types';

interface EditClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientRecord;
  staffList?: StaffMember[];
  onSave: (updated: ClientRecord) => void;
}

const PRIORITY_OPTIONS: { value: ClientPriority; label: string; color: string }[] = [
  { value: 'urgent', label: '🔴 Urgent', color: '#d93025' },
  { value: 'high',   label: '🟠 High',   color: '#b06000' },
  { value: 'normal', label: '🔵 Normal', color: '#1a73e8' },
  { value: 'low',    label: '⚫ Low',    color: '#5f6368' },
];

export const EditClientModal: React.FC<EditClientModalProps> = ({
  isOpen,
  onClose,
  client,
  staffList = [],
  onSave
}) => {
  // Personal
  const [name, setName]               = useState(client.name);
  const [phone, setPhone]             = useState(client.phone);
  const [email, setEmail]             = useState(client.email);
  const [cameFor, setCameFor]         = useState(client.cameFor);
  const [priority, setPriority]       = useState<ClientPriority>(client.priority);
  const [assignedStaffId, setAssignedStaffId] = useState(client.assignedStaffId || '');

  // Visit tracking
  const [visitCount, setVisitCount]     = useState(client.visitCount || 1);
  const [lastVisitDate, setLastVisitDate] = useState(
    client.lastVisitDate ? client.lastVisitDate.split('T')[0] : new Date().toISOString().split('T')[0]
  );
  const [whoAttended, setWhoAttended]   = useState(client.whoAttended || '');

  // Financials
  const [totalAskingAmount, setTotalAskingAmount] = useState(String(client.totalAskingAmount || 0));
  const [totalDocCost, setTotalDocCost]           = useState(String(client.totalDocCost || 0));
  const [amountPaid, setAmountPaid]               = useState(String(client.amountPaid || 0));

  // Notes
  const [notes, setNotes] = useState(client.notes || '');

  if (!isOpen) return null;

  const outstanding = parseFloat(totalAskingAmount || '0') + parseFloat(totalDocCost || '0') - parseFloat(amountPaid || '0');

  const handleLogNewVisit = () => {
    setVisitCount(v => v + 1);
    setLastVisitDate(new Date().toISOString().split('T')[0]);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const updated: ClientRecord = {
      ...client,
      name: name.trim(),
      phone: phone.trim() || client.phone,
      email: email.trim() || client.email,
      cameFor: cameFor.trim() || client.cameFor,
      priority,
      assignedStaffId: assignedStaffId || undefined,
      visitCount,
      lastVisitDate: new Date(lastVisitDate).toISOString(),
      whoAttended: whoAttended.trim() || undefined,
      totalAskingAmount: parseFloat(totalAskingAmount) || 0,
      totalDocCost: parseFloat(totalDocCost) || 0,
      amountPaid: parseFloat(amountPaid) || 0,
      notes: notes.trim() || undefined,
      updatedAt: new Date().toISOString()
    };
    onSave(updated);
    onClose();
  };

  const paymentStatus = outstanding <= 0
    ? { label: 'Paid in Full', color: '#137333', bg: '#e6f4ea', icon: <CheckCircle2 className="w-3.5 h-3.5" /> }
    : parseFloat(amountPaid) === 0
      ? { label: 'No Payment Received', color: '#d93025', bg: '#fce8e6', icon: <AlertCircle className="w-3.5 h-3.5" /> }
      : { label: `Balance Due: £${outstanding.toLocaleString('en-GB', { minimumFractionDigits: 0 })}`, color: '#b06000', bg: '#fef7e0', icon: <TrendingUp className="w-3.5 h-3.5" /> };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs select-none">
      <div className="bg-white border border-[#dadce0] rounded-3xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#dadce0] flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-[#f8fafd] to-white">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-['Google_Sans',sans-serif] text-base font-bold text-[#202124]">Edit Client Record</h3>
              <p className="text-xs text-[#5f6368]">Update details, log visits, track payments</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-6 space-y-5">
          {/* ── Personal Details ── */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-[#3c4043] uppercase tracking-wider flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5 text-[#1a73e8]" /> Personal Details
            </h4>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-[#202124] mb-1">Client Full Name *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">Priority</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as ClientPriority)}
                  className="w-full px-2.5 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none font-semibold"
                >
                  {PRIORITY_OPTIONS.map(p => (
                    <option key={p.value} value={p.value}>{p.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">Phone</label>
                <div className="relative flex items-center">
                  <Phone className="w-3.5 h-3.5 text-[#5f6368] absolute left-3" />
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1">Email</label>
                <div className="relative flex items-center">
                  <Mail className="w-3.5 h-3.5 text-[#5f6368] absolute left-3" />
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#202124] mb-1">Case Purpose</label>
              <div className="relative flex items-center">
                <FileText className="w-3.5 h-3.5 text-[#5f6368] absolute left-3" />
                <input type="text" value={cameFor} onChange={(e) => setCameFor(e.target.value)}
                  placeholder="e.g. Spouse Visa Application, British Citizenship..."
                  className="w-full pl-8 pr-3 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none" />
              </div>
            </div>

            {staffList.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-[#202124] mb-1 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-[#1a73e8]" /> Assigned Staff
                </label>
                <select
                  value={assignedStaffId}
                  onChange={(e) => setAssignedStaffId(e.target.value)}
                  className="w-full px-3 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none font-medium text-[#202124]"
                >
                  <option value="">Unassigned (General Firm Pool)</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {s.role}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* ── Visit Tracking ── */}
          <div className="p-4 bg-[#f0f7ff] border border-[#1a73e8]/20 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#1a73e8] uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" /> Visit Tracking
              </h4>
              <button
                type="button"
                onClick={handleLogNewVisit}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Log New Visit (Today)
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">Total Visits</label>
                <input
                  type="number"
                  min={1}
                  value={visitCount}
                  onChange={(e) => setVisitCount(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 bg-white border border-[#dadce0] rounded-lg text-sm font-bold outline-none text-center text-[#202124] focus:border-[#1a73e8]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">Last Visit Date</label>
                <input
                  type="date"
                  value={lastVisitDate}
                  onChange={(e) => setLastVisitDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#dadce0] rounded-lg text-xs outline-none text-[#202124] focus:border-[#1a73e8]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">First Visit</label>
                <div className="px-3 py-1.5 bg-[#f1f3f4] border border-[#dadce0] rounded-lg text-xs text-[#5f6368] font-medium">
                  {new Date(client.firstVisitDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">Who Attended This Visit</label>
              <input
                type="text"
                value={whoAttended}
                onChange={(e) => setWhoAttended(e.target.value)}
                placeholder="e.g. Mr. Ali + Mrs. Ali, children, solicitor attended..."
                className="w-full px-3 py-2 bg-white border border-[#dadce0] focus:border-[#1a73e8] rounded-xl text-xs outline-none"
              />
            </div>
          </div>

          {/* ── Payment & Fees ── */}
          <div className="p-4 bg-[#f0fdf4] border border-[#137333]/20 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-[#137333] uppercase tracking-wider flex items-center gap-1.5">
                <PoundSterling className="w-3.5 h-3.5" /> Payment & Fees
              </h4>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold" style={{ backgroundColor: paymentStatus.bg, color: paymentStatus.color }}>
                {paymentStatus.icon}
                <span>{paymentStatus.label}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">Agreed Solicitor Fee (£)</label>
                <input
                  type="number"
                  value={totalAskingAmount}
                  onChange={(e) => setTotalAskingAmount(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#dadce0] rounded-lg text-xs outline-none font-medium focus:border-[#1a73e8]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">Doc / Registry Cost (£)</label>
                <input
                  type="number"
                  value={totalDocCost}
                  onChange={(e) => setTotalDocCost(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-[#dadce0] rounded-lg text-xs outline-none font-medium focus:border-[#1a73e8]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#137333] mb-1">Amount Paid (£)</label>
                <input
                  type="number"
                  value={amountPaid}
                  onChange={(e) => setAmountPaid(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border-2 border-[#137333]/30 rounded-lg text-xs outline-none font-bold text-[#137333] focus:border-[#137333]"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold text-[#3c4043] pt-1 border-t border-[#dadce0]">
              <span>Total Cost: £{(parseFloat(totalAskingAmount || '0') + parseFloat(totalDocCost || '0')).toLocaleString()}</span>
              <span className={outstanding > 0 ? 'text-[#d93025] font-bold' : 'text-[#137333] font-bold'}>
                {outstanding > 0 ? `Outstanding: £${outstanding.toLocaleString()}` : '✓ Fully Paid'}
              </span>
            </div>
          </div>

          {/* ── Internal Notes ── */}
          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1.5 flex items-center gap-1.5">
              <StickyNote className="w-3.5 h-3.5 text-[#f59e0b]" />
              Internal Notes
              <span className="text-[10px] font-normal text-[#5f6368] bg-[#f1f3f4] px-1.5 py-0.5 rounded-full ml-1">🔒 Firm only — not shared with client</span>
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Internal case notes, important observations, follow-up reminders..."
              className="w-full p-3 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#dadce0] flex items-center justify-end gap-2 flex-shrink-0 bg-[#f8fafd]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-[#5f6368] hover:bg-[#f1f3f4] rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 text-xs font-bold bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl shadow-sm transition-colors flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};
