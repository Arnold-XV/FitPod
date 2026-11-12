# FitPod

FitPod is a decentralized fitness tracking platform built on [Solid Pods](https://solidproject.org/). Health and fitness data is stored as RDF in each user's own Pod, giving users ownership and control of their data instead of relying on a central database.

This repository is an early-stage reference implementation of the FitPod architecture. The body-measurement flow is implemented end to end; the remaining domain modules are scaffolded for future work.

> **Status:** Experimental MVP. Not production-ready. See [Known limitations](#known-limitations) before deploying.

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Repository structure](#repository-structure)
- [Getting started](#getting-started)
- [Available scripts](#available-scripts)
- [Configuration](#configuration)
- [Architecture](#architecture)
- [Data model](#data-model)
- [Testing](#testing)
- [Documentation](#documentation)
- [Known limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Contributing](#contributing)
- [License](#license)

## Features

- **Solid-OIDC authentication** with DPoP tokens, Client ID Document support, and session restoration.
- **Pod-native storage** using Turtle/RDF, conditional writes (`If-None-Match`, `If-Match`), and `yyyy/mm` container sharding.
- **Body measurements** with create, read, update, delete, domain validation, and BMI calculation.
- **Layered architecture** (L1–L5) with a dependency-injection composition root and explicit port/adapter boundaries.
- **Typed error handling** through a `Result<T>` type and structured application errors.
- **Shared RDF packages** for the FitPod vocabulary and SHACL shapes.
- **Domain modules** for body, nutrition, workout, health, access, professional, and social concerns.
- **Unit tests** with Vitest, plus English and Indonesian i18n resources.

## Tech stack

| Area | Technology |
| --- | --- |
| Language | TypeScript 5.6 (strict mode) |
| UI | React 18, React Router |
| Build tool | Vite 5 |
| Testing | Vitest |
| RDF | N3.js, RDF/JS types |
| Solid | `@inrupt/solid-client-authn-browser`, Solid-OIDC |
| Package management | npm workspaces (`package-lock.json`) |

## Repository structure

```text
FitPod/
|-- apps/
|   |-- web/                  React SPA and the current end-to-end implementation
|   |-- expiry-scheduler/     Placeholder workspace for access-grant expiry jobs
|   `-- lookup-proxy/         Placeholder workspace for external lookup proxying
|-- packages/
|   |-- vocab/                FitPod RDF namespaces and IRI helpers
|   `-- shapes/               SHACL shapes and owner ACL template
|-- tests/
|   `-- unit/domain/          Domain unit tests
|-- tools/
|   |-- css-config/           Local Community Solid Server configuration
|   `-- seed/                 Pod seeding workspace
|-- docs/                     Architecture notes and ADR workspace
|-- personal/                 Internal PRD/SRS/SAD documents (git-ignored)
|-- package.json              Root workspace configuration
|-- tsconfig.json             Shared TypeScript configuration
`-- vitest.config.ts          Root test configuration
```

The web application follows the layered structure below:

```text
apps/web/src/
├── presentation/             L1 — React pages and UI
├── application/              L2 — Use cases
├── domain/                   L3 — Entities, validators, ports (pure)
├── data/                     L4 — Repositories, RDF mapping, Solid I/O
├── infrastructure/           L5 — Auth, HTTP, clock, logging, ID generation
└── app/                      Composition root and DI container
```

## Getting started

### Prerequisites

- Node.js **18 or newer** (Node.js 20 LTS recommended)
- npm **9 or newer**
- A Solid Pod account, or a local Community Solid Server instance
- Git

### Install

```bash
git clone https://github.com/Arnold-XV/FitPod.git
cd FitPod
npm install
```

### Run the web app

```bash
npm run dev --workspace apps/web
```

Open <http://localhost:5173>.

The current UI is a backend-testing interface. It lets you:

1. Log in with a Solid-OIDC issuer such as `https://solidcommunity.net`.
2. Read the WebID document to verify Pod connectivity.
3. Add a body measurement.
4. List measurements stored in the Pod.

### Optional: local Solid Pod

Run a [Community Solid Server](https://github.com/CommunitySolidServer/CommunitySolidServer) on port `3001`, then use `http://localhost:3001/` as the OIDC issuer. Local Pod data is written under `.data/`, which is git-ignored.

## Available scripts

Run workspace commands from the repository root.

### Root workspace

| Command | Description |
| --- | --- |
| `npm run typecheck` | Type-check the repository with the shared TypeScript config |
| `npm test` | Run the Vitest suite once |
| `npm run test:unit` | Run unit tests under `tests/unit` |
| `npm run test:watch` | Run Vitest in watch mode |

### Web application

| Command | Description |
| --- | --- |
| `npm run dev --workspace apps/web` | Start the Vite development server |
| `npm run build --workspace apps/web` | Type-check and build for production |
| `npm run preview --workspace apps/web` | Preview the production build |
| `npm run lint --workspace apps/web` | Run ESLint for the web app |
| `npm run typecheck --workspace apps/web` | Type-check the web app |

> Root convenience scripts for `dev`, `build`, and `preview` are still being aligned with the workspace package names. Use the workspace-qualified commands above.

## Configuration

### Solid Client ID document

The web app loads its Client ID document from `/client-id.jsonld`. This file is generated per environment from `apps/web/public/client-id.template.json` and is git-ignored.

For local development, create `apps/web/public/client-id.jsonld` from the template and:

- Replace `__ORIGIN__` with your app origin, for example `http://localhost:5173`.
- Set `redirect_uris` to the URL used after login, for example `["http://localhost:5173/"]`.
- Keep the `client_id` value equal to `<origin>/client-id.jsonld`.

The document must be served with `Content-Type: application/ld+json` and permissive CORS headers. The production headers are defined in `apps/web/public/_headers`.

### OIDC issuer

The default issuer in the testing UI is `https://solidcommunity.net`. You can enter another provider, including a local Community Solid Server, before logging in.

No runtime environment variables are required by the current web application. Environment files (`.env`, `.env.*`) are git-ignored.

## Architecture

FitPod uses a five-layer architecture with dependencies pointing inward:

```text
L1 Presentation  →  L2 Application  →  L3 Domain
                                          ▲
L4 Data  ─────────────────────────────────┘
L5 Infrastructure  ── implements ports consumed by L2/L4
```

The composition root at `apps/web/src/app/container.ts` wires concrete implementations into use cases.

Key rules enforced by the design and ESLint configuration:

- **L3 is pure.** Domain code has no I/O, no `fetch`, no `Date.now()`, and no `crypto.randomUUID()`; it depends on `Clock` and `IdGenerator` ports instead.
- **Ports live in L3, adapters live in L4/L5.** Repositories and infrastructure implement interfaces declared by the domain.
- **RDF and Solid libraries are restricted.** Only L4 data code and L5 authentication code may import `n3`, `@rdfjs/*`, or `@inrupt/*`.
- **HTTP is centralized.** Only `infrastructure/http` calls `fetch`; other layers use the `PodHttp` abstraction.
- **Errors are values.** Cross-layer failures use `Result<T>` with typed `AppError` values instead of thrown HTTP errors.

## Data model

- FitPod resources use the `fp:` namespace: `https://w3id.org/fitpod/ns#`.
- Every primary subject carries an `fp:schemaVersion` value.
- Resources are serialized as Turtle and written with conditional requests to prevent lost updates.
- Body measurements are stored under `fitpod/body/yyyy/mm/<id>.ttl` to keep containers small.
- Provenance is represented with a trust level (`self`, `measured`, `clinician`) and an attributed WebID.
- SHACL shapes are maintained in `packages/shapes`; the FitPod vocabulary is maintained in `packages/vocab`.

## Testing

```bash
# Run all configured tests once
npm test

# Run only domain unit tests
npm run test:unit

# Watch mode
npm run test:watch
```

The current automated suite focuses on pure domain logic under `tests/unit/domain` and `apps/web/src/domain`. Manual Pod integration scenarios are documented in [`apps/web/TESTING.md`](apps/web/TESTING.md) and [`apps/web/TEST_PLAN.md`](apps/web/TEST_PLAN.md). Automated integration tests against a Community Solid Server are planned but not yet implemented.

## Documentation

| Document | Purpose |
| --- | --- |
| [`apps/web/README.md`](apps/web/README.md) | Web application overview and manual test workflow |
| [`apps/web/ARCHITECTURE_EVALUATION.md`](apps/web/ARCHITECTURE_EVALUATION.md) | Architecture compliance evaluation |
| [`apps/web/TESTING.md`](apps/web/TESTING.md) | Testing approach and procedures |
| [`apps/web/TEST_PLAN.md`](apps/web/TEST_PLAN.md) | Detailed test scenarios |
| [`packages/vocab/src/index.ts`](packages/vocab/src/index.ts) | RDF namespaces and vocabulary helpers |
| [`packages/shapes/src/index.ts`](packages/shapes/src/index.ts) | SHACL shapes and ACL template |

Internal product and architecture specifications are kept in `personal/`, which is intentionally excluded from version control.

## Known limitations

- SHACL validation is defined but not fully enforced before every write.
- ACL bootstrap and privacy probes are not implemented.
- Only body measurements are wired end to end; nutrition, workout, health, access, professional, and social modules are domain scaffolding.
- Measurement listing is limited to the current month.
- The storage root is derived from the WebID host rather than discovered through `pim:storage`.
- Offline caching and a retry/backoff strategy are not implemented.
- Integration tests against a real or local Solid Pod are not automated yet.
- Some workspace scripts and applications are placeholders.
- The workspace is mid-refactor; `typecheck` and some scripts may report pre-existing errors until cleanup is complete.

## Roadmap

- [x] Layered L1–L5 architecture with dependency injection
- [x] Solid-OIDC authentication with DPoP
- [x] Body measurement persistence with conditional writes
- [x] Shared vocabulary and SHACL shape packages
- [x] Domain unit tests
- [ ] Enforce SHACL validation before writes
- [ ] Implement Pod bootstrap and ACL management
- [ ] Add automated integration tests against Community Solid Server
- [ ] Discover storage via `pim:storage` and register a Type Index
- [ ] Complete nutrition, workout, health, access, professional, and social modules
- [ ] Add offline cache and resilient error recovery
- [ ] Production hardening, accessibility, and UI polish

## Contributing

1. Create a branch from `main`.
2. Install dependencies with `npm install`.
3. Keep changes inside the existing layer boundaries and follow the port/adapter pattern.
4. Add or update tests for behavioral changes.
5. Run `npm run typecheck` and `npm test` before opening a pull request.
6. Describe the motivation, scope, and verification steps in the pull request.

Do not commit Pod credentials, access tokens, environment files, local Pod data, or contents of `personal/`.

## License

No license has been declared for this repository yet. Add a `LICENSE` file before distributing or accepting external contributions.
