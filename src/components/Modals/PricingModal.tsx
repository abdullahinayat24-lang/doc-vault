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
  ExternalLink,
  Gift,
  Clock
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
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');
  const [promoCode, setPromoCode]       = useState('');
  const [promoApplied, setPromoApplied] = useState<{ label: string; discountPct: number } | null>(null);
  const [promoError, setPromoError]     = useState('');
  const [showPromo, setShowPromo]       = useState(false);

  const trial = getTrialStatus();

  if (!isOpen) return null;

  const applyPromo = () => {
    const code = promoCode.trim().toUpperCase();
    if (!code) return;

    // Check against promo codes created by the firm owner
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
      description: 'Ideal for independent solicitors & immigration advisers',
      priceMonthly: 39,
      priceAnnual: 29,
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
      id: 'pro' as const,
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
      id: 'enterprise' as const,
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

  const handleGetPlan = (plan: typeof plans[number]) => {
    if (onSelectPlan) onSelectPlan(plan.name);

    const basePrice = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;
    const finalPrice = getDiscountedPrice(basePrice);
    const multiplier = billingCycle === 'annual' ? 12 : 1;
    const totalPrice = finalPrice * multiplier;

    if (PAYPAL_USERNAME && PAYPAL_USERNAME.trim() !== '') {
      const link = `https://www.paypal.com/paypalme/${PAYPAL_USERNAME}/${totalPrice}GBP`;
      window.open(link, '_blank', 'noopener,noreferrer');
    } else {
      // Direct PayPal Web Checkout targeting owner's PayPal email account
      const planTitle = `DocVault ${plan.name} (${billingCycle === 'annual' ? 'Annual Plan' : 'Monthly Plan'})`;
      const directLink = `https://www.paypal.com/cgi-bin/webscr?cmd=_xclick&business=${encodeURIComponent(OWNER_EMAIL)}&item_name=${encodeURIComponent(planTitle)}&amount=${totalPrice}&currency_code=GBP`;
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
                DocVault Subscription Plans &amp; Pricing
              </h2>
              <p className="text-xs text-[#5f6368]">
                Simple, transparent licensing for UK &amp; Ireland legal practices
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

        {/* Payment Recipient Badge */}
        <div className="bg-[#f0f7ff] border-b border-[#1a73e8]/20 px-6 py-2 flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2 text-[#1a73e8] font-medium">
            <ShieldCheck className="w-4 h-4 text-[#137333] flex-shrink-0" />
            <span>Payments sent securely to account: <strong>{OWNER_EMAIL}</strong></span>
          </div>
          <span className="text-[11px] text-[#5f6368] hidden sm:inline">
            Direct PayPal Checkout
          </span>
        </div>


        {/* Billing Cycle Switcher */}
        <div className="pt-4 pb-2 px-6 flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#f8fafd] border-b border-[#dadce0]">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#3c4043]">
            <ShieldCheck className="w-4 h-4 text-[#137333]" />
            <span>Bank-grade 256-bit encryption • No setup fees • Cancel anytime</span>
          </div>
          <div className="flex items-center bg-white border border-[#dadce0] rounded-full p-1 shadow-xs">
            <button onClick={() => setBillingCycle('monthly')}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all ${billingCycle === 'monthly' ? 'bg-[#1a73e8] text-white shadow-xs font-semibold' : 'text-[#5f6368] hover:text-[#202124]'}`}>
              Monthly
            </button>
            <button onClick={() => setBillingCycle('annual')}
              className={`px-3.5 py-1 rounded-full text-xs font-medium transition-all flex items-center gap-1 ${billingCycle === 'annual' ? 'bg-[#1a73e8] text-white shadow-xs font-semibold' : 'text-[#5f6368] hover:text-[#202124]'}`}>
              <span>Annual</span>
              <span className="bg-[#e6f4ea] text-[#137333] text-[10px] font-bold px-1.5 py-0.2 rounded-full uppercase">Save 20%</span>
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-3 gap-5">
          {plans.map((plan) => {
            const basePrice  = billingCycle === 'annual' ? plan.priceAnnual : plan.priceMonthly;
            const finalPrice = getDiscountedPrice(basePrice);
            const discounted = finalPrice < basePrice;

            return (
              <div key={plan.id}
                className={`rounded-2xl border flex flex-col justify-between transition-all duration-200 relative ${
                  plan.highlight ? 'border-[#1a73e8] shadow-lg ring-2 ring-[#1a73e8]/20 bg-white' : 'border-[#dadce0] shadow-xs bg-[#fdfdfe] hover:shadow-md'
                }`}>
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#1a73e8] text-white text-[11px] font-bold px-3 py-0.5 rounded-full shadow flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>RECOMMENDED FOR FIRMS</span>
                  </div>
                )}

                <div className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${plan.highlight ? 'bg-[#e8f0fe] text-[#1a73e8]' : 'bg-[#f1f3f4] text-[#5f6368]'}`}>
                      {plan.badge}
                    </span>
                  </div>
                  <h3 className="font-['Google_Sans',sans-serif] text-lg font-bold text-[#202124]">{plan.name}</h3>
                  <p className="text-xs text-[#5f6368] mt-1 min-h-[32px]">{plan.description}</p>

                  <div className="my-4 pb-4 border-b border-[#dadce0]">
                    <div className="flex items-baseline gap-2">
                      {discounted && (
                        <span className="text-lg font-bold text-[#9aa0a6] line-through">£{basePrice}</span>
                      )}
                      <span className={`text-3xl font-extrabold ${discounted ? 'text-[#34a853]' : 'text-[#202124]'}`}>£{finalPrice}</span>
                      <span className="text-xs text-[#5f6368]">/ month</span>
                    </div>
                    {discounted && promoApplied && (
                      <span className="text-[11px] font-bold text-[#34a853]">{promoApplied.label} applied ✓</span>
                    )}
                    <span className="text-[11px] text-[#5f6368] block mt-0.5">
                      {billingCycle === 'annual' ? `Billed annually — £${finalPrice * 12}/year (2 months free)` : 'Billed monthly'}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <span className="text-[11px] font-bold text-[#3c4043] uppercase tracking-wider block">Included Features:</span>
                    {plan.features.map((f, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-xs text-[#3c4043]">
                        <Check className="w-3.5 h-3.5 text-[#137333] flex-shrink-0 mt-0.5 stroke-[2.5]" />
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-5 pt-0">
                  <button
                    onClick={() => handleGetPlan(plan)}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs sm:text-sm font-semibold transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                      plan.highlight ? 'bg-[#003087] hover:bg-[#002063] text-white shadow-md' : 'bg-white hover:bg-[#f1f3f4] text-[#003087] border border-[#dadce0]'
                    }`}>
                    {/* PayPal logo mark */}
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-current" xmlns="http://www.w3.org/2000/svg">
                      <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.93 4.778-4.005 7.201-9.138 7.201h-2.19a.563.563 0 0 0-.556.479l-1.187 7.527h-.506l-.24 1.516a.56.56 0 0 0 .554.647h3.882c.46 0 .85-.334.922-.788.06-.26.76-4.852.816-5.09a.932.932 0 0 1 .923-.788h.58c3.76 0 6.705-1.528 7.565-5.946.36-1.847.174-3.388-.777-4.471z"/>
                    </svg>
                    <span>Pay with PayPal</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                  <p className="text-center text-[10px] text-[#5f6368] mt-1.5 flex items-center justify-center gap-1">
                    <Lock className="w-3 h-3" />
                    Secure payment via PayPal
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Promo Code Section */}
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
            <Lock className="w-3.5 h-3.5 text-[#1a73e8]" />
            <span>Need an invoice or custom Solicitor Chamber quote?</span>
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
