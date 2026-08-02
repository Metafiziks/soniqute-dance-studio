"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";

interface TraitFile {
  name: string;
  fileName: string;
  weight: number;
  rarity: number;
  isNone?: boolean;
}

interface LayerConfig {
  name: string;
  folderName: string;
  required: boolean;
  order: number;
  traits: TraitFile[];
  frequency: number;
}

interface WeightMap { [traitName: string]: number; }
interface LayerWeights { [layerName: string]: WeightMap; }
interface LayerFrequencies { [layerName: string]: number; }
type Tab = "weights" | "preview" | "cards";

interface LoreTrait {
  code: string;
  name: string;
  level: number;
  label: string;
  text: string;
}
interface GeneratedToken {
  id: number;
  traits: { layer: string; traitName: string; fileName: string; rarity: number }[];
  rarityScore: number;
  rarity: string;
  loreTraits: LoreTrait[];
}

// Sentinel — when a layer is forced to NONE we skip it entirely (no file, no metadata)
const NONE = "__none__";
















// "ALL Vest" = any jacket trait ending in "Vest"








// Outfit → forced Shoes (outfit forces exactly this shoe)













// Heads that ONLY mix with a specific outfit (head forces outfit, outfit doesn't force head)





// Shoes that ONLY mix with a specific outfit (bidirectional lock)
// If this shoe is picked, outfit must be forced; if outfit is set, this shoe is forced













// ─── PaMs RULES ──────────────────────────────────────────────────────────────

// Body, Face, and Head must share the same skin type.
// Trait names follow pattern: "Safari", "Marmalade", "Canary", etc.
const PAMS_SKIN_TYPES = ["Safari", "Marmalade", "Canary", "Caramel", "Jellyfish", "Ebony", "Koi Fish", "Rainbow"];

// Extract skin type from a trait name (e.g. "Safari" from "Body Safari" or "Face Safari")
function pamsSkinType(traitName: string): string | null {
  for (const skin of PAMS_SKIN_TYPES) {
    if (traitName.toLowerCase().includes(skin.toLowerCase())) return skin;
  }
  return null;
}

// Given a picked skin type, exclude any BODY/FACE/HEAD trait that doesn't match
function isPamsSkinExcluded(layerName: string, traitName: string, picks: Map<string, string>): boolean {
  // Only applies to BODY, FACE, HEAD layers (case-insensitive)
  const skinLayers = ["BODY", "FACE", "HEAD"];
  if (!skinLayers.includes(layerName.toUpperCase())) return false;

  const mySkin = pamsSkinType(traitName);

  // Check if any of the other skin layers have already been picked
  for (const [pickedLayer, pickedTrait] of picks) {
    if (pickedTrait === NONE) continue;
    if (!skinLayers.includes(pickedLayer.toUpperCase())) continue;
    if (pickedLayer.toUpperCase() === layerName.toUpperCase()) continue; // skip self
    const pickedSkin = pamsSkinType(pickedTrait);
    if (pickedSkin && mySkin && pickedSkin !== mySkin) return true;
    if (pickedSkin && !mySkin) return true;
  }
  return false;
}

// ─── PaMs ENSEMBLE RULES ─────────────────────────────────────────────────────

// Full-body ensembles cover both upper AND lower body (scuba suits, jumpsuits, etc.)
// When a full-body ensemble is picked, BOTTOM must be NONE.
// Upper-body-only ensembles (everything else in ENSEMBLE layer) allow BOTTOM traits.
const PAMS_FULL_BODY_ENSEMBLES = [
  "Yellow Scuba", "Black Ornament", "Black Spectacle", "Black Vanguard",
  "Blue Blossom", "Blue Classic", "Blue Rashguard", "Blue Spectacle", "Blue Vanguard",
  "Bonanza", "Burgundy Scuba", "Green Classic", "Green Vanguard",
  "Linoluem", "Orange Classic", "Orange Cream Rockstar", "Orange Rashguard",
  "Orange Scuba", "Orange Vanguard", "Persimmon", "Pink Classic", "Pink Concerto",
  "Pink Rashguard", "Poker Face", "Red Classic", "Red Ornament", "Red Rashguard",
  "Red Scuba", "Red Spectacle", "Red Vanguard", "White Scuba", "White Vanguard",
  "Yellow Rashguard",
];

function isPamsFullBodyEnsemble(traitName: string): boolean {
  return PAMS_FULL_BODY_ENSEMBLES.some(e => traitName.toLowerCase() === e.toLowerCase());
}

// ─── END PaMs ENSEMBLE RULES ─────────────────────────────────────────────────

// ─── PaMs TALISMAN / MERMAID TAIL RULES ──────────────────────────────────────

// Talisman/mermaid tail lower body traits cover legs and feet — SHOES must be NONE
const PAMS_TALISMAN_LOWER = [
  "Blue Talisman", "Green Talisman", "Orange Talisman",
  "Pink Talisman", "Purple Talisman", "Red Talisman", "Yellow Talisman",
];

function isPamsTalisman(traitName: string): boolean {
  return PAMS_TALISMAN_LOWER.some(t => traitName.toLowerCase() === t.toLowerCase());
}

// ─── END PaMs TALISMAN RULES ─────────────────────────────────────────────────

// ─── PaMs SHOE INCOMPATIBILITY RULES ─────────────────────────────────────────

// Tall boots, high noons, and rain boots don't mix with certain ensembles and lower body traits
const PAMS_TALL_SHOES = [
  "Brown High Noon", "Black Boot", "White High Noon", "Brown Boot",
  "Black High Noon", "Black Rain", "Blue Rain", "Green Rain",
  "Red Rain", "Yellow Rain", "Orange Rain", "Purple Rain",
];

const PAMS_TALL_SHOE_BLOCKED_ENSEMBLES = [
  "Burgundy Scuba", "Orange Scuba", "Red Scuba", "White Scuba", "Yellow Scuba",
];

const PAMS_TALL_SHOE_BLOCKED_LOWER = [
  "Aquamatic", "Black Flower", "Blue Flower", "Cthulhu",
  "Fish Capri", "Hoister", "Pink Capri", "Red Flower",
];

function isPamsTallShoe(traitName: string): boolean {
  return PAMS_TALL_SHOES.some(s => traitName.toLowerCase() === s.toLowerCase());
}

function isPamsTallShoeBlockedBy(traitName: string): boolean {
  return PAMS_TALL_SHOE_BLOCKED_ENSEMBLES.some(e => traitName.toLowerCase() === e.toLowerCase())
      || PAMS_TALL_SHOE_BLOCKED_LOWER.some(e => traitName.toLowerCase() === e.toLowerCase());
}

// ─── END PaMs SHOE INCOMPATIBILITY RULES ─────────────────────────────────────

// ─── END PaMs RULES ─────────────────────────────────────────────────────────

// FACE and HEAD follow BODY automatically — hide from weights UI and metadata
const PAMS_HIDDEN_LAYERS = ["FACE", "HEAD"];



































































function weightedPick(traits: TraitFile[], weights: WeightMap, excluded: Set<string>): TraitFile | null {
  const available = traits.filter(t => !excluded.has(t.name) && t.name !== "none" && !t.isNone);
  if (!available.length) return traits.length ? traits[0] : null;
  const total = available.reduce((s, t) => s + (weights[t.name] ?? t.rarity ?? 1), 0);
  let r = Math.random() * total;
  for (const t of available) {
    r -= (weights[t.name] ?? t.rarity ?? 1);
    if (r <= 0) return t;
  }
  return available[available.length - 1];
}






































































// ─── PaMs Eternity Genesis — Rarity Tiers ────────────────────────────────────
const PAMS_RARITY_TIERS = [
  {
    name: "Shoreline",
    color: "#ec4899",
    description: "A PaM who has only just touched the surface. Born on the edge of two worlds, they carry the salt of the shore and the pull of something deeper. Common but not ordinary — every legend begins at the waterline.",
  },
  {
    name: "Reef",
    color: "#06b6d4",
    description: "Descended far enough to find the reef — alive, luminous, teeming with memory. These PaMs have survived the shallows and found their footing in Pamlovian waters. They carry the resonance of the Pineapple Gardens.",
  },
  {
    name: "Deep Water",
    color: "#14b8a6",
    description: "Few venture this far without a reason. Deep Water PaMs have heard the distress call of the Celestial Lotus and answered it. Their SNQ frequency cuts through pressure and darkness alike. Rare and purposeful.",
  },
  {
    name: "Abyss",
    color: "#f59e0b",
    description: "The Abyss is not a place — it is a condition. These PaMs have passed through the fire of the Ciphon betrayal, through the collapse of kingdoms, through the silence where music once was. They emerged harder, stranger, and luminous in ways that cannot be explained. Very rare.",
  },
  {
    name: "Pamlovia",
    color: "#a855f7",
    description: "Name written in the Book of Eternity. These PaMs are not merely legendary — they are the legend itself. Direct descendants of the ancient merfolk who first shed their tails and walked ashore, they carry the full weight of Pamlovian history in their circuitry and coral-metal bones. Pamadeus herself would recognize them. Mythic rarity.",
  },
];

// ─── PaMs Eternity Genesis — Lore Stat Definitions ───────────────────────────
const PAMS_LORE_DEFS = [
  { code: "SNQ", name: "Soniq Frequency", levels: [
    { level: 1, label: "Muffled",        text: "Signal barely reaches the surface. The current doesn't carry them yet." },
    { level: 2, label: "Humming",        text: "A faint resonance. Other PaMs stop and listen without knowing why." },
    { level: 3, label: "Tuned In",       text: "Their frequency syncs with the Pamlovian current. Music moves through them." },
    { level: 4, label: "Broadcast",      text: "Glass reefs vibrate. Coral dragons stir. The deep passage opens." },
    { level: 5, label: "Pamadeus-Level", text: "First song shattered reefs, healed sick coral dragons, woke the neon whales. Unmistakable." },
  ]},
  { code: "PPL", name: "Pineapple Index", levels: [
    { level: 1, label: "Yellow",      text: "Raw and unrefined. Common fruit of the Gardens, carried freely before the betrayal." },
    { level: 2, label: "Golden",      text: "Kissed by ancient currents. The sweetness of pre-betrayal Pamlovia still lingers." },
    { level: 3, label: "Orange Flesh",text: "The energy concentrates. This pineapple was tended by a priestess." },
    { level: 4, label: "Purple Core", text: "Deep Pamlovian energy, smoke-touched from the hookah ceremonies of old." },
    { level: 5, label: "Blue Flame",  text: "The rarest expression. Beyond fruit — this is pure Pamlovian life force, distilled." },
  ]},
  { code: "LTS", name: "Lotus Attunement", levels: [
    { level: 1, label: "Dormant",       text: "No awareness of the Lotus. The signal hasn't reached them." },
    { level: 2, label: "Flickering",    text: "Dreams of a thirty-thousand-year-old flower. Doesn't know what it means." },
    { level: 3, label: "Attuned",       text: "Can hear the Lotus pulse. Feels the distress call from across the world." },
    { level: 4, label: "Bonded",        text: "The Lotus and lineage are linked. Tides bend. Currents heal at their presence." },
    { level: 5, label: "Lotus Guardian",text: "Suraya and Jamari would recognize this bond. The ocean itself has endorsed them." },
  ]},
  { code: "CPN", name: "Conch Pulse", levels: [
    { level: 1, label: "Local",         text: "Signal reaches the next room. Maybe." },
    { level: 2, label: "District",      text: "One city block of Pamlovia hears the anthem. A start." },
    { level: 3, label: "City-Wide",     text: "One of the five cities picks up the broadcast clearly." },
    { level: 4, label: "Cross-City",    text: "The conch speaker system built by elder PaMs carries their signal across multiple cities." },
    { level: 5, label: "Pan-Pamlovian", text: "All five cities — Serengana, Tashinogo, Parsippius, Apollora, Bokonagwe — receive the signal simultaneously." },
  ]},
  { code: "TDR", name: "Tide Resistance", levels: [
    { level: 1, label: "Surface Only",  text: "Struggles in deep water. Best suited for shore life." },
    { level: 2, label: "Wader",         text: "Can hold the transition for short stretches. Gets tired quickly." },
    { level: 3, label: "Amphibious",    text: "Comfortable in both worlds. The original PaM condition, maintained with discipline." },
    { level: 4, label: "Tidal",         text: "Moves between worlds like the tide itself — natural, rhythmic, effortless." },
    { level: 5, label: "Current-Born",  text: "The ocean restored them. No world can hold them against their will. Suraya and Jamari walk at this level." },
  ]},
  { code: "CPH", name: "Cipher Guard", levels: [
    { level: 1, label: "Unguarded",       text: "Would invite the Ciphons in. Would offer them tea. Would show them the Gardens." },
    { level: 2, label: "Suspicious",      text: "Something felt off. Didn't act on it. The pineapples were already harvested." },
    { level: 3, label: "Wary",            text: "Has studied the Ciphon shape-shifting patterns. Won't be fooled twice." },
    { level: 4, label: "Ciphon-Scarred",  text: "Survived the betrayal. The experience burned the deception-sense into their bones." },
    { level: 5, label: "Impenetrable",    text: "No Ciphon mimicry can penetrate this. They see through disguise before the disguise forms." },
  ]},
];

// ─── PaMs Cities ─────────────────────────────────────────────────────────────
const PAMS_CITIES = [
  { name: "Serengana",  color: "#ec4899" },
  { name: "Tashinogo",  color: "#06b6d4" },
  { name: "Parsippius", color: "#14b8a6" },
  { name: "Apollora",   color: "#f59e0b" },
  { name: "Bokonagwe",  color: "#a855f7" },
];

function getPamsCity(id: number): { name: string; color: string } {
  return PAMS_CITIES[id % PAMS_CITIES.length];
}

function assignPamsLoreAndRarity(traits: GeneratedToken["traits"], liveWeights: LayerWeights): Pick<GeneratedToken, "loreTraits" | "rarityScore" | "rarity"> {
  // Exclude BACKGROUND from scoring — not used on collectible cards
  const scoringTraits = traits.filter(t => t.layer !== "BACKGROUND");
  const traitScores = scoringTraits.map(t => {
    const lw = liveWeights[t.layer] ?? {};
    const tot = Object.values(lw).reduce((s: number, v: number) => s + v, 0);
    const w = lw[t.traitName] ?? 1;
    const pct = tot > 0 ? (w / tot) * 100 : 100 / Math.max(1, Object.keys(lw).length);
    return Math.round(95 - Math.log(Math.max(0.5, pct)) / Math.log(100) * 80);
  });
  const sorted = [...traitScores].sort((a, b) => b - a);
  const top3 = sorted.slice(0, Math.min(3, sorted.length));
  const baseScore = top3.reduce((s, v) => s + v, 0) / top3.length;

  // Better entropy: hash all trait names for more per-card variance
  let hash = 0;
  for (const t of scoringTraits) { for (let i = 0; i < t.traitName.length; i++) { hash = ((hash << 5) - hash + t.traitName.charCodeAt(i)) | 0; } }
  const entropy = (Math.sin(hash * 0.0001) * 25);
  const rarityScore = Math.min(99, Math.max(1, Math.round(baseScore + entropy)));

  const tier = rarityScore >= 93 ? PAMS_RARITY_TIERS[4]
    : rarityScore >= 83 ? PAMS_RARITY_TIERS[3]
    : rarityScore >= 71 ? PAMS_RARITY_TIERS[2]
    : rarityScore >= 51 ? PAMS_RARITY_TIERS[1]
    : PAMS_RARITY_TIERS[0];

  const tierIdx = rarityScore >= 93 ? 4 : rarityScore >= 83 ? 3 : rarityScore >= 71 ? 2 : rarityScore >= 51 ? 1 : 0;

  // Stat ranges per tier — higher tiers guaranteed higher minimums
  // Shoreline: 15-55, Reef: 30-70, Deep Water: 45-80, Abyss: 60-90, Pamlovia: 75-99
  const statMin = [15, 30, 45, 60, 75][tierIdx];
  const statMax = [55, 70, 80, 90, 99][tierIdx];

  const loreTraits: LoreTrait[] = PAMS_LORE_DEFS.map((def, defIdx) => {
    // Per-stat seed from trait combo + stat index
    const statSeed = Math.sin(hash * 3.17 + defIdx * 71.9) * 0.5 + 0.5; // 0 to 1
    const rawScore = Math.round(statMin + statSeed * (statMax - statMin));
    const score = Math.min(100, Math.max(1, rawScore));
    const level = score >= 81 ? 5 : score >= 61 ? 4 : score >= 41 ? 3 : score >= 21 ? 2 : 1;
    const levelData = def.levels[level - 1];
    return { code: def.code, name: def.name, level, label: levelData.label, text: levelData.text };
  });

  return { rarityScore, rarity: tier.name, loreTraits };
}





































function generateToken(id: number, layers: LayerConfig[], layerOrder: string[], weights: LayerWeights, frequencies: LayerFrequencies, collection = "pams"): GeneratedToken {
  const picks = new Map<string, string>();
  const traitToFile = new Map<string, TraitFile>();
  const selectedNames = new Set<string>();

  // For PaMs: pick BODY first so its rarity weights drive skin type selection,
  // then HEAD/FACE will match. Render order stays the same.
  let pickOrder = [...layerOrder];
  if (collection === "pams") {
    const bodyIdx = pickOrder.findIndex(l => l.toUpperCase() === "BODY");
    if (bodyIdx > 0) {
      const [body] = pickOrder.splice(bodyIdx, 1);
      pickOrder.unshift(body);
    }
  }

  for (const layerName of pickOrder) {
    const layer = layers.find(l => l.name === layerName);
    if (!layer) continue;

    if (picks.has(layerName)) continue;

    const freq = frequencies[layerName] ?? layer.frequency ?? 100;
    if (freq < 100 && Math.random() * 100 > freq) {
      picks.set(layerName, NONE);
      continue;
    }

    const excluded = new Set<string>();
    const currentOutfit = picks.get("Outfit");
    for (const t of layer.traits) {
      // PaMs skin type matching: BODY/FACE/HEAD must share the same skin type
      if (collection === "pams" && isPamsSkinExcluded(layerName, t.name, picks)) excluded.add(t.name);

      // PaMs ensemble rules: full-body ensembles can't pair with LOWER BODY traits
      if (collection === "pams" && layerName.toUpperCase() === "LOWER BODY") {
        // If a full-body ensemble was already picked, exclude ALL lower body traits
        for (const [pl, pt] of picks) {
          if (pl.toUpperCase() === "ENSEMBLE" && pt !== NONE && isPamsFullBodyEnsemble(pt)) {
            excluded.add(t.name);
          }
        }
      }

      // PaMs talisman rules: talisman lower body traits force SHOES to NONE
      if (collection === "pams" && layerName.toUpperCase() === "SHOES") {
        for (const [pl, pt] of picks) {
          if (pl.toUpperCase() === "LOWER BODY" && pt !== NONE && isPamsTalisman(pt)) {
            excluded.add(t.name);
          }
        }
      }

      // PaMs tall shoe rules: boots/high noons/rain boots don't mix with certain ensembles/lower body
      if (collection === "pams") {
        // If picking SHOES: exclude tall shoes if a blocked ensemble or lower body was picked
        if (layerName.toUpperCase() === "SHOES" && isPamsTallShoe(t.name)) {
          for (const [pl, pt] of picks) {
            if (pt === NONE) continue;
            if ((pl.toUpperCase() === "ENSEMBLE" || pl.toUpperCase() === "LOWER BODY") && isPamsTallShoeBlockedBy(pt)) {
              excluded.add(t.name);
            }
          }
        }
        // If picking ENSEMBLE: exclude blocked ensembles if a tall shoe was already picked
        if (layerName.toUpperCase() === "ENSEMBLE" && PAMS_TALL_SHOE_BLOCKED_ENSEMBLES.some(e => t.name.toLowerCase() === e.toLowerCase())) {
          for (const [pl, pt] of picks) {
            if (pl.toUpperCase() === "SHOES" && pt !== NONE && isPamsTallShoe(pt)) {
              excluded.add(t.name);
            }
          }
        }
        // If picking LOWER BODY: exclude blocked lower body traits if a tall shoe was already picked
        if (layerName.toUpperCase() === "LOWER BODY" && PAMS_TALL_SHOE_BLOCKED_LOWER.some(e => t.name.toLowerCase() === e.toLowerCase())) {
          for (const [pl, pt] of picks) {
            if (pl.toUpperCase() === "SHOES" && pt !== NONE && isPamsTallShoe(pt)) {
              excluded.add(t.name);
            }
          }
        }
      }

    }

    const trait = weightedPick(layer.traits, weights[layerName] ?? {}, excluded);
    if (!trait) continue;

    picks.set(layerName, trait.name);
    traitToFile.set(`${layerName}:${trait.name}`, trait);
    selectedNames.add(trait.name);

    // PaMs: full-body ensemble covers both top and bottom — force LOWER BODY to NONE
    if (collection === "pams" && layerName.toUpperCase() === "ENSEMBLE" && isPamsFullBodyEnsemble(trait.name)) {
      const bottomKey = layerOrder.find(l => l.toUpperCase() === "LOWER BODY") ?? "LOWER BODY";
      picks.set(bottomKey, NONE);
    }

    // PaMs: talisman/mermaid tail covers feet — force SHOES to NONE
    if (collection === "pams" && layerName.toUpperCase() === "LOWER BODY" && isPamsTalisman(trait.name)) {
      const shoesKey = layerOrder.find(l => l.toUpperCase() === "SHOES") ?? "SHOES";
      picks.set(shoesKey, NONE);
    }

  }

  for (const [layerName, traitName] of picks) {
    if (traitName === NONE || traitToFile.has(`${layerName}:${traitName}`)) continue;
    const layer = layers.find(l => l.name === layerName);
    if (!layer) continue;
    const found = layer.traits.find(t => t.name === traitName);
    if (found) traitToFile.set(`${layerName}:${traitName}`, found);
  }

  const result: GeneratedToken["traits"] = [];
  for (const layerName of layerOrder) {
    const traitName = picks.get(layerName);
    if (!traitName || traitName === NONE) continue;
    const tf = traitToFile.get(`${layerName}:${traitName}`);
    if (!tf || tf.isNone || tf.name === "none") continue;
    result.push({ layer: layerName, traitName: tf.name, fileName: tf.fileName, rarity: tf.rarity });
  }

  const { rarityScore, rarity, loreTraits } = collection === "pams"
    ? assignPamsLoreAndRarity(result, weights)
    : assignLoreAndRarity(result, weights);

  return { id, traits: result, rarityScore, rarity, loreTraits };
}




































function CompositeImage({ token, size = 200, onClick, collection = "pams" }: { token: GeneratedToken; size?: number; onClick?: () => void; collection?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;
    let cancelled = false;
    async function draw() {
      if (!ctx) return;
      // For pams preview, skip BACKGROUND layer
      const traitsToRender = collection === "pams"
        ? token.traits.filter(e => e.layer !== "BACKGROUND")
        : token.traits;
      for (const entry of traitsToRender) {
        if (cancelled) return;
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = `/layers/${entry.layer}/${entry.fileName}?collection=${collection}`; });
          if (!cancelled) ctx.drawImage(img, 0, 0, size, size);
        } catch { /* skip */ }
      }
      if (!cancelled) setDone(true);
    }
    draw();
    return () => { cancelled = true; };
  }, [token, size]);

  return (
    <canvas ref={canvasRef} width={size} height={size} onClick={onClick}
      style={{ display: "block", width: "100%", aspectRatio: "1", imageRendering: "pixelated", borderRadius: 5, border: "1.5px solid #e8e4dc", background: "#1a1a1a", opacity: done ? 1 : 0.15, transition: "opacity 0.3s", cursor: onClick ? "pointer" : "default" }} />
  );
}

// ─── TOKEN THUMBNAIL CANVAS ──────────────────────────────────────────────────
function TokenCanvas({ token, onClick, collection = "pams" }: { token: GeneratedToken; onClick?: () => void; collection?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const W = 375, H = 525;
  const ART_H = Math.floor(H * 0.50);

  const rarityScore = token.rarityScore;

  const isPams = collection === "pams";
  const tierColor = isPams
    ? (PAMS_RARITY_TIERS.find(t => t.name === token.rarity)?.color ?? "#ffffff")
    : (token.rarity === "Bag Lord"   ? "#ffd700"
      : token.rarity === "Cosmic Bag" ? "#ff6b35"
      : token.rarity === "Mega Bag"   ? "#b366ff"
      : token.rarity === "Baby Bag"   ? "#4a9eff"
      : "#6b6b6b");
  const tier = { name: token.rarity, color: tierColor };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;

    async function draw() {
      if (!ctx || !canvas) return;
      const W2 = canvas.width, H2 = canvas.height;
      const ART_H2 = Math.floor(H2 * 0.50);
      const PAD = Math.floor(W2 * 0.04);
      const BORDER = 4;
      const RADIUS = 14;
      const tierColor = tier.color;

      ctx.fillStyle = "#0d0d0d";
      ctx.beginPath();
      ctx.roundRect(0, 0, W2, H2, RADIUS);
      ctx.fill();

      ctx.save();
      ctx.globalAlpha = 0.03;
      for (let i = 0; i < 2000; i++) {
        ctx.fillStyle = Math.random() > 0.5 ? "#fff" : "#000";
        ctx.fillRect(Math.random() * W2, Math.random() * H2, 1, 1);
      }
      ctx.restore();

      ctx.save();
      ctx.shadowColor = tierColor;
      ctx.shadowBlur = 16;
      ctx.strokeStyle = tierColor;
      ctx.lineWidth = BORDER;
      ctx.beginPath();
      ctx.roundRect(BORDER / 2, BORDER / 2, W2 - BORDER, H2 - BORDER, RADIUS);
      ctx.stroke();
      ctx.restore();

      ctx.strokeStyle = "rgba(255,255,255,0.06)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(BORDER + 3, BORDER + 3, W2 - BORDER * 2 - 6, H2 - BORDER * 2 - 6, RADIUS - 2);
      ctx.stroke();

      const HEADER_H = Math.floor(H2 * 0.068);
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      ctx.fillRect(BORDER, BORDER, W2 - BORDER * 2, HEADER_H);

      ctx.fillStyle = "#f5f0e8";
      ctx.font = `bold ${Math.floor(H2 * 0.030)}px 'DM Mono', monospace`;
      ctx.textBaseline = "middle";
      const collLabel = isPams ? "PAMS" : "BAGS BRO!";
      ctx.fillText(`${collLabel} #${token.id}`, PAD + BORDER, BORDER + HEADER_H / 2);

      const badgeTxt = tier.name.toUpperCase();
      ctx.font = `bold ${Math.floor(H2 * 0.022)}px 'DM Mono', monospace`;
      const bw = ctx.measureText(badgeTxt).width + 12;
      const bx = W2 - BORDER - PAD - bw;
      const by = BORDER + (HEADER_H - 16) / 2;
      ctx.fillStyle = tierColor + "33";
      ctx.beginPath();
      ctx.roundRect(bx, by, bw, 16, 4);
      ctx.fill();
      ctx.fillStyle = tierColor;
      ctx.fillText(badgeTxt, bx + 6, BORDER + HEADER_H / 2);

      const ART_Y = BORDER + HEADER_H + 4;
      const ART_W = W2 - BORDER * 2 - 8;
      ctx.save();
      ctx.beginPath();
      ctx.roundRect(BORDER + 4, ART_Y, ART_W, ART_H2, 6);
      ctx.clip();
      ctx.fillStyle = "#111";
      ctx.fillRect(BORDER + 4, ART_Y, ART_W, ART_H2);
      const traitsToRender = isPams
        ? token.traits.filter(e => e.layer !== "BACKGROUND")
        : token.traits;
      for (const entry of traitsToRender) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = `/layers/${entry.layer}/${entry.fileName}?collection=${collection}`; });
          ctx.drawImage(img, BORDER + 4, ART_Y, ART_W, ART_H2);
        } catch { /* skip */ }
      }
      ctx.restore();

      ctx.fillStyle = tierColor + "44";
      ctx.fillRect(BORDER + 4, ART_Y + ART_H2, ART_W, 2);

      const LORE_Y = ART_Y + ART_H2 + 8;
      const LORE_H = H2 - LORE_Y - BORDER - 4;
      const loreTraits = token.loreTraits;
      const ROW_H = Math.floor(LORE_H / loreTraits.length);
      const COL1 = BORDER + PAD;
      const CODE_W = Math.floor(W2 * 0.10);
      const BAR_W = Math.floor(W2 * 0.18);
      const BAR_H = 4;

      ctx.font = `bold ${Math.floor(H2 * 0.020)}px 'DM Mono', monospace`;

      loreTraits.forEach((lt, i) => {
        const ry = LORE_Y + i * ROW_H;
        const cy = ry + ROW_H / 2;
        const lc = LORE_LEVEL_COLORS[lt.level - 1] ?? "#6b6b6b";

        if (i % 2 === 0) {
          ctx.fillStyle = "rgba(255,255,255,0.025)";
          ctx.fillRect(BORDER, ry + 1, W2 - BORDER * 2, ROW_H - 2);
        }

        ctx.font = `bold ${Math.floor(H2 * 0.020)}px 'DM Mono', monospace`;
        ctx.fillStyle = lc + "33";
        ctx.beginPath();
        ctx.roundRect(COL1, cy - 7, CODE_W, 14, 3);
        ctx.fill();
        ctx.fillStyle = lc;
        ctx.textBaseline = "middle";
        ctx.fillText(lt.code, COL1 + 4, cy);

        ctx.fillStyle = "#e8e4dc";
        ctx.font = `600 ${Math.floor(H2 * 0.019)}px 'DM Mono', monospace`;
        ctx.fillText(lt.label, COL1 + CODE_W + 8, cy);

        const barX = W2 - BORDER - PAD - BAR_W;
        for (let p = 0; p < 5; p++) {
          ctx.fillStyle = p < lt.level ? lc : "rgba(255,255,255,0.1)";
          ctx.beginPath();
          ctx.roundRect(barX + p * (BAR_W / 5 + 1), cy - BAR_H / 2, BAR_W / 5 - 1, BAR_H, 2);
          ctx.fill();
        }
      });

      const scoreY = H2 - BORDER - 14;
      ctx.fillStyle = "rgba(255,255,255,0.03)";
      ctx.fillRect(BORDER, scoreY - 3, W2 - BORDER * 2, 17);
      ctx.font = `${Math.floor(H2 * 0.018)}px 'DM Mono', monospace`;
      ctx.fillStyle = "#555";
      ctx.textBaseline = "middle";
      ctx.fillText(`RARITY SCORE: ${rarityScore.toFixed(0)}  ·  ${token.traits.length} TRAITS`, PAD + BORDER, scoreY + 6);
    }

    draw();
  }, [token, tier]);

  return (
    <canvas
      ref={canvasRef}
      width={W * 2}
      height={H * 2}
      onClick={onClick}
      style={{ display: "block", width: W, height: H, imageRendering: "pixelated", borderRadius: 8, cursor: onClick ? "pointer" : "default", flexShrink: 0 }}
    />
  );
}

function InspectModal({ token, onClose, collection = "pams" }: { token: GeneratedToken; onClose: () => void; collection?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const SIZE = 600;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.imageSmoothingEnabled = false;
    async function draw() {
      if (!ctx) return;
      const traitsToRender = collection === "pams"
        ? token.traits.filter(e => e.layer !== "BACKGROUND")
        : token.traits;
      for (const entry of traitsToRender) {
        try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); img.src = `/layers/${entry.layer}/${entry.fileName}?collection=${collection}`; });
          ctx.drawImage(img, 0, 0, SIZE, SIZE);
        } catch { /* skip */ }
      }
    }
    draw();
  }, [token]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${collection}-${token.id}.png`;
    a.click();
  }

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: "#fff", borderRadius: 12, border: "2px solid #1a1a1a", width: 820, maxHeight: "92vh", overflowY: "auto", fontFamily: "'DM Mono', monospace" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderBottom: "1.5px solid #e8e4dc" }}>
          <div style={{ fontWeight: 700, fontSize: 15 }}>{collection === "pams" ? "PaMs" : "Bags Bro!"} #{token.id}</div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#aaa", lineHeight: 1, padding: 0 }}>✕</button>
        </div>
        <div style={{ display: "flex" }}>
          <div style={{ flexShrink: 0, padding: 20 }}>
            <canvas ref={canvasRef} width={SIZE} height={SIZE} style={{ display: "block", width: 360, height: 360, imageRendering: "pixelated", borderRadius: 8, border: "1.5px solid #e8e4dc", background: "#0a0f1a" }} />
            <button onClick={download} style={{ marginTop: 12, width: "100%", background: "#1a1a1a", color: "#f7c948", border: "none", borderRadius: 7, padding: "11px 0", fontSize: 11, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", letterSpacing: "0.06em" }}>↓ DOWNLOAD TOKEN</button>
          </div>
          <div style={{ flex: 1, padding: "20px 20px 20px 0" }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "#aaa", textTransform: "uppercase", marginBottom: 10 }}>Properties · {token.traits.filter(t => !(collection === "pams" && PAMS_HIDDEN_LAYERS.includes(t.layer.toUpperCase()))).length} traits</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              {token.traits.filter(t => !(collection === "pams" && PAMS_HIDDEN_LAYERS.includes(t.layer.toUpperCase()))).map(t => (
                <div key={t.layer} style={{ background: "#f7f5f0", border: "1.5px solid #e8e4dc", borderRadius: 7, padding: "9px 11px" }}>
                  <div style={{ fontSize: 8, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 2 }}>{t.layer}</div>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{t.traitName}</div>
                  <div style={{ fontSize: 9, color: "#888", marginTop: 2 }}>{t.rarity.toFixed(1)}% have this</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Card Renderer ────────────────────────────────────────────────────────────
const TEAMS = [
  { city: "BAGLYN, N.Y., USA",          team: "Baglyn Loafers",         color: "#e63232" },
  { city: "BAGUIO CITY, PHILIPPINES",   team: "Baguio City Crackpots",  color: "#4488ff" },
  { city: "BAGCOUVER B.C., CANADA",     team: "Bagcouver Goobers",      color: "#ff66bb" },
  { city: "BAGALURU, INDIA",            team: "Bagaluru Boneheads",     color: "#f7c948" },
  { city: "BAGSTON, JAMAICA",           team: "Bagston Ragamuffs",      color: "#22cc55" },
  { city: "BAGASAKI, JAPAN",            team: "Bagasaki Clodhoppers",   color: "#ffd700" },
  { city: "BAGJING, CHINA",             team: "Bagjing Fumbletons",     color: "#ff6622" },
  { city: "BAGNIN CITY, NIGERIA",       team: "Bagnin City Bozos",      color: "#cccccc" },
  { city: "BAGCELONA, SPAIN",           team: "Bagcelona Mudbrains",    color: "#bb44ff" },
  { city: "BAGOTA, COLOMBIA",           team: "Bagota Numbskulls",      color: "#00e5ff" },
];

function getTeam(id: number): { city: string; team: string; color: string } {
  return TEAMS[id % TEAMS.length];
}

const BAG_FIRST = [
  "Bag","Blick","Buck","Dolla","Stack","Bread","Chedda","Guap","Scrilla","Bankroll",
  "Monie","Funds","Skrilla","Peso","Rack","Sack","Gwap","Knot","Roll","Grip",
  "Chip","Coin","Loot","Cake","Cream","Paper","Scratch","Dinero","Stash","Float",
  "Vault","Mint","Cash","Flow","Note","Bill","Flex","Drip","Swag","Clout",
  "Sauce","Wave","Plug","Score","Haul","Tote","Duffle","Clutch","Satchel","Hobo",
  "Fanny","Wristlet","Knapsack","Bindle","Carryall","Messenger","Portman","Pouchie","Sling","Barrel",
];

const BAG_LAST = [
  "Bagley","Baggson","Moneyhands","Stacksworth","Blickey","Fundsworth",
  "Breadshaw","Cheddarfield","Guapkins","Dollaman","Rackley","Knotson",
  "Gripley","Sackwell","Baguette","Cashford","Banksworth","Scrillano",
  "Pesoworth","Bundlesby","Lootridge","Cakeman","Creamfield","Paperboy",
  "Scratchson","Dineroson","Stashton","Floatwell","Vaultman","Mintworth",
  "Billford","Flexington","Dripley","Swagson","Cloutsworth","Sauceman",
  "Waverly","Plugsworth","Scoreson","Haulman","Toteingham","Duffleman",
  "Clutchworth","Satchelson","Hoboken","Fannypack","Wristleton","Knapsackson",
  "Bindleworth","Carryallson","Messengerton","Portmanson","Pouchsworth","Slingby",
  "Barrelton","Baggington","Stackman","Breadington","Moneyton","Coinsley",
];

function seededRand(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223 | 0;
    return (s >>> 0) / 0x100000000;
  };
}

function getBagName(id: number): string {
  const rng = seededRand(id * 7919);
  const fi = Math.floor(rng() * BAG_FIRST.length);
  const li = Math.floor(rng() * BAG_LAST.length);
  return `${BAG_FIRST[fi]} ${BAG_LAST[li]}`;
}

interface ColorAdj {
  brightness?: number;
  contrast?:   number;
  highlights?: number;
  shadows?:    number;
  saturation?: number;
  temperature?: number;
  tint?:        number;
  sepia?:       number;
  sharpness?:   number;
}

function buildFilter(adj: ColorAdj): string {
  const parts: string[] = [];
  if (adj.brightness !== undefined && adj.brightness !== 100) parts.push(`brightness(${adj.brightness}%)`);
  if (adj.contrast   !== undefined && adj.contrast   !== 100) parts.push(`contrast(${adj.contrast}%)`);
  if (adj.saturation !== undefined && adj.saturation !== 100) parts.push(`saturate(${adj.saturation}%)`);
  if (adj.sepia      !== undefined && adj.sepia      !== 0)   parts.push(`sepia(${adj.sepia}%)`);
  if (adj.temperature !== undefined && adj.temperature !== 0) {
    const hueShift = -adj.temperature * 0.3;
    parts.push(`hue-rotate(${hueShift}deg)`);
  }
  if (adj.tint !== undefined && adj.tint !== 0) {
    const tintShift = adj.tint * 0.15;
    parts.push(`hue-rotate(${tintShift}deg)`);
  }
  return parts.length ? parts.join(" ") : "none";
}

function drawCardToCanvas(
  canvas: HTMLCanvasElement,
  token: GeneratedToken,
  renderW: number,
  renderH: number,
  adj: ColorAdj = {},
  collection = "pams",
  format: "large" | "small" = "large"
): Promise<void> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve();

  const loadImg = (src: string) => new Promise<HTMLImageElement | null>(resolve => {
    const img = new Image();
    img.onload  = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });

  // ── PaMs card renderer ──────────────────────────────────────────────────────
  if (collection === "pams") {

    // ── PaMs SMALL card (2.5x3.5 TCG) ────────────────────────────────────────
    if (format === "small") {
      const STW = 1097, STH = 1536;
      const SP_ART      = { x: 133, y: 200, w: 827, h: 950 };
      const SP_CHAR_SIZE = 900;
      const SP_CHAR_X    = Math.round((STW - SP_CHAR_SIZE) / 2);
      const SP_CHAR_Y    = 230;
      const SP_CITY_Y    = 1295;
      const SP_RARITY_Y  = 1260;

      const cityData = getPamsCity(token.id);
      const rc = PAMS_RARITY_TIERS.find(t => t.name === token.rarity)?.color ?? "#ffffff";
      const tc = cityData.color;
      const cardTraits = token.traits.filter(t => t.layer !== "BACKGROUND");

      return Promise.all([
        loadImg(`/api/collections-static/pams/card_template_small.png`),
        ...cardTraits.map(t => loadImg(`/layers/${t.layer}/${t.fileName}?collection=pams`)),
      ]).then(([tmpl, ...artLayers]) => {
        ctx.imageSmoothingEnabled = true;
        const scale = renderW / STW;
        ctx.save();
        ctx.scale(scale, scale);

        // 1. Template first
        if (tmpl) ctx.drawImage(tmpl, 0, 0, STW, STH);

        // Detect talisman early — needed to skip blur
        const hasTalisman = cardTraits.some(t => isPamsTalisman(t.traitName));

        // 2. Edge blur behind character — SKIP for talisman (rock bleeds through)
        if (!hasTalisman) {
          const blurCanvas = document.createElement("canvas");
          blurCanvas.width = STW; blurCanvas.height = STH;
          const blurCtx = blurCanvas.getContext("2d");
          if (blurCtx) {
            blurCtx.imageSmoothingEnabled = true;
            blurCtx.filter = "blur(4px)";
            artLayers.forEach(img => {
              if (img) blurCtx.drawImage(img, SP_CHAR_X, SP_CHAR_Y, SP_CHAR_SIZE, SP_CHAR_SIZE);
            });
            blurCtx.filter = "none";
            ctx.save();
            ctx.beginPath();
            ctx.rect(SP_ART.x, SP_ART.y, SP_ART.w, SP_ART.h);
            ctx.clip();
            ctx.drawImage(blurCanvas, 0, 0);
            ctx.restore();
          }
        }

        // 3. Character — offscreen canvas for talisman fade

        if (hasTalisman) {
          const charCanvas = document.createElement("canvas");
          charCanvas.width = STW; charCanvas.height = STH;
          const charCtx = charCanvas.getContext("2d");
          if (charCtx) {
            charCtx.imageSmoothingEnabled = true;
            charCtx.filter = buildFilter(adj);
            artLayers.forEach(img => {
              if (img) charCtx.drawImage(img, SP_CHAR_X, SP_CHAR_Y, SP_CHAR_SIZE, SP_CHAR_SIZE);
            });
            charCtx.filter = "none";
            // Bottom fade mask: erase the bottom 35% of the character image.
            const fadeStart = SP_CHAR_Y + SP_CHAR_SIZE * 0.80;
            const fadeEnd   = SP_CHAR_Y + SP_CHAR_SIZE;
            charCtx.globalCompositeOperation = "destination-out";
            const fadeGrad = charCtx.createLinearGradient(0, fadeStart, 0, fadeEnd);
            fadeGrad.addColorStop(0, "rgba(255,255,255,0)");
            fadeGrad.addColorStop(0.3, "rgba(255,255,255,0.8)");
            fadeGrad.addColorStop(0.6, "rgba(255,255,255,1)");
            fadeGrad.addColorStop(1, "rgba(255,255,255,1)");
            charCtx.fillStyle = fadeGrad;
            charCtx.fillRect(0, fadeStart, STW, fadeEnd - fadeStart);
            ctx.save();
            ctx.beginPath();
            ctx.rect(SP_ART.x, SP_ART.y, SP_ART.w, SP_ART.h);
            ctx.clip();
            ctx.drawImage(charCanvas, 0, 0);
            ctx.restore();
          }
        } else {
          ctx.save();
          ctx.beginPath();
          ctx.rect(SP_ART.x, SP_ART.y, SP_ART.w, SP_ART.h);
          ctx.clip();
          ctx.filter = buildFilter(adj);
          artLayers.forEach(img => {
            if (img) ctx.drawImage(img, SP_CHAR_X, SP_CHAR_Y, SP_CHAR_SIZE, SP_CHAR_SIZE);
          });
          ctx.filter = "none";
          ctx.restore();
        }

        // 4. Stat orbs
        const orbPositions = [
          { x: 175,  y: 750 },
          { x: 215,  y: 870 },
          { x: 255,  y: 990 },
          { x: 922, y: 750 },
          { x: 882,  y: 870 },
          { x: 842,  y: 990 },
        ];

        token.loreTraits.forEach((lt, i) => {
          if (i >= 6) return;
          const pos = orbPositions[i];
          const statSeed = Math.sin(token.id * 17.3 + i * 31.7) * 0.5 + 0.5; const val = Math.min(99, Math.max(1, Math.round(lt.level * 15 + statSeed * 24)));
          const orbR = 22 + lt.level * 5;

          // Outer glow
          ctx.save();
          ctx.shadowColor = rc; ctx.shadowBlur = 20;
          ctx.beginPath(); ctx.arc(pos.x, pos.y, orbR, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(0,0,0,0.01)"; ctx.fill();
          ctx.restore();

          // Orb body
          const orbGrad = ctx.createRadialGradient(
            pos.x - orbR * 0.2, pos.y - orbR * 0.25, orbR * 0.1, pos.x, pos.y, orbR
          );
          orbGrad.addColorStop(0, "rgba(255,255,255,0.95)");
          orbGrad.addColorStop(0.3, rc + "cc");
          orbGrad.addColorStop(0.7, rc + "88");
          orbGrad.addColorStop(1, rc + "22");
          ctx.beginPath(); ctx.arc(pos.x, pos.y, orbR, 0, Math.PI * 2);
          ctx.fillStyle = orbGrad; ctx.fill();

          // Glass highlight
          const hlGrad = ctx.createRadialGradient(
            pos.x - orbR * 0.25, pos.y - orbR * 0.3, orbR * 0.05,
            pos.x - orbR * 0.15, pos.y - orbR * 0.2, orbR * 0.5
          );
          hlGrad.addColorStop(0, "rgba(255,255,255,0.8)");
          hlGrad.addColorStop(1, "rgba(255,255,255,0)");
          ctx.beginPath(); ctx.arc(pos.x, pos.y, orbR, 0, Math.PI * 2);
          ctx.fillStyle = hlGrad; ctx.fill();

          // Number
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.font = `900 ${Math.round(orbR * 0.8)}px "Courier New",monospace`;
          ctx.fillStyle = "#ffffff"; ctx.shadowColor = "rgba(0,0,0,0.6)"; ctx.shadowBlur = 3;
          ctx.fillText(String(val), pos.x, pos.y + 1);
          ctx.shadowBlur = 0;

          // Label above — larger, bolder, with dark halo for visibility
          ctx.font = `900 26px "Courier New",monospace`;
          ctx.fillStyle = "rgba(0,0,0,0.6)";
          ctx.fillText(lt.code, pos.x + 1, pos.y - orbR - 13 + 1);
          ctx.fillText(lt.code, pos.x - 1, pos.y - orbR - 13 - 1);
          ctx.fillStyle = "#ffffff"; ctx.shadowColor = "rgba(0,0,0,0.9)"; ctx.shadowBlur = 8;
          ctx.fillText(lt.code, pos.x, pos.y - orbR - 13);
          ctx.shadowBlur = 0;
        });

        // 5. City name in nameplate — faction color (bottom)
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.font = `700 32px "Courier New",monospace`;
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillText(cityData.name.toUpperCase(), STW / 2 + 1, SP_CITY_Y + 1);
        ctx.fillStyle = tc;
        ctx.shadowColor = "#ffffff"; ctx.shadowBlur = 28;
        ctx.fillText(cityData.name.toUpperCase(), STW / 2, SP_CITY_Y);
        ctx.fillText(cityData.name.toUpperCase(), STW / 2, SP_CITY_Y);
        ctx.shadowBlur = 0;

        // 6. Rarity tier — rarity color, matches orbs (top)
        ctx.font = `900 36px "Courier New",monospace`;
        ctx.fillStyle = "rgba(0,0,0,0.25)";
        ctx.fillText(token.rarity.toUpperCase(), STW / 2 + 1, SP_RARITY_Y + 1);
        ctx.fillStyle = rc;
        ctx.shadowColor = "#ffffff"; ctx.shadowBlur = 28;
        ctx.fillText(token.rarity.toUpperCase(), STW / 2, SP_RARITY_Y);
        ctx.fillText(token.rarity.toUpperCase(), STW / 2, SP_RARITY_Y);
        ctx.shadowBlur = 0;

        ctx.restore();
      });
    }
    // ── END PaMs small ───────────────────────────────────────────────────────

    // ── PaMs LARGE card ──────────────────────────────────────────────────────
    const PTW = 1122, PTH = 1797;
    const PAMS_CITY_Y    = 1545;
    const PAMS_RARITY_Y  = 1480;

    const cityData = getPamsCity(token.id);
    const rc = PAMS_RARITY_TIERS.find(t => t.name === token.rarity)?.color ?? "#ffffff";
    const tc = cityData.color;

    // Filter out BACKGROUND layer — not rendered on card
    const cardTraits = token.traits.filter(t => t.layer !== "BACKGROUND");

    return Promise.all([
      loadImg(`/api/collections-static/pams/card_template.png`),
      ...cardTraits.map(t => loadImg(`/layers/${t.layer}/${t.fileName}?collection=pams`)),
    ]).then(([tmpl, ...artLayers]) => {
      ctx.imageSmoothingEnabled = true;
      const scale = renderW / PTW;
      ctx.save();
      ctx.scale(scale, scale);

      // 1. Draw template first as full background
      if (tmpl) {
        ctx.drawImage(tmpl, 0, 0, PTW, PTH);
      }

      // 2. Draw character art layers ON TOP of template, clipped to arch area.
      //    PNGs are 600×600 (SQUARE). Draw as a square within the arch.
      const ART_P = { x: 81, y: 75, w: 960, h: 1250 };
      const artDrawW = 1050;                                     // slightly larger
      const artDrawH = 1050;                                     // same — 1:1 ratio
      const artDrawX = Math.round((PTW - artDrawW) / 2);        // 36 — centered
      const artDrawY = 250;                                      // centered in visible arch area

      // 2a. Detect talisman early
      const hasTalisman = cardTraits.some(t => isPamsTalisman(t.traitName));

      // 2b. Edge blur — SKIP for talisman (rock bleeds through blur layer)
      if (!hasTalisman) {
        const blurCanvas = document.createElement("canvas");
        blurCanvas.width = PTW; blurCanvas.height = PTH;
        const blurCtx = blurCanvas.getContext("2d");
        if (blurCtx) {
          blurCtx.imageSmoothingEnabled = true;
          blurCtx.filter = "blur(4px)";
          artLayers.forEach(img => {
            if (img) blurCtx.drawImage(img, artDrawX, artDrawY, artDrawW, artDrawH);
          });
          blurCtx.filter = "none";
          ctx.save();
          ctx.beginPath();
          ctx.rect(ART_P.x, ART_P.y, ART_P.w, ART_P.h);
          ctx.clip();
          ctx.drawImage(blurCanvas, 0, 0);
          ctx.restore();
        }
      }

      // 2c. Character — offscreen canvas for talisman fade

      if (hasTalisman) {
        const charCanvas = document.createElement("canvas");
        charCanvas.width = PTW; charCanvas.height = PTH;
        const charCtx = charCanvas.getContext("2d");
        if (charCtx) {
          charCtx.imageSmoothingEnabled = true;
          charCtx.filter = buildFilter(adj);
          artLayers.forEach(img => {
            if (img) charCtx.drawImage(img, artDrawX, artDrawY, artDrawW, artDrawH);
          });
          charCtx.filter = "none";
          // Bottom fade mask: erase the bottom 35% of the character image.
          const fadeStart = artDrawY + artDrawH * 0.80;
          const fadeEnd   = artDrawY + artDrawH;
          charCtx.globalCompositeOperation = "destination-out";
          const fadeGrad = charCtx.createLinearGradient(0, fadeStart, 0, fadeEnd);
          fadeGrad.addColorStop(0, "rgba(255,255,255,0)");
          fadeGrad.addColorStop(0.3, "rgba(255,255,255,0.8)");
          fadeGrad.addColorStop(0.6, "rgba(255,255,255,1)");
          fadeGrad.addColorStop(1, "rgba(255,255,255,1)");
          charCtx.fillStyle = fadeGrad;
          charCtx.fillRect(0, fadeStart, PTW, fadeEnd - fadeStart);
          ctx.save();
          ctx.beginPath();
          ctx.rect(ART_P.x, ART_P.y, ART_P.w, ART_P.h);
          ctx.clip();
          ctx.drawImage(charCanvas, 0, 0);
          ctx.restore();
        }
      } else {
        ctx.save();
        ctx.beginPath();
        ctx.rect(ART_P.x, ART_P.y, ART_P.w, ART_P.h);
        ctx.clip();
        ctx.filter = buildFilter(adj);
        artLayers.forEach(img => {
          if (img) ctx.drawImage(img, artDrawX, artDrawY, artDrawW, artDrawH);
        });
        ctx.filter = "none";

        if (adj.highlights && adj.highlights !== 0) {
          const hv = adj.highlights / 100;
          if (hv > 0) {
            ctx.globalCompositeOperation = "screen";
            ctx.fillStyle = `rgba(255,255,255,${hv * 0.35})`;
            ctx.fillRect(ART_P.x, ART_P.y, ART_P.w, ART_P.h);
          } else {
            ctx.globalCompositeOperation = "multiply";
            ctx.fillStyle = `rgba(0,0,0,${Math.abs(hv) * 0.4})`;
            ctx.fillRect(ART_P.x, ART_P.y, ART_P.w, ART_P.h);
          }
          ctx.globalCompositeOperation = "source-over";
        }

        if (adj.shadows && adj.shadows !== 0) {
          const sv = adj.shadows / 100;
          if (sv > 0) {
            ctx.globalCompositeOperation = "screen";
            ctx.fillStyle = `rgba(80,80,80,${sv * 0.35})`;
            ctx.fillRect(ART_P.x, ART_P.y, ART_P.w, ART_P.h);
          } else {
            ctx.globalCompositeOperation = "multiply";
            ctx.fillStyle = `rgba(0,0,0,${Math.abs(sv) * 0.5})`;
            ctx.fillRect(ART_P.x, ART_P.y, ART_P.w, ART_P.h);
          }
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.restore();
      }

      // 3. Stat orbs — 6 glowing orbs in a V formation, 3 per side
      //    Top orbs near frame edges, slanting down toward center
      const orbPositions = [
        // Left side (top to bottom, moving inward)
        { x: 105,  y: 920 },
        { x: 170,  y: 1050 },
        { x: 240,  y: 1180 },
        // Right side (top to bottom, moving inward)
        { x: 1017, y: 920 },
        { x: 952,  y: 1050 },
        { x: 882,  y: 1180 },
      ];

      token.loreTraits.forEach((lt, i) => {
        if (i >= 6) return;
        const pos = orbPositions[i];
        const statSeed = Math.sin(token.id * 17.3 + i * 31.7) * 0.5 + 0.5; const val = Math.min(99, Math.max(1, Math.round(lt.level * 15 + statSeed * 24)));

        // Orb radius scales with level: level 1 = 32px, level 5 = 60px
        const orbR = 28 + lt.level * 6.4;

        // Outer glow
        ctx.save();
        ctx.shadowColor = rc;
        ctx.shadowBlur = 30;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, orbR, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.01)"; // near-invisible fill to trigger shadow
        ctx.fill();
        ctx.restore();

        // Second glow pass for intensity
        ctx.save();
        ctx.shadowColor = rc;
        ctx.shadowBlur = 18;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, orbR, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(0,0,0,0.01)";
        ctx.fill();
        ctx.restore();

        // Orb body — radial gradient from bright center to translucent edge
        const orbGrad = ctx.createRadialGradient(
          pos.x - orbR * 0.2, pos.y - orbR * 0.25, orbR * 0.1,
          pos.x, pos.y, orbR
        );
        orbGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
        orbGrad.addColorStop(0.3, rc + "cc");
        orbGrad.addColorStop(0.7, rc + "88");
        orbGrad.addColorStop(1, rc + "22");

        ctx.beginPath();
        ctx.arc(pos.x, pos.y, orbR, 0, Math.PI * 2);
        ctx.fillStyle = orbGrad;
        ctx.fill();

        // Glass highlight — small bright arc at top-left
        const hlGrad = ctx.createRadialGradient(
          pos.x - orbR * 0.25, pos.y - orbR * 0.3, orbR * 0.05,
          pos.x - orbR * 0.15, pos.y - orbR * 0.2, orbR * 0.5
        );
        hlGrad.addColorStop(0, "rgba(255,255,255,0.8)");
        hlGrad.addColorStop(1, "rgba(255,255,255,0)");
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, orbR, 0, Math.PI * 2);
        ctx.fillStyle = hlGrad;
        ctx.fill();

        // Number in center
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.font = `900 ${Math.round(orbR * 0.85)}px "Courier New",monospace`;
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0,0,0,0.6)";
        ctx.shadowBlur = 4;
        ctx.fillText(String(val), pos.x, pos.y + 1);
        ctx.shadowBlur = 0;

        // Stat code label above orb
        ctx.font = `800 26px "Courier New",monospace`;
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "rgba(0,0,0,0.7)";
        ctx.shadowBlur = 6;
        ctx.fillText(lt.code, pos.x, pos.y - orbR - 14);
        ctx.shadowBlur = 0;
      });

      // City name (bottom) — faction color
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.font = `700 34px "Courier New",monospace`;
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillText(cityData.name.toUpperCase(), PTW / 2 + 1, PAMS_CITY_Y + 10 + 1);
      ctx.fillText(cityData.name.toUpperCase(), PTW / 2 - 1, PAMS_CITY_Y + 10 - 1);
      ctx.fillStyle = tc; ctx.shadowColor = "rgba(255,255,255,0.6)"; ctx.shadowBlur = 10;
      ctx.fillText(cityData.name.toUpperCase(), PTW / 2, PAMS_CITY_Y + 10);
      ctx.shadowBlur = 0;

      // Rarity tier (top) — rarity color, matches orbs
      ctx.font = `900 38px "Courier New",monospace`;
      ctx.fillStyle = "rgba(0,0,0,0.25)";
      ctx.fillText(token.rarity.toUpperCase(), PTW / 2 + 1, PAMS_RARITY_Y + 10 + 1);
      ctx.fillText(token.rarity.toUpperCase(), PTW / 2 - 1, PAMS_RARITY_Y + 10 - 1);
      ctx.fillStyle = rc; ctx.shadowColor = "rgba(255,255,255,0.6)"; ctx.shadowBlur = 10;
      ctx.fillText(token.rarity.toUpperCase(), PTW / 2, PAMS_RARITY_Y + 10);
      ctx.shadowBlur = 0;

      ctx.restore();
    });
  }
  // ── END PaMs renderer ───────────────────────────────────────────────────────

  // ── Bags Bro SMALL card renderer (2.5x3.5 TCG) ────────────────────────────
  if (collection === "pams" && format === "small") {
    const STW = 1097, STH = 1536;
    const S_ART       = { x: 215, y: 249, w: 675, h: 675 };
    const S_NAME_Y    = 142;
    const S_CITY_Y    = 992;
    const S_STAT_ROWS = [1050, 1115, 1180];
    const S_STAT_COLS = [{ x: 185, w: 340 }, { x: 580, w: 340 }];
    const S_RARITY_NP_Y = 1297;   // rarity text Y (e.g. "BABY BAG") — increase to move down
    const S_LABEL_NP_Y  = 1290;   // "BAGS BRO!" text Y — increase to move down

    const COUNTRY_ABBR: Record<string, string> = {
      "BAGLYN, N.Y., USA": "USA", "BAGUIO CITY, PHILIPPINES": "PHL",
      "BAGCOUVER B.C., CANADA": "CAN", "BAGALURU, INDIA": "IND",
      "BAGSTON, JAMAICA": "JAM", "BAGASAKI, JAPAN": "JPN",
      "BAGJING, CHINA": "CHN", "BAGNIN CITY, NIGERIA": "NGA",
      "BAGCELONA, SPAIN": "ESP", "BAGOTA, COLOMBIA": "COL",
    };

    const teamData    = getTeam(token.id);
    const bagName     = getBagName(token.id);
    const tc          = teamData.color;
    const nickname    = teamData.team.split(" ").slice(-1)[0];
    const abbr        = COUNTRY_ABBR[teamData.city] ?? "";
    const bagCity     = teamData.city.split(",").slice(0, -1).join(",").trim();
    const cityDisplay = `${bagCity}, ${abbr}`;
    const rarityColor: Record<string, string> = {
      "Atomic Bag": "#00e5ff", "Baby Bag": "#00ff99", "Mega Bag": "#cc44ff",
      "Cosmic Bag": "#ff3399", "Bag Lord": "#f7c948",
    };
    const rc = rarityColor[token.rarity] ?? "#ffffff";

    return Promise.all([
      loadImg(`/api/collections-static/bags-bro/card_template_small.png`),
      ...token.traits.map(t => loadImg(`/layers/${t.layer}/${t.fileName}?collection=${collection}`)),
    ]).then(([tmpl, ...artLayers]) => {
      ctx.imageSmoothingEnabled = false;
      const scale = renderW / STW;
      ctx.save();
      ctx.scale(scale, scale);

      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, STW, STH);

      // Template first
      if (tmpl) ctx.drawImage(tmpl, 0, 0, STW, STH);

      // Art — square NFTs, clipped to art zone
      ctx.save();
      ctx.beginPath();
      ctx.rect(S_ART.x, S_ART.y, S_ART.w, S_ART.h);
      ctx.clip();
      ctx.filter = buildFilter(adj);
      artLayers.forEach(img => { if (img) ctx.drawImage(img, S_ART.x, S_ART.y, S_ART.w, S_ART.h); });
      ctx.filter = "none";
      ctx.restore();

      // Rainbow gradient border matching art zone
      const borderW = 3;
      const rainbowGrad = ctx.createLinearGradient(S_ART.x, S_ART.y, S_ART.x + S_ART.w, S_ART.y + S_ART.h);
      rainbowGrad.addColorStop(0,    '#ff0080');
      rainbowGrad.addColorStop(0.17, '#ff6600');
      rainbowGrad.addColorStop(0.33, '#ffee00');
      rainbowGrad.addColorStop(0.5,  '#00ff88');
      rainbowGrad.addColorStop(0.67, '#00cfff');
      rainbowGrad.addColorStop(0.83, '#8800ff');
      rainbowGrad.addColorStop(1,    '#ff0080');
      ctx.strokeStyle = rainbowGrad;
      ctx.lineWidth = borderW;
      ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 14;
      ctx.strokeRect(S_ART.x + borderW / 2, S_ART.y + borderW / 2, S_ART.w - borderW, S_ART.h - borderW);
      ctx.shadowBlur = 0;

      // Name — WHITE text with team color glow
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillStyle = "#ffffff"; ctx.shadowColor = tc; ctx.shadowBlur = 12;
      let nameFs = 34;
      ctx.font = `900 ${nameFs}px "Courier New",monospace`;
      while (ctx.measureText(bagName).width > 650 && nameFs > 16) { nameFs -= 2; ctx.font = `900 ${nameFs}px "Courier New",monospace`; }
      ctx.fillText(bagName, STW / 2, S_NAME_Y);
      ctx.shadowBlur = 0;

      // City / Team centered below separator
      ctx.textBaseline = "middle"; ctx.textAlign = "left";
      const labelFs = 22;
      const GAP = 30;
      ctx.font = `700 ${labelFs}px "Courier New",monospace`;
      const cityLabelW = ctx.measureText("CITY: ").width;
      const teamLabelW = ctx.measureText("TEAM: ").width;
      let valFs = labelFs;
      ctx.font = `700 ${valFs}px "Courier New",monospace`;
      while (ctx.measureText(cityDisplay).width > 200 && valFs > 12) { valFs -= 1; ctx.font = `700 ${valFs}px "Courier New",monospace`; }
      ctx.font = `700 ${valFs}px "Courier New",monospace`;
      const cityValW = ctx.measureText(cityDisplay).width;
      const teamValW = ctx.measureText(nickname.toUpperCase()).width;
      const totalW = cityLabelW + cityValW + GAP + teamLabelW + teamValW;
      const startX = Math.round((STW - totalW) / 2);
      ctx.font = `700 ${labelFs}px "Courier New",monospace`;
      ctx.fillStyle = "#ffffff"; ctx.shadowBlur = 0;
      ctx.fillText("CITY:", startX, S_CITY_Y);
      ctx.font = `700 ${valFs}px "Courier New",monospace`;
      ctx.fillStyle = tc; ctx.shadowColor = tc; ctx.shadowBlur = 6;
      ctx.fillText(cityDisplay, startX + cityLabelW, S_CITY_Y);
      ctx.shadowBlur = 0;
      const teamStartX = startX + cityLabelW + cityValW + GAP;
      ctx.font = `700 ${labelFs}px "Courier New",monospace`;
      ctx.fillStyle = "#ffffff"; ctx.shadowBlur = 0;
      ctx.fillText("TEAM:", teamStartX, S_CITY_Y);
      ctx.font = `700 ${valFs}px "Courier New",monospace`;
      ctx.fillStyle = tc; ctx.shadowColor = tc; ctx.shadowBlur = 6;
      ctx.fillText(nickname.toUpperCase(), teamStartX + teamLabelW, S_CITY_Y);
      ctx.shadowBlur = 0;

      // Stat bars
      const barH = 32, skew = 10, codeW = 75, numW = 56;
      const drawBar = (x: number, y: number, w: number, h: number) => {
        const t2 = y - h / 2, b = y + h / 2;
        ctx.beginPath();
        ctx.moveTo(x + skew, t2); ctx.lineTo(x + w, t2);
        ctx.lineTo(x + w - skew, b); ctx.lineTo(x, b);
        ctx.closePath();
      };
      token.loreTraits.forEach((lt, i) => {
        const col  = i < 3 ? S_STAT_COLS[0] : S_STAT_COLS[1];
        const rowY = S_STAT_ROWS[i < 3 ? i : i - 3];
        const barX = col.x + codeW;
        const barW = col.w - codeW - numW;
        const fill = Math.round(barW * (lt.level / 5));
        ctx.save(); drawBar(barX, rowY, barW, barH); ctx.fillStyle = "#0a0a1e"; ctx.fill(); ctx.restore();
        if (fill > 0) {
          ctx.save(); drawBar(barX, rowY, fill, barH); ctx.clip();
          ctx.fillStyle = tc; ctx.shadowColor = tc; ctx.shadowBlur = 10;
          ctx.fillRect(barX, rowY - barH / 2, fill + skew, barH); ctx.shadowBlur = 0;
          const sg = ctx.createLinearGradient(barX, rowY - barH / 2, barX + fill, rowY + barH / 2);
          sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.38, 'rgba(255,255,255,0)');
          sg.addColorStop(0.5, 'rgba(255,255,255,0.30)'); sg.addColorStop(0.62, 'rgba(255,255,255,0)');
          sg.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = sg; ctx.fillRect(barX, rowY - barH / 2, fill + skew, barH);
          ctx.fillStyle = 'rgba(255,255,255,0.20)'; ctx.fillRect(barX, rowY - barH / 2, fill + skew, 3);
          ctx.restore();
        }
        ctx.font = `900 26px "Courier New",monospace`;
        ctx.fillStyle = "#ffffff"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
        ctx.fillText(lt.code, col.x + 4, rowY);
        const statSeed = Math.sin(token.id * 17.3 + i * 31.7) * 0.5 + 0.5; const val = Math.min(99, Math.max(1, Math.round(lt.level * 15 + statSeed * 24)));
        ctx.font = `900 28px "Courier New",monospace`;
        ctx.fillStyle = tc; ctx.textAlign = "right";
        ctx.shadowColor = tc; ctx.shadowBlur = 6;
        ctx.fillText(String(val), col.x + col.w, rowY);
        ctx.shadowBlur = 0;
      });

      // Nameplate: rarity LEFT section (center x=310), "BAGS BRO!" RIGHT section (center x=728)
      ctx.textBaseline = "middle";
      ctx.textAlign = "center";
      ctx.font = `900 30px "Courier New",monospace`;
      ctx.fillStyle = rc; ctx.shadowColor = rc; ctx.shadowBlur = 12;
      ctx.fillText(token.rarity.toUpperCase(), 310, S_RARITY_NP_Y);
      ctx.shadowBlur = 0;
      ctx.font = `900 32px "Courier New",monospace`;
      ctx.fillStyle = "#ffffff"; ctx.shadowColor = "#ffffff"; ctx.shadowBlur = 4;
      ctx.fillText("BAGS BRO!", 744, S_LABEL_NP_Y);
      ctx.shadowBlur = 0;

      ctx.restore();
    });
  }
  // ── END Bags Bro small renderer ────────────────────────────────────────────

  // ── Bags Bro card renderer ──────────────────────────────────────────────────
  const TW = 1248, TH = 2000;
  const ART         = { x: 200, y: 310, w: 848, h: 856 };
  const NAME_Y      = 192;
  const CITY_VAL_Y  = 1278;
  const TEAM_VAL_Y  = 1278;
  const STAT_ROWS   = [1370, 1470, 1570];
  const STAT_COLS   = [{ x: 190, w: 400 }, { x: 640, w: 400 }];
  const RARITY_X    = 225;
  const RARITY_Y    = 1725;

  const COUNTRY_ABBR: Record<string, string> = {
    "BAGLYN, N.Y., USA":        "USA",
    "BAGUIO CITY, PHILIPPINES": "PHL",
    "BAGCOUVER B.C., CANADA":   "CAN",
    "BAGALURU, INDIA":          "IND",
    "BAGSTON, JAMAICA":         "JAM",
    "BAGASAKI, JAPAN":          "JPN",
    "BAGJING, CHINA":           "CHN",
    "BAGNIN CITY, NIGERIA":     "NGA",
    "BAGCELONA, SPAIN":         "ESP",
    "BAGOTA, COLOMBIA":         "COL",
  };

  const teamData    = getTeam(token.id);
  const bagName     = getBagName(token.id);
  const tc          = teamData.color;
  const nickname    = teamData.team.split(" ").slice(-1)[0];
  const abbr        = COUNTRY_ABBR[teamData.city] ?? "";
  const bagCity     = teamData.city.split(",").slice(0, -1).join(",").trim();
  const cityDisplay = `${bagCity}, ${abbr}`;

  const rarityColor: Record<string, string> = {
    "Atomic Bag": "#00e5ff",
    "Baby Bag":   "#00ff99",
    "Mega Bag":   "#cc44ff",
    "Cosmic Bag": "#ff3399",
    "Bag Lord":   "#f7c948",
  };
  const rc = rarityColor[token.rarity] ?? "#ffffff";

  return Promise.all([
    loadImg(`/api/collections-static/${collection}/card_template_new.png`),
    ...token.traits.map(t => loadImg(`/layers/${t.layer}/${t.fileName}?collection=${collection}`)),
  ]).then(([tmpl, ...artLayers]) => {
    ctx.imageSmoothingEnabled = false;
    const scale = renderW / TW;
    ctx.save();
    ctx.scale(scale, scale);

    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, TW, TH);

    if (tmpl) ctx.drawImage(tmpl, 0, 0, TW, TH);

    ctx.save();
    ctx.beginPath();
    ctx.rect(ART.x, ART.y, ART.w, ART.h);
    ctx.clip();

    ctx.filter = buildFilter(adj);
    artLayers.forEach(img => { if (img) ctx.drawImage(img, ART.x, ART.y, ART.w, ART.h); });
    ctx.filter = "none";

    if (adj.highlights && adj.highlights !== 0) {
      const hv = adj.highlights / 100;
      if (hv > 0) {
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = `rgba(255,255,255,${hv * 0.35})`;
        ctx.fillRect(ART.x, ART.y, ART.w, ART.h);
      } else {
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = `rgba(0,0,0,${Math.abs(hv) * 0.4})`;
        ctx.fillRect(ART.x, ART.y, ART.w, ART.h);
      }
      ctx.globalCompositeOperation = "source-over";
    }

    if (adj.shadows && adj.shadows !== 0) {
      const sv = adj.shadows / 100;
      if (sv > 0) {
        ctx.globalCompositeOperation = "screen";
        ctx.fillStyle = `rgba(80,80,80,${sv * 0.35})`;
        ctx.fillRect(ART.x, ART.y, ART.w, ART.h);
      } else {
        ctx.globalCompositeOperation = "multiply";
        ctx.fillStyle = `rgba(0,0,0,${Math.abs(sv) * 0.5})`;
        ctx.fillRect(ART.x, ART.y, ART.w, ART.h);
      }
      ctx.globalCompositeOperation = "source-over";
    }

    ctx.restore();

    if (adj.sharpness && adj.sharpness > 0) {
      const amount = adj.sharpness / 100;
      const offCtx = document.createElement("canvas");
      offCtx.width = ART.w; offCtx.height = ART.h;
      const oc = offCtx.getContext("2d")!;
      oc.drawImage(canvas,
        ART.x * (renderW / 1248), ART.y * (renderH / 2000),
        ART.w * (renderW / 1248), ART.h * (renderH / 2000),
        0, 0, ART.w, ART.h
      );
      const blurred = document.createElement("canvas");
      blurred.width = ART.w; blurred.height = ART.h;
      const bc = blurred.getContext("2d")!;
      bc.filter = `blur(${1 + amount}px)`;
      bc.drawImage(offCtx, 0, 0);
      bc.filter = "none";
      oc.globalCompositeOperation = "difference";
      oc.globalAlpha = amount * 0.6;
      oc.drawImage(blurred, 0, 0);
      oc.globalCompositeOperation = "source-over";
      oc.globalAlpha = 1;
      ctx.save();
      ctx.beginPath();
      ctx.rect(ART.x * (renderW / 1248), ART.y * (renderH / 2000),
               ART.w * (renderW / 1248), ART.h * (renderH / 2000));
      ctx.clip();
      ctx.globalCompositeOperation = "difference";
      ctx.globalAlpha = amount * 0.6;
      ctx.drawImage(blurred, ART.x * (renderW / 1248), ART.y * (renderH / 2000),
                    ART.w * (renderW / 1248), ART.h * (renderH / 2000));
      ctx.globalCompositeOperation = "source-over";
      ctx.globalAlpha = 1;
      ctx.restore();
    }

    // Rainbow border
    const borderW = 4;
    const rainbowGrad = ctx.createLinearGradient(ART.x, ART.y, ART.x + ART.w, ART.y + ART.h);
    rainbowGrad.addColorStop(0,    '#ff0080');
    rainbowGrad.addColorStop(0.17, '#ff6600');
    rainbowGrad.addColorStop(0.33, '#ffee00');
    rainbowGrad.addColorStop(0.5,  '#00ff88');
    rainbowGrad.addColorStop(0.67, '#00cfff');
    rainbowGrad.addColorStop(0.83, '#8800ff');
    rainbowGrad.addColorStop(1,    '#ff0080');
    ctx.strokeStyle = rainbowGrad;
    ctx.lineWidth = borderW;
    ctx.shadowColor = '#ffffff'; ctx.shadowBlur = 20;
    ctx.strokeRect(ART.x + borderW / 2, ART.y + borderW / 2, ART.w - borderW, ART.h - borderW);
    ctx.shadowBlur = 0;

    // Name
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillStyle = "#ffffff"; ctx.shadowColor = tc; ctx.shadowBlur = 16;
    let fs = 52;
    ctx.font = `900 ${fs}px "Courier New",monospace`;
    while (ctx.measureText(bagName).width > 980 && fs > 20) { fs -= 2; ctx.font = `900 ${fs}px "Courier New",monospace`; }
    ctx.fillText(bagName, TW / 2, NAME_Y);
    ctx.shadowBlur = 0;

    // City / Team centered
    ctx.textBaseline = "middle"; ctx.textAlign = "left";
    const labelFs = 34;
    const GAP = 60;
    ctx.font = `700 ${labelFs}px "Courier New",monospace`;
    const cityLabelW = ctx.measureText("CITY: ").width;
    const teamLabelW = ctx.measureText("TEAM: ").width;
    let cityFs = labelFs;
    ctx.font = `700 ${cityFs}px "Courier New",monospace`;
    while (ctx.measureText(cityDisplay).width > 340 && cityFs > 18) { cityFs -= 1; ctx.font = `700 ${cityFs}px "Courier New",monospace`; }
    let teamFs2 = labelFs;
    ctx.font = `700 ${teamFs2}px "Courier New",monospace`;
    while (ctx.measureText(nickname.toUpperCase()).width > 260 && teamFs2 > 18) { teamFs2 -= 1; ctx.font = `700 ${teamFs2}px "Courier New",monospace`; }
    const valFs = Math.min(cityFs, teamFs2);
    ctx.font = `700 ${valFs}px "Courier New",monospace`;
    const cityValW = ctx.measureText(cityDisplay).width;
    const teamValW = ctx.measureText(nickname.toUpperCase()).width;
    const totalW = cityLabelW + cityValW + GAP + teamLabelW + teamValW;
    const startX = Math.round((TW - totalW) / 2);
    ctx.font = `700 ${labelFs}px "Courier New",monospace`;
    ctx.fillStyle = "#ffffff"; ctx.shadowBlur = 0;
    ctx.fillText("CITY:", startX, CITY_VAL_Y);
    ctx.font = `700 ${valFs}px "Courier New",monospace`;
    ctx.fillStyle = tc; ctx.shadowColor = tc; ctx.shadowBlur = 8;
    ctx.fillText(cityDisplay, startX + cityLabelW, CITY_VAL_Y);
    ctx.shadowBlur = 0;
    const teamStartX = startX + cityLabelW + cityValW + GAP;
    ctx.font = `700 ${labelFs}px "Courier New",monospace`;
    ctx.fillStyle = "#ffffff"; ctx.shadowBlur = 0;
    ctx.fillText("TEAM:", teamStartX, TEAM_VAL_Y);
    ctx.font = `700 ${valFs}px "Courier New",monospace`;
    ctx.fillStyle = tc; ctx.shadowColor = tc; ctx.shadowBlur = 8;
    ctx.fillText(nickname.toUpperCase(), teamStartX + teamLabelW, TEAM_VAL_Y);
    ctx.shadowBlur = 0;

    // Stat bars
    const barH = 48, skew = 14, codeW = 110, numW = 80;
    const drawBar = (x: number, y: number, w: number, h: number) => {
      const t2 = y - h / 2, b = y + h / 2;
      ctx.beginPath();
      ctx.moveTo(x + skew, t2); ctx.lineTo(x + w, t2);
      ctx.lineTo(x + w - skew, b); ctx.lineTo(x, b);
      ctx.closePath();
    };
    token.loreTraits.forEach((lt, i) => {
      const col  = i < 3 ? STAT_COLS[0] : STAT_COLS[1];
      const rowY = STAT_ROWS[i < 3 ? i : i - 3];
      const barX = col.x + codeW;
      const barW = col.w - codeW - numW;
      const fill = Math.round(barW * (lt.level / 5));
      ctx.save(); drawBar(barX, rowY, barW, barH); ctx.fillStyle = "#0a0a1e"; ctx.fill(); ctx.restore();
      if (fill > 0) {
        ctx.save(); drawBar(barX, rowY, fill, barH); ctx.clip();
        ctx.fillStyle = tc; ctx.shadowColor = tc; ctx.shadowBlur = 12;
        ctx.fillRect(barX, rowY - barH / 2, fill + skew, barH); ctx.shadowBlur = 0;
        const sg = ctx.createLinearGradient(barX, rowY - barH / 2, barX + fill, rowY + barH / 2);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.38, 'rgba(255,255,255,0)');
        sg.addColorStop(0.5, 'rgba(255,255,255,0.30)'); sg.addColorStop(0.62, 'rgba(255,255,255,0)');
        sg.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = sg; ctx.fillRect(barX, rowY - barH / 2, fill + skew, barH);
        ctx.fillStyle = 'rgba(255,255,255,0.20)'; ctx.fillRect(barX, rowY - barH / 2, fill + skew, 4);
        ctx.restore();
      }
      ctx.font = `900 42px "Courier New",monospace`;
      ctx.fillStyle = "#ffffff"; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(lt.code, col.x + 4, rowY);
      const statSeed = Math.sin(token.id * 17.3 + i * 31.7) * 0.5 + 0.5; const val = Math.min(99, Math.max(1, Math.round(lt.level * 15 + statSeed * 24)));
      ctx.font = `900 44px "Courier New",monospace`;
      ctx.fillStyle = tc; ctx.textAlign = "right";
      ctx.shadowColor = tc; ctx.shadowBlur = 8;
      ctx.fillText(String(val), col.x + col.w, rowY);
      ctx.shadowBlur = 0;
    });

    // Rarity
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.font = `900 46px "Courier New",monospace`;
    ctx.fillStyle = rc; ctx.shadowColor = rc; ctx.shadowBlur = 18;
    ctx.fillText(token.rarity.toUpperCase(), RARITY_X, RARITY_Y);
    ctx.shadowBlur = 0;

    ctx.restore();
  });
}

function CardCanvas({ token, width = 300, height = 480, adj = {}, collection = "pams", format = "large" }: { token: GeneratedToken; width?: number; height?: number; adj?: ColorAdj; collection?: string; format?: "large" | "small" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    drawCardToCanvas(canvas, token, width, height, adj, collection, format);
  }, [token, width, height, JSON.stringify(adj), collection, format]);

  return (
    <canvas ref={canvasRef} width={width} height={height} data-token-id={token.id}
      style={{ display: "block", imageRendering: "pixelated", width, height }} />
  );
}

export default function StudioPage() {
  const [collections, setCollections] = useState<{id:string;name:string;description:string}[]>([]);
  const [activeCollection, setActiveCollection] = useState("pams");
  const [cardFormat, setCardFormat] = useState<"large"|"small">("large"); // large=3.5x5.75, small=2.5x3.5 TCG
  const [pamsMode, setPamsMode] = useState<"standard"|"limited">("standard");

  // Limited Edition slots (PaMs)
  type LESlot = { imageUrl: string | null; imageName: string; name: string; description: string };
  const [leSlots, setLeSlots] = useState<LESlot[]>(
    Array.from({ length: 25 }, () => ({ imageUrl: null, imageName: "", name: "", description: "" }))
  );
  const [leLoaded, setLeLoaded] = useState(false);

  // Load LE slots from API on first switch to limited mode
  useEffect(() => {
    if (pamsMode !== "limited" || leLoaded) return;
    fetch("/api/limited-edition").then(r => r.json()).then((data: { slots: { name: string; description: string; hasImage: boolean; imageUrl: string | null }[] }) => {
      setLeSlots(data.slots.map(s => ({
        imageUrl: s.imageUrl ? s.imageUrl + "?t=" + Date.now() : null,
        imageName: "",
        name: s.name,
        description: s.description,
      })));
      setLeLoaded(true);
    }).catch(() => setLeLoaded(true));
  }, [pamsMode, leLoaded]);
  const [collectionConfig, setCollectionConfig] = useState<Record<string,unknown>>({});
  const [layers, setLayers] = useState<LayerConfig[]>([]);
  const [layerOrder, setLayerOrder] = useState<string[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [weights, setWeights] = useState<LayerWeights>({});
  const [frequencies, setFrequencies] = useState<LayerFrequencies>({});
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [savingAll, setSavingAll] = useState(false);
  const [tab, setTab] = useState<"weights"|"preview"|"cards">("weights");
  const [tokens, setTokens] = useState<GeneratedToken[]>([]);
  const [generating, setGenerating] = useState(false);






  // When viewing Bags Bro small cards, show the active series tokens
  useEffect(() => {




  const [exporting, setExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState("");
  const [previewCount, setPreviewCount] = useState(100);
  const [collectionSize, setCollectionSize] = useState(1000);
  const [inspecting, setInspecting] = useState<GeneratedToken|null>(null);
  const [traitFilter, setTraitFilter] = useState<{layer:string;trait:string}|null>(null);
  const [expandedLayers, setExpandedLayers] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [highlights, setHighlights] = useState(0);
  const [shadows, setShadows] = useState(0);
  const [saturation, setSaturation] = useState(100);
  const [temperature, setTemperature] = useState(0);
  const [tint, setTint] = useState(0);
  const [sepia, setSepia] = useState(0);
  const [sharpness, setSharpness] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const dragIdx = useRef<number | null>(null);
  const dragOverIdx = useRef<number | null>(null);

  function toggleLayer(name: string) {
    setExpandedLayers(prev => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  }

  async function regenerate() {
    setGenerating(true); setTraitFilter(null); setError(null);
    try {
      await new Promise(r => setTimeout(r, 0));

      // For Bags Bro small cards: series-aware generation with cross-series uniqueness
      const isBBSeries = activeCollection === "pams" && cardFormat === "small";
      const seriesOffset = isBBSeries ? (bbSeries - 1) * previewCount : 0;

      // Collect DNA from OTHER series to avoid duplicates
      const excludedDna = new Set<string>();
      if (isBBSeries) {
        for (const [seriesNum, seriesTokens] of Object.entries(bbSeriesTokens)) {
          if (Number(seriesNum) !== bbSeries) {
            for (const t of seriesTokens) {
              excludedDna.add(t.traits.map(tr => `${tr.layer}:${tr.traitName}`).sort().join("|"));
            }
          }
        }
      }

      const raw: GeneratedToken[] = [];
      const localDna = new Set<string>();
      let attempts = 0;
      const maxAttempts = previewCount * 50;

      while (raw.length < previewCount && attempts < maxAttempts) {
        attempts++;
        const id = seriesOffset + raw.length + 1;
        const token = generateToken(id, layers, layerOrder, weights, frequencies, activeCollection);
        const dna = token.traits.map(tr => `${tr.layer}:${tr.traitName}`).sort().join("|");

        if (!localDna.has(dna) && !excludedDna.has(dna)) {
          localDna.add(dna);
          raw.push(token);
        }
      }

      // Bags Bro only: outfit/head guarantee pass
      if (activeCollection === "pams") {
        for (const [outfit, requiredHead] of Object.entries(OUTFIT_REQUIRES_HEAD)) {
          const hasMatch = raw.some(t =>
            t.traits.some(tr => tr.layer === "Outfit" && tr.traitName === outfit) &&
            t.traits.some(tr => tr.layer === "Head"   && tr.traitName === requiredHead)
          );
          if (!hasMatch) {
            const candidate = raw.find(t => t.traits.some(tr => tr.layer === "Outfit" && tr.traitName === outfit));
            if (candidate) {
              candidate.traits = candidate.traits.filter(tr => tr.layer !== "Head");
              const headLayer = layers.find(l => l.name === "Head");
              const headTrait = headLayer?.traits.find(t => t.name === requiredHead);
              if (headTrait) candidate.traits.push({ layer: "Head", traitName: headTrait.name, fileName: headTrait.fileName, rarity: headTrait.rarity });
            }
          }
        }
      }

      // Percentile-normalize rarity across the collection
      const activeTiers = activeCollection === "pams" ? PAMS_RARITY_TIERS : RARITY_TIERS;
      const TARGET_DIST = [
        { tier: 0, pct: 0.40 },
        { tier: 1, pct: 0.25 },
        { tier: 2, pct: 0.20 },
        { tier: 3, pct: 0.10 },
        { tier: 4, pct: 0.05 },
      ];
      const sorted = [...raw].sort((a, b) => a.rarityScore - b.rarityScore);
      const n = sorted.length;
      let cumulative = 0;
      const tierForRank = new Array(n);
      for (const { tier, pct } of TARGET_DIST) {
        const count = Math.round(pct * n);
        for (let i = cumulative; i < Math.min(cumulative + count, n); i++) tierForRank[i] = tier;
        cumulative += count;
      }
      for (let i = cumulative; i < n; i++) tierForRank[i] = 4;
      sorted.forEach((token, rank) => {
        const tierIdx = tierForRank[rank];
        token.rarity = activeTiers[tierIdx].name;
        const statFloor = tierIdx + 1;
        token.loreTraits = token.loreTraits.map((lt, defIdx) => {
          const slotSeed = Math.sin(token.rarityScore * 7.3 + defIdx * 13.7);
          const variance = slotSeed * 20;
          const score = Math.max(statFloor * 20, Math.min(100, token.rarityScore + variance));
          const level = score >= 81 ? 5 : score >= 61 ? 4 : score >= 41 ? 3 : score >= 21 ? 2 : 1;
          return { ...lt, level };
        });
      });

      setTokens(raw);

      // Store series tokens for Bags Bro small cards
      if (isBBSeries) {
        setBbSeriesTokens(prev => ({ ...prev, [bbSeries]: raw }));
        // Update DNA tracking
        const dnaSet = new Set<string>();
        for (const t of raw) {
          dnaSet.add(t.traits.map(tr => `${tr.layer}:${tr.traitName}`).sort().join("|"));
        }
        bbSeriesDnaRef.current = { ...bbSeriesDnaRef.current, [bbSeries]: dnaSet };
      }
    } catch (e) { setError(String(e)); }
    finally { setGenerating(false); }
  }

  async function exportAll() {
    if (!tokens.length) { console.log("exportAll: no tokens"); return; }
    if (!(window as any).showDirectoryPicker) {
      alert("Export requires Chrome or Edge browser. Safari doesn't support the folder picker API.");
      return;
    }
    console.log(`exportAll: starting with ${tokens.length} tokens, collection=${activeCollection}, format=${cardFormat}`);
    try {
      // Use File System Access API to pick a destination folder
      const dirHandle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
      setExporting(true);
      setExportProgress(`0 / ${tokens.length}`);

      const isPams = activeCollection === "pams";
      const isSmall = cardFormat === "small";
      const hiW = isSmall ? 1097 : (isPams ? 1122 : 1248);
      const hiH = isSmall ? 1536 : (isPams ? 1797 : 2000);

      for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        const offscreen = document.createElement("canvas");
        offscreen.width = hiW; offscreen.height = hiH;
        try {
          await drawCardToCanvas(offscreen, token, hiW, hiH, {}, activeCollection, cardFormat);
        } catch (renderErr: any) {
          console.error(`Failed rendering card ${i + 1}:`, renderErr);
          setExportProgress(`Error on card ${i + 1}: ${renderErr.message}`);
          setTimeout(() => { setExporting(false); setExportProgress(""); }, 5000);
          return;
        }

        // Convert to blob and write to folder
        const blob: Blob = await new Promise((resolve) => offscreen.toBlob((b) => resolve(b!), "image/png"));
        const padId = String(i + 1).padStart(4, "0");
        const seriesTag = (activeCollection === "pams" && cardFormat === "small") ? `-s${bbSeries}` : "";
        const fileName = `${activeCollection}${seriesTag}-${padId}-hires.png`;
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        setExportProgress(`${i + 1} / ${tokens.length}`);
      }

      setExportProgress(`Done! ${tokens.length} cards exported.`);
      setTimeout(() => { setExporting(false); setExportProgress(""); }, 3000);
    } catch (e: any) {
      if (e.name === "AbortError") {
        // User cancelled the directory picker
      } else {
        setExportProgress(`Error: ${e.message}`);
        setTimeout(() => { setExporting(false); setExportProgress(""); }, 5000);
      }
      setExporting(false);
    }
  }

  // ── Limited Edition card renderer ──────────────────────────────────────────
  async function drawLECard(
    canvas: HTMLCanvasElement,
    slot: { imageUrl: string | null; name: string; description: string },
    renderW: number,
    renderH: number
  ): Promise<void> {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const STW = 1097, STH = 1536;
    const scale = renderW / STW;

    const loadImg = (src: string) => new Promise<HTMLImageElement | null>(resolve => {
      const img = new Image();
      img.onload  = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

    const [charImg, tmpl] = await Promise.all([
      slot.imageUrl ? loadImg(slot.imageUrl) : Promise.resolve(null),
      loadImg("/api/collections-static/pams/pams-limited-edition.png"),
    ]);

    ctx.imageSmoothingEnabled = true;
    ctx.save();
    ctx.scale(scale, scale);

    ctx.fillStyle = "#fef0f5";
    ctx.fillRect(0, 0, STW, STH);

    // 1. Character image — cover-fill the art zone (crop excess, no gaps)
    if (charImg) {
      const artX = 110, artY = 160, artW = 877, artH = 850;
      const imgAspect = charImg.width / charImg.height;
      let drawW = artW, drawH = artH;
      // Cover: scale to fill entire zone, crop overflow
      if (imgAspect > artW / artH) { drawW = artH * imgAspect; }
      else { drawH = artW / imgAspect; }
      const drawX = artX + (artW - drawW) / 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(artX, artY, artW, artH);
      ctx.clip();
      // Image starts 95px below clip top for headroom
      ctx.drawImage(charImg, drawX, artY + 105, drawW, drawH);
      ctx.restore();
    }

    // 2. Template on top
    if (tmpl) ctx.drawImage(tmpl, 0, 0, STW, STH);

    // 3. Name in the dark pill banner (centered at y=975)
    if (slot.name) {
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      let nameFs = 52;
      ctx.font = `900 ${nameFs}px Georgia, "Times New Roman", serif`;
      while (ctx.measureText(slot.name.toUpperCase()).width > 580 && nameFs > 24) {
        nameFs -= 2;
        ctx.font = `900 ${nameFs}px Georgia, "Times New Roman", serif`;
      }
      // Shadow
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillText(slot.name.toUpperCase(), STW / 2 + 2, 985 + 2);
      // Main text
      ctx.fillStyle = "#ffffff";
      ctx.shadowColor = "rgba(100,50,150,0.8)"; ctx.shadowBlur = 12;
      ctx.fillText(slot.name.toUpperCase(), STW / 2, 985);
      ctx.shadowBlur = 0;
    }

    // 4. Description in cream area below (y=1090 to y=1430)
    if (slot.description) {
      ctx.textAlign = "center"; ctx.textBaseline = "top";
      const descFs = 27;
      const lineH = 37;
      const paraGap = 14;
      ctx.font = `600 ${descFs}px "Avenir Next", "Trebuchet MS", sans-serif`;
      ctx.fillStyle = "#3a2050";
      // Word-wrap, honoring newlines as paragraph breaks
      const maxW = 560;
      const paragraphs = slot.description.split("\n");
      const lines: string[] = [];
      for (const para of paragraphs) {
        if (para.trim() === "") { lines.push(""); continue; }
        const words = para.split(" ");
        let current = "";
        for (const word of words) {
          const test = current ? current + " " + word : word;
          if (ctx.measureText(test).width > maxW) {
            if (current) lines.push(current);
            current = word;
          } else {
            current = test;
          }
        }
        if (current) lines.push(current);
      }
      // Center text block vertically; empty lines use paraGap instead of full lineH
      const creamCenter = 1225;
      const totalTextH = lines.reduce((h, l) => h + (l === "" ? paraGap : lineH), 0);
      const startY = Math.round(creamCenter - totalTextH / 2);

      let curY = startY;
      lines.forEach((line) => {
        if (line === "") { curY += paraGap; return; }
        ctx.font = `600 ${descFs}px "Avenir Next", "Trebuchet MS", sans-serif`;
        ctx.strokeStyle = "rgba(255,255,255,0.95)";
        ctx.lineWidth = 7;
        ctx.lineJoin = "round";
        ctx.strokeText(line, STW / 2, curY);
        ctx.fillStyle = "#3a2050";
        ctx.fillText(line, STW / 2, curY);
        curY += lineH;
      });
    }

    ctx.restore();
  }

  async function exportAllLE() {
    const filled = leSlots.filter(s => s.imageUrl);
    if (!filled.length) return;
    if (!(window as any).showDirectoryPicker) {
      alert("Export requires Chrome or Edge browser. Safari doesn't support the folder picker API.");
      return;
    }
    try {
      const dirHandle = await (window as any).showDirectoryPicker({ mode: "readwrite" });
      setExporting(true);
      setExportProgress(`0 / ${filled.length}`);

      for (let i = 0; i < filled.length; i++) {
        const slot = filled[i];
        const offscreen = document.createElement("canvas");
        offscreen.width = 1097; offscreen.height = 1536;
        await drawLECard(offscreen, slot, 1097, 1536);

        const blob: Blob = await new Promise((resolve) => offscreen.toBlob((b) => resolve(b!), "image/png"));
        const safeName = (slot.name || `le-${i + 1}`).replace(/[^a-zA-Z0-9]/g, "-").toLowerCase();
        const fileName = `pams-limited-${safeName}.png`;
        const fileHandle = await dirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(blob);
        await writable.close();

        setExportProgress(`${i + 1} / ${filled.length}`);
      }

      setExportProgress(`Done! ${filled.length} cards exported.`);
      setTimeout(() => { setExporting(false); setExportProgress(""); }, 3000);
    } catch (e: any) {
      if (e.name !== "AbortError") {
        setExportProgress(`Error: ${e.message}`);
        setTimeout(() => { setExporting(false); setExportProgress(""); }, 5000);
      }
      setExporting(false);
    }
  }

  function updateLESlot(index: number, updates: Partial<LESlot>) {
    setLeSlots(prev => {
      const next = prev.map((s, i) => i === index ? { ...s, ...updates } : s);
      // Debounce save text changes to API
      if ("name" in updates || "description" in updates) {
        const slot = next[index];
        clearTimeout((window as any).__leSaveTimer?.[index]);
        if (!(window as any).__leSaveTimer) (window as any).__leSaveTimer = {};
        (window as any).__leSaveTimer[index] = setTimeout(() => {
          const fd = new FormData();
          fd.append("index", String(index));
          fd.append("name", slot.name);
          fd.append("description", slot.description);
          fetch("/api/limited-edition", { method: "POST", body: fd });
        }, 800);
      }
      return next;
    });
  }

  async function handleLEImageUpload(index: number, file: File) {
    // Immediately show preview with blob URL
    const blobUrl = URL.createObjectURL(file);
    const slot = leSlots[index];
    setLeSlots(prev => prev.map((s, i) => i === index ? { ...s, imageUrl: blobUrl, imageName: file.name } : s));

    // Save to API
    const fd = new FormData();
    fd.append("index", String(index));
    fd.append("name", slot.name);
    fd.append("description", slot.description);
    fd.append("image", file);
    const res = await fetch("/api/limited-edition", { method: "POST", body: fd });
    const data = await res.json();
    if (data.slot?.imageUrl) {
      // Replace blob URL with persisted URL
      URL.revokeObjectURL(blobUrl);
      setLeSlots(prev => prev.map((s, i) => i === index ? { ...s, imageUrl: data.slot.imageUrl + "?t=" + Date.now() } : s));
    }
  }

  async function deleteLESlot(index: number) {
    await fetch("/api/limited-edition", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ index }) });
    setLeSlots(prev => prev.map((s, i) => i === index ? { imageUrl: null, imageName: "", name: "", description: "" } : s));
  }

  // Render LE card previews
  useEffect(() => {
    if (pamsMode !== "limited" || activeCollection !== "pams") return;
    leSlots.forEach((slot, idx) => {
      if (!slot.imageUrl) return;
      const canvas = document.querySelector(`canvas[data-le-slot="${idx}"]`) as HTMLCanvasElement | null;
      if (canvas) drawLECard(canvas, slot, 274, 383);
    });
  }, [leSlots, pamsMode, activeCollection]);

  useEffect(() => {
    fetch("/api/collections").then(r=>r.json()).then((data:{collections:{id:string;name:string;description:string}[]}) => {
      setCollections(data.collections ?? []);
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    setTokens([]);
    fetch(`/api/layers?collection=${activeCollection}`).then(r=>r.json()).then((data:{layers:LayerConfig[];order:string[];config:Record<string,unknown>}) => {
      setLayers(data.layers);
      setLayerOrder(data.order ?? data.layers.map((l: LayerConfig) => l.name));
      setCollectionConfig(data.config ?? {});
      const w: LayerWeights = {}, f: LayerFrequencies = {};
      for (const l of data.layers) {
        w[l.name] = Object.fromEntries(l.traits.map(t=>[t.name, t.weight]));
        f[l.name] = l.frequency ?? 100;
      }
      setWeights(w); setFrequencies(f); setLoading(false);
    });
  }, [activeCollection]);

  useEffect(() => {
    if ((tab === "preview" || tab === "cards") && layers.length > 0 && tokens.length === 0) regenerate();
  }, [tab, layers.length]);

  function getTotal(ln: string) { return Object.values(weights[ln] ?? {}).reduce((s, v) => s + v, 0); }
  function handleWeightChange(ln: string, tn: string, val: string) {
    const n = parseFloat(val); if (isNaN(n)) return;
    setWeights(p => ({ ...p, [ln]: { ...p[ln], [tn]: Math.max(0, Math.min(100, n)) } }));
  }
  function distributeEvenly(ln: string) {
    const layer = layers.find(l => l.name === ln); if (!layer) return;
    const even = parseFloat((100 / layer.traits.length).toFixed(2));
    const map: WeightMap = {};
    layer.traits.forEach((t, i) => { map[t.name] = i === layer.traits.length - 1 ? parseFloat((100 - even * (layer.traits.length - 1)).toFixed(2)) : even; });
    setWeights(p => ({ ...p, [ln]: map }));
  }
  function normalizeToHundred(ln: string) {
    const map = weights[ln] ?? {}; const total = Object.values(map).reduce((s, v) => s + v, 0); if (!total) return;
    const norm: WeightMap = {}; const entries = Object.entries(map); let run = 0;
    entries.forEach(([n, v], i) => { if (i === entries.length - 1) { norm[n] = parseFloat((100 - run).toFixed(2)); } else { const x = parseFloat(((v / total) * 100).toFixed(2)); norm[n] = x; run += x; } });
    setWeights(p => ({ ...p, [ln]: norm }));
  }
  async function saveWeights(ln: string) {
    setSaving(ln);
    try {
      const res = await fetch("/api/layers/save-weights", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ collection: activeCollection, layerName: ln, weights: weights[ln], frequency: frequencies[ln] ?? 100 }) });
      const data = await res.json(); if (!data.success) throw new Error(data.error);
      setSaved(ln); setTimeout(() => setSaved(null), 2000);
    } catch (e) { setError(String(e)); } finally { setSaving(null); }
  }
  async function saveAllWeights() { for (const l of layers) await saveWeights(l.name); }
  function onDragStart(i: number) { dragIdx.current = i; }
  function onDragEnter(i: number) { dragOverIdx.current = i; }
  function onDragEnd() {
    if (dragIdx.current === null || dragOverIdx.current === null || dragIdx.current === dragOverIdx.current) { dragIdx.current = null; dragOverIdx.current = null; return; }
    const o = [...layerOrder]; const [m] = o.splice(dragIdx.current, 1); o.splice(dragOverIdx.current, 0, m);
    setLayerOrder(o); dragIdx.current = null; dragOverIdx.current = null;
  }

  const activeLayerData = layers.find(l => l.name === activeLayer);
  const filteredTokens = traitFilter
    ? traitFilter.trait === "__none__"
      ? tokens.filter(tok => !tok.traits.some(t => t.layer === traitFilter.layer))
      : tokens.filter(tok => tok.traits.some(t => t.layer === traitFilter.layer && t.traitName === traitFilter.trait))
    : tokens;
  const total = activeLayer ? getTotal(activeLayer) : 0;
  const totalOk = Math.abs(total - 100) < 0.1;
  const filteredTraits = activeLayerData?.traits.filter(t => t.name.toLowerCase().includes(search.toLowerCase())) ?? [];
  const orderedLayers = layerOrder.map(n => layers.find(l => l.name === n)).filter(Boolean) as LayerConfig[];
  const F: React.CSSProperties = { fontFamily: "'DM Mono', 'Courier New', monospace" };

  return (
    <div style={{ ...F, minHeight: "100vh", background: "#f7f5f0", color: "#1a1a1a" }}>
      <div style={{ background: "#fff", borderBottom: "2px solid #1a1a1a", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
          <div style={{ width: 28, height: 28, background: "#1a1a1a", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15 }}>👜</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>NFT Studio</div>
            <div style={{ fontSize: 9, color: "#888" }}>Multi-Collection Generator</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", color: "#aaa", textTransform: "uppercase" }}>Collection</span>
          <select
            value={activeCollection}
            onChange={e => { setActiveCollection(e.target.value); setTab("weights"); setTokens([]); setActiveLayer(null); }}
            style={{ fontSize: 11, fontWeight: 700, fontFamily: "inherit", background: "#f0ede6", border: "1.5px solid #1a1a1a", borderRadius: 6, padding: "5px 10px", cursor: "pointer", color: "#1a1a1a" }}
          >
            {collections.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: 3, background: "#f0ede6", borderRadius: 7, padding: 3 }}>
          {(["weights", "preview", "cards"] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: "5px 18px", borderRadius: 5, border: "none", cursor: "pointer", ...F, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", background: tab === t ? "#1a1a1a" : "transparent", color: tab === t ? "#f7c948" : "#888", transition: "all 0.15s" }}>{t}</button>
          ))}
        </div>
        <button onClick={saveAllWeights} style={{ background: "#1a1a1a", color: "#f7c948", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 10, fontWeight: 700, ...F, cursor: "pointer", letterSpacing: "0.05em", flexShrink: 0 }}>SAVE ALL</button>
      </div>

      <div style={{ display: "flex", height: "calc(100vh - 57px)" }}>
        <div style={{ width: 190, background: "#fff", borderRight: "2px solid #1a1a1a", overflowY: "auto", flexShrink: 0 }}>
          <div style={{ padding: "8px 12px 5px", fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "#aaa", textTransform: "uppercase", display: "flex", justifyContent: "space-between" }}>
            <span>Layers ({layers.length})</span><span style={{ fontSize: 8, color: "#ccc" }}>drag to reorder</span>
          </div>
          {loading && <div style={{ padding: 14, fontSize: 11, color: "#888" }}>Loading…</div>}
          {orderedLayers.filter(layer => !(activeCollection === "pams" && PAMS_HIDDEN_LAYERS.includes(layer.name.toUpperCase()))).map((layer, i) => {
            const t = getTotal(layer.name); const ok = Math.abs(t - 100) < 0.1; const isActive = activeLayer === layer.name && tab === "weights";
            return (
              <div key={layer.name} draggable onDragStart={() => onDragStart(i)} onDragEnter={() => onDragEnter(i)} onDragEnd={onDragEnd} onDragOver={e => e.preventDefault()}
                onClick={() => { setActiveLayer(layer.name); setSearch(""); if (tab === "preview" || tab === "cards") setTab("weights"); }}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: isActive ? "#f7c948" : "transparent", borderBottom: "1px solid #eee", cursor: "grab", userSelect: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                  <span style={{ fontSize: 9, color: "#ccc", width: 14, textAlign: "right", flexShrink: 0 }}>{i + 1}</span>
                  <div><div style={{ fontSize: 11, fontWeight: isActive ? 700 : 500 }}>{layer.name}</div><div style={{ fontSize: 9, color: "#aaa" }}>{layer.traits.length} · {(frequencies[layer.name] ?? 100) < 100 ? `${frequencies[layer.name]}%` : "100%"}</div></div>
                </div>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: ok ? "#22c55e" : "#ef4444", border: "1.5px solid #1a1a1a", flexShrink: 0 }} />
              </div>
            );
          })}
        </div>

        <div style={{ flex: 1, overflow: (tab === "preview" || tab === "cards") ? "hidden" : "auto", padding: (tab === "preview" || tab === "cards") ? "0" : "16px 22px" }}>
          {error && <div style={{ background: "#fef2f2", border: "1.5px solid #ef4444", borderRadius: 7, padding: "8px 12px", marginBottom: 12, fontSize: 11, color: "#dc2626" }}>⚠ {error}</div>}

          {tab === "weights" && activeLayerData && (
            <>
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em" }}>{activeLayerData.name}</h2>
                  <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>{activeLayerData.traits.length} traits · Attribute Rarity: {frequencies[activeLayerData.name] ?? 100}% · layer {layerOrder.indexOf(activeLayerData.name) + 1}</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                  <button onClick={() => distributeEvenly(activeLayerData.name)} style={{ background: "#f0ede6", border: "1.5px solid #d0ccc2", borderRadius: 5, padding: "5px 10px", fontSize: 9, fontWeight: 600, ...F, cursor: "pointer", color: "#555" }}>EVEN SPLIT</button>
                  <button onClick={() => normalizeToHundred(activeLayerData.name)} style={{ background: "#f0ede6", border: "1.5px solid #d0ccc2", borderRadius: 5, padding: "5px 10px", fontSize: 9, fontWeight: 600, ...F, cursor: "pointer", color: "#555" }}>NORMALIZE</button>
                  <button onClick={() => saveWeights(activeLayerData.name)} disabled={saving === activeLayerData.name} style={{ background: saved === activeLayerData.name ? "#22c55e" : "#1a1a1a", color: saved === activeLayerData.name ? "#fff" : "#f7c948", border: "none", borderRadius: 5, padding: "5px 14px", fontSize: 9, fontWeight: 700, ...F, cursor: "pointer", transition: "background 0.2s" }}>{saving === activeLayerData.name ? "SAVING…" : saved === activeLayerData.name ? "SAVED ✓" : "SAVE"}</button>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", background: totalOk ? "#f0fdf4" : "#fef2f2", border: `1.5px solid ${totalOk ? "#86efac" : "#fca5a5"}`, borderRadius: 7, marginBottom: 12 }}>
                <div style={{ width: 7, height: 7, borderRadius: "50%", background: totalOk ? "#22c55e" : "#ef4444", flexShrink: 0 }} />
                <span style={{ fontSize: 11, fontWeight: 600, color: totalOk ? "#15803d" : "#dc2626" }}>Total: {total.toFixed(2)}%</span>
                {!totalOk && <span style={{ fontSize: 10, color: "#dc2626" }}>— off by {(total - 100).toFixed(2)}%. Click NORMALIZE.</span>}
                {totalOk && <span style={{ fontSize: 10, color: "#16a34a" }}>— ready</span>}
              </div>
              <div style={{ background: "#fff", border: "1.5px solid #e8e4dc", borderRadius: 7, padding: "12px 14px", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "#aaa", textTransform: "uppercase", marginBottom: 2 }}>Attribute Rarity</div>
                    <div style={{ fontSize: 9, color: "#bbb" }}>
                      {(frequencies[activeLayerData.name] ?? 100) >= 100 ? "Appears on every token" : `~${frequencies[activeLayerData.name]}% of tokens`}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <input type="number" min={0} max={100} step={1} value={frequencies[activeLayerData.name] ?? 100}
                      onChange={e => setFrequencies(p => ({ ...p, [activeLayerData.name]: Math.max(0, Math.min(100, Number(e.target.value))) }))}
                      style={{ width: 52, padding: "5px 6px", border: "1.5px solid #d0ccc2", borderRadius: 4, fontSize: 13, fontWeight: 700, ...F, textAlign: "right", background: "#fafafa", outline: "none" }} />
                    <span style={{ fontSize: 11, color: "#888", fontWeight: 600 }}>%</span>
                  </div>
                </div>
                <input type="range" min={0} max={100} step={1} value={frequencies[activeLayerData.name] ?? 100}
                  onChange={e => setFrequencies(p => ({ ...p, [activeLayerData.name]: Number(e.target.value) }))}
                  style={{ width: "100%", accentColor: "#1a1a1a", cursor: "pointer", height: 4 }} />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                  <span style={{ fontSize: 8, color: "#ccc" }}>0%</span>
                  <span style={{ fontSize: 8, color: "#ccc" }}>100%</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
                <input type="text" placeholder="Search traits…" value={search} onChange={e => setSearch(e.target.value)} style={{ flex: 1, padding: "7px 11px", border: "1.5px solid #d0ccc2", borderRadius: 6, fontSize: 11, ...F, background: "#fff", outline: "none" }} />
                <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                  <span style={{ fontSize: 9, color: "#aaa" }}>Collection:</span>
                  <input type="number" min={1} step={1} value={collectionSize} onChange={e => setCollectionSize(Math.max(1, Number(e.target.value)))} style={{ width: 70, padding: "7px 8px", border: "1.5px solid #d0ccc2", borderRadius: 6, fontSize: 11, ...F, textAlign: "right", background: "#fff", outline: "none" }} />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 220px 64px 64px", gap: 8, padding: "4px 12px", marginBottom: 4 }}>
                <span style={{ fontSize: 8, fontWeight: 700, color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase" }}>Trait</span>
                <span style={{ fontSize: 8, fontWeight: 700, color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase" }}>Rarity Weight</span>
                <span style={{ fontSize: 8, fontWeight: 700, color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "right" }}>Est. #</span>
                <span style={{ fontSize: 8, fontWeight: 700, color: "#aaa", letterSpacing: "0.08em", textTransform: "uppercase", textAlign: "right" }}>Est. %</span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                {filteredTraits.map(trait => {
                  const val = weights[activeLayerData.name]?.[trait.name] ?? 0;
                  const freq = frequencies[activeLayerData.name] ?? 100;
                  const estPct = val * (freq / 100);
                  const estCount = Math.round(collectionSize * estPct / 100);
                  return (
                    <div key={trait.name} style={{ background: trait.isNone ? "#f7f5f0" : "#fff", border: `1.5px solid ${trait.isNone ? "#d0ccc2" : "#e8e4dc"}`, borderRadius: 6, padding: "8px 12px", display: "grid", gridTemplateColumns: "1fr 220px 64px 64px", alignItems: "center", gap: 8 }}>
                      <div style={{ overflow: "hidden" }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: trait.isNone ? "#888" : "#1a1a1a", display: "flex", alignItems: "center", gap: 5, overflow: "hidden" }}>
                          {trait.isNone && <span style={{ fontSize: 8, background: "#e8e4dc", borderRadius: 3, padding: "1px 5px", color: "#888", flexShrink: 0 }}>NONE</span>}
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{trait.name}</span>
                        </div>
                        <div style={{ fontSize: 8, color: "#ccc", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{trait.isNone ? "no file · skipped in metadata" : trait.fileName}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <input type="range" min={0} max={100} step={0.5} value={val}
                          onChange={e => handleWeightChange(activeLayerData.name, trait.name, e.target.value)}
                          style={{ flex: 1, accentColor: "#1a1a1a", cursor: "pointer" }} />
                        <input type="number" min={0} max={100} step={0.5} value={val}
                          onChange={e => handleWeightChange(activeLayerData.name, trait.name, e.target.value)}
                          style={{ width: 46, padding: "3px 5px", border: "1.5px solid #d0ccc2", borderRadius: 4, fontSize: 11, ...F, textAlign: "right", background: "#fafafa", outline: "none", flexShrink: 0 }} />
                        <span style={{ fontSize: 9, color: "#aaa", flexShrink: 0 }}>%</span>
                      </div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#555", textAlign: "right" }}>{estCount}</div>
                      <div style={{ fontSize: 11, color: "#888", textAlign: "right" }}>{estPct.toFixed(1)}%</div>
                    </div>
                  );
                })}
                {filteredTraits.length === 0 && search && <div style={{ textAlign: "center", padding: "24px 0", color: "#aaa", fontSize: 11 }}>No traits matching "{search}"</div>}
              </div>
            </>
          )}

          {tab === "preview" && (() => {
            const counts: Record<string, Record<string, number>> = {};
            for (const token of tokens) {
              for (const t of token.traits) {
                if (!counts[t.layer]) counts[t.layer] = {};
                counts[t.layer][t.traitName] = (counts[t.layer][t.traitName] ?? 0) + 1;
              }
            }
            return (
              <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
                <div style={{ width: 210, flexShrink: 0, background: "#fff", borderRight: "1.5px solid #e8e4dc", overflowY: "auto", display: "flex", flexDirection: "column" }}>
                  <div style={{ padding: "10px 12px 6px", borderBottom: "1px solid #f0ede6", flexShrink: 0 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "#aaa", textTransform: "uppercase", marginBottom: 4 }}>Attributes</div>
                    <div style={{ fontSize: 9, color: "#bbb" }}>{tokens.length} tokens</div>
                    {traitFilter && (
                      <div onClick={() => setTraitFilter(null)} style={{ marginTop: 6, cursor: "pointer", fontSize: 9, background: "#fffbea", border: "1px solid #f7c948", borderRadius: 4, padding: "3px 7px", color: "#888", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{traitFilter.layer}: {traitFilter.trait}</span>
                        <span style={{ fontWeight: 700, marginLeft: 4, flexShrink: 0 }}>✕</span>
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    {layerOrder.filter(ln => !(activeCollection === "pams" && PAMS_HIDDEN_LAYERS.includes(ln.toUpperCase()))).map(layerName => {
                      const layerCounts = counts[layerName] ?? {};
                      const noneCount = tokens.length - Object.values(layerCounts).reduce((s, v) => s + v, 0);
                      const entries = Object.entries(layerCounts).sort((a, b) => b[1] - a[1]);
                      const totalAppear = tokens.length - noneCount;
                      const isExpanded = expandedLayers.has(layerName);
                      const hasFilter = traitFilter?.layer === layerName;
                      return (
                        <div key={layerName} style={{ borderBottom: "1px solid #f0ede6" }}>
                          <div onClick={() => toggleLayer(layerName)} style={{ padding: "7px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: hasFilter ? "#fffbea" : "transparent", userSelect: "none" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 8, color: "#aaa", width: 8 }}>{isExpanded ? "▾" : "▸"}</span>
                              <span style={{ fontSize: 10, fontWeight: hasFilter ? 700 : 600, color: hasFilter ? "#1a1a1a" : "#333" }}>{layerName}</span>
                            </div>
                            <span style={{ fontSize: 9, color: "#aaa", fontWeight: 500 }}>{totalAppear}</span>
                          </div>
                          {isExpanded && (
                            <div style={{ paddingBottom: 4 }}>
                              {entries.map(([traitName, count]) => {
                                const isActive = traitFilter?.layer === layerName && traitFilter?.trait === traitName;
                                return (
                                  <div key={traitName} onClick={() => setTraitFilter(isActive ? null : { layer: layerName, trait: traitName })}
                                    style={{ padding: "3px 12px 3px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: isActive ? "#fffbea" : "transparent" }}>
                                    <span style={{ fontSize: 9, color: isActive ? "#1a1a1a" : "#555", fontWeight: isActive ? 700 : 400, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 6 }}>{traitName}</span>
                                    <span style={{ fontSize: 9, color: isActive ? "#888" : "#bbb", flexShrink: 0 }}>{count}</span>
                                  </div>
                                );
                              })}
                              {noneCount > 0 && (() => {
                                const isNoneActive = traitFilter?.layer === layerName && traitFilter?.trait === "__none__";
                                return (
                                  <div onClick={() => setTraitFilter(isNoneActive ? null : { layer: layerName, trait: "__none__" })}
                                    style={{ padding: "3px 12px 3px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: isNoneActive ? "#fffbea" : "transparent" }}>
                                    <span style={{ fontSize: 9, color: isNoneActive ? "#888" : "#ccc", fontStyle: "italic", fontWeight: isNoneActive ? 700 : 400, flex: 1 }}>none</span>
                                    <span style={{ fontSize: 9, color: isNoneActive ? "#888" : "#ccc" }}>{noneCount}</span>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em" }}>Preview</h2>
                      <div style={{ fontSize: 10, color: "#888", marginTop: 2 }}>
                        {traitFilter
                          ? <>{filteredTokens.length} of {tokens.length} · {traitFilter.layer}: <b>{traitFilter.trait}</b></>
                          : <>{tokens.length} tokens · click any to inspect</>
                        }
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                      <select value={previewCount} onChange={e => setPreviewCount(Number(e.target.value))} style={{ padding: "5px 8px", border: "1.5px solid #d0ccc2", borderRadius: 5, ...F, fontSize: 10, background: "#fff", cursor: "pointer" }}>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                        <option value={250}>250</option>
                        <option value={500}>500</option>
                        <option value={1000}>1000</option>
                      </select>
                      <button onClick={regenerate} disabled={generating} style={{ background: "#1a1a1a", color: "#f7c948", border: "none", borderRadius: 5, padding: "6px 14px", fontSize: 10, fontWeight: 700, ...F, cursor: "pointer", letterSpacing: "0.05em", opacity: generating ? 0.6 : 1 }}>
                        {generating ? "GENERATING…" : "↺ REGENERATE"}
                      </button>
                      <button onClick={exportAll} disabled={exporting || generating || !tokens.length} style={{ background: "#f7c948", color: "#1a1a1a", border: "none", borderRadius: 5, padding: "6px 14px", fontSize: 10, fontWeight: 700, ...F, cursor: "pointer", letterSpacing: "0.05em", opacity: (exporting || generating || !tokens.length) ? 0.6 : 1 }}>
                        {exporting ? exportProgress : "⬇ EXPORT ALL"}
                      </button>
                    </div>
                  </div>
                  <div style={{ background: "#fff", border: "1.5px solid #e8e4dc", borderRadius: 7, padding: "7px 12px", marginBottom: 12 }}>
                    <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: "0.1em", color: "#aaa", textTransform: "uppercase", marginBottom: 4 }}>Compositing order (back → front)</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {layerOrder.map((name, i) => (
                        <div key={name} style={{ display: "flex", alignItems: "center", gap: 3 }}>
                          <span style={{ fontSize: 9, background: "#f0ede6", borderRadius: 3, padding: "1px 6px", color: "#555", fontWeight: 600 }}>{name}</span>
                          {i < layerOrder.length - 1 && <span style={{ fontSize: 9, color: "#ccc" }}>→</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                  {generating && <div style={{ textAlign: "center", padding: "60px 0", color: "#aaa", fontSize: 12 }}>Generating {previewCount} tokens…</div>}
                  {!generating && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: 8 }}>
                      {filteredTokens.map(token => (
                        <CompositeImage key={token.id} token={token} size={300} onClick={() => setInspecting(token)} collection={activeCollection} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {tab === "cards" && (() => {
            const cardTokens = traitFilter
              ? tokens.filter(tok => {
                  if (traitFilter.trait === "__none__") return !tok.traits.some(t => t.layer === traitFilter.layer);
                  return tok.traits.some(t => t.layer === traitFilter.layer && t.traitName === traitFilter.trait);
                })
              : tokens;
            const counts: Record<string, Record<string, number>> = {};
            for (const token of tokens) {
              for (const t of token.traits) {
                if (!counts[t.layer]) counts[t.layer] = {};
                counts[t.layer][t.traitName] = (counts[t.layer][t.traitName] ?? 0) + 1;
              }
            }

            // Card dimensions based on collection and format
            const isPams = activeCollection === "pams";
            const isSmall = cardFormat === "small";
            const cardW = 320;
            const cardH = isPams && !isSmall ? Math.round(cardW * (1797 / 1122))
                        : isSmall ? Math.round(cardW * (1536 / 1097))
                        : 513;

            return (
              <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
                <div style={{ width: 210, flexShrink: 0, background: "#fff", borderRight: "1.5px solid #e8e4dc", overflowY: "auto", display: "flex", flexDirection: "column" }}>
                  <div style={{ padding: "10px 12px 6px", borderBottom: "1px solid #f0ede6", flexShrink: 0 }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.1em", color: "#aaa", textTransform: "uppercase", marginBottom: 4 }}>Attributes</div>
                    <div style={{ fontSize: 9, color: "#bbb" }}>{tokens.length} tokens</div>
                    {traitFilter && (
                      <div onClick={() => setTraitFilter(null)} style={{ marginTop: 6, cursor: "pointer", fontSize: 9, background: "#fffbea", border: "1px solid #f7c948", borderRadius: 4, padding: "3px 7px", color: "#888", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{traitFilter.layer}: {traitFilter.trait}</span>
                        <span style={{ fontWeight: 700, marginLeft: 4, flexShrink: 0 }}>✕</span>
                      </div>
                    )}
                  </div>
                  <div style={{ flex: 1, overflowY: "auto" }}>
                    {layerOrder.filter(ln => !(activeCollection === "pams" && PAMS_HIDDEN_LAYERS.includes(ln.toUpperCase()))).map(layerName => {
                      const layerCounts = counts[layerName] ?? {};
                      const noneCount = tokens.length - Object.values(layerCounts).reduce((s, v) => s + v, 0);
                      const entries = Object.entries(layerCounts).sort((a, b) => b[1] - a[1]);
                      const totalAppear = tokens.length - noneCount;
                      const isExpanded = expandedLayers.has(layerName);
                      const hasFilter = traitFilter?.layer === layerName;
                      return (
                        <div key={layerName} style={{ borderBottom: "1px solid #f0ede6" }}>
                          <div onClick={() => toggleLayer(layerName)} style={{ padding: "7px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: hasFilter ? "#fffbea" : "transparent", userSelect: "none" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <span style={{ fontSize: 8, color: "#aaa", width: 8 }}>{isExpanded ? "▾" : "▸"}</span>
                              <span style={{ fontSize: 10, fontWeight: hasFilter ? 700 : 600, color: hasFilter ? "#1a1a1a" : "#333" }}>{layerName}</span>
                            </div>
                            <span style={{ fontSize: 9, color: "#aaa", fontWeight: 500 }}>{totalAppear}</span>
                          </div>
                          {isExpanded && (
                            <div style={{ paddingBottom: 4 }}>
                              {entries.map(([traitName, count]) => {
                                const isActive = traitFilter?.layer === layerName && traitFilter?.trait === traitName;
                                return (
                                  <div key={traitName} onClick={() => setTraitFilter(isActive ? null : { layer: layerName, trait: traitName })}
                                    style={{ padding: "3px 12px 3px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: isActive ? "#fffbea" : "transparent" }}>
                                    <span style={{ fontSize: 9, color: isActive ? "#1a1a1a" : "#555", fontWeight: isActive ? 700 : 400, flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 6 }}>{traitName}</span>
                                    <span style={{ fontSize: 9, color: isActive ? "#888" : "#bbb", flexShrink: 0 }}>{count}</span>
                                  </div>
                                );
                              })}
                              {noneCount > 0 && (() => {
                                const isNoneActive = traitFilter?.layer === layerName && traitFilter?.trait === "__none__";
                                return (
                                  <div onClick={() => setTraitFilter(isNoneActive ? null : { layer: layerName, trait: "__none__" })}
                                    style={{ padding: "3px 12px 3px 26px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", background: isNoneActive ? "#fffbea" : "transparent" }}>
                                    <span style={{ fontSize: 9, color: isNoneActive ? "#888" : "#ccc", fontStyle: "italic", fontWeight: isNoneActive ? 700 : 400, flex: 1 }}>none</span>
                                    <span style={{ fontSize: 9, color: isNoneActive ? "#888" : "#ccc" }}>{noneCount}</span>
                                  </div>
                                );
                              })()}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div style={{ flex: 1, overflowY: "auto", padding: "14px 16px", background: "#0a0f1a" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                    <div>
                      <h2 style={{ margin: 0, fontSize: 18, fontWeight: 800, letterSpacing: "-0.03em", color: "#e8f0ff" }}>Card View</h2>
                      <div style={{ fontSize: 10, color: "#446", marginTop: 2 }}>
                        {pamsMode === "limited" && activeCollection === "pams"
                          ? <>{leSlots.filter(s => s.imageUrl).length} of 25 · Limited Edition</>
                          : traitFilter
                            ? <>{cardTokens.length} of {tokens.length} · {traitFilter.layer}: <b style={{ color: "#f7c948" }}>{traitFilter.trait}</b></>
                            : <>{tokens.length} cards{activeCollection === "pams" && cardFormat === "small" ? ` · Series ${bbSeries}` : ""} · NFT format with lore traits</>
                        }
                      </div>
                      {activeCollection === "pams" && pamsMode === "standard" && tokens.length > 0 && (() => {
                        const tierNames = ["Shoreline", "Reef", "Deep Water", "Abyss", "Pamlovia"];
                        const tierColors = ["#ec4899", "#06b6d4", "#14b8a6", "#f59e0b", "#a855f7"];
                        const counts = tierNames.map(name => tokens.filter(t => t.rarity === name).length);
                        return (
                          <div style={{ display: "flex", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                            {tierNames.map((name, i) => (
                              <span key={name} style={{ fontSize: 9, fontWeight: 700, color: tierColors[i], letterSpacing: "0.03em" }}>
                                {name}: {counts[i]}
                              </span>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                    <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                      {activeCollection === "pams" && (
                        <div style={{ display: "flex", gap: 2, background: "#1a1a2a", borderRadius: 5, padding: 2 }}>
                          <button onClick={() => setPamsMode("standard")} style={{ padding: "4px 10px", fontSize: 9, fontWeight: 700, borderRadius: 4, border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.05em", background: pamsMode === "standard" ? "#a855f7" : "transparent", color: pamsMode === "standard" ? "#fff" : "#666" }}>Standard</button>
                          <button onClick={() => { setPamsMode("limited"); setCardFormat("small"); }} style={{ padding: "4px 10px", fontSize: 9, fontWeight: 700, borderRadius: 4, border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.05em", background: pamsMode === "limited" ? "#ec4899" : "transparent", color: pamsMode === "limited" ? "#fff" : "#666" }}>Limited Edition</button>
                        </div>
                      )}
                      {!(activeCollection === "pams" && pamsMode === "limited") && (<>
                        <div style={{ display: "flex", gap: 2, background: "#1a1a2a", borderRadius: 5, padding: 2 }}>
                          <button onClick={() => setCardFormat("large")} style={{ padding: "4px 10px", fontSize: 9, fontWeight: 700, borderRadius: 4, border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.05em", background: cardFormat === "large" ? "#f7c948" : "transparent", color: cardFormat === "large" ? "#1a1a1a" : "#666" }}>{activeCollection === "pams" ? "Large" : "3.5×5.75"}</button>
                          <button onClick={() => setCardFormat("small")} style={{ padding: "4px 10px", fontSize: 9, fontWeight: 700, borderRadius: 4, border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.05em", background: cardFormat === "small" ? "#f7c948" : "transparent", color: cardFormat === "small" ? "#1a1a1a" : "#666" }}>2.5×3.5</button>
                        </div>
                        {activeCollection === "pams" && cardFormat === "small" && (
                          <div style={{ display: "flex", gap: 2, background: "#1a1a2a", borderRadius: 5, padding: 2 }}>
                            {[1,2,3,4,5].map(s => (
                              <button key={s} onClick={() => { setBbSeries(s); if (bbSeriesTokens[s]?.length) setTokens(bbSeriesTokens[s]); }}
                                style={{ padding: "4px 10px", fontSize: 9, fontWeight: 700, borderRadius: 4, border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: "0.05em",
                                  background: bbSeries === s ? "#00cfff" : "transparent",
                                  color: bbSeries === s ? "#1a1a1a" : bbSeriesTokens[s]?.length ? "#00cfff" : "#555",
                                }}>
                                S{s}{bbSeriesTokens[s]?.length ? ` ✓` : ""}
                              </button>
                            ))}
                          </div>
                        )}
                        <select value={previewCount} onChange={e => setPreviewCount(Number(e.target.value))} style={{ padding: "5px 8px", border: "1.5px solid #333", borderRadius: 5, ...F, fontSize: 10, background: "#fff", color: "#1a3a4a", cursor: "pointer" }}>
                          <option value={50}>50</option>
                          <option value={100}>100</option>
                          <option value={250}>250</option>
                          <option value={500}>500</option>
                          <option value={1000}>1000</option>
                        </select>
                        <button onClick={regenerate} disabled={generating} style={{ background: "#f7c948", color: "#1a1a1a", border: "none", borderRadius: 5, padding: "6px 14px", fontSize: 10, fontWeight: 700, ...F, cursor: "pointer", letterSpacing: "0.05em", opacity: generating ? 0.6 : 1 }}>
                          {generating ? "GENERATING…" : "↺ REGENERATE"}
                        </button>
                        <button onClick={exportAll} disabled={exporting || generating || !tokens.length} style={{ background: "#1a1a1a", color: "#f7c948", border: "none", borderRadius: 5, padding: "6px 14px", fontSize: 10, fontWeight: 700, ...F, cursor: "pointer", letterSpacing: "0.05em", opacity: (exporting || generating || !tokens.length) ? 0.6 : 1 }}>
                          {exporting ? exportProgress : "⬇ EXPORT ALL"}
                        </button>
                      </>)}
                      {activeCollection === "pams" && pamsMode === "limited" && (
                        <button onClick={exportAllLE} disabled={exporting || !leSlots.some(s => s.imageUrl)} style={{ background: "#ec4899", color: "#fff", border: "none", borderRadius: 5, padding: "6px 14px", fontSize: 10, fontWeight: 700, ...F, cursor: "pointer", letterSpacing: "0.05em", opacity: (exporting || !leSlots.some(s => s.imageUrl)) ? 0.6 : 1 }}>
                          {exporting ? exportProgress : "⬇ EXPORT ALL"}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Limited Edition Editor */}
                  {activeCollection === "pams" && pamsMode === "limited" && (
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                      {leSlots.map((slot, idx) => {
                        const previewRef = React.createRef<HTMLCanvasElement>();
                        return (
                          <div key={idx} style={{ background: "#151525", borderRadius: 10, padding: 14, border: "1px solid #2a2a3a" }}>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#ec4899", marginBottom: 8, letterSpacing: "0.1em" }}>SLOT {idx + 1}</div>
                            
                            {/* Preview */}
                            <div style={{ position: "relative", width: "100%", aspectRatio: "1097/1536", background: "#0a0a14", borderRadius: 6, overflow: "hidden", marginBottom: 10 }}>
                              {slot.imageUrl ? (
                                <canvas ref={previewRef} width={274} height={383} style={{ width: "100%", height: "100%", display: "block" }}
                                  data-le-slot={idx} />
                              ) : (
                                <div onClick={() => {
                                  const inp = document.createElement("input");
                                  inp.type = "file"; inp.accept = "image/*";
                                  inp.onchange = () => { const f = inp.files?.[0]; if (f) handleLEImageUpload(idx, f); };
                                  inp.click();
                                }} style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", cursor: "pointer", color: "#555", fontSize: 11, flexDirection: "column", gap: 6 }}>
                                  <span style={{ fontSize: 28 }}>+</span>
                                  <span>Upload Image</span>
                                </div>
                              )}
                            </div>

                            {/* Upload button if image exists */}
                            {slot.imageUrl && (
                              <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                                <button onClick={() => {
                                  const inp = document.createElement("input");
                                  inp.type = "file"; inp.accept = "image/*";
                                  inp.onchange = () => { const f = inp.files?.[0]; if (f) handleLEImageUpload(idx, f); };
                                  inp.click();
                                }} style={{ flex: 1, padding: "5px 0", fontSize: 9, fontWeight: 700, textAlign: "center", background: "#2a2a3a", color: "#aaa", borderRadius: 4, cursor: "pointer", letterSpacing: "0.05em", border: "none" }}>
                                  REPLACE IMAGE
                                </button>
                                <button onClick={() => deleteLESlot(idx)} style={{ padding: "5px 10px", fontSize: 9, fontWeight: 700, background: "#2a2a3a", color: "#f66", border: "none", borderRadius: 4, cursor: "pointer", letterSpacing: "0.05em" }}>✕</button>
                              </div>
                            )}

                            {/* Name */}
                            <input
                              type="text" placeholder="Character Name"
                              value={slot.name} onChange={e => updateLESlot(idx, { name: e.target.value })}
                              style={{ width: "100%", padding: "7px 10px", fontSize: 13, fontWeight: 700, background: "#1a1a2e", color: "#fff", border: "1px solid #333", borderRadius: 5, marginBottom: 6, boxSizing: "border-box", fontFamily: "Georgia, serif", fontStyle: "italic" }}
                            />

                            {/* Description */}
                            <textarea
                              placeholder="Character description / lore..."
                              value={slot.description} onChange={e => updateLESlot(idx, { description: e.target.value })}
                              rows={3}
                              style={{ width: "100%", padding: "7px 10px", fontSize: 11, background: "#1a1a2e", color: "#ccc", border: "1px solid #333", borderRadius: 5, resize: "vertical", boxSizing: "border-box", fontFamily: "Georgia, serif", fontStyle: "italic" }}
                            />

                            {/* Single export */}
                            {slot.imageUrl && (
                              <button onClick={async () => {
                                const c = document.createElement("canvas"); c.width = 1097; c.height = 1536;
                                await drawLECard(c, slot, 1097, 1536);
                                const link = document.createElement("a");
                                link.download = `pams-limited-${(slot.name || `slot-${idx+1}`).replace(/[^a-zA-Z0-9]/g, "-").toLowerCase()}.png`;
                                link.href = c.toDataURL("image/png"); link.click();
                              }} style={{ width: "100%", marginTop: 6, padding: "6px 0", fontSize: 9, fontWeight: 700, background: "#f7c948", color: "#1a1a1a", border: "none", borderRadius: 4, cursor: "pointer", letterSpacing: "0.05em" }}>
                                ⬇ EXPORT HI-RES
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Standard card view */}
                  {!(activeCollection === "pams" && pamsMode === "limited") && (<>
                  {generating && <div style={{ textAlign: "center", padding: "60px 0", color: "#555", fontSize: 12 }}>Generating {previewCount} tokens…</div>}
                  {!generating && (() => {
                    const adj: ColorAdj = { brightness, contrast, highlights, shadows, saturation, temperature, tint, sepia, sharpness };
                    const sliders: { label: string; value: number; set: (v: number) => void; min: number; max: number; def: number }[] = [
                      { label: "EXPOSURE",    value: brightness,   set: setBrightness,   min: 50,   max: 150, def: 100 },
                      { label: "CONTRAST",    value: contrast,     set: setContrast,     min: 50,   max: 150, def: 100 },
                      { label: "HIGHLIGHTS",  value: highlights,   set: setHighlights,   min: -100, max: 100, def: 0 },
                      { label: "SHADOWS",     value: shadows,      set: setShadows,      min: -100, max: 100, def: 0 },
                      { label: "SATURATION",  value: saturation,   set: setSaturation,   min: 0,    max: 200, def: 100 },
                      { label: "TEMPERATURE", value: temperature,  set: setTemperature,  min: -100, max: 100, def: 0 },
                      { label: "TINT",        value: tint,         set: setTint,         min: -100, max: 100, def: 0 },
                      { label: "SEPIA",       value: sepia,        set: setSepia,        min: 0,    max: 100, def: 0 },
                      { label: "SHARPNESS",   value: sharpness,    set: setSharpness,    min: 0,    max: 100, def: 0 },
                    ];
                    return (
                    <>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 28px", padding: "12px 4px 16px", borderBottom: "1px solid #1e1e2e", marginBottom: 16, alignItems: "center" }}>
                        {sliders.map(({ label, value, set, min, max, def }) => (
                          <div key={label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.07em", color: "#777", minWidth: 82 }}>{label}</span>
                            <input type="range" min={min} max={max} value={value}
                              onChange={e => set(Number(e.target.value))}
                              style={{ width: 120, accentColor: "#f7c948", cursor: "pointer" }} />
                            <span style={{ fontSize: 11, fontWeight: 700, color: "#f7c948", minWidth: 40, textAlign: "right" }}>
                              {value > 0 && min < 0 ? `+${value}` : value}{min >= 0 ? "%" : ""}
                            </span>
                            {value !== def && (
                              <button onClick={() => set(def)} style={{ fontSize: 9, color: "#555", background: "none", border: "1px solid #333", borderRadius: 4, padding: "2px 5px", cursor: "pointer", fontFamily: "inherit" }}>↺</button>
                            )}
                          </div>
                        ))}
                        <button onClick={() => { setBrightness(100); setContrast(100); setHighlights(0); setShadows(0); setSaturation(100); setTemperature(0); setTint(0); setSepia(0); setSharpness(0); }}
                          style={{ fontSize: 9, color: "#f7c948", background: "none", border: "1px solid #444", borderRadius: 4, padding: "4px 10px", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, letterSpacing: "0.06em" }}>
                          RESET ALL
                        </button>
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 24, padding: "8px 0" }}>
                        {cardTokens.map(token => (
                          <div key={token.id} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
                            <div onClick={() => setInspecting(token)}
                              style={{ cursor: "pointer", borderRadius: 14, overflow: "hidden", transition: "transform 0.15s, box-shadow 0.15s", lineHeight: 0 }}
                              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-4px) scale(1.01)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 16px 48px rgba(0,0,0,0.7)"; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = ""; }}>
                              <CardCanvas token={token} width={cardW} height={cardH} adj={adj} collection={activeCollection} format={cardFormat} />
                            </div>
                            <div style={{ display: "flex", gap: 8 }}>
                              <button onClick={() => {
                                const canvas = document.querySelector(`canvas[data-token-id="${token.id}"]`) as HTMLCanvasElement;
                                if (!canvas) return;
                                const a = document.createElement("a");
                                a.href = canvas.toDataURL("image/png");
                                a.download = `${activeCollection}-${token.id}.png`;
                                a.click();
                              }} style={{ background: "#111", color: "#aaa", border: "1px solid #333", borderRadius: 8, padding: "7px 16px", fontSize: 11, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", letterSpacing: "0.08em" }}>
                                ↓ PREVIEW
                              </button>
                              <button onClick={() => {
                                const hiW = cardFormat === "small" ? 1097 : (isPams ? 1122 : 1248);
                                const hiH = cardFormat === "small" ? 1536 : (isPams ? 1797 : 2000);
                                const offscreen = document.createElement("canvas");
                                offscreen.width = hiW; offscreen.height = hiH;
                                drawCardToCanvas(offscreen, token, hiW, hiH, adj, activeCollection, cardFormat).then(() => {
                                  const a = document.createElement("a");
                                  a.href = offscreen.toDataURL("image/png");
                                  a.download = `${activeCollection}-${token.id}-hires.png`;
                                  a.click();
                                });
                              }} style={{ background: "#111", color: "#f7c948", border: "1px solid #555", borderRadius: 8, padding: "7px 16px", fontSize: 11, fontWeight: 700, fontFamily: "inherit", cursor: "pointer", letterSpacing: "0.08em" }}>
                                ↓ HI-RES
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                    );
                  })()}
                  </>)}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
      {inspecting && <InspectModal token={inspecting} onClose={() => setInspecting(null)} collection={activeCollection} />}
    </div>
  );
}
