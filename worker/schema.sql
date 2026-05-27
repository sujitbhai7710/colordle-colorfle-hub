-- ═══════════════════════════════════════════════════════════
-- Color Answers Hub — D1 Database Schema
-- Cloudflare D1 (SQLite-compatible)
-- ═══════════════════════════════════════════════════════════
-- This file is the single source of truth for the D1 schema.
-- The worker's initDB() function in src/index.ts runs this
-- schema on first boot. Any future schema changes should be:
--   1. Added here as a new migration section
--   2. Reflected in the SCHEMA_SQL constant in index.ts
--   3. Optionally paired with ALTER TABLE in initDB() for
--      zero-downtime migrations on existing databases
-- ═══════════════════════════════════════════════════════════

-- ── Colordle Answers ──
-- One row per day. date is YYYY-MM-DD in JST timezone.
CREATE TABLE IF NOT EXISTS colordle_answers (
  date TEXT PRIMARY KEY,
  day_number INTEGER NOT NULL,
  color_name TEXT NOT NULL,
  color_hex TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ── Colorfle Answers ──
-- One row per day. date is YYYY-MM-DD in JST timezone.
-- normal_answer/hard_answer are JSON arrays of RGB values.
-- normal_names/hard_names are JSON arrays of color name strings.
CREATE TABLE IF NOT EXISTS colorfle_answers (
  date TEXT PRIMARY KEY,
  day_number INTEGER NOT NULL,
  normal_answer TEXT NOT NULL,
  hard_answer TEXT NOT NULL,
  normal_names TEXT,
  hard_names TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ── Scrape Log ──
-- Tracks every scrape attempt for debugging and monitoring.
CREATE TABLE IF NOT EXISTS scrape_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- ── Indexes ──
CREATE INDEX IF NOT EXISTS idx_colordle_day ON colordle_answers(day_number);
CREATE INDEX IF NOT EXISTS idx_colorfle_day ON colorfle_answers(day_number);

-- ═══════════════════════════════════════════════════════════
-- MIGRATION HISTORY
-- ═══════════════════════════════════════════════════════════
-- v1 (initial): colordle_answers, colorfle_answers, scrape_log
-- v2 (2025-05): Added normal_names, hard_names to colorfle_answers
--   → Applied via ALTER TABLE in initDB() for existing databases
--   → Included in CREATE TABLE above for new databases
-- ═══════════════════════════════════════════════════════════
