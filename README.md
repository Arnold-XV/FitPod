# FitPod

Decentralized fitness tracking platform built on [Solid Pods](https://solidproject.org/). Stores health and fitness data as RDF in user's own Pod, providing data ownership and control without central database dependency.

**Status:** In development. Core body measurement flow functional. Other domain modules scaffolded. Not production-ready.

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
  - [License](#license)

## Features

- **Solid-OIDC authentication** with DPoP tokens, Client ID Document support, session restoration
- **Pod-native RDF storage** using Turtle format, conditional writes (`If-None-Match`, `If-Match`), `yyyy/mm` container sharding
- **Body measurements** with full CRUD operations, domain validation, BMI calculation
- **Layered architecture** (L1–L5) with dependency injection, explicit port/adapter boundaries
- **Typed error handling** via `Result<T>` type and structured application errors
- **Shared RDF packages** for FitPod vocabulary and SHACL shapes
- **Domain modules** for body, nutrition, workout, health, access, professional, social concerns
- **Unit and integration tests** with Vitest
- **Internationalization** (English, Indonesian)

## Tech stack

| Area | Technology |
| --- | --- |
| Language | TypeScript 5.6 (strict mode) |
| UI | React 18, React Router 7, Tailwind CSS 4 |
| Build tool | Vite 6 |
| Testing | Vitest |
| RDF | N3.js, RDF/JS types |
| Solid | `@inrupt/solid-client-authn-browser` |
| Storage | IndexedDB (idb) |
| Package management | npm workspaces |
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
│   ├── solid-pod/            Local Community Solid Server setup
│   └── seed/                 Pod seeding utilities
├── solid-script/             Solid-related automation scripts
├── docker-compose.yml        Container orchestration config
├── package.json              Root workspace configuration
├── pnpm-workspace.yaml       Workspace definition
├── tsconfig.json             Shared TypeScript configuration
└── vitest.config.ts          Test configuration
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
- npm ≥9
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
1. Solid-OIDC login with solidcommunity.net (functional)
2. WebID document verification
3. Body measurement creation and storage to authenticated user's Pod
4. Measurement listing from Pod

**Authentication status:**
- **solidcommunity.net** — fully functional
- **login.inrupt.com** — not working yet
- **Local CSS** — not working yet

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
2. Create account at <http://localhost:3001/>
3. Generate client credentials at <http://localhost:3001/.account/>
4. Create `.env.local` from `.env.example`:
   ```bash
   SOLID_CLIENT_ID=your-client-id
   SOLID_CLIENT_SECRET=your-client-secret
   SOLID_OIDC_ISSUER=http://localhost:3001
   ```
5. Seed Pod:
   ```bash
   npm run seed
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

**Storage structure:** Body measurements at `fitpod/body/yyyy/mm/<id>.ttl` for container size management

**Provenance tracking:**
- Trust levels: `self`, `measured`, `clinician`
- Attributed WebID for data source

**Vocabulary management:**
- SHACL shapes: `packages/shapes`
- FitPod vocabulary: `packages/vocab`

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
- Integration tests: `tests/integration/`
- Manual Pod integration scenarios documented in `apps/web/TESTING.md` and `apps/web/TEST_PLAN.md`

Integration tests against live/local Solid Pod in active development.

## Known limitations

**Data operations:**
- SHACL validation defined but not enforced before writes
- ACL bootstrap and privacy probes missing
- Only body measurements fully implemented; other modules scaffolded
- Measurement listing limited to current month
- Storage root derived from WebID host, not discovered via `pim:storage`

**Infrastructure:**
- No offline caching
- No retry/backoff strategy
- Automated Pod integration tests incomplete

**Development:**
- Some workspace scripts are placeholders
- Mid-refactor state may show pre-existing type errors

## Contributing

**Workflow:**
1. Branch from `main`
2. Install: `npm install`
3. Maintain layer boundaries and port/adapter pattern
4. Add/update tests for behavioral changes
5. Verify: `npm run typecheck && npm test`
6. PR must describe motivation, scope, verification steps

**Do not commit:**
- Pod credentials
- Access tokens
- Environment files
- Local Pod data (`.data/`)

## License

No license declared. Add `LICENSE` file before external distribution or contributions.
