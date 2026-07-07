import { describe, expect, test } from "vitest";
import { boundingBoxOf, METRO_VANCOUVER_BBOX, movedSignificantly } from "../lib/map";
import { bathroomLabel, bedroomLabel, formatPriceShort } from "../lib/format";
import type { BoundingBox } from "../lib/types";

// Spans: 0.1 lat, 0.2 lng → 1% thresholds are 0.001 / 0.002.
const BASE: BoundingBox = { minLat: 49.2, minLng: -123.2, maxLat: 49.3, maxLng: -123.0 };

describe("movedSignificantly", () => {
  test("an identical viewport does not trigger a refetch", () => {
    expect(movedSignificantly(BASE, { ...BASE })).toBe(false);
  });

  test("a sub-threshold nudge does not trigger a refetch", () => {
    const nudged: BoundingBox = {
      ...BASE,
      minLat: BASE.minLat + 0.0005,
      maxLat: BASE.maxLat + 0.0005
    };
    expect(movedSignificantly(BASE, nudged)).toBe(false);
  });

  test("a real pan triggers a refetch", () => {
    const panned: BoundingBox = {
      ...BASE,
      minLng: BASE.minLng + 0.05,
      maxLng: BASE.maxLng + 0.05
    };
    expect(movedSignificantly(BASE, panned)).toBe(true);
  });

  test("zooming in triggers a refetch", () => {
    const zoomed: BoundingBox = {
      minLat: 49.225,
      minLng: -123.15,
      maxLat: 49.275,
      maxLng: -123.05
    };
    expect(movedSignificantly(BASE, zoomed)).toBe(true);
  });

  test("the metro fallback viewport is well-formed", () => {
    expect(METRO_VANCOUVER_BBOX.minLat).toBeLessThan(METRO_VANCOUVER_BBOX.maxLat);
    expect(METRO_VANCOUVER_BBOX.minLng).toBeLessThan(METRO_VANCOUVER_BBOX.maxLng);
  });
});

describe("boundingBoxOf", () => {
  test("returns null for no points", () => {
    expect(boundingBoxOf([])).toBeNull();
  });

  test("wraps a single point in a zero-area box", () => {
    expect(boundingBoxOf([{ lat: 49.2, lng: -123.1 }])).toEqual({
      minLat: 49.2,
      minLng: -123.1,
      maxLat: 49.2,
      maxLng: -123.1
    });
  });

  test("spans the extremes of several points", () => {
    expect(
      boundingBoxOf([
        { lat: 49.2, lng: -123.1 },
        { lat: 49.28, lng: -123.0 },
        { lat: 49.1, lng: -123.2 }
      ])
    ).toEqual({ minLat: 49.1, minLng: -123.2, maxLat: 49.28, maxLng: -123.0 });
  });
});

describe("bedroom / bathroom labels", () => {
  test("bedrooms pluralize, zero is Studio", () => {
    expect(bedroomLabel(0)).toBe("Studio");
    expect(bedroomLabel(1)).toBe("1 bed");
    expect(bedroomLabel(3)).toBe("3 beds");
  });

  test("bathrooms pluralize", () => {
    expect(bathroomLabel(1)).toBe("1 bath");
    expect(bathroomLabel(2)).toBe("2 baths");
  });
});

describe("formatPriceShort", () => {
  test("sub-$1000 rents show in full", () => {
    expect(formatPriceShort(980)).toBe("$980");
  });

  test("thousands are compact with one decimal", () => {
    expect(formatPriceShort(1541)).toBe("$1.5k");
    expect(formatPriceShort(2400)).toBe("$2.4k");
  });

  test("whole thousands drop the decimal", () => {
    expect(formatPriceShort(3000)).toBe("$3k");
    expect(formatPriceShort(4983)).toBe("$5k");
  });
});
