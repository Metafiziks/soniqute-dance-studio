const mongoose = require('mongoose');

const registrationCodeSchema = new mongoose.Schema({
  codeHash: { type: String, required: true },
  codeText: { type: String, index: true }, // Add this field (optional for legacy codes)
  usesRemaining: { type: Number, default: 1 },
  status: { type: String, enum: ['active', 'disabled', 'exhausted'], default: 'active' },
  expiresAt: Date,
  note: String,
  createdById: String,
  createdAt: { type: Date, default: Date.now }
});

// Add compound index for faster queries
registrationCodeSchema.index({ codeText: 1, status: 1, usesRemaining: 1 });
registrationCodeSchema.index({ status: 1, usesRemaining: 1, codeText: 1 });

module.exports = mongoose.model('RegistrationCode', registrationCodeSchema); 