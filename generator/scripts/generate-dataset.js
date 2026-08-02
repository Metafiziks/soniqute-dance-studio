#!/usr/bin/env node
/**
 * generate-dataset.js
 *
 * Generates 1,000 unique PaMs collectible card images + metadata JSON files
 * for use as a LoRA training dataset.
 *
 * Run from the generator/ directory:
 *   node scripts/generate-dataset.js
 *
 * Prerequisites:
 *   - Layer PNGs must exist under collections/pams/layers/
 *     (see scripts/generate-demo-layers.js for placeholder layers)
 *   - Card template must exist at collections/pams/card_template.png
 *
 * Output: lora-dataset/
 *   ├── 0001.png   (completed collectible card image)
 *   ├── 0001.json  (trait metadata + natural language caption)
 *   └── ...
 *
 * Then run scripts/train-lora.ts to upload and train on Replicate.
 */

const { createCanvas, loadImage } = require("canvas");
const fs = require("fs");
const path = require("path");

// ─── Configuration ────────────────────────────────────────────────────────────

const LAYERS_DIR   = path.join(__dirname, "..", "collections", "pams", "layers");
const TEMPLATE_DIR = path.join(__dirname, "..", "collections", "pams");
const OUTPUT_DIR   = path.join(__dirname, "..", "lora-dataset");
const COUNT        = 1000;
const IMG_SIZE     = 838;

// Compositing order (back → front). Must match what the studio uses.
const LAYER_ORDER = [
  "BACKGROUND", "HEAD", "HAIR", "EARRINGS", "BODY", "FACE",
  "EYES", "SHOES", "LOWER BODY", "ACCESSORY", "ENSEMBLE", "NECKLACE", "NAILS",
];

// Layers that can appear 0% of the time (get a weighted "none" option)
const LAYERS_WITH_NONE = ["EARRINGS", "ACCESSORY", "ENSEMBLE", "NECKLACE", "NAILS", "SHOES"];

// ─── PaMs Rule Engine ─────────────────────────────────────────────────────────

// Body, Face, and Head must share the same named skin type.
const SKIN_TYPES = ["Safari", "Marmalade", "Canary", "Caramel", "Jellyfish", "Ebony", "Koi Fish", "Rainbow"];
const SKIN_LAYERS = ["HEAD", "BODY", "FACE"];

function getSkinType(traitName) {
  for (const skin of SKIN_TYPES) {
    if (traitName.toLowerCase().includes(skin.toLowerCase())) return skin;
  }
  return null;
}

// Full-body ensembles suppress LOWER BODY
const FULL_BODY_ENSEMBLES = [
  "Yellow Scuba", "Black Ornament", "Black Spectacle", "Black Vanguard",
  "Blue Blossom", "Blue Classic", "Blue Rashguard", "Blue Spectacle", "Blue Vanguard",
  "Bonanza", "Burgundy Scuba", "Green Classic", "Green Vanguard",
  "Linoleum", "Orange Classic", "Orange Cream Rockstar", "Orange Rashguard",
  "Orange Scuba", "Orange Vanguard", "Persimmon", "Pink Classic", "Pink Concerto",
  "Pink Rashguard", "Poker Face", "Red Classic", "Red Ornament", "Red Rashguard",
  "Red Scuba", "Red Spectacle", "Red Vanguard", "White Scuba", "White Vanguard",
  "Yellow Rashguard",
  // Demo layer names:
  "Violet Outfit", "Coral Outfit", "Midnight Outfit", "Gold Outfit", "Teal Outfit",
];

// Talisman / mermaid-tail lower body → SHOES = none
const TALISMAN_LOWER = [
  "Blue Talisman", "Green Talisman", "Orange Talisman",
  "Pink Talisman", "Purple Talisman", "Red Talisman", "Yellow Talisman",
];

const NONE = "__none__";

// ─── Layer loader ─────────────────────────────────────────────────────────────

function loadLayers() {
  const layers = [];
  for (const layerName of LAYER_ORDER) {
    const dir = path.join(LAYERS_DIR, layerName);
    if (!fs.existsSync(dir)) {
      console.warn(`  ⚠ Missing layer folder: ${layerName}`);
      continue;
    }
    const files = fs.readdirSync(dir).filter(f => f.endsWith(".png") && !f.startsWith("."));
    const hasNone = LAYERS_WITH_NONE.includes(layerName);

    const traits = [];
    if (hasNone) traits.push({ name: NONE, fileName: "", weight: 15, isNone: true });

    for (const f of files) {
      const base = f.replace(/\.png$/i, "").replace(/_/g, " ");
      traits.push({ name: base, fileName: f, weight: 10, isNone: false });
    }
    layers.push({ name: layerName, traits });
  }
  return layers;
}

// ─── Weighted pick ────────────────────────────────────────────────────────────

function weightedPick(traits, excluded) {
  const available = traits.filter(t => !excluded.has(t.name));
  if (!available.length) return null;
  const total = available.reduce((s, t) => s + t.weight, 0);
  let r = Math.random() * total;
  for (const t of available) {
    r -= t.weight;
    if (r <= 0) return t;
  }
  return available[available.length - 1];
}

// ─── Token generator ──────────────────────────────────────────────────────────

function generateToken(id, layers) {
  const picks = new Map(); // layerName → traitName

  // Pick BODY first so its skin type drives HEAD + FACE skin matching
  const bodyFirst = ["BODY", ...LAYER_ORDER.filter(l => l !== "BODY")];

  for (const layerName of bodyFirst) {
    const layer = layers.find(l => l.name === layerName);
    if (!layer) continue;
    if (picks.has(layerName)) continue;

    const excluded = new Set();

    // Skin type matching
    if (SKIN_LAYERS.includes(layerName)) {
      for (const t of layer.traits) {
        if (t.isNone) continue;
        const thisSkin = getSkinType(t.name);
        for (const [pl, pt] of picks) {
          if (!SKIN_LAYERS.includes(pl) || pt === NONE) continue;
          const pickedSkin = getSkinType(pt);
          if (pickedSkin && thisSkin && pickedSkin !== thisSkin) { excluded.add(t.name); break; }
          if (pickedSkin && !thisSkin) { excluded.add(t.name); break; }
        }
      }
    }

    // Full-body ensemble → suppress LOWER BODY
    if (layerName === "LOWER BODY") {
      const ensemble = picks.get("ENSEMBLE");
      if (ensemble && ensemble !== NONE && FULL_BODY_ENSEMBLES.some(e => ensemble.toLowerCase() === e.toLowerCase())) {
        picks.set("LOWER BODY", NONE);
        continue;
      }
    }

    const trait = weightedPick(layer.traits, excluded);
    if (!trait) continue;

    picks.set(layerName, trait.name);

    // Talisman lower body → shoes = none
    if (layerName === "LOWER BODY" && TALISMAN_LOWER.some(t => trait.name.toLowerCase() === t.toLowerCase())) {
      picks.set("SHOES", NONE);
    }
  }

  const result = [];
  for (const layerName of LAYER_ORDER) {
    const traitName = picks.get(layerName);
    if (!traitName || traitName === NONE) continue;
    const layer = layers.find(l => l.name === layerName);
    const tf = layer?.traits.find(t => t.name === traitName);
    if (tf && !tf.isNone) result.push({ layer: layerName, traitName: tf.name, fileName: tf.fileName });
  }

  return { id, traits: result };
}

function getDNA(token) {
  return token.traits.map(t => `${t.layer}:${t.traitName}`).sort().join("|");
}

function buildCaption(token) {
  const parts = token.traits.map(t => {
    const descriptions = {
      BACKGROUND: n => `${n} background`,
      HEAD: n => `${n} skin type`,
      HAIR: n => `${n} hairstyle`,
      EARRINGS: n => `${n} earrings`,
      BODY: n => `${n} body`,
      FACE: n => `${n} face`,
      EYES: n => `${n} eyes`,
      SHOES: n => `wearing ${n} shoes`,
      "LOWER BODY": n => `${n} lower body`,
      ACCESSORY: n => `${n} accessory`,
      ENSEMBLE: n => `${n} ensemble`,
      NECKLACE: n => `${n} necklace`,
      NAILS: n => `${n} nails`,
    };
    const fn = descriptions[t.layer];
    return fn ? fn(t.traitName.toLowerCase()) : t.traitName.toLowerCase();
  });
  return `PaMs character, ${parts.join(", ")}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🎨 PaMs LoRA Dataset Generator");
  console.log(`   Generating ${COUNT} unique collectible card images...\n`);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const layers = loadLayers();
  if (!layers.length) {
    console.error("❌ No layers found. Add artwork to collections/pams/layers/ first.");
    console.error("   Run `node scripts/generate-demo-layers.js` and copy demo-layers/ content.");
    process.exit(1);
  }
  console.log(`📂 Loaded ${layers.length} layers, ${layers.reduce((s, l) => s + l.traits.length, 0)} total traits\n`);

  // Generate unique tokens
  console.log("🎲 Generating unique trait combinations...");
  const dnaSet = new Set();
  const tokens = [];
  let attempts = 0;
  while (tokens.length < COUNT && attempts < COUNT * 30) {
    attempts++;
    const token = generateToken(tokens.length + 1, layers);
    const dna = getDNA(token);
    if (!dnaSet.has(dna)) {
      dnaSet.add(dna);
      tokens.push(token);
      if (tokens.length % 200 === 0) console.log(`   ${tokens.length}/${COUNT}...`);
    }
  }
  console.log(`   ✓ ${tokens.length} unique tokens in ${attempts} attempts\n`);

  // Render card images
  console.log("🖼  Rendering collectible cards...");
  const imageCache = new Map();

  async function getImage(filePath) {
    if (imageCache.has(filePath)) return imageCache.get(filePath);
    try {
      const img = await loadImage(filePath);
      imageCache.set(filePath, img);
      return img;
    } catch { return null; }
  }

  // Load card template
  const templatePath = path.join(TEMPLATE_DIR, "card_template.png");
  const template = fs.existsSync(templatePath) ? await getImage(templatePath) : null;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const padId = String(i + 1).padStart(4, "0");

    const canvas = createCanvas(IMG_SIZE, IMG_SIZE);
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;

    // Composite layers
    for (const trait of token.traits) {
      if (trait.layer === "BACKGROUND") continue; // card template provides the framed background
      const imgPath = path.join(LAYERS_DIR, trait.layer, trait.fileName);
      const img = await getImage(imgPath);
      if (img) ctx.drawImage(img, 0, 0, IMG_SIZE, IMG_SIZE);
    }

    // Overlay card template frame (if present)
    if (template) ctx.drawImage(template, 0, 0, IMG_SIZE, IMG_SIZE);

    const pngPath = path.join(OUTPUT_DIR, `${padId}.png`);
    fs.writeFileSync(pngPath, canvas.toBuffer("image/png"));

    const metadata = {
      id: i + 1,
      image: `${padId}.png`,
      caption: buildCaption(token),
      traits: token.traits.map(t => ({ category: t.layer, value: t.traitName })),
    };
    fs.writeFileSync(path.join(OUTPUT_DIR, `${padId}.json`), JSON.stringify(metadata, null, 2));

    if ((i + 1) % 100 === 0) console.log(`   ${i + 1}/${tokens.length} cards rendered...`);
  }

  console.log(`\n✅ Done! ${tokens.length} card images + metadata saved to lora-dataset/`);
  console.log("   Next step: run scripts/train-lora.ts to upload and train on Replicate.");
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
