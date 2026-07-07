import { describe, expect, test } from "vitest";
import { filterProperties, parseFilter } from "../backend/src/filter";
import { ValidationError } from "../backend/src/errors";
import { SEED_PROPERTIES } from "../backend/src/seed-data";
import type { Property } from "../backend/src/types";

// Seed data lacks geo attributes; tests here do not need them.
const PROPERTIES = SEED_PROPERTIES as Property[];

describe("filterProperties", () => {
  test("rent range is inclusive on both ends", () => {
    const result = filterProperties(PROPERTIES, { minRent: 2000, maxRent: 3000 });
    expect(result.length).toBeGreaterThan(0);
    for (const p of result) {
      expect(p.rent).toBeGreaterThanOrEqual(2000);
      expect(p.rent).toBeLessThanOrEqual(3000);
    }
  });

  test("bedrooms filter is a minimum", () => {
    const result = filterProperties(PROPERTIES, { bedrooms: 3 });
    expect(result.every((p) => p.bedrooms >= 3)).toBe(true);
  });

  test("bathrooms filter is a minimum", () => {
    const result = filterProperties(PROPERTIES, { bathrooms: 2 });
    expect(result.length).toBeGreaterThan(0);
    expect(result.every((p) => p.bathrooms >= 2)).toBe(true);
  });

  test("property types match any of the requested set", () => {
    const twoTypes = filterProperties(PROPERTIES, { propertyTypes: ["condo", "house"] });
    expect(twoTypes.length).toBeGreaterThan(0);
    expect(
      twoTypes.every((p) => p.propertyType === "condo" || p.propertyType === "house")
    ).toBe(true);

    const condoOnly = filterProperties(PROPERTIES, { propertyTypes: ["condo"] });
    expect(condoOnly.length).toBeLessThanOrEqual(twoTypes.length);
    expect(condoOnly.every((p) => p.propertyType === "condo")).toBe(true);
  });

  test("filters compose: combining rent and bedrooms narrows the result", () => {
    const rentOnly = filterProperties(PROPERTIES, { maxRent: 3000 });
    const both = filterProperties(PROPERTIES, { maxRent: 3000, bedrooms: 2 });
    expect(both.length).toBeLessThanOrEqual(rentOnly.length);
    expect(both.every((p) => p.rent <= 3000 && p.bedrooms >= 2)).toBe(true);
  });

  test("all dimensions compose", () => {
    const result = filterProperties(PROPERTIES, {
      minRent: 1500,
      maxRent: 3500,
      bedrooms: 2,
      bathrooms: 1,
      propertyTypes: ["apartment", "condo"]
    });
    for (const p of result) {
      expect(p.rent).toBeGreaterThanOrEqual(1500);
      expect(p.rent).toBeLessThanOrEqual(3500);
      expect(p.bedrooms).toBeGreaterThanOrEqual(2);
      expect(p.bathrooms).toBeGreaterThanOrEqual(1);
      expect(["apartment", "condo"]).toContain(p.propertyType);
    }
  });

  test("no filters returns everything", () => {
    expect(filterProperties(PROPERTIES, {})).toHaveLength(PROPERTIES.length);
  });
});

describe("parseFilter", () => {
  test("parses valid query params", () => {
    expect(
      parseFilter({
        minRent: "1500",
        maxRent: "3000",
        bedrooms: "2",
        bathrooms: "2",
        propertyType: "house,condo"
      })
    ).toEqual({
      minRent: 1500,
      maxRent: 3000,
      bedrooms: 2,
      bathrooms: 2,
      propertyTypes: ["house", "condo"]
    });
  });

  test("absent and empty params are unconstrained", () => {
    expect(parseFilter({})).toEqual({});
    expect(parseFilter({ minRent: "", bedrooms: "", propertyType: "" })).toEqual({});
  });

  test("rejects malformed numbers", () => {
    expect(() => parseFilter({ minRent: "abc" })).toThrow(ValidationError);
    expect(() => parseFilter({ maxRent: "-100" })).toThrow(ValidationError);
    expect(() => parseFilter({ bedrooms: "1.5" })).toThrow(ValidationError);
    expect(() => parseFilter({ bathrooms: "two" })).toThrow(ValidationError);
  });

  test("rejects a contradictory rent range", () => {
    expect(() => parseFilter({ minRent: "3000", maxRent: "1000" })).toThrow(ValidationError);
  });

  test("rejects unknown property types and dedupes known ones", () => {
    expect(() => parseFilter({ propertyType: "castle" })).toThrow(ValidationError);
    expect(() => parseFilter({ propertyType: "condo,castle" })).toThrow(ValidationError);
    expect(parseFilter({ propertyType: "condo,condo" })).toEqual({ propertyTypes: ["condo"] });
  });
});
