const mongoose = require('mongoose');
const { Schema } = mongoose;

// Admin-uploaded square character images that appear alongside NFTs in the
// PaMs Studio scene library. Up to 25 active images at a time.
// These images can be used as source material for AI video generation
// (same Seedance pipeline as NFT images).
const customCharacterImageSchema = new Schema(
  {
    title:      { type: String, default: '', trim: true },
    imageUrl:   { type: String, required: true },
    publicId:   { type: String, required: true },   // Cloudinary public_id
    sortOrder:  { type: Number, default: 0 },        // controls grid position
    isActive:   { type: Boolean, default: true },
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

// Index for efficient ordered fetching
customCharacterImageSchema.index({ isActive: 1, sortOrder: 1, createdAt: 1 });

module.exports = mongoose.models.CustomCharacterImage
  || mongoose.model('CustomCharacterImage', customCharacterImageSchema);
