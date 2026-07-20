"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";
import NavBar from "@/components/NavBar";
import SidebarNav from "@/components/SidebarNav";

const SHELL_FREE_ROUTES = ["/tidelands/serengana"];

export default function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const shellFree = SHELL_FREE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  if (shellFree) {
    return <main className="min-h-screen">{children}</main>;
  }

  return (
    <div className="flex min-h-screen">
      <div className="hidden md:block">
        <SidebarNav />
      </div>

      <div className="flex flex-1 flex-col">
        <div className="md:hidden">
          <NavBar />
        </div>

        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </div>
  );
}
