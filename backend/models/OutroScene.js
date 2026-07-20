const mongoose = require('mongoose');
const { Schema } = mongoose;

// Outro scenes are curated/uploaded by admins only.
// They have their own embedded audio and text — the music track
// and lyric overlays selected in the Edit Suite do NOT play during outros.
const outroSceneSchema = new Schema(
  {
    title:        { type: String, required: true, trim: true },
    videoUrl:     { type: String, required: true },   // Cloudinary URL
    publicId:     { type: String, required: true },   // Cloudinary public_id
    thumbnailUrl: { type: String, default: null },    // optional poster frame
    duration:     { type: Number, required: true },   // seconds (expected 5–6s)
    sortOrder:    { type: Number, default: 0 },
    isActive:     { type: Boolean, default: true },
    uploadedBy:   { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.models.OutroScene
  || mongoose.model('OutroScene', outroSceneSchema);
