import { describe, expect, test } from "vitest";
import {
  countActiveFilters,
  parseBrowseParams,
  serializeBrowseParams
} from "../lib/filters";
import type { BoundingBox, PropertyFilter } from "../lib/types";

describe("browse URL params", () => {
  test("round-trips filters and viewport", () => {
    const filter: PropertyFilter = {
      minRent: 1800,
      maxRent: 3200,
      bedrooms: 2,
      bathrooms: 1,
      propertyTypes: ["condo", "house"]
    };
    const bbox: BoundingBox = { minLat: 49.2, minLng: -123.2, maxLat: 49.3, maxLng: -123.0 };

    const query = serializeBrowseParams(filter, bbox);
    const parsed = parseBrowseParams(query);

    expect(parsed.filter).toEqual(filter);
    expect(parsed.bbox).toEqual(bbox);
  });

  test("nothing set serializes to an empty string", () => {
    expect(serializeBrowseParams({}, null)).toBe("");
  });

  test("garbage params are dropped, valid ones kept", () => {
    const parsed = parseBrowseParams(
      "?minRent=abc&bedrooms=1.5&propertyType=castle,condo&bbox=1,2,3"
    );
    expect(parsed.filter).toEqual({ propertyTypes: ["condo"] });
    expect(parsed.bbox).toBeUndefined();
  });

  test("a contradictory rent range is dropped entirely", () => {
    expect(parseBrowseParams("?minRent=3000&maxRent=1000").filter).toEqual({});
  });

  test("an inverted bbox is dropped", () => {
    expect(parseBrowseParams("?bbox=-123.0,49.3,-123.2,49.2").bbox).toBeUndefined();
  });

  test("countActiveFilters counts dimensions, not values", () => {
    expect(countActiveFilters({})).toBe(0);
    expect(countActiveFilters({ minRent: 1500 })).toBe(1);
    expect(countActiveFilters({ minRent: 1500, maxRent: 3000 })).toBe(1);
    expect(
      countActiveFilters({
        minRent: 1500,
        maxRent: 3000,
        bedrooms: 2,
        bathrooms: 1,
        propertyTypes: ["condo"]
      })
    ).toBe(4);
  });
});
