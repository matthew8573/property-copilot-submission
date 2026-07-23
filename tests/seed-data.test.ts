import { describe, expect, test } from "vitest";
import { generateProperties } from "../backend/src/seed-data";
import { withGeoAttributes } from "../backend/src/properties";

const CITIES = ["Vancouver", "Richmond", "Burnaby", "Surrey"];

describe("seed data", () => {
  const properties = generateProperties();

  test("produces 50 listings with unique ids", () => {
    expect(properties).toHaveLength(50);
    expect(new Set(properties.map((p) => p.id)).size).toBe(50);
  });

  test("is deterministic", () => {
    expect(generateProperties()).toEqual(properties);
  });

  test("every listing covers the four target cities", () => {
    const cities = new Set(properties.map((p) => p.city));
    expect([...cities].sort()).toEqual([...CITIES].sort());
  });

  test("every listing has exactly five images and sane metadata", () => {
    for (const p of properties) {
      expect(p.images).toHaveLength(5);
      expect(p.province).toBe("BC");
      expect(p.rent).toBeGreaterThan(0);
      expect(p.bedrooms).toBeGreaterThanOrEqual(0);
      expect(p.bathrooms).toBeGreaterThanOrEqual(1);
      expect(Math.abs(p.lat)).toBeLessThanOrEqual(90);
      expect(Math.abs(p.lng)).toBeLessThanOrEqual(180);
      expect(p.availableFrom).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(p.availableFrom))).toBe(false);
    }
  });

  test("no two listings share a cover image, and each gallery has no repeats", () => {
    const covers = properties.map((p) => p.images[0]);
    expect(new Set(covers).size).toBe(covers.length);
    for (const p of properties) {
      expect(new Set(p.images).size).toBe(p.images.length);
    }
  });

  test("geo attributes are derived from coordinates", () => {
    const withGeo = withGeoAttributes(properties[0]);
    expect(withGeo.geohash.length).toBeGreaterThan(0);
    expect(withGeo.geohash.startsWith(withGeo.geohashPrefix)).toBe(true);
  });
});
