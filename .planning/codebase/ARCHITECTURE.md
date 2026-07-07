<!-- refreshed: 2026-07-06 -->
# Architecture

**Analysis Date:** 2026-07-06

## System Overview

```text
┌──────────────────────────────────────────────────────────────────┐
│                    Next.js Frontend (React)                      │
│  Browser ↔ `app/browse/page.tsx`, `components/PropertyCard.tsx` │
└─────────────────────┬──────────────────────────────────────────┘
                      │ HTTP API (GET /properties, /properties/:id)
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Backend Router & Logic                        │
│       `backend/src/router.ts` → request routing                  │
│       `backend/src/properties.ts` → data access                  │
│       `backend/src/filter.ts` → filtering logic                  │
└─────────────────────┬──────────────────────────────────────────┘
                      │ Query
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│          AWS Lambda (Production) / Local HTTP Server (Dev)       │
│  `backend/src/handlers.ts` (Lambda) / `backend/local-server.ts`  │
└─────────────────────┬──────────────────────────────────────────┘
                      │ DynamoDB API
                      ▼
┌──────────────────────────────────────────────────────────────────┐
│          DynamoDB (Properties Table + Geospatial GSI)            │
│  `infra/lib/properties-stack.ts` defines table & indexes         │
└──────────────────────────────────────────────────────────────────┘
```

## Component Responsibilities

| Component | Responsibility | File |
|-----------|----------------|------|
| **Browse Page** | Fetch properties, render property list and map, manage active selection | `app/browse/page.tsx` |
| **Property Card** | Render individual listing tile with image, rent, details | `components/PropertyCard.tsx` |
| **Map Panel** | Placeholder for map implementation, receives properties & active selection | `components/MapPanel.tsx` |
| **API Client** | Thin HTTP wrapper to fetch properties with optional filters | `lib/api.ts` |
| **Router** | Route HTTP requests (GET /properties, /properties/:id) to handlers | `backend/src/router.ts` |
| **Properties Module** | Query DynamoDB for listings; compute geospatial attributes | `backend/src/properties.ts` |
| **Filter Module** | Parse query params and apply filters (rent, bedrooms, type) to results | `backend/src/filter.ts` |
| **DB Client** | Singleton DynamoDB DocumentClient; connect to local or AWS DynamoDB | `backend/src/db.ts` |
| **Lambda Handler** | AWS Lambda entrypoint; delegate to shared router | `backend/src/handlers.ts` |
| **Geospatial Helpers** | Encode/decode geohashes; compute bounding box prefix queries | `backend/src/geo.ts` |

## Pattern Overview

**Overall:** Full-stack isomorphic TypeScript with shared type definitions and decoupled frontend/backend.

**Key Characteristics:**
- **Full-stack type safety**: Types defined once (`lib/types.ts` for frontend, `backend/src/types.ts` for backend); kept in sync
- **Shared router logic**: Same request routing logic runs in Lambda and local dev server (`backend/src/router.ts` used by both `backend/src/handlers.ts` and `backend/local-server.ts`)
- **Server-side filtering**: Filter logic is stateless and pure, applied after DB query (`backend/src/filter.ts`)
- **Lazy map rendering**: Map is a placeholder; props are threaded through for implementation later
- **Geospatial foundation**: Geohashing infra is present but `queryByBoundingBox()` is not yet implemented

## Layers

**Frontend (Browser):**
- Purpose: Render rental listings and map; capture user selections and filters
- Location: `app/`, `components/`, `lib/`
- Contains: React pages, components, client-side API wrapper, type definitions
- Depends on: HTTP API backend
- Used by: End users in a web browser

**API Layer:**
- Purpose: Route requests, validate inputs, orchestrate backend logic
- Location: `backend/src/router.ts`
- Contains: Path matching, HTTP method validation, request/response formatting
- Depends on: Properties module, Filter module
- Used by: Lambda handler and local dev server

**Data Access & Business Logic:**
- Purpose: Query DynamoDB, apply filters, compute geospatial attributes
- Location: `backend/src/properties.ts`, `backend/src/filter.ts`, `backend/src/geo.ts`, `backend/src/db.ts`
- Contains: Query builders, filter algorithms, geohash utilities
- Depends on: DynamoDB client, type definitions
- Used by: Router

**Infrastructure:**
- Purpose: Define AWS resources (DynamoDB table, GSI, Lambda, API Gateway)
- Location: `infra/lib/properties-stack.ts`, `infra/bin/app.ts`
- Contains: CDK stack definitions
- Depends on: AWS CDK library
- Used by: Deployment pipeline

## Data Flow

### Primary Request Path (Browse Page → List)

1. User loads `/browse` in browser → Next.js renders `app/browse/page.tsx` (`app/browse/page.tsx:11-42`)
2. `useEffect` hook fires on mount, calls `fetchProperties()` with empty filter (`app/browse/page.tsx:20-25`)
3. Client wrapper `fetchProperties()` makes HTTP GET to `${API_BASE_URL}/properties` (`lib/api.ts:28-31`)
4. Backend router receives GET /properties request → calls `route()` (`backend/src/router.ts:45-49`)
5. Router calls `listAllProperties()` (scans entire table) and `filterProperties()` (`backend/src/router.ts:46-47`)
6. Properties and count returned as JSON; frontend updates state (`app/browse/page.tsx:27-28`)
7. Browse page renders property list as grid of `<PropertyCard>` components (`app/browse/page.tsx:73-82`)

### Property Detail Fetch

1. When user clicks a property marker or card → `onSelect(id)` handler fires
2. Client can call `fetchProperty(id)` to load full details (`lib/api.ts:33-36`)
3. Backend routes GET /properties/{id} → retrieves from table (`backend/src/router.ts:30-37`)
4. Returns single property object; frontend updates `activeId` state

### Map Synchronization

1. Browse page passes `activeId` to `MapPanel` component (`app/browse/page.tsx:87`)
2. `MapPanel` receives `properties` array and `activeId`; props allow marker selection to sync back (`components/MapPanel.tsx:22`)
3. When map implementation is added, clicking a marker calls `onSelect()` callback to update browse page state

**State Management:**
- Frontend uses React `useState` hooks for: `properties[]`, `state` (loading/error/ready), `error`, `activeId`
- No global state manager (Redux/Zustand); prop drilling connects Browse page ↔ PropertyCard ↔ MapPanel
- Backend is stateless; all state lives in DynamoDB

## Key Abstractions

**Property (Data Model):**
- Purpose: Unified shape across frontend and backend; ensures type consistency
- Examples: `lib/types.ts`, `backend/src/types.ts`
- Pattern: Shared interface mirrored in both; backend adds computed fields (geohash, geohashPrefix)

**PropertyFilter (Query Model):**
- Purpose: Encapsulate optional filter constraints
- Examples: `lib/types.ts:27-32`, `backend/src/types.ts:39-45`
- Pattern: Optional fields; composable (all constraints AND together)

**HTTP API Wrapper:**
- Purpose: Centralize fetch logic, error handling, base URL
- Examples: `lib/api.ts:6-16`
- Pattern: Generic `apiGet<T>()` with JSON error handling

**Geohash Utilities:**
- Purpose: Encode lat/lng to geohash; compute spatial prefixes for GSI queries
- Examples: `backend/src/geo.ts:24-55`
- Pattern: Pure functions; GEOHASH_PRECISION (7) for storage, GEOHASH_PREFIX_LENGTH (5) for partitioning

## Entry Points

**Frontend Entry Point:**
- Location: `app/page.tsx`
- Triggers: User navigates to `/` (home)
- Responsibilities: Render landing page with link to `/browse`

**Browse Page (Core Feature):**
- Location: `app/browse/page.tsx`
- Triggers: User navigates to `/browse`
- Responsibilities: Fetch listings, render list + map placeholders, handle active selection

**API Entry Point (Production):**
- Location: `backend/src/handlers.ts`
- Triggers: AWS Lambda invoked by API Gateway (HTTP request)
- Responsibilities: Parse event, extract method/path/query, call router, return formatted response

**API Entry Point (Development):**
- Location: `backend/local-server.ts`
- Triggers: `npm run dev:api` starts HTTP server on port 4000
- Responsibilities: Emulate API Gateway behavior locally; call same router as Lambda

## Architectural Constraints

- **Threading:** Node.js single-threaded event loop for both frontend (Next.js) and backend (Lambda/local server). No worker threads. DynamoDB operations are async but non-blocking.
- **Global state:** Single shared `DynamoDBDocumentClient` singleton in `backend/src/db.ts` (lines 9-40). All DB operations use this one instance (lazily initialized).
- **Circular imports:** None detected. Imports flow: handlers → router → properties/filter → db/geo. Components import types but not vice versa.
- **Request model:** API Gateway HTTP API (payload format 2.0) used in production. Local dev mimics this format exactly.
- **CORS:** Hardcoded `Access-Control-Allow-Origin: *` on all responses. No credentials required.

## Anti-Patterns

### Full Table Scan on Every List Request

**What happens:** `listAllProperties()` in `backend/src/properties.ts` (lines 41-54) performs an unconditional `ScanCommand` on the DynamoDB table, which traverses every row. This is called for every GET /properties request regardless of map viewport or filters.

**Why it's wrong:** As the properties table grows (from 50 seeded rows to thousands), each request scans more data, increasing latency and DynamoDB read capacity costs. The client always fetches all 50 listings even when showing only a small city region.

**Do this instead:** Implement `queryByBoundingBox()` stub in `backend/src/properties.ts` (lines 66-69). Read map viewport from query param (e.g., `?bbox=minLat,minLng,maxLat,maxLng`), call `boundingBoxPrefixes()` from `backend/src/geo.ts`, Query the geo-index GSI with partition key filtering, and refine results with `isInBoundingBox()`.

### Unfiltered Client-Side Rendering

**What happens:** `MapPanel` receives all properties array and renders without pagination or virtualization. If 10,000 listings are fetched, the component attempts to render 10,000 markers at once.

**Why it's wrong:** Browser memory explodes; marker layers become unresponsive.

**Do this instead:** Implement viewport-aware querying in the backend (see anti-pattern above). Only fetch properties visible on the current map bounds. Add marker clustering (e.g., Mapbox Cluster option or Leaflet.markercluster) if many points fall in one viewport cell.

## Error Handling

**Strategy:** Errors bubble from deep to surface; minimal retry logic.

**Patterns:**
- **Backend → Frontend:** Errors caught in `route()` → wrapped in `{ error: string }` response body with appropriate HTTP status (404, 405, 500)
- **Frontend fetch wrapper:** `apiGet()` checks response.ok; throws Error with body.error or generic message (`lib/api.ts:11-14`)
- **Component error boundary:** Browse page catches fetch errors in `useEffect`, sets error state, displays message (`app/browse/page.tsx:30-34`)
- **No retry logic:** Failures are reported to user; manual refresh required

## Cross-Cutting Concerns

**Logging:** Console.error for unhandled exceptions in Lambda handler (`backend/src/handlers.ts:49`) and local server (`backend/local-server.ts:42`). Frontend errors logged to console via component error handler.

**Validation:** Query parameter parsing in `parseFilter()` (`backend/src/filter.ts:31-59`) coerces strings to numbers/enums; invalid values silently ignored (e.g., propertyType: "castle" → omitted from filter).

**Authentication:** Not implemented. API is public (`Access-Control-Allow-Origin: *`). Assumes no sensitive user data; suitable for open rentals directory.

---

*Architecture analysis: 2026-07-06*
