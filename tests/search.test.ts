import { describe, expect, test } from "vitest";
import { searchProperties } from "../lib/filters";

type Row = { title: string; street: string; city: string; propertyType: string };

const rows: Row[] = [
  { title: "Sunny 2BR", street: "123 Main St", city: "Vancouver", propertyType: "condo" },
  { title: "Garden Suite", street: "88 Oak Ave", city: "Burnaby", propertyType: "house" },
  { title: "Downtown Loft", street: "500 Robson St", city: "Vancouver", propertyType: "apartment" }
];

describe("searchProperties", () => {
  test("empty or whitespace query returns everything", () => {
    expect(searchProperties(rows, "")).toHaveLength(3);
    expect(searchProperties(rows, "   ")).toHaveLength(3);
  });

  test("matches on city, case-insensitively", () => {
    const result = searchProperties(rows, "burnaby");
    expect(result).toHaveLength(1);
    expect(result[0].city).toBe("Burnaby");
  });

  test("matches on street and title", () => {
    expect(searchProperties(rows, "robson")).toHaveLength(1);
    expect(searchProperties(rows, "garden")).toHaveLength(1);
  });

  test("all tokens must match (AND across fields)", () => {
    expect(searchProperties(rows, "vancouver condo")).toHaveLength(1);
    expect(searchProperties(rows, "vancouver house")).toHaveLength(0);
  });

  test("no match returns empty", () => {
    expect(searchProperties(rows, "surrey")).toHaveLength(0);
  });
});
