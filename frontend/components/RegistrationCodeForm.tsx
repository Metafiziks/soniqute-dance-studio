// components/RegistrationCodeForm.tsx
"use client";
import { useState } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

interface RegistrationCodeFormProps {
  className?: string;
}

export default function RegistrationCodeForm({ className = "" }: RegistrationCodeFormProps) {
  const [twitterHandle, setTwitterHandle] = useState('');
  const [captchaToken, setCaptchaToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!captchaToken) {
      setMessage({ text: 'Please complete the captcha', type: 'error' });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      const response = await fetch(`${apiBase}/registration/request-code`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          twitterHandle,
          captchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      // Success
      setMessage({ 
        text: data.message || "Thanks! We'll ping you on X once your code is ready.", 
        type: 'success' 
      });
      setTwitterHandle('');
      setCaptchaToken('');
      
    } catch (error) {
      console.error('Registration request failed:', error);
      setMessage({ 
        text: error instanceof Error ? error.message : 'Failed to submit request. Please try again.',
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      <h3 className="sq-title text-2xl md:text-3xl font-extrabold">
        Request Your Registration Code
      </h3>
      <p className="mt-2 text-white/80">
        To receive a registration code for access, drop your Twitter handle below.
        We'll DM you details when your invite is ready.
      </p>

      {message && (
        <div className={`mt-4 p-3 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-500/20 border border-green-400/50 text-green-300' 
            : 'bg-red-500/20 border border-red-400/50 text-red-300'
        }`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-6 grid gap-3">
        <label className="text-white/85 text-sm font-semibold">
          Twitter / X handle
        </label>
        
        <div className="flex items-stretch gap-2">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/50">@</span>
            <input
              type="text"
              value={twitterHandle}
              onChange={(e) => setTwitterHandle(e.target.value)}
              placeholder="yourhandle"
              className="h-12 w-full rounded-2xl bg-white/5 pl-8 pr-4 ring-1 ring-white/10 outline-none
                         focus:ring-white/25 disabled:opacity-50"
              required
              disabled={isLoading}
              maxLength={15}
            />
          </div>
          <button
            className="h-12 shrink-0 rounded-2xl px-5 font-semibold
                       bg-gradient-to-r from-fuchsia-600 to-pink-500
                       hover:opacity-95 active:translate-y-px
                       disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={isLoading || !captchaToken}
          >
            {isLoading ? 'Submitting...' : 'Request'}
          </button>
        </div>

        {/* hCaptcha */}
        <div className="flex justify-center mt-4">
          <HCaptcha
            sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ''}
            onVerify={(token) => setCaptchaToken(token)}
            onExpire={() => setCaptchaToken('')}
            onError={() => setCaptchaToken('')}
            theme="dark"
          />
        </div>
        
        <p className="text-xs text-white/50">
          Submitting handle does not guarantee a reg code.
        </p>
      </form>
    </div>
  );
}