# Codebase Structure

**Analysis Date:** 2026-07-06

## Directory Layout

```
property-copilot-intern-oa-FA2026/
├── app/                        # Next.js App Router pages
│   ├── page.tsx               # Home page (index route)
│   ├── layout.tsx             # Root layout wrapper
│   ├── globals.css            # Global Tailwind styles
│   └── browse/
│       └── page.tsx           # Browse listings page (core feature)
├── backend/                    # Lambda backend logic
│   ├── src/
│   │   ├── db.ts              # DynamoDB client singleton
│   │   ├── handlers.ts        # Lambda event handler (AWS entry point)
│   │   ├── router.ts          # HTTP request router (shared logic)
│   │   ├── properties.ts      # Data access: query, filter, geospatial
│   │   ├── filter.ts          # Filter composition & query parsing
│   │   ├── geo.ts             # Geohashing & bounding box utilities
│   │   ├── types.ts           # Backend-only type definitions
│   │   └── seed-data.ts       # 50 test property records
│   ├── local-server.ts        # Local HTTP server for development
│   └── scripts/
│       ├── create-local-table.ts   # Initialize DynamoDB Local
│       └── seed.ts            # Populate table with seed data
├── components/                 # React components (Next.js conventions)
│   ├── PropertyCard.tsx        # Listing tile (rent, image, details)
│   └── MapPanel.tsx           # Map placeholder (YOUR TODO)
├── lib/                        # Shared client utilities
│   ├── api.ts                 # HTTP fetch wrapper for /properties endpoints
│   └── types.ts               # Shared types (Property, PropertyFilter)
├── infra/                      # AWS CDK infrastructure
│   ├── lib/
│   │   └── properties-stack.ts # CDK stack: DynamoDB + Lambda + API Gateway
│   ├── bin/
│   │   └── app.ts             # CDK app entrypoint
│   └── package.json           # Separate CDK dependencies
├── tests/                      # Unit & integration tests
│   ├── setup.ts               # Vitest global setup
│   ├── filter.test.ts         # Filter logic tests
│   ├── geo.test.ts            # Geohash tests
│   ├── seed-data.test.ts      # Seed data validation
│   └── smoke.test.ts          # Basic API smoke tests
├── .planning/                  # Documentation & planning
│   └── codebase/
│       └── ARCHITECTURE.md    # (This file's companion)
├── .github/                    # GitHub workflows
│   └── workflows/             # CI/CD pipelines
├── package.json               # Root workspace dependencies
├── tsconfig.json              # TypeScript config (excludes infra, tests)
├── eslint.config.mjs          # ESLint rules (ignores infra, .next, node_modules)
├── vitest.config.ts           # Vitest test runner config
└── [root config files]        # .gitignore, etc.
```

## Directory Purposes

**`app/`:**
- Purpose: Next.js App Router directory; each .tsx file is a route
- Contains: Page components, layout wrappers, global CSS
- Key files: `app/page.tsx` (home), `app/browse/page.tsx` (main feature), `app/layout.tsx` (root wrapper)

**`backend/src/`:**
- Purpose: Core backend business logic and data access
- Contains: Router, properties module, filters, geospatial helpers, type definitions
- Key files: `router.ts` (request routing), `properties.ts` (DB queries), `filter.ts` (filter logic)

**`backend/scripts/`:**
- Purpose: Development utilities for local setup
- Contains: DynamoDB Local initialization, seed data loading
- Key files: `create-local-table.ts` (setup), `seed.ts` (populate with test data)

**`components/`:**
- Purpose: Reusable React components
- Contains: Presentational components (PropertyCard, MapPanel)
- Key files: `PropertyCard.tsx` (listing tile), `MapPanel.tsx` (map placeholder)

**`lib/`:**
- Purpose: Client-side utilities and shared types
- Contains: HTTP API wrapper, TypeScript interfaces
- Key files: `api.ts` (fetch wrapper), `types.ts` (shared Property interface)

**`infra/`:**
- Purpose: AWS infrastructure as code (CDK)
- Contains: Stack definitions for Lambda, DynamoDB, API Gateway
- Key files: `lib/properties-stack.ts` (main stack definition)
- **Note:** Separate `package.json` with CDK-specific dependencies

**`tests/`:**
- Purpose: Unit and integration tests
- Contains: Test suites for filters, geohashing, API smoke tests
- Key files: `filter.test.ts`, `geo.test.ts`, `smoke.test.ts`

## Key File Locations

**Entry Points:**
- Frontend home: `app/page.tsx` — renders landing page with link to `/browse`
- Frontend main app: `app/browse/page.tsx` — fetches and renders properties
- API (prod): `backend/src/handlers.ts` — Lambda handler invoked by API Gateway
- API (dev): `backend/local-server.ts` — local HTTP server on port 4000

**Configuration:**
- TypeScript config: `tsconfig.json` — ES2017 target, Next.js plugins, path aliases (`@/*`)
- ESLint config: `eslint.config.mjs` — recommended + Next.js core rules
- Vitest config: `vitest.config.ts` — Node environment, path aliases, global test setup
- Package manager: `package.json` — Node 24.x, Next.js 16, React 19, AWS SDK

**Core Logic:**
- Property queries: `backend/src/properties.ts` — DynamoDB scanning (BASELINE), geohashing
- Filtering: `backend/src/filter.ts` — Pure filter functions, query parameter parsing
- Geospatial: `backend/src/geo.ts` — Geohash encoding, bounding box prefix computation
- Routing: `backend/src/router.ts` — HTTP request dispatch to handlers
- Type definitions: `lib/types.ts`, `backend/src/types.ts` — Property, PropertyFilter shapes

**Testing:**
- Tests directory: `tests/` — Vitest suite
- Test setup: `tests/setup.ts` — Global test environment configuration

## Naming Conventions

**Files:**
- Pages (Next.js App Router): `app/*/page.tsx` for each route
- Components: `components/*.tsx` using PascalCase (e.g., `PropertyCard.tsx`)
- Utilities: `lib/*.ts` and `backend/src/*.ts` using camelCase (e.g., `filterProperties()`, `getDocClient()`)
- Handlers: `*-handler.ts` or `handlers.ts` for Lambda entry
- Seed/mock data: `seed-data.ts`

**Functions:**
- Queries: `get*()`, `list*()`, `query*()` (e.g., `getPropertyById`, `listAllProperties`)
- Mutations: `put*()`, `delete*()` (e.g., `putProperty`)
- Filters: `filter*()` (e.g., `filterProperties`)
- Parsers: `parse*()` (e.g., `parseFilter`)
- Helpers: `*()` (e.g., `encodeGeohash`, `boundingBoxPrefixes`)
- React components: PascalCase with descriptive names (e.g., `PropertyCard`, `MapPanel`)

**Variables:**
- Constants: UPPER_SNAKE_CASE (e.g., `TABLE_NAME`, `GEOHASH_PRECISION`, `CORS_HEADERS`)
- React state: camelCase (e.g., `properties`, `activeId`, `state`)
- Local variables: camelCase (e.g., `result`, `lastKey`, `filter`)
- Type/interface names: PascalCase (e.g., `Property`, `PropertyFilter`, `HttpApiEvent`)

**Types:**
- Data models: PascalCase ending with actual name (e.g., `Property`, `PropertyFilter`, `City`)
- Response objects: Named by content (e.g., `{ property: Property }`, `{ properties: Property[] }`)
- Callbacks: camelCase prefixed with `on` (e.g., `onSelect`, `onLoad`)

## Where to Add New Code

**New Feature (Filter UI):**
- Primary code: `app/browse/page.tsx` — add filter state and UI
- API integration: `lib/api.ts` — extend `toQueryString()` with new filter params
- Backend: `backend/src/filter.ts` — add new filter condition to `filterProperties()` and `parseFilter()`
- Tests: `tests/filter.test.ts` — add test cases for new filter logic

**New Component (e.g., FilterBar):**
- Implementation: `components/FilterBar.tsx` (new file)
- Import in: `app/browse/page.tsx` — add to render
- Props: Use TypeScript interfaces defined at top of file or in `lib/types.ts` if shared

**New Utility Function (e.g., price formatter):**
- Shared helpers: `lib/` for client-side, `backend/src/` for server-side
- Export and import as needed

**New API Endpoint (e.g., GET /properties/nearby):**
- Handler: Add route case in `backend/src/router.ts` (e.g., `req.path === "/properties/nearby"`)
- Logic: Create new function in `backend/src/properties.ts` (e.g., `queryNearby()`)
- Client call: Add wrapper in `lib/api.ts` (e.g., `fetchPropertiesNearby()`)
- Type definition: Update `lib/types.ts` or `backend/src/types.ts` as needed

**New Test:**
- Unit tests: `tests/*.test.ts` — follow existing patterns (describe + test)
- Integration tests: `tests/smoke.test.ts` — for full API flows

**Infrastructure Changes (e.g., new DynamoDB table):**
- CDK stack: `infra/lib/properties-stack.ts` — add new Table construct
- Scripts: `infra/bin/app.ts` — instantiate stack in CDK app
- Deployment: `infra/package.json` — run `npm run deploy` in infra directory

## Special Directories

**`.next/`:**
- Purpose: Generated Next.js build output
- Generated: Yes (by `npm run build`)
- Committed: No (in .gitignore)

**`node_modules/`:**
- Purpose: Installed dependencies from package.json
- Generated: Yes (by `npm install`)
- Committed: No (in .gitignore)

**`.git/`:**
- Purpose: Git version control history
- Generated: Yes (by `git init`)
- Committed: No (never committed)

**`.env` (if present):**
- Purpose: Local environment variables for development
- Generated: No (developer-created)
- Committed: No (in .gitignore) — secrets should never be committed
- **Note:** Contains DYNAMODB_ENDPOINT, PROPERTIES_TABLE, AWS_REGION, API_PORT, NEXT_PUBLIC_API_BASE_URL

**`infra/node_modules/`:**
- Purpose: CDK-specific dependencies
- Generated: Yes
- Committed: No (separate from root workspace)

---

*Structure analysis: 2026-07-06*
