"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { useAuth } from "@/lib/auth/clientAuth";

// ─── Inner component — uses useSearchParams so must be inside Suspense ────────
function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, user, isLoading } = useAuth();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const success = searchParams.get("success");
    const token   = searchParams.get("token");
    const userParam = searchParams.get("user");
    const err     = searchParams.get("error");

    if (err) { setError(prettyError(err)); return; }

    if (success === "true" && token && userParam) {
      try {
        localStorage.setItem("sq_token", token);
        localStorage.setItem("sq_user", decodeURIComponent(userParam));
        router.push("/pams-studio");
      } catch (e) {
        setError("Failed to complete sign in. Please try again.");
      }
    }
  }, [searchParams, router]);

  const handleGoogleSignIn = () => {
    window.location.href = `${process.env.NEXT_PUBLIC_API_URL}/auth/google/authorize`;
  };

  const handleGoToPamsStudio = () => router.push("/pams-studio");

  // ── Logged in state ───────────────────────────────────────────────────────
  if (!isLoading && isAuthenticated && user) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative z-10 w-full max-w-sm mx-4"
      >
        <div className="rounded-3xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur-xl shadow-[0_32px_80px_rgba(0,0,0,.6)] overflow-hidden">
          <div className="h-px w-full bg-gradient-to-r from-transparent via-fuchsia-400/50 to-transparent" />

          <div className="px-8 py-10 space-y-8">
            <div className="flex flex-col items-center gap-4">
              <div className="relative w-16 h-16">
                <Image src="/images/soniqute-logo.png" alt="SoniQute" fill className="object-contain" priority />
              </div>
              <div className="text-center">
                <h1 className="text-2xl font-black text-white tracking-tight">Welcome back!</h1>
                <p className="text-sm text-white/40 mt-1">Signed in as <span className="text-white/70 font-semibold">{user.username}</span></p>
              </div>
            </div>

            <div className="h-px w-full bg-white/8" />

            {/* Profile pill */}
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5 ring-1 ring-white/10">
              {(user as any).profilePic || (user as any).profileImage ? (
                <img
                  src={(user as any).profilePic || (user as any).profileImage}
                  alt={user.username}
                  className="w-10 h-10 rounded-full object-cover ring-2 ring-fuchsia-400/40"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-fuchsia-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                  {user.username?.[0]?.toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{user.username}</p>
                <p className="text-xs text-white/40 truncate">{(user as any).email || "Google account"}</p>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleGoToPamsStudio}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-fuchsia-600 to-pink-500 text-white font-bold text-sm hover:shadow-[0_8px_24px_rgba(217,70,239,.4)] transition-all"
            >
              Go to PaMs Studio →
            </motion.button>

            <button
              onClick={() => {
                localStorage.removeItem("sq_token");
                localStorage.removeItem("sq_user");
                window.location.reload();
              }}
              className="w-full text-xs text-white/25 hover:text-white/50 transition-colors text-center"
            >
              Sign out
            </button>
          </div>

          <div className="h-px w-full bg-gradient-to-r from-transparent via-pink-400/30 to-transparent" />
        </div>
      </motion.div>
    );
  }

  // ── Sign in state ─────────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="relative z-10 w-full max-w-sm mx-4"
    >
      <div className="rounded-3xl bg-white/[0.04] ring-1 ring-white/10 backdrop-blur-xl shadow-[0_32px_80px_rgba(0,0,0,.6)] overflow-hidden">
        <div className="h-px w-full bg-gradient-to-r from-transparent via-fuchsia-400/50 to-transparent" />

        <div className="px-8 py-10 space-y-8">
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <Image src="/images/soniqute-logo.png" alt="SoniQute" fill className="object-contain" priority />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-black text-white tracking-tight">SoniQute</h1>
              <p className="text-sm text-white/40 mt-1">Sign in to access PaMs Studio</p>
            </div>
          </div>

          <div className="h-px w-full bg-white/8" />

          <div className="space-y-2.5">
            {[
              { emoji: "🎵", text: "Access PaMs Studio" },
              { emoji: "🎬", text: "Create and manage your music content" },
              { emoji: "✨", text: "Unlock exclusive PaMs features" },
              { emoji: "🚀", text: "Publish and share your work" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="text-base">{item.emoji}</span>
                <span className="text-sm text-white/60">{item.text}</span>
              </div>
            ))}
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="px-4 py-3 rounded-2xl bg-red-500/15 ring-1 ring-red-400/30 text-sm text-red-300 text-center"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handleGoogleSignIn}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-6 rounded-2xl bg-white text-gray-800 font-semibold text-sm hover:bg-white/90 transition-colors shadow-[0_4px_24px_rgba(255,255,255,.15)]"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </motion.button>

          <p className="text-[10px] text-white/20 text-center leading-relaxed">
            By signing in you agree to SoniQute's Terms of Service and Privacy Policy.
          </p>
        </div>

        <div className="h-px w-full bg-gradient-to-r from-transparent via-pink-400/30 to-transparent" />
      </div>
    </motion.div>
  );
}

// ─── Page wrapper ─────────────────────────────────────────────────────────────
export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_#1a0a2e_0%,_#0a0412_55%,_#000_100%)] flex items-center justify-center relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/3 w-[500px] h-[500px] bg-fuchsia-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-pink-500/8 rounded-full blur-3xl" />
      </div>
      <Suspense fallback={null}>
        <LoginInner />
      </Suspense>
    </div>
  );
}

function prettyError(e: string): string {
  if (!e) return "";
  if (e === "access_denied")         return "Sign in was cancelled.";
  if (e === "invalid_state")         return "Session expired. Please try again.";
  if (e === "auth_init_failed")      return "Could not start sign in. Please try again.";
  if (e === "authentication_failed") return "Authentication failed. Please try again.";
  if (e === "please_wait")           return "Please wait a moment before trying again.";
  return `Sign in failed: ${e}`;
}
