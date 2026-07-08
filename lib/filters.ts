import { PROPERTY_TYPES, type BoundingBox, type PropertyFilter, type PropertyType } from "./types";

/** Rent slider bounds; the seed data spans roughly $1,541–$5,099/mo. */
export const RENT_BOUNDS = { min: 1400, max: 5200, step: 50 } as const;

export const BEDROOM_OPTIONS = [1, 2, 3, 4] as const;
export const BATHROOM_OPTIONS = [1, 2, 3] as const;

/**
 * Client-side free-text search over the already-loaded listings. The viewport
 * query does the heavy geospatial work; this just narrows what's on screen by
 * name/place, instantly and with no backend round-trip. Case-insensitive; every
 * whitespace-separated token must appear somewhere in the listing's title,
 * street, city, or type (AND), so "burnaby condo" matches a Burnaby condo. An
 * empty query returns the list unchanged.
 */
export function searchProperties<
  T extends { title: string; street: string; city: string; propertyType: string }
>(properties: T[], query: string): T[] {
  const tokens = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) {
    return properties;
  }
  return properties.filter((property) => {
    const haystack =
      `${property.title} ${property.street} ${property.city} ${property.propertyType}`.toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}

/** Number of filter dimensions currently constraining results. */
export function countActiveFilters(filter: PropertyFilter): number {
  let count = 0;
  if (filter.minRent !== undefined || filter.maxRent !== undefined) count += 1;
  if (filter.bedrooms !== undefined) count += 1;
  if (filter.bathrooms !== undefined) count += 1;
  if (filter.propertyTypes !== undefined && filter.propertyTypes.length > 0) count += 1;
  return count;
}

function parseIntInRange(raw: string | null, min: number, max: number): number | undefined {
  if (!raw) {
    return undefined;
  }
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    return undefined;
  }
  return value;
}

/**
 * Parse browse-page state from a URL query string. Lenient by design: a
 * hand-mangled URL falls back to defaults instead of crashing — the strict
 * validation lives server-side in backend/src/filter.ts.
 */
export function parseBrowseParams(search: string): { filter: PropertyFilter; bbox?: BoundingBox } {
  const params = new URLSearchParams(search);
  const filter: PropertyFilter = {};

  const minRent = parseIntInRange(params.get("minRent"), 0, 100000);
  const maxRent = parseIntInRange(params.get("maxRent"), 0, 100000);
  if (minRent === undefined || maxRent === undefined || minRent <= maxRent) {
    if (minRent !== undefined) filter.minRent = minRent;
    if (maxRent !== undefined) filter.maxRent = maxRent;
  }

  const bedrooms = parseIntInRange(params.get("bedrooms"), 0, 10);
  if (bedrooms !== undefined) filter.bedrooms = bedrooms;
  const bathrooms = parseIntInRange(params.get("bathrooms"), 0, 10);
  if (bathrooms !== undefined) filter.bathrooms = bathrooms;

  const rawTypes = params.get("propertyType");
  if (rawTypes) {
    const types = [
      ...new Set(
        rawTypes
          .split(",")
          .map((token) => token.trim())
          .filter((token): token is PropertyType =>
            (PROPERTY_TYPES as readonly string[]).includes(token)
          )
      )
    ];
    if (types.length > 0) {
      filter.propertyTypes = types;
    }
  }

  let bbox: BoundingBox | undefined;
  const rawBbox = params.get("bbox");
  if (rawBbox) {
    const parts = rawBbox.split(",").map(Number);
    if (parts.length === 4 && parts.every((n) => Number.isFinite(n))) {
      const [west, south, east, north] = parts;
      if (
        west < east &&
        south < north &&
        west >= -180 &&
        east <= 180 &&
        south >= -90 &&
        north <= 90
      ) {
        bbox = { minLng: west, minLat: south, maxLng: east, maxLat: north };
      }
    }
  }

  return { filter, bbox };
}

/** Serialize browse-page state into a query string ("" when nothing is set). */
export function serializeBrowseParams(
  filter: PropertyFilter,
  bbox: BoundingBox | null
): string {
  const params = new URLSearchParams();
  if (filter.minRent !== undefined) params.set("minRent", String(filter.minRent));
  if (filter.maxRent !== undefined) params.set("maxRent", String(filter.maxRent));
  if (filter.bedrooms !== undefined) params.set("bedrooms", String(filter.bedrooms));
  if (filter.bathrooms !== undefined) params.set("bathrooms", String(filter.bathrooms));
  if (filter.propertyTypes !== undefined && filter.propertyTypes.length > 0) {
    params.set("propertyType", filter.propertyTypes.join(","));
  }
  if (bbox) {
    params.set(
      "bbox",
      [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat].map((n) => n.toFixed(5)).join(",")
    );
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}
