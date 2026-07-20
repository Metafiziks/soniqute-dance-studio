const express    = require("express");
const rateLimit  = require("express-rate-limit");
const router     = express.Router();
const { generateSignedUploadUrl, deleteObject, publicUrl } = require("../lib/gcs");
const Track      = require("../models/Track");
const { verifyToken, verifyTokenAndAdmin } = require("../middleware/verifyToken");

const tracksReadLimiter = rateLimit({
  windowMs: 60 * 1000, max: 100,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true, legacyHeaders: false,
});

const tracksWriteLimiter = rateLimit({
  windowMs: 60 * 1000, max: 30,
  message: { error: "Too many requests, please try again later." },
  standardHeaders: true, legacyHeaders: false,
});

// ─── GET /api/tracks ──────────────────────────────────────────────────────────

router.get("/", tracksReadLimiter, async (req, res) => {
  try {
    const tracks = await Track.find({ isActive: true })
      .sort({ sortOrder: 1, createdAt: 1 })
      .lean();
    return res.json({ success: true, tracks });
  } catch (err) {
    console.error("[tracks GET] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/tracks/upload-signature — admin only ──────────────────────────
// Returns a GCS signed PUT URL for direct browser upload.
// type: "image" (album art) or "audio" (MP3)
// Frontend: PUT uploadUrl with file body + Content-Type header.

router.post("/upload-signature", tracksWriteLimiter, verifyToken, verifyTokenAndAdmin, async (req, res) => {
  try {
    const { type, contentType, filename } = req.body;

    if (!["image", "audio"].includes(type)) {
      return res.status(400).json({ error: "type must be 'image' or 'audio'" });
    }

    const resolvedContentType = contentType ||
      (type === "image" ? "image/jpeg" : "audio/mpeg");
    const folder = type === "image" ? "qutie-tracks/art" : "qutie-tracks/audio";
    const ext = filename
      ? filename.split(".").pop().toLowerCase()
      : resolvedContentType.split("/")[1];
    const objectPath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const uploadUrl = await generateSignedUploadUrl(objectPath, resolvedContentType);

    return res.json({ uploadUrl, objectPath, publicUrl: publicUrl(objectPath) });
  } catch (err) {
    console.error("[tracks upload-signature] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/tracks ─────────────────────────────────────────────────────────

router.post("/", tracksWriteLimiter, verifyToken, verifyTokenAndAdmin, async (req, res) => {
  try {
    const { title, artist, albumArtUrl, albumArtPublicId, bpm, sortOrder } = req.body;
    if (!title || !artist) {
      return res.status(400).json({ error: "title and artist are required" });
    }
    const track = await Track.create({
      title, artist,
      albumArtUrl:      albumArtUrl      || null,
      albumArtPublicId: albumArtPublicId || null,
      bpm:              bpm              ? Number(bpm) : null,
      sortOrder:        sortOrder        ? Number(sortOrder) : 0,
    });
    return res.status(201).json({ success: true, track });
  } catch (err) {
    console.error("[tracks POST] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/tracks/:id ────────────────────────────────────────────────────

router.patch("/:id", tracksWriteLimiter, verifyToken, verifyTokenAndAdmin, async (req, res) => {
  try {
    const { title, artist, albumArtUrl, albumArtPublicId, bpm, sortOrder, isActive } = req.body;
    const updates = {};
    if (title            !== undefined) updates.title            = title;
    if (artist           !== undefined) updates.artist           = artist;
    if (albumArtUrl      !== undefined) updates.albumArtUrl      = albumArtUrl;
    if (albumArtPublicId !== undefined) updates.albumArtPublicId = albumArtPublicId;
    if (bpm              !== undefined) updates.bpm              = bpm !== null ? Number(bpm) : null;
    if (sortOrder        !== undefined) updates.sortOrder        = Number(sortOrder);
    if (isActive         !== undefined) updates.isActive         = isActive;

    const track = await Track.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true });
    if (!track) return res.status(404).json({ error: "Track not found" });
    return res.json({ success: true, track });
  } catch (err) {
    console.error("[tracks PATCH] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/tracks/:id ───────────────────────────────────────────────────

router.delete("/:id", tracksWriteLimiter, verifyToken, verifyTokenAndAdmin, async (req, res) => {
  try {
    const track = await Track.findByIdAndDelete(req.params.id);
    if (!track) return res.status(404).json({ error: "Track not found" });

    const deletions = [];
    if (track.albumArtPublicId) {
      deletions.push(
        deleteObject(track.albumArtPublicId)
          .catch(e => console.warn(`Album art GCS delete failed: ${e.message}`))
      );
    }
    for (const clip of track.clips) {
      if (clip.publicId) {
        deletions.push(
          deleteObject(clip.publicId)
            .catch(e => console.warn(`Clip GCS delete failed: ${e.message}`))
        );
      }
    }
    await Promise.all(deletions);

    return res.json({ success: true });
  } catch (err) {
    console.error("[tracks DELETE] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/tracks/:id/clips ───────────────────────────────────────────────

router.post("/:id/clips", tracksWriteLimiter, verifyToken, verifyTokenAndAdmin, async (req, res) => {
  try {
    const { audioUrl, publicId, label, duration, sortOrder } = req.body;
    if (!audioUrl || !publicId) {
      return res.status(400).json({ error: "audioUrl and publicId are required" });
    }
    const track = await Track.findByIdAndUpdate(
      req.params.id,
      { $push: { clips: { audioUrl, publicId, label: label || "", duration: duration || null, sortOrder: Number(sortOrder) || 0 } } },
      { new: true }
    );
    if (!track) return res.status(404).json({ error: "Track not found" });
    return res.status(201).json({ success: true, track });
  } catch (err) {
    console.error("[tracks/clips POST] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/tracks/:id/clips/:clipId ─────────────────────────────────────

router.patch("/:id/clips/:clipId", tracksWriteLimiter, verifyToken, verifyTokenAndAdmin, async (req, res) => {
  try {
    const { label, sortOrder, duration } = req.body;
    const track = await Track.findOneAndUpdate(
      { _id: req.params.id, "clips._id": req.params.clipId },
      {
        $set: {
          ...(label     !== undefined && { "clips.$.label":     label }),
          ...(sortOrder !== undefined && { "clips.$.sortOrder": Number(sortOrder) }),
          ...(duration  !== undefined && { "clips.$.duration":  duration }),
        },
      },
      { new: true }
    );
    if (!track) return res.status(404).json({ error: "Track or clip not found" });
    return res.json({ success: true, track });
  } catch (err) {
    console.error("[tracks/clips PATCH] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/tracks/:id/clips/:clipId ────────────────────────────────────

router.delete("/:id/clips/:clipId", tracksWriteLimiter, verifyToken, verifyTokenAndAdmin, async (req, res) => {
  try {
    const track = await Track.findById(req.params.id);
    if (!track) return res.status(404).json({ error: "Track not found" });

    const clip = track.clips.id(req.params.clipId);
    if (!clip) return res.status(404).json({ error: "Clip not found" });

    if (clip.publicId) {
      await deleteObject(clip.publicId)
        .catch(e => console.warn(`Clip GCS delete failed: ${e.message}`));
    }

    track.clips.pull({ _id: req.params.clipId });
    await track.save();

    return res.json({ success: true, track });
  } catch (err) {
    console.error("[tracks/clips DELETE] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── LRC parser ───────────────────────────────────────────────────────────────

function parseLrc(lrcString) {
  const timeRe = /\[(\d{1,2}):(\d{2})\.(\d{2,3})\]/g;
  const entries = [];
  for (const rawLine of lrcString.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    const matches = [...line.matchAll(timeRe)];
    if (!matches.length) continue;
    const text = line.replace(timeRe, '').trim();
    if (!text) continue;
    for (const m of matches) {
      const ms    = parseInt(m[3].padEnd(3, '0'), 10);
      const start = parseInt(m[1], 10) * 60 + parseInt(m[2], 10) + ms / 1000;
      entries.push({ start, text });
    }
  }
  entries.sort((a, b) => a.start - b.start);
  return entries.map((e, i) => ({
    start: parseFloat(e.start.toFixed(3)),
    end:   parseFloat(
      (i < entries.length - 1
        ? Math.max(e.start + 0.5, entries[i + 1].start - 0.05)
        : e.start + 2.5
      ).toFixed(3)
    ),
    text: e.text,
  }));
}

// ─── PUT /api/tracks/:id/clips/:clipId/lyrics ─────────────────────────────────

router.put('/:id/clips/:clipId/lyrics', tracksWriteLimiter, verifyToken, verifyTokenAndAdmin, async (req, res) => {
  try {
    const { lrc, lyrics } = req.body;
    let parsed;
    if (lrc && typeof lrc === 'string') {
      parsed = parseLrc(lrc);
    } else if (Array.isArray(lyrics)) {
      parsed = lyrics;
    } else {
      return res.status(400).json({ error: "Provide 'lrc' string or 'lyrics' array" });
    }
    for (const line of parsed) {
      if (typeof line.start !== 'number' || typeof line.end !== 'number' || !line.text?.trim()) {
        return res.status(400).json({ error: 'Each lyric must have: start (number), end (number), text (string)' });
      }
      if (line.end <= line.start) {
        return res.status(400).json({ error: `Lyric "${line.text}" has end <= start` });
      }
    }
    const track = await Track.findOneAndUpdate(
      { _id: req.params.id, 'clips._id': req.params.clipId },
      { $set: { 'clips.$.lyrics': parsed } },
      { new: true }
    );
    if (!track) return res.status(404).json({ error: 'Track or clip not found' });
    return res.json({ success: true, track });
  } catch (err) {
    console.error('[tracks/lyrics PUT] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/tracks/:id/clips/:clipId/lyrics ────────────────────────────────

router.get('/:id/clips/:clipId/lyrics', tracksReadLimiter, async (req, res) => {
  try {
    const track = await Track.findById(req.params.id).lean();
    if (!track) return res.status(404).json({ error: 'Track not found' });
    const clip = track.clips?.find(c => c._id.toString() === req.params.clipId);
    if (!clip) return res.status(404).json({ error: 'Clip not found' });
    return res.json({ success: true, lyrics: clip.lyrics || [] });
  } catch (err) {
    console.error('[tracks/lyrics GET] error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
