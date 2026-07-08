import type { BoundingBox, Property, PropertyFilter } from "./types";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

/**
 * Thin fetch wrapper around the AWS backend. Throws on non-2xx responses.
 * Deliberately sends no custom headers: a bare GET is a "simple" CORS
 * request, so the browser skips the preflight OPTIONS round-trip.
 */
async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`);

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }
  return body as T;
}

function toQueryString(filter: PropertyFilter, bbox?: BoundingBox): string {
  const params = new URLSearchParams();
  if (filter.minRent !== undefined) params.set("minRent", String(filter.minRent));
  if (filter.maxRent !== undefined) params.set("maxRent", String(filter.maxRent));
  if (filter.bedrooms !== undefined) params.set("bedrooms", String(filter.bedrooms));
  if (filter.bathrooms !== undefined) params.set("bathrooms", String(filter.bathrooms));
  if (filter.propertyTypes !== undefined && filter.propertyTypes.length > 0) {
    params.set("propertyType", filter.propertyTypes.join(","));
  }
  if (bbox) {
    // west,south,east,north — GeoJSON order, matching the backend's bbox param.
    params.set("bbox", [bbox.minLng, bbox.minLat, bbox.maxLng, bbox.maxLat].join(","));
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchProperties(
  filter: PropertyFilter = {},
  bbox?: BoundingBox
): Promise<Property[]> {
  const data = await apiGet<{ properties: Property[] }>(
    `/properties${toQueryString(filter, bbox)}`
  );
  return data.properties;
}

export async function fetchProperty(id: string): Promise<Property> {
  const data = await apiGet<{ property: Property }>(`/properties/${id}`);
  return data.property;
}

/** Bounds + count for one city, from the whole-market stats summary. */
export type CityStat = { city: string; count: number; bbox: BoundingBox };

/**
 * Whole-market aggregates computed server-side: a rent histogram (aligned to
 * the price slider's bounds) and each city's extent. The browse page fetches
 * this small summary instead of downloading every row to shape the price
 * control and the search box's local fallback.
 */
export type PropertyStats = {
  histogram: number[];
  bounds: { min: number; max: number };
  buckets: number;
  count: number;
  cities: CityStat[];
};

export async function fetchStats(): Promise<PropertyStats> {
  return apiGet<PropertyStats>("/properties/stats");
}
