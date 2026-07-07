# External Integrations

**Analysis Date:** 2026-07-06

## APIs & External Services

**None currently integrated.**

The application architecture is designed to support external integrations (map libraries, geocoding services, image hosting), but as of this date no production integrations are active. The map component (`components/MapPanel.tsx`) is a placeholder awaiting implementation (see REPORT.md for candidate decisions).

## Data Storage

**Databases:**
- AWS DynamoDB (production)
  - Table name: `Properties` (configurable via `PROPERTIES_TABLE` env var)
  - Client: `@aws-sdk/lib-dynamodb` (DynamoDBDocumentClient)
  - Connection: Environment-based (`backend/src/db.ts`)
    - Production: AWS IAM credentials via Lambda execution role
    - Local: Configurable endpoint via `DYNAMODB_ENDPOINT` env var
  - Schema: Property listings with attributes:
    - Partition key: `id` (string)
    - Global Secondary Index: `geo-index`
      - Partition key: `geohashPrefix` (string, for spatial partitioning)
      - Sort key: `geohash` (string, for full geohash)
      - Projection: ALL
  - Billing mode: PAY_PER_REQUEST (on-demand)
  - Removal policy: DESTROY (stack cleanup)

**Local Development Database:**
- DynamoDB Local (via Docker)
  - Container: `amazon/dynamodb-local:latest`
  - Started: `docker-compose up` (port 8000)
  - Features: In-memory, shared DB, single-use for dev/testing
  - Config: `docker-compose.yml`
  - Table creation: `npm run db:local` (runs `backend/scripts/create-local-table.ts`)
  - Seeding: `npm run seed` (runs `backend/scripts/seed.ts`)

**File Storage:**
- Local filesystem only
  - Property images are referenced by URL (stored as `images[]` array in items)
  - No cloud storage integration (S3, etc.) currently implemented

**Caching:**
- None currently implemented

## Authentication & Identity

**Auth Provider:**
- Custom (none)
  - Implementation: No authentication required in current design
  - CORS headers permit all origins (`Access-Control-Allow-Origin: *`)
  - API Gateway and Lambda handle request routing without auth
  - Health endpoint available at GET `/health` (no auth required)

## Monitoring & Observability

**Error Tracking:**
- None integrated (console logging only)
  - Backend logs errors to console: `backend/src/handlers.ts` line 49, `backend/local-server.ts` line 41
  - Frontend error logging: Basic try-catch in `app/browse/page.tsx`

**Logs:**
- AWS CloudWatch (production via Lambda)
  - Lambda automatically logs to CloudWatch Logs
  - Regional: `us-west-2` (configurable via `AWS_REGION` env var)
- Console output (development)
  - Local server logs to stdout: `backend/local-server.ts` line 47

## CI/CD & Deployment

**Hosting:**
- Frontend: Deploy-ready Next.js app
  - Deployment targets: Vercel (recommended, native Next.js support), AWS Amplify, or self-hosted
  - Entry point: `app/layout.tsx`, `app/page.tsx`, `app/browse/page.tsx`
  - Environment: `NEXT_PUBLIC_API_BASE_URL` points to backend API
- Backend: AWS Lambda (Node.js 22.x)
  - Handler: `backend/src/handlers.ts` → `handler` function
  - Entry point for CDK: `infra/lib/properties-stack.ts`
  - Bundling: ESM format, Node.js 22 target
  - Memory: 256 MB
  - Timeout: 10 seconds
  - Runtime: NODEJS_22_X (Lambda runtime)

**CI Pipeline:**
- None configured (GitHub Actions workflow not set up)
  - Infrastructure: Ready for CI/CD via GitHub Actions or your preferred platform
  - Testing: `npm test` runs Vitest locally
  - Linting: `npm run lint` runs ESLint

## Environment Configuration

**Required env vars:**

**Frontend (.env.local or NEXT_PUBLIC_* in deployment):**
- `NEXT_PUBLIC_API_BASE_URL` - Backend API URL (default: `http://localhost:4000`)

**Backend (development):**
- `DYNAMODB_ENDPOINT` - Local DynamoDB endpoint (e.g., `http://localhost:8000`)
- `PROPERTIES_TABLE` - DynamoDB table name (default: `Properties`)
- `AWS_REGION` - AWS region (default: `us-west-2`)
- `AWS_ACCESS_KEY_ID` - Local AWS credentials (dev only, set to `local` for DynamoDB Local)
- `AWS_SECRET_ACCESS_KEY` - Local AWS credentials (dev only, set to `local` for DynamoDB Local)
- `API_PORT` - Backend server port (default: `4000`)

**Backend (production - Lambda):**
- Automatically set via CDK: `PROPERTIES_TABLE`
- AWS credentials: Provided by Lambda execution role (IAM-based, no env vars needed)
- Region: Determined by Lambda region

**Secrets location:**
- Environment variables in `.env` (local development only — DO NOT commit)
- `.env.example` documents required structure
- Production secrets: AWS Secrets Manager (recommended for Lambda) or environment variables set in CDK stack

## Webhooks & Callbacks

**Incoming:**
- None configured
  - API is read-only (GET requests only)
  - No webhook endpoints

**Outgoing:**
- None configured
  - Application does not invoke external webhooks
  - Map rendering is client-side (coordinates embedded in property data)

## Geospatial Integration

**Geohashing Library:**
- ngeohash 0.6.3 (`backend/src/geo.ts`)
  - Precision 7 (full geohash): ~150m x 150m cells
  - Precision 5 (partition prefix): ~5km x 5km cells
  - Used for spatial indexing on DynamoDB GSI
  - Functions:
    - `encodeGeohash(lat, lng)` - Encode coordinates to geohash
    - `geohashPrefix(geohash)` - Extract partition key
    - `boundingBoxPrefixes(box)` - Get partitions covering bounding box
    - `isInBoundingBox(lat, lng, box)` - Coordinate containment check

**Geospatial Query Path (Planned):**
- Currently: Full table scan with client-side filtering (`backend/src/router.ts` line 44-48)
- Next step: Implement viewport-based queries using geohash prefixes
  - Read `bbox` query parameter (map bounds)
  - Query geo-index with bounding-box-derived prefixes
  - Filter results to exact box boundaries

---

*Integration audit: 2026-07-06*
