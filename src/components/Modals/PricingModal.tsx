import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Building2, 
  Zap, 
  Database, 
  HardDrive, 
  Lock,
  ArrowRight,
  PhoneCall,
  Mail
} from 'lucide-react';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan?: (planName: string) => void;
}

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  onSelectPlan
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  if (!isOpen) return null;

  const plans = [
    {
      id: 'solo',
      name: 'Solo Practice',
      description: 'Ideal for independent solicitors & immigration advisers',
      priceMonthly: 39,
      priceAnnual: 29, // per month when paid annually
      highlight: false,
      badge: 'Starter',
      features: [
        '1 Solicitor Account',
        'Up to 50 Active Cases / Matters',
        'Multi-Format Viewer (PDF, JPG, PNG, EPUB)',
        '2-Sided ID Cards (IRP & BRP Front/Back)',
        'Secure Client Portal Links (PIN Protected)',
        'Standard Encrypted Cloud Storage',
        'Email Support'
      ]
    },
    {
      id: 'pro',
      name: 'Chambers Professional',
      description: 'Most popular for growing law firms & solicitors practices',
      priceMonthly: 89,
      priceAnnual: 69,
      highlight: true,
      badge: 'Most Popular',
      features: [
        'Up to 5 Solicitor / Staff Accounts',
        'Unlimited Active Cases & Matters',
        'Side-by-Side 2-Sided Document Comparison',
        'Batch Document ZIP & Combined PDF Export',
        'Client Document Request Slots (Red / Green alerts)',
        'Single-Use License Key Distribution',
        'Priority Phone & WhatsApp Support',
        'Custom Law Firm Branding & Header Logo'
      ]
    },
    {
      id: 'enterprise',
      name: 'Private Vault (BYOC)',
      description: 'Maximum compliance for law firms requiring data sovereignty',
      priceMonthly: 219,
      priceAnnual: 179,
      highlight: false,
      badge: 'Zero-Knowledge',
      features: [
        'Unlimited Solicitor & Paralegal Seats',
        'Bring Your Own Cloud (BYOC - Private Supabase / AWS)',
        '100% Data Sovereignty (SRA & GDPR Compliant)',
        'Dedicated Cloud Instance & Custom Domain',
        'Audit Logging & Client Access Trail',
        'Full White-Labeling (Firm Name, Domain & Colors)',
        'Dedicated Account Manager & IT Setup Assistance'
      ]
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#dadce0] w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#dadce0] flex items-center justify-between bg-gradient-to-r from-[#f8fafd] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Google_Sans',sans-serif] text-lg font-bold text-[#202124]">
                DocVault Subscription Plans & Pricing
              </h2>
              <p className="text-xs text-[#5f6368]">
                Simple, transparent software licensing for UK & Ireland legal practices
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

        {/* Billing Cycle Switcher */}
        <div className="pt-4 pb-2 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#f8fafd] border-b border-[#dadce0]">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#3c4043]">
            <ShieldCheck className="w-4 h-4 text-[#137333]" />
            <span>Bank-grade 256-bit encryption • No setup fees • Cancel anytime</span>
          </div>

          <div className="flex items-center bg-white border border-[#dadce0] rounded-full p-1 shadow-xs">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-[#1a73e8] text-white shadow-xs font-semibold'
                  : 'text-[#5f6368] hover:text-[#202124]'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${
                billingCycle === 'annual'
                  ? 'bg-[#1a73e8] text-white shadow-xs font-semibold'
                  : 'text-[#5f6368] hover:text-[#202124]'
              }`}
            >
              <span>Annual</span>
              <span className="bg-[#e6f4ea] text-[#137333] text-[10px] font-bold px-1.5 py-0.2 rounded-full uppercase">
                Save 20%
              </span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const price = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border flex flex-col justify-between transition-all duration-200 relative ${
                  plan.highlight
                    ? 'border-[#1a73e8] shadow-lg ring-2 ring-[#1a73e8]/20 bg-white'
                    : 'border-[#dadce0] shadow-xs bg-[#fdfdfe] hover:shadow-md'
                }`}
              >
                {/* Top Badge */}
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1a73e8] text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>RECOMMENDED FOR FIRMS</span>
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                      plan.highlight 
                        ? 'bg-[#e8f0fe] text-[#1a73e8]' 
                        : 'bg-[#f1f3f4] text-[#5f6368]'
                    }`}>
                      {plan.badge}
                    </span>
                  </div>

                  <h3 className="font-['Google_Sans',sans-serif] text-lg font-bold text-[#202124]">
                    {plan.name}
                  </h3>
                  <p className="text-xs text-[#5f6368] mt-1 min-h-[32px]">
                    {plan.description}
                  </p>

                  {/* Price */}
                  <div className="my-4 pb-4 border-b border-[#dadce0]">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-extrabold text-[#202124]">£{price}</span>
                      <span className="text-xs text-[#5f6368]">/ month</span>
                    </div>
                    <span className="text-[11px] text-[#5f6368] block mt-0.5">
                      {billingCycle === 'annual' ? 'Billed annually (2 months free)' : 'Billed monthly'}
                    </span>
                  </div>

                  {/* Features List */}
                  <div className="space-y-2.5">
                    <span className="text-[11px] font-bold text-[#3c4043] uppercase tracking-wider block">
                      Included Features:
                    </span>
                    {plan.features.map((f, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-[#3c4043]">
                        <Check className="w-3.5 h-3.5 text-[#137333] flex-shrink-0 mt-0.5 stroke-[2.5]" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Card Action CTA */}
                <div className="p-5 pt-0">
                  <button
                    onClick={() => {
                      if (onSelectPlan) onSelectPlan(plan.name);
                      alert(`To purchase the ${plan.name} license, contact your software distributor or generate a one-time key.`);
                      onClose();
                    }}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                      plan.highlight
                        ? 'bg-[#1a73e8] hover:bg-[#1557b0] text-white shadow-md'
                        : 'bg-white hover:bg-[#f1f3f4] text-[#1a73e8] border border-[#dadce0]'
                    }`}
                  >
                    <span>Get {plan.name}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="px-6 py-4 border-t border-[#dadce0] bg-[#f8fafd] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#5f6368]">
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-[#1a73e8]" />
            <span>Need an invoice or custom Solicitor Chamber quote?</span>
          </div>
          <div className="flex items-center gap-3 font-medium text-[#1a73e8]">
            <span className="flex items-center gap-1">
              <Mail className="w-3.5 h-3.5" /> sales@docvault-legal.com
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
