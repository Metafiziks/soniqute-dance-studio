const QutieChum = require("../models/QutieChum");

// ─── Fisher-Yates shuffle (in-place) ─────────────────────────────────────────
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Get a single random character from the starter pool ─────────────────────
async function getRandomCharacter() {
  const eligible = await QutieChum.find({
    isActive:      true,
    isStarterPool: true,
    imageUrl:      { $ne: null },
  }).lean();

  if (eligible.length === 0) {
    throw new Error(
      "No eligible characters available. Upload images and mark characters as starter pool in the admin panel."
    );
  }

  const shuffled = shuffleArray([...eligible]);
  return shuffled[0];
}

// ─── Get `count` unique random characters from the starter pool ───────────────
async function getRandomCharacters(count = 3) {
  const eligible = await QutieChum.find({
    isActive:      true,
    isStarterPool: true,
    imageUrl:      { $ne: null },
  }).lean();

  if (eligible.length < count) {
    throw new Error(
      `Not enough eligible characters. Need ${count}, found ${eligible.length}. ` +
      `Upload more images and mark characters as starter pool in the admin panel.`
    );
  }

  // Fisher-Yates shuffle, take first `count`
  const shuffled = shuffleArray([...eligible]);
  return shuffled.slice(0, count);
}

// ─── Get character by ID ──────────────────────────────────────────────────────
async function getCharacterById(characterId) {
  return QutieChum.findOne({ characterId }).lean();
}

// ─── Get all active characters with images ────────────────────────────────────
async function getActiveCharacters() {
  return QutieChum.find({
    isActive: true,
    imageUrl: { $ne: null },
  }).sort({ tierRank: 1, name: 1 }).lean();
}

module.exports = {
  shuffleArray,
  getRandomCharacter,
  getRandomCharacters,
  getCharacterById,
  getActiveCharacters,
};
