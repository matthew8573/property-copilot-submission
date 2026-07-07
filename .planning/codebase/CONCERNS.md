# Codebase Concerns

**Analysis Date:** 2026-07-06

## Tech Debt

**Table Scan Performance Bottleneck:**
- Issue: The `/properties` endpoint calls `listAllProperties()` which scans the entire DynamoDB table on every request, then filters in-memory
- Files: `backend/src/properties.ts:41-54`, `backend/src/router.ts:45-49`
- Impact: Linear scan time grows with dataset size; with 50 listings it's negligible, but this breaks scalability. The README explicitly calls this the "BASELINE" implementation that must be replaced
- Fix approach: Implement `queryByBoundingBox()` stub in `backend/src/properties.ts:66-69` to use the geo-index GSI; convert viewport queries to geohash prefix queries as documented in `backend/src/geo.ts:41-50`

**Unimplemented Viewport Query:**
- Issue: The `queryByBoundingBox(box)` function in `backend/src/properties.ts:66-69` throws "not implemented yet" and is required for map viewport filtering
- Files: `backend/src/properties.ts:56-69`
- Impact: Map panning/zooming cannot filter results server-side; must fall back to scanning all data
- Fix approach: Wire the function to call DynamoDB Query on the geo-index GSI using geohash prefixes from `boundingBoxPrefixes(box)`, refine results with `isInBoundingBox()`, return matching properties

**Missing Filter UI:**
- Issue: The browse page has `TODO (candidate)` comments indicating the filter UI (rent range, bedrooms, +1 more) is not implemented
- Files: `app/browse/page.tsx:54-57`, `app/browse/page.tsx:24` (TODO comment)
- Impact: Although the backend supports filtering, there's no way to apply filters from the frontend; the assignment requires building this
- Fix approach: Add a filter bar component that captures rent range, bedroom count, and property type; pass active filters to `fetchProperties(filter)` on change

**Map Placeholder Only:**
- Issue: The `MapPanel` component is a placeholder that renders no actual map
- Files: `components/MapPanel.tsx`
- Impact: Core requirement (render 50 listings on a map at correct coordinates with marker interaction) is not met
- Fix approach: Replace with real map library (Google Maps, Mapbox, or Leaflet/OpenStreetMap); render markers at property coordinates; sync selection with `activeId` prop; trigger viewport queries as map pans/zooms

**Incomplete REPORT.md:**
- Issue: The REPORT.md file contains only section templates with no actual answers filled in
- Files: `REPORT.md`
- Impact: Assignment requires detailed design decisions on map provider, performance strategy, geospatial approach, and filtering model; missing report is a hard blocker for submission
- Fix approach: Fill in all four design decision sections with concrete choices and reasoning; document "What I'd add with more time" section

---

## Known Bugs

**Generic Error Messages Hide Root Cause:**
- Symptoms: Any server error returns `{ error: "Internal server error" }` with no detail
- Files: `backend/src/handlers.ts:48-55`, `backend/local-server.ts:40-43`
- Trigger: Any exception in the router or database calls
- Workaround: Check server logs (console.error); add request ID logging to trace errors

**Silent JSON Parse Failures in API Client:**
- Symptoms: If the server returns non-JSON, `response.json().catch(() => null)` swallows the error and lets `null` pass through to the type assertion
- Files: `lib/api.ts:11`
- Trigger: Server returns malformed response or redirects without JSON body
- Workaround: Check network tab in browser dev tools to see actual response

---

## Security Considerations

**Wide-Open CORS:**
- Risk: `Access-Control-Allow-Origin: *` allows any website to make requests to the API
- Files: `backend/src/handlers.ts:20-24`, `backend/local-server.ts:10-14`, `infra/lib/properties-stack.ts:64-68`
- Current mitigation: GET-only API limits damage; DynamoDB read throttling; free-tier quotas
- Recommendations: Restrict CORS to deployed frontend origin only (e.g., `https://my-domain.vercel.app`); add API key or signed request validation for production; implement rate limiting in API Gateway

**No Input Validation on Numeric Filters:**
- Risk: `parseFilter()` accepts negative rents, non-integer bedrooms, or minRent > maxRent without validation
- Files: `backend/src/filter.ts:31-59`
- Current mitigation: Frontend will enforce constraints; seed data only contains reasonable values
- Recommendations: Add validation to reject invalid ranges (minRent must be ≥ 0, maxRent must be ≥ minRent, bedrooms must be non-negative integer); return 400 Bad Request with clear error

**API Credentials Hardcoded in Local Dev:**
- Risk: `backend/src/db.ts:28-30` uses hardcoded `accessKeyId: "local"` and `secretAccessKey: "local"` for DynamoDB Local
- Files: `backend/src/db.ts:28-30`
- Current mitigation: Only used in local development when `DYNAMODB_ENDPOINT` is set; production uses ambient IAM credentials
- Recommendations: No change needed; this is safe for dev. Document that real AWS credentials never appear in code (they come from IAM role or `aws configure`)

---

## Performance Bottlenecks

**Unbounded Full Table Scans:**
- Problem: `listAllProperties()` scans every row in DynamoDB with no pagination/limit in the response
- Files: `backend/src/properties.ts:41-54`
- Cause: Naive baseline implementation that ignores the geohash GSI
- Improvement path: Replace with `queryByBoundingBox()` to use partition key + sort key queries; limit results to map viewport only

**No Pagination in API Response:**
- Problem: The `/properties` endpoint returns all matching listings in a single JSON response, which can grow large
- Files: `backend/src/router.ts:48`
- Cause: Simple implementation; no cursor-based pagination
- Improvement path: Add optional `limit` and `cursor` query params; return paginated results with `nextCursor` in response; implement on both scan and query paths

**Missing Response Caching:**
- Problem: Each `/properties` request re-scans the table even if no filters changed
- Files: `backend/src/router.ts:45-49`
- Cause: No caching at Lambda, API Gateway, or frontend level
- Improvement path: Add ETag-based caching in Lambda; use Cache-Control headers in API Gateway; implement SWR or React Query on frontend to avoid duplicate fetches during same session

**Inefficient Geohash Filter Calculation:**
- Problem: `boundingBoxPrefixes()` calls `ngeohash.bboxes()` on every request; result is deterministic and could be memoized
- Files: `backend/src/geo.ts:41-50`
- Cause: No memoization of geohash prefix computation
- Improvement path: Cache results by bounding box; consider pre-computing common viewport ranges

---

## Fragile Areas

**Geohash Constants Coupling:**
- Files: `backend/src/geo.ts:7,14` (GEOHASH_PRECISION, GEOHASH_PREFIX_LENGTH) referenced in `backend/src/properties.ts`, `infra/lib/properties-stack.ts`, tests
- Why fragile: If precision needs tuning (e.g., from 7 to 8), must update multiple places; GSI was created with specific precision values, changing them after data exists requires table migration
- Safe modification: Treat these as immutable post-deployment; if tuning needed, create new table and migration script; add validation test ensuring precision matches GSI schema
- Test coverage: `tests/geo.test.ts:23` verifies prefix length; add test that GSI is queried with correct precision

**Seed Data Timestamp Invariant:**
- Files: `backend/src/seed-data.ts:112` (hard-coded `createdAt: "2026-01-01T00:00:00.000Z"`)
- Why fragile: All 50 listings have identical timestamp; any time-based sorting, filtering, or "recently added" feature will treat them as a monolithic block
- Safe modification: If adding time-based features, regenerate seed with spread timestamps; update tests to not assume createdAt equality
- Test coverage: `tests/seed-data.test.ts:24-34` validates sane metadata but doesn't test timestamps

**DynamoDB Table Name Configuration:**
- Files: `backend/src/db.ts:4`, `infra/lib/properties-stack.ts:20`, `backend/scripts/create-local-table.ts` (inferred)
- Why fragile: Table name is configurable via env var `PROPERTIES_TABLE` but defaults to `"Properties"`; local dev table creation must match, or scripts fail silently
- Safe modification: Add startup validation that queries table to confirm it exists; log actual table name being used
- Test coverage: Add integration test that actually connects to configured table

**Singleton DocumentClient:**
- Files: `backend/src/db.ts:9-39`
- Why fragile: Module-level singleton with closure-based initialization; no way to reset between tests or reconnect on credential refresh
- Safe modification: Add `resetClient()` function for test teardown; consider dependency injection if testing gets complex
- Test coverage: No tests verify that the singleton is actually created correctly; add mock test

---

## Test Coverage Gaps

**No Endpoint/Router Tests:**
- What's not tested: The HTTP routing logic in `backend/src/router.ts` (path matching, method validation, query parameter handling)
- Files: `backend/src/router.ts`
- Risk: Edge cases like malformed paths, invalid methods, or wrong query string formats could cause undetected failures
- Priority: **High** — router is the public API contract

**No Database Integration Tests:**
- What's not tested: `backend/src/properties.ts` (putProperty, getPropertyById, listAllProperties, queryByBoundingBox stub)
- Files: `backend/src/properties.ts`
- Risk: Database queries fail in production but pass locally (e.g., env var not set, DynamoDB schema wrong)
- Priority: **High** — data layer is critical

**No Lambda Handler Tests:**
- What's not tested: `backend/src/handlers.ts` (CORS headers, event parsing, error handling in handler context)
- Files: `backend/src/handlers.ts`
- Risk: Behavior differs between local dev and production Lambda environment
- Priority: **Medium** — can be caught by end-to-end testing

**No Frontend Integration Tests:**
- What's not tested: `app/browse/page.tsx` (loading states, error handling, API call composition, filter wiring)
- Files: `app/browse/page.tsx`
- Risk: UI crashes silently on error; filter changes don't propagate; map/list sync breaks
- Priority: **Medium** — partially covered by manual testing during development

**No API Client Error Scenarios:**
- What's not tested: `lib/api.ts` (network failures, malformed responses, non-2xx status codes, timeout behavior)
- Files: `lib/api.ts`
- Risk: Error handling untested; UI may not show errors or may crash
- Priority: **Medium** — error UX is critical for user trust

**Smoke Test is Trivial:**
- What's not tested: `tests/smoke.test.ts` contains only `expect(2 + 2).toBe(4)`
- Files: `tests/smoke.test.ts`
- Risk: Smoke test adds no value; CI doesn't catch basic breakage
- Priority: **Low** — doesn't block but reduces test value

---

## Scaling Limits

**DynamoDB Pay-Per-Request Pricing:**
- Current capacity: Free tier covers 25 GB storage + 25 provisioned read units for 12 months; pay-per-request adds cost immediately after
- Limit: Each item is ~2-3 KB; 50 items = 100-150 KB easily within free tier, but scanning all items on every request will rack up read units quickly
- Scaling path: With thousands of listings, full-table scans become cost-prohibitive; geospatial query optimization (via geo-index GSI) is essential to keep request units under control

**Single Lambda Memory & Timeout:**
- Current capacity: 256 MB memory, 10 second timeout
- Limit: Large result sets (thousands of properties) could exceed timeout; 256 MB is tight if building large response payloads
- Scaling path: Increase memory to 512 MB or 1024 MB if needed; implement pagination to return smaller chunks; optimize JSON serialization

**No Connection Pooling Explicit Config:**
- Current capacity: DynamoDB SDK handles connection pooling internally; single Lambda invocation per request
- Limit: Concurrent invocations share SDK client; high traffic could hit AWS SDK limits
- Scaling path: Verify SDK connection pool settings; monitor DynamoDB throttling metrics; increase Lambda concurrency reservation if needed

---

## Missing Critical Features

**Geospatial Query Implementation:**
- Problem: `queryByBoundingBox()` is a stub; map panning/zooming cannot filter listings server-side
- Blocks: Core feature required by assignment; makes performance scalable

**Filter UI:**
- Problem: No filter bar in browse page; users cannot apply rent/bedroom/type constraints
- Blocks: Core feature required by assignment

**Map Rendering:**
- Problem: MapPanel is a placeholder; no markers rendered, no interaction
- Blocks: Core feature required by assignment (map-based rental browser)

**CI/CD Status:**
- Problem: README mentions GitHub Actions and Vercel deployment, but no `.github/workflows/` directory visible in scan
- Blocks: Assignment requires CI to run tests on every push and CD to auto-deploy on push to main

---

## Dependencies at Risk

**`ngeohash` Version Pinned to 0.6.3:**
- Risk: Package is stable but rarely updated; if a bug surfaces or security issue found, stuck on old version
- Impact: Would need to fork or work around
- Migration plan: Monitor ngeohash releases; if critical bug found, consider reimplementing geohash functions (straightforward algorithm)

**AWS SDK v3 (recent version 3.658.0):**
- Risk: Major version upgrades are common; SDK size is large
- Impact: Bundle bloat; potential API breaking changes
- Migration plan: Stable on v3 for the foreseeable future; update regularly; test before upgrading

**Next.js 16.2.9:**
- Risk: Bleeding-edge version; may have undiscovered bugs or breaking changes
- Impact: Potential instability in production
- Migration plan: Use LTS releases for production (v14/v15); upgrade test environment first

---

## Architectural Constraints

**No Async Request Queuing:**
- Current constraint: Each request is independent; no queue for long-running queries
- Impact: Slow geospatial queries could time out if they take >10 seconds
- Fix: If queries get slow, add SQS queue for async processing or increase Lambda timeout

**No Caching Layer:**
- Current constraint: Every request hits DynamoDB or scans fresh
- Impact: High request volume leads to high costs and slow response
- Fix: Add Redis or ElastiCache for query result caching; implement cache invalidation strategy

**No API Versioning:**
- Current constraint: No `/v1/`, `/v2/` path prefixes; breaking changes would affect all clients
- Impact: Hard to iterate API without breaking deployed frontend
- Fix: Add API version prefix; keep old versions running during transition

---

## Anti-Patterns

### Catch-All Error Handler with No Distinguishing

**What happens:** Both `backend/src/handlers.ts:48-55` and `backend/local-server.ts:40-43` have identical `try/catch` blocks that return generic "Internal server error" for all exceptions

**Why it's wrong:** This masks the actual error — network timeout looks the same as code bug looks the same as database unavailable. Makes debugging in production very difficult; client can't distinguish recoverable from permanent errors

**Do this instead:** Log full error stack server-side; return structured error with more specificity:
```typescript
// backend/src/handlers.ts
try {
  const result = await route({ method, path, query });
  return { statusCode: result.statusCode, headers: CORS_HEADERS, body: JSON.stringify(result.body) };
} catch (error) {
  const requestId = Math.random().toString(16); // or use X-Amzn-RequestId
  console.error(`[${requestId}] Unhandled error:`, error);
  
  if (error instanceof ValidationError) {
    return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: error.message }) };
  }
  if (error instanceof NotFoundError) {
    return { statusCode: 404, headers: CORS_HEADERS, body: JSON.stringify({ error: error.message }) };
  }
  
  // Internal error — sanitize response, include request ID for support
  return {
    statusCode: 500,
    headers: CORS_HEADERS,
    body: JSON.stringify({ error: "Internal server error", requestId })
  };
}
```

### Silent JSON Parse Failure

**What happens:** `lib/api.ts:11` calls `.catch(() => null)` on `response.json()`, which swallows parsing errors

**Why it's wrong:** If the server returns non-JSON (e.g., HTML error page from CDN, 502 from API Gateway), the client gets `null` which then passes through the type assertion `as T`, causing silent failures downstream

**Do this instead:** Distinguish between parsing errors and application errors:
```typescript
// lib/api.ts
async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" }
  });

  const contentType = response.headers.get("content-type");
  if (!contentType?.includes("application/json")) {
    throw new Error(`Expected JSON, got ${contentType} (${response.status})`);
  }

  const body = await response.json();
  if (!response.ok) {
    throw new Error(body?.error ?? `Request failed (${response.status})`);
  }
  return body as T;
}
```

### Filtering Always Happens After Full Table Scan

**What happens:** `backend/src/router.ts:45-49` calls `listAllProperties()` to get all rows, then applies filters in-memory

**Why it's wrong:** This defeats the purpose of having a geospatial GSI and filter-capable database; every request processes the entire dataset regardless of filters applied

**Do this instead:** Push filtering to the database:
```typescript
// backend/src/router.ts
if (req.path === "/properties") {
  const filter = parseFilter(req.query);
  let properties: Property[];
  
  if (req.query.bbox) {
    // Viewport query: use geospatial index
    const box = parseBoundingBox(req.query.bbox);
    properties = await queryByBoundingBox(box);
  } else {
    // No viewport: scan table (rare; only if explicitly requested)
    properties = await listAllProperties();
  }
  
  // Apply non-geospatial filters (rent, bedrooms, etc.)
  // These are small in-memory operations after database filtering
  properties = filterProperties(properties, filter);
  
  return { statusCode: 200, body: { properties, count: properties.length } };
}
```

---

*Concerns audit: 2026-07-06*
