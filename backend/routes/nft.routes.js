// routes/nft.routes.js - CLEAN VERSION WITHOUT PAMS

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
// Safe User model import - use cached version if already compiled
const User = mongoose.models.User || require('../models/User');
const axios = require('axios');

// ============ Configuration ============

// Ethers v5 setup for backend
const { ethers } = require('ethers');

// Environment variables
const CONTRACT_ADDRESS = process.env.QUTIE_CONTRACT_ADDRESS || '0xE192aA89aecbfEeb9Ea8A2DA204Bf3863BE2A5DB';
const AUTHORIZED_SIGNER_KEY = process.env.AUTHORIZED_SIGNER_PRIVATE_KEY;
const RPC_URL = process.env.RPC_URL || 'https://mainnet.base.org';
const CHAIN_ID = parseInt(process.env.CHAIN_ID || '8453');

if (!AUTHORIZED_SIGNER_KEY) {
  console.error('[QUTIE] WARNING: AUTHORIZED_SIGNER_PRIVATE_KEY not set in .env');
}

// Contract ABI (minimal interface)
const QUTIE_ABI = [
  "function mintZome(uint256 randomSeed, uint8 requestedCity, bytes32 nonce, uint256 expiry, bytes signature)",
  "function mintPeezy(bytes32 nonce, uint256 expiry, bytes signature)",
  "function mintPatootie(bytes32 nonce, uint256 expiry, bytes signature)",
  "function mintBeluga(bytes32 nonce, uint256 expiry, bytes signature)",
  "function userData(address) view returns (uint256,uint8,uint8,uint8,uint8,uint8,uint8,bool,uint256)",
  "function hasAnyZome(address) view returns (bool)",
  "function getRemainingSupplies() view returns (uint256[6])"
];

// Provider and contract setup
const provider = new ethers.providers.JsonRpcProvider(RPC_URL);
const contract = new ethers.Contract(CONTRACT_ADDRESS, QUTIE_ABI, provider);
const signerWallet = AUTHORIZED_SIGNER_KEY ? new ethers.Wallet(AUTHORIZED_SIGNER_KEY) : null;

console.log('[QUTIE] Routes initialized');
console.log('[QUTIE] Contract:', CONTRACT_ADDRESS);
console.log('[QUTIE] Chain ID:', CHAIN_ID);
if (signerWallet) {
  console.log('[QUTIE] Signer address:', signerWallet.address);
}

// ============ Helper Functions ============

function getFactionName(cityId) {
  const factions = ['', 'Serengana', 'Tashinogo', 'Parsippius', 'Apollora', 'Bokonagwe'];
  return factions[cityId] || 'Unknown';
}

function getTierCapacity(tier) {
  const capacities = [0, 1, 2, 3, 1, 2];
  return capacities[tier] || 0;
}

function calculateExpectedTier(seed, remainingSupplies) {
  const totalRemaining = remainingSupplies.reduce((sum, count, i) => i > 0 ? sum + count : sum, 0);
  if (totalRemaining === 0) throw new Error('All Zomes minted');
  
  const random = seed.mod(totalRemaining).toNumber();
  let cumulative = 0;
  
  for (let i = 1; i <= 5; i++) {
    cumulative += remainingSupplies[i];
    if (random < cumulative && remainingSupplies[i] > 0) {
      return i;
    }
  }
  
  for (let i = 1; i <= 5; i++) {
    if (remainingSupplies[i] > 0) return i;
  }
  
  throw new Error('No tiers available');
}

async function generateAuthSignature(userAddress, nonce, expiry) {
  if (!signerWallet) {
    throw new Error('Signer not configured');
  }
  
// Use solidityPack + keccak256 to match contract's abi.encodePacked
const packed = ethers.utils.solidityPack(
  ['address', 'bytes32', 'uint256', 'address', 'uint256'],
  [userAddress, nonce, expiry, CONTRACT_ADDRESS, CHAIN_ID]
);
const messageHash = ethers.utils.keccak256(packed);

return await signerWallet.signMessage(ethers.utils.arrayify(messageHash));

}

// ============ Middleware ============

async function verifyWalletOwnership(req, res, next) {
  try {
    const { walletAddress } = req.body;
    const userId = req.userId || req.user?._id || req.user?.id;
    
    if (!walletAddress) {
      return res.status(400).json({ 
        error: 'Wallet address required',
        context: 'wallet'
      });
    }
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        error: 'User not found',
        context: 'wallet'
      });
    }
    
    if (!user.walletAddress) {
      return res.status(400).json({ 
        error: 'No wallet connected',
        message: 'Please connect your wallet first',
        context: 'wallet'
      });
    }
    
    if (user.walletAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(403).json({ 
        error: 'Wallet mismatch',
        message: `Connected wallet (${user.walletAddress.slice(0,6)}...${user.walletAddress.slice(-4)}) doesn't match provided wallet`,
        context: 'wallet'
      });
    }
    
    req.userDoc = user;
    req.walletAddress = walletAddress.toLowerCase();
    next();
  } catch (error) {
    console.error('Wallet verification error:', error);
    res.status(500).json({ 
      error: 'Wallet verification failed',
      context: 'wallet'
    });
  }
}

// ============ Routes ============

/**
 * Connect wallet to user profile (SIMPLIFIED - Single wallet for both PaMs and QUTIE)
 */
router.post('/connect-wallet', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { walletAddress, chainId } = req.body;
    const userId = req.userId || req.user?._id || req.user?.id;
    
    if (!ethers.utils.isAddress(walletAddress)) {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: 'Invalid wallet address',
        context: 'wallet'
      });
    }
    
    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ 
        error: 'User not found',
        context: 'wallet'
      });
    }
    
    // Initialize qutie if needed
    if (!user.qutie) {
      user.qutie = {
        mintStatus: 'none',
        hasZome: false,
        peezies: { owned: 0, pending: 0 },
        patooties: { owned: 0, pending: 0 },
        belugas: { owned: 0, pending: 0 }
      };
    }
    
    // Use simplified connectWallet method (GRIZL-style locking)
    try {
      const result = await user.connectWallet(walletAddress, chainId || CHAIN_ID);
      await session.commitTransaction();
      
      res.json({
        success: true,
        wallet: result.wallet,
        locked: result.locked,
        hasZome: user.qutie?.hasZome || false,
        message: result.locked 
          ? 'Wallet locked to your QUTIE Zome' 
          : 'Wallet connected successfully'
      });
      
    } catch (connectError) {
      await session.abortTransaction();
      
      // Parse error message for better UX
      const errorMsg = connectError.message;
      if (errorMsg.startsWith('WALLET_LOCKED:')) {
        return res.status(400).json({
          error: errorMsg.replace('WALLET_LOCKED:', ''),
          context: 'wallet',
          locked: true
        });
      } else if (errorMsg.startsWith('WALLET_IN_USE:')) {
        return res.status(400).json({
          error: errorMsg.replace('WALLET_IN_USE:', ''),
          context: 'wallet',
          inUse: true
        });
      } else {
        return res.status(400).json({
          error: errorMsg,
          context: 'wallet'
        });
      }
    }
    
  } catch (error) {
    await session.abortTransaction();
    console.error('[NFT] Connect wallet error:', error);
    res.status(500).json({ 
      error: 'Failed to connect wallet',
      context: 'wallet'
    });
  } finally {
    await session.endSession();
  }
});

/**
 * Check Zome eligibility
 */
router.get('/check-eligibility', async (req, res) => {
  try {
    const userId = req.userId || req.user?._id || req.user?.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Initialize WITHOUT pams
    if (!user.qutie) {
      user.qutie = {
        hasZome: false,
        mintStatus: 'none',
        peezies: { owned: 0, pending: 0 },
        patooties: { owned: 0, pending: 0 },
        belugas: { owned: 0, pending: 0 }
      };
      await user.save();
    }
    
    if (user.qutie.hasZome) {
      return res.json({
        eligible: false,
        reason: 'Already owns a Zome',
        zomeData: {
          tokenId: user.qutie.zomeTokenId,
          tier: user.qutie.zomeTier,
          city: user.qutie.zomeCity,
          faction: user.qutie.faction,
          mintedWallet: user.qutie.mintedWallet
        }
      });
    }
    
    if (user.qutie.mintStatus === 'pending') {
      if (user.isPendingMintExpired && user.isPendingMintExpired()) {
        await user.failZomeMint();
      } else {
        return res.json({
          eligible: false,
          reason: 'Mint pending',
          pendingTx: user.qutie.pendingTx
        });
      }
    }
    
    if (!user.connectedWallet?.address) {
      return res.json({
        eligible: false,
        reason: 'No wallet connected',
        message: 'Please connect your wallet first'
      });
    }
    
    res.json({
      eligible: true,
      connectedWallet: user.connectedWallet.address,
      message: 'Ready to mint'
    });
    
  } catch (error) {
    console.error('Check eligibility error:', error);
    res.status(500).json({ error: 'Failed to check eligibility' });
  }
});

/**
 * Get user's QUTIE data
 */
router.get('/qutie-data', async (req, res) => {
  try {
    const userId = req.userId || req.user?._id || req.user?.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Initialize qutie object if missing
    if (!user.qutie) {
      user.qutie = {
        hasZome: false,
        mintStatus: 'none',
        peezies: { owned: 0, pending: 0 },
        patooties: { owned: 0, pending: 0 },
        belugas: { owned: 0, pending: 0 }
      };
      await user.save();
    }
    
    let dataModified = false;
    
    // Auto-reset expired pending mints
    if (user.qutie.mintStatus === 'pending' && user.qutie.pendingTx?.expiry) {
      const now = Math.floor(Date.now() / 1000);
      if (now > user.qutie.pendingTx.expiry) {
        console.log(`[QUTIE] Auto-resetting expired pending mint for @${user.username}`);
        console.log(`  Expiry: ${user.qutie.pendingTx.expiry}, Now: ${now}`);
        
        user.qutie.mintStatus = 'failed';
        user.qutie.pendingTx = {
          ...user.qutie.pendingTx,
          failedAt: new Date()
        };
        dataModified = true;
      }
    }
    
    // Auto-reset failed mints after 5 minutes
    if (user.qutie.mintStatus === 'failed') {
      const failedAt = user.qutie.pendingTx?.failedAt || user.qutie.pendingTx?.attemptedAt;
      
      if (failedAt) {
        const failedTime = new Date(failedAt).getTime();
        const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
        
        if (failedTime < fiveMinutesAgo) {
          console.log(`[QUTIE] Auto-resetting old failed mint for @${user.username}`);
          console.log(`  Failed at: ${failedAt}, Reset after 5 minutes`);
          
          // Complete reset
          user.qutie.mintStatus = 'none';
          user.qutie.pendingTx = {};
          user.qutie.zomeTokenId = null;
          user.qutie.zomeTier = null;
          user.qutie.zomeCity = null;
          user.qutie.faction = '';
          user.qutie.mintedWallet = null;
          dataModified = true;
        }
      } else {
        // If no timestamp, reset immediately
        console.log(`[QUTIE] Resetting failed mint without timestamp for @${user.username}`);
        user.qutie.mintStatus = 'none';
        user.qutie.pendingTx = {};
        dataModified = true;
      }
    }
    
    // Save if any changes were made
    if (dataModified) {
      await user.save();
      console.log(`[QUTIE] Saved auto-reset changes for @${user.username}`);
    }
    
    // Calculate capacity
    const capacity = user.getZomeCapacity ? user.getZomeCapacity() : 0;
    
    // Determine eligibility reason
    let eligibilityReason = 'Eligible to mint';
    let canMint = false;
    
    if (!user.walletAddress) {
      eligibilityReason = 'No wallet connected';
    } else if (user.qutie.hasZome) {
      eligibilityReason = 'Already has a QUTIE Zome';
    } else if (user.qutie.mintStatus === 'pending') {
      const now = Math.floor(Date.now() / 1000);
      const expiry = user.qutie.pendingTx?.expiry;
      const timeLeft = expiry ? Math.ceil((expiry - now) / 60) : 0;
      eligibilityReason = `Mint pending (${timeLeft} min remaining)`;
    } else if (user.qutie.mintStatus === 'confirmed') {
      eligibilityReason = 'Mint confirmed, awaiting sync';
    } else if (user.qutie.mintStatus === 'failed') {
      // This should be auto-reset above, but just in case
      eligibilityReason = 'Previous mint failed - retry available';
      canMint = true;
    } else if (user.qutie.mintStatus === 'none' && user.walletAddress) {
      canMint = true;
      eligibilityReason = 'Ready to mint!';
    }
    
    // Override with method if available
    if (user.canMintZome) {
      canMint = user.canMintZome();
    }
    
    // Build response
    const response = {
      profile: {
        username: user.username,
        walletAddress: user.walletAddress, // Single wallet field
        walletLocked: !!user.walletLockedAt,
        canSwitchWallet: user.canSwitchWallet,
        canMintZome: canMint,
        // Enhanced eligibility info
        eligibility: {
          hasWallet: !!user.walletAddress,
          hasZome: user.qutie.hasZome,
          mintStatus: user.qutie.mintStatus,
          canMint: canMint,
          reason: eligibilityReason,
          // Additional debug info
          details: {
            walletConnected: !!user.walletAddress,
            walletAddress: user.walletAddress?.slice(0, 10) + '...',
            hasZome: user.qutie.hasZome,
            tokenId: user.qutie.zomeTokenId,
            status: user.qutie.mintStatus,
            pendingExpiry: user.qutie.pendingTx?.expiry,
            currentTime: Math.floor(Date.now() / 1000)
          }
        }
      },
      zome: user.qutie.hasZome ? {
        tokenId: user.qutie.zomeTokenId,
        tier: user.qutie.zomeTier,
        city: user.qutie.zomeCity,
        faction: user.qutie.faction,
        capacity: capacity,
        mintedWallet: user.qutie.mintedWallet,
        mintedAt: user.qutie.mintedAt,
        confirmedAt: user.qutie.confirmedAt,
        minted: true
      } : null,
      evolution: {
        peezies: user.qutie.peezies?.owned || 0,
        patooties: user.qutie.patooties?.owned || 0,
        belugas: user.qutie.belugas?.owned || 0,
        // Include pending counts
        pending: {
          peezies: user.qutie.peezies?.pending || 0,
          patooties: user.qutie.patooties?.pending || 0,
          belugas: user.qutie.belugas?.pending || 0
        }
      },
      soniqPoints: user.soniqPoints || user.score || 0,
      mintStatus: user.qutie.mintStatus,
      pendingTx: user.qutie.mintStatus === 'pending' ? {
        ...user.qutie.pendingTx,
        timeRemaining: user.qutie.pendingTx?.expiry ? 
          Math.max(0, user.qutie.pendingTx.expiry - Math.floor(Date.now() / 1000)) : 0
      } : null
    };
    
    // Log for debugging specific users
    if (['PaMsEternity', 'OG_Metafizik'].includes(user.username)) {
      console.log(`[QUTIE DEBUG] Data for @${user.username}:`, {
        hasZome: user.qutie.hasZome,
        mintStatus: user.qutie.mintStatus,
        connectedWallet: user.connectedWallet?.address,
        canMint: canMint,
        reason: eligibilityReason
      });
    }
    
    res.json(response);
    
  } catch (error) {
    console.error('[QUTIE] Get data error:', error);
    res.status(500).json({ 
      error: 'Failed to fetch QUTIE data',
      message: error.message
    });
  }
});

router.post('/connect-qutie-wallet', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const userId = req.userId || req.user?._id || req.user?.id;
    const { walletAddress, chainId } = req.body;
    
    if (!walletAddress) {
      await session.abortTransaction();
      return res.status(400).json({ 
        error: 'Wallet address required',
        message: 'Please provide a wallet address'
      });
    }
    
    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ 
        error: 'User not found',
        message: 'Could not find your user account'
      });
    }
    
    // Log the attempt
    console.log(`[QUTIE] @${user.username} attempting to connect wallet: ${walletAddress}`);
    
    try {
      // Use the model's connectQutieWallet method which has all the validation
      const result = await user.connectQutieWallet(walletAddress, chainId);
      
      await session.commitTransaction();
      
      console.log(`[QUTIE] ✓ Wallet connected for @${user.username}`);
      
      // Check if user can now mint
      const canMintNow = user.canMintZome ? user.canMintZome() : 
                         !user.qutie.hasZome && user.qutie.mintStatus !== 'pending';
      
      res.json({ 
        success: true,
        message: 'Wallet connected for QUTIE successfully',
        walletAddress: result.walletAddress,
        canMintZome: canMintNow
      });
      
    } catch (validationError) {
      await session.abortTransaction();
      console.log(`[QUTIE] ✗ Wallet connection failed for @${user.username}: ${validationError.message}`);
      
      // Return the specific error message from the model
      return res.status(400).json({ 
        error: 'Wallet connection failed',
        message: validationError.message
      });
    }
    
  } catch (error) {
    await session.abortTransaction();
    console.error('[QUTIE] Connect wallet error:', error);
    res.status(500).json({ 
      error: 'Failed to connect wallet',
      message: 'An unexpected error occurred. Please try again.'
    });
  } finally {
    await session.endSession();
  }
});

/**
 * Get contract info
 */
router.get('/contract-info', async (req, res) => {
  try {
    if (!contract) {
      return res.json({
        contractAddress: CONTRACT_ADDRESS,
        chainId: CHAIN_ID,
        rpcUrl: RPC_URL,
        status: 'Not configured'
      });
    }
    
    const remainingSupplies = await contract.getRemainingSupplies();
    
    res.json({
      contractAddress: CONTRACT_ADDRESS,
      chainId: CHAIN_ID,
      rpcUrl: RPC_URL,
      status: 'Active',
      remainingSupplies: {
        total: remainingSupplies.reduce((sum, count, i) => i > 0 ? sum + Number(count) : sum, 0),
        tier1: Number(remainingSupplies[1]),
        tier2: Number(remainingSupplies[2]),
        tier3: Number(remainingSupplies[3]),
        tier4: Number(remainingSupplies[4]),
        tier5: Number(remainingSupplies[5])
      }
    });
  } catch (error) {
    console.error('Contract info error:', error);
    res.status(500).json({ 
      error: 'Failed to get contract info',
      contractAddress: CONTRACT_ADDRESS,
      chainId: CHAIN_ID,
      status: 'Error'
    });
  }
});

router.post('/mint-zome', verifyWalletOwnership, async (req, res) => {
  if (!signerWallet) {
    return res.status(503).json({ 
      error: 'Minting not configured',
      message: 'Please add AUTHORIZED_SIGNER_PRIVATE_KEY to .env file'
    });
  }
  
  // NO SESSION HERE - We're not changing database yet!
  try {
    const user = req.userDoc;
    const walletAddress = req.walletAddress;

    // Check balance
    const balance = await provider.getBalance(walletAddress);
    const minRequired = ethers.utils.parseEther('0.001');
    
    if (balance.lt(minRequired)) {
      return res.status(400).json({ 
        error: 'Insufficient ETH for gas fees',
        required: '0.001 ETH minimum',
        current: ethers.utils.formatEther(balance),
        message: 'Please add more ETH to your wallet before minting',
        context: 'mint'
      });
    }
    
    // Check eligibility WITHOUT setting pending
    if (user.qutie?.hasZome) {
      return res.status(400).json({ 
        error: 'Not eligible',
        reason: 'Already has Zome',
        context: 'mint'
      });
    }
    
    if (user.qutie?.mintStatus === 'pending') {
      // Check if it's an old stuck pending (more than 5 minutes)
      const pendingTime = user.qutie.pendingTx?.attemptedAt;
      if (pendingTime) {
        const ageMinutes = (Date.now() - new Date(pendingTime).getTime()) / 1000 / 60;
        if (ageMinutes > 5) {
          console.log(`[QUTIE] Auto-clearing stuck pending for @${user.username} (${ageMinutes} minutes old)`);
          // Clear it
          user.qutie.mintStatus = 'none';
          user.qutie.pendingTx = {};
          await user.save();
        } else {
          return res.status(400).json({ 
            error: 'Not eligible',
            reason: 'Mint pending',
            timeLeft: Math.ceil(5 - ageMinutes) + ' minutes',
            context: 'mint'
          });
        }
      }
    }
    
    // Check supply
    const remainingSupplies = await contract.getRemainingSupplies();
    const suppliesArray = remainingSupplies.map(n => Number(n));
    
    if (suppliesArray.reduce((sum, count, i) => i > 0 ? sum + count : sum, 0) === 0) {
      return res.status(400).json({ 
        error: 'All Zomes minted',
        context: 'mint'
      });
    }
    
    // Generate mint parameters
    const randomSeed = ethers.BigNumber.from(ethers.utils.randomBytes(32));
    const expectedTier = calculateExpectedTier(randomSeed, suppliesArray);
    const cityId = Math.floor(Math.random() * 5) + 1;
    const expectedTokenId = 100 * expectedTier + cityId;
    const expectedFaction = getFactionName(cityId);
    
    const nonce = ethers.utils.hexlify(ethers.utils.randomBytes(32));
    const expiry = Math.floor(Date.now() / 1000) + 300;
    
    // DON'T SET PENDING HERE! Just prepare the transaction
    // NO: await user.attemptZomeMint(...) 
    
    // Generate signature
    const signature = await generateAuthSignature(walletAddress, nonce, expiry);

console.log('=== FINAL TRANSACTION DEBUG ===');
console.log('randomSeed:', randomSeed.toString());
console.log('nonce (hex):', ethers.utils.hexlify(nonce));
console.log('expiry:', expiry);
console.log('Current timestamp:', Math.floor(Date.now() / 1000));
console.log('Signature valid for:', expiry - Math.floor(Date.now() / 1000), 'seconds');
console.log('walletAddress:', walletAddress);
console.log('signature:', signature);
    
    // Prepare transaction data
const txData = contract.interface.encodeFunctionData('mintZome', [
  randomSeed,      // uint256 seed
  cityId,         // uint8 requestedCity (this is the value that exists!)
  nonce,          // bytes32 nonce
  expiry,         // uint256 expiry
  signature       // bytes signature
]);
    
    console.log('[QUTIE] Mint prepared for:', walletAddress);
    console.log('[QUTIE] Expected:', expectedTokenId, 'Tier:', expectedTier, 'Faction:', expectedFaction);
    
    // Return transaction data WITHOUT changing user status
    res.json({
      success: true,
      txData: {
        to: CONTRACT_ADDRESS,
        data: txData,
        value: '0x0'
      },
      expected: {
        tokenId: expectedTokenId,
        tier: expectedTier,
        city: cityId,
        faction: expectedFaction,
        capacity: getTierCapacity(expectedTier)
      },
      // Include these for the confirm-mint endpoint
      mintParams: {
        tokenId: expectedTokenId,
        tier: expectedTier,
        city: cityId,
        faction: expectedFaction,
        nonce,
        expiry,
        attemptedAt: new Date()
      }
    });
    
  } catch (error) {
    console.error('[QUTIE] Mint preparation error:', error);
    res.status(500).json({ 
      error: 'Failed to prepare mint',
      message: error.message,
      context: 'mint'
    });
  }
});

// NEW: Set pending ONLY after transaction is sent
router.post('/confirm-mint', async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { txHash, walletAddress, mintParams } = req.body;
    const userId = req.userId || req.user?._id || req.user?.id;
    
    if (!txHash || !walletAddress || !mintParams) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    const user = await User.findById(userId).session(session);
    if (!user) {
      await session.abortTransaction();
      return res.status(404).json({ error: 'User not found' });
    }
    
    // NOW set pending status AFTER transaction is sent
    user.qutie.mintStatus = 'pending';
    user.qutie.pendingTx = {
      hash: txHash,
      nonce: mintParams.nonce,
      expiry: mintParams.expiry,
      attemptedAt: mintParams.attemptedAt
    };
    user.qutie.zomeTokenId = mintParams.tokenId;
    user.qutie.zomeTier = mintParams.tier;
    user.qutie.zomeCity = mintParams.city;
    user.qutie.faction = mintParams.faction;
    user.qutie.mintedWallet = walletAddress;
    
    await user.save({ session });
    await session.commitTransaction();
    
    console.log(`[QUTIE] Mint confirmed as pending for @${user.username}, tx: ${txHash}`);
    
    // Start monitoring the transaction
    monitorTransaction(txHash, user._id);
    
    res.json({ 
      success: true, 
      message: 'Mint status updated to pending',
      txHash 
    });
    
  } catch (error) {
    await session.abortTransaction();
    console.error('[QUTIE] Confirm mint error:', error);
    res.status(500).json({ error: 'Failed to confirm mint' });
  } finally {
    await session.endSession();
  }
});

// Add endpoint to clear stuck pending (for declined transactions)
router.post('/clear-pending-mint', async (req, res) => {
  try {
    const userId = req.userId || req.user?._id || req.user?.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.qutie.mintStatus === 'pending') {
      // Check if there's an actual transaction
      const txHash = user.qutie.pendingTx?.hash;
      
      if (txHash) {
        // Check if transaction exists on chain
        try {
          const tx = await provider.getTransaction(txHash);
          if (tx) {
            return res.json({ 
              success: false, 
              message: 'Transaction exists on chain, cannot clear' 
            });
          }
        } catch (err) {
          console.log('Transaction not found on chain, safe to clear');
        }
      }
      
      // Clear the pending status
      user.qutie.mintStatus = 'none';
      user.qutie.pendingTx = {};
      user.qutie.zomeTokenId = null;
      user.qutie.zomeTier = null;
      user.qutie.zomeCity = null;
      user.qutie.faction = '';
      user.qutie.mintedWallet = null;
      
      await user.save();
      
      console.log(`[QUTIE] Cleared stuck pending mint for @${user.username}`);
      res.json({ success: true, message: 'Pending status cleared' });
    } else {
      res.json({ success: false, message: 'Not in pending status' });
    }
  } catch (error) {
    console.error('Clear pending error:', error);
    res.status(500).json({ error: 'Failed to clear pending status' });
  }
});

// ============ Evolution NFT Mint Endpoints ============

// Mint Peezy endpoint - supports multiple mints based on tier
router.post('/mint-peezy', async (req, res) => {
  try {
    const { walletAddress, quantity = 1 } = req.body;
    const userId = req.userId || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!walletAddress || !ethers.utils.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    // Get user data to check tier
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

const balance = await provider.getBalance(walletAddress);
const minRequired = ethers.utils.parseEther('0.001');

if (balance.lt(minRequired)) {
  return res.status(400).json({ 
    error: 'Insufficient ETH for gas fees',
    required: '0.001 ETH minimum',
    current: ethers.utils.formatEther(balance),
    message: 'Please add more ETH to your wallet before minting'
  });
}
    
    // Check if user has a Zome
    const userData = await contract.userData(walletAddress);
    const tokenId = userData[0].toNumber();
    const tier = userData[1];
    
    if (tokenId === 0) {
      return res.status(400).json({ error: 'Must mint a QUTIE Zome first', context: 'mint' });
    }

try {
  const totalsResponse = await axios.get(`http://localhost:${process.env.PORT || 10000}/api/totalScore/userTotalsPro/${userId}`);
  const currentSoniqPoints = totalsResponse.data?.total || 0;
  
  const requiredPoints = 100; // For Peezy
  if (currentSoniqPoints < requiredPoints) {
    return res.status(400).json({ 
      error: 'Insufficient SONIQ points',
      required: requiredPoints,
      current: currentSoniqPoints 
    });
  }
} catch (error) {
  console.error('Failed to get SONIQ points:', error);
  return res.status(500).json({ error: 'Failed to verify SONIQ points' });
}
    
    // Calculate allowed mints based on tier
    // Tier 4 gets 1 airdrop, Tier 5 gets 2 airdrops, Tiers 1-3 get their tier number
    const allowedMints = tier === 4 ? 1 : tier === 5 ? 2 : tier;
    const currentPeezies = userData[4]; // peezies count from contract
    const canMint = Math.max(0, allowedMints - currentPeezies);
    
    if (canMint === 0) {
      return res.status(400).json({ error: 'Already minted maximum Peezies for your tier', context: 'mint' });
    }
    
    // Validate requested quantity
    const actualQuantity = Math.min(quantity, canMint);
    
    // For mock mode (testing)
    if (process.env.MOCK_MODE === 'true') {
      console.log('[QUTIE] Mock mode - simulating Peezy mint');
      
      // Update database with mock data
      await User.findByIdAndUpdate(userId, {
        $inc: { 'qutie.evolution.peezies': actualQuantity }
      });
      
      return res.json({
        success: true,
        mode: 'mock',
        quantity: actualQuantity,
        message: `Mock minted ${actualQuantity} Peezy${actualQuantity > 1 ? 's' : ''}`
      });
    }
    
    // Generate transaction data for each mint
    const transactions = [];
    
    for (let i = 0; i < actualQuantity; i++) {
      const nonce = ethers.utils.randomBytes(32);
      const expiry = Math.floor(Date.now() / 1000) + 600; // 10 minutes
      
      // Sign the authorization
      const messageHash = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'uint256', 'address'],
        [walletAddress, nonce, expiry, CONTRACT_ADDRESS]
      );
      
      const signature = await signerWallet.signMessage(ethers.utils.arrayify(messageHash));
      
      // Encode transaction data
      const iface = new ethers.utils.Interface(QUTIE_ABI);
      const data = iface.encodeFunctionData('mintPeezy', [nonce, expiry, signature]);
      
      transactions.push({
        to: CONTRACT_ADDRESS,
        data: data,
        nonce: ethers.utils.hexlify(nonce),
        expiry: expiry
      });
    }
    
    // If single transaction, return just the data
    // If multiple, return array (frontend will need to handle batch)
    const txData = actualQuantity === 1 ? transactions[0] : transactions;
    
    res.json({
      success: true,
      txData: txData,
      quantity: actualQuantity,
      expected: {
        type: 'peezy',
        quantity: actualQuantity
      }
    });
    
  } catch (error) {
    console.error('[QUTIE] Mint Peezy error:', error);
    res.status(500).json({ error: 'Failed to prepare Peezy mint' });
  }
});

// Mint Patootie endpoint - supports multiple mints based on tier
router.post('/mint-patootie', async (req, res) => {
  try {
    const { walletAddress, quantity = 1 } = req.body;
    const userId = req.userId || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!walletAddress || !ethers.utils.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    // Get user data to check tier
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
const balance = await provider.getBalance(walletAddress);
const minRequired = ethers.utils.parseEther('0.001');

if (balance.lt(minRequired)) {
  return res.status(400).json({ 
    error: 'Insufficient ETH for gas fees',
    required: '0.001 ETH minimum',
    current: ethers.utils.formatEther(balance),
    message: 'Please add more ETH to your wallet before minting'
  });
}

    // Check if user has a Zome
    const userData = await contract.userData(walletAddress);
    const tokenId = userData[0].toNumber();
    const tier = userData[1];
    
   const currentPeezies = userData[4]; // peezies count from contract
const requiredPeezies = tier === 4 ? 1 : tier === 5 ? 2 : tier;
if (currentPeezies < requiredPeezies) {
  return res.status(400).json({ error: 'Must mint required Peezy NFTs first based on your tier' });
}
    
    // Calculate allowed mints based on tier
    const allowedMints = tier === 4 ? 1 : tier === 5 ? 2 : tier;
    const currentPatooties = userData[5]; // patooties count from contract
    const canMint = Math.max(0, allowedMints - currentPatooties);

try {
  const totalsResponse = await axios.get(`http://localhost:${process.env.PORT || 10000}/api/totalScore/userTotalsPro/${userId}`);
  const currentSoniqPoints = totalsResponse.data?.total || 0;
  
  const requiredPoints = 500; // For Patootie
  if (currentSoniqPoints < requiredPoints) {
    return res.status(400).json({ 
      error: 'Insufficient SONIQ points',
      required: requiredPoints,
      current: currentSoniqPoints 
    });
  }
} catch (error) {
  console.error('Failed to get SONIQ points:', error);
  return res.status(500).json({ error: 'Failed to verify SONIQ points' });
}
    
    if (canMint === 0) {
      return res.status(400).json({ error: 'Already minted maximum Patooties for your tier', context: 'mint' });
    }
    
    // Validate requested quantity
    const actualQuantity = Math.min(quantity, canMint);
    
    // For mock mode (testing)
    if (process.env.MOCK_MODE === 'true') {
      console.log('[QUTIE] Mock mode - simulating Patootie mint');
      
      // Update database with mock data
      await User.findByIdAndUpdate(userId, {
        $inc: { 'qutie.evolution.patooties': actualQuantity }
      });
      
      return res.json({
        success: true,
        mode: 'mock',
        quantity: actualQuantity,
        message: `Mock minted ${actualQuantity} Patootie${actualQuantity > 1 ? 's' : ''}`
      });
    }
    
    // Generate transaction data for each mint
    const transactions = [];
    
    for (let i = 0; i < actualQuantity; i++) {
      const nonce = ethers.utils.randomBytes(32);
      const expiry = Math.floor(Date.now() / 1000) + 600; // 10 minutes
      
      // Sign the authorization
      const messageHash = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'uint256', 'address'],
        [walletAddress, nonce, expiry, CONTRACT_ADDRESS]
      );
      
      const signature = await signerWallet.signMessage(ethers.utils.arrayify(messageHash));
      
      // Encode transaction data
      const iface = new ethers.utils.Interface(QUTIE_ABI);
      const data = iface.encodeFunctionData('mintPatootie', [nonce, expiry, signature]);
      
      transactions.push({
        to: CONTRACT_ADDRESS,
        data: data,
        nonce: ethers.utils.hexlify(nonce),
        expiry: expiry
      });
    }
    
    // If single transaction, return just the data
    // If multiple, return array (frontend will need to handle batch)
    const txData = actualQuantity === 1 ? transactions[0] : transactions;
    
    res.json({
      success: true,
      txData: txData,
      quantity: actualQuantity,
      expected: {
        type: 'patootie',
        quantity: actualQuantity
      }
    });
    
  } catch (error) {
    console.error('[QUTIE] Mint Patootie error:', error);
    res.status(500).json({ error: 'Failed to prepare Patootie mint' });
  }
});

// Mint Beluga endpoint - supports multiple mints based on tier
router.post('/mint-beluga', async (req, res) => {
  try {
    const { walletAddress, quantity = 1 } = req.body;
    const userId = req.userId || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!walletAddress || !ethers.utils.isAddress(walletAddress)) {
      return res.status(400).json({ error: 'Invalid wallet address' });
    }
    
    // Get user data to check tier
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

const balance = await provider.getBalance(walletAddress);
const minRequired = ethers.utils.parseEther('0.001');

if (balance.lt(minRequired)) {
  return res.status(400).json({ 
    error: 'Insufficient ETH for gas fees',
    required: '0.001 ETH minimum',
    current: ethers.utils.formatEther(balance),
    message: 'Please add more ETH to your wallet before minting'
  });
}
    
    // Check if user has a Zome
    const userData = await contract.userData(walletAddress);
    const tokenId = userData[0].toNumber();
    const tier = userData[1];
    
    const currentPatooties = userData[5]; // patooties count from contract  
const requiredPatooties = tier === 4 ? 1 : tier === 5 ? 2 : tier;
if (currentPatooties < requiredPatooties) {
  return res.status(400).json({ error: 'Must mint required Patootie NFTs first based on your tier' });
}
    
    // Calculate allowed mints based on tier
    const allowedMints = tier === 4 ? 1 : tier === 5 ? 2 : tier;
    const currentBelugas = userData[6]; // belugas count from contract
    const canMint = Math.max(0, allowedMints - currentBelugas);

    try {
  const totalsResponse = await axios.get(`http://localhost:${process.env.PORT || 10000}/api/totalScore/userTotalsPro/${userId}`);
  const currentSoniqPoints = totalsResponse.data?.total || 0;
  
  const requiredPoints = 1000; // For Beluga
  if (currentSoniqPoints < requiredPoints) {
    return res.status(400).json({ 
      error: 'Insufficient SONIQ points',
      required: requiredPoints,
      current: currentSoniqPoints 
    });
  }
} catch (error) {
  console.error('Failed to get SONIQ points:', error);
  return res.status(500).json({ error: 'Failed to verify SONIQ points' });
}
    
    if (canMint === 0) {
      return res.status(400).json({ error: 'Already minted maximum Belugas for your tier', context: 'mint' });
    }
    
    // Validate requested quantity
    const actualQuantity = Math.min(quantity, canMint);
    
    // For mock mode (testing)
    if (process.env.MOCK_MODE === 'true') {
      console.log('[QUTIE] Mock mode - simulating Beluga mint');
      
      // Update database with mock data
      await User.findByIdAndUpdate(userId, {
        $inc: { 'qutie.evolution.belugas': actualQuantity }
      });
      
      return res.json({
        success: true,
        mode: 'mock',
        quantity: actualQuantity,
        message: `Mock minted ${actualQuantity} Beluga${actualQuantity > 1 ? 's' : ''}`
      });
    }
    
    // Generate transaction data for each mint
    const transactions = [];
    
    for (let i = 0; i < actualQuantity; i++) {
      const nonce = ethers.utils.randomBytes(32);
      const expiry = Math.floor(Date.now() / 1000) + 600; // 10 minutes
      
      // Sign the authorization
      const messageHash = ethers.utils.solidityKeccak256(
        ['address', 'bytes32', 'uint256', 'address'],
        [walletAddress, nonce, expiry, CONTRACT_ADDRESS]
      );
      
      const signature = await signerWallet.signMessage(ethers.utils.arrayify(messageHash));
      
      // Encode transaction data
      const iface = new ethers.utils.Interface(QUTIE_ABI);
      const data = iface.encodeFunctionData('mintBeluga', [nonce, expiry, signature]);
      
      transactions.push({
        to: CONTRACT_ADDRESS,
        data: data,
        nonce: ethers.utils.hexlify(nonce),
        expiry: expiry
      });
    }
    
    // If single transaction, return just the data
    // If multiple, return array (frontend will need to handle batch)
    const txData = actualQuantity === 1 ? transactions[0] : transactions;
    
    res.json({
      success: true,
      txData: txData,
      quantity: actualQuantity,
      expected: {
        type: 'beluga',
        quantity: actualQuantity
      }
    });
    
  } catch (error) {
    console.error('[QUTIE] Mint Beluga error:', error);
    res.status(500).json({ error: 'Failed to prepare Beluga mint' });
  }
});

// Admin endpoint to recover lost mints
router.post('/admin-recover-mint', async (req, res) => {
  try {
    const { username, txHash } = req.body;
    const adminUserId = req.userId || req.user?._id;
    
    // Check if requester is admin
    const adminUser = await User.findById(adminUserId);
    if (!adminUser?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }
    
    // Find target user
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Get transaction receipt
    const receipt = await provider.getTransactionReceipt(txHash);
    if (!receipt || receipt.status !== 1) {
      return res.status(400).json({ error: 'Transaction failed or not found' });
    }
    
    // Parse logs to find the mint
    const iface = new ethers.utils.Interface(QUTIE_ABI);
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() === CONTRACT_ADDRESS.toLowerCase()) {
        try {
          const parsed = iface.parseLog(log);
          if ((parsed.name === 'TransferSingle' || parsed.name === 'Transfer') && 
              parsed.args.from === ethers.constants.AddressZero) {
            
            const toAddress = parsed.args.to;
            const tokenId = (parsed.args.id || parsed.args.tokenId).toNumber();
            
            // Calculate tier and city from token ID
            const tier = Math.floor((tokenId - 1) / 5) + 1;
            const city = ((tokenId - 1) % 5) + 1;
            
            // Update user
            user.qutie.hasZome = true;
            user.qutie.zomeTokenId = tokenId;
            user.qutie.zomeTier = tier;
            user.qutie.zomeCity = city;
            user.qutie.faction = getFactionName(city);
            user.qutie.mintedWallet = toAddress.toLowerCase();
            user.qutie.mintStatus = 'confirmed';
            user.qutie.confirmedAt = new Date();
            
            await user.save();
            
            return res.json({ 
              success: true,
              message: `Recovered Token #${tokenId} for @${username}`,
              details: {
                tokenId,
                tier,
                city,
                faction: getFactionName(city),
                wallet: toAddress
              }
            });
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    res.status(400).json({ error: 'Could not find mint in transaction' });
  } catch (error) {
    console.error('Admin recover mint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Admin: Scan for lost mints
router.get('/admin-scan-lost-mints', async (req, res) => {
  try {
    const adminUserId = req.userId || req.user?._id;
    const adminUser = await User.findById(adminUserId);
    if (!adminUser?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    console.log('[ADMIN] Scanning for lost mints...');

    // Find all users with connected wallets but no zome
    const usersToCheck = await User.find({
      'connectedWallet.address': { $exists: true, $ne: null },
      'qutie.hasZome': { $ne: true }
    }).select('username connectedWallet qutie');

    const needsRecovery = [];
    let onChainFound = 0;

    // Check each user's wallet on-chain
    for (const user of usersToCheck) {
      try {
        const walletAddress = user.connectedWallet.address;
        const userData = await contract.userData(walletAddress);
        const tokenId = userData[0].toNumber();
        
        if (tokenId > 0) {
          onChainFound++;
          // This user has a token on-chain but not in DB
          needsRecovery.push({
            userId: user._id,
            username: user.username,
            wallet: walletAddress,
            tokenId: tokenId,
            tier: userData[1],
            city: userData[2]
          });
          console.log(`[ADMIN] Found lost mint: @${user.username} has Token #${tokenId}`);
        }
      } catch (err) {
        // Skip errors for individual wallets
        continue;
      }
    }

    console.log(`[ADMIN] Scan complete: ${needsRecovery.length} users need recovery`);

    res.json({
      totalChecked: usersToCheck.length,
      onChainFound: onChainFound,
      needsRecovery: needsRecovery
    });

  } catch (error) {
    console.error('[ADMIN] Scan error:', error);
    res.status(500).json({ error: 'Failed to scan for lost mints' });
  }
});

// Admin: Recover all lost mints
router.post('/admin-recover-all-mints', async (req, res) => {
  try {
    const adminUserId = req.userId || req.user?._id;
    const adminUser = await User.findById(adminUserId);
    if (!adminUser?.isAdmin) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { recoveryList } = req.body;
    if (!recoveryList || !Array.isArray(recoveryList)) {
      return res.status(400).json({ error: 'Invalid recovery list' });
    }

    console.log(`[ADMIN] Starting bulk recovery for ${recoveryList.length} users...`);
    const recovered = [];
    const failed = [];

    for (const item of recoveryList) {
  try {
    const user = await User.findById(item.userId);
    if (!user) {
      failed.push({ username: item.username, reason: 'User not found' });
      continue;
    }

    // FIX: Correct calculation for tier and city
    const tokenId = item.tokenId;
    let tier, city;
    
    if (tokenId <= 5) {
      tier = 1;
      city = tokenId;
    } else if (tokenId <= 10) {
      tier = 2;
      city = tokenId - 5;
    } else if (tokenId <= 15) {
      tier = 3;
      city = tokenId - 10;
    } else if (tokenId <= 20) {
      tier = 4;
      city = tokenId - 15;
    } else if (tokenId <= 25) {
      tier = 5;
      city = tokenId - 20;
    } else {
      // For tokens beyond 25, use the original formula
      tier = Math.floor((tokenId - 1) / 5) + 1;
      city = ((tokenId - 1) % 5) + 1;
    }

    console.log(`[ADMIN] Token #${tokenId} = Tier ${tier}, City ${city}`);

    // Update user with correct values
    user.qutie.hasZome = true;
    user.qutie.zomeTokenId = tokenId;
    user.qutie.zomeTier = tier;
    user.qutie.zomeCity = city;
    user.qutie.faction = getFactionName(city);
    user.qutie.mintedWallet = item.wallet.toLowerCase();
    user.qutie.mintStatus = 'confirmed';
    user.qutie.confirmedAt = new Date();
    
    // Force save with markModified to ensure MongoDB detects changes
    user.markModified('qutie');
    await user.save();
    
    recovered.push({
      username: item.username,
      tokenId: tokenId,
      tier: tier,
      faction: getFactionName(city)
    });
    
    console.log(`[ADMIN] Recovered Token #${tokenId} for @${item.username} - Tier ${tier}, City ${city}`);
  } catch (err) {
    console.error(`[ADMIN] Failed to recover for @${item.username}:`, err);
    failed.push({ 
      username: item.username, 
      reason: err.message 
    });
  }
}

    console.log(`[ADMIN] Bulk recovery complete: ${recovered.length} recovered, ${failed.length} failed`);

    res.json({
      recovered: recovered,
      failed: failed,
      summary: {
        total: recoveryList.length,
        success: recovered.length,
        failed: failed.length
      }
    });

  } catch (error) {
    console.error('[ADMIN] Bulk recover error:', error);
    res.status(500).json({ error: 'Failed to recover mints' });
  }
});

router.post('/verify-mint', async (req, res) => {
  try {
    const { txHash, walletAddress, nftType } = req.body;
    const userId = req.userId || req.user?._id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    if (!txHash || !walletAddress) {
      return res.status(400).json({ error: 'Transaction hash and wallet address required' });
    }
    
    console.log('[QUTIE] Verifying mint:', { txHash, walletAddress, nftType });
    
    // Get transaction receipt
    let receipt;
    try {
      receipt = await provider.getTransactionReceipt(txHash);
    } catch (error) {
      console.log('[QUTIE] Transaction not found yet, still pending');
      return res.json({ 
        success: false, 
        message: 'Transaction still pending',
        status: 'pending'
      });
    }
    
    if (!receipt) {
      return res.json({ 
        success: false, 
        message: 'Transaction not found',
        status: 'pending'
      });
    }
    
    if (receipt.status !== 1) {
      return res.status(400).json({ 
        error: 'Transaction failed', 
        status: 'failed',
        txHash 
      });
    }
    
    console.log('[QUTIE] Transaction confirmed, updating user data...');
    
    // Get fresh contract data for the user
    const userData = await contract.userData(walletAddress);
    const hasZome = await contract.hasAnyZome(walletAddress);
    
    // Parse userData from contract
    const tokenId = userData[0].toNumber();
    const tier = userData[1];
    const city = userData[2];
    const peeziesCount = userData[4];
    const patootiesCount = userData[5];
    const belugasCount = userData[6];
    
    // Update user in database
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update user's QUTIE data based on what was minted
    if (hasZome && tokenId > 0) {
      // Zome was minted
      user.qutie.hasZome = true;
      user.qutie.zomeTokenId = tokenId;
      user.qutie.zomeTier = tier;
      user.qutie.zomeCity = city;
      user.qutie.faction = getFactionName(city);
      user.qutie.mintStatus = 'confirmed';
      user.qutie.mintedWallet = walletAddress.toLowerCase();
      user.qutie.confirmedAt = new Date();
      
      // Clear pending transaction
      user.qutie.pendingTx = undefined;
      
      console.log('[QUTIE] Zome mint verified:', {
        tokenId,
        tier: tier.toString(),
        city: city.toString(),
        faction: getFactionName(city)
      });
    }
    
    // Update evolution NFT counts
    user.qutie.peezies = { owned: peeziesCount, pending: 0 };
    user.qutie.patooties = { owned: patootiesCount, pending: 0 };
    user.qutie.belugas = { owned: belugasCount, pending: 0 };
    
    await user.save();
    
    res.json({
      success: true,
      message: 'Mint verified successfully',
      status: 'confirmed',
      nftData: {
        hasZome,
        tokenId: tokenId > 0 ? tokenId : null,
        tier: tier > 0 ? tier : null,
        city: city > 0 ? city : null,
        faction: city > 0 ? getFactionName(city) : null,
        peezies: peeziesCount,
        patooties: patootiesCount,
        belugas: belugasCount
      }
    });
    
  } catch (error) {
    console.error('[QUTIE] Verify mint error:', error);
    res.status(500).json({ error: 'Failed to verify mint' });
  }
});

module.exports = router;