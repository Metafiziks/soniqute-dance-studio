# PaMs Generative Art Studio

The custom generative art system used to produce the SoniQute PaMs collection — 1,000 unique collectible characters assembled from hand-illustrated layer artwork commissioned from [Forja Studios](https://forja.studio), then exported as finished trading card images for LoRA training.

This tool is the first stage in the full PaMs pipeline described in [the project article](#):

```
Trait design → Layer artwork (Forja Studios) → Generator → 1,000 card images
  → LoRA training (Replicate) → 25 Limited Edition prompts → Dance Studio
```

---

## What It Does

A Next.js generative art studio that composites layer PNG files into unique collectible card images. For the PaMs collection, it:

- Enforces **skin type consistency** — Body, Face, and Head layers must share the same named skin type (Safari, Marmalade, Canary, Caramel, Jellyfish, Ebony, Koi Fish, Rainbow)
- Applies **full-body ensemble rules** — certain ensembles suppress the Lower Body slot
- Applies **talisman/mermaid tail rules** — certain Lower Body traits suppress Shoes
- Generates a **DNA hash** per token to guarantee no duplicates
- Calculates **rarity scores** from trait weight distributions
- Assigns each token to a **rarity tier**: Shoreline → Reef → Deep Water → Abyss → Pamlovia
- Generates **lore statistics**: SNQ (Soniq Frequency), PPL (Pineapple Index), LTS (Lotus Attunement), CPN (Conch Pulse), TDR (Tide Resistance), CPH (Cipher Guard)
- Renders every token as a **finished collectible trading card** — framed, labeled, rarity-glow border, stat bars

### Layer Categories

```
BACKGROUND  HEAD  HAIR  EARRINGS  BODY  FACE
EYES  SHOES  LOWER BODY  ACCESSORY  ENSEMBLE  NECKLACE  NAILS
```

### Rarity Tiers

| Tier | Score | Description |
|---|---|---|
| Shoreline | 1–50 | Born at the water's edge |
| Reef | 51–70 | Found their footing in Pamlovian waters |
| Deep Water | 71–82 | Answered the distress call of the Celestial Lotus |
| Abyss | 83–92 | Survived the Ciphon betrayal |
| Pamlovia | 93–99 | Name written in the Book of Eternity. Pamadeus would recognize them. |

---

## Quickstart

```bash
npm install
npm run dev   # studio runs at http://localhost:3000
```

### Using Demo Layers

The repository does not include the actual commissioned PaMs artwork. Demo placeholder layers (simple geometric shapes) are included for testing the full pipeline:

```bash
# Copy demo layers into the collection directory
cp -r demo-layers/* collections/pams/layers/
npm run dev
```

### Using Your Own Layers

1. Create layer directories under `collections/pams/layers/`:
   ```
   collections/pams/layers/
   ├── BACKGROUND/
   ├── BODY/
   ├── FACE/
   ├── HEAD/
   ├── HAIR/
   ├── EYES/
   ├── ENSEMBLE/
   ├── LOWER BODY/
   ├── SHOES/
   ├── EARRINGS/
   ├── ACCESSORY/
   ├── NECKLACE/
   └── NAILS/
   ```
2. Add transparent PNG files to each directory. Naming: `Trait_Name.png` (underscores become spaces).
3. Body, Face, and Head layer trait names must include the skin type (e.g. `Safari`, `Marmalade`) for skin matching rules to work.

---

## Generating the LoRA Dataset

Once layers are in place, generate 1,000 unique collectible card images:

```bash
node scripts/generate-dataset.js
# Output: lora-dataset/ (1,000 PNGs + metadata JSON per image)
```

Each image is a finished collectible card (character composited over card template). The JSON includes a natural language caption derived from trait names — used for LoRA training.

---

## Training the LoRA on Replicate

After generating the dataset:

```bash
# 1. Zip the dataset
zip -r lora-dataset.zip lora-dataset/

# 2. Set your Replicate API token
export REPLICATE_API_TOKEN=r8_...

# 3. Edit scripts/train-lora.ts — set DESTINATION to your Replicate model
#    e.g. "your-username/pams-collection-style"

# 4. Submit training (~30–45 minutes on Replicate GPU)
npm run train:lora
```

Training uses `ostris/flux-dev-lora-trainer` at 2,000 steps with `lora_rank=16`. The trained model learns the visual language of the collection — character proportions, color palette, style — and can then generate new PaMs imagery from text prompts in environments and lighting conditions that don't exist in any layer file.

The trigger word `PAMSCHAR` activates the style in prompts:

```
PAMSCHAR character, Koi Fish skin, underwater cathedral, dramatic lighting, upper body portrait
```

---

## Project Structure

```
generator/
├── app/
│   ├── page.tsx                     # Main generative art studio UI
│   └── api/
│       ├── layers/route.ts          # Layer metadata API
│       ├── collections/route.ts     # Collection listing
│       ├── collections-static/      # Card template serving
│       └── limited-edition/route.ts # Limited Edition slot management
├── collections/
│   └── pams/
│       ├── collection.json          # Layer order, rules config
│       ├── card_template.png        # Trading card frame overlay
│       └── layers/                  # Layer PNGs (not included — add your own)
├── demo-layers/                     # Placeholder layers for testing
├── lib/generator/
│   ├── layerLoader.ts               # Reads layer directories
│   ├── types.ts                     # Shared TypeScript types
│   └── config.ts                    # Default layer order config
└── scripts/
    ├── generate-demo-layers.js      # Creates placeholder demo layers
    ├── generate-dataset.js          # Generates 1,000 card images for LoRA
    └── train-lora.ts                # Submits training job to Replicate
```

---

## The Bigger Picture

The 1,000 images this tool produces feed the next stage: a custom FLUX LoRA trained on Replicate that learns what a PaMs character looks like well enough to generate them in entirely new contexts — underwater cathedrals, cinematic lighting, wardrobe combinations that don't exist in any layer file.

25 of those LoRA outputs were selected for the Limited Edition PaMs set.

Both collections — the 1,000 generative and the 25 Limited Edition — are usable in the [PaMs Dance Studio](../README.md), where NFT holders generate branded social media videos from their characters.

---

*Character artwork for the original PaMs collection was commissioned from [Forja Studios](https://forja.studio) and is not included in this repository.*
