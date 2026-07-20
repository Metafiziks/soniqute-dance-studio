"use client";
import { useState, useEffect, useRef, type MouseEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BrowserProvider, Contract } from "ethers";
import {
  Sparkles,
  Music,
  Play,
  Plus,
  X,
  ChevronRight,
  Zap,
  Lock,
  Star,
} from "lucide-react";
import LyricStylePicker, {
  type LyricStyleId,
  type LyricPosition,
} from "@/components/LyricStylePicker";

// ─── Constants ────────────────────────────────────────────────────────────────
const PAMS_CONTRACT_ADDRESS = process.env.NEXT_PUBLIC_PAMS_CONTRACT_ADDRESS!;
const CHAIN_ID = parseInt(process.env.NEXT_PUBLIC_CHAIN_ID || "1", 10); // Ethereum Mainnet by default
const GENERATION_TIMEOUT_MS = 300_000; // 5 minutes
const POLLING_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes

const PAMS_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

// ─── Types ────────────────────────────────────────────────────────────────────
type PamsNFT = {
  tokenId: number;
  imageUrl: string;
  name: string;
};

type DanceVibe = {
  id: string;
  label: string;
  emoji: string;
  color: string;
  glow: string;
  prompt: string;
};

type PamsScene = {
  id: string;
  tokenId: number;
  nftImageUrl: string;
  vibeId: string;
  vibe: DanceVibe;
  thumbnail: string;
  videoUrl?: string;
  duration: string;
};

type Lyric = { start: number; end: number; text: string };

type Clip = {
  _id: string;
  label: string;
  audioUrl: string;
  duration: string | null;
  sortOrder: number;
  lyrics?: Lyric[];
};

type Track = {
  id: string;
  title: string;
  artist: string;
  albumArtUrl: string | null;
  clips: Clip[];
  bpm: number | null;
};

type IntroScene = {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: number;
};

type CustomCharacterImage = {
  id: string;
  title: string;
  imageUrl: string;
  sortOrder: number;
};

type LibraryTab = 'nfts' | 'custom';

type OutroScene = {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string | null;
  duration: number;
};

type SlotIndex = 0 | 1 | 2;

type FinalVideoItem = {
  id: string;
  videoUrl: string;
  createdAt: string;
  uploadedToLibrary?: boolean;
};

type StitchStage = "idle" | "stitching" | "uploading" | "completed" | "failed";



// ─── Data ─────────────────────────────────────────────────────────────────────
const VIBES: DanceVibe[] = [
  {
    id: "hype",
    label: "Hype",
    emoji: "🔥",
    color: "from-orange-500/80 to-red-500/80",
    glow: "shadow-orange-500/40",
    prompt:
      "explosive energy, rapid arm pumps, jumping, high-intensity hip hop moves, preserve all text and graphics on clothing exactly as shown, keep all lettering sharp and unchanged throughout",
  },
  {
    id: "chill",
    label: "Chill",
    emoji: "😎",
    color: "from-sky-500/80 to-cyan-400/80",
    glow: "shadow-cyan-500/40",
    prompt:
      "swaying smoothly side to side, laid-back groove, slow shoulder rolls, relaxed head bobs, preserve all text and graphics on clothing exactly as shown, keep all lettering sharp and unchanged throughout",
  },
  {
    id: "bounce",
    label: "Bounce",
    emoji: "🌊",
    color: "from-blue-500/80 to-indigo-500/80",
    glow: "shadow-blue-500/40",
    prompt:
      "bouncing rhythmically, fluid up-down motion, light footwork, playful Caribbean energy, preserve all text and graphics on clothing exactly as shown, keep all lettering sharp and unchanged throughout",
  },
  {
    id: "fierce",
    label: "Fierce",
    emoji: "💥",
    color: "from-yellow-400/80 to-amber-500/80",
    glow: "shadow-yellow-400/40",
    prompt:
      "sharp precise dance moves, strong poses, attitude-driven choreography, dramatic lighting, preserve all text and graphics on clothing exactly as shown, keep all lettering sharp and unchanged throughout",
  },
  {
    id: "silly",
    label: "Silly",
    emoji: "🤪",
    color: "from-pink-500/80 to-fuchsia-500/80",
    glow: "shadow-pink-500/40",
    prompt:
      "exaggerated goofy dance moves, wobbly limbs, cartoonish expressions, flailing arms, preserve all text and graphics on clothing exactly as shown, keep all lettering sharp and unchanged throughout",
  },
  {
    id: "dramatic",
    label: "Dramatic",
    emoji: "💫",
    color: "from-violet-500/80 to-purple-600/80",
    glow: "shadow-violet-500/40",
    prompt:
      "slow sweeping dance movements, theatrical gestures, emotional expression, cinematic starfield, preserve all text and graphics on clothing exactly as shown, keep all lettering sharp and unchanged throughout",
  },
  {
    id: "groovy",
    label: "Groovy",
    emoji: "🕺",
    color: "from-emerald-500/80 to-teal-400/80",
    glow: "shadow-emerald-500/40",
    prompt:
      "smooth 70s-inspired funk moves, hip sways, finger points, disco energy, warm retro lighting, preserve all text and graphics on clothing exactly as shown, keep all lettering sharp and unchanged throughout",
  },
  {
    id: "robotic",
    label: "Robotic",
    emoji: "🤖",
    color: "from-cyan-400/80 to-blue-600/80",
    glow: "shadow-cyan-400/40",
    prompt:
      "mechanical popping and locking, sharp robotic gestures, glitch effects, neon circuit backdrop, preserve all text and graphics on clothing exactly as shown, keep all lettering sharp and unchanged throughout",
  },
  {
    id: "jerseyclub",
    label: "Jersey Club",
    emoji: "🫧",
    color: "from-red-500/80 to-orange-600/80",
    glow: "shadow-red-500/40",
    prompt:
      "explosive Jersey Club footwork, rapid heel-toe stomps, shoulder dips, club bounce energy, syncopated step patterns, mouth closed and neutral throughout, no talking or lip movements, body movement only",
  },
  {
    id: "afrobeats",
    label: "Afrobeats",
    emoji: "🌍",
    color: "from-yellow-500/80 to-green-500/80",
    glow: "shadow-yellow-500/40",
    prompt:
      "full-body rhythm, grounded footwork, shoulder shimmies, joyful West African dance energy, fluid hip movement, mouth closed and neutral throughout, no talking or lip movements, body movement only",
  },
  {
    id: "house",
    label: "House",
    emoji: "🏠",
    color: "from-purple-500/80 to-indigo-600/80",
    glow: "shadow-purple-500/40",
    prompt:
      "rapid precise footwork, jacking torso movement, smooth floor glides, underground club energy, Chicago house dance style, mouth closed and neutral throughout, no talking or lip movements, body movement only",
  },
  {
    id: "litefeet",
    label: "Litefeet",
    emoji: "👟",
    color: "from-fuchsia-500/80 to-pink-600/80",
    glow: "shadow-fuchsia-500/40",
    prompt:
      "Harlem litefeet style, light bouncy footwork, toe-and-heel steps, shoulder bounce, smooth gliding weight shifts, playful NYC street energy, mouth closed and neutral throughout, no talking or lip movements, body movement only",
  },
  {
    id: "amapiano",
    label: "Amapiano",
    emoji: "🎶",
    color: "from-green-500/80 to-yellow-500/80",
    glow: "shadow-green-500/40",
    prompt:
      "South African log drum bounce, slow shoulder wining, cool township shuffle step, grounded footwork, amapiano party euphoria, mouth closed and neutral throughout, no talking or lip movements, body movement only",
  },
  {
    id: "salsa",
    label: "Salsa",
    emoji: "🌶️",
    color: "from-red-600/80 to-pink-500/80",
    glow: "shadow-red-600/40",
    prompt:
      "rapid weight shifts, hip flicks, spinning turns, footwork synced to clave rhythm, joyful Latin salsa heat, mouth closed and neutral throughout, no talking or lip movements, body movement only",
  },
  {
    id: "electricslide",
    label: "Electric",
    emoji: "⚡",
    color: "from-sky-400/80 to-blue-600/80",
    glow: "shadow-sky-400/40",
    prompt:
      "line dance swagger, side-step groove, grapevine footwork, feel-good crowd energy, electric slide rhythm, mouth closed and neutral throughout, no talking or lip movements, body movement only",
  },
  {
    id: "kpop",
    label: "K-Pop",
    emoji: "🎤",
    color: "from-rose-400/80 to-violet-500/80",
    glow: "shadow-rose-400/40",
    prompt:
      "synchronized precision choreography, sharp arm lines, clean idol formations, high-energy K-pop dance style, polished group performance energy, mouth closed and neutral throughout, no talking or lip movements, body movement only",
  },
];



const TRANSITION_OPTIONS = [
  { value: "fade", label: "Fade", icon: "◈" },
  { value: "zoom", label: "Zoom", icon: "⊕" },
  { value: "slideLeft", label: "Slide Left", icon: "←" },
  { value: "slideRight", label: "Slide Right", icon: "→" },
  { value: "wipeLeft", label: "Wipe Left", icon: "▷" },
  { value: "wipeRight", label: "Wipe Right", icon: "◁" },
  { value: "reveal", label: "Reveal", icon: "✦" },
] as const;

type TransitionValue = (typeof TRANSITION_OPTIONS)[number]["value"];


const STAGE_LABELS: Record<StitchStage, string> = {
  idle: "",
  stitching: "Stitching scenes with BPM-synced cuts…",
  uploading: "Finalising and uploading…",
  completed: "Done!",
  failed: "Failed",
};

// ─── Credits Bar ──────────────────────────────────────────────────────────────
function CreditsBar({
  credits,
  isAdmin,
}: {
  credits: number;
  isAdmin?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-sm">
      <Zap className="w-3.5 h-3.5 text-yellow-400" />
      <span className="text-sm font-bold text-white">
        {isAdmin ? "∞" : credits}
      </span>
      <span className="text-xs text-white/50">credits</span>
      {!isAdmin && (
        <button className="ml-1 text-xs font-semibold text-cyan-400 hover:text-cyan-300 transition-colors">
          + Buy
        </button>
      )}
      {isAdmin && (
        <span className="ml-1 text-xs text-purple-400 font-semibold">
          admin
        </span>
      )}
    </div>
  );
}

// ─── PaMs NFT Picker ──────────────────────────────────────────────────────────
function PamsNFTPicker({
  nfts, loading, walletConnected, correctChain, selectedNFT, onSelectNFT,
  onConnect, onSwitch, selectedVibe, onSelectVibe, isGenerating, generateError,
  onGenerate, isAdmin, extendSource, onClearExtend,
  customImages = [] as CustomCharacterImage[],
  selectedCustomImage, onSelectCustomImage,
  imageSrcTab = "nfts" as "nfts" | "custom",
  onImageSrcTabChange,
}: {
  nfts: PamsNFT[]; loading: boolean; walletConnected: boolean; correctChain: boolean;
  selectedNFT: PamsNFT | null; onSelectNFT: (nft: PamsNFT) => void;
  onConnect: () => void; onSwitch: () => void;
  selectedVibe: string | null; onSelectVibe: (id: string) => void;
  isGenerating: boolean; generateError: string | null; onGenerate: (vibe: DanceVibe) => void;
  isAdmin?: boolean; extendSource?: PamsScene | null; onClearExtend?: () => void;
  customImages?: CustomCharacterImage[];
  selectedCustomImage?: CustomCharacterImage | null;
  onSelectCustomImage?: (img: CustomCharacterImage | null) => void;
  imageSrcTab?: "nfts" | "custom";
  onImageSrcTabChange?: (tab: "nfts" | "custom") => void;
}) {
  const sourceToggle = (
    <div className="flex gap-1 p-0.5 rounded-xl bg-white/5 border border-white/8 flex-shrink-0">
      {(["nfts", "custom"] as const).map((tab) => {
        const active = imageSrcTab === tab;
        const count  = tab === "nfts" ? nfts.length : customImages.length;
        return (
          <button key={tab} onClick={() => onImageSrcTabChange?.(tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${active ? "bg-white/10 text-white/80" : "text-white/30 hover:text-white/55"}`}
          >
            {tab === "nfts" ? "NFT Images" : "Uploaded"}
            <span className={`text-[8px] rounded-full px-1.5 py-0.5 ${active ? "bg-white/10 text-white/60" : "text-white/20"}`}>{count}</span>
          </button>
        );
      })}
    </div>
  );
  const hasSelection = imageSrcTab === "nfts" ? !!(selectedNFT || extendSource || isAdmin) : !!(selectedCustomImage || isAdmin);
  const vibeAndGenerate = (
    <>
      {imageSrcTab === "nfts" && selectedNFT && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-pink-500/10 border border-pink-400/20">
          <img src={selectedNFT.imageUrl} alt={selectedNFT.name} className="w-6 h-6 rounded-lg object-cover" />
          <p className="text-[9px] text-pink-300 font-bold truncate">Generating for: {selectedNFT.name}</p>
        </div>
      )}
      {imageSrcTab === "custom" && selectedCustomImage && (
        <div className="flex items-center gap-2 px-2 py-1.5 rounded-xl bg-violet-500/10 border border-violet-400/20">
          <img src={selectedCustomImage.imageUrl} alt={selectedCustomImage.title} className="w-6 h-6 rounded-lg object-cover" />
          <p className="text-[9px] text-violet-300 font-bold truncate">Generating for: {selectedCustomImage.title || "Custom Image"}</p>
        </div>
      )}
      <AnimatePresence>
        {extendSource && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
            className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-cyan-500/15 border border-cyan-400/25">
            <div className="min-w-0">
              <p className="text-[9px] font-bold text-cyan-300 leading-none">🎬 Extending {extendSource.vibe.label} scene</p>
              <p className="text-[8px] text-white/40 mt-0.5">Pick a vibe → generates from the last frame</p>
            </div>
            <button onClick={onClearExtend} className="text-white/30 hover:text-white/60 transition-colors flex-shrink-0 text-xs">✕</button>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.18em]">Pick a Vibe</p>
          <span className="text-[9px] text-white/25">1 credit / scene</span>
        </div>
        <div className="grid grid-cols-4 gap-1.5">
          {VIBES.map((vibe) => (
            <button key={vibe.id} onClick={() => onSelectVibe(vibe.id)}
              className={`relative flex flex-col items-center gap-1 py-2 px-1 rounded-xl border transition-all duration-200 ${selectedVibe === vibe.id ? `bg-gradient-to-br ${vibe.color} border-white/40 shadow-lg ${vibe.glow}` : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20"}`}
            >
              <span className="text-base">{vibe.emoji}</span>
              <span className="text-[8px] font-bold text-white/75 tracking-wide">{vibe.label}</span>
              {selectedVibe === vibe.id && <motion.div layoutId="pams-vibe-pill" className="absolute inset-0 rounded-xl ring-2 ring-white/50" transition={{ type: "spring", stiffness: 400, damping: 30 }} />}
            </button>
          ))}
        </div>
      </div>
      {(() => {
        const canGenerate = hasSelection && (selectedVibe || isAdmin) && !isGenerating;
        const disabled    = isGenerating || !hasSelection || (!selectedVibe && !isAdmin);
        return (
          <motion.button whileTap={{ scale: 0.97 }} disabled={disabled}
            onClick={() => { const v = VIBES.find((v) => v.id === selectedVibe); if (v) onGenerate(v); }}
            className={`w-full py-3 rounded-2xl font-bold text-sm tracking-wide flex items-center justify-center gap-2 transition-all duration-200 ${canGenerate ? "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white shadow-[0_8px_24px_rgba(217,70,239,.4)]" : "bg-white/5 text-white/20 cursor-not-allowed border border-white/8"}`}
          >
            {isGenerating ? (<><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full" /> Generating… (up to 2 min)</>) : (<><Sparkles className="w-4 h-4" /> Generate Scene</>)}
          </motion.button>
        );
      })()}
      {generateError && <motion.p initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="text-[11px] text-red-400 text-center px-2 py-1.5 rounded-xl bg-red-500/10 border border-red-400/20">{generateError}</motion.p>}
    </>
  );
  if (imageSrcTab === "custom") {
    return (
      <div className="flex flex-col h-full gap-3">
        {sourceToggle}
        {customImages.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 p-4">
            <span className="text-2xl opacity-20">🖼</span>
            <p className="text-white/30 text-xs text-center">No custom images yet — ask an admin to upload some.</p>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 gap-2">
              {customImages.map((img) => (
                <button key={img.id} onClick={() => onSelectCustomImage?.(selectedCustomImage?.id === img.id ? null : img)}
                  className={`rounded-xl overflow-hidden border bg-black/30 aspect-square relative cursor-pointer transition-all ${selectedCustomImage?.id === img.id ? "border-violet-400/60 ring-2 ring-violet-400/30" : "border-white/10 hover:border-white/25"}`}
                >
                  <img src={img.imageUrl} alt={img.title || "Custom"} className="w-full h-full object-cover" />
                  <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <p className="text-[9px] text-white/70 font-semibold truncate">{img.title || "Custom"}</p>
                  </div>
                  {selectedCustomImage?.id === img.id && (
                    <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-violet-500 flex items-center justify-center">
                      <span className="text-[8px] text-white font-bold">✓</span>
                    </div>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
        {vibeAndGenerate}
      </div>
    );
  }
  if (!walletConnected) { return (<div className="flex flex-col h-full gap-3">{sourceToggle}<div className="flex flex-col flex-1 items-center justify-center gap-4 p-4"><div className="text-4xl">👛</div><p className="text-white/60 text-sm text-center">Connect your wallet to load your PaMs NFTs</p><button onClick={onConnect} className="px-6 py-3 rounded-2xl font-bold text-sm bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white shadow-[0_8px_24px_rgba(217,70,239,.4)]">Connect Wallet</button></div></div>); }
  if (!correctChain) { return (<div className="flex flex-col h-full gap-3">{sourceToggle}<div className="flex flex-col flex-1 items-center justify-center gap-4 p-4"><p className="text-amber-400 text-sm text-center">Switch to Ethereum Mainnet</p><button onClick={onSwitch} className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-400/30 text-amber-300 text-sm font-bold">Switch Network</button></div></div>); }
  if (loading) { return (<div className="flex flex-col h-full gap-3">{sourceToggle}<div className="flex flex-col flex-1 items-center justify-center gap-3"><div className="w-6 h-6 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" /><p className="text-white/40 text-xs">Loading your PaMs…</p></div></div>); }
  if (nfts.length === 0) { return (<div className="flex flex-col h-full gap-3">{sourceToggle}<div className="flex flex-col flex-1 items-center justify-center gap-3 p-4"><p className="text-white/40 text-sm text-center">No PaMs NFTs found in this wallet</p></div></div>); }
  return (
    <div className="flex flex-col h-full gap-3">
      {sourceToggle}
      <p className="text-[10px] font-bold text-white/50 uppercase tracking-[0.18em]">Your PaMs — {nfts.length} NFT{nfts.length !== 1 ? "s" : ""}</p>
      <div className="flex-1 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2">
          {nfts.map((nft) => (
            <button key={nft.tokenId} onClick={() => onSelectNFT(nft)}
              className={`rounded-xl overflow-hidden border bg-black/30 aspect-square relative cursor-pointer transition-all ${selectedNFT?.tokenId === nft.tokenId ? "border-pink-400/60 ring-2 ring-pink-400/30" : "border-white/10 hover:border-white/25"}`}
            >
              <img src={nft.imageUrl} alt={nft.name} className="w-full h-full object-cover" />
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                <p className="text-[9px] text-white/70 font-semibold truncate">{nft.name}</p>
              </div>
              {selectedNFT?.tokenId === nft.tokenId && (<div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-pink-500 flex items-center justify-center"><span className="text-[8px] text-white font-bold">✓</span></div>)}
            </button>
          ))}
        </div>
      </div>
      {vibeAndGenerate}
    </div>
  );
}

// ─── Custom Scene Card ─────────────────────────────────────────────────────────
// Shows an admin-uploaded custom image with a vibe selector and Generate button.
// Works identically to NFT scene generation — same WaveSpeed/Seedance pipeline.
function PamsCustomSceneCard({
  image,
  isGenerating,
  generatedCount,
  onGenerate,
}: {
  image: CustomCharacterImage;
  isGenerating: boolean;
  generatedCount: number;
  onGenerate: (vibeId: string) => void;
}) {
  const [selectedVibeId, setSelectedVibeId] = useState<string>("");
  // Set default after mount so PAMS_VIBES is guaranteed initialized
  useEffect(() => { if (!selectedVibeId && PAMS_VIBES.length) setSelectedVibeId(PAMS_VIBES[0].id); }, []);

  return (
    <div className="relative flex flex-col rounded-xl overflow-hidden border border-white/8 hover:border-white/18 transition-colors bg-black/30">
      {/* Image preview in 9:16 frame (matches PamsSceneCard aspect ratio) */}
      <div className="relative aspect-[9/16] bg-black/50 overflow-hidden">
        <img
          src={image.imageUrl}
          alt={image.title || "Custom character"}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />

        {/* Generating overlay */}
        {isGenerating && (
          <div className="absolute inset-0 bg-black/75 flex flex-col items-center justify-center gap-2">
            <div className="w-5 h-5 border-2 border-violet-400/40 border-t-violet-400 rounded-full animate-spin" />
            <span className="text-[8px] text-violet-300/60">Generating…</span>
          </div>
        )}

        {/* Generated count badge */}
        {generatedCount > 0 && !isGenerating && (
          <div className="absolute top-1 right-1">
            <span className="text-[7px] bg-emerald-500/25 border border-emerald-400/25 text-emerald-300 px-1.5 py-0.5 rounded-full">
              {generatedCount} ✓
            </span>
          </div>
        )}
      </div>

      {/* Vibe picker + generate button */}
      <div className="px-1.5 py-1.5 bg-black/40 space-y-1.5">
        <p className="text-[7px] text-white/35 truncate leading-none">
          {image.title || "Custom"}
        </p>
        <div className="flex gap-1 items-center">
          <select
            value={selectedVibeId}
            onChange={(e) => setSelectedVibeId(e.target.value)}
            disabled={isGenerating}
            className="flex-1 min-w-0 text-[7px] bg-white/5 border border-white/10 text-white/55 rounded-lg px-1 py-1 focus:outline-none focus:border-violet-400/30 disabled:opacity-40 transition appearance-none cursor-pointer"
          >
            {PAMS_VIBES.map((v) => (
              <option key={v.id} value={v.id}>
                {v.emoji} {v.label}
              </option>
            ))}
          </select>
          <button
            onClick={() => !isGenerating && onGenerate(selectedVibeId)}
            disabled={isGenerating}
            title="Generate video"
            className="flex-shrink-0 w-7 h-7 rounded-lg text-[10px] font-bold bg-violet-500/20 border border-violet-400/25 text-violet-300 hover:bg-violet-500/35 disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center"
          >
            {isGenerating ? "⏳" : "▶"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Custom Scene Library ───────────────────────────────────────────────────────
// Shows the custom tab content: source images (with generate UI) on top,
// already-generated scenes below (using the same PamsSceneCard as NFT scenes).
function PamsCustomSceneLibrary({
  images,
  generatedScenes,
  generatingSet,
  slots,
  onGenerate,
  onDrop,
  onDelete,
  onExtend,
}: {
  images: CustomCharacterImage[];
  generatedScenes: PamsScene[];
  generatingSet: Set<string>;
  slots: (PamsScene | null)[];
  onGenerate: (image: CustomCharacterImage, vibeId: string) => void;
  onDrop: (scene: PamsScene, slot: SlotIndex) => void;
  onDelete: (scene: PamsScene) => void;
  onExtend: (scene: PamsScene) => void;
}) {
  if (images.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-2">
        <span className="text-2xl opacity-20">🖼</span>
        <p className="text-[10px] text-white/20 text-center">
          No custom images yet.
          <br />Upload some in the admin panel.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Generated scenes — displayed first, identical to NFT scenes */}
      {generatedScenes.length > 0 && (
        <div>
          <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1.5">Generated</p>
          <div className="grid grid-cols-4 gap-1 content-start">
            {generatedScenes.map((scene) => (
              <PamsSceneCard
                key={scene.id}
                scene={scene}
                slots={slots}
                onDrop={onDrop}
                onDelete={onDelete}
                onExtend={onExtend}
              />
            ))}
          </div>
        </div>
      )}

      {/* Source images — pick vibe and generate */}
      <div>
        {generatedScenes.length > 0 && (
          <p className="text-[9px] text-white/25 uppercase tracking-widest mb-1.5">Source Images</p>
        )}
        <div className="grid grid-cols-4 gap-1 content-start">
          {images.map((img) => (
            <PamsCustomSceneCard
              key={img.id}
              image={img}
              isGenerating={generatingSet.has(img.id)}
              generatedCount={generatedScenes.filter(
                (s) => (s as any).customImageId === img.id
              ).length}
              onGenerate={(vibeId) => onGenerate(img, vibeId)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}


// ─── Intro Scene Card ─────────────────────────────────────────────────────────
// Intro scenes are admin-curated. They cannot be dropped into regular Act slots.
function PamsIntroSceneCard({
  scene,
  isSelected,
  onSelect,
}: {
  scene: IntroScene;
  isSelected: boolean;
  onSelect: (scene: IntroScene | null) => void;
}) {
  return (
    <div
      onClick={() => onSelect(isSelected ? null : scene)}
      className={`relative flex-shrink-0 rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 ${
        isSelected
          ? "border-amber-400/80 ring-1 ring-amber-400/40 shadow-[0_0_12px_rgba(251,191,36,0.3)]"
          : "border-white/10 hover:border-white/30"
      }`}
      style={{ width: 84 }}
    >
      <div className="relative aspect-[9/16]">
        <video
          src={scene.videoUrl}
          poster={scene.thumbnailUrl ?? undefined}
          className="w-full h-full object-cover"
          autoPlay
          loop
          muted
          playsInline
        />
        {isSelected && (
          <div className="absolute inset-0 bg-amber-400/15 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-amber-400 flex items-center justify-center">
              <span className="text-[8px] text-black font-black">✓</span>
            </div>
          </div>
        )}
        {/* Duration badge */}
        <span className="absolute bottom-1 right-1 text-[7px] text-white/60 bg-black/60 px-1 py-0.5 rounded-full pointer-events-none">
          {scene.duration}s
        </span>
      </div>
      <div className="px-1.5 py-0.5 bg-black/40">
        <p className="text-[7px] text-white/45 truncate">{scene.title}</p>
      </div>
    </div>
  );
}

// ─── Intro Scene Library ───────────────────────────────────────────────────────
// Admin-curated intro clips shown in a compact horizontal scroll above the
// regular scene library. Selecting one slots it into the Edit Suite intro position.
// STRICTLY SEPARATE from regular scenes — intro clips cannot be used as Act 1/2/3.
function PamsIntroSceneLibrary({
  introScenes,
  selectedIntro,
  onSelect,
}: {
  introScenes: IntroScene[];
  selectedIntro: IntroScene | null;
  onSelect: (scene: IntroScene | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-amber-400/70 uppercase tracking-[0.18em]">
          Intro Scenes
        </h3>
        {selectedIntro && (
          <button
            onClick={() => onSelect(null)}
            className="text-[9px] text-white/30 hover:text-white/55 transition-colors"
          >
            clear
          </button>
        )}
      </div>

      {introScenes.length === 0 ? (
        <div className="flex items-center justify-center py-3 rounded-xl border border-dashed border-white/8">
          <p className="text-[9px] text-white/20 italic">No intro scenes yet</p>
        </div>
      ) : (
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {introScenes.map((scene) => (
            <PamsIntroSceneCard
              key={scene.id}
              scene={scene}
              isSelected={selectedIntro?.id === scene.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}



// ─── Library Tab Toggle ────────────────────────────────────────────────────────
function LibraryTabToggle({
  activeTab,
  nftCount,
  customCount,
  onChange,
}: {
  activeTab: LibraryTab;
  nftCount: number;
  customCount: number;
  onChange: (tab: LibraryTab) => void;
}) {
  return (
    <div className="flex gap-1 p-0.5 rounded-xl bg-white/5 border border-white/8">
      {(["nfts", "custom"] as LibraryTab[]).map((tab) => {
        const label = tab === "nfts" ? "NFT Scenes" : "Custom";
        const count = tab === "nfts" ? nftCount : customCount;
        const active = activeTab === tab;
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-wider transition-all ${
              active
                ? "bg-white/10 text-white/80 shadow-sm"
                : "text-white/30 hover:text-white/50"
            }`}
          >
            {label}
            <span className={`text-[8px] rounded-full px-1.5 py-0.5 ${active ? "bg-white/10 text-white/60" : "text-white/20"}`}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
// ─── Outro Scene Card ──────────────────────────────────────────────────────────
// Mirrors PamsIntroSceneCard — teal/cyan accent. Admin-curated only.
// Cannot be dropped into regular Act slots.
function PamsOutroSceneCard({
  scene,
  isSelected,
  onSelect,
}: {
  scene: OutroScene;
  isSelected: boolean;
  onSelect: (scene: OutroScene | null) => void;
}) {
  return (
    <div
      onClick={() => onSelect(isSelected ? null : scene)}
      className={`relative flex-shrink-0 rounded-xl overflow-hidden border cursor-pointer transition-all duration-200 ${
        isSelected
          ? "border-cyan-400/80 ring-1 ring-cyan-400/40 shadow-[0_0_12px_rgba(34,211,238,0.3)]"
          : "border-white/10 hover:border-white/30"
      }`}
      style={{ width: 84 }}
    >
      <div className="relative aspect-[9/16]">
        <video
          src={scene.videoUrl}
          poster={scene.thumbnailUrl ?? undefined}
          className="w-full h-full object-cover"
          autoPlay loop muted playsInline
        />
        {isSelected && (
          <div className="absolute inset-0 bg-cyan-400/15 flex items-center justify-center">
            <div className="w-4 h-4 rounded-full bg-cyan-400 flex items-center justify-center">
              <span className="text-[8px] text-black font-black">✓</span>
            </div>
          </div>
        )}
        <span className="absolute bottom-1 right-1 text-[7px] text-white/60 bg-black/60 px-1 py-0.5 rounded-full pointer-events-none">
          {scene.duration}s
        </span>
      </div>
      <div className="px-1.5 py-0.5 bg-black/40">
        <p className="text-[7px] text-white/45 truncate">{scene.title}</p>
      </div>
    </div>
  );
}

// ─── Outro Scene Library ───────────────────────────────────────────────────────
// Admin-curated outro clips — compact horizontal scroll, below the scene library.
// STRICTLY SEPARATE from regular scenes and intro scenes.
function PamsOutroSceneLibrary({
  outroScenes,
  selectedOutro,
  onSelect,
}: {
  outroScenes: OutroScene[];
  selectedOutro: OutroScene | null;
  onSelect: (scene: OutroScene | null) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-cyan-400/70 uppercase tracking-[0.18em]">
          Outro Scenes
        </h3>
        {selectedOutro && (
          <button
            onClick={() => onSelect(null)}
            className="text-[9px] text-white/30 hover:text-white/55 transition-colors"
          >
            clear
          </button>
        )}
      </div>

      {outroScenes.length === 0 ? (
        <div className="flex items-center justify-center py-3 rounded-xl border border-dashed border-white/8">
          <p className="text-[9px] text-white/20 italic">No outro scenes yet</p>
        </div>
      ) : (
        <div className="flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
          {outroScenes.map((scene) => (
            <PamsOutroSceneCard
              key={scene.id}
              scene={scene}
              isSelected={selectedOutro?.id === scene.id}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Scene Card ───────────────────────────────────────────────────────────────
function PamsSceneCard({
  scene,
  slots,
  onDrop,
  onDelete,
  onExtend,
}: {
  scene: PamsScene;
  slots: (PamsScene | null)[];
  onDrop: (scene: PamsScene, slot: SlotIndex) => void;
  onDelete: (scene: PamsScene) => void;
  onExtend: (scene: PamsScene) => void;
}) {
  const [isPaused, setIsPaused] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlayPause = (e: MouseEvent<HTMLVideoElement>) => {
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPaused(false);
    } else {
      video.pause();
      setIsPaused(true);
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.85, y: 12 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="group relative rounded-xl overflow-hidden border border-white/10 bg-black/50 hover:border-white/25 transition-colors"
      onMouseLeave={() => setConfirmingDelete(false)}
    >
      <div className="relative aspect-[9/16]">
        {scene.videoUrl ? (
          <video
            ref={videoRef}
            src={scene.videoUrl}
            poster={scene.thumbnail}
            className="w-full h-full object-cover cursor-pointer"
            autoPlay
            loop
            muted
            playsInline
            onClick={togglePlayPause}
          />
        ) : (
          <img
            src={scene.thumbnail}
            alt={scene.vibe.label}
            className="w-full h-full object-cover"
          />
        )}

        {isPaused && (
          <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <div className="w-10 h-10 rounded-full bg-black/60 backdrop-blur-sm border border-white/20 flex items-center justify-center">
              <Play className="w-4 h-4 text-white fill-white ml-0.5" />
            </div>
          </div>
        )}

        {/* Vibe badge */}
        <div className="absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-black/65 backdrop-blur-sm z-30 pointer-events-none">
          <span className="text-[10px]">{scene.vibe.emoji}</span>
          <span className="text-[8px] text-white font-bold">{scene.vibe.label}</span>
        </div>

        {/* Duration badge */}
        <span className="absolute bottom-1.5 right-1.5 text-[8px] text-white/60 bg-black/60 px-1.5 py-0.5 rounded-full z-30 pointer-events-none">
          {scene.duration}
        </span>

        {/* Hover overlay */}
        <div
          className="absolute inset-x-0 bottom-0 h-3/5 opacity-0 group-hover:opacity-100 transition-opacity z-20 flex flex-col items-center justify-end pb-2 gap-1.5 px-2"
          style={{
            background:
              "linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.7) 50%, transparent 100%)",
          }}
        >
          <p className="text-[7px] text-white/50 font-medium tracking-wide">
            Add to Suite
          </p>
          <div className="flex gap-1.5">
            {([0, 1, 2] as SlotIndex[]).map((i) => (
              <button
                key={i}
                onClick={() => onDrop(scene, i)}
                className={`px-1.5 py-0.5 rounded-lg text-[8px] font-bold border transition-all ${
                  slots[i] !== null
                    ? "bg-white/5 border-white/10 text-white/25"
                    : "bg-gradient-to-br from-pink-500/80 to-purple-600/80 border-pink-300/40 text-white hover:from-pink-400/80 hover:to-purple-500/80"
                }`}
              >
                Act {i + 1}
              </button>
            ))}
          </div>
          {scene.videoUrl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExtend(scene);
              }}
              aria-label={`Extend ${scene.vibe.label} scene`}
              className="text-[8px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors px-2 py-0.5 rounded-lg bg-cyan-500/10 border border-cyan-400/15 hover:bg-cyan-500/20 w-full text-center"
            >
              🎬 Extend this scene
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (!confirmingDelete) {
                setConfirmingDelete(true);
              } else {
                onDelete(scene);
              }
            }}
            onBlur={() => setConfirmingDelete(false)}
            className={`text-[8px] font-bold transition-all px-2 py-0.5 rounded-lg w-full text-center ${
              confirmingDelete
                ? "text-white bg-red-500/80 border border-red-400/80 animate-pulse"
                : "text-red-400 hover:text-red-300 bg-red-500/10 border border-red-400/15 hover:bg-red-500/20"
            }`}
          >
            {confirmingDelete ? "⚠️ Tap to confirm" : "🗑 Delete"}
          </button>
        </div>
      </div>

      {/* NFT name label */}
      <div className="px-1.5 py-0.5 bg-black/30">
        <p className="text-[7px] text-white/35 truncate">#{scene.tokenId}</p>
      </div>
    </motion.div>
  );
}

// ─── Scene Library ────────────────────────────────────────────────────────────
function PamsSceneLibrary({
  scenes, onDrop, slots, onDelete, onExtend,
}: {
  scenes: PamsScene[]; onDrop: (scene: PamsScene, slot: SlotIndex) => void;
  slots: (PamsScene | null)[];
  onDelete: (scene: PamsScene) => void; onExtend: (scene: PamsScene) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h3 className="text-[10px] font-bold text-white/50 uppercase tracking-[0.18em]">Scene Library</h3>
        <span className="text-[10px] text-white/25">{scenes.length} scenes</span>
      </div>
      {scenes.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 gap-3 py-16">
          <Play className="w-10 h-10 text-white/10" />
          <p className="text-xs text-white/20 text-center px-8">Select a PaM NFT, pick a vibe, and generate scenes</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-1 content-start">
          {scenes.map((scene) => (
            <PamsSceneCard key={scene.id} scene={scene} slots={slots} onDrop={onDrop} onDelete={onDelete} onExtend={onExtend} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Transition Picker ────────────────────────────────────────────────────────
function TransitionPicker({
  value,
  onChange,
}: {
  value: TransitionValue;
  onChange: (v: TransitionValue) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = TRANSITION_OPTIONS.find((t) => t.value === value)!;

  useEffect(() => {
    if (!open) return;
    const handler = (e: Event) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div
      ref={ref}
      className="flex flex-col items-center flex-shrink-0 relative"
      style={{ width: 24 }}
    >
      <div className="w-px bg-white/20" style={{ height: 12 }} />
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-6 h-6 rounded-full bg-white/5 border border-white/15 hover:border-pink-400/50 hover:bg-white/10 flex items-center justify-center text-[10px] text-white/60 hover:text-white transition-all flex-shrink-0"
      >
        {current.icon}
      </button>
      <div className="w-px bg-white/20" style={{ height: 12 }} />

      {open && (
        <div
          className="absolute z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 mt-10 w-36 rounded-2xl bg-[#0d0d1a] border border-white/15 shadow-[0_8px_32px_rgba(0,0,0,0.8)] overflow-hidden backdrop-blur-xl"
          style={{ marginTop: 44 }}
        >
          <p className="text-[8px] font-bold text-white/30 uppercase tracking-widest px-3 pt-2 pb-1">
            Transition
          </p>
          {TRANSITION_OPTIONS.map((t) => (
            <button
              key={t.value}
              onClick={() => {
                onChange(t.value);
                setOpen(false);
              }}
              className={
                "w-full flex items-center gap-2 px-3 py-1.5 text-[11px] font-semibold transition-colors " +
                (t.value === value
                  ? "bg-pink-500/20 text-white"
                  : "text-white/55 hover:bg-white/8 hover:text-white")
              }
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              {t.value === value && (
                <span className="ml-auto text-pink-400 text-[9px]">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Edit Suite ───────────────────────────────────────────────────────────────
function PamsEditSuite({
  slots,
  onRemove,
  selectedTrack,
  onSelectTrack,
  tracks,
  selectedClip,
  onSelectClip,
  onStitch,
  stitching,
  stitchError,
  transitions,
  onTransitionsChange,
  lyricStyle,
  lyricPosition,
  onLyricStyleChange,
  onLyricPositionChange,
  introSlot,
  introTransition,
  onIntroChange,
  onIntroTransitionChange,
  outroSlot,
  outroTransition,
  onOutroChange,
  onOutroTransitionChange,
}: {
  slots: (PamsScene | null)[];
  onRemove: (slot: SlotIndex) => void;
  selectedTrack: Track | null;
  onSelectTrack: (track: Track) => void;
  tracks: Track[];
  selectedClip: Clip | null;
  onSelectClip: (clip: Clip | null) => void;
  onStitch: () => void;
  stitching: boolean;
  stitchError: string | null;
  transitions: TransitionValue[];
  onTransitionsChange: (t: TransitionValue[]) => void;
  lyricStyle: LyricStyleId;
  lyricPosition: LyricPosition;
  onLyricStyleChange: (style: LyricStyleId) => void;
  onLyricPositionChange: (position: LyricPosition) => void;
  introSlot: IntroScene | null;
  introTransition: TransitionValue;
  onIntroChange: (scene: IntroScene | null) => void;
  onIntroTransitionChange: (t: TransitionValue) => void;
  outroSlot: OutroScene | null;
  outroTransition: TransitionValue;
  onOutroChange: (scene: OutroScene | null) => void;
  onOutroTransitionChange: (t: TransitionValue) => void;
}) {
  const [showTracks, setShowTracks] = useState(false);
  const [search, setSearch] = useState("");
  const [previewTrackId, setPreviewTrackId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const readyToStitch = slots.every(Boolean) && !!selectedClip;

  const filteredTracks = tracks.filter(
    (t) =>
      t.title.toLowerCase().includes(search.toLowerCase()) ||
      t.artist.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    if (!showTracks && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPreviewTrackId(null);
    }
  }, [showTracks]);

  // Slot renderer helper
  const renderSlot = (slotIndex: SlotIndex) => {
    const scene = slots[slotIndex];
    const label = `Act ${slotIndex + 1}`;

    return (
      <div className="space-y-1.5 min-w-0">
        <p className="text-[9px] text-white/35 text-center font-bold uppercase tracking-widest">
          {label}
        </p>
        <AnimatePresence mode="wait">
          {scene ? (
            <>
              <motion.div
                key={scene.id + slotIndex}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative rounded-xl overflow-hidden border border-white/25 aspect-[9/16] shadow-lg bg-black/50"
              >
                <img
                  src={scene.nftImageUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
                <div
                  className={`absolute inset-0 bg-gradient-to-t ${scene.vibe.color} opacity-35`}
                />
                <div className="absolute top-0 left-0 w-4 h-4 border-l border-t border-cyan-400/60 rounded-tl-xl pointer-events-none z-10" />
                <div className="absolute top-0 right-0 w-4 h-4 border-r border-t border-pink-400/60 rounded-tr-xl pointer-events-none z-10" />
                <div className="absolute top-1 left-1 text-sm z-10">
                  {scene.vibe.emoji}
                </div>
                <button
                  onClick={() => onRemove(slotIndex)}
                  className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center hover:bg-red-500/90 transition-colors z-10"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
                <div className="absolute bottom-1 inset-x-1 z-10">
                  <p className="text-[8px] text-white/65 text-center font-semibold truncate">
                    {scene.vibe.label}
                  </p>
                </div>
              </motion.div>
              {/* NFT label */}
              <p className="text-[8px] text-white/35 text-center truncate">
                PaM #{scene.tokenId}
              </p>

            </>
          ) : (
            <motion.div
              key={`empty-${slotIndex}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="aspect-[9/16] rounded-xl border border-dashed border-white/12 bg-white/[0.02] flex flex-col items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4 text-white/12" />
              <span className="text-[8px] text-white/12 font-medium">
                Empty
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex flex-col gap-4 pb-4">
      <h3 className="text-xs font-bold text-white/60 uppercase tracking-[0.18em]">
        Edit Suite
      </h3>

      {/* ── Intro Slot ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[9px] text-amber-400/60 font-bold uppercase tracking-widest">
          Intro <span className="text-white/20 font-normal normal-case tracking-normal">(optional)</span>
        </p>
        <div className="flex items-center gap-2">
          {/* Fixed small thumbnail — intentionally smaller than the act slots */}
          <div className="w-14 flex-shrink-0">
            {introSlot ? (
              <div className="relative rounded-xl overflow-hidden border border-amber-400/40 aspect-[9/16] bg-black/50 shadow-[0_0_8px_rgba(251,191,36,0.15)]">
                <video
                  src={introSlot.videoUrl}
                  poster={introSlot.thumbnailUrl ?? undefined}
                  className="w-full h-full object-cover"
                  autoPlay loop muted playsInline
                />
                <button
                  onClick={() => onIntroChange(null)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center hover:bg-red-500/80 transition-colors z-10"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
                <div className="absolute bottom-0 inset-x-0 px-1 py-0.5 bg-black/50">
                  <p className="text-[6px] text-amber-300/80 truncate">{introSlot.title}</p>
                </div>
              </div>
            ) : (
              <div className="aspect-[9/16] rounded-xl border border-dashed border-amber-400/20 bg-amber-400/[0.03] flex flex-col items-center justify-center gap-0.5 cursor-default">
                <span className="text-base">🎬</span>
                <span className="text-[6px] text-amber-400/35 font-medium text-center px-0.5 leading-tight">Select from library</span>
              </div>
            )}
          </div>

          {/* Transition picker + label */}
          <div className="flex flex-col items-center gap-1 text-white/20">
            {introSlot ? (
              <TransitionPicker value={introTransition} onChange={onIntroTransitionChange} />
            ) : (
              <span className="text-[9px]">→</span>
            )}
            <span className="text-[7px]">Act 1</span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/8 -mx-1" />

      {/* ── Acts 1 / 2 / 3 ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center gap-0">
        {renderSlot(0)}
        <TransitionPicker
          value={transitions[0]}
          onChange={(v) => {
            const next = [...transitions];
            next[0] = v;
            onTransitionsChange(next);
          }}
        />
        {renderSlot(1)}
        <TransitionPicker
          value={transitions[1]}
          onChange={(v) => {
            const next = [...transitions];
            next[1] = v;
            onTransitionsChange(next);
          }}
        />
        {renderSlot(2)}
      </div>

      <p className="text-[10px] text-white/35 text-center px-2">
        💫 Click{" "}
        <span className="text-white/55 font-semibold">◈</span> between acts to
        change the transition effect
      </p>

      <div className="border-t border-white/8 -mx-1" />

      {/* ── Outro Slot ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[9px] text-cyan-400/60 font-bold uppercase tracking-widest">
          Outro <span className="text-white/20 font-normal normal-case tracking-normal">(optional)</span>
        </p>
        <div className="flex items-center gap-2">
          {/* Fixed small thumbnail first — keeps TransitionPicker away from left edge
              so its dropdown opens rightward inside the container, not clipped */}
          <div className="w-14 flex-shrink-0">
            {outroSlot ? (
              <div className="relative rounded-xl overflow-hidden border border-cyan-400/40 aspect-[9/16] bg-black/50 shadow-[0_0_8px_rgba(34,211,238,0.15)]">
                <video
                  src={outroSlot.videoUrl}
                  poster={outroSlot.thumbnailUrl ?? undefined}
                  className="w-full h-full object-cover"
                  autoPlay loop muted playsInline
                />
                <button
                  onClick={() => onOutroChange(null)}
                  className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/70 flex items-center justify-center hover:bg-red-500/80 transition-colors z-10"
                >
                  <X className="w-2.5 h-2.5 text-white" />
                </button>
                <div className="absolute bottom-0 inset-x-0 px-1 py-0.5 bg-black/50">
                  <p className="text-[6px] text-cyan-300/80 truncate">{outroSlot.title}</p>
                </div>
              </div>
            ) : (
              <div className="aspect-[9/16] rounded-xl border border-dashed border-cyan-400/20 bg-cyan-400/[0.03] flex flex-col items-center justify-center gap-0.5 cursor-default">
                <span className="text-base">🎬</span>
                <span className="text-[6px] text-cyan-400/35 font-medium text-center px-0.5 leading-tight">Select from library</span>
              </div>
            )}
          </div>

          {/* Transition picker + Act 3 label — on right, opens inward */}
          <div className="flex flex-col items-center gap-1 text-white/20">
            {outroSlot ? (
              <TransitionPicker value={outroTransition} onChange={onOutroTransitionChange} />
            ) : (
              <span className="text-[9px]">←</span>
            )}
            <span className="text-[7px]">Act 3</span>
          </div>
        </div>
      </div>

      {/* Track selector */}
      <div className="space-y-1.5 flex-1 min-h-0 flex flex-col">
        <button
          onClick={() => setShowTracks(!showTracks)}
          className="w-full flex items-center justify-between px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/8 hover:border-white/20 transition-colors flex-shrink-0"
        >
          <div className="flex items-center gap-3 min-w-0">
            {selectedTrack?.albumArtUrl ? (
              <img
                src={selectedTrack.albumArtUrl}
                alt={selectedTrack.title}
                className="w-8 h-8 rounded-lg object-cover flex-shrink-0"
              />
            ) : (
              <Music className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            )}
            {selectedTrack ? (
              <div className="min-w-0 text-left">
                <p className="text-xs font-semibold text-white truncate">
                  {selectedTrack.title}
                </p>
                <p className="text-[10px] text-white/45">
                  {selectedTrack.artist}
                  {selectedTrack.bpm ? ` · ${selectedTrack.bpm} BPM` : ""}
                </p>
              </div>
            ) : (
              <span className="text-xs text-white/35">Choose a music track</span>
            )}
          </div>
          <ChevronRight
            className={`w-4 h-4 text-white/20 flex-shrink-0 transition-transform ${
              showTracks ? "rotate-90" : ""
            }`}
          />
        </button>

        <AnimatePresence>
          {showTracks && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden flex-1 min-h-0"
            >
              <div className="flex flex-col gap-1.5 p-1.5 rounded-2xl bg-black/40 border border-white/8 max-h-52">
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search tracks…"
                  className="w-full bg-white/5 border border-white/10 text-white placeholder-white/30 rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-white/20 flex-shrink-0"
                />
                <div className="overflow-y-auto flex-1 space-y-0.5 pr-0.5">
                  {filteredTracks.length === 0 ? (
                    <p className="text-xs text-white/25 text-center py-4">
                      {tracks.length === 0
                        ? "No tracks uploaded yet"
                        : "No results"}
                    </p>
                  ) : (
                    filteredTracks.map((track) => (
                      <div
                        key={track.id}
                        className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl transition-colors cursor-pointer ${
                          selectedTrack?.id === track.id
                            ? "bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-400/30"
                            : "hover:bg-white/5"
                        }`}
                        onClick={() => {
                          onSelectTrack(track);
                          if (track.clips.length === 1) {
                            onSelectClip(track.clips[0]);
                          } else {
                            onSelectClip(null);
                          }
                          setShowTracks(false);
                          setSearch("");
                        }}
                      >
                        <div className="w-8 h-8 rounded-lg overflow-hidden border border-white/10 flex-shrink-0 bg-black/50">
                          {track.albumArtUrl ? (
                            <img
                              src={track.albumArtUrl}
                              alt={track.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Music className="w-3 h-3 text-white/20" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-white truncate">
                            {track.title}
                          </p>
                          <p className="text-[10px] text-white/40 truncate">
                            {track.artist}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 space-y-0.5">
                          {track.bpm && (
                            <p className="text-[10px] text-cyan-400">
                              {track.bpm} BPM
                            </p>
                          )}
                          <p className="text-[10px] text-white/30">
                            {track.clips.length} clip
                            {track.clips.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                        {track.clips.length > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              const clipUrl = track.clips[0].audioUrl;
                              if (previewTrackId === track.id) {
                                audioRef.current?.pause();
                                setPreviewTrackId(null);
                              } else {
                                if (audioRef.current)
                                  audioRef.current.pause();
                                const audio = new Audio(clipUrl);
                                audioRef.current = audio;
                                audio.play();
                                audio.onended = () =>
                                  setPreviewTrackId(null);
                                setPreviewTrackId(track.id);
                              }
                            }}
                            className={`flex-shrink-0 w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                              previewTrackId === track.id
                                ? "bg-pink-500/30 border-pink-400/50 text-pink-300"
                                : "bg-white/5 border-white/15 text-white/40 hover:bg-white/10 hover:text-white/70"
                            }`}
                          >
                            {previewTrackId === track.id ? (
                              <svg
                                className="w-2.5 h-2.5"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            ) : (
                              <svg
                                className="w-2.5 h-2.5 ml-px"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            )}
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {selectedTrack && selectedTrack.clips.length > 1 && (
          <div className="space-y-1">
            <p className="text-[9px] text-white/40 font-medium uppercase tracking-wider">
              Choose a clip
            </p>
            <div className="space-y-0.5">
              {selectedTrack.clips.map((clip) => (
                <button
                  key={clip._id}
                  onClick={() => onSelectClip(clip)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                    selectedClip?._id === clip._id
                      ? "bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-400/30"
                      : "bg-white/5 border border-white/8 hover:bg-white/8"
                  }`}
                >
                  <span className="text-xs text-white">
                    {clip.label || "Untitled clip"}
                  </span>
                  {clip.duration && (
                    <span className="text-[10px] text-white/35">
                      {clip.duration}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Lyric style picker */}
      {selectedClip && (
        <div className="pt-1">
          <LyricStylePicker
            selectedStyle={lyricStyle}
            selectedPosition={lyricPosition}
            onStyleChange={onLyricStyleChange}
            onPositionChange={onLyricPositionChange}
            hasLyrics={(selectedClip?.lyrics?.length ?? 0) > 0}
          />
        </div>
      )}

      {stitchError && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-400 text-center px-2"
        >
          {stitchError}
        </motion.p>
      )}

      {/* 9:16 Portrait badge */}
      <span className="text-[9px] text-white/35 text-center">
        📐 9:16 Portrait — optimized for TikTok
      </span>

      {/* Stitch button */}
      <motion.button
        whileTap={{ scale: 0.97 }}
        onClick={onStitch}
        disabled={!readyToStitch || stitching}
        className={`w-full py-4 rounded-2xl font-black text-sm tracking-wider flex items-center justify-center gap-2 transition-all duration-200 ${
          readyToStitch && !stitching
            ? "bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 text-white shadow-[0_8px_32px_rgba(217,70,239,.45)] hover:shadow-[0_14px_48px_rgba(217,70,239,.6)]"
            : "bg-white/4 text-white/20 cursor-not-allowed border border-white/8"
        }`}
      >
        {stitching ? (
          <>
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
            />
            Stitching… (up to 2 min)
          </>
        ) : !slots.every(Boolean) ? (
          <>
            <Lock className="w-4 h-4" /> Fill all 3 acts
          </>
        ) : !selectedTrack ? (
          <>
            <Music className="w-4 h-4" /> Pick a track
          </>
        ) : !selectedClip ? (
          <>
            <Music className="w-4 h-4" /> Pick a clip
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4" /> Stitch · Export
          </>
        )}
      </motion.button>
    </div>
  );
}

// ─── Render Card ──────────────────────────────────────────────────────────────
function PamsRenderCard({
  video,
  onDelete,
  isAdmin,
  uploadState,
  onUpload,
}: {
  video: FinalVideoItem;
  onDelete: (id: string) => void;
  isAdmin?: boolean;
  uploadState?: "idle" | "loading" | "success" | "error";
  onUpload?: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (playing) {
      v.pause();
      setPlaying(false);
    } else {
      v.muted = false;
      v.volume = 1;
      v.play();
      setPlaying(true);
    }
  };

  return (
    <div className="rounded-xl overflow-hidden border border-white/10 bg-black/50 group">
      <div className="relative aspect-[9/16] cursor-pointer" onClick={togglePlay}>
        <video
          ref={videoRef}
          src={video.videoUrl}
          className="w-full h-full object-cover"
          playsInline
          muted
          loop
        />
        {!playing ? (
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <div className="w-10 h-10 rounded-full bg-black/60 border border-white/30 flex items-center justify-center">
              <svg
                className="w-4 h-4 text-white ml-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center bg-black/20">
            <div className="w-8 h-8 rounded-full bg-black/60 border border-white/20 flex items-center justify-center">
              <svg
                className="w-3 h-3 text-white"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
          </div>
        )}
        {/* Square badge */}
        <div className="absolute top-1.5 left-1.5">
          <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-black/70 border border-white/15 text-white/60">
            1:1
          </span>
        </div>
        {/* Delete */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(video.id);
          }}
          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/70 border border-white/15 flex items-center justify-center text-white/50 hover:text-red-400 hover:border-red-400/40 hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
        >
          <svg
            className="w-3 h-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
      <div className="p-1.5 space-y-1">
        {isAdmin && (
          <button
            onClick={() => onUpload?.()}
            disabled={uploadState === "loading" || uploadState === "success"}
            className={`w-full flex items-center justify-center gap-1 py-1.5 rounded-lg text-[9px] font-bold transition-all ${
              uploadState === "success"
                ? "bg-green-500/20 border border-green-400/30 text-green-400 cursor-default"
                : uploadState === "error"
                ? "bg-red-500/20 border border-red-400/30 text-red-400 hover:bg-red-500/30"
                : uploadState === "loading"
                ? "bg-white/5 border border-white/10 text-white/40 cursor-wait"
                : "bg-gradient-to-r from-pink-500/20 to-violet-500/20 border border-pink-400/30 text-pink-300 hover:brightness-110"
            }`}
          >
            {uploadState === "loading" ? (
              <>
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-2.5 h-2.5 border border-white/30 border-t-white rounded-full"
                />
                Uploading…
              </>
            ) : uploadState === "success" ? (
              <>✓ In Library</>
            ) : uploadState === "error" ? (
              <>⚠ Retry Upload</>
            ) : (
              <>↑ Upload to Library</>
            )}
          </button>
        )}
        <a
          href={video.videoUrl}
          download="pams-dance.mp4"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center justify-center gap-1 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/45 text-[9px] hover:bg-white/10 hover:text-white/65 transition-colors"
        >
          ↓ Download
        </a>
      </div>
    </div>
  );
}

// ─── Render Library ───────────────────────────────────────────────────────────
function PamsRenderLibrary({
  finalVideos,
  stitching,
  stitchStage,
  stitchProgressPct,
  stitchError,
  finalVideoStatus,
  onDelete,
  isAdmin,
  uploadStates,
  onUpload,
}: {
  finalVideos: FinalVideoItem[];
  stitching: boolean;
  stitchStage: StitchStage;
  stitchProgressPct: number;
  stitchError: string | null;
  finalVideoStatus: string;
  onDelete: (id: string) => void;
  isAdmin?: boolean;
  uploadStates?: Record<string, "idle" | "loading" | "success" | "error">;
  onUpload?: (id: string) => void;
}) {
  return (
    <div className="relative z-10 flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
      {stitching && (
        <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white">
              Rendering your video…
            </h3>
            <span className="text-xs text-white/40">
              {Math.round(stitchProgressPct)}%
            </span>
          </div>

          <div className="relative h-2 rounded-full bg-white/10 overflow-hidden">
            <motion.div
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500"
              initial={{ width: "0%" }}
              animate={{ width: `${stitchProgressPct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
            <motion.div
              className="absolute inset-y-0 w-20 bg-gradient-to-r from-transparent via-white/20 to-transparent"
              animate={{ x: ["-80px", "400px"] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          </div>

          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-3 h-3 border-2 border-pink-400/40 border-t-pink-400 rounded-full flex-shrink-0"
            />
            <p className="text-xs text-white/50">{STAGE_LABELS[stitchStage]}</p>
          </div>

          {/* Stage pills — no lipsync stage */}
          <div className="flex gap-2">
            {(["stitching", "uploading"] as const).map((stage) => {
              const order = ["stitching", "uploading", "completed"];
              const curIdx = order.indexOf(stitchStage);
              const stageIdx = order.indexOf(stage);
              const isDone = curIdx > stageIdx;
              const isActive = curIdx === stageIdx;
              return (
                <div
                  key={stage}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-semibold border transition-colors ${
                    isDone
                      ? "bg-green-500/20 border-green-400/30 text-green-400"
                      : isActive
                      ? "bg-pink-500/20 border-pink-400/30 text-pink-300"
                      : "bg-white/5 border-white/10 text-white/25"
                  }`}
                >
                  {isDone ? "✓" : isActive ? "●" : "○"}
                  {stage === "stitching" ? "Beat Edit" : "Upload"}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {finalVideoStatus === "failed" && stitchError && (
        <div className="rounded-2xl bg-red-500/10 border border-red-400/20 px-4 py-3">
          <p className="text-sm text-red-400">{stitchError}</p>
          <p className="text-xs text-white/30 mt-1">Credits have been refunded.</p>
        </div>
      )}

      {/* SONIQ Points info */}
      <div className="rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl p-5 space-y-3">
        <h3 className="text-xs font-bold text-white/60 uppercase tracking-[0.18em]">
          Earn $SONIQ Points
        </h3>
        <div className="space-y-2">
          {[
            { emoji: "🎬", label: "Generate a scene", points: "+1 $SONIQ" },
            {
              emoji: "🎞️",
              label: "Create a final render",
              points: "+5 $SONIQ",
            },
            { emoji: "𝕏", label: "Share to X (Twitter)", points: "+20 $SONIQ" },
            { emoji: "❤️", label: "Video gets a like", points: "+2 $SONIQ each" },
            { emoji: "🔁", label: "Video gets a share", points: "+5 $SONIQ each" },
            {
              emoji: "💬",
              label: "Video gets a comment",
              points: "+3 $SONIQ each",
            },
          ].map((item) => (
            <div key={item.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm">{item.emoji}</span>
                <span className="text-xs text-white/50">{item.label}</span>
              </div>
              <span className="text-xs font-bold text-amber-400">
                {item.points}
              </span>
            </div>
          ))}
        </div>
      </div>

      {finalVideos.length === 0 && !stitching ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <p className="text-white/20 text-sm">No renders yet</p>
          <p className="text-white/15 text-xs text-center px-8">
            Fill the Edit Suite with 3 scenes, pick a track, and hit Stitch
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
          {finalVideos.map((video) => (
            <PamsRenderCard
              key={video.id}
              video={video}
              onDelete={onDelete}
              isAdmin={isAdmin}
              uploadState={uploadStates?.[video.id] ?? "idle"}
              onUpload={() => onUpload?.(video.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Unlock Banner ────────────────────────────────────────────────────────────
function UnlockBanner() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500/10 to-yellow-400/6 border border-amber-400/20">
      <Star className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
      <div>
        <p className="text-xs font-bold text-amber-300 leading-none">
          Share to X → earn $SONIQ points
        </p>
        <p className="text-[9px] text-white/30 mt-0.5">
          Post your video to stack points and climb the ranks
        </p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function PamsDanceStudioPage() {
  // Wallet state
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [correctChain, setCorrectChain] = useState(false);
  const [pamsNFTs, setPamsNFTs] = useState<PamsNFT[]>([]);
  const [loadingWallet, setLoadingWallet] = useState(false);
  const [selectedNFT, setSelectedNFT] = useState<PamsNFT | null>(null);

  // Studio state
  const [credits, setCredits] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [scenes, setScenes] = useState<PamsScene[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [selectedVibe, setSelectedVibe] = useState<string | null>(null);
  const [slots, setSlots] = useState<(PamsScene | null)[]>([null, null, null]);
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null);
  const [tracks, setTracks] = useState<Track[]>([]);
  const [stitching, setStitching] = useState(false);
  const [stitchError, setStitchError] = useState<string | null>(null);
  const [finalVideoId, setFinalVideoId] = useState<string | null>(null);
  const [finalVideoUrl, setFinalVideoUrl] = useState<string | null>(null);
  const [finalVideoStatus, setFinalVideoStatus] = useState<
    "idle" | "processing" | "completed" | "failed"
  >("idle");
  const [activeTab, setActiveTab] = useState<"studio" | "library">("studio");
  const [finalVideos, setFinalVideos] = useState<FinalVideoItem[]>([]);
  const [stitchStage, setStitchStage] = useState<StitchStage>("idle");
  const [stitchProgressPct, setStitchProgressPct] = useState(0);
  const [transitions, setTransitions] = useState<TransitionValue[]>([
    "fade",
    "fade",
  ]);
  const [lyricStyle, setLyricStyle]       = useState<LyricStyleId>("none");
  const [lyricPosition, setLyricPosition] = useState<LyricPosition>("bottom");
  const [extendSource, setExtendSource] = useState<PamsScene | null>(null);
  // Intro scene state
  const [introScenes, setIntroScenes]       = useState<IntroScene[]>([]);
  const [introSlot, setIntroSlot]           = useState<IntroScene | null>(null);
  const [introTransition, setIntroTransition] = useState<TransitionValue>("fade");
  // Custom character image state
  const [customImages, setCustomImages]               = useState<CustomCharacterImage[]>([]);
  const [imageSrcTab, setImageSrcTab]                 = useState<"nfts" | "custom">("nfts");
  const [selectedCustomImage, setSelectedCustomImage] = useState<CustomCharacterImage | null>(null);

  // Outro scene state
  const [outroScenes, setOutroScenes]       = useState<OutroScene[]>([]);
  const [outroSlot, setOutroSlot]           = useState<OutroScene | null>(null);
  const [outroTransition, setOutroTransition] = useState<TransitionValue>("fade");
  const [uploadStates, setUploadStates] = useState<Record<string, "idle" | "loading" | "success" | "error">>({});

  // ── Fetch admin-curated intro scenes (no auth needed) ──────────────────
  useEffect(() => {
    const token = localStorage.getItem("sq_token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/pams-studio/intro-scenes`, {
      headers: token ? { Authorization: "Bearer " + token } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.introScenes) {
          setIntroScenes(d.introScenes.map((s: any) => ({ ...s, id: s._id || s.id })));
        }
      })
      .catch(() => {}); // silently ignore — intro section just stays empty
  }, []);

  // ── Fetch admin-uploaded custom character images ─────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("sq_token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/pams-studio/custom-images`, {
      headers: token ? { Authorization: "Bearer " + token } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.customImages) {
          setCustomImages(d.customImages.map((s: any) => ({ ...s, id: s._id || s.id })));
        }
      })
      .catch(() => {});
  }, []);

  // ── Fetch admin-curated outro scenes ─────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("sq_token");
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/pams-studio/outro-scenes`, {
      headers: token ? { Authorization: "Bearer " + token } : {},
    })
      .then((r) => r.json())
      .then((d) => {
        if (d.outroScenes) {
          setOutroScenes(d.outroScenes.map((s: any) => ({ ...s, id: s._id || s.id })));
        }
      })
      .catch(() => {});
  }, []);

  // ── Helper: fetch scenes and finals — wallet-first identity ────────────
  const loadScenesAndFinals = (addr?: string) => {
    const token = localStorage.getItem("sq_token");
    // Prefer explicit addr param, then current state, then nothing.
    const wallet = (addr ?? walletAddress ?? "").toLowerCase() || undefined;

    // At least one identity must be present to fetch history.
    if (!token && !wallet) return;

    const authHeaders: Record<string, string> = {};
    if (token) authHeaders["Authorization"] = "Bearer " + token;
    if (wallet) authHeaders["X-Wallet-Address"] = wallet;

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/pams-studio/scenes`, {
      headers: authHeaders,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.scenes?.length) {
          const loaded: PamsScene[] = data.scenes.map((s: any) => ({
            id: s.id,
            tokenId: s.tokenId,
            nftImageUrl: s.nftImageUrl,
            vibeId: s.vibeId,
            vibe: VIBES.find((v) => v.id === s.vibeId) ?? VIBES[0],
            thumbnail: s.nftImageUrl,
            videoUrl: s.videoUrl,
            duration: s.duration,
          }));
          setScenes(loaded);
        }
      })
      .catch((err) => {
        console.warn("Failed to load PaMs scenes:", err);
      });

    fetch(`${process.env.NEXT_PUBLIC_API_URL}/pams-studio/finals`, {
      headers: authHeaders,
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.finals?.length) setFinalVideos(data.finals);
      })
      .catch(() => {});
  };

  // ── Wallet: load user info + tracks on mount ─────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("sq_token");
    if (token) {
      const storedUser = localStorage.getItem("sq_user");
      if (storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          setIsAdmin(parsed.isAdmin === true);
        } catch {}
      }
      // Fetch credits
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/studio/characters`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.credits != null) setCredits(data.credits);
        })
        .catch(() => {});

      // Load scenes and finals
      loadScenesAndFinals();
    }

    // Fetch tracks
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/tracks`)
      .then((r) => r.json())
      .then((data) => {
        if (data.tracks?.length) {
          setTracks(
            data.tracks.map((t: any) => ({
              id: t._id,
              title: t.title,
              artist: t.artist,
              albumArtUrl: t.albumArtUrl ?? null,
              clips: (t.clips ?? [])
                .slice()
                .sort((a: any, b: any) => a.sortOrder - b.sortOrder),
              bpm: t.bpm ?? null,
            }))
          );
        }
      })
      .catch(() => {});
  }, []);

  // ── Wallet: load NFTs when connected to correct chain ────────────────────
  useEffect(() => {
    if (walletConnected && correctChain && walletAddress && (window as any).ethereum) {
      const provider = new BrowserProvider((window as any).ethereum);
      loadPamsNFTs(provider, walletAddress);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletConnected, correctChain, walletAddress]);

  // ── Wallet event listeners — update state only, never reload ─────────────
  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (isGenerating) return; // don't interrupt an in-flight generation
      if (accounts.length === 0) {
        setWalletConnected(false);
        setWalletAddress("");
        setPamsNFTs([]);
      } else if (accounts[0] !== walletAddress) {
        setWalletAddress(accounts[0]);
      }
    };

    const handleChainChanged = (chainId: string) => {
      const isCorrect = parseInt(chainId, 16) === CHAIN_ID;
      setCorrectChain(isCorrect);
      // Do NOT call window.location.reload() — update state only
    };

    eth.on("accountsChanged", handleAccountsChanged);
    eth.on("chainChanged", handleChainChanged);

    return () => {
      eth.removeListener("accountsChanged", handleAccountsChanged);
      eth.removeListener("chainChanged", handleChainChanged);
    };
  }, [walletAddress, isGenerating]);

  // ── Load PaMs NFTs ────────────────────────────────────────────────────────
  const loadPamsNFTs = async (provider: BrowserProvider, address: string) => {
    setLoadingWallet(true);
    try {
      const pamsContract = new Contract(PAMS_CONTRACT_ADDRESS, PAMS_ABI, provider);
      const balance = Number(await pamsContract.balanceOf(address));
      if (balance === 0) {
        setPamsNFTs([]);
        return;
      }

      const transferFilter = pamsContract.filters.Transfer(null, address);
      const events = await pamsContract.queryFilter(transferFilter);
      const candidateIds = [
        ...new Set(events.map((e: any) => Number(e.args.tokenId))),
      ];

      const ownerResults = await Promise.all(
        candidateIds.map((id) =>
          pamsContract
            .ownerOf(id)
            .then((owner: string) =>
              owner.toLowerCase() === address.toLowerCase() ? id : null
            )
            .catch(() => null)
        )
      );
      const tokenIds = ownerResults.filter(
        (id): id is number => id !== null
      );

      // Resolve images from OpenSea, falling back to tokenURI
      const apiKey = process.env.NEXT_PUBLIC_OPENSEA_API_KEY || "";
      if (!apiKey) {
        console.warn("NEXT_PUBLIC_OPENSEA_API_KEY is not configured — falling back to tokenURI for NFT images.");
      }
      const nfts = await Promise.all(
        tokenIds.map(async (tokenId) => {
          try {
            if (apiKey) {
              const res = await fetch(
                `https://api.opensea.io/api/v2/chain/ethereum/contract/${PAMS_CONTRACT_ADDRESS}/nfts/${tokenId}`,
                { headers: { "X-API-KEY": apiKey } }
              );
              if (res.ok) {
                const data = await res.json();
                const imageUrl =
                  data.nft?.image_url || data.nft?.display_image_url || "";
                if (imageUrl) {
                  return {
                    tokenId,
                    imageUrl,
                    name: data.nft?.name || `PaM #${tokenId}`,
                  };
                }
              }
            }
            // Fallback: tokenURI
            const uri: string = await pamsContract.tokenURI(tokenId);
            const metaUrl = uri.startsWith("ipfs://")
              ? uri.replace("ipfs://", "https://ipfs.io/ipfs/")
              : uri;
            const metaRes = await fetch(metaUrl);
            const meta = await metaRes.json();
            const imageUrl = meta.image
              ? meta.image.replace("ipfs://", "https://ipfs.io/ipfs/")
              : "";
            return {
              tokenId,
              imageUrl,
              name: meta.name || `PaM #${tokenId}`,
            };
          } catch {
            return { tokenId, imageUrl: "", name: `PaM #${tokenId}` };
          }
        })
      );

      setPamsNFTs(nfts.filter((n) => n.imageUrl));
    } catch (err) {
      console.error("Failed to load PaMs NFTs:", err);
    } finally {
      setLoadingWallet(false);
    }
  };

  // ── Wallet connection ────────────────────────────────────────────────────
  const connectWallet = async () => {
    if (!(window as any).ethereum) {
      alert("Please install MetaMask to connect your wallet.");
      return;
    }
    try {
      setLoadingWallet(true);
      const provider = new BrowserProvider((window as any).ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      setWalletAddress(address);
      setWalletConnected(true);
      setCorrectChain(Number(network.chainId) === CHAIN_ID);
      loadScenesAndFinals(address);
    } catch (err) {
      console.error("Wallet connect error:", err);
    } finally {
      setLoadingWallet(false);
    }
  };

  const switchNetwork = async () => {
    try {
      await (window as any).ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: `0x${CHAIN_ID.toString(16)}` }],
      });
      setCorrectChain(true);
    } catch (err) {
      console.error("Network switch error:", err);
    }
  };

  // ── Generate ─────────────────────────────────────────────────────────────
  const handleGenerate = async (vibe: DanceVibe) => {
    // In extend mode, use the NFT from the source scene
    // Otherwise require an explicitly selected NFT
    const nftToUse = selectedNFT ?? (extendSource
      ? { tokenId: extendSource.tokenId, imageUrl: extendSource.nftImageUrl }
      : null);

    if (!nftToUse) return;
    setIsGenerating(true);
    setGenerateError(null);

    const token = localStorage.getItem("sq_token");
    const wallet = walletAddress.toLowerCase() || undefined;
    if (!token && !wallet) {
      setIsGenerating(false);
      return;
    }

    const authHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (token) authHeaders["Authorization"] = "Bearer " + token;
    if (wallet) authHeaders["X-Wallet-Address"] = wallet;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/pams-studio/generate`,
        {
          method: "POST",
          signal: AbortSignal.timeout(GENERATION_TIMEOUT_MS),
          headers: authHeaders,
          body: JSON.stringify({
            tokenId: nftToUse.tokenId,
            nftImageUrl: nftToUse.imageUrl,
            vibeId: vibe.id,
            ...(wallet && { walletAddress: wallet }),
            ...(extendSource?.videoUrl && { lastFrameUrl: extendSource.videoUrl }),
          }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 402) {
          setGenerateError(
            `Not enough credits. You have ${data.credits ?? 0} credit${
              (data.credits ?? 0) === 1 ? "" : "s"
            }.`
          );
        } else {
          setGenerateError(data.error || "Generation failed. Please try again.");
        }
        return;
      }

      setScenes((prev) => [
        {
          id: data.scene.id,
          tokenId: data.scene.tokenId,
          nftImageUrl: data.scene.nftImageUrl,
          vibe,
          vibeId: vibe.id,
          thumbnail: data.scene.nftImageUrl,
          videoUrl: data.scene.videoUrl,
          duration: data.scene.duration,
        },
        ...prev,
      ]);

      setExtendSource(null);
      setCredits((prev) => Math.max(0, prev - 1));
    } catch (err: any) {
      if (err?.name === "AbortError" || err?.name === "TimeoutError") {
        // Request was cancelled by navigation or timeout — the backend may have
        // completed successfully. Silently reload scenes to pick up any result.
        loadScenesAndFinals();
      } else {
        console.error("Generation error:", err);
        setGenerateError("Connection error. Please try again.");
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Poll final video ──────────────────────────────────────────────────────
  const pollFinalVideo = async (id: string, token: string | null, wallet?: string) => {
    const startTime = Date.now();
    const maxMs = POLLING_TIMEOUT_MS;
    setActiveTab("library");
    const pollHeaders: Record<string, string> = {};
    if (token) pollHeaders["Authorization"] = "Bearer " + token;
    if (wallet) pollHeaders["X-Wallet-Address"] = wallet;


    const getStageAndPct = (
      elapsedMs: number
    ): { stage: StitchStage; pct: number } => {
      if (elapsedMs < 25000)
        return {
          stage: "stitching",
          pct: Math.min(20, (elapsedMs / 25000) * 20),
        };
      return {
        stage: "uploading",
        pct: Math.min(95, 20 + ((elapsedMs - 25000) / 35000) * 75),
      };
    };

    const poll = async () => {
      const elapsed = Date.now() - startTime;
      const { stage, pct } = getStageAndPct(elapsed);
      setStitchStage(stage);
      setStitchProgressPct(pct);

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/pams-studio/final/${id}`,
          { headers: pollHeaders }
        );
        const data = await res.json();

        if (data.status === "completed" && data.videoUrl) {
          setStitchStage("completed");
          setStitchProgressPct(100);
          setFinalVideoUrl(data.videoUrl);
          setFinalVideoStatus("completed");
          setStitching(false);
          setFinalVideos((prev) => [
            {
              id,
              videoUrl: data.videoUrl,
              createdAt: new Date().toISOString(),
            },
            ...prev,
          ]);
          return;
        }
        if (data.status === "failed") {
          setStitchStage("failed");
          setStitchError(data.error || "Processing failed");
          setFinalVideoStatus("failed");
          setStitching(false);
          return;
        }
        if (elapsed >= maxMs) {
          setStitchStage("failed");
          setStitchError("Timed out. Try again.");
          setFinalVideoStatus("failed");
          setStitching(false);
          return;
        }
        setTimeout(poll, 5000);
      } catch {
        setStitchStage("failed");
        setStitchError("Connection lost");
        setFinalVideoStatus("failed");
        setStitching(false);
      }
    };

    setTimeout(poll, 5000);
  };

  // ── Stitch ────────────────────────────────────────────────────────────────
  const handleStitch = async () => {
    const filledSlots = slots.filter(Boolean) as PamsScene[];
    if (filledSlots.length !== 3 || !selectedClip) return;

    setStitching(true);
    setStitchError(null);
    setFinalVideoUrl(null);
    setFinalVideoStatus("processing");

    const token = localStorage.getItem("sq_token");
    const wallet = walletAddress.toLowerCase() || undefined;
    if (!token && !wallet) {
      setStitching(false);
      return;
    }

    const stitchAuthHeaders: Record<string, string> = { "Content-Type": "application/json" };
    if (token) stitchAuthHeaders["Authorization"] = "Bearer " + token;
    if (wallet) stitchAuthHeaders["X-Wallet-Address"] = wallet;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/pams-studio/stitch`,
        {
          method: "POST",
          headers: stitchAuthHeaders,
          body: JSON.stringify({
            sceneIds: filledSlots.map((s) => s.id),
            trackId: selectedTrack!.id,
            clipId: selectedClip._id,
            audioUrl: selectedClip.audioUrl,
            bpm: selectedTrack!.bpm ?? null,
            transitions,
            lyricStyle,
            lyricPosition,
            ...(introSlot && { introSceneId: introSlot.id }),
            ...(introSlot && { introTransition }),
            ...(outroSlot && { outroSceneId: outroSlot.id }),
            ...(outroSlot && { outroTransition }),
            ...(wallet && { walletAddress: wallet }),
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setStitchError(data.error || "Failed to start stitching");
        setFinalVideoStatus("failed");
        setStitching(false);
        return;
      }

      setFinalVideoId(data.finalVideoId);
      pollFinalVideo(data.finalVideoId, token ?? null, wallet);
    } catch (err) {
      setStitchError("Connection error. Please try again.");
      setFinalVideoStatus("failed");
      setStitching(false);
    }
  };

  // Generate an AI dance video from a custom image + selected vibe.
  // Reuses the same WaveSpeed/Seedance pipeline as NFT scene generation.
  const handleGenerateCustomScene = async (image: CustomCharacterImage, vibeId: string) => {
    setIsGenerating(true);
    setGenerateError(null);
    try {
      const token = localStorage.getItem("sq_token");
      const res   = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/pams-studio/custom-images/${image.id}/generate`,
        {
          method:  "POST",
          headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
          body:    JSON.stringify({ vibeId }),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Generation failed");

      const newScene: PamsScene = {
        ...data.scene,
        id:  data.scene._id || data.scene.id,
        _id: data.scene._id || data.scene.id,
        vibe: VIBES.find((v) => v.id === vibeId) ?? VIBES[0],
      };
      setScenes((prev) => [newScene, ...prev]);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setGenerateError(e?.message || "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateForPicker = (vibe: DanceVibe) => {
    if (imageSrcTab === "custom" && selectedCustomImage) { handleGenerateCustomScene(selectedCustomImage, vibe.id); } else { handleGenerate(vibe); }
  };

  const handleDrop = (scene: PamsScene, slot: SlotIndex) => {
    setSlots((prev) => {
      const n = [...prev];
      n[slot] = scene;
      return n;
    });
  };

  const handleRemove = (slot: SlotIndex) => {
    setSlots((prev) => {
      const n = [...prev];
      n[slot] = null;
      return n;
    });
  };

  const handleDelete = async (scene: PamsScene) => {
    const token = localStorage.getItem("sq_token");
    const wallet = walletAddress.toLowerCase() || undefined;
    if (!token && !wallet) return;
    const deleteHeaders: Record<string, string> = {};
    if (token) deleteHeaders["Authorization"] = "Bearer " + token;
    if (wallet) deleteHeaders["X-Wallet-Address"] = wallet;
    setScenes((prev) => prev.filter((s) => s.id !== scene.id));
    setSlots(
      (prev) =>
        prev.map((s) => (s?.id === scene.id ? null : s)) as (PamsScene | null)[]
    );

    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/pams-studio/scenes/${scene.id}`,
        {
          method: "DELETE",
          headers: deleteHeaders,
        }
      );
    } catch (err) {
      console.error("Delete error:", err);
      setScenes((prev) => [scene, ...prev]);
    }
  };

  const handleExtend = (scene: PamsScene) => {
    setExtendSource(scene);
  };

  const handleClearExtend = () => {
    setExtendSource(null);
  };

  const handleDeleteFinal = async (id: string) => {
    const token = localStorage.getItem("sq_token");
    const wallet = walletAddress.toLowerCase() || undefined;
    if (!token && !wallet) return;
    const deleteFinalHeaders: Record<string, string> = {};
    if (token) deleteFinalHeaders["Authorization"] = "Bearer " + token;
    if (wallet) deleteFinalHeaders["X-Wallet-Address"] = wallet;
    setFinalVideos((prev) => prev.filter((v) => v.id !== id));

    try {
      await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/pams-studio/finals/${id}`,
        {
          method: "DELETE",
          headers: deleteFinalHeaders,
        }
      );
    } catch (err) {
      console.error("Delete final failed:", err);
    }
  };

  // ── Upload render to media library (reuses existing saveMemeData pipeline) ──
  const handleUploadToLibrary = async (finalVideoId: string) => {
    const token = localStorage.getItem("sq_token");
    const userRaw = localStorage.getItem("sq_user");
    if (!token) return;

    setUploadStates((prev) => ({ ...prev, [finalVideoId]: "loading" }));

    const video = finalVideos.find((v) => v.id === finalVideoId);
    if (!video) {
      setUploadStates((prev) => ({ ...prev, [finalVideoId]: "error" }));
      return;
    }

    let userId = "";
    try {
      userId = userRaw ? JSON.parse(userRaw)?.id ?? "" : "";
    } catch {}

    try {
      // Reuse the existing saveMemeData endpoint which runs the full AI
      // ingestion pipeline: Video Intelligence → captions → embeddings
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/media/saveMemeData`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId,
            imageUrl:           video.videoUrl,   // saveMemeData accepts video URLs
            caption:            "PaMs Dance Studio render",
            mediaType:          "video",
            cloudinaryPublicId: null,             // already in Cloudinary
          }),
        }
      );

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        console.error("Upload to library failed:", data);
        setUploadStates((prev) => ({ ...prev, [finalVideoId]: "error" }));
        return;
      }

      setUploadStates((prev) => ({ ...prev, [finalVideoId]: "success" }));
      setFinalVideos((prev) =>
        prev.map((v) =>
          v.id === finalVideoId ? { ...v, uploadedToLibrary: true } : v
        )
      );
    } catch (err) {
      console.error("Upload to library error:", err);
      setUploadStates((prev) => ({ ...prev, [finalVideoId]: "error" }));
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen bg-gradient-to-br from-black via-gray-900 to-black relative overflow-hidden flex flex-col">
      {/* Animated background */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: `
            radial-gradient(circle at 20% 80%, rgba(255, 107, 157, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, rgba(18, 194, 233, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, rgba(196, 113, 237, 0.08) 0%, transparent 50%)
          `,
        }}
      />

      {/* Corner frame borders */}
      <div className="pointer-events-none absolute inset-0 z-0">
        <div className="absolute top-0 left-0 w-20 h-20 border-l-4 border-t-4 border-cyan-400/60 rounded-tl-3xl" />
        <div className="absolute top-0 right-0 w-20 h-20 border-r-4 border-t-4 border-pink-400/60 rounded-tr-3xl" />
        <div className="absolute bottom-0 left-0 w-20 h-20 border-l-4 border-b-4 border-purple-400/60 rounded-bl-3xl" />
        <div className="absolute bottom-0 right-0 w-20 h-20 border-r-4 border-b-4 border-orange-400/60 rounded-br-3xl" />
        <div className="absolute top-20 left-0 bottom-20 w-0.5 bg-gradient-to-b from-cyan-400/30 to-purple-400/30" />
        <div className="absolute top-20 right-0 bottom-20 w-0.5 bg-gradient-to-b from-pink-400/30 to-orange-400/30" />
        <div className="absolute top-0 left-20 right-20 h-0.5 bg-gradient-to-r from-cyan-400/30 via-pink-400/30 to-orange-400/30" />
        <div className="absolute bottom-0 left-20 right-20 h-0.5 bg-gradient-to-r from-purple-400/30 via-pink-400/30 to-orange-400/30" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div>
          <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-pink-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
            PaMs Dance Studio
          </h1>
          <p className="text-xs text-white/30 mt-0.5">
            Connect · Generate · Share
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-1 p-1 rounded-2xl bg-white/5 border border-white/10">
          {(["studio", "library"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-xl text-xs font-bold capitalize transition-all ${
                activeTab === tab
                  ? "bg-gradient-to-r from-pink-500/40 to-purple-500/40 text-white border border-pink-400/30"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              {tab === "studio" ? "Studio" : "Render Library"}
              {tab === "library" && finalVideos.length > 0 && (
                <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full bg-pink-500/30 text-pink-300">
                  {finalVideos.length}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <UnlockBanner />
          <CreditsBar credits={credits} isAdmin={isAdmin} />
        </div>
      </div>

      {/* 3-column layout or Render Library */}
      {activeTab === "studio" ? (
        <div className="relative z-10 flex-1 min-h-0 grid grid-cols-[260px_1fr_460px] gap-3 p-3">
          {/* Left: NFT Picker + Vibe Generator */}
          <div className="flex flex-col p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl overflow-hidden">
            <PamsNFTPicker
              nfts={pamsNFTs}
              loading={loadingWallet}
              walletConnected={walletConnected}
              correctChain={correctChain}
              selectedNFT={selectedNFT}
              onSelectNFT={setSelectedNFT}
              onConnect={connectWallet}
              onSwitch={switchNetwork}
              selectedVibe={selectedVibe}
              onSelectVibe={setSelectedVibe}
              isGenerating={isGenerating}
              generateError={generateError}
              onGenerate={handleGenerate}
              isAdmin={isAdmin}
              extendSource={extendSource}
              onClearExtend={handleClearExtend}
              customImages={customImages}
              selectedCustomImage={selectedCustomImage}
              onSelectCustomImage={setSelectedCustomImage}
              imageSrcTab={imageSrcTab}
              onImageSrcTabChange={setImageSrcTab}
              onGenerate={handleGenerateForPicker}
            />
          </div>

          {/* Middle: Intro · Library (NFT / Custom toggle) · Outro */}
          <div className="relative rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden">
            {/* Intro section */}
            <div className="flex-shrink-0 p-3 border-b border-white/8">
              <PamsIntroSceneLibrary
                introScenes={introScenes}
                selectedIntro={introSlot}
                onSelect={setIntroSlot}
              />
            </div>

            {/* Scene library — toggle lives inside PamsSceneLibrary's header */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3">
              <PamsSceneLibrary
                scenes={scenes}
                onDrop={handleDrop}
                slots={slots as (PamsScene | null)[]}
                onDelete={handleDelete}
                onExtend={handleExtend}
              />
            </div>

            {/* Outro section */}
            <div className="flex-shrink-0 p-3 border-t border-white/8">
              <PamsOutroSceneLibrary
                outroScenes={outroScenes}
                selectedOutro={outroSlot}
                onSelect={setOutroSlot}
              />
            </div>
          </div>

          {/* Right: Edit Suite */}
          <div className="p-4 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl overflow-y-auto">
            <PamsEditSuite
              slots={slots as (PamsScene | null)[]}
              onRemove={handleRemove}
              selectedTrack={selectedTrack}
              onSelectTrack={setSelectedTrack}
              tracks={tracks}
              selectedClip={selectedClip}
              onSelectClip={setSelectedClip}
              onStitch={handleStitch}
              stitching={stitching}
              stitchError={stitchError}
              transitions={transitions}
              onTransitionsChange={setTransitions}
              lyricStyle={lyricStyle}
              lyricPosition={lyricPosition}
              onLyricStyleChange={setLyricStyle}
              onLyricPositionChange={setLyricPosition}
              introSlot={introSlot}
              introTransition={introTransition}
              onIntroChange={setIntroSlot}
              onIntroTransitionChange={setIntroTransition}
              outroSlot={outroSlot}
              outroTransition={outroTransition}
              onOutroChange={setOutroSlot}
              onOutroTransitionChange={setOutroTransition}
            />
          </div>
        </div>
      ) : (
        <PamsRenderLibrary
          finalVideos={finalVideos}
          stitching={stitching}
          stitchStage={stitchStage}
          stitchProgressPct={stitchProgressPct}
          stitchError={stitchError}
          finalVideoStatus={finalVideoStatus}
          onDelete={handleDeleteFinal}
          isAdmin={isAdmin}
          uploadStates={uploadStates}
          onUpload={handleUploadToLibrary}
        />
      )}
    </div>
  );
}
