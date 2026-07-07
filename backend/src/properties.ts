import { GetCommand, PutCommand, QueryCommand, ScanCommand } from "@aws-sdk/lib-dynamodb";
import { GEO_INDEX, TABLE_NAME, getDocClient } from "./db";
import {
  SERVICE_AREA,
  boundingBoxPrefixes,
  encodeGeohash,
  geohashPrefix,
  intersectBoundingBoxes,
  isInBoundingBox,
  type BoundingBox
} from "./geo";
import type { Property } from "./types";

/** Compute the geo index attributes for an item from its coordinates. */
export function withGeoAttributes(
  property: Omit<Property, "geohash" | "geohashPrefix">
): Property {
  const geohash = encodeGeohash(property.lat, property.lng);
  return { ...property, geohash, geohashPrefix: geohashPrefix(geohash) };
}

export async function putProperty(
  property: Omit<Property, "geohash" | "geohashPrefix">
): Promise<Property> {
  const item = withGeoAttributes(property);
  await getDocClient().send(new PutCommand({ TableName: TABLE_NAME, Item: item }));
  return item;
}

export async function getPropertyById(id: string): Promise<Property | null> {
  const result = await getDocClient().send(
    new GetCommand({ TableName: TABLE_NAME, Key: { id } })
  );
  return (result.Item as Property | undefined) ?? null;
}

/**
 * Returns every property via a full table scan. This serves bbox-less
 * requests and the wide-viewport branch of `queryByBoundingBox`.
 */
export async function listAllProperties(): Promise<Property[]> {
  const items: Property[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await getDocClient().send(
      new ScanCommand({ TableName: TABLE_NAME, ExclusiveStartKey: lastKey })
    );
    items.push(...((result.Items as Property[] | undefined) ?? []));
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return items;
}

/**
 * Fan out to the geo GSI only while the viewport is selective. Above this
 * many covering partitions, one bounded scan is strictly cheaper at this
 * table size: measured on the deployed stack, a metro-wide viewport cost
 * ~2.3s via ~130 partition Queries (most of them empty) versus ~0.1s via a
 * single scan. The GSI wins again as the viewport narrows — a downtown box
 * covers ~4 partitions and answers in ~90ms. As the dataset grows, the
 * crossover shifts toward the GSI; a coarser second index level would remove
 * the wide-viewport case entirely (see REPORT.md).
 */
const FANOUT_MAX_PREFIXES = 24;

/** Read every row of one geohash-prefix partition on the geo GSI, paging as needed. */
async function queryGeoPartition(prefix: string): Promise<Property[]> {
  const items: Property[] = [];
  let lastKey: Record<string, unknown> | undefined;

  do {
    const result = await getDocClient().send(
      new QueryCommand({
        TableName: TABLE_NAME,
        IndexName: GEO_INDEX,
        KeyConditionExpression: "geohashPrefix = :prefix",
        ExpressionAttributeValues: { ":prefix": prefix },
        ExclusiveStartKey: lastKey
      })
    );
    items.push(...((result.Items as Property[] | undefined) ?? []));
    lastKey = result.LastEvaluatedKey as Record<string, unknown> | undefined;
  } while (lastKey);

  return items;
}

/**
 * Geospatial viewport query: which properties fall inside `box`?
 *
 *   1. Clamp the requested box to the service area — no data lives outside
 *      it, so panning to Toronto answers instantly with nothing.
 *   2. `boundingBoxPrefixes` -> the geohash partitions covering the clamped
 *      box.
 *   3. Selective viewport: Query the `geo-index` GSI once per partition, in
 *      parallel (partitions are disjoint, so no dedupe needed). Wide
 *      viewport (> FANOUT_MAX_PREFIXES partitions): a single bounded scan is
 *      cheaper — see the constant above for measurements.
 *   4. Refine: geohash cells overhang the box edges, so drop items whose
 *      exact lat/lng falls outside the clamped box.
 */
export async function queryByBoundingBox(box: BoundingBox): Promise<Property[]> {
  const clamped = intersectBoundingBoxes(box, SERVICE_AREA);
  if (!clamped) {
    return [];
  }

  const prefixes = boundingBoxPrefixes(clamped);
  const candidates =
    prefixes.length > FANOUT_MAX_PREFIXES
      ? await listAllProperties()
      : (await Promise.all(prefixes.map(queryGeoPartition))).flat();

  return candidates.filter((p) => isInBoundingBox(p.lat, p.lng, clamped));
}
