# Coding Conventions

**Analysis Date:** 2026-07-06

## Naming Patterns

**Files:**
- Utility modules: camelCase (e.g., `backend/src/filter.ts`, `backend/src/geo.ts`, `backend/src/db.ts`)
- React components: PascalCase (e.g., `components/PropertyCard.tsx`, `components/MapPanel.tsx`)
- Route/page files: lowercase or index (e.g., `app/browse/page.tsx`, `app/layout.tsx`)
- Test files: camelCase with `.test.ts` suffix (e.g., `tests/filter.test.ts`, `tests/geo.test.ts`)

**Functions:**
- camelCase for all functions: `filterProperties`, `parseFilter`, `getDocClient`, `withGeoAttributes`, `getPropertyById`, `encodeGeohash`, `bedroomLabel`
- Async functions prefix with action verb: `fetchProperties`, `putProperty`, `listAllProperties`, `queryByBoundingBox`
- Pure utility functions without verb: `filterProperties`, `geohashPrefix`, `isInBoundingBox`

**Variables:**
- camelCase: `properties`, `filter`, `docClient`, `cancelled`, `state`, `error`, `activeId`, `lastKey`
- React state hooks: `const [properties, setProperties] = useState(...)`
- Loop variables: `p` for property, `property` for full name in iteration

**Types:**
- PascalCase: `Property`, `PropertyType`, `PropertyFilter`, `BoundingBox`, `LoadState`, `HttpApiEvent`, `HttpApiResult`, `ApiRequest`, `ApiResponse`, `MapPanelProps`, `PropertyCardProps`
- Export in dedicated files: `lib/types.ts` contains shared types, `backend/src/types.ts` contains server-specific types
- Component props types: suffixed with `Props` (e.g., `PropertyCardProps`, `MapPanelProps`)

**Constants:**
- UPPER_SNAKE_CASE for constants: `CORS_HEADERS`, `GEOHASH_PRECISION`, `GEOHASH_PREFIX_LENGTH`, `GEO_INDEX`, `TABLE_NAME`, `API_BASE_URL`, `GEOHASH_PREFIX_LENGTH`
- Constants defined at module scope for reuse

## Code Style

**Formatting:**
- No explicit prettier config — uses Next.js defaults (2-space indentation inferred from code)
- Line length: appears to respect standard 80-100 char soft limit
- Imports formatted across multiple lines when multiple items

**Linting:**
- Tool: ESLint 9.31.0 with typescript-eslint
- Config file: `eslint.config.mjs` (flat config format)
- Rules applied: `@eslint/js` recommended, `typescript-eslint` recommended, `@next/eslint-plugin-next` core-web-vitals
- Ignores: `node_modules/`, `.next/`, `coverage/`, `infra/`
- Disables ESLint rules inline via comments when necessary (e.g., `// eslint-disable-next-line @next/next/no-img-element`)

## Import Organization

**Order:**
1. Node.js built-ins (e.g., `import { createServer } from "node:http"`)
2. Third-party libraries (e.g., `import { DynamoDBClient } from "@aws-sdk/client-dynamodb"`)
3. Internal utilities and types (e.g., `import { route } from "./router"`)
4. Type imports with `type` keyword (e.g., `import type { Property } from "./types"`)

**Path Aliases:**
- `@/*` resolves to project root in `tsconfig.json`
- Used in client components: `import { fetchProperties } from "@/lib/api"`, `import type { Property } from "@/lib/types"`
- Not used in backend files — backend uses relative paths or no aliasing

**Import Examples:**
```typescript
// Backend: relative imports
import { filterProperties, parseFilter } from "./filter";
import type { Property } from "./types";

// Frontend: path alias imports
import { fetchProperties } from "@/lib/api";
import type { Property } from "@/lib/types";
import { PropertyCard } from "@/components/PropertyCard";
```

## Error Handling

**Patterns:**
- Try-catch blocks for async operations (`backend/src/handlers.ts`, `app/browse/page.tsx`)
- Catch blocks distinguish Error instances: `err instanceof Error ? err.message : "default message"`
- Server-side: catch errors, log with `console.error()`, return HTTP error response (5xx)
- Client-side: catch errors, set local state, display to user
- No custom error classes — use standard Error with descriptive messages

**Examples:**
```typescript
// Server error handling (backend/src/handlers.ts)
try {
  const result = await route({ method, path, query });
  return { statusCode: result.statusCode, headers: CORS_HEADERS, body: JSON.stringify(result.body) };
} catch (error) {
  console.error("Unhandled error", error);
  return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: "Internal server error" }) };
}

// Client error handling (app/browse/page.tsx)
try {
  const data = await fetchProperties();
  if (!cancelled) setProperties(data);
} catch (err) {
  if (!cancelled) {
    setError(err instanceof Error ? err.message : "Failed to load listings");
    setState("error");
  }
}
```

**Validation:**
- Validation happens at parse-time (e.g., `parseFilter` checks type validity before adding to filter object)
- Invalid inputs are silently dropped: `propertyType: "castle"` is ignored because it's not in the union
- No throw on invalid input — return partial/empty object

## Logging

**Framework:** `console` (no structured logging library)

**Patterns:**
- `console.error()` for errors: `console.error("Unhandled error", error)`, `console.error(error)`
- `console.log()` for startup info: `console.log(\`Local API listening on http://localhost:${PORT}\`)`
- No debug logging observed

## Comments

**When to Comment:**
- JSDoc for exported functions and types (extensively used)
- Inline comments explain non-obvious logic (e.g., geohash precision rationale, DynamoDB scanning baseline)
- TODO comments mark work left for candidates (e.g., `// TODO (candidate): pass active filters...`)

**JSDoc/TSDoc:**
- Module-level description: `/**` block at top of exported function
- Parameter docs: listed in block when purpose is non-obvious (e.g., `@/* resolves to...`)
- Type definitions documented with inline `//` comments (e.g., in types.ts)

**Examples:**
```typescript
/**
 * Apply renter filters to a list of properties. Pure and side-effect free so it
 * is easy to unit test and reuse on either side of the wire.
 *
 * Filters compose: every provided constraint must hold for an item to pass.
 */
export function filterProperties(properties: Property[], filter: PropertyFilter): Property[] { ... }

/**
 * The set of `geohashPrefix` partitions that cover a bounding box.
 * [Longer explanation of purpose and usage...]
 */
export function boundingBoxPrefixes(box: BoundingBox): string[] { ... }
```

## Function Design

**Size:** Functions are short and focused (5-30 lines typical)

**Parameters:**
- Use object parameters for related options (e.g., `filter: PropertyFilter`, `box: BoundingBox`)
- Destructure props in React components: `function MapPanel({ properties, activeId })`
- Inline types for handler/callback parameters when used in one place only

**Return Values:**
- Functions return computed values, not null/undefined for missing data — filtering returns empty arrays, not null
- Async functions return the actual typed value: `Promise<Property[]>` not `Promise<Property[] | null>`
- Null returned explicitly when lookup fails: `getPropertyById` returns `Property | null`

**Examples:**
```typescript
// Pure function, returns computed result
export function filterProperties(properties: Property[], filter: PropertyFilter): Property[] {
  return properties.filter((property) => { ... });
}

// Async function, returns typed data
export async function putProperty(property: Omit<Property, "geohash" | "geohashPrefix">): Promise<Property> { ... }

// Lookup returns null on miss
export async function getPropertyById(id: string): Promise<Property | null> { ... }
```

## Module Design

**Exports:**
- Named exports for functions and types: `export function filterProperties(...)`, `export type Property = ...`
- Default exports for React pages and single-component files (when using Next.js conventions)
- Type exports use `export type` keyword: `export type PropertyFilter = { ... }`

**Barrel Files:**
- Not used in this codebase — components/utils imported directly by path
- Types duplicated in `backend/src/types.ts` and `lib/types.ts` (intentional — isolates backend from frontend types)

**File Organization:**
- One concept per file: `filter.ts` only has filter functions, `geo.ts` only geohashing
- Types co-located with implementation in backend, exported separately in frontend

**Example Module Structure:**
```typescript
// lib/api.ts — thin fetch wrapper
const API_BASE_URL = ...;
async function apiGet<T>(path: string): Promise<T> { ... }
function toQueryString(filter: PropertyFilter): string { ... }
export async function fetchProperties(...) { ... }
export async function fetchProperty(...) { ... }
```

---

*Convention analysis: 2026-07-06*
