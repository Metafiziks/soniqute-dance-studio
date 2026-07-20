// components/EmailSignupForm.tsx
"use client";
import { useState } from 'react';
import HCaptcha from '@hcaptcha/react-hcaptcha';

interface EmailSignupFormProps {
  className?: string;
}

export default function EmailSignupForm({ className = "" }: EmailSignupFormProps) {
  const [email, setEmail] = useState('');
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
      const response = await fetch(`${apiBase}/email/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          captchaToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      // Success
      setMessage({ 
        text: data.message || "You're in! Check your inbox for confirmation.", 
        type: 'success' 
      });
      setEmail('');
      setCaptchaToken('');
      
    } catch (error) {
      console.error('Email signup failed:', error);
      setMessage({ 
        text: error instanceof Error ? error.message : 'Failed to sign up. Please try again.',
        type: 'error' 
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      {/* Container with background for visibility */}
      <div className="bg-black/40 backdrop-blur-xl rounded-3xl p-6 md:p-8 ring-1 ring-white/20 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-6">
          <h3 className="sq-title text-2xl md:text-3xl font-extrabold text-white mb-2">
            Stay in the Loop
          </h3>
          <p className="text-white/85 text-sm md:text-base">
            Get early access to drops, exclusive pack releases, and music launches.
          </p>
        </div>

        {message && (
          <div className={`mb-4 p-3 rounded-xl ${
            message.type === 'success' 
              ? 'bg-green-500/20 border border-green-400/50 text-green-300' 
              : 'bg-red-500/20 border border-red-400/50 text-red-300'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-stretch gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="your@email.com"
              className="h-12 flex-1 rounded-xl bg-white/10 backdrop-blur-sm px-4 
                         ring-1 ring-white/20 outline-none text-white placeholder:text-white/50
                         focus:ring-white/40 disabled:opacity-50"
              required
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading || !captchaToken}
              className="h-12 px-6 rounded-xl font-bold text-sm md:text-base
                         bg-gradient-to-r from-pink-500 via-violet-500 to-cyan-500
                         hover:shadow-lg hover:shadow-pink-500/50 
                         active:scale-95 transition-all duration-200
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing Up...' : 'Sign Up'}
            </button>
          </div>

          <div className="flex justify-center">
            <HCaptcha
              sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY || ''}
              onVerify={(token) => setCaptchaToken(token)}
              onExpire={() => setCaptchaToken('')}
              onError={() => setCaptchaToken('')}
              theme="dark"
            />
          </div>
          
          <p className="text-xs text-white/60 text-center">
            We respect your inbox. Unsubscribe anytime.
          </p>
        </form>
      </div>
    </div>
  );
}