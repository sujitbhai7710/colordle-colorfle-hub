-- Colordle answers table
CREATE TABLE IF NOT EXISTS colordle_answers (
  date TEXT PRIMARY KEY,
  day_number INTEGER NOT NULL,
  color_name TEXT NOT NULL,
  color_hex TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Colorfle answers table
CREATE TABLE IF NOT EXISTS colorfle_answers (
  date TEXT PRIMARY KEY,
  day_number INTEGER NOT NULL,
  normal_answer TEXT NOT NULL,
  hard_answer TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Scrape log
CREATE TABLE IF NOT EXISTS scrape_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT NOT NULL,
  status TEXT NOT NULL,
  message TEXT,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_colordle_day ON colordle_answers(day_number);
CREATE INDEX IF NOT EXISTS idx_colorfle_day ON colorfle_answers(day_number);
