"use client";

import Link from "next/link";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import {
  Eye,
  EyeOff,
  RotateCcw,
  Volume2,
  VolumeX,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import EmailSignupForm from "@/components/EmailSignupForm";

type GestureKind =
  | "hold"
  | "orbit"
  | "tap5"
  | "drag"
  | "knock"
  | "zigzag"
  | "connect";

type Harmonic = {
  id: number;
  title: string;
  text: string;
  path: string;
  position: { left: string; top: string };
  tone: number;
  gesture: GestureKind;
  hint: string;
};

type HarmonicProgress = {
  unlocked: number[];
  completed: boolean;
  lastVisitedAt: string;
};

const HARMONICS: Harmonic[] = [
  {
    id: 1,
    title: "The First Harmonic",
    text: "Every place has a story.",
    path: "M50 7C65 20 78 35 77 53C76 72 65 88 50 94C34 87 23 71 23 53C22 35 35 20 50 7ZM50 27C42 36 38 45 39 54C39 64 43 71 50 77C57 71 61 64 61 54C62 45 58 36 50 27Z",
    position: { left: "49%", top: "47%" },
    tone: 196,
    gesture: "hold",
    hint: "Hold still and listen",
  },
  {
    id: 2,
    title: "The Second Harmonic",
    text: "Every story needs a steward.",
    path: "M12 54C25 29 42 17 50 12C58 17 75 29 88 54C73 49 60 51 50 59C40 51 27 49 12 54ZM20 66C33 63 43 67 50 80C57 67 67 63 80 66C68 81 58 89 50 92C42 89 32 81 20 66Z",
    position: { left: "26%", top: "30%" },
    tone: 220,
    gesture: "orbit",
    hint: "Trace a circle around it",
  },
  {
    id: 3,
    title: "The Third Harmonic",
    text: "Nothing is ever fully discovered.",
    path: "M50 8L62 36L92 50L62 63L50 92L38 63L8 50L38 36L50 8ZM50 31L45 45L31 50L45 56L50 70L56 56L70 50L56 45L50 31Z",
    position: { left: "72%", top: "28%" },
    tone: 246.94,
    gesture: "tap5",
    hint: "Knock on it, five times",
  },
  {
    id: 4,
    title: "The Fourth Harmonic",
    text: "History is unearthed, not told.",
    path: "M16 27C28 12 45 7 62 12C76 16 87 29 88 45C89 61 80 76 66 85C51 94 31 91 18 78C8 68 7 53 14 42C21 31 35 26 47 31C58 35 64 47 60 58C56 68 44 73 35 68C29 65 27 58 30 52C33 47 39 45 44 48",
    position: { left: "17%", top: "65%" },
    tone: 293.66,
    gesture: "drag",
    hint: "Pull it upward, then let go",
  },
  {
    id: 5,
    title: "The Fifth Harmonic",
    text: "Every discovery reveals a greater mystery.",
    path: "M50 7C58 20 66 27 79 32C74 43 76 54 88 66C74 69 65 77 61 92C51 84 40 84 29 92C27 77 19 69 7 66C18 55 21 44 16 32C30 28 41 20 50 7ZM50 31C39 31 31 40 31 51C31 62 39 71 50 71C61 71 69 62 69 51C69 40 61 31 50 31Z",
    position: { left: "82%", top: "62%" },
    tone: 329.63,
    gesture: "knock",
    hint: "Knock once, then hold",
  },
  {
    id: 6,
    title: "The Sixth Harmonic",
    text: "Every civilization remembers the past differently.",
    path: "M15 72C29 54 34 38 31 17C44 25 50 35 50 48C50 35 56 25 69 17C66 38 71 54 85 72C70 68 59 72 50 88C41 72 30 68 15 72ZM50 54C44 59 43 66 50 74C57 66 56 59 50 54Z",
    position: { left: "62%", top: "76%" },
    tone: 369.99,
    gesture: "zigzag",
    hint: "Trace its broken path",
  },
  {
    id: 7,
    title: "The Seventh Harmonic",
    text: "Everything is connected.",
    path: "M50 8C58 23 69 31 86 34C75 45 72 58 78 76C61 70 48 74 37 88C35 70 27 60 10 54C25 44 31 31 29 14C36 22 43 30 50 39C57 30 64 22 71 14C68 31 74 44 90 54C73 60 65 70 63 88C52 74 39 70 22 76C28 58 25 45 14 34C31 31 42 23 50 8Z",
    position: { left: "43%", top: "18%" },
    tone: 440,
    gesture: "connect",
    hint: "Draw a thread through all six",
  },
];

const PAIRS: [number, number][] = [];
for (let i = 0; i < HARMONICS.length; i++) {
  for (let j = i + 1; j < HARMONICS.length; j++) PAIRS.push([i, j]);
}

const STORAGE_KEY = "soniqute:harmonics:v2";
const SOUND_KEY = "soniqute:sound";
const GUIDED_KEY = "soniqute:guided";
const HERO_VIDEO = `${process.env.NEXT_PUBLIC_GCS_BASE_URL}/soniqute/marketing/soniqute-enhanced.mp4`;

const EMPTY_PROGRESS: HarmonicProgress = {
  unlocked: [],
  completed: false,
  lastVisitedAt: "",
};

function isProgress(value: unknown): value is HarmonicProgress {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<HarmonicProgress>;
  return (
    Array.isArray(candidate.unlocked) &&
    candidate.unlocked.every(
      (id) => Number.isInteger(id) && id >= 1 && id <= HARMONICS.length,
    ) &&
    typeof candidate.completed === "boolean" &&
    typeof candidate.lastVisitedAt === "string"
  );
}

function useHarmonicProgress() {
  const [progress, setProgress] = useState<HarmonicProgress>(EMPTY_PROGRESS);
  const [hydrated, setHydrated] = useState(false);
  const [returnVariation, setReturnVariation] = useState(0);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed: unknown = JSON.parse(saved);
        if (isProgress(parsed)) {
          setProgress(parsed);
          setReturnVariation(
            parsed.lastVisitedAt
              ? new Date(parsed.lastVisitedAt).getUTCDate() % 3
              : 0,
          );
        } else {
          console.warn("Ignoring invalid SONIQUTE Harmonic progress.");
          window.localStorage.removeItem(STORAGE_KEY);
        }
      } catch (error) {
        console.warn("Unable to read SONIQUTE Harmonic progress.", error);
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        ...progress,
        lastVisitedAt: new Date().toISOString(),
      }),
    );
  }, [hydrated, progress]);

  const unlock = useCallback((id: number) => {
    setProgress((current) => {
      if (current.unlocked.includes(id)) return current;
      if (id !== current.unlocked.length + 1) return current;
      const unlocked = [...current.unlocked, id];
      return {
        unlocked,
        completed: unlocked.length === HARMONICS.length,
        lastVisitedAt: new Date().toISOString(),
      };
    });
  }, []);

  const reset = useCallback(() => {
    window.localStorage.removeItem(STORAGE_KEY);
    setProgress({
      ...EMPTY_PROGRESS,
      lastVisitedAt: new Date().toISOString(),
    });
  }, []);

  return { progress, hydrated, returnVariation, unlock, reset };
}

function useSound() {
  const ambientRef = useRef<HTMLAudioElement>(null);
  const contextRef = useRef<AudioContext | null>(null);
  const ambientFrameRef = useRef<number | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setEnabled(window.localStorage.getItem(SOUND_KEY) === "on");
    setHydrated(true);
  }, []);

  const getContext = useCallback(() => {
    if (contextRef.current) return contextRef.current;
    const AudioContextConstructor =
      window.AudioContext ??
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!AudioContextConstructor) return null;
    contextRef.current = new AudioContextConstructor();
    return contextRef.current;
  }, []);

  const fadeAmbient = useCallback(
    (target: number, duration: number, onComplete?: () => void) => {
      const ambient = ambientRef.current;
      if (!ambient) return;
      if (ambientFrameRef.current !== null) {
        window.cancelAnimationFrame(ambientFrameRef.current);
      }
      const initial = ambient.volume;
      const startedAt = window.performance.now();
      const update = (now: number) => {
        const progress = Math.min((now - startedAt) / duration, 1);
        ambient.volume = initial + (target - initial) * progress;
        if (progress < 1) {
          ambientFrameRef.current = window.requestAnimationFrame(update);
        } else {
          ambientFrameRef.current = null;
          onComplete?.();
        }
      };
      ambientFrameRef.current = window.requestAnimationFrame(update);
    },
    [],
  );

  const syncAmbient = useCallback((shouldPlay: boolean) => {
    const ambient = ambientRef.current;
    if (!ambient) return;
    if (shouldPlay) {
      if (ambient.paused) ambient.volume = 0;
      void ambient
        .play()
        .then(() => fadeAmbient(0.16, 1100))
        .catch((error) => {
          console.warn("Ambient audio could not begin.", error);
        });
    } else {
      fadeAmbient(0, 650, () => ambient.pause());
    }
  }, [fadeAmbient]);

  useEffect(
    () => () => {
      if (ambientFrameRef.current !== null) {
        window.cancelAnimationFrame(ambientFrameRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(SOUND_KEY, enabled ? "on" : "off");
  }, [enabled, hydrated]);

  const toggle = useCallback(() => {
    setEnabled((current) => {
      const next = !current;
      if (next) {
        const context = getContext();
        if (context?.state === "suspended") void context.resume();
      }
      syncAmbient(next);
      return next;
    });
  }, [getContext, syncAmbient]);

  const begin = useCallback(() => {
    if (!enabled) return;
    const context = getContext();
    if (context?.state === "suspended") void context.resume();
    syncAmbient(true);
  }, [enabled, getContext, syncAmbient]);

  const playMotif = useCallback(
    (frequency: number, completion = false) => {
      if (!enabled) return;
      const context = getContext();
      if (!context) return;
      const notes = completion
        ? [frequency, frequency * 1.25, frequency * 1.5, frequency * 2]
        : [frequency, frequency * 1.5];
      const start = context.currentTime;

      notes.forEach((note, index) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = index % 2 === 0 ? "sine" : "triangle";
        oscillator.frequency.setValueAtTime(note, start + index * 0.11);
        gain.gain.setValueAtTime(0.0001, start + index * 0.11);
        gain.gain.exponentialRampToValueAtTime(
          completion ? 0.055 : 0.035,
          start + index * 0.11 + 0.025,
        );
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          start + index * 0.11 + 0.48,
        );
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(start + index * 0.11);
        oscillator.stop(start + index * 0.11 + 0.5);
      });
    },
    [enabled, getContext],
  );

  return { ambientRef, enabled, toggle, begin, playMotif };
}

function useHarmonicGesture(
  gesture: GestureKind,
  active: boolean,
  onUnlock: () => void,
) {
  const [ringProgress, setRingProgress] = useState(0);
  const [taps, setTaps] = useState(0);
  const [knocking, setKnocking] = useState(false);
  const [dragT, setDragT] = useState(0);

  const holdRaf = useRef<number | null>(null);
  const holdStart = useRef<number | null>(null);
  const holdDuration = useRef(0);
  const orbit = useRef<{
    cx: number;
    cy: number;
    lastAngle: number | null;
    accum: number;
  } | null>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const zig = useRef<{ lastX: number; lastDir: number } | null>(null);
  const knockArmed = useRef(false);
  const knockTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (holdRaf.current) cancelAnimationFrame(holdRaf.current);
      if (knockTimer.current) clearTimeout(knockTimer.current);
      if (tapTimer.current) clearTimeout(tapTimer.current);
    },
    [],
  );

  const startHold = useCallback(
    (duration: number) => {
      holdDuration.current = duration;
      holdStart.current = performance.now();
      const tick = (now: number) => {
        if (holdStart.current === null) return;
        const pct = Math.min(
          ((now - holdStart.current) / holdDuration.current) * 100,
          100,
        );
        setRingProgress(pct);
        if (pct >= 100) {
          holdStart.current = null;
          holdRaf.current = null;
          onUnlock();
          return;
        }
        holdRaf.current = requestAnimationFrame(tick);
      };
      holdRaf.current = requestAnimationFrame(tick);
    },
    [onUnlock],
  );

  const cancelHold = useCallback(() => {
    if (holdRaf.current) cancelAnimationFrame(holdRaf.current);
    holdRaf.current = null;
    holdStart.current = null;
    setRingProgress(0);
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!active) return;
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // Pointer capture is optional on older touch browsers.
      }
      if (gesture === "hold") {
        startHold(1200);
      } else if (gesture === "orbit") {
        const bounds = event.currentTarget.getBoundingClientRect();
        orbit.current = {
          cx: bounds.left + bounds.width / 2,
          cy: bounds.top + bounds.height / 2,
          lastAngle: null,
          accum: 0,
        };
      } else if (gesture === "drag") {
        drag.current = { x: event.clientX, y: event.clientY };
      } else if (gesture === "zigzag") {
        zig.current = { lastX: event.clientX, lastDir: 0 };
      } else if (gesture === "knock" && knockArmed.current) {
        setKnocking(true);
        startHold(800);
      }
    },
    [active, gesture, startHold],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLButtonElement>) => {
      if (!active) return;
      if (gesture === "orbit" && orbit.current) {
        const dx = event.clientX - orbit.current.cx;
        const dy = event.clientY - orbit.current.cy;
        if (Math.hypot(dx, dy) < 18) return;
        const angle = Math.atan2(dy, dx);
        if (orbit.current.lastAngle !== null) {
          let delta = angle - orbit.current.lastAngle;
          while (delta > Math.PI) delta -= 2 * Math.PI;
          while (delta < -Math.PI) delta += 2 * Math.PI;
          orbit.current.accum += Math.abs(delta);
        }
        orbit.current.lastAngle = angle;
        const pct = Math.min(
          (orbit.current.accum / (2 * Math.PI * 0.92)) * 100,
          100,
        );
        setRingProgress(pct);
        if (pct >= 100) {
          orbit.current = null;
          onUnlock();
        }
      } else if (gesture === "drag" && drag.current) {
        const dx = event.clientX - drag.current.x;
        const dy = event.clientY - drag.current.y;
        setDragT(Math.min(Math.hypot(dx, dy) / 110, 1));
      } else if (gesture === "zigzag" && zig.current) {
        const dx = event.clientX - zig.current.lastX;
        if (Math.abs(dx) >= 14) {
          const direction = Math.sign(dx);
          if (
            zig.current.lastDir !== 0 &&
            direction !== zig.current.lastDir
          ) {
            setTaps((current) => {
              const next = current + 1;
              if (next >= 4) {
                zig.current = null;
                onUnlock();
              }
              return next;
            });
          }
          zig.current.lastDir = direction;
          zig.current.lastX = event.clientX;
        }
      }
    },
    [active, gesture, onUnlock],
  );

  const onPointerUp = useCallback(() => {
    if (gesture === "hold") {
      cancelHold();
    } else if (gesture === "knock") {
      cancelHold();
      setKnocking(false);
      knockArmed.current = false;
      if (knockTimer.current) clearTimeout(knockTimer.current);
    } else if (gesture === "orbit") {
      orbit.current = null;
      setRingProgress(0);
    } else if (gesture === "drag") {
      if (drag.current) {
        const completed = dragT >= 1;
        drag.current = null;
        if (completed) onUnlock();
        else setDragT(0);
      }
    } else if (gesture === "zigzag") {
      zig.current = null;
    }
  }, [gesture, cancelHold, dragT, onUnlock]);

  const onTapClick = useCallback(() => {
    if (!active) return;
    if (gesture === "tap5") {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      setTaps((current) => {
        const next = current + 1;
        if (next >= 5) {
          onUnlock();
          return 0;
        }
        return next;
      });
      tapTimer.current = setTimeout(() => setTaps(0), 800);
    } else if (gesture === "knock" && !knockArmed.current) {
      knockArmed.current = true;
      setTaps(1);
      if (knockTimer.current) clearTimeout(knockTimer.current);
      knockTimer.current = setTimeout(() => {
        knockArmed.current = false;
        setTaps(0);
      }, 1400);
    }
  }, [active, gesture, onUnlock]);

  return {
    ringProgress,
    taps,
    knocking,
    dragT,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onTapClick,
  };
}

function SoundButton({
  enabled,
  onToggle,
}: {
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={enabled ? "Mute SONIQUTE" : "Unmute SONIQUTE"}
      aria-pressed={enabled}
      onClick={onToggle}
      className="grid h-11 w-11 place-items-center rounded-full border border-[#d8c58d]/35 bg-[#03141b]/70 text-[#f5e8bd] shadow-[0_0_24px_rgba(82,208,200,.12)] backdrop-blur-md transition hover:border-[#f5e8bd]/70 hover:bg-[#0b2630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5e8bd]"
    >
      {enabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
    </button>
  );
}

function GestureRing({ progress }: { progress: number }) {
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg
      viewBox="0 0 76 76"
      className="pointer-events-none absolute -inset-[9px] h-[calc(100%+18px)] w-[calc(100%+18px)] -rotate-90"
    >
      <circle
        cx="38"
        cy="38"
        r={radius}
        fill="none"
        stroke="rgba(255,255,255,.14)"
        strokeWidth="3"
      />
      <circle
        cx="38"
        cy="38"
        r={radius}
        fill="none"
        stroke="#f1dc9e"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - progress / 100)}
      />
    </svg>
  );
}

function GesturePips({ total, filled }: { total: number; filled: number }) {
  return (
    <span className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 gap-[5px]">
      {Array.from({ length: total }).map((_, index) => (
        <span
          key={index}
          className={`h-1.5 w-1.5 rounded-full ${
            index < filled
              ? "bg-[#f1dc9e] shadow-[0_0_6px_rgba(241,220,158,.85)]"
              : "bg-white/20"
          }`}
        />
      ))}
    </span>
  );
}

function HarmonicArtifact({
  harmonic,
  state,
  reducedMotion,
  onUnlock,
  onReplay,
}: {
  harmonic: Harmonic;
  state: "hidden" | "dormant" | "available" | "unlocked";
  reducedMotion: boolean;
  onUnlock: () => void;
  onReplay: () => void;
}) {
  const interactive = state === "available" || state === "unlocked";
  const active = state === "available" && harmonic.gesture !== "connect";
  const gesture = useHarmonicGesture(harmonic.gesture, active, onUnlock);

  const handleClick = () => {
    if (state === "unlocked") {
      onReplay();
      return;
    }
    if (state === "available") gesture.onTapClick();
  };

  const showRing =
    active &&
    (harmonic.gesture === "hold" ||
      harmonic.gesture === "orbit" ||
      (harmonic.gesture === "knock" && gesture.knocking));
  const showPips =
    active &&
    (harmonic.gesture === "tap5" ||
      harmonic.gesture === "zigzag" ||
      harmonic.gesture === "knock");
  const pipsTotal =
    harmonic.gesture === "tap5" ? 5 : harmonic.gesture === "zigzag" ? 4 : 1;
  const dragLift = harmonic.gesture === "drag" ? gesture.dragT : 0;

  return (
    <motion.button
      type="button"
      disabled={harmonic.gesture === "connect" ? state !== "unlocked" : !interactive}
      aria-label={
        state === "unlocked"
          ? `Replay ${harmonic.title}`
          : "An unfamiliar artifact"
      }
      onClick={handleClick}
      onPointerDown={active ? gesture.onPointerDown : undefined}
      onPointerMove={active ? gesture.onPointerMove : undefined}
      onPointerUp={active ? gesture.onPointerUp : undefined}
      initial={false}
      animate={{
        opacity: state === "hidden" ? 0 : state === "dormant" ? 0.18 : 1,
      }}
      transition={{ duration: reducedMotion ? 0 : 0.8 }}
      className="group absolute z-20 -translate-x-1/2 -translate-y-1/2 touch-none disabled:cursor-default"
      style={harmonic.position}
    >
      <span
        aria-hidden
        className={`absolute left-1/2 top-1/2 h-24 w-24 -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl transition-opacity duration-700 ${
          state === "unlocked"
            ? "bg-[#69e0d5]/35 opacity-100"
            : state === "available"
              ? "bg-[#e7c879]/25 opacity-80"
              : "opacity-0"
        }`}
      />
      {showRing && <GestureRing progress={gesture.ringProgress} />}
      <span
        style={{
          transform: `translateY(${(-dragLift * 22).toFixed(1)}px) scale(${(
            1 +
            dragLift * 0.1
          ).toFixed(3)})`,
        }}
        className={`relative grid h-16 w-16 place-items-center rounded-full border transition duration-500 md:h-20 md:w-20 ${
          state === "unlocked"
            ? "border-[#8ce6dc]/70 bg-[#07323a]/75 text-[#b9fff4] shadow-[0_0_30px_rgba(105,224,213,.45),inset_0_0_24px_rgba(105,224,213,.15)] group-hover:scale-105"
            : state === "available"
              ? "artifact-awake border-[#e7c879]/55 bg-[#182b2c]/70 text-[#f1dc9e] shadow-[0_0_26px_rgba(231,200,121,.24)] group-hover:scale-105"
              : "border-white/10 bg-black/30 text-white/20"
        } backdrop-blur-sm group-focus-visible:scale-105 group-focus-visible:outline-none group-focus-visible:ring-2 group-focus-visible:ring-[#f1dc9e]`}
      >
        <svg
          viewBox="0 0 100 100"
          className="h-9 w-9 overflow-visible fill-none stroke-current stroke-[2.2] md:h-11 md:w-11"
        >
          <path
            d={harmonic.path}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
      {showPips && <GesturePips total={pipsTotal} filled={gesture.taps} />}
      {state === "available" && (
        <span
          className={`absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-[11px] tracking-wide text-[#f1dc9e]/90 drop-shadow-[0_2px_8px_rgba(0,0,0,.7)] ${
            parseFloat(harmonic.position.top) > 55
              ? "bottom-full mb-4"
              : "top-full mt-4"
          }`}
        >
          {harmonic.hint}
        </span>
      )}
      {state === "unlocked" && (
        <span
          aria-hidden
          className="absolute -bottom-5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[#b9fff4] shadow-[0_0_10px_3px_rgba(185,255,244,.75)]"
        />
      )}
    </motion.button>
  );
}

function HarmonicEnvironment({
  progress,
  selected,
  guided,
  returnVariation,
  reducedMotion,
  finaleActive,
  onUnlock,
  onReplay,
  onAttemptSeventh,
}: {
  progress: HarmonicProgress;
  selected: number | null;
  guided: boolean;
  returnVariation: number;
  reducedMotion: boolean;
  finaleActive: boolean;
  onUnlock: (id: number) => void;
  onReplay: (harmonic: Harmonic) => void;
  onAttemptSeventh: () => boolean;
}) {
  const unlockedCount = progress.unlocked.length;
  const seventhAvailable = unlockedCount === 6;
  const envRef = useRef<HTMLDivElement>(null);
  const connecting = useRef(false);
  const [visited, setVisited] = useState<number[]>([]);

  useEffect(() => {
    if (!seventhAvailable) setVisited([]);
  }, [seventhAvailable]);

  const handleEnvPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!seventhAvailable) return;
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Pointer capture is optional on older touch browsers.
    }
    connecting.current = true;
  };

  const handleEnvPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!connecting.current || !envRef.current) return;
    const bounds = envRef.current.getBoundingClientRect();
    const pointerX = ((event.clientX - bounds.left) / bounds.width) * 100;
    const pointerY = ((event.clientY - bounds.top) / bounds.height) * 100;
    setVisited((current) => {
      let next = current;
      for (const harmonic of HARMONICS.slice(0, 6)) {
        if (next.includes(harmonic.id)) continue;
        const x = parseFloat(harmonic.position.left);
        const y = parseFloat(harmonic.position.top);
        const dx = ((pointerX - x) / 100) * bounds.width;
        const dy = ((pointerY - y) / 100) * bounds.height;
        if (Math.hypot(dx, dy) < 62) next = [...next, harmonic.id];
      }
      return next;
    });
  };

  const handleEnvPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!connecting.current || !envRef.current) return;
    connecting.current = false;
    const bounds = envRef.current.getBoundingClientRect();
    const pointerX = ((event.clientX - bounds.left) / bounds.width) * 100;
    const pointerY = ((event.clientY - bounds.top) / bounds.height) * 100;
    const seventh = HARMONICS[6];
    const dx =
      ((pointerX - parseFloat(seventh.position.left)) / 100) * bounds.width;
    const dy =
      ((pointerY - parseFloat(seventh.position.top)) / 100) * bounds.height;
    if (Math.hypot(dx, dy) < 62 && visited.length >= 6) onAttemptSeventh();
  };

  return (
    <div
      ref={envRef}
      onPointerDown={handleEnvPointerDown}
      onPointerMove={handleEnvPointerMove}
      onPointerUp={handleEnvPointerUp}
      className="relative mx-auto h-full w-full max-w-6xl touch-none overflow-hidden rounded-[3rem] border border-[#87b9b4]/20 bg-[radial-gradient(circle_at_50%_45%,rgba(27,89,90,.32),transparent_38%),linear-gradient(180deg,rgba(3,17,24,.82),rgba(0,7,12,.92))] shadow-[0_24px_90px_rgba(0,0,0,.52)] backdrop-blur-[2px]"
    >
      <div
        aria-hidden
        className={`absolute inset-[8%] opacity-[.12] ${
          returnVariation === 1
            ? "rotate-3"
            : returnVariation === 2
              ? "-rotate-2 scale-105"
              : ""
        }`}
      >
        <svg viewBox="0 0 1000 600" className="h-full w-full">
          <path
            d="M70 390C160 305 229 332 300 246C365 167 429 197 494 137C559 78 648 130 691 208C737 291 838 246 926 340C842 365 826 451 746 462C651 475 615 412 530 469C442 528 357 461 283 488C207 516 126 479 70 390Z"
            fill="none"
            stroke="#a9e3d7"
            strokeWidth="2"
            strokeDasharray="8 15"
          />
          <path
            d="M345 366C407 321 438 261 499 248C558 235 611 277 635 331C579 303 532 315 500 356C456 325 407 330 345 366Z"
            fill="none"
            stroke="#e4cd8d"
            strokeWidth="1.4"
          />
        </svg>
      </div>

      <div aria-hidden className="absolute inset-x-[15%] top-[12%] flex justify-between">
        {[0, 1, 2, 3, 4].map((city) => (
          <span
            key={city}
            className="h-1.5 w-1.5 rounded-full bg-[#e7c879]/70 shadow-[0_0_14px_3px_rgba(231,200,121,.35)]"
            style={{ opacity: 0.18 + Math.min(unlockedCount, city + 1) * 0.13 }}
          />
        ))}
      </div>

      {!reducedMotion &&
        Array.from({ length: 13 }).map((_, index) => (
          <span
            key={index}
            aria-hidden
            className="current-particle absolute h-1 w-1 rounded-full bg-[#93e2d7]/40"
            style={{
              left: `${8 + ((index * 19) % 84)}%`,
              top: `${18 + ((index * 23) % 68)}%`,
              animationDelay: `${(index % 7) * -0.7}s`,
              animationDuration: `${7 + (index % 5)}s`,
            }}
          />
        ))}

      <div
        aria-hidden
        className={`absolute bottom-[-12%] left-1/2 h-[38%] w-[62%] -translate-x-1/2 rounded-[50%_50%_0_0] bg-black/60 shadow-[0_-30px_80px_rgba(10,67,69,.18)] transition-opacity duration-1000 ${
          unlockedCount >= 4 ? "opacity-100" : "opacity-45"
        }`}
      />

      {seventhAvailable && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          {HARMONICS.slice(0, 6).map((harmonic) => (
            <line
              key={harmonic.id}
              x1={parseFloat(harmonic.position.left)}
              y1={parseFloat(harmonic.position.top)}
              x2={parseFloat(HARMONICS[6].position.left)}
              y2={parseFloat(HARMONICS[6].position.top)}
              stroke={
                visited.includes(harmonic.id)
                  ? "#f1dc9e"
                  : "rgba(231,200,121,.25)"
              }
              strokeWidth={visited.includes(harmonic.id) ? 0.6 : 0.4}
              strokeDasharray={
                visited.includes(harmonic.id) ? undefined : "2 2"
              }
            />
          ))}
        </svg>
      )}

      {progress.completed && (
        <svg
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="pointer-events-none absolute inset-0 h-full w-full"
        >
          <defs>
            <linearGradient id="flowGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#e7c879" />
              <stop offset="100%" stopColor="#69e0d5" />
            </linearGradient>
          </defs>
          {PAIRS.map(([start, end], index) => (
            <line
              key={`${start}-${end}`}
              x1={parseFloat(HARMONICS[start].position.left)}
              y1={parseFloat(HARMONICS[start].position.top)}
              x2={parseFloat(HARMONICS[end].position.left)}
              y2={parseFloat(HARMONICS[end].position.top)}
              stroke="url(#flowGrad)"
              strokeWidth="0.35"
              opacity="0.6"
              strokeDasharray="3 2.4"
              className="finale-thread"
              style={{ animationDelay: `${(index % 9) * -0.45}s` }}
            />
          ))}
        </svg>
      )}

      {HARMONICS.map((harmonic, index) => {
        const unlocked = progress.unlocked.includes(harmonic.id);
        const available = harmonic.id === unlockedCount + 1;
        const state = unlocked
          ? "unlocked"
          : available
            ? "available"
            : index <= unlockedCount + 1
              ? "dormant"
              : "hidden";
        return (
          <HarmonicArtifact
            key={harmonic.id}
            harmonic={harmonic}
            state={state}
            reducedMotion={reducedMotion}
            onUnlock={() => onUnlock(harmonic.id)}
            onReplay={() => onReplay(harmonic)}
          />
        );
      })}

      {guided &&
        unlockedCount < HARMONICS.length &&
        HARMONICS[unlockedCount].gesture !== "connect" && (
          <motion.span
            aria-hidden
            className="pointer-events-none absolute z-10 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#e7c879]/30"
            style={HARMONICS[unlockedCount].position}
            animate={
              reducedMotion
                ? undefined
                : { scale: [0.8, 1.15], opacity: [0.2, 0] }
            }
            transition={{ duration: 2.2, repeat: Infinity }}
          />
        )}

      {finaleActive && (
        <>
          <div
            aria-hidden
            className="finale-flash pointer-events-none absolute inset-0 z-40"
          />
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              aria-hidden
              className="finale-shockwave pointer-events-none absolute z-40 h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
              style={{
                left: HARMONICS[6].position.left,
                top: HARMONICS[6].position.top,
                borderColor: ["#f1dc9e", "#8ce6dc", "#f5e8bd"][index],
                animationDelay: `${index * 0.18}s`,
              }}
            />
          ))}
        </>
      )}

      <AnimatePresence mode="wait">
        {selected && (
          <motion.div
            key={selected}
            initial={{ opacity: 0, y: 14, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: reducedMotion ? 0 : 0.65 }}
            className={`absolute inset-x-5 z-30 mx-auto max-w-xl text-center ${
              progress.completed
                ? "bottom-24 md:bottom-28"
                : "bottom-8 md:bottom-12"
            }`}
            aria-live="polite"
          >
            <p className="text-[10px] uppercase tracking-[0.38em] text-[#c8b97e]/75">
              {HARMONICS[selected - 1].title}
            </p>
            <p
              className={`sq-title mt-3 text-xl font-bold leading-relaxed md:text-3xl ${
                progress.completed ? "finale-shimmer" : ""
              }`}
            >
              {HARMONICS[selected - 1].text}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
      {progress.completed && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.7, delay: 0.35 }}
          className="absolute inset-x-0 bottom-7 z-30 flex justify-center"
        >
          <Link
            href="/explore"
            className="group relative inline-flex min-h-11 items-center justify-center rounded-full border border-pink-300/70 bg-gradient-to-r from-pink-600/50 via-violet-600/50 to-sky-500/50 px-8 py-3 text-[11px] font-bold uppercase tracking-[0.28em] text-white shadow-[0_0_25px_rgba(244,114,182,.55)] backdrop-blur-md transition hover:scale-[1.04] hover:shadow-[0_0_40px_rgba(244,114,182,.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200"
          >
            Explore
            <span
              aria-hidden
              className="ml-3 transition-transform group-hover:translate-x-1"
            >
              →
            </span>
          </Link>
        </motion.div>
      )}
    </div>
  );
}

export default function HomePage() {
  const reducedMotion = useReducedMotion() ?? false;
  const { progress, hydrated, returnVariation, unlock, reset } =
    useHarmonicProgress();
  const { ambientRef, enabled, toggle, begin, playMotif } = useSound();
  const [entered, setEntered] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [guided, setGuided] = useState(false);
  const [controlsOpen, setControlsOpen] = useState(false);
  const [soundCaption, setSoundCaption] = useState("");
  const [finaleActive, setFinaleActive] = useState(false);
  const previousCompleted = useRef<boolean | null>(null);
  const finaleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setGuided(window.localStorage.getItem(GUIDED_KEY) === "on");
  }, []);

  useEffect(() => {
    window.localStorage.setItem(GUIDED_KEY, guided ? "on" : "off");
  }, [guided]);

  useEffect(() => {
    if (!hydrated) return;
    if (previousCompleted.current === null) {
      previousCompleted.current = progress.completed;
      return;
    }
    if (progress.completed && !previousCompleted.current) {
      playMotif(220, true);
      setSoundCaption("The seven tones briefly form a complete phrase.");
    }
    previousCompleted.current = progress.completed;
  }, [hydrated, playMotif, progress.completed]);

  useEffect(
    () => () => {
      if (finaleTimer.current) clearTimeout(finaleTimer.current);
    },
    [],
  );

  const enter = () => {
    begin();
    setEntered(true);
  };

  const triggerFinale = () => {
    setFinaleActive(true);
    if (finaleTimer.current) clearTimeout(finaleTimer.current);
    finaleTimer.current = setTimeout(() => setFinaleActive(false), 2000);
  };

  const handleUnlock = (id: number) => {
    const harmonic = HARMONICS[id - 1];
    unlock(id);
    setSelected(id);
    playMotif(harmonic.tone, id === 7);
    setSoundCaption(`A new tone answers ${harmonic.title.toLowerCase()}.`);
    if (id === 7) triggerFinale();
  };

  const attemptSeventh = () => {
    if (progress.unlocked.length !== 6) return false;
    handleUnlock(7);
    return true;
  };

  const replayHarmonic = (harmonic: Harmonic) => {
    setSelected(harmonic.id);
    playMotif(harmonic.tone, harmonic.id === 7 && progress.completed);
    setSoundCaption(`${harmonic.title} sounds again.`);
    if (harmonic.id === 7 && progress.completed) triggerFinale();
  };

  const symbols = useMemo(
    () =>
      HARMONICS.map((harmonic) => ({
        ...harmonic,
        unlocked: progress.unlocked.includes(harmonic.id),
      })),
    [progress.unlocked],
  );

  return (
    <main className="soniqute-home relative isolate overflow-hidden bg-[#000b10] text-[#f5efd9]">
      <audio
        ref={ambientRef}
        src="/audio/underwater_ambience.mp3"
        loop
        preload="none"
      />
      <p className="sr-only" aria-live="polite">
        {soundCaption}
      </p>

      <div className="fixed right-4 top-4 z-50 flex items-center gap-2 md:right-7 md:top-7">
        <SoundButton enabled={enabled} onToggle={toggle} />
        <button
          type="button"
          aria-label="Accessibility settings"
          aria-expanded={controlsOpen}
          onClick={() => setControlsOpen((open) => !open)}
          className="grid h-11 w-11 place-items-center rounded-full border border-[#d8c58d]/35 bg-[#03141b]/70 text-[#f5e8bd] backdrop-blur-md transition hover:border-[#f5e8bd]/70 hover:bg-[#0b2630] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5e8bd]"
        >
          {guided ? <Eye size={17} /> : <EyeOff size={17} />}
        </button>
        <AnimatePresence>
          {controlsOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="absolute right-0 top-14 w-56 rounded-2xl border border-[#d8c58d]/20 bg-[#03141b]/95 p-3 shadow-2xl backdrop-blur-xl"
            >
              <button
                type="button"
                aria-pressed={guided}
                onClick={() => setGuided((current) => !current)}
                className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-xs tracking-wide text-[#e7ddc0] hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5e8bd]"
              >
                Guided Mode
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    guided
                      ? "bg-[#8ce6dc] shadow-[0_0_10px_rgba(140,230,220,.8)]"
                      : "bg-white/20"
                  }`}
                />
              </button>
              {progress.unlocked.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    reset();
                    setSelected(null);
                    setControlsOpen(false);
                  }}
                  className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs tracking-wide text-[#b4c9c5] hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#f5e8bd]"
                >
                  <RotateCcw size={14} />
                  Unearth again
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <section className="relative h-screen min-h-[800px] overflow-hidden">
        <video
          src={HERO_VIDEO}
          autoPlay
          muted
          loop
          playsInline
          className={`absolute inset-0 h-full w-full object-cover transition duration-[1800ms] ${
            entered && !reducedMotion ? "scale-105 opacity-75" : "opacity-90"
          }`}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,8,12,.2),rgba(0,12,17,.3)_55%,#000b10_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_0%,rgba(0,8,13,.08)_45%,rgba(0,7,11,.7)_100%)]" />

        <AnimatePresence>
          {!entered && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{
                opacity: 0,
                y: reducedMotion ? 0 : -30,
                filter: reducedMotion ? "none" : "blur(10px)",
              }}
              transition={{ duration: reducedMotion ? 0 : 1 }}
              className="container-padding maxw relative z-10 h-full"
            >
              <div className="flex h-full flex-col items-center gap-8 md:flex-row md:items-start md:justify-between">
                <div className="mt-24 max-w-2xl flex-shrink-0 text-left md:mt-56 xl:mt-64">
                  <motion.p
                    initial={{ opacity: 0, letterSpacing: "0.24em" }}
                    animate={{ opacity: 0.9, letterSpacing: "0.38em" }}
                    transition={{ duration: reducedMotion ? 0 : 1.4 }}
                    className="sq-title text-xs font-bold uppercase md:text-sm"
                  >
                    SONIQUTE
                  </motion.p>
                  <motion.h1
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: reducedMotion ? 0 : 1.2, delay: 0.15 }}
                    className="sparkle-text mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-[-0.02em] drop-shadow-[0_4px_30px_rgba(0,0,0,.85)] md:text-6xl xl:text-7xl"
                  >
                    A living mythology waiting to be unearthed.
                  </motion.h1>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: reducedMotion ? 0 : 1.1, delay: 0.55 }}
                    className="mt-7 text-sm font-semibold leading-7 text-white/95 drop-shadow-[0_2px_12px_rgba(0,0,0,.65)] md:text-lg"
                  >
                    <p>Every place has a story.</p>
                    <p>Every story needs a steward.</p>
                  </motion.div>
                  <motion.button
                    type="button"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: reducedMotion ? 0 : 0.8, delay: 0.9 }}
                    onClick={enter}
                    className="group relative mt-9 min-h-12 rounded-full border border-pink-300/70 bg-gradient-to-r from-pink-600/40 via-violet-600/40 to-sky-500/40 px-8 py-3 text-[11px] font-bold uppercase tracking-[0.3em] text-white shadow-[0_0_25px_rgba(244,114,182,.55)] backdrop-blur-md transition hover:scale-[1.04] hover:shadow-[0_0_40px_rgba(244,114,182,.85)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pink-200"
                  >
                    <span
                      aria-hidden
                      className="absolute -inset-3 rounded-full bg-[radial-gradient(circle_at_center,rgba(244,114,182,.7),transparent_70%)] opacity-55 blur-xl transition group-hover:opacity-90"
                    />
                    <span className="relative">Enter SONIQUTE</span>
                  </motion.button>
                </div>

                <motion.div
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.8, delay: 0.7 }}
                  className="w-full max-w-md pb-10 md:mt-56 md:pt-[210px] xl:mt-64 xl:pt-[240px]"
                >
                  <EmailSignupForm />
                </motion.div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {entered && !reducedMotion && (
          <motion.div
            aria-hidden
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: [0, 0.8, 0], scale: [0.6, 1.5, 2] }}
            transition={{ duration: 1.8 }}
            className="absolute left-1/2 top-1/2 h-44 w-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#b5f3e8]/30 shadow-[0_0_70px_rgba(181,243,232,.2)]"
          />
        )}

        <AnimatePresence>
          {entered && hydrated && (
            <motion.div
              initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reducedMotion ? 0 : 1.1, delay: reducedMotion ? 0 : 0.35 }}
              className="absolute inset-0 z-20 px-3 pb-4 pt-20 md:px-8 md:pb-7 md:pt-24"
            >
              <div className="relative mx-auto h-full max-w-6xl">
                <h2 className="sq-title absolute inset-x-0 top-5 z-40 text-center text-lg font-extrabold uppercase tracking-[0.24em] md:text-2xl">
                  The Seven Harmonics
                </h2>
                <div
                  className="absolute inset-x-0 top-[4.5rem] z-40 flex items-center justify-center gap-3"
                  aria-label={`${progress.unlocked.length} of 7 Harmonics discovered`}
                >
                  {symbols.map((symbol) => (
                    <span
                      key={symbol.id}
                      aria-hidden
                      className={`h-1.5 w-1.5 rounded-full transition duration-700 ${
                        symbol.unlocked
                          ? "bg-pink-100 shadow-[0_0_10px_2px_rgba(244,114,182,.75)]"
                          : "bg-white/20"
                      }`}
                    />
                  ))}
                </div>
                <HarmonicEnvironment
                  progress={progress}
                  selected={selected}
                  guided={guided}
                  returnVariation={returnVariation}
                  reducedMotion={reducedMotion}
                  finaleActive={finaleActive}
                  onUnlock={handleUnlock}
                  onReplay={replayHarmonic}
                  onAttemptSeventh={attemptSeventh}
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <style jsx global>{`
        .soniqute-home {
          font-family: var(--font-mplus), sans-serif;
        }

        @keyframes artifactAwake {
          0%,
          100% {
            transform: scale(1);
            filter: brightness(0.85);
          }
          50% {
            transform: scale(1.045);
            filter: brightness(1.18);
          }
        }

        @keyframes currentDrift {
          0% {
            transform: translate3d(-12px, 24px, 0);
            opacity: 0;
          }
          30% {
            opacity: 0.65;
          }
          100% {
            transform: translate3d(42px, -54px, 0);
            opacity: 0;
          }
        }

        @keyframes dashFlow {
          to {
            stroke-dashoffset: -24;
          }
        }

        @keyframes finaleFlashPulse {
          0% {
            opacity: 0;
          }
          18% {
            opacity: 1;
          }
          100% {
            opacity: 0;
          }
        }

        @keyframes finaleRingExpand {
          0% {
            transform: translate(-50%, -50%) scale(0.3);
            opacity: 0.95;
          }
          100% {
            transform: translate(-50%, -50%) scale(6);
            opacity: 0;
          }
        }

        @keyframes finaleShimmer {
          to {
            background-position: 220% center;
          }
        }

        .artifact-awake {
          animation: artifactAwake 3.6s ease-in-out infinite;
        }

        .current-particle {
          animation: currentDrift linear infinite;
        }

        .finale-thread {
          animation: dashFlow 3.2s linear infinite;
        }

        .finale-flash {
          background: radial-gradient(
            circle at center,
            rgba(255, 244, 214, 0.9),
            rgba(231, 200, 121, 0.35) 40%,
            transparent 70%
          );
          animation: finaleFlashPulse 1.3s ease-out forwards;
        }

        .finale-shockwave {
          animation: finaleRingExpand 1.7s ease-out forwards;
        }

        .finale-shimmer {
          background: linear-gradient(100deg, #f1dc9e, #f5efd9, #8ce6dc);
          background-size: 220% auto;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: finaleShimmer 4.5s linear infinite;
        }

        @media (prefers-reduced-motion: reduce) {
          .artifact-awake,
          .current-particle,
          .finale-thread,
          .finale-shimmer {
            animation: none;
          }
        }
      `}</style>
    </main>
  );
}
