/* eslint-disable no-console */
require('dotenv').config();

const express      = require('express');
const mongoose     = require('mongoose');
const cors         = require('cors');
const cookieParser = require('cookie-parser');
const { verifyToken, verifyTokenAndAdmin } = require('./middleware/verifyToken');

const app = express();

// Always vary by Origin for CDN/proxy correctness
app.use((req, res, next) => { res.header('Vary', 'Origin'); next(); });

// CORS
const allowedOrigins = (
  process.env.CORS_ORIGINS || process.env.FRONTEND_URL || ''
).split(',').map(s => s.trim()).filter(Boolean);

const corsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);
    if (allowedOrigins.length === 0) return cb(null, true);
    return cb(null, allowedOrigins.includes(origin));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Wallet-Address'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

// ── Public routes ──────────────────────────────────────────────────────────

app.use('/api/auth',        require('./routes/auth.routes'));
app.use('/api/auth/google', require('./routes/auth.google.routes'));

// Music tracks (GET is open; admin write operations are protected per-route)
app.use('/api/tracks', require('./routes/tracks.routes'));

// ── Protected routes (require JWT) ────────────────────────────────────────

// PaMs Dance Studio — AI video generation pipeline
app.options('/api/pams-studio/*', cors(corsOptions));
app.use('/api/pams-studio', cors(corsOptions), verifyToken, require('./routes/pams.studio.routes'));

// Studio (legacy QutieChum pipeline)
app.use('/api/studio/generate', verifyToken, require('./routes/studio.generate.routes'));
app.use('/api/studio/stitch',   verifyToken, require('./routes/studio.stitch.routes'));
app.use('/api/studio',          verifyToken, require('./routes/studio.routes'));

// NFT ownership verification
app.use('/api/nft', verifyToken, require('./routes/nft.routes'));

// 404
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// DB + server startup
const PORT      = process.env.PORT || 10000;
const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI;

mongoose.set('strictQuery', true);
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('[DB] Mongo connected');
    app.listen(PORT, () =>
      console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`)
    );
  })
  .catch((err) => {
    console.error('[DB] Connection error:', err?.message || err);
    process.exit(1);
  });
