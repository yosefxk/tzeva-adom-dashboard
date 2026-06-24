import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { alerts, syncLogs } from './schema.js';
import { eq, desc } from 'drizzle-orm';
import { AlertData, CityInfo, OrefAlertRaw, TzofarAlertRaw } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load cities database
const citiesPath = path.join(__dirname, '../data/cities.json');
let cities: CityInfo[] = [];

try {
  const fileData = fs.readFileSync(citiesPath, 'utf8');
  cities = JSON.parse(fileData);
  console.log(`Loaded ${cities.length} cities from database.`);
} catch (err) {
  console.error('Failed to load cities.json database. Live mapping will be limited.', err);
}

// Memory cache of seen alert IDs to prevent duplicate broadcasts
const seenAlertIds = new Set<string>();

// Polling status
let isOrefBlocked = false;
let orefFailureCount = 0;
const MAX_OREF_FAILURES = 3;

// Map Oref category to Tzofar-like text and category numbers
export function getCategoryMetadata(catNum: number) {
  switch (catNum) {
    case 1:
      return { titleEn: 'Missiles / Rockets', threat: 0 };
    case 2:
      return { titleEn: 'Hostile Aircraft Intrusion', threat: 5 };
    case 3:
      return { titleEn: 'Earthquake', threat: 3 };
    case 4:
      return { titleEn: 'Tsunami', threat: 4 };
    case 5:
      return { titleEn: 'Radiological Event', threat: 7 };
    case 6:
      return { titleEn: 'Hazardous Materials', threat: 1 };
    case 7:
      return { titleEn: 'Terrorist Infiltration', threat: 2 };
    case 13:
      return { titleEn: 'Event Concluded', threat: 8 };
    case 14:
      return { titleEn: 'Incoming Alert Warning', threat: 8 };
    // Drill variants
    case 101:
      return { titleEn: 'Missiles Drill', threat: 0 };
    case 102:
      return { titleEn: 'Hostile Aircraft Drill', threat: 5 };
    case 103:
      return { titleEn: 'Earthquake Drill', threat: 3 };
    case 104:
      return { titleEn: 'Tsunami Drill', threat: 4 };
    case 105:
      return { titleEn: 'Radiological Drill', threat: 7 };
    case 106:
      return { titleEn: 'Hazardous Materials Drill', threat: 1 };
    case 107:
      return { titleEn: 'Terrorist Infiltration Drill', threat: 2 };
    default:
      return { titleEn: 'General Alert', threat: 8 };
  }
}

// Clean and resolve Hebrew city strings into coordinates and English data
export function resolveLocationData(locationsHebrew: string[]): {
  locationsEn: string[];
  coords: Array<{ lat: number; lng: number; label: string; labelEn: string }>;
  zones: string[];
  zonesHe: string[];
  countdown: number;
} {
  const locationsEn: string[] = [];
  const coords: Array<{ lat: number; lng: number; label: string; labelEn: string }> = [];
  const zones = new Set<string>();
  const zonesHe = new Set<string>();
  let minCountdown = 90; // Default max countdown

  for (const loc of locationsHebrew) {
    const trimmedLoc = loc.trim();
    if (!trimmedLoc) continue;

    // Search matches in cities.json
    let match = cities.find(c => c.name === trimmedLoc || c.value === trimmedLoc);

    // Substring fallback
    if (!match) {
      const parts = trimmedLoc.split(' - ');
      const mainName = parts[0].trim();
      match = cities.find(c => c.name === mainName || c.value === mainName);
    }

    if (!match) {
      // Fuzzy substring fallback
      match = cities.find(c => trimmedLoc.includes(c.name) || c.name.includes(trimmedLoc));
    }

    if (match) {
      locationsEn.push(match.name_en);
      if (match.lat && match.lng) {
        coords.push({
          lat: match.lat,
          lng: match.lng,
          label: match.name,
          labelEn: match.name_en
        });
      }
      if (match.zone_en) zones.add(match.zone_en);
      if (match.zone) zonesHe.add(match.zone);
      if (match.countdown !== undefined && match.countdown < minCountdown) {
        minCountdown = match.countdown;
      }
    } else {
      // Unresolved defaults
      locationsEn.push(trimmedLoc);
    }
  }

  return {
    locationsEn,
    coords,
    zones: Array.from(zones),
    zonesHe: Array.from(zonesHe),
    countdown: minCountdown
  };
}

// Standardize Oref Alert Raw payload into unified AlertData
function standardizeOrefAlert(raw: OrefAlertRaw): AlertData {
  const cat = parseInt(raw.cat, 10);
  const isDrill = cat >= 100;
  const meta = getCategoryMetadata(cat);
  const enrichment = resolveLocationData(raw.data);

  return {
    id: raw.id,
    timestamp: Date.now(),
    category: cat,
    title: raw.title,
    locations: raw.data,
    locationsEn: enrichment.locationsEn,
    description: raw.desc || '',
    isDrill,
    coords: enrichment.coords,
    zones: enrichment.zones,
    zonesHe: enrichment.zonesHe,
    countdown: enrichment.countdown
  };
}

// Initialize seen alert IDs from Database so we don't duplicate on restarts
export async function loadRecentAlertIds() {
  try {
    const recentAlerts = await db.select({ id: alerts.id })
      .from(alerts)
      .orderBy(desc(alerts.timestamp))
      .limit(100);
      
    recentAlerts.forEach((a: any) => seenAlertIds.add(a.id));
    console.log(`Initialized seenCache with ${seenAlertIds.size} alert IDs from database.`);
  } catch (err) {
    console.error('Failed to pre-populate seenAlertIds cache.', err);
  }
}

// Background poller setup
export function startPoller(onAlert: (alert: AlertData) => void) {
  console.log('Background Alert Poller service started.');

  // Polling intervals
  const OREF_INTERVAL = 1500;
  const TZOFAR_INTERVAL = 4000;

  let timerId: NodeJS.Timeout | null = null;

  async function poll() {
    if (!isOrefBlocked) {
      try {
        const response = await axios.get('https://www.oref.org.il/warningMessages/alert/alerts.json', {
          headers: {
            'Referer': 'https://www.oref.org.il/',
            'X-Requested-With': 'XMLHttpRequest',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
          },
          timeout: 4000,
          responseType: 'text' // Read text to clean BOM
        });

        orefFailureCount = 0; // reset failures on success

        // Clean UTF-8 BOM if present
        const cleanedText = (response.data as string).replace(/^\uFEFF/, '').trim();
        if (cleanedText) {
          const rawAlert: OrefAlertRaw = JSON.parse(cleanedText);
          if (rawAlert.id && !seenAlertIds.has(rawAlert.id)) {
            seenAlertIds.add(rawAlert.id);
            const alert = standardizeOrefAlert(rawAlert);

            // Persist to database
            await db.insert(alerts).values({
              id: alert.id,
              timestamp: alert.timestamp,
              category: alert.category,
              title: alert.title,
              locations: JSON.stringify(alert.locations),
              description: alert.description,
              isDrill: alert.isDrill ? 1 : 0
            }).onConflictDoNothing();

            onAlert(alert);
          }
        }
      } catch (err: any) {
        orefFailureCount++;
        console.warn(`Oref poll error (${orefFailureCount}/${MAX_OREF_FAILURES}): ${err.message}`);
        
        if (err.response?.status === 403 || orefFailureCount >= MAX_OREF_FAILURES) {
          isOrefBlocked = true;
          console.error('Oref warning API geo-blocked or unreachable. Switching poller to Tzofar API fallback...');
          
          await db.insert(syncLogs).values({
            timestamp: Date.now(),
            event: 'OREF_BLOCKED',
            details: `Failed to poll oref.org.il. Error: ${err.message}`
          });
        }
      }
      
      timerId = setTimeout(poll, OREF_INTERVAL);
    } else {
      // Tzofar API Fallback Polling
      try {
        const response = await axios.get('https://api.tzevaadom.co.il/alerts-history', {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
          },
          timeout: 5000
        });

        const alertGroups: TzofarAlertRaw[] = response.data;
        if (Array.isArray(alertGroups) && alertGroups.length > 0) {
          // Process alert groups in reverse order (oldest first) to preserve chronologies
          const sortedGroups = [...alertGroups].sort((a, b) => a.id - b.id);

          for (const group of sortedGroups) {
            for (const subAlert of group.alerts) {
              const syntheticId = `${group.id}_${subAlert.time}`;
              if (!seenAlertIds.has(syntheticId)) {
                seenAlertIds.add(syntheticId);

                // Map Tzofar threat numbers to Oref category numbers
                let category = 1; // Default Missiles
                let title = 'ירי רקטות וטילים';
                let desc = 'היכנסו למרחב המוגן ושהו בו 10 דקות';

                if (subAlert.threat === 5) {
                  category = 2; // Hostile aircraft
                  title = 'חדירת כלי טיס עוין';
                  desc = 'היכנסו למרחב המוגן ושהו בו 10 דקות';
                } else if (subAlert.threat === 3) {
                  category = 3;
                  title = 'רעידת אדמה';
                  desc = 'צאו לשטח פתוח';
                } else if (subAlert.threat === 2) {
                  category = 7;
                  title = 'חדירת מחבלים';
                  desc = 'היכנסו למבנה ונעלו דלתות';
                } else if (subAlert.threat === 1) {
                  category = 6;
                  title = 'אירוע חומרים מסוכנים';
                  desc = 'סגרו חלונות ודלתות';
                }

                const enrichment = resolveLocationData(subAlert.cities);

                const alert: AlertData = {
                  id: syntheticId,
                  timestamp: subAlert.time * 1000, // Unix timestamp in seconds to ms
                  category,
                  title,
                  locations: subAlert.cities,
                  locationsEn: enrichment.locationsEn,
                  description: desc,
                  isDrill: subAlert.isDrill,
                  coords: enrichment.coords,
                  zones: enrichment.zones,
                  zonesHe: enrichment.zonesHe,
                  countdown: enrichment.countdown
                };

                // Persist to DB
                await db.insert(alerts).values({
                  id: alert.id,
                  timestamp: alert.timestamp,
                  category: alert.category,
                  title: alert.title,
                  locations: JSON.stringify(alert.locations),
                  description: alert.description,
                  isDrill: alert.isDrill ? 1 : 0
                }).onConflictDoNothing();

                onAlert(alert);
              }
            }
          }
        }
      } catch (err: any) {
        console.error(`Tzofar poll error: ${err.message}`);
      }

      // Occasional Oref recovery attempts (every 12th poll ~ 48s)
      if (Math.random() < 0.08) {
        console.log('Attempting to poll Oref warning API to check if block is lifted...');
        try {
          await axios.get('https://www.oref.org.il/warningMessages/alert/alerts.json', {
            headers: {
              'Referer': 'https://www.oref.org.il/',
              'X-Requested-With': 'XMLHttpRequest',
              'User-Agent': 'Mozilla/5.0'
            },
            timeout: 3000
          });
          console.log('Oref is reachable! Switching poller back to primary Oref API.');
          isOrefBlocked = false;
          orefFailureCount = 0;
        } catch {
          // Keep using Tzofar
        }
      }

      timerId = setTimeout(poll, TZOFAR_INTERVAL);
    }
  }

  // Kickoff polling loop
  timerId = setTimeout(poll, OREF_INTERVAL);

  // Sync historical alerts on startup in the background
  syncHistoryStartup();
}

// Helper to parse local Israel time strings into timezone-independent UTC epoch ms
function parseIsraelTime(dateStr: string): number {
  const normalized = dateStr.replace('T', ' ');
  const [datePart, timePart] = normalized.split(' ');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute, second] = timePart.split(':').map(Number);

  const approxUtc = Date.UTC(year, month - 1, day, hour, minute, second || 0);
  const tempDate = new Date(approxUtc);
  const tzString = tempDate.toLocaleString('en-US', { timeZone: 'Asia/Jerusalem', hour12: false });
  const match = tzString.match(/(\d+)\/(\d+)\/(\d+),\s+(\d+):(\d+):(\d+)/);
  
  let offset = 2 * 60 * 60 * 1000; // default UTC+2
  if (match) {
    const [_, m, d, y, hh, mm, ss] = match;
    const tzUtc = Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss));
    offset = tzUtc - approxUtc;
  }
  
  return approxUtc - offset;
}

// Sync Oref/Tzofar history on startup to pre-fill database
async function syncHistoryStartup() {
  console.log('Database history sync initiated...');
  
  // 1. Try fetching Oref history
  try {
    const response = await axios.get('https://alerts-history.oref.org.il/Shared/Ajax/GetAlarmsHistory.aspx?lang=he&mode=1', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
      },
      timeout: 6000
    });

    if (Array.isArray(response.data) && response.data.length > 0) {
      console.log(`Fetched ${response.data.length} historical entries from Oref history API.`);
      let added = 0;
      for (const raw of response.data) {
        // Raw date is local Israel time, parse it to UTC ms timestamp
        const localTimeMs = parseIsraelTime(raw.alertDate);
        const locations = [raw.data];
        const isDrill = raw.category >= 100;
        
        const res = await db.insert(alerts).values({
          id: String(raw.rid || raw.matrix_id || localTimeMs),
          timestamp: localTimeMs,
          category: raw.category,
          title: raw.title,
          locations: JSON.stringify(locations),
          description: raw.category_desc || '',
          isDrill: isDrill ? 1 : 0
        }).onConflictDoNothing();
        if (res.changes > 0) added++;
      }
      
      console.log(`Database populated with ${added} new historical alerts from Oref.`);
      await db.insert(syncLogs).values({
        timestamp: Date.now(),
        event: 'SYNC_OREF_SUCCESS',
        details: `Successfully synced ${added} alerts from Oref.`
      });
      return;
    }
  } catch (err: any) {
    console.warn(`Oref history sync failed or was blocked: ${err.message}. Trying Tzofar history fallback...`);
  }

  // 2. Fallback to Tzofar history
  try {
    const response = await axios.get('https://api.tzevaadom.co.il/alerts-history', {
      headers: {
        'User-Agent': 'Mozilla/5.0'
      },
      timeout: 6000
    });

    const alertGroups: TzofarAlertRaw[] = response.data;
    if (Array.isArray(alertGroups) && alertGroups.length > 0) {
      let added = 0;
      for (const group of alertGroups) {
        for (const subAlert of group.alerts) {
          const syntheticId = `${group.id}_${subAlert.time}`;
          
          let category = 1;
          let title = 'ירי רקטות וטילים';
          if (subAlert.threat === 5) {
            category = 2;
            title = 'חדירת כלי טיס עוין';
          } else if (subAlert.threat === 3) {
            category = 3;
            title = 'רעידת אדמה';
          } else if (subAlert.threat === 2) {
            category = 7;
            title = 'חדירת מחבלים';
          }

          const res = await db.insert(alerts).values({
            id: syntheticId,
            timestamp: subAlert.time * 1000,
            category,
            title,
            locations: JSON.stringify(subAlert.cities),
            description: 'היכנסו למרחב המוגן',
            isDrill: subAlert.isDrill ? 1 : 0
          }).onConflictDoNothing();
          if (res.changes > 0) added++;
        }
      }
      console.log(`Database populated with ${added} new historical alerts from Tzofar fallback.`);
      await db.insert(syncLogs).values({
        timestamp: Date.now(),
        event: 'SYNC_TZOFAR_SUCCESS',
        details: `Successfully synced ${added} alerts from Tzofar.`
      });
    }
  } catch (err: any) {
    console.error(`Tzofar history sync failed: ${err.message}`);
  }
}
