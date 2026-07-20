"use client";

import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

export type LyricStyleId =
  | "neon" | "glitch" | "kin" | "wave"
  | "tremor" | "chrom" | "term" | "rise"
  | "none";

export type LyricPosition = "top" | "middle" | "bottom";

interface LyricStylePickerProps {
  selectedStyle:    LyricStyleId;
  selectedPosition: LyricPosition;
  onStyleChange:    (style: LyricStyleId) => void;
  onPositionChange: (position: LyricPosition) => void;
  /** Pass false if the selected clip has no lyrics loaded yet */
  hasLyrics?: boolean;
}

// ─── Style metadata ───────────────────────────────────────────────────────────

const STYLES: { id: LyricStyleId; label: string; color: string; bg: string }[] = [
  { id: "neon",   label: "Neon burn",   color: "#ff2d9b", bg: "#000" },
  { id: "glitch", label: "Glitch",      color: "#ffffff", bg: "#050505" },
  { id: "kin",    label: "Kinetic pop", color: "#FFD700", bg: "#100900" },
  { id: "wave",   label: "Wave",        color: "#e0ffe8", bg: "#001a0e" },
  { id: "tremor", label: "Tremor",      color: "#ffffff", bg: "#0f0a00" },
  { id: "chrom",  label: "Chromatic",   color: "#ffffff", bg: "#000" },
  { id: "term",   label: "Terminal",    color: "#00ff88", bg: "#001509" },
  { id: "rise",   label: "Rise",        color: "#c8aaff", bg: "#06001c" },
  { id: "none",   label: "No lyrics",   color: "#555",    bg: "#111" },
];

const POSITIONS: { id: LyricPosition; icon: string; label: string }[] = [
  { id: "top",    icon: "↑", label: "Top" },
  { id: "middle", icon: "—", label: "Mid" },
  { id: "bottom", icon: "↓", label: "Bot" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function LyricStylePicker({
  selectedStyle,
  selectedPosition,
  onStyleChange,
  onPositionChange,
  hasLyrics = true,
}: LyricStylePickerProps) {
  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="text-[10px] text-white/40 uppercase tracking-widest font-semibold">
          Lyric style
        </p>

        {/* Position selector — only shown when a style is active */}
        {selectedStyle !== "none" && (
          <div className="flex gap-1 bg-white/5 rounded-lg p-0.5">
            {POSITIONS.map((pos) => (
              <button
                key={pos.id}
                onClick={() => onPositionChange(pos.id)}
                title={pos.label}
                className={`flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold transition-all ${
                  selectedPosition === pos.id
                    ? "bg-white/20 text-white"
                    : "text-white/35 hover:text-white/60"
                }`}
              >
                <span>{pos.icon}</span>
                <span className="hidden sm:inline">{pos.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* No-lyrics warning */}
      {!hasLyrics && selectedStyle !== "none" && (
        <p className="text-[10px] text-amber-400/80 bg-amber-400/10 rounded-lg px-3 py-2 border border-amber-400/20">
          No lyrics found for this clip. Upload lyrics via the Admin Track Manager.
        </p>
      )}

      {/* Style grid — 3 columns */}
      <div className="grid grid-cols-3 gap-2">
        {STYLES.map((s) => {
          const isSelected = selectedStyle === s.id;
          return (
            <motion.button
              key={s.id}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onStyleChange(s.id)}
              className={`relative rounded-xl overflow-hidden border-2 transition-all ${
                isSelected
                  ? "border-white/70 shadow-[0_0_14px_rgba(255,255,255,0.18)]"
                  : "border-white/8 hover:border-white/25"
              }`}
            >
              {/* Mini preview screen */}
              <div
                className="h-11 flex items-center justify-center"
                style={{ background: s.bg }}
              >
                {s.id !== "none" ? (
                  <span
                    className="text-[11px] font-black tracking-widest uppercase leading-none"
                    style={{
                      color:      s.color,
                      fontFamily: ["glitch", "term"].includes(s.id)
                        ? "'Courier New', monospace"
                        : "Impact, sans-serif",
                      textShadow:
                        s.id === "neon"
                          ? `0 0 8px ${s.color}, 0 0 16px ${s.color}`
                          : s.id === "chrom"
                          ? "-3px 0 #f00, 3px 0 #0ff"
                          : "none",
                    }}
                  >
                    lyric
                  </span>
                ) : (
                  <span className="text-[11px] text-white/25">off</span>
                )}
              </div>

              {/* Label */}
              <div
                className={`py-1 px-2 ${
                  isSelected ? "bg-white/15" : "bg-black/60"
                }`}
              >
                <span className="text-[9px] text-white/55 truncate block text-center">
                  {s.label}
                </span>
              </div>

              {/* Selected checkmark */}
              {isSelected && (
                <div className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-white flex items-center justify-center">
                  <svg
                    className="w-2 h-2 text-black"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={3}
                    viewBox="0 0 12 12"
                  >
                    <path d="M2 6l3 3 5-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
