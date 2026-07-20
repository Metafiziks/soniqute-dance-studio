"use client";

import Image from "next/image";

// Define the evolution stages with more vibrant colors
const evolutionStages = [
  {
    stage: 1,
    name: "QUTIE Peezy",
    tagline: "Small body. Big chaos energy.",
    emoji: "🍼",
    image: "https://ipfs.io/ipfs/bafybeiafm4uodl4yvvmmfbtgx4r4ngzwekgbme6jitmap2wrdtspdgn7oi/images/peezy.png",
    description: "The newborn form of every QUTIE PaMs - a wide-eyed bundle of underwater mischief. Peezies love Sushi Burgers, can't stand pineapple, and are convinced the world revolves around them.",
    color: "from-pink-300/30 via-rose-300/30 to-purple-300/30",
    borderColor: "border-pink-300/60",
    glowColor: "rgba(249,168,212,0.6)",
    accentGradient: "from-pink-400 to-purple-400"
  },
  {
    stage: 2,
    name: "QUTIE Patootie",
    tagline: "Dancing before she can walk.",
    emoji: "🐠",
    image: "https://ipfs.io/ipfs/bafybeiafm4uodl4yvvmmfbtgx4r4ngzwekgbme6jitmap2wrdtspdgn7oi/images/patootie.png",
    description: "The chaotic tween era. Patooties sneak into parties, remix forbidden beats, and perform underwater dance moves that are strictly banned by the Legendary PaMs Council.",
    color: "from-cyan-300/30 via-sky-300/30 to-blue-300/30",
    borderColor: "border-cyan-300/60",
    glowColor: "rgba(103,232,249,0.6)",
    accentGradient: "from-cyan-400 to-blue-400"
  },
  {
    stage: 3,
    name: "QUTIE Beluga",
    tagline: "Fully grown. Fully powered. Fully PaMs.",
    emoji: "🐳",
    image: "https://ipfs.io/ipfs/bafybeiafm4uodl4yvvmmfbtgx4r4ngzwekgbme6jitmap2wrdtspdgn7oi/images/beluga.png",
    description: "A radiant, fully-realized PaMs. Belugas lead factions, star in music videos, and attract wilder quests from the depths of Pamlovia.",
    color: "from-purple-300/30 via-violet-300/30 to-indigo-300/30",
    borderColor: "border-purple-300/60",
    glowColor: "rgba(196,181,253,0.6)",
    accentGradient: "from-purple-400 to-indigo-400"
  }
];

export default function Pamolution() {
  return (
    <section className="relative py-8">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        {/* Main Card with lighter, more vibrant background */}
        <div className="rounded-[28px] bg-gradient-to-br from-white/10 via-purple-100/10 to-cyan-100/10 backdrop-blur-xl border border-white/30 shadow-[0_24px_70px_rgba(147,197,253,0.3)] p-8 md:p-10">
          {/* Pamolution Header with gradient text */}
          <h3 className="text-2xl font-bold text-center mb-6 bg-gradient-to-r from-purple-400 via-pink-400 to-cyan-400 bg-clip-text text-transparent">
            🌱 Pamolution (Evolution Mechanic)
          </h3>
          
          {/* Main Description - Centered and narrower */}
          <div className="max-w-4xl mx-auto text-center mb-8">
            <p className="text-white mb-4 text-lg leading-relaxed font-medium">
              Where every QUTIE begins as a tiny spark of chaos and grows into a full-powered PaMs.
            </p>
            <p className="text-white/90 text-base leading-relaxed mb-8">
              In Pamlovia, growth isn't linear - it's legendary. Every holder begins their journey with a baby PaMs called a QUTIE Peezy. 
              Through quests, activity, and seasonal progression, she evolves into a QUTIE Patootie, then QUTIE Beluga, 
              and finally ascends into her true form: a fully grown QUTIE PaMs.
            </p>
          </div>

          {/* Divider with gradient */}
          <div className="w-full h-px bg-gradient-to-r from-transparent via-white/40 to-transparent mb-8"></div>

          {/* Evolution Stages Title */}
          <h3 className="text-xl font-bold text-white mb-6 text-center">
            The Three Stages of Growth
          </h3>

          {/* Evolution Stages - Horizontal Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {evolutionStages.map((evolution) => (
              <div
                key={evolution.stage}
                className={`relative rounded-2xl bg-gradient-to-br ${evolution.color} border-2 ${evolution.borderColor} backdrop-blur-lg p-4 hover:scale-105 transition-all duration-300 group`}
                style={{
                  boxShadow: `0 0 40px ${evolution.glowColor}, 0 0 80px ${evolution.glowColor}`,
                }}
              >
                {/* Stage Label at Top */}
                <div className="text-center mb-2">
                  <span className={`text-xs font-bold uppercase tracking-wider bg-gradient-to-r ${evolution.accentGradient} bg-clip-text text-transparent`}>
                    Stage {evolution.stage}
                  </span>
                </div>

                {/* Image - Larger size */}
                <div className="relative h-40 w-40 mx-auto mb-3">
                  <div className="absolute inset-0 rounded-full bg-gradient-to-r from-white/20 to-white/10 blur-xl"></div>
                  <img
                    src={evolution.image}
                    alt={evolution.name}
                    className="relative w-full h-full object-contain rounded-xl group-hover:animate-pulse"
                  />
                </div>

                {/* Name below image */}
                <h4 className="text-lg font-bold text-white text-center mb-2">
                  {evolution.emoji} {evolution.name}
                </h4>

                {/* Tagline */}
                <p className="text-xs text-white/90 text-center italic mb-3">
                  "{evolution.tagline}"
                </p>

                {/* Description */}
                <p className="text-xs text-white/80 text-center leading-relaxed">
                  {evolution.description}
                </p>
              </div>
            ))}
          </div>

          {/* Evolution Path Indicator with shimmer effect */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center justify-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-pink-200/20 via-purple-200/20 to-cyan-200/20 border border-white/30 backdrop-blur-sm">
              <span className="text-2xl animate-bounce" title="Peezy">🍼</span>
              <span className="text-white/60">→</span>
              <span className="text-2xl animate-bounce animation-delay-100" title="Patootie">🐠</span>
              <span className="text-white/60">→</span>
              <span className="text-2xl animate-bounce animation-delay-200" title="Beluga">🐳</span>
              <span className="text-white/60">→</span>
              <span className="text-3xl animate-pulse" title="Fully Grown PaMs">✨</span>
            </div>
            <p className="text-xs text-white/80 mt-3 font-medium">
              The journey from chaos to legendary
            </p>
          </div>
        </div>

        {/* Helpful Guide Card */}
        <div className="mt-8 rounded-2xl bg-gradient-to-r from-pink-200/20 via-purple-200/20 to-cyan-200/20 border border-purple-300/40 backdrop-blur-sm p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-white/80">
            <div>
              <span className="text-pink-300 font-semibold">1. Mint Your Zome:</span>
              <p className="mt-1">Start with a QUTIE Zome NFT to unlock evolution paths based on your tier.</p>
            </div>
            <div>
              <span className="text-purple-300 font-semibold">2. Evolve Your PaMs:</span>
              <p className="mt-1">Mint Peezy → Patootie → Beluga based on your tier's allowance.</p>
            </div>
            <div>
              <span className="text-cyan-300 font-semibold">3. Join Your Faction:</span>
              <p className="mt-1">Claim Discord roles and participate in faction activities with your evolved PaMs.</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}