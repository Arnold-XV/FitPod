# FitPod

Decentralized fitness tracking platform built on [Solid Pods](https://solidproject.org/). Stores health and fitness data as RDF in user's own Pod, providing data ownership and control without central database dependency.

**Status:** Phase 1 & 2 complete (Nov 2026). Core body measurement flow functional with storage root discovery, multi-month listing, and retry/backoff. Other domain modules scaffolded. Not production-ready.

## Table of contents

- [FitPod](#fitpod)
  - [Table of contents](#table-of-contents)
  - [Features](#features)
  - [Tech stack](#tech-stack)
  - [Repository structure](#repository-structure)
  - [Getting started](#getting-started)
    - [Prerequisites](#prerequisites)
    - [Installation](#installation)
    - [Run web application](#run-web-application)
    - [Local Solid Pod server](#local-solid-pod-server)
    - [Seed test data](#seed-test-data)
  - [Available scripts](#available-scripts)
    - [Root workspace](#root-workspace)
    - [Web application workspace](#web-application-workspace)
  - [Configuration](#configuration)
    - [Client ID document](#client-id-document)
    - [OIDC issuer](#oidc-issuer)
  - [Architecture](#architecture)
    - [Architecture principles](#architecture-principles)
  - [Data model](#data-model)
  - [Testing](#testing)
  - [Known limitations](#known-limitations)
  - [Contributing](#contributing)
  - [Recent updates](#recent-updates)
  - [License](#license)

## Features

- **Solid-OIDC authentication** with DPoP tokens, Client ID Document support, session restoration
- **Pod-native RDF storage** using Turtle format, conditional writes (`If-None-Match`, `If-Match`), `yyyy/mm` container sharding, storage root discovery via `pim:storage`
- **Body measurements** with full CRUD operations, domain validation, BMI calculation
- **Layered architecture** (L1–L5) with dependency injection, explicit port/adapter boundaries
- **Typed error handling** via `Result<T>` type and structured application errors
- **Resilient HTTP layer** with exponential backoff, jitter, and configurable retry (429, 503, 504)
- **Shared RDF packages** for FitPod vocabulary and SHACL shapes
- **Domain modules** for body (implemented), nutrition, workout, health, access, professional, social (scaffolded)
- **Unit and integration tests** with Vitest
- **Internationalization** (English, Indonesian)

## Tech stack

| Area | Technology |
| --- | --- |
| Language | TypeScript 5.6 (strict mode) |
| UI | React 18, React Router 7.18, Tailwind CSS 4 |
| Build tool | Vite 6 |
| Testing | Vitest |
| RDF | N3.js, RDF/JS types |
| Solid | `@inrupt/solid-client-authn-browser` |
| Storage | IndexedDB (idb), Solid Pod RDF storage |
| Package management | npm workspaces |
| Concurrency control | p-limit |
| Local development | Community Solid Server, Docker Compose |

## Repository structure

```text
FitPod/
├── apps/
│   ├── web/                  React SPA - main application
│   ├── expiry-scheduler/     Placeholder for access-grant expiry jobs
│   └── lookup-proxy/         Placeholder for external lookup proxying
├── packages/
│   ├── vocab/                FitPod RDF namespaces and IRI helpers
│   └── shapes/               SHACL shapes and ACL templates
├── tests/
│   ├── unit/                 Domain unit tests
│   └── integration/          Integration test suite
├── tools/
│   ├── auth/                 Solid authentication utilities
│   ├── css-config/           Community Solid Server config
│   ├── seed/                 Pod seeding utilities
│   └── solid-pod/            Local CSS server launcher
├── solid-script/             Solid-related automation (placeholder)
├── docs/                     Documentation, ADRs, and PRD
├── docker-compose.yml        Container orchestration config
├── package.json              Root workspace configuration (npm/pnpm)
├── pnpm-workspace.yaml       Workspace definition (both managers supported)
├── tsconfig.json             Shared TypeScript configuration
├── vitest.config.ts          Test configuration
├── vercel.json               Vercel deployment config
└── .env.example              Environment variable template
```

Web application structure (layered architecture):

```text
apps/web/src/
├── presentation/             L1 — React components, pages, UI
├── application/              L2 — Use cases, application logic
├── domain/                   L3 — Entities, validators, ports (pure)
├── data/                     L4 — Repositories, RDF mapping, Solid I/O
├── infrastructure/           L5 — Auth, HTTP, clock, logging, ID generation
└── app/                      Composition root, DI container
```

## Getting started

### Prerequisites

- Node.js ≥18 (Node.js 20 LTS recommended)
- npm ≥9 (or pnpm - both supported)
- Git
- Solid Pod account or local Community Solid Server

### Installation

```bash
git clone https://github.com/Arnold-XV/FitPod.git
cd FitPod
npm install
```

### Run web application

Root-level convenience script:

```bash
npm run dev
```

Or run from web workspace:

```bash
cd apps/web
npm run dev
```

Application starts at <http://localhost:5173>.

Current UI provides:
1. Solid-OIDC login with configurable OIDC issuer
2. WebID document verification and storage root discovery via `pim:storage`
3. Body measurement creation with RDF serialization
4. Multi-month measurement listing (default: 12 months, configurable)
5. Session restoration and DPoP token handling

**Authentication status:**
- **solidcommunity.net** — fully functional
- **Local CSS (port 3001)** — functional via `npm run pod:start`
- **login.inrupt.com** — requires testing with valid credentials

**Client ID configuration:** `apps/web/public/client-id.jsonld` must match app origin. Default configured for `http://localhost:5173`.

### Local Solid Pod server

Start [Community Solid Server](https://github.com/CommunitySolidServer/CommunitySolidServer) on port 3001:

```bash
npm run pod:start
```

Use `http://localhost:3001/` as OIDC issuer. Pod data stored in `.data/` (git-ignored).

**Windows path limitation:** CSS fails when project path contains spaces. Solutions:
- Move project to path without spaces (`C:\Projects\FitPod`)
- Run CSS from different directory: `cd C:\temp && npx @solid/community-server -p 3001`
- Use online Pod providers instead

### Seed test data

Populate Pod with test body measurements:

1. Start local server: `npm run pod:start`
2. Create account and pod at <http://localhost:3001/> (ensure a WebID is linked)
3. Generate client credentials:
   - Go to <http://localhost:3001/.account/>
   - Look under **"Credential tokens"**
   - Click **"Create token"**
   - Select your WebID and name your token, then submit
   - Copy the generated `id` and `secret`
4. Create `.env.local` (or copy from `.env.example`):
   ```bash
   SOLID_CLIENT_ID="your-client-id"
   SOLID_CLIENT_SECRET="your-client-secret"
   SOLID_OIDC_ISSUER="http://localhost:3001"
   ```
5. Seed Pod with measurements:
   ```bash
   npm run seed                           # 10 normal measurements (default)
   npm run seed -- --count=20             # 20 measurements
   npm run seed -- --profile=edge         # Edge case measurements
   npm run seed -- --profile=mixed        # Mixed profile
   ```

Clear test data:
```bash
npm run seed:clear
```

## Available scripts

Run from repository root.

### Root workspace

| Command | Description |
| --- | --- |
| `npm run dev` | Start web app development server |
| `npm run build` | Build web app for production |
| `npm run preview` | Preview production build |
| `npm run typecheck` | Type-check entire repository |
| `npm test` | Run all tests |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests |
| `npm run test:watch` | Run tests in watch mode |
| `npm run pod:start` | Start local Community Solid Server |
| `npm run seed` | Seed Pod with test data |
| `npm run seed:clear` | Clear test data from Pod |

### Web application workspace

Run with `-w` flag or from `apps/web` directory:

| Command | Description |
| --- | --- |
| `npm run dev -w fitpod-web` | Start Vite dev server |
| `npm run build -w fitpod-web` | Type-check and build |
| `npm run preview -w fitpod-web` | Preview production build |
| `npm run lint -w fitpod-web` | Run ESLint |
| `npm run typecheck -w fitpod-web` | Type-check web app |
| `npm test -w fitpod-web` | Run web app tests |
| `npm run test:ui -w fitpod-web` | Run tests with Vitest UI |

## Configuration

### Client ID document

Web app loads Client ID document from `/client-id.jsonld`. Generate from `apps/web/public/client-id.template.json` (git-ignored after generation).

Local development setup:
1. Copy template to `apps/web/public/client-id.jsonld`
2. Replace `__ORIGIN__` with app origin (`http://localhost:5173`)
3. Set `redirect_uris` to post-login URL (`["http://localhost:5173/"]`)
4. Ensure `client_id` equals `<origin>/client-id.jsonld`

Document requires `Content-Type: application/ld+json` and permissive CORS headers. Production headers defined in `apps/web/public/_headers`.

### OIDC issuer

Default issuer: `https://solidcommunity.net`. Alternative providers (including local Community Solid Server) configurable via UI before login.

Environment files (`.env`, `.env.*`) git-ignored. No runtime environment variables required for web application.

## Architecture

Five-layer architecture with inward-pointing dependencies:

```text
L1 Presentation  →  L2 Application  →  L3 Domain
                                          ▲
L4 Data  ─────────────────────────────────┘
L5 Infrastructure  ── implements ports consumed by L2/L4
```

Composition root (`apps/web/src/app/container.ts`) wires concrete implementations to use cases.

### Architecture principles

**L3 Domain purity**  
No I/O operations, no `fetch`, no `Date.now()`, no `crypto.randomUUID()`. Dependencies on `Clock` and `IdGenerator` ports.

**Port/Adapter pattern**  
Ports defined in L3 (domain). Adapters implemented in L4 (data) and L5 (infrastructure).

**RDF library isolation**  
Only L4 data layer and L5 auth code import `n3`, `@rdfjs/*`, `@inrupt/*`.

**Centralized HTTP**  
Only `infrastructure/http` calls `fetch`. Other layers use `PodHttp` abstraction.

**Error handling**  
Cross-layer failures use `Result<T>` with typed `AppError` values. No thrown HTTP errors.

## Data model

**Namespace:** `fp:` → `https://w3id.org/fitpod/ns#`

**Schema versioning:** Every primary subject includes `fp:schemaVersion`

**Serialization:** Turtle format with conditional requests (`If-None-Match`, `If-Match`) prevents lost updates

**Storage structure:** 
- Body measurements: `fitpod/body/yyyy/mm/<id>.ttl` (container sharding)
- Storage root discovered via `pim:storage` predicate with host-based fallback

**Provenance tracking:**
- Trust levels: `self`, `measured`, `clinician`
- Attributed WebID for data source
- Timestamps for created/modified dates

**Vocabulary management:**
- SHACL shapes: `packages/shapes`
- FitPod vocabulary: `packages/vocab`
- PIM vocabulary: imported from `@fitpod/vocab`

## Testing

Run tests:
```bash
npm test                 # All tests
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests
npm run test:watch       # Watch mode
```

**Test coverage:**
- Unit tests for domain logic: `tests/unit/`, `apps/web/src/domain`
- Integration tests: `tests/integration/` (in development)
- Manual Pod integration scenarios documented in `apps/web/TESTING.md` and `apps/web/TEST_PLAN.md`

**Current test status:**
- Type checking: ⚠️ 22 errors from old/unused files (`*.old` folders) and test import paths
- Domain logic tests: ⚠️ Import path issues in `tests/unit/domain/*.test.ts`
- Integration tests: 🚧 Require Docker Compose setup for automation
- Manual testing: ✅ Verified on test page (`http://localhost:5173`)

To run tests excluding old files:
```bash
npm test                    # Run all tests (may have import errors)
npm run test:integration    # Run integration tests
npm run typecheck           # Check types (shows errors from .old files)
```

## Known limitations

**Data operations:**
- SHACL validation defined but not enforced before writes
- ACL bootstrap and privacy probes missing
- Only body measurements fully implemented; other modules scaffolded
- Measurement listing hardcoded to 12 months (configurable via `list(monthsBack)`)

**Infrastructure:**
- No offline caching (IndexedDB not implemented)
- Retry/backoff implemented but limited to specific error codes (429, 503, 504)
- Automated Pod integration tests incomplete

**Development:**
- `expiry-scheduler` and `lookup-proxy` workspaces are placeholders
- Old/unused code in `*.old` directories causes typecheck errors
- Unit test import paths need correction in `tests/unit/domain/*.test.ts`

## Contributing

**Workflow:**
1. Branch from `main`
2. Install: `npm install`
3. Maintain layer boundaries and port/adapter pattern (enforced by ESLint)
4. Add/update tests for behavioral changes (70%+ coverage target on L3)
5. Verify: `npm run typecheck && npm test`
6. PR must describe motivation, scope, verification steps

**Architecture documentation:**
- Phase 1 & 2 improvements: `docs/IMPLEMENTATION_COMPLETE.md`
- Improvement plan: `docs/IMPROVEMENTV01.md`
- ADRs: `docs/adr/`
- Project requirements: `docs/PRD.md`
- Solid implementation notes: `docs/SOLIDIMPLEMENTATION.md`

**Do not commit:**
- Pod credentials or access tokens
- Environment files (`.env`, `.env.local`, `.env.*`)
- Local Pod data (`.data/`, `data/`)
- Generated client credentials

## Recent updates

**Phase 1 & 2 (Nov 2026):**
- ✅ Storage root discovery via `pim:storage` with fallback
- ✅ Multi-month measurement listing (default 12 months)
- ✅ Exponential backoff with jitter for HTTP retries
- ✅ Async repository initialization in DI container
- ✅ Seed utility with normal/edge/mixed profiles
- ✅ Local CSS server launcher script
- ✅ Docker Compose configuration

See `docs/IMPLEMENTATION_COMPLETE.md` for detailed changes.

## License

No license declared. Add `LICENSE` file before external distribution or contributions.
