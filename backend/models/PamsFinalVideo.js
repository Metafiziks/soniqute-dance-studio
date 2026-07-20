const mongoose = require('mongoose');

const PamsFinalVideoSchema = new mongoose.Schema({
  userId:        { type: String, required: true, index: true },
  videoUrl:      { type: String, default: null },
  cloudinaryId:  { type: String },
  sceneIds:      [{ type: mongoose.Schema.Types.ObjectId, ref: 'PamsScene' }],
  trackId:       { type: String, default: null },
  clipId:        { type: String, default: null },
  lyricStyle:    { type: String, default: 'none' },
  lyricPosition: { type: String, enum: ['top', 'middle', 'bottom'], default: 'bottom' },
  status:        { type: String, default: 'processing' },
  errorMessage:  { type: String, default: null },
  createdAt:     { type: Date, default: Date.now },
});

module.exports = mongoose.models.PamsFinalVideo || mongoose.model('PamsFinalVideo', PamsFinalVideoSchema);
