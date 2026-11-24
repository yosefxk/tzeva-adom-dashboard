import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { CityInfo } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const citiesPath = path.join(__dirname, '../data/cities.json');

export let cities: CityInfo[] = [];
export const cityByName = new Map<string, CityInfo>();
export const cityByValue = new Map<string, CityInfo>();
export const cityByNameEn = new Map<string, CityInfo>();
export const cityToZone = new Map<string, string>();
export const zoneHeToEn = new Map<string, string>();
export const multiAreaRootNames = new Set<string>();

try {
  if (fs.existsSync(citiesPath)) {
    cities = JSON.parse(fs.readFileSync(citiesPath, 'utf8'));
    const rootCounts: Record<string, number> = {};

    for (const c of cities) {
      if (c.name) {
        cityToZone.set(c.name, c.zone || '');
        cityByName.set(c.name, c);
        const subParts = c.name.split(',');
        if (subParts.length > 1) {
          for (const sp of subParts) {
            const tr = sp.trim();
            if (tr && !cityByName.has(tr)) cityByName.set(tr, c);
          }
        }
      }
      if (c.value) cityByValue.set(c.value, c);
      if (c.name_en) {
        cityByNameEn.set(c.name_en.toLowerCase(), c);
        const rootName = c.name_en.split(' - ')[0].trim();
        rootCounts[rootName] = (rootCounts[rootName] || 0) + 1;
      }
      if (c.zone && c.zone_en && !zoneHeToEn.has(c.zone)) {
        zoneHeToEn.set(c.zone, c.zone_en);
      }
    }

    for (const [r, count] of Object.entries(rootCounts)) {
      if (count > 1) multiAreaRootNames.add(r);
    }

    console.log(`Loaded ${cities.length} cities from database (shared cache).`);
  }
} catch (err) {
  console.error('Failed to load cities.json database. Live mapping will be limited.', err);
}

// Resolves any raw alert location name to the canonical name in cities.json
export function getCanonicalCityName(rawName: string): string {
  const trimmed = rawName.trim();
  if (!trimmed) return rawName;

  // 1. Exact match via Map lookup
  let match = cityByName.get(trimmed) || cityByValue.get(trimmed);
  if (match) return match.name;

  // 2. Substring dash match
  if (trimmed.includes(' - ')) {
    const mainName = trimmed.split(' - ')[0].trim();
    match = cityByName.get(mainName) || cityByValue.get(mainName);
    if (match) return match.name;
  }

  // 3. Fallback to longest substring match to avoid short prefix collision
  let bestMatch: CityInfo | null = null;
  let maxLen = 0;
  for (const c of cities) {
    if (c.name && (trimmed.includes(c.name) || c.name.includes(trimmed))) {
      if (c.name.length > maxLen) {
        maxLen = c.name.length;
        bestMatch = c;
      }
    }
  }
  if (bestMatch) return bestMatch.name;

  return trimmed;
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
  let minCountdown = 90;

  for (const loc of locationsHebrew) {
    const trimmedLoc = loc.trim();
    if (!trimmedLoc) continue;

    let match = cityByName.get(trimmedLoc) || cityByValue.get(trimmedLoc);

    if (!match && trimmedLoc.includes(' - ')) {
      const mainName = trimmedLoc.split(' - ')[0].trim();
      match = cityByName.get(mainName) || cityByValue.get(mainName);
    }

    if (!match) {
      let bestSubMatch: CityInfo | null = null;
      let maxLen = 0;
      for (const c of cities) {
        if (c.name && (trimmedLoc.includes(c.name) || c.name.includes(trimmedLoc))) {
          if (c.name.length > maxLen) {
            maxLen = c.name.length;
            bestSubMatch = c;
          }
        }
      }
      match = bestSubMatch || undefined;
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
