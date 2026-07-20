"use client";
import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Play, Pause } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────
type Card = { src: string; name: string; rar?: string };

// ─── Data ───────────────────────────────────────────────────────────────────
const TRAITS = [
  { code: "SNQ", name: "Soniq Frequency", desc: "Measures harmonic resonance within the Pamlovian current." },
  { code: "PPL", name: "Pineapple Index", desc: "Connection to the Sacred Gardens' life force." },
  { code: "LTS", name: "Lotus Attunement", desc: "Bond with the ancient Celestial Lotus." },
  { code: "CPN", name: "Conch Pulse", desc: "Broadcast range across Pamlovian cities." },
  { code: "TDR", name: "Tide Resistance", desc: "Ability to navigate between worlds." },
  { code: "CPH", name: "Cipher Guard", desc: "Defense against Ciphon deception." },
];

const RARITIES = [
  { name: "Shoreline",  pct: "~40%", grad: "linear-gradient(90deg,#f472b6,#fb7185)" },
  { name: "Reef",       pct: "~25%", grad: "linear-gradient(90deg,#22d3ee,#38bdf8)" },
  { name: "Deep Water", pct: "~18%", grad: "linear-gradient(90deg,#2dd4bf,#34d399)" },
  { name: "Abyss",      pct: "~12%", grad: "linear-gradient(90deg,#fbbf24,#fb923c)" },
  { name: "Pamlovia",   pct: "~5%",  grad: "linear-gradient(90deg,#a78bfa,#e879f9)" },
];

const CHIPS = [
  { icon: "🐚", value: "125", label: "Unique Cards",    cls: "" },
  { icon: "🎴", value: "10",  label: "Cards Per Pack",  cls: "" },
  { icon: "🌊", value: "80%", label: "Standard",        cls: "text-cyan-300" },
  { icon: "⭐", value: "20%", label: "Limited Edition", cls: "text-yellow-300" },
];

// Cities of Pamlovia — each city's official soundtrack
type CityTrack = { city: string; emoji: string; song: string; cover: string; audio: string; tone: string };

const CITY_TRACKS: CityTrack[] = [
  { city: "Serengana",  emoji: "🥢", song: "Snootie Little Cutie", cover: "/images/snootie.png",          audio: "/audio/snootie-little-cutie.mp3", tone: "#ec4899" },
  { city: "Tashinogo",  emoji: "🥤", song: "Pamela",               cover: "/images/pamela-cover.png",     audio: "/audio/pamela.mp3",               tone: "#06b6d4" },
  { city: "Parsippius", emoji: "🌊", song: "She's a Bad Mama Jama",cover: "/images/bad-mama-jama.png",    audio: "/audio/she-a-bad-mama-jama.mp3",  tone: "#14b8a6" },
  { city: "Apollora",   emoji: "🌋", song: "Pamadeus",             cover: "/images/pamadeus-cover.webp",  audio: "/audio/pamadeus.mp3",             tone: "#f59e0b" },
  { city: "Bokonagwe",  emoji: "🍜", song: "Sunshower",            cover: "/images/sunshower.png",        audio: "/audio/sunshower.mp3",            tone: "#a855f7" },
];

// Interleaved standard + limited for the spotlight carousel
const ALL_CARDS: Card[] = [
  { src: "/images/promo/pams-0044-hires.png",       name: "Shoreline",   rar: "Standard" },
  { src: "/images/promo/pams-limited-prisma.png",   name: "Prisma",      rar: "Limited Edition" },
  { src: "/images/promo/pams-0064-hires.png",       name: "Reef",        rar: "Standard" },
  { src: "/images/promo/pams-limited-solar-bloom.png", name: "Solar Bloom", rar: "Limited Edition" },
  { src: "/images/promo/pams-0075-hires.png",       name: "Shoreline",   rar: "Standard" },
  { src: "/images/promo/pams-limited-hydria.png",   name: "Hydria",      rar: "Limited Edition" },
  { src: "/images/promo/pams-0095-hires.png",       name: "Pamlovia",    rar: "Standard" },
  { src: "/images/promo/pams-limited-moonberry.png", name: "Moonberry",  rar: "Limited Edition" },
  { src: "/images/promo/pams-0074-hires.png",       name: "Shoreline",   rar: "Standard" },
];

// ─── Scoped animation styles ─────────────────────────────────────────────────
const STYLES = `
@keyframes pr-rise   {0%{transform:translateY(0) scale(.9);opacity:0}12%{opacity:.62}86%{opacity:.5}100%{transform:translateY(-780px) scale(1.06);opacity:0}}
@keyframes pr-shim   {to{background-position:220% center}}
@keyframes pr-shine  {0%{transform:translateX(-160%) skewX(-18deg)}55%,100%{transform:translateX(340%) skewX(-18deg)}}
@keyframes pr-bob    {0%,100%{transform:translateY(0)}50%{transform:translateY(-9px)}}
@keyframes pr-fade   {0%{opacity:0;transform:translateY(7px)}100%{opacity:1;transform:none}}
@keyframes pr-sway   {0%,100%{transform:translateX(-34px)}50%{transform:translateX(34px)}}
@keyframes pr-soft   {0%,100%{box-shadow:0 0 14px rgba(168,85,247,.5)}50%{box-shadow:0 0 26px rgba(236,72,153,.8)}}
@keyframes pr-wl-breathe {0%,100%{box-shadow:inset 0 0 0 1px rgba(167,139,250,0.35),0 0 18px rgba(34,211,238,0.12),0 0 36px rgba(139,92,246,0.08)}50%{box-shadow:inset 0 0 0 1.5px rgba(34,211,238,0.55),0 0 32px rgba(34,211,238,0.28),0 0 64px rgba(139,92,246,0.18)}}
.pr-title{background:linear-gradient(100deg,#f0abfc,#a78bfa,#7dd3fc,#f0abfc);background-size:220% auto;-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent;color:transparent;filter:drop-shadow(0 0 20px rgba(167,139,250,.42));animation:pr-shim 6s linear infinite}
.pr-rays{position:absolute;inset:-30% -12% auto -12%;height:130%;pointer-events:none;opacity:.55;background:repeating-linear-gradient(101deg,transparent 0 66px,rgba(180,222,255,.06) 66px 128px);mix-blend-mode:screen;animation:pr-sway 15s ease-in-out infinite}
.pr-bub{position:absolute;bottom:-34px;border-radius:50%;background:radial-gradient(circle at 32% 28%,rgba(255,255,255,.95),rgba(150,215,255,.28) 62%,transparent);box-shadow:0 0 10px rgba(150,215,255,.5);animation:pr-rise linear infinite;opacity:0}
.pr-shine{position:absolute;top:0;left:0;width:42%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);transform:translateX(-160%) skewX(-18deg);animation:pr-shine 4.6s ease-in-out infinite;pointer-events:none}
.pr-soon{animation:pr-soft 2.6s ease-in-out infinite}
.pr-fadeup{animation:pr-fade .32s ease both}
.pr-card{position:relative;border:0;background:none;padding:0;cursor:pointer;border-radius:18px;overflow:hidden;display:block;transition:transform .13s ease-out;transform-style:preserve-3d}
.pr-glow{position:absolute;inset:-9px;border-radius:20px;background:linear-gradient(120deg,rgba(59,130,246,.45),rgba(34,211,238,.45));filter:blur(15px);opacity:.5;z-index:-1;transition:opacity .3s}
.pr-card:hover .pr-glow{opacity:1}
.pr-dot{width:8px;height:8px;border-radius:50%;border:0;background:rgba(255,255,255,.28);cursor:pointer;transition:all .25s;padding:0}
.pr-dot.on{background:linear-gradient(135deg,#a78bfa,#7dd3fc);width:24px;border-radius:999px}
.pr-pill{padding:5px 4px;border-radius:999px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.09em;background:rgba(255,255,255,.1);box-shadow:inset 0 0 0 1px rgba(255,255,255,.15);color:rgba(255,255,255,.6);cursor:pointer;transition:all .2s;border:0}
.pr-pill:hover{color:#fff;background:rgba(255,255,255,.16)}
.pr-pill.on{color:#fff;background:linear-gradient(135deg,rgba(167,139,250,.9),rgba(34,211,238,.9));box-shadow:0 0 14px rgba(167,139,250,.55),inset 0 0 0 1px rgba(255,255,255,.35)}
.pr-inp{height:42px;border-radius:12px;background:rgba(255,255,255,.14);backdrop-filter:blur(6px);box-shadow:inset 0 0 0 1px rgba(255,255,255,.3);color:#fff;padding:0 14px;font-size:14px;outline:none;border:0}
.pr-inp:focus{box-shadow:inset 0 0 0 1.5px rgba(34,211,238,.55)}
.pr-inp::placeholder{color:rgba(255,255,255,.5)}
.pr-wl-card{background:linear-gradient(90deg,rgba(30,58,138,0.65),rgba(49,46,129,0.65));animation:pr-wl-breathe 7s ease-in-out infinite}
.pr-btn-join{background:linear-gradient(135deg,#c084fc,#f472b6);box-shadow:0 0 22px rgba(192,132,252,0.55);transition:transform .15s ease,box-shadow .15s ease}
.pr-btn-join:hover:not(:disabled){box-shadow:0 0 32px rgba(192,132,252,0.75),0 0 14px rgba(244,114,182,0.45);transform:scale(1.02)}
.pr-btn-join:active:not(:disabled){transform:scale(.95)}
.pr-btn-join:disabled{opacity:.5;cursor:not-allowed}
.pr-carousel-group{transform:translateY(-10px)}
`;

// ─── Waitlist form (functional — hCaptcha + API, unchanged behaviour) ─────────
function WaitlistForm() {
  const [email, setEmail] = useState("");
  const [captchaToken, setCaptchaToken] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const hasCaptchaKey = Boolean(process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!captchaToken) {
      setMessage({ text: "Please complete the captcha.", type: "error" });
      return;
    }
    setIsLoading(true);
    setMessage(null);
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "";
      const res = await fetch(`${apiBase}/email/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, captchaToken }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      setMessage({ text: data.message || "You're on the list!", type: "success" });
      setEmail("");
      setCaptchaToken("");
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : "Failed to sign up. Please try again.", type: "error" });
    } finally {
      setIsLoading(false);
    }
  };

  if (message?.type === "success") {
    return <p className="text-sm font-semibold text-green-300">🎉 {message.text}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 w-full">
      {message && <p className="text-xs text-red-300">{message.text}</p>}
      {/* Row 1: email input + Join button */}
      <div className="flex items-center gap-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          disabled={isLoading}
          className="pr-inp flex-1 min-w-0 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isLoading || !captchaToken || !hasCaptchaKey}
          className="pr-btn-join h-[42px] px-6 min-w-[60px] rounded-xl font-black text-xs uppercase tracking-[0.15em] text-white active:scale-95 flex-shrink-0"
        >
          {isLoading ? "Joining…" : "Join"}
        </button>
      </div>
      {hasCaptchaKey ? (
        <HCaptcha
          sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
          onVerify={(token) => setCaptchaToken(token)}
          onExpire={() => setCaptchaToken("")}
          onError={() => setCaptchaToken("")}
          theme="dark"
          size="normal"
        />
      ) : (
        <p className="text-xs text-white/40">Captcha unavailable — signup disabled.</p>
      )}
    </form>
  );
}

// ─── City card — compact horizontal card matching the Rarity Tiers style ──────
function CityCard({
  city, song, cover, tone, isPlaying, canPlay, onToggle,
}: Omit<CityTrack, "audio" | "emoji"> & { isPlaying: boolean; canPlay: boolean; onToggle: () => void }) {
  return (
    <div
      className="flex-1 rounded-xl overflow-hidden flex flex-col items-center transition-all duration-200"
      style={{
        background: isPlaying ? `rgba(15,23,42,0.75)` : "rgba(15,23,42,0.55)",
        boxShadow: isPlaying
          ? `inset 0 0 0 1px ${tone}99, 0 0 12px ${tone}44`
          : `inset 0 0 0 1px ${tone}40`,
      }}
    >
      {/* Accent bar */}
      <div style={{ height: 3, width: "100%", background: tone, opacity: isPlaying ? 1 : 0.55, flexShrink: 0 }} />

      <div className="py-2.5 px-2 flex flex-col items-center gap-2 w-full">
        {/* City name — at top */}
        <span
          className="text-[10px] font-black text-center leading-tight"
          style={{ color: tone, opacity: isPlaying ? 1 : 0.8 }}
        >
          {city}
        </span>
        {/* Album art */}
        <img
          src={cover}
          alt={`${city} — ${song}`}
          className="w-10 h-10 rounded-lg object-cover flex-shrink-0"
          style={{ boxShadow: isPlaying ? `0 0 8px ${tone}88` : `0 0 4px rgba(0,0,0,0.5)` }}
        />
        {/* Song title */}
        <span className="text-[9px] text-white/40 text-center leading-tight w-full px-0.5 truncate">
          {song}
        </span>
        {/* Play / Pause */}
        <button
          onClick={onToggle}
          disabled={!canPlay}
          aria-label={isPlaying ? `Pause ${song}` : `Play ${song}`}
          className="w-7 h-7 rounded-full flex items-center justify-center transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed"
          style={{
            background: isPlaying ? `${tone}44` : "rgba(255,255,255,0.1)",
            boxShadow: isPlaying
              ? `0 0 0 1px ${tone}88, 0 0 8px ${tone}55`
              : "0 0 0 1px rgba(255,255,255,0.2)",
            color: isPlaying ? tone : "rgba(255,255,255,0.6)",
          }}
        >
          {isPlaying
            ? <Pause className="w-3 h-3" />
            : <Play className="w-3 h-3 ml-[1px]" />
          }
        </button>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function PaMsPromo() {
  const [activeTrait, setActiveTrait] = useState(0);
  const [featured, setFeatured]       = useState(0);
  const [paused, setPaused]           = useState(false);
  const [expandedCard, setExpandedCard] = useState<Card | null>(null);
  const [playingCity, setPlayingCity] = useState<string | null>(null);

  // ── Audio: fetch clip URLs from the same /tracks API used by PaMs Studio ──
  const [audioClips, setAudioClips] = useState<Record<string, string>>({});
  const audioObjRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL;
    if (!apiBase) return;
    fetch(`${apiBase}/tracks`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        const map: Record<string, string> = {};
        (data.tracks || []).forEach((t: { title: string; clips?: { audioUrl: string }[] }) => {
          // Use the first clip as the preview audio — same convention as PaMs Studio track selector
          if (t.clips?.length) map[t.title] = t.clips[0].audioUrl;
        });
        setAudioClips(map);
      })
      .catch(() => { console.debug("[PaMsPromo] /tracks fetch failed — city audio previews disabled"); }); // silent fail — promo works without audio
  }, []);

  // Stop audio on unmount
  useEffect(() => {
    return () => { audioObjRef.current?.pause(); };
  }, []);

  // Toggle a city's song — imperative pattern matching PaMs Studio
  const toggleCity = (city: string, song: string) => {
    if (playingCity === city) {
      audioObjRef.current?.pause();
      audioObjRef.current = null;
      setPlayingCity(null);
      return;
    }
    audioObjRef.current?.pause();
    const url = audioClips[song];
    if (!url) return;
    const audio = new Audio(url);
    audioObjRef.current = audio;
    audio.play().catch((err) => { console.debug("[PaMsPromo] Play failed:", err); });
    // Guard against stale onended from a superseded audio instance
    audio.onended = () => {
      if (audioObjRef.current === audio) {
        audioObjRef.current = null;
        setPlayingCity(null);
      }
    };
    setPlayingCity(city);
  };

  // Auto-cycle traits + spotlight carousel
  useEffect(() => {
    const t = setInterval(() => setActiveTrait((i) => (i + 1) % TRAITS.length), 2600);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (paused) return;
    const c = setInterval(() => setFeatured((i) => (i + 1) % ALL_CARDS.length), 3400);
    return () => clearInterval(c);
  }, [paused]);

  // Rising bubbles — generated once
  const bubbles = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const sz = 6 + Math.random() * 16;
        return {
          key: i,
          left: `${(Math.random() * 100).toFixed(2)}%`,
          width: `${sz.toFixed(1)}px`,
          height: `${sz.toFixed(1)}px`,
          animationDuration: `${(7 + Math.random() * 9).toFixed(1)}s`,
          animationDelay: `${(-Math.random() * 13).toFixed(1)}s`,
        };
      }),
    []
  );

  // 3D tilt on hover (imperative — no re-render)
  const handleTilt = (e: React.MouseEvent<HTMLButtonElement>) => {
    const el = e.currentTarget;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    el.style.transform = `perspective(700px) rotateY(${(px * 18).toFixed(2)}deg) rotateX(${(-py * 18).toFixed(2)}deg) scale(1.06)`;
  };
  const resetTilt = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.transform = "";
  };

  const feat = ALL_CARDS[featured];
  const n = ALL_CARDS.length;

  return (
    <div className="absolute inset-0 z-10 flex items-center justify-center p-3 sm:p-5 pt-16 sm:pt-20">
      <style>{STYLES}</style>

      {/* Gradient scrim */}
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-gradient-to-b from-blue-950/50 via-indigo-950/55 to-blue-950/60" />

      {/* ── Card lightbox ── */}
      <AnimatePresence>
        {expandedCard && (
          <motion.div
            key="lightbox"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 p-6"
            style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)", cursor: "zoom-out" }}
            onClick={() => setExpandedCard(null)}
          >
            <motion.img
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ duration: 0.28 }}
              src={expandedCard.src}
              alt={expandedCard.name}
              className="max-h-[76vh] max-w-[80vw] rounded-2xl"
              style={{ boxShadow: "0 0 0 1.5px rgba(167,139,250,0.5), 0 0 70px rgba(0,0,0,0.9)" }}
              onClick={(e) => e.stopPropagation()}
            />
            <span className="text-sm font-bold uppercase tracking-[0.2em] text-white/80">{expandedCard.name}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main glass panel ── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55 }}
        className="relative z-10 w-full max-w-6xl rounded-3xl overflow-hidden p-6 sm:p-8"
        style={{
          background: "linear-gradient(145deg, rgba(30,58,138,0.6) 0%, rgba(49,46,129,0.6) 50%, rgba(30,58,138,0.6) 100%)",
          backdropFilter: "blur(22px)",
          WebkitBackdropFilter: "blur(22px)",
          boxShadow: "0 0 0 1.5px rgba(139,92,246,0.42), 0 0 60px rgba(99,102,241,0.25), 0 32px 80px rgba(0,0,0,0.7)",
          maxHeight: "min(94vh, 860px)",
        }}
      >
        {/* Godrays + bubbles */}
        <div aria-hidden className="pr-rays" />
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 1 }}>
          {bubbles.map((b) => (
            <span key={b.key} className="pr-bub" style={{ left: b.left, width: b.width, height: b.height, animationDuration: b.animationDuration, animationDelay: b.animationDelay }} />
          ))}
        </div>

        {/* COMING SOON */}
        <span
          className="pr-soon absolute top-5 right-5 z-20 px-3.5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] text-white"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7, #ec4899)" }}
        >
          Coming Soon
        </span>

        {/* ── Spotlight layout ── */}
        <div className="relative grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 lg:gap-8 lg:items-stretch" style={{ zIndex: 4 }}>

          {/* ── Left: spotlight carousel ── */}
          <div
            className="relative flex flex-col items-center justify-center gap-3"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
          >
            {/* ── Carousel group: logo + carousel + title + dots (shifted up for breathing room) ── */}
            <div className="pr-carousel-group flex flex-col items-center gap-3 w-full">
            {/* Circular PaMs pack logo medallion */}
            <div
              className="w-32 h-32 rounded-full overflow-hidden relative z-10"
              style={{
                border: "3px solid rgba(167,139,250,0.65)",
                boxShadow: "0 0 0 1px rgba(139,92,246,0.32), 0 0 28px rgba(167,139,250,0.65), 0 0 56px rgba(99,102,241,0.35)",
                marginBottom: "8px",
              }}
            >
              <img
                src="/images/promo/pams-packs.png"
                alt="PaMs Collectible Cards pack logo medallion"
                className="w-full h-full object-cover object-center"
                style={{ transform: "scale(1.3)", transformOrigin: "center center" }}
              />
            </div>

            <div
              className="relative w-full flex items-center justify-center"
              style={{ height: "clamp(300px, 40vh, 360px)", perspective: 1300, transformStyle: "preserve-3d" }}
            >
              {ALL_CARDS.map((c, i) => {
                let off = i - featured;
                if (off > n / 2) off -= n;
                if (off < -n / 2) off += n;
                const a = Math.abs(off);
                const isCenter = off === 0;
                const itemStyle: React.CSSProperties = {
                  transform: `translateX(${off * 112}px) translateZ(${-a * 80}px) rotateY(${off * -26}deg) scale(${isCenter ? 1 : 0.76})`,
                  opacity: a > 2 ? 0 : 1,
                  zIndex: 100 - a,
                  pointerEvents: isCenter ? "auto" : "none",
                  transition: "transform .6s cubic-bezier(.2,.8,.2,1), opacity .5s",
                };
                return (
                  <div key={c.src} className="absolute" style={itemStyle}>
                    <button
                      className="pr-card"
                      onMouseMove={isCenter ? handleTilt : undefined}
                      onMouseLeave={resetTilt}
                      onClick={() => setExpandedCard(c)}
                      aria-label={`View ${c.name} card`}
                    >
                      <span aria-hidden className="pr-glow" />
                      <img
                        src={c.src}
                        alt={c.name}
                        className="block rounded-2xl"
                        style={{ width: "clamp(180px, 20vw, 224px)", boxShadow: "0 0 0 1.5px rgba(167,139,250,0.5), 0 24px 60px rgba(0,0,0,0.7)" }}
                      />
                      <span aria-hidden className="pr-shine" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="text-center">
              <div className="text-2xl font-black text-white">{feat.name}</div>
              <div className="text-[11px] uppercase tracking-[0.16em] text-white/55 mt-0.5">{feat.rar}</div>
            </div>

            <div className="flex gap-1.5 mt-1">
              {ALL_CARDS.map((c, i) => (
                <button key={c.src} className={`pr-dot ${i === featured ? "on" : ""}`} onClick={() => setFeatured(i)} aria-label={`Show card ${i + 1}`} />
              ))}
            </div>
            </div>{/* end carousel group */}

            {/* ── Email signup — moved here from right panel ── */}
            <div className="pr-wl-card w-full rounded-2xl p-4 flex flex-col gap-3 mt-1">
              <div className="flex items-center gap-2">
                <span aria-hidden="true" className="text-yellow-300 text-lg leading-none flex-shrink-0">⭐</span>
                <span className="text-base font-black text-white tracking-tight leading-tight">Join the Waitlist — be first when packs drop!</span>
              </div>
              <WaitlistForm />
            </div>
          </div>

          {/* ── Right: info stack ── */}
          <div className="flex flex-col gap-3">
            <div>
              <h1 className="pr-title text-2xl sm:text-3xl font-black leading-tight">PaMs Collectible Cards</h1>
              <p className="text-xs text-white/80 mt-1 leading-relaxed">
                125 uniquely crafted cards from the underwater world of Pamlovia — 10 per pack, rare factions, legendary
                tiers, and limited editions you won&apos;t find anywhere else.
              </p>
            </div>

            {/* Stat chips */}
            <div className="grid grid-cols-2 gap-2.5">
              {CHIPS.map((s) => (
                <div
                  key={s.label}
                  className="flex items-center gap-2 p-4 rounded-2xl"
                  style={{ background: "linear-gradient(160deg, rgba(59,130,246,0.18), rgba(99,102,241,0.12))", boxShadow: "inset 0 0 0 1px rgba(96,165,250,0.25)" }}
                >
                  <span className="text-2xl leading-none">{s.icon}</span>
                  <div>
                    <span className={`block text-lg font-black ${s.cls || "text-white"}`}>{s.value}</span>
                    <span className="block text-[11px] text-white/55">{s.label}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Traits */}
            <div className="rounded-2xl p-4" style={{ background: "linear-gradient(160deg, rgba(59,130,246,0.14), rgba(99,102,241,0.10))", boxShadow: "inset 0 0 0 1px rgba(147,197,253,0.18)" }}>
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45 text-center mb-2.5">Trait Levels</p>
              <div className="grid grid-cols-3 gap-2">
                {TRAITS.map((t, i) => (
                  <button key={t.code} className={`pr-pill ${i === activeTrait ? "on" : ""}`} onClick={() => setActiveTrait(i)}>
                    {t.code}
                  </button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTrait}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.16 }}
                  className="rounded-xl px-3 py-3 text-center mt-2.5"
                  style={{ background: "rgba(30,58,138,0.5)", boxShadow: "0 0 0 1px rgba(96,165,250,0.2)" }}
                >
                  <p className="text-lg font-black text-white">{TRAITS[activeTrait].code}</p>
                  <p className="text-white/78 text-sm font-semibold mt-1">{TRAITS[activeTrait].name}</p>
                  <p className="text-white/55 text-[11px] leading-relaxed mt-1">{TRAITS[activeTrait].desc}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Rarity */}
            <div className="rounded-2xl p-4" style={{ background: "linear-gradient(160deg, rgba(14,116,144,0.16), rgba(59,130,246,0.12))", boxShadow: "inset 0 0 0 1px rgba(34,211,238,0.22)" }}>
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/45 text-center mb-2.5">Rarity Tiers</p>
              <div className="flex gap-1">
                {RARITIES.map((r) => (
                  <div key={r.name} className="flex-1 rounded-xl py-2 px-1 flex flex-col items-center gap-1" style={{ background: "rgba(15,23,42,0.55)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.08)" }}>
                    <span className="text-[11px] font-bold text-center leading-tight whitespace-nowrap" style={{ backgroundImage: r.grad, WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent", color: "transparent" }}>
                      {r.name}
                    </span>
                    <span className="text-[11px] font-mono text-white/65 whitespace-nowrap">{r.pct}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cities of Pamlovia — music showcase */}
            <div className="rounded-2xl overflow-hidden" style={{ background: "linear-gradient(160deg, rgba(30,58,138,0.45), rgba(49,46,129,0.45))", boxShadow: "inset 0 0 0 1px rgba(167,139,250,0.22)" }}>
              <div className="px-3 py-2.5 border-b border-white/8">
                <p className="text-[11px] uppercase tracking-[0.16em] text-white/45 text-center">🎵 Cities &amp; Songs of Pamlovia</p>
              </div>
              <div className="flex gap-1.5 p-2">
                {CITY_TRACKS.map((t) => (
                  <CityCard
                    key={t.city}
                    city={t.city}
                    song={t.song}
                    cover={t.cover}
                    tone={t.tone}
                    isPlaying={playingCity === t.city}
                    canPlay={Boolean(audioClips[t.song])}
                    onToggle={() => toggleCity(t.city, t.song)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
