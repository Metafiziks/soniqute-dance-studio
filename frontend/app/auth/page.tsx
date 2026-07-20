"use client";

export const dynamic = "force-dynamic";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

// ─── Redirect /auth → returnTo (or /login) preserving any query params ────────
function AuthRedirectInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qs = searchParams.toString();
    // Check if the user came from a page that set a returnTo destination
    let returnTo = "/login";
    try {
      const stored = sessionStorage.getItem("sq_auth_return");
      if (stored) {
        returnTo = stored;
        sessionStorage.removeItem("sq_auth_return");
      }
    } catch {
      // sessionStorage unavailable (SSR guard)
    }
    router.replace(qs ? `${returnTo}?${qs}` : returnTo);
  }, [router, searchParams]);

  return null;
}

export default function AuthPage() {
  return (
    <Suspense fallback={null}>
      <AuthRedirectInner />
    </Suspense>
  );
}
