"use client";
import Link from "next/link";
import Image from "next/image";
import { SocialLinks } from "@/components/SocialIcons";

export default function NavBar() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 h-24 flex items-center justify-center bg-transparent">
      <div className="w-full max-w-7xl px-8 flex items-center justify-between">
        {/* LEFT — nav links */}
        <nav className="flex items-center gap-9 text-[20px] leading-none font-semibold tracking-wide text-white drop-shadow-[0_0_8px_rgba(0,0,0,0.6)]">
          <Link href="/" className="hover:text-[#64C7FF]">Home</Link>
          <Link href="/mcl" className="hover:text-[#64C7FF]">MCL</Link>
          <Link href="/melodius" className="hover:text-[#64C7FF]">Melodius</Link>
          <Link href="/explore" className="hover:text-[#64C7FF]">Explore</Link>
        </nav>

        {/* CENTER — larger logo */}
        <div className="absolute left-1/2 -translate-x-1/2">
          <Link href="/" className="block">
            <Image
              src="/images/soniqute-logo.png"
              alt="SoniQute"
              width={96}   // bigger
              height={96}
              className="object-contain transition-transform hover:scale-105"
              priority
            />
          </Link>
        </div>

     {/* RIGHT — social icons (GRIZL-clean style) */}
<div className="flex items-center gap-6 drop-shadow-[0_0_8px_rgba(0,0,0,0.6)]">
  <SocialLinks
    size={32}
    color="#ffffff"
    shadow={true}    // same glow as GRIZL footer
    className="opacity-95 hover:opacity-100 transition"
  />
</div>
      </div>
    </header>
  );
}
