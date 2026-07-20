"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";
import { useAuth } from "@/lib/auth/clientAuth";

const getApiBase = () => {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  return "https://api.soniqute.com/api";
};

const API_BASE = getApiBase();

const reveal = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" } },
};

export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setAuth, isAuthenticated, user, isLoading: authLoading } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [processingAuth, setProcessingAuth] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const error = searchParams.get("error");
  const success = searchParams.get("success");
  const token = searchParams.get("token");

  useEffect(() => {
    // Handle successful authentication callback
    if (success === "true" && token && !processingAuth) {
      setProcessingAuth(true);
      const userParam = searchParams.get("user");
      
      if (userParam) {
        try {
          const userData = JSON.parse(decodeURIComponent(userParam));
          console.log("Authentication successful for:", userData.username);
          
          // Store auth data
          setAuth({
            token: token,
            user: {
              id: userData.id,
              username: userData.username,
              role: userData.isAdmin ? "admin" : "user",
            }
          });
          
          // Store additional data
          if (userData.x_access_token) {
            localStorage.setItem("x_access_token", userData.x_access_token);
          }
          
          // Clear URL params and redirect
          setTimeout(() => {
            router.replace("/dashboard");
          }, 100);
          
        } catch (e) {
          console.error("Error processing authentication:", e);
          setProcessingAuth(false);
        }
      }
    }
  }, [success, token, searchParams, router, setAuth, processingAuth]);

const handleSecureLogout = async () => {
  if (isLoggingOut) return;
  
  try {
    setIsLoggingOut(true);
    
    console.log('🔒 Starting direct logout...');
    
    // 1. Notify backend to disconnect wallet
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || '';
      await fetch(`${apiBase}/api/auth/disconnect-wallet`, {
        method: 'POST',
        credentials: 'include'
      });
      console.log('✅ Backend notified');
    } catch (error) {
      console.log('Backend error (non-critical):', error);
    }
    
    // 2. Clear all auth-related storage manually
    console.log('🗑️ Clearing auth storage...');
    
    // Clear NextAuth tokens and any auth-related data
    const authKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('nextauth') ||
        key.includes('session') ||
        key.includes('token') ||
        key.includes('auth') ||
        key.includes('user')
      )) {
        authKeys.push(key);
      }
    }
    
    authKeys.forEach(key => localStorage.removeItem(key));
    sessionStorage.clear();
    
    console.log(`🗑️ Cleared ${authKeys.length} auth keys`);
    
    // 3. Clear your app's auth state directly
    setAuth(null);
    console.log('✅ Auth context cleared');
    
    // 4. Small delay then force redirect with cache busting
    setTimeout(() => {
      console.log('🔄 Forcing redirect...');
      window.location.href = '/auth?logout=true&t=' + Date.now();
    }, 500);
    
  } catch (error) {
    console.error('❌ Direct logout failed:', error);
    setIsLoggingOut(false);
    
    // Nuclear option - clear everything and reload
    localStorage.clear();
    sessionStorage.clear();
    setAuth(null);
    window.location.href = '/auth';
  }
};

  // If already authenticated, show logged in state
  if (!authLoading && isAuthenticated && user) {
    return (
      <section className="section-blend relative overflow-hidden min-h-[80vh] flex items-center">
        <div className="bg-layer" style={{ backgroundImage: "url('/images/gradient2.svg')" }} />
        <div className="vignette" />

        <div className="relative z-10 container-padding maxw py-16">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
            }}
            className="max-w-xl mx-auto text-center"
          >
            <motion.div
              variants={reveal}
              className="rounded-[28px] bg-black/65 border border-white/10 shadow-[0_22px_60px_rgba(0,0,0,.8)] backdrop-blur-xl p-8"
            >
              <div className="mb-4 text-4xl">✨</div>
              <h1 className="sq-title text-2xl md:text-3xl font-extrabold text-white mb-4">
                Welcome back, {user.username}!
              </h1>
              <p className="text-white/80 mb-6">
                You're logged in as {user.role === "admin" ? "an administrator" : "a user"}.
              </p>
              
              <div className="space-y-3">
                <Link
                  href="/dashboard"
                  className="block w-full rounded-full border border-sky-300/70 bg-gradient-to-r from-sky-600/40 via-violet-600/40 to-pink-500/40 px-6 py-2.5 text-sm font-bold uppercase tracking-[0.2em] text-white shadow-[0_0_24px_rgba(56,189,248,.8)] backdrop-blur-md transition-all hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(56,189,248,1)]"
                >
                  Go to Dashboard
                </Link>
                
                <button
                  onClick={handleSecureLogout}
                  disabled={isLoggingOut}
                  className="block w-full rounded-full border border-white/20 bg-white/5 px-6 py-2.5 text-sm text-white/80 hover:bg-white/10 transition-all disabled:opacity-50"
                >
                  {isLoggingOut ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Signing out...
                    </div>
                  ) : (
                    "Sign Out"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>
    );
  }

  const handleXLogin = async () => {
    try {
      setIsLoading(true);
      const redirectUrl = `${API_BASE}/auth/twitter/authorize-redirect`;
      window.location.href = redirectUrl;
    } catch (err) {
      console.error("Error during X login:", err);
      setIsLoading(false);
    }
  };

  const getErrorMessage = (error: string | null) => {
    if (!error) return null;
    
    const errorMap: { [key: string]: string } = {
      "please_wait": "Too many attempts. Please wait a moment before trying again.",
      "access_denied": "Authentication was cancelled or denied.",
      "need=code": "Registration code required. Please request a code or use a referral link.",
      "registration_required": "Registration code required. Please request a code or use a referral link.",
    };
    
    if (error.includes("rate_limited")) {
      const match = error.match(/(\d+)s/);
      const seconds = match ? match[1] : "60";
      return `Rate limited. Please wait ${seconds} seconds before trying again.`;
    }
    
    return errorMap[error] || decodeURIComponent(error);
  };

  return (
    <section className="section-blend relative overflow-hidden min-h-[80vh] flex items-center">
      <div className="bg-layer" style={{ backgroundImage: "url('/images/gradient2.svg')" }} />
      <div className="vignette" />

      <div className="relative z-10 container-padding maxw py-16 flex flex-col md:flex-row gap-10 md:gap-16 items-center">
        {/* Left: copy */}
        <motion.div
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.12, delayChildren: 0.1 } },
          }}
          className="max-w-xl"
        >
          <motion.p
            variants={reveal}
            className="inline-flex items-center gap-2 rounded-full border border-pink-300/60 bg-gradient-to-r from-pink-500/30 via-violet-500/30 to-sky-400/30 px-4 py-1.5 text-[11px] md:text-xs font-semibold tracking-[0.22em] uppercase text-pink-50 shadow-[0_0_20px_rgba(244,114,182,.6)]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-pink-100 shadow-[0_0_8px_rgba(255,255,255,1)]" />
            SoniQute Access
          </motion.p>

          <motion.h1
            variants={reveal}
            className="mt-4 sq-title text-3xl md:text-4xl xl:text-5xl font-extrabold"
          >
            Log in with X to join the{" "}
            <span className="sparkle-text">MediaFi fandom.</span>
          </motion.h1>

          <motion.p
            variants={reveal}
            className="mt-4 text-white/80 text-sm md:text-base leading-relaxed"
          >
            Connect your X account to reserve your spot and start earning points toward future SoniQute drops.
          </motion.p>

          {error && (
            <motion.p
              variants={reveal}
              className="mt-4 text-sm text-rose-300 bg-rose-500/10 border border-rose-400/30 rounded-2xl px-4 py-3"
            >
              {getErrorMessage(error)}
            </motion.p>
          )}

          <motion.div variants={reveal} className="mt-8">
            <button
              onClick={handleXLogin}
              disabled={isLoading || processingAuth}
              className="group relative inline-flex items-center gap-2 rounded-full border border-sky-300/70 bg-gradient-to-r from-sky-600/40 via-violet-600/40 to-pink-500/40 px-6 py-2.5 text-[11px] md:text-sm font-bold uppercase tracking-[0.2em] text-white shadow-[0_0_24px_rgba(56,189,248,.8)] backdrop-blur-md transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(56,189,248,1)] active:scale-[0.97] disabled:opacity-70"
            >
              <span
                aria-hidden
                className="pointer-events-none absolute -inset-3 rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,.8),transparent_72%)] blur-xl opacity-80"
              />
              <span className="relative z-10 text-xs flex items-center gap-1">
                <span className="text-lg">𝕏</span>
                {isLoading || processingAuth ? "Connecting..." : "Sign in with X"}
              </span>
            </button>
          </motion.div>
        </motion.div>

        {/* Right side */}
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.98 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ type: "spring", stiffness: 420, damping: 34 }}
          className="w-full max-w-md"
        >
          <div className="rounded-[28px] bg-black/65 border border-white/10 shadow-[0_22px_60px_rgba(0,0,0,.8)] backdrop-blur-xl p-5 md:p-6">
            <h2 className="sq-title text-xl font-bold text-white">What this login does</h2>
            <ul className="mt-4 space-y-2 text-xs md:text-sm text-white/75">
              <li>• Verifies your X handle for future campaigns and leaderboards.</li>
              <li>• Links your X identity to your on-chain SoniQute profile.</li>
              <li>• Lets you access referral links, MediaFi, and more.</li>
            </ul>
            <p className="mt-4 text-[11px] text-white/45">
              We request read permissions only.
            </p>
          </div>
          
          <div className="mt-6 space-y-2 text-xs md:text-sm text-white/65 px-5 md:px-6">
            <p>
              Need a registration code?{" "}
              <Link
                href="/#request-code"
                className="text-pink-200 hover:text-pink-100 underline underline-offset-2"
              >
                Request reg code
              </Link>
            </p>

            <p>
              Already have a registration code?{" "}
              <Link
                href="/register"
                className="text-sky-200 hover:text-sky-100 underline underline-offset-2"
              >
                Go to registration
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}