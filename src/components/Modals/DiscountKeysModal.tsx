import React, { useState } from 'react';
import { X, Tag, Plus, Trash2, Check, Copy, Percent, Sparkles, ShieldCheck } from 'lucide-react';
import { getPromoCodes, savePromoCode, deletePromoCode, PromoCode } from '../../lib/storage';

interface DiscountKeysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DiscountKeysModal: React.FC<DiscountKeysModalProps> = ({ isOpen, onClose }) => {
  const [codes, setCodes] = useState<PromoCode[]>(() => {
    const existing = getPromoCodes();
    if (existing.length === 0) {
      // Seed initial default discount keys
      const initial: PromoCode[] = [
        {
          id: 'seed-1',
          code: 'SPECIAL50',
          label: 'Special 50% Solicitor Discount',
          discountPct: 50,
          active: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'seed-2',
          code: 'VIP100',
          label: '100% Free Lifetime VIP Key',
          discountPct: 100,
          active: true,
          createdAt: new Date().toISOString()
        },
        {
          id: 'seed-3',
          code: 'SAVE20',
          label: '20% Early Partner Discount',
          discountPct: 20,
          active: true,
          createdAt: new Date().toISOString()
        }
      ];
      initial.forEach(savePromoCode);
      return initial;
    }
    return existing;
  });

  const [newCode, setNewCode]               = useState('');
  const [newDiscount, setNewDiscount]       = useState('25');
  const [newLabel, setNewLabel]             = useState('');
  const [error, setError]                   = useState('');
  const [copiedId, setCopiedId]             = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = newCode.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    const pct = parseInt(newDiscount, 10);

    if (!cleanCode) {
      setError('Please enter a discount code name (e.g. SPECIAL30)');
      return;
    }
    if (isNaN(pct) || pct < 1 || pct > 100) {
      setError('Discount must be between 1% and 100%');
      return;
    }
    if (codes.some(c => c.code === cleanCode)) {
      setError(`Code "${cleanCode}" already exists.`);
      return;
    }

    const created: PromoCode = {
      id: 'promo_' + Math.random().toString(36).substring(2, 9),
      code: cleanCode,
      label: newLabel.trim() || `${pct}% Discount Key`,
      discountPct: pct,
      active: true,
      createdAt: new Date().toISOString()
    };

    savePromoCode(created);
    setCodes(getPromoCodes());
    setNewCode('');
    setNewLabel('');
    setNewDiscount('25');
    setError('');
  };

  const handleDeleteKey = (id: string) => {
    deletePromoCode(id);
    setCodes(getPromoCodes());
  };

  const handleToggleActive = (promo: PromoCode) => {
    const updated: PromoCode = { ...promo, active: !promo.active };
    savePromoCode(updated);
    setCodes(getPromoCodes());
  };

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#dadce0] w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#dadce0] flex items-center justify-between bg-gradient-to-r from-[#f8fafd] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shadow-xs">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Google_Sans',sans-serif] text-base font-bold text-[#202124]">
                Special Discount Keys
              </h2>
              <p className="text-xs text-[#5f6368]">
                Generate custom discount codes for clients & chambers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-full transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Create New Key Form */}
          <form onSubmit={handleAddKey} className="bg-[#f8fafd] border border-[#dadce0] rounded-2xl p-4 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-[#202124] uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#1a73e8]" />
              <span>Create New Discount Key</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">Code Name</label>
                <input
                  type="text"
                  value={newCode}
                  onChange={(e) => { setNewCode(e.target.value.toUpperCase()); setError(''); }}
                  placeholder="e.g. LEGAL50"
                  className="w-full px-3 py-2 text-xs font-mono uppercase font-bold border border-[#dadce0] rounded-xl bg-white focus:outline-none focus:border-[#1a73e8]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">Discount %</label>
                <div className="relative flex items-center">
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newDiscount}
                    onChange={(e) => setNewDiscount(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-bold border border-[#dadce0] rounded-xl bg-white focus:outline-none focus:border-[#1a73e8] pr-7"
                  />
                  <Percent className="w-3.5 h-3.5 text-[#5f6368] absolute right-2.5 pointer-events-none" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#5f6368] mb-1">Description / Label</label>
              <input
                type="text"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g. Special Partner Rate"
                className="w-full px-3 py-2 text-xs border border-[#dadce0] rounded-xl bg-white focus:outline-none focus:border-[#1a73e8]"
              />
            </div>

            {error && (
              <p className="text-xs text-[#d93025] font-medium">{error}</p>
            )}

            <button
              type="submit"
              className="w-full py-2 px-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold rounded-xl transition-colors flex items-center justify-center gap-1.5 shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Add Discount Key</span>
            </button>
          </form>

          {/* Active Keys List */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#5f6368] uppercase tracking-wider">
                Active Discount Keys ({codes.length})
              </span>
              <span className="text-[11px] text-[#137333] flex items-center gap-1 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Auto-applies in Pricing Checkout
              </span>
            </div>

            <div className="space-y-2">
              {codes.map((promo) => (
                <div
                  key={promo.id}
                  className={`p-3 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                    promo.active
                      ? 'bg-white border-[#dadce0] hover:border-[#1a73e8]/50 shadow-xs'
                      : 'bg-[#f1f3f4] border-transparent opacity-60'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-extrabold text-[#202124] tracking-wider">
                        {promo.code}
                      </span>
                      <span className="bg-[#e6f4ea] text-[#137333] text-[11px] font-bold px-2 py-0.5 rounded-full">
                        {promo.discountPct}% OFF
                      </span>
                      {!promo.active && (
                        <span className="text-[10px] bg-[#dadce0] text-[#5f6368] px-1.5 py-0.2 rounded font-medium">
                          Disabled
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#5f6368] truncate mt-0.5">
                      {promo.label}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => handleCopyCode(promo.code, promo.id)}
                      className="p-1.5 text-[#5f6368] hover:text-[#1a73e8] hover:bg-[#f1f3f4] rounded-lg transition-colors"
                      title="Copy Code"
                    >
                      {copiedId === promo.id ? (
                        <Check className="w-4 h-4 text-[#137333]" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleActive(promo)}
                      className="text-xs px-2 py-1 text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-lg transition-colors"
                    >
                      {promo.active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteKey(promo.id)}
                      className="p-1.5 text-[#5f6368] hover:text-[#d93025] hover:bg-[#fce8e6] rounded-lg transition-colors"
                      title="Delete Key"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#dadce0] bg-[#f8fafd] flex items-center justify-between text-xs text-[#5f6368]">
          <span>Clients can enter these keys in the Pricing dialog</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-[#f1f3f4] hover:bg-[#e8eaed] text-[#202124] font-semibold rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
