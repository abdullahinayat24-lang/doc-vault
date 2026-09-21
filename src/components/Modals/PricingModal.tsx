import React, { useState } from 'react';
import { 
  X, 
  Check, 
  Sparkles, 
  ShieldCheck, 
  Building2, 
  Lock,
  ArrowRight,
  Mail,
  Tag,
  Gift,
  Clock,
  Euro
} from 'lucide-react';
import { getTrialStatus, getPromoCodes } from '../../lib/storage';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPlan?: (planName: string) => void;
}

// ============================================================================
// OWNER CONFIG & PAYPAL RECIPIENT
// ============================================================================
const OWNER_EMAIL = 'rana.abdullah.inayat@gmail.com';
const PAYPAL_USERNAME: string = ''; 

export const PricingModal: React.FC<PricingModalProps> = ({
  isOpen,
  onClose,
  onSelectPlan
}) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual' | 'lifetime'>('annual');
  const [promoCode, setPromoCode]       = useState('');
  const [promoApplied, setPromoApplied] = useState<{ label: string; discountPct: number } | null>(null);
  const [promoError, setPromoError]     = useState('');
  const [showPromo, setShowPromo]       = useState(false);

  const trial = getTrialStatus();

  if (!isOpen) return null;

  const applyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;
    const storedCodes = getPromoCodes();
    const found = storedCodes.find((c) => c.code === code && c.active);
    if (found) {
      setPromoApplied({ label: found.label, discountPct: found.discountPct });
      setPromoError('');
      return;
    }
    setPromoError('Invalid or expired promo code.');
    setPromoApplied(null);
  };

  const getDiscountedPrice = (base: number) => {
    if (!promoApplied) return base;
    return Math.round(base * (1 - promoApplied.discountPct / 100));
  };

  const plans = [
    {
      id: 'solo' as const,
      name: 'Solo Practice',
      description: 'Perfect for independent solicitors & immigration advisers running their own practice',
      priceMonthly: 39,
      priceAnnual: 29,
      priceLifetime: 349,
      highlight: false,
      badge: 'Starter',
      color: 'gray',
      features: [
        '1 Solicitor Account',
        'Up to 75 Active Client Cases',
        'Full Document Vault (PDF, JPG, PNG, EPUB)',
        '2-Sided ID Card Viewer (IRP & BRP)',
        'Secure Client Portal Links — PIN Protected',
        'Print Documents & ID Cards (proper sizing)',
        'Document Status Tracking (Pending / Approved / Missing)',
        'Email Support within 48h'
      ]
    },
    {
      id: 'pro' as const,
      name: 'Chambers Professional',
      description: 'The complete practice management solution for growing law firms and solicitor offices',
      priceMonthly: 89,
      priceAnnual: 69,
      priceLifetime: 649,
      highlight: true,
      badge: 'Most Popular',
      color: 'blue',
      features: [
        'Up to 10 Solicitor & Staff Accounts',
        'Unlimited Active Client Cases',
        'Full Staff Directory & Case Assignment',
        'Client Visit Tracking & Payment Records',
        'Batch Document Operations (Move, Number, Delete)',
        'Custom Firm Branding & Colour Themes',
        'Client Document Upload Requests (Red / Green)',
        'Promo Code & Discount Key Management',
        'Priority Phone & WhatsApp Support'
      ]
    },
    {
      id: 'enterprise' as const,
      name: 'Private Vault',
      description: 'Maximum data sovereignty for firms with strict compliance and data residency requirements',
      priceMonthly: 199,
      priceAnnual: 159,
      priceLifetime: 1199,
      highlight: false,
      badge: 'Enterprise',
      color: 'slate',
      features: [
        'Unlimited Solicitor & Paralegal Seats',
        'Bring Your Own Cloud (Private Supabase / AWS)',
        '100% Data Sovereignty — SRA & GDPR Compliant',
        'Dedicated Cloud Instance & Custom Domain',
        'Full Audit Log & Client Access Trail',
        'Complete White-Labelling (Name, Domain & Colours)',
        'Dedicated Account Manager & IT Onboarding',
        'SLA-backed Uptime Guarantee'
      ]
    }
  ];

  const handleGetPlan = (plan: typeof plans[number]) => {
    if (onSelectPlan) onSelectPlan(plan.name);

    let basePrice: number;
    let totalPrice: number;
    let cycleLabel: string;

    if (billingCycle === 'lifetime') {
      basePrice = plan.priceLifetime;
      totalPrice = getDiscountedPrice(basePrice);
      cycleLabel = 'One-Time Lifetime Purchase';
    } else if (billingCycle === 'annual') {
      basePrice = plan.priceAnnual;
      totalPrice = getDiscountedPrice(basePrice) * 12;
      cycleLabel = 'Annual Plan';
    } else {
      basePrice = plan.priceMonthly;
      totalPrice = getDiscountedPrice(basePrice);
      cycleLabel = 'Monthly Plan';
    }

    if (totalPrice <= 0) {
      alert(`VIP License Activated: ${plan.name} (${cycleLabel}) granted with 100% discount!`);
      onClose();
      return;
    }

    if (PAYPAL_USERNAME && PAYPAL_USERNAME.trim() !== '') {
      const link = `https://www.paypal.com/paypalme/${PAYPAL_USERNAME}/${totalPrice}EUR`;
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      const planTitle = `DocVault ${plan.name} (${cycleLabel})`;
      const directLink = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(OWNER_EMAIL)}&item_name=${encodeURIComponent(planTitle)}&amount=${totalPrice}&currency_code=EUR`;
      window.open(directLink, '_blank', 'noopener,noreferrer');
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#dadce0] w-full max-w-4xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#dadce0] flex items-center justify-between bg-gradient-to-r from-[#f8fafd] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center shadow-xs">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Google_Sans',sans-serif] text-lg font-bold text-[#202124]">
                DocVault Subscription Plans
              </h2>
              <p className="text-xs text-[#5f6368]">
                Transparent pricing for EU &amp; UK legal practices · All prices in Euro
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#5f6368] hover:text-[#202124] hover:bg-[#f1f3f4] rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Trial Banner */}
        {trial.isActive && (
          <div className="bg-[#e8f0fe] border-b border-[#1a73e8]/20 px-6 py-2.5 flex items-center gap-3 text-xs">
            <Clock className="w-4 h-4 text-[#1a73e8] flex-shrink-0" />
            <span className="text-[#1a73e8] font-semibold">
              Free Trial Active — <strong>{trial.daysLeft} day{trial.daysLeft !== 1 ? 's' : ''} remaining</strong>. Upgrade anytime to keep your data.
            </span>
          </div>
        )}

        {/* Billing Cycle Switcher */}
        <div className="pt-4 pb-3 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#f8fafd] border-b border-[#dadce0]">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#3c4043]">
            <ShieldCheck className="w-4 h-4 text-[#137333]" />
            <span>Bank-grade 256-bit encryption · No setup fees · Cancel anytime</span>
          </div>
          <div className="flex items-center bg-white border border-[#dadce0] rounded-full p-1 shadow-xs gap-0.5">
            <button onClick={() => setBillingCycle('monthly')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${billingCycle === 'monthly' ? 'bg-[#1a73e8] text-white shadow-xs' : 'text-[#5f6368] hover:text-[#202124]'}`}>
              Monthly
            </button>
            <button onClick={() => setBillingCycle('annual')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${billingCycle === 'annual' ? 'bg-[#1a73e8] text-white shadow-xs' : 'text-[#5f6368] hover:text-[#202124]'}`}>
              <span>Annual</span>
              <span className="bg-[#e6f4ea] text-[#137333] text-[10px] font-extrabold px-1.5 rounded-full uppercase">Save 20%</span>
            </button>
            <button onClick={() => setBillingCycle('lifetime')}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 ${billingCycle === 'lifetime' ? 'bg-[#1a73e8] text-white shadow-xs' : 'text-[#f59e0b] bg-[#fef3c7] hover:bg-[#fde68a]'}`}>
              <Sparkles className={`w-3 h-3 ${billingCycle === 'lifetime' ? 'text-white' : 'text-[#f59e0b]'}`} />
              <span>Lifetime</span>
              <span className={`text-[10px] font-extrabold px-1.5 rounded-full uppercase ${billingCycle === 'lifetime' ? 'bg-white/20 text-white' : 'bg-[#f59e0b] text-white'}`}>Best Value</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const basePrice  = billingCycle === 'lifetime' ? plan.priceLifetime : (billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly);
            const finalPrice = getDiscountedPrice(basePrice);
            const discounted = finalPrice < basePrice;
            const annualTotal = finalPrice * 12;

            return (
              <div key={plan.id}
                className={`rounded-2xl border flex flex-col justify-between transition-all duration-200 relative ${
                  plan.highlight ? 'border-[#1a73e8] shadow-xl ring-2 ring-[#1a73e8]/20 bg-white' : 'border-[#dadce0] shadow-xs bg-[#fdfdfe] hover:shadow-md hover:border-[#9aa0a6]'
                }`}>
                {plan.highlight && (
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-gradient-to-r from-[#1a73e8] to-[#1557b0] text-white text-[11px] font-bold px-4 py-1 rounded-full shadow-md flex items-center gap-1.5 whitespace-nowrap">
                    <Sparkles className="w-3 h-3" />
                    <span>RECOMMENDED FOR FIRMS</span>
                  </div>
                )}

                <div className="p-5 flex-1">
                  <div className="flex items-center justify-between mb-3">
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full ${plan.highlight ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'bg-[#f1f3f4] text-[#5f6368]'}`}>
                      {plan.badge}
                    </span>
                  </div>
                  <h3 className="font-['Google_Sans',sans-serif] text-lg font-bold text-[#202124]">{plan.name}</h3>
                  <p className="text-xs text-[#5f6368] mt-1 leading-relaxed min-h-[42px]">{plan.description}</p>

                  <div className="my-4 pb-4 border-b border-[#dadce0]">
                    <div className="flex items-baseline gap-2 flex-wrap">
                      {discounted && (
                        <span className="text-base font-bold text-[#9aa0a6] line-through">€{basePrice}</span>
                      )}
                      <span className={`text-4xl font-extrabold tracking-tight ${discounted ? 'text-[#34a853]' : 'text-[#202124]'}`}>
                        €{finalPrice}
                      </span>
                      <span className="text-xs text-[#5f6368] font-medium">
                        {billingCycle === 'lifetime' ? 'one-time' : '/ month'}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#5f6368] mt-1 font-medium">
                      {billingCycle === 'lifetime'
                        ? 'Pay once — use forever. No recurring fees, ever.'
                        : billingCycle === 'annual'
                          ? `Billed annually — €${annualTotal}/year (2 months free)`
                          : 'Billed month-to-month. Cancel anytime.'}
                    </p>
                    {discounted && promoApplied && (
                      <span className="text-[11px] font-bold text-[#34a853] block mt-0.5">✓ {promoApplied.label} applied</span>
                    )}
                  </div>

                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-[#3c4043] uppercase tracking-wider block mb-2">What's included:</span>
                    {plan.features.map((f, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-[#3c4043]">
                        <Check className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 stroke-[2.5] ${plan.highlight ? 'text-[#1a73e8]' : 'text-[#137333]'}`} />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 pt-3">
                  <button
                    onClick={() => handleGetPlan(plan)}
                    className={`w-full py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                      plan.highlight 
                        ? 'bg-[#003087] hover:bg-[#002063] text-white shadow-lg hover:shadow-xl' 
                        : 'bg-white hover:bg-[#f8fafd] text-[#003087] border-2 border-[#003087]/20 hover:border-[#003087]/40'
                    }`}>
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
                    </svg>
                    <span>Pay with PayPal · €{getDiscountedPrice(billingCycle === 'lifetime' ? plan.priceLifetime : billingCycle === 'annual' ? plan.priceAnnual * 12 : plan.priceMonthly)}</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-center text-[10px] text-[#5f6368] mt-2 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" />
                    Secure checkout · Powered by PayPal
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Promo Code */}
        <div className="px-6 py-3 border-t border-[#dadce0] bg-[#f8fafd]">
          <button onClick={() => setShowPromo(p => !p)}
            className="flex items-center gap-1.5 text-xs text-[#1a73e8] hover:underline font-medium">
            <Tag className="w-3.5 h-3.5" />
            {showPromo ? 'Hide promo code' : 'Have a promo code?'}
          </button>
          {showPromo && (
            <div className="mt-2.5 flex items-center gap-2">
              <input
                type="text"
                value={promoCode}
                onChange={(e) => { setPromoCode(e.target.value.toUpperCase()); setPromoError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && applyPromo()}
                placeholder="Enter code e.g. LEGAL50"
                className="flex-1 px-3 py-2 text-xs border border-[#dadce0] rounded-lg focus:outline-none focus:border-[#1a73e8] bg-white uppercase tracking-widest font-mono"
              />
              <button onClick={applyPromo}
                className="px-3 py-2 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1">
                <Gift className="w-3.5 h-3.5" />
                Apply
              </button>
              {promoApplied && (
                <button onClick={() => { setPromoApplied(null); setPromoCode(''); }}
                  className="px-2 py-2 text-[#d93025] hover:bg-[#fce8e6] rounded-lg transition-colors text-xs">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}
          {promoError && <p className="text-xs text-[#d93025] mt-1.5">{promoError}</p>}
          {promoApplied && <p className="text-xs text-[#34a853] mt-1.5 font-semibold">✓ {promoApplied.label} — {promoApplied.discountPct}% off applied!</p>}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#dadce0] bg-[#f8fafd] flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#5f6368]">
          <div className="flex items-center gap-2">
            <Euro className="w-3.5 h-3.5 text-[#1a73e8]" />
            <span>Need an invoice, VAT receipt, or custom chamber quote?</span>
          </div>
          <div className="flex items-center gap-3 font-medium text-[#1a73e8]">
            <a href={`mailto:${OWNER_EMAIL}`} className="flex items-center gap-1 hover:underline">
              <Mail className="w-3.5 h-3.5" />{OWNER_EMAIL}
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
