"use client";

import Image from "next/image";

// Define the tier data with vibrant pastel colors
const zomeTiers = [
  {
    tier: 1,
    name: "Zooma",
    image: "https://ipfs.io/ipfs/bafybeiafm4uodl4yvvmmfbtgx4r4ngzwekgbme6jitmap2wrdtspdgn7oi/images/zooma.png",
    description: "Entry-level home for new residents. Mint 1 of each evolution NFT to qualify for 1 QUTIE PaMs NFT mint. Basic faction access.",
    color: "from-sky-300/30 via-cyan-300/30 to-blue-300/30",
    borderColor: "border-cyan-300/60",
    glowColor: "rgba(125,211,252,0.6)",
    accentGradient: "from-cyan-400 to-blue-400"
  },
  {
    tier: 2,
    name: "Zooka",
    image: "https://ipfs.io/ipfs/bafybeiafm4uodl4yvvmmfbtgx4r4ngzwekgbme6jitmap2wrdtspdgn7oi/images/zooka.png",
    description: "Upgraded dwelling with ocean views. Mint 2 of each evolution NFT to qualify for 2 QUTIE PaMs NFT mints. Enhanced faction perks.",
    color: "from-emerald-300/30 via-green-300/30 to-teal-300/30",
    borderColor: "border-emerald-300/60",
    glowColor: "rgba(110,231,183,0.6)",
    accentGradient: "from-emerald-400 to-teal-400"
  },
  {
    tier: 3,
    name: "Zuper",
    image: "https://ipfs.io/ipfs/bafybeiafm4uodl4yvvmmfbtgx4r4ngzwekgbme6jitmap2wrdtspdgn7oi/images/zuper.png",
    description: "Premium coral penthouse suite. Mint 3 of each evolution NFT to qualify for 3 QUTIE PaMs NFT mints. Priority faction benefits.",
    color: "from-purple-300/30 via-pink-300/30 to-rose-300/30",
    borderColor: "border-purple-300/60",
    glowColor: "rgba(216,180,254,0.6)",
    accentGradient: "from-purple-400 to-pink-400"
  },
  {
    tier: 4,
    name: "Zulie",
    image: "https://ipfs.io/ipfs/bafybeiafm4uodl4yvvmmfbtgx4r4ngzwekgbme6jitmap2wrdtspdgn7oi/images/zulie.png",
    description: "Exclusive deep-sea sanctuary. Receive 1 airdropped QUTIE PaMs NFT. Elite faction status.",
    color: "from-orange-300/30 via-amber-300/30 to-yellow-300/30",
    borderColor: "border-orange-300/60",
    glowColor: "rgba(253,186,116,0.6)",
    accentGradient: "from-orange-400 to-amber-400"
  },
  {
    tier: 5,
    name: "Zeepy",
    image: "https://ipfs.io/ipfs/bafybeiafm4uodl4yvvmmfbtgx4r4ngzwekgbme6jitmap2wrdtspdgn7oi/images/zeepy.png",
    description: "Legendary palace in the abyss. Receive 2 airdropped QUTIE PaMs NFTs. Founding faction member.",
    color: "from-yellow-300/30 via-lime-300/30 to-emerald-300/30",
    borderColor: "border-yellow-300/60",
    glowColor: "rgba(253,224,71,0.6)",
    accentGradient: "from-yellow-400 to-lime-400"
  }
];

export default function QutieDetails() {
  return (
    <section className="relative py-8">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header - Centered */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-2 sparkle-text">
            The QUTIE Ecosystem
          </h2>
          <div className="w-32 h-1 bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400 mx-auto mb-8"></div>
        </div>

        {/* Combined Card for Zomes Description and Tiers - More vibrant */}
        <div className="rounded-[28px] bg-gradient-to-br from-white/10 via-purple-100/10 to-cyan-100/10 backdrop-blur-xl border border-white/30 shadow-[0_24px_70px_rgba(147,197,253,0.3)] p-8 md:p-10">
          {/* QUTIE Zomes Section - Centered with gradient text */}
          <h3 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            🏠 QUTIE Zomes
          </h3>
          
          {/* Narrower text width for better readability - Centered */}
          <div className="max-w-4xl mx-auto text-center mb-8">
            <p className="text-white/90 mb-4 text-lg leading-relaxed">
              QUTIE Zomes are cozy, glowing underwater homes scattered across the coral districts of Pamlovia. 
              Each Zome is a tiny slice of oceanic paradise - part studio, part sanctuary, part meme lab. 
              Inside, QUTIE PaMs create music, hatch ideas, and host endless snack parties powered by bubble beats and sea-light.
            </p>
            <p className="text-white/80 text-base italic mb-8">
              Every Zome is soulbound to its resident - your digital home in the SoniQute universe, 
              and your first step toward faction life beneath the waves.
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-white/20 mb-8"></div>

          {/* The Five Zome Tiers - Centered Title */}
          <h3 className="text-xl font-bold text-white mb-6 text-center">
            The Five Zome Tiers
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {zomeTiers.map((zome) => (
              <div
                key={zome.tier}
                className={`relative rounded-2xl bg-gradient-to-br ${zome.color} border ${zome.borderColor} backdrop-blur-lg p-4 hover:scale-105 transition-all duration-300 group`}
                style={{
                  boxShadow: `0 0 30px ${zome.glowColor}`
                }}
              >
                {/* Tier Label ABOVE image */}
                <div className="text-center mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider bg-gradient-to-r ${zome.accentGradient} bg-clip-text text-transparent`}>
                    Tier {zome.tier}
                  </span>
                </div>

                {/* Zome Image with glow */}
                <div className="relative h-32 w-32 mx-auto mb-3">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/20 to-white/10 blur-xl"></div>
                  <img
                    src={zome.image}
                    alt={zome.name}
                    className="relative w-full h-full object-contain rounded-xl group-hover:animate-pulse"
                  />
                </div>

                {/* Zome Name BELOW image */}
                <h4 className="text-lg font-bold text-white text-center mb-3">
                  {zome.name}
                </h4>

                {/* Description */}
                <p className="text-xs text-white/80 text-center leading-relaxed">
                  {zome.description}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Faction Assignment Note - More vibrant */}
        <div className="mt-8 rounded-2xl bg-gradient-to-r from-indigo-200/20 via-purple-200/20 to-pink-200/20 border border-purple-300/40 backdrop-blur-sm p-6 text-center">
          <p className="text-white">
            🎲 <span className="font-semibold">Random Faction Assignment:</span> When you mint your Zome, 
            you'll be randomly assigned to one of five factions: 
            <span className="text-cyan-300 font-semibold"> Serengana</span>,
            <span className="text-green-300 font-semibold"> Tashinogo</span>,
            <span className="text-purple-300 font-semibold"> Parsippius</span>,
            <span className="text-orange-300 font-semibold"> Apollora</span>, or
            <span className="text-pink-300 font-semibold"> Bokonagwe</span>.
          </p>
        </div>
      </div>
    </section>
  );
}