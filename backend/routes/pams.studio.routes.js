/* eslint-disable no-console */
const express      = require('express');
const router       = express.Router();
const rateLimit    = require('express-rate-limit');
const axios        = require('axios');
const fs           = require('fs');
const path         = require('path');
const os           = require('os');
const https        = require('https');
const ffmpeg       = require('fluent-ffmpeg');
const ffmpegPath   = require('@ffmpeg-installer/ffmpeg').path;
const ffprobePath  = require('@ffprobe-installer/ffprobe').path;
const { uploadFromUrl, uploadLocalFile, deleteObject, generateSignedUploadUrl, publicUrl } = require('../lib/gcs');
const StudioProfile  = require('../models/StudioProfile');
const PamsScene      = require('../models/PamsScene');
const PamsFinalVideo = require('../models/PamsFinalVideo');
const IntroScene     = require('../models/IntroScene');
const OutroScene            = require('../models/OutroScene');
const CustomCharacterImage  = require('../models/CustomCharacterImage');
const Track          = require('../models/Track');
const { buildLyricClips, VALID_LYRIC_STYLES } = require('../lib/lyricStyles');

ffmpeg.setFfmpegPath(ffmpegPath);
ffmpeg.setFfprobePath(ffprobePath);

// ─── Vibe prompts (dance-only, no lipsync) ───────────────────────────────────

const PAMS_VIBES = [
  {
    id: 'hype',
    label: 'Hype',
    prompt: 'explosive full-body dance energy, twerking and twirling, rapid arm pumps and jumping, high-intensity hip hop choreography, mouth closed and neutral throughout, no talking or lip movements, body movement only',
  },
  {
    id: 'chill',
    label: 'Chill',
    prompt: 'smooth swaying side to side, laid-back groove, slow shoulder rolls and relaxed head bobs, mouth closed and neutral throughout, no talking or lip movements, body movement only',
  },
  {
    id: 'bounce',
    label: 'Bounce',
    prompt: 'rhythmic bouncing, fluid up-down motion with light footwork, playful Caribbean energy, mouth closed and neutral throughout, no talking or lip movements, body movement only',
  },
  {
    id: 'fierce',
    label: 'Fierce',
    prompt: 'sharp precise dance moves, strong dramatic poses, attitude-driven choreography, mouth closed and neutral throughout, no talking or lip movements, body movement only',
  },
  {
    id: 'silly',
    label: 'Silly',
    prompt: 'exaggerated goofy dance moves, wobbly limbs and flailing arms, cartoonish energy, mouth closed and neutral throughout, no talking or lip movements, body movement only',
  },
  {
    id: 'dramatic',
    label: 'Dramatic',
    prompt: 'slow sweeping theatrical dance movements, cinematic gestures, emotional expression through body only, mouth closed and neutral throughout, no talking or lip movements, body movement only',
  },
  {
    id: 'groovy',
    label: 'Groovy',
    prompt: 'smooth 70s-inspired funk moves, hip sways and finger points, disco energy, mouth closed and neutral throughout, no talking or lip movements, body movement only',
  },
  {
    id: 'robotic',
    label: 'Robotic',
    prompt: 'mechanical popping and locking, sharp robotic gestures and glitch effects, mouth closed and neutral throughout, no talking or lip movements, body movement only',
  },
  {
    id: 'jerseyclub',
    label: 'Jersey Club',
    prompt: 'explosive Jersey Club footwork, rapid heel-toe stomps, shoulder dips, club bounce energy, syncopated step patterns, mouth closed and neutral throughout, no talking or lip movements, body movement only',
  },
  {
    id: 'afrobeats',
    label: 'Afrobeats',
    prompt: 'full-body rhythm, grounded footwork, shoulder shimmies, joyful West African dance energy, fluid hip movement, mouth closed and neutral throughout, no talking or lip movements, body movement only',
  },
  {
    id: 'house',
    label: 'House',
    prompt: 'rapid precise footwork, jacking torso movement, smooth floor glides, underground club energy, Chicago house dance style, mouth closed and neutral throughout, no talking or lip movements, body movement only',
  },
  {
    id: 'litefeet',
    label: 'Litefeet',
    prompt: 'Harlem litefeet style, light bouncy footwork, toe-and-heel steps, shoulder bounce, smooth gliding weight shifts, playful NYC street energy, mouth closed and neutral throughout, no talking or lip movements, body movement only',
  },
  {
    id: 'amapiano',
    label: 'Amapiano',
    prompt: 'South African log drum bounce, slow shoulder wining, cool township shuffle step, grounded footwork, amapiano party euphoria, mouth closed and neutral throughout, no talking or lip movements, body movement only',
  },
  {
    id: 'salsa',
    label: 'Salsa',
    prompt: 'rapid weight shifts, hip flicks, spinning turns, footwork synced to clave rhythm, joyful Latin salsa heat, mouth closed and neutral throughout, no talking or lip movements, body movement only',
  },
  {
    id: 'electricslide',
    label: 'Electric',
    prompt: 'line dance swagger, side-step groove, grapevine footwork, feel-good crowd energy, electric slide rhythm, mouth closed and neutral throughout, no talking or lip movements, body movement only',
  },
  {
    id: 'kpop',
    label: 'K-Pop',
    prompt: 'synchronized precision choreography, sharp arm lines, clean idol formations, high-energy K-pop dance style, polished group performance energy, mouth closed and neutral throughout, no talking or lip movements, body movement only',
  },
];

// ─── Constants ────────────────────────────────────────────────────────────────

const CREDIT_COST      = 1;
const POLL_INTERVAL_MS = 5000;
const POLL_TIMEOUT_MS  = 10 * 60 * 1000; // 10-minute timeout (Seedance 2.0 can take 8+ min)

const SHOTSTACK_BASE    = 'https://api.shotstack.io/edit/v1';
const SHOTSTACK_KEY     = () => process.env.SHOTSTACK_API_KEY;
const SHOTSTACK_TIMEOUT = 4 * 60 * 1000;

const WAVESPEED_BASE          = 'https://api.wavespeed.ai/api/v3';
const WAVESPEED_IMG_TO_VIDEO  = `${WAVESPEED_BASE}/bytedance/seedance-2.0/image-to-video`;
const wsHeaders               = () => ({
  'Content-Type': 'application/json',
  Authorization:  `Bearer ${process.env.WAVESPEED_API_KEY}`,
});

const SCENE_DURATION_RAW  = 5.0;
const DEFAULT_BPM         = 120;
const REFERENCE_BPM       = 110;   // visual tempo Seedance videos appear to move at; speed = actualBPM / REFERENCE_BPM
const TRANSITION_DURATION       = 0.5;   // scene-to-scene crossfade

const VALID_TRANSITIONS = [
  'none',
  'fade', 'fadeSlow', 'fadeFast',
  'zoom',
  'slideLeft', 'slideRight', 'slideUp', 'slideDown',
  'wipeLeft', 'wipeRight',
  'reveal', 'revealSlow', 'revealFast',
];

const VALID_LYRIC_POSITIONS = ['top', 'middle', 'bottom'];

const SONIQ = {
  SCENE_GENERATED: 1,
  FINAL_RENDERED:  5,
};

// ─── Rate limiters ────────────────────────────────────────────────────────────

const generateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.userId || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many generation requests. Please try again later.' },
});

const stitchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  keyGenerator: (req) => req.user?.userId || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const scenesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.user?.userId || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

const finalVideoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: (req) => req.user?.userId || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// ─── Auth helpers ─────────────────────────────────────────────────────────────

function isAdmin(req) { return req.user?.isAdmin === true; }

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

// ─── GCS / ffmpeg helpers ─────────────────────────────────────────────────────

function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(destPath);
    https.get(url, (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        fs.unlink(destPath, () => {});
        return reject(new Error(`Download failed: HTTP ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(destPath, () => {});
      reject(new Error(`Download failed: ${err.message}`));
    });
  });
}

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
        .on('end', resolve)
        .on('error', (e) => reject(new Error(`ffmpeg extract failed: ${e.message}`)))
        .run();
    });
  });
}

// ─── Wavespeed helpers ────────────────────────────────────────────────────────

// Returns { predictionId, frameObjectPath } — frameObjectPath non-null when a temp
// frame was uploaded and must be deleted after the Wavespeed poll completes.
async function submitToWavespeed(nftImageUrl, prompt, lastFrameUrl = null) {
  let imageToUse      = nftImageUrl;
  let frameObjectPath = null;
  const tempFiles     = [];

  if (lastFrameUrl) {
    const tempDir   = os.tmpdir();
    const videoPath = path.join(tempDir, `pams-src-${Date.now()}.mp4`);
    const framePath = path.join(tempDir, `pams-frm-${Date.now()}.png`);
    tempFiles.push(videoPath, framePath);

    try {
      console.log('[pams/generate] Downloading source video for last-frame extraction');
      await downloadFile(lastFrameUrl, videoPath);
      console.log('[pams/generate] Extracting last frame via ffmpeg');
      await extractLastFrame(videoPath, framePath);

      const objectPath = `qutie-frames/pams-frame-${Date.now()}.png`;
      imageToUse      = await uploadLocalFile(framePath, objectPath, 'image/png');
      frameObjectPath = objectPath;
      console.log(`[pams/generate] Last frame ready: ${imageToUse}`);
    } finally {
      for (const f of tempFiles) {
        try { fs.unlinkSync(f); } catch {}
      }
    }
  }

  const body = {
    image:          imageToUse,
    prompt,
    duration:       5,
    resolution:     '1080p',
    aspect_ratio:   '9:16',
    generate_audio: false,
  };

  const { data } = await axios.post(WAVESPEED_IMG_TO_VIDEO, body, { headers: wsHeaders() });

  if (!data?.data?.id) throw new Error(`Wavespeed submit failed: ${JSON.stringify(data)}`);

  return { predictionId: data.data.id, frameObjectPath };
}

async function pollWavespeed(predictionId) {
  const start   = Date.now();
  const pollUrl = `${WAVESPEED_BASE}/predictions/${predictionId}/result`;

  while (Date.now() - start < POLL_TIMEOUT_MS) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const { data } = await axios.get(pollUrl, { headers: wsHeaders() });
    const result  = data?.data;

    if (!result) throw new Error('Unexpected poll response from Wavespeed');

    console.log(`[pams/generate] Polling ${predictionId}: ${result.status}`);

    if (result.status === 'completed') {
      const videoUrl = result.outputs?.[0];
      if (!videoUrl) throw new Error('Wavespeed completed but no output URL');
      return videoUrl;
    }
    if (result.status === 'failed') {
      throw new Error(`Wavespeed generation failed for prediction ${predictionId}`);
    }
  }

  throw new Error(`Wavespeed prediction ${predictionId} timed out after 5 minutes`);
}

// ─── GCS upload helpers ───────────────────────────────────────────────────────

async function uploadSceneToGCS(videoUrl, tokenId, vibeId) {
  const objectPath = `qutie-pams-scenes/${tokenId}-${vibeId}-${Date.now()}.mp4`;
  const url        = await uploadFromUrl(videoUrl, objectPath, 'video/mp4');
  return { objectPath, url };
}

async function uploadFinalToGCS(videoUrl, userId) {
  const objectPath = `qutie-pams-finals/pams-final-${userId}-${Date.now()}.mp4`;
  const url        = await uploadFromUrl(videoUrl, objectPath, 'video/mp4');
  return { objectPath, url };
}

// ─── BPM / Shotstack helpers ──────────────────────────────────────────────────

function snapToBeat(seconds, bpm) {
  const beatDuration = 60 / bpm;
  const beats        = Math.floor(seconds / beatDuration);
  return Math.max(2, beats) * beatDuration;
}

async function submitShotstack(sceneVideoUrls, audioUrl, bpm, transitions) {
  const resolvedBpm    = bpm || DEFAULT_BPM;
  const numScenes      = sceneVideoUrls.length;
  const hasTransitions = transitions.length > 0;

  // Beat-aligned stride: every scene starts on a beat boundary
  const rawStride      = hasTransitions ? SCENE_DURATION_RAW - TRANSITION_DURATION : SCENE_DURATION_RAW;
  const strideDuration = snapToBeat(rawStride, resolvedBpm);
  const scd            = hasTransitions ? strideDuration + TRANSITION_DURATION : strideDuration;
  const totalDuration  = (numScenes - 1) * strideDuration + scd;

  // Speed: stretch/compress movement tempo to match the actual song BPM
  const bpmSpeed = parseFloat(Math.max(0.5, Math.min(2.0, resolvedBpm / REFERENCE_BPM)).toFixed(3));

  const videoClips = sceneVideoUrls.map((src, i) => {
    const tin  = i > 0 ? transitions[i - 1] : null;
    const tout = i < transitions.length ? transitions[i] : null;
    return {
      asset: { type: 'video', src, volume: 0, speed: bpmSpeed },
      start:  i * strideDuration,
      length: scd,
      fit:    'cover',
      ...(tin || tout ? {
        transition: { ...(tin && { in: tin }), ...(tout && { out: tout }) },
      } : {}),
    };
  });

  const audioClip = {
    asset: { type: 'audio', src: audioUrl, trim: 0, volume: 1, effect: 'fadeInFadeOut' },
    start:  0,
    length: totalDuration,
  };

  const payload = {
    timeline: {
      background: '#000000',
      tracks: [{ clips: videoClips }, { clips: [audioClip] }],
    },
    output: { format: 'mp4', aspectRatio: '9:16', resolution: '1080', fps: 30 },
  };

  const SHOTSTACK_BASE = 'https://api.shotstack.io/edit/v1';
  const SHOTSTACK_KEY  = () => process.env.SHOTSTACK_API_KEY;

  const { data, status: httpStatus } = await axios.post(
    `${SHOTSTACK_BASE}/render`, payload,
    { headers: { 'Content-Type': 'application/json', 'x-api-key': SHOTSTACK_KEY() }, validateStatus: () => true }
  );
  if (httpStatus >= 400 || !data?.response?.id) {
    throw new Error(`Shotstack error ${httpStatus}: ${JSON.stringify(data)}`);
  }
  return { renderId: data.response.id, totalDuration };
}

// ─── Concat intro + finished scene video + outro as sequential clips ──────────
// Called AFTER the scene stitch (and lyric overlay if applicable) is complete.
// Simple sequential concat — no beat math, no timing complexity.
async function concatWithIntroOutro(introScene, sceneUrl, outroScene, sceneDuration, introTransition = 'fade', outroTransition = 'fade') {
  // Intro and outro overlap the scene video by TRANSITION_DURATION to create crossfades.
  // The stitched scene video is complete (music + lyrics baked in) — we just bookend it.
  const clips = [];
  let sceneStart = 0;

  if (introScene) {
    const introDur = Number(introScene.duration);
    clips.push({
      asset:      { type: 'video', src: introScene.videoUrl, volume: 1 },
      start:      0,
      length:     introDur,
      fit:        'cover',
      transition: { out: introTransition },
    });
    sceneStart = introDur - TRANSITION_DURATION;   // scene fades in as intro fades out
  }

  // Stitched scene video — transitions in from intro (if present) and out to outro (if present)
  const sceneTransitions = {
    ...(introScene ? { in:  introTransition  } : {}),
    ...(outroScene ? { out: outroTransition  } : {}),
  };
  clips.push({
    asset:  { type: 'video', src: sceneUrl, volume: 1 },
    start:  sceneStart,
    length: sceneDuration,
    fit:    'cover',
    ...(Object.keys(sceneTransitions).length ? { transition: sceneTransitions } : {}),
  });

  if (outroScene) {
    const outroDur   = Number(outroScene.duration);
    const outroStart = sceneStart + sceneDuration - TRANSITION_DURATION;  // overlaps scene end
    clips.push({
      asset:      { type: 'video', src: outroScene.videoUrl, volume: 1 },
      start:      outroStart,
      length:     outroDur,
      fit:        'cover',
      transition: { in: outroTransition },
    });
  }

  const SHOTSTACK_BASE = 'https://api.shotstack.io/edit/v1';
  const SHOTSTACK_KEY  = () => process.env.SHOTSTACK_API_KEY;

  const payload = {
    timeline: { background: '#000000', tracks: [{ clips }] },
    output:   { format: 'mp4', aspectRatio: '9:16', resolution: '1080', fps: 30 },
  };

  const { data, status: httpStatus } = await axios.post(
    `${SHOTSTACK_BASE}/render`, payload,
    { headers: { 'Content-Type': 'application/json', 'x-api-key': SHOTSTACK_KEY() }, validateStatus: () => true }
  );
  if (httpStatus >= 400 || !data?.response?.id) {
    throw new Error(`Shotstack concat error ${httpStatus}: ${JSON.stringify(data)}`);
  }
  return data.response.id;
}


async function pollShotstack(renderId) {
  const start = Date.now();
  const url   = `${SHOTSTACK_BASE}/render/${renderId}`;

  while (Date.now() - start < SHOTSTACK_TIMEOUT) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS));
    const { data } = await axios.get(url, { headers: { 'x-api-key': SHOTSTACK_KEY() } });
    const status = data?.response?.status;
    const output = data?.response?.url;
    console.log(`[pams/stitch] Shotstack ${renderId}: ${status}`);
    if (status === 'done'   && output) return output;
    if (status === 'failed')           throw new Error(`Shotstack render failed: ${renderId}`);
  }

  throw new Error(`Shotstack render ${renderId} timed out`);
}



// ─── Background stitch processor ─────────────────────────────────────────────

async function processFinalVideo(
  finalVideoId, orderedScenes, audioUrl, bpm, userId, resolvedTransitions,
  lyricStyle = 'none', lyricPosition = 'bottom', trackId = null, clipId = null,
  introSceneId = null, introTransition = 'fade',
  outroSceneId = null, outroTransition = 'fade'
) {
  try {
    const sceneVideoUrls = orderedScenes.map(s => s.videoUrl);

    // ── Intro scene: fetch from DB if provided ─────────────────────────────
    let introScene = null;
    if (introSceneId) {
      introScene = await IntroScene.findById(introSceneId).lean();
      if (!introScene) throw new Error(`Intro scene not found: ${introSceneId}`);
      console.log(`[pams/stitch] Intro scene: "${introScene.title}" (${introScene.duration}s)`);
    }

    let outroScene = null;
    if (outroSceneId) {
      outroScene = await OutroScene.findById(outroSceneId).lean();
      if (!outroScene) throw new Error(`Outro scene not found: ${outroSceneId}`);
      console.log(`[pams/stitch] Outro scene: "${outroScene.title}" (${outroScene.duration}s)`);
    }

    // Calculate totalDuration here — needed for lyric overlay and concat pass
    const rb_td       = bpm || DEFAULT_BPM;
    const hasT_td     = resolvedTransitions.length > 0;
    const rawS_td     = hasT_td ? SCENE_DURATION_RAW - TRANSITION_DURATION : SCENE_DURATION_RAW;
    const stride_td   = snapToBeat(rawS_td, rb_td);
    const scd_td      = hasT_td ? stride_td + TRANSITION_DURATION : stride_td;
    const totalDuration = (sceneVideoUrls.length - 1) * stride_td + scd_td;

    console.log(`[pams/stitch] Submitting to Shotstack — bpm=${rb_td}, totalDuration=${totalDuration.toFixed(3)}s`);
    const { renderId, totalDuration: _td } = await submitShotstack(
      sceneVideoUrls, audioUrl, bpm, resolvedTransitions
    );
    let stitchedUrl = await pollShotstack(renderId);
    console.log(`[pams/stitch] Scene stitch done: ${stitchedUrl}`);

    // ── Optional lyric overlay pass ───────────────────────────────────────────
    let finalUrl = stitchedUrl;

    if (lyricStyle && lyricStyle !== 'none' && trackId && clipId) {
      try {
        const track    = await Track.findById(trackId).lean();
        const clip     = track?.clips?.find(c => c._id.toString() === clipId.toString());
        // Lyric timestamps are relative to music start (t=0 in the stitched scene video).
        // No offset needed — intro/outro are added in a separate concat pass afterwards.
        const rawLyrics    = clip?.lyrics ?? [];
        const fullVideoDur = totalDuration;
        const lyricClips   = buildLyricClips(rawLyrics, lyricStyle, lyricPosition);
        console.log('[pams/stitch] lyricClips:', JSON.stringify(lyricClips, null, 2));

        if (lyricClips.length > 0) {
          console.log(`[pams/stitch] Adding ${lyricClips.length} lyric clips (${lyricStyle} / ${lyricPosition})`);

          // Compute total video duration for the base video clip
          const SHOTSTACK_BASE = 'https://api.shotstack.io/edit/v1';
          const SHOTSTACK_KEY  = () => process.env.SHOTSTACK_API_KEY;
          const numScenes   = sceneVideoUrls.length;
          const rb          = bpm || DEFAULT_BPM;
          const beatDur     = 60 / rb;
          const snapToBeat  = (s) => Math.max(2, Math.floor(s / beatDur)) * beatDur;
          const totalDur    = numScenes * snapToBeat(SCENE_DURATION_RAW);

          // Extend render to cover last lyric even if it falls past the video end
          // renderDur must span intro+scenes+outro, not just the music portion
          const lastLyricEnd = lyricClips.reduce(
            (max, c) => Math.max(max, c.start + c.length), fullVideoDur
          );
          const renderDur = parseFloat(Math.max(fullVideoDur, lastLyricEnd).toFixed(3));

          const overlayPayload = {
            timeline: {
              tracks: [
                { clips: lyricClips },
                // length: renderDur holds last video frame through last lyric
                { clips: [{ asset: { type: 'video', src: stitchedUrl }, start: 0, length: renderDur }] },
              ],
            },
            output: { format: 'mp4', aspectRatio: '9:16', resolution: '1080', fps: 30 },
          };

          console.log('[pams/stitch] Lyric overlay payload:', JSON.stringify(overlayPayload, null, 2));
          const { data: od, status: httpStatus } = await axios.post(
            `${SHOTSTACK_BASE}/render`,
            overlayPayload,
            {
              headers: { 'Content-Type': 'application/json', 'x-api-key': SHOTSTACK_KEY() },
              validateStatus: () => true,
            }
          );

          if (httpStatus >= 400 || !od?.response?.id) {
            console.error('[pams/stitch] Lyric overlay submit failed:', JSON.stringify(od));
            // Non-fatal — fall through with un-overlaid video
          } else {
            console.log(`[pams/stitch] Lyric overlay render started: ${od.response.id}`);
            finalUrl = await pollShotstack(od.response.id);
            console.log(`[pams/stitch] Lyric overlay done: ${finalUrl}`);
          }
        }
      } catch (lyricErr) {
        console.warn(`[pams/stitch] Lyric overlay failed (non-fatal):`, lyricErr.message);
        // Fall through — deliver video without lyrics rather than failing the whole render
      }
    }

    // ── Concat intro + scene video + outro (separate, simple pass) ──────────
    if (introScene || outroScene) {
      console.log('[pams/stitch] Concatenating intro/outro...');
      const concatId = await concatWithIntroOutro(introScene, finalUrl, outroScene, totalDuration, introTransition, outroTransition);
      finalUrl       = await pollShotstack(concatId);
      console.log(`[pams/stitch] Concat done: ${finalUrl}`);
    }
    const uploaded = await uploadFinalToGCS(finalUrl, userId);
    console.log(`[pams/stitch] Final uploaded to GCS: ${uploaded.objectPath}`);

    await PamsFinalVideo.findByIdAndUpdate(finalVideoId, {
      status:      'completed',
      videoUrl:    uploaded.url,
      cloudinaryId: uploaded.objectPath,
    });

    await StudioProfile.updateOne(
      { userId },
      { $inc: { soniqPoints: SONIQ.FINAL_RENDERED } }
    ).catch(e => console.warn(`[pams/stitch] SONIQ award failed: ${e.message}`));

    console.log(`[pams/stitch] Complete — finalVideoId: ${finalVideoId}`);

  } catch (err) {
    console.error(`[pams/stitch] Failed:`, err.message);
    await PamsFinalVideo.findByIdAndUpdate(finalVideoId, {
      status:       'failed',
      errorMessage: err.message,
    });
  }
}

// ─── POST /api/pams-studio/generate ──────────────────────────────────────────

router.post('/generate', generateLimiter, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const { tokenId, nftImageUrl, vibeId, lastFrameUrl } = req.body;

  if (!tokenId || !nftImageUrl || !vibeId) {
    return res.status(400).json({ error: 'tokenId, nftImageUrl and vibeId are required' });
  }

  const vibe = PAMS_VIBES.find(v => v.id === vibeId);
  if (!vibe) return res.status(400).json({ error: 'Invalid vibeId' });

  if (!(await canAfford(userId, CREDIT_COST, req))) {
    const profile = await StudioProfile.findOne({ userId }).lean();
    return res.status(402).json({ error: 'Insufficient credits', credits: profile?.credits ?? 0 });
  }

  await deductCredits(userId, CREDIT_COST, req);

  let gcsUrl, gcsObjectPath;

  try {
    console.log(`[pams/generate] Starting — tokenId=${tokenId} vibe=${vibeId}`);
    const { predictionId, frameObjectPath } = await submitToWavespeed(nftImageUrl, vibe.prompt, lastFrameUrl);
    console.log(`[pams/generate] Wavespeed prediction started: ${predictionId}`);

    let wavespeedVideoUrl;
    try {
      wavespeedVideoUrl = await pollWavespeed(predictionId);
      console.log(`[pams/generate] Wavespeed completed: ${wavespeedVideoUrl}`);
    } finally {
      if (frameObjectPath) {
        deleteObject(frameObjectPath)
          .catch(e => console.warn(`[pams/generate] Frame cleanup failed: ${e.message}`));
      }
    }

    const uploaded = await uploadSceneToGCS(wavespeedVideoUrl, tokenId, vibeId);
    gcsUrl        = uploaded.url;
    gcsObjectPath = uploaded.objectPath;
    console.log(`[pams/generate] Uploaded to GCS: ${gcsObjectPath}`);

  } catch (generationErr) {
    console.error(`[pams/generate] Generation failed, refunding credits:`, generationErr.message);
    await refundCredits(userId, CREDIT_COST, req);
    return res.status(500).json({
      error:  'Video generation failed. Credits have been refunded.',
      detail: generationErr.message,
    });
  }

  let savedScene;
  try {
    savedScene = await PamsScene.create({
      userId,
      tokenId,
      nftImageUrl,
      vibeId,
      videoUrl:    gcsUrl,
      cloudinaryId: gcsObjectPath,
      duration:    '5s',
      status:      'completed',
    });
    console.log(`[pams/generate] Scene saved to DB: ${savedScene._id}`);
  } catch (dbErr) {
    console.error('[pams/generate] Failed to save scene to DB:', dbErr.message);
  }

  await StudioProfile.updateOne(
    { userId },
    { $inc: { soniqPoints: SONIQ.SCENE_GENERATED } }
  ).catch(e => console.warn(`[pams/generate] SONIQ award failed: ${e.message}`));

  return res.status(201).json({
    success: true,
    scene: {
      id:       savedScene ? savedScene._id.toString() : gcsObjectPath,
      videoUrl: gcsUrl,
      tokenId,
      duration: '5s',
      vibeId,
    },
  });
});



// ─── POST /api/pams-studio/intro-scenes/upload-signature (admin only) ─────────
// Returns a GCS signed PUT URL for direct browser-to-GCS upload.
// Frontend: PUT uploadUrl with file body + Content-Type header.
router.post('/intro-scenes/upload-signature', async (req, res) => {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin only' });
  try {
    const { contentType = 'video/mp4', filename } = req.body;
    const ext        = filename ? filename.split('.').pop().toLowerCase() : contentType.split('/')[1];
    const objectPath = `soniqute/intro-scenes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadUrl  = await generateSignedUploadUrl(objectPath, contentType);
    return res.json({ uploadUrl, objectPath, publicUrl: publicUrl(objectPath) });
  } catch (err) {
    console.error('[pams/intro upload-sig] error:', err);
    return res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// ─── GET /api/pams-studio/intro-scenes ────────────────────────────────────────
// All authenticated users can fetch intro scenes
router.get('/intro-scenes', async (req, res) => {
  try {
    const scenes = await IntroScene.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    res.json({ introScenes: scenes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch intro scenes' });
  }
});

// ─── POST /api/pams-studio/intro-scenes (admin only) ─────────────────────────
// Admin passes Cloudinary URL after uploading manually
router.post('/intro-scenes', async (req, res) => {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin only' });
  const { title, videoUrl, publicId, thumbnailUrl, duration, sortOrder } = req.body;
  if (!title || !videoUrl || !publicId || !duration) {
    return res.status(400).json({ error: 'title, videoUrl, publicId, duration required' });
  }
  try {
    const scene = await IntroScene.create({
      title, videoUrl, publicId,
      thumbnailUrl: thumbnailUrl || null,
      duration: Number(duration),
      sortOrder: Number(sortOrder) || 0,
      uploadedBy: req.user.userId,
    });
    res.status(201).json({ introScene: scene });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create intro scene' });
  }
});

// ─── DELETE /api/pams-studio/intro-scenes/:id (admin only) ───────────────────
router.delete('/intro-scenes/:id', async (req, res) => {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin only' });
  try {
    await IntroScene.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate intro scene' });
  }
});

// ─── POST /api/pams-studio/outro-scenes/upload-signature (admin only) ─────────
router.post('/outro-scenes/upload-signature', async (req, res) => {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin only' });
  try {
    const { contentType = 'video/mp4', filename } = req.body;
    const ext        = filename ? filename.split('.').pop().toLowerCase() : contentType.split('/')[1];
    const objectPath = `soniqute/outro-scenes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadUrl  = await generateSignedUploadUrl(objectPath, contentType);
    return res.json({ uploadUrl, objectPath, publicUrl: publicUrl(objectPath) });
  } catch (err) {
    console.error('[pams/outro upload-sig] error:', err);
    return res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// ─── GET /api/pams-studio/outro-scenes ───────────────────────────────────────
router.get('/outro-scenes', async (req, res) => {
  try {
    const scenes = await OutroScene.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: -1 })
      .lean();
    res.json({ outroScenes: scenes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch outro scenes' });
  }
});

// ─── POST /api/pams-studio/outro-scenes (admin only) ─────────────────────────
router.post('/outro-scenes', async (req, res) => {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin only' });
  const { title, videoUrl, publicId, thumbnailUrl, duration, sortOrder } = req.body;
  if (!title || !videoUrl || !publicId || !duration) {
    return res.status(400).json({ error: 'title, videoUrl, publicId, duration required' });
  }
  try {
    const scene = await OutroScene.create({
      title, videoUrl, publicId,
      thumbnailUrl: thumbnailUrl || null,
      duration:     Number(duration),
      sortOrder:    Number(sortOrder) || 0,
      uploadedBy:   req.user.userId,
    });
    res.status(201).json({ outroScene: scene });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to create outro scene' });
  }
});

// ─── DELETE /api/pams-studio/outro-scenes/:id (admin only) ───────────────────
router.delete('/outro-scenes/:id', async (req, res) => {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin only' });
  try {
    await OutroScene.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate outro scene' });
  }
});


// ─── Custom Character Image routes ────────────────────────────────────────────
const MAX_CUSTOM_IMAGES = 25;

// POST /api/pams-studio/custom-images/upload-signature (admin only)
router.post('/custom-images/upload-signature', async (req, res) => {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin only' });
  try {
    const { contentType = 'image/jpeg', filename } = req.body;
    const ext        = filename ? filename.split('.').pop().toLowerCase() : contentType.split('/')[1];
    const objectPath = `soniqute/custom-characters/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const uploadUrl  = await generateSignedUploadUrl(objectPath, contentType);
    return res.json({ uploadUrl, objectPath, publicUrl: publicUrl(objectPath) });
  } catch (err) {
    console.error('[custom-images upload-sig]', err);
    return res.status(500).json({ error: 'Failed to generate upload URL' });
  }
});

// GET /api/pams-studio/custom-images — all active images, ordered
router.get('/custom-images', async (req, res) => {
  try {
    const images = await CustomCharacterImage
      .find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .limit(MAX_CUSTOM_IMAGES)
      .lean();
    res.json({ customImages: images });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch custom images' });
  }
});

// POST /api/pams-studio/custom-images (admin only)
router.post('/custom-images', async (req, res) => {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin only' });
  try {
    const count = await CustomCharacterImage.countDocuments({ isActive: true });
    if (count >= MAX_CUSTOM_IMAGES) {
      return res.status(400).json({ error: `Maximum ${MAX_CUSTOM_IMAGES} images reached` });
    }
    const { title, imageUrl, publicId, sortOrder } = req.body;
    if (!imageUrl || !publicId) {
      return res.status(400).json({ error: 'imageUrl and publicId required' });
    }
    const image = await CustomCharacterImage.create({
      title:      title?.trim() || '',
      imageUrl,
      publicId,
      sortOrder:  Number(sortOrder) || count,
      uploadedBy: req.user.userId,
    });
    res.status(201).json({ customImage: image });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to save image' });
  }
});

// PATCH /api/pams-studio/custom-images/:id — update title (admin only)
router.patch('/custom-images/:id', async (req, res) => {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin only' });
  try {
    const { title } = req.body;
    const image = await CustomCharacterImage.findByIdAndUpdate(
      req.params.id,
      { title: title?.trim() || '' },
      { new: true }
    );
    res.json({ customImage: image });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update image' });
  }
});

// DELETE /api/pams-studio/custom-images/:id (admin only) — soft delete
router.delete('/custom-images/:id', async (req, res) => {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin only' });
  try {
    await CustomCharacterImage.findByIdAndUpdate(req.params.id, { isActive: false });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete image' });
  }
});


// ─── POST /api/pams-studio/custom-images/:id/generate ────────────────────────
// Generates an AI dance video from a custom character image + selected vibe.
// Reuses the exact same WaveSpeed/Seedance pipeline as NFT scene generation.
router.post('/custom-images/:id/generate', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'Authentication required' });
  const userId = req.user.userId;
  const { vibeId } = req.body;

  const customImage = await CustomCharacterImage.findById(req.params.id).lean();
  if (!customImage || !customImage.isActive) {
    return res.status(404).json({ error: 'Custom image not found' });
  }

  const vibe = PAMS_VIBES.find(v => v.id === vibeId);
  if (!vibe) return res.status(400).json({ error: 'Invalid vibeId' });

  if (!(await canAfford(userId, CREDIT_COST, req))) {
    const profile = await StudioProfile.findOne({ userId }).lean();
    return res.status(402).json({ error: 'Insufficient credits', credits: profile?.credits ?? 0 });
  }

  await deductCredits(userId, CREDIT_COST, req);

  let gcsUrl, gcsObjectPath;
  try {
    console.log(`[custom/generate] Starting — imageId=${req.params.id} vibe=${vibeId}`);
    const { predictionId, frameObjectPath } = await submitToWavespeed(customImage.imageUrl, vibe.prompt);
    let wavespeedVideoUrl;
    try {
      wavespeedVideoUrl = await pollWavespeed(predictionId);
    } finally {
      if (frameObjectPath) {
        deleteObject(frameObjectPath)
          .catch(e => console.warn(`[custom/generate] Frame cleanup failed: ${e.message}`));
      }
    }
    const uploaded = await uploadSceneToGCS(wavespeedVideoUrl, `custom-${req.params.id}`, vibeId);
    gcsUrl        = uploaded.url;
    gcsObjectPath = uploaded.objectPath;
  } catch (err) {
    console.error('[custom/generate] Failed, refunding:', err.message);
    await refundCredits(userId, CREDIT_COST, req);
    return res.status(500).json({ error: 'Video generation failed. Credits have been refunded.', detail: err.message });
  }

  // Store as a PamsScene so it integrates with the existing slot/stitch system
  const scene = await PamsScene.create({
    userId,
    tokenId:      0,
    nftImageUrl:  customImage.imageUrl,
    vibeId,
    videoUrl:     gcsUrl,
    cloudinaryId: gcsObjectPath,
    duration:     '5s',
    status:       'completed',
    isCustomImage: true,
    customImageId: customImage._id,
  });

  const profile = await StudioProfile.findOne({ userId }).lean();
  return res.status(201).json({
    scene: {
      ...scene.toObject(),
      id:   scene._id.toString(),
      vibe: PAMS_VIBES.find(v => v.id === vibeId),
    },
    credits: profile?.credits ?? 0,
  });
});


// ─── POST /api/admin/scenes/recover ───────────────────────────────────────────
// Manually recovers a WaveSpeed generation that completed after the poll timeout.
// Admin provides the prediction ID + scene metadata; we fetch the output URL,
// upload to Cloudinary, and create the PamsScene record.
router.post('/admin/scenes/recover', async (req, res) => {
  if (!req.user?.isAdmin) return res.status(403).json({ error: 'Admin only' });

  const { predictionId, nftImageUrl, vibeId, userId, tokenId, customImageId } = req.body;
  if (!predictionId || !nftImageUrl || !vibeId || !userId) {
    return res.status(400).json({ error: 'predictionId, nftImageUrl, vibeId, userId required' });
  }

  try {
    // 1. Get the video URL — either provided directly or fetched from WaveSpeed
    let wavespeedVideoUrl = req.body.videoUrl || null;

    if (!wavespeedVideoUrl) {
      // Fetch from WaveSpeed using prediction ID
      const pollUrl = `${WAVESPEED_BASE}/predictions/${predictionId}/result`;
      const { data } = await axios.get(pollUrl, { headers: wsHeaders() });
      const result  = data?.data;

      if (!result) throw new Error('No result from WaveSpeed');
      if (result.status !== 'completed') {
        return res.status(400).json({ error: `Prediction status is "${result.status}" — not completed yet` });
      }

      wavespeedVideoUrl = result.outputs?.[0];
      if (!wavespeedVideoUrl) throw new Error('Completed but no output URL in WaveSpeed response');
    }

    // 2. Upload to GCS
    const uploadId  = customImageId ? `custom-${customImageId}` : (tokenId || 'recovered');
    const uploaded  = await uploadSceneToGCS(wavespeedVideoUrl, uploadId, vibeId);

    // 3. Create PamsScene record
    const scene = await PamsScene.create({
      userId: userId.toString(),  // stored as String to match schema
      tokenId:      tokenId    || 0,
      customImageId: customImageId || null,
      nftImageUrl,
      vibeId,
      videoUrl:     uploaded.url,
      cloudinaryId: uploaded.objectPath,
      duration:     '5s',
      status:       'completed',
      recoveredFrom: predictionId,
    });

    console.log(`[admin/recover] Recovered prediction ${predictionId} → scene ${scene._id}`);
    return res.status(201).json({ scene, message: 'Scene recovered successfully' });
  } catch (err) {
    console.error('[admin/recover]', err.message);
    return res.status(500).json({ error: err.message });
  }
});


// ─── POST /api/pams-studio/stitch ─────────────────────────────────────────────

router.post('/stitch', stitchLimiter, async (req, res) => {
  const userId = req.user?.userId;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  const {
    sceneIds, trackId, audioUrl, bpm, transitions,
    clipId           = null,
    lyricStyle       = 'none',
    lyricPosition    = 'bottom',
    introSceneId     = null,   // optional — admin-curated intro clip
    introTransition  = 'fade', // transition from intro → act 1
    outroSceneId     = null,   // optional — admin-curated outro clip
    outroTransition  = 'fade', // transition from act 3 → outro
  } = req.body;

  console.log('[pams/stitch] req.body lyricStyle=', lyricStyle, 'lyricPosition=', lyricPosition);
  const resolvedLyricStyle    = (lyricStyle === 'none' || VALID_LYRIC_STYLES.includes(lyricStyle))
    ? lyricStyle : 'none';
  const resolvedLyricPosition = VALID_LYRIC_POSITIONS.includes(lyricPosition) ? lyricPosition : 'bottom';
  console.log('[pams/stitch] resolved → style=', resolvedLyricStyle, 'position=', resolvedLyricPosition);

  if (!Array.isArray(sceneIds) || sceneIds.length !== 3) {
    return res.status(400).json({ error: 'sceneIds must be an array of exactly 3 IDs' });
  }
  // Intro scenes and regular scenes are completely separate — enforce at API level
  if (introSceneId && sceneIds.includes(introSceneId)) {
    return res.status(400).json({ error: 'Intro scenes cannot be used as regular scene slots' });
  }
  if (outroSceneId && sceneIds.includes(outroSceneId)) {
    return res.status(400).json({ error: 'Outro scenes cannot be used as regular scene slots' });
  }
  if (introSceneId && outroSceneId && introSceneId === outroSceneId) {
    return res.status(400).json({ error: 'The same scene cannot be used as both intro and outro' });
  }

  if (!audioUrl) {
    return res.status(400).json({ error: 'audioUrl is required' });
  }

  const resolvedTransitions = (
    Array.isArray(transitions) && transitions.length === sceneIds.length - 1
      ? transitions
      : Array(sceneIds.length - 1).fill('fade')
  ).map(t => VALID_TRANSITIONS.includes(t) ? t : 'fade');

  const scenes = await PamsScene.find({ _id: { $in: sceneIds }, userId }).lean();
  if (scenes.length !== 3) {
    return res.status(403).json({ error: 'One or more scenes not found or not owned by you' });
  }

  const sceneMap     = new Map(scenes.map(s => [s._id.toString(), s]));
  const orderedScenes = sceneIds.map(id => sceneMap.get(id.toString()));
  if (orderedScenes.some(s => !s)) {
    return res.status(403).json({ error: 'Scene order mismatch' });
  }

  const finalVideo = await PamsFinalVideo.create({
    userId,
    sceneIds,
    trackId:       trackId || null,
    clipId:        clipId  || null,
    lyricStyle:    resolvedLyricStyle,
    lyricPosition: resolvedLyricPosition,
    status:        'processing',
  });

  res.status(202).json({
    success:      true,
    finalVideoId: finalVideo._id.toString(),
    message:      'Processing started. Poll GET /api/pams-studio/final/:id for status.',
  });

  processFinalVideo(
    finalVideo._id, orderedScenes, audioUrl,
    bpm || DEFAULT_BPM, userId, resolvedTransitions,
    resolvedLyricStyle, resolvedLyricPosition, trackId, clipId,
    introSceneId, introTransition,
    outroSceneId, outroTransition
  ).catch(err => console.error(`[pams/stitch] Unhandled:`, err.message));
});

// ─── GET /api/pams-studio/scenes ─────────────────────────────────────────────

router.get('/scenes', scenesLimiter, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const scenes = await PamsScene.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({
      success: true,
      scenes: scenes.map(s => ({
        id:         s._id.toString(),
        tokenId:    s.tokenId,
        nftImageUrl: s.nftImageUrl,
        vibeId:     s.vibeId,
        videoUrl:   s.videoUrl,
        duration:   s.duration,
        status:     s.status,
        createdAt:  s.createdAt,
      })),
    });
  } catch (err) {
    console.error('[pams/scenes GET] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/pams-studio/scenes/:id ──────────────────────────────────────

router.delete('/scenes/:id', scenesLimiter, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const scene = await PamsScene.findOne({ _id: req.params.id, userId }).lean();
    if (!scene) return res.status(404).json({ error: 'Scene not found' });

    if (scene.cloudinaryId) {
      await deleteObject(scene.cloudinaryId)
        .catch(e => console.warn(`[pams/scenes DELETE] GCS cleanup failed: ${e.message}`));
    }

    await PamsScene.deleteOne({ _id: req.params.id, userId });

    return res.json({ success: true });
  } catch (err) {
    console.error('[pams/scenes DELETE] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/pams-studio/finals ─────────────────────────────────────────────

router.get('/finals', finalVideoLimiter, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const finals = await PamsFinalVideo.find({ userId, status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.json({
      success: true,
      finals: finals.map(f => ({
        id:        f._id.toString(),
        videoUrl:  f.videoUrl,
        sceneIds:  f.sceneIds,
        trackId:   f.trackId,
        createdAt: f.createdAt,
      })),
    });
  } catch (err) {
    console.error('[pams/finals GET] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── DELETE /api/pams-studio/finals/:id ──────────────────────────────────────

router.delete('/finals/:id', finalVideoLimiter, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const finalVideo = await PamsFinalVideo.findOne({ _id: req.params.id, userId }).lean();
    if (!finalVideo) return res.status(404).json({ error: 'Not found' });

    if (finalVideo.cloudinaryId) {
      await deleteObject(finalVideo.cloudinaryId)
        .catch(e => console.warn(`[pams/finals DELETE] GCS cleanup failed: ${e.message}`));
    }

    await PamsFinalVideo.deleteOne({ _id: req.params.id, userId });

    return res.json({ success: true });
  } catch (err) {
    console.error('[pams/finals DELETE] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/pams-studio/final/:id ──────────────────────────────────────────

router.get('/final/:id', finalVideoLimiter, async (req, res) => {
  try {
    const userId     = req.user?.userId;
    const finalVideo = await PamsFinalVideo.findById(req.params.id).lean();

    if (!finalVideo) return res.status(404).json({ error: 'Not found' });
    if (finalVideo.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    return res.json({
      success:  true,
      id:       finalVideo._id.toString(),
      status:   finalVideo.status,
      videoUrl: finalVideo.videoUrl || null,
      error:    finalVideo.errorMessage || null,
    });
  } catch (err) {
    console.error('[pams/final GET] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
