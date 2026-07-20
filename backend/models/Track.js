const mongoose = require("mongoose");

// Lyric line — timestamps are seconds relative to the clip's start
const lyricSchema = new mongoose.Schema({
  start: { type: Number, required: true },
  end:   { type: Number, required: true },
  text:  { type: String, required: true, trim: true },
}, { _id: false });

const clipSchema = new mongoose.Schema({
  label:     { type: String, default: "" },
  audioUrl:  { type: String, required: true },
  publicId:  { type: String, required: true },
  duration:  { type: String, default: null },
  sortOrder: { type: Number, default: 0 },
  lyrics:    { type: [lyricSchema], default: [] },
}, { _id: true });

const trackSchema = new mongoose.Schema(
  {
    title:            { type: String, required: true },
    artist:           { type: String, required: true },
    albumArtUrl:      { type: String, default: null },
    albumArtPublicId: { type: String, default: null },
    clips:            { type: [clipSchema], default: [] },
    bpm:              { type: Number, default: null },
    sortOrder:        { type: Number, default: 0 },
    isActive:         { type: Boolean, default: true },
  },
  { timestamps: true }
);

trackSchema.index({ isActive: 1, sortOrder: 1 });

module.exports = mongoose.models.Track || mongoose.model("Track", trackSchema);
