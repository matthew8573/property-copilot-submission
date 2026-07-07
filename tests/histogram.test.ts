import { describe, expect, test } from "vitest";
import { buildRentHistogram } from "../lib/filters";

const BOUNDS = { min: 1000, max: 5000 };

describe("buildRentHistogram", () => {
  test("bins each rent and preserves the total count", () => {
    const rents = [1000, 1500, 2000, 2500, 3000, 4999];
    const hist = buildRentHistogram(rents, BOUNDS, 4);
    expect(hist).toHaveLength(4);
    expect(hist.reduce((a, b) => a + b, 0)).toBe(rents.length);
  });

  test("places rents in the correct bucket (4 buckets of $1000 over 1000-5000)", () => {
    // buckets: [1000,2000) [2000,3000) [3000,4000) [4000,5000]
    const hist = buildRentHistogram([1200, 1800, 2200, 4999], BOUNDS, 4);
    expect(hist).toEqual([2, 1, 0, 1]);
  });

  test("clamps out-of-range rents into the edge buckets", () => {
    const hist = buildRentHistogram([-500, 500, 999, 6000, 9999], BOUNDS, 4);
    expect(hist[0]).toBe(3); // everything <= min
    expect(hist[3]).toBe(2); // everything >= max
  });

  test("the max-value rent lands in the last bucket, not out of bounds", () => {
    const hist = buildRentHistogram([5000], BOUNDS, 4);
    expect(hist).toEqual([0, 0, 0, 1]);
  });

  test("ignores non-finite values", () => {
    const hist = buildRentHistogram([NaN, Infinity, 2500], BOUNDS, 4);
    expect(hist.reduce((a, b) => a + b, 0)).toBe(1);
  });

  test("degenerate inputs yield an all-zero array of the requested length", () => {
    expect(buildRentHistogram([2000], { min: 3000, max: 3000 }, 4)).toEqual([0, 0, 0, 0]);
    expect(buildRentHistogram([], BOUNDS, 3)).toEqual([0, 0, 0]);
  });
});
