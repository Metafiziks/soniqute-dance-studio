"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import PaMsPromo from "@/components/PaMsPromo";

// ─── Vimeo ────────────────────────────────────────────────────────────────────
function Vimeo({ id, title, autoplay = false }: { id: string; title: string; autoplay?: boolean }) {
  return (
    <div className="relative w-full rounded-2xl overflow-hidden ring-1 ring-white/25 shadow-[0_20px_60px_rgba(0,0,0,.35)]">
      <div className="pt-[56.25%]" />
      <iframe
        className="absolute inset-0 w-full h-full"
        src={`https://player.vimeo.com/video/${id}?badge=0&autopause=0&player_id=0&app_id=58479&autoplay=1&muted=1&loop=1&background=1`}
        allow="autoplay; fullscreen; picture-in-picture"
        title={title}
      />
    </div>
  );
}

// ─── GlowOrb ──────────────────────────────────────────────────────────────────
type OrbTone = "pink" | "sky" | "teal" | "amber" | "violet";

const orbAuras: Record<OrbTone, string> = {
  pink:   "from-fuchsia-500/85 via-pink-400/70 to-rose-500/85",
  sky:    "from-cyan-400/85 via-sky-400/70 to-teal-400/85",
  teal:   "from-emerald-400/85 via-teal-400/70 to-cyan-400/85",
  amber:  "from-amber-400/85 via-orange-400/70 to-yellow-400/85",
  violet: "from-violet-500/85 via-fuchsia-400/70 to-indigo-500/85",
};

const toneGradient: Record<OrbTone, string> = {
  pink:   "from-fuchsia-500/90 via-pink-500/90 to-rose-500/90",
  sky:    "from-sky-500/90 via-cyan-500/90 to-teal-500/90",
  teal:   "from-emerald-500/90 via-teal-500/90 to-cyan-500/90",
  amber:  "from-amber-500/90 via-orange-500/90 to-yellow-500/90",
  violet: "from-violet-500/90 via-fuchsia-500/90 to-indigo-500/90",
};

function GlowOrb({ src, alt, size, tone = "sky" }: {
  src: string; alt: string; size: string; tone?: OrbTone;
}) {
  return (
    <div className="relative select-none" style={{ width: size, height: size }}>
      <span
        aria-hidden
        className={[
          "pointer-events-none absolute -inset-6 rounded-full",
          "bg-gradient-to-tr", orbAuras[tone],
          "blur-3xl opacity-95",
        ].join(" ")}
      />
      <div className="relative h-full w-full rounded-full overflow-hidden ring-1 ring-white/15 bg-slate-950/70 shadow-[0_20px_60px_rgba(0,0,0,.5)]">
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </div>
    </div>
  );
}

// ─── Orbit (bottom strip) ─────────────────────────────────────────────────────
function Orbit({
  logoSrc, logoAlt, logoTone, orbitImages, orbitTones,
}: {
  logoSrc: string; logoAlt: string; logoTone: OrbTone;
  orbitImages: string[]; orbitTones: OrbTone[];
}) {
  const left  = orbitImages.slice(0, 3);
  const right = orbitImages.slice(3, 6);
  const SIZE  = "clamp(80px, 9vw, 140px)";

  const Card = ({ src, alt, tone, delay }: { src: string; alt: string; tone: OrbTone; delay: number }) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22, delay }}
      className="relative flex-shrink-0 group cursor-pointer"
      style={{ width: SIZE, height: SIZE }}
    >
      <span aria-hidden className={["pointer-events-none absolute -inset-4 rounded-full blur-2xl opacity-0 group-hover:opacity-80 transition-opacity duration-300 bg-gradient-to-tr", orbAuras[tone]].join(" ")} />
      <div className="relative h-full w-full rounded-full overflow-hidden ring-1 ring-white/15 bg-slate-950/70 shadow-[0_8px_32px_rgba(0,0,0,.5)] transition-all duration-300 group-hover:scale-110 group-hover:ring-white/50">
        <img src={src} alt={alt} className="h-full w-full object-cover" />
      </div>
    </motion.div>
  );

  return (
    <div className="flex items-center justify-center gap-6 md:gap-8 px-6 py-4 w-full backdrop-blur-sm bg-black/25 border-t border-white/10">
      {left.map((src, i) => (
        <Card key={`l${i}`} src={src} alt={`NFT ${i+1}`} tone={orbitTones[i % orbitTones.length]} delay={0.05 * (2 - i)} />
      ))}

      {/* Logo — same size, brighter ring to distinguish */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.08 }}
        className="relative flex-shrink-0 group cursor-pointer"
        style={{ width: SIZE, height: SIZE }}
      >
        <span aria-hidden className={["pointer-events-none absolute -inset-4 rounded-full blur-2xl opacity-40 group-hover:opacity-90 transition-opacity duration-300 bg-gradient-to-tr", orbAuras[logoTone]].join(" ")} />
        <div className="relative h-full w-full rounded-full overflow-hidden ring-2 ring-white/40 bg-slate-950/70 shadow-[0_8px_32px_rgba(0,0,0,.5)] transition-all duration-300 group-hover:scale-110 group-hover:ring-white/80">
          <img src={logoSrc} alt={logoAlt} className="h-full w-full object-cover" />
        </div>
      </motion.div>

      {right.map((src, i) => (
        <Card key={`r${i}`} src={src} alt={`NFT ${i+4}`} tone={orbitTones[(i+3) % orbitTones.length]} delay={0.05 * i} />
      ))}
    </div>
  );
}

// ─── Universe toggle ──────────────────────────────────────────────────────────
type Universe = "pams" | "qutie";

function UniverseToggle({
  active,
  onChange,
}: {
  active: Universe;
  onChange: (u: Universe) => void;
}) {
  return (
    <div
      className="absolute top-6 left-1/2 -translate-x-1/2 z-30"
    >
      <div className="relative flex items-center gap-0.5 p-1 rounded-full bg-black/55 backdrop-blur-xl ring-1 ring-white/20 shadow-[0_8px_32px_rgba(0,0,0,.55)]">
        {(["pams", "qutie"] as Universe[]).map((u) => {
          const isActive = active === u;
          const label    = u === "pams" ? "PaMs" : "QUTIE PaMs";
          return (
            <button
              key={u}
              onClick={() => onChange(u)}
              className={`relative px-5 py-2 rounded-full text-xs font-bold uppercase tracking-[0.18em] transition-colors duration-200 ${
                isActive ? "text-white" : "text-white/40 hover:text-white/65"
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="universe-pill"
                  className={`absolute inset-0 rounded-full ring-1 ${
                    u === "pams"
                      ? "bg-gradient-to-r from-blue-600/75 via-indigo-500/75 to-blue-400/75 ring-blue-300/50"
                      : "bg-gradient-to-r from-cyan-600/75 via-sky-500/75 to-teal-500/75 ring-cyan-300/50"
                  }`}
                  transition={{ type: "spring", stiffness: 480, damping: 34 }}
                />
              )}
              <span className="relative z-10">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Shared data ──────────────────────────────────────────────────────────────
const cities = [
  {
    name: "🥢 Serengana",
    subtitle: "Keepers of the Edamame Fries",
    img: "/images/serengana.png",
    tone: "pink" as OrbTone,
    content: "Serengana is a garden-city where Edamame Fries grow in the wild like crunchy reeds by the riverbanks. The Serenganians believe balance is found in salt, soy, and memes. Their music is crisp, clean, and always dipped in Katsu sauce. When the Snack Wars broke out, Serengana declared neutrality… then immediately FOMO'd into three other factions at once.",
  },
  {
    name: "🥤 Tashinogo",
    subtitle: "The Pineapple Soda Syndicate",
    img: "/images/tashinogo.png",
    tone: "sky" as OrbTone,
    content: "Neon signs buzz, bottles fizz, and every street corner pops in Tashinogo, the city powered by endless streams of Pineapple Soda. Their beats sparkle like carbonation, and their people say: \"If it doesn't bubble, it doesn't matter.\" During the Snack Bubble, Tashinogo was accused of pumping liquidity into soda futures… they say it was \"just a refresh.\"",
  },
  {
    name: "🌊 Parsippius",
    subtitle: "Hoards of the Nori Chips",
    img: "/images/pars.png",
    tone: "teal" as OrbTone,
    content: "Built into jagged sea cliffs, Parsippius is the fortress city of discipline and crunch. Their songs are sharp as seaweed flakes and their memes cut like salted paper. Parsippians hoard Nori Chips in vaults, treating each one like a governance token. They say the walls of Parsippius echo with the phrase: \"Stake your chips, or get swept by the tide.\"",
  },
  {
    name: "🌋 Apollora",
    subtitle: "The Pop Rock Prophets",
    img: "/images/apollora.png",
    tone: "amber" as OrbTone,
    content: "Every step in Apollora is a crackle, every beat an eruption. The volcanic city thrives on chaos, powered by Pop Rocks mined directly from the lava pits. Apollorans believe virality is a chain reaction — just light the fuse and watch it explode. Their anthem? \"Snap. Crackle. Pump.\" Some say they caused the Snackageddon with one Pop Rock too many.",
  },
  {
    name: "🍜 Bokonagwe",
    subtitle: "The Bubble Tape Nomads",
    img: "/images/bokonagwe.png",
    tone: "violet" as OrbTone,
    content: "Out in the desert sands lies Bokonagwe, a city where music stretches on forever... like Bubble Tape unspooling to infinity. Their culture is sticky, looping, and endlessly sweet. They remix until the remixes remix themselves, creating sonic tapestries as long as a camel caravan. Bokonagwe's motto: \"Why stop at one verse when you can chew for six feet?\"",
  },
];

const qutieLore = [
  {
    title: "Katsu-Powered Chaos",
    vimeoId: "1116348742",
    content: "QUTIE PaMs are pre-adolescent PaMs who refuse to grow up—and honestly, can you blame them? With their total addiction to Sushi Burgers, a strict avoidance of pineapple fruit, and a penchant for hijinks, they've locked themselves in a perpetual sugar-fueled, Katsu-drenched state of childlike chaos.\n\nTheir parents say, \"Eat your pineapple so you can grow!\" They say, \"Ew.\" Instead, they double down on edamame fries, slurp pineapple soda (but only when it's fizzy enough to make you burp fire), and practice dance moves they're technically too young to use at official PaMs parties.",
  },
  {
    title: "Merfolk to Party People",
    vimeoId: "1116391318",
    content: "PaMs are a mysterious race of mermaids who evolved into human form, retaining their amphibious characteristics. Their natural home is deep beneath the ocean, in a glittering underwater city called Pamlovia — a magical realm of light shows, music, and perpetual underwater block parties.\n\nThe older PaMs are sophisticated. They vibe. They drop tracks. They throw elaborate celebrations powered by giant conch speakers and zero-gravity dance bubbles. QUTIE PaMs? They're... working on it.",
  },
  {
    title: "I LOVE Sushi Burgers!",
    vimeoId: "1116476615",
    content: "\"Hi! My name is Qutie PaM and I LOVE eating Sushi Burgers! My parents always say that pineapples will help me grow big and strong... but bleh. Gross. I like my food wrapped in seaweed and fried in dreams, thanks.\"\n\n\"I wanna dance just like the older PaMs, but they never let me into the party. So my friends and I practice in secret. One time, we snuck into a party and borrowed (okay, stole) one of their fancy celebration hookahs... We took a puff of the purple pineapple smoke and BAM — new world unlocked.\"",
  },
  {
    title: "Parallel Worlds",
    vimeoId: "1116476088",
    content: "In a parallel world, the QUTIE PaMs met a fresh crew — stylish, sneaker-rocking boys who called themselves QUTIE Chums. They wore color-popped fits and tees stamped \"QUTIE Chums\" like a secret club.\n\nWhen QUTIE PaMs asked for Sushi Burgers, the Chums offered Sea Grapes instead — tiny, crunchy, pop-in-your-mouth snacks. The moment the PaMs took a bite... SWOOSH! They were catapulted back to Pamlovia. Nobody believed them, but they knew.",
  },
  {
    title: "Chaos Over Conformity",
    vimeoId: "1116479324",
    content: "The QUTIE PaMs are on a mission to find their QUTIE Chums again — and maybe a few more Sea Grapes. They sneak into parties, dance in secret tunnels, and refuse to grow up. Because in their world, being \"too much\" is exactly the point.\n\nJoin the chaos. Collect your QUTIE PaMs. Battle for SONIQ. Stay weird.",
  },
];

const pamsLore = [
  {
    title: "Born Beneath the Waves",
    vimeoId: "856465601",
    content: "PaMs are an ancient race of merfolk who long ago shed their tails and walked ashore — but never fully left the water behind. They carry the ocean in their rhythms, their rituals, and their rivalries.\n\nPamlovia, their underwater homeland, still pulses beneath the surface of every city they've built. The music they make is the sound of currents and depths — layered, powerful, and impossible to ignore.",
  },
  {
    title: "Five Cities. One Sound.",
    vimeoId: "856465601",
    content: "Pamlovia is not one city. It is five — each ruled by a different faction, each with its own snack economy, its own anthem, and its own claim to the throne of culture.\n\nThe Snack Wars began over something small: a disputed batch of Edamame Fries. They escalated into the defining conflict of the PaMs generation. Every city chose a side. Every PaM picked a faction. The music was never the same again.",
  },
  {
    title: "The Older PaMs",
    vimeoId: "856465601",
    content: "The original PaMs are sophisticated, worldly, and dangerously good at throwing parties. Where QUTIE PaMs run on chaos and Katsu sauce, the older PaMs operate with intention.\n\nThey built the conch speaker systems. They designed the zero-gravity dance bubbles. They wrote the anthems that the QUTIE generation would eventually steal, remix, and claim as their own. They don't mind. Much.",
  },
];

// ─── Right panel — edge tabs + slide-in drawer ───────────────────────────────
function RightPanel({
  universe, panelExpanded, setPanelExpanded, activeTab, setActiveTab,
  currentLore, setCurrentLore, currentCity, setCurrentCity,
}: {
  universe: Universe; panelExpanded: boolean; setPanelExpanded: (v: boolean) => void;
  activeTab: "cities" | "lore"; setActiveTab: (v: "cities" | "lore") => void;
  currentLore: number; setCurrentLore: (v: number) => void;
  currentCity: number; setCurrentCity: (v: number) => void;
}) {
  const loreContent     = universe === "pams" ? pamsLore    : qutieLore;
  const currentCityData = cities[currentCity];
  const isPams          = universe === "pams";

  const accentGlow = isPams
    ? "from-blue-900/95 via-indigo-900/95 to-blue-950/95"
    : "from-teal-900/95 via-cyan-900/95 to-blue-900/95";
  const accentRing = isPams ? "ring-blue-400/30" : "ring-cyan-400/30";
  const pillActive = isPams
    ? "bg-blue-400/30 ring-1 ring-blue-300/60 text-white"
    : "bg-cyan-400/30 ring-1 ring-cyan-300/60 text-white";

  const openTab = (tab: "cities" | "lore") => {
    if (panelExpanded && activeTab === tab) { setPanelExpanded(false); }
    else { setActiveTab(tab); setPanelExpanded(true); }
  };

  return (
    <>
      {/* ── Floating edge tabs — visible when drawer is closed ── */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-3">
        {(["cities", "lore"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => openTab(tab)}
            className={[
              "flex flex-col items-center gap-1.5 px-2 py-3 rounded-l-2xl backdrop-blur-xl",
              "border-l border-t border-b transition-all duration-200",
              "shadow-[-4px_4px_20px_rgba(0,0,0,0.45)]",
              panelExpanded && activeTab === tab
                ? "bg-white/20 border-white/30 text-white"
                : "bg-black/50 border-white/12 text-white/65 hover:bg-black/70 hover:text-white",
            ].join(" ")}
          >
            <span className="text-base leading-none">{tab === "cities" ? "🏙️" : "📖"}</span>
            <span
              className="text-[9px] font-bold uppercase tracking-widest"
              style={{ writingMode: "vertical-rl", transform: "rotate(180deg)" }}
            >
              {tab === "cities" ? "Cities" : "Lore"}
            </span>
          </button>
        ))}
      </div>

      {/* ── Slide-in drawer ── */}
      <AnimatePresence>
        {panelExpanded && (
          <motion.div
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 340, damping: 34 }}
            className={[
              "fixed right-0 top-0 h-full w-80 z-20 flex flex-col",
              "bg-gradient-to-b", accentGlow,
              "backdrop-blur-2xl ring-1", accentRing,
              "shadow-[-20px_0_60px_rgba(0,0,0,0.55)]",
            ].join(" ")}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-white/10 flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-2xl">{activeTab === "cities" ? "🏙️" : "📖"}</span>
                <span className="font-bold text-white text-base">
                  {activeTab === "cities" ? "Pamlovian Cities" : isPams ? "PaMs Lore" : "QUTIE PaMs Lore"}
                </span>
              </div>
              <button onClick={() => setPanelExpanded(false)} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tab pills */}
            <div className="flex gap-2 px-5 pt-3 pb-2 flex-shrink-0">
              {(["cities", "lore"] as const).map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={["flex-1 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-200",
                    activeTab === tab ? pillActive : "bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80",
                  ].join(" ")}
                >
                  {tab === "cities" ? "🏙️ Cities" : "📖 Lore"}
                </button>
              ))}
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto">
              <AnimatePresence mode="wait">

                {activeTab === "cities" && (
                  <motion.div key="cities" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="p-5 space-y-4">
                    <div className="flex justify-center">
                      <div className="relative w-28 h-28">
                        <div className={["pointer-events-none absolute -inset-3 rounded-full blur-2xl",
                          currentCityData.tone === "pink" ? "bg-pink-300/40" : currentCityData.tone === "sky" ? "bg-cyan-300/40" :
                          currentCityData.tone === "teal" ? "bg-emerald-300/40" : currentCityData.tone === "amber" ? "bg-amber-300/45" : "bg-fuchsia-300/45",
                        ].join(" ")} />
                        <div className="relative w-28 h-28 rounded-full overflow-hidden ring-4 ring-white/65 bg-white/10 backdrop-blur shadow-[0_12px_36px_rgba(0,0,0,.46)]">
                          <GlowOrb src={currentCityData.img} alt={currentCityData.name} size="7rem" tone={currentCityData.tone} />
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-white mb-1">{currentCityData.name}</h3>
                      <p className="text-sm text-white/70">{currentCityData.subtitle}</p>
                    </div>
                    <div className="flex items-center justify-between">
                      <button onClick={() => setCurrentCity(p => p === 0 ? cities.length - 1 : p - 1)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"><ChevronLeft className="w-5 h-5 text-white" /></button>
                      <span className="text-white/70 text-sm font-medium">{currentCity + 1} / {cities.length}</span>
                      <button onClick={() => setCurrentCity(p => p === cities.length - 1 ? 0 : p + 1)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"><ChevronRight className="w-5 h-5 text-white" /></button>
                    </div>
                    <div className={`bg-gradient-to-br ${toneGradient[currentCityData.tone]} rounded-xl p-4 ring-1 ring-white/20`}>
                      <p className="text-white text-sm leading-relaxed">{currentCityData.content}</p>
                    </div>
                  </motion.div>
                )}

                {activeTab === "lore" && (
                  <motion.div key="lore" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.2 }} className="p-5 space-y-4">
                    <h3 className="text-xl font-bold text-white text-center">{loreContent[currentLore].title}</h3>
                    <Vimeo id={loreContent[currentLore].vimeoId} title={loreContent[currentLore].title} />
                    <div className="flex items-center justify-between">
                      <button onClick={() => setCurrentLore(p => p === 0 ? loreContent.length - 1 : p - 1)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"><ChevronLeft className="w-5 h-5 text-white" /></button>
                      <span className="text-white/70 text-sm font-medium">{currentLore + 1} / {loreContent.length}</span>
                      <button onClick={() => setCurrentLore(p => p === loreContent.length - 1 ? 0 : p + 1)} className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"><ChevronRight className="w-5 h-5 text-white" /></button>
                    </div>
                    <div className="bg-white/10 rounded-xl p-4 ring-1 ring-white/10">
                      <p className="text-white/90 text-sm leading-relaxed whitespace-pre-line">{loreContent[currentLore].content}</p>
                    </div>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}


// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PaMsPage() {
  const [universe, setUniverse]           = useState<Universe>("pams");
  const [panelExpanded, setPanelExpanded] = useState(false);
  const [activeTab, setActiveTab]         = useState<"cities" | "lore">("cities");
  const [currentLore, setCurrentLore]     = useState(0);
  const [currentCity, setCurrentCity]     = useState(0);

  const isPams = universe === "pams";

  // Reset lore index when switching so it never overflows
  const handleUniverseChange = (u: Universe) => {
    setUniverse(u);
    setCurrentLore(0);
  };

  // QUTIE PaMs orbit assets (for bottom strip)
  const qutieImages: string[] = [
    "/images/QP-I.jpg",
    "/images/QP-II.jpg",
    "/images/QP-III.jpg",
    "/images/QP-IV.jpg",
    "/images/QP-V.jpg",
    "/images/QP-VI.jpg",
  ];
  const orbitTones: OrbTone[] = ["pink", "sky", "teal", "amber", "violet", "sky"];

  return (
    <div className="min-h-screen relative">

      {/* ── Background — crossfades between universes ── */}
      <AnimatePresence mode="sync">
        <motion.div
          key={`bg-${universe}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.55, ease: "easeInOut" }}
          style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 0, pointerEvents: "none" }}
        >
          <video
            key={isPams ? "pams-bg" : "qutie-bg"}
            src={isPams
              ? `${process.env.NEXT_PUBLIC_GCS_BASE_URL}/soniqute/marketing/pamlovia.mp4`
              : `${process.env.NEXT_PUBLIC_GCS_BASE_URL}/soniqute/marketing/qutie-pam.mp4`
            }
            autoPlay
            muted
            loop
            playsInline
            style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", objectFit: "cover" }}
          />
        </motion.div>
      </AnimatePresence>

      {/* ── Universe toggle (top-center) ── */}
      <UniverseToggle active={universe} onChange={handleUniverseChange} />

      {/* ── PaMs collectible cards promo overlay ── */}
      <AnimatePresence>
        {isPams && (
          <motion.div
            key="pams-promo"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            className="absolute inset-0 z-10"
          >
            <PaMsPromo />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── QUTIE PaMs bottom strip — pinned to bottom, shown only for QUTIE universe ── */}
      <AnimatePresence>
        {!isPams && (
          <motion.div
            key="orbit-qutie"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute bottom-0 left-0 right-0 z-10"
          >
            <Orbit
              logoSrc="/images/logo-cutie-pams.webp"
              logoAlt="QUTIE PaMs"
              logoTone="sky"
              orbitImages={qutieImages}
              orbitTones={orbitTones}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Right panel — slides between universes ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`panel-${universe}`}
          initial={{ x: 40,  opacity: 0 }}
          animate={{ x: 0,   opacity: 1 }}
          exit={{    x: 40,  opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30, delay: 0.07 }}
          className="contents"
        >
          <RightPanel
            universe={universe}
            panelExpanded={panelExpanded}
            setPanelExpanded={setPanelExpanded}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            currentLore={currentLore}
            setCurrentLore={setCurrentLore}
            currentCity={currentCity}
            setCurrentCity={setCurrentCity}
          />
        </motion.div>
      </AnimatePresence>

    </div>
  );
}
