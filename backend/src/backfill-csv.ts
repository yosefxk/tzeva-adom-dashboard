import axios from 'axios';
import { initDatabase, db } from './db.js';
import { alerts } from './schema.js';
import { sql } from 'drizzle-orm';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Threat type mapping
function getThreatCategory(threat: number) {
  switch (threat) {
    case 0:
      return { category: 1, title: 'ירי רקטות וטילים', desc: 'היכנסו למרחב המוגן ושהו בו 10 דקות' };
    case 1:
      return { category: 6, title: 'אירוע חומרים מסוכנים', desc: 'סגרו חלונות ודלתות' };
    case 2:
      return { category: 7, title: 'חדירת מחבלים', desc: 'היכנסו למבנה ונעלו דלתות' };
    case 3:
      return { category: 3, title: 'רעידת אדמה', desc: 'צאו לשטח פתוח' };
    case 4:
      return { category: 4, title: 'צונאמי', desc: 'התרחקו מחוף הים' };
    case 5:
      return { category: 2, title: 'חדירת כלי טיס עוין', desc: 'היכנסו למרחב המוגן ושהו בו 10 דקות' };
    case 6:
      return { category: 1, title: 'ירי טילים לא קונבנציונליים', desc: 'היכנסו למרחב המוגן' };
    case 7:
      return { category: 5, title: 'אירוע רדיולוגי', desc: 'היכנסו למרחב המוגן' };
    default:
      return { category: 8, title: 'התרעה כללית', desc: 'היכנסו למרחב המוגן' };
  }
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

// Custom CSV Line Parser to handle quoted values with commas
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

interface GroupedAlert {
  id: string;
  timestamp: number;
  category: number;
  title: string;
  locations: string[];
  description: string;
  isDrill: number;
}

export async function runCsvBackfill() {
  initDatabase();

  console.log('Downloading alarms.csv historical archive from yuval-harpaz/alarms (16.5MB)...');
  const csvUrl = 'https://raw.githubusercontent.com/yuval-harpaz/alarms/master/data/alarms.csv';
  
  const response = await axios.get(csvUrl, {
    responseType: 'text',
    maxContentLength: 50 * 1024 * 1024,
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });

  console.log('File downloaded. Splitting and parsing rows...');
  const lines = response.data.split(/\r?\n/);
  console.log(`Total rows in CSV file: ${lines.length}`);

  // Map to hold grouped alerts
  // Key can be `rid` if present and not "0", else `${time}_${threat}`
  const groupedMap = new Map<string, {
    time: string;
    threat: number;
    cities: Set<string>;
    description: string;
    rid: string;
  }>();

  // Parse lines (skipping header)
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = parseCSVLine(line);
    if (parts.length < 5) continue;

    const time = parts[0].trim();
    const city = parts[1].trim().replace(/^"|"$/g, '');
    const threat = parseInt(parts[2].trim(), 10);
    const description = parts[4].trim().replace(/^"|"$/g, '');
    const rid = parts[6] ? parts[6].trim() : '0';

    if (!time || !city || isNaN(threat)) continue;

    // Build unique grouping key
    const hasRid = rid && rid !== '0' && rid !== '0.0';
    const groupKey = hasRid ? `rid_${rid}` : `${time}_${threat}`;

    let group = groupedMap.get(groupKey);
    if (!group) {
      group = {
        time,
        threat,
        cities: new Set<string>(),
        description: description || 'היכנסו למרחב המוגן',
        rid: hasRid ? rid : ''
      };
      groupedMap.set(groupKey, group);
    }
    group.cities.add(city);
  }

  console.log(`Grouped CSV records into ${groupedMap.size} unique alert events.`);

  console.log('Inserting alert groups into the database in batches...');
  const allGroups = Array.from(groupedMap.entries());
  
  let inserted = 0;
  const BATCH_SIZE = 500;
  const insertBuffer: GroupedAlert[] = [];

  for (let idx = 0; idx < allGroups.length; idx++) {
    const [key, item] = allGroups[idx];
    
    let timestamp = 0;
    try {
      timestamp = parseIsraelTime(item.time);
    } catch {
      continue; // Skip malformed dates
    }

    const mapping = getThreatCategory(item.threat);
    const locations = Array.from(item.cities);

    // Build final ID
    let finalId = item.rid ? `csv_rid_${item.rid.replace('.0', '')}` : `csv_ts_${timestamp}_${item.threat}`;

    insertBuffer.push({
      id: finalId,
      timestamp,
      category: mapping.category,
      title: mapping.title,
      locations: locations, // will stringify during DB insert
      description: item.description || mapping.desc,
      isDrill: 0 // historical database does not log drill tags
    });

    if (insertBuffer.length >= BATCH_SIZE || idx === allGroups.length - 1) {
      // Execute batch insert in transaction
      db.transaction(() => {
        for (const record of insertBuffer) {
          db.insert(alerts).values({
            id: record.id,
            timestamp: record.timestamp,
            category: record.category,
            title: record.title,
            locations: JSON.stringify(record.locations),
            description: record.description,
            isDrill: record.isDrill
          }).onConflictDoNothing().run();
        }
      });
      inserted += insertBuffer.length;
      insertBuffer.length = 0; // Clear buffer

      if (inserted % 2500 === 0 || idx === allGroups.length - 1) {
        console.log(`[Database Sync] Saved ${inserted} / ${allGroups.length} alert events.`);
      }
    }
  }

  // Check the new database count
  const countResult = db.select({ count: sql<number>`count(*)` }).from(alerts).all();
  console.log(`\n🎉 CSV Backfill Complete!`);
  console.log(`Successfully processed and loaded ${countResult[0]?.count || 0} historical entries into alerts.db.`);
}

const isMain = process.argv[1] && (
  process.argv[1].endsWith('backfill-csv.ts') || 
  process.argv[1].endsWith('backfill-csv.js') ||
  (import.meta.url && fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1]))
);

if (isMain) {
  runCsvBackfill().catch(err => {
    console.error('Fatal CSV backfill failure.', err);
  });
}
