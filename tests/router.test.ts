import { beforeEach, describe, expect, test, vi } from "vitest";
import { parseBboxParam, route } from "../backend/src/router";
import { ValidationError } from "../backend/src/errors";
import type { Property } from "../backend/src/types";

vi.mock("../backend/src/properties", () => ({
  getPropertyById: vi.fn(),
  listAllProperties: vi.fn(),
  queryByBoundingBox: vi.fn()
}));

import { getPropertyById, listAllProperties, queryByBoundingBox } from "../backend/src/properties";

const getPropertyByIdMock = vi.mocked(getPropertyById);
const listAllPropertiesMock = vi.mocked(listAllProperties);
const queryByBoundingBoxMock = vi.mocked(queryByBoundingBox);

function stub(id: string, overrides: Partial<Property> = {}): Property {
  return {
    id,
    title: id,
    description: "test",
    rent: 2000,
    bedrooms: 2,
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

beforeEach(() => {
  vi.clearAllMocks();
});

describe("route", () => {
  test("GET /health responds ok", async () => {
    const res = await route({ method: "GET", path: "/health", query: {} });
    expect(res).toEqual({ statusCode: 200, body: { ok: true } });
  });

  test("rejects non-GET methods", async () => {
    const res = await route({ method: "POST", path: "/properties", query: {} });
    expect(res.statusCode).toBe(405);
  });

  test("unknown paths 404", async () => {
    const res = await route({ method: "GET", path: "/nope", query: {} });
    expect(res.statusCode).toBe(404);
  });

  test("GET /properties/:id returns the property or 404", async () => {
    getPropertyByIdMock.mockResolvedValueOnce(stub("prop-001"));
    const found = await route({ method: "GET", path: "/properties/prop-001", query: {} });
    expect(found.statusCode).toBe(200);
    expect(found.body).toEqual({ property: expect.objectContaining({ id: "prop-001" }) });

    getPropertyByIdMock.mockResolvedValueOnce(null);
    const missing = await route({ method: "GET", path: "/properties/prop-999", query: {} });
    expect(missing.statusCode).toBe(404);
  });

  test("GET /properties without bbox lists everything, sorted by rent then id", async () => {
    listAllPropertiesMock.mockResolvedValueOnce([
      stub("prop-b", { rent: 3000 }),
      stub("prop-c", { rent: 1800 }),
      stub("prop-a", { rent: 1800 })
    ]);

    const res = await route({ method: "GET", path: "/properties", query: {} });

    expect(res.statusCode).toBe(200);
    const body = res.body as { properties: Property[]; count: number };
    expect(body.count).toBe(3);
    expect(body.properties.map((p) => p.id)).toEqual(["prop-a", "prop-c", "prop-b"]);
    expect(queryByBoundingBoxMock).not.toHaveBeenCalled();
  });

  test("GET /properties with bbox routes through the geospatial query", async () => {
    queryByBoundingBoxMock.mockResolvedValueOnce([stub("prop-geo")]);

    const res = await route({
      method: "GET",
      path: "/properties",
      query: { bbox: "-123.3,49.2,-123.0,49.35" }
    });

    expect(res.statusCode).toBe(200);
    expect(queryByBoundingBoxMock).toHaveBeenCalledWith({
      minLng: -123.3,
      minLat: 49.2,
      maxLng: -123.0,
      maxLat: 49.35
    });
    expect(listAllPropertiesMock).not.toHaveBeenCalled();
  });

  test("attribute filters compose with the viewport query", async () => {
    queryByBoundingBoxMock.mockResolvedValueOnce([
      stub("prop-cheap", { rent: 1600 }),
      stub("prop-mid", { rent: 2600, bedrooms: 3 }),
      stub("prop-pricey", { rent: 4200, bedrooms: 3 })
    ]);

    const res = await route({
      method: "GET",
      path: "/properties",
      query: { bbox: "-123.3,49.2,-123.0,49.35", bedrooms: "3", maxRent: "3000" }
    });

    const body = res.body as { properties: Property[]; count: number };
    expect(body.properties.map((p) => p.id)).toEqual(["prop-mid"]);
    expect(body.count).toBe(1);
  });

  test("invalid input responds 400 with a message, before any data access", async () => {
    const badQueries: Array<Record<string, string>> = [
      { bbox: "not-a-box" },
      { bbox: "-123.3,49.2,-123.0" },
      { bbox: "-123.0,49.2,-123.3,49.35" },
      { minRent: "abc" },
      { minRent: "3000", maxRent: "1000" },
      { propertyType: "castle" }
    ];
    for (const query of badQueries) {
      const res = await route({ method: "GET", path: "/properties", query });
      expect(res.statusCode).toBe(400);
      expect((res.body as { error: string }).error).toBeTruthy();
    }
    expect(listAllPropertiesMock).not.toHaveBeenCalled();
    expect(queryByBoundingBoxMock).not.toHaveBeenCalled();
  });
});

describe("parseBboxParam", () => {
  test("absent or empty means no viewport constraint", () => {
    expect(parseBboxParam(undefined)).toBeUndefined();
    expect(parseBboxParam("")).toBeUndefined();
  });

  test("parses west,south,east,north into a bounding box", () => {
    expect(parseBboxParam("-123.3,49.2,-123.0,49.35")).toEqual({
      minLng: -123.3,
      minLat: 49.2,
      maxLng: -123.0,
      maxLat: 49.35
    });
  });

  test("rejects malformed values", () => {
    expect(() => parseBboxParam("1,2,3")).toThrow(ValidationError);
    expect(() => parseBboxParam("a,b,c,d")).toThrow(ValidationError);
    // west >= east
    expect(() => parseBboxParam("-123.0,49.2,-123.3,49.35")).toThrow(ValidationError);
    // south >= north
    expect(() => parseBboxParam("-123.3,49.35,-123.0,49.2")).toThrow(ValidationError);
    // out of range
    expect(() => parseBboxParam("-190,49.2,-123.0,49.35")).toThrow(ValidationError);
  });
});
