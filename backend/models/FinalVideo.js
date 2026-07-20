const mongoose = require("mongoose");

const finalVideoSchema = new mongoose.Schema(
  {
    userId:      { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    characterId: { type: String, required: true },
    sceneIds:    [{ type: mongoose.Schema.Types.ObjectId, ref: "Scene" }],
    trackId:     { type: String, required: true },
    clipId:      { type: String, required: true },
    audioUrl:    { type: String, required: true },
    bpm:              { type: Number, default: null },
    videoUrl:         { type: String, default: null },
    cloudinaryPublicId: { type: String, default: null },
    status: {
      type:    String,
      enum:    ["processing", "completed", "failed"],
      default: "processing",
    },
    errorMessage: { type: String, default: null },
    skipLipsync:  { type: Boolean, default: false },
    lyricStyle:   { type: String, default: "none" },
    lyricPosition: {
      type:    String,
      enum:    ["top", "middle", "bottom"],
      default: "bottom",
    },
  },
  { timestamps: true }
);

finalVideoSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.models.FinalVideo ||
  mongoose.model("FinalVideo", finalVideoSchema);
