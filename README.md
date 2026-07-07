# property-copilot-intern-oa-FA2026: Map Browser

Candidates: start with [CANDIDATE.md](./CANDIDATE.md) for the OA instructions.

A scaffold for a **map-based rental browser** across Metro Vancouver. It ships:

- A **Next.js** frontend (deploys to **Vercel**) with a plain listings page and a
  placeholder map panel.
- An **AWS** backend: a **DynamoDB** table (with a geohash GSI for geospatial
  queries), an AWS **Lambda** request handler, and an **API Gateway** HTTP API,
  all defined with **AWS CDK** in [`infra/`](./infra).
- A **seed of 50 listings** across Vancouver, Richmond, Burnaby, and Surrey,
  each with a full address, geocoordinates, rental metadata, and five images.

The scaffold deliberately ships a **naive baseline**: the API scans the whole
table and the frontend has no map and no filters. Building the performant map and
the filtering experience on top is the OA — see `CANDIDATE.md`.

## Project layout

```
app/            Next.js frontend (Vercel)
components/      Reusable UI components (PropertyCard, MapPanel placeholder)
lib/            Frontend API client + shared types
backend/src/    DynamoDB data layer, geohash helpers, request router, Lambda handler
backend/scripts/ Local table creation + seed
infra/          AWS CDK app (DynamoDB + Lambda + API Gateway)
tests/          Vitest unit tests (geo math, filters, seed data)
```

## Prerequisites

- Node.js 24 LTS and npm 11+
- Docker Desktop (for local DynamoDB)
- Git
- An AWS account (free tier is fine) and the AWS CLI configured (`aws configure`)
  for deploying the backend.

## Local development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Create your env file:
   ```bash
   cp .env.example .env
   ```
   The defaults point at local DynamoDB and the local API server; no edits are
   needed for local dev.
3. Start local DynamoDB:
   ```bash
   docker compose up -d
   ```
4. Create the table and seed 50 listings:
   ```bash
   npm run db:local
   npm run seed
   ```
5. In one terminal, start the local API (stands in for API Gateway + Lambda):
   ```bash
   npm run dev:api
   ```
6. In another terminal, start the frontend:
   ```bash
   npm run dev
   ```
7. Open http://localhost:3000 and go to **Browse**.

## API

`GET /properties` supports server-side filtering and a geospatial viewport query
(all parameters optional and composable):

| Param | Example | Meaning |
| --- | --- | --- |
| `bbox` | `bbox=-123.16,49.25,-123.09,49.32` | Viewport as `west,south,east,north`; answered from the `geo-index` GSI, never a scan |
| `minRent` / `maxRent` | `minRent=1800&maxRent=3200` | Rent range in CAD/month (inclusive) |
| `bedrooms` | `bedrooms=2` | Minimum bedrooms |
| `bathrooms` | `bathrooms=2` | Minimum bathrooms |
| `propertyType` | `propertyType=condo,house` | Any-of property types |

Malformed values (bad bbox, `minRent > maxRent`, unknown types) return `400`.
Results are sorted by rent ascending, id as tiebreak.

## Running tests

```bash
npm test
```

The suite covers the geohash helpers and service-area clamp (`tests/geo.test.ts`),
the geospatial viewport query against a mocked DynamoDB client
(`tests/properties-query.test.ts` — one Query per covering prefix, pagination,
exact-box refinement), filter composition and strict parsing
(`tests/filter.test.ts`), the HTTP router including bbox validation and sorting
(`tests/router.test.ts`), viewport/format helpers (`tests/map-utils.test.ts`),
shareable-URL round-tripping (`tests/filters-url.test.ts`), and the seed data set
(`tests/seed-data.test.ts`). Everything is pure or mocked — no database needed.

## Deploying

### Backend (AWS)

```bash
cd infra
npm install
npx cdk bootstrap   # first time per account/region
npx cdk deploy
```

The stack creates the `Properties` table (with the `geo-index` GSI), the Lambda,
and the HTTP API. Note the `ApiUrl` output. Re-run `npx cdk deploy` after any
`backend/src` change — the Lambda bundles that code at deploy time. Then seed
your real table:

```bash
# from the repo root, with .env pointing at AWS (unset DYNAMODB_ENDPOINT,
# set AWS_REGION / PROPERTIES_TABLE to match the deployed stack)
npm run seed
```

### Frontend (Vercel)

Connect the repo to Vercel. Set `NEXT_PUBLIC_API_BASE_URL` to the API Gateway URL
from the CDK `ApiUrl` output. With Vercel's Git integration, pushes to `main` ship
to production automatically (this satisfies CD).
