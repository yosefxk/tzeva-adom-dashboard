import axios from 'axios';
import { initDatabase, db } from './db.js';
import { alerts } from './schema.js';
import { TzofarAlertRaw } from './types.js';

// Threat type mapping
function getTzofarCategory(threat: number) {
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

// Helper for delays
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  initDatabase();

  console.log('Fetching latest alert group to determine highest ID...');
  let startId = 7600; // sensible default fallback
  try {
    const latestResp = await axios.get('https://api.tzevaadom.co.il/alerts-history', {
      headers: { 'User-Agent': 'Mozilla/5.0' }
    });
    if (Array.isArray(latestResp.data) && latestResp.data.length > 0) {
      startId = Math.max(...latestResp.data.map((g: any) => g.id));
      console.log(`Latest Tzofar alert group ID detected: ${startId}`);
    }
  } catch (err: any) {
    console.warn(`Failed to fetch latest ID, using default start ID ${startId}. Error: ${err.message}`);
  }

  console.log(`Starting historical archive backfill from ID ${startId} down to 1...`);
  
  // Stats
  let processed = 0;
  let inserted = 0;
  let skipped = 0;
  let errors = 0;
  let consecutive404s = 0;
  const maxConsecutive404s = 150; // Tolerance for gaps in sequential IDs

  // Request queue configuration
  const CONCURRENCY = 4; // Fetch 4 pages concurrently
  const PACING_DELAY = 450; // Pacing between requests (ms)

  // Worker loop
  let currentId = startId;
  const activeWorkers: Promise<void>[] = [];

  async function worker() {
    while (currentId > 0 && consecutive404s < maxConsecutive404s) {
      // Safely claim the next ID
      const targetId = currentId--;
      
      // Delay before requesting to respect pacing limits
      await sleep(Math.random() * PACING_DELAY);

      let success = false;
      let retries = 5;
      let delay = 1000;

      while (!success && retries > 0) {
        try {
          const resp = await axios.get(`https://api.tzevaadom.co.il/alerts-history/id/${targetId}`, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 5000
          });

          success = true;
          consecutive404s = 0; // reset gaps tracker
          
          const group = resp.data;
          if (group && Array.isArray(group.alerts)) {
            let groupAdded = 0;
            for (const subAlert of group.alerts) {
              const syntheticId = `${group.id}_${subAlert.time}`;
              const mapping = getTzofarCategory(subAlert.threat);

              const res = await db.insert(alerts).values({
                id: syntheticId,
                timestamp: subAlert.time * 1000,
                category: mapping.category,
                title: mapping.title,
                locations: JSON.stringify(subAlert.cities),
                description: mapping.desc,
                isDrill: subAlert.isDrill ? 1 : 0
              }).onConflictDoNothing();

              if (res.changes > 0) {
                groupAdded++;
              }
            }
            
            if (groupAdded > 0) {
              inserted += groupAdded;
            } else {
              skipped++;
            }
          }
        } catch (err: any) {
          if (err.response?.status === 404) {
            consecutive404s++;
            success = true; // exit retry loop, 404 is normal for ID gaps
          } else if (err.response?.status === 429) {
            console.warn(`[ID ${targetId}] Rate limited (429). Backing off for ${delay}ms... (Retries left: ${retries})`);
            await sleep(delay);
            delay *= 2; // exponential backoff
            retries--;
          } else {
            errors++;
            console.error(`[ID ${targetId}] Request failed: ${err.message}. Retrying in ${delay}ms...`);
            await sleep(delay);
            retries--;
          }
        }
      }

      processed++;

      // Log progress every 50 groups processed
      if (processed % 50 === 0) {
        console.log(`[Progress] Processed: ${processed} groups | Saved: ${inserted} alerts | Skipped (Already Exist/Empty): ${skipped} | ID Gaps: ${consecutive404s} | Current ID: ${targetId}`);
      }
    }
  }

  // Launch workers
  for (let i = 0; i < CONCURRENCY; i++) {
    activeWorkers.push(worker());
  }

  // Wait for all workers to finish
  await Promise.all(activeWorkers);

  console.log(`\n🎉 Backfill Complete!`);
  console.log(`Total alert groups processed: ${processed}`);
  console.log(`New alerts inserted: ${inserted}`);
  console.log(`Alerts skipped: ${skipped}`);
  console.log(`Request errors encountered: ${errors}`);
}

main().catch(err => {
  console.error('Fatal backfill failure.', err);
});
