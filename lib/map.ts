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
 * Grow a box by `fraction` of its span on every side. Fetching slightly beyond
 * the visible viewport hides marker pop-in at the edges while panning; the
 * server clamps to its service area, so over-asking near the fence is free.
 */
export function expandBoundingBox(box: BoundingBox, fraction: number): BoundingBox {
  const latPad = (box.maxLat - box.minLat) * fraction;
  const lngPad = (box.maxLng - box.minLng) * fraction;
  return {
    minLat: Math.max(-90, box.minLat - latPad),
    maxLat: Math.min(90, box.maxLat + latPad),
    minLng: Math.max(-180, box.minLng - lngPad),
    maxLng: Math.min(180, box.maxLng + lngPad)
  };
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
