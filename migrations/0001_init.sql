-- Cloudflare D1 schema for savecolor

CREATE TABLE IF NOT EXISTS signatures (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  agreed INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS support_comments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  message TEXT NOT NULL,
  likes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS faq (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category TEXT NOT NULL,
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  sources TEXT NOT NULL DEFAULT '[]'
);

CREATE INDEX IF NOT EXISTS idx_signatures_created ON signatures(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_signatures_email ON signatures(email);
CREATE INDEX IF NOT EXISTS idx_comments_created ON support_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_faq_category ON faq(category);
