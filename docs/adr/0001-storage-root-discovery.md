# ADR 0001: Storage Root Discovery via pim:storage

**Date**: 2026-11-18  
**Status**: Accepted  
**Deciders**: Architecture Review  
**Consulted**: Development Team  
**Informed**: All Agents

---

## Context

FitPod needs to determine a user's storage root (the base URL for storing all FitPod resources). Previously, the code inferred the storage root from the WebID host:

```typescript
const url = new URL(webId);
const storageRoot = `${url.protocol}//${url.host}/`;
```

This approach has a problem: some Solid Pods use non-standard storage paths. For example:
- `https://user.pod.inrupt.net/profile/card#me` → storage root `https://user.pod.inrupt.net/`
- `https://user.pod.inrupt.net/profile/card#me` → storage root `https://user.pod.inrupt.net/data/`

The first case would fail with the host-based approach.

## Decision

Use the `pim:storage` predicate from the WebID document to discover the storage root.

### Implementation

1. Fetch the WebID document (Turtle format)
2. Parse for `pim:storage` predicate
3. Use the value if present
4. Fallback to host-based inference if missing

### Code Changes

- `apps/web/src/data/repositories/body/body-repository.ts`:
  - Added `setWebId()` method
  - Added `ensureStorageRoot()` async method
  - Modified `list()` to call `ensureStorageRoot()` before operations

- `apps/web/src/data/repositories/body/body-repository.ts`:
  - Added `getStorageRoot()` getter

### Dependencies

- `@fitpod/vocab` for `PIM` constant (`http://www.w3.org/ns/pim/space#`)

## Consequences

### Positive

- **Compatibility**: Works with any Solid Pod that correctly sets `pim:storage`
- **Standards compliance**: Uses W3C Pod Identity Model standard
- **Automatic**: No user configuration required

### Negative

- **Additional HTTP request**: One extra request to fetch WebID document
- **Complexity**: Slightly more complex code

### Mitigations

- Cache the storage root after discovery
- Fallback to host-based inference if discovery fails
- Log warnings when fallback is used

---

## Alternative Considered

### Maintain host-based inference only

**Pros**:
- Simpler code
- No additional HTTP request

**Cons**:
- Doesn't work with all Solid Pod implementations
- Users with non-standard storage paths would be blocked

**Decision**: Rejected - compatibility is more important than simplicity.

---

## References

- [Solid Pod Identity Model](https://solidproject.org/using/pim)
- [WebID Document](https://solidproject.org/using/oidc/webid-doc)
- Original implementation: `apps/web/src/data/repositories/body/body-repository.ts` (pre-refactor)
