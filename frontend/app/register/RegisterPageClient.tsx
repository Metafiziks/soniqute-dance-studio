"use client";

import { FormEvent, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "";

type Status = "idle" | "submitting" | "success" | "error";

export default function RegisterPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialCode = searchParams.get("reg") || "";

  const [code, setCode] = useState(initialCode);
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!code) {
      setError("Please enter a registration code.");
      return;
    }

    try {
      setStatus("submitting");
      const res = await fetch(`${API_BASE}/register/claim`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          code,
          handle,
          email,
        }),
      });
if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Status ${res.status}`);
      }

      const data = await res.json();
      
if (data.ok) {
  setStatus("success");
  // Use the backend URL properly
  window.location.href = 'https://api.soniqute.com/api/auth/twitter/authorize-redirect';
} else {
        throw new Error("Registration failed");
      }
      
    } catch (err: any) {
      console.error(err);
      setStatus("error");
      setError(
        err?.message ||
          "Unable to complete registration. Your code may be invalid or already used."
      );
    }
  };

  return (
    <section className="section-blend relative overflow-hidden min-h-[80vh] flex items-center">
      <div
        className="bg-layer"
        style={{ backgroundImage: "url('/images/gradient_1.svg')" }}
      />
      <div className="vignette" />

      <div className="relative z-10 container-padding maxw py-16 w-full flex justify-center">
        <motion.div
          initial={{ opacity: 0, y: 28, scale: 0.97 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, amount: 0.35 }}
          transition={{ type: "spring", stiffness: 420, damping: 32 }}
          className="w-full max-w-xl rounded-[28px] bg-black/70 border border-white/12
                     shadow-[0_24px_70px_rgba(0,0,0,.85)] backdrop-blur-xl px-5 py-6 md:px-7 md:py-8"
        >
          <p className="inline-flex items-center gap-2 rounded-full border border-pink-300/60
                         bg-gradient-to-r from-pink-500/30 via-violet-500/30 to-sky-400/30
                         px-4 py-1.5 text-[11px] md:text-xs font-semibold tracking-[0.22em]
                         uppercase text-pink-50 shadow-[0_0_20px_rgba(244,114,182,.6)]"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-pink-100 shadow-[0_0_8px_rgba(255,255,255,1)]" />
            SoniQute Registration
          </p>

          <h1 className="mt-4 sq-title text-2xl md:text-3xl font-extrabold text-white">
            Claim your future in the new music economy.
          </h1>

          <p className="mt-3 text-xs md:text-sm text-white/75">
            Use your registration code to join the early cohort for the Music Coin
            Launchpad, leaderboards, and future SoniQute campaigns.
          </p>

          <form onSubmit={onSubmit} className="mt-6 grid gap-4 text-sm text-white/85">
            <div>
              <label className="text-[11px] uppercase tracking-[0.16em] text-white/55">
                Registration code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.trim())}
                placeholder="Paste your code here"
                className="mt-1 h-11 w-full rounded-2xl bg-white/5 px-3 text-sm
                           ring-1 ring-white/12 outline-none
                           focus:ring-white/30"
                required
              />
            </div>

            {status === "success" && (
              <p className="mt-1 text-xs text-green-300 bg-green-500/10 border border-green-400/30 rounded-2xl px-3 py-2">
                Registration code accepted! Redirecting to X authentication...
              </p>
            )}

            {error && (
              <p className="mt-1 text-xs text-rose-300 bg-rose-500/10 border border-rose-400/30 rounded-2xl px-3 py-2">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={status === "submitting" || status === "success"}
              className="mt-2 h-11 rounded-2xl bg-gradient-to-r from-pink-500 to-violet-500
                         text-xs md:text-sm font-semibold text-white
                         shadow-[0_0_26px_rgba(244,114,182,.8)]
                         hover:brightness-110 active:translate-y-px
                         disabled:opacity-70 transition"
            >
              {status === "submitting" ? "Verifying code..." : 
               status === "success" ? "Redirecting to X..." :
               "Complete registration"}
            </button>
          </form>

          <p className="mt-4 text-[11px] text-white/45">
            After you register, you'll unlock your referral link and future missions inside SoniQute.
          </p>
        </motion.div>
      </div>
    </section>
  );
}