# Testing Patterns

**Analysis Date:** 2026-07-06

## Test Framework

**Runner:**
- Vitest 3.2.4
- Config: `vitest.config.ts`

**Assertion Library:**
- Vitest built-in `expect()` API (similar to Jest)

**Run Commands:**
```bash
npm run test              # Run all tests once
npm run test -- --watch  # Watch mode
npm run test -- --coverage # Coverage report
```

**Test Environment:**
- Node.js environment (no DOM)
- Globals enabled (no need to import `describe`, `test`, `expect`)
- Setup file: `tests/setup.ts`

## Test File Organization

**Location:**
- All tests in `tests/` directory (separate from source)
- Not co-located with source files

**Naming:**
- Pattern: `<module>.test.ts` (e.g., `filter.test.ts`, `geo.test.ts`, `seed-data.test.ts`, `smoke.test.ts`)
- Suffix: `.test.ts`

**Directory Structure:**
```
tests/
├── setup.ts                # Environment setup run before tests
├── filter.test.ts          # Tests for backend/src/filter.ts
├── geo.test.ts             # Tests for backend/src/geo.ts
├── seed-data.test.ts       # Tests for backend/src/seed-data.ts
└── smoke.test.ts           # Basic sanity check
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, test } from "vitest";
import { functionToTest } from "../backend/src/module";

describe("module name or feature", () => {
  test("specific behavior being tested", () => {
    // arrange
    const input = someValue;
    
    // act
    const result = functionToTest(input);
    
    // assert
    expect(result).toBe(expectedValue);
  });
});
```

**Patterns:**
- One `describe()` block per module/feature
- Multiple `test()` blocks for specific behaviors
- Inline setup (no separate `beforeEach`/`afterEach` observed)
- Arrange-act-assert pattern (implicit)

**Example Test Suite** (`tests/filter.test.ts`):
```typescript
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

  test("filters compose: combining rent and bedrooms narrows the result", () => {
    const rentOnly = filterProperties(PROPERTIES, { maxRent: 3000 });
    const both = filterProperties(PROPERTIES, { maxRent: 3000, bedrooms: 2 });
    expect(both.length).toBeLessThanOrEqual(rentOnly.length);
    expect(both.every((p) => p.rent <= 3000 && p.bedrooms >= 2)).toBe(true);
  });
});
```

## Setup and Teardown

**Global Setup:**
- File: `tests/setup.ts`
- Runs before all tests (via `setupFiles` in vitest.config.ts)

**Current Setup:**
```typescript
// tests/setup.ts
process.env.PROPERTIES_TABLE = process.env.PROPERTIES_TABLE ?? "Properties-test";
process.env.AWS_REGION = process.env.AWS_REGION ?? "us-west-2";
```

**Per-Test Setup:**
- No `beforeEach`/`afterEach` used
- Test data imported at top level (e.g., `const PROPERTIES = SEED_PROPERTIES as Property[]`)
- Setup operations inline in test function when needed

## Assertion Patterns

**Common Assertions:**
```typescript
expect(value).toBe(expected)                    // Strict equality
expect(value).toEqual(expected)                 // Deep equality
expect(value).toHaveLength(n)                   // Array length
expect(value).toBeGreaterThan(n)                // Numeric comparison
expect(value).toBeGreaterThanOrEqual(n)         // Numeric comparison
expect(value).toBeLessThanOrEqual(n)            // Numeric comparison
expect(array).toContain(value)                  // Array contains
expect(predicate).toBe(true)                    // Boolean test
expect(array.every(...)).toBe(true)             // All elements pass predicate
```

**Example Usage** (`tests/geo.test.ts`):
```typescript
test("encodeGeohash is deterministic and prefix is the right length", () => {
  const hash = encodeGeohash(49.2827, -123.1207);
  expect(hash).toBe(encodeGeohash(49.2827, -123.1207));
  expect(geohashPrefix(hash)).toHaveLength(GEOHASH_PREFIX_LENGTH);
  expect(hash.startsWith(geohashPrefix(hash))).toBe(true);
});
```

## Mocking

**Framework:**
- No explicit mocking library used
- Tests are pure unit tests — no dependencies mocked

**Patterns:**
- No mock observed in codebase
- All tests use real implementations
- Test data imported from actual seed files: `import { SEED_PROPERTIES } from "../backend/src/seed-data"`

**What to Mock:**
- DynamoDB access: Not mocked in test suite. Real implementation called. Environment variable `DYNAMODB_ENDPOINT` points to local DynamoDB when set.
- External APIs: Not tested (only internal functions tested)
- Environment-dependent behavior: Controlled via env vars (setup.ts)

**What NOT to Mock:**
- Pure functions (e.g., `filterProperties`, `encodeGeohash`)
- Business logic core functions

## Fixtures and Test Data

**Test Data Sources:**
- Imported from seed data: `import { SEED_PROPERTIES } from "../backend/src/seed-data"`
- Test data used directly: `const PROPERTIES = SEED_PROPERTIES as Property[]`
- Constants defined inline in test files: `const VANCOUVER_BOX: BoundingBox = { minLat: 49.26, ... }`

**Location:**
- `tests/` directory (test-only)
- Seed data in `backend/src/seed-data.ts` (actual data generator, used by tests and seeding)

**Example Fixture Setup** (`tests/geo.test.ts`):
```typescript
const VANCOUVER_BOX: BoundingBox = {
  minLat: 49.26,
  minLng: -123.14,
  maxLat: 49.3,
  maxLng: -123.1
};

describe("geo", () => {
  // Tests use VANCOUVER_BOX
  test("boundingBoxPrefixes covers the box and is de-duplicated", () => {
    const prefixes = boundingBoxPrefixes(VANCOUVER_BOX);
    expect(prefixes.length).toBeGreaterThan(0);
    // ...
  });
});
```

## Coverage

**Requirements:**
- No explicit coverage requirement enforced
- Coverage output available via `npm run test -- --coverage`

**View Coverage:**
```bash
npm run test -- --coverage
```

## Test Types

**Unit Tests:**
- Scope: Individual functions and modules
- Approach: Pure function testing (no side effects, no network calls)
- Examples:
  - `tests/filter.test.ts` — filter composition, range inclusion, validation
  - `tests/geo.test.ts` — geohash encoding, bounding box calculations
  - `tests/seed-data.test.ts` — determinism, uniqueness, data validity

**Integration Tests:**
- Not observed
- Router (`backend/src/router.ts`) tested only in isolation, not with HTTP layer

**E2E Tests:**
- Not implemented
- No test for full request-response flow

## Common Patterns

**Pure Function Testing:**
```typescript
// Simple pure function test
test("no filters returns everything", () => {
  expect(filterProperties(PROPERTIES, {})).toHaveLength(PROPERTIES.length);
});
```

**Determinism Testing:**
```typescript
// Verify function returns same result for same input
test("is deterministic", () => {
  expect(generateProperties()).toEqual(properties);
});
```

**Composition Testing:**
```typescript
// Test that filters compose correctly
test("filters compose: combining rent and bedrooms narrows the result", () => {
  const rentOnly = filterProperties(PROPERTIES, { maxRent: 3000 });
  const both = filterProperties(PROPERTIES, { maxRent: 3000, bedrooms: 2 });
  expect(both.length).toBeLessThanOrEqual(rentOnly.length);
  expect(both.every((p) => p.rent <= 3000 && p.bedrooms >= 2)).toBe(true);
});
```

**Boundary Testing:**
```typescript
// Test edge cases and boundaries
test("isInBoundingBox respects edges", () => {
  expect(isInBoundingBox(49.28, -123.12, VANCOUVER_BOX)).toBe(true);
  expect(isInBoundingBox(49.19, -122.85, VANCOUVER_BOX)).toBe(false);
});
```

**Type Validation Testing:**
```typescript
// Test parsing and type coercion
test("parses valid query params", () => {
  expect(
    parseFilter({ minRent: "1500", maxRent: "3000", bedrooms: "2", propertyType: "house" })
  ).toEqual({ minRent: 1500, maxRent: 3000, bedrooms: 2, propertyType: "house" });
});

test("ignores invalid property type and absent fields", () => {
  expect(parseFilter({ propertyType: "castle" })).toEqual({});
  expect(parseFilter({})).toEqual({});
});
```

**Loop Iteration Testing:**
```typescript
// Test assertions across multiple items
test("every listing has exactly five images and sane metadata", () => {
  for (const p of properties) {
    expect(p.images).toHaveLength(5);
    expect(p.province).toBe("BC");
    expect(p.rent).toBeGreaterThan(0);
    expect(p.bedrooms).toBeGreaterThanOrEqual(0);
  }
});
```

## Coverage Gaps

**Not Tested:**
- HTTP handlers (`backend/src/handlers.ts`) — handler function not called in tests
- Local dev server (`backend/local-server.ts`) — Node.js HTTP setup not tested
- React components — no component tests
- Client-side logic (`lib/api.ts`, `app/browse/page.tsx`) — no client tests
- DynamoDB integration — no database tests (schema assumed valid)

**Test Count:**
- 4 test files with approximately 20-25 tests total

---

*Testing analysis: 2026-07-06*
