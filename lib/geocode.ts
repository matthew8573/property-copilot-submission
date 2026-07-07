import type { BoundingBox } from "./types";

/** A place the user can jump the map to (from the geocoder or a local fallback). */
export type PlaceSuggestion = {
  id: string;
  /** Primary line, e.g. "Kitsilano" or "4763 Robson Street". */
  label: string;
  /** Secondary line, e.g. "Vancouver, British Columbia". */
  detail?: string;
  lat: number;
  lng: number;
  /** Extent for cities/neighbourhoods; absent for point features (addresses). */
  bbox?: BoundingBox;
};

// Search region = the map's Metro Vancouver fence, so every result is navigable
// (an off-region hit would clamp weirdly against maxBounds). [lng/lat corners].
const REGION = { minLng: -124.6, minLat: 48.4, maxLng: -121.4, maxLat: 50.0 };
// Bias ranking toward the metro centre so local places win ties.
const BIAS = { lat: 49.24, lng: -123.06 };
const PHOTON_URL = "https://photon.komoot.io/api/";

function inRegion(lat: number, lng: number): boolean {
  return (
    lat >= REGION.minLat && lat <= REGION.maxLat && lng >= REGION.minLng && lng <= REGION.maxLng
  );
}

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, unknown>;
};

function toSuggestion(feature: PhotonFeature): PlaceSuggestion | null {
  const coords = feature.geometry?.coordinates;
  if (!coords) {
    return null;
  }
  const [lng, lat] = coords;
  if (typeof lat !== "number" || typeof lng !== "number" || !inRegion(lat, lng)) {
    return null;
  }
  const p = feature.properties ?? {};
  const str = (k: string): string | undefined => (typeof p[k] === "string" ? (p[k] as string) : undefined);

  const street = [str("housenumber"), str("street")].filter(Boolean).join(" ");
  const label = str("name") || street || str("city") || str("street") || "";
  if (!label) {
    return null;
  }
  const detail = [str("district") || str("city"), str("state")]
    .filter((x): x is string => Boolean(x) && x !== label)
    .join(", ");

  let bbox: BoundingBox | undefined;
  const extent = p.extent;
  if (Array.isArray(extent) && extent.length === 4 && extent.every((n) => typeof n === "number")) {
    const [w, n, e, s] = extent as number[];
    bbox = { minLng: w, minLat: s, maxLng: e, maxLat: n };
  }

  return {
    id: `${str("osm_type") ?? ""}${(p.osm_id as number | string) ?? `${lat},${lng}`}`,
    label,
    detail: detail || undefined,
    lat,
    lng,
    bbox
  };
}

/**
 * Autocomplete places within Metro Vancouver via Photon (keyless OSM geocoder),
 * biased to the metro centre and clamped to the region. Debounce + an
 * AbortSignal at the call site keep it light. Throws on network/HTTP failure so
 * the caller can fall back to local suggestions.
 */
export async function geocodePlaces(
  query: string,
  signal?: AbortSignal
): Promise<PlaceSuggestion[]> {
  const q = query.trim();
  if (q.length < 2) {
    return [];
  }
  const params = new URLSearchParams({
    q,
    lat: String(BIAS.lat),
    lon: String(BIAS.lng),
    limit: "6",
    lang: "en",
    bbox: `${REGION.minLng},${REGION.minLat},${REGION.maxLng},${REGION.maxLat}`
  });

  const res = await fetch(`${PHOTON_URL}?${params.toString()}`, { signal });
  if (!res.ok) {
    throw new Error(`Geocoder responded ${res.status}`);
  }
  const data = (await res.json()) as { features?: PhotonFeature[] };

  const out: PlaceSuggestion[] = [];
  const seen = new Set<string>();
  for (const feature of data.features ?? []) {
    const suggestion = toSuggestion(feature);
    const key = suggestion ? `${suggestion.label}|${suggestion.detail ?? ""}` : "";
    if (suggestion && !seen.has(key)) {
      seen.add(key);
      out.push(suggestion);
    }
  }
  return out.slice(0, 6);
}
