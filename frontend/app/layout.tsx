// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import AppShell from "@/components/AppShell";
import { site } from "@/lib/seo";
import { M_PLUS_Code_Latin } from "next/font/google";
import { Providers } from "./providers";

const mPlus = M_PLUS_Code_Latin({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-mplus",
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),

  title: {
    default: "SoniQute – The MediaFi Music Platform",
    template: "%s – SoniQute",
  },

  description:
    "Discover Soniqute, the innovative mediafi platform that transforms songs into memeable content and on-chain assets. Join our community in voting for viral music, leveraging AI to detect trends, and rewarding creators and fans alike. Experience the future of music and memes!",

  openGraph: {
    title: "SoniQute – MediaFi Platform",
    description:
      "Discover Soniqute, the innovative mediafi platform that transforms songs into memeable content and on-chain assets. Join our community in voting for viral music, leveraging AI to detect trends, and rewarding creators and fans alike. Experience the future of music and memes!",
    url: site.url,
    siteName: "SoniQute",
    type: "website",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "SoniQute MediaFi Preview",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "SoniQute – MediaFi Music Platform",
    description:
      "Discover SoniQute – a world where songs become memes, memes become motion, and motion becomes momentum.",
    images: ["/images/soniqute-header.png"],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${mPlus.variable} font-mplus bg-[#0C060A] text-white overflow-x-hidden relative`}
      >
        <Providers>
          <div className="global-gradient fixed inset-0 -z-10" />

          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}