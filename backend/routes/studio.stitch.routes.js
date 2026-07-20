const express    = require("express");
const router     = require("express").Router();
const axios      = require("axios");
const rateLimit  = require("express-rate-limit");
const { uploadFromUrl } = require("../lib/gcs");
const Scene         = require("../models/Scene");
const FinalVideo    = require("../models/FinalVideo");
const StudioProfile = require("../models/StudioProfile");
const Track         = require("../models/Track");
const { buildLyricClips, VALID_LYRIC_STYLES } = require("../lib/lyricStyles");

const stitchLimiter = rateLimit({
  windowMs: 60 * 1000, max: 10,
  keyGenerator: (req) => req.user?.userId || req.ip,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

const SHOTSTACK_BASE  = "https://api.shotstack.io/edit/v1";
const SHOTSTACK_KEY   = () => process.env.SHOTSTACK_API_KEY;
const WAVESPEED_BASE  = "https://api.wavespeed.ai/api/v3";
const wsHeaders       = () => ({
  "Content-Type": "application/json",
  Authorization:  `Bearer ${process.env.WAVESPEED_API_KEY}`,
});

const SCENE_DURATION_RAW  = 5.0;
const DEFAULT_BPM         = 120;
const REFERENCE_BPM       = 110;   // BPM Seedance videos are calibrated to; speed = actualBPM / REFERENCE_BPM
const POLL_INTERVAL_MS    = 5000;
const SHOTSTACK_TIMEOUT   = 4 * 60 * 1000;
const LIPSYNC_TIMEOUT     = 10 * 60 * 1000;
const TRANSITION_DURATION = 0.5;
const STITCH_CREDIT_COST  = 2;

const VALID_TRANSITIONS = [
  "none", "fade", "fadeSlow", "fadeFast", "zoom",
  "slideLeft", "slideRight", "slideUp", "slideDown",
  "wipeLeft", "wipeRight", "reveal", "revealSlow", "revealFast",
];

const VALID_LYRIC_POSITIONS = ["top", "middle", "bottom"];

const SONIQ = { FINAL_RENDERED: 5 };

const POSITION_MAP = {
  "top-left":      { x: "5%",  y: "5%",  align: "left"   },
  "top-center":    { x: "50%", y: "5%",  align: "center" },
  "top-right":     { x: "95%", y: "5%",  align: "right"  },
  "mid-left":      { x: "5%",  y: "50%", align: "left"   },
  "mid-center":    { x: "50%", y: "50%", align: "center" },
  "mid-right":     { x: "95%", y: "50%", align: "right"  },
  "bottom-left":   { x: "5%",  y: "90%", align: "left"   },
  "bottom-center": { x: "50%", y: "90%", align: "center" },
  "bottom-right":  { x: "95%", y: "90%", align: "right"  },
};

const FONT_MAP = {
  "Montserrat": "https://fonts.googleapis.com/css2?family=Montserrat:wght@800&display=swap",
  "Bebas Neue": "https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap",
  "Pacifico":   "https://fonts.googleapis.com/css2?family=Pacifico&display=swap",
  "Impact": null, "Courier": null,
};
const ALLOWED_FONTS = new Set(Object.keys(FONT_MAP));
const HEX_COLOR_RE  = /^#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?$/;

function escapeHtml(str) {
  return String(str).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

function buildOverlayHtml(text, font, color, pos) {
  const safeText   = escapeHtml(text);
  const safeFont   = ALLOWED_FONTS.has(font) ? font : "Impact";
  const safeColor  = HEX_COLOR_RE.test(color) ? color : "#ffffff";
  const fontImport = FONT_MAP[safeFont] ? `@import url('${FONT_MAP[safeFont]}');` : "";
  return `<html><body style="margin:0;padding:0;background:transparent;"><style>${fontImport}.txt{position:absolute;left:${pos.x};top:${pos.y};transform:translate(-50%,-50%);font-family:'${safeFont}',sans-serif;font-size:52px;font-weight:800;color:${safeColor};text-align:${pos.align};text-shadow:2px 2px 8px rgba(0,0,0,0.85),-1px -1px 4px rgba(0,0,0,0.6);white-space:pre-wrap;max-width:90%;word-break:break-word}</style><div class="txt">${safeText}</div></body></html>`;
}

function isAdmin(req) { return req.user?.isAdmin === true; }

async function canAfford(userId, cost, isAdminUser) {
  if (isAdminUser) return true;
  const profile = await StudioProfile.findOne({ userId });
  return profile && profile.credits >= cost;
}

async function deductCredits(userId, cost, isAdminUser) {
  if (isAdminUser) return;
  await StudioProfile.updateOne({ userId }, { $inc: { credits: -cost } });
}

function snapToBeat(seconds, bpm) {
  const bd = 60 / bpm;
  return Math.max(2, Math.floor(seconds / bd)) * bd;
}

async function submitShotstack(sceneVideoUrls, audioUrl, bpm, transitions) {
  const rb             = bpm || DEFAULT_BPM;
  const n              = sceneVideoUrls.length;
  const hasTransitions = transitions.length > 0;

  // Stride = gap between scene start times, snapped to whole beats so every
  // scene begins on a beat boundary. Old code snapped (effectiveDuration/n)
  // which shifted scenes 2+ off-beat by the transition overlap amount.
  const rawStride      = hasTransitions
    ? SCENE_DURATION_RAW - TRANSITION_DURATION
    : SCENE_DURATION_RAW;
  const strideDuration = snapToBeat(rawStride, rb);
  const scd            = hasTransitions ? strideDuration + TRANSITION_DURATION : strideDuration;
  const totalDuration  = (n - 1) * strideDuration + scd;

  // Speed: scale movement tempo from REFERENCE_BPM to the actual song BPM
  const bpmSpeed = parseFloat(Math.max(0.5, Math.min(2.0, rb / REFERENCE_BPM)).toFixed(3));

  const videoClips = sceneVideoUrls.map((src, i) => {
    const tout = i < transitions.length ? transitions[i] : null;
    const tin  = i > 0 ? transitions[i - 1] : null;
    return {
      asset: { type: "video", src, volume: 0, speed: bpmSpeed },
      start:  i * strideDuration,  // always on a beat boundary ✓
      length: scd, fit: "cover",
      ...(tin || tout ? { transition: { ...(tin && { in: tin }), ...(tout && { out: tout }) } } : {}),
    };
  });

  const payload = {
    timeline: {
      background: "#000000",
      tracks: [
        { clips: videoClips },
        { clips: [{ asset: { type: "audio", src: audioUrl, trim: 0, volume: 1, effect: "fadeInFadeOut" }, start: 0, length: totalDuration }] },
      ],
    },
    output: { format: "mp4", aspectRatio: "9:16", resolution: "1080", fps: 30 },
  };

  const { data } = await axios.post(`${SHOTSTACK_BASE}/render`, payload, {
    headers: { "Content-Type": "application/json", "x-api-key": SHOTSTACK_KEY() },
  });
  if (!data?.response?.id) throw new Error(`Shotstack submit failed: ${JSON.stringify(data)}`);
  console.log(`[stitch] Shotstack render started: ${data.response.id}`);
  return data.response.id;
}

async function pollShotstack(renderId) {
  const start = Date.now();
  const url   = `${SHOTSTACK_BASE}/render/${renderId}`;
  while (Date.now() - start < SHOTSTACK_TIMEOUT) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const { data } = await axios.get(url, { headers: { "x-api-key": SHOTSTACK_KEY() } });
    const status   = data?.response?.status;
    const output   = data?.response?.url;
    console.log(`[stitch] Shotstack ${renderId}: ${status}`);
    if (status === "done" && output) return output;
    if (status === "failed") throw new Error(`Shotstack render failed: ${renderId}`);
  }
  throw new Error(`Shotstack render ${renderId} timed out`);
}

async function submitKlingLipsync(videoUrl, audioUrl) {
  let response;
  try {
    response = await axios.post(
      `${WAVESPEED_BASE}/kwaivgi/kling-lipsync/audio-to-video`,
      { video: videoUrl, audio: audioUrl },
      { headers: wsHeaders() }
    );
  } catch (err) {
    const body = err.response?.data;
    throw new Error(`Wavespeed Kling submit failed (${err.response?.status}): ${JSON.stringify(body)}`);
  }
  const data = response.data;
  if (!data?.data?.id) throw new Error(`Wavespeed Kling submit failed: ${JSON.stringify(data)}`);
  console.log(`[stitch] Kling lipsync started: ${data.data.id}`);
  return data.data.id;
}

async function pollKlingLipsync(predictionId) {
  const start   = Date.now();
  const pollUrl = `${WAVESPEED_BASE}/predictions/${predictionId}/result`;
  while (Date.now() - start < LIPSYNC_TIMEOUT) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const { data } = await axios.get(pollUrl, { headers: wsHeaders() });
    const result   = data?.data;
    console.log(`[stitch] Kling ${predictionId}: ${result?.status}`);
    if (result?.status === "completed") {
      const url = result.outputs?.[0];
      if (!url) throw new Error("Kling completed but no output URL");
      return url;
    }
    if (result?.status === "failed") throw new Error(`Kling lipsync failed: ${predictionId}`);
  }
  throw new Error("Kling lipsync timed out after 10 minutes");
}

async function uploadFinalToGCS(videoUrl, userId, characterId) {
  const objectPath = `qutie-final/${characterId}-${userId}-${Date.now()}.mp4`;
  const url = await uploadFromUrl(videoUrl, objectPath, "video/mp4");
  return { url, objectPath };
}



// ─── Background processor ─────────────────────────────────────────────────────
async function processFinalVideo(
  finalVideoId, orderedScenes, audioUrl, bpm, userId, characterId,
  skipLipsync = false, isAdminUser = false, resolvedTransitions = [],
  textLayers = [], lyricStyle = "none", lyricPosition = "bottom",
  trackId = null, clipId = null
) {
  try {
    const sceneVideoUrls   = orderedScenes.map(s => s.videoUrl);
    const rb               = bpm || DEFAULT_BPM;
    const n                = sceneVideoUrls.length;
    const hasTransitions   = resolvedTransitions.length > 0;
    // Same stride-based calculation as submitShotstack — must stay in sync
    const rawStride        = hasTransitions
      ? SCENE_DURATION_RAW - TRANSITION_DURATION
      : SCENE_DURATION_RAW;
    const strideDuration   = snapToBeat(rawStride, rb);
    const snappedSceneDur  = hasTransitions ? strideDuration + TRANSITION_DURATION : strideDuration;
    const totalDuration    = (n - 1) * strideDuration + snappedSceneDur;

    // 1. Shotstack stitch
    console.log(`[stitch] Submitting to Shotstack — bpm=${rb}`);
    const renderId    = await submitShotstack(sceneVideoUrls, audioUrl, bpm, resolvedTransitions);
    const stitchedUrl = await pollShotstack(renderId);
    console.log(`[stitch] Shotstack done: ${stitchedUrl}`);

    // 2. Kling lipsync
    let postLipsyncUrl;
    if (skipLipsync) {
      console.log(`[stitch] Skipping lipsync`);
      postLipsyncUrl = stitchedUrl;
    } else {
      console.log(`[stitch] Submitting to Kling lipsync`);
      const taskId   = await submitKlingLipsync(stitchedUrl, audioUrl);
      postLipsyncUrl = await pollKlingLipsync(taskId);
      console.log(`[stitch] Kling done: ${postLipsyncUrl}`);
    }

    // 3. Second pass — text overlays + lyrics (combined into one render)
    const hasTextOverlays = Array.isArray(textLayers) && textLayers.some(Boolean);
    const hasLyrics       = lyricStyle && lyricStyle !== "none";
    let finalUrl          = postLipsyncUrl;

    if (hasTextOverlays || hasLyrics) {
      const overlayClips = [];

      if (hasTextOverlays) {
        textLayers.forEach((layer, i) => {
          if (!layer?.text) return;
          const pos  = POSITION_MAP[layer.position] || POSITION_MAP["bottom-center"];
          const html = buildOverlayHtml(layer.text, layer.font, layer.color, pos);
          const start = i * strideDuration;  // beat-aligned, matches video clip starts
          overlayClips.push({
            asset: { type: "html", html, width: 1080, height: 1920 },
            start, length: snappedSceneDur, position: "center", opacity: 1,
          });
        });
      }

      if (hasLyrics && trackId && clipId) {
        try {
          const track = await Track.findById(trackId).lean();
          const clip  = track?.clips?.find(c => c._id.toString() === clipId.toString());
          if (clip?.lyrics?.length) {
            const lyricClips = buildLyricClips(clip.lyrics, lyricStyle, lyricPosition, totalDuration);
            console.log(`[stitch] Adding ${lyricClips.length} lyric clips (${lyricStyle} / ${lyricPosition})`);
            overlayClips.push(...lyricClips);
          } else {
            console.warn(`[stitch] No lyrics found for clip ${clipId}`);
          }
        } catch (err) {
          console.warn(`[stitch] Lyric load failed:`, err.message);
        }
      }

      if (overlayClips.length > 0) {
        // Extend render to cover last lyric even if it falls past video end
        const lastLyricEnd = overlayClips.reduce(
          (max, c) => Math.max(max, c.start + c.length), totalDuration
        );
        const renderDuration = parseFloat(Math.max(totalDuration, lastLyricEnd).toFixed(3));

        const overlayPayload = {
          timeline: {
            tracks: [
              { clips: overlayClips },
              // length: renderDuration holds last video frame through last lyric
              { clips: [{ asset: { type: "video", src: postLipsyncUrl }, start: 0, length: renderDuration }] },
            ],
          },
          output: { format: "mp4", aspectRatio: "9:16", resolution: "1080", fps: 30 },
        };
        const { data: od } = await axios.post(`${SHOTSTACK_BASE}/render`, overlayPayload, {
          headers: { "Content-Type": "application/json", "x-api-key": SHOTSTACK_KEY() },
        });
        if (!od?.response?.id) throw new Error(`Shotstack overlay submit failed: ${JSON.stringify(od)}`);
        console.log(`[stitch] Overlay render started: ${od.response.id}`);
        finalUrl = await pollShotstack(od.response.id);
        console.log(`[stitch] Overlay done: ${finalUrl}`);
      }
    }

    // 4. Upload to GCS
    const uploaded = await uploadFinalToGCS(finalUrl, userId, characterId);
    console.log(`[stitch] Final uploaded: ${uploaded.objectPath}`);

    await FinalVideo.findByIdAndUpdate(finalVideoId, {
      status: "completed", videoUrl: uploaded.url, cloudinaryPublicId: uploaded.objectPath,
    });

    await StudioProfile.updateOne({ userId }, { $inc: { soniqPoints: SONIQ.FINAL_RENDERED } })
      .catch(e => console.warn(`[stitch] SONIQ award failed: ${e.message}`));

    console.log(`[stitch] Complete — finalVideoId: ${finalVideoId}`);

  } catch (err) {
    console.error(`[stitch] Failed:`, err.message);
    if (!isAdminUser) {
      await StudioProfile.updateOne({ userId }, { $inc: { credits: STITCH_CREDIT_COST } })
        .catch(e => console.warn(`[stitch] Credit refund failed: ${e.message}`));
    }
    await FinalVideo.findByIdAndUpdate(finalVideoId, { status: "failed", errorMessage: err.message });
  }
}

// ─── POST /api/studio/stitch ──────────────────────────────────────────────────
router.post("/", stitchLimiter, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const {
    sceneIds, characterId, trackId, clipId, audioUrl, bpm,
    skipLipsync, transitions, textLayers,
    lyricStyle    = "none",
    lyricPosition = "bottom",
  } = req.body;

  if (!Array.isArray(sceneIds) || sceneIds.length !== 3)
    return res.status(400).json({ error: "sceneIds must be an array of exactly 3 IDs" });

  const resolvedTransitions = (
    Array.isArray(transitions) && transitions.length === sceneIds.length - 1
      ? transitions : Array(sceneIds.length - 1).fill("fade")
  ).map(t => VALID_TRANSITIONS.includes(t) ? t : "fade");

  if (!characterId || !trackId || !clipId || !audioUrl)
    return res.status(400).json({ error: "characterId, trackId, clipId and audioUrl are required" });

  const resolvedLyricStyle    = (lyricStyle === "none" || VALID_LYRIC_STYLES.includes(lyricStyle)) ? lyricStyle : "none";
  const resolvedLyricPosition = VALID_LYRIC_POSITIONS.includes(lyricPosition) ? lyricPosition : "bottom";

  const scenes = await Scene.find({ _id: { $in: sceneIds }, userId }).lean();
  if (scenes.length !== 3)
    return res.status(403).json({ error: "One or more scenes not found or not owned by you" });

  const sceneMap      = new Map(scenes.map(s => [s._id.toString(), s]));
  const orderedScenes = sceneIds.map(id => sceneMap.get(id.toString()));
  if (orderedScenes.some(s => !s))
    return res.status(403).json({ error: "Scene order mismatch" });

  const isAdminUser = isAdmin(req);

  if (!(await canAfford(userId, STITCH_CREDIT_COST, isAdminUser))) {
    const profile = await StudioProfile.findOne({ userId }).lean();
    return res.status(402).json({ error: "Insufficient credits", credits: profile?.credits ?? 0 });
  }
  await deductCredits(userId, STITCH_CREDIT_COST, isAdminUser);

  const finalVideo = await FinalVideo.create({
    userId, characterId, sceneIds, trackId, clipId, audioUrl,
    bpm: bpm || null, skipLipsync: !!skipLipsync,
    lyricStyle: resolvedLyricStyle, lyricPosition: resolvedLyricPosition,
    status: "processing",
  });

  res.status(202).json({
    success: true, finalVideoId: finalVideo._id.toString(),
    message: "Processing started. Poll GET /api/studio/final/:id for status.",
  });

  processFinalVideo(
    finalVideo._id, orderedScenes, audioUrl,
    bpm || DEFAULT_BPM, userId, characterId, !!skipLipsync, isAdminUser,
    resolvedTransitions, Array.isArray(textLayers) ? textLayers : [],
    resolvedLyricStyle, resolvedLyricPosition, trackId, clipId
  ).catch(err => console.error(`[stitch] Unhandled:`, err.message));
});

module.exports = router;
