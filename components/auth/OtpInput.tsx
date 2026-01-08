'use client';

import { useRef, useEffect, useState } from 'react';

interface OtpInputProps {
  length?: number;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
}

export function OtpInput({
  length = 6,
  value,
  onChange,
  disabled = false,
  autoFocus = true,
}: OtpInputProps) {
  const [otp, setOtp] = useState<string[]>(new Array(length).fill(''));
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Sync external value to internal state
    if (value.length === length) {
      setOtp(value.split(''));
    } else if (value.length === 0) {
      setOtp(new Array(length).fill(''));
    }
  }, [value, length]);

  const handleChange = (index: number, val: string) => {
    if (disabled) return;

    // Only allow digits
    const digit = val.replace(/[^0-9]/g, '');
    if (digit && digit.length > 1) return; // Paste handling below

    const newOtp = [...otp];
    newOtp[index] = digit;
    setOtp(newOtp);

    // Combine all digits
    const combinedOtp = newOtp.join('');
    onChange(combinedOtp);

    // Auto-advance to next input
    if (digit && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      // Move to previous input on backspace if current is empty
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;

    const pastedData = e.clipboardData.getData('text').replace(/[^0-9]/g, '');
    if (pastedData.length === 0) return;

    const newOtp = [...otp];
    const startIndex = 0;
    
    for (let i = 0; i < length && i < pastedData.length; i++) {
      newOtp[startIndex + i] = pastedData[i];
    }

    setOtp(newOtp);
    const combinedOtp = newOtp.join('');
    onChange(combinedOtp);

    // Focus the next empty input or the last one
    const nextEmptyIndex = newOtp.findIndex((val) => !val);
    const focusIndex = nextEmptyIndex === -1 ? length - 1 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {otp.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={digit}
          onChange={(e) => handleChange(index, e.target.value)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          disabled={disabled}
          autoFocus={autoFocus && index === 0}
          className="w-12 h-14 text-center text-2xl font-semibold rounded-xl border-2 border-slate-200 bg-white focus:border-[#014D40] focus:ring-2 focus:ring-[#014D40]/20 outline-none transition disabled:bg-slate-50 disabled:cursor-not-allowed"
        />
      ))}
    </div>
  );
}



