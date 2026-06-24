export interface CityInfo {
  id: number;
  name: string;
  name_en: string;
  name_ru: string;
  name_ar: string;
  zone: string;
  zone_en: string;
  countdown: number;
  lat: number;
  lng: number;
  value: string;
}

export interface OrefAlertRaw {
  id: string; // numerical string, e.g. "134168709720000000"
  cat: string; // numeric string, e.g. "1" (missiles)
  title: string; // e.g. "ירי רקטות וטילים"
  data: string[]; // array of affected cities in Hebrew (e.g. ["תל אביב - מרכז", "רמת גן - מערב"])
  desc: string; // instructions in Hebrew
}

export interface TzofarAlertRaw {
  id: number;
  description: string | null;
  alerts: Array<{
    time: number; // unix timestamp (seconds)
    cities: string[]; // array of cities in Hebrew
    threat: number; // threat type code
    isDrill: boolean;
  }>;
}

export interface AlertData {
  id: string;
  timestamp: number; // millisecond timestamp
  category: number;
  title: string;
  locations: string[]; // Hebrew locations
  locationsEn: string[]; // English resolved locations
  description: string;
  isDrill: boolean;
  coords: Array<{ lat: number; lng: number; label: string; labelEn: string }>;
  zones: string[]; // English zones
  zonesHe: string[]; // Hebrew zones
  countdown: number; // minimum countdown seconds in this alert
}
