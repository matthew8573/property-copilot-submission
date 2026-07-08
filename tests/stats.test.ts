import { describe, expect, test } from "vitest";
import { buildRentHistogram, computeStats, RENT_STATS_BOUNDS } from "../backend/src/stats";
import type { Property } from "../backend/src/types";

function prop(overrides: Partial<Property>): Property {
  return {
    id: "x",
    title: "x",
    description: "",
    rent: 2000,
    bedrooms: 1,
    bathrooms: 1,
    propertyType: "condo",
    squareFeet: 700,
    street: "1 Test St",
    city: "Vancouver",
    province: "BC",
    postalCode: "V6B 1A1",
    lat: 49.28,
    lng: -123.12,
    geohash: "c2b2tb0",
    geohashPrefix: "c2b2t",
    images: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides
  };
}

describe("buildRentHistogram", () => {
  test("bins the min into the first bucket and the max into the last", () => {
    const h = buildRentHistogram([1400, 5200], { min: 1400, max: 5200 }, 4);
    expect(h).toHaveLength(4);
    expect(h[0]).toBe(1);
    expect(h[3]).toBe(1);
  });

  test("clamps out-of-range rents into the edge buckets (nothing dropped)", () => {
    const h = buildRentHistogram([0, 99999], { min: 1400, max: 5200 }, 4);
    expect(h[0]).toBe(1);
    expect(h[3]).toBe(1);
  });

  test("skips non-finite values and handles the empty case", () => {
    expect(buildRentHistogram([NaN, Infinity], { min: 1400, max: 5200 }, 4)).toEqual([0, 0, 0, 0]);
    expect(buildRentHistogram([])).toEqual(new Array(24).fill(0));
  });
});

describe("computeStats", () => {
  const properties = [
    prop({ id: "a", rent: 1500, city: "Vancouver", lat: 49.28, lng: -123.12 }),
    prop({ id: "b", rent: 3000, city: "Vancouver", lat: 49.26, lng: -123.1 }),
    prop({ id: "c", rent: 4000, city: "Burnaby", lat: 49.25, lng: -122.98 })
  ];

  test("the histogram accounts for every row and reports the shared bounds", () => {
    const stats = computeStats(properties);
    expect(stats.count).toBe(3);
    expect(stats.histogram.reduce((a, b) => a + b, 0)).toBe(3);
    expect(stats.bounds).toEqual({ min: RENT_STATS_BOUNDS.min, max: RENT_STATS_BOUNDS.max });
  });

  test("each city's extent spans exactly its listings", () => {
    const stats = computeStats(properties);
    const vancouver = stats.cities.find((c) => c.city === "Vancouver");
    expect(vancouver?.count).toBe(2);
    expect(vancouver?.bbox).toEqual({ minLat: 49.26, minLng: -123.12, maxLat: 49.28, maxLng: -123.1 });
    expect(stats.cities.find((c) => c.city === "Burnaby")?.count).toBe(1);
  });

  test("empty input yields a zeroed histogram and no cities", () => {
    const stats = computeStats([]);
    expect(stats.cities).toEqual([]);
    expect(stats.histogram.every((n) => n === 0)).toBe(true);
  });
});
