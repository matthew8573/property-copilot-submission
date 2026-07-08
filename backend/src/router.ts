import { ValidationError } from "./errors";
import { filterProperties, parseFilter } from "./filter";
import type { BoundingBox } from "./geo";
import { getPropertyById, listAllProperties, queryByBoundingBox } from "./properties";
import { computeStats } from "./stats";
import type { Property } from "./types";

export type ApiRequest = {
  method: string;
  path: string;
  query: Record<string, string | undefined>;
};

export type ApiResponse = {
  statusCode: number;
  body: unknown;
};

/**
 * Parse the `bbox` query parameter: `west,south,east,north` (GeoJSON order,
 * i.e. minLng,minLat,maxLng,maxLat). Absent or empty means "no viewport
 * constraint"; malformed throws a ValidationError (surfaced as a 400).
 */
export function parseBboxParam(raw: string | undefined): BoundingBox | undefined {
  if (raw === undefined || raw === "") {
    return undefined;
  }

  const parts = raw.split(",").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((n) => !Number.isFinite(n))) {
    throw new ValidationError("bbox must be four numbers: west,south,east,north");
  }

  const [west, south, east, north] = parts;
  if (west < -180 || east > 180 || south < -90 || north > 90) {
    throw new ValidationError("bbox coordinates are out of range");
  }
  if (west >= east || south >= north) {
    throw new ValidationError("bbox must have west < east and south < north");
  }

  return { minLat: south, minLng: west, maxLat: north, maxLng: east };
}

/**
 * Stable presentation order: cheapest first, id as the tiebreak. Keeps the
 * list from reshuffling between refetches (parallel partition queries return
 * in nondeterministic order).
 */
function sortForResponse(properties: Property[]): Property[] {
  return [...properties].sort((a, b) => a.rent - b.rent || a.id.localeCompare(b.id));
}

/**
 * Framework-agnostic request router shared by the Lambda handler (production)
 * and the local dev server. Keeps the HTTP plumbing in one place so the same
 * logic runs in both environments.
 */
export async function route(req: ApiRequest): Promise<ApiResponse> {
  if (req.method !== "GET") {
    return { statusCode: 405, body: { error: "Method not allowed" } };
  }

  if (req.path === "/health") {
    return { statusCode: 200, body: { ok: true } };
  }

  // GET /properties/stats — whole-market aggregates (rent histogram + per-city
  // extents) computed server-side, so the client fetches a small summary
  // instead of every row. Must precede the /properties/:id match below, which
  // would otherwise treat "stats" as a listing id.
  if (req.path === "/properties/stats") {
    const properties = await listAllProperties();
    return { statusCode: 200, body: computeStats(properties) };
  }

  // GET /properties/:id
  const detailMatch = req.path.match(/^\/properties\/([^/]+)$/);
  if (detailMatch) {
    const property = await getPropertyById(decodeURIComponent(detailMatch[1]));
    if (!property) {
      return { statusCode: 404, body: { error: "Property not found" } };
    }
    return { statusCode: 200, body: { property } };
  }

  // GET /properties
  //
  // With `bbox` present this is the map's viewport query: it runs against the
  // geo-index GSI (no table scan) and then applies the attribute filters.
  // Without `bbox` it lists everything and filters. Both paths filter and
  // sort server-side — the client never receives more than it asked for.
  if (req.path === "/properties") {
    try {
      const filter = parseFilter(req.query);
      const box = parseBboxParam(req.query.bbox);
      const candidates = box ? await queryByBoundingBox(box) : await listAllProperties();
      const properties = sortForResponse(filterProperties(candidates, filter));
      return { statusCode: 200, body: { properties, count: properties.length } };
    } catch (error) {
      if (error instanceof ValidationError) {
        return { statusCode: 400, body: { error: error.message } };
      }
      throw error;
    }
  }

  return { statusCode: 404, body: { error: "Not found" } };
}
