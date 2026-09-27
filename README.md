# SoniQute — PaMs Collection

The full AI pipeline for the SoniQute PaMs collection: from generative character art through LoRA model training to an NFT-gated dance video studio for social media content generation.

**Live showcase:** [metafiziks.github.io/soniqute-dance-studio](https://metafiziks.github.io/soniqute-dance-studio/) — a static, no-backend rebuild of the PaMs Dance Studio UI ([`docs/`](docs/)) populated with real generated media, for browsing the studio without a wallet or account.

**Pipeline overview:**
```
Trait design → Layer artwork (Forja Studios) → Generative Art Studio → 1,000 card images
  → FLUX LoRA training (Replicate) → 25 Limited Edition characters → PaMs Dance Studio
```

---

## SoniQute Generative Studio

![Workflow diagram](docs/workflow.svg)

An AI-powered dance video generation experience built for holders of the PaMs NFT collection. Users connect their Ethereum wallet, verify NFT ownership, choose a dance vibe, and the platform generates a personalized AI dance video featuring their character — complete with music tracks and synchronized lyrics overlays.

## What it does

1. **Wallet connection + NFT gate** — users connect via MetaMask/WalletConnect; ownership of a PaMs NFT is verified on-chain before access is granted
2. **AI video generation** — dance scenes are generated using WaveSpeed's Seedance model (image-to-video), with the user's NFT character as the subject
3. **Vibe picker** — 16 dance vibes (Hype, Chill, Bounce, Fierce, Silly, Dramatic, Groovy, Robotic, Jersey Club, Afrobeats, House, Litefeet, Amapiano, Salsa, Electric, K-Pop) each mapped to a tailored motion prompt
4. **Optional background + camera** — 12 scene backgrounds (Dancefloor, Stage, Neon City, Space, …) and 12 camera moves (Tracking, Orbit 360, Drone, Push In, …) can each be layered onto a generation; both are optional prompt modifiers on top of the vibe
5. **Aspect ratio** — every scene, render, and admin intro/outro clip is generated and tagged in one of two output shapes: 9:16 portrait (TikTok/Reels) or 16:9 landscape (YouTube). Each ratio keeps its own separate scene library, render library, and Edit Suite arrangement
6. **Music + lyric sync** — tracks are selected from a curated library; lyrics render as styled overlays using FFmpeg compositing via the Shotstack API
7. **Scene stitching (Edit Suite)** — an optional intro clip, three dance-scene "acts," and an optional outro are arranged with per-transition effects and stitched server-side into a final shareable MP4
8. **Custom character images** — admins can upload character images not tied to any NFT token ID, as an alternative generation subject alongside a user's own NFTs

## Tech stack

| Layer | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS, Framer Motion |
| Auth | JWT + NextAuth.js, Google OAuth |
| Wallet | ethers.js v5, WalletConnect / MetaMask |
| Backend | Node.js, Express.js |
| Database | MongoDB + Mongoose |
| Storage | Google Cloud Storage |
| Video generation | WaveSpeed Seedance v1.5 Pro (image-to-video) |
| Video compositing | FFmpeg + Shotstack |
| AI captioning | Google Cloud Video Intelligence |

## Architecture

```
soniqute-dance-studio/
├── docs/                   # Static GitHub Pages showcase (no backend/wallet required)
│   ├── index.html          # Vanilla JS rebuild of the PaMs Dance Studio UI
│   └── data.json           # Real intro/outro/scene/render media pulled from GCS
│
├── frontend/               # Next.js 14 app
│   ├── app/
│   │   ├── pams-studio/    # Main dance studio page
│   │   ├── pams/           # PaMs NFT landing page
│   │   ├── auth/           # Auth callbacks
│   │   ├── login/          # Login page
│   │   └── register/       # Registration flow
│   ├── components/
│   │   ├── LyricStylePicker.tsx   # Lyric style/position picker
│   │   ├── Gate.tsx               # NFT ownership gate component
│   │   ├── ConnectWallet.tsx      # Wallet connection UI
│   │   ├── WorldScene.tsx         # 3D world background
│   │   ├── AdminPageComp/         # Content management tools
│   │   └── ...
│   └── lib/                # API clients, auth helpers, wagmi config
│
└── backend/                # Express.js API
    ├── routes/
    │   ├── pams.studio.routes.js    # Core PaMs studio endpoints
    │   ├── studio.generate.routes.js # AI video generation (WaveSpeed)
    │   ├── studio.stitch.routes.js   # Video stitching (FFmpeg)
    │   ├── studio.routes.js          # Studio profile + scene management
    │   ├── tracks.routes.js          # Music track library
    │   ├── nft.routes.js             # NFT ownership verification
    │   └── auth.routes.js            # JWT auth
    ├── models/
    │   ├── PamsScene.js       # Generated dance scene
    │   ├── PamsFinalVideo.js  # Stitched final video
    │   ├── Track.js           # Music track with clips + lyrics
    │   ├── IntroScene.js      # Intro video clips
    │   ├── OutroScene.js      # Outro video clips
    │   ├── StudioProfile.js   # User credits + generation history
    │   └── CustomCharacterImage.js  # Admin-uploaded character images
    ├── lib/
    │   ├── gcs.js             # Google Cloud Storage helpers
    │   ├── lyricStyles.js     # Lyric overlay style definitions
    │   └── characters.js      # Character metadata helpers
    └── services/
        └── videoIntelligence.service.js  # GCP Video Intelligence captions
```

## Key flows

### Dance video generation (PaMs Studio)
```
User selects NFT or uploaded character → picks vibe (+ optional background, camera move)
  → POST /api/pams-studio/generate  { vibeId, aspectRatio, backgroundId?, cameraId? }
    → WaveSpeed image-to-video API (async polling)
    → scene saved to PamsScene collection in GCS, tagged with its aspect ratio
  → Edit Suite: drag scenes into Act 1 / 2 / 3, optional intro + outro, pick a track
  → POST /api/pams-studio/stitch
    → FFmpeg: intro + act 1 + act 2 + act 3 + outro, per-transition effects
    → lyric overlays composited if enabled
    → final MP4 uploaded to GCS
    → PamsFinalVideo record created
```

### NFT gating
```
Wallet connects (ethers.js)
  → balanceOf(walletAddress) checked against PAMS_CONTRACT_ADDRESS
  → if balance > 0: tokenURI fetched for each token
    → IPFS/HTTP metadata resolved → image URL extracted
  → gallery populated; generation unlocked
```

## Local development

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Google Cloud project with GCS bucket
- WaveSpeed API key
- Shotstack API key (for lyric compositing)

### Backend

```bash
cd backend
cp .env.example .env   # fill in your values
npm install
npm run dev            # starts on :10000
```

### Frontend

```bash
cd frontend
cp .env.example .env.local   # fill in your values
npm install
npm run dev                   # starts on :3000
```

## Environment variables

See [`frontend/.env.example`](frontend/.env.example) and [`backend/.env.example`](backend/.env.example) for all required variables.

The most critical ones to get started:
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — secret for signing JWTs
- `GCS_BUCKET_NAME` + `GCS_PUBLIC_BASE_URL` — where media is stored
- `WAVESPEED_API_KEY` — AI video generation
- `NEXT_PUBLIC_PAMS_CONTRACT_ADDRESS` — the deployed NFT contract on Ethereum
- `NEXT_PUBLIC_API_URL` — points frontend at the backend

---

## PaMs Generative Art Studio

The [`generator/`](generator/) subdirectory contains the custom Next.js generative art studio used to produce the original 1,000 PaMs characters, plus the scripts for generating a LoRA training dataset and submitting the training job to Replicate.

```bash
cd generator
npm install
cp -r demo-layers/* collections/pams/layers/   # use placeholder layers for demo
npm run dev                                      # studio at http://localhost:3000
```

See [`generator/README.md`](generator/README.md) for the full pipeline documentation.
