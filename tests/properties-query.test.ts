import { beforeEach, describe, expect, test } from "vitest";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import ngeohash from "ngeohash";
import { queryByBoundingBox } from "../backend/src/properties";
import {
  SERVICE_AREA,
  boundingBoxPrefixes,
  encodeGeohash,
  geohashPrefix,
  intersectBoundingBoxes,
  type BoundingBox
} from "../backend/src/geo";
import type { Property } from "../backend/src/types";

const ddb = mockClient(DynamoDBDocumentClient);

/** Minimal but complete Property fixture at a coordinate. */
function propertyAt(id: string, lat: number, lng: number): Property {
  const geohash = encodeGeohash(lat, lng);
  return {
    id,
    title: id,
    description: "test",
    rent: 2400,
    bedrooms: 1,
    bathrooms: 1,
    propertyType: "condo",
    squareFeet: 600,
    street: "1 Test St",
    city: "Vancouver",
    province: "BC",
    postalCode: "V6B 1A1",
    lat,
    lng,
    geohash,
    geohashPrefix: geohashPrefix(geohash),
    images: [],
    createdAt: "2026-01-01T00:00:00.000Z"
  };
}

// Anchor the tests to the geohash cell containing downtown Vancouver, and
// request a box strictly inside that cell so exactly one partition covers it.
const CELL_PREFIX = geohashPrefix(encodeGeohash(49.2827, -123.1207));
const [cellMinLat, cellMinLng, cellMaxLat, cellMaxLng] = ngeohash.decode_bbox(CELL_PREFIX);
const latPad = (cellMaxLat - cellMinLat) * 0.2;
const lngPad = (cellMaxLng - cellMinLng) * 0.2;
const INNER_BOX: BoundingBox = {
  minLat: cellMinLat + latPad,
  minLng: cellMinLng + lngPad,
  maxLat: cellMaxLat - latPad,
  maxLng: cellMaxLng - lngPad
};
const CELL_CENTRE = {
  lat: (cellMinLat + cellMaxLat) / 2,
  lng: (cellMinLng + cellMaxLng) / 2
};

/** Answer each partition Query from a prefix -> items map. */
function respondWith(itemsByPrefix: Record<string, Property[]>) {
  ddb.on(QueryCommand).callsFake((input) => {
    const prefix = input.ExpressionAttributeValues?.[":prefix"] as string;
    return { Items: itemsByPrefix[prefix] ?? [] };
  });
}

function queriedPrefixes(): string[] {
  return ddb
    .commandCalls(QueryCommand)
    .map((call) => call.args[0].input.ExpressionAttributeValues?.[":prefix"] as string);
}

beforeEach(() => {
  ddb.reset();
});

describe("queryByBoundingBox", () => {
  test("sanity: the inner box is covered by exactly its own cell", () => {
    expect(boundingBoxPrefixes(INNER_BOX)).toEqual([CELL_PREFIX]);
  });

  test("queries the geo-index GSI and refines to the exact box", async () => {
    const inside = propertyAt("prop-inside", CELL_CENTRE.lat, CELL_CENTRE.lng);
    // Same geohash cell (same partition), but outside the requested box: the
    // cell overhangs the box edges, so the refine step must drop it.
    const overhang = propertyAt("prop-overhang", cellMinLat + latPad / 2, CELL_CENTRE.lng);
    respondWith({ [CELL_PREFIX]: [inside, overhang] });

    const result = await queryByBoundingBox(INNER_BOX);

    expect(result.map((p) => p.id)).toEqual(["prop-inside"]);
    const calls = ddb.commandCalls(QueryCommand);
    expect(calls).toHaveLength(1);
    expect(calls[0].args[0].input.IndexName).toBe("geo-index");
    expect(calls[0].args[0].input.KeyConditionExpression).toContain("geohashPrefix");
    expect(queriedPrefixes()).toEqual([CELL_PREFIX]);
  });

  test("follows pagination within a partition", async () => {
    const first = propertyAt("prop-page-1", CELL_CENTRE.lat, CELL_CENTRE.lng);
    const second = propertyAt("prop-page-2", CELL_CENTRE.lat + latPad / 4, CELL_CENTRE.lng);
    ddb.on(QueryCommand).callsFake((input) =>
      input.ExclusiveStartKey === undefined
        ? { Items: [first], LastEvaluatedKey: { id: first.id } }
        : { Items: [second] }
    );

    const result = await queryByBoundingBox(INNER_BOX);

    expect(result.map((p) => p.id).sort()).toEqual(["prop-page-1", "prop-page-2"]);
    expect(ddb.commandCalls(QueryCommand)).toHaveLength(2);
  });

  test("fans out across every partition covering the box", async () => {
    const eastPrefix = ngeohash.neighbor(CELL_PREFIX, [0, 1]);
    const [eastMinLat, eastMinLng, eastMaxLat, eastMaxLng] = ngeohash.decode_bbox(eastPrefix);
    const wideBox: BoundingBox = {
      minLat: INNER_BOX.minLat,
      minLng: INNER_BOX.minLng,
      maxLat: INNER_BOX.maxLat,
      maxLng: eastMaxLng - lngPad
    };
    expect(new Set(boundingBoxPrefixes(wideBox))).toEqual(new Set([CELL_PREFIX, eastPrefix]));

    const west = propertyAt("prop-west", CELL_CENTRE.lat, CELL_CENTRE.lng);
    const east = propertyAt(
      "prop-east",
      (eastMinLat + eastMaxLat) / 2,
      (eastMinLng + eastMaxLng) / 2
    );
    respondWith({ [CELL_PREFIX]: [west], [eastPrefix]: [east] });

    const result = await queryByBoundingBox(wideBox);

    expect(result.map((p) => p.id).sort()).toEqual(["prop-east", "prop-west"]);
    expect(new Set(queriedPrefixes())).toEqual(new Set([CELL_PREFIX, eastPrefix]));
  });

  test("returns empty without querying when the box is outside the service area", async () => {
    respondWith({});
    const toronto: BoundingBox = { minLat: 43.6, minLng: -79.5, maxLat: 43.7, maxLng: -79.3 };

    const result = await queryByBoundingBox(toronto);

    expect(result).toEqual([]);
    expect(ddb.commandCalls(QueryCommand)).toHaveLength(0);
  });

  test("clamps an oversized box to the service area before querying", async () => {
    respondWith({});
    // Stretches far west of the service area; only the overlap should be queried.
    const oversized: BoundingBox = { minLat: 49.25, minLng: -140, maxLat: 49.3, maxLng: -123.1 };
    const clamped = intersectBoundingBoxes(oversized, SERVICE_AREA);

    await queryByBoundingBox(oversized);

    expect(clamped).not.toBeNull();
    expect(new Set(queriedPrefixes())).toEqual(new Set(boundingBoxPrefixes(clamped!)));
  });

  test("a wide viewport uses one bounded scan instead of a partition fan-out", async () => {
    // Nearly the whole service area: covered by far more partitions than the
    // fan-out threshold, where a single scan is measurably cheaper.
    const wide: BoundingBox = { minLat: 49.0, minLng: -123.45, maxLat: 49.45, maxLng: -122.5 };
    expect(boundingBoxPrefixes(wide).length).toBeGreaterThan(24);

    const inside = propertyAt("prop-in", 49.2827, -123.1207);
    const outside = propertyAt("prop-out", 49.47, -122.6); // in the table, outside the box
    ddb.on(ScanCommand).resolves({ Items: [inside, outside] });

    const result = await queryByBoundingBox(wide);

    expect(result.map((p) => p.id)).toEqual(["prop-in"]);
    expect(ddb.commandCalls(QueryCommand)).toHaveLength(0);
    expect(ddb.commandCalls(ScanCommand).length).toBeGreaterThan(0);
  });
});
