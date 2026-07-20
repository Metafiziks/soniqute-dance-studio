const mongoose = require("mongoose");

const qutieChumSchema = new mongoose.Schema(
  {
    // ─── Identity ─────────────────────────────────────────────────────────────
    characterId: {
      type: String,
      required: true,
      unique: true,
      // kebab-case slug e.g. "ranger-rae", "pancake-stack"
    },
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },

    // ─── Squad / Rarity ───────────────────────────────────────────────────────
    squad: {
      type: String,
      enum: [
        "Base Camp",
        "Bubble Brigade",
        "Chaos Crew",
        "Sharp Shooters",
        "Legendary Misfits",
      ],
      required: true,
    },
    // Numeric rank for sorting (1 = Legendary, 5 = Common)
    tierRank: {
      type: Number,
      enum: [1, 2, 3, 4, 5],
      required: true,
    },

    // ─── Cloudinary ───────────────────────────────────────────────────────────
    cloudinaryPublicId: {
      type: String,
      default: null,
    },
    imageUrl: {
      // Stored URL — for private assets this is regenerated on request
      type: String,
      default: null,
    },
    // Whether asset is uploaded as private (requires signed URL) or public
    isPrivate: {
      type: Boolean,
      default: true,
    },

    // ─── Animation ────────────────────────────────────────────────────────────
    // Which dance vibes have been generated for this character
    availableVibes: {
      type: [String],
      default: [],
    },
    // Whether this character is ready for the Dance Studio pipeline
    animationReady: {
      type: Boolean,
      default: false,
    },

    // ─── Supply ───────────────────────────────────────────────────────────────
    totalSupply: {
      type: Number,
      default: 0,
    },
    mintedCount: {
      type: Number,
      default: 0,
    },

    // ─── Visibility ───────────────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
      // Set to false to remove from random assignment pool
    },
    isStarterPool: {
      type: Boolean,
      default: false,
      // true = eligible for initial random assignment to new users
    },
  },
  { timestamps: true }
);

// Indexes
qutieChumSchema.index({ characterId: 1 }, { unique: true });
qutieChumSchema.index({ squad: 1 });
qutieChumSchema.index({ isActive: 1, isStarterPool: 1 });
qutieChumSchema.index({ tierRank: 1 });

module.exports = mongoose.models.QutieChum ||
  mongoose.model("QutieChum", qutieChumSchema);
