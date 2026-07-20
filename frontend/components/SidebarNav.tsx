"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import clsx from "clsx";
import { SocialLinks } from "@/components/SocialIcons";
import type { ReactNode } from "react";
import { motion } from "framer-motion";

import {
  Home,
  Lock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Award,
  Gamepad2,
  ListChecks,
  Library,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useAuth } from "@/lib/auth/clientAuth"; 


type NavItem = {
  label: ReactNode;
  href: string;
  icon: LucideIcon;
  activeMatch: RegExp;
  disabled?: boolean;
  requiresAuth?: boolean;
  requiresAdmin?: boolean;
  section?: "main" | "whitelist";
};

const LOGO_SRC = "/images/soniqute-logo.png"; // update if your logo path differs

const NAV_ITEMS: NavItem[] = [
  {
    label: "Home",
    href: "/",
    icon: Home,
    activeMatch: /^\/$/,
  },
  {
    label: "PaMs",
    href: "/pams",
    icon: Sparkles,
    activeMatch: /^\/pams/,
  },
];

const WHITELIST_ITEMS: NavItem[] = [
  {
    label: "Whitelist",
    href: "/whitelist",
    icon: ListChecks,
    activeMatch: /^\/whitelist/,
  },
  {
    label: "Pambassador",
    href: "/pambassador",
    icon: Award,
    activeMatch: /^\/pambassador/,
    requiresAuth: true,
  },
];

const STUDIO_ITEMS: NavItem[] = [
  {
    label: "PaMs Studio",
    href: "/pams-studio",
    icon: Sparkles,
    activeMatch: /^\/pams-studio/,
  },
  {
    label: "Library",
    href: "/library",
    icon: Library,
    activeMatch: /^\/library/,
  },
  {
    label: "Admin",
    href: "/admin",
    icon: Lock,
    activeMatch: /^\/admin/,
    requiresAuth: true,
    requiresAdmin: true,
  },
];

export default function SidebarNav() {
  const pathname = usePathname();
  const [isExpanded, setIsExpanded] = useState(true);

  const { isAuthenticated, user, isLoading } = useAuth();
  const isAdmin = user?.role === "admin" || (user as any)?.isAdmin === true;

// Collapse by default on small screens
useEffect(() => {
  if (typeof window !== "undefined" && window.innerWidth < 768) {
    setIsExpanded(false);
  }
}, []);

  return (
    <aside
      className={clsx(
        "sticky top-0 z-40",
        "h-screen border-r border-white/10 bg-[radial-gradient(circle_at_top,_#140820_0,_#040208_55%,_#000_100%)]",
        "shadow-[0_0_40px_rgba(0,0,0,.9)]",
        "transition-[width] duration-300 ease-out",
        isExpanded ? "w-64" : "w-20"
      )}
    >
      <div className="flex h-full flex-col px-3 py-4">
        {/* Top: logo + toggle */}
        <div className="mb-6 flex items-center justify-between gap-2">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-2xl px-2 py-1.5 hover:bg-white/5 transition-colors"
          >
            <div className="relative h-10 w-10 flex-shrink-0">
              <Image
                src={LOGO_SRC}
                alt="SoniQute logo"
                fill
                className="object-contain"
                priority
              />
            </div>
            {isExpanded && (
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-[0.16em] uppercase text-white">
                  SoniQute
                </span>
                <span className="text-[10px] tracking-[0.18em] uppercase text-white/55">
                  MediaFi
                </span>
              </div>
            )}
          </Link>

          <button
            type="button"
            onClick={() => setIsExpanded((v) => !v)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/40 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
          >
            {isExpanded ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1">

          {/* -------- MAIN NAV ITEMS -------- */}
          {NAV_ITEMS.filter(
            (item) => !["/auth", "/leaderboards"].includes(item.href)
          ).map((item) => {
            const Icon = item.icon;
            const isActive = item.activeMatch.test(pathname || "");
            const isDisabled = item.disabled;

            const content = (
              <>
                <span
                  className={clsx(
                    "flex h-9 w-9 items-center justify-center rounded-full border text-white/80",
                    "transition-colors",
                    isActive
                      ? "border-pink-300 bg-pink-500/20 shadow-[0_0_18px_rgba(244,114,182,.6)]"
                      : "border-white/15 bg-white/5 group-hover:bg-white/10"
                  )}
                >
                  <Icon
                    className={clsx(
                      "h-4 w-4",
                      isActive ? "text-pink-100" : "text-white/70"
                    )}
                  />
                </span>
                {isExpanded && (
                  <span
                    className={clsx(
                      "truncate text-sm",
                      isActive ? "text-white font-semibold" : "text-white/80"
                    )}
                  >
                    {item.label}
                  </span>
                )}
              </>
            );

            if (isDisabled) {
              return (
                <div
                  key={item.href}
                  className="group flex items-center gap-3 rounded-2xl px-2.5 py-2 opacity-40 cursor-not-allowed"
                >
                  {content}
                  {isExpanded && (
                    <span className="ml-auto rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-white/60">
                      Soon
                    </span>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "group flex items-center gap-3 rounded-2xl px-2.5 py-2 transition-colors",
                  isActive ? "bg-white/10" : "hover:bg-white/5 focus-visible:bg-white/10"
                )}
              >
                {content}
              </Link>
            );
          })}


          {/* -------- DIVIDER + WHITELIST LABEL -------- */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.1 }}
            className="my-4"
          >
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            {isExpanded && (
              <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/45 px-2">
                Whitelist
              </p>
            )}
          </motion.div>

          {/* -------- WHITELIST SECTION -------- */}
          {WHITELIST_ITEMS.filter((item) => {
            if (item.requiresAdmin && !isAdmin) return false;
            return true;
          }).map((item) => {
            const Icon = item.icon;
            const isActive = item.activeMatch.test(pathname || "");
            const needsAuth = item.requiresAuth && !isAuthenticated;
            const needsAdmin = item.requiresAdmin && !isAdmin;
            const isDisabled = item.disabled || needsAuth || needsAdmin;

            const content = (
              <>
                <span
                  className={clsx(
                    "flex h-9 w-9 items-center justify-center rounded-full border text-white/80",
                    "transition-colors",
                    isActive
                      ? "border-pink-300 bg-pink-500/20 shadow-[0_0_18px_rgba(244,114,182,.6)]"
                      : "border-white/15 bg-white/5 group-hover:bg-white/10"
                  )}
                >
                  <Icon
                    className={clsx(
                      "h-4 w-4",
                      isActive ? "text-pink-100" : "text-white/70"
                    )}
                  />
                </span>
                {isExpanded && (
                  <span
                    className={clsx(
                      "truncate text-sm",
                      isActive ? "text-white font-semibold" : "text-white/80"
                    )}
                  >
                    {item.label}
                    {needsAuth && (
                      <span className="ml-1 text-[10px] uppercase tracking-[0.18em] text-white/40">
                        Locked
                      </span>
                    )}
                  </span>
                )}
              </>
            );

            if (isDisabled) {
              return (
                <div
                  key={item.href}
                  className="group flex items-center gap-3 rounded-2xl px-2.5 py-2 opacity-40 cursor-not-allowed"
                >
                  {content}
                  {item.disabled && isExpanded && (
                    <span className="ml-auto rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-white/60">
                      Soon
                    </span>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "group flex items-center gap-3 rounded-2xl px-2.5 py-2 transition-colors",
                  isActive ? "bg-white/10" : "hover:bg-white/5 focus-visible:bg-white/10"
                )}
              >
                {content}
              </Link>
            );
          })}

          {/* -------- DIVIDER + STUDIO LABEL -------- */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.15 }}
            className="my-4"
          >
            <div className="h-px w-full bg-gradient-to-r from-transparent via-white/15 to-transparent" />
            {isExpanded && (
              <p className="mt-2 text-[10px] uppercase tracking-[0.18em] text-white/45 px-2">
                Studio
              </p>
            )}
          </motion.div>

          {/* -------- STUDIO SECTION -------- */}
          {STUDIO_ITEMS.filter((item) => {
            if (item.requiresAdmin && !isAdmin) return false;
            return true;
          }).map((item) => {
            const Icon = item.icon;
            const isActive = item.activeMatch.test(pathname || "");
            const needsAuth = item.requiresAuth && !isAuthenticated;
            const needsAdmin = item.requiresAdmin && !isAdmin;
            const isDisabled = item.disabled || needsAuth || needsAdmin;

            const content = (
              <>
                <span
                  className={clsx(
                    "flex h-9 w-9 items-center justify-center rounded-full border text-white/80",
                    "transition-colors",
                    isActive
                      ? "border-pink-300 bg-pink-500/20 shadow-[0_0_18px_rgba(244,114,182,.6)]"
                      : "border-white/15 bg-white/5 group-hover:bg-white/10"
                  )}
                >
                  <Icon
                    className={clsx(
                      "h-4 w-4",
                      isActive ? "text-pink-100" : "text-white/70"
                    )}
                  />
                </span>
                {isExpanded && (
                  <span
                    className={clsx(
                      "truncate text-sm",
                      isActive ? "text-white font-semibold" : "text-white/80"
                    )}
                  >
                    {item.label}
                    {needsAuth && (
                      <span className="ml-1 text-[10px] uppercase tracking-[0.18em] text-white/40">
                        Locked
                      </span>
                    )}
                  </span>
                )}
              </>
            );

            if (isDisabled) {
              return (
                <div
                  key={item.href}
                  className="group flex items-center gap-3 rounded-2xl px-2.5 py-2 opacity-40 cursor-not-allowed"
                >
                  {content}
                  {item.disabled && isExpanded && (
                    <span className="ml-auto rounded-full border border-white/10 px-2 py-0.5 text-[9px] uppercase tracking-[0.18em] text-white/60">
                      Soon
                    </span>
                  )}
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "group flex items-center gap-3 rounded-2xl px-2.5 py-2 transition-colors",
                  isActive ? "bg-white/10" : "hover:bg-white/5 focus-visible:bg-white/10"
                )}
              >
                {content}
              </Link>
            );
          })}

        </nav>


        {/* Bottom: social icons (expanded only) */}
        {isExpanded && (
          <div className="mt-6 border-t border-white/5 pt-4">
            <p className="mb-3 text-[10px] uppercase tracking-[0.18em] text-white/45">
              Connect
            </p>

            <div className="flex items-center gap-3">
              {/* X (Twitter) */}
              <a
                href="https://x.com/pamseternity"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex h-8 w-8 items-center justify-center rounded-full
                          bg-white/5 hover:bg-white/15 border border-white/15
                          transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-white/80 group-hover:text-white"
                  aria-hidden="true"
                >
                  <path
                    d="M3 3h4.6l4 5.7L15.3 3H21l-6.2 8.2L21 21h-4.6l-4.2-6L8.4 21H3l6.4-8.5L3 3z"
                    fill="currentColor"
                  />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://instagram.com/soniqute.music"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex h-8 w-8 items-center justify-center rounded-full
                          bg-white/5 hover:bg-white/15 border border-white/15
                          transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-white/80 group-hover:text-white"
                  aria-hidden="true"
                >
                  <rect
                    x="3"
                    y="3"
                    width="18"
                    height="18"
                    rx="5"
                    ry="5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <circle cx="17.3" cy="6.7" r="1.2" fill="currentColor" />
                </svg>
              </a>

              {/* Spotify */}
              <a
                href="https://open.spotify.com/artist/4dLdIEamWJBbe2XIsSGzxe"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex h-8 w-8 items-center justify-center rounded-full
                          bg-white/5 hover:bg-white/15 border border-white/15
                          transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-white/80 group-hover:text-white"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
                  <path
                    d="M8.2 10.1c2.2-.6 4.6-.5 7 .2M8.7 12.6c1.8-.5 3.6-.4 5.5.2M9.2 15c1.3-.3 2.5-.3 3.8.1"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
              </a>

              {/* TikTok */}
              <a
                href="https://tiktok.com/@soniqute"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex h-8 w-8 items-center justify-center rounded-full
                          bg-white/5 hover:bg-white/15 border border-white/15
                          transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-white/80 group-hover:text-white"
                  aria-hidden="true"
                >
                  <path
                    d="M14.5 5.2c.5 1.6 1.7 2.7 3.3 3v2.3a5 5 0 0 1-3.3-1.1v5.9a4.5 4.5 0 1 1-4.6-4.5v2.3a2.2 2.2 0 1 0 2.1 2.2V5h2.5z"
                    fill="currentColor"
                  />
                </svg>
              </a>

              {/* Discord */}
              <a
                href="https://discord.gg/CeeYVa6W8X"
                target="_blank"
                rel="noreferrer"
                className="group inline-flex h-8 w-8 items-center justify-center rounded-full
                          bg-white/5 hover:bg-white/15 border border-white/15
                          transition-colors"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4 text-white/80 group-hover:text-white"
                  aria-hidden="true"
                >
                  <path
                    d="M8.2 5.1c1-.3 2-.5 3-.5.9 0 1.9.2 2.8.5l.3.1.2-.3c.5-.7 1.2-1.2 2-1.5.4.7.7 1.4.9 2.2.6.2 1.1.5 1.6.8.2.1.3.3.3.5v8.1c0 .3-.2.6-.5.7a13.4 13.4 0 0 1-3.1 1c-.3 0-.6-.1-.7-.4l-.4-.8-.5-.9a8.9 8.9 0 0 1-2.3.3 8.9 8.9 0 0 1-2.3-.3l-.5.9-.4.8c-.1.3-.4.5-.7.4a13.4 13.4 0 0 1-3.1-1 .8.8 0 0 1-.5-.7V7.6c0-.2.1-.4.3-.5.5-.3 1-.6 1.6-.8.2-.8.5-1.5.9-2.2.8.3 1.5.8 2 1.5l.2.3.3-.1zM10 11.9c0-.7-.4-1.2-1-1.2s-1 .5-1 1.2c0 .6.4 1.2 1 1.2.6 0 1-.6 1-1.2zm6 0c0-.7-.4-1.2-1-1.2s-1 .5-1 1.2c0 .6.4 1.2 1 1.2.6 0 1-.6 1-1.2z"
                    fill="currentColor"
                  />
                </svg>
              </a>
            </div>
          </div>
        )}

      </div>
    </aside>
  );
}
