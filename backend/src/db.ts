import { drizzle } from 'drizzle-orm/node-sqlite';
import { DatabaseSync } from 'node:sqlite';
import * as schema from './schema.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { sql, eq } from 'drizzle-orm';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbDir = process.env.DATABASE_DIR || path.join(__dirname, '../data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'alerts.db');
const sqlite = new DatabaseSync(dbPath);

export const db = drizzle({ client: sqlite, schema });

// Load cities cache helper for mapping locations to zones
let citiesCache: any[] = [];
const citiesPath = path.join(__dirname, '../data/cities.json');
try {
  if (fs.existsSync(citiesPath)) {
    citiesCache = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));
  }
} catch (err) {
  console.error('Failed to load cities for db mapping helper.', err);
}

const cityToZone = new Map<string, string>();
citiesCache.forEach(c => {
  if (c.name) {
    cityToZone.set(c.name, c.zone || '');
  }
});

// Resolves any raw alert location name to the canonical name in cities.json
export function getCanonicalCityName(rawName: string): string {
  const trimmed = rawName.trim();
  if (!trimmed) return rawName;

  // 1. Exact match
  let match = citiesCache.find(c => c.name === trimmed || c.value === trimmed);
  if (match) return match.name;

  // 2. Substring dash match
  const parts = trimmed.split(' - ');
  const mainName = parts[0].trim();
  match = citiesCache.find(c => c.name === mainName || c.value === mainName);
  if (match) return match.name;

  // 3. Fuzzy substring match (contains)
  match = citiesCache.find(c => trimmed.includes(c.name) || c.name.includes(trimmed));
  if (match) return match.name;

  return trimmed; // fallback to raw
}

// Helper to insert mapping records
export function insertAlertLocations(alertId: string, locations: string[]) {
  for (const loc of locations) {
    const canonicalName = getCanonicalCityName(loc);
    const zone = cityToZone.get(canonicalName) || '';
    db.insert(schema.alertLocations).values({
      alertId,
      cityName: canonicalName,
      zoneName: zone
    }).run();
  }
}

// Migration backfill for existing alerts in db
export function backfillAlertLocations(force: boolean = false) {
  const countResult = db.select({ count: sql<number>`count(*)` }).from(schema.alertLocations).get();
  const count = countResult?.count || 0;
  
  if (count === 0 || force) {
    if (force) {
      console.log('Force rebuild requested. Truncating alert_locations...');
      db.delete(schema.alertLocations).run();
    }

    const alertsCountResult = db.select({ count: sql<number>`count(*)` }).from(schema.alerts).get();
    const alertsCount = alertsCountResult?.count || 0;
    
    if (alertsCount > 0) {
      console.log(`Migrating alert_locations for ${alertsCount} existing alerts...`);
      
      const allAlerts = db.select({ id: schema.alerts.id, locations: schema.alerts.locations }).from(schema.alerts).all();
      const insertBuffer: { alertId: string; cityName: string; zoneName: string }[] = [];
      
      for (const alert of allAlerts) {
        try {
          const locs: string[] = JSON.parse(alert.locations);
          if (Array.isArray(locs)) {
            for (const loc of locs) {
              const canonicalName = getCanonicalCityName(loc);
              const zone = cityToZone.get(canonicalName) || '';
              insertBuffer.push({
                alertId: alert.id,
                cityName: canonicalName,
                zoneName: zone
              });
            }
          }
        } catch {
          // ignore
        }
      }
      
      console.log(`Inserting ${insertBuffer.length} alert location rows in batches of 1000...`);
      const BATCH_SIZE = 1000;
      for (let i = 0; i < insertBuffer.length; i += BATCH_SIZE) {
        const batch = insertBuffer.slice(i, i + BATCH_SIZE);
        db.transaction(() => {
          for (const row of batch) {
            db.insert(schema.alertLocations).values(row).run();
          }
        });
      }
      console.log('alert_locations migration completed successfully.');
    }
  }
}

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
    CREATE TABLE IF NOT EXISTS alert_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      alert_id TEXT NOT NULL,
      city_name TEXT NOT NULL,
      zone_name TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts (timestamp);
    CREATE INDEX IF NOT EXISTS idx_alert_locations_alert_id ON alert_locations (alert_id);
    CREATE INDEX IF NOT EXISTS idx_alert_locations_city_name ON alert_locations (city_name);
    CREATE INDEX IF NOT EXISTS idx_alert_locations_zone_name ON alert_locations (zone_name);
  `);
  console.log('Database tables verified/created successfully.');
  
  // Run backfill migration on startup if needed
  try {
    const checkLog = db.select().from(schema.syncLogs).where(eq(schema.syncLogs.event, 'canonical_backfill_v4_done')).get();
    if (!checkLog) {
      console.log('Running canonical alert_locations migration backfill (v4)...');
      backfillAlertLocations(true);
      db.insert(schema.syncLogs).values({
        timestamp: Date.now(),
        event: 'canonical_backfill_v4_done',
        details: 'Rebuild alert_locations with canonical names from cities.json'
      }).run();
    } else {
      backfillAlertLocations(false);
    }
  } catch (err) {
    console.error('Failed to run alert_locations backfill migration:', err);
  }
}
