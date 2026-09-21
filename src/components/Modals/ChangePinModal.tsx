import React, { useState } from 'react';
import { X, KeyRound, Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react';
import { getLockPin, setLockPin } from '../../lib/storage';

interface ChangePinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ChangePinModal: React.FC<ChangePinModalProps> = ({ isOpen, onClose }) => {
  const [step, setStep] = useState<'verify' | 'new' | 'confirm'>('verify');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin]         = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError]           = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess]         = useState(false);

  if (!isOpen) return null;

  const reset = () => {
    setStep('verify');
    setCurrentPin('');
    setNewPin('');
    setConfirmPin('');
    setError('');
    setSuccess(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const validateDigits = (val: string) => /^\d{0,4}$/.test(val);

  const handleVerify = () => {
    if (currentPin.length !== 4) { setError('PIN must be 4 digits.'); return; }
    if (currentPin !== getLockPin()) {
      setError('Incorrect current PIN. Please try again.');
      setCurrentPin('');
      return;
    }
    setError('');
    setStep('new');
  };

  const handleSetNew = () => {
    if (newPin.length !== 4) { setError('New PIN must be exactly 4 digits.'); return; }
    if (newPin === getLockPin()) { setError('New PIN cannot be the same as the current PIN.'); return; }
    setError('');
    setStep('confirm');
  };

  const handleConfirm = () => {
    if (confirmPin !== newPin) {
      setError('PINs do not match. Please try again.');
      setConfirmPin('');
      return;
    }
    setLockPin(newPin);
    setSuccess(true);
    setTimeout(() => { handleClose(); }, 1800);
  };

  const PinInput = ({
    value, onChange, show, onToggleShow, placeholder, onEnter
  }: {
    value: string;
    onChange: (v: string) => void;
    show: boolean;
    onToggleShow: () => void;
    placeholder: string;
    onEnter: () => void;
  }) => (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        inputMode="numeric"
        pattern="[0-9]*"
        maxLength={4}
        value={value}
        onChange={(e) => {
          if (validateDigits(e.target.value)) {
            onChange(e.target.value);
            setError('');
          }
        }}
        onKeyDown={(e) => { if (e.key === 'Enter') onEnter(); }}
        placeholder={placeholder}
        className="w-full px-4 py-3 pr-10 text-xl tracking-[0.5em] text-center border border-[#dadce0] rounded-xl bg-[#f8fafd] focus:outline-none focus:border-[#1a73e8] focus:ring-2 focus:ring-[#1a73e8]/20 font-mono text-[#202124] placeholder:tracking-normal placeholder:text-sm placeholder:text-[#bdc1c6]"
        autoFocus
      />
      <button
        type="button"
        onClick={onToggleShow}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-[#5f6368] hover:text-[#1a73e8] transition-colors"
      >
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#dadce0] w-full max-w-sm p-6 flex flex-col gap-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-['Google_Sans',sans-serif] text-base font-bold text-[#202124]">Change Lock PIN</h2>
              <p className="text-xs text-[#5f6368]">
                {step === 'verify' ? 'Verify current PIN' : step === 'new' ? 'Enter new PIN' : 'Confirm new PIN'}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 text-[#5f6368] hover:bg-[#f1f3f4] rounded-full transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step indicators */}
        <div className="flex items-center gap-2">
          {(['verify', 'new', 'confirm'] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                step === s ? 'bg-[#1a73e8] text-white'
                : (i < ['verify','new','confirm'].indexOf(step)) ? 'bg-[#34a853] text-white'
                : 'bg-[#f1f3f4] text-[#9aa0a6]'
              }`}>
                {i < ['verify','new','confirm'].indexOf(step) ? '✓' : i + 1}
              </div>
              {i < 2 && <div className={`h-0.5 flex-1 rounded transition-all ${i < ['verify','new','confirm'].indexOf(step) ? 'bg-[#34a853]' : 'bg-[#e8eaed]'}`} />}
            </div>
          ))}
        </div>

        {/* Success state */}
        {success ? (
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="w-14 h-14 rounded-full bg-[#e6f4ea] flex items-center justify-center">
              <ShieldCheck className="w-7 h-7 text-[#34a853]" />
            </div>
            <p className="font-semibold text-[#202124]">PIN Changed Successfully!</p>
            <p className="text-xs text-[#5f6368]">Your new 4-digit lock PIN is saved.</p>
          </div>
        ) : (
          <>
            {/* Input area */}
            <div className="flex flex-col gap-3">
              {step === 'verify' && (
                <>
                  <label className="text-sm font-medium text-[#3c4043]">Current PIN</label>
                  <PinInput value={currentPin} onChange={setCurrentPin} show={showCurrent} onToggleShow={() => setShowCurrent(p => !p)} placeholder="Enter current PIN" onEnter={handleVerify} />
                </>
              )}
              {step === 'new' && (
                <>
                  <label className="text-sm font-medium text-[#3c4043]">New PIN</label>
                  <PinInput value={newPin} onChange={setNewPin} show={showNew} onToggleShow={() => setShowNew(p => !p)} placeholder="Enter new 4-digit PIN" onEnter={handleSetNew} />
                </>
              )}
              {step === 'confirm' && (
                <>
                  <label className="text-sm font-medium text-[#3c4043]">Confirm New PIN</label>
                  <PinInput value={confirmPin} onChange={setConfirmPin} show={showConfirm} onToggleShow={() => setShowConfirm(p => !p)} placeholder="Re-enter new PIN" onEnter={handleConfirm} />
                </>
              )}

              {error && (
                <div className="flex items-center gap-2 text-xs text-[#d93025] bg-[#fce8e6] px-3 py-2 rounded-lg">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {error}
                </div>
              )}
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button onClick={handleClose} className="flex-1 py-2.5 px-4 border border-[#dadce0] rounded-xl text-sm text-[#5f6368] hover:bg-[#f1f3f4] transition-colors font-medium">
                Cancel
              </button>
              <button
                onClick={step === 'verify' ? handleVerify : step === 'new' ? handleSetNew : handleConfirm}
                className="flex-1 py-2.5 px-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
              >
                {step === 'verify' ? 'Verify' : step === 'new' ? 'Continue' : 'Save PIN'}
              </button>
            </div>

            <p className="text-center text-[11px] text-[#9aa0a6]">
              Default PIN is <strong>1234</strong> if you've never changed it.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
