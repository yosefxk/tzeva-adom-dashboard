import https from 'https';
import zlib from 'zlib';
import { db, insertAlertLocations } from './db.js';
import { alerts, syncLogs } from './schema.js';
import { desc } from 'drizzle-orm';
import { AlertData, OrefAlertRaw, TzofarAlertRaw } from './types.js';
import {
  cityByName,
  cityByValue,
  cityByNameEn,
  resolveLocationData,
} from './cities.js';

export { cityByName, cityByValue, cityByNameEn, resolveLocationData };

// Persistent keep-alive HTTPS agent to avoid per-poll TLS handshakes and axios memory leaks
const keepAliveAgent = new https.Agent({
  keepAlive: true,
  maxSockets: 2,
  keepAliveMsecs: 15000,
});

interface HttpResult {
  statusCode: number;
  headers: Record<string, string | string[] | undefined>;
  body: string;
}

class HttpStatusError extends Error {
  statusCode: number;
  constructor(statusCode: number) {
    super(`Request failed with status code ${statusCode}`);
    this.statusCode = statusCode;
  }
}

function httpsGetText(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number
): Promise<HttpResult> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn: () => void) => {
      if (!settled) {
        settled = true;
        fn();
      }
    };

    const req = https.get(
      url,
      {
        headers: {
          'Accept-Encoding': 'gzip, deflate',
          ...headers,
        },
        agent: keepAliveAgent,
        timeout: timeoutMs,
      },
      (res) => {
        const statusCode = res.statusCode || 0;

        if (statusCode === 304) {
          res.resume();
          done(() => resolve({ statusCode, headers: res.headers, body: '' }));
          return;
        }

        const encoding = (res.headers['content-encoding'] || '').toLowerCase();
        let stream: NodeJS.ReadableStream = res;
        if (encoding === 'gzip') {
          const gunzip = zlib.createGunzip();
          res.pipe(gunzip);
          stream = gunzip;
        } else if (encoding === 'deflate') {
          const inflate = zlib.createInflate();
          res.pipe(inflate);
          stream = inflate;
        }

        const chunks: Buffer[] = [];
        stream.on('data', (chunk: Buffer) => chunks.push(chunk));
        stream.on('error', (err) => done(() => reject(err)));
        stream.on('end', () => {
          const body = Buffer.concat(chunks).toString('utf8');
          if (statusCode >= 400) {
            done(() => reject(new HttpStatusError(statusCode)));
          } else {
            done(() => resolve({ statusCode, headers: res.headers, body }));
          }
        });
      }
    );

    req.on('error', (err) => done(() => reject(err)));
    req.on('timeout', () => {
      req.destroy();
      done(() => reject(new Error(`timeout of ${timeoutMs}ms exceeded`)));
    });
  });
}

// Bounded memory cache of seen alert IDs to prevent duplicate broadcasts
const seenAlertIds = new Set<string>();
const MAX_SEEN_IDS = 1000;

function trackSeenAlertId(id: string) {
  seenAlertIds.add(id);
  if (seenAlertIds.size > MAX_SEEN_IDS) {
    // Evict oldest half (Set preserves insertion order)
    const toRemove = seenAlertIds.size - Math.floor(MAX_SEEN_IDS / 2);
    let removed = 0;
    for (const existing of seenAlertIds) {
      seenAlertIds.delete(existing);
      if (++removed >= toRemove) break;
    }
  }
}

// Polling status
let isOrefBlocked = false;
let orefFailureCount = 0;
const MAX_OREF_FAILURES = 3;
let lastOrefEtag: string | null = null;

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

// Standardize Oref Alert Raw payload into unified AlertData
function standardizeOrefAlert(raw: OrefAlertRaw): AlertData {
  const cat = parseInt(raw.cat, 10);
  const isDrill = cat >= 100;
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

    recentAlerts.forEach((a: any) => trackSeenAlertId(a.id));
    console.log(`Initialized seenCache with ${seenAlertIds.size} alert IDs from database.`);
  } catch (err) {
    console.error('Failed to pre-populate seenAlertIds cache.', err);
  }
}

const OREF_URL = 'https://www.oref.org.il/warningMessages/alert/alerts.json';
const TZOFAR_HISTORY_URL = 'https://api.tzevaadom.co.il/alerts-history';
const OREF_HEADERS: Record<string, string> = {
  'Referer': 'https://www.oref.org.il/',
  'X-Requested-With': 'XMLHttpRequest',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36'
};

// Background poller setup
export function startPoller(onAlert: (alert: AlertData) => void) {
  console.log('Background Alert Poller service started.');

  // CloudFront caches alerts.json with max-age=4; 2500ms stays responsive while cutting idle polling 40%
  const OREF_INTERVAL = 2500;
  const TZOFAR_INTERVAL = 5000;

  async function poll() {
    if (!isOrefBlocked) {
      try {
        const reqHeaders = lastOrefEtag
          ? { ...OREF_HEADERS, 'If-None-Match': lastOrefEtag }
          : OREF_HEADERS;

        const response = await httpsGetText(OREF_URL, reqHeaders, 4000);
        orefFailureCount = 0;

        if (response.statusCode !== 304) {
          const etag = response.headers['etag'];
          if (typeof etag === 'string') lastOrefEtag = etag;

          const cleanedText = response.body.replace(/^\uFEFF/, '').trim();
          if (cleanedText) {
            const rawAlert: OrefAlertRaw = JSON.parse(cleanedText);
            if (rawAlert.id && !seenAlertIds.has(rawAlert.id)) {
              trackSeenAlertId(rawAlert.id);
              const alert = standardizeOrefAlert(rawAlert);

              const res = await db.insert(alerts).values({
                id: alert.id,
                timestamp: alert.timestamp,
                category: alert.category,
                title: alert.title,
                locations: JSON.stringify(alert.locations),
                description: alert.description,
                isDrill: alert.isDrill ? 1 : 0
              }).onConflictDoNothing();

              if (res.changes > 0) {
                insertAlertLocations(alert.id, alert.locations);
              }

              onAlert(alert);
            }
          }
        }
      } catch (err: any) {
        orefFailureCount++;
        console.warn(`Oref poll error (${orefFailureCount}/${MAX_OREF_FAILURES}): ${err.message}`);

        if (err.statusCode === 403 || orefFailureCount >= MAX_OREF_FAILURES) {
          isOrefBlocked = true;
          lastOrefEtag = null;
          console.error('Oref warning API geo-blocked or unreachable. Switching poller to Tzofar API fallback...');

          await db.insert(syncLogs).values({
            timestamp: Date.now(),
            event: 'OREF_BLOCKED',
            details: `Failed to poll oref.org.il. Error: ${err.message}`
          });
        }
      }

      setTimeout(poll, OREF_INTERVAL);
    } else {
      // Tzofar API Fallback Polling
      try {
        const response = await httpsGetText(
          TZOFAR_HISTORY_URL,
          { 'User-Agent': OREF_HEADERS['User-Agent'] },
          5000
        );

        const alertGroups: TzofarAlertRaw[] = JSON.parse(response.body);
        if (Array.isArray(alertGroups) && alertGroups.length > 0) {
          const sortedGroups = [...alertGroups].sort((a, b) => a.id - b.id);

          for (const group of sortedGroups) {
            for (const subAlert of group.alerts) {
              const syntheticId = `${group.id}_${subAlert.time}`;
              if (!seenAlertIds.has(syntheticId)) {
                trackSeenAlertId(syntheticId);

                let category = 1;
                let title = 'ירי רקטות וטילים';
                let desc = 'היכנסו למרחב המוגן ושהו בו 10 דקות';

                if (subAlert.threat === 5) {
                  category = 2;
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
                  timestamp: subAlert.time * 1000,
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

                const res = await db.insert(alerts).values({
                  id: alert.id,
                  timestamp: alert.timestamp,
                  category: alert.category,
                  title: alert.title,
                  locations: JSON.stringify(alert.locations),
                  description: alert.description,
                  isDrill: alert.isDrill ? 1 : 0
                }).onConflictDoNothing();

                if (res.changes > 0) {
                  insertAlertLocations(alert.id, alert.locations);
                }

                onAlert(alert);
              }
            }
          }
        }
      } catch (err: any) {
        console.error(`Tzofar poll error: ${err.message}`);
      }

      // Occasional Oref recovery attempts (~once per minute)
      if (Math.random() < 0.08) {
        console.log('Attempting to poll Oref warning API to check if block is lifted...');
        try {
          await httpsGetText(OREF_URL, OREF_HEADERS, 3000);
          console.log('Oref is reachable! Switching poller back to primary Oref API.');
          isOrefBlocked = false;
          orefFailureCount = 0;
        } catch {
          // Keep using Tzofar
        }
      }

      setTimeout(poll, TZOFAR_INTERVAL);
    }
  }

  // Kickoff polling loop
  setTimeout(poll, OREF_INTERVAL);

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

  let offset = 2 * 60 * 60 * 1000;
  if (match) {
    const [, m, d, y, hh, mm, ss] = match;
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
    const response = await httpsGetText(
      'https://alerts-history.oref.org.il/Shared/Ajax/GetAlarmsHistory.aspx?lang=he&mode=1',
      { 'User-Agent': OREF_HEADERS['User-Agent'] },
      6000
    );

    const data = JSON.parse(response.body);
    if (Array.isArray(data) && data.length > 0) {
      console.log(`Fetched ${data.length} historical entries from Oref history API.`);
      let added = 0;
      for (const raw of data) {
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
        if (res.changes > 0) {
          added++;
          insertAlertLocations(String(raw.rid || raw.matrix_id || localTimeMs), locations);
        }
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
    const response = await httpsGetText(TZOFAR_HISTORY_URL, { 'User-Agent': 'Mozilla/5.0' }, 6000);
    const alertGroups: TzofarAlertRaw[] = JSON.parse(response.body);
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
          if (res.changes > 0) {
            added++;
            insertAlertLocations(syntheticId, subAlert.cities);
          }
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
