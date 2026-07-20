const mongoose = require('mongoose');

const UserActionSchema = new mongoose.Schema(
  {
    // Which platform produced this action
    platform: { type: String, enum: ['x', 'tiktok', 'app'], default: 'x', index: true },
    // Who acted
    userId: { type: String, index: true }, // actor's User _id (string in this codebase)

    // What they acted on
    shareItemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MemeshareScore',
      index: true,
    },
    memeId: { type: String, index: true }, // uploads & shares reference a Meme

    // How they acted
    actionType: {
      type: String,
      enum: [
        'upload',
        'share',
        'reply',
        'retweet',
        'like',
        'pump',
        'dump',
        'referral_bonus'
      ],
      required: true
    },

  // Optional NFT tracking (for transparency/debugging)
  nftMultiplier: { type: Number, default: 1 },

    // Idempotency (singleton keys for actions where we want only one row)
    // NOTE: we DO set a key for 'share' in discovery/backfill so it’s safe to be unique+sparse
    actionKey: { type: String, unique: true, sparse: true },

    // 🔢 Points minted for this action (THIS WAS MISSING)
    deltaApplied: { type: Number, default: 0, index: true },

    // v4 reply-scoring details (kept as-is)
    replyQuality:  { type: Number, default: 0 },
    timeWeight:    { type: Number, default: 1 },
    pointsApplied: { type: Number, default: 0 },

    // convenience flags
    hasPump: { type: Boolean, default: false },
    hasDump: { type: Boolean, default: false },

    createdAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

// Fast timeline lookups per user
UserActionSchema.index({ userId: 1, createdAt: -1 });
UserActionSchema.index({ actionKey: 1 }, { unique: true, sparse: true });

// Build a deterministic actionKey for actions where we want singletons
UserActionSchema.pre('validate', function (next) {
  if (!this.actionKey) {
    if (this.actionType === 'upload' && this.memeId) {
      // one upload entry per user per meme
      this.actionKey = `${this.userId}:${this.memeId}:upload`;
    } else if (this.shareItemId && this.actionType !== 'share') {
      // interactions against a specific share item (not applied to 'share')
      this.actionKey = `${this.userId}:${this.shareItemId}:${this.actionType}`;
    } else if (this.memeId && this.actionType !== 'share') {
      // fallback singleton for non-share actions tied to a meme
      this.actionKey = `${this.userId}:${this.memeId}:${this.actionType}`;
    }
  }
  next();
});

module.exports = mongoose.model('UserAction', UserActionSchema);
