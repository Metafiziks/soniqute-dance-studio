const mongoose = require("mongoose");

const characterEntrySchema = new mongoose.Schema({
  characterId:  { type: String, required: true },
  assignedAt:   { type: Date, default: Date.now },
  unlockedAt:   { type: Date, default: Date.now },
  isActive:     { type: Boolean, default: false },
});

const studioProfileSchema = new mongoose.Schema({
  userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
  characters:  { type: [characterEntrySchema], default: [] },
  credits:     { type: Number, default: 0 },
  soniqPoints: { type: Number, default: 0 },
  createdAt:   { type: Date, default: Date.now },
  updatedAt:   { type: Date, default: Date.now },
});

studioProfileSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

studioProfileSchema.index({ userId: 1 }, { unique: true });

module.exports = mongoose.model("StudioProfile", studioProfileSchema);
