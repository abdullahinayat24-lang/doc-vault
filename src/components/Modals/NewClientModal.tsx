import React, { useState } from 'react';
import { X, UserPlus, Phone, Mail, FileText, PoundSterling, AlertCircle } from 'lucide-react';
import { ClientRecord, ClientPriority } from '../../types';

interface NewClientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddClient: (client: ClientRecord) => void;
}

export const NewClientModal: React.FC<NewClientModalProps> = ({
  isOpen,
  onClose,
  onAddClient
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cameFor, setCameFor] = useState('');
  const [priority, setPriority] = useState<ClientPriority>('normal');
  const [totalAskingAmount, setTotalAskingAmount] = useState<string>('1500');
  const [totalDocCost, setTotalDocCost] = useState<string>('250');
  const [initialVisitReason, setInitialVisitReason] = useState('Initial consultation and document submission');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newClient: ClientRecord = {
      id: 'client-' + Math.random().toString(36).substring(2, 9),
      name: name.trim(),
      phone: phone.trim() || '+44 7000 000000',
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
      cameFor: cameFor.trim() || 'General Legal Representation',
      priority,
      totalAskingAmount: parseFloat(totalAskingAmount) || 0,
      totalDocCost: parseFloat(totalDocCost) || 0,
      amountPaid: 0,
      firstVisitDate: new Date().toISOString(),
      lastVisitDate: new Date().toISOString(),
      visitCount: 1,
      notes: initialVisitReason.trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    onAddClient(newClient);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs select-none">
      <div className="bg-white border border-[#dadce0] rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#dadce0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-['Google_Sans',sans-serif] text-base font-bold text-[#202124]">
                Register New Client Case
              </h3>
              <p className="text-xs text-[#5f6368]">
                Add client details, reason for visit, and fee breakdown
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Client Name & Priority */}
          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-bold text-[#202124] mb-1">
                Client Full Name *
              </label>
              <input
                type="text"
                placeholder="e.g. Mr. Marcus Sterling"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="w-full px-3.5 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#202124] mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ClientPriority)}
                className="w-full px-2.5 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none"
              >
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="normal">Normal</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#202124] mb-1">
                Phone Number *
              </label>
              <div className="relative flex items-center">
                <Phone className="w-3.5 h-3.5 text-[#5f6368] absolute left-3" />
                <input
                  type="tel"
                  placeholder="+44 7911 123456"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  className="w-full pl-8 pr-3 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#202124] mb-1">
                Email Address
              </label>
              <div className="relative flex items-center">
                <Mail className="w-3.5 h-3.5 text-[#5f6368] absolute left-3" />
                <input
                  type="email"
                  placeholder="client@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none"
                />
              </div>
            </div>
          </div>

          {/* Came For / Purpose */}
          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1">
              Came For / Case Purpose *
            </label>
            <div className="relative flex items-center">
              <FileText className="w-3.5 h-3.5 text-[#5f6368] absolute left-3" />
              <input
                type="text"
                placeholder="e.g. Spouse Visa Application, British Citizenship, Work Permit..."
                value={cameFor}
                onChange={(e) => setCameFor(e.target.value)}
                required
                className="w-full pl-8 pr-3 py-2 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none"
              />
            </div>
          </div>

          {/* Financials / Fees */}
          <div className="p-3.5 bg-[#f8fafd] border border-[#dadce0] rounded-2xl space-y-3">
            <h4 className="text-xs font-bold text-[#202124] uppercase tracking-wider flex items-center gap-1.5">
              <PoundSterling className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span>Solicitor Fees &amp; Document Costs</span>
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">
                  Total Agreed Fee (£)
                </label>
                <input
                  type="number"
                  value={totalAskingAmount}
                  onChange={(e) => setTotalAskingAmount(e.target.value)}
                  placeholder="1500"
                  className="w-full px-3 py-1.5 bg-white border border-[#dadce0] rounded-lg text-xs outline-none font-medium"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">
                  Doc Sending &amp; Registry Cost (£)
                </label>
                <input
                  type="number"
                  value={totalDocCost}
                  onChange={(e) => setTotalDocCost(e.target.value)}
                  placeholder="250"
                  className="w-full px-3 py-1.5 bg-white border border-[#dadce0] rounded-lg text-xs outline-none font-medium"
                />
              </div>
            </div>
          </div>

          {/* Initial Visit Purpose Notes */}
          <div>
            <label className="block text-xs font-bold text-[#202124] mb-1">
              Visit Purpose Notes
            </label>
            <textarea
              rows={2}
              value={initialVisitReason}
              onChange={(e) => setInitialVisitReason(e.target.value)}
              placeholder="e.g. Came 1st time for spouse application filing and initial biometrics check..."
              className="w-full p-2.5 bg-[#f8fafd] border border-[#dadce0] focus:bg-white focus:border-[#1a73e8] rounded-xl text-xs outline-none"
            />
          </div>

          {/* Footer */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-[#5f6368] hover:bg-[#f1f3f4] rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl shadow-sm transition-colors"
            >
              Create Client Profile
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
