import type { BoundingBox } from "./geo";
import type { City, Property } from "./types";

/**
 * Rent histogram bounds and bucket count. These MUST match the frontend slider
 * bounds (`RENT_BOUNDS` in lib/filters.ts) so the bars line up with the control.
 */
export const RENT_STATS_BOUNDS = { min: 1400, max: 5200 } as const;
export const RENT_HISTOGRAM_BUCKETS = 24;

export type CityStat = { city: City; count: number; bbox: BoundingBox };

export type PropertyStats = {
  histogram: number[];
  bounds: { min: number; max: number };
  buckets: number;
  count: number;
  cities: CityStat[];
};

/**
 * Bin a list of rents into a fixed-width count-per-bucket histogram over
 * [bounds.min, bounds.max]. O(n) to build, O(1) to index while rendering, and
 * already ordered by price. Rents outside the bounds clamp into the edge
 * buckets so nothing is dropped.
 */
export function buildRentHistogram(
  rents: number[],
  bounds: { min: number; max: number } = RENT_STATS_BOUNDS,
  buckets: number = RENT_HISTOGRAM_BUCKETS
): number[] {
  const counts = new Array<number>(buckets).fill(0);
  const span = bounds.max - bounds.min;
  if (span <= 0 || buckets <= 0) {
    return counts;
  }
  for (const rent of rents) {
    if (!Number.isFinite(rent)) {
      continue;
    }
    const clamped = Math.min(Math.max(rent, bounds.min), bounds.max);
    const idx = Math.min(buckets - 1, Math.floor(((clamped - bounds.min) / span) * buckets));
    counts[idx] += 1;
  }
  return counts;
}

/**
 * Whole-market aggregates computed server-side, so the client fetches a small
 * summary — a rent histogram plus each city's extent — instead of downloading
 * every row just to shape the price control and the search fallback.
 */
export function computeStats(properties: Property[]): PropertyStats {
  const histogram = buildRentHistogram(properties.map((property) => property.rent));

  const byCity = new Map<City, { count: number; bbox: BoundingBox }>();
  for (const { city, lat, lng } of properties) {
    const entry = byCity.get(city);
    if (!entry) {
      byCity.set(city, { count: 1, bbox: { minLat: lat, minLng: lng, maxLat: lat, maxLng: lng } });
    } else {
      entry.count += 1;
      entry.bbox.minLat = Math.min(entry.bbox.minLat, lat);
      entry.bbox.minLng = Math.min(entry.bbox.minLng, lng);
      entry.bbox.maxLat = Math.max(entry.bbox.maxLat, lat);
      entry.bbox.maxLng = Math.max(entry.bbox.maxLng, lng);
    }
  }

  const cities: CityStat[] = [...byCity.entries()].map(([city, { count, bbox }]) => ({
    city,
    count,
    bbox
  }));

  return {
    histogram,
    bounds: { min: RENT_STATS_BOUNDS.min, max: RENT_STATS_BOUNDS.max },
    buckets: RENT_HISTOGRAM_BUCKETS,
    count: properties.length,
    cities
  };
}
