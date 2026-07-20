"use client";

import Link from "next/link";
import {
  FaXTwitter,
  FaDiscord,
  FaTiktok,
  FaInstagram,
  FaSpotify,
} from "react-icons/fa6";

type SocialLinksProps = {
  size?: number;
  color?: string;
  shadow?: boolean;
  className?: string;
  exclude?: string[];
};

export function SocialLinks({
  size = 30,
  color = "#ffffff",
  shadow = false,
  className = "",
  exclude = [],
}: SocialLinksProps) {
  const iconStyle: React.CSSProperties = {
    width: size,
    height: size,
    color,
  };

  const glowClass = shadow
    ? "drop-shadow-[0_0_6px_rgba(255,255,255,0.65)]"
    : "";

  const baseIconClasses =
    "transition-transform duration-300 group-hover:scale-110";

  const socials = [
    { name: "x", component: FaXTwitter, url: "https://x.com/pamseternity", label: "SoniQute on X (Twitter)" },
    { name: "instagram", component: FaInstagram, url: "https://instagram.com/soniqute.music", label: "SoniQute on Instagram" },
    { name: "spotify", component: FaSpotify, url: "https://open.spotify.com/artist/4dLdIEamWJBbe2XIsSGzxe", label: "SoniQute on Spotify" },
    { name: "tiktok", component: FaTiktok, url: "https://www.tiktok.com/@soniqute", label: "SoniQute on TikTok" },
    { name: "discord", component: FaDiscord, url: "https://discord.gg/CeeYVa6W8X", label: "SoniQute Discord" },
  ].filter((item) => !exclude.includes(item.name));

  return (
    <div className={`flex items-center gap-5 ${className}`}>
      {socials.map(({ name, component: Icon, url, label }) => (
        <Link
          key={name}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={label}
          className="group"
        >
          <Icon
            style={iconStyle}
            className={`${baseIconClasses} ${glowClass}`}
          />
        </Link>
      ))}
    </div>
  );
}

