// ============================================================
// Tree Plantation Calculator – API Routes
// ============================================================
// Provides the same endpoints as the Python/Flask backend:
//
//   GET  /api/health           → Health check
//   GET  /api/bootstrap        → Return all stored kv pairs
//   POST /api/store            → Bulk save {key, value} pairs
//   GET  /api/store/:key       → Read a single key
//   PUT  /api/store/:key       → Write a single key
//   DELETE /api/store/:key     → Delete a single key
// ============================================================

'use strict';

require('dotenv').config();
const express = require('express');
const router  = express.Router();
const { Pool } = require('pg');

// ── Postgres setup ─────────────────────────────────────────────
let pool;
try {
    let connectionString = process.env.DATABASE_URL;
    if (connectionString && connectionString.startsWith('postgres://')) {
        connectionString = connectionString.replace('postgres://', 'postgresql://');
    }

    if (!connectionString) {
        throw new Error('DATABASE_URL is not set');
    }

    pool = new Pool({
        connectionString,
        ssl: { rejectUnauthorized: false } // Required for some hosted Postgres like Supabase
    });

    // Create table if not exists
    pool.query(`
        CREATE TABLE IF NOT EXISTS kv_store (
            key   TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `).then(() => {
        console.log('✅ Postgres database connected & table ready.');
    }).catch(err => {
        console.error('⚠️  Failed to create table:', err.message);
    });
} catch (err) {
    console.warn('⚠️  Postgres setup failed – using in-memory store. Error:', err.message);
    pool = null;
}

// ── In-memory fallback ────────────────────────────────────────
const memStore = new Map();

// ── Helper functions ──────────────────────────────────────────
async function dbGet(key) {
    if (pool) {
        const result = await pool.query('SELECT value FROM kv_store WHERE key = $1', [key]);
        return result.rows.length ? result.rows[0].value : null;
    }
    return memStore.get(key) ?? null;
}

async function dbSet(key, value) {
    if (pool) {
        await pool.query(`
            INSERT INTO kv_store (key, value, updated_at)
            VALUES ($1, $2, CURRENT_TIMESTAMP)
            ON CONFLICT(key) DO UPDATE SET
                value = EXCLUDED.value,
                updated_at = CURRENT_TIMESTAMP
        `, [key, value]);
    } else {
        memStore.set(key, value);
    }
}

async function dbDelete(key) {
    if (pool) {
        await pool.query('DELETE FROM kv_store WHERE key = $1', [key]);
    } else {
        memStore.delete(key);
    }
}

async function dbAll() {
    if (pool) {
        const result = await pool.query('SELECT key, value FROM kv_store ORDER BY key');
        return result.rows;
    }
    return Array.from(memStore.entries()).map(([key, value]) => ({ key, value }));
}

// ── Health check ──────────────────────────────────────────────
router.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        platform: 'Tree Plantation Calculator',
        version: '2.0.0',
        backend: pool ? 'postgres' : 'in-memory',
        timestamp: new Date().toISOString()
    });
});

// ── Bootstrap: return ALL stored keys ────────────────────────
router.get('/bootstrap', async (req, res) => {
    try {
        const rows = await dbAll();
        const data = {};
        rows.forEach(row => { data[row.key] = row.value; });
        res.json({ status: 'ok', data, count: rows.length });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Bulk store: save multiple key-value pairs ─────────────────
router.post('/store', async (req, res) => {
    try {
        const items = Array.isArray(req.body) ? req.body : [req.body];
        let saved = 0;
        for (const item of items) {
            if (item.key && item.value !== undefined) {
                await dbSet(item.key, typeof item.value === 'string'
                    ? item.value
                    : JSON.stringify(item.value));
                saved++;
            }
        }
        res.json({ status: 'ok', saved });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Read single key ───────────────────────────────────────────
router.get('/store/:key', async (req, res) => {
    try {
        const val = await dbGet(req.params.key);
        if (val === null) return res.status(404).json({ error: 'Key not found' });
        res.json({ status: 'ok', key: req.params.key, value: val });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Write single key ──────────────────────────────────────────
router.put('/store/:key', async (req, res) => {
    try {
        const value = req.body.value !== undefined ? req.body.value : req.body;
        await dbSet(req.params.key, typeof value === 'string' ? value : JSON.stringify(value));
        res.json({ status: 'ok', key: req.params.key });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ── Delete single key ─────────────────────────────────────────
router.delete('/store/:key', async (req, res) => {
    try {
        await dbDelete(req.params.key);
        res.json({ status: 'ok', key: req.params.key, deleted: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
