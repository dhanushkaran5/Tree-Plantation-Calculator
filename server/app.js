// ============================================================
// Tree Plantation Calculator – Express.js Backend
// ============================================================
// Provides the same REST API as the Python Flask backend so
// users can run either. All ecotree_* localStorage keys are
// persisted in a PostgreSQL database for cross-device sync.
//
// Usage:
//   npm install
//   npm start          → http://localhost:5000
//   npm run dev        → auto-restart on file changes
// ============================================================

'use strict';

const express    = require('express');
const cors       = require('cors');
const path       = require('path');
const compression = require('compression');
const apiRoutes  = require('./routes/api');

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ──────────────────────────────────────────────
app.use(compression());
const corsOrigin = process.env.FRONTEND_URL || '*';
app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Static files: serve the frontend directly ───────────────
const LEGACY_DIR = path.join(__dirname, '..', 'legacy');
app.use(express.static(LEGACY_DIR));

// ── API Routes ──────────────────────────────────────────────
app.use('/api', apiRoutes);

// ── Root redirect (fallback) ────────────────────────────────
app.get('/', (req, res) => {
    res.sendFile(path.join(LEGACY_DIR, 'index.html'));
});

// ── 404 handler ─────────────────────────────────────────────
app.use((req, res) => {
    res.status(404).json({ error: 'Not Found', path: req.path });
});

// ── Error handler ────────────────────────────────────────────
app.use((err, req, res, _next) => {
    console.error('Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error', message: err.message });
});

// ── Start ────────────────────────────────────────────────────
app.listen(PORT, () => {
    const hostUrl = process.env.BACKEND_URL || `http://0.0.0.0:${PORT}`;
    console.log(`\n🌿 Tree Plantation Calculator Server`);
    console.log(`   Running on PORT: ${PORT} (${hostUrl})`);
    console.log(`   Health Check:    /api/health`);
    console.log(`   Press Ctrl+C to stop.\n`);
});

module.exports = app;
