"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "./clientAuth";

export function useRequireAuth(options?: { adminOnly?: boolean }) {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      const next = encodeURIComponent(pathname || "/");
      router.replace(`/auth?next=${next}`);
      return;
    }

    if (options?.adminOnly && user?.role !== "admin") {
      router.replace("/"); // or /auth, or a dedicated "no access" page
    }
  }, [isAuthenticated, isLoading, user, router, pathname, options?.adminOnly]);
}