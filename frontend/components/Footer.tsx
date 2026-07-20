"use client";

import React, { useState, useEffect, ReactNode } from "react";
import { SocialLinks } from "@/components/SocialIcons";

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
};

export default function Footer() {
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  // Support #terms and #privacy deep-linking
  useEffect(() => {
    if (typeof window !== "undefined") {
      const hash = window.location.hash;
      if (hash === "#terms") setShowTerms(true);
      if (hash === "#privacy") setShowPrivacy(true);
    }
  }, []);

  return (
    <>
      <footer className="bg-[#020617] border-t border-white/10 text-white relative z-50">
        <div className="max-w-7xl mx-auto px-4 py-10 md:py-14">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            {/* LEFT — Social / Connect */}
            <div className="flex flex-col items-center md:items-start space-y-4">
              <h3 className="font-semibold text-xs md:text-sm uppercase tracking-[0.18em] text-cyan-200/95 drop-shadow-[0_0_12px_rgba(56,189,248,0.6)]">
                Connect With Us
              </h3>
              <div className="flex space-x-6">
                <SocialLinks size={32} color="#ffffff" shadow />
              </div>
              <p className="text-xs md:text-sm text-white/60 max-w-xs text-center md:text-left mt-2">
                Follow SoniQute across socials for music, memes, and streams.
              </p>
            </div>

            {/* CENTER — Brand logo + copyright */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <h3 className="font-semibold text-xs md:text-sm uppercase tracking-[0.18em] text-sky-200/95 drop-shadow-[0_0_12px_rgba(56,189,248,0.55)]">
                Developed By
              </h3>
              <a
                href="https://metafizik.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center hover:opacity-80 transition-opacity duration-300"
              >
                <img
                  src="/metafizik-logo.png"
                  alt="Metafizik"
                  className="h-16 object-contain"
                />
              </a>

              <p className="text-xs md:text-sm text-white/60 mt-1">
                © {new Date().getFullYear()} SoniQute. All rights reserved.
              </p>
            </div>

            {/* RIGHT — Legal (Terms + Privacy buttons) */}
            <div className="flex flex-col items-center md:items-end space-y-4">
              <h3 className="font-semibold text-xs md:text-sm uppercase tracking-[0.18em] text-violet-200/95 drop-shadow-[0_0_14px_rgba(192,132,252,0.7)]">
                Legal
              </h3>
              <div className="text-xs md:text-sm text-white/70 leading-relaxed max-w-xs text-center md:text-right space-y-3">
                <p>
                  Review how SoniQute handles your data, participation, and use of our music-driven
                  MediaFi platform.
                </p>
                <div className="flex flex-col md:flex-row items-center md:justify-end gap-3">
                  <button
                    onClick={() => setShowTerms(true)}
                    className="text-sm text-cyan-200 hover:text-white underline underline-offset-4 decoration-cyan-400/70 hover:decoration-white transition-colors duration-200"
                  >
                    Terms of Service
                  </button>
                  <span className="hidden md:inline text-white/40 select-none">|</span>
                  <button
                    onClick={() => setShowPrivacy(true)}
                    className="text-sm text-cyan-200 hover:text-white underline underline-offset-4 decoration-cyan-400/70 hover:decoration-white transition-colors duration-200"
                  >
                    Privacy Policy
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile bottom note (optional) */}
          <div className="mt-8 pt-5 border-t border-white/5 text-center md:hidden">
            <p className="text-xs text-white/45">
              Built for music, memes, and momentum.
            </p>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {showTerms && (
        <Modal title="Terms of Service" onClose={() => setShowTerms(false)}>
          <TermsContent />
        </Modal>
      )}
      {showPrivacy && (
        <Modal title="Privacy Policy" onClose={() => setShowPrivacy(false)}>
          <PrivacyContent />
        </Modal>
      )}
    </>
  );
}

/* ---------- Glass Glow Modal ---------- */
const Modal = ({ title, onClose, children }: ModalProps) => (
  <div className="fixed inset-0 z-[1000] flex items-center justify-center">
    <div
      className="absolute inset-0 bg-black/70 backdrop-blur-md transition-opacity"
      onClick={onClose}
    />
    <div className="relative bg-[#020617]/90 backdrop-blur-2xl border border-cyan-300/35 rounded-2xl shadow-[0_0_40px_rgba(56,189,248,0.7)] max-w-3xl w-[92vw] max-h-[84vh] overflow-hidden">
      <header className="flex justify-between items-center border-b border-cyan-300/30 px-5 py-3 bg-gradient-to-r from-[#020617] via-[#02141f] to-[#040c1c]">
        <h2 className="text-cyan-200 text-base md:text-lg font-semibold drop-shadow-[0_0_10px_rgba(56,189,248,0.9)]">
          {title}
        </h2>
        <button
          onClick={onClose}
          className="text-white/70 hover:text-white text-lg leading-none px-1"
          aria-label="Close"
        >
          ✕
        </button>
      </header>
      <div className="p-5 md:p-6 overflow-y-auto text-xs md:text-sm text-white/90 max-h-[68vh] space-y-4 leading-relaxed">
        {children}
      </div>
      <footer className="border-t border-cyan-300/30 px-5 py-3 text-right">
        <button
          onClick={onClose}
          className="inline-flex items-center justify-center px-5 py-2 rounded-lg text-sm font-medium text-cyan-100 bg-cyan-500/15 hover:bg-cyan-400/25 transition-all duration-200 hover:shadow-[0_0_18px_rgba(56,189,248,0.85)] hover:scale-[1.02]"
        >
          Close
        </button>
      </footer>
    </div>
  </div>
);

/* ---------- Terms Content ---------- */
const TermsContent = () => (
  <div className="space-y-5">
    <p className="text-white/75 italic text-xs">
      <strong>Last Updated:</strong> May 26, 2026
    </p>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">1. ACCEPTANCE OF TERMS</h3>
      <p className="text-xs">
        By accessing or using SoniQute (the &quot;Platform&quot;), you agree to be bound by these Terms of Service.
        SoniQute is a creative media and collectibles platform featuring physical collectibles, NFTs/digital
        collectibles, music and media experiences, and artist collaborations. The Platform is provided
        &quot;as-is&quot; without warranties of any kind.
      </p>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">2. ELIGIBILITY</h3>
      <p className="text-xs">
        You must be at least 18 years of age to use this Platform. By using SoniQute, you confirm that you
        are of legal age and have the capacity to agree to these Terms. The Platform is not available where
        prohibited by applicable law.
      </p>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">3. COLLECTIBLES &amp; NFTs ARE NOT INVESTMENTS</h3>
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 my-2">
        <p className="font-bold text-blue-300 text-xs mb-2">IMPORTANT — PLEASE READ</p>
        <p className="text-xs leading-relaxed">
          Physical collectibles, NFTs, and digital collectibles available on SoniQute are intended for
          personal enjoyment, creative participation, fandom, and collection.{" "}
          <strong>
            They are not financial products, securities, investment vehicles, or financial instruments
            of any kind.
          </strong>
        </p>
      </div>
      <ul className="list-disc pl-4 mt-2 space-y-1 text-xs">
        <li>We make no promise of profit, appreciation, resale value, liquidity, or future utility.</li>
        <li>Collectibles and NFTs may have little or no resale value.</li>
        <li>You are solely responsible for your own decisions around digital assets.</li>
        <li>SoniQute does not provide investment, financial, legal, or tax advice.</li>
      </ul>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">4. WALLET &amp; ACCOUNT CONNECTIONS</h3>
      <p className="text-xs">
        Certain features may require connecting a compatible cryptocurrency wallet. You are solely
        responsible for the security of your wallet, private keys, and any assets held in your wallet.
        SoniQute cannot recover lost access or reverse on-chain transactions.
      </p>
      <p className="text-xs mt-1.5">
        Wallet connections may be used to verify NFT ownership for access-gated experiences. SoniQute
        does not custody your digital assets.
      </p>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">5. WHITELIST PARTICIPATION</h3>
      <p className="text-xs">
        SoniQute may offer whitelist or early-access programs for upcoming drops, experiences, or
        collectibles. Whitelist spots are granted at our sole discretion and do not guarantee the ability
        to acquire any collectible or participate in any event. We reserve the right to modify or cancel
        whitelist programs at any time.
      </p>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">6. NFTs &amp; DIGITAL COLLECTIBLES</h3>
      <p className="text-xs">
        When you acquire an NFT or digital collectible through SoniQute, you receive a limited, personal,
        non-commercial license to display and enjoy the associated digital content. This does not transfer
        copyright, trademark, or any underlying intellectual property rights.
      </p>
      <p className="text-xs mt-1.5">
        NFT availability, metadata, and linked content are provided &quot;as-is.&quot; SoniQute does not guarantee
        continued access to associated media or content.
      </p>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">7. PHYSICAL COLLECTIBLES</h3>
      <p className="text-xs">
        Physical collectibles are subject to availability and may be fulfilled by third-party partners.
        Delivery timelines, shipping costs, and availability may vary. SoniQute is not responsible for
        delays, damage, or loss during shipping caused by third-party carriers or fulfillment partners.
      </p>
      <p className="text-xs mt-1.5">
        All physical collectible sales are final unless otherwise stated at the time of purchase.
      </p>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">8. INTELLECTUAL PROPERTY</h3>
      <p className="text-xs">
        All Platform content — including music, artwork, designs, and brand assets — is owned by SoniQute
        or its licensors. You may not reproduce, distribute, modify, or create derivative works without
        express written permission.
      </p>
      <p className="text-xs mt-1.5">
        Artists retain rights to their own creative works. You agree to respect artist and creator rights
        when engaging with content on the Platform.
      </p>
      <p className="text-xs mt-1.5">You may:</p>
      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-xs">
        <li>✓ Enjoy licensed content for personal use</li>
        <li>✓ Share on social media with proper attribution</li>
      </ul>
      <p className="text-xs mt-1.5">You may NOT:</p>
      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-xs">
        <li>✗ Use content in commercial projects without a license</li>
        <li>✗ Resell or redistribute recordings or artwork</li>
        <li>✗ Create derivatives without permission</li>
      </ul>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">9. USER-GENERATED CONTENT</h3>
      <p className="text-xs">
        If you submit or upload content to the Platform, you grant SoniQute a non-exclusive, royalty-free
        license to use, display, and share that content in connection with the Platform. You are solely
        responsible for content you submit and must not upload content that infringes third-party rights,
        is unlawful, or violates these Terms.
      </p>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">10. PROHIBITED CONDUCT</h3>
      <p className="text-xs">You agree not to:</p>
      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-xs">
        <li>Use the Platform for any unlawful purpose</li>
        <li>Attempt to bypass or exploit Platform security</li>
        <li>Impersonate any person, artist, or entity</li>
        <li>Engage in fraud, manipulation, or deceptive practices</li>
        <li>Upload malicious code or interfere with Platform operations</li>
        <li>Violate any applicable laws or regulations</li>
      </ul>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">11. DISCLAIMERS</h3>
      <p className="font-bold text-xs">
        THE PLATFORM IS PROVIDED &quot;AS-IS&quot; WITHOUT WARRANTIES OF ANY KIND.
      </p>
      <p className="text-xs mt-1.5">
        SoniQute does not warrant that the Platform will be uninterrupted, error-free, or free of harmful
        components. Features and availability may change at any time. Use the Platform at your own risk.
      </p>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">12. LIMITATION OF LIABILITY</h3>
      <p className="text-xs">
        TO THE MAXIMUM EXTENT PERMITTED BY LAW, SoniQute IS NOT LIABLE for any indirect, incidental,
        special, or consequential damages arising from your use of the Platform, including any loss related
        to digital assets, collectibles, or third-party services. Our total liability is capped at $100 USD.
      </p>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">13. CHANGES TO TERMS</h3>
      <p className="text-xs">
        SoniQute reserves the right to update these Terms at any time. Continued use of the Platform after
        changes are posted constitutes acceptance of the revised Terms.
      </p>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">14. CONTACT</h3>
      <p className="text-xs">
        Questions? Email{" "}
        <a href="mailto:legal@soniqute.com" className="underline text-cyan-300 hover:text-cyan-100">
          legal@soniqute.com
        </a>
      </p>
    </section>
  </div>
);

/* ---------- Privacy Content (Comprehensive) ---------- */
const PrivacyContent = () => (
  <div className="space-y-5">
    <p className="text-white/75 italic text-xs">
      <strong>Last Updated:</strong> December 31, 2025
    </p>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">1. INTRODUCTION</h3>
      <p className="text-xs">
        SoniQute respects your privacy. This Privacy Policy explains how we collect, use, and protect your information.
      </p>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">2. INFORMATION WE COLLECT</h3>
      <p className="text-xs"><strong>Wallet Address (Required):</strong> Your blockchain wallet address is public data used to 
      verify token holdings.</p>
      <p className="text-xs mt-1.5"><strong>Email (Optional):</strong> Only if you opt-in for notifications. Can be unsubscribed anytime.</p>
      <p className="text-xs mt-1.5"><strong>Usage Data:</strong> Anonymous analytics (pages visited, features used, device type).</p>
      <p className="text-xs mt-1.5"><strong>Blockchain Data:</strong> All token transactions are permanently public on Base blockchain.</p>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">3. HOW WE USE YOUR INFORMATION</h3>
      <p className="text-xs">We use information to:</p>
      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-xs">
        <li>Provide Platform services</li>
        <li>Verify token holdings and grant content access</li>
        <li>Send notifications (if opted-in)</li>
        <li>Improve Platform performance</li>
        <li>Detect and prevent fraud</li>
      </ul>
      <p className="text-xs mt-1.5 font-bold">We DO NOT sell your data to third parties.</p>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">4. THIRD-PARTY SERVICES</h3>
      <p className="text-xs">We share limited data with:</p>
      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-xs">
        <li><strong>Blockchain Infrastructure:</strong> Alchemy, Infura (to connect to Base)</li>
        <li><strong>Analytics:</strong> Google Analytics (anonymized usage data)</li>
        <li><strong>Hosting:</strong> Google Cloud Platform, Cloudflare</li>
      </ul>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">5. DATA SECURITY</h3>
      <p className="text-xs">We implement reasonable security measures including HTTPS encryption and secure servers.</p>
      <p className="text-xs mt-1.5 font-bold text-orange-300">
        However, no system is 100% secure. Blockchain data is public and permanent.
      </p>
      <p className="text-xs mt-1.5">We are NOT liable for wallet hacks, phishing attacks, or user error.</p>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">6. YOUR RIGHTS (GDPR/CCPA)</h3>
      <p className="text-xs">You have the right to:</p>
      <ul className="list-disc pl-4 mt-1 space-y-0.5 text-xs">
        <li>Access your data</li>
        <li>Request deletion (except blockchain records)</li>
        <li>Opt out of analytics</li>
        <li>Unsubscribe from emails</li>
      </ul>
      <p className="text-xs mt-1.5">
        <strong>Note:</strong> Blockchain data cannot be deleted.
      </p>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">7. COOKIES</h3>
      <p className="text-xs">We use essential cookies for Platform functionality and optional analytics cookies.</p>
      <p className="text-xs mt-1.5">We do NOT use advertising or tracking cookies.</p>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">8. CHILDREN&apos;S PRIVACY</h3>
      <p className="text-xs">
        The Platform is NOT for users under 18. We do not knowingly collect data from children.
      </p>
    </section>

    <section>
      <h3 className="text-base font-bold text-orange-400 mb-2">9. BLOCKCHAIN PRIVACY LIMITATIONS</h3>
      <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3 my-2">
        <p className="font-bold text-orange-300 text-xs mb-1">IMPORTANT: Blockchain transactions are PUBLIC and PERMANENT.</p>
        <p className="text-xs">This means:</p>
        <ul className="list-disc pl-4 mt-1 space-y-0.5 text-xs">
          <li>Anyone can see your wallet address</li>
          <li>Anyone can see your token balances</li>
          <li>Anyone can see your transaction history</li>
          <li>This data can NEVER be deleted or modified</li>
        </ul>
      </div>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">10. CONTACT</h3>
      <p className="text-xs">
        Privacy questions? Email{" "}
        <a href="mailto:privacy@soniqute.com" className="underline text-cyan-300 hover:text-cyan-100">
          privacy@soniqute.com
        </a>
      </p>
    </section>

    <section>
      <h3 className="text-base font-bold text-cyan-300 mb-2">11. YOUR CONSENT</h3>
      <p className="text-xs">
        By using the Platform, you consent to this Privacy Policy.
      </p>
    </section>
  </div>
);