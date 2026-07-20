/* eslint-disable no-console */
const express      = require("express");
const router       = express.Router();
const rateLimit    = require("express-rate-limit");
const axios        = require("axios");
const fs           = require("fs");
const path         = require("path");
const os           = require("os");
const https        = require("https");
const ffmpeg       = require("fluent-ffmpeg");
const ffmpegPath   = require("@ffmpeg-installer/ffmpeg").path;
const ffprobePath  = require("@ffprobe-installer/ffprobe").path;
const { uploadLocalFile, uploadFromUrl, deleteObject, publicUrl } = require("../lib/gcs");
const StudioProfile = require("../models/StudioProfile");
const QutieChum    = require("../models/QutieChum");
const Scene        = require("../models/Scene");

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

const VIBE_PROMPTS = {
  hype:     "The character performs explosive hip hop dance moves — rapid arm pumps, jumping, high-intensity energy. Dynamic camera, urban backdrop, dramatic lighting.",
  chill:    "The character sways smoothly side to side with a laid-back groove — slow shoulder rolls, relaxed head bobs, cool and effortless. Warm ambient lighting.",
  bounce:   "The character bounces rhythmically with fluid up-down motion — light footwork, playful Caribbean-inspired energy. Bright colorful backdrop.",
  fierce:   "The character performs sharp precise dance moves — strong power poses, attitude-driven choreography, dramatic lighting. High contrast visuals.",
  silly:    "The character performs exaggerated goofy dance moves — wobbly limbs, cartoonish expressions, flailing arms. Fun colorful setting.",
  dramatic: "The character performs slow sweeping theatrical dance movements — emotional expression, cinematic gestures. Starfield or dramatic sky backdrop.",
  groovy:   "The character performs smooth 70s-inspired funk moves — hip sways, finger points, disco energy. Warm retro lighting and colors.",
  robotic:  "The character performs mechanical popping and locking — sharp robotic gestures, glitch effects. Neon circuit board backdrop.",
};

const CREDIT_COST      = 1;
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS  = 3 * 60 * 1000;

const SONIQ = { SCENE_GENERATED: 1 };

const WAVESPEED_BASE   = "https://api.wavespeed.ai/api/v3";
const WAVESPEED_SUBMIT = `${WAVESPEED_BASE}/bytedance/seedance-v1.5-pro/image-to-video`;
const wsHeaders        = () => ({
  "Content-Type": "application/json",
  Authorization:  `Bearer ${process.env.WAVESPEED_API_KEY}`,
});

const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10,
  keyGenerator: (req) => req.user?.userId || req.ip,
  standardHeaders: true, legacyHeaders: false,
  message: { error: "Too many generation requests. Please try again later." },
});

function isAdmin(req)  { return req.user?.isAdmin === true; }

async function canAfford(userId, cost, req) {
  if (isAdmin(req)) return true;
  const profile = await StudioProfile.findOne({ userId });
  return profile && profile.credits >= cost;
}

async function deductCredits(userId, cost, req) {
  if (isAdmin(req)) return;
  await StudioProfile.updateOne({ userId }, { $inc: { credits: -cost } });
}

async function refundCredits(userId, cost, req) {
  if (isAdmin(req)) return;
  await StudioProfile.updateOne({ userId }, { $inc: { credits: cost } });
}

// Download a remote file to a local temp path
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        fs.unlink(destPath, () => {});
        return reject(new Error(`Download failed: HTTP ${response.statusCode}`));
      }
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(); });
    }).on("error", (err) => {
      fs.unlink(destPath, () => {});
      reject(new Error(`Download failed: ${err.message}`));
    });
  });
}

// Extract the last frame of a video file as a PNG
function extractLastFrame(videoPath, framePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(new Error(`ffprobe failed: ${err.message}`));
      const duration = metadata.format.duration;
      const seekTime = Math.max(0, duration - 0.1);
      ffmpeg(videoPath)
        .seekInput(seekTime)
        .frames(1)
        .output(framePath)
        .on("end", resolve)
        .on("error", (e) => reject(new Error(`ffmpeg extract failed: ${e.message}`)))
        .run();
    });
  });
}

// Upload a local image file to GCS, returns { url, objectPath }
async function uploadFrameToGCS(imagePath) {
  const objectPath = `qutie-frames/frame-${Date.now()}.png`;
  const url = await uploadLocalFile(imagePath, objectPath, "image/png");
  return { url, objectPath };
}

// Delete a GCS frame — fire and forget, never blocks generation
function deleteGCSFrame(objectPath) {
  deleteObject(objectPath)
    .then(() => console.log(`[generate] Deleted temp frame: ${objectPath}`))
    .catch(err => console.warn(`[generate] Frame cleanup failed (non-fatal): ${err.message}`));
}

// Submit to Wavespeed image-to-video.
// If lastFrameUrl is provided, extracts the last frame of that video and uses
// it as the input image instead of the character image.
async function submitToWavespeed(characterImageUrl, prompt, lastFrameUrl = null) {
  let inputImageUrl = characterImageUrl;
  let frameObjectPath = null;
  const tempFiles   = [];

  if (lastFrameUrl) {
    const tempDir   = os.tmpdir();
    const videoPath = path.join(tempDir, `src-${Date.now()}.mp4`);
    const framePath = path.join(tempDir, `frm-${Date.now()}.png`);
    tempFiles.push(videoPath, framePath);

    try {
      console.log(`[generate] Downloading source video for last-frame extraction`);
      await downloadFile(lastFrameUrl, videoPath);

      console.log(`[generate] Extracting last frame via ffmpeg`);
      await extractLastFrame(videoPath, framePath);

      console.log(`[generate] Uploading last frame to GCS`);
      const uploaded  = await uploadFrameToGCS(framePath);
      inputImageUrl   = uploaded.url;
      frameObjectPath = uploaded.objectPath;
      console.log(`[generate] Last frame ready: ${inputImageUrl}`);

    } finally {
      for (const f of tempFiles) {
        try { fs.unlinkSync(f); } catch (cleanupErr) {
          console.debug(`[generate] Temp file cleanup skipped: ${cleanupErr.message}`);
        }
      }
    }
  }

  const { data } = await axios.post(
    WAVESPEED_SUBMIT,
    { image: inputImageUrl, prompt, duration: 5, resolution: "1080p", aspect_ratio: "9:16", generate_audio: false, camera_fixed: false, seed: -1 },
    { headers: wsHeaders() }
  );

  if (!data?.data?.id) throw new Error(`Wavespeed submit failed: ${JSON.stringify(data)}`);
  return { predictionId: data.data.id, frameObjectPath };
}

// Poll Wavespeed until completed or timeout
async function pollWavespeed(predictionId) {
  const start   = Date.now();
  const pollUrl = `${WAVESPEED_BASE}/predictions/${predictionId}/result`;

  while (Date.now() - start < POLL_TIMEOUT_MS) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const { data } = await axios.get(pollUrl, { headers: wsHeaders() });
    const result  = data?.data;
    if (!result) throw new Error("Unexpected poll response from Wavespeed");
    console.log(`[generate] Polling ${predictionId}: ${result.status}`);
    if (result.status === "completed") {
      const videoUrl = result.outputs?.[0];
      if (!videoUrl) throw new Error("Wavespeed completed but no output URL");
      return videoUrl;
    }
    if (result.status === "failed") throw new Error(`Wavespeed generation failed for prediction ${predictionId}`);
  }
  throw new Error(`Wavespeed prediction ${predictionId} timed out after 3 minutes`);
}

// Upload the generated video to GCS under qutie-scenes/
async function uploadVideoToGCS(videoUrl, characterId, vibeId) {
  const objectPath = `qutie-scenes/${characterId}-${vibeId}-${Date.now()}.mp4`;
  const url = await uploadFromUrl(videoUrl, objectPath, "video/mp4");
  return { objectPath, url };
}

// ─── POST /api/studio/generate ────────────────────────────────────────���───────
router.post("/", generateLimiter, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: "Unauthorized" });

  const { characterId, vibeId, lastFrameUrl } = req.body;

  if (!characterId || !vibeId) return res.status(400).json({ error: "characterId and vibeId are required" });
  const prompt = VIBE_PROMPTS[vibeId];
  if (!prompt) return res.status(400).json({ error: `Unknown vibeId: ${vibeId}` });

  if (lastFrameUrl !== undefined && lastFrameUrl !== null) {
    let validUrl = false;
    if (typeof lastFrameUrl === "string") {
      try {
        const parsed = new URL(lastFrameUrl);
        validUrl = parsed.protocol === "http:" || parsed.protocol === "https:";
      } catch (_) { validUrl = false; }
    }
    if (!validUrl) return res.status(400).json({ error: "lastFrameUrl must be a valid URL string" });
  }

  try {
    const profile = await StudioProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ error: "Profile not found" });
    if (!profile.characters.some(c => c.characterId === characterId)) {
      return res.status(403).json({ error: "You don't own this character" });
    }
    if (!(await canAfford(userId, CREDIT_COST, req))) {
      return res.status(402).json({ error: "Insufficient credits", credits: profile.credits });
    }
    const chum = await QutieChum.findOne({ characterId }).lean();
    if (!chum?.imageUrl) return res.status(404).json({ error: "Character image not found" });

    await deductCredits(userId, CREDIT_COST, req);

    let gcsUrl, gcsObjectPath;

    try {
      const mode = lastFrameUrl ? "last-frame-extend" : "character-image";
      console.log(`[generate] Starting — character=${characterId} vibe=${vibeId} mode=${mode}`);

      const { predictionId, frameObjectPath } = await submitToWavespeed(chum.imageUrl, prompt, lastFrameUrl || null);
      console.log(`[generate] Wavespeed prediction started: ${predictionId}`);

      let wavespeedVideoUrl;
      try {
        wavespeedVideoUrl = await pollWavespeed(predictionId);
        console.log(`[generate] Wavespeed completed: ${wavespeedVideoUrl}`);
      } finally {
        if (frameObjectPath) deleteGCSFrame(frameObjectPath);
      }

      const uploaded = await uploadVideoToGCS(wavespeedVideoUrl, characterId, vibeId);
      gcsUrl        = uploaded.url;
      gcsObjectPath = uploaded.objectPath;
      console.log(`[generate] Uploaded to GCS: ${gcsObjectPath}`);

    } catch (generationErr) {
      console.error(`[generate] Generation failed, refunding credits:`, generationErr.message);
      await refundCredits(userId, CREDIT_COST, req);
      return res.status(500).json({ error: "Video generation failed. Credits have been refunded.", detail: generationErr.message });
    }

    let savedScene;
    try {
      savedScene = await Scene.create({
        userId,
        characterId,
        vibeId,
        videoUrl:           gcsUrl,
        cloudinaryPublicId: gcsObjectPath,  // reusing field to store GCS object path for deletion
        duration:           "0:05",
        isExtended:         !!lastFrameUrl,
        sourceVideoUrl:     lastFrameUrl || null,
      });
      console.log(`[generate] Scene saved to DB: ${savedScene._id}`);
    } catch (dbErr) {
      console.error("[generate] Failed to save scene to DB:", dbErr.message);
    }

    await StudioProfile.updateOne({ userId }, { $inc: { soniqPoints: SONIQ.SCENE_GENERATED } })
      .catch(e => console.warn(`[generate] SONIQ award failed: ${e.message}`));

    return res.status(201).json({
      success: true,
      scene: {
        id:         savedScene ? savedScene._id.toString() : gcsObjectPath,
        characterId,
        vibeId,
        videoUrl:   gcsUrl,
        duration:   "0:05",
        isExtended: !!lastFrameUrl,
        createdAt:  savedScene ? savedScene.createdAt : new Date(),
      },
    });

  } catch (err) {
    console.error("[generate] Unexpected error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
