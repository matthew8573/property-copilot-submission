import { describe, expect, test } from "vitest";
import {
  GEOHASH_PREFIX_LENGTH,
  SERVICE_AREA,
  boundingBoxPrefixes,
  encodeGeohash,
  geohashPrefix,
  intersectBoundingBoxes,
  isInBoundingBox,
  type BoundingBox
} from "../backend/src/geo";

// A box covering roughly downtown Vancouver.
const VANCOUVER_BOX: BoundingBox = {
  minLat: 49.26,
  minLng: -123.14,
  maxLat: 49.3,
  maxLng: -123.1
};

describe("geo", () => {
  test("encodeGeohash is deterministic and prefix is the right length", () => {
    const hash = encodeGeohash(49.2827, -123.1207);
    expect(hash).toBe(encodeGeohash(49.2827, -123.1207));
    expect(geohashPrefix(hash)).toHaveLength(GEOHASH_PREFIX_LENGTH);
    expect(hash.startsWith(geohashPrefix(hash))).toBe(true);
  });

  test("nearby points share a geohash prefix; far points do not", () => {
    const vancouver = geohashPrefix(encodeGeohash(49.2827, -123.1207));
    const nearby = geohashPrefix(encodeGeohash(49.2835, -123.1215));
    const surrey = geohashPrefix(encodeGeohash(49.1913, -122.849));
    expect(nearby).toBe(vancouver);
    expect(surrey).not.toBe(vancouver);
  });

  test("boundingBoxPrefixes covers the box and is de-duplicated", () => {
    const prefixes = boundingBoxPrefixes(VANCOUVER_BOX);
    expect(prefixes.length).toBeGreaterThan(0);
    expect(new Set(prefixes).size).toBe(prefixes.length);
    // A point inside the box must fall in one of the returned prefixes.
    const inside = geohashPrefix(encodeGeohash(49.28, -123.12));
    expect(prefixes).toContain(inside);
  });

  test("isInBoundingBox respects edges", () => {
    expect(isInBoundingBox(49.28, -123.12, VANCOUVER_BOX)).toBe(true);
    expect(isInBoundingBox(49.19, -122.85, VANCOUVER_BOX)).toBe(false);
  });

  test("intersectBoundingBoxes returns the overlap, or null when disjoint", () => {
    const other: BoundingBox = { minLat: 49.28, minLng: -123.2, maxLat: 49.4, maxLng: -123.12 };
    expect(intersectBoundingBoxes(VANCOUVER_BOX, other)).toEqual({
      minLat: 49.28,
      minLng: -123.14,
      maxLat: 49.3,
      maxLng: -123.12
    });

    const toronto: BoundingBox = { minLat: 43.6, minLng: -79.5, maxLat: 43.7, maxLng: -79.3 };
    expect(intersectBoundingBoxes(VANCOUVER_BOX, toronto)).toBeNull();
  });

  test("SERVICE_AREA covers all four seeded city centres", () => {
    const centres: Array<[number, number]> = [
      [49.2827, -123.1207], // Vancouver
      [49.1666, -123.1336], // Richmond
      [49.2488, -122.9805], // Burnaby
      [49.1913, -122.849] // Surrey
    ];
    for (const [lat, lng] of centres) {
      expect(isInBoundingBox(lat, lng, SERVICE_AREA)).toBe(true);
    }
  });
});
