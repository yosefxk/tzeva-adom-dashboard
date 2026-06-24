import { drizzle } from 'drizzle-orm/node-sqlite';
import { DatabaseSync } from 'node:sqlite';
import * as schema from './schema.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = process.env.DATABASE_DIR || path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'alerts.db');
const sqlite = new DatabaseSync(dbPath);

export const db = drizzle({ client: sqlite, schema });

export function initDatabase() {
  console.log(`Database connected (native node:sqlite) at: ${dbPath}`);
  
  // Dynamic table creation fallback
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS alerts (
      id TEXT PRIMARY KEY,
      timestamp INTEGER NOT NULL,
      category INTEGER NOT NULL,
      title TEXT NOT NULL,
      locations TEXT NOT NULL,
      description TEXT,
      is_drill INTEGER NOT NULL DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp INTEGER NOT NULL,
      event TEXT NOT NULL,
      details TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts (timestamp);
  `);
  console.log('Database tables verified/created successfully.');
}
