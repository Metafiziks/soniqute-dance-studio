// models/RegistrationRequest.js
const mongoose = require('mongoose');

const registrationRequestSchema = new mongoose.Schema({
  twitterHandle: {
    type: String,
    required: true,
    trim: true,
    maxlength: 15,
    validate: {
      validator: function(v) {
        // Remove @ if present and validate Twitter handle format
        const cleanHandle = v.replace(/^@/, '');
        return /^[a-zA-Z0-9_]{1,15}$/.test(cleanHandle);
      },
      message: 'Invalid Twitter handle format'
    }
  },
  requestedAt: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'code_sent'],
    default: 'pending'
  },
  registrationCode: {
    type: String,
    sparse: true, // Only unique when value exists
    default: null
  },
  codeGeneratedAt: {
    type: Date,
    default: null
  },
  codeSentAt: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    maxlength: 500,
    default: ''
  },
  // Track if user has registered successfully
  userRegistered: {
    type: Boolean,
    default: false
  },
  registeredAt: {
    type: Date,
    default: null
  },
  // Additional metadata
  userAgent: String,
  referrer: String,
}, {
  timestamps: true, // Adds createdAt and updatedAt
  indexes: [
    { twitterHandle: 1 },
    { status: 1 },
    { ipAddress: 1 },
    { requestedAt: -1 }
  ]
});

// Prevent duplicate requests from same handle within 24 hours
registrationRequestSchema.index(
  { twitterHandle: 1, requestedAt: 1 }, 
  { 
    unique: true,
    partialFilterExpression: {
      requestedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    }
  }
);

// Static method to generate registration code
registrationRequestSchema.statics.generateCode = function() {
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ123456789'; // Exclude O, 0 for clarity
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Instance method to approve and generate code
registrationRequestSchema.methods.approve = async function() {
  if (this.status === 'approved') {
    throw new Error('Request already approved');
  }
  
  this.status = 'approved';
  this.registrationCode = this.constructor.generateCode();
  this.codeGeneratedAt = new Date();
  
  return await this.save();
};

// Instance method to mark code as sent
registrationRequestSchema.methods.markCodeSent = async function() {
  if (this.status !== 'approved') {
    throw new Error('Request must be approved before marking code as sent');
  }
  
  this.status = 'code_sent';
  this.codeSentAt = new Date();
  
  return await this.save();
};

// Instance method to mark user as registered
registrationRequestSchema.methods.markUserRegistered = async function() {
  this.userRegistered = true;
  this.registeredAt = new Date();
  
  return await this.save();
};

module.exports = mongoose.model('RegistrationRequest', registrationRequestSchema);