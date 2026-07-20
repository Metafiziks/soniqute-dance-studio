const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    // ============ EXISTING FIELDS ============
    username: { type: String, required: true },
    twitterUserId: { type: String },
    profilePic: { type: String },
    tiktokUserId: { type: String, default: null, index: true },
    tiktokHandle: { type: String, default: null },
    tiktokAccessToken: { type: String, default: null, select: false },
    tiktokRefreshToken: { type: String, default: null, select: false },
    tiktokProfileData: { type: Object, default: null },
    email: { type: String, unique: true, sparse: true },
    isActive: { type: Boolean, default: true },
    isAdmin: { type: Boolean, default: false },
    referrerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    referralPoints: { type: Number, default: 0 },
referralCode: { 
  type: String, 
  unique: true, 
  sparse: true 
},
    
    // Registration & Gating
    regCodeUsed: { type: String, default: null },
    regCodeClaimedVia: { type: String, enum: ['code', 'referral'], default: null },
    hasCompletedRegGate: { type: Boolean, default: false },
    isRegistered: { type: Boolean, default: false },
    requiresChallenge: { type: Boolean, default: false },
    challengePassedAt: Date,
    isLegacyUser: { type: Boolean, default: false },
    
    score: { type: Number, default: 0 },
    twitterProfileData: { type: Object },
    
    // Trust scores
    trust: {
      pts: { type: Number, default: 0 },
      p_legit: { type: Number, default: 0 },
      farm_score: { type: Number, default: 0 },
      lastComputedAt: { type: Date, default: null }
    },
    
    // SIMPLIFIED WALLET SYSTEM: Single wallet for both PaMs and QUTIE
    walletAddress: { type: String, default: null, index: true },
    walletConnectedAt: { type: Date },
    walletLockedAt: { type: Date }, // Locked permanently when first QUTIE Zome is minted
    canSwitchWallet: { type: Boolean, default: true },
    
    // DEPRECATED - Keeping for backward compatibility during migration
    // Will be removed after data migration
    connectedWallet: {
      address: { type: String, default: null, index: true },
      connectedAt: { type: Date },
      lastSeen: { type: Date },
      chainId: { type: Number }
    },
    
    walletHistory: [{
      address: String,
      connectedAt: Date,
      disconnectedAt: Date,
      _id: false
    }],
    
    // ============ EXISTING NFT TRACKING (PaMs) ============
    currentNftCount: { type: Number, default: 0 },
    currentMultiplier: { type: Number, default: 1 },
    nftPeriods: [{
      startDate: { type: Date, required: true },
      endDate: { type: Date, default: null },
      nftCount: { type: Number, required: true },
      multiplier: { type: Number, required: true }
    }],
    lastNftCheck: { type: Date, default: null },
    lastWalletSync: { type: Date, default: null },
    
    // Discord fields
    discordId: { type: String, unique: true, sparse: true },
    discordUsername: { type: String },
    discordDiscriminator: { type: String },
    discordAvatar: { type: String },
    discordProfileData: { type: Object },
    discordRoles: {
      type: [String],
      default: [],
    },
    
    // ============ QUTIE ECOSYSTEM FIELDS ============
    qutie: {
      // Mint Status Tracking
      mintStatus: {
        type: String,
        enum: ['none', 'pending', 'confirmed', 'failed'],
        default: 'none'
      },
      
      // Pending Transaction Info
      pendingTx: {
        hash: String,
        nonce: String,
        expiry: Number,
        attemptedAt: Date
      },
      
      // Core Zome Data
      hasZome: { 
        type: Boolean, 
        default: false
      },
 zomeTokenId: { 
  type: Number, 
  sparse: true,
  validate: {
    validator: function(v) {
      return !v || (v >= 1 && v <= 21600);
    },
    message: 'Invalid Zome token ID range (must be 1-21600)'
  }
},
      zomeTier: { 
        type: Number, 
        min: 1, 
        max: 5 
      },
      zomeCity: { 
        type: Number, 
        min: 1, 
        max: 5 
      },
      faction: { 
        type: String, 
        enum: ['', 'Serengana', 'Tashinogo', 'Parsippius', 'Apollora', 'Bokonagwe'] 
      },
      
      // Wallet that minted the Zome (permanently locked)
      mintedWallet: { 
        type: String, 
        sparse: true
      },
      mintedAt: { type: Date },
      confirmedAt: { type: Date },
      
      // Evolution Stages with pending tracking
      peezies: {
        owned: { type: Number, default: 0, max: 3 },
        pending: { type: Number, default: 0, max: 3 }
      },
      patooties: {
        owned: { type: Number, default: 0, max: 3 },
        pending: { type: Number, default: 0, max: 3 }
      },
      belugas: {
        owned: { type: Number, default: 0, max: 3 },
        pending: { type: Number, default: 0, max: 3 }
      },
      pams: {
        owned: { type: Number, default: 0, max: 3 },
        pending: { type: Number, default: 0, max: 3 },
        airdropEligible: { type: Boolean, default: false }
      },
      
      // Sync tracking
      lastOnChainSync: { type: Date },
      contractVerified: { type: Boolean, default: false },
      syncBlockNumber: { type: Number }
    },
    
    // ============ SONIQ POINTS ============
    soniqPoints: { 
      type: Number, 
      default: 0
    }
  },
  { timestamps: true }
);

// ============ INDEXES ============
// Existing indexes
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ twitterUserId: 1 });
userSchema.index({ tiktokUserId: 1 });

// Wallet indexes
userSchema.index({ walletAddress: 1 }); // Manual PaMs wallet
userSchema.index({ 'connectedWallet.address': 1 }); // Connected wallet

// New QUTIE indexes for performance
userSchema.index({ 'qutie.hasZome': 1 });
userSchema.index({ 'qutie.mintedWallet': 1 });
userSchema.index({ 'qutie.mintStatus': 1 });
userSchema.index({ soniqPoints: -1 }); // For leaderboard

// Unique constraints for QUTIE (IMPORTANT!)
userSchema.index({ 'qutie.zomeTokenId': 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { 
    'qutie.zomeTokenId': { $exists: true, $ne: null }
  }
});

userSchema.index({ 'qutie.mintedWallet': 1 }, { 
  unique: true, 
  sparse: true,
  partialFilterExpression: { 
    'qutie.mintedWallet': { $exists: true, $ne: null }
  }
});

// ============ VIRTUALS ============
userSchema.virtual('tiktokConnected').get(function () {
  return !!this.tiktokUserId;
});

// New virtual for QUTIE status
userSchema.virtual('hasQutieZome').get(function () {
  return this.qutie?.hasZome || false;
});

// ============ INSTANCE METHODS ============
// Existing method
userSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    username: this.username,
    isAdmin: this.isAdmin,
    walletAddress: this.walletAddress, // Manual wallet for PaMs
    connectedWallet: this.connectedWallet?.address, // Currently connected wallet
    email: this.email,
    isActive: this.isActive,
    createdAt: this.createdAt,
    // Add QUTIE status
    qutie: this.qutie?.hasZome ? {
      hasZome: true,
      tier: this.qutie.zomeTier,
      faction: this.qutie.faction
    } : null
  };
};

// NEW QUTIE METHODS
// Check if user can mint a Zome
userSchema.methods.canMintZome = function() {
  return !this.qutie.hasZome && 
         !this.qutie.zomeTokenId && 
         this.qutie.mintStatus !== 'pending' &&
         this.qutie.mintStatus !== 'confirmed';
};

// SIMPLIFIED GRIZL-STYLE WALLET CONNECTION
userSchema.methods.connectWallet = async function(address, chainId = 8453) {
  const cleanAddress = address.toLowerCase();
  
  // Check if wallet is locked (user has minted QUTIE Zome)
  if (this.qutie?.hasZome && this.walletLockedAt && this.walletAddress) {
    if (this.walletAddress !== cleanAddress) {
      throw new Error(`WALLET_LOCKED:Your QUTIE is bound to ${this.walletAddress.slice(0,6)}...${this.walletAddress.slice(-4)}. Please reconnect that wallet.`);
    }
    // Same wallet, just return success
    return { success: true, locked: true, wallet: this.walletAddress };
  }
  
  // Check if this wallet is already in use by another user
  const existingUser = await this.constructor.findOne({
    walletAddress: cleanAddress,
    _id: { $ne: this._id }
  });

  if (existingUser) {
    throw new Error(`WALLET_IN_USE:This wallet is already linked to @${existingUser.username}`);
  }

  // Update wallet (can change until they mint)
  this.walletAddress = cleanAddress;
  this.walletConnectedAt = new Date();
  
  // Also update connectedWallet for backward compatibility (temporary)
  this.connectedWallet = {
    address: cleanAddress,
    connectedAt: new Date(),
    lastSeen: new Date(),
    chainId
  };
  
  await this.save();
  return { success: true, locked: false, wallet: cleanAddress };
};

// Disconnect wallet
userSchema.methods.disconnectWallet = function() {
  if (!this.canSwitchWallet) { // Changed from this.canSwitchWallet() to this.canSwitchWallet
    throw new Error('Cannot disconnect wallet with pending or confirmed QUTIE Zome');
  }
  
  if (this.connectedWallet?.address) {
    this.walletHistory.push({
      address: this.connectedWallet.address,
      connectedAt: this.connectedWallet.connectedAt,
      disconnectedAt: new Date()
    });
    
    this.connectedWallet = null;
  }
  
  return this.save();
};

// Get Zome capacity based on tier
userSchema.methods.getZomeCapacity = function() {
  const capacities = [0, 1, 2, 3, 1, 2]; // index 0 unused, tiers 1-5
  return this.qutie.zomeTier ? capacities[this.qutie.zomeTier] : 0;
};

// Attempt to reserve a Zome (atomic operation)
userSchema.methods.attemptZomeMint = async function(tokenId, tier, city, faction, wallet, txData) {
  if (this.qutie.hasZome || this.qutie.mintStatus === 'pending') {
    throw new Error('Cannot mint: already has Zome or mint pending');
  }
  
  this.qutie.mintStatus = 'pending';
  this.qutie.pendingTx = {
    hash: null,
    nonce: txData.nonce,
    expiry: txData.expiry,
    attemptedAt: new Date()
  };
  
  // Reserve the token ID and wallet
  this.qutie.zomeTokenId = tokenId;
  this.qutie.zomeTier = tier;
  this.qutie.zomeCity = city;
  this.qutie.faction = faction;
  this.qutie.mintedWallet = wallet.toLowerCase();
  
  // Ensure connected wallet is set (but don't touch walletAddress - that's for manual PaMs submission)
  if (!this.connectedWallet?.address) {
    this.connectedWallet = {
      address: wallet.toLowerCase(),
      connectedAt: new Date(),
      lastSeen: new Date(),
      chainId: txData.chainId || 84532
    };
  }
  
  return this.save();
};

// Confirm successful mint
userSchema.methods.confirmZomeMint = async function(txHash) {
  if (this.qutie.mintStatus !== 'pending') {
    throw new Error('No pending mint to confirm');
  }
  
  this.qutie.mintStatus = 'confirmed';
  this.qutie.hasZome = true;
  this.qutie.confirmedAt = new Date();
  this.qutie.mintedAt = this.qutie.mintedAt || new Date();
  
  if (txHash) {
    this.qutie.pendingTx.hash = txHash;
  }
  
  // LOCK WALLET - Can no longer switch after minting QUTIE Zome
  if (!this.walletLockedAt) {
    this.walletLockedAt = new Date();
    this.canSwitchWallet = false;
  }
  
  // Update connected wallet last seen (backward compatibility)
  if (this.connectedWallet?.address) {
    this.connectedWallet.lastSeen = new Date();
  }
  
  return this.save();
};

// Fail and rollback mint
userSchema.methods.failZomeMint = async function() {
  if (this.qutie.mintStatus !== 'pending') {
    return; // Nothing to rollback
  }
  
  // Clear all reserved data
  this.qutie.mintStatus = 'failed';
  this.qutie.zomeTokenId = null;
  this.qutie.zomeTier = null;
  this.qutie.zomeCity = null;
  this.qutie.faction = null;
  this.qutie.mintedWallet = null;
  this.qutie.pendingTx = {};
  
  return this.save();
};

// Check if pending mint expired
userSchema.methods.isPendingMintExpired = function() {
  if (this.qutie.mintStatus !== 'pending') return false;
  
  const expiry = this.qutie.pendingTx?.expiry;
  if (!expiry) return true;
  
  // Add 5 minute buffer
  return Date.now() / 1000 > expiry + 300;
};

// Update evolution stage
userSchema.methods.updateEvolution = function(stage, increment = 1) {
  const stages = ['peezies', 'patooties', 'belugas', 'pams'];
  if (!stages.includes(stage)) {
    throw new Error('Invalid evolution stage');
  }
  
  const capacity = this.getZomeCapacity();
  if (this.qutie[stage].owned + increment > capacity) {
    throw new Error(`${stage} capacity exceeded`);
  }
  
  this.qutie[stage].owned += increment;
  return this.save();
};

// ============ STATIC METHODS ============
// Existing methods
userSchema.statics.findByEmail = function (email) {
  return this.findOne({ email });
};

userSchema.statics.findByWallet = function (walletAddress) {
  return this.findOne({ walletAddress }); // This is for manual PaMs wallet
};

// NEW: Find by connected wallet
userSchema.statics.findByConnectedWallet = function (address) {
  return this.findOne({ 'connectedWallet.address': address.toLowerCase() });
};

// New QUTIE static methods
// Check if wallet is available for minting
userSchema.statics.isWalletAvailable = async function(walletAddress) {
  const user = await this.findOne({ 
    'qutie.mintedWallet': walletAddress.toLowerCase() 
  });
  return !user;
};

// Find user by QUTIE wallet
userSchema.statics.findByQutieWallet = function(walletAddress) {
  return this.findOne({ 
    'qutie.mintedWallet': walletAddress.toLowerCase() 
  });
};

// Clean up expired pending mints (for background job)
userSchema.statics.cleanupExpiredMints = async function() {
  const expiredTime = Date.now() / 1000 - 600; // 10 minutes ago
  
  const result = await this.updateMany(
    {
      'qutie.mintStatus': 'pending',
      'qutie.pendingTx.expiry': { $lt: expiredTime }
    },
    {
      $set: {
        'qutie.mintStatus': 'failed',
        'qutie.zomeTokenId': null,
        'qutie.zomeTier': null,
        'qutie.zomeCity': null,
        'qutie.faction': null,
        'qutie.mintedWallet': null,
        'qutie.pendingTx': {}
      }
    }
  );
  
  return result.modifiedCount;
};

// Get QUTIE stats
userSchema.statics.getQutieStats = async function() {
  const stats = await this.aggregate([
    {
      $facet: {
        totalZomes: [
          { $match: { 'qutie.hasZome': true } },
          { $count: 'count' }
        ],
        byTier: [
          { $match: { 'qutie.hasZome': true } },
          { $group: { _id: '$qutie.zomeTier', count: { $sum: 1 } } }
        ],
        byFaction: [
          { $match: { 'qutie.hasZome': true } },
          { $group: { _id: '$qutie.faction', count: { $sum: 1 } } }
        ],
        evolutionProgress: [
          { $match: { 'qutie.hasZome': true } },
          {
            $group: {
              _id: null,
              totalPeezies: { $sum: '$qutie.peezies.owned' },
              totalPatooties: { $sum: '$qutie.patooties.owned' },
              totalBelugas: { $sum: '$qutie.belugas.owned' },
              totalPams: { $sum: '$qutie.pams.owned' }
            }
          }
        ]
      }
    }
  ]);
  
  return stats[0];
};

// ============ MIDDLEWARE ============
// Update timestamp on save
userSchema.pre('save', function(next) {
  // Validate evolution progression
  if (this.isModified('qutie.patooties.owned')) {
    const capacity = this.getZomeCapacity();
    if (this.qutie.peezies.owned < capacity) {
      return next(new Error('Must complete Peezy stage first'));
    }
  }
  
  if (this.isModified('qutie.belugas.owned')) {
    const capacity = this.getZomeCapacity();
    if (this.qutie.patooties.owned < capacity) {
      return next(new Error('Must complete Patootie stage first'));
    }
  }
  
  next();
});

userSchema.methods.connectQutieWallet = async function(walletAddress, chainId = 8453) {
  const cleanAddress = walletAddress.toLowerCase();
  
  // If they already minted, wallet is locked
  if (this.qutie?.hasZome && this.qutie?.mintedWallet) {
    if (this.qutie.mintedWallet !== cleanAddress) {
      throw new Error(`Your QUTIE is locked to wallet ${this.qutie.mintedWallet.slice(0,6)}...${this.qutie.mintedWallet.slice(-4)}`);
    }
    // Same wallet, just update last seen
    this.connectedWallet.lastSeen = new Date();
    return this.save();
  }
  
  // Check if another user minted with this wallet
  const otherUser = await this.constructor.findOne({
    'qutie.mintedWallet': cleanAddress,
    _id: { $ne: this._id }
  });
  
  if (otherUser) {
    throw new Error(`This wallet already minted for @${otherUser.username}`);
  }
  
  // Save the connected wallet (can change until they mint)
  this.connectedWallet = {
    address: cleanAddress,
    connectedAt: new Date(),
    lastSeen: new Date(),
    chainId
  };
  
  await this.save();
  return { success: true, walletAddress: cleanAddress };
};

// Enhanced QUTIE minting validation
userSchema.methods.validateQutieWalletForMinting = async function(walletAddress) {
  const cleanAddress = walletAddress.toLowerCase();
  
  // 1. Check if this wallet has already minted a QUTIE for ANY user
  const existingQutie = await this.constructor.findOne({
    'qutie.mintedWallet': cleanAddress
  });

  if (existingQutie) {
    if (existingQutie._id.toString() === this._id.toString()) {
      throw new Error('You have already minted a QUTIE with this wallet.');
    } else {
      throw new Error(`This wallet has already minted a QUTIE for @${existingQutie.username}. Each wallet can only mint one QUTIE Zome in the entire ecosystem.`);
    }
  }

  // 2. Check if wallet is connected to this user
  if (!this.connectedWallet?.address || this.connectedWallet.address !== cleanAddress) {
    throw new Error('This wallet is not connected to your account. Please connect it first in the wallet section.');
  }

  // 3. Check if user already has a pending or confirmed mint
  if (this.qutie?.hasZome) {
    throw new Error('You have already minted a QUTIE Zome.');
  }

  if (this.qutie?.mintStatus === 'pending') {
    // Check if mint has expired (using expiry from pendingTx)
    const now = Math.floor(Date.now() / 1000); // Unix timestamp
    const expiry = this.qutie?.pendingTx?.expiry;
    
    if (expiry && now > expiry) {
      // Mint has expired, reset status
      this.qutie.mintStatus = 'none';
      this.qutie.pendingTx = null;
      await this.save();
      console.log(`[QUTIE] Reset expired mint for user ${this.username} (expired: ${expiry}, now: ${now})`);
    } else {
      throw new Error('You already have a pending QUTIE mint. Please wait for it to complete.');
    }
  }

  return true;
};

// Static method to check wallet availability across the ecosystem
userSchema.statics.isWalletAvailableForQutie = async function(walletAddress) {
  const cleanAddress = walletAddress.toLowerCase();
  
  const existingQutie = await this.findOne({
    'qutie.mintedWallet': cleanAddress
  });

  return !existingQutie;
};

// Generate referral code if user doesn't have one
userSchema.methods.ensureReferralCode = async function() {
  if (this.referralCode) return this.referralCode;
  
  const chars = 'ABCDEFGHIJKLMNPQRSTUVWXYZ0123456789';
  let attempts = 0;
  
  while (attempts < 10) {
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if code already exists
    const existing = await this.constructor.findOne({ referralCode: code });
    if (!existing) {
      this.referralCode = code;
      await this.save();
      return code;
    }
    attempts++;
  }
  
  throw new Error('Failed to generate unique referral code');
};

// Export model - check if already compiled to avoid OverwriteModelError
module.exports = mongoose.models.User || mongoose.model("User", userSchema);