import React, { useState, useEffect } from 'react';
import { Lock, Delete, Shield, KeyRound } from 'lucide-react';
import { getLockPin } from '../../lib/storage';

interface LockScreenModalProps {
  isLocked: boolean;
  onUnlock: () => void;
  userEmail: string;
}

export const LockScreenModal: React.FC<LockScreenModalProps> = ({
  isLocked,
  onUnlock,
  userEmail
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (!isLocked) {
      setPin('');
      setError(false);
      setErrorMessage('');
    }
  }, [isLocked]);

  // Handle physical keyboard typing
  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, pin]);

  if (!isLocked) return null;

  const handleDigit = (digit: string) => {
    if (pin.length < 4) {
      const nextPin = pin + digit;
      setPin(nextPin);
      setError(false);

      if (nextPin.length === 4) {
        verifyPin(nextPin);
      }
    }
  };

  const handleBackspace = () => {
    setPin((prev) => prev.slice(0, -1));
    setError(false);
  };

  const verifyPin = (enteredPin: string) => {
    const validPin = getLockPin();
    if (enteredPin === validPin) {
      onUnlock();
    } else {
      setError(true);
      setErrorMessage('Incorrect PIN. Please try again.');
      setTimeout(() => {
        setPin('');
      }, 500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#202124]/70 backdrop-blur-md flex items-center justify-center p-4 select-none animate-in fade-in duration-200">
      <div className="bg-white border border-[#dadce0] rounded-3xl shadow-2xl max-w-sm w-full p-8 flex flex-col items-center text-center">
        {/* Lock Icon */}
        <div className="w-16 h-16 rounded-2xl bg-[#e8f0fe] text-[#1a73e8] flex items-center justify-center mb-4 shadow-sm ring-4 ring-blue-50">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="font-['Google_Sans',sans-serif] text-xl font-bold text-[#202124]">
          Session Locked
        </h2>
        <p className="text-xs text-[#5f6368] mt-1 truncate max-w-[240px]">
          {userEmail || 'DocVault Workspace'}
        </p>

        {/* 4-digit PIN Dots */}
        <div className="flex items-center gap-4 my-6">
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  isFilled
                    ? error
                      ? 'bg-[#d93025] scale-110'
                      : 'bg-[#1a73e8] scale-110'
                    : 'bg-[#e8eaed] border border-[#dadce0]'
                }`}
              />
            );
          })}
        </div>

        {error && (
          <p className="text-xs font-medium text-[#d93025] mb-4 animate-shake">
            {errorMessage}
          </p>
        )}

        {/* Virtual Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[240px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              onClick={() => handleDigit(digit)}
              className="h-14 rounded-2xl bg-[#f8fafd] hover:bg-[#e8f0fe] active:bg-[#d2e3fc] text-[#202124] hover:text-[#1a73e8] text-xl font-medium border border-[#dadce0] transition-colors flex items-center justify-center shadow-xs"
            >
              {digit}
            </button>
          ))}
          <div className="flex items-center justify-center">
            <span className="text-[10px] text-[#5f6368] uppercase font-bold">PIN</span>
          </div>
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="h-14 rounded-2xl bg-[#f8fafd] hover:bg-[#e8f0fe] active:bg-[#d2e3fc] text-[#202124] hover:text-[#1a73e8] text-xl font-medium border border-[#dadce0] transition-colors flex items-center justify-center shadow-xs"
          >
            0
          </button>
          <button
            type="button"
            onClick={handleBackspace}
            className="h-14 rounded-2xl bg-[#f8fafd] hover:bg-[#fce8e6] text-[#5f6368] hover:text-[#d93025] border border-[#dadce0] transition-colors flex items-center justify-center shadow-xs"
            title="Backspace"
          >
            <Delete className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-[#f1f3f4] text-xs text-[#5f6368] flex items-center gap-1.5">
          <KeyRound className="w-3.5 h-3.5 text-[#1a73e8]" />
          <span>Default PIN is <strong>1234</strong></span>
        </div>
      </div>
    </div>
  );
};
