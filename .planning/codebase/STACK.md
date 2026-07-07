# Technology Stack

**Analysis Date:** 2026-07-06

## Languages

**Primary:**
- TypeScript 5.8.3 - Full codebase (frontend, backend, infrastructure)

**Secondary:**
- JavaScript - Configuration files (ESLint, PostCSS, Tailwind)

## Runtime

**Environment:**
- Node.js 24.x - Required (specified in `.nvmrc`)

**Package Manager:**
- npm - Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16.2.9 - Full-stack web framework (SSR, API routes, deployment)
- React 19.1.0 - UI rendering (used in `app/`, `components/`)
- React DOM 19.1.0 - React DOM bindings

**Testing:**
- Vitest 3.2.4 - Unit and integration testing
  - Config: `vitest.config.ts`
  - Setup: `tests/setup.ts`
  - Run command: `npm test`

**Build/Dev:**
- ESLint 9.31.0 - Code linting
  - Config: `eslint.config.mjs`
  - Plugins: `@eslint/js`, `typescript-eslint`, `@next/eslint-plugin-next`
  - Run command: `npm run lint`
- TypeScript ESLint 8.62.0 - TypeScript linting rules
- AWS CDK 2.160.0 - Infrastructure as code
  - Config: `infra/package.json`, `infra/cdk.json`
  - Deploy: `npm run deploy` (runs from `infra/` directory)

**Styling:**
- Tailwind CSS 3.4.17 - Utility-first CSS framework
  - Config: `tailwind.config.ts`
  - Content: `app/**/*.{js,ts,jsx,tsx,mdx}`, `components/**/*.{js,ts,jsx,tsx,mdx}`
- PostCSS 8.5.15 - CSS processor
  - Config: `postcss.config.mjs`
  - Plugins: tailwindcss, autoprefixer
- Autoprefixer 10.4.21 - CSS vendor prefix handling

**Build Tools:**
- tsx 4.20.3 - TypeScript executor (used for backend scripts: `db:local`, `seed`, `dev:api`)
- ts-node 10.9.2 - TypeScript node execution (for CDK)
- esbuild 0.28.1 - Fast bundler (used by CDK and overridden in package.json)
- vite-tsconfig-paths 5.1.4 - Path alias resolution for Vitest

## Key Dependencies

**Critical:**
- @aws-sdk/client-dynamodb 3.658.0 - AWS SDK for DynamoDB client
- @aws-sdk/lib-dynamodb 3.658.0 - AWS SDK DynamoDB document client (abstracts marshalling)
- ngeohash 0.6.3 - Geohashing library for geospatial queries
  - Type definitions: `@types/ngeohash` 0.6.8

**Infrastructure:**
- aws-cdk-lib 2.160.0 - AWS CDK core library
  - Includes: aws-dynamodb, aws-lambda-nodejs, aws-lambda, aws-apigatewayv2
- constructs 10.3.0 - CDK construct base classes

**Development Dependencies:**
- @types/node 24.0.0 - Node.js type definitions
- @types/react 19.1.0 - React type definitions
- @types/react-dom 19.1.0 - React DOM type definitions
- next-env.d.ts - Auto-generated Next.js types

## Configuration

**Environment:**
- `.env` file (example at `.env.example`) - Contains:
  - `DYNAMODB_ENDPOINT` - Local DynamoDB endpoint for development (e.g., `http://localhost:8000`)
  - `PROPERTIES_TABLE` - DynamoDB table name (default: `Properties`)
  - `AWS_REGION` - AWS region (default: `us-west-2`)
  - `AWS_ACCESS_KEY_ID` - Local credentials for development
  - `AWS_SECRET_ACCESS_KEY` - Local credentials for development
  - `API_PORT` - Backend API port (default: `4000`)
  - `NEXT_PUBLIC_API_BASE_URL` - Frontend API endpoint (default: `http://localhost:4000`)

**Build:**
- `tsconfig.json` - Main TypeScript compiler config
  - Target: ES2017
  - Lib: dom, dom.iterable, esnext
  - JSX: react-jsx
  - Strict mode: enabled
  - Path alias: `@/*` maps to project root
  - Excluded: `node_modules`, `tests`, `infra`
- `next.config.ts` - Next.js configuration (minimal, uses defaults)
- `.eslintignore` (via eslint.config.mjs) - Ignores: `node_modules/`, `.next/`, `coverage/`, `infra/`
- `infra/tsconfig.json` - Separate TypeScript config for CDK infrastructure

**Package Overrides:**
- `postcss` - Pinned to 8.5.15
- `esbuild` - Pinned to 0.28.1

## Platform Requirements

**Development:**
- Node.js 24.x
- npm (package manager)
- Docker (for running DynamoDB Local via `docker-compose.yml`)
- AWS credentials configured locally (for CDK and Lambda local testing)

**Production:**
- AWS Account with:
  - DynamoDB table provisioned via CDK
  - Lambda execution role with DynamoDB read permissions
  - API Gateway HTTP API for routing
  - Vercel or self-hosted Next.js deployment for frontend
- Environment variables: `NEXT_PUBLIC_API_BASE_URL` (API endpoint URL)

## Scripts

**Development:**
- `npm run dev` - Start Next.js dev server (port 3000)
- `npm run dev:api` - Start backend API server locally (port 4000)
- `npm run db:local` - Create DynamoDB table locally
- `npm run seed` - Seed DynamoDB with sample data

**Build & Test:**
- `npm run build` - Next.js production build
- `npm run start` - Start Next.js production server
- `npm test` - Run Vitest suite
- `npm run lint` - Run ESLint

**Infrastructure:**
- `npm run deploy` (from `infra/`) - Deploy stack to AWS via CDK
- `npm run destroy` (from `infra/`) - Tear down CDK stack
- `npm run synth` (from `infra/`) - Synthesize CDK stack to CloudFormation
- `npm run diff` (from `infra/`) - Show CloudFormation diff before deploy

---

*Stack analysis: 2026-07-06*
