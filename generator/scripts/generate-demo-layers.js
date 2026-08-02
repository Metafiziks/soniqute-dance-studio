#!/usr/bin/env node
/**
 * generate-demo-layers.js
 *
 * Creates placeholder PNG layers for the PaMs Generative Art Studio demo.
 * These are simple geometric shapes — not the actual commissioned PaMs artwork —
 * but they demonstrate every part of the compositing pipeline correctly.
 *
 * Run: node scripts/generate-demo-layers.js
 *
 * Output: demo-layers/
 *   └── {LAYER_NAME}/{trait-name}.png
 *
 * The demo layers mirror the PaMs layer structure (14 categories).
 * Replace with real artwork by adding commissioned PNGs to
 * collections/pams/layers/{LAYER_NAME}/ and running the main studio.
 */

const { createCanvas } = require("canvas");
const fs = require("fs");
const path = require("path");

const OUT = path.join(__dirname, "..", "demo-layers");
const SIZE = 838;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function save(canvas, category, filename) {
  const dir = path.join(OUT, category);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, filename), canvas.toBuffer("image/png"));
}

function blank() {
  const c = createCanvas(SIZE, SIZE);
  return c;
}

function solidBg(color) {
  const c = blank();
  const ctx = c.getContext("2d");
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, SIZE, SIZE);
  return c;
}

function gradientBg(c1, c2, angle = 135) {
  const c = blank();
  const ctx = c.getContext("2d");
  const rad = (angle * Math.PI) / 180;
  const gx = Math.cos(rad) * SIZE;
  const gy = Math.sin(rad) * SIZE;
  const g = ctx.createLinearGradient(0, 0, gx, gy);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, SIZE, SIZE);
  return c;
}

// Draw a filled shape on a transparent canvas, centered at (cx, cy)
function shape(drawFn) {
  const c = blank();
  const ctx = c.getContext("2d");
  ctx.clearRect(0, 0, SIZE, SIZE);
  drawFn(ctx, SIZE);
  return c;
}

// Body silhouette (oval torso occupying lower 60% of canvas)
function bodySilhouette(color) {
  return shape((ctx, S) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(S * 0.5, S * 0.72, S * 0.22, S * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Face — circle in upper-center area
function faceCircle(skinColor, expressionColor) {
  return shape((ctx, S) => {
    // Head/face circle
    ctx.fillStyle = skinColor;
    ctx.beginPath();
    ctx.ellipse(S * 0.5, S * 0.35, S * 0.18, S * 0.2, 0, 0, Math.PI * 2);
    ctx.fill();
    // Eyes
    ctx.fillStyle = expressionColor;
    ctx.beginPath(); ctx.ellipse(S * 0.43, S * 0.32, S * 0.03, S * 0.025, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(S * 0.57, S * 0.32, S * 0.03, S * 0.025, 0, 0, Math.PI * 2); ctx.fill();
  });
}

// Head shape — slightly larger circle above face
function headShape(color) {
  return shape((ctx, S) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(S * 0.5, S * 0.33, S * 0.2, S * 0.22, 0, 0, Math.PI * 2);
    ctx.fill();
  });
}

// Hair blob on top
function hairBlob(color, style = "round") {
  return shape((ctx, S) => {
    ctx.fillStyle = color;
    if (style === "round") {
      ctx.beginPath();
      ctx.ellipse(S * 0.5, S * 0.18, S * 0.18, S * 0.14, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === "afro") {
      ctx.beginPath();
      ctx.arc(S * 0.5, S * 0.18, S * 0.22, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === "long") {
      ctx.beginPath();
      ctx.ellipse(S * 0.5, S * 0.35, S * 0.15, S * 0.32, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(S * 0.5, S * 0.17, S * 0.17, S * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === "bun") {
      ctx.beginPath();
      ctx.arc(S * 0.5, S * 0.12, S * 0.1, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(S * 0.5, S * 0.19, S * 0.17, S * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
    } else if (style === "bang") {
      ctx.beginPath();
      ctx.ellipse(S * 0.5, S * 0.16, S * 0.18, S * 0.1, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(S * 0.32, S * 0.16, S * 0.1, S * 0.2);
      ctx.fillRect(S * 0.58, S * 0.16, S * 0.1, S * 0.2);
    }
  });
}

// Ensemble — full outfit rectangle over torso
function ensembleRect(color, pattern = "solid") {
  return shape((ctx, S) => {
    const x = S * 0.3, y = S * 0.48, w = S * 0.4, h = S * 0.36;
    if (pattern === "solid") {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    } else if (pattern === "stripe") {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      for (let i = 0; i < 6; i++) ctx.fillRect(x + i * (w / 6), y, w / 12, h);
    } else if (pattern === "dots") {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = "rgba(255,255,255,0.3)";
      for (let r = 0; r < 4; r++) for (let c = 0; c < 3; c++) {
        ctx.beginPath();
        ctx.arc(x + c * (w / 3) + w / 6, y + r * (h / 4) + h / 8, S * 0.02, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

// Lower body
function lowerBody(color) {
  return shape((ctx, S) => {
    ctx.fillStyle = color;
    ctx.fillRect(S * 0.33, S * 0.65, S * 0.34, S * 0.28);
    // leg split
    ctx.clearRect(S * 0.49, S * 0.7, S * 0.02, S * 0.23);
  });
}

// Shoes
function shoes(color) {
  return shape((ctx, S) => {
    ctx.fillStyle = color;
    // left shoe
    ctx.beginPath(); ctx.ellipse(S * 0.4, S * 0.93, S * 0.08, S * 0.035, -0.2, 0, Math.PI * 2); ctx.fill();
    // right shoe
    ctx.beginPath(); ctx.ellipse(S * 0.6, S * 0.93, S * 0.08, S * 0.035, 0.2, 0, Math.PI * 2); ctx.fill();
  });
}

// Eyes — drawn over the face region
function eyeOverlay(style) {
  return shape((ctx, S) => {
    const lx = S * 0.43, rx = S * 0.57, ey = S * 0.32;
    ctx.fillStyle = "#111";
    if (style === "round") {
      ctx.beginPath(); ctx.arc(lx, ey, S * 0.028, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(rx, ey, S * 0.028, 0, Math.PI * 2); ctx.fill();
    } else if (style === "almond") {
      ctx.beginPath(); ctx.ellipse(lx, ey, S * 0.035, S * 0.02, 0.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(rx, ey, S * 0.035, S * 0.02, -0.2, 0, Math.PI * 2); ctx.fill();
    } else if (style === "sunglasses") {
      ctx.fillStyle = "#1a1a4e";
      ctx.beginPath(); ctx.ellipse(lx, ey, S * 0.045, S * 0.03, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(rx, ey, S * 0.045, S * 0.03, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#888"; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(lx + S * 0.045, ey); ctx.lineTo(rx - S * 0.045, ey); ctx.stroke();
    } else if (style === "cat") {
      ctx.fillStyle = "#d4a017";
      ctx.beginPath(); ctx.ellipse(lx, ey, S * 0.04, S * 0.025, 0.3, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(rx, ey, S * 0.04, S * 0.025, -0.3, 0, Math.PI * 2); ctx.fill();
    }
  });
}

// Earrings
function earringShape(color) {
  return shape((ctx, S) => {
    ctx.fillStyle = color;
    // left earring
    ctx.beginPath(); ctx.arc(S * 0.315, S * 0.38, S * 0.025, 0, Math.PI * 2); ctx.fill();
    // right earring
    ctx.beginPath(); ctx.arc(S * 0.685, S * 0.38, S * 0.025, 0, Math.PI * 2); ctx.fill();
  });
}

// Accessory (hat or crown on head)
function accessoryShape(color, type) {
  return shape((ctx, S) => {
    ctx.fillStyle = color;
    if (type === "crown") {
      // Crown points
      ctx.beginPath();
      ctx.moveTo(S * 0.35, S * 0.22);
      ctx.lineTo(S * 0.38, S * 0.1);
      ctx.lineTo(S * 0.42, S * 0.18);
      ctx.lineTo(S * 0.5, S * 0.06);
      ctx.lineTo(S * 0.58, S * 0.18);
      ctx.lineTo(S * 0.62, S * 0.1);
      ctx.lineTo(S * 0.65, S * 0.22);
      ctx.closePath();
      ctx.fill();
    } else if (type === "cap") {
      ctx.beginPath();
      ctx.ellipse(S * 0.5, S * 0.16, S * 0.2, S * 0.09, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(S * 0.5, S * 0.12, S * 0.22, S * 0.05);
    } else if (type === "flower") {
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(S * 0.5 + Math.cos(a) * S * 0.07, S * 0.14 + Math.sin(a) * S * 0.07, S * 0.05, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(S * 0.5, S * 0.14, S * 0.04, 0, Math.PI * 2); ctx.fill();
    }
  });
}

// Necklace
function necklaceShape(color) {
  return shape((ctx, S) => {
    ctx.strokeStyle = color;
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(S * 0.5, S * 0.5, S * 0.12, 0.3, Math.PI - 0.3);
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(S * 0.5, S * 0.5 + S * 0.12, S * 0.025, 0, Math.PI * 2); ctx.fill();
  });
}

// Nails overlay
function nailsShape(color) {
  return shape((ctx, S) => {
    ctx.fillStyle = color;
    const positions = [
      [S * 0.28, S * 0.68], [S * 0.32, S * 0.66], [S * 0.36, S * 0.65],
      [S * 0.64, S * 0.65], [S * 0.68, S * 0.66], [S * 0.72, S * 0.68],
    ];
    for (const [x, y] of positions) {
      ctx.beginPath(); ctx.ellipse(x, y, S * 0.018, S * 0.03, 0, 0, Math.PI * 2); ctx.fill();
    }
  });
}

// ─── Layer definitions ─────────────────────────────────────────────────────────

const LAYERS = {
  BACKGROUND: [
    { name: "Violet Sea",    fn: () => gradientBg("#4c1d95", "#0ea5e9") },
    { name: "Ocean Deep",    fn: () => gradientBg("#0c4a6e", "#06b6d4") },
    { name: "Coral Sunset",  fn: () => gradientBg("#9f1239", "#f97316") },
    { name: "Midnight",      fn: () => gradientBg("#0f172a", "#1e1b4b") },
    { name: "Golden Hour",   fn: () => gradientBg("#92400e", "#fbbf24") },
    { name: "Emerald Depths",fn: () => gradientBg("#064e3b", "#10b981") },
  ],
  HEAD: [
    { name: "Safari",    fn: () => headShape("#c8956b") },
    { name: "Marmalade", fn: () => headShape("#e87b4a") },
    { name: "Canary",    fn: () => headShape("#f5c842") },
    { name: "Caramel",   fn: () => headShape("#a0714f") },
    { name: "Jellyfish", fn: () => headShape("#b8a9d9") },
    { name: "Ebony",     fn: () => headShape("#2d1a0e") },
    { name: "Koi Fish",  fn: () => headShape("#e8636b") },
    { name: "Rainbow",   fn: () => headShape("#9b59b6") },
  ],
  HAIR: [
    { name: "Black Round",   fn: () => hairBlob("#111111", "round") },
    { name: "Brown Afro",    fn: () => hairBlob("#5c3317", "afro") },
    { name: "Blonde Long",   fn: () => hairBlob("#f0c040", "long") },
    { name: "Red Bun",       fn: () => hairBlob("#c0392b", "bun") },
    { name: "Blue Bang",     fn: () => hairBlob("#2980b9", "bang") },
    { name: "Purple Afro",   fn: () => hairBlob("#8e44ad", "afro") },
    { name: "White Long",    fn: () => hairBlob("#e8e8e8", "long") },
    { name: "Pink Round",    fn: () => hairBlob("#e91e8c", "round") },
  ],
  EARRINGS: [
    { name: "none",    fn: () => blank() },
    { name: "Gold",    fn: () => earringShape("#f0c040") },
    { name: "Silver",  fn: () => earringShape("#c0c0c0") },
    { name: "Pearl",   fn: () => earringShape("#f5f5f0") },
    { name: "Ruby",    fn: () => earringShape("#c0392b") },
  ],
  BODY: [
    { name: "Safari",    fn: () => bodySilhouette("#c8956b") },
    { name: "Marmalade", fn: () => bodySilhouette("#e87b4a") },
    { name: "Canary",    fn: () => bodySilhouette("#f5c842") },
    { name: "Caramel",   fn: () => bodySilhouette("#a0714f") },
    { name: "Jellyfish", fn: () => bodySilhouette("#b8a9d9") },
    { name: "Ebony",     fn: () => bodySilhouette("#2d1a0e") },
    { name: "Koi Fish",  fn: () => bodySilhouette("#e8636b") },
    { name: "Rainbow",   fn: () => bodySilhouette("#9b59b6") },
  ],
  FACE: [
    { name: "Safari",    fn: () => faceCircle("#c8956b", "#2d1a0e") },
    { name: "Marmalade", fn: () => faceCircle("#e87b4a", "#2d1a0e") },
    { name: "Canary",    fn: () => faceCircle("#f5c842", "#2d1a0e") },
    { name: "Caramel",   fn: () => faceCircle("#a0714f", "#f5f5f5") },
    { name: "Jellyfish", fn: () => faceCircle("#b8a9d9", "#4a2080") },
    { name: "Ebony",     fn: () => faceCircle("#2d1a0e", "#f5f5f5") },
    { name: "Koi Fish",  fn: () => faceCircle("#e8636b", "#2d1a0e") },
    { name: "Rainbow",   fn: () => faceCircle("#9b59b6", "#f5f5f5") },
  ],
  EYES: [
    { name: "Round Dark",   fn: () => eyeOverlay("round") },
    { name: "Almond",       fn: () => eyeOverlay("almond") },
    { name: "Sunglasses",   fn: () => eyeOverlay("sunglasses") },
    { name: "Cat Eye",      fn: () => eyeOverlay("cat") },
  ],
  SHOES: [
    { name: "none",       fn: () => blank() },
    { name: "Black Boot", fn: () => shoes("#111111") },
    { name: "White Heel", fn: () => shoes("#f5f5f5") },
    { name: "Red Pump",   fn: () => shoes("#c0392b") },
    { name: "Gold Slide", fn: () => shoes("#f0c040") },
    { name: "Blue Sneaker",fn: () => shoes("#2980b9") },
  ],
  "LOWER BODY": [
    { name: "none",           fn: () => blank() },
    { name: "Black Pants",    fn: () => lowerBody("#111111") },
    { name: "Blue Jeans",     fn: () => lowerBody("#1a3a6b") },
    { name: "White Shorts",   fn: () => lowerBody("#f0f0f0") },
    { name: "Coral Skirt",    fn: () => lowerBody("#e8636b") },
    { name: "Purple Skirt",   fn: () => lowerBody("#8e44ad") },
  ],
  ACCESSORY: [
    { name: "none",          fn: () => blank() },
    { name: "Gold Crown",    fn: () => accessoryShape("#f0c040", "crown") },
    { name: "Cap",           fn: () => accessoryShape("#1a1a1a", "cap") },
    { name: "Pink Flower",   fn: () => accessoryShape("#e91e8c", "flower") },
  ],
  ENSEMBLE: [
    { name: "none",            fn: () => blank() },
    { name: "Violet Outfit",   fn: () => ensembleRect("#6d28d9", "solid") },
    { name: "Coral Outfit",    fn: () => ensembleRect("#e8636b", "stripe") },
    { name: "Midnight Outfit", fn: () => ensembleRect("#1e1b4b", "dots") },
    { name: "Gold Outfit",     fn: () => ensembleRect("#92400e", "stripe") },
    { name: "Teal Outfit",     fn: () => ensembleRect("#0d9488", "solid") },
  ],
  NECKLACE: [
    { name: "none",   fn: () => blank() },
    { name: "Gold",   fn: () => necklaceShape("#f0c040") },
    { name: "Silver", fn: () => necklaceShape("#c0c0c0") },
    { name: "Pearl",  fn: () => necklaceShape("#f5f5f0") },
  ],
  NAILS: [
    { name: "none",      fn: () => blank() },
    { name: "Red",       fn: () => nailsShape("#c0392b") },
    { name: "Pink",      fn: () => nailsShape("#e91e8c") },
    { name: "Gold",      fn: () => nailsShape("#f0c040") },
    { name: "Black",     fn: () => nailsShape("#111111") },
    { name: "White",     fn: () => nailsShape("#f5f5f5") },
  ],
};

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🎨 PaMs Demo Layer Generator");
  console.log("   Creating placeholder layers for the generative art studio...\n");

  let total = 0;
  for (const [category, traits] of Object.entries(LAYERS)) {
    let count = 0;
    for (const trait of traits) {
      // "none" traits need a transparent blank PNG
      const canvas = trait.name === "none" ? blank() : trait.fn();
      const filename = `${trait.name.replace(/ /g, "_")}.png`;
      save(canvas, category, filename);
      count++;
      total++;
    }
    console.log(`  ✓ ${category.padEnd(12)} — ${count} traits`);
  }

  console.log(`\n✅ Done. ${total} demo layer PNGs written to demo-layers/`);
  console.log("\nTo use the demo layers:");
  console.log("  1. Symlink or copy demo-layers → collections/pams/layers");
  console.log("     ln -s ../../demo-layers collections/pams/layers/demo");
  console.log("  2. Or update collections/pams/collection.json layersDir to 'demo-layers'");
  console.log("\nReplace with your commissioned artwork to produce the real collection.");
}

main().catch(err => { console.error("Error:", err); process.exit(1); });
