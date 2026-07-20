// models/EmailSignup.js
const mongoose = require('mongoose');

const emailSignupSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
  },
  captchaToken: {
    type: String,
    required: true
  },
  subscribedAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  source: {
    type: String,
    default: 'hero_signup'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('EmailSignup', emailSignupSchema);