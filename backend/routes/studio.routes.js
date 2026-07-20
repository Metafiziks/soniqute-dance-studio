const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const StudioProfile = require("../models/StudioProfile");
const QutieChum = require("../models/QutieChum");
const Scene = require("../models/Scene");
const FinalVideo = require("../models/FinalVideo");
const { getRandomCharacter, getRandomCharacters, getCharacterById, shuffleArray } = require("../lib/characters");
const { generateSignedReadUrl, deleteObject } = require("../lib/gcs");
const { verifyTokenAndAdmin } = require("../middleware/verifyToken");

// Admin users have unlimited credits for testing
function isAdmin(req) {
  return req.user?.isAdmin === true;
}

// Returns true if the user can afford `cost` credits (admins always can)
async function canAfford(userId, cost, req) {
  if (isAdmin(req)) return true;
  const profile = await StudioProfile.findOne({ userId });
  return profile && profile.credits >= cost;
}

// Deducts credits — no-op for admins
async function deductCredits(userId, cost, req) {
  if (isAdmin(req)) return;
  await StudioProfile.updateOne(
    { userId },
    { $inc: { credits: -cost } }
  );
}

// ─── Middleware: verify internal shared secret ────────────────────────────────
function verifyInternalSecret(req, res, next) {
  const secret = req.headers["x-internal-secret"];
  if (!secret || secret !== process.env.NEXTAUTH_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  return next();
}

// ─── POST /api/studio/assign-character ───────────────────────────────────────
// Called server-to-server from Google auth callback for new users.
// Protected by shared secret — not a user JWT.

router.post("/assign-character", verifyInternalSecret, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "userId is required" });

    const existing = await StudioProfile.findOne({ userId });
    if (existing) return res.status(200).json({ message: "Character already assigned" });

    // Assign 3 unique random characters (only characters that have images uploaded)
    const assignedCharacters = await getRandomCharacters(3);

    await StudioProfile.create({
      userId,
      characters: assignedCharacters.map((character, index) => ({
        characterId: character.characterId,
        assignedAt:  new Date(),
        unlockedAt:  new Date(),
        isActive:    index === 0,
      })),
      credits: 0,
      soniqPoints: 0,
    });

    return res.status(201).json({ message: "Character assigned", characterId: assignedCharacters[0].characterId });
  } catch (err) {
    console.error("assign-character error:", err);
    return res.status(500).json({ error: err.message || "Internal server error" });
  }
});

// ─── GET /api/studio/character ────────────────────────────────────────────────
// Returns the user's active character with a signed Cloudinary image URL.

router.get("/character", async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    let profile = await StudioProfile.findOne({ userId });

    if (!profile) {
      const character = await getRandomCharacter();
      profile = await StudioProfile.create({
        userId,
        characters: [{ characterId: character.characterId, assignedAt: new Date(), unlockedAt: new Date(), isActive: true }],
        credits: 0,
        soniqPoints: 0,
      });
      const signedImageUrl = character.cloudinaryPublicId
        ? await generateSignedReadUrl(character.cloudinaryPublicId)
        : character.imageUrl;
      return res.status(200).json({
        character: { ...character, imageUrl: signedImageUrl },
        credits: 0, soniqPoints: 0, totalCharacters: 1,
      });
    }

    const activeEntry = profile.characters.find((c) => c.isActive);
    if (!activeEntry) return res.status(404).json({ error: "No active character found" });

    const character = await getCharacterById(activeEntry.characterId);
    if (!character) return res.status(404).json({ error: "Character not found" });

    const imageUrl = character.cloudinaryPublicId
      ? await generateSignedReadUrl(character.cloudinaryPublicId)
      : character.imageUrl;

    return res.status(200).json({
      character: { ...character, imageUrl },
      credits:         profile.credits      ?? 0,
      soniqPoints:     profile.soniqPoints  ?? 0,
      totalCharacters: profile.characters.length,
    });
  } catch (err) {
    console.error("get-character error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/studio/characters ───────────────────────────────────────────────
// Returns ALL of the user's unlocked characters with signed image URLs.

router.get("/characters", async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const profile = await StudioProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    const characters = await Promise.all(
      profile.characters.map(async (entry) => {
        const character = await getCharacterById(entry.characterId);
        if (!character || !character.imageUrl) return null; // skip if no image
        const imageUrl = character.cloudinaryPublicId
          ? await generateSignedReadUrl(character.cloudinaryPublicId)
          : character.imageUrl;
        return {
          ...character,
          imageUrl,
          isActive:   entry.isActive,
          unlockedAt: entry.unlockedAt,
        };
      })
    );

    return res.status(200).json({
      characters: characters.filter(Boolean),
      credits:     profile.credits     ?? 0,
      soniqPoints: profile.soniqPoints ?? 0,
    });
  } catch (err) {
    console.error("get-characters error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── PATCH /api/studio/active-character ──────────────────────────────────────
// Switch which character is currently active in the studio.

router.patch("/active-character", async (req, res) => {
  try {
    const userId      = req.user?.userId;
    const { characterId } = req.body;

    if (!userId)      return res.status(401).json({ error: "Unauthorized" });
    if (!characterId) return res.status(400).json({ error: "characterId is required" });

    const profile = await StudioProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    // Verify user owns this character
    const owns = profile.characters.some(c => c.characterId === characterId);
    if (!owns) return res.status(403).json({ error: "You don't own this character" });

    // Set all inactive, then activate the chosen one
    profile.characters.forEach(c => { c.isActive = c.characterId === characterId; });
    await profile.save();

    return res.status(200).json({ success: true, activeCharacter: characterId });
  } catch (err) {
    console.error("active-character error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── POST /api/studio/admin/backfill-characters ───────────────────────────────
// One-time migration: assigns 3 characters to any StudioProfile that has fewer than 3.

router.post("/admin/backfill-characters", verifyTokenAndAdmin, async (req, res) => {
  try {
    const profiles = await StudioProfile.find({ "characters.1": { $exists: false } }); // 0 or 1 character (fewer than 2)
    let updated = 0;

    for (const profile of profiles) {
      const needed = 3 - profile.characters.length;
      if (needed <= 0) continue;

      const existing = profile.characters.map(c => c.characterId);
      const pool = await QutieChum.find({
        isActive:      true,
        isStarterPool: true,
        imageUrl:      { $ne: null },
        characterId:   { $nin: existing },
      }).lean();

      if (pool.length < needed) continue;

      const shuffled = shuffleArray([...pool]);
      const toAdd = shuffled.slice(0, needed);

      for (const character of toAdd) {
        profile.characters.push({
          characterId: character.characterId,
          assignedAt:  new Date(),
          unlockedAt:  new Date(),
          isActive:    false,
        });
      }

      await profile.save();
      updated++;
    }

    return res.json({ success: true, updated });
  } catch (err) {
    console.error("backfill error:", err);
    return res.status(500).json({ error: err.message });
  }
});

// Allow at most 60 scene-list requests per user per minute
const scenesLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => req.user?.userId || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// Allow at most 120 final-video poll requests per user per minute
const finalVideoLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  keyGenerator: (req) => req.user?.userId || req.ip,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again later." },
});

// ─── GET /api/studio/scenes ───────────────────────────────────────────────────
// Returns all persisted scenes for the user, optionally filtered by character.

router.get("/scenes", scenesLimiter, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const { characterId } = req.query;

    const query = { userId };
    if (characterId) query.characterId = characterId;

    const scenes = await Scene.find(query)
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    return res.json({
      success: true,
      scenes: scenes.map(s => ({
        id:          s._id.toString(),
        characterId: s.characterId,
        vibeId:      s.vibeId,
        videoUrl:    s.videoUrl,
        duration:    s.duration,
        isExtended:  s.isExtended,
        createdAt:   s.createdAt,
      })),
    });
  } catch (err) {
    console.error("[studio/scenes GET] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/studio/scenes/:id ───────────────────────────────────────────
// Deletes a scene owned by the user, including its Cloudinary asset.

router.delete("/scenes/:id", scenesLimiter, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const scene = await Scene.findOne({ _id: req.params.id, userId }).lean();
    if (!scene) return res.status(404).json({ error: "Scene not found" });

    // Delete Cloudinary asset if present
    if (scene.cloudinaryPublicId) {
      await deleteObject(scene.cloudinaryPublicId)
        .catch(e => console.warn(`[studio/scenes DELETE] GCS cleanup failed: ${e.message}`));
    }

    await Scene.deleteOne({ _id: req.params.id, userId });

    return res.json({ success: true });
  } catch (err) {
    console.error("[studio/scenes DELETE] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/studio/credits ─────────────────────────────────────────────────
// Returns the current credit balance for the authenticated user.
// Admin users always receive { credits: Infinity, isAdmin: true }.

router.get("/credits", async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    if (isAdmin(req)) {
      return res.json({ credits: Infinity, isAdmin: true });
    }

    const profile = await StudioProfile.findOne({ userId });
    if (!profile) return res.status(404).json({ error: "Profile not found" });

    return res.json({ credits: profile.credits, isAdmin: false });
  } catch (err) {
    console.error("[studio/credits] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/studio/finals ───────────────────────────────────────────────────
// Render library — returns completed renders for the user, newest first.

router.get("/finals", finalVideoLimiter, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const finals = await FinalVideo.find({ userId, status: "completed" })
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    return res.json({
      success: true,
      finals: finals.map(f => ({
        id:          f._id.toString(),
        videoUrl:    f.videoUrl,
        characterId: f.characterId,
        skipLipsync: f.skipLipsync ?? false,
        createdAt:   f.createdAt,
      })),
    });
  } catch (err) {
    console.error("[studio/finals GET] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── DELETE /api/studio/finals/:id ───────────────────────────────────────────
// Delete a final render owned by the user, including its Cloudinary asset.

router.delete("/finals/:id", finalVideoLimiter, async (req, res) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const finalVideo = await FinalVideo.findOne({ _id: req.params.id, userId }).lean();
    if (!finalVideo) return res.status(404).json({ error: "Not found" });

    // Delete Cloudinary asset if present
    if (finalVideo.cloudinaryPublicId) {
      await deleteObject(finalVideo.cloudinaryPublicId)
        .catch(e => console.warn(`[finals delete] GCS cleanup failed: ${e.message}`));
    }

    await FinalVideo.deleteOne({ _id: req.params.id, userId });

    return res.json({ success: true });
  } catch (err) {
    console.error("[studio/finals DELETE] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ─── GET /api/studio/final/:id ────────────────────────────────────────────────
// Poll the status of a final video render job.

router.get("/final/:id", finalVideoLimiter, async (req, res) => {
  try {
    const userId     = req.user?.userId;
    const finalVideo = await FinalVideo.findById(req.params.id).lean();

    if (!finalVideo) return res.status(404).json({ error: "Not found" });
    if (finalVideo.userId.toString() !== userId.toString()) {
      return res.status(403).json({ error: "Forbidden" });
    }

    return res.json({
      success:  true,
      id:       finalVideo._id.toString(),
      status:   finalVideo.status,
      videoUrl: finalVideo.videoUrl  || null,
      error:    finalVideo.errorMessage || null,
    });
  } catch (err) {
    console.error("[studio/final GET] error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
