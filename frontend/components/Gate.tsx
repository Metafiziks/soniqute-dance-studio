"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";

const HARMONICS_STORAGE_KEY = "soniqute:harmonics:v2";

function hasUnlockedSevenHarmonics(value: string | null) {
  if (!value) return false;

  try {
    const progress: unknown = JSON.parse(value);
    if (!progress || typeof progress !== "object") return false;
    const candidate = progress as {
      completed?: unknown;
      lastVisitedAt?: unknown;
      unlocked?: unknown;
    };
    return (
      candidate.completed === true &&
      typeof candidate.lastVisitedAt === "string" &&
      Array.isArray(candidate.unlocked) &&
      candidate.unlocked.length === 7 &&
      candidate.unlocked.every(
        (id, index) => id === index + 1,
      )
    );
  } catch {
    return false;
  }
}

export function Gate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    const unlocked = hasUnlockedSevenHarmonics(
      window.localStorage.getItem(HARMONICS_STORAGE_KEY),
    );
    if (unlocked) {
      setIsUnlocked(true);
      return;
    }
    router.replace("/");
  }, [router]);

  if (!isUnlocked) {
    return (
      <div
        role="status"
        className="grid min-h-screen place-items-center bg-[#000b10] text-xs uppercase tracking-[0.28em] text-white/60"
      >
        Listening for the Seven Harmonics...
      </div>
    );
  }

  return <>{children}</>;
}
