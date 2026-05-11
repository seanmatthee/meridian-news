/**
 * geo.ts — Geographic registry for news sources.
 * Maps publications to their primary city and provides 3D math for the globe.
 */

// 2. External libs
import * as THREE from "three";

// ─── TYPES ───────────────────────────────────────
export type ActiveCity = {
  city: keyof typeof NEWS_CITIES;
  intensity: number; // 0..1, scaled from recent-story count
};

// ─── CONSTANTS ───────────────────────────────────
export const NEWS_CITIES = {
  nyc:        { lat: 40.7128, lng: -74.0060, label: "New York" },
  london:     { lat: 51.5074, lng:  -0.1278, label: "London" },
  jhb:        { lat: -26.2041, lng: 28.0473, label: "Johannesburg" },
  capeTown:   { lat: -33.9249, lng: 18.4241, label: "Cape Town" },
  doha:       { lat: 25.2854, lng:  51.5310, label: "Doha" },
  tokyo:      { lat: 35.6762, lng: 139.6503, label: "Tokyo" },
  beijing:    { lat: 39.9042, lng: 116.4074, label: "Beijing" },
  moscow:     { lat: 55.7558, lng:  37.6173, label: "Moscow" },
  sf:         { lat: 37.7749, lng:-122.4194, label: "San Francisco" },
  brussels:   { lat: 50.8503, lng:   4.3517, label: "Brussels" },
  mumbai:     { lat: 19.0760, lng:  72.8777, label: "Mumbai" },
  singapore:  { lat:  1.3521, lng: 103.8198, label: "Singapore" },
} as const;

export const SOURCE_TO_CITY: Record<string, keyof typeof NEWS_CITIES> = {
  // AI
  "TechCrunch":      "sf",
  "The Verge":       "nyc",
  "Hacker News":     "sf",
  // World
  "BBC World":       "london",
  "The Guardian World": "london",
  "Al Jazeera":      "doha",
  // Business
  "BBC Business":    "london",
  "The Guardian Business": "london",
  "Bloomberg":       "nyc",
  // Finance
  "Moneyweb":        "jhb",
  "MarketWatch":     "nyc",
  "Financial Times": "london",
  // South Africa
  "News24":          "jhb",
  "Daily Maverick":  "capeTown",
  "MyBroadband":     "jhb",
};

// ─── HELPERS ─────────────────────────────────────
export function latLngToVec3(lat: number, lng: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
     radius * Math.cos(phi),
     radius * Math.sin(phi) * Math.sin(theta)
  );
}
