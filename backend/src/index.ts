import express, { Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { initDatabase, db } from './db.js';
import { alerts } from './schema.js';
import { eq, like, and, or, desc, sql } from 'drizzle-orm';
import { startPoller, loadRecentAlertIds, resolveLocationData, getCategoryMetadata } from './poller.js';
import { AlertData, CityInfo } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Dynamic client list for Server-Sent Events (SSE)
let sseClients: Response[] = [];

// Expose static files from frontend build
const frontendDist = path.join(__dirname, '../../frontend/dist');
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  console.log(`Serving static compiled frontend assets from: ${frontendDist}`);
} else {
  console.warn(`Frontend dist folder not found at ${frontendDist}. Running in API-only mode.`);
}

// Load static reference files
const citiesPath = path.join(__dirname, '../data/cities.json');
const polygonsPath = path.join(__dirname, '../data/polygons.json');

let citiesCache: CityInfo[] = [];
try {
  citiesCache = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));
} catch (err) {
  console.error('Failed to load cities for express routing cache.', err);
}

// Helper to expand English search terms to include Hebrew equivalents in citiesCache
function expandSearchTerm(searchTerm: string): string {
  if (!searchTerm) return '';
  // Split by whitespace and commas
  const tokens = searchTerm.split(/[\s,]+/).filter(Boolean);
  const extra: string[] = [];
  tokens.forEach(tok => {
    const lower = tok.toLowerCase();
    const city = citiesCache.find(c => c.name_en && c.name_en.toLowerCase() === lower);
    if (city && city.name) extra.push(city.name);
  });
  return extra.length ? `${searchTerm} ${extra.join(' ')}` : searchTerm;
}

// -------------------------------------------------------------
// REST API Endpoints
// -------------------------------------------------------------

// API Status indicator
app.get('/api/status', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: Date.now(),
    clientsConnected: sseClients.length,
    environment: process.env.NODE_ENV || 'development'
  });
});

// Serve Cities coordinates registry
app.get('/api/cities', (req, res) => {
  res.json(citiesCache);
});

// Serve GeoJSON polygons for zone rendering
app.get('/api/polygons', (req, res) => {
  try {
    if (fs.existsSync(polygonsPath)) {
      res.setHeader('Content-Type', 'application/json');
      fs.createReadStream(polygonsPath).pipe(res);
    } else {
      res.status(404).json({ error: 'Polygons GeoJSON database not found.' });
    }
  } catch (err: any) {
    res.status(500).json({ error: `Internal Server Error: ${err.message}` });
  }
});

// Server-Sent Events (SSE) endpoint for real-time alerts
app.get('/api/alerts/live', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // Send initial handshake
  res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

  sseClients.push(res);

  // Connection keep-alive heartbeat interval (15s)
  const heartbeat = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients = sseClients.filter(client => client !== res);
  });
});

// Standard Alert enricher utility for database outputs
function enrichAlertRow(row: any): AlertData {
  let locations: string[] = [];
  try {
    locations = JSON.parse(row.locations);
  } catch {
    locations = [row.locations];
  }

  const isDrill = row.isDrill === 1;
  const enrichment = resolveLocationData(locations);

  return {
    id: row.id,
    timestamp: row.timestamp,
    category: row.category,
    title: row.title,
    locations,
    locationsEn: enrichment.locationsEn,
    description: row.description || '',
    isDrill,
    coords: enrichment.coords,
    zones: enrichment.zones,
    zonesHe: enrichment.zonesHe,
    countdown: enrichment.countdown
  };
}

// Historical query with paging and multi-filters
app.get('/api/alerts/history', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const limit = parseInt(req.query.limit as string, 10) || 50;
    const offset = (page - 1) * limit;

    const search = (req.query.search as string) || '';
    const category = req.query.category ? parseInt(req.query.category as string, 10) : null;
    const isDrill = req.query.isDrill === 'true' ? 1 : req.query.isDrill === 'false' ? 0 : null;
    const startTimestamp = req.query.startTimestamp ? parseInt(req.query.startTimestamp as string, 10) : null;
    const endTimestamp = req.query.endTimestamp ? parseInt(req.query.endTimestamp as string, 10) : null;

    // Build conditional filters using drizzle sql
    const filters = [];

    if (search) {
      const expandedSearch = expandSearchTerm(search);
      filters.push(
        or(
          like(alerts.title, `%${expandedSearch}%`),
          like(alerts.locations, `%${expandedSearch}%`),
          like(alerts.description, `%${expandedSearch}%`)
        )
      );
    }
    if (category !== null) {
      filters.push(eq(alerts.category, category));
    }
    if (isDrill !== null) {
      filters.push(eq(alerts.isDrill, isDrill));
    }
    if (startTimestamp !== null) {
      filters.push(sql`${alerts.timestamp} >= ${startTimestamp}`);
    }
    if (endTimestamp !== null) {
      filters.push(sql`${alerts.timestamp} <= ${endTimestamp}`);
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    // Fetch alerts count
    const totalCountResult = await db.select({ count: sql<number>`count(*)` })
      .from(alerts)
      .where(whereClause);
    const totalItems = totalCountResult[0]?.count || 0;

    // Fetch alerts data
    const alertRows = await db.select()
      .from(alerts)
      .where(whereClause)
      .orderBy(desc(alerts.timestamp))
      .limit(limit)
      .offset(offset);

    const enrichedAlerts = alertRows.map(enrichAlertRow);

    res.json({
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit),
      data: enrichedAlerts
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to query history: ${err.message}` });
  }
});

// Aggregate Statistics Widget API with Filtering
app.get('/api/alerts/stats', async (req, res) => {
  try {
    const search = (req.query.search as string) || '';
    const category = req.query.category ? parseInt(req.query.category as string, 10) : null;
    const startTimestamp = req.query.startTimestamp ? parseInt(req.query.startTimestamp as string, 10) : null;
    const endTimestamp = req.query.endTimestamp ? parseInt(req.query.endTimestamp as string, 10) : null;

    const filters = [];
    if (search) {
      const expandedSearch = expandSearchTerm(search);
      filters.push(
        or(
          like(alerts.title, `%${expandedSearch}%`),
          like(alerts.locations, `%${expandedSearch}%`),
          like(alerts.description, `%${expandedSearch}%`)
        )
      );
    }
    if (category !== null && !isNaN(category)) {
      filters.push(eq(alerts.category, category));
    }
    if (startTimestamp !== null && !isNaN(startTimestamp)) {
      filters.push(sql`${alerts.timestamp} >= ${startTimestamp}`);
    }
    if (endTimestamp !== null && !isNaN(endTimestamp)) {
      filters.push(sql`${alerts.timestamp} <= ${endTimestamp}`);
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    // Fetch total alerts count matching filter
    const totalCountResult = await db.select({ count: sql<number>`count(*)` })
      .from(alerts)
      .where(whereClause);
    const totalAlerts = totalCountResult[0]?.count || 0;

    // Query threat distribution categories matching filter
    const categoryCounts = await db.select({
      category: alerts.category,
      count: sql<number>`count(*)`
    })
      .from(alerts)
      .where(whereClause)
      .groupBy(alerts.category);

    const categoriesDistribution = categoryCounts.map((row: any) => {
      const meta = getCategoryMetadata(row.category);
      return {
        category: row.category,
        label: meta.titleEn,
        count: row.count
      };
    });

    // Query top targeted cities & zones matching filter
    const allAlerts = await db.select({ locations: alerts.locations })
      .from(alerts)
      .where(whereClause);
      
    const zoneCounts: { [key: string]: number } = {};
    const cityCounts: { [key: string]: number } = {};

    allAlerts.forEach((row: any) => {
      let locations: string[] = [];
      try {
        locations = JSON.parse(row.locations);
      } catch {
        locations = [row.locations];
      }

      const enrichment = resolveLocationData(locations);
      
      enrichment.zones.forEach(z => {
        zoneCounts[z] = (zoneCounts[z] || 0) + 1;
      });

      enrichment.locationsEn.forEach(c => {
        cityCounts[c] = (cityCounts[c] || 0) + 1;
      });
    });

    const topZones = Object.entries(zoneCounts)
      .map(([zone, count]) => ({ zone, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const topCities = Object.entries(cityCounts)
      .map(([city, count]) => ({ city, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Timeline distributions (Hourly, Weekly, Yearly) from filtered database rows
    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => ({ hour, count: 0 }));
    const weeklyDistribution = Array.from({ length: 7 }, (_, day) => ({ day, count: 0 }));
    const yearlyCounts: { [key: number]: number } = {};
    
    const dbAlerts = await db.select({ timestamp: alerts.timestamp })
      .from(alerts)
      .where(whereClause);
      
    dbAlerts.forEach((row: any) => {
      const date = new Date(row.timestamp);
      
      // Hourly trend
      const hour = date.getHours();
      if (hour >= 0 && hour < 24) {
        hourlyDistribution[hour].count++;
      }
      
      // Weekly trend (0 = Sun, 1 = Mon, ..., 6 = Sat)
      const day = date.getDay();
      if (day >= 0 && day < 7) {
        weeklyDistribution[day].count++;
      }
      
      // Yearly trend
      const year = date.getFullYear();
      if (year > 2000) {
        yearlyCounts[year] = (yearlyCounts[year] || 0) + 1;
      }
    });

    const yearlyDistribution = Object.entries(yearlyCounts)
      .map(([year, count]) => ({ year: parseInt(year, 10), count }))
      .sort((a, b) => a.year - b.year);

    res.json({
      totalAlerts,
      categoriesDistribution,
      topZones,
      topCities,
      hourlyDistribution,
      weeklyDistribution,
      yearlyDistribution
    });
  } catch (err: any) {
    res.status(500).json({ error: `Failed to compile stats: ${err.message}` });
  }
});

// Single-container frontend routing fallback (SPA integration)
if (fs.existsSync(frontendDist)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// -------------------------------------------------------------
// Server Bootstrap
// -------------------------------------------------------------

async function main() {
  // 1. Initialize SQLite tables
  initDatabase();

  // 2. Pre-populate seen IDs from db
  await loadRecentAlertIds();

  // 3. Start Oref background poller
  startPoller((alert: AlertData) => {
    // Broadcast incoming alert payload to all connected SSE clients
    console.log(`📡 SSE Broadcast: [${alert.id}] ${alert.title} - ${alert.locationsEn.join(', ')}`);
    
    const ssePayload = JSON.stringify({ type: 'alert', data: alert });
    sseClients.forEach(client => {
      client.write(`data: ${ssePayload}\n\n`);
    });
  });

  // 4. Start Server listener
  app.listen(PORT, () => {
    console.log(`🚀 Israeli Alert Dashboard backend listening on port ${PORT}`);
  });
}

main().catch(err => {
  console.error('Fatal initialization failure.', err);
});
