const mongoose = require('mongoose');

const PamsSceneSchema = new mongoose.Schema({
  userId:       { type: String, required: true, index: true },
  tokenId:      { type: Number, required: true },
  nftImageUrl:  { type: String, required: true },
  vibeId:       { type: String, required: true },
  videoUrl:     { type: String },
  cloudinaryId: { type: String },
  duration:     { type: String, default: '5s' },
  status:       { type: String, default: 'pending' },
  createdAt:    { type: Date, default: Date.now },
});

module.exports = mongoose.models.PamsScene || mongoose.model('PamsScene', PamsSceneSchema);
