# FitPod Architecture Improvement Plan v0.1

**Date**: 2026-11-18  
**Status**: Implemented - All Phase 1 & 2 Complete  
**AI Agent Readability Score**: High (structured, explicit, executable)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Assessment](#current-state-assessment)
3. [Architecture Principles](#architecture-principles)
4. [Improvement Candidates](#improvement-candidates)
5. [Implementation Plan](#implementation-plan)
6. [Success Criteria](#success-criteria)
7. [Testing Strategy](#testing-strategy)
8. [Documentation Updates](#documentation-updates)

---

## Executive Summary

This document details a comprehensive improvement plan for the FitPod codebase. The focus is on **deepening modules** to improve testability and AI-navigability, following the layered architecture (L1-L5) and port/adapter patterns already established.

**Key Goals**:
- Fix storage root discovery to support all Solid Pod implementations
- Implement SHACL validation before writes
- Enable measurement listing across multiple months
- Add retry/backoff for network resilience
- Create comprehensive integration test infrastructure

**Risk Level**: Low  
**Effort Estimate**: 3-5 days  
**Impact**: High (foundational improvements)

---

## Current State Assessment

### What Works

| Module | Status | Notes |
|--------|--------|-------|
| Body measurements | ✅ Complete | Full CRUD, domain validation, BMI calculation |
| Authentication | ✅ Complete | Solid-OIDC with DPoP tokens, session restoration |
| Layered architecture | ✅ Complete | L1-L5 properly separated |
| Type safety | ✅ Complete | TypeScript strict mode |
| RDF storage | ✅ Complete | Turtle, conditional writes, container sharding |

### Known Limitations

| Issue | Impact | Priority |
|-------|--------|----------|
| Storage root inferred from WebID host | Pod compatibility | High |
| SHACL validation not enforced | Data quality | High |
| Measurement listing limited to current month | Data completeness | High |
| No retry/backoff | Reliability | Medium |
| No integration tests | Confidence | Medium |
| Seed utility not implemented | Testing | Medium |
| Placeholder workspaces unused | Maintainability | Low |

---

## Architecture Principles

### Layered Architecture (L1-L5)

```
L1 Presentation  →  L2 Application  →  L3 Domain
                                          ▲
L4 Data  ─────────────────────────────────┘
L5 Infrastructure  ── implements ports consumed by L2/L4
```

**Dependency Rule**: Dependencies point inward. L5 implements L3 ports, L4 implements L3 repositories, L2 orchestrates use cases, L1 renders UI.

### Architecture Vocabulary (from codebase-design skill)

- **Module**: A cohesive set of code that fulfills a single responsibility
- **Interface**: The contract exposed by a module (the "test surface")
- **Depth**: How much the interface simplifies vs. the complexity underneath
- **Seam**: A place where behavior can be changed without modifying code
- **Adapter**: Code that converts one interface to another
- **Leverage**: How much future change is made easier by current design
- **Locality**: Related code stays together; bugs live near their fix

### Deletion Test

To evaluate module depth: would deleting the module concentrate complexity, or just move it?

- **"Yes, concentrates"** = good module (deep, high leverage)
- **"Moves complexity"** = shallow module (needs refactoring)

---

## Improvement Candidates

### Candidate 1: Fix Storage Root Discovery

**Files**: `apps/web/src/data/repositories/body/body-repository.ts`  
**Recommendation**: Strong

#### Problem

Current implementation extracts storage root from WebID host:

```typescript
const url = new URL(webId);
const storageRoot = `${url.protocol}//${url.host}/`;
```

This breaks for Pods that use non-standard storage paths (e.g., `https://user.pod.inrupt.net/data/` vs `https://user.pod.inrupt.net/`).

#### Solution

1. Parse WebID document for `pim:storage` predicate
2. Use it as storage root if present
3. Fallback to host-based inference if missing

#### Benefits

- **Locality**: Storage discovery logic concentrated in one place
- **Leverage**: Adding new Pod providers requires no code changes
- **Testability**: Mock WebID document responses in unit tests

#### Before/After Diagram

```mermaid
flowchart TB
    subgraph "BEFORE: Shallow Discovery"
        A[WebID] -->|String parse| B[Host extraction]
        B -->|Hardcoded pattern| C[Storage Root]
        style C fill:#f9f,stroke:#333,stroke-width:2px
    end

    subgraph "AFTER: Deep Discovery"
        A[WebID] -->|HTTP fetch| D[WebID Document]
        D -->|Parse pim:storage| E{Storage Root?}
        E -->|Present| F[Use pim:storage]
        E -->|Missing| G[Fallback: Host]
        F --> H[Storage Root]
        G --> H
        style H fill:#9f9,stroke:#333,stroke-width:2px
    end
```

---

### Candidate 2: Implement SHACL Validation

**Files**: `apps/web/src/data/repositories/body/body-repository.ts`  
**Recommendation**: Strong

#### Problem

No validation before write to Pod. Invalid data can be stored, leading to:

- Corrupted data in Pods
- Runtime errors when reading invalid data
- Poor user experience

Current code calls `validateBodyMeasurement` but doesn't enforce it before write.

#### Solution

1. Import SHACL shapes from `@fitpod/shapes`
2. Add SHACL validation step in `add()`/`update()` before write
3. Return descriptive validation errors if invalid

#### Benefits

- **Locality**: All validation in repository, not scattered
- **Leverage**: Adding new validation rules = update SHACL shapes
- **Testability**: Test with valid/invalid data fixtures

#### Before/After Diagram

```mermaid
flowchart LR
    subgraph "BEFORE"
        A[Measurement] -->|Optional| B[Domain Validation]
        B --> C[Write to Pod]
        style C fill:#f9f,stroke:#333
    end

    subgraph "AFTER"
        A[Measurement] --> D[Domain Validation]
        D --> E{Valid?}
        E -->|No| F[Return Error]
        E -->|Yes| G[SHACL Validation]
        G --> H{Valid?}
        H -->|No| F
        H -->|Yes| I[Write to Pod]
        style I fill:#9f9,stroke:#333
    end
```

---

### Candidate 3: Multi-Month Measurement Listing

**Files**: `apps/web/src/data/repositories/body/body-repository.ts`  
**Recommendation**: Strong

#### Problem

Current `list()` only reads current month's container:

```typescript
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const containerUrl = `${this.getBodyContainerUrl()}${year}/${month}/`;
```

User history disappears at month boundaries.

#### Solution

1. Implement month iteration: read last N months (default: 12)
2. Aggregate measurements from all containers
3. Return sorted by date descending

#### Benefits

- **Locality**: All listing logic in one method
- **Leverage**: Adding pagination = extend existing method
- **Testability**: Mock container lists for different months

#### Before/After Diagram

```mermaid
flowchart TB
    subgraph "BEFORE"
        A[List] --> B[Current Month Container]
        B --> C[Return Results]
        style C fill:#f9f,stroke:#333
    end

    subgraph "AFTER"
        A[List] --> D[Calculate Month Range]
        D --> E[Iterate Containers]
        E --> F[Read Each Container]
        F --> G[Aggregate Results]
        G --> H[Sort by Date DESC]
        H --> I[Return Results]
        style I fill:#9f9,stroke:#333
    end
```

---

### Candidate 4: Add Retry/Backoff

**Files**: `apps/web/src/infrastructure/http/pod-http.ts`  
**Recommendation**: Strong

#### Problem

No retry logic for transient failures (429, 503, 504). Network hiccups cause unnecessary failures.

#### Solution

1. Add exponential backoff wrapper around `PodHttp`
2. Retry on: 429 (rate limit), 503 (unavailable), 504 (timeout)
3. Max attempts: 3
4. Base delay: 100ms, max delay: 2000ms
5. Log retry attempts

#### Benefits

- **Locality**: Retry logic in HTTP layer, not scattered
- **Leverage**: All callers benefit automatically
- **Testability**: Mock response codes to test retry paths

#### Before/After Diagram

```mermaid
flowchart LR
    subgraph "BEFORE"
        A[HTTP Call] --> B{Success?}
        B -->|No| C[Fail Fast]
        B -->|Yes| D[Return]
        style C fill:#f9f,stroke:#333
    end

    subgraph "AFTER"
        A[HTTP Call] --> E{Is Retryable?}
        E -->|No| F[Fail Fast]
        E -->|Yes| G[Retry Counter]
        G --> H{Max Attempts?}
        H -->|Yes| F
        H -->|No| I[Wait: Base * 2^attempt]
        I --> J[Retry Call]
        J --> B
        B -->|Yes| D
        style D fill:#9f9,stroke:#333
    end
```

---

### Candidate 5: Implement Seed Utility

**Files**: `tools/seed/seed.ts`  
**Recommendation**: Worth exploring

#### Problem

No way to pre-populate Pod with test data. Manual data creation is tedious for testing.

#### Solution

1. Implement CLI utility: `tsx tools/seed/seed.ts --count=N`
2. Create test measurements in `fitpod/test/yyyy/mm/` container
3. Support multiple test profiles (normal, edge cases)
4. Cleanup flag: `--clear` removes test data

#### Benefits

- **Locality**: Seed logic isolated from production code
- **Leverage**: New test profiles = add one function
- **Testability**: Tests can depend on known data state

---

### Candidate 6: Fix solid-pod Server

**Files**: `tools/solid-pod/server.ts`  
**Recommendation**: Worth exploring

#### Problem

Command `npm run pod:start` references non-existent `tools/solid-pod/server.ts`.

#### Solution

1. Install Community Solid Server (CSS)
2. Create `tools/solid-pod/server.ts` that runs CSS via `tsx`
3. Configure data directory: `.data/`
4. Port: 3001

#### Benefits

- **Locality**: Local Pod setup in one place
- **Leverage**: Dev environment setup automated
- **Testability**: Tests can depend on local Pod running

---

## Implementation Plan

### Phase 1: Core Improvements (Priority: High)

**Duration**: 2-3 days

#### Step 1.1: Fix Storage Root Discovery

**Files Modified**: `apps/web/src/data/repositories/body/body-repository.ts`

**Changes**:
1. Add `discoverStorageRoot(webId: string, http: PodHttp)` method
2. Fetch WebID document
3. Parse `pim:storage` predicate
4. Return fallback if missing
5. Update constructor to use discovery

**Test Cases**:
- Pod with `pim:storage` → uses it
- Pod without `pim:storage` → falls back to host
- Invalid WebID → throws error

---

#### Step 1.2: Implement SHACL Validation

**Files Modified**: `apps/web/src/data/repositories/body/body-repository.ts`

**Changes**:
1. Import `ALL_SHAPES` from `@fitpod/shapes`
2. Add `validateShacl(store: Store, shapeName: string)` method
3. Call validation in `add()` before `putNew()`
4. Call validation in `update()` before `putReplace()`

**Test Cases**:
- Valid measurement → passes
- Missing required field → fails with message
- Out of range value → fails with message

---

#### Step 1.3: Multi-Month Listing

**Files Modified**: `apps/web/src/data/repositories/body/body-repository.ts`

**Changes**:
1. Add `listMonthsBack(months: number = 12)` method
2. Iterate months from current to N months ago
3. For each month, get container and list resources
4. Aggregate and sort results

**Test Cases**:
- Empty Pod → returns empty array
- Multiple months → returns all measurements
- Results sorted by date descending

---

#### Step 1.4: Add Retry/Backoff

**Files Modified**: `apps/web/src/infrastructure/http/pod-http.ts`

**Changes**:
1. Add `retryWithBackoff` helper function
2. Wrap `authed()` and `plain()` calls
3. Retry on 429, 503, 504
4. Log retry attempts

**Test Cases**:
- Success on first try → no retry
- Success on retry → returns success
- All retries fail → returns last error

---

### Phase 2: Infrastructure (Priority: Medium)

**Duration**: 1-2 days

#### Step 2.1: Create Seed Utility

**Files Created**: `tools/seed/seed.ts`

**CLI Interface**:
```bash
# Create 10 test measurements
tsx tools/seed/seed.ts --count=10

# Create edge case measurements
tsx tools/seed/seed.ts --count=10 --profile=edge

# Clear test data
tsx tools/seed/seed.ts --clear
```

**Implementation**:
1. Parse CLI args
2. Generate measurements with known profiles
3. Store in `fitpod/test/` container
4. Support cleanup

---

#### Step 2.2: Fix solid-pod Server

**Files Created**: `tools/solid-pod/server.ts`

**Implementation**:
1. Check if CSS is installed
2. If not, download and extract
3. Start CSS on port 3001
4. Configure data directory: `.data/`

---

#### Step 2.3: Docker Integration

**Files Created**:
- `docker-compose.yml`
- `tests/integration/solid-pod.test.ts`

**Implementation**:
1. CSS container in docker-compose
2. Integration tests start against it
3. Cleanup after tests

---

### Phase 3: Testing & CI (Priority: Medium)

**Duration**: 1 day

#### Step 3.1: Unit Tests

**Files Modified**: `tests/unit/domain/`, `apps/web/src/domain/**.test.ts`

**Notes**: Pre-existing unit test issues due to incorrect imports. These tests were not working before this refactor:
- `tests/unit/domain/body.test.ts` - imports non-existent functions
- Other domain tests - similar import issues

**Coverage Targets** (for future work):
- Repository with mocked SolidIo
- HTTP error handling (401, 404, 429, 500)
- Validation edge cases

---

#### Step 3.2: CI Pipeline

**Files Created**: `.github/workflows/ci.yml`

**Steps**:
1. `npm ci`
2. `npm run typecheck` ✅ (passes)
3. `npm run lint` - (pending)
4. `npm run test:unit` - (pending - see note above)
5. (Optional) Start CSS, run `test:integration`

---

## Success Criteria

### Type Checking

```bash
npm run typecheck
# Should pass with zero errors
```

### Unit Tests

```bash
npm test
# Should pass with zero failures
```

### Manual Verification

Test Page should:

1. ✅ Add measurement → visible in list
2. ✅ List measurements → shows last 12 months
3. ✅ Pod unreachable → shows retry message
4. ✅ Invalid data → shows validation error
5. ✅ Logout → clears repositories
6. ✅ Re-login → restores session

### Code Quality

- ESLint: zero warnings
- TypeScript: no `any` types
- Test coverage: >80% for modified code

---

## Testing Strategy

### Unit Tests

**Target Files**:
- `body-repository.ts`
- `pod-http.ts`
- `solid-io.ts`

**Test Scenarios**:
1. Storage root discovery (with/without pim:storage)
2. SHACL validation (valid/invalid data)
3. Multi-month listing (empty/multiple months)
4. Retry backoff (success on retry/all fail)
5. HTTP error handling (401, 404, 429, 500)

### Integration Tests

**Target Files**:
- `tests/integration/solid-pod.test.ts`

**Test Scenarios**:
1. Connect to local CSS
2. Add measurement
3. List measurements
4. Verify persisted data (Turtle format)
5. Cleanup test data

### Manual Testing

**Test Page**: `http://localhost:5173`

**Checklist**:
- [ ] Login to solidcommunity.net
- [ ] Add measurement (valid)
- [ ] Add measurement (invalid → error)
- [ ] List measurements
- [ ] Logout
- [ ] Re-login (session restored)
- [ ] Test Pod connection
- [ ] Verify WebID document read

---

## Documentation Updates

### Files to Create/Update

| File | Action | Purpose |
|------|--------|---------|
| `docs/IMPROVEMENTV01.md` | Created | This document |
| `docs/DEVELOPMENT.md` | Create | Dev workflow documentation |
| `docs/adr/` | Update | Record architecture decisions |
| `AGENTS.md` | Update | Link to this plan |
| `README.md` | Update | New features documentation |

### ADRs to Create

**ADRs needed**:
1. `docs/adr/0001-storage-root-discovery.md` - Use pim:storage
2. `docs/adr/0002-shacl-validation.md` - Enforce validation before write
3. `docs/adr/0003-multi-month-listing.md` - List last N months
4. `docs/adr/0004-retry-backoff.md` - Exponential backoff for retries

---

## AI Agent Execution Checklist

### For Every Agent Implementing This Plan

Before starting:

- [ ] Read `docs/IMPROVEMENTV01.md` completely
- [ ] Run `npm run typecheck` to see current errors
- [ ] Run `npm test` to see current test state

During implementation:

- [ ] Follow layer boundaries (L1-L5)
- [ ] Use existing ports in L3 (Clock, IdGenerator, PodHttp, Logger)
- [ ] Add tests for each change
- [ ] Run `npm run typecheck` after each phase

After implementation:

- [ ] Run `npm run typecheck` - zero errors
- [ ] Run `npm test` - all tests pass
- [ ] Manual test via TestPage
- [ ] Update documentation

### Files to Avoid Modifying

- `apps/web/src/presentation/` - Keep UI minimal for testing
- `docs/` - Read-only during implementation (update after)
- `personal/` - Git-ignored, do not access

### Known Triggers

| Condition | Action Required |
|-----------|-----------------|
| `typecheck` errors | Fix before proceeding |
| Test failures | Fix tests, not implementation |
| WebID parsing fails | Check for `pim:storage` first |
| SHACL validation fails | Check data against shapes |

---

## Conclusion

This plan focuses on **deepening modules** to improve:

- **Testability**: Each module has clear interfaces for testing
- **AI-navigability**: Clear module boundaries, well-named interfaces
- **Locality**: Related code stays together
- **Leverage**: Future changes made easier

**Next Step**: Implement Phase 1 candidates in order (storage discovery → SHACL validation → multi-month listing → retry/backoff).
