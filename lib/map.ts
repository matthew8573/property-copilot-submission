import type { BoundingBox } from "./types";

/**
 * A one-shot request to re-frame the map on a box; `id` bumps so repeating the
 * same target still re-triggers the fit. Search sets just a box; a card click
 * adds a tighter `maxZoom` and top-heavy `padding` to leave room for the popup.
 */
export type FocusRequest = {
  bbox: BoundingBox;
  id: number;
  maxZoom?: number;
  padding?: number | { top: number; right: number; bottom: number; left: number };
};

/**
 * Initial viewport and fetch fallback: Metro Vancouver, covering all four
 * seeded cities with a little margin.
 */
export const METRO_VANCOUVER_BBOX: BoundingBox = {
  minLat: 49.08,
  minLng: -123.28,
  maxLat: 49.36,
  maxLng: -122.72
};

/**
 * The tightest bounding box containing every given point, or null when the list
 * is empty. Used to re-frame the map on a search: we match listings across the
 * whole market, then fit the map to where they actually are. A single match
 * yields a zero-area box (min === max); the caller's fitBounds maxZoom keeps
 * that from zooming in absurdly.
 */
export function boundingBoxOf(points: { lat: number; lng: number }[]): BoundingBox | null {
  if (points.length === 0) {
    return null;
  }
  let minLat = Infinity;
  let minLng = Infinity;
  let maxLat = -Infinity;
  let maxLng = -Infinity;
  for (const { lat, lng } of points) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }
  return { minLat, minLng, maxLat, maxLng };
}

/**
 * Whether the viewport moved enough to justify a refetch. Filters out
 * accidental nudges: unless some edge shifted by more than `fraction` of the
 * previous viewport's span, the move is not worth a round-trip (and, more
 * importantly, not worth reshuffling the list under the renter).
 */
export function movedSignificantly(
  prev: BoundingBox,
  next: BoundingBox,
  fraction = 0.01
): boolean {
  const latTolerance = (prev.maxLat - prev.minLat) * fraction;
  const lngTolerance = (prev.maxLng - prev.minLng) * fraction;
  return (
    Math.abs(next.minLat - prev.minLat) > latTolerance ||
    Math.abs(next.maxLat - prev.maxLat) > latTolerance ||
    Math.abs(next.minLng - prev.minLng) > lngTolerance ||
    Math.abs(next.maxLng - prev.maxLng) > lngTolerance
  );
}
